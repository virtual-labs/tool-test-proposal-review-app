import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Auth } from '../src/auth.js';

import { Portal } from '../src/service.js';
import { createDomain } from '../src/domain.js';
import { createHandler } from '../src/http.js';
import { MemorySheets,MemoryCoordination,settings } from './fixtures.js';

const session={email:'ldc@example.com',activeRole:'LDC',expiresAt:Date.now()+7200000};
async function setup(){
  const sheets=new MemorySheets(),coordination=new MemoryCoordination(),outbox=[];
  const auth=new Auth(settings,sheets,coordination,async(_settings,message)=>{outbox.push(message);});
  const portal=new Portal(settings,sheets,coordination,auth);
  return {settings,sheets,coordination,auth,portal,outbox};
}
const codeFrom=x=>x.outbox.at(-1).body.match(/code is (\d{6})/)[1];
const answers={proposalId:'P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:6,reviewerComments:'=IMPORTXML("bad")'};

test('all roles, private drafts, assistant handoff, stale versions, final review and retry',async()=>{
  const x=await setup();
  for(const [email,role] of [['ldc@example.com','LDC'],['admin@example.com','Admin'],['assistant@example.com','Assistant Reviewer'],['ldc@example.com','PIC']]) {
    const data=await x.portal.execute('getInitialData',['cookie'],{...session,email,activeRole:role});assert.equal(data.user.role,role);
  }
  await assert.rejects(x.portal.execute('getAdminUsers',['cookie',{}],session),/Admin|administrator|ADMIN_REQUIRED/);
  await assert.rejects(x.portal.execute('getProposal',['cookie','P2'],session),/not assigned/);
  const assistant={...session,email:'assistant@example.com',activeRole:'Assistant Reviewer'};
  const handoff=await x.portal.execute('submitToLdc',['cookie',answers],assistant);assert.equal(handoff.success,true);
  const proposal=await x.portal.execute('getProposal',['cookie','P1'],session);assert.ok(proposal.draft.version);
  await assert.rejects(x.portal.execute('saveDraft',['cookie',{...answers,draftVersion:'stale'}],session),/changed|version|newer|updated|another/i);
  const saved=await x.portal.execute('saveDraft',['cookie',{...answers,draftVersion:proposal.draft.version}],session);assert.equal(saved.success,true);
  const final=await x.portal.execute('submitReview',['cookie',{...answers,draftVersion:saved.version}],session);assert.equal(final.success,true);assert.equal(final.emailSent,false);
  const retry=await x.portal.execute('submitReview',['cookie',{...answers,draftVersion:saved.version}],session);assert.equal(retry.alreadySaved,true);assert.equal(retry.reviewId,final.reviewId);
  const db=await x.sheets.snapshot('data',['Completed Reviews']);const rows=db.getSheetByName('Completed Reviews').getDataRange().getValues();assert.equal(rows.length,2);
  const comment=rows[1][rows[0].indexOf('Reviewer Comments / Suggestions')];assert.equal(comment,'=IMPORTXML("bad")');
  const raw=x.sheets.data.sheets.find(s=>s.properties.title==='Completed Reviews').data[0].rowData[1].values[rows[0].indexOf('Reviewer Comments / Suggestions')];assert.ok(raw.userEnteredValue.stringValue);assert.equal(raw.userEnteredValue.formulaValue,undefined);
  await assert.rejects(x.portal.execute('getReview',['cookie','P1'],{...session,email:'other@example.com'}),/not available/);
  const pdf=await x.portal.execute('downloadReview',['cookie','P1'],session);assert.equal(Buffer.from(pdf.base64,'base64').subarray(0,4).toString(),'%PDF');
  await assert.rejects(x.portal.execute('downloadReview',['cookie','P1'],assistant),/view-only/);
  const rank=await x.portal.execute('getRankingData',['cookie'],session);assert.equal(rank.proposals.length,1);
  const auto=await x.portal.execute('autoRankProposals',['cookie'],session);assert.equal(auto.success,true);
  const ranked=await x.portal.execute('getRankingData',['cookie'],session);
  const rankData={version:ranked.version,proposalSetVersion:ranked.proposalSetVersion,baseRankings:ranked.saved,rankings:[],justifications:[{id:'P1',justification:'=a literal justification'}]};
  const cleared=await x.portal.execute('saveRankings',['cookie',rankData],session);assert.equal(cleared.success,true);assert.equal(cleared.saved.length,0);
  await assert.rejects(x.portal.execute('saveRankings',['cookie',rankData],session),/another tab/);
  const latest=await x.portal.execute('getRankingData',['cookie'],session);
  await assert.rejects(x.portal.execute('saveRankings',['cookie',{...rankData,version:latest.version,baseRankings:[],rankings:[{id:'P2',rank:1}]}],session),/personally reviewed/);
  const justified=await x.portal.execute('saveRankJustification',['cookie',{proposalId:'P1',justification:'Reason',version:latest.version}],session);assert.equal(justified.success,true);
});
test('write failures report uncertainty and concurrent updates fail closed',async()=>{
  const x=await setup();
  x.coordination.locks.add('data:data');await assert.rejects(x.portal.execute('saveDraft',['cookie',answers],session),/in progress/);x.coordination.locks.clear();
  x.sheets.commit=async()=>{throw new Error('network failure');};
  await assert.rejects(x.portal.execute('saveDraft',['cookie',answers],session),/Could not confirm/);
});
test('HTTP OTP boundary: origin, secure cookies, role switching, old password endpoints and logout',async t=>{
  const x=await setup(),server=createServer(createHandler(x));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}`;let cookie='';
  const post=async(action,args=[],origin=settings.origin)=>{
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify({action,args})});
    if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
    return {response,body:await response.json()};
  };
  assert.equal((await post('requestOtp',['ldc@example.com'],'https://attacker.example')).response.status,403);
  assert.equal((await post('getInitialData',['forged-token'])).response.status,401);
  const request=await post('requestOtp',['ldc@example.com']);assert.equal(request.response.status,200);assert.equal(request.body.result.code,undefined);
  const login=await post('verifyOtp',['ldc@example.com',request.body.result.challengeId,codeFrom(x)]);assert.equal(login.response.status,200);assert.equal(login.body.result.token,undefined);assert.match(login.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await post('getInitialData',['cookie'])).body.result.user.role,'LDC');
  assert.equal((await post('login',['ldc@example.com','obsolete'])).response.status,400);
  assert.equal((await post('changePassword',['cookie','old','new'])).response.status,400);
  assert.equal((await post('switchRole',['cookie','Admin'])).response.status,403);
  const originalCookie=cookie;assert.equal((await post('switchRole',['cookie','PIC'])).response.status,200);
  assert.equal((await post('getInitialData',['cookie'])).body.result.user.role,'PIC');
  const currentCookie=cookie;cookie=originalCookie;assert.equal((await post('getInitialData',['cookie'])).response.status,401);cookie=currentCookie;
  assert.equal((await post('logout',['cookie'])).response.status,200);assert.equal((await post('getInitialData',['cookie'])).response.status,401);
});
test('domain denies disabled accounts and removed active roles on every call',async()=>{
  const x=await setup(),db=await x.sheets.snapshot('data',['Users']);
  assert.throws(()=>createDomain(db,{...session,email:'disabled@example.com'}).currentUser(),/no longer/);
  assert.throws(()=>createDomain(db,{...session,activeRole:'Admin'}).currentUser(),/no longer/);
});


test('submission confirmations use the relay; mail failure preserves saved review and retry sends no duplicate',async()=>{
  for(const fail of [false,true]){
    const x=await setup();let calls=0;
    x.portal.settings={...settings,mailRelayUrl:'https://script.google.com/macros/s/test/exec',mailRelaySecret:'test-only-relay-secret-with-at-least-32-chars'};
    x.portal.mailer=async(_settings,message,key)=>{calls++;assert.equal(message.to,'ldc@example.com');assert.match(key,/^review-/);if(fail)throw Error('mail unavailable');};
    const result=await x.portal.execute('submitReview',['cookie',answers],session);
    assert.equal(result.success,true);assert.equal(result.emailSent,!fail);assert.equal(calls,1);
    const retry=await x.portal.execute('submitReview',['cookie',answers],session);
    assert.equal(retry.alreadySaved,true);assert.equal(calls,1);
    const db=await x.sheets.snapshot('data',['Completed Reviews']);assert.equal(db.getSheetByName('Completed Reviews').getDataRange().getValues().length,2);
  }
});

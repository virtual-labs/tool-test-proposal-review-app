import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureTables,payload,MemorySheets,MemoryCoordination,settings} from './fixtures.js';
import {Portal} from '../src/service.js';
function setup(){
 const t=fixtureTables(),ph=t.Proposals[0],rh=t['Completed Reviews'][0];
 t.Proposals=[ph];t['Completed Reviews']=[rh];
 for(const [id,email,rank,score] of [['A_BTBE05','ldc@example.com',1,4],['B_BTBE01','ldc@example.com',1,5],['A_DUP','ldc@example.com',1,6],['A_OTHER','other@example.com',1,5]]){
  const p={'Proposal ID':id,Domain:'CSE','Lab/Proposal Name':id,'Assigned LDC':email==='ldc@example.com'?'Reviewer':'Other','Institute Name':'IIT',Status:'Reviewed'};
  t.Proposals.push(ph.map(h=>p[h]??''));
  const r={'Review ID':'R_'+id,'Proposal ID':id,'Proposal Name':id,Domain:'CSE','Reviewer Email':email,Reviewer:p['Assigned LDC'],'Institute Name':'IIT',Rank:rank,'Form Version':'2','Rating Maximum':6,'Rank Updated At':'14/10/26 15:32:50','Rank Order Mode':'Manual'};
  t['Completed Reviews'].push(rh.map(h=>h.endsWith('(1–6)')?score:r[h]??''));
 }
 const sheets=new MemorySheets();sheets.data=payload(t);
 const portal=new Portal(settings,sheets,new MemoryCoordination(),null,async()=>{});
 const call=(action,data,role='LDC')=>portal.execute(action,['cookie',data],{email:role==='Admin'?'admin@example.com':'ldc@example.com',activeRole:role});
 return {call,sheets};
}
test('same rank is valid across sets/reviewers; later duplicates within a set remain unranked without writes',async()=>{
 const {call,sheets}=setup();const data=await call('getRankingData');
 assert.deepEqual(data.saved.map(r=>r.id),['A_BTBE05','B_BTBE01']);
 const monitor=await call('getAdminRankings',{},'Admin');
 assert.deepEqual(monitor.unrankedRows.map(r=>r.id),['A_DUP']);
 assert.equal(monitor.rows.find(r=>r.id==='B_BTBE01').reviewerTotal,1);
 assert.equal(monitor.rows.find(r=>r.id==='A_BTBE05').reviewerTotal,2);
 assert.equal(monitor.rows.find(r=>r.id==='A_OTHER').reviewerTotal,1);
 assert.equal((await call('getInitialData')).domain.ranked.length,3);assert.equal(sheets.commits,0);
});
test('manual save and generation use independent set ranges and preserve other reviewers',async()=>{
 const {call}=setup();const data=await call('getRankingData');
 const args={version:data.version,proposalSetVersion:data.proposalSetVersion,baseRankings:data.saved,rankings:[{id:'A_BTBE05',rank:1},{id:'A_DUP',rank:2},{id:'B_BTBE01',rank:1}]};
 await assert.rejects(call('saveRankings',{...args,rankings:[{id:'B_BTBE01',rank:2}]}),/within each set/);
 await assert.rejects(call('saveRankings',{...args,rankings:[{id:'A_BTBE05',rank:1},{id:'A_DUP',rank:1}]}),/within each set/);
 await call('saveRankings',args);assert.equal((await call('getRankingData')).saved.length,3);
 await call('autoRankProposals');const saved=new Map((await call('getRankingData')).saved.map(r=>[r.id,r.rank]));
 assert.equal(saved.get('A_DUP'),1);assert.equal(saved.get('A_BTBE05'),2);assert.equal(saved.get('B_BTBE01'),1);
 const monitor=await call('getAdminRankings',{},'Admin');assert.equal(monitor.rows.find(r=>r.id==='A_OTHER').rank,1);
});

test('reviewer progress counts only valid saved ranks within the filtered set',async()=>{
 const {call}=setup();const all=await call('getAdminData',{},'Admin');
 const owner=all.reviewers.find(r=>r.name==='Reviewer'),other=all.reviewers.find(r=>r.name==='Other');
 assert.equal(owner.reviewed,3);assert.equal(owner.ranked,2);assert.equal(other.ranked,1);
 const filtered=await call('getAdminData',{set:'A'},'Admin');assert.equal(filtered.reviewers.find(r=>r.name==='Reviewer').ranked,1);
 assert.equal((await call('getAdminData',{set:'B'},'Admin')).reviewers.find(r=>r.name==='Reviewer').ranked,1);
});

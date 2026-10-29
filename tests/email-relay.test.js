import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
import {relayEnvelope,sendEmail} from '../src/email.js';
const settings={mailRelayUrl:'https://script.google.com/macros/s/test/exec',mailRelaySecret:'test-only-relay-secret-with-at-least-32-characters'};
const message={to:'reviewer@example.com',subject:'Verification',body:'Your code is 123456. नमस्ते'};
function relay(){
  const store=new Map([['MAIL_RELAY_SECRET',settings.mailRelaySecret]]),outbox=[];
  const state={quota:100,busy:false,fail:false,released:0};
  const props={getProperty:k=>store.get(k)??null,getProperties:()=>Object.fromEntries(store),setProperty:(k,v)=>store.set(k,v),deleteProperty:k=>store.delete(k)};
  const context=vm.createContext({console:{log(){}},PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>!state.busy,releaseLock:()=>state.released++})},MailApp:{getRemainingDailyQuota:()=>state.quota,sendEmail:m=>{outbox.push(m);if(state.fail)throw Error('uncertain');}},Utilities:{Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature:(p,s)=>Array.from(createHmac('sha256',s).update(p).digest(),b=>b>127?b-256:b),formatDate:()=>new Date().toISOString().slice(0,10)},ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})}});
  new vm.Script(readFileSync(new URL('../apps-script-email/Code.gs',import.meta.url),'utf8')).runInContext(context);
  return {store,outbox,state,context,post:e=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(e)}}).text)};
}
test('Node signed envelopes interoperate with Apps Script; duplicate delivery is prevented',async()=>{
  const r=relay();let options;
  await sendEmail(settings,message,'otp-test',async(url,o)=>{assert.equal(url,settings.mailRelayUrl);options=o;return {ok:true,json:async()=>r.post(JSON.parse(o.body))};});
  assert.equal(options.redirect,'follow');assert.ok(options.signal);assert.equal(r.outbox.length,1);assert.equal(r.outbox[0].body,message.body);
  assert.equal(r.post(JSON.parse(options.body)).alreadySent,true);assert.equal(r.outbox.length,1);assert.equal(r.state.released,2);
  assert.equal(options.body.includes(settings.mailRelaySecret),false);
  r.context.verifyRelaySetup();assert.equal(r.outbox.length,1);assert.equal(r.context.doGet().text.includes(settings.mailRelaySecret),false);
});
test('relay rejects forged, altered, stale and malformed requests without sending',()=>{
  const r=relay(),good=relayEnvelope(settings,message,'request');
  for(const e of [{}, {...good,signature:'0'.repeat(64)},{...good,payload:good.payload+' '},relayEnvelope(settings,message,'old',Date.now()-180000),relayEnvelope(settings,message,'future',Date.now()+180000)])assert.equal(r.post(e).ok,false);
  assert.equal(r.outbox.length,0);
  assert.throws(()=>relayEnvelope(settings,{...message,to:'a@example.com,b@example.com'},'bad'),/Invalid/);
  assert.throws(()=>relayEnvelope(settings,{...message,subject:'test\r\nBcc: x'},'bad'),/Invalid/);
});
test('relay fails closed on quota, daily cap, busy lock and uncertain delivery',()=>{
  for(const mode of ['quota','cap','busy','fail']){
    const r=relay(),envelope=relayEnvelope(settings,message,mode);
    if(mode==='quota')r.state.quota=5;
    if(mode==='cap')r.store.set('RELAY_DAILY_LIMIT','1');
    if(mode==='busy')r.state.busy=true;
    if(mode==='fail')r.state.fail=true;
    const result=r.post(envelope);
    if(mode==='cap'){assert.equal(result.ok,true);assert.equal(r.post(relayEnvelope(settings,message,'second')).error,'QUOTA_UNAVAILABLE');}
    else assert.equal(result.ok,false);
    if(mode==='fail'){assert.equal(r.post(envelope).error,'DELIVERY_UNCERTAIN');assert.equal(r.outbox.length,1);}
    else if(mode!=='cap')assert.equal(r.outbox.length,0);
  }
});
test('transport requires matching positive acknowledgement and never retries errors',async()=>{
  for(const response of [{ok:false},{ok:true,json:async()=>{throw Error('HTML login');}},{ok:true,json:async()=>({ok:false})},{ok:true,json:async()=>({ok:true,requestId:'wrong'})}]){
    let calls=0;await assert.rejects(sendEmail(settings,message,'test',async()=>{calls++;return response;}),/relay/);assert.equal(calls,1);
  }
  await assert.rejects(sendEmail({},message,'test'),/not configured/);
  const manifest=JSON.parse(readFileSync(new URL('../apps-script-email/appsscript.json',import.meta.url)));
  assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/script.send_mail']);
});

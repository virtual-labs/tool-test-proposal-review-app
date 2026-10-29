import test from 'node:test';
import assert from 'node:assert/strict';
import {Auth,normalizedEmail} from '../src/auth.js';
import {MemorySheets,MemoryCoordination,settings} from './fixtures.js';
import {Portal} from '../src/service.js';
function setup(){const sheets=new MemorySheets(),coordination=new MemoryCoordination(),outbox=[],auth=new Auth(settings,sheets,coordination,async(_settings,message)=>outbox.push(message));const portal=new Portal(settings,sheets,coordination,auth);return {auth,coordination,outbox,user:e=>portal.registeredUser(e)};}
const code=x=>x.outbox.at(-1).body.match(/code is (\d{6})/)[1];
test('OTP is delivered only to active users, never returned or stored as plaintext, and is single use',async()=>{
  const x=setup(),request=await x.auth.requestOtp('LDC@example.com','test',x.user);
  assert.equal(request.code,undefined);assert.equal(x.outbox.length,1);assert.match(code(x),/^\d{6}$/);
  const stored=await x.coordination.get(`otp:${request.challengeId}`);assert.equal(stored.code,undefined);assert.notEqual(stored.digest,code(x));assert.equal(stored.attempts,0);
  const result=await x.auth.verifyOtp('ldc@example.com',request.challengeId,code(x),'test',x.user);assert.equal(result.session.activeRole,'LDC');assert.equal((await x.auth.authenticate(result.token)).email,'ldc@example.com');
  await assert.rejects(x.auth.verifyOtp('ldc@example.com',request.challengeId,code(x),'test',x.user),/Invalid or expired/);
  await x.auth.logout(result.token);await assert.rejects(x.auth.authenticate(result.token),/Session expired/);
  for(const email of ['missing@example.com','disabled@example.com']){
    const before=x.outbox.length,decoy=await x.auth.requestOtp(email,'test',x.user);assert.equal(x.outbox.length,before);assert.equal(decoy.message,request.message);assert.equal(await x.coordination.get(`otp:${decoy.challengeId}`),undefined);
  }
});
test('resend cooldown, wrong codes, expiry, wrong-email binding and five-attempt lockout',async()=>{
  const x=setup(),request=await x.auth.requestOtp('ldc@example.com','test',x.user),right=code(x),wrong=right==='000000'?'000001':'000000';
  await assert.rejects(x.auth.requestOtp('ldc@example.com','test',x.user),/Wait 60/);
  await assert.rejects(x.auth.verifyOtp('other@example.com',request.challengeId,right,'test',x.user),/Invalid or expired/);
  for(let i=0;i<5;i++)await assert.rejects(x.auth.verifyOtp('ldc@example.com',request.challengeId,wrong,'test',x.user),/Invalid or expired/);
  await assert.rejects(x.auth.verifyOtp('ldc@example.com',request.challengeId,right,'test',x.user),/Invalid or expired/);
  const y=setup(),expired=await y.auth.requestOtp('ldc@example.com','test',y.user);y.coordination.data.get(`otp:${expired.challengeId}`).expiresAt=Date.now()-1;
  await assert.rejects(y.auth.verifyOtp('ldc@example.com',expired.challengeId,code(y),'test',y.user),/Invalid or expired/);
});
test('new challenge invalidates previous codes; account is rechecked at verification; concurrent replay has one winner',async()=>{
  const x=setup(),first=await x.auth.requestOtp('ldc@example.com','test',x.user),old=code(x);
  for(const key of x.coordination.data.keys())if(key.startsWith('otp-cooldown:'))x.coordination.data.delete(key);
  const second=await x.auth.requestOtp('ldc@example.com','test',x.user),latest=code(x);
  await assert.rejects(x.auth.verifyOtp('ldc@example.com',first.challengeId,old,'test',x.user),/Invalid or expired/);
  const results=await Promise.allSettled([x.auth.verifyOtp('ldc@example.com',second.challengeId,latest,'test',x.user),x.auth.verifyOtp('ldc@example.com',second.challengeId,latest,'test',x.user)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const y=setup(),request=await y.auth.requestOtp('ldc@example.com','test',y.user);
  await assert.rejects(y.auth.verifyOtp('ldc@example.com',request.challengeId,code(y),'test',async()=>null),/Invalid or expired/);
});
test('OTP request/verify rate limits and malformed inputs are enforced',async()=>{
  const x=setup();assert.throws(()=>normalizedEmail('not-an-email'),/valid email/);
  for(let i=0;i<5;i++){
    for(const key of x.coordination.data.keys())if(key.startsWith('otp-cooldown:'))x.coordination.data.delete(key);
    await x.auth.requestOtp('ldc@example.com','test',x.user);
  }
  await assert.rejects(x.auth.requestOtp('ldc@example.com','test',x.user),/Too many/);
  const y=setup();for(let i=0;i<15;i++)await assert.rejects(y.auth.verifyOtp('ldc@example.com','invalid','123456','test',y.user),/Invalid or expired/);
  await assert.rejects(y.auth.verifyOtp('ldc@example.com','invalid','123456','test',y.user),/Too many/);
});
test('email failures invalidate challenge without leaking account existence; mail adapter sends server-side only',async()=>{
  const x=setup();x.auth.mailer=async()=>{throw new Error('provider offline');};
  const request=await x.auth.requestOtp('ldc@example.com','test',x.user);assert.equal(await x.coordination.get(`otp:${request.challengeId}`),undefined);assert.equal(request.code,undefined);
});

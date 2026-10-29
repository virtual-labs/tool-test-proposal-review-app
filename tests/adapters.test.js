import test from 'node:test';
import assert from 'node:assert/strict';
import { Sheets,SheetSnapshot } from '../src/sheets.js';
import { Coordination } from '../src/coordination.js';
import { config } from '../src/config.js';
import { payload } from './fixtures.js';

test('Sheets reads preserve rich links, formulas, IST dates, and row positions',()=>{
  const data=payload({Proposals:[['Header','Date','Formula'],['label',1,'text'],[],['later']]});
  const cells=data.sheets[0].data[0].rowData[1].values;
  data.sheets[0].data[0].rowData[5]={values:[{effectiveFormat:{numberFormat:{type:'DATE'}}}]};
  cells[0].hyperlink='https://example.com';cells[0].textFormatRuns=[{format:{link:{uri:'https://example.com/run'}}}];
  cells[1]={effectiveValue:{numberValue:25569.5},effectiveFormat:{numberFormat:{type:'DATE_TIME'}}};
  cells[2].userEnteredValue={formulaValue:'=SUM(1,2)'};
  const db=new SheetSnapshot(data),sheet=db.getSheetByName('Proposals');
  assert.equal(sheet.getRange(2,1).getRichTextValue().getLinkUrl(),'https://example.com');
  assert.equal(sheet.getRange(2,1).getRichTextValue().getRuns()[0].getLinkUrl(),'https://example.com/run');
  assert.equal(sheet.getRange(2,2).getValues()[0][0].toISOString(),'1970-01-01T06:30:00.000Z');
  assert.equal(sheet.getRange(2,3).getFormula(),'=SUM(1,2)');
  assert.equal(sheet.getLastRow(),4);assert.equal(sheet.getRange(3,1).getValues()[0][0],'');
});
test('Sheets commits one atomic batch, disables retries, and checks lease first',async()=>{
  const calls=[],client={async request(options){calls.push(structuredClone(options));return {data:{}};}};
  const api=new Sheets({},client),db=new SheetSnapshot(payload({Test:[['Header']]}));
  db.getSheetByName('Test').getRange(2,1).setValue('safe');db.getSheetByName('Test').getRange(3,1).setValue("'=SUM(1,2)");
  await assert.rejects(api.commit('id',db,{async verify(){throw new Error('lease lost');}}),/lease lost/);assert.equal(calls.length,0);
  await api.commit('id',db,{async verify(){}});assert.equal(calls.length,1);assert.equal(calls[0].retry,false);assert.equal(calls[0].data.requests.length,2);
  assert.equal(calls[0].data.requests[1].updateCells.rows[0].values[0].userEnteredValue.stringValue,'=SUM(1,2)');
});
test('Redis lock ownership, failed acquisition, rate limit and fail-closed outages',async()=>{
  const c=new Coordination({});let owner='';const commands=[];
  c.command=async(...args)=>{commands.push(args);if(args[0]==='SET'){owner=args[2];return 'OK';}if(args[0]==='GET')return owner;if(args[0]==='EVAL')return 1;};
  await c.withLock('test',async lease=>{await lease.verify();});
  assert.equal(commands[0][3],'NX');assert.equal(commands.at(-1)[0],'EVAL');assert.ok(commands.at(-1)[1].includes('ARGV[1]'));
  c.command=async()=>null;await assert.rejects(c.withLock('test',async()=>assert.fail('unlocked write')),/in progress/);
  c.command=async()=>11;await assert.rejects(c.limit('account',10,60),/Too many/);
  const offline=new Coordination({redisUrl:'https://redis.example',redisToken:'secret'},async()=>({ok:false}));
  await assert.rejects(offline.get('session'),/unavailable/);
});
test('server configuration requires OTP and mail secrets and rejects unsafe origins',()=>{
  const base={APP_ORIGIN:'https://portal.example',GOOGLE_CLIENT_EMAIL:'service@example.com',GOOGLE_PRIVATE_KEY:'fake',GOOGLE_SPREADSHEET_ID:'data',OTP_SECRET:'a-random-test-only-secret-with-32-characters',MAIL_RELAY_URL:'https://script.google.com/macros/s/test-deployment/exec',MAIL_RELAY_SECRET:'separate-test-relay-secret-at-least-32-chars',REDIS_REST_URL:'https://redis.example',REDIS_REST_TOKEN:'fake'};
  assert.equal(config(base).secure,true);
  assert.throws(()=>config({...base,OTP_SECRET:'short'}),/32 random/);assert.throws(()=>config({...base,MAIL_RELAY_SECRET:''}),/MAIL_RELAY_SECRET/);
  for(const url of ['https://script.google.com/macros/s/test/dev','https://example.com/exec','http://script.google.com/macros/s/test/exec'])assert.throws(()=>config({...base,MAIL_RELAY_URL:url}));
  assert.throws(()=>config({...base,MAIL_RELAY_SECRET:base.OTP_SECRET}));
  assert.throws(()=>config({...base,APP_ORIGIN:'http://portal.example'}),/HTTPS/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {MemorySheets,MemoryCoordination,settings,fixtureTables,payload} from './fixtures.js';
import {Portal} from '../src/service.js';
const owner={email:'ldc@example.com',activeRole:'LDC'},recipient={email:'other@example.com',activeRole:'LDC'};
const answers={proposalId:'P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:6};
test('domain sharing grants read/download only, rejects unauthorized and stale batches, and revokes access',async()=>{
 const sheets=new MemorySheets(),portal=new Portal(settings,sheets,new MemoryCoordination(),null,async()=>{});
 const call=(action,data,user=owner)=>portal.execute(action,['cookie',data],user);
 await call('submitReview',answers);
 await assert.rejects(call('getReview','P1',recipient));await assert.rejects(call('downloadReview','P1',recipient));
 const change={shared:true,proposals:[{id:'P1',version:'',expectedShared:false}]};
 for(const user of [recipient,{email:'admin@example.com',activeRole:'Admin'},{...owner,activeRole:'PIC'},{email:'assistant@example.com',activeRole:'Assistant Reviewer'}])await assert.rejects(call('saveReviewSharing',change,user));
 await assert.rejects(call('saveReviewSharing',{...change,proposals:[...change.proposals,{id:'P2',version:'',expectedShared:false}]}));
 assert.equal((await call('getInitialData',undefined,recipient)).domain.shared.length,0);
 await call('saveReviewSharing',change);await assert.rejects(call('saveReviewSharing',change),/changed/);
 const data=await call('getInitialData',undefined,recipient);assert.deepEqual(data.domain.shared.map(r=>r.id),['P1']);assert.equal(data.domain.shared[0].downloadable,true);assert.equal(data.domain.shared[0].canShare,false);assert.equal(data.personal.reviewed.length,0);assert.equal(data.personal.selected.length,0);
 assert.equal((await call('getReview','P1',recipient)).id,'P1');assert.equal(Buffer.from((await call('downloadReview','P1',recipient)).base64,'base64').subarray(0,4).toString(),'%PDF');
 await assert.rejects(call('saveProposalSelections',{selections:[{id:'P1',selected:'Yes',expectedSelected:'-',version:''}]},recipient));
 const owned=(await call('getInitialData')).domain.reviewed.find(r=>r.id==='P1');await call('saveReviewSharing',{shared:false,proposals:[{id:'P1',version:owned.sharingVersion,expectedShared:true}]});
 assert.equal((await call('getInitialData',undefined,recipient)).domain.shared.length,0);await assert.rejects(call('getReview','P1',recipient));await assert.rejects(call('downloadReview','P1',recipient));
});
test('sharing follows current domain, active account and role; source ownership and domain changes fail closed',async()=>{
 const tables=fixtureTables(),h=tables.Users[0];
 tables.Users.push(h.map(k=>({Email:'outside@example.com',Name:'Outside',Role:'LDC',Status:'Active',Domain:'ECE'})[k]||''));
 const sheets=new MemorySheets();sheets.data=payload(tables);const portal=new Portal(settings,sheets,new MemoryCoordination(),null,async()=>{});
 const call=(action,data,user=owner)=>portal.execute(action,['cookie',data],user);
 await call('submitReview',answers);await call('saveReviewSharing',{shared:true,proposals:[{id:'P1',version:'',expectedShared:false}]});
 await assert.rejects(call('getReview','P1',{email:'outside@example.com',activeRole:'LDC'}));await assert.rejects(call('getReview','P1',{email:'disabled@example.com',activeRole:'LDC'}));
 const baseline=structuredClone(sheets.data);
 const alter=(sheetName,row,header,value)=>{const sheet=sheets.data.sheets.find(s=>s.properties.title===sheetName),grid=sheet.data[0].rowData,cols=grid[0].values.map(c=>c.effectiveValue.stringValue);grid[row].values[cols.indexOf(header)]={effectiveValue:{stringValue:value}};};
 for(const [sheet,row,field,value] of [['Users',2,'Domain','ECE'],['Users',2,'Status','Inactive'],['Users',2,'Role','PIC'],['Users',1,'Domain','ECE'],['Users',1,'Status','Inactive'],['Proposals',1,'Domain','ECE'],['Completed Reviews',1,'Reviewer Email','outside@example.com']]){
  sheets.data=structuredClone(baseline);alter(sheet,row,field,value);await assert.rejects(call('getReview','P1',recipient));await assert.rejects(call('downloadReview','P1',recipient));
 }
});

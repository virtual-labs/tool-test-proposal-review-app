import test from 'node:test';
import assert from 'node:assert/strict';
import {MemorySheets,MemoryCoordination,settings} from './fixtures.js';
import {Portal} from '../src/service.js';
const owner={email:'ldc@example.com',activeRole:'LDC'};
const answers={proposalId:'P1',draftVersion:'',clarity:5,academicRelevance:5,pedagogicalNeed:5,quality:5,experimentDesign:5,jobRelevance:5,userExperience:5,overallRating:6};
test('LDC selections persist, reject unauthorized/stale writes, and can be removed',async()=>{
 const sheets=new MemorySheets(),portal=new Portal(settings,sheets,new MemoryCoordination(),null,async()=>{});
 const call=(action,data,user=owner)=>portal.execute(action,['cookie',action==='saveProposalSelections'?{selections:data}:data],user);
 await call('submitReview',answers);
 const change={id:'P1',selected:'Yes',expectedSelected:'-',version:'',remarks:'Ready for selection',expectedRemarks:''};
 for(const user of [{email:'other@example.com',activeRole:'LDC'},{email:'admin@example.com',activeRole:'Admin'},{...owner,activeRole:'PIC'},{email:'assistant@example.com',activeRole:'Assistant Reviewer'}])await assert.rejects(call('saveProposalSelections',[change],user));
 await assert.rejects(call('saveProposalSelections',[{...change,selected:'Maybe'}]));
 await assert.rejects(call('saveProposalSelections',[change,{...change,id:'P2'}]));
 assert.equal((await call('getInitialData')).domain.selected.length,0);
 await call('saveProposalSelections',[change]);
 const data=await call('getInitialData');assert.equal(data.personal.reviewed[0].remarks,'Ready for selection');assert.equal(data.personal.reviewed[0].overallScore,35);assert.deepEqual(data.domain.selected.map(p=>p.id),['P1']);
 assert.equal((await call('getInitialData',undefined,{email:'other@example.com',activeRole:'LDC'})).domain.selected.length,1);
 const admin={email:'admin@example.com',activeRole:'Admin'};
 assert.deepEqual((await call('getAdminData',{},admin)).all.selected.map(p=>p.id),['P1']);
 assert.equal((await call('getAdminData',{institute:'Other Institute'},admin)).all.selected.length,0);
 assert.equal((await call('getAdminData',{set:'A'},admin)).all.selected.length,0);
 assert.deepEqual((await call('getAdminData',{}, {...owner,activeRole:'PIC'})).all.selected.map(p=>p.id),['P1']);
 await assert.rejects(call('saveProposalSelections',[change]),/changed/);
 const row=data.personal.reviewed[0];await call('saveProposalSelections',[{id:'P1',selected:'No',expectedSelected:'Yes',version:row.selectionVersion}]);
 assert.equal((await call('getInitialData')).domain.selected.length,0);
 for(const selected of ['On Hold','-','Yes','On Hold','No']){
  const before=(await call('getInitialData')).personal.reviewed[0];
  await call('saveProposalSelections',[{id:'P1',selected,expectedSelected:before.selected,version:before.selectionVersion}]);
  const after=await call('getInitialData');assert.equal(after.personal.reviewed[0].selected,selected);assert.equal(after.domain.selected.length,selected==='Yes'?1:0);
  const review=await call('getReview','P1');assert.equal(review.selected,selected);assert.equal(review.remarks,'Ready for selection');
  const summary=await call('getSummaryData',{});assert.equal(summary.domains.reduce((n,r)=>n+r.selectedLabs,0),selected==='Yes'?1:0);
 }
 const before=(await call('getInitialData')).personal.reviewed[0];
 await assert.rejects(call('saveProposalSelections',[{id:'P1',selected:before.selected,expectedSelected:before.selected,version:before.selectionVersion,remarks:'changed',expectedRemarks:'stale'}]),/Remarks changed/);
 await call('saveProposalSelections',[{id:'P1',selected:before.selected,expectedSelected:before.selected,version:before.selectionVersion,remarks:'',expectedRemarks:before.remarks}]);
 assert.equal((await call('getInitialData')).personal.reviewed[0].remarks,'');
 const db=await sheets.snapshot('id',['Completed Reviews']);assert.ok(db.getSheetByName('Completed Reviews').getDataRange().getValues()[0].includes('Selected'));
});

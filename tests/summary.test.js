import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureTables,payload} from './fixtures.js';
import {SheetSnapshot} from '../src/sheets.js';
import {createDomain} from '../src/domain.js';

test('summary exposes only portal-wide aggregates for every role, with sets and incomplete experiment counts',()=>{
 const tables=fixtureTables();tables.Proposals[1][0]='A_P1';tables.Proposals[2][0]='B_P2';
 const h=tables.Proposals[0];tables.Proposals[1][h.indexOf('Status')]='Reviewed';
 for(const [email,activeRole] of [['ldc@example.com','LDC'],['ldc@example.com','PIC'],['assistant@example.com','Assistant Reviewer'],['admin@example.com','Admin']]){
  const db=new SheetSnapshot(payload(tables)),domain=createDomain(db,{email,activeRole});
  const result=domain.getSummaryData('cookie',{});
  assert.deepEqual(Object.keys(result),['domains','institutes']);
  assert.deepEqual(result.domains,[{name:'CSE',labs:2,experiments:4,missingExperiments:1,reviewed:1,pending:1,selectedLabs:0,selectedExperiments:0,missingSelectedExperiments:0}]);
  assert.equal(result.institutes.length,2);
  assert.equal(domain.getSummaryData('cookie',{set:'A'}).domains[0].labs,1);
  assert.equal(domain.getSummaryData('cookie',{set:'B'}).domains[0].pending,1);
  assert.equal(db.pending.length,0);
 }
});
test('summary uses completed reviews, handles missing labels and rejects duplicate IDs and disabled users',()=>{
 const tables=fixtureTables(),h=tables.Proposals[0];
 tables.Proposals[1][h.indexOf('Domain')]='';tables.Proposals[1][h.indexOf('Institute Name')]='';tables.Proposals[1][h.indexOf('No. of Experiments')]='-3';
 const rh=tables['Completed Reviews'][0];tables['Completed Reviews'].push(rh.map(k=>k==='Proposal ID'?'P1':''));
 const admin={email:'admin@example.com',activeRole:'Admin'};
 const domain=createDomain(new SheetSnapshot(payload(tables)),admin);
 const row=domain.getSummaryData('cookie').domains.find(r=>r.name==='Not configured');assert.equal(row.reviewed,1);assert.equal(row.missingExperiments,1);
 assert.throws(()=>createDomain(new SheetSnapshot(payload(tables)),{email:'disabled@example.com',activeRole:'LDC'}).getSummaryData('cookie'));
 tables.Proposals[2][0]='P1';assert.throws(()=>createDomain(new SheetSnapshot(payload(tables)),admin).getSummaryData('cookie'),/Duplicate Proposal ID/);
});

test('selected summary totals follow saved Yes choices, set and missing experiment values',()=>{
 const tables=fixtureTables(),ph=tables.Proposals[0];tables.Proposals[1][0]='A_1';tables.Proposals[2][0]='B_1';
 const rh=[...tables['Completed Reviews'][0],'Selected'];tables['Completed Reviews']=[rh];
 for(const id of ['A_1','B_1'])tables['Completed Reviews'].push(rh.map(h=>h==='Proposal ID'?id:h==='Selected'?'Yes':''));
 const domain=createDomain(new SheetSnapshot(payload(tables)),{email:'admin@example.com',activeRole:'Admin'});
 const all=domain.getSummaryData('cookie',{}).domains[0];assert.equal(all.selectedLabs,2);assert.equal(all.selectedExperiments,4);assert.equal(all.missingSelectedExperiments,1);
 const a=domain.getSummaryData('cookie',{set:'A'}).domains[0];assert.equal(a.selectedLabs,1);assert.equal(a.selectedExperiments,4);assert.equal(a.missingSelectedExperiments,0);
 tables['Completed Reviews'][1][rh.indexOf('Selected')]='No';
 assert.equal(createDomain(new SheetSnapshot(payload(tables)),{email:'admin@example.com',activeRole:'Admin'}).getSummaryData('cookie',{}).domains[0].selectedLabs,1);
 assert.ok(ph.includes('No. of Experiments'));
});

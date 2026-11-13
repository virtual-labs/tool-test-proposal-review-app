import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSet,filterBoard} from '../shared/proposal-set.js';
import {fixtureTables,payload} from './fixtures.js';
import {SheetSnapshot} from '../src/sheets.js';
import {createDomain} from '../src/domain.js';

test('set filters use only exact proposal ID prefixes and preserve unknown IDs in All sets',()=>{
 const rows=[{id:'A_1'},{id:'B_1'},{id:'BA_1'},{id:'X',name:'A_Proposal'}];
 assert.deepEqual(rows.filter(p=>matchesSet(p,'A')).map(p=>p.id),['A_1']);
 assert.equal(rows.filter(p=>matchesSet(p,'')).length,4);
 const board={reviewed:[rows[0]],ranked:[rows[0]],draft:[rows[1]],pending:[rows[2]],total:3};
 assert.equal(filterBoard(board,'A').total,1);
 assert.equal(filterBoard(board,'B').draft.length,1);
 assert.equal(board.total,3);
});
test('monitor and directory set filters compose with institute scope and progress counts',()=>{
 const tables=fixtureTables();tables.Proposals[1][0]='A_P1';tables.Proposals[2][0]='B_P2';
 const db=new SheetSnapshot(payload(tables));
 const admin=createDomain(db,{email:'admin@example.com',activeRole:'Admin'});
 assert.deepEqual(admin.getAdminProposals('cookie',{set:'B'}).rows.map(r=>r.id),['B_P2']);
 const filtered=admin.getAdminData('cookie',{set:'A'});
 assert.equal(filtered.all.total,1);assert.equal(filtered.domains[0].total,1);
 assert.equal(admin.getAdminData('cookie',{set:'B',institute:'IIT'}).all.total,0);
 const pic=createDomain(db,{email:'ldc@example.com',activeRole:'PIC'});
 assert.equal(pic.getAdminData('cookie',{set:'B'}).all.total,0);
 assert.equal(admin.getAdminUsers('cookie',{set:'A'}).rows.length,admin.getAdminUsers('cookie',{}).rows.length);
});

test('rank monitoring filters both ranked and unranked reviews without renumbering',()=>{
 const tables=fixtureTables();tables.Proposals[1][0]='A_P1';tables.Proposals[2][0]='B_P2';
 const headers=tables['Completed Reviews'][0];
 for(const [id,rank] of [['A_P1',2],['B_P2','']]){
  const row={'Review ID':'R_'+id,'Proposal ID':id,'Proposal Name':id,Domain:'CSE',Reviewer:'Reviewer','Reviewer Email':'ldc@example.com','Institute Name':'IIT',Rank:rank,'Submission Date/Time':'2026-11-13T08:00:00.000Z'};
  tables['Completed Reviews'].push(headers.map(h=>row[h]??''));
 }
 const admin=createDomain(new SheetSnapshot(payload(tables)),{email:'admin@example.com',activeRole:'Admin'});
 const a=admin.getAdminRankings('cookie',{set:'A'}), b=admin.getAdminRankings('cookie',{set:'B'});
 assert.deepEqual(a.rows.map(r=>r.id),['A_P1']);assert.equal(a.rows[0].rank,2);assert.equal(a.rows[0].reviewerTotal,2);
 assert.equal(a.unrankedRows.length,0);assert.equal(b.rows.length,0);assert.deepEqual(b.unrankedRows.map(r=>r.id),['B_P2']);
});

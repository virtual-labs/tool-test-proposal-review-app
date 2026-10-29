import test from 'node:test';
import assert from 'node:assert/strict';
import {sortedRows} from '../client/table-sort.js';
test('rank sorting keeps unranked first ascending, last descending, with ID ties and no mutation',()=>{
 const rows=[{id:'P3',rank:null},{id:'P4',rank:2},{id:'P1',rank:''},{id:'P2',rank:1}],columns=[{key:'rank',emptyFirst:true}];
 assert.deepEqual(sortedRows(rows,columns,{key:'rank',direction:1}).map(r=>r.id),['P1','P3','P2','P4']);
 assert.deepEqual(sortedRows(rows,columns,{key:'rank',direction:-1}).map(r=>r.id),['P4','P2','P1','P3']);
 assert.deepEqual(rows.map(r=>r.id),['P3','P4','P1','P2']);
});

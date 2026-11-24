import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {reviewPdf} from '../src/pdf.js';
function pdfText(base64){
 const raw=Buffer.from(base64,'base64').toString('latin1');
 return [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match=>{
  const stream=inflateSync(Buffer.from(match[1],'latin1')).toString('latin1');
  return [...stream.matchAll(/<([0-9a-f]+)>/gi)].map(m=>Buffer.from(m[1],'hex').toString('latin1')).join('');
 }).join('\n');
}
test('PDF includes every saved selection status and separate multiline remarks with empty defaults',async()=>{
 const review={id:'P1',name:'Test Lab',formVersion:'2',ratingMaximum:6,ratings:[],justification:'Rank reasoning',reviewerComments:'Review comments'};
 for(const selected of ['Yes','No','On Hold','-',undefined]){
  const result=await reviewPdf({fileName:'test.pdf',review:{...review,selected,remarks:'Selection reasoning\nSecond remark line'}});
  const text=pdfText(result.base64);assert.ok(text.includes('Selected: '+(selected||'-')));assert.ok(text.includes('Remarks: Selection reasoningSecond remark line'));assert.ok(text.includes('Rank reasoning'));assert.ok(text.includes('Review comments'));
 }
 const blank=pdfText((await reviewPdf({fileName:'test.pdf',review})).base64);assert.ok(blank.includes('Remarks: None'));
 const long=pdfText((await reviewPdf({fileName:'test.pdf',review:{...review,remarks:'Long selection remark. '.repeat(400)+'End of remarks'}})).base64);assert.ok(long.includes('End of remarks'));
});

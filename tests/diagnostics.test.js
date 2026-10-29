import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnostic} from '../src/diagnostics.js';
test('diagnostics expose allowlisted metadata without secrets, inputs, stack or upstream bodies',()=>{
 const error=new TypeError('Invalid URL secret-token reviewer@example.com 123456',{cause:{code:'ENOTFOUND',message:'secret'}});error.code='ERR_INVALID_URL';error.response={status:403,data:{private_key:'secret'}};
 const result=diagnostic(error,'configuration');assert.deepEqual(result,{category:'internal',stage:'configuration',name:'TypeError',code:'ENOTFOUND',upstreamStatus:403});
 assert.equal(JSON.stringify(result).includes('secret'),false);
 assert.equal(diagnostic(new Error('Missing server configuration: MAIL_RELAY_URL'),'configuration').missingVariable,'MAIL_RELAY_URL');
 assert.equal(diagnostic({name:'secret',code:'secret',message:'secret'},'otp-request').name,'Error');
});

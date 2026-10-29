import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortalServer} from '../src/app-server.js';

test('production server never serves local configuration, environment, source or the test-only inbox',async t=>{
  const server=await createPortalServer((_req,res)=>{res.end('api');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/MANUAL_CONFIGURATION.md','/.env.local','/src/config.js','/apps-script-email/Code.gs','/apps-script-email/appsscript.json','/tests/ui-server.js','/__test/mailbox','/%2e%2e%2fMANUAL_CONFIGURATION.md']){
    const response=await fetch(origin+path);assert.equal(response.status,404,path);assert.ok(!response.headers.get('access-control-allow-origin'));
  }
  const health=await fetch(origin+'/health');assert.equal(health.status,200);assert.equal((await health.json()).integrations,'not checked');
  assert.match(health.headers.get('content-security-policy'),/script-src 'self';/);
});

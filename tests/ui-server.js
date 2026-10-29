// Test-only server. The mailbox exists only here, never in the deployed API.
import {MemorySheets,MemoryCoordination,settings as base} from './fixtures.js';
import {Auth} from '../src/auth.js';
import {Portal} from '../src/service.js';
import {createHandler} from '../src/http.js';
import {createPortalServer} from '../src/app-server.js';
const settings={...base,origin:'http://127.0.0.1:3001'},sheets=new MemorySheets(),coordination=new MemoryCoordination(),outbox=[];
const auth=new Auth(settings,sheets,coordination,async(_settings,message)=>outbox.push(message)),portal=new Portal(settings,sheets,coordination,auth);
const handler=createHandler({settings,sheets,coordination,auth,portal});
const server=await createPortalServer(handler,{beforeRequest:async(req,res)=>{
  const url=new URL(req.url,settings.origin);
  if(url.pathname==='/__test/mailbox'){
    const mail=outbox.filter(message=>message.to===url.searchParams.get('email')).at(-1);
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:mail?.body.match(/code is (\d{6})/)?.[1]}));return true;
  }
  if(url.pathname==='/__test/reset'&&req.method==='POST'){
    coordination.data.clear();coordination.limits.clear();outbox.length=0;
    const fresh=new MemorySheets();sheets.data=fresh.data;res.end('reset');return true;
  }
  if(url.pathname==='/__test/clear-limits'&&req.method==='POST'){
    for(const key of coordination.data.keys())if(key.startsWith('otp-cooldown:'))coordination.data.delete(key);coordination.limits.clear();res.end('cleared');return true;
  }
  if(url.pathname==='/__test/expire'&&req.method==='POST'){
    for(const key of coordination.data.keys())if(key.startsWith('session:'))coordination.data.delete(key);
    res.end('expired');return true;
  }
  return false;
}});
server.listen(3001,'127.0.0.1');

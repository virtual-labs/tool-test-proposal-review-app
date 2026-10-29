import { config } from './config.js';
import { Sheets } from './sheets.js';
import { Coordination } from './coordination.js';
import { Auth } from './auth.js';
import { Portal } from './service.js';
import { createDomain } from './domain.js';
import { PortalError } from './errors.js';

export function securityHeaders(res,{development=false}={}) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  if(development)res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
}
function cookieName(settings){return settings.secure?'__Host-vl_session':'vl_session';}
function tokenFrom(req,settings){
  const name=cookieName(settings)+'=';
  const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name));
  return value?value.slice(name.length):'';
}
function sessionCookie(res,settings,token='',expiresAt=0){
  res.setHeader('Set-Cookie',`${cookieName(settings)}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?Math.max(0,Math.floor((expiresAt-Date.now())/1000)):0}${settings.secure?'; Secure':''}`);
}
async function readBody(req){
  if(req.body!==undefined){
    const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
    if(Buffer.byteLength(raw)>65536)throw new PortalError('Request too large.',413);
    try{return typeof req.body==='string'?JSON.parse(raw):req.body;}catch{throw new PortalError('Invalid JSON.');}
  }
  const chunks=[];let size=0;
  for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>65536)throw new PortalError('Request too large.',413);chunks.push(Buffer.from(chunk));}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PortalError('Invalid JSON.');}
}
export function createHandler(dependencies) {
  return async function handler(req,res){
    securityHeaders(res);res.setHeader('Content-Type','application/json; charset=utf-8');
    const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
    try{
      if(req.method!=='POST'){res.setHeader('Allow','POST');throw new PortalError('Use POST.',405);}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new PortalError('Use application/json.',415);
      const body=await readBody(req);
      if(!body || typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string'||!Array.isArray(body.args)||body.args.length>3)throw new PortalError('Invalid request.');
      // The public login page can render without configured secrets. No data is exposed.
      if(!dependencies && body.action==='session' && !/\b(?:__Host-)?vl_session=/.test(req.headers.cookie||'')){
        send(200,{ok:true,result:{authenticated:false}});return;
      }
      const settings=dependencies?.settings || config();
      if(req.headers.origin!==settings.origin)throw new PortalError('Request origin is not allowed.',403);
      const sheets=dependencies?.sheets || new Sheets(settings);
      const coordination=dependencies?.coordination || new Coordination(settings);
      const auth=dependencies?.auth || new Auth(settings,sheets,coordination);
      const portal=dependencies?.portal || new Portal(settings,sheets,coordination,auth);
      const token=tokenFrom(req,settings),{action,args}=body;
      const ip=process.env.VERCEL?String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim():req.socket?.remoteAddress||'local';
      let result;
      if(action==='requestOtp'){
        if(args.length!==1)throw new PortalError('Email is required.');
        result=await auth.requestOtp(args[0],ip,email=>portal.registeredUser(email));
      }else if(action==='verifyOtp'){
        if(args.length!==3)throw new PortalError('Email, challenge, and code are required.');
        const issued=await auth.verifyOtp(args[0],args[1],args[2],ip,email=>portal.registeredUser(email));
        await auth.logout(token);
        sessionCookie(res,settings,issued.token,issued.session.expiresAt);
        result={expiresAt:issued.session.expiresAt,email:issued.session.email};
      }else if(action==='logout'){
        await auth.logout(token);sessionCookie(res,settings);result={success:true};
      }else if(action==='session' && !token){result={authenticated:false};
      }else{
        const session=await auth.authenticate(token);
        await coordination.limit(`request:${session.email}`,180,60);
        if(action==='session'||action==='switchRole'){
          const db=await sheets.snapshot(settings.spreadsheetId,['Users']);
          const user=createDomain(db,session).currentUser();
          if(action==='switchRole'){
            if(args.length!==2||!user.roles.includes(args[1]))throw new PortalError('That role is not assigned to you.',403);
            const issued=await auth.issue(session.email,args[1],session.expiresAt);
            await auth.logout(token);sessionCookie(res,settings,issued.token,issued.session.expiresAt);
            result={success:true};
          }else result={authenticated:true,email:session.email,expiresAt:session.expiresAt};
        }else result=await portal.execute(action,args,session);
      }
      send(200,{ok:true,result});
    }catch(error){
      const status=error instanceof PortalError?error.status:500;
      if(status===500)console.error('PORTAL_SERVER_ERROR',{category:'internal',name:error.name});
      send(status,{ok:false,error:status===500?'The portal is unavailable. Ask the administrator to check server configuration and service access.':error.message});
    }
  };
}
export default createHandler();

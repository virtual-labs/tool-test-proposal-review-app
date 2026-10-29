import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {securityHeaders} from './http.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
export async function createPortalServer(handler,{development=false,beforeRequest}={}){
  const vite=development?await (await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'}):null;
  const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(beforeRequest&&await beforeRequest(req,res))return;
    if(pathname==='/api'){await handler(req,res);return;}
    securityHeaders(res,{development});
    if(pathname==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'running',integrations:'not checked'}));return;}
    if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end('Method not allowed');return;}
    if(vite){vite.middlewares(req,res,()=>{res.statusCode=404;res.end('Not found');});return;}
    let file;
    try{file=resolve(root,pathname==='/'?'index.html':'.'+decodeURIComponent(pathname));}catch{res.statusCode=400;res.end('Invalid path');return;}
    // Only the compiled frontend directory is served. Local configuration docs,
    // secrets, server sources and tests can never be downloaded through this route.
    if(!file.startsWith(resolve(root)+sep) || !types[extname(file)]){res.statusCode=404;res.end('Not found');return;}
    try{const content=await readFile(file);res.setHeader('Content-Type',types[extname(file)]);res.end(req.method==='HEAD'?undefined:content);}
    catch{res.statusCode=404;res.end('Build the React app with npm run build before using npm start.');}
  });
  server.on('close',()=>{if(vite)void vite.close();});return server;
}

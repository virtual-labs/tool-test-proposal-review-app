import handler from './http.js';
import {createPortalServer} from './app-server.js';
export const server=await createPortalServer(handler,{development:process.argv.includes('--dev')});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.info(`Portal listening on http://127.0.0.1:${process.env.PORT||3000}`));

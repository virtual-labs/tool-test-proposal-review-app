import {Script} from 'node:vm';
import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {build} from 'vite';
for(const dir of ['src','api','scripts'])for(const file of await readdir(dir)){
  if(!file.endsWith('.js'))continue;
  const result=spawnSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
new Script(await readFile('apps-script-email/Code.gs','utf8'));
JSON.parse(await readFile('apps-script-email/appsscript.json','utf8'));
await import('../src/http.js');
await build();
console.info('React production bundle built in dist/. Node API imports validated.');

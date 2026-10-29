import { randomBytes, createHash } from 'node:crypto';
import { PortalError } from './errors.js';

export class Coordination {
  constructor(settings, fetcher = fetch) { this.settings = settings; this.fetcher = fetcher; }
  async command(...args) {
    const response = await this.fetcher(this.settings.redisUrl, {method:'POST',headers:{Authorization:`Bearer ${this.settings.redisToken}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Coordination service unavailable');
    const body = await response.json();
    if (body.error) throw new Error('Coordination command failed');
    return body.result;
  }
  async get(key) { const value = await this.command('GET',key); return value ? JSON.parse(value) : null; }
  async put(key, value, seconds) { await this.command('SET',key,JSON.stringify(value),'EX',seconds); }
  async remove(key) { await this.command('DEL',key); }
  async reserve(key,seconds){return await this.command('SET',key,'1','NX','EX',seconds)==='OK';}
  async consumeOtp(key,digest,now,latestKey,challengeId){
    // Attempt counts and one-time consumption are atomic across all instances.
    const raw=await this.command('EVAL',`local latest=redis.call('GET',KEYS[2]);if latest~=cjson.encode(ARGV[3]) then return false end
local raw=redis.call('GET',KEYS[1]);if not raw then return false end
local r=cjson.decode(raw);local now=tonumber(ARGV[2]);
if r.expiresAt<=now or r.attempts>=5 then redis.call('DEL',KEYS[1]);return false end
if r.digest~=ARGV[1] then r.attempts=r.attempts+1;if r.attempts>=5 then redis.call('DEL',KEYS[1]) else redis.call('SET',KEYS[1],cjson.encode(r),'PX',math.max(1,r.expiresAt-now)) end;return false end
redis.call('DEL',KEYS[1]);return raw`,2,key,latestKey,digest,now,challengeId);
    return raw?JSON.parse(raw):null;
  }
  async limit(scope, maximum, seconds) {
    const key = `limit:${createHash('sha256').update(scope).digest('hex')}`;
    const count = await this.command('EVAL', "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n",1,key,seconds);
    if (count > maximum) throw new PortalError('Too many attempts. Please try again later.',429);
  }
  async withLock(scope, callback) {
    const key = `lock:${scope}`, owner = randomBytes(24).toString('hex');
    // Covers the function budget and Sheets' 180s processing timeout. Preserve
    // the lease after ambiguous network failures to prevent overlapping retries.
    if (await this.command('SET',key,owner,'NX','PX',240000) !== 'OK') throw new PortalError('Another update is in progress. Please try again shortly.',409);
    const deadline = Date.now()+45000;
    const lease = {assert(){ if(Date.now()>=deadline) throw new PortalError('Update took too long. Refresh before trying again.',503); },
      verify:async()=>{lease.assert();if(await this.command('GET',key)!==owner)throw new PortalError('Write lock was lost. Refresh before retrying.',503);}};
    try { return await callback(lease); }
    finally { if(!lease.uncertain)await this.command('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,key,owner); }
  }
}

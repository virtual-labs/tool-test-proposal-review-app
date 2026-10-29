import {createHash,createHmac} from 'node:crypto';

export function relayEnvelope(settings,message,idempotencyKey,now=Date.now()) {
  if(typeof settings.mailRelaySecret!=='string'||settings.mailRelaySecret.length<32||!settings.mailRelayUrl)throw new Error('Email relay is not configured');
  if(typeof idempotencyKey!=='string'||!idempotencyKey||idempotencyKey.length>200)throw new Error('Invalid email request ID');
  if(typeof message.to!=='string'||message.to.length>254||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(message.to)||typeof message.subject!=='string'||!message.subject||message.subject.length>250||/[\r\n]/.test(message.subject)||typeof message.body!=='string'||message.body.length>30000)throw new Error('Invalid email message');
  const requestId=createHash('sha256').update(idempotencyKey).digest('hex');
  const payload=JSON.stringify({version:1,requestId,timestamp:now,to:message.to,subject:message.subject,body:message.body});
  if(Buffer.byteLength(payload,'utf8')>60000)throw new Error('Email message is too large');
  const signature=createHmac('sha256',settings.mailRelaySecret).update(payload,'utf8').digest('hex');
  return {payload,signature};
}
export async function sendEmail(settings,message,idempotencyKey,fetcher=fetch) {
  const envelope=relayEnvelope(settings,message,idempotencyKey);
  // ContentService redirects to a Google-hosted response URL. No authorization
  // header or secret is placed in that redirect URL; the signed POST is server-only.
  const response=await fetcher(settings.mailRelayUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),redirect:'follow',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Email relay request failed');
  let result;
  try{result=await response.json();}catch{throw new Error('Email relay did not return JSON; check its deployment access');}
  if(result?.ok!==true||result.requestId!==JSON.parse(envelope.payload).requestId)throw new Error('Email relay did not confirm delivery');
}

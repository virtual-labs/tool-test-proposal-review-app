/** Standalone email-only service. No Sheets, OTP verification or portal UI. */
function relayJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return relayJson_({service:'Virtual Labs email relay',version:1});
}
function relaySettings_() {
  const props=PropertiesService.getScriptProperties();
  const secret=props.getProperty('MAIL_RELAY_SECRET');
  const configured=props.getProperty('RELAY_DAILY_LIMIT');
  const limit=configured===null||configured===''?80:Number(configured);
  if(!secret||secret.length<32||!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('RELAY_CONFIGURATION');
  return {props:props,secret:secret,limit:limit};
}
function relaySame_(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;
  let difference=0;
  for(let i=0;i<64;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
function relaySignature_(payload,secret) {
  return Utilities.computeHmacSha256Signature(payload,secret,Utilities.Charset.UTF_8)
    .map(function(byte){return ((byte+256)%256).toString(16).padStart(2,'0');}).join('');
}
function doPost(event) {
  let locked=false,lock;
  try {
    const settings=relaySettings_(),raw=event&&event.postData&&event.postData.contents;
    if(typeof raw!=='string'||raw.length>130000)return relayJson_({ok:false,error:'INVALID_REQUEST'});
    const envelope=JSON.parse(raw);
    if(typeof envelope.payload!=='string'||envelope.payload.length>60000||typeof envelope.signature!=='string'||!relaySame_(envelope.signature,relaySignature_(envelope.payload,settings.secret)))return relayJson_({ok:false,error:'NOT_AUTHORIZED'});
    const message=JSON.parse(envelope.payload),now=Date.now();
    if(message.version!==1||!Number.isSafeInteger(message.timestamp)||Math.abs(now-message.timestamp)>120000||typeof message.requestId!=='string'||!/^[a-f0-9]{64}$/.test(message.requestId))return relayJson_({ok:false,error:'INVALID_REQUEST'});
    if(typeof message.to!=='string'||message.to.length>254||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(message.to)||typeof message.subject!=='string'||!message.subject||message.subject.length>250||/[\r\n]/.test(message.subject)||typeof message.body!=='string'||message.body.length>30000)return relayJson_({ok:false,error:'INVALID_MESSAGE'});
    lock=LockService.getScriptLock();
    if(!lock.tryLock(1000))return relayJson_({ok:false,error:'RELAY_BUSY'});
    locked=true;
    const props=settings.props,all=props.getProperties();
    Object.keys(all).forEach(function(key){
      if(key.indexOf('relay:request:')!==0)return;
      const record=JSON.parse(all[key]);
      if(record.expiresAt<=now)props.deleteProperty(key);
    });
    const key='relay:request:'+message.requestId,prior=props.getProperty(key);
    if(prior){
      const record=JSON.parse(prior);
      return relayJson_(record.state==='sent'?{ok:true,requestId:message.requestId,alreadySent:true}:{ok:false,error:'DELIVERY_UNCERTAIN'});
    }
    const date=Utilities.formatDate(new Date(now),'Asia/Kolkata','yyyy-MM-dd');
    let count=JSON.parse(props.getProperty('relay:day')||'null');
    if(!count||count.date!==date)count={date:date,value:0};
    if(count.value>=settings.limit||MailApp.getRemainingDailyQuota()<=5)return relayJson_({ok:false,error:'QUOTA_UNAVAILABLE'});
    // Persist before sending. An ambiguous timeout is not retried automatically.
    const record={state:'sending',expiresAt:now+86400000};
    props.setProperty(key,JSON.stringify(record));
    count.value++;props.setProperty('relay:day',JSON.stringify(count));
    try {
      MailApp.sendEmail({to:message.to,subject:message.subject,body:message.body,name:'Virtual Labs Proposal Review'});
      record.state='sent';props.setProperty(key,JSON.stringify(record));
      return relayJson_({ok:true,requestId:message.requestId});
    }catch(_){
      record.state='uncertain';props.setProperty(key,JSON.stringify(record));
      return relayJson_({ok:false,error:'DELIVERY_UNCERTAIN'});
    }
  }catch(_){return relayJson_({ok:false,error:'RELAY_ERROR'});}
  finally {if(locked)lock.releaseLock();}
}
/** Run manually in the editor to authorize MailApp and check setup. Sends no mail. */
function verifyRelaySetup() {
  relaySettings_();
  console.log('Email relay setup OK. Remaining Google recipient quota: '+MailApp.getRemainingDailyQuota());
}

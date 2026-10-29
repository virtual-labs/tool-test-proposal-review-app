export function config(env = process.env) {
  const required = ['APP_ORIGIN','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_SPREADSHEET_ID','REDIS_REST_URL','REDIS_REST_TOKEN','OTP_SECRET','MAIL_RELAY_URL','MAIL_RELAY_SECRET'];
  for (const key of required) if (!env[key]) throw new Error(`Missing server configuration: ${key}`);
  const origin = new URL(env.APP_ORIGIN);
  if (origin.origin !== env.APP_ORIGIN || (!['localhost','127.0.0.1'].includes(origin.hostname) && origin.protocol !== 'https:')) throw new Error('APP_ORIGIN must be an exact HTTPS origin (HTTP allowed on localhost).');
  if (!/^[\w-]+$/.test(env.GOOGLE_SPREADSHEET_ID)) throw new Error('Invalid spreadsheet ID');
  if(env.OTP_SECRET.length<32)throw new Error('OTP_SECRET must contain at least 32 random characters.');
  if(env.MAIL_RELAY_SECRET.length<32 || env.MAIL_RELAY_SECRET===env.OTP_SECRET)throw new Error('MAIL_RELAY_SECRET must be at least 32 random characters and differ from OTP_SECRET.');
  const relay=new URL(env.MAIL_RELAY_URL);
  if(relay.protocol!=='https:'||relay.hostname!=='script.google.com'||relay.port||relay.username||relay.password||relay.search||relay.hash||!/^\/macros\/s\/[\w-]+\/exec$/.test(relay.pathname))throw new Error('MAIL_RELAY_URL must be the Google Apps Script HTTPS /exec deployment URL.');
  if (new URL(env.REDIS_REST_URL).protocol !== 'https:') throw new Error('Redis REST endpoint must use HTTPS');
  return {origin:origin.origin, secure:origin.protocol === 'https:', spreadsheetId:env.GOOGLE_SPREADSHEET_ID,
    otpSecret:env.OTP_SECRET, clientEmail:env.GOOGLE_CLIENT_EMAIL,
    privateKey:env.GOOGLE_PRIVATE_KEY.replaceAll('\\n','\n'), redisUrl:env.REDIS_REST_URL.replace(/\/$/,''), redisToken:env.REDIS_REST_TOKEN,
    sessionSeconds:7200, mailRelayUrl:env.MAIL_RELAY_URL, mailRelaySecret:env.MAIL_RELAY_SECRET};
}

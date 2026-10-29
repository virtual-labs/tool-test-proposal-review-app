// Allowlisted metadata only: never serialize errors, request bodies or credentials.
export function diagnostic(error,stage) {
  const value={category:'internal',stage,name:['Error','TypeError','SyntaxError','RangeError','TimeoutError','AbortError'].includes(error?.name)?error.name:'Error'};
  const code=error?.cause?.code||error?.code;
  if(['ERR_INVALID_URL','ERR_OSSL_UNSUPPORTED','ERR_OSSL_PEM_NO_START_LINE','ERR_INVALID_ARG_TYPE','ENOTFOUND','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code))value.code=code;
  const status=error?.response?.status;
  if(Number.isInteger(status)&&status>=400&&status<=599)value.upstreamStatus=status;
  const missing=/^Missing server configuration: ([A-Z_]+)$/.exec(error?.message||'');
  const keys=['APP_ORIGIN','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_SPREADSHEET_ID','REDIS_REST_URL','REDIS_REST_TOKEN','OTP_SECRET','MAIL_RELAY_URL','MAIL_RELAY_SECRET'];
  if(stage==='configuration'&&missing&&keys.includes(missing[1]))value.missingVariable=missing[1];
  return value;
}

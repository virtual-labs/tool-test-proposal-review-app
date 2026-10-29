import { randomBytes, randomInt, createHash, createHmac } from 'node:crypto';
import { PortalError } from './errors.js';
import { sendEmail } from './email.js';
const sessionKey = token => `session:otp:${createHash('sha256').update(token).digest('hex')}`;
const emailKey = email => createHash('sha256').update(email).digest('hex');
const MESSAGE='If your email is registered and active, a sign-in code will be sent. Check your inbox and spam folder.';
export const OTP_SECONDS=600, RESEND_SECONDS=60;
export function normalizedEmail(value) {
  if(typeof value!=='string' || value.length>254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim()))throw new PortalError('Enter a valid email address.');
  return value.trim().toLowerCase();
}
export class Auth {
  constructor(settings,_sheets,coordination,mailer=sendEmail){Object.assign(this,{settings,coordination,mailer});}
  digest(email,challenge,code){return createHmac('sha256',this.settings.otpSecret).update(`${email}:${challenge}:${code}`).digest('hex');}
  async issue(email,activeRole,expiresAt=Date.now()+this.settings.sessionSeconds*1000) {
    const token=randomBytes(32).toString('base64url'),session={email,activeRole,expiresAt};
    await this.coordination.put(sessionKey(token),session,Math.max(1,Math.ceil((expiresAt-Date.now())/1000)));
    return {token,session};
  }
  async requestOtp(value,ip,getUser) {
    const email=normalizedEmail(value),key=emailKey(email);
    await this.coordination.limit(`otp-request-ip:${ip}`,10,900);
    await this.coordination.limit(`otp-request-email:${email}`,5,3600);
    await this.coordination.limit('otp-request-global',100,3600);
    if(!await this.coordination.reserve(`otp-cooldown:${key}`,RESEND_SECONDS))throw new PortalError('Wait 60 seconds before requesting another code.',429);
    const challengeId=randomBytes(24).toString('base64url'),expiresAt=Date.now()+OTP_SECONDS*1000;
    const user=await getUser(email);
    if(user) {
      const code=String(randomInt(0,1000000)).padStart(6,'0');
      await this.coordination.put(`otp:${challengeId}`,{email,digest:this.digest(email,challengeId,code),expiresAt,attempts:0},OTP_SECONDS);
      await this.coordination.put(`otp-latest:${key}`,challengeId,OTP_SECONDS);
      // Tests inject their own mailer. Production never exposes or logs codes.
      try{await this.mailer(this.settings,{to:email,subject:'Virtual Labs — Your sign-in code',body:`Your Virtual Labs sign-in code is ${code}.\n\nIt expires in 10 minutes and can be used once. Never share this code. If you did not request it, ignore this email.`},`otp-${challengeId}`);}
      catch(error){await this.coordination.remove(`otp:${challengeId}`);console.error('OTP_DELIVERY_FAILED',{name:error.name});}
    }
    return {challengeId,expiresAt,resendSeconds:RESEND_SECONDS,message:MESSAGE};
  }
  async verifyOtp(value,challengeId,code,ip,getUser) {
    const email=normalizedEmail(value);
    await this.coordination.limit(`otp-verify-ip:${ip}`,30,900);
    await this.coordination.limit(`otp-verify-email:${email}`,15,3600);
    if(typeof challengeId!=='string'||!/^[\w-]{32}$/.test(challengeId)||typeof code!=='string'||!/^\d{6}$/.test(code))throw new PortalError('Invalid or expired code. Request a new code if needed.',401);
    const record=await this.coordination.consumeOtp(`otp:${challengeId}`,this.digest(email,challengeId,code),Date.now(),`otp-latest:${emailKey(email)}`,challengeId);
    if(!record || record.email!==email)throw new PortalError('Invalid or expired code. Request a new code if needed.',401);
    const user=await getUser(email);
    if(!user)throw new PortalError('Invalid or expired code. Request a new code if needed.',401);
    return this.issue(email,user.primaryRole);
  }
  async authenticate(token) {
    if(!/^[\w-]{43}$/.test(token||''))throw new PortalError('AUTH_REQUIRED: Please sign in.',401);
    const session=await this.coordination.get(sessionKey(token));
    if(!session || session.expiresAt<=Date.now())throw new PortalError('AUTH_REQUIRED: Session expired. Please sign in again.',401);
    return session;
  }
  async logout(token){if(/^[\w-]{43}$/.test(token||''))await this.coordination.remove(sessionKey(token));}
}

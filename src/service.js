import { createDomain } from './domain.js';
import { reviewPdf } from './pdf.js';
import { PortalError } from './errors.js';
import { sendEmail } from './email.js';
export const DATA_SHEETS=['Proposals','Users','Completed Reviews','Draft Reviews'];
export const WRITE_ACTIONS=new Set(['saveDraft','submitToLdc','submitReview','autoRankProposals','saveRankJustification','saveRankings']);
export const READ_ACTIONS=new Set(['getInitialData','getProposal','getReview','downloadReview','getAdminProposals','getAdminUsers','getAdminData','getAssistantReview','getRankingData','getAdminRankings']);
export class Portal {
  constructor(settings,sheets,coordination,auth,mailer=sendEmail){Object.assign(this,{settings,sheets,coordination,auth,mailer});}
  async registeredUser(email) {
    const db=await this.sheets.snapshot(this.settings.spreadsheetId,['Users']);
    const [headers,...rows]=db.getSheetByName('Users').getDataRange().getValues();
    for(const key of ['Email','Name','Status','Role'])if(!headers.includes(key))throw new Error(`Missing Users heading: ${key}`);
    const records=rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]]))).filter(u=>String(u.Email).trim().toLowerCase()===email);
    if(records.length!==1)return null;
    const u=records[0];
    if(!['active','true'].includes(String(u.Status).trim().toLowerCase()))return null;
    const role=String(u.Role).trim();
    const primaryRole=/^LDC(?:\s*[1-9]\d*)?$/i.test(role)?'LDC':({'admin':'Admin','pic':'PIC','assistant reviewer':'Assistant Reviewer'}[role.toLowerCase()]||'');
    if(!String(u.Name||'').trim() || !primaryRole)return null;
    return {primaryRole};
  }
  async execute(action,args,session) {
    if(!READ_ACTIONS.has(action)&&!WRITE_ACTIONS.has(action))throw new PortalError('Invalid portal action.');
    if(args.length>2 || (args[1]!=null && (typeof args[1]!=='object'||Array.isArray(args[1]))) && WRITE_ACTIONS.has(action))throw new PortalError('Invalid action arguments.');
    const execute=async lease=>{
      const db=await this.sheets.snapshot(this.settings.spreadsheetId,DATA_SHEETS);
      const emails=[];
      const domain=createDomain(db,session,{assertWritable:()=>{if(!lease)throw new Error('Unexpected write during read');lease.assert();},onEmail:message=>emails.push(message)});
      domain.currentUser();
      let result;
      try{result=domain[action]('cookie',...args.slice(1));}
      catch(error){throw new PortalError(error.message,/AUTH_REQUIRED:/.test(error.message)?401:/ADMIN_REQUIRED:|not assigned|not available|Only |access is/.test(error.message)?403:400);}
      if(lease) {
        try{await this.sheets.commit(this.settings.spreadsheetId,db,lease);}
        catch {throw new PortalError('Could not confirm the update. Refresh and check your saved work before retrying.',503);}
      }
      if(action==='downloadReview')result=await reviewPdf(result);
      if(emails.length && result && !result.alreadySaved) {
        result.emailSent=false;result.emailSkipped=!this.settings.mailRelayUrl;
        if(this.settings.mailRelayUrl && this.settings.mailRelaySecret) {
          try {
            await this.mailer(this.settings,emails[0],`review-${result.reviewId}`);
            result.emailSent=true;
          }catch{result.emailSent=false;}
        }
      }
      return result;
    };
    return WRITE_ACTIONS.has(action)?this.coordination.withLock(`data:${this.settings.spreadsheetId}`,execute):execute(null);
  }
}

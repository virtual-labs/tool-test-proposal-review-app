import { SheetSnapshot } from '../src/sheets.js';
import { createDomain } from '../src/domain.js';
const headers=createDomain({},{}).headers;
export function payload(tables) {
  return {properties:{timeZone:'Asia/Kolkata'},sheets:Object.entries(tables).map(([title,values],sheetId)=>({properties:{title,sheetId,gridProperties:{rowCount:100,columnCount:40}},data:[{rowData:values.map(row=>({values:row.map(v=>({effectiveValue:typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:String(v??'')}}))}))}]}))};
}
const table=(head,rows=[])=>[head,...rows.map(row=>head.map(h=>row[h]??''))];
export function fixtureTables(){return {
  Users:table([...headers.Reviewers,'Secondary Role'],[
    {Email:'ldc@example.com',Name:'Reviewer',Status:'Active',Domain:'CSE','Institute Name':'IIT',Role:'LDC','Secondary Role':'PIC'},
    {Email:'other@example.com',Name:'Other',Status:'Active',Domain:'CSE','Institute Name':'Other Institute',Role:'LDC'},
    {Email:'admin@example.com',Name:'Admin',Status:'Active',Role:'Admin'},
    {Email:'assistant@example.com',Name:'Assistant',Status:'Active',Domain:'CSE','Institute Name':'IIT',Role:'Assistant Reviewer'},
    {Email:'disabled@example.com',Name:'Disabled',Status:'Inactive',Domain:'CSE',Role:'LDC'}]),
  Proposals:table([...headers.Proposals,'Assistant Reviewer','No. of Experiments'],[
    {'Proposal ID':'P1',Domain:'CSE','Lab/Proposal Name':'Test Lab','Proposal Link':'https://example.com/proposal','Assigned LDC':'Reviewer','Assistant Reviewer':'Assistant','Institute Name':'IIT',Status:'Pending','No. of Experiments':'4'},
    {'Proposal ID':'P2',Domain:'CSE','Lab/Proposal Name':'Other Lab','Assigned LDC':'Other','Institute Name':'Other Institute',Status:'Pending'}]),
  'Completed Reviews':table([...headers.Reviews,'Rank Justification','Rank Updated At','Rank Order Mode']),
  'Draft Reviews':table(headers.Drafts)
};}
export class MemorySheets {
  constructor(){this.data=payload(fixtureTables());this.commits=0;}
  async snapshot(_id,names){const source=this.data;for(const name of names)if(!source.sheets.some(s=>s.properties.title===name))throw new Error(`Missing requested sheet: ${name}`);return new SheetSnapshot({...structuredClone(source),sheets:structuredClone(source.sheets.filter(s=>names.includes(s.properties.title)))});}
  async commit(_id,db,lease){
    await lease.verify();const target=this.data;
    for(const request of db.pending){
      if(request.updateSheetProperties)continue;
      const {range,rows}=request.updateCells;
      const sheet=target.sheets.find(s=>s.properties.sheetId===range.sheetId),grid=sheet.data[0].rowData;
      for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].values.length;c++){
        const row=range.startRowIndex+r,col=range.startColumnIndex+c;
        grid[row] ||= {values:[]};const v=rows[r].values[c].userEnteredValue;
        grid[row].values[col]={userEnteredValue:v,effectiveValue:v};
      }
    }
    this.commits++;db.pending.length=0;
  }
}
export class MemoryCoordination {
  constructor(){this.data=new Map();this.locks=new Set();this.limits=new Map();}
  async put(key,value){this.data.set(key,structuredClone(value));}
  async get(key){return this.data.get(key);}
  async remove(key){this.data.delete(key);}
  async reserve(key){if(this.data.has(key))return false;this.data.set(key,true);return true;}
  async consumeOtp(key,digest,now,latestKey,challengeId){
    if(this.data.get(latestKey)!==challengeId)return null;
    const record=this.data.get(key);if(!record)return null;
    if(record.expiresAt<=now || record.attempts>=5){this.data.delete(key);return null;}
    if(record.digest!==digest){record.attempts++;if(record.attempts>=5)this.data.delete(key);return null;}
    this.data.delete(key);return record;
  }
  async limit(key,max){const n=(this.limits.get(key)||0)+1;this.limits.set(key,n);if(n>max){const {PortalError}=await import('../src/errors.js');throw new PortalError('Too many attempts. Please try again later.',429);}}
  async withLock(key,callback){
    if(this.locks.has(key)){const {PortalError}=await import('../src/errors.js');throw new PortalError('Another update is in progress.',409);}
    this.locks.add(key);try{return await callback({assert(){},async verify(){}});}finally{this.locks.delete(key);}
  }
}
export const settings={origin:'http://127.0.0.1:3000',secure:false,spreadsheetId:'data',sessionSeconds:7200,otpSecret:'test-only-secret-not-for-production-123456'};

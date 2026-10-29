import { GoogleAuth } from 'google-auth-library';

function cellValue(cell, zone) {
  const v = cell.effectiveValue || {};
  const type = cell.effectiveFormat?.numberFormat?.type;
  if (v.numberValue != null && ['DATE','DATE_TIME','TIME'].includes(type)) {
    // Sheets serial timestamps are wall-clock values in the spreadsheet timezone.
    const wall = (v.numberValue-25569)*86400000;
    let utc = wall;
    for(let i=0;i<2;i++) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));
      const asUtc=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
      utc=wall-(asUtc-Math.floor(utc/1000)*1000);
    }
    return new Date(Math.round(utc));
  }
  return v.stringValue ?? v.numberValue ?? v.boolValue ?? cell.formattedValue ?? '';
}
function entered(value) {
  if(value instanceof Date) return {stringValue:value.toISOString()};
  if(typeof value==='number') return {numberValue:value};
  if(typeof value==='boolean') return {boolValue:value};
  // Domain rules preserve existing formulas explicitly. New user strings are
  // escaped in sheetValue_ before they reach this adapter.
  if(typeof value==='string' && value.startsWith('=')) return {formulaValue:value};
  return {stringValue:String(value ?? '').replace(/^'(?=[=+@-])/,'')};
}
export class SheetSnapshot {
  constructor(payload) {
    this.pending=[];
    this.sheets=new Map((payload.sheets||[]).map(s=>[s.properties.title,new Sheet(this,s,payload.properties?.timeZone || 'Asia/Kolkata')]));
  }
  getSheetByName(name) {return this.sheets.get(name) || null;}
}
class Sheet {
  constructor(db,sheet,zone) {
    this.db=db;this.id=sheet.properties.sheetId;this.gridRows=sheet.properties.gridProperties.rowCount;this.gridCols=sheet.properties.gridProperties.columnCount;
    this.cells=[];this.values=[];
    for(const block of sheet.data||[]) for(const [i,row] of (block.rowData||[]).entries()) {
      const r=(block.startRow||0)+i;
      for(const [j,cell] of (row?.values||[]).entries()) {
        if(!Object.keys(cell.userEnteredValue||{}).length && !Object.keys(cell.effectiveValue||{}).length && !cell.formattedValue)continue;
        const c=(block.startColumn||0)+j;this.cells[r] ||= [];this.values[r] ||= [];
        this.cells[r][c]=cell;
        const value=cellValue(cell,zone);
        // Existing spreadsheet headings may contain accidental surrounding spaces.
        // Normalize only the header row, without queuing writes or trimming user data.
        this.values[r][c]=r===0&&typeof value==='string'?value.trim():value;
      }
    }
    const headings=(this.values[0]||[]).filter(value=>value!=='');
    if(new Set(headings).size!==headings.length)throw new Error('Duplicate spreadsheet headings after whitespace normalization');
  }
  getLastColumn(){return this.values.reduce((max,row)=>Math.max(max,row?.length||0),0);}
  getLastRow(){return this.values.length;}
  getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn()));}
  getRange(row,col,rows=1,cols=1){return new Range(this,row-1,col-1,rows,cols);}
  appendRow(values){this.getRange(this.getLastRow()+1,1,1,values.length).setValues([values]);}
}
class Range {
  constructor(sheet,row,col,rows,cols){Object.assign(this,{sheet,row,col,rows,cols});}
  getValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.values[this.row+r]?.[this.col+c]??''));}
  getFormulas(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.cells[this.row+r]?.[this.col+c]?.userEnteredValue?.formulaValue||''));}
  getFormula(){return this.getFormulas()[0][0];}
  getRichTextValue(){
    const cell=this.sheet.cells[this.row]?.[this.col];if(!cell)return null;
    return {getLinkUrl:()=>cell.hyperlink || cell.textFormat?.link?.uri || '',getRuns:()=> (cell.textFormatRuns||[]).map(run=>({getLinkUrl:()=>run.format?.link?.uri||''}))};
  }
  setValue(value){this.setValues([[value]]);}
  setValues(values){
    if(values.length!==this.rows || values.some(row=>row.length!==this.cols))throw new Error('Invalid sheet write dimensions');
    const s=this.sheet;
    if(this.row+this.rows>s.gridRows || this.col+this.cols>s.gridCols){
      s.gridRows=Math.max(s.gridRows,this.row+this.rows);s.gridCols=Math.max(s.gridCols,this.col+this.cols);
      s.db.pending.push({updateSheetProperties:{properties:{sheetId:s.id,gridProperties:{rowCount:s.gridRows,columnCount:s.gridCols}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});
    }
    for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++){
      s.values[this.row+r] ||= [];s.values[this.row+r][this.col+c]=values[r][c];
      s.cells[this.row+r] ||= [];s.cells[this.row+r][this.col+c]={userEnteredValue:entered(values[r][c])};
    }
    s.db.pending.push({updateCells:{range:{sheetId:s.id,startRowIndex:this.row,endRowIndex:this.row+this.rows,startColumnIndex:this.col,endColumnIndex:this.col+this.cols},rows:values.map(row=>({values:row.map(value=>({userEnteredValue:entered(value)}))})),fields:'userEnteredValue'}});
  }
}
export class Sheets {
  constructor(settings,client) {
    this.settings=settings;
    this.client=client || new GoogleAuth({credentials:{client_email:settings.clientEmail,private_key:settings.privateKey},scopes:['https://www.googleapis.com/auth/spreadsheets']});
  }
  async snapshot(id,names) {
    const query=new URLSearchParams({includeGridData:'true',fields:'properties(timeZone),sheets(properties(sheetId,title,gridProperties),data(startRow,startColumn,rowData(values(effectiveValue,formattedValue,userEnteredValue,hyperlink,textFormatRuns,effectiveFormat(numberFormat)))))'});
    for(const name of names)query.append('ranges',`'${name.replaceAll("'","''")}'`);
    const {data}=await this.client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${id}?${query}`,method:'GET',timeout:15000,retry:false});
    return new SheetSnapshot(data);
  }
  async commit(id,db,lease) {
    if(!db.pending.length)return;
    await lease.verify();
    // One atomic batch, with retries disabled: never blindly repeat an ambiguous write.
    try{await this.client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`,method:'POST',data:{requests:db.pending},timeout:15000,retry:false});}
    catch(error){lease.uncertain=true;throw error;}
    db.pending.length=0;
  }
}

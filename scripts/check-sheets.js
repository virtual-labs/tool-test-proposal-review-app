import { config } from '../src/config.js';
import { Sheets } from '../src/sheets.js';
import { createDomain } from '../src/domain.js';
import { DATA_SHEETS } from '../src/service.js';
try {
  const settings=config(),sheets=new Sheets(settings);
  const db=await sheets.snapshot(settings.spreadsheetId,DATA_SHEETS);
  const headers=createDomain(db,{}).headers;
  for(const [name,required] of [['Proposals',headers.Proposals],['Users',headers.Reviewers],['Completed Reviews',headers.Reviews],['Draft Reviews',headers.Drafts]]){
    const values=db.getSheetByName(name)?.getDataRange().getValues();
    if(!values)throw new Error(`Missing sheet: ${name}`);
    if(new Set(values[0]).size!==values[0].length)throw new Error(`Duplicate headings in ${name}`);
    const missing=required.filter(h=>!values[0].includes(h));
    if(missing.length)throw new Error(`${name} missing headings: ${missing.join(', ')}`);
    console.info(`${name}: schema OK (${values.length-1} data rows)`);
  }
  console.info('Read-only schema checks passed; no data changed. OTP uses the Users roster and Redis, without a credential spreadsheet.');
}catch(error){console.error(error.message);process.exitCode=1;}

import React,{useState} from 'react';
import {SetFilter,Table} from './Common.jsx';
import {useResource} from '../hooks.js';

function TotalRow({rows,columns}){
  const total=rows.reduce((sum,row)=>{
    for(const key of ['labs','experiments','missingExperiments','reviewed','pending','selectedLabs','selectedExperiments','missingSelectedExperiments'])sum[key]+=row[key]||0;
    return sum;
  },{labs:0,experiments:0,missingExperiments:0,reviewed:0,pending:0,selectedLabs:0,selectedExperiments:0,missingSelectedExperiments:0});
  return <tr><th scope="row" colSpan={2}>Total</th>{columns.map(c=><td key={c.key}><strong>{c.render?c.render(total):total[c.key]}</strong></td>)}</tr>;
}

export function Summary({revision,onError,busy}){
  const [filters,setFilters]=useState({});
  const {data,loading}=useResource('getSummaryData',[filters],revision,onError);
  const columns=[{key:'labs',label:'Proposals'},{key:'experiments',label:'Experiments',render:r=><>{r.experiments}{r.missingExperiments>0&&<span className="muted small"> (incomplete: {r.missingExperiments} lab(s) missing a valid count)</span>}</>},{key:'reviewed',label:'Reviewed'},{key:'pending',label:'Pending'},{key:'selectedLabs',label:'Selected'},{key:'selectedExperiments',label:'Selected Exp.',render:r=><>{r.selectedExperiments}{r.missingSelectedExperiments>0&&<span className="muted small"> (incomplete: {r.missingSelectedExperiments} selected lab(s) missing a valid count)</span>}</>}];
  return <section id="summaryPage"><div className="dashboard-intro"><h2>Summary Dashboard</h2><p className="muted">Portal-wide proposal totals by domain and institute. Each Proposal ID counts as one lab. Pending includes saved drafts.</p></div>{loading?<p role="status">Loading summary…</p>:data&&[['domains','Domain-wise Summary','Domain'],['institutes','Institute-wise Summary','Institute']].map(([key,title,label])=><section className="card" key={key}><div className="summary-table-heading"><h2>{title}</h2><SetFilter value={filters.set} onChange={set=>setFilters({set})} busy={busy}/></div><Table serialNumbers label={title} rows={data[key]} footer={<TotalRow rows={data[key]} columns={columns}/>} columns={[{key:'name',label},...columns]}/></section>)}</section>;
}

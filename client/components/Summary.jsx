import React,{useState} from 'react';
import {Filters,Table} from './Common.jsx';
import {useResource} from '../hooks.js';

function TotalRow({rows,columns}){
  const total=rows.reduce((sum,row)=>{
    for(const key of ['labs','experiments','missingExperiments','reviewed','pending'])sum[key]+=row[key]||0;
    return sum;
  },{labs:0,experiments:0,missingExperiments:0,reviewed:0,pending:0});
  return <tr><th scope="row" colSpan={2}>Total</th>{columns.map(c=><td key={c.key}><strong>{c.render?c.render(total):total[c.key]}</strong></td>)}</tr>;
}

export function Summary({revision,onError,busy}){
  const [filters,setFilters]=useState({});
  const {data,loading}=useResource('getSummaryData',[filters],revision,onError);
  const columns=[{key:'labs',label:'Number of Labs'},{key:'experiments',label:'Number of Experiments',render:r=><>{r.experiments}{r.missingExperiments>0&&<span className="muted small"> (incomplete: {r.missingExperiments} lab(s) missing a valid count)</span>}</>},{key:'reviewed',label:'Number of Proposals Reviewed'},{key:'pending',label:'Number of Pending Proposals'}];
  return <section id="summaryPage"><div className="dashboard-intro"><h2>Summary Dashboard</h2><p className="muted">Portal-wide proposal totals by domain and institute. Each Proposal ID counts as one lab. Pending includes saved drafts.</p></div><Filters fields={['set']} values={filters} onChange={setFilters} busy={busy}/>{loading?<p role="status">Loading summary…</p>:data&&[['domains','Domain-wise Summary','Domain'],['institutes','Institute-wise Summary','Institute']].map(([key,title,label])=><section className="card" key={key}><h2>{title}</h2><Table serialNumbers label={title} rows={data[key]} footer={<TotalRow rows={data[key]} columns={columns}/>} columns={[{key:'name',label},...columns]}/></section>)}</section>;
}

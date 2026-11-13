import React,{useState} from 'react';
import {Filters,Table} from './Common.jsx';
import {useResource} from '../hooks.js';

export function Summary({revision,onError,busy}){
  const [filters,setFilters]=useState({});
  const {data,loading}=useResource('getSummaryData',[filters],revision,onError);
  const columns=[{key:'labs',label:'Number of Labs'},{key:'experiments',label:'Number of Experiments',render:r=><>{r.experiments}{r.missingExperiments>0&&<span className="muted small"> (incomplete: {r.missingExperiments} lab(s) missing a valid count)</span>}</>},{key:'reviewed',label:'Number of Proposals Reviewed'},{key:'pending',label:'Number of Pending Proposals'}];
  return <section id="summaryPage"><div className="dashboard-intro"><h2>Summary Dashboard</h2><p className="muted">Portal-wide proposal totals by domain and institute. Each Proposal ID counts as one lab. Pending includes saved drafts.</p></div><Filters fields={['set']} values={filters} onChange={setFilters} busy={busy}/>{loading?<p role="status">Loading summary…</p>:data&&[['domains','Domain-wise Summary','Domain'],['institutes','Institute-wise Summary','Institute']].map(([key,title,label])=><section className="card" key={key}><h2>{title}</h2><Table serialNumbers label={title} rows={data[key]} columns={[{key:'name',label},...columns]}/></section>)}</section>;
}

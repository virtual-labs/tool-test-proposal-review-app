import React,{useState} from 'react';
import {Table,Filters,Cards,Link} from './Common.jsx';
import {Justification} from './Dialog.jsx';
import {RankingGuidelines} from './Guides.jsx';
import {useResource} from '../hooks.js';

export function RankMonitor({user,revision,onError,onView,onDownload,busy}){
  const [filters,setFilters]=useState({}),[category,setCategory]=useState('ranked');
  const {data,loading}=useResource('getAdminRankings',[filters],revision,onError);
  const rows=(category==='ranked'?data?.rows:data?.unrankedRows)||[];
  const [selected,setSelected]=useState([]);const allowed=rows.filter(r=>r.downloadable).map(r=>r.id),ids=selected.filter(id=>allowed.includes(id));
  return <section id="rankingPage"><h2>Rank Dashboard</h2><Filters busy={busy} values={filters} onChange={setFilters} options={data?.filterOptions} fields={user.role==='PIC'?['domain']:['domain','institute','reviewer']}/>{loading?<p role="status">Loading rankings…</p>:data&&<><Cards selected={category} onSelect={setCategory} items={[{key:'ranked',label:'Ranked Proposals / Total Proposals matching selected filters',count:data.rows.length,total:data.rows.length+data.unrankedRows.length},{key:'unranked',label:'Unranked Proposals / Total Proposals matching selected filters',count:data.unrankedRows.length,total:data.rows.length+data.unrankedRows.length}]}/><section className="card"><h3>{category==='ranked'?'Ranked Proposals':'Unranked Proposals'}</h3><p className="muted small">Each reviewer has an independent rank list. Rank / Reviewer Total includes that reviewer’s completed proposals throughout the domain.</p><div className="review-download-toolbar"><button className="secondary compact" disabled={busy||!ids.length} onClick={()=>onDownload(ids)}>Download Selected Reviews</button><button className="secondary compact" onClick={()=>setSelected(allowed)}>Select All</button><button className="secondary compact" onClick={()=>setSelected([])}>Clear Selection</button></div><Table serialNumbers className="admin-table" label="Rank monitoring" rows={rows} columns={[
    {key:'select',label:'Select',sortable:false,render:r=>r.downloadable?<input type="checkbox" className="review-check" aria-label={`Select review ${r.id}`} checked={ids.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/>:null},
    {key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},{key:'domain',label:'Domain'},...(user.role==='Admin'?[{key:'institute',label:'Institute'}]:[]),{key:'reviewer',label:'Reviewer'},{key:'overallRating',label:'Overall Rating',render:r=>r.overallRating==null?'Not recorded':`${r.overallRating} / 6`},{key:'rank',label:'Rank / Reviewer Total',render:r=>r.rank==null?'Unranked':`${r.rank} / ${r.reviewerTotal}`},{key:'justification',label:'Justification',sortable:false,render:r=><Justification name={r.name} value={r.justification} busy={busy}/>},{key:'updatedAt',label:'Last Updated'},{key:'actions',label:'Action',sortable:false,render:r=><div className="row-actions"><button className="view-action" disabled={busy} onClick={()=>onView(r.id)}>View Review</button><Link href={r.link}>View Proposal</Link></div>}]}/></section></>}</section>;
}

export function Ranking({revision,onError,run,onView,onDownload,onDirty,restored,busy}){
  const {data,loading}=useResource('getRankingData',[],revision,onError);
  return <section id="rankingPage"><h2>My Rank Dashboard</h2>{loading?<p role="status">Loading rankings…</p>:data&&<RankEditor key={`${data.version}:${revision}`} data={data} run={run} onView={onView} onDownload={onDownload} onDirty={onDirty} restored={restored} busy={busy}/>}</section>;
}
function editsFor(data){const saved=new Map(data.saved.map(r=>[r.id,r.rank]));return Object.fromEntries(data.proposals.map(p=>[p.id,{rank:String(saved.get(p.id)||''),justification:p.justification||''}]));}
function RankEditor({data,run,onView,onDownload,onDirty,restored,busy}){
  const [base,setBase]=useState(restored?.data||data),[edits,setEdits]=useState(restored?.edits||editsFor(data)),[selected,setSelected]=useState([]);
  const [notice,setNotice]=useState(''),[guidelines,setGuidelines]=useState(false);
  function edit(id,key,value){const next={...edits,[id]:{...edits[id],[key]:value}};setEdits(next);onDirty(JSON.stringify(next)!==JSON.stringify(editsFor(base)),{type:'ranking',data:base,edits:next});}
  async function save(){
    const rankings=base.proposals.filter(p=>edits[p.id].rank).map(p=>({id:p.id,rank:Number(edits[p.id].rank)}));
    if(new Set(rankings.map(r=>r.rank)).size!==rankings.length){setNotice('Choose a different rank for each proposal.');return;}
    const result=await run('saveRankings',[{rankings,justifications:base.proposals.map(p=>({id:p.id,justification:edits[p.id].justification})),version:base.version,proposalSetVersion:base.proposalSetVersion,baseRankings:base.saved}]);
    if(result?.success){const next={...base,version:result.version,saved:result.saved,updatedAt:result.updatedAt,proposals:base.proposals.map(p=>({...p,justification:edits[p.id].justification}))};setBase(next);setEdits(editsFor(next));onDirty(false);setNotice('Your rankings have been saved.');}
  }
  async function generate(){
    if(!window.confirm('Generate rankings by overall score, highest first, then Proposal ID? This replaces saved ranks. Unsaved edits will be discarded.'))return;
    const result=await run('autoRankProposals',[]);if(result?.success){const next=await run('getRankingData',[]);if(next){setBase(next);setEdits(editsFor(next));onDirty(false);setNotice('Rankings generated and saved.');}}
  }
  const allowed=base.proposals.filter(p=>p.downloadable).map(p=>p.id),ids=selected.filter(id=>allowed.includes(id));
  return <><Cards selected="" onSelect={()=>{}} items={[{key:'ranked',label:'Ranked Proposals',count:base.saved.length},{key:'unranked',label:'Unranked Proposals',count:base.proposals.length-base.saved.length}]}/><section className="card"><div className="ranking-heading"><h2>Submitted Proposals</h2><button id="rankingGuidelinesBtn" className="view-action" disabled={busy} onClick={()=>setGuidelines(true)}>Ranking Guidelines</button></div>{guidelines&&<RankingGuidelines onClose={()=>setGuidelines(false)}/>}<p>Rank 1 is the highest priority. Rank only proposals whose final reviews you submitted. Newly completed reviews remain unranked until you save or generate ranks.</p><div id="rankingToolbar"><div className="review-download-toolbar"><button className="secondary compact" disabled={busy||!ids.length} onClick={()=>onDownload(ids)}>Download Selected Reviews</button><button className="secondary compact" onClick={()=>setSelected(allowed)}>Select All</button><button className="secondary compact" onClick={()=>setSelected([])}>Clear Selection</button><button id="autoRankProposalsBtn" className="secondary compact" disabled={busy||!base.proposals.length} onClick={generate}>Generate Rankings</button></div></div>{notice&&<p role="status">{notice}</p>}<p id="rankingSavedAt" className="muted small">{base.updatedAt?`Last saved: ${base.updatedAt}`:'No ranking changes saved yet.'}</p><Table id="rankingEditor" serialNumbers defaultSort={{key:'rank',direction:1}} label="Submitted proposals and rankings" rows={base.proposals} columns={[
    {key:'select',label:'Select',sortable:false,render:p=>p.downloadable?<input type="checkbox" className="review-check" aria-label={`Select review ${p.id}`} checked={ids.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/>:null},
    {key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},
    {key:'link',label:'Proposal Document',sortable:false,render:p=><Link href={p.link}>View Proposal</Link>},
    {key:'review',label:'Proposal Review',sortable:false,render:p=><button className="view-action" disabled={busy} onClick={()=>onView(p.id)}>View Review</button>},
    {key:'overallScore',label:'Overall Score (out of 42)',render:p=>p.overallScore==null?'Not recorded':`${p.overallScore} / 42`},
    {key:'rank',label:'Rank',emptyFirst:true,sort:p=>Number(edits[p.id].rank)||null,render:p=><select className="rank-select" aria-label={`Rank for ${p.name}`} disabled={busy} value={edits[p.id].rank} onChange={e=>edit(p.id,'rank',e.target.value)}><option value="">- (Unranked)</option>{Array.from({length:base.rankLimit},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>},
    {key:'justification',label:'Justification',sortable:false,render:p=><Justification name={p.name} value={edits[p.id].justification} busy={busy} onChange={value=>edit(p.id,'justification',value)}/>} ]}/><button id="submitRanksBottom" disabled={busy||!base.proposals.length} onClick={save}>Save Rankings</button></section></>;
}

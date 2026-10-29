import React,{useState} from 'react';
import {Table,Cards,Filters,Link} from './Common.jsx';
import {useResource} from '../hooks.js';

export function ProposalTable({rows,scope='personal',onOpen,onView,onDownload,busy=false,extra=[]}){
  const [selected,setSelected]=useState([]);
  const allowed=rows.filter(r=>r.downloadable).map(r=>r.id),ids=selected.filter(id=>allowed.includes(id));
  const columns=[...(allowed.length?[{key:'select',label:<input type="checkbox" className="review-check" aria-label="Select all reviews in this list" checked={!!allowed.length&&allowed.every(id=>ids.includes(id))} onChange={e=>setSelected(e.target.checked?allowed:[])}/>,sortable:false,render:r=>r.downloadable?<input className="review-check" type="checkbox" aria-label={`Select review ${r.id}`} checked={ids.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/>:null}]:[]),
    {key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},
    ...(scope!=='personal'?[{key:'reviewer',label:'Reviewer',render:r=>r.reviewer||(r.assignedReviewers||[]).join(', ')||'Not assigned'}]:[]),
    ...(scope==='admin'?[{key:'domain',label:'Domain'},{key:'institute',label:'Institute'}]:[]),
    ...extra,{key:'date',label:'Updated / Submitted',sort:r=>r.order||r.updatedAt||r.submittedAt,render:r=>r.submittedAt||r.updatedAt||'—'},
    {key:'actions',label:'Action',sortable:false,render:r=><div className="row-actions">{r.state==='reviewed'?scope==='domain'?null:<button disabled={busy} className="view-action" onClick={()=>onView(r.id)}>View Review</button>:scope==='personal'?<button disabled={busy} className="view-action" onClick={()=>onOpen(r.id)}>{r.state==='draft'?'Resume Draft':'Start Review'}</button>:null}</div>}];
  return <>{allowed.length>0&&<div className="review-download-toolbar"><button className="secondary compact" disabled={busy||!ids.length} onClick={async()=>{await onDownload(ids);setSelected([]);}}>Download Selected Reviews</button><button className="secondary compact" onClick={()=>setSelected(allowed)}>Select All</button><button className="secondary compact" onClick={()=>setSelected([])}>Clear Selection</button><span>{ids.length} selected</span></div>}<Table columns={columns} rows={rows} label="Proposals"/></>;
}

export function Board({board,scope='personal',...props}){
  const [category,setCategory]=useState(scope==='personal'?'pending':'reviewed');
  const categories=scope==='domain'?['reviewed','draft','pending','ranked']:['reviewed','draft','pending'];
  const titles={reviewed:'Reviewed Proposals',draft:'Saved Draft Proposals',pending:'Pending Proposals',ranked:'Ranked Proposals'};
  const combined=scope==='admin'?{...board,pending:[...(board.pending||[]),...(board.draft||[])]}:board;
  const visibleCategories=scope==='admin'?['reviewed','pending']:categories;
  return <><Cards selected={category} onSelect={setCategory} items={visibleCategories.map(key=>({key,label:titles[key],count:(combined[key]||[]).length,total:board.total}))}/><section className="card"><h2>{titles[category]}</h2><ProposalTable rows={combined[category]||[]} scope={scope} extra={scope==='domain'?[{key:'rank',label:'Rank'},{key:'justification',label:'Justification'}]:[]} {...props}/></section></>;
}

export function AssistantWorkspace({app,onOpen,onView,busy}){
  const [category,setCategory]=useState('assigned'),all=app.assistantProposals||[];
  const groups={assigned:all.filter(p=>!p.sent&&!p.final&&!p.hasDraft),draft:all.filter(p=>!p.sent&&!p.final&&p.hasDraft),submitted:all.filter(p=>p.sent||p.final)};
  return <section id="dashboardPage"><h2 id="dashboardTitle">Assistant Reviewer Dashboard</h2><Cards selected={category} onSelect={setCategory} items={[['assigned','Assigned Proposals'],['draft','Draft Proposals'],['submitted','Submitted to LDC']].map(([key,label])=>({key,label,count:groups[key].length,total:all.length}))}/><section className="card"><Table label="Assistant proposals" rows={groups[category]} columns={[{key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},{key:'ldc',label:'Assigned LDC'},{key:'status',label:'Status'},{key:'actions',label:'Action',sortable:false,render:p=><div className="row-actions">{!p.sent&&!p.final&&<button className="view-action" disabled={busy} onClick={()=>onOpen(p.id)}>{p.hasDraft?'Resume Draft':'Start Review'}</button>}{p.sent&&<button className="view-action" disabled={busy} onClick={()=>onView(p.id,true)}>View Submitted Review</button>}{p.final&&<button className="view-action" disabled={busy} onClick={()=>onView(p.id)}>View Final Review</button>}</div>}]}/></section></section>;
}
export function AssistantInbox({rows,onOpen,onView,busy}){return <section id="assistantPage" className="card"><h2>My Assistant Reviewers Dashboard</h2><Table label="Assistant submissions" rows={rows||[]} columns={[{key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},{key:'assistant',label:'Assistant Reviewer'},{key:'status',label:'Status'},{key:'actions',label:'Action',sortable:false,render:r=>r.ready?<button disabled={busy} className="view-action" onClick={()=>onOpen(r.id)}>Review Draft</button>:r.ownFinal?<button className="view-action" disabled={busy} onClick={()=>onView(r.id)}>View Review</button>:null}]}/></section>;}

export function Monitor({user,revision,onError,...props}){
  const [filters,setFilters]=useState({});const {data,loading}=useResource('getAdminData',[filters],revision,onError);
  return <section id="adminPage"><h2 id="adminTitle">{user.role==='PIC'?'PIC Dashboard':'Review Dashboard'}</h2><p className="muted">Review completion and proposal assignments within your access.</p><Filters busy={props.busy} values={filters} onChange={setFilters} options={{...data?.filterOptions,statuses:['reviewed','pending',...(user.role==='PIC'?['draft']:[])]}} fields={user.role==='PIC'?['domain','status']:['domain','institute','reviewer','status']}/>{loading?<p role="status">Loading dashboard…</p>:data&&<><Board key={JSON.stringify(filters)} board={data.all} scope={user.role==='PIC'?'monitor':'admin'} {...props}/><section className="card"><h2>Domain Progress</h2><Table label="Domain progress" rows={data.domains} columns={[{key:'name',label:'Domain'},{key:'total',label:'Total'},{key:'reviewed',label:'Reviewed',sort:r=>r.reviewed.length,render:r=>r.reviewed.length},{key:'pending',label:'Pending',sort:r=>r.pending.length+r.draft.length,render:r=>r.pending.length+r.draft.length}]}/></section><section className="card"><h2>Reviewer Progress</h2><Table label="Reviewer progress" rows={data.reviewers} getKey={r=>`${r.name}:${r.domain}`} columns={[{key:'name',label:'Reviewer'},{key:'domain',label:'Domain'},{key:'assigned',label:'Assigned'},{key:'reviewed',label:'Reviewed'},{key:'open',label:'Pending'}]}/></section></>}</section>;
}

export function Directory({kind,revision,onError,busy}){
  const [filters,setFilters]=useState({}),users=kind==='users';
  const {data,loading}=useResource(users?'getAdminUsers':'getAdminProposals',[filters],revision,onError);
  const fields=users?['domain','institute','role','status']:['domain','institute','status'];
  const columns=users?[{key:'name',label:'User Name (Email ID)',render:r=>`${r.name} (${r.email})`},{key:'institute',label:'Institute'},{key:'status',label:'Status'},{key:'roles',label:'Roles',render:r=>r.roles.join(', ')},{key:'domain',label:'Domain'}]:[{key:'id',label:'Proposal ID'},{key:'name',label:'Proposal Name'},{key:'domain',label:'Domain'},{key:'institute',label:'Institute'},{key:'status',label:'Status'},{key:'link',label:'Proposal Document',sortable:false,render:r=><Link href={r.link}>View Proposal</Link>}];
  return <section id={users?'usersPage':'proposalDashboardPage'}><h2>{users?'User Dashboard':'Proposal Dashboard'}</h2><Filters busy={busy} values={filters} onChange={setFilters} fields={fields} options={{...data?.filterOptions,statuses:users?['Active','Inactive']:['pending','reviewed']}}/>{loading?<p role="status">Loading directory…</p>:data&&<section className="card"><Table label={users?'Users & roles':'Proposal directory'} columns={columns} rows={data.rows}/></section>}</section>;
}

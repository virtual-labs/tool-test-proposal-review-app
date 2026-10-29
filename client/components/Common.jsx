import React,{useState} from 'react';
import {safeUrl} from '../api.js';

export function Link({href,children}){const url=safeUrl(href);return url?<a className="link view-action" href={url} target="_blank" rel="noopener noreferrer">{children}</a>:null;}
export function Table({columns,rows,label,getKey=row=>row.id||row.email||row.name}){
  const [sort,setSort]=useState({key:'',direction:0});
  const list=[...rows];
  if(sort.direction){const column=columns.find(c=>c.key===sort.key);list.sort((a,b)=>{
    const x=column.sort?column.sort(a):a[sort.key],y=column.sort?column.sort(b):b[sort.key];
    if(x==null||x==='')return y==null||y===''?0:1;if(y==null||y==='')return -1;
    return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*sort.direction;
  });}
  return <div className="table-wrap"><table aria-label={label}><thead><tr>{columns.map(c=><th key={c.key} aria-sort={sort.key===c.key&&sort.direction?(sort.direction===1?'ascending':'descending'):'none'}>{c.sortable===false?c.label:<button className="sort-column" onClick={()=>setSort(s=>({key:c.key,direction:s.key!==c.key?1:s.direction===1?-1:s.direction===-1?0:1}))}>{c.label}<span aria-hidden="true"> {sort.key===c.key?(sort.direction===1?'↑':sort.direction===-1?'↓':'↕'):'↕'}</span></button>}</th>)}</tr></thead><tbody>{list.map((row,i)=><tr key={getKey(row)||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(row,i):row[c.key]??'—'}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="muted">No records match this view.</p>}</div>;
}
export function Filters({values,onChange,options={},fields=['domain','institute','reviewer','status'],busy=false}){
  const names={domain:'Domain',institute:'Institute',reviewer:'Reviewer',status:'Status',role:'Role'};
  return <div className="card"><div className="admin-filters">{fields.map(key=><label key={key}>{names[key]}<select aria-label={names[key]} value={values[key]||''} disabled={busy} onChange={e=>onChange({...values,[key]:e.target.value})}><option value="">All {key==='status'?'statuses':names[key].toLowerCase()+'s'}</option>{(options[key==='status'?'statuses':key+'s']||[]).map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select></label>)}</div><button className="secondary compact" disabled={busy} onClick={()=>onChange({})}>Clear filters</button></div>;
}
export function Cards({items,selected,onSelect}){return <div className="stats" style={{gridTemplateColumns:`repeat(${Math.min(items.length,3)}, minmax(0, 1fr))`}}>{items.map((item,i)=><button type="button" key={item.key} className={`stat ${['mint','peach','red'][i%3]}`} aria-pressed={selected===item.key} onClick={()=>onSelect(item.key)}><span>{item.label}</span><strong>{item.count}{item.total==null?'':` / ${item.total}`}</strong>{item.hint&&<small>{item.hint}</small>}</button>)}</div>;}
export function Help({user,onClose}){
  return <section className="card" role="region" aria-label="Portal help"><h2>{user?`${user.role} User Guide`:'Sign-in help'}</h2><p>Sign in using your active registered email address and the latest six-digit code. Codes expire after ten minutes, work once, and can be resent after sixty seconds. Never share a code.</p>{user&&<><p>LDC reviewers can save drafts, submit final reviews, and rank only their own completed reviews. Assistant Reviewers can save answers and submit them to the assigned LDC. PIC and Admin dashboards show records within the permissions assigned in Google Sheets.</p><p>Final reviews cannot be edited. Save before switching roles or leaving a form. Use Refresh to load current data. Select reviews in a workspace or ranking table to download PDFs. Other reviewers’ drafts remain private.</p></>}<p>For help, email <a href="mailto:support@vlabs.ac.in">support@vlabs.ac.in</a>. Include the action and error message, without codes or session details.</p><button className="secondary compact" onClick={onClose}>Close Help</button></section>;
}

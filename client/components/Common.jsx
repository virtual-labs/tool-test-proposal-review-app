import React,{useState,useEffect,useRef} from 'react';
import {sortedRows} from '../table-sort.js';
export {Help,UserGuide} from './Guides.jsx';
import {SET_OPTIONS} from '../../shared/proposal-set.js';
import {safeUrl} from '../api.js';

export function Link({href,children}){const url=safeUrl(href);return url?<a className="link view-action" href={url} target="_blank" rel="noopener noreferrer">{children}</a>:null;}
export function Table({columns,rows,label,getKey=row=>row.id||row.email||row.name,defaultSort={key:'',direction:0},serialNumbers=false,className='',id,footer,stickyHeader=false}){
  const [sort,setSort]=useState(defaultSort);
  const wrapper=useRef(null);
  useEffect(()=>{
    if(!stickyHeader)return;
    const wrap=wrapper.current,table=wrap.querySelector('table'),head=table.tHead;
    const toolbar=wrap.closest('.proposal-region')?.querySelector('.proposal-sticky-tools');
    let frame;
    const update=()=>{
      frame=undefined;
      const bounds=table.getBoundingClientRect();
      const top=Math.max(0,toolbar?.getBoundingClientRect().bottom||0);
      const shift=Math.max(0,Math.min(top-bounds.top,bounds.height-head.offsetHeight));
      head.style.transform='translateY('+shift+'px)';
    };
    const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(update);};
    const observer=new ResizeObserver(schedule);observer.observe(table);if(toolbar)observer.observe(toolbar);
    window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);update();
    return ()=>{observer.disconnect();window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);if(frame!==undefined)cancelAnimationFrame(frame);head.style.transform='';};
  },[stickyHeader]);
  const displayColumns=[...columns];
  if(serialNumbers)displayColumns.splice(columns[0]?.key==='select'?1:0,0,{key:'serial',label:'S.No.',sortable:false,render:(_row,i)=>i+1});
  const list=sortedRows(rows,columns,sort);
  const columnName=c=>typeof c.label==='string'?c.label:c.key==='select'?'Select':c.key;
  return <div ref={wrapper} className={`table-wrap${stickyHeader?' page-sticky-table':''}`} id={id}><table className={className} aria-label={label}><thead><tr>{displayColumns.map(c=><th key={c.key} data-column={columnName(c)} aria-sort={sort.key===c.key&&sort.direction?(sort.direction===1?'ascending':'descending'):'none'}>{c.sortable===false?c.label:<button className="sort-column" onClick={()=>setSort(s=>s.key!==c.key?{key:c.key,direction:1}:s.direction===1?{key:c.key,direction:-1}:defaultSort)}>{c.label}<span className="sort-indicator" aria-hidden="true"> {sort.key===c.key?(sort.direction===1?'↑':sort.direction===-1?'↓':'↕'):'↕'}</span></button>}</th>)}</tr></thead><tbody>{list.map((row,i)=><tr key={getKey(row)||i}>{displayColumns.map(c=><td key={c.key} data-column={columnName(c)}>{c.render?c.render(row,i):row[c.key]??'—'}</td>)}</tr>)}</tbody>{footer&&<tfoot>{footer}</tfoot>}</table>{!rows.length&&<p className="muted">No records match this view.</p>}</div>;
}
export function Filters({values,onChange,options={},fields=['domain','institute','reviewer','status'],busy=false,embedded=false,help,count,id}){
  const names={domain:'Domain',institute:'Institute',reviewer:'Reviewer',status:'Status',role:'Role',set:'Set'};
  return <div id={id} className={embedded?undefined:"card"}><div className="admin-filters">{fields.map(key=><label key={key}>{names[key]}<select aria-label={names[key]} value={values[key]||''} disabled={busy} onChange={e=>onChange({...values,[key]:e.target.value})}><option value="">All {key==='status'?'statuses':names[key].toLowerCase()+'s'}</option>{(key==='set'?SET_OPTIONS:(options[key==='status'?'statuses':key+'s']||[])).map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select></label>)}</div>{help&&<p className="muted small">{help}</p>}<button className="secondary compact" disabled={busy} onClick={()=>onChange({})}>Clear filters</button>{count&&<p className="muted small" role="status">{count}</p>}</div>;
}
export function SetFilter({value='',onChange,busy=false}){
  return <label className="compact-set-filter">Set<select aria-label="Set" value={value} disabled={busy} onChange={e=>onChange(e.target.value)}><option value="">All sets</option>{SET_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
export function Cards({items,selected,onSelect}){return <div className={`stats ${items.length>=4?'four-stats':items.length===2?'rank-stats':''}`} style={{gridTemplateColumns:`repeat(${Math.min(items.length,5)}, minmax(0, 1fr))`}}>{items.map((item)=><button type="button" key={item.key} className={`stat ${item.color||({reviewed:'mint',draft:'peach',pending:'red',ranked:'peach',unranked:'red',assigned:'red',submitted:'mint'})[item.key]||'mint'}`} aria-pressed={selected===item.key} onClick={()=>onSelect(item.key)}><span>{item.label}</span><strong>{item.count}{item.total==null?'':` / ${item.total}`}</strong>{item.hint&&<small>{item.hint}</small>}</button>)}</div>;}

export function DisplayDate({value}){
  const full=String(value||'—');
  const date=full.match(/^(\d{1,2} [A-Za-z]{3} \d{4})(?:,|$)/)?.[1]||full;
  return <span title={full}>{date}</span>;
}

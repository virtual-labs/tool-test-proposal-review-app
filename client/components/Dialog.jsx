import React,{useEffect,useId,useRef,useState} from 'react';

export function Dialog({title,children,onClose,id,closeLabel='Close',showClose=true}){
  const ref=useRef(null),titleId=useId();
  useEffect(()=>{const dialog=ref.current,opener=document.activeElement;dialog.showModal();(dialog.querySelector('textarea')||dialog.querySelector('h2'))?.focus({preventScroll:true});dialog.scrollTop=0;return ()=>{dialog.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus();};},[]);
  return <dialog ref={ref} id={id} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}}><h2 id={titleId} tabIndex={-1}>{title}</h2>{children}{showClose&&<button className="secondary compact" onClick={onClose}>{closeLabel}</button>}</dialog>;
}

export function Justification({name,value='',onChange,busy=false}){
  const [open,setOpen]=useState(false);
  return <>{onChange||value?<button className="view-action" disabled={busy} onClick={()=>setOpen(true)}>{onChange?(value?'View/Edit':'Add'):'View'}</button>:<span>—</span>}{open&&(onChange?<JustificationEditor name={name} value={value} onSave={text=>{onChange(text);setOpen(false);}} onClose={()=>setOpen(false)}/>:<Dialog title={`Rank justification — ${name}`} onClose={()=>setOpen(false)}><p className="review-text">{value}</p></Dialog>)}</>;
}
function JustificationEditor({name,value,onSave,onClose}){
  const [text,setText]=useState(value),id=useId();
  return <Dialog title={`Rank justification — ${name}`} onClose={onClose} showClose={false}><form onSubmit={event=>{event.preventDefault();onSave(text.trim());}}><label htmlFor={id}>Justification for {name}</label><textarea id={id} maxLength={10000} value={text} onChange={event=>setText(event.target.value)}/><p>The rank justification is saved when the ranking is saved.</p><p className="muted small">Clear the text and submit to remove it. Then click Save Rankings.</p><div className="actions"><button type="button" className="secondary compact" onClick={onClose}>Cancel</button><button type="submit" className="compact">Submit</button></div></form></Dialog>;
}

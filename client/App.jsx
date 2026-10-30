import React,{useCallback,useEffect,useRef,useState} from 'react';
import {rpc,initialAnswers} from './api.js';
import {useResource} from './hooks.js';
import {Login} from './components/Login.jsx';
import {Help,UserGuide} from './components/Common.jsx';
import {Board,Monitor,Directory,AssistantWorkspace,AssistantInbox} from './components/Boards.jsx';
import {ReviewForm,ReviewView} from './components/Review.jsx';
import {Ranking,RankMonitor} from './components/Ranking.jsx';

export function App(){
  const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [view,setView]=useState(null),[revision,setRevision]=useState(0),[help,setHelp]=useState(false),[detail,setDetail]=useState(null),[work,setWork]=useState(null),[dirty,setDirty]=useState(false),[recovery,setRecovery]=useState(null),[rankRestore,setRankRestore]=useState(null),[files,setFiles]=useState([]);
  const returnView=useRef('workspace'),urls=useRef([]),lastEmail=useRef('');
  const report=useCallback(err=>{
    setError(err.message||String(err));
    if(err.status===401||String(err.message).includes('AUTH_REQUIRED:')){setSession(null);setView(null);setDetail(null);setDirty(false);setNotice('Sign in again. Unsaved changes remain available in this tab for the same account.');}
  },[]);
  const {data:app,loading}=useResource('getInitialData',[],`${revision}:${session?.activeRole||''}:${session?.email||''}`,report,!!session);
  useEffect(()=>{let active=true;rpc('session').then(result=>{if(active&&result.authenticated){lastEmail.current=result.email;setSession(result);}}).catch(err=>{if(active)report(err);}).finally(()=>{if(active)setChecking(false);});return ()=>{active=false;};},[report]);
  useEffect(()=>{const handler=event=>{if(dirty||busy||recovery){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',handler);return ()=>window.removeEventListener('beforeunload',handler);},[dirty,busy,recovery]);
  useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  useEffect(()=>{
    if(!session)return;let cancelled=false;
    const check=async()=>{if(document.hidden||busy)return;try{await rpc('session');}catch(err){if(!cancelled)report(err);}};
    const timer=setInterval(check,60000);window.addEventListener('focus',check);
    return ()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',check);};
  },[session,busy,report]);
  const run=useCallback(async(action,args=[],{publicAction=false}={})=>{
    setBusy(true);setError('');
    try{const result=await rpc(action,...(publicAction?args:['cookie',...args]));if(action==='requestOtp')setNotice(result.message);return result;}
    catch(err){report(err);return null;}finally{setBusy(false);}
  },[report]);
  const user=app?.user,isMonitor=['Admin','PIC'].includes(user?.role),activeView=view||(isMonitor?'admin':'workspace');
  function canLeave(){return !dirty||window.confirm('You have unsaved changes. Discard them and continue?');}
  function discard(){setDirty(false);setRecovery(null);setRankRestore(null);}
  function navigate(next){if(busy||!canLeave())return;discard();setView(next);setError('');setNotice('');}
  function onDirty(value,payload){setDirty(value);setRecovery(value?{...payload,email:session.email}:null);}
  function updateWork(next){setWork(next);onDirty(JSON.stringify(next.answers)!==JSON.stringify(next.baseline),{type:'review',work:next});}
  async function openProposal(id){if(!canLeave())return;const result=await run('getProposal',[id]);if(result){discard();returnView.current=activeView;const answers=initialAnswers(result);setWork({proposal:result,answers,baseline:answers});setView('review');}}
  async function openReview(id,assistant=false){if(!canLeave())return;const result=await run(assistant?'getAssistantReview':'getReview',[id]);if(result){discard();returnView.current=activeView;setDetail(result);setView('view');}}
  async function download(ids){
    const prepared=[],failed=[];
    setBusy(true);setError('');
    try{for(const id of [...new Set(ids)]){
      try{
        const result=await rpc('downloadReview','cookie',id);
        if(result.mimeType!=='application/pdf'||!result.fileName?.endsWith('.pdf')||typeof result.base64!=='string')throw new Error('Invalid PDF response');
        const raw=atob(result.base64);if(!raw.startsWith('%PDF-'))throw new Error('Invalid PDF file');
        const url=URL.createObjectURL(new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:'application/pdf'}));urls.current.push(url);
        const link=document.createElement('a');link.href=url;link.download=result.fileName;document.body.append(link);link.click();link.remove();prepared.push({url,name:result.fileName});
      }catch(err){if(err.status===401){report(err);break;}failed.push(`${id}: ${err.message}`);}
    }setFiles(old=>[...old,...prepared]);setNotice(`${prepared.length} review PDF(s) prepared.${failed.length?' Some downloads failed: '+failed.join('; '):''}`);}finally{setBusy(false);}
  }
  function signedIn(result){
    if(lastEmail.current&&lastEmail.current!==result.email){setRecovery(null);setWork(null);setRankRestore(null);setDetail(null);urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];setFiles([]);}
    lastEmail.current=result.email;setSession(result);setView(null);setNotice('');setRevision(v=>v+1);
  }
  async function logout(){if(busy||!canLeave())return;const result=await run('logout');if(result){discard();setSession(null);setView(null);setWork(null);setDetail(null);urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];setFiles([]);setNotice('Signed out.');}}
  async function switchRole(role){if(busy||!canLeave())return;const result=await run('switchRole',[role]);if(result){discard();setSession({...session,activeRole:role});setView(null);setRevision(n=>n+1);}}
  function saved(result,submit){discard();setWork(null);setView(returnView.current);setRevision(n=>n+1);setNotice(submit?(user.role==='Assistant Reviewer'?'Your review was submitted to the LDC.':result.alreadySaved?result.message:'Your final review has been submitted successfully.'+(result.emailSent===false?' Confirmation email could not be sent; do not resubmit.':'')):'Draft saved. You can return later to edit and submit your final review.');}
  function restore(){if(recovery.type==='review'){setWork(recovery.work);setView('review');}else{setRankRestore(recovery);setView('ranking');}setDirty(true);setNotice('Unsaved work restored. Check it before saving.');}
  const actions={onOpen:openProposal,onView:openReview,onDownload:download,busy};
  const nav=user?.role==='Admin'?[['admin','Review Dashboard'],['proposals','Proposal Dashboard'],['ranking','Rank Dashboard'],['users','User Dashboard']]:user?.role==='PIC'?[['admin','PIC Dashboard'],['ranking','Rank Dashboard']]:user?.role==='Assistant Reviewer'?[['workspace','My Workspace']]:[['workspace','My Workspace'],['ranking','My Rank Dashboard'],...((app?.assistantReviews||[]).length?[['assistant','My Assistant Reviewers Dashboard']]:[]),['domain','Domain Dashboard']];
  return <main id="appMain" aria-busy={busy||loading||checking}><header className="card brand"><img src="/logo.png" alt="Virtual Labs logo" width="76" height="68"/><div className="brand-copy"><h1>Virtual Labs — Proposal Review Portal</h1><p className="muted small">{session&&user?`${user.role} – ${user.name} | Institute: ${user.institute}`:'A shared workspace for lab proposal reviews'}</p></div><div className="row-actions">{session&&user&&<button className="secondary compact" onClick={()=>setHelp('guide')}>{user.role==='Admin'?'Administrator':user.role} User Guide</button>}<button className="secondary compact" onClick={()=>setHelp('help')}>Help</button>{session&&<button id="logoutBtn" className="secondary compact" disabled={busy} onClick={logout}>Sign out</button>}</div></header>
    {help==='help'&&<Help onClose={()=>setHelp(false)}/>} {help==='guide'&&user&&<UserGuide user={user} onClose={()=>setHelp(false)}/>}{error&&<p id="error" className="message" role="alert">{error}</p>}{notice&&<p id="notice" className="message" role="status">{notice}</p>}{busy&&<p role="status" className="loading-indicator">Working, please wait…</p>}
    {checking?<p role="status">Checking session…</p>:!session?<Login run={run} onSignedIn={signedIn} busy={busy}/>:loading||!user?<p role="status">Loading your workspace…</p>:<>
      {user.roles?.length>1&&<label className="role-picker">Active Role<select id="roleSelector" value={user.role} disabled={busy} onChange={e=>switchRole(e.target.value)}>{user.roles.map(role=><option key={role}>{role}</option>)}</select></label>}
      <nav id="appNav" className="tabs" aria-label="Application pages">{nav.map(([key,label])=><button key={key} id={{workspace:'workspaceBtn',ranking:'rankingBtn',admin:'adminBtn',users:'usersBtn',proposals:'proposalDashboardBtn',domain:'domainBtn',assistant:'assistantBtn'}[key]} disabled={busy} aria-current={activeView===key?'page':undefined} onClick={()=>navigate(key)}>{label}</button>)}<button id="refreshBtn" className="secondary" disabled={busy} onClick={()=>{if(canLeave()){discard();setRevision(n=>n+1);setView(['view','review'].includes(activeView)?returnView.current:activeView);}}}>↻ Refresh</button></nav>
      {recovery&&recovery.email===session.email&&!dirty&&<section className="message"><p>Unsaved work is available from your previous session in this tab.</p><button className="compact" onClick={restore}>Restore unsaved work</button><button className="secondary compact" onClick={()=>setRecovery(null)}>Discard recovered work</button></section>}
      {activeView==='workspace'&&(user.role==='Assistant Reviewer'?<AssistantWorkspace app={app} {...actions}/>:<section id="dashboardPage"><h2 id="dashboardTitle">{user.name} Dashboard</h2><p className="muted">Select a card to open pending proposals, saved drafts or submitted reviews.</p>{!!app.personal.completedByOthers&&<p>{app.personal.completedByOthers} assignments were completed by another reviewer.</p>}{!!app.personal.claimedByOthers&&<p>{app.personal.claimedByOthers} assignments are reserved by another reviewer’s draft.</p>}<Board board={app.personal} {...actions}/></section>)}
      {activeView==='domain'&&user.role==='LDC'&&<section id="domainPage"><h2>{app.domain.name} Domain Dashboard</h2><Board board={app.domain} scope="domain" {...actions}/></section>}
      {activeView==='assistant'&&user.role==='LDC'&&<AssistantInbox rows={app.assistantReviews} {...actions}/>}
      {activeView==='admin'&&isMonitor&&<Monitor user={user} revision={revision} onError={report} {...actions}/>}
      {['users','proposals'].includes(activeView)&&user.role==='Admin'&&<Directory key={activeView} kind={activeView} revision={revision} onError={report} busy={busy}/>}
      {activeView==='ranking'&&(isMonitor?<RankMonitor user={user} revision={revision} onError={report} {...actions}/>:user.role==='LDC'?<Ranking revision={revision} onError={report} run={run} onDirty={onDirty} restored={rankRestore} {...actions}/>:null)}
      {activeView==='review'&&work&&<ReviewForm work={work} setWork={updateWork} run={run} user={user} onSaved={saved} onBack={()=>navigate(returnView.current)} busy={busy}/>}
      {activeView==='view'&&detail&&<ReviewView review={detail} user={user} onBack={()=>navigate(returnView.current)} onDownload={download} busy={busy}/>}
      {!!files.length&&<section className="card"><h2>Your Review Downloads</h2><p className="muted small">If automatic downloads were blocked, use these links.</p>{files.map(file=><p key={file.url}><a href={file.url} download={file.name}>{file.name}</a></p>)}</section>}
    </>}
    <footer className="card muted small">For assistance, email <a href="mailto:support@vlabs.ac.in">support@vlabs.ac.in</a> or <a href="mailto:manager.iitdelhi@gmail.com">manager.iitdelhi@gmail.com</a>.</footer>
  </main>;
}

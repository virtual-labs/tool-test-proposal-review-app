import { createHash, randomUUID } from 'node:crypto';
import { formatDate } from './time.js';
import { PortalError } from './errors.js';
// Request-scoped domain rules; all network I/O is handled in service.js.
export function createDomain(db, principal, { assertWritable = () => { throw new Error('Read-only request'); }, onEmail = () => {} } = {}) {
const CONFIG = Object.freeze({ PROPOSALS_SHEET:'Proposals', REVIEWERS_SHEET:'Users', REVIEWS_SHEET:'Completed Reviews', DRAFTS_SHEET:'Draft Reviews', TIME_ZONE:'Asia/Kolkata' });
const Utilities = { getUuid: randomUUID, formatDate };
const SpreadsheetApp = { flush: assertWritable };
const LockService = { getScriptLock: () => ({waitLock: assertWritable, releaseLock() {}}) };
const MailApp = { sendEmail: onEmail };
const REVIEW_QUESTIONS = [["clarity", "Clarity of the Proposal", "How clearly is the purpose of the proposed lab explained?"], ["academicRelevance", "Academic Relevance", "How relevant is the proposed lab to the intended subject or course area?"], ["pedagogicalNeed", "Pedagogical Value", "How well does the proposed lab address a teaching-learning need?"], ["quality", "Quality of the Proposed Lab", "How would you rate the overall quality of the proposed lab?"], ["experimentDesign", "Experiment Design", "How well are the proposed experiments designed to support learning?"], ["jobRelevance", "Job Relevance", "How relevant is the proposed lab to current or emerging job roles?"], ["userExperience", "Student Experience", "How would you rate the overall student experience of the proposed lab?"], ["overallRating", "Overall Rating", "Considering the proposal as a whole, how would you rate it?"]];
const REVIEW_V2_HEADERS = REVIEW_QUESTIONS.map(q=>q[1]+' (1–6)').concat(['Reviewer Comments / Suggestions','Form Version','Rating Maximum']);
const REVIEW_CORE_HEADERS = ['Review ID', 'Proposal ID', 'Proposal Name', 'Domain',
  'Reviewer', 'Reviewer Email', 'LDC', 'Submission Date/Time'];
// Optional historical answers: never require or recreate these columns.
const LEGACY_REVIEW_HEADERS = ['Clarity of Concept and Vision', 'Pedagogical Need',
  'Quality of Proposed Lab', 'Job Relevance', 'User Experience',
  'Overall Feedback', 'Additional Comments / Suggestions'];

const HEADERS = Object.freeze({
  Drafts: ['Draft ID', 'Proposal ID', 'Reviewer Email', 'Answers JSON', 'Updated At', 'Revision', 'Status', 'Review ID', 'Institute Name', 'Proposal Name', 'Domain', 'Role'],
  Proposals: ['Proposal ID', 'Domain', 'Lab/Proposal Name', 'Proposal Link',
    'Assigned LDC', 'Status', 'Reviewer', 'Reviewer Email', 'Review Date', 'Second LDC Reviewer', 'Institute Name', 'Existing Lab Link 1', 'Existing Lab Link 2'],
  Reviewers: ['Email', 'Name', 'Status', 'Domain', 'Institute Name', 'Role'],
  Reviews: REVIEW_CORE_HEADERS.concat(['Role', 'Institute Name', 'Rank'], REVIEW_V2_HEADERS)
});

function role_(value) {
  const label = text_(value);
  if (normalized_(label) === 'admin') return 'Admin';
  if (normalized_(label) === 'pic') return 'PIC';
  if (normalized_(label) === 'assistant reviewer') return 'Assistant Reviewer';
  // Numbered labels remain accepted during migration, but expose one canonical role.
  return /^LDC(?:\s*[1-9]\d*)?$/i.test(label) ? 'LDC' : '';
}

function db_() { return db; }

function text_(value) {
  return value == null ? '' : String(value).trim();
}

function normalized_(value) {
  return text_(value).toLowerCase();
}

// Each read-only RPC gets a new spreadsheet handle and its own sheet-read cache.
// Writes use db_() directly and never consult this cache.
const READ_TABLES_ = new WeakMap();
function readDb_() {
  const db=db_();READ_TABLES_.set(db,new Map());return db;
}
function table_(db, name, required) {
  const cache=READ_TABLES_.get(db);
  if(cache && cache.has(name)){
    const table=cache.get(name);
    required.forEach(header=>{if(!table.headers.includes(header))throw new Error('Missing heading in '+name+': '+header);});
    return table;
  }
  const sheet = db.getSheetByName(name);
  if (!sheet || !sheet.getLastColumn()) {
    throw new Error('Missing sheet or headers: ' + name);
  }
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(text_);
  const nonEmpty = headers.filter(Boolean);
  if (new Set(nonEmpty).size !== nonEmpty.length) {
    throw new Error('Duplicate column heading in ' + name + '.');
  }
  required.forEach(function (header) {
    if (headers.indexOf(header) < 0) {
      throw new Error('Missing heading in ' + name + ': ' + header);
    }
  });
  // Map BEFORE filtering, preserving actual sheet row numbers after blank rows.
  const rows = values.slice(1).map(function (row, index) {
    const obj = {};
    headers.forEach(function (h, j) { if (h) obj[h] = row[j]; });
    obj._row = index + 2;
    obj._empty = row.every(function (v) { return text_(v) === ''; });
    return obj;
  }).filter(function (row) { return !row._empty; });
  const result={sheet:sheet,headers:headers,rows:rows};
  if(cache)cache.set(name,result);
  return result;
}

function reviewer_(db, email) {
  const roster = table_(db, CONFIG.REVIEWERS_SHEET, HEADERS.Reviewers).rows;
  const matches = roster.filter(function (r) { return normalized_(r.Email) === email; });
  // Accept Active or TRUE (including a checked checkbox); all other statuses deny.
  if (matches.length !== 1 || !['active', 'true'].includes(normalized_(matches[0].Status)) ||
      !text_(matches[0].Name) || !role_(matches[0].Role)) return null;
  const primary=role_(matches[0].Role), secondary=role_(matches[0]['Secondary Role']);
  const roles=[primary];
  if ((primary==='PIC' && secondary==='LDC') || (primary==='LDC' && secondary==='PIC')) roles.push(secondary);
  return {
    roles:roles, primaryRole:primary,
    email: email, name: text_(matches[0].Name),
    role: role_(matches[0].Role),
    assignmentNameUnique: roster.filter(r => normalized_(r.Name) === normalized_(matches[0].Name)).length === 1,
    domain: text_(matches[0].Domain), institute: text_(matches[0]['Institute Name']), authorized: true
  };
}

function hash_(value) { return createHash('sha256').update(value).digest('base64url'); }
function user_(_db, _token) {
  const user = reviewer_(db, principal.email);
  if (!user || !user.roles.includes(principal.activeRole)) throw new PortalError('AUTH_REQUIRED: Account or role is no longer available.',401);
  user.role = principal.activeRole; user.sessionExpires = principal.expiresAt;
  return user;
}
function assistantAssigned_(proposal,user) {
  return user.role==='Assistant Reviewer' && user.assignmentNameUnique===true &&
    !!normalized_(user.name) && normalized_(proposal['Assistant Reviewer'])===normalized_(user.name);
}
function assistantDraft_(table,id,email) {
  const rows=table.rows.filter(r=>text_(r['Proposal ID'])===id && normalized_(r['Reviewer Email'])===email && text_(r.Role)==='Assistant Reviewer');
  if(rows.length>1)throw new Error('Duplicate assistant drafts. Contact the administrator.');
  return rows[0] || null;
}
function assistantHandoff_(table,id,email) {
  return table.rows.find(r=>{
    if(text_(r['Proposal ID'])!==id || text_(r.Role)==='Assistant Reviewer')return false;
    try{return normalized_(JSON.parse(r['Answers JSON']).assistantOrigin.email)===email;}catch(_){return false;}
  });
}
function assistantInitialData_(db,user) {
  const drafts=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts);
  const reviews=table_(db,CONFIG.REVIEWS_SHEET,HEADERS.Reviews).rows;
  const rows=table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals).rows.filter(p=>assistantAssigned_(p,user)).map(p=>{
    const id=text_(p['Proposal ID']),draft=assistantDraft_(drafts,id,user.email);
    const final=reviews.some(r=>text_(r['Proposal ID'])===id),sent=!!assistantHandoff_(drafts,id,user.email) || (draft && draft.Status==='Submitted to LDC');
    return {id:id,name:text_(p['Lab/Proposal Name']),ldc:text_(p['Assigned LDC']),final:final,sent:!!sent,hasDraft:!!draft,ldcDraftExists:!!claim_(drafts.rows,id),
      status:final?'Finalised by LDC':sent?'Awaiting LDC review':claim_(drafts.rows,id)?'LDC review in progress':draft?'Draft saved':'Not started'};
  });
  return {user:{name:user.name,role:user.role,roles:user.roles,primaryRole:user.primaryRole,domain:user.domain,institute:user.institute},assistantProposals:rows};
}
function ldcAssistantRows_(db,user) {
  const drafts=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts);
  const reviews=table_(db,CONFIG.REVIEWS_SHEET,HEADERS.Reviews).rows;
  return table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals).rows.filter(p=>user.assignmentNameUnique===true &&
    normalized_(p['Assigned LDC'])===normalized_(user.name) && text_(p['Assistant Reviewer'])).map(p=>{
    const id=text_(p['Proposal ID']),final=reviews.find(r=>text_(r['Proposal ID'])===id);
    const received=drafts.rows.find(r=>text_(r['Proposal ID'])===id && normalized_(r['Reviewer Email'])===user.email && (()=>{try{return !!JSON.parse(r['Answers JSON']).assistantOrigin;}catch(_){return false;}})());
    return {id:id,name:text_(p['Lab/Proposal Name']),assistant:text_(p['Assistant Reviewer']),
      ready:!!received && !final,final:!!final,ownFinal:!!final && normalized_(final['Reviewer Email'])===user.email,
      status:final?'Submitted':received?'Pending LDC Review':'Pending Assistant Submission'};
  });
}
function assistantProposal_(db,user,proposals,p) {
  if(!assistantAssigned_(p,user))throw new Error('This proposal is not assigned to you.');
  const id=text_(p['Proposal ID']),drafts=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts),draft=assistantDraft_(drafts,id,user.email);
  if(reviewed_(p,table_(db,CONFIG.REVIEWS_SHEET,HEADERS.Reviews).rows) || assistantHandoff_(drafts,id,user.email) || (draft && draft.Status==='Submitted to LDC'))throw new Error('This review is read-only after submission to LDC.');
  return {id:id,name:text_(p['Lab/Proposal Name']),numberOfExperiments:text_(p['No. of Experiments']),domain:text_(p.Domain),ldc:text_(p['Assigned LDC']),ldcDraftExists:!!claim_(drafts.rows,id),
    link:optionalLabLink_(p['Proposal Link']),existingLabLink1:labLinkFromCell_(proposals,p,'Existing Lab Link 1'),existingLabLink2:labLinkFromCell_(proposals,p,'Existing Lab Link 2'),assistantName:text_(p['Assistant Reviewer']),draft:draftPayload_(draft)};
}
function submitToLdc(token,data) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {const db=db_();return saveAssistantInLock_(db,user_(db,token),data,true);}finally{lock.releaseLock();}
}
/** Read the assistant's original submitted answers, never the LDC's working draft. */
function getAssistantReview(token,proposalId) {
  const db=db_(),user=user_(db,token),id=text_(proposalId);
  const p=findProposal_(table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals),id);
  if(!assistantAssigned_(p,user))throw new Error('This submitted assistant review is not available to your account.');
  const drafts=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts),draft=assistantDraft_(drafts,id,user.email);
  if(!draft || !(draft.Status==='Submitted to LDC' || assistantHandoff_(drafts,id,user.email)))throw new Error('This assistant review has not been submitted to LDC.');
  const answers=JSON.parse(draft['Answers JSON']);
  return {id:id,name:text_(p['Lab/Proposal Name']),numberOfExperiments:text_(p['No. of Experiments']),domain:text_(p.Domain),assignedReviewers:assignedNames_(p),
    submittedAt:historyDate_(draft['Updated At']).label,reviewId:text_(draft['Draft ID']),link:optionalLabLink_(p['Proposal Link']),
    legacy:false,formVersion:'2',ratingMaximum:6,assistantSubmission:true,assistantName:user.name,
    ratings:REVIEW_QUESTIONS.map(q=>({label:q[1],value:rating_(answers[q[0]])})),reviewerComments:text_(answers.reviewerComments)};
}
function saveAssistantInLock_(db,user,data,submit) {
  if(user.role!=='Assistant Reviewer')throw new Error('Assistant Reviewer access is required.');
  if(!data || typeof data!=='object')throw new Error('Invalid assistant review.');
  const id=text_(data.proposalId),p=findProposal_(table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals),id);
  if(!assistantAssigned_(p,user))throw new Error('This proposal is not assigned to you.');
  const drafts=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts),old=assistantDraft_(drafts,id,user.email),handoff=assistantHandoff_(drafts,id,user.email);
  if(handoff || (old && old.Status==='Submitted to LDC')) {
    if(submit)return {success:true,alreadySaved:true};
    throw new Error('This review is read-only after submission to LDC.');
  }
  if(reviewed_(p,table_(db,CONFIG.REVIEWS_SHEET,HEADERS.Reviews).rows))throw new Error('This proposal has already been reviewed.');
  checkDraftVersion_(old,data);
  const answers=draftAnswers_(data);
  if(submit)REVIEW_QUESTIONS.forEach(q=>rating_(data[q[0]]));
  let ldc;
  if(submit) {
    const matches=table_(db,CONFIG.REVIEWERS_SHEET,HEADERS.Reviewers).rows.filter(r=>normalized_(r.Name)===normalized_(p['Assigned LDC']));
    ldc=matches.length===1?reviewer_(db,normalized_(matches[0].Email)):null;
    if(!ldc || !ldc.assignmentNameUnique || !ldc.roles.includes('LDC'))throw new Error('The Assigned LDC must be an active, uniquely named LDC user. Contact the administrator.');
    if(claim_(drafts.rows,id))throw new Error('An LDC draft already exists. Your submission cannot overwrite it. Contact the assigned LDC.');
  }
  const now=new Date(),version=Utilities.getUuid(),draftId=old?text_(old['Draft ID']):Utilities.getUuid();
  const base={'Draft ID':draftId,'Proposal ID':id,'Reviewer Email':user.email,'Answers JSON':JSON.stringify(answers),'Updated At':now,Revision:version,
    Status:'Assistant Draft','Review ID':'','Institute Name':text_(p['Institute Name']),'Proposal Name':text_(p['Lab/Proposal Name']),Domain:text_(p.Domain),Role:user.role};
  writeDraft_(drafts,old,base);
  if(!submit)return {success:true,version:version,updatedAt:historyDate_(now).label};
  // The LDC row is the authoritative handoff marker, even if the source status update fails.
  answers.assistantOrigin={email:user.email,name:user.name,draftId:draftId};
  writeDraft_(drafts,null,Object.assign({},base,{'Draft ID':Utilities.getUuid(),'Reviewer Email':ldc.email,Role:'LDC',Status:'Draft','Answers JSON':JSON.stringify(answers),Revision:Utilities.getUuid()}));
  try {
    const refreshed=table_(db,CONFIG.DRAFTS_SHEET,HEADERS.Drafts);
    writeDraft_(refreshed,assistantDraft_(refreshed,id,user.email),{Status:'Submitted to LDC'});
  }catch(_){console.warn('Assistant handoff saved; source status needs reconciliation.');}
  return {success:true};
}
function assignedNames_(proposal) {
  const names = [], seen = new Set();
  [proposal['Assigned LDC'], proposal['Second LDC Reviewer']].forEach(value => {
    const name = text_(value), key = normalized_(value);
    if (key && !seen.has(key)) { names.push(name); seen.add(key); }
  });
  return names;
}

/** The first physical active draft row is the claim. Last-saved time never transfers ownership. */
function claim_(drafts, id) {
  const rows = drafts.filter(d => text_(d['Proposal ID']) === id && normalized_(d.Status) === 'draft');
  rows.sort((a,b) => a._row - b._row);
  return rows[0] || null;
}

function checkClaim_(drafts, id, user) {
  const claim = claim_(drafts, id);
  if (claim && normalized_(claim['Reviewer Email']) !== user.email) {
    throw new Error('This proposal has been claimed by another reviewer who saved a draft. You can no longer review it. Refresh your dashboard.');
  }
  return claim;
}

function assigned_(proposal, user) {
  if(user.role==='PIC')return false;
  if(user.role==='Assistant Reviewer')return assistantAssigned_(proposal,user);
  return user.assignmentNameUnique === true && !!text_(user.name) &&
    assignedNames_(proposal).some(name => normalized_(name) === normalized_(user.name));
}

function reviewed_(proposal, reviews) {
  return normalized_(proposal.Status) === 'reviewed' || reviews.some(function (r) {
    return text_(r['Proposal ID']) === text_(proposal['Proposal ID']);
  });
}

function findProposal_(table, id) {
  const matches = table.rows.filter(function (p) { return text_(p['Proposal ID']) === id; });
  if (matches.length !== 1) throw new Error('Proposal missing or duplicate Proposal ID. Contact the administrator.');
  return matches[0];
}

/** Read one snapshot; never expose raw draft rows or reviewer roster to reviewers. */
function snapshot_(db, user) {
  const proposals = table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals).rows.filter(p => text_(p['Proposal ID']));
  const reviews = table_(db, CONFIG.REVIEWS_SHEET, HEADERS.Reviews).rows;
  const drafts = table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts).rows;
  const seen = new Set();
  proposals.forEach(p => {
    const id = text_(p['Proposal ID']);
    if (seen.has(id)) throw new Error('Duplicate Proposal ID. Contact the administrator.');
    seen.add(id);
  });
  const ledger = new Map();
  reviews.forEach(r => {
    const id = text_(r['Proposal ID']);
    if (!id) return;
    if (ledger.has(id)) throw new Error('Duplicate final review. Contact the administrator.');
    ledger.set(id, r);
    if (!seen.has(id)) {
      proposals.push({ 'Proposal ID': id, 'Lab/Proposal Name': r['Proposal Name'], Domain: r.Domain,
        Status: 'Reviewed', 'Reviewer Email': r['Reviewer Email'], Reviewer: r.Reviewer,
        'Review Date': r['Submission Date/Time'], 'Institute Name':text_(r['Institute Name']) });
      seen.add(id);
    }
  });
  return proposals.filter(p=>user.role!=='PIC'||sameInstitute_(p['Institute Name'],user)).map(p => {
    const id = text_(p['Proposal ID']), review = ledger.get(id);
    const finished = !!review || normalized_(p.Status) === 'reviewed';
    const names = assignedNames_(p);
    const claim = finished ? null : claim_(drafts, id);
    const mine = claim && normalized_(claim['Reviewer Email']) === user.email && assigned_(p, user) ? claim : null;
    const claimedByOther = !!claim && normalized_(claim['Reviewer Email']) !== user.email;
    const author = normalized_(review ? review['Reviewer Email'] : p['Reviewer Email']);
    const date = historyDate_(review ? review['Submission Date/Time'] : p['Review Date']);
    return { proposal: p, review: review || null, mine: mine || null, claimEmail: claim ? normalized_(claim['Reviewer Email']) : '', claimedByOther: claimedByOther,
      assigned: assigned_(p, user), ownReview: finished && author === user.email,
      summary: { id: id, name: text_(p['Lab/Proposal Name']) || id, domain: text_(p.Domain), downloadable: !!review && (user.role!=='LDC' || author===user.email),
        assignedReviewers: names, state: finished ? 'reviewed' : claim ? 'draft' : 'pending',
        reviewer: finished ? text_(review ? review.Reviewer : p.Reviewer) || 'Not recorded' : '',
        submittedAt: finished ? date.label : '', order: finished ? date.order : 0,
        updatedAt: mine ? historyDate_(mine['Updated At']).label : '' } };
  });
}

function board_(entries) {
  const result = { total: entries.length, reviewed: [], draft: [], pending: [] };
  entries.forEach(e => {
    // Domain and admin draft lists expose assignment metadata only.
    const item = Object.assign({}, e.summary);
    delete item.updatedAt;
    result[item.state].push(item);
  });
  result.reviewed.sort((a,b) => b.order - a.order || a.name.localeCompare(b.name));
  result.draft.sort((a,b) => a.name.localeCompare(b.name));
  result.pending.sort((a,b) => a.name.localeCompare(b.name));
  return result;
}

function sameInstitute_(institute,user) {
  return !!normalized_(user.institute) && normalized_(institute)===normalized_(user.institute);
}

function sameDomain_(domain, user) {
  return !!normalized_(user.domain) && normalized_(domain) === normalized_(user.domain);
}

function getInitialData(token) {
  const db = readDb_(), user = user_(db, token);
  if(user.role==='Assistant Reviewer')return assistantInitialData_(db,user);
  const entries = snapshot_(db, user);
  const personal = entries.filter(e => e.assigned || e.ownReview);
  const reviewed = personal.filter(e => e.ownReview).map(e => e.summary)
    .sort((a,b) => b.order - a.order || a.name.localeCompare(b.name));
  const drafts = personal.filter(e => e.mine).map(e => e.summary);
  const pending = personal.filter(e => e.assigned && e.summary.state !== 'reviewed' && !e.mine && !e.claimedByOther).map(e => e.summary);
  const closed = personal.filter(e => e.assigned && e.summary.state === 'reviewed' && !e.ownReview).length;
  const domain = board_(entries.filter(e => sameDomain_(e.summary.domain, user)));
  domain.name = user.domain;
  const rankEntries = rankingEntries_(db,user).filter(p => sameDomain_(p.domain,user));
  const summaryById = new Map(domain.reviewed.map(p => [p.id,p]));
  domain.ranked = domainRankings_(rankRows_(db),rankEntries)
    .filter(v => summaryById.has(v.id)).sort((a,b)=>a.reviewer.localeCompare(b.reviewer)||a.reviewerEmail.localeCompare(b.reviewerEmail)||a.rank-b.rank)
    .map(v => Object.assign({},summaryById.get(v.id),{rank:v.rank,justification:v.justification,rankedBy:v.reviewer}));
  const domainRanks=new Map(domain.ranked.map(p=>[p.id,p.rank]));
  domain.reviewed.forEach(p=>{p.rank=domainRanks.has(p.id)?domainRanks.get(p.id):null;p.justification=(rankEntries.find(e=>e.id===p.id)||{}).justification || '';});
  return { user: { name: user.name,
      domain: user.domain || 'Domain not configured', institute: user.institute || 'Institute not configured', role: user.role, roles:user.roles, primaryRole:user.primaryRole },
    personal: {total: personal.length, reviewed: reviewed, draft: drafts, pending: pending, completedByOthers: closed, claimedByOthers: personal.filter(e => e.assigned && e.claimedByOther).length},
    assistantReviews: user.role==='LDC' ? ldcAssistantRows_(db,user) : [],
    domain: domain,
    // Compatibility names also used by local regression tests.
    proposals: personal.filter(e => e.assigned && e.summary.state !== 'reviewed' && !e.claimedByOther).map(e => e.summary),
    reviewedProposals: reviewed, draftProposals: drafts,
    domains: Array.from(new Set(pending.map(p => p.domain))).sort() };
}

/** LDC users read only their own final reviews; monitor roles retain their scoped access. */
function getReview(token, proposalId) {
  const db = db_(), user = user_(db, token), id = text_(proposalId);
  const entry = snapshot_(db, user).find(e => e.summary.id === id);
  if (!entry || entry.summary.state !== 'reviewed' ||
      !(user.role==='Assistant Reviewer' ? assistantAssigned_(entry.proposal,user) : ['Admin','PIC'].includes(user.role) || entry.ownReview)) {
    throw new Error('This submitted review is not available to your account.');
  }
  const proposalTable = table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals);
  const candidateLink = entry.proposal._row ? labLinkFromCell_(proposalTable, entry.proposal, 'Proposal Link') : '';
  const result = Object.assign({}, entry.summary, {numberOfExperiments:text_(entry.proposal['No. of Experiments']),reviewId: '', ratings: [], overallFeedback: '', additionalComments: '', legacy: !entry.review,
    link: /^https:\/\//i.test(candidateLink) ? candidateLink : ''});
  if (entry.review) {
    result.rank=text_(entry.review.Rank)?Number(entry.review.Rank):null;
    result.justification=text_(entry.review['Rank Justification']);
    result.reviewId = text_(entry.review['Review ID']);
    result.formVersion=text_(entry.review['Form Version'])==='2'?'2':'1';
    result.ratingMaximum=result.formVersion==='2'?6:5;
    const labels=result.formVersion==='2'?REVIEW_QUESTIONS.map(q=>[q[1],q[1]+' (1–6)']):LEGACY_REVIEW_HEADERS.slice(0,5).map(h=>[h,h]);
    result.ratings=labels.map(pair=>({label:pair[0],value: Number.isInteger(Number(entry.review[pair[1]])) && Number(entry.review[pair[1]])>=1 && Number(entry.review[pair[1]])<=result.ratingMaximum ? Number(entry.review[pair[1]]) : null}));
    result.overallFeedback=text_(entry.review['Overall Feedback']);
    result.additionalComments=text_(entry.review['Additional Comments / Suggestions']);
    result.reviewerComments=text_(entry.review['Reviewer Comments / Suggestions']);
  }
  return result;
}

/** One PDF per request; uses exactly the same current permissions as View Review. */
function downloadReview(token, proposalId) {
  if(user_(db_(),token).role==='Assistant Reviewer')throw new Error('Assistant access is view-only for final reviews.');
  const review = getReview(token, proposalId);
  if (review.legacy) throw new Error('This proposal has no detailed submitted review to download. Contact the administrator.');
  const db = db_(), user = user_(db, token);
  if (user.role === 'LDC') {
    // Resolve the final author's saved rank using the dashboard's ranking rules.
    const entries = rankingEntries_(db, user);
    const entry = entries.find(p => p.id === review.id);
    let rank = null;
    if (entry && entry.reviewAuthorEmail) {
      const owned = entries.filter(p => p.reviewAuthorEmail === entry.reviewAuthorEmail &&
        normalized_(p.domain) === normalized_(entry.domain));
      const owner = {email: entry.reviewAuthorEmail, name: entry.reviewAuthorName, domain: entry.domain};
      const record = ownRanking_(rankRows_(db), owner, owned);
      const saved = effectiveRankings_(record, owned).find(p => p.id === review.id);
      if (saved) rank = saved.rank;
    }
    review.rank = rank;
  }
  const fileName = reviewFileName_(review);
  return { fileName, review };
}

function reviewFileName_(review) {
  const part = function (value, fallback, limit) {
    const cleaned = text_(value).replace(/[<>:"\/\\|?*\u0000-\u001f\u007f]/g, '_')
      .replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '');
    let result = '', bytes = 0;
    for (const character of cleaned) {
      const point = character.codePointAt(0), size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      if (bytes + size > limit) break;
      result += character; bytes += size;
    }
    return result.replace(/[. ]+$/g, '') || fallback;
  };
  const date = review.order > 0 ? Utilities.formatDate(new Date(review.order), CONFIG.TIME_ZONE, 'yyyy-MM-dd') : 'Date Not Recorded';
  return [part(review.name, 'Proposal', 90), part(review.id, 'No ID', 45),
    part(review.reviewer, 'Reviewer Not Recorded', 60), date].join('_') + '.pdf';
}

function reviewHtmlText_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
  });
}

/** Standalone printable HTML; no scripts, external resources or client identity fields. */
function reviewDocumentHtml_(review) {
  const esc = reviewHtmlText_;
  const metadata = [['Proposal ID', review.id], ['Domain', review.domain], ['No. of Experiments', review.numberOfExperiments],
    ['Reviewed Date', review.submittedAt], ['Review ID', review.reviewId],
    ['Reviewer', (review.assignedReviewers || []).join(', ') || 'Not recorded']];
  if (Object.prototype.hasOwnProperty.call(review, 'rank')) {
    metadata.push(['Rank', review.rank == null ? '-' : review.rank]);
    metadata.push(['Rank Justification',review.justification || 'None']);
  }
  const rows = review.ratings.map(function (rating, index) {
    return '<tr><td>' + (index + 1) + '</td><td>' + esc(rating.label) + '</td><td>' +
      esc(rating.value == null ? 'Not recorded' : rating.value + '/' + review.ratingMaximum) + '</td></tr>';
  }).join('');
  const link = review.link ? '<a href="' + esc(review.link) + '">' + esc(review.link) + '</a>' : 'Not available';
  const legacyFeedback = review.formVersion === '2' ? '' : '<h2>Overall Feedback</h2><p class="text">' + esc(review.overallFeedback || 'Not recorded') + '</p>';
  const comments = review.formVersion === '2' ? review.reviewerComments : review.additionalComments;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Proposal Review</title><style>' +
    '@page{size:A4;margin:16mm}body{font:11pt/1.4 Arial,sans-serif;color:#253b43}' +
    'h1{font-size:20pt;margin:0 0 5mm}h2{font-size:13pt;margin:6mm 0 3mm}' +
    '.brand{font-size:10pt;color:#526e75;margin:0 0 2mm}.meta{margin:2mm 0;word-wrap:break-word;white-space:pre-wrap}' +
    'table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #dfe8e4;padding:7pt;text-align:center;vertical-align:middle;word-wrap:break-word}' +
    'th{background:#edf4f1}thead{display:table-header-group}tr{page-break-inside:avoid}' +
    '.text{white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}a{color:#315f68;word-wrap:break-word}' +
    '.footer{font-size:9pt;border-top:1px solid #dfe8e4;padding-top:3mm;margin-top:6mm}</style></head><body>' +
    '<p class="brand">Virtual Labs - Proposal Review Portal</p><h1>Proposal Review Form</h1><h2>' + esc(review.name) + '</h2>' +
    metadata.map(function (item) {return '<p class="meta"><strong>' + esc(item[0]) + ':</strong> ' + esc(item[1] || 'Not recorded') + '</p>';}).join('') +
    '<p class="meta"><strong>Proposal Link:</strong> ' + link + '</p><h2>Submitted Ratings</h2>' +
    '<table><colgroup><col style="width:10%"><col style="width:65%"><col style="width:25%"></colgroup><thead><tr><th>S.No.</th><th>Evaluation Parameter</th><th>Rating</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    legacyFeedback + '<h2>' + (review.formVersion === '2' ? 'Reviewer Comments / Suggestions' : 'Additional Comments / Suggestions') + '</h2><p class="text">' + esc(comments || 'None') + '</p>' +
    '<p class="footer">Final submission - read only. Ratings use the original ' + esc(review.ratingMaximum) + '-point scale.</p></body></html>';
}

/** This RPC rechecks Role and Status; hiding an admin button is not authorization. */
/** Read-only user directory; authenticated Admin access only. */
/** Admin-only proposal directory. No review answers are returned. */
function getAdminProposals(token, filters) {
  const db = readDb_(), user=user_(db,token);
  if(user.role!=='Admin')throw new Error('ADMIN_REQUIRED: Administrator access is required.');
  filters=filters && typeof filters==='object'?filters:{};
  const status=normalized_(filters.status);
  if(status && !['reviewed','pending'].includes(status))throw new Error('Invalid proposal status filter.');
  const proposals=table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals);
  const states=new Map(snapshot_(db,user).map(e=>[e.summary.id,e.summary.state]));
  const rows=proposals.rows.map(p=>({id:text_(p['Proposal ID']),name:text_(p['Lab/Proposal Name']),institute:text_(p['Institute Name']),domain:text_(p.Domain),status:states.get(text_(p['Proposal ID']))==='reviewed'?'reviewed':'pending',link:optionalLabLink_(labLinkFromCell_(proposals,p,'Proposal Link'))}));
  const options=values=>Array.from(new Map(values.filter(Boolean).map(v=>[normalized_(v),v])),pair=>({value:pair[0],label:pair[1]})).sort((a,b)=>a.label.localeCompare(b.label));
  return {filterOptions:{domains:options(rows.map(r=>r.domain)),institutes:options(rows.map(r=>r.institute))},rows:rows.filter(r=>(!status || r.status===status) && (!filters.institute || normalized_(r.institute)===normalized_(filters.institute)) && (!filters.domain || normalized_(r.domain)===normalized_(filters.domain)))};
}

function getAdminUsers(token, filters) {
  const db = readDb_(), user=user_(db,token);
  if(user.role!=='Admin')throw new Error('ADMIN_REQUIRED: Administrator access is required.');
  filters=filters && typeof filters==='object'?filters:{};
  const status=normalized_(filters.status);
  if(status && !['active','inactive'].includes(status))throw new Error('Invalid user status filter.');
  const rows=table_(db,CONFIG.REVIEWERS_SHEET,HEADERS.Reviewers).rows.map(r=>{
    const role=role_(r.Role), secondary=role_(r['Secondary Role']);
    const roles=[role || 'Not configured'];
    if((role==='PIC' && secondary==='LDC') || (role==='LDC' && secondary==='PIC'))roles.push(secondary);
    return {name:text_(r.Name),email:text_(r.Email),institute:text_(r['Institute Name']),status:['active','true'].includes(normalized_(r.Status))?'Active':'Inactive',roles:roles,domain:role==='Admin'?'Not applicable':(roles.includes('LDC') || role==='Assistant Reviewer')?text_(r.Domain):''};
  });
  const options=values=>Array.from(new Map(values.filter(Boolean).map(v=>[normalized_(v),v])),pair=>({value:pair[0],label:pair[1]})).sort((a,b)=>a.label.localeCompare(b.label));
  return {filterOptions:{domains:options(rows.map(r=>r.domain)),institutes:options(rows.map(r=>r.institute)),roles:options(rows.flatMap(r=>r.roles))},rows:rows.filter(r=>(!filters.domain || normalized_(r.domain)===normalized_(filters.domain)) && (!filters.institute || normalized_(r.institute)===normalized_(filters.institute)) && (!filters.role || r.roles.some(role=>normalized_(role)===normalized_(filters.role))) && (!status || normalized_(r.status)===status)).sort((a,b)=>a.name.localeCompare(b.name))};
}

function getAdminData(token, filters) {
  const db = readDb_(), user = user_(db, token);
  if (!['Admin','PIC'].includes(user.role)) throw new Error('ADMIN_REQUIRED: Administrator or PIC access is required.');
  const source = snapshot_(db, user).map(entry=>['Admin','PIC'].includes(user.role) && entry.summary.state==='draft'?Object.assign({},entry,{summary:Object.assign({},entry.summary,{state:'pending'})}):entry);
  source.forEach(function (entry) {
    entry.summary.institute = text_(user.role==='PIC'?entry.proposal['Institute Name']:(entry.review ? entry.review['Institute Name'] : entry.proposal['Institute Name']));
  });
  const uniqueOptions = function (values) {
    const labels = new Map();
    values.forEach(function (value) { const key = normalized_(value); if (key && !labels.has(key)) labels.set(key, text_(value)); });
    return Array.from(labels, function (pair) { return { value: pair[0], label: pair[1] }; })
      .sort(function (a,b) { return a.label.localeCompare(b.label); });
  };
  const reviewerNames = function (entry) {
    const names = entry.summary.assignedReviewers.slice();
    const author = text_(entry.review ? entry.review.Reviewer : entry.proposal.Reviewer);
    if (entry.summary.state === 'reviewed' && author) names.push(author);
    return names;
  };
  const options = {
    domains: uniqueOptions(source.map(e => e.summary.domain)),
    institutes: uniqueOptions(source.map(e => e.summary.institute)),
    reviewers: uniqueOptions(source.flatMap(reviewerNames))
  };
  filters = filters && typeof filters === 'object' ? filters : {};
  const domain = normalized_(filters.domain), institute = normalized_(filters.institute),
    status = normalized_(filters.status), reviewer = normalized_(filters.reviewer);
  if (status && !['reviewed','draft','pending'].includes(status)) throw new Error('Invalid proposal status filter.');
  const entries = source.filter(function (e) {
    return (!domain || normalized_(e.summary.domain) === domain) &&
      (!institute || normalized_(e.summary.institute) === institute) &&
      (!status || e.summary.state === status) &&
      (!reviewer || reviewerNames(e).some(name => normalized_(name) === reviewer));
  });
  const all = board_(entries);
  const canonicalDomains = new Map();
  entries.forEach(e => { if (!canonicalDomains.has(normalized_(e.summary.domain))) canonicalDomains.set(normalized_(e.summary.domain), e.summary.domain); });
  const domainNames = Array.from(canonicalDomains.values()).sort();
  const domains = domainNames.map(name => Object.assign({name: name || 'Domain not configured'},
    board_(entries.filter(e => normalized_(e.summary.domain) === normalized_(name)))));
  const roster = table_(db, CONFIG.REVIEWERS_SHEET, HEADERS.Reviewers).rows;
  const reviewers = roster.filter(r=>(user.role!=='Admin'||!['Admin','Assistant Reviewer'].includes(role_(r.Role))) && (user.role!=='PIC'||sameInstitute_(r['Institute Name'],user))).map(r => {
    const who = {email: normalized_(r.Email), name: text_(r.Name), assignmentNameUnique: roster.filter(other => normalized_(other.Name) === normalized_(r.Name)).length === 1};
    const assigned = entries.filter(e => assigned_(e.proposal, who));
    const reviewed = entries.filter(e => e.summary.state === 'reviewed' &&
      normalized_((e.review || e.proposal)['Reviewer Email']) === who.email).length;
    return {name: who.name, role: role_(r.Role) || 'Not configured', domain: text_(r.Domain), status: text_(r.Status),
      assigned: assigned.length, reviewed: reviewed,
      open: assigned.filter(e => e.summary.state !== 'reviewed' && (!e.claimEmail || e.claimEmail === who.email)).length};
  });
  let visibleReviewers = reviewers.filter(r => !reviewer || normalized_(r.name) === reviewer);
  if (user.role === 'Admin') {
    if (domain || institute || status || reviewer) {
      visibleReviewers = visibleReviewers.filter(r => r.assigned > 0 || r.reviewed > 0);
    }
    visibleReviewers.sort((a,b) => a.name.localeCompare(b.name, 'en', {sensitivity:'base'}));
    domains.sort((a,b) => a.name.localeCompare(b.name, 'en', {sensitivity:'base'}));
  }
  return {all: all, domains: domains, reviewers: visibleReviewers, filterOptions: options};
}

function historyDate_(value) {
  // Sheets dates are Date objects. Only parse ISO text; ambiguous locale strings
  // are displayed unchanged instead of being silently interpreted as US dates.
  let date = value instanceof Date ? value : null;
  if (!date && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text_(value))) date = new Date(value);
  if (date && !isNaN(date.getTime())) {
    return { order: date.getTime(), label: Utilities.formatDate(date,
      CONFIG.TIME_ZONE, 'dd MMM yyyy, hh:mm a') + ' IST' };
  }
  return { order: 0, label: text_(value) || 'Date not recorded' };
}

function optionalLabLink_(value) {
  const link = text_(value).replace(/ /g, '%20');
  return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(link) ? link : '';
}

/** Read plain URLs, linked text, and literal HYPERLINK formulas. */
function labLinkFromCell_(table, proposal, heading) {
  const direct = optionalLabLink_(proposal[heading]);
  if (direct) return direct;
  const column = table.headers.indexOf(heading);
  if (column < 0) return '';
  const cell = table.sheet.getRange(proposal._row, column + 1);
  const rich = cell.getRichTextValue();
  if (rich) {
    const whole = optionalLabLink_(rich.getLinkUrl());
    if (whole) return whole;
    const links = Array.from(new Set(rich.getRuns().map(run => optionalLabLink_(run.getLinkUrl())).filter(Boolean)));
    if (links.length === 1) return links[0];
  }
  const formula = cell.getFormula();
  const match = /^=\s*HYPERLINK\s*\(\s*"((?:[^"]|"")*)"\s*[,;]/i.exec(formula || '');
  return match ? optionalLabLink_(match[1].replace(/""/g, '"')) : '';
}

function getProposal(token, proposalId) {
  const db = db_();
  const user = user_(db, token);
  const proposalTable = table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals);
  const p = findProposal_(proposalTable, text_(proposalId));
  if(user.role==='Assistant Reviewer')return assistantProposal_(db,user,proposalTable,p);
  if (!assigned_(p, user)) throw new Error('This proposal is not assigned to you.');
  if (reviewed_(p, table_(db, CONFIG.REVIEWS_SHEET, HEADERS.Reviews).rows)) {
    throw new Error('This proposal has already been reviewed.');
  }
  checkClaim_(table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts).rows, text_(p['Proposal ID']), user);
  const link = text_(p['Proposal Link']);
  if (link && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(link)) {
    throw new Error('Invalid HTTPS proposal link. Contact the administrator.');
  }
  return { id: text_(p['Proposal ID']), domain: text_(p.Domain) || 'Unspecified',
    name: text_(p['Lab/Proposal Name']), numberOfExperiments:text_(p['No. of Experiments']), link: link,
    existingLabLink1: labLinkFromCell_(proposalTable, p, 'Existing Lab Link 1'),
    existingLabLink2: labLinkFromCell_(proposalTable, p, 'Existing Lab Link 2'), ldc: text_(p['Assigned LDC']),assistantName:text_(p['Assistant Reviewer']),
    draft: draftPayload_(ownDraft_(table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts), text_(p['Proposal ID']), user.email)) };
}

const ANSWER_FIELDS = REVIEW_QUESTIONS.map(q=>q[0]).concat(['reviewerComments']);

function ownDraft_(table, id, email) {
  const matches = table.rows.filter(function (d) {
    return text_(d['Proposal ID']) === id && normalized_(d['Reviewer Email']) === email && normalized_(d.Status) === 'draft';
  });
  if (matches.length > 1) throw new Error('Duplicate draft rows. Contact the administrator.');
  return matches[0] || null;
}

function draftPayload_(draft) {
  if (!draft) return null;
  const stored=JSON.parse(draft['Answers JSON']);
  return {answers:stored.formVersion==='2'?stored:draftAnswers_({}),
    legacyAnswers:stored.formVersion==='2'?(stored.legacyAnswers||null):stored,
    version:text_(draft.Revision),updatedAt:historyDate_(draft['Updated At']).label};
}
function preserveLegacyDraft_(answers, draft) {
  if (!draft) return answers;
  const old=JSON.parse(draft['Answers JSON']);
  const legacy=old.formVersion==='2'?old.legacyAnswers:old;
  if(legacy) answers.legacyAnswers=legacy;
  if(old.assistantOrigin)answers.assistantOrigin=old.assistantOrigin;
  return answers;
}
function draftAnswers_(data) {
  const answers = {formVersion:'2'};
  ANSWER_FIELDS.forEach(function (key, i) {
    const value = data[key] == null ? '' : data[key];
    if (i < 8) answers[key] = value === '' ? '' : String(rating_(value));
    else {
      if (typeof value !== 'string' || value.length > 10000) throw new Error('Each comment field must be at most 10,000 characters.');
      answers[key] = value;
    }
  });
  return answers;
}

function checkDraftVersion_(draft, data) {
  if (text_(data.draftVersion) !== (draft ? text_(draft.Revision) : '')) {
    throw new Error('This draft changed in another tab. Reopen the proposal to load its latest saved answers before continuing.');
  }
}

function writeDraft_(table, row, updates) {
  const record = Object.assign({}, row || {}, updates);
  const values = table.headers.map(function (h) { return sheetValue_(record[h] == null ? '' : record[h]); });
  if (row) table.sheet.getRange(row._row, 1, 1, values.length).setValues([values]);
  else table.sheet.appendRow(values);
  SpreadsheetApp.flush();
}

/** Public: partial answers are permitted, but identity and assignment are always checked. */
function saveDraft(token, data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const db = db_(), user = user_(db, token);
    if(user.role==='Assistant Reviewer')return saveAssistantInLock_(db,user,data,false);
    if(!['LDC','Admin'].includes(user.role))throw new Error('Only an assigned LDC can submit or save a final review.');
    if (!data || typeof data !== 'object') throw new Error('Invalid draft.');
    const id = text_(data.proposalId);
    const proposal = findProposal_(table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals), id);
    if (!assigned_(proposal, user)) throw new Error('This proposal is not assigned to you.');
    if (reviewed_(proposal, table_(db, CONFIG.REVIEWS_SHEET, HEADERS.Reviews).rows)) throw new Error('This proposal has already been reviewed.');
    const drafts = table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts), draft = ownDraft_(drafts, id, user.email);
    checkClaim_(drafts.rows, id, user);
    checkDraftVersion_(draft, data);
    const answers = preserveLegacyDraft_(draftAnswers_(data),draft), now = new Date(), version = Utilities.getUuid();
    writeDraft_(drafts, draft, { 'Draft ID': draft ? draft['Draft ID'] : Utilities.getUuid(),
      'Proposal ID': id, 'Reviewer Email': user.email, 'Answers JSON': JSON.stringify(answers),
      'Updated At': now, Revision: version, Status: 'Draft', 'Review ID': '',
      'Institute Name': text_(proposal['Institute Name']),
      'Proposal Name': text_(proposal['Lab/Proposal Name']), Domain: text_(proposal.Domain), Role: user.role });
    return { success: true, version: version, updatedAt: historyDate_(now).label };
  } finally { lock.releaseLock(); }
}

/** Final ledger is authoritative even if archiving a draft needs an administrator retry. */
function closeDrafts_(db, review) {
  try {
    const drafts = table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts);
    const answers = {};
    if(text_(review['Form Version'])==='2') {
      answers.formVersion='2';
      REVIEW_QUESTIONS.forEach(q=>answers[q[0]]=String(review[q[1]+' (1–6)']||''));
      answers.reviewerComments=text_(review['Reviewer Comments / Suggestions']);
    } else {
      ['clarity','pedagogicalNeed','quality','jobRelevance','userExperience','overallFeedback','additionalComments'].forEach((key,i)=>answers[key]=String(review[LEGACY_REVIEW_HEADERS[i]]||''));
    }
    drafts.rows.filter(function (d) { return text_(d['Proposal ID']) === text_(review['Proposal ID']) && normalized_(d.Status) === 'draft'; })
      .forEach(function (d) {
        const own = normalized_(d['Reviewer Email']) === normalized_(review['Reviewer Email']);
        const changes = { Status: own ? 'Submitted' : 'Closed', 'Review ID': review['Review ID'],
          Revision: Utilities.getUuid(), 'Updated At': review['Submission Date/Time'] };
        if (own) {
          changes['Answers JSON'] = JSON.stringify(preserveLegacyDraft_(Object.assign({},answers),d));
          ['Institute Name', 'Proposal Name', 'Domain', 'Role'].forEach(function (h) {
            changes[h] = text_(review[h]);
          });
        }
        writeDraft_(drafts, d, changes);
      });
    return true;
  } catch (error) { console.error('Review saved; draft archive needs attention.'); return false; }
}

function rating_(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Rate all eight criteria from 1 to 6.');
  if (!/^[1-6]$/.test(String(value))) throw new Error('Rate all eight criteria from 1 to 6.');
  return Number(value);
}

function sheetValue_(value) {
  // Prevent spreadsheet formula execution in comments/names and pasted values.
  return typeof value === 'string' && /^\s*[=+@-]/.test(value) ? "'" + value : value;
}

/** One review total per proposal. Review ledger is authoritative if status update fails. */
function submitReview(token, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let user, proposal, ratings, comments, reviewId, submittedAt;
  let statusUpdated = true;
  let draftUpdated = true;
  try {
    const db = db_();
    user = user_(db, token);
    if(!['LDC','Admin'].includes(user.role))throw new Error('Only an assigned LDC can submit a final review.');
    if (!data || typeof data !== 'object') throw new Error('Invalid review submission.');
    const id = text_(data.proposalId);
    const proposals = table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals);
    const reviews = table_(db, CONFIG.REVIEWS_SHEET, HEADERS.Reviews);
    proposal = findProposal_(proposals, id);
    if (!assigned_(proposal, user)) throw new Error('This proposal is not assigned to you.');
    const existing = reviews.rows.find(function (r) { return text_(r['Proposal ID']) === id; });
    // Retry after lost network response: acknowledge the same author's saved review.
    if (existing && normalized_(existing['Reviewer Email']) === user.email) {
      return { success: true, reviewId: text_(existing['Review ID']), alreadySaved: true,
        draftUpdated: closeDrafts_(db, existing),
        message: 'Your review was already saved. No duplicate review or email was created.' };
    }
    if (reviewed_(proposal, reviews.rows)) throw new Error('This proposal has already been reviewed.');
    const drafts = table_(db, CONFIG.DRAFTS_SHEET, HEADERS.Drafts);
    checkClaim_(drafts.rows, id, user);
    const draft = ownDraft_(drafts, id, user.email);
    checkDraftVersion_(draft, data);
    ratings = REVIEW_QUESTIONS.map(q=>rating_(data[q[0]]));
    if (data.reviewerComments != null && typeof data.reviewerComments !== 'string') throw new Error('Comments must be text.');
    comments = text_(data.reviewerComments);
    if (comments.length > 10000) throw new Error('Comments must be at most 10,000 characters.');
    reviewId = draft ? text_(draft['Draft ID']) : Utilities.getUuid();
    submittedAt = new Date();
    const byHeader = {'Review ID':reviewId,'Proposal ID':id,'Proposal Name':text_(proposal['Lab/Proposal Name']),
      Domain:text_(proposal.Domain),Reviewer:user.name,'Reviewer Email':user.email,LDC:text_(proposal['Assigned LDC']),
      'Submission Date/Time':submittedAt,Role:user.role,'Institute Name':text_(proposal['Institute Name']),
      'Reviewer Comments / Suggestions':comments,'Form Version':'2','Rating Maximum':6};
    REVIEW_QUESTIONS.forEach((q,i)=>byHeader[q[1]+' (1–6)']=ratings[i]);
    reviews.sheet.appendRow(reviews.headers.map(function (h) {
      return sheetValue_(Object.prototype.hasOwnProperty.call(byHeader, h) ? byHeader[h] : '');
    }));
    SpreadsheetApp.flush();
    draftUpdated = closeDrafts_(db, byHeader);
    try {
      const updates = { Status: 'Reviewed', Reviewer: user.name,
        'Reviewer Email': user.email, 'Review Date': submittedAt };
      Object.keys(updates).forEach(function (h) {
        proposals.sheet.getRange(proposal._row, proposals.headers.indexOf(h) + 1)
          .setValue(sheetValue_(updates[h]));
      });
      SpreadsheetApp.flush();
    } catch (error) {
      statusUpdated = false;
      console.error('Review saved; proposal status update needs attention. Review ID: ' + reviewId);
    }
  } finally {
    lock.releaseLock();
  }
  // Email failure must not turn a saved review into a failed submission.
  let emailSent = false;
  try {
    const message = {
      to: user.email, name: 'Virtual Labs Proposal Review',
      subject: 'Virtual Labs — Review submitted: ' + text_(proposal['Proposal ID']),
      body: ['Dear ' + user.name + ',', '', 'Your review has been saved successfully.',
        'Review ID: ' + reviewId, 'Proposal ID: ' + text_(proposal['Proposal ID']),
        'Proposal: ' + text_(proposal['Lab/Proposal Name']),
        'Domain: ' + text_(proposal.Domain), 'Reviewer: ' + user.name,
        'Institute: ' + (user.institute || 'Not configured'),
        'Submitted: ' + Utilities.formatDate(submittedAt, CONFIG.TIME_ZONE, 'dd MMM yyyy, hh:mm a') + ' IST', '',
        ...REVIEW_QUESTIONS.map((q,i)=>q[1]+': '+ratings[i]+'/6'), '',
        'Reviewer Comments / Suggestions:', comments || 'None', '',
        'Thank you,', 'Virtual Labs', 'support@vlabs.ac.in'].join('\n')
    };
    MailApp.sendEmail(message);
    emailSent = true;
  } catch (error) {
    console.error('Review saved; confirmation email failed. Review ID: ' + reviewId);
  }
  return { success: true, reviewId: reviewId, emailSent: emailSent, statusUpdated: statusUpdated, draftUpdated: draftUpdated };
}


/** Each reviewer has an independent ranking list within their configured domain. */
function rankingEntries_(db, user) {
  const current = new Set(table_(db, CONFIG.PROPOSALS_SHEET, HEADERS.Proposals).rows.map(p => text_(p['Proposal ID'])).filter(Boolean));
  return snapshot_(db, user).filter(e => current.has(e.summary.id) && e.summary.state === 'reviewed').map(e => ({
    id: e.summary.id, name: e.summary.name, domain: e.summary.domain,
    overallRating: e.review && text_(e.review['Form Version'])==='2' && /^[1-6]$/.test(String(e.review['Overall Rating (1–6)'])) ? Number(e.review['Overall Rating (1–6)']) : null,
    institute: text_(e.proposal['Institute Name']), status: e.summary.state, downloadable: !!e.review,
    justification:text_(e.review && e.review['Rank Justification']),
    reviewAuthorEmail: normalized_((e.review || e.proposal)['Reviewer Email']),
    reviewAuthorName: text_((e.review || e.proposal).Reviewer),
    assignedReviewers: e.summary.assignedReviewers,
    link: optionalLabLink_(e.proposal['Proposal Link'])
  }));
}
function rankRows_(db) { return table_(db, CONFIG.REVIEWS_SHEET, HEADERS.Reviews); }
function ownRanking_(table, user, entries) {
  const owned = table.rows.filter(r => normalized_(r['Reviewer Email']) === normalized_(user.email) && normalized_(r.Domain) === normalized_(user.domain));
  const ids = new Set();
  owned.forEach(r => {
    const id = text_(r['Proposal ID']);
    if (!id || ids.has(id)) throw new Error('Invalid or duplicate completed review. Contact the administrator.');
    ids.add(id);
  });
  const values = owned.filter(r => text_(r.Rank) !== '').map(r => {
    const rank = Number(r.Rank);
    if (!Number.isInteger(rank) || rank < 1) throw new Error('Invalid Rank in Completed Reviews. Contact the administrator.');
    return {id:text_(r['Proposal ID']),rank:rank,justification:text_(r['Rank Justification']),reviewer:text_(r.Reviewer),reviewerEmail:normalized_(r['Reviewer Email']),updatedAt:r['Rank Updated At'] || ''};
  });
  return {'Updated At':owned.map(r=>text_(r['Rank Updated At'])).filter(Boolean).sort().pop() || '', 'Rankings JSON':JSON.stringify(values),Revision:hash_(JSON.stringify(owned.map(r=>[text_(r['Proposal ID']),text_(r.Rank),text_(r['Rank Justification']),text_(r['Rank Order Mode'])]).sort((a,b)=>a[0].localeCompare(b[0]))))};
}
function rankingKey_(user) {
  return 'reviewer:' + encodeURIComponent(normalized_(user.email)) + ':' + encodeURIComponent(normalized_(user.domain));
}
function domainRankings_(table, entries) {
  const owners = new Map();
  entries.forEach(p => {
    if (!p.reviewAuthorEmail) return;
    const owner = {email:p.reviewAuthorEmail,name:p.reviewAuthorName,domain:p.domain};
    owners.set(rankingKey_(owner),owner);
  });
  const saved = [];
  owners.forEach(owner => {
    const owned = entries.filter(p => p.reviewAuthorEmail === owner.email && normalized_(p.domain) === normalized_(owner.domain));
    const record = ownRanking_(table,owner,owned);
    effectiveRankings_(record,owned).forEach(v => saved.push(Object.assign({},v,{reviewerEmail:owner.email,reviewer:owner.name || v.reviewer})));
  });
  return saved;
}
function effectiveRankings_(row, entries) {
  const ids = new Set(entries.map(p=>p.id)), seen = new Set(), ranks = new Set();
  return rankingValues_(row).filter(v => {
    if (!ids.has(v.id) || v.rank > entries.length || seen.has(v.id) || ranks.has(v.rank)) return false;
    seen.add(v.id); ranks.add(v.rank); return true;
  }).map(v => Object.assign({},v,{
    reviewer: text_(v.reviewer || (row && row.Reviewer)),
    reviewerEmail: normalized_(v.reviewerEmail || (row && row['Reviewer Email'])),
    updatedAt: v.updatedAt || (row && row['Updated At']) || ''
  }));
}
function rankingValues_(row) {
  if (!row) return [];
  let values;
  try { values = JSON.parse(row['Rankings JSON']); } catch (_) { throw new Error('Invalid saved ranking data. Contact the administrator.'); }
  if (!Array.isArray(values) || values.some(v => !v || typeof v.id !== 'string' || !Number.isInteger(v.rank) || v.rank < 1)) {
    throw new Error('Invalid saved ranking data. Contact the administrator.');
  }
  return values;
}
function rankingSetVersion_(entries) { return hash_(JSON.stringify(entries.map(p => [p.id,p.reviewAuthorEmail]).sort((a,b)=>a[0].localeCompare(b[0])))); }
/** First seven current-form answers only; legacy/incomplete reviews have no 42-point score. */
function ldcOverallScore_(review) {
  if(!review || text_(review['Form Version'])!=='2')return null;
  const scores=REVIEW_QUESTIONS.slice(0,7).map(q=>Number(review[q[1]+' (1–6)']));
  return scores.every(value=>Number.isInteger(value) && value>=1 && value<=6)?scores.reduce((sum,value)=>sum+value,0):null;
}
function ldcAutomaticRanks_(proposals) {
  return proposals.filter(p=>Number.isInteger(p.overallScore)).slice().sort((a,b)=>b.overallScore-a.overallScore || (a.id<b.id?-1:a.id>b.id?1:0)).map((p,i)=>({id:p.id,rank:i+1}));
}
/** Called under the script lock. Only this LDC's current eligible reviews are changed. */
function synchronizeLdcRanks_(table,user,proposals) {
  const expected=new Map(ldcAutomaticRanks_(proposals).map(p=>[p.id,p.rank]));
  const ids=new Set(proposals.map(p=>p.id));
  const owned=table.rows.filter(r=>normalized_(r['Reviewer Email'])===user.email && normalized_(r.Domain)===normalized_(user.domain) && ids.has(text_(r['Proposal ID'])));
  const changes=owned.filter(r=>text_(r.Rank)!==text_(expected.get(text_(r['Proposal ID'])) || ''));
  if(!changes.length)return;
  let updated=table.headers.indexOf('Rank Updated At')+1;
  if(!updated){updated=table.sheet.getLastColumn()+1;table.sheet.getRange(1,updated).setValue('Rank Updated At');table.headers.push('Rank Updated At');}
  const rankColumn=table.headers.indexOf('Rank')+1, count=table.sheet.getLastRow()-1, now=new Date().toISOString();
  const rankRange=table.sheet.getRange(2,rankColumn,count,1),dateRange=table.sheet.getRange(2,updated,count,1);
  const ranks=rankRange.getValues(),dates=dateRange.getValues(),rankFormulas=rankRange.getFormulas(),dateFormulas=dateRange.getFormulas();
  ranks.forEach((r,i)=>r[0]=rankFormulas[i][0] || r[0]);dates.forEach((r,i)=>r[0]=dateFormulas[i][0] || r[0]);
  changes.forEach(r=>{r.Rank=expected.get(text_(r['Proposal ID'])) || '';r['Rank Updated At']=now;ranks[r._row-2][0]=r.Rank;dates[r._row-2][0]=now;});
  rankRange.setValues(ranks);dateRange.setValues(dates);SpreadsheetApp.flush();
}
function getRankingData(token) {
  const db = readDb_(), user = user_(db, token);
  if (user.role!=='LDC') throw new Error('Ranking submission is available to LDC reviewers only.');
  const entries = normalized_(user.domain) ? rankingEntries_(db, user).filter(p => normalized_(p.domain) === normalized_(user.domain)) : [];
  const table=rankRows_(db);
  const completedById=new Map(table.rows.filter(r=>normalized_(r['Reviewer Email'])===user.email && normalized_(r.Domain)===normalized_(user.domain)).map(r=>[text_(r['Proposal ID']),r]));
  const owned = entries.filter(p=>p.reviewAuthorEmail===user.email).map(p=>Object.assign({},p,{overallScore:ldcOverallScore_(completedById.get(p.id))}));
  const record = ownRanking_(table, user, owned);
  const saved = effectiveRankings_(record,owned).map(v=>({id:v.id,rank:v.rank}));
  const domainTotal = normalized_(user.domain) ? new Set(table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals).rows
    .filter(p=>text_(p['Proposal ID']) && normalized_(p.Domain)===normalized_(user.domain))
    .map(p=>text_(p['Proposal ID']))).size : 0;
  return { domain: user.domain, domainTotal:domainTotal, proposals: owned, saved: saved, rankLimit: owned.length,
    reservedRanks: [], migrated:!!(record && record._legacySource),
    version: record ? text_(record.Revision) : '', proposalSetVersion: rankingSetVersion_(owned),
    updatedAt: record ? historyDate_(record['Updated At']).label : '' };
}
/** Only the final review author may change rank justification. */
/** Explicit LDC action only: replace saved ranks by score, preserving justification. */
function autoRankProposals(token) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const db=db_(),user=user_(db,token);
    if(user.role!=='LDC' || !normalized_(user.domain))throw new Error('Only LDC reviewers with a configured domain can auto rank proposals.');
    const table=rankRows_(db);
    const reviews=new Map(table.rows.filter(r=>normalized_(r['Reviewer Email'])===user.email && normalized_(r.Domain)===normalized_(user.domain)).map(r=>[text_(r['Proposal ID']),r]));
    const proposals=rankingEntries_(db,user).filter(p=>p.reviewAuthorEmail===user.email && normalized_(p.domain)===normalized_(user.domain)).map(p=>Object.assign({},p,{overallScore:ldcOverallScore_(reviews.get(p.id))}));
    if(!ldcAutomaticRanks_(proposals).length)throw new Error('There are no scored proposals available to auto rank.');
    ownRanking_(table,user,proposals);
    synchronizeLdcRanks_(table,user,proposals);
    return {success:true};
  } finally {lock.releaseLock();}
}

function saveRankJustification(token, data) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const db=db_(),user=user_(db,token);
    if(user.role!=='LDC' || !normalized_(user.domain))throw new Error('Only LDC reviewers may edit rank justification.');
    if(!data || typeof data.justification!=='string' || data.justification.length>10000)throw new Error('Justification must be text of at most 10,000 characters.');
    const entries=rankingEntries_(db,user).filter(p=>p.reviewAuthorEmail===user.email && normalized_(p.domain)===normalized_(user.domain));
    const id=text_(data.proposalId);
    if(!entries.some(p=>p.id===id))throw new Error('You can justify only proposals you personally reviewed in your domain.');
    const table=rankRows_(db),record=ownRanking_(table,user,entries);
    if(text_(data.version)!==text_(record.Revision))throw new Error('Your rankings changed in another tab. Refresh My Rank Dashboard before saving.');
    const row=table.rows.find(r=>text_(r['Proposal ID'])===id && normalized_(r['Reviewer Email'])===user.email && normalized_(r.Domain)===normalized_(user.domain));
    if(!row)throw new Error('Completed review not found.');
    let column=table.headers.indexOf('Rank Justification')+1;
    if(!column){column=table.sheet.getLastColumn()+1;table.sheet.getRange(1,column).setValue('Rank Justification');table.headers.push('Rank Justification');}
    const value=text_(data.justification);
    table.sheet.getRange(row._row,column).setValue(sheetValue_(value));
    row['Rank Justification']=value;
    SpreadsheetApp.flush();
    return {success:true,justification:value,version:ownRanking_(table,user,entries).Revision};
  } finally {lock.releaseLock();}
}

function saveRankings(token, data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const db = db_(), user = user_(db, token);
    if (user.role!=='LDC' || !normalized_(user.domain)) throw new Error('Only reviewers with a configured domain can submit rankings.');
    const entries = rankingEntries_(db, user).filter(p => normalized_(p.domain) === normalized_(user.domain) && p.reviewAuthorEmail === user.email);
    if (!entries.length) throw new Error('There are no reviewed proposals submitted by you in your domain to rank.');
    if (!data || text_(data.proposalSetVersion) !== rankingSetVersion_(entries)) throw new Error('Your reviewed proposal list changed. Refresh My Rank Dashboard and rank the current list.');
    const table = rankRows_(db), row = ownRanking_(table, user, entries);

    if (text_(data.version) !== text_(row.Revision)) throw new Error('Your rankings changed in another tab. Refresh My Rank Dashboard before saving.');
    if (!Array.isArray(data.baseRankings)) throw new Error('Refresh Rank Dashboard before submitting with the updated application.');
    if (!Array.isArray(data.rankings) || data.rankings.length > entries.length) throw new Error('Invalid ranking list.');
    const ids = new Set(entries.filter(p=>p.reviewAuthorEmail===user.email).map(p => p.id)), seen = new Set(), ranks = new Set();
    const values = data.rankings.map(function (item) {
      const id = text_(item && item.id), rank = item && item.rank;
      if (!ids.has(id) || seen.has(id)) throw new Error('Invalid or duplicate proposal in ranking. You can rank only proposals you personally reviewed.');
      if (!Number.isInteger(rank) || rank < 1 || rank > entries.length || ranks.has(rank)) throw new Error('Use each rank from 1 to ' + entries.length + ' without repeating a rank.');
      seen.add(id); ranks.add(rank); return {id:id,rank:rank};
    }).sort((a,b) => a.rank-b.rank);
    // Merge edited selections into this reviewer's latest list under the script lock.
    // Other reviewers' records are never updated by this operation.
    const baseline = new Map();
    data.baseRankings.forEach(v => {
      if (!v || !ids.has(v.id) || !Number.isInteger(v.rank) || v.rank < 1 || v.rank > entries.length || baseline.has(v.id)) throw new Error('Invalid ranking baseline. Refresh Rank Dashboard.');
      baseline.set(v.id,v.rank);
    });
    const desired = new Map(values.map(v=>[v.id,v.rank]));
    const merged = new Map(effectiveRankings_(row,entries).map(v=>[v.id,v]));
    const now = new Date(), version = Utilities.getUuid();
    ids.forEach(id => {
      if ((baseline.get(id) || 0) === (desired.get(id) || 0)) return;
      if (!desired.has(id)) merged.delete(id);
      else merged.set(id,{id:id,rank:desired.get(id),reviewer:user.name,reviewerEmail:user.email,updatedAt:now.toISOString()});
    });
    const saved = Array.from(merged.values()).sort((a,b)=>a.rank-b.rank);
    if (new Set(saved.map(v=>v.rank)).size !== saved.length) throw new Error('Two proposals in your ranking list cannot have the same rank. Refresh My Rank Dashboard and choose unique ranks.');
    const byId = new Map(saved.map(v=>[v.id,v.rank]));
    const rankSignature=values=>JSON.stringify(values.map(v=>[v.id,v.rank]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0));
    const manualRankChange=rankSignature(saved)!==rankSignature(effectiveRankings_(row,entries));

    const justifications=new Map();
    if(data.justifications!==undefined){
      if(!Array.isArray(data.justifications) || data.justifications.length>entries.length)throw new Error('Invalid justifications.');
      data.justifications.forEach(v=>{
        if(!v || !ids.has(v.id) || justifications.has(v.id) || typeof v.justification!=='string' || v.justification.length>10000)throw new Error('Invalid justification. Use text of at most 10,000 characters for your own proposals.');
        justifications.set(v.id,text_(v.justification));
      });
    }
    let justificationColumn=table.headers.indexOf('Rank Justification')+1;
    if(justifications.size && !justificationColumn){justificationColumn=table.sheet.getLastColumn()+1;table.sheet.getRange(1,justificationColumn).setValue('Rank Justification');table.headers.push('Rank Justification');}

    // Optional column is created on first ranking save; existing sheets remain readable.
    let updatedColumn=table.headers.indexOf('Rank Updated At')+1;
    if(!updatedColumn){updatedColumn=table.sheet.getLastColumn()+1;table.sheet.getRange(1,updatedColumn).setValue('Rank Updated At');table.headers.push('Rank Updated At');}
    let modeColumn=table.headers.indexOf('Rank Order Mode')+1;
    if(manualRankChange && !modeColumn){modeColumn=table.sheet.getLastColumn()+1;table.sheet.getRange(1,modeColumn).setValue('Rank Order Mode');table.headers.push('Rank Order Mode');}
    const rankColumn=table.headers.indexOf('Rank')+1,first=Math.min(rankColumn,updatedColumn,justificationColumn || rankColumn,modeColumn || rankColumn),width=Math.max(rankColumn,updatedColumn,justificationColumn,modeColumn)-first+1;
    const range=table.sheet.getRange(2,first,table.sheet.getLastRow()-1,width),cells=range.getValues(),formulas=range.getFormulas();
    // Preserve formulas in any columns between Rank and its timestamp.
    cells.forEach((row,i)=>row.forEach((value,j)=>{row[j]=formulas[i][j] || sheetValue_(value);}));
    table.rows.forEach(r=>{
      if (normalized_(r['Reviewer Email'])===user.email && normalized_(r.Domain)===normalized_(user.domain) && ids.has(text_(r['Proposal ID']))) {
        const rank=byId.get(text_(r['Proposal ID'])) || '';
        if(text_(rank)!==text_(r.Rank) || !text_(r['Rank Updated At']) && rank!=='')r['Rank Updated At']=now.toISOString();
        const id=text_(r['Proposal ID']);
        if(justifications.has(id)){if(text_(r['Rank Justification'])!==justifications.get(id))r['Rank Updated At']=now.toISOString();r['Rank Justification']=justifications.get(id);cells[r._row-2][justificationColumn-first]=sheetValue_(justifications.get(id));}
        if(manualRankChange){r['Rank Order Mode']='Manual';cells[r._row-2][modeColumn-first]='Manual';}
        r.Rank=rank;
        cells[r._row-2][rankColumn-first]=rank;
        cells[r._row-2][updatedColumn-first]=r['Rank Updated At'] || '';
      }
    });
    range.setValues(cells);
    SpreadsheetApp.flush();
    return {success:true, version:ownRanking_(table,user,entries).Revision, updatedAt:historyDate_(ownRanking_(table,user,entries)['Updated At']).label, saved:saved.map(v=>({id:v.id,rank:v.rank})), reservedRanks:[]};
  } finally { lock.releaseLock(); }
}
function getAdminRankings(token, filters) {
  const db = readDb_(), user = user_(db, token);
  if (!['Admin','PIC'].includes(user.role)) throw new Error('ADMIN_REQUIRED: Administrator or PIC access is required.');
  // Evaluate each author's complete list before restricting PIC visibility by institute.
  const allEntries = rankingEntries_(db,Object.assign({},user,{role:'Admin'}));
  const entries = user.role==='PIC'?allEntries.filter(p=>sameInstitute_(p.institute,user)):allEntries;
  const table = rankRows_(db);
  const domainTotals = new Map();
  table_(db,CONFIG.PROPOSALS_SHEET,HEADERS.Proposals).rows.forEach(p=>{
    if (!text_(p['Proposal ID'])) return;
    const key=normalized_(p.Domain);
    if (!domainTotals.has(key)) domainTotals.set(key,new Set());
    domainTotals.get(key).add(text_(p['Proposal ID']));
  });
  const validRows=[], unrankedRows=[];
  const domains=new Set(entries.map(p=>normalized_(p.domain)));
  domains.forEach(domain=>{
    const eligible=entries.filter(p=>normalized_(p.domain)===domain);
    const domainEntries=allEntries.filter(p=>normalized_(p.domain)===domain);
    const saved=domainRankings_(table,domainEntries), byId=new Map(saved.map(v=>[v.id,v]));
    eligible.forEach(p=>{
      const v=byId.get(p.id);
      const owned=domainEntries.filter(e=>e.reviewAuthorEmail===p.reviewAuthorEmail);
      const record=ownRanking_(table,{domain:p.domain,email:p.reviewAuthorEmail,name:p.reviewAuthorName},owned);
      const needsUpdate=rankingValues_(record).length!==effectiveRankings_(record,owned).length;
      const completed=table.rows.find(r=>text_(r['Proposal ID'])===p.id) || {};
      const rankUpdated=completed['Rank Updated At'];
      const displayDate=rankUpdated || completed['Submission Date/Time'];
      const item=Object.assign({},p,{updatedAtSource:rankUpdated?'rank':displayDate?'submission':'',rank:v?v.rank:null, reviewer:p.reviewAuthorName || (v?v.reviewer:''),reviewerKey:p.reviewAuthorEmail,
        updatedAt:displayDate?historyDate_(displayDate).label:'—',rankedTotal:(domainTotals.get(domain)||new Set()).size,
        reviewerTotal:owned.length,rankedCount:saved.filter(r=>r.reviewerEmail===p.reviewAuthorEmail).length,needsUpdate:needsUpdate});
      (v?validRows:unrankedRows).push(item);
    });
  });
  const allRows=validRows.concat(unrankedRows);
  const options = function (field) {
    const map = new Map(); allRows.forEach(r => {const v=normalized_(r[field]); if(v&&!map.has(v))map.set(v,text_(r[field]));});
    return Array.from(map, pair=>({value:pair[0],label:pair[1]})).sort((a,b)=>a.label.localeCompare(b.label));
  };
  const people = new Map(); allRows.forEach(r => {if(r.reviewerKey) people.set(r.reviewerKey,{value:r.reviewerKey,label:r.reviewer+' ('+r.reviewerKey+')'});});
  filters = filters && typeof filters === 'object' ? filters : {};
  const domain=normalized_(filters.domain), institute=normalized_(filters.institute),
    status=normalized_(filters.status), reviewer=normalized_(filters.reviewer);
  if (status && !['reviewed','draft','pending'].includes(status)) throw new Error('Invalid proposal status filter.');
  const matches = r => (!domain || normalized_(r.domain)===domain) && (!institute || normalized_(r.institute)===institute) &&
    (!status || r.status===status) && (!reviewer || r.reviewerKey===reviewer);
  const result = validRows.filter(matches), unranked = unrankedRows.filter(matches);
  unranked.sort((a,b)=>a.domain.localeCompare(b.domain)||a.reviewerKey.localeCompare(b.reviewerKey)||a.name.localeCompare(b.name));
  result.sort((a,b)=>a.domain.localeCompare(b.domain)||a.reviewerKey.localeCompare(b.reviewerKey)||a.rank-b.rank);
  return { rows:result, unrankedRows:unranked, filterOptions:{domains:options('domain'),institutes:options('institute'),reviewers:Array.from(people.values()).sort((a,b)=>a.label.localeCompare(b.label))} };
}

return { getInitialData, getProposal, getReview, downloadReview, getAdminProposals, getAdminUsers, getAdminData, saveDraft, getAssistantReview, submitToLdc, submitReview, getRankingData, saveRankJustification, autoRankProposals, saveRankings, getAdminRankings, currentUser: () => user_(db), headers: HEADERS };
}

const READS=new Set(['getInitialData','getAdminData','getAdminUsers','getAdminProposals','getAdminRankings','getRankingData','session']);
export async function rpc(action,...args) {
  for(let attempt=0;attempt<(READS.has(action)?2:1);attempt++) {
    let response;
    try{response=await fetch('/api',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args})});}
    catch(error){if(READS.has(action)&&!attempt)continue;throw new Error('Unable to reach the portal. Your unsaved work is still in this tab.',{cause:error});}
    let payload;
    try{payload=await response.json();}catch(error){throw new Error('The portal returned an invalid response. Try again or contact support.',{cause:error});}
    if(!response.ok||payload.ok!==true){
      if(READS.has(action)&&!attempt&&response.status>=500)continue;
      const error=new Error(payload.error||'The portal request failed.');error.status=response.status;throw error;
    }
    return payload.result;
  }
}
export function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export const QUESTIONS=[['clarity','Clarity of the Proposal','How clearly is the purpose of the proposed lab explained?'],['academicRelevance','Academic Relevance','How relevant is the lab to its subject or course?'],['pedagogicalNeed','Pedagogical Value','How well does the lab address a teaching-learning need?'],['quality','Quality of the Proposed Lab','How would you rate the overall quality?'],['experimentDesign','Experiment Design','How well do the experiments support learning?'],['jobRelevance','Job Relevance','How relevant is the lab to current or emerging job roles?'],['userExperience','Student Experience','How would you rate the student experience?'],['overallRating','Overall Rating','Considering the proposal as a whole, how would you rate it?']];
export function initialAnswers(proposal){return Object.fromEntries([...QUESTIONS.map(([key])=>[key,String(proposal.draft?.answers?.[key]??'')]),['reviewerComments',proposal.draft?.answers?.reviewerComments||'']]);}
export function reviewPayload(proposal,answers){return {...answers,...Object.fromEntries(QUESTIONS.map(([key])=>[key,answers[key]===''?'':Number(answers[key])])),proposalId:proposal.id,draftVersion:proposal.draft?.version||''};}

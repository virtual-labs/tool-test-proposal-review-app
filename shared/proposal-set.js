export const SET_OPTIONS = [{value:'A',label:'Set A'},{value:'B',label:'Set B'}];
export function matchesSet(proposal, set) {
  return !set || (['A','B'].includes(set) && String(proposal.id || '').startsWith(set + '_'));
}
export function filterBoard(board, set) {
  if (!set) return board;
  const result={...board};
  for (const key of ['reviewed','draft','pending','ranked','selected','shared']) result[key]=(board[key]||[]).filter(p=>matchesSet(p,set));
  result.total=new Set(['reviewed','draft','pending'].flatMap(key=>result[key].map(p=>p.id))).size;
  return result;
}

// IDs without a recognised prefix retain a separate legacy ranking group.
export function proposalSet(id){return String(id||'').startsWith('A_')?'A':String(id||'').startsWith('B_')?'B':'legacy';}
export function rankKey(id,rank){return proposalSet(id)+':'+rank;}
export function setRankLimit(entries,id){return entries.filter(p=>proposalSet(p.id)===proposalSet(id)).length;}

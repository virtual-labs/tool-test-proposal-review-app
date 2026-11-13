export const SET_OPTIONS = [{value:'A',label:'Set A'},{value:'B',label:'Set B'}];
export function matchesSet(proposal, set) {
  return !set || (['A','B'].includes(set) && String(proposal.id || '').startsWith(set + '_'));
}
export function filterBoard(board, set) {
  if (!set) return board;
  const result={...board};
  for (const key of ['reviewed','draft','pending','ranked']) result[key]=(board[key]||[]).filter(p=>matchesSet(p,set));
  result.total=new Set(['reviewed','draft','pending'].flatMap(key=>result[key].map(p=>p.id))).size;
  return result;
}

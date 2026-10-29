export function sortedRows(rows,columns,sort) {
  const list=[...rows],column=columns.find(c=>c.key===sort.key);
  if(!sort.direction||!column)return list;
  return list.sort((a,b)=>{
    const x=column.sort?column.sort(a):a[sort.key],y=column.sort?column.sort(b):b[sort.key];
    const emptyX=x==null||x==='',emptyY=y==null||y==='';
    let order=0;
    if(emptyX!==emptyY){
      if(!column.emptyFirst)return emptyX?1:-1;
      order=emptyX?-1:1;
    }else if(!emptyX)order=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true});
    return order*sort.direction || (column.emptyFirst?(String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0):0);
  });
}

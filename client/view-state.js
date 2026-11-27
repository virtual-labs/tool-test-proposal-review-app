import {createContext,useContext,useState} from 'react';
export const ViewStateContext=createContext('');
const memory=new Map();
function valid(value,initial){
 if(typeof initial==='string')return typeof value==='string'&&value.length<500;
 return value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([key,item])=>key.length<80&&typeof item==='string'&&item.length<500);
}
const isFilter=key=>/:(filters|set|selection-status)$/.test(key);
export function resetViewFilters(){for(const key of memory.keys())if(isFilter(key))memory.delete(key);}
function read(key,initial){
 if(!key)return initial;
 if(isFilter(key))return memory.has(key)?memory.get(key):initial;
 try{const raw=sessionStorage.getItem(key);if(raw!==null){const value=JSON.parse(raw);if(valid(value,initial))return value;}}catch{/* Storage may be disabled. */}
 return memory.has(key)?memory.get(key):initial;
}
// Store navigation preferences only; never persist review answers or authentication.
export function useViewState(name,initial,identity){
 const context=useContext(ViewStateContext),scope=identity??context;
 const key=scope?'portal-view:v1:'+scope+':'+name:'';
 const [state,setState]=useState(()=>({key,value:read(key,initial)}));
 const value=state.key===key?state.value:read(key,initial);
 function update(next){
  const result=typeof next==='function'?next(value):next;
  if(key){memory.set(key,result);try{if(!isFilter(key))sessionStorage.setItem(key,JSON.stringify(result));}catch{/* Keep in-memory state available. */}}
  setState({key,value:result});
 }
 return [value,update];
}

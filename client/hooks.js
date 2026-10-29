import {useEffect,useState} from 'react';
import {rpc} from './api.js';
export function useResource(action,args,revision,onError,enabled=true){
  const key=JSON.stringify(args),[state,setState]=useState({data:null,loading:enabled});
  useEffect(()=>{
    if(!enabled){setState({data:null,loading:false});return;}
    let active=true;setState({data:null,loading:true});
    rpc(action,'cookie',...JSON.parse(key)).then(data=>{if(active)setState({data,loading:false});}).catch(error=>{if(active){setState({data:null,loading:false});onError(error);}});
    return ()=>{active=false;};
  },[action,key,revision,onError,enabled]);
  return state;
}

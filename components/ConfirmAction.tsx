'use client';
import {useRef,useState} from 'react';
import ActionIcon from './ActionIcon';
export default function ConfirmAction({label='Удалить',question='Удалить эту запись?',confirmLabel='Да, удалить',onConfirm,iconOnly=false,icon='delete'}:{icon?:'delete'|'return';iconOnly?:boolean;label?:string;question?:string;confirmLabel?:string;onConfirm:()=>Promise<void>}){
  const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(false),destructive=icon==='delete';
  return <div className="confirm-action">{open?<><span>{question}</span><div className="confirm-controls"><button type="button" className={destructive?'danger confirm-danger':'outline'} disabled={busy} onClick={async()=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await onConfirm();setOpen(false);}catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}}}>{busy?'Сохраняем…':confirmLabel}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Отмена</button></div></>:<button type="button" className={`${destructive?'danger ':''}${iconOnly?'icon-button':''}`} title={label} aria-label={label} onClick={()=>setOpen(true)}>{iconOnly?<ActionIcon kind={icon}/>:label}</button>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}

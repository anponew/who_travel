'use client';
import {useState} from 'react';
import ActionIcon from './ActionIcon';
export default function ConfirmAction({label='Удалить',question='Удалить эту запись?',confirmLabel='Да, удалить',onConfirm,iconOnly=false}:{iconOnly?:boolean;label?:string;question?:string;confirmLabel?:string;onConfirm:()=>Promise<void>}){
  const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div className="confirm-action">{open?<><span>{question}</span><div className="confirm-controls"><button type="button" className="danger confirm-danger" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onConfirm();setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'Удаляем…':confirmLabel}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Отмена</button></div></>:<button type="button" className={iconOnly?'danger icon-button':'danger'} title={label} aria-label={label} onClick={()=>setOpen(true)}>{iconOnly?<ActionIcon kind="delete"/>:label}</button>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}

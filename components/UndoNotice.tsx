'use client';
import {useI18n} from './I18n';
import {useEffect,useRef,useState} from 'react';

export type UndoAction={id:string;label:string;restore:()=>Promise<void>};
export default function UndoNotice({action,onClose}:{action:UndoAction;onClose:()=>void}){
const {tr,message}=useI18n();

  const[busy,setBusy]=useState(false),[error,setError]=useState('');
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{if(busy||error)return;const timer=setTimeout(()=>close.current(),5000);return()=>clearTimeout(timer);},[action.id,busy,error]);
  const pending=useRef(false);
  return <div className="notice undo-notice" role="status">
    <span>{error?message(error):tr(action.label)}</span>
    <button disabled={busy} onClick={async()=>{if(pending.current)return;pending.current=true;setBusy(true);try{await action.restore();close.current();}catch(e){setError(tr("Не удалось восстановить: ")+(e as Error).message);}finally{pending.current=false;setBusy(false);}}}>{busy?tr("Восстанавливаем…"):tr("Отменить")}</button>
    <button aria-label={tr("Закрыть уведомление")} disabled={busy} onClick={onClose}>×</button>
    {!busy&&!error&&<span key={action.id} className="undo-countdown" aria-hidden="true"/>}
  </div>;
}

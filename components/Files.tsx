'use client';
import {useI18n} from './I18n';
import {useState} from 'react';
import {readFile} from '@/lib/storage';
import SwipeDelete from './SwipeDelete';
import ConfirmAction from './ConfirmAction';
import {Attachment} from '@/lib/model';
export default function Files({files,onAdd,onRemove,showAdd=true}:{showAdd?:boolean;files:Attachment[];onAdd:()=>void;onRemove:(id:string)=>Promise<void>}){
const {tr,message}=useI18n();
const[error,setError]=useState('');async function open(f:Attachment){const popup=window.open('about:blank','_blank');try{const blob=await readFile(f.id);if(!blob)throw Error(tr("Файл не найден в этом браузере."));const url=URL.createObjectURL(blob);if(popup){popup.opener=null;popup.location.href=url;}else{const a=document.createElement('a');a.href=url;a.download=f.filename;a.click();}setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){popup?.close();setError((e as Error).message);}}
return <div className="file-area">{files.map(f=><SwipeDelete key={f.id} label={tr("Удалить")}><div className="saved-file"><div className="file-info"><strong title={f.filename}>{f.type==='application/pdf'?'▤':'▧'} {f.name}</strong><small>{tr("Сохранён на устройстве ·")} {Math.max(1,Math.round(f.size/1024))} {tr("КБ")}</small></div><button onClick={()=>open(f)}>{tr("Открыть ↗")}</button><ConfirmAction iconOnly label={tr("Удалить файл ")+f.name} question={tr("Удалить эту запись?")} onConfirm={()=>onRemove(f.id)}/></div></SwipeDelete>)}{showAdd&&<button onClick={onAdd}>{tr("+ Добавить")} {files.length?tr("ещё файл"):tr("файл")}</button>}{error&&<p role="alert">{message(error)}</p>}</div>;}

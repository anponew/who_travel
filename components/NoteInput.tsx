'use client';
import {useI18n} from './I18n';
import {useRef,useState} from 'react';
import {safeLink} from '@/lib/model';
import MarkdownNote from './MarkdownNote';

export default function NoteInput({defaultValue=''}:{defaultValue?:string}) {
const {tr,message}=useI18n();

  const input=useRef<HTMLTextAreaElement>(null);
  const selection=useRef({start:0,end:0});
  const[adding,setAdding]=useState(false);
  const[name,setName]=useState('');
  const[url,setUrl]=useState('');
  const[error,setError]=useState('');
  const[text,setText]=useState(defaultValue);
  const[preview,setPreview]=useState(false);
  function insertLink(){
    const href=safeLink(url.trim());
    if(!href){setError(tr("Вставь ссылку, которая начинается с https:// или http://"));return;}
    const textarea=input.current;
    if(!textarea)return;
    const label=(name.trim()||new URL(href).hostname).replace(/([\\\[\]])/g,'\\$1');
    const markdown=`[${label}](${href.replace(/\(/g,'%28').replace(/\)/g,'%29')})`;
    const {start,end}=selection.current;
    const before=text.slice(0,start),after=text.slice(end);
    setText(before+(/\S$/.test(before)?' ':'')+markdown+(/^\S/.test(after)?' ':'')+after);
    setAdding(false);setError('');setPreview(true);
  }
  return <div className="note-input">
    <div className="note-editor-bar"><div className="note-modes" role="group" aria-label={tr("Режим заметки")}><button type="button" aria-pressed={!preview} onClick={()=>{setPreview(false);setAdding(false);}}>{tr("Редактирование")}</button><button type="button" aria-pressed={preview} onClick={()=>{setPreview(true);setAdding(false);}}>{tr("Просмотр")}</button></div><button type="button" className="icon-button" title={tr("Добавить ссылку")} aria-label={tr("Добавить ссылку")} onClick={()=>{
      const textarea=input.current;if(!textarea)return;
      selection.current=preview?{start:text.length,end:text.length}:{start:textarea.selectionStart,end:textarea.selectionEnd};
      const selected=text.slice(selection.current.start,selection.current.end);
      setName(safeLink(selected)?'':selected);setUrl(safeLink(selected)?selected:'');setError('');setAdding(true);
    }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button></div>
    <label className={preview?'note-source-hidden':'note-text-label'}><span className="visually-hidden">{tr("Текст")}</span><textarea ref={input} name="text" required autoFocus value={text} onInvalid={()=>setPreview(false)} onChange={e=>setText(e.target.value)}/></label>
    {preview&&<div className="note-preview"><MarkdownNote text={text}/></div>}
    {adding&&<div className="note-link-editor" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();insertLink();}}}>
      <label>{tr("Адрес")}<input autoFocus type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://"/></label>
      <label>{tr("Название ссылки")}<input value={name} onChange={e=>setName(e.target.value)} placeholder={tr("Например, Посмотреть экскурсию")}/></label>
      {error&&<p className="error" role="alert">{message(error)}</p>}
      <div className="row"><button type="button" onClick={()=>setAdding(false)}>{tr("Отмена")}</button><button type="button" className="outline" onClick={insertLink}>{tr("Вставить ссылку")}</button></div>
    </div>}
  </div>;
}

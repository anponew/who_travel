'use client';
import {useRef,useState} from 'react';
import {safeLink} from '@/lib/model';
import MarkdownNote from './MarkdownNote';

export default function NoteInput({defaultValue=''}:{defaultValue?:string}) {
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
    if(!href){setError('Вставь ссылку, которая начинается с https:// или http://');return;}
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
    <label className={preview?'note-source-hidden':undefined}>Текст<textarea ref={input} name="text" required autoFocus value={text} onChange={e=>setText(e.target.value)}/></label>
    {preview&&<div className="note-preview"><MarkdownNote text={text}/></div>}
    <div className="note-toolbar"><button type="button" className="outline" onClick={()=>{
      const textarea=input.current;if(!textarea)return;
      selection.current=preview?{start:text.length,end:text.length}:{start:textarea.selectionStart,end:textarea.selectionEnd};
      const selected=text.slice(selection.current.start,selection.current.end);
      setName(safeLink(selected)?'':selected);setUrl(safeLink(selected)?selected:'');setError('');setAdding(true);
    }}>Добавить ссылку</button><button type="button" disabled={!text.trim()} onClick={()=>{setPreview(!preview);setAdding(false);}}>{preview?'Редактировать текст':'Просмотр'}</button></div>
    {adding&&<div className="note-link-editor" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();insertLink();}}}>
      <label>Адрес<input autoFocus type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://"/></label>
      <label>Название ссылки<input value={name} onChange={e=>setName(e.target.value)} placeholder="Например, Посмотреть экскурсию"/></label>
      {error&&<p className="error" role="alert">{error}</p>}
      <div className="row"><button type="button" onClick={()=>setAdding(false)}>Отмена</button><button type="button" className="outline" onClick={insertLink}>Вставить ссылку</button></div>
    </div>}
  </div>;
}

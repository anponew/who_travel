'use client';
import {cloneElement,useEffect,useRef,useState,type ReactElement,type HTMLAttributes} from 'react';
import ConfirmAction from './ConfirmAction';
import ActionIcon from './ActionIcon';

/** Keeps the existing row as the root so sortable lists retain their geometry. */
export default function SwipeDelete({children,label,returnToIdeas=false,onDelete,question,disabled=false}:{children:ReactElement<HTMLAttributes<HTMLElement>>;label:string;returnToIdeas?:boolean;onDelete?:()=>Promise<void>;question?:string;disabled?:boolean}){
  const root=useRef<HTMLElement>(null);
  const gesture=useRef<{x:number;y:number;id:number;dragging:boolean;offset:number}|null>(null);
  const suppressClick=useRef(false);
  const [offset,setOffset]=useState(0),[open,setOpen]=useState(false),[dragging,setDragging]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)){setOpen(false);setOffset(0);}};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[open]);
  function finish(cancel=false){
    const current=gesture.current;gesture.current=null;setDragging(false);
    if(!current?.dragging)return;
    const reveal=!cancel&&current.offset<-44;setOpen(reveal);setOffset(reveal?-88:0);
  }
  return cloneElement(children,{
    ...({ref:root} as object),
    className:`${children.props.className??''}${disabled?'':' swipe-surface'}`,
    style:{...children.props.style,'--swipe-offset':`${offset}px`,'--swipe-progress':Math.abs(offset)/88} as React.CSSProperties,
    'data-swipe-open':open||undefined,
    'data-swiping':dragging||undefined,
    onPointerDown:event=>{
      if(disabled||event.pointerType!=='touch'||!event.isPrimary||!window.matchMedia('(max-width:700px)').matches)return;
      if((event.target as Element).closest('.swipe-surface')!==root.current)return;
      if((event.target as Element).closest('button:not(.trip-card-open):not(.place-name),a,input,textarea,select'))return;
      suppressClick.current=false;
      gesture.current={x:event.clientX-offset,y:event.clientY,id:event.pointerId,dragging:false,offset};
    },
    onPointerMove:event=>{
      const current=gesture.current;if(!current||event.pointerId!==current.id)return;
      const dx=event.clientX-current.x,dy=event.clientY-current.y;
      if(!current.dragging){if(Math.abs(dy)>12){gesture.current=null;return;}if(Math.abs(dx)<12)return;current.dragging=true;setDragging(true);suppressClick.current=true;root.current?.setPointerCapture(event.pointerId);}
      current.offset=Math.max(-88,Math.min(0,dx));setOffset(current.offset);
    },
    onPointerUp:()=>finish(),
    onPointerCancel:()=>finish(true),
    onClickCapture:event=>{if(suppressClick.current&&!(event.target as Element).closest('.swipe-reveal')){event.preventDefault();event.stopPropagation();suppressClick.current=false;}},
    onKeyDown:event=>{if(event.key==='Escape'){setOpen(false);setOffset(0);}},
  } as HTMLAttributes<HTMLElement>,children.props.children,
    <button key="swipe-action" type="button" className={`swipe-reveal${returnToIdeas?' swipe-return':''}`} aria-label={label} tabIndex={open?0:-1} aria-hidden={!open} onClick={()=>{
      setOpen(false);setOffset(0);suppressClick.current=false;
      // Use the existing confirmation, including its error handling and undo behavior.
      root.current?.querySelector<HTMLButtonElement>(onDelete?':scope > .swipe-confirm .confirm-action > button':'.confirm-action > button')?.click();
    }}><ActionIcon kind={returnToIdeas?'return':'delete'}/><span>{label}</span></button>,onDelete&&<div key="swipe-confirm" className="swipe-confirm"><ConfirmAction label={label} question={question} onConfirm={onDelete}/></div>);
}

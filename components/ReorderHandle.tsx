'use client';
import {useEffect,useRef,useState} from 'react';

/** Pointer capture supports both a mouse and touch without dragging the page. */
export default function ReorderHandle({id,name,previous,next,onMove}:{id:string;name:string;previous?:string;next?:string;onMove:(target:string)=>void}){
  const gesture=useRef<{x:number;y:number;startX:number;startY:number;active:boolean;target:HTMLElement|null;root:HTMLElement;frame:number}|null>(null);
  const[preview,setPreview]=useState<{x:number;y:number}|null>(null);
  function clear(){const current=gesture.current;if(current){cancelAnimationFrame(current.frame);current.target?.classList.remove('reorder-target');current.root.classList.remove('is-reordering');}gesture.current=null;setPreview(null);}
  useEffect(()=>()=>{const current=gesture.current;if(current){cancelAnimationFrame(current.frame);current.target?.classList.remove('reorder-target');current.root.classList.remove('is-reordering');}},[]);
  function track(){const current=gesture.current;if(!current||!current.active)return;
    const edge=64;const speed=current.y<edge?-8:current.y>window.innerHeight-edge?8:0;if(speed)window.scrollBy(0,speed);
    const target=document.elementFromPoint(current.x,current.y)?.closest<HTMLElement>('[data-reorder-id]')??null;
    const valid=target&&current.root.contains(target)&&target.dataset.reorderId!==id?target:null;
    if(current.target!==valid){current.target?.classList.remove('reorder-target');valid?.classList.add('reorder-target');current.target=valid;}
    current.frame=requestAnimationFrame(track);
  }
  return <><button type="button" className="reorder-handle" title="Перетащить для изменения порядка" aria-label={`Переместить ${name}. Используй перетаскивание или клавиши вверх и вниз.`}
    onKeyDown={event=>{const target=event.key==='ArrowUp'?previous:event.key==='ArrowDown'?next:undefined;if(target){event.preventDefault();onMove(target);}}}
    onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;const root=event.currentTarget.closest<HTMLElement>('.events');if(!root)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,active:false,target:null,root,frame:0};}}
    onPointerMove={event=>{const current=gesture.current;if(!current)return;current.x=event.clientX;current.y=event.clientY;if(!current.active&&Math.hypot(current.x-current.startX,current.y-current.startY)>6){current.active=true;current.root.classList.add('is-reordering');track();}if(current.active)setPreview({x:current.x,y:current.y});}}
    onPointerUp={event=>{const current=gesture.current;const element=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-reorder-id]');const target=element&&current?.root.contains(element)?element.dataset.reorderId:undefined;const active=current?.active;clear();if(active&&target&&target!==id)onMove(target);}}
    onPointerCancel={clear} onLostPointerCapture={clear}><svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">{[4,10,16].flatMap(y=>[5,11].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.5"/>))}</svg></button>{preview&&<div className="reorder-preview" style={{left:preview.x+14,top:preview.y+14}}>{name}</div>}</>;
}

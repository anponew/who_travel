'use client';
import {useI18n} from './I18n';
import {useEffect,useRef,useState} from 'react';

type Placement='before'|'after';
type Drop={element:HTMLElement;placement:Placement};
function destination(root:HTMLElement,id:string,x:number,y:number):Drop|null{
  const bounds=root.getBoundingClientRect();
  if(x<bounds.left||x>bounds.right||y<bounds.top-24||y>bounds.bottom+24)return null;
  const all=[...root.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]')];
  const others=all.filter(item=>item.dataset.reorderId!==id);
  if(!others.length)return null;
  const index=others.findIndex(item=>{const rect=item.getBoundingClientRect();return y<rect.top+rect.height/2;});
  const insertIndex=index<0?others.length:index;
  if(insertIndex===all.findIndex(item=>item.dataset.reorderId===id))return null;
  return index<0?{element:others.at(-1)!,placement:'after'}:{element:others[index],placement:'before'};
}

/** Mouse and touch use the same explicit insertion position and indicator. */
export default function ReorderHandle({id,name,previous,next,onMove}:{id:string;name:string;previous?:string;next?:string;onMove:(target:string,placement:Placement)=>void}){
const {tr}=useI18n();

  const gesture=useRef<{x:number;y:number;startX:number;startY:number;active:boolean;drop:Drop|null;root:HTMLElement;source:HTMLElement;frame:number}|null>(null);
  const[preview,setPreview]=useState<{x:number;y:number}|null>(null);
  function removeIndicator(drop:Drop|null){drop?.element.classList.remove('reorder-before','reorder-after');}
  function cleanup(){const current=gesture.current;if(current){cancelAnimationFrame(current.frame);removeIndicator(current.drop);current.root.classList.remove('is-reordering');current.source.classList.remove('reorder-source');}gesture.current=null;}
  function clear(){cleanup();setPreview(null);}
  useEffect(()=>cleanup,[]);
  function track(){const current=gesture.current;if(!current||!current.active)return;
    const edge=64,speed=current.y<edge?-8:current.y>window.innerHeight-edge?8:0;
    if(speed)window.scrollBy(0,speed);
    const drop=destination(current.root,id,current.x,current.y);
    if(current.drop?.element!==drop?.element||current.drop?.placement!==drop?.placement){removeIndicator(current.drop);drop?.element.classList.add('reorder-'+drop.placement);current.drop=drop;}
    current.frame=requestAnimationFrame(track);
  }
  return <><button type="button" className="reorder-handle" title={tr("Перетащить для изменения порядка")} aria-label={tr("Переместить {0}. Используй перетаскивание или клавиши вверх и вниз.",{"0":(name)})}
    onKeyDown={event=>{const target=event.key==='ArrowUp'?previous:event.key==='ArrowDown'?next:undefined;if(target){event.preventDefault();onMove(target,event.key==='ArrowUp'?'before':'after');}}}
    onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;const root=event.currentTarget.closest<HTMLElement>('.events'),source=event.currentTarget.closest<HTMLElement>('[data-reorder-id]');if(!root||!source)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,active:false,drop:null,root,source,frame:0};}}
    onPointerMove={event=>{const current=gesture.current;if(!current)return;current.x=event.clientX;current.y=event.clientY;if(!current.active&&Math.hypot(current.x-current.startX,current.y-current.startY)>6){current.active=true;current.root.classList.add('is-reordering');current.source.classList.add('reorder-source');track();}if(current.active)setPreview({x:current.x,y:current.y});}}
    onPointerUp={event=>{const current=gesture.current,drop=current?.active?destination(current.root,id,event.clientX,event.clientY):null;clear();if(drop)onMove(drop.element.dataset.reorderId!,drop.placement);}}
    onPointerCancel={clear} onLostPointerCapture={clear}><svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">{[4,10,16].flatMap(y=>[5,11].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.5"/>))}</svg></button>{preview&&<div className="reorder-preview" style={{left:preview.x+14,top:preview.y+14}}>{name}</div>}</>;
}

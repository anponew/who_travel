'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';

export default function PlanList({children}:{children:ReactNode}){
  const root=useRef<HTMLDivElement>(null);
  const previous=useRef<{ids:string[];tops:Map<string,number>}>({ids:[],tops:new Map()});
  useLayoutEffect(()=>{
    const elements=[...root.current!.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]')];
    const ids=elements.map(el=>el.dataset.reorderId!);
    const tops=new Map(elements.map(el=>[el.dataset.reorderId!,el.getBoundingClientRect().top+window.scrollY]));
    const old=previous.current;
    const changed=ids.length===old.ids.length&&ids.every(id=>old.tops.has(id))&&ids.some((id,i)=>id!==old.ids[i]);
    if(changed&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(const element of elements){const id=element.dataset.reorderId!,delta=old.tops.get(id)!-tops.get(id)!;if(delta)element.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});}
    }
    previous.current={ids,tops};
  });
  return <div className="events" ref={root}>{children}</div>;
}

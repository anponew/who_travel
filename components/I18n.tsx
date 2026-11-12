'use client';
import {createContext,useContext,useEffect,useState,useRef,useId,type ReactNode} from 'react';
import {translate,translateMessage,type Language} from '@/lib/translations';
import * as model from '@/lib/model';
const Context=createContext<{language:Language;setLanguage:(language:Language)=>void}>({language:'ru',setLanguage:()=>{}});
export function I18nProvider({children}:{children:ReactNode}){
  const[language,setCurrent]=useState<Language>('ru');
  useEffect(()=>{try{const saved=localStorage.getItem('who-travel-language');if(saved==='ru'||saved==='en')setCurrent(saved);}catch{}},[]);
  useEffect(()=>{document.documentElement.lang=language;},[language]);
  function setLanguage(value:Language){setCurrent(value);try{localStorage.setItem('who-travel-language',value);}catch{}}
  return <Context.Provider value={{language,setLanguage}}>{children}</Context.Provider>;
}
export function useI18n(){
  const value=useContext(Context),language=value.language;
  return {...value,
    tr:(key:string,values?:Record<string,string|number>)=>translate(language,key,values),
    message:(text:string)=>translateMessage(language,text).replace(/(?<!\.)[.。]$/u,''),
    dateLabel:(date:string,year=false)=>model.dateLabel(date,year,language),
    dayDateLabel:(date:string,yearConfirmed=true)=>model.dayDateLabel(date,yearConfirmed,language),
    dayCountLabel:(count:number)=>language==='en'?`${count} ${count===1?'day':'days'}`:`${count} ${count%10===1&&count%100!==11?'день':count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'дня':'дней'}`,
    nightLabel:(count:number)=>model.nightLabel(count,language),
    placeLabel:(count:number)=>model.placeLabel(count,language),
    hotelNightsLabel:(trip:model.Trip,hotel:model.Hotel)=>model.hotelNightsLabel(trip,hotel,language),
    cityDatesLabel:(trip:model.Trip,city:string)=>model.cityDatesLabel(trip,city,language),
  };
}
export function LanguageSwitch(){
  const{language,setLanguage}=useI18n();const[open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const button=useRef<HTMLButtonElement>(null);const id=useId();
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
  const label=language==='ru'?'Выбрать язык':'Choose language';
  return <div className="language-picker" ref={root} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}}}>
    <button ref={button} type="button" className="language-trigger icon-button" title={label} aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/></svg></button>
    {open&&<div id={id} className="language-options" role="group" aria-label={label}>{([['ru','Русский','🇷🇺'],['en','English','🇬🇧']] as const).map(([value,name,flag])=><button type="button" key={value} aria-pressed={language===value} onClick={()=>{setLanguage(value);setOpen(false);button.current?.focus();}}><span className="language-name"><span aria-hidden="true">{flag}</span>{name}</span><span aria-hidden="true">{language===value?'✓':''}</span></button>)}</div>}
  </div>;
}

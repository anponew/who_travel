'use client';
import {useI18n} from './I18n';
import {useState} from 'react';
import {validDate} from '@/lib/model';
import {localToday} from '@/lib/today';
import SwipeDelete from './SwipeDelete';
import ActionIcon from './ActionIcon';
import {cityPeriodsForTrip,type Trip,type CityPeriod} from '@/lib/model';
export default function TripSetup({trip,errors={},onScheduleChange}:{trip?:Trip;errors?:Record<string,string>;onScheduleChange:()=>void}){
const {tr,dateLabel}=useI18n();
const earliest=trip?trip.days[0].date<localToday()?trip.days[0].date:localToday():localToday();
const [dateErrors,setDateErrors]=useState<Record<string,string>>({});
const shownErrors={...errors,...dateErrors};
const feedback=(name:string)=>{
  if(!shownErrors[name])return null;
  const index=Number(name.split('-')[1]),p=periods[index];
  const specific=p?rangeError(name,name.startsWith('arrival-')?p.start:p.end,name.startsWith('arrival-')?(index>0?periods[index-1].end||start:start):p.start||start,end):'';
  return <span className="field-error" id={`${name}-error`}>{(specific||tr(shownErrors[name])).replace(/[.。]+$/,'')}</span>;
};
const invalid=(name:string)=>({'aria-invalid':!!shownErrors[name],'aria-describedby':shownErrors[name]?`${name}-error`:undefined});

  const[start,setStart]=useState(trip?.days[0].date??''),[end,setEnd]=useState(trip?.days.at(-1)!.date??'');
  const[periods,setPeriods]=useState<CityPeriod[]>(()=>trip?cityPeriodsForTrip(trip):[{city:'',start:'',end:''}]);
  function changed(){setDateErrors({});onScheduleChange();}
  const update=(i:number,patch:Partial<CityPeriod>)=>{changed();setPeriods(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r));};
  function rangeError(name:string,value:string,min:string,max:string){
    if(!validDate(value))return '';
    const arrival=name.startsWith('arrival-'),departure=name.startsWith('departure-');
    if(validDate(max)&&value>max)return tr(arrival?'Приезд не позже {0}':departure?'Выезд не позже {0}':'Конец не позже {0}',{'0':dateLabel(max,true)});
    if(validDate(min)&&value<min)return tr(arrival?'Приезд не раньше {0}':departure?'Выезд не раньше {0}':name==='start'?'Начало не раньше {0}':'Конец не раньше {0}',{'0':dateLabel(min,true)});
    return '';
  }
  function validateDate(input:HTMLInputElement){
    const error=rangeError(input.name,input.value,input.min,input.max);
    setDateErrors(current=>{const next={...current};if(error)next[input.name]=error;else delete next[input.name];return next;});
    // Native date inputs emit intermediate years (0002, 0020, 0202) while typing.
    // Only seed blank city dates after the user finishes a valid trip date.
    if(!error&&validDate(input.value)&&input.value>=earliest){
      const value=input.value;
      if(input.name==='start')setPeriods(rows=>rows.map(p=>({...p,start:p.start||value})));
      if(input.name==='end')setPeriods(rows=>rows.map(p=>({...p,end:p.end||value})));
    }
  }
  const defaultDate=(value:string)=>validDate(value)&&value>=earliest&&(!validDate(start)||value>=start)&&(!validDate(end)||value<=end)?value:'';
  function changeStart(next:string){
    changed();setStart(next);

  }
  function changeEnd(next:string){
    changed();setEnd(next);

  }
  return <><label>{tr("Название поездки")}<input name="title" {...invalid("title")} placeholder={tr("Например, Япония")} defaultValue={trip?.title??''} required/>{feedback("title")}</label><div className="trip-date-fields"><div className="pair"><label>{tr("Начало")}<input name="start" {...invalid("start")} min={earliest} type="date" value={start} required onChange={e=>changeStart(e.target.value)} onBlur={e=>validateDate(e.currentTarget)}/>{feedback("start")}</label><label>{tr("Конец")}<input name="end" {...invalid("end")} type="date" value={end} min={start||earliest} required onChange={e=>changeEnd(e.target.value)} onBlur={e=>validateDate(e.currentTarget)}/>{feedback("end")}</label></div><p className="muted date-hint">{tr("Последний день — день возвращения, без ночёвки.")}</p></div>
    <div className="schedule-heading"><h3>{tr("Города по маршруту")}</h3><p className="muted">{tr("Можно заполнить сейчас или позже.")}</p></div>
    <input type="hidden" name="periods" value={JSON.stringify(periods)}/>
    {periods.map((p,i)=><SwipeDelete key={i} label={tr("Удалить")} question={tr("Удалить город")} disabled={periods.length===1} onDelete={periods.length>1?async()=>{changed();setPeriods(rows=>rows.filter((_,n)=>n!==i));}:undefined}><section className="city-period" aria-label={tr("Город {0}",{"0":(i+1)})}><div className="row"><strong>{tr("Город")} {i+1}</strong>{periods.length>1&&<button type="button" className="danger icon-button swipe-delete-launcher" aria-label={tr("Удалить город {0}",{"0":(p.city||i+1)})} title={tr("Удалить город")} onClick={()=>{changed();setPeriods(rows=>rows.filter((_,n)=>n!==i));}}><ActionIcon kind="delete"/></button>}</div><label>{tr("Город")}<input name={`city-${i}`} {...invalid(`city-${i}`)} value={p.city} placeholder={tr("Например, Токио")} onChange={e=>update(i,{city:e.target.value})}/>{feedback(`city-${i}`)}</label><div className="pair"><label>{tr("Приезд")}<input name={`arrival-${i}`} {...invalid(`arrival-${i}`)} type="date" value={p.start} min={i>0?periods[i-1].end||start||earliest:start||earliest} max={end} onChange={e=>update(i,{start:e.target.value})} onBlur={e=>validateDate(e.currentTarget)}/>{feedback(`arrival-${i}`)}</label><label>{tr("Выезд")}<input name={`departure-${i}`} {...invalid(`departure-${i}`)} type="date" value={p.end} min={p.start||start||earliest} max={end} onChange={e=>update(i,{end:e.target.value})} onBlur={e=>validateDate(e.currentTarget)}/>{feedback(`departure-${i}`)}</label></div></section></SwipeDelete>)}
    <button type="button" className="outline" onClick={()=>{changed();setPeriods(rows=>[...rows,{city:'',start:defaultDate(rows.at(-1)?.end||start),end:defaultDate(end)}]);}}>{tr("+ Добавить город")}</button>
  </>;
}

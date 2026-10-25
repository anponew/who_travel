'use client';
import {useState} from 'react';
import {cityPeriodsForTrip,shiftDate,type Trip,type CityPeriod} from '@/lib/model';
export default function TripSetup({trip}:{trip?:Trip}){
  const[start,setStart]=useState(trip?.days[0].date??''),[end,setEnd]=useState(trip?.days.at(-1)!.date??'');
  const[periods,setPeriods]=useState<CityPeriod[]>(()=>trip?cityPeriodsForTrip(trip):[{city:'',start:'',end:''}]);
  const update=(i:number,patch:Partial<CityPeriod>)=>setPeriods(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r));
  function changeStart(next:string){if(!next){setStart(next);return;}const delta=start?Math.round((+new Date(next)- +new Date(start))/86400000):0;setPeriods(rows=>rows.map(p=>({...p,start:p.start?shiftDate(p.start,delta):next,end:p.end?shiftDate(p.end,delta):end||next})));if(end&&start)setEnd(shiftDate(end,delta));setStart(next);}
  function changeEnd(next:string){setPeriods(rows=>rows.map((p,i)=>({...p,end:!p.end||p.end===end||i===rows.length-1&&p.end===start?next:p.end})));setEnd(next);}
  return <><label>Название поездки<input name="title" defaultValue={trip?.title??''} required/></label><div className="trip-date-fields"><div className="pair"><label>Начало<input name="start" type="date" value={start} required onChange={e=>changeStart(e.target.value)}/></label><label>Конец<input name="end" type="date" value={end} min={start} required onChange={e=>changeEnd(e.target.value)}/></label></div><p className="muted date-hint">Последний день — день возвращения, без ночёвки.</p></div>
    <div className="schedule-heading"><h3>Города по маршруту</h3><p className="muted">Можно заполнить сейчас или позже.</p></div>
    <input type="hidden" name="periods" value={JSON.stringify(periods)}/>
    {periods.map((p,i)=><section className="city-period" key={i} aria-label={`Город ${i+1}`}><div className="row"><strong>Город {i+1}</strong>{periods.length>1&&<button type="button" onClick={()=>setPeriods(rows=>rows.filter((_,n)=>n!==i))}>Убрать</button>}</div><label>Город<input value={p.city} placeholder="Например, Токио" onChange={e=>update(i,{city:e.target.value})}/></label><div className="pair"><label>Приезд<input type="date" value={p.start} min={start} max={end} onChange={e=>update(i,{start:e.target.value})}/></label><label>Выезд<input type="date" value={p.end} min={p.start||start} max={end} onChange={e=>update(i,{end:e.target.value})}/></label></div></section>)}
    <button type="button" className="outline" onClick={()=>setPeriods(rows=>[...rows,{city:'',start:rows.at(-1)?.end||start,end}])}>+ Добавить город</button>
  </>;
}

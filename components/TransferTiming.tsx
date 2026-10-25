'use client';
import {useState} from 'react';
import {dateLabel,dayForTransfer,type Day,type Flight,type Trip} from '@/lib/model';

/** The departure date has one source: the selected itinerary day. */
export default function TransferTiming({trip,day,transfer}:{trip:Trip;day:Day;transfer?:Flight}){
  const[selectedDayId,setSelectedDayId]=useState(()=>transfer?dayForTransfer(trip,transfer)?.id??day.id:day.id);
  const[time,setTime]=useState(transfer?.departure.slice(11)??'');
  const selectedDay=trip.days.find(item=>item.id===selectedDayId)??day;
  return <>
    <label>День отправления<select name="dayId" value={selectedDayId} onChange={event=>setSelectedDayId(event.target.value)}>{trip.days.map(item=><option key={item.id} value={item.id}>{dateLabel(item.date)} · {item.city||item.title}</option>)}</select></label>
    <input type="hidden" name="departure" value={time?`${selectedDay.date}T${time}`:''}/>
    <div className="pair">
      <label>Время отправления · необязательно<input type="time" value={time} onChange={event=>setTime(event.target.value)}/></label>
      <label>Прибытие · местные дата и время<input name="arrival" type="datetime-local" defaultValue={transfer?.arrival??''}/></label>
    </div>
  </>;
}

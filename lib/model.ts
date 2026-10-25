export type Place = { id:string; name:string; city:string; note:string; link:string; mapLink?:string; time:string; lat?:number; lng?:number; kind:'place'|'food'|'transport'; source?:'idea'; dayId:string|null };
export type Day = {id:string; date:string; title:string; city:string; cities?:string[]; notes:{id:string;text:string}[]; hotelOverride?:string|null};
export type Hotel = {id:string; name:string; city:string; address:string; link:string; mapLink?:string; checkin:string; checkout:string; lat?:number;lng?:number};
export type TransferKind='flight'|'train'|'bus'|'car'|'other';
export type Flight = {id:string;name:string;number:string;departure:string;arrival:string;note:string;kind?:TransferKind;dayId?:string;from?:string;to?:string};
export type Attachment = {id:string;ownerId:string;name:string;filename:string;type:string;size:number};
export type Trip = {id:string;title:string;yearConfirmed:boolean;cityPeriods?:CityPeriod[];days:Day[];places:Place[];hotels:Hotel[];flights:Flight[];files:Attachment[]};
export const uid=()=>crypto.randomUUID();
export function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;}
export function datesBetween(start:string,end:string){ if(!validDate(start)||!validDate(end))throw Error('Укажи корректные даты.'); const a=new Date(start+'T12:00:00Z'), b=new Date(end+'T12:00:00Z'); if(!Number.isFinite(+a)||!Number.isFinite(+b)||b<a)throw Error('Укажи корректные даты.'); const days:string[]=[];for(let d=a;d<=b;d.setUTCDate(d.getUTCDate()+1)){ if(days.length>=366)throw Error('Поездка может длиться не более 366 дней.');days.push(d.toISOString().slice(0,10));}return days; }
export function createTrip(title:string,start:string,end:string):Trip {return {id:uid(),title,yearConfirmed:true,days:datesBetween(start,end).map(date=>({id:uid(),date,title:'Новый день',city:'',notes:[]})),places:[],hotels:[],flights:[],files:[]};}
export function hotelForDay(trip:Trip,day:Day){ if(day.id===trip.days.at(-1)?.id)return undefined; if(day.hotelOverride!==undefined)return trip.hotels.find(h=>h.id===day.hotelOverride);return trip.hotels.findLast(h=>(!day.city||h.city===day.city)&&h.checkin<=day.date&&day.date<h.checkout); }
export function saveHotel(trip:Trip,hotel:Hotel){const old=trip.hotels.find(h=>h.id===hotel.id); if(old){ // Explicit manual choices survive date edits; automatic nights are derived each time.
trip.hotels=trip.hotels.map(h=>h.id===hotel.id?hotel:h);
}else trip.hotels.push(hotel);return trip;}
export function nights(trip:Trip,city:string){return trip.days.slice(0,-1).filter(d=>d.city===city).length;}
export function nightLabel(n:number){return `${n} ${n%10===1&&n%100!==11?'ночь':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'ночи':'ночей'}`;}
export function dateLabel(date:string,year=false){return new Date(date+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'short',...(year?{year:'numeric' as const}:{}),timeZone:'UTC'});}
export function safeLink(value:string){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
export function movePlace(trip:Trip,id:string,dayId:string|null){trip.places=trip.places.map(p=>p.id===id?{...p,source:p.source??(!p.dayId&&dayId&&p.kind!=='food'?'idea':undefined),dayId,city:p.city||(dayId?trip.days.find(d=>d.id===dayId)!.city:'')}:p);}
export function shiftDate(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function resizeTrip(t:Trip,start:string,end:string){const dates=datesBetween(start,end);const removed=t.days.slice(dates.length);if(removed.some(d=>d.notes.length||d.hotelOverride||t.places.some(p=>p.dayId===d.id)||t.files.some(f=>f.ownerId===d.id)||t.flights.some(f=>dayForTransfer(t,f)?.id===d.id)))throw Error('В удаляемых днях есть данные. Сначала перенеси места, переезды, заметки и файлы.');const delta=Math.round((+new Date(start)- +new Date(t.days[0].date))/86400000);const prev=t.days;t.days=dates.map((date,i)=>prev[i]?{...prev[i],date}:{id:uid(),date,title:'Новый день',city:'',notes:[]});t.flights.forEach(f=>{if(f.departure)f.departure=shiftDate(f.departure.slice(0,10),delta)+f.departure.slice(10);if(f.arrival)f.arrival=shiftDate(f.arrival.slice(0,10),delta)+f.arrival.slice(10);});t.hotels.forEach(h=>{h.checkin=shiftDate(h.checkin,delta);h.checkout=shiftDate(h.checkout,delta);});if(t.cityPeriods)t.cityPeriods=t.cityPeriods.map(p=>({...p,start:shiftDate(p.start,delta),end:shiftDate(p.end,delta)}));t.yearConfirmed=true;}

export type CityPeriod = {city:string;start:string;end:string};
/** Dates include both arrival and departure; nights exclude the departure date. */
export function citiesForDay(day:Day):string[]{return day.cities?.length?day.cities:[day.city];}
export function cityPeriodsForTrip(trip:Trip):CityPeriod[]{
  if(trip.cityPeriods)return structuredClone(trip.cityPeriods);
  const rows:CityPeriod[]=[];
  trip.days.forEach((day,index)=>{const prev=rows.at(-1);if(prev?.city===day.city)prev.end=day.date;else{if(prev)prev.end=day.date;rows.push({city:day.city,start:day.date,end:day.date});}});
  return rows;
}
export function applyCityPeriods(trip:Trip,rows:CityPeriod[]){
  const start=trip.days[0].date,end=trip.days.at(-1)!.date;
  const periods=rows.map(p=>({...p,city:p.city.trim()})).filter(p=>p.city);
  periods.forEach((p,i)=>{
    if(!p.start||!p.end||p.start<start||p.end>end||p.start>p.end||!validDate(p.start)||!validDate(p.end))throw Error('Укажи даты города в пределах поездки.');
    const prev=periods[i-1];if(prev&&prev.end>p.start)throw Error('Следующий город может начинаться в день выезда из предыдущего или позже. Проверь порядок дат.');
  });
  trip.cityPeriods=periods;
  trip.days.forEach(day=>{
    day.cities=[...new Set(periods.filter(p=>p.start<=day.date&&day.date<=p.end).map(p=>p.city))];
    day.city=periods.filter(p=>p.start<=day.date&&day.date<p.end).at(-1)?.city??(day.date===end?day.cities.at(-1)??'':'');
  });
}

export const transferKinds:Record<TransferKind,string>={flight:'Перелёт',train:'Поезд',bus:'Автобус',car:'Автомобиль',other:'Другой переезд'};
export function dayForTransfer(trip:Trip,transfer:Flight){return trip.days.find(d=>d.id===transfer.dayId)??trip.days.find(d=>transfer.departure.startsWith(d.date));}

export function hotelNightsLabel(trip:Trip,hotel:Hotel){
  const days=trip.days.slice(0,-1).filter(d=>hotelForDay(trip,d)?.id===hotel.id);
  if(!days.length)return 'Ночи пока не назначены';
  const ranges:{start:string;end:string}[]=[];
  for(const d of days){const prev=ranges.at(-1);if(prev&&prev.end===d.date)prev.end=shiftDate(d.date,1);else ranges.push({start:d.date,end:shiftDate(d.date,1)});}
  const format=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
  const range=(r:{start:string;end:string})=>r.start.slice(0,7)===r.end.slice(0,7)?`${Number(r.start.slice(8))}–${format(r.end)}`:`${format(r.start)} – ${format(r.end)}`;
  return `${nightLabel(days.length)} · ${ranges.map(range).join(', ')}`;
}

export function placeLabel(count:number){const mod10=count%10,mod100=count%100;return `${count} ${mod10===1&&mod100!==11?'место':mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?'места':'мест'}`;}

/** Include arrival/departure days, preserving separate visits to the same city. */
export function cityDatesLabel(trip:Trip,city:string){
  const days=trip.days.filter(day=>citiesForDay(day).includes(city));
  const ranges:{start:string;end:string}[]=[];
  for(const day of days){const last=ranges.at(-1);if(last&&shiftDate(last.end,1)===day.date)last.end=day.date;else ranges.push({start:day.date,end:day.date});}
  return ranges.map(({start,end})=>start===end?dateLabel(start):start.slice(0,7)===end.slice(0,7)?`${Number(start.slice(8))}–${dateLabel(end)}`:`${dateLabel(start,start.slice(0,4)!==end.slice(0,4))} — ${dateLabel(end,start.slice(0,4)!==end.slice(0,4))}`).join(' · ');
}

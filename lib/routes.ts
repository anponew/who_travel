import {uid,applyCityPeriods,type Trip} from './model';
import {putFile,removeFile} from './storage';
type Backup={version:1;trips:Trip[];blobs:Record<string,string>};
const mime=['application/pdf','image/png','image/jpeg','image/webp','image/gif'];
function assert(ok:unknown):asserts ok{if(!ok)throw Error('Некорректный файл маршрута WHO Travel.');}
function text(v:unknown){return typeof v==='string'&&v.length<=100000;}
function date(v:unknown){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(+new Date(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function validateBackup(value:unknown):Backup{
assert(value&&typeof value==='object');const b=value as Backup;assert(b.version===1&&Array.isArray(b.trips)&&b.trips.length<=100&&b.blobs&&typeof b.blobs==='object');
for(const t of b.trips){assert(t&&text(t.id)&&text(t.title)&&typeof t.yearConfirmed==='boolean'&&Array.isArray(t.days)&&t.days.length>0&&t.days.length<=366&&Array.isArray(t.places)&&Array.isArray(t.hotels)&&Array.isArray(t.flights)&&Array.isArray(t.files));
if(t.cityPeriods!==undefined){assert(Array.isArray(t.cityPeriods));t.cityPeriods.forEach(p=>assert(p&&text(p.city)&&date(p.start)&&date(p.end)));try{applyCityPeriods(structuredClone(t),t.cityPeriods);}catch{assert(false);}}
const ids=new Set<string>();const add=(id:string)=>{assert(text(id)&&id.length>0&&!ids.has(id));ids.add(id);};add(t.id);
for(const [i,d] of t.days.entries()){assert(d&&date(d.date)&&text(d.title)&&text(d.city)&&Array.isArray(d.notes)&&(d.cities===undefined||Array.isArray(d.cities)&&d.cities.every(text)));if(i)assert(+new Date(d.date)- +new Date(t.days[i-1].date)===86400000);add(d.id);for(const n of d.notes){assert(n&&text(n.text));add(n.id);}}
for(const p of t.places){assert(p&&text(p.name)&&text(p.city)&&text(p.note)&&text(p.link)&&text(p.time)&&['place','food','transport'].includes(p.kind)&&(p.dayId===null||t.days.some(d=>d.id===p.dayId)));add(p.id);assert(p.mapLink===undefined||text(p.mapLink));coords(p);}
for(const h of t.hotels){assert(h&&text(h.name)&&text(h.city)&&text(h.address)&&text(h.link)&&date(h.checkin)&&date(h.checkout)&&h.checkout>h.checkin);add(h.id);assert(h.mapLink===undefined||text(h.mapLink));coords(h);}
for(const d of t.days)assert(d.hotelOverride===undefined||d.hotelOverride===null||t.hotels.some(h=>h.id===d.hotelOverride));
for(const f of t.flights){assert(f&&text(f.name)&&text(f.number)&&text(f.departure)&&text(f.arrival)&&text(f.note));assert(f.kind===undefined||['flight','train','bus','car','other'].includes(f.kind));assert(f.dayId===undefined||t.days.some(d=>d.id===f.dayId));assert((f.from===undefined||text(f.from))&&(f.to===undefined||text(f.to)));add(f.id);}
for(const f of t.files){assert(f&&text(f.name)&&text(f.filename)&&mime.includes(f.type)&&Number.isInteger(f.size)&&f.size>=0&&f.size<=20*1024*1024&&[...t.days,...t.hotels,...t.flights].some(x=>x.id===f.ownerId));add(f.id);const data=b.blobs[f.id];assert(typeof data==='string'&&data.length<29*1024*1024&&data.startsWith('data:'+f.type+';base64,'));}
}return b;
}
function coords(p:{lat?:number;lng?:number}){assert((p.lat===undefined&&p.lng===undefined)||(typeof p.lat==='number'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&typeof p.lng==='number'&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180));}
export async function importRoute(file:File,existing:Trip[]){if(file.size>200*1024*1024)throw Error('Файл слишком большой: максимум 200 МБ.');const b=validateBackup(JSON.parse(await file.text()));const next=structuredClone(b.trips),written:string[]=[];try{for(const t of next){const map=new Map<string,string>();for(const x of [t,...t.days,...t.places,...t.hotels,...t.flights,...t.files,...t.days.flatMap(d=>d.notes)])map.set(x.id,uid());for(const d of t.days){d.id=map.get(d.id)!;d.notes.forEach(n=>n.id=map.get(n.id)!);if(d.hotelOverride)d.hotelOverride=map.get(d.hotelOverride)!;}for(const p of t.places){p.id=map.get(p.id)!;if(p.dayId)p.dayId=map.get(p.dayId)!;}for(const h of t.hotels)h.id=map.get(h.id)!;for(const f of t.flights){f.id=map.get(f.id)!;if(f.dayId)f.dayId=map.get(f.dayId)!;}for(const f of t.files){const original=f.id;f.id=map.get(f.id)!;f.ownerId=map.get(f.ownerId)!;const base64=b.blobs[original].split(',')[1];const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));assert(bytes.length===f.size);await putFile(f.id,new Blob([bytes],{type:f.type}));written.push(f.id);}t.id=map.get(t.id)!;}return [...existing,...next];}catch(e){await Promise.all(written.map(removeFile));throw e;}}

export function routeFile(trip:Trip){const t=structuredClone(trip);t.files=[];t.days.forEach(d=>d.notes=[]);t.flights.forEach(f=>f.note='');return new Blob([JSON.stringify({version:1,trips:[t],blobs:{}})],{type:'application/json'});}

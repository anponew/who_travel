import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrip,type Trip} from '../lib/model';
import {dayPlan,reorderDayPlan,normalizeDayPlans} from '../lib/day-plan';
import {itineraryHtml} from '../lib/export';
import {importRoute,routeFile,validateBackup} from '../lib/routes';

function fixture():Trip{
  const t=createTrip('Переезды','2026-12-03','2026-12-04'),dayId=t.days[0].id;
  t.flights=[{id:'train1',name:'Первый поезд',number:'',departure:'',arrival:'',note:'',dayId,kind:'train',from:'Хиросима',to:'Химэдзи'},{id:'train2',name:'Второй поезд',number:'',departure:'',arrival:'',note:'',dayId,kind:'train',from:'Химэдзи',to:'Осака'}];
  t.places=[{id:'castle',name:'Замок Химэдзи',city:'Химэдзи',note:'',link:'',time:'',kind:'place',dayId},{id:'lunch',name:'Обед',city:'Химэдзи',note:'',link:'',time:'',kind:'food',dayId}];
  return t;
}

test('legacy plans keep their order; trains and places can be interleaved',()=>{
  const t=fixture(),day=t.days[0];
  assert.deepEqual(dayPlan(t,day).map(x=>x.id),['train1','train2','castle','lunch']);
  reorderDayPlan(t,day.id,'train2','lunch');
  assert.deepEqual(dayPlan(t,day).map(x=>x.id),['train1','castle','lunch','train2']);
  assert.equal(t.flights[1].to,'Осака');
  assert.equal(t.places[1].kind,'food');
  const html=itineraryHtml(t);
  assert.ok(html.indexOf('<h3>Хиросима → Химэдзи</h3>')<html.indexOf('<h3>Замок Химэдзи</h3>'));
  assert.ok(html.indexOf('<h3>Замок Химэдзи</h3>')<html.indexOf('<h3>Обед</h3>'));
  assert.ok(html.indexOf('<h3>Обед</h3>')<html.indexOf('<h3>Химэдзи → Осака</h3>'));
});

test('normalization removes deleted or moved items and appends additions',()=>{
  const t=fixture(),day=t.days[0];reorderDayPlan(t,day.id,'train2','lunch');
  t.places[0].dayId=t.days[1].id;t.flights=t.flights.filter(f=>f.id!=='train1');
  t.places.push({...t.places[1],id:'new',name:'Новое место'});
  normalizeDayPlans(t);
  assert.deepEqual(day.planOrder,['lunch','train2','new']);
  assert.deepEqual(dayPlan(t,t.days[1]).map(x=>x.id),['castle']);
  const before=structuredClone(day.planOrder);reorderDayPlan(t,day.id,'castle','lunch');assert.deepEqual(day.planOrder,before);
});

test('JSON import remaps mixed-plan IDs and preserves their order',async()=>{
  const t=fixture();reorderDayPlan(t,t.days[0].id,'train2','lunch');
  const blob=routeFile(t);
  const [copy]=await importRoute(new File([blob],'route.json',{type:'application/json'}),[]);
  assert.deepEqual(dayPlan(copy,copy.days[0]).map(x=>x.kind==='place'?x.place.name:x.transfer.name),['Первый поезд','Замок Химэдзи','Обед','Второй поезд']);
  assert.ok(copy.days[0].planOrder!.every(id=>!t.days[0].planOrder!.includes(id)));
  const invalid=fixture();invalid.days[0].planOrder=['castle','castle'];
  assert.throws(()=>validateBackup({version:1,trips:[invalid],blobs:{}}));
  invalid.days[0].planOrder=['missing'];assert.throws(()=>validateBackup({version:1,trips:[invalid],blobs:{}}));
});

test('insertion before and after a target matches the drop indicator in both directions',()=>{
  const t=fixture(),d=t.days[0];
  reorderDayPlan(t,d.id,'train2','castle','before');
  assert.deepEqual(dayPlan(t,d).map(x=>x.id),['train1','train2','castle','lunch']);
  reorderDayPlan(t,d.id,'train2','castle','after');
  assert.deepEqual(dayPlan(t,d).map(x=>x.id),['train1','castle','train2','lunch']);
  reorderDayPlan(t,d.id,'lunch','train1','before');
  assert.deepEqual(dayPlan(t,d).map(x=>x.id),['lunch','train1','castle','train2']);
  reorderDayPlan(t,d.id,'lunch','train2','after');
  assert.deepEqual(dayPlan(t,d).map(x=>x.id),['train1','castle','train2','lunch']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrip,dateLabel,dayDateLabel,nightLabel,hotelNightsLabel,cityDatesLabel} from '../lib/model';
import {itineraryHtml} from '../lib/export';
import {translate,translateMessage} from '../lib/translations';

test('English date and count labels use the trip date without timezone shifts',()=>{
  assert.equal(dayDateLabel('2026-12-01',true,'en'),'1 Dec · Tue');
  assert.equal(dateLabel('2026-12-01',false,'ru'),'1 дек.');
  assert.equal(nightLabel(1,'en'),'1 night');assert.equal(nightLabel(7,'en'),'7 nights');
  assert.equal(dayDateLabel('2026-12-01',false,'en'),'1 Dec');
  assert.equal(translate('en','Открыть поездку «{0}»',{'0':'Япония'}),'Open trip “Япония”');
  assert.equal(translateMessage('en','Не удалось сохранить: Данные изменены в другой вкладке. Обнови страницу перед сохранением.'),'Could not save: Data was changed in another tab. Reload before saving.');
});

test('export translates fixed UI while preserving arbitrary user content and executable navigation',()=>{
  const trip=createTrip('Мои поездки','2026-12-01','2026-12-03');
  trip.days.forEach(d=>{d.city='User city';d.title='User day';});
  trip.flights=[{id:'train',name:'User train',number:'123',departure:'2026-12-01T09:30',arrival:'',note:'',kind:'train',dayId:trip.days[0].id,from:'A',to:'B'}];
  trip.places=[{id:'p1',name:'User place',city:'User city',note:'User description',link:'https://example.com',time:'',kind:'place',dayId:trip.days[0].id}];
  const html=itineraryHtml(trip,new Date('2026-11-08T12:00:00Z'),'en');
  assert.ok(html.includes('<html lang="en">'));assert.ok(html.includes('<h1>Мои поездки</h1>'));
  assert.ok(html.includes('All cities'));assert.ok(html.includes('Jump to today ↓'));assert.ok(html.includes('User description'));
  const text=html.replaceAll('Мои поездки','');assert.ok(!/[а-яё]/i.test(text),text.match(/.{0,20}[а-яё].{0,40}/i)?.[0]);
  const script=html.split('<script>')[1].split('</script>')[0];assert.doesNotThrow(()=>new Function(script));
  assert.ok(cityDatesLabel(trip,'User city','en').includes('Dec'));
  const hotel={id:'h',name:'Hotel',city:'User city',address:'',link:'',checkin:'2026-12-01',checkout:'2026-12-03'};trip.hotels=[hotel];assert.ok(hotelNightsLabel(trip,hotel,'en').startsWith('2 nights'));
});

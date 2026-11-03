import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import MarkdownNote from '../components/MarkdownNote';
import {routePlaces,googleRouteLinks} from '../lib/maps';
import {createTrip,type Place} from '../lib/model';
import {itineraryHtml} from '../lib/export';

test('notes render Markdown and plain URLs without executing HTML or unsafe links',()=>{
  const html=renderToStaticMarkup(createElement(MarkdownNote,{text:'**Важно**\n[Экскурсия](https://example.com/tour)\nhttps://example.com/long?query=123\n\n- Билет\n\n[Опасная](javascript:alert%281%29)\n<script>alert(1)</script>'}));
  assert.ok(html.includes('<strong>Важно</strong>'));
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<br'));
  assert.ok(html.includes('href="https://example.com/tour"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('<script>'));
});

test('food is excluded from day routes but keeps its individual map link in HTML',()=>{
  const trip=createTrip('Маршрут','2027-01-01','2027-01-02');
  const place=(id:string,kind:Place['kind']):Place=>({id,name:id,kind,city:'Токио',note:'',time:'',link:'',mapLink:'https://www.google.com/maps/search/?api=1&query='+id,dayId:trip.days[0].id});
  trip.places=[place('Temple','place'),place('Cafe','food'),place('Garden','place')];
  const urls=googleRouteLinks(routePlaces(trip.places));
  assert.equal(urls.length,1);
  assert.ok(!urls[0].includes('Cafe'));
  const html=itineraryHtml(trip);
  assert.ok(html.includes('query=Cafe'));
  for(const match of html.matchAll(/href="([^"]*\/maps\/dir\/[^\"]*)"/g))assert.ok(!match[1].includes('Cafe'));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tripFormErrors} from '../lib/trip-form';

test('new trips reject past starts but existing trips can retain historical dates',()=>{
  assert.ok(tripFormErrors('Trip','2026-11-10','2026-11-15',[],'2026-11-13').start);
  assert.deepEqual(tripFormErrors('Trip','2026-11-10','2026-11-15',[]),{});
});
test('city dates follow route order and allow shared transfer days and same-day visits',()=>{
  const rows=[{city:'A',start:'2026-11-20',end:'2026-11-22'},{city:'B',start:'2026-11-22',end:'2026-11-22'},{city:'C',start:'2026-11-22',end:'2026-11-25'}];
  assert.deepEqual(tripFormErrors('Trip','2026-11-20','2026-11-25',rows),{});
  rows[1].start='2026-11-21';
  assert.ok(tripFormErrors('Trip','2026-11-20','2026-11-25',rows)['arrival-1']);
});
test('missing cities, inverted ranges and dates outside the trip have field errors',()=>{
  const errors=tripFormErrors('','2026-11-20','2026-11-25',[{city:'A',start:'2026-11-20',end:'2026-11-22'},{city:'',start:'2026-11-26',end:'2026-11-24'}]);
  for(const key of ['title','city-1','arrival-1','departure-1'])assert.ok(errors[key]);
  assert.ok(tripFormErrors('Trip','2026-11-25','2026-11-20',[]).end);
  assert.deepEqual(tripFormErrors('Trip','2026-11-20','2026-11-25',[{city:'',start:'',end:''}]),{});
});

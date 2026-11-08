import {dayForTransfer,type Day,type Flight,type Place,type Trip} from './model';

export type PlanItem={kind:'place';id:string;place:Place}|{kind:'transfer';id:string;transfer:Flight};

/** Older trips keep their existing transfers-first layout until explicitly reordered. */
export function dayPlan(trip:Trip,day:Day):PlanItem[]{
  const items:PlanItem[]=[
    ...trip.flights.filter(f=>dayForTransfer(trip,f)?.id===day.id).map(transfer=>({kind:'transfer' as const,id:transfer.id,transfer})),
    ...trip.places.filter(p=>p.dayId===day.id).map(place=>({kind:'place' as const,id:place.id,place})),
  ];
  const remaining=new Map(items.map(item=>[item.id,item]));
  const ordered:PlanItem[]=[];
  for(const id of day.planOrder??[]){const item=remaining.get(id);if(item){ordered.push(item);remaining.delete(id);}}
  return [...ordered,...remaining.values()];
}

export function reorderDayPlan(trip:Trip,dayId:string,id:string,targetId:string,placement?:'before'|'after'){
  const day=trip.days.find(d=>d.id===dayId);
  if(!day)return;
  const ids=dayPlan(trip,day).map(item=>item.id),from=ids.indexOf(id),to=ids.indexOf(targetId);
  if(from<0||to<0||from===to)return;
  const [moved]=ids.splice(from,1);
  const insert=placement?ids.indexOf(targetId)+(placement==='after'?1:0):to;
  ids.splice(insert,0,moved);
  day.planOrder=ids;
}

/** Drop deleted/moved records and append newly added records without disturbing the plan. */
export function normalizeDayPlans(trip:Trip){
  for(const day of trip.days)if(day.planOrder)day.planOrder=dayPlan(trip,day).map(item=>item.id);
}

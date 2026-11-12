import {validDate, type CityPeriod} from './model';

export function tripFormErrors(title:string,start:string,end:string,periods:CityPeriod[],earliest=''){
  const errors:Record<string,string>={};
  if(!title.trim())errors.title='Укажи название поездки.';
  if(!validDate(start))errors.start='Укажи дату начала.';
  else if(earliest&&start<earliest)errors.start='Начало поездки не может быть раньше сегодняшнего дня.';
  if(!validDate(end))errors.end='Укажи дату окончания.';
  else if(validDate(start)&&end<start)errors.end='Конец поездки не может быть раньше начала.';
  else if(validDate(start)&&(+new Date(end)- +new Date(start))/86400000>365)errors.end='Поездка может длиться не более 366 дней.';
  periods.forEach((p,i)=>{
    if(periods.length===1&&!p.city.trim())return;
    if(!p.city.trim())errors[`city-${i}`]='Укажи город.';
    if(!validDate(p.start))errors[`arrival-${i}`]='Укажи дату приезда.';
    else if(p.start<start||p.start>end)errors[`arrival-${i}`]='Укажи даты города в пределах поездки.';
    else if(i>0&&validDate(periods[i-1].end)&&p.start<periods[i-1].end)errors[`arrival-${i}`]='Приезд не может быть раньше выезда из предыдущего города.';
    if(!validDate(p.end))errors[`departure-${i}`]='Укажи дату выезда.';
    else if(p.end<p.start)errors[`departure-${i}`]='Выезд не может быть раньше приезда.';
    else if(p.end>end||p.end<start)errors[`departure-${i}`]='Укажи даты города в пределах поездки.';
  });
  return errors;
}

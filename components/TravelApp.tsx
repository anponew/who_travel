'use client';
import {useI18n,LanguageSwitch} from './I18n';
import {useEffect, useRef, useState} from 'react';
import {createTrip,applyCityPeriods,citiesForDay,resizeTrip,hotelForDay,movePlace,nights,saveHotel,safeLink,uid,type Trip,type Place,type Hotel,type Attachment} from '@/lib/model';
import {download, downloadItinerary} from '@/lib/export';
import {importRoute, routeFile} from '@/lib/routes';

const emptyTrip: Trip = {
    id: '',
    title: '',
    yearConfirmed: true,
    days: [{id: '', date: '2000-01-01', title: '', city: '', notes: []}],
    places: [],
    hotels: [],
    flights: [],
    files: []
};
import {stageAttachmentFiles, readTrips, removeFile, writeTrips} from '@/lib/storage';
import Editor, {type Edit} from './Editor';
import Files from './Files';
import ConfirmAction from './ConfirmAction';
import SavedPlaceCard from './SavedPlaceCard';
import ActionIcon from './ActionIcon';
import ReorderHandle from './ReorderHandle';
import SwipeDelete from './SwipeDelete';
import PlanList from './PlanList';
import LoadingTrips from './LoadingTrips';
import IdeaIcon from './IdeaIcon';
import MarkdownNote from './MarkdownNote';
import UndoNotice,{type UndoAction} from './UndoNotice';
import {localToday} from '@/lib/today';
import {dayPlan,reorderDayPlan,normalizeDayPlans,type PlanItem} from '@/lib/day-plan';
import TripOverview, {TransferDetails} from './TripOverview';
import {mapHref, isMapLink, googleRouteLinks, routePlaces} from '@/lib/maps';

export default function TravelApp() {
const {tr,message,language,dayCountLabel,dateLabel,dayDateLabel,nightLabel,placeLabel,hotelNightsLabel,cityDatesLabel}=useI18n();

    const routeInput = useRef<HTMLInputElement>(null);
    const settingsRef=useRef<HTMLElement>(null);
    const [importHelp,setImportHelp]=useState(false);
    const latestTrips = useRef<Trip[]>([]);
    const saveQueue = useRef<Promise<void>>(Promise.resolve());
    const [undo,setUndo]=useState<UndoAction|null>(null);
    const [today,setToday]=useState('');
    useEffect(()=>{const refresh=()=>setToday(localToday());refresh();const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);

    const [trips, setTrips] = useState<Trip[]>([]), [ready, setReady] = useState(false), [tripId, setTripId] = useState<string | null>(null), [dayId, setDayId] = useState(''), [area, setArea] = useState('route'), [tab, setTab] = useState('days'), [dayTab, setDayTab] = useState('plan'), [edit, setEdit] = useState<Edit | null>(null), [status, setStatus] = useState(''), [fatal, setFatal] = useState(''), [picker, setPicker] = useState(false), [settings, setSettings] = useState(false), [sharing, setSharing] = useState(false), [cityFilter, setCityFilter] = useState<string | null>(null);
    useEffect(()=>{if(settings)settingsRef.current?.scrollIntoView({block:'center',behavior:'smooth'});},[settings]);
    useEffect(() => {
        let active = true;
        readTrips().then(async saved => {
            const data = (saved ?? []).filter(t => t.id !== 'japan-example');
            for (const t of data) for (const p of [...t.places, ...t.hotels]) if (p.mapLink === undefined && isMapLink(p.link)) p.mapLink = p.link;
            if (!active) return;
            if (saved && data.length !== saved.length) await writeTrips(data);
            if (active) {
                latestTrips.current = data;
                setTrips(data);
                setReady(true);
            }
        }).catch(() => {
            if (active) setFatal(tr("Не удалось открыть хранилище браузера. Разреши хранение данных для этого сайта и обнови страницу."));
        });
        return () => {
            active = false;
        };
    }, []);
    useEffect(() => {
        if (!status) return;
        const timer = setTimeout(() => setStatus(''), /^(Не удалось|Could not|Unable to)/.test(status) ? 9000 : status==='Сохранено ✓' ? 2200 : 4000);
        return () => clearTimeout(timer);
    }, [status]);
    const trip = trips.find(t => t.id === tripId) ?? trips[0] ?? emptyTrip,
        day = trip?.days.find(d => d.id === dayId) ?? trip?.days[0];

    function persist(update: (current: Trip[]) => Trip[], message = '') {
        const task = saveQueue.current.then(async () => {
            const next = update(structuredClone(latestTrips.current));
            next.forEach(normalizeDayPlans);
            await writeTrips(next);
            latestTrips.current = next;
            setTrips(next);
            setStatus(message);
        });
        saveQueue.current = task.catch(() => {
        });
        return task;
    }

    async function change(fn: (t: Trip) => void, message?: string) {
        const id = trip.id;
        await persist(current => {
            const target = current.find(t => t.id === id);
            if (!target) throw Error(tr("Поездка уже удалена."));
            fn(target);
            return current;
        }, message);
    }

    async function deletePlanItem(kind:'place'|'note',itemId:string){
        const targetTripId=trip.id;
        let restoreItem:((t:Trip)=>void)|undefined;
        await change(t=>{
            if(kind==='place'){
                const index=t.places.findIndex(p=>p.id===itemId),item=t.places[index];
                const owner=item?.dayId?t.days.find(d=>d.id===item.dayId):undefined;
                const planIndex=owner?dayPlan(t,owner).findIndex(entry=>entry.id===itemId):-1;
                if(!item)return;
                t.places.splice(index,1);
                restoreItem=target=>{if(item.dayId&&!target.days.some(d=>d.id===item.dayId))throw Error(tr("День уже удалён."));if(!target.places.some(p=>p.id===item.id))target.places.splice(Math.min(index,target.places.length),0,item);if(owner?.planOrder&&planIndex>=0){const d=target.days.find(d=>d.id===owner.id)!;const ids=dayPlan(target,d).map(entry=>entry.id).filter(id=>id!==item.id);ids.splice(Math.min(planIndex,ids.length),0,item.id);d.planOrder=ids;}};
            }else{
                const owner=t.days.find(d=>d.notes.some(n=>n.id===itemId));
                if(!owner)return;
                const index=owner.notes.findIndex(n=>n.id===itemId),item=owner.notes[index];
                owner.notes.splice(index,1);
                restoreItem=target=>{const d=target.days.find(d=>d.id===owner.id);if(!d)throw Error(tr("День уже удалён."));if(!d.notes.some(n=>n.id===item.id))d.notes.splice(Math.min(index,d.notes.length),0,item);};
            }
        });
        if(restoreItem){const restore=restoreItem;setUndo({id:uid(),label:kind==='note'?tr("Заметка удалена"):tr("Место удалено"),restore:()=>persist(current=>{const target=current.find(t=>t.id===targetTripId);if(!target)throw Error(tr("Поездка уже удалена."));restore(target);return current;})});}
    }

    const run = (fn: () => Promise<void>) => {
        void fn().catch(e => setStatus(tr("Не удалось сохранить: ") + (e as Error).message));
    };

    function openTrip(t: Trip) {
        setTripId(t.id);
        setDayId(t.days[0].id);
        setArea('route');
        setTab('days');
        setDayTab('plan');
        setEdit(null);
        setPicker(false);
        setSharing(false);
        setCityFilter(null);
    }

    function openEdit(e: Edit) {
        setStatus('');
        setEdit(e);
    }

    async function save(data: Record<string, string>, files: File[]) {
        if (!edit) return;
        if (edit.kind === 'trip') {
            const t = createTrip(data.title, data.start, data.end);
            if(language==='en')t.days.forEach(d=>d.title=tr('Новый день'));
            applyCityPeriods(t, JSON.parse(data.periods));
            await persist(current => [...current, t]);
            openTrip(t);
            setStatus('Сохранено ✓');
            return;
        }
        if (edit.kind === 'flight') {
            if (!data.name && (!data.from || !data.to)) throw Error(tr("Укажи откуда и куда едешь или название переезда."));
            const departureDay = data.departure ? trip.days.find(d => d.date === data.departure.slice(0, 10)) : undefined;
            if (data.departure && !departureDay) throw Error(tr("Дата отправления должна быть в пределах поездки."));
            if (departureDay && departureDay.id !== data.dayId) throw Error(tr("День отправления и дата отправления должны совпадать."));
            const transfer: Trip['flights'][number] = {
                id: edit.id ?? uid(),
                name: data.name || [data.from, data.to].filter(Boolean).join(' → '),
                number: data.number,
                departure: data.departure,
                arrival: data.arrival,
                note: data.note,
                from: data.from,
                to: data.to,
                dayId: departureDay?.id ?? data.dayId,
                kind: data.transferKind as NonNullable<Trip['flights'][number]['kind']>
            };
            const attachments = await stageAttachmentFiles(transfer.id, files);
            try {
                await change(t => {
                    t.flights = edit.id ? t.flights.map(f => f.id === edit.id ? transfer : f) : [...t.flights, transfer];
                    t.files.push(...attachments);
                });
            } catch (error) {
                await Promise.all(attachments.map(file => removeFile(file.id)));
                throw error;
            }
            setEdit(null);
            setStatus('Сохранено ✓');
            return;
        }
        if (edit.kind === 'upload') {
            if (!files.length) throw Error(tr("Выбери файл."));
            const added = await stageAttachmentFiles(edit.ownerId ?? day.id, files, data.name);
            try {
                await change(t => {
                    t.files.push(...added);
                });
            } catch (error) {
                await Promise.all(added.map(file => removeFile(file.id)));
                throw error;
            }
        } else await change(t => {
            const d = t.days.find(d => d.id === day.id)!;
            switch (edit.kind) {
                case 'day':
                    d.title = data.title;
                    if (d.city !== data.city) {
                        const oldCity = d.city;
                        d.cities = [...new Set([...citiesForDay(d).filter(c => c && c !== oldCity), data.city].filter(Boolean))];
                        d.city = data.city;
                        delete t.cityPeriods;
                    }
                    break;
                case 'place':
                case 'idea':
                case 'food': {
                    const p: Place = {
                        id: edit.id ?? uid(),
                        name: data.name,
                        note: data.note,
                        link: data.link,
                        time: data.time,
                        city: data.city || (data.dayId ? t.days.find(d => d.id === data.dayId)!.city : ''),
                        dayId: data.dayId || null,
                        kind: data.kind as Place['kind'],
                        source: t.places.find(x => x.id === edit.id)?.source ?? (edit.kind === 'idea' ? 'idea' : undefined),
                        mapLink: data.mapLink,
                        lat: t.places.find(x => x.id === edit.id)?.lat,
                        lng: t.places.find(x => x.id === edit.id)?.lng
                    };
                    t.places = edit.id ? t.places.map(x => x.id === edit.id ? p : x) : [...t.places, p];
                    break;
                }
                case 'hotel': {
                    if (data.checkout <= data.checkin) throw Error(tr("Выезд должен быть позже заезда."));
                    const h: Hotel = {
                        id: edit.id ?? uid(),
                        name: data.name,
                        city: data.city,
                        address: data.address,
                        link: data.link,
                        checkin: data.checkin,
                        checkout: data.checkout,
                        mapLink: data.mapLink,
                        lat: t.hotels.find(x => x.id === edit.id)?.lat,
                        lng: t.hotels.find(x => x.id === edit.id)?.lng
                    };
                    saveHotel(t, h);
                    if (edit.fromSleep) d.hotelOverride = h.id;
                    break;
                }
                case 'sleep':
                    if (data.hotel === 'auto') delete d.hotelOverride; else d.hotelOverride = data.hotel || null;
                    break;
                case 'note':
                    if (edit.id) d.notes = d.notes.map(n => n.id === edit.id ? {
                        ...n,
                        text: data.text
                    } : n); else d.notes.push({id: uid(), text: data.text});
                    break;
                case 'cities': {
                    resizeTrip(t, data.start, data.end);
                    if(language==='en')t.days.forEach(d=>d.title=tr('Новый день'));
            applyCityPeriods(t, JSON.parse(data.periods));
                    t.title = data.title;
                    setCityFilter(null);
                    break;
                }
                case 'year': {
                    const y = Number(data.year);
                    if (!Number.isInteger(y) || y < 1900 || y > 2200) throw Error(tr("Укажи год от 1900 до 2200."));
                    const delta = y - Number(t.days[0].date.slice(0, 4));
                    const shift = (date: string) => {
                        const next = String(Number(date.slice(0, 4)) + delta) + date.slice(4);
                        if (new Date(next + 'T12:00:00Z').toISOString().slice(0, 10) !== next) throw Error(tr("В выбранном году нет такой даты."));
                        return next;
                    };
                    t.days.forEach(d => d.date = shift(d.date));
                    t.hotels.forEach(h => {
                        h.checkin = shift(h.checkin);
                        h.checkout = shift(h.checkout);
                    });
                    if (t.cityPeriods) t.cityPeriods = t.cityPeriods.map(p => ({
                        ...p,
                        start: shift(p.start),
                        end: shift(p.end)
                    }));
                    t.flights.forEach(f => {
                        if (f.departure) f.departure = shift(f.departure.slice(0, 10)) + f.departure.slice(10);
                        if (f.arrival) f.arrival = shift(f.arrival.slice(0, 10)) + f.arrival.slice(10);
                    });
                    t.yearConfirmed = true;
                    break;
                }
            }
        });
        setEdit(null);
        setStatus('Сохранено ✓');
    }

    async function deleteOwnedItem(kind:'hotel'|'flight',id:string){
        const fileIds=trip.files.filter(file=>file.ownerId===id).map(file=>file.id);
        await change(t=>{
            if(kind==='hotel'){t.hotels=t.hotels.filter(h=>h.id!==id);t.days.forEach(d=>{if(d.hotelOverride===id)delete d.hotelOverride;});}
            else t.flights=t.flights.filter(f=>f.id!==id);
            t.files=t.files.filter(file=>file.ownerId!==id);
        });
        await Promise.all(fileIds.map(removeFile));
    }

    function filesFor(ownerId: string, showAdd = true) {
        return <Files showAdd={showAdd} files={trip.files.filter(f => f.ownerId === ownerId)}
                      onAdd={() => openEdit({kind: 'upload', ownerId})} onRemove={async id => {
            await change(t => {
                t.files = t.files.filter(f => f.id !== id);
            });
            await removeFile(id);
        }}/>;
    }

    function planHandle(item:PlanItem,index:number,list:PlanItem[]){
        if(list.length<2)return null;
        const name=item.kind==='place'?item.place.name:item.transfer.name||`${item.transfer.from} → ${item.transfer.to}`;
        return <ReorderHandle id={item.id} name={name} previous={list[index-1]?.id} next={list[index+1]?.id}
            onMove={(target,placement)=>run(()=>change(t=>reorderDayPlan(t,day.id,item.id,target,placement)))}/>;
    }
    function placeCard(p:Place,index:number,list:PlanItem[]){
        return <SwipeDelete key={p.id} label={p.source==='idea'?tr("Вернуть в идеи"):tr("Удалить")} returnToIdeas={p.source==='idea'}><article className="event" id={'place-'+p.id} data-reorder-id={p.id}>
            {planHandle({kind:'place',id:p.id,place:p},index,list)}{p.time&&<time>{p.time}</time>}
                <div className="event-main">
                    <div className="event-heading">
                        <button className="place-name" onClick={() => {
                            openEdit({kind: p.dayId ? 'place' : 'idea', id: p.id});
                        }}>{p.name}</button>
                        {p.kind === 'food' && <span className="place-kind">{tr("Еда")}</span>}</div>
                    {p.note && <p className="muted prewrap">{p.note}</p>}
                    <div className="place-links">{mapHref(p) &&
                        <a className="map-link" href={mapHref(p)} target="_blank" rel="noreferrer">{tr("Показать на карте ↗")}</a>}{safeLink(p.link) &&
                        <a href={safeLink(p.link)} target="_blank" rel="noreferrer">{tr("Ссылка ↗")}</a>}</div>
                </div>
                <div className="event-actions"><ConfirmAction iconOnly icon={p.source === 'idea' ? 'return' : 'delete'}
                                                              label={p.source === 'idea' ? tr("Вернуть в идеи") : tr("Удалить место")}
                                                              question={p.source === 'idea' ? tr("Убрать «") + p.name + tr("» из дня и вернуть в идеи?") : tr("Удалить «") + p.name + tr("» навсегда?")}
                                                              confirmLabel={p.source === 'idea' ? tr("Вернуть в идеи") : tr("Удалить")}
                                                              onConfirm={() => p.source === 'idea' ? change(t => movePlace(t,p.id,null)) : deletePlanItem('place',p.id)}/>
                    <button className="icon-button" title={tr("Редактировать ") + p.name}
                            aria-label={tr("Редактировать ") + p.name}
                            onClick={() => openEdit({kind: p.dayId ? 'place' : 'idea', id: p.id})}><ActionIcon
                        kind="edit"/></button>
                </div>
            </article></SwipeDelete>;}
            if(fatal)return <main><p role="alert">{message(fatal)}</p></main>;
            if(!ready)return <LoadingTrips/>;
            const cities=[...new
            Set(trip.days.flatMap(citiesForDay))],allCities=cityFilter===null||!cities.includes(cityFilter),currentCity=cityFilter!==null&&cities.includes(cityFilter)?cityFilter:(citiesForDay(day).includes(day.city)?day.city:citiesForDay(day)[0]??''),ideas=trip.places.filter(p=>!p.dayId&&p.kind!=='food'),food=trip.places.filter(p=>p.kind==='food'),available=trip.places.filter(p=>!p.dayId),hotels=trip.hotels.filter(h=>allCities||h.city===currentCity),plan=dayPlan(trip,day),items=plan.flatMap(item=>item.kind==='place'?[item.place]:[]),hotel=hotelForDay(trip,day),todayDay=trip.yearConfirmed?trip.days.find(d=>d.date===today):undefined,last=day.id===trip.days.at(-1)?.id;
            return <main className="app-shell">
                <header className="app-header">
                    <div className="header-right"><LanguageSwitch/></div>
                </header>
                {edit ? <Editor contextCity={currentCity} key={`${edit.kind}-${edit.id ?? ''}-${edit.focus ?? ''}`}
                                edit={edit} trip={trip} day={day}
                                onRemoveFromDay={edit.id && trip.places.some(p => p.id === edit.id && p.dayId && p.source === 'idea') ? async () => {
                                    await change(t => movePlace(t, edit.id!, null));
                                    setEdit(null);
                                } : undefined} onCancel={() => setEdit(edit.fromSleep ? {kind: 'sleep'} : null)}
                                onCreateHotel={() => openEdit({kind: 'hotel', fromSleep: true})}
                                onDelete={edit.id && !trip.places.some(p => p.id === edit.id && p.dayId && p.source === 'idea') && ['place', 'idea', 'food', 'hotel', 'note', 'flight'].includes(edit.kind) ? async () => {
                                    if(['place','idea','food','note'].includes(edit.kind)){await deletePlanItem(edit.kind==='note'?'note':'place',edit.id!);setEdit(null);return;}
                                    const fileIds = trip.files.filter(f => f.ownerId === edit.id).map(f => f.id);
                                    await change(t => {
                                        t.places = t.places.filter(p => p.id !== edit.id);
                                        t.hotels = t.hotels.filter(h => h.id !== edit.id);
                                        t.flights = t.flights.filter(f => f.id !== edit.id);
                                        t.files = t.files.filter(f => f.ownerId !== edit.id);
                                        t.days.forEach(d => {
                                            if (d.hotelOverride === edit.id) delete d.hotelOverride;
                                            d.notes = d.notes.filter(n => n.id !== edit.id);
                                        });
                                    });
                                    await Promise.all(fileIds.map(removeFile));
                                    setEdit(null);
                                } : undefined} onSave={save}/> : !tripId ? <>
                    <div className="page-heading row">
                        <div>
                            <div className="eyebrow">{tr("✈ МОИ ПУТЕШЕСТВИЯ")}</div>
                            <h1>{tr("Мои поездки")}</h1></div>
                        <div className="home-tools">
                            <button className="primary" onClick={() => openEdit({kind: 'trip'})}>{tr("+ Создать поездку")} </button>
                            <div className="import-control"><button type="button" className="secondary import-route-button"
                                    onClick={() => routeInput.current?.click()}>{tr("Импортировать маршрут")} </button>
                            <button type="button" className="import-help-button" aria-label={tr('Как импортировать маршрут')} title={tr('Как импортировать маршрут')} aria-expanded={importHelp} aria-controls="import-help" onClick={()=>setImportHelp(!importHelp)}>?</button></div>
                            <input ref={routeInput} className="hidden-file-input" aria-label={tr("Открыть маршрут из файла")}
                                   type="file" accept="application/json,.json" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) run(async () => {
                                    const restored = await importRoute(file, []);
                                    try {
                                        await persist(current => [...current, ...restored], tr("Маршрут добавлен."));
                                    } catch (error) {
                                        await Promise.all(restored.flatMap(t => t.files).map(f => removeFile(f.id)));
                                        throw error;
                                    }
                                    openTrip(restored.at(-1)!);
                                });
                                e.currentTarget.value = '';
                            }}/></div>
                    </div>
                    {importHelp&&<section className="import-help" id="import-help"><div className="row"><h2>{tr('Как импортировать маршрут')}</h2><button className="icon-button" aria-label={tr('Закрыть инструкцию')} onClick={()=>setImportHelp(false)}>×</button></div><ol><li>{tr('Попроси друга открыть поездку в who travel и нажать «Поделиться маршрутом».')}</li><li>{tr('Нужен файл из пункта «Скачать для редактирования в who travel» — он заканчивается на .json.')}</li><li>{tr('Нажми «Импортировать маршрут» и выбери этот файл. Поездка появится в твоём списке отдельной копией.')}</li></ol><p>{tr('HTML-файл предназначен для просмотра и не подходит для импорта. Документы и личные заметки дня в файл для редактирования не входят.')}</p><p>{tr('Копии не синхронизируются. Чтобы передать изменения, нужно выгрузить и отправить новый файл.')}</p></section>}
                    <div className="trip-grid">{!trips.length &&
                        <div className="empty empty-home"><span className="empty-icon">✈</span><h2>{tr("Куда отправимся?")}</h2>
                            <p className="muted">{tr("Создай поездку и добавь в неё свои планы.")}</p></div>}{trips.map(t =>
                        <SwipeDelete key={t.id} label={tr("Удалить")}><article className="trip-card">
                            <button className="trip-card-open" aria-label={tr("Открыть поездку «{0}»",{"0":(t.title)})} onClick={() => openTrip(t)}>
                                <div className="trip-card-top"><span className="trip-icon">{'✈'}</span><span
                                    className="muted">{dayCountLabel(t.days.length)} · {nightLabel(t.days.length - 1)}</span>
                                </div>
                                <h2>{t.title}</h2>
                                <p>{dateLabel(t.days[0].date, t.yearConfirmed)} — {dateLabel(t.days.at(-1)!.date, t.yearConfirmed)}</p>
                                <div className="trip-card-bottom">
                                    <span>{t.yearConfirmed ? [...new Set(t.days.map(d => d.city))].filter(Boolean).join(' · ') || tr("Маршрут ждёт идей") : tr("Год не указан")}</span><span className="trip-card-arrow">{tr("Открыть")}</span>
                                </div>
                            </button>
                            <div className="trip-card-delete"><ConfirmAction label={tr("Удалить поездку")}
                                                                             question={tr("Удалить поездку и её файлы?")}
                                                                             onConfirm={async () => {
                                                                                 await persist(current => current.filter(x => x.id !== t.id), tr("Поездка удалена."));
                                                                                 await Promise.all(t.files.map(f => removeFile(f.id)));
                                                                             }}/></div>
                        </article></SwipeDelete>)}</div>
                </> : <>
                    <button className="back" onClick={() => setTripId(null)}>{tr("← Мои поездки")}</button>
                    <div className="row trip-heading">
                        <div><h1>{trip.title}</h1>
                            <div
                                className="muted">{dateLabel(trip.days[0].date, trip.yearConfirmed)} — {dateLabel(trip.days.at(-1)!.date, trip.yearConfirmed)}
                                <span className="dot-separator">·</span> {dayCountLabel(trip.days.length)} </div>
                        </div>
                        <div className="trip-tools">
                            <button className="primary share-route-button"
                                    onClick={() => setSharing(!sharing)}>{tr("Поделиться маршрутом ↗")} </button>
                            <button onClick={() => openEdit({kind: 'cities'})}>{tr("Настроить поездку")}</button>
                        </div>
                    </div>
                    {sharing && <section className="share-panel sheet">
                        <div className="row"><h3>{tr("Отправить маршрут друзьям")}</h3>
                            <button onClick={() => setSharing(false)}>{tr("Закрыть")}</button>
                        </div>
                        <p className="muted">{tr("Без документов и личных заметок дня. Описания мест и названия отелей включены.")}</p>
                        <div className="row">
                            <button className="outline" onClick={() => downloadItinerary(trip,language)}>{tr("Скачать маршрут для просмотра")} </button>
                            <button onClick={() => download(routeFile(trip), 'who-travel-route.json')}>{tr("Скачать для редактирования в who travel")} </button>
                        </div>
                        <p className="muted">{tr("HTML-файл содержит фильтр по городам, планы дней и ссылки на маршруты в Google Maps. JSON открывается через «Импортировать маршрут» на главной who travel. У друга будет своя редактируемая копия.")}</p></section>}
                    <nav className="main-nav"
                         aria-label={tr("Вся поездка")}>{[['route', tr("Маршрут")], ['ideas', tr("Идеи")], ['food', tr("Еда")], ['overview', tr("Обзор поездки")]].map(([v, label]) =>
                        <button key={v} aria-pressed={area === v} onClick={() => {
                            setArea(v);
                        }}>{label}{v === 'ideas' && ` · ${ideas.length}`}{v === 'food' && ` · ${food.length}`}</button>)}</nav>
                    {area === 'route' && <>
                        <nav className="cities" aria-label={tr("Города поездки")}><button aria-pressed={allCities} onClick={() => {setCityFilter(null);setPicker(false);}}>{tr("Все города")}</button>{cities.map(c => <button key={c}
                                                                                                     title={cityDatesLabel(trip, c)}
                                                                                                     aria-label={`${c || tr("Без города")} · ${nightLabel(nights(trip, c))} · ${cityDatesLabel(trip, c)}`}
                                                                                                     aria-pressed={!allCities && currentCity === c}
                                                                                                     onClick={() => {
                                                                                                         setCityFilter(c);
                                                                                                         setDayId(trip.days.find(d => citiesForDay(d).includes(c))!.id);
                                                                                                         setPicker(false);
                                                                                                     }}>{c || tr("Без города")}
                            <span>· {nightLabel(nights(trip, c))}</span></button>)}</nav>
                        <p className="city-dates" aria-hidden={allCities}>{!allCities&&<>{currentCity || tr("Без города")} · {cityDatesLabel(trip, currentCity)}</>}</p>
                        {todayDay&&<div className="today-tools"><button className="today-button" onClick={()=>{setCityFilter(null);setTab('days');setDayTab('plan');setDayId(todayDay.id);setPicker(false);}}>{tr("К сегодняшнему дню ↓")}</button></div>}
                        <nav className="tabs city-tabs"
                             aria-label={tr("Разделы города")}>{[['days', tr("По дням")], ['hotels', tr("Отели · {0}",{"0":(hotels.length)})]].map(([v, label]) =>
                            <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>{label}</button>)}</nav>
                        {tab === 'days' ? <div className="layout">
                            <nav className="days"
                                 aria-label={tr("Дни поездки")}>{trip.days.filter(d => allCities || citiesForDay(d).includes(currentCity)).map(d =>
                                <button key={d.id} aria-pressed={d.id === day.id} onClick={() => {
                                    setDayId(d.id);
                                    setDayTab('plan');
                                    setPicker(false);
                                }}>{dayDateLabel(d.date, trip.yearConfirmed)}</button>)}</nav>
                            <section className="sheet day-sheet">
                                <div className="row">
                                    <div>
                                        <div
                                            className="eyebrow">{dayDateLabel(day.date, trip.yearConfirmed)} · {citiesForDay(day).filter(Boolean).join(' → ') || tr("Город не указан")}</div>
                                        <h2>{day.title}</h2></div>
                                    <button onClick={() => openEdit({kind: 'day'})}>{tr("Редактировать день")}</button>
                                </div>
                                <nav className="tabs"
                                     aria-label={tr("Разделы дня")}>{[['plan', tr("План")], ['files', tr("Билеты и файлы")]].map(([v, label]) =>
                                    <button key={v} aria-pressed={dayTab === v}
                                            onClick={() => setDayTab(v)}>{label}</button>)}</nav>
                                {dayTab === 'plan' ? <>
                                    <div
                                        className="day-route-links">{googleRouteLinks(routePlaces(items)).map((url, i, list) =>
                                        <a key={url} className="map-link" href={url} target="_blank"
                                           rel="noreferrer">{list.length > 1 ? tr("Маршрут дня в Google Maps · часть {0}",{"0":(i + 1)}) : tr("Маршрут дня в Google Maps")} ↗</a>)}</div>
                                    <PlanList>{plan.length?plan.map((entry,index)=>{
                                        if(entry.kind==='place')return placeCard(entry.place,index,plan);
                                        const f=entry.transfer;
                                        return <SwipeDelete key={f.id} label={tr("Удалить")} question={tr("Удалить эту запись?")} onDelete={()=>deleteOwnedItem('flight',f.id)}><article className="day-transfer" data-reorder-id={f.id}>
                                            {planHandle(entry,index,plan)}
                                            <div className="transfer-info"><TransferDetails transfer={f} yearConfirmed={trip.yearConfirmed}/></div>
                                            <div className="transfer-controls">
                                                <button className="icon-button" title={tr("Добавить файл")} aria-label={tr("Добавить файл к переезду")} onClick={()=>openEdit({kind:'upload',ownerId:f.id})}><ActionIcon kind="attach"/></button>
                                                <button className="icon-button" title={tr("Редактировать переезд")} aria-label={tr("Редактировать переезд")} onClick={()=>openEdit({kind:'flight',id:f.id})}><ActionIcon kind="edit"/></button>
                                            </div>
                                            {trip.files.some(file=>file.ownerId===f.id)&&<div className="transfer-files">{filesFor(f.id,false)}</div>}
                                        </article></SwipeDelete>;
                                    }):<div className="empty compact">{tr("День пока свободен. С чего начнём?")}</div>}</PlanList>
                                    <div className="row add-actions">
                                        <button onClick={() => openEdit({kind: 'place'})}>{tr("+ Добавить место")}</button>
                                        <button onClick={() => setPicker(!picker)}>{tr("+ Добавить из идей")}</button>
                                        <button onClick={() => openEdit({kind: 'flight'})}>{tr("+ Добавить переезд")}</button>
                                    </div>
                                    {picker && <section className="idea-picker">
                                        <div className="row"><strong><IdeaIcon/> {tr("Идеи и еда")}</strong>
                                            <div className="picker-tools"><button className="outline" onClick={() => openEdit({kind:'idea'})}>{tr("+ Новая идея")}</button><button className="icon-button" aria-label={tr("Закрыть список идей")} title={tr("Закрыть список идей")} onClick={()=>setPicker(false)}>×</button></div>
                                        </div>
                                        {available.length ? available.map(p => <div className="row picker-row"
                                                                                    key={p.id}>
                                            <div className="picker-info"><span
                                                className="picker-name">{p.name}</span>{p.city &&
                                                <small>{p.city}{p.kind === 'food' ? tr(" · Еда") : ''}</small>}{p.note &&
                                                <p className="picker-description" title={p.note}>{p.note}</p>}</div>
                                            <button onClick={() => run(async () => {
                                                await change(t => movePlace(t, p.id, day.id));
                                                setPicker(false);
                                            })}>{tr("В этот день →")} </button>
                                        </div>) : <p className="muted">{tr("Нет нераспределённых идей.")}</p>}
                                    </section>}
                                    {!last ? <div className="hotel-night">
                                        <div className="row">
                                            <div>
                                                <div className="eyebrow">{tr("☾ НОЧЬ ПОСЛЕ")} {dateLabel(day.date)}</div>
                                                <h3>{hotel?.name || tr("Ночуем {0}",{"0":(day.city ? '· ' + day.city : '')})}</h3>{hotel?.address &&
                                                <p className="muted">{hotel.address}</p>}</div>
                                            <button onClick={() => openEdit(trip.hotels.length ? {kind: 'sleep'} : {
                                                kind: 'hotel',
                                                fromSleep: true
                                            })}>{hotel ? tr("Изменить") : tr("Добавить отель")}</button>
                                        </div>
                                        {hotel && <>
                                            <div className="hotel-night-links">{mapHref(hotel) &&
                                                <a className="map-link hotel-map-link" href={mapHref(hotel)}
                                                   target="_blank" rel="noreferrer">{tr("Показать на карте ↗")}</a>}
                                                <button onClick={() => openEdit({kind: 'hotel', id: hotel.id})}>{tr("Карточка отеля →")} </button>
                                            </div>
                                            {trip.files.some(f => f.ownerId === hotel.id) && filesFor(hotel.id)}</>}
                                    </div> : <p className="departure-note">{tr("✈ День возвращения · без ночёвки")}</p>}
                                    <section className="notes">
                                        <div className="row"><h3>{tr("Заметки")}</h3>
                                            <button className="icon-button" title={tr("Добавить заметку")} aria-label={tr("Добавить заметку")} onClick={() => openEdit({kind: 'note'})}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
                                        </div>
                                        {day.notes.length ? day.notes.map(n => <SwipeDelete key={n.id} label={tr("Удалить")}><div className="note-row">
                                            <div className="note-entry"><MarkdownNote text={n.text}/></div>
                                            <div className="event-actions note-actions">
                                            <ConfirmAction iconOnly label={tr("Удалить заметку")} question={tr("Удалить заметку?")}
                                                confirmLabel={tr("Удалить")} onConfirm={() => deletePlanItem('note',n.id)}/>
                                            <button className="icon-button" title={tr("Редактировать заметку")}
                                                    aria-label={tr("Редактировать заметку")}
                                                    onClick={() => openEdit({kind: 'note', id: n.id})}><ActionIcon
                                                kind="edit"/></button>
                                            </div>
                                        </div></SwipeDelete>) : <p className="muted">{tr("Что важно помнить в этот день?")}</p>}</section>
                                </> : <><p className="muted">{tr("Билеты, скриншоты и документы на")} {dateLabel(day.date)}</p>{filesFor(day.id)}</>}
                            </section>
                        </div> : <section className="section-content">
                            <div className="row"><h2>{allCities ? tr("Отели всей поездки") : tr("Отели · {0}",{"0":(currentCity || tr('Без города'))})}</h2>
                                <button className="primary" onClick={() => openEdit({kind: 'hotel'})}>{tr("+ Добавить отель")} </button>
                            </div>
                            {hotels.length ? hotels.map(h => <SwipeDelete key={h.id} label={tr("Удалить")} question={tr("Удалить эту запись?")} onDelete={()=>deleteOwnedItem('hotel',h.id)}><article className="sheet hotel-card">
                                    <div className="row">
                                        <div><h3>{h.name}</h3><p className="muted">{h.address}</p></div>
                                        <button className="icon-button" title={tr("Редактировать отель")}
                                                aria-label={tr("Редактировать ") + h.name}
                                                onClick={() => openEdit({kind: 'hotel', id: h.id})}><ActionIcon
                                            kind="edit"/></button>
                                    </div>
                                    <p className="hotel-stay-summary">{hotelNightsLabel(trip, h)}</p>
                                    <div className="hotel-links">{mapHref(h) ?
                                        <a className="map-link" href={mapHref(h)} target="_blank" rel="noreferrer">{tr("Показать на карте ↗")}</a> : <button className="add-map-link" onClick={() => openEdit({
                                            kind: 'hotel',
                                            id: h.id,
                                            focus: 'mapLink'
                                        })}>{tr("+ Добавить ссылку на карту")}</button>}{safeLink(h.link) &&
                                        <a className="map-link" href={safeLink(h.link)} target="_blank" rel="noreferrer">{tr("Ссылка на отель ↗")}</a>}</div>
                                    <h4>{tr("Ваучеры и подтверждения")}</h4>{filesFor(h.id)}</article></SwipeDelete>) :
                                <div className="empty"><h2>{tr("Где остановимся?")}</h2><p className="muted">{tr("Добавь отель с датами заезда и выезда.")}</p></div>}</section>}</>}
                    {area === 'ideas' && <section className="section-content">
                        <div className="row"><h2>{tr("Идеи всей поездки")}</h2>
                            <button className="primary" onClick={() => openEdit({kind: 'idea'})}>{tr("+ Добавить идею")} </button>
                        </div>
                        {ideas.length ? ideas.map(p => <SavedPlaceCard key={p.id} place={p} subtitle={p.city}
                                                                       onEdit={() => openEdit({kind: 'idea', id: p.id})}
                                                                       onDelete={() => deletePlanItem('place',p.id)}/>) :
                            <div className="empty"><span className="empty-icon"><IdeaIcon/></span><h2>{tr("Что хочется увидеть?")}</h2><p className="muted">{tr("Сохраняй места и ссылки здесь.")}<br/>{tr("Распределить их по дням можно позже.")}</p></div>}</section>}
                    {area === 'food' && <section className="section-content">
                        <div className="row"><h2>{tr("Еда по городам")}</h2>
                            <button className="primary" onClick={() => openEdit({kind: 'food'})}>{tr("+ Добавить место с едой")} </button>
                        </div>
                        {food.length ? [...new Set([...cities, ...food.map(p => p.city)])].filter(city => food.some(p => p.city === city)).map(city =>
                                <section className="food-city-group" key={city}>
                                    <div className="food-city-heading"><h3>{city || tr("Город не указан")}</h3><span
                                        className="muted">{placeLabel(food.filter(p => p.city === city).length)}</span>
                                    </div>
                                    {food.filter(p => p.city === city).map(p => <SavedPlaceCard key={p.id} place={p}
                                                                                                subtitle={p.dayId ? dateLabel(trip.days.find(d => d.id === p.dayId)!.date) : tr("Без дня")}
                                                                                                onEdit={() => openEdit({
                                                                                                    kind: 'food',
                                                                                                    id: p.id
                                                                                                })}
                                                                                                onDelete={() => deletePlanItem('place',p.id)}/>)}</section>) :
                            <div className="empty"><h2>{tr("Где поедим?")}</h2><p className="muted">{tr("Сохраняй кафе и рестораны по городам. Добавить их в план дня можно позже.")}</p></div>}</section>}
                    {area === 'overview' &&
                        <TripOverview trip={trip} onDelete={id=>deleteOwnedItem('flight',id)} onAttach={id => openEdit({kind: 'upload', ownerId: id})}
                                      onEdit={id => openEdit({kind: 'flight', id})}
                                      onConfigure={() => openEdit({kind: 'cities'})}
                                      onAdd={() => openEdit({kind: 'flight'})} filesFor={filesFor}/>}
                </>}
                <footer className="site-footer">{!tripId&&!edit&&<a href="https://t.me/who_travel" target="_blank" rel="noopener noreferrer">{tr("who travel в Telegram ↗")}</a>}<button aria-expanded={settings} aria-controls="data-access" onClick={()=>setSettings(!settings)}>{tr("Данные и доступ")}</button></footer>
                {settings && <section id="data-access" className="settings sheet" ref={settingsRef}>
                    <div className="row"><h2>{tr("Данные и доступ")}</h2>
                        <button onClick={() => setSettings(false)}>{tr("Закрыть")}</button>
                    </div>
                    <div className="data-access-copy"><p><strong>{tr("Только у тебя.")}</strong> {tr("Поездки и документы хранятся в этом браузере на этом устройстве. Они не отправляются на GitHub и не видны другим посетителям сайта. Очистка данных сайта удалит их.")}</p><p><strong>{tr("Поделиться маршрутом.")}</strong> {tr("Скачай файл для просмотра или отправь файл для редактирования. Друг сможет импортировать его в who travel и менять свою копию. Изменения между вашими копиями не синхронизируются — для передачи обновлений нужна новая выгрузка.")}</p><p className="muted">{tr("В выгрузку входят названия, описания мест и ссылки. Документы и личные заметки дня не включаются. Ссылки на карты открываются в отдельной вкладке.")}</p></div>
                </section>}

                <div className="notice-region" aria-live="polite">{undo&&<UndoNotice key={undo.id} action={undo} onClose={()=>setUndo(current=>current?.id===undo.id?null:current)}/ >}{status &&
                    <div className={'notice ' + (/^(Не удалось|Could not|Unable to)/.test(status) ? 'notice-error' : '')} role="status">
                        <span>{message(status)}</span>
                        <button aria-label={tr("Закрыть уведомление")} onClick={() => setStatus('')}>×</button>
                    </div>}</div>
            </main>;
            }

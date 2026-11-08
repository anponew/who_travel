'use client';
import {useI18n} from './I18n';
import {useLayoutEffect, useRef, useState} from 'react';
import TripSetup from './TripSetup';
import NoteInput from './NoteInput';
import TransferTiming from './TransferTiming';
import {isMapLink} from '@/lib/maps';
import {Trip,Day} from '@/lib/model';
import {safeLink,transferKinds} from '@/lib/model';

export type Edit = {
    kind: 'trip' | 'day' | 'place' | 'idea' | 'food' | 'hotel' | 'note' | 'flight' | 'upload' | 'sleep' | 'year' | 'cities';
    id?: string;
    ownerId?: string;
    focus?: 'mapLink';
    fromSleep?: boolean
};
type Props = {
    contextCity?: string;
    edit: Edit;
    trip: Trip;
    day: Day;
    onCancel: () => void;
    onCreateHotel: () => void;
    onDelete?: () => Promise<void>;
    onRemoveFromDay?: () => Promise<void>;
    onSave: (data: Record<string, string>, files: File[]) => Promise<void>
};
export default function Editor({
                                   contextCity,
                                   edit,
                                   trip,
                                   day,
                                   onCancel,
                                   onSave,
                                   onDelete,
                                   onRemoveFromDay,
                                   onCreateHotel
                               }: Props) {
const {tr,message,dateLabel,dayDateLabel}=useI18n();

    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [files, setFiles] = useState<File[]>([]), [deleting, setDeleting] = useState(false);
    const submitting = useRef(false);
    const transferFileInput = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (editor) window.scrollTo({top: Math.max(0, window.scrollY + editor.getBoundingClientRect().top - 24), behavior: 'instant'});
    }, []);
    const p = trip.places.find(p => p.id === edit.id);
    const h = trip.hotels.find(h => h.id === edit.id);
    const f = trip.flights.find(f => f.id === edit.id);
    const titles = {
        food: p ? tr("Редактировать место с едой") : tr("Новое место с едой"),
        trip: tr("Новая поездка"),
        day: tr("Редактировать день"),
        place: p ? tr("Редактировать место") : tr("Новое место"),
        idea: p ? tr("Редактировать идею") : tr("Новая идея"),
        hotel: h ? tr("Редактировать отель") : tr("Новый отель"),
        note: tr("Заметка"),
        flight: f ? tr("Редактировать переезд") : tr("Перелёт или переезд"),
        upload: tr("Билеты и файлы"),
        sleep: tr("Ночёвка"),
        year: tr("Год поездки"),
        cities: tr("Поездка и города")
    };

    function field(label: string, name: string, value = '', type = 'text', required = false) {
        return <label>{label}<input name={name} type={type} defaultValue={value} required={required}
                                    autoFocus={edit.focus === 'mapLink' && name === 'mapLink'} {...(type === 'number' ? {step: 'any'} : {})}/></label>;
    }

    const dayOptions = trip.days.map(d => <option key={d.id}
                                                  value={d.id}>{dayDateLabel(d.date, trip.yearConfirmed)} · {d.city || d.title}</option>);
    return <section ref={editorRef} className={`editor sheet editor-${edit.kind}`}>
        <button className="back" disabled={busy} onClick={onCancel}>{tr("← Назад")}</button>
        <h2>{titles[edit.kind]}</h2>
        <form onSubmit={async e => {
            e.preventDefault();
            if (submitting.current) return;
            setError('');
            const data = Object.fromEntries(Array.from(new FormData(e.currentTarget)).filter(([, value]) => typeof value === 'string').map(([key, value]) => [key, String(value).trim()])) as Record<string, string>;
            if (data.link && !safeLink(data.link)) {
                setError(tr("Ссылка должна начинаться с https:// или http://"));
                return;
            }
            if (data.mapLink && !isMapLink(data.mapLink)) {
                setError(tr("Вставь ссылку на Google Maps, Яндекс Карты, 2ГИС, OpenStreetMap или Apple Maps."));
                return;
            }
            submitting.current = true;
            setBusy(true);
            try {
                await onSave(data, files);
            } catch (e) {
                setError((e as Error).message);
                setBusy(false);
                submitting.current = false;
            }
        }}>
            {(edit.kind === 'trip' || edit.kind === 'cities') && <TripSetup
                trip={edit.kind === 'cities' ? trip : undefined}/>}{edit.kind === 'year' && <>{field(tr("Год"), 'year', '', 'number', true)}
            <p className="muted">{tr("В исходном маршруте год не указан. Даты и периоды отелей сохранят месяц и число.")}</p></>}
            {edit.kind === 'day' && <>{field(tr("Название дня"), 'title', day.title, 'text', true)}{field(tr("Город ночёвки"), 'city', day.city)}
                <datalist id="cities">{[...new Set(trip.days.map(d => d.city))].map(c => <option
                    key={c}>{c}</option>)}</datalist>
            </>}
            {['place', 'idea', 'food'].includes(edit.kind) && <>{field(tr("Название"), 'name', p?.name, 'text', true)}{field(tr("Ссылка на карту · необязательно"), 'mapLink', p?.mapLink || (p?.link && isMapLink(p.link) ? p.link : ''), 'url')}{field(tr("Ссылка на сайт · необязательно"), 'link', p?.link && !isMapLink(p.link) ? p.link : '', 'url')}<label>{tr("Описание и мои заметки")}<textarea name="note" defaultValue={p?.note}/></label>
                <div
                    className="pair">{field(tr("Город"), 'city', p?.city ?? (edit.kind === 'idea' ? '' : contextCity ?? day.city))}{field(tr("Время · необязательно"), 'time', p?.time, 'time')}</div>
                <label>{tr("Когда посетить")}<select name="dayId"
                                             defaultValue={p?.dayId ?? (edit.kind === 'place' ? day.id : '')}>
                    <option value="">{tr("Оставить в идеях")}</option>
                    {dayOptions}</select></label><label>{tr("Тип")}<select name="kind"
                                                                   defaultValue={p?.kind === 'food' || edit.kind === 'food' ? 'food' : 'place'}>
                    <option value="place">{tr("Место")}</option>
                    <option value="food">{tr("Еда")}</option>
                </select></label></>}
            {edit.kind === 'hotel' && <>{field(tr("Название отеля"), 'name', h?.name, 'text', true)}{field(tr("Город"), 'city', h?.city ?? (edit.fromSleep ? day.city : contextCity ?? day.city), 'text', true)}{field(tr("Адрес"), 'address', h?.address)}{field(tr("Ссылка на отель · необязательно"), 'link', h?.link, 'url')}{field(tr("Ссылка на карту · необязательно"), 'mapLink', h?.mapLink ?? '', 'url')}
                <div className="pair"><label>{tr("Заезд")}<select name="checkin"
                                                          defaultValue={h?.checkin ?? day.date}>{trip.days.map(d =>
                    <option key={d.id} value={d.date}>{dayDateLabel(d.date, trip.yearConfirmed)}</option>)}</select></label><label>{tr("Выезд")}<select
                    name="checkout"
                    defaultValue={h?.checkout ?? trip.days[Math.min(trip.days.indexOf(day) + 1, trip.days.length - 1)].date}>{trip.days.map(d =>
                    <option key={d.id} value={d.date}>{dayDateLabel(d.date, trip.yearConfirmed)}</option>)}</select></label></div>
            </>}
            {edit.kind === 'sleep' && <label>{tr("Отель на")} {dateLabel(day.date)}<select name="hotel" onChange={e => {
                if (e.target.value === '__new__') onCreateHotel();
            }} defaultValue={day.hotelOverride === undefined ? 'auto' : day.hotelOverride ?? ''}>
                <option value="auto">{tr("По датам заезда и выезда")}</option>
                <option value="">{tr("Без отеля")}</option>
                {trip.hotels.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
                <option value="__new__">{tr("+ Добавить отель…")}</option>
            </select></label>}
            {edit.kind === 'note' && <NoteInput defaultValue={day.notes.find(n => n.id === edit.id)?.text}/>}
            {edit.kind === 'flight' && <><label>{tr("Вид транспорта")}<select name="transferKind"
                                                                      defaultValue={f?.kind ?? 'other'}>{Object.entries(transferKinds).map(([value, label]) =>
                <option key={value} value={value}>{tr(label)}</option>)}</select></label>
                <div
                    className="pair">{field(tr("Откуда"), 'from', f?.from ?? contextCity ?? day.city)}{field(tr("Куда"), 'to', f?.to)}</div>
                {field(tr("Название · необязательно"), 'name', f?.name)}{field(tr("Номер рейса или поезда · необязательно"), 'number', f?.number)}<TransferTiming
                    trip={trip} day={day} transfer={f}/><label>{tr("Детали и заметки")}<textarea name="note"
                                                                                         defaultValue={f?.note}/></label>
                <section className="transfer-attachments"><h3>{tr("Билеты и файлы")}</h3>{trip.files.filter(file => file.ownerId === edit.id).map(file => <div
                    className="existing-attachment" key={file.id}><span
                    title={file.filename}>{file.name}</span><small>{tr("Сохранён")}</small></div>)}<input
                    ref={transferFileInput} className="hidden-file-input" type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" multiple onChange={e => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles(current => [...current, ...selected]);
                    e.currentTarget.value = '';
                }}/>
                    <button className="outline" type="button" onClick={() => transferFileInput.current?.click()}>{tr("+ Добавить файл")} </button>
                    {files.map((file, index) => <div className="pending-attachment" key={index}>
                        <div><span title={file.name}>{file.name}</span><small>{tr("Будет добавлен после сохранения")}</small>
                        </div>
                        <button type="button" aria-label={tr("Убрать ") + file.name}
                                onClick={() => setFiles(current => current.filter((_, n) => n !== index))}>×
                        </button>
                    </div>)}</section>
            </>}
            {edit.kind === 'upload' && <>{field(tr("Название"), 'name')}<label>{tr("PDF или изображения")}<input type="file"
                                                                                                     name="upload"
                                                                                                     accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                                                                                                     multiple required
                                                                                                     onChange={e => setFiles(Array.from(e.target.files ?? []))}/></label>
                <p className="muted">{tr("До 20 МБ на файл. Файлы сохраняются только в этом браузере.")}</p>{files.map(f => <p
                    className="filename" key={f.name}>{f.name}</p>)}</>}
            {error && <p className="error" role="alert">{message(error)}</p>}
            <div className="editor-footer">{onRemoveFromDay &&
                <button type="button" className="outline" disabled={busy} onClick={async () => {
                    if (submitting.current) return;
                    submitting.current = true;
                    setBusy(true);
                    try {
                        await onRemoveFromDay();
                    } catch (error) {
                        setError((error as Error).message);
                        submitting.current = false;
                        setBusy(false);
                    }
                }}>{tr("Вернуть в идеи")}</button>}{onDelete && <div className="delete-action">{deleting ? <>
                <span>{['place', 'idea', 'food'].includes(edit.kind) ? tr("Удалить это место навсегда?") : tr("Удалить эту запись?")}</span>
                <button type="button" className="danger confirm-danger" disabled={busy} onClick={async () => {
                    if (submitting.current) return;
                    submitting.current = true;
                    setBusy(true);
                    try {
                        await onDelete();
                    } catch (e) {
                        setError((e as Error).message);
                        setBusy(false);
                        submitting.current = false;
                    }
                }}>{tr("Да, удалить")} </button>
                <button type="button" onClick={() => setDeleting(false)}>{tr("Отмена")}</button>
            </> : <button type="button" className="danger"
                          onClick={() => setDeleting(true)}>{['place', 'idea', 'food'].includes(edit.kind) ? tr("Удалить навсегда") : tr("Удалить")}</button>}</div>}
                <div className="form-actions">
                    <button type="button" disabled={busy} onClick={onCancel}>{tr("Отмена")}</button>
                    <button className="primary save-button" disabled={busy}>{busy ? tr("Сохраняем…") : tr("Сохранить")}</button>
                </div>
            </div>
        </form>
    </section>;
}

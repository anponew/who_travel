'use client';
import type {Place} from '@/lib/model';
import {mapHref} from '@/lib/maps';
import ActionIcon from './ActionIcon';
import ConfirmAction from './ConfirmAction';
export default function SavedPlaceCard({place,subtitle,onEdit,onDelete}:{place:Place;subtitle:string;onEdit:()=>void;onDelete:()=>Promise<void>}){return <article className="saved-place-card"><button className="saved-place-open" onClick={onEdit}><h3>{place.name}</h3>{subtitle&&<span className="muted">{subtitle}</span>}{place.note&&<p className="muted prewrap">{place.note}</p>}</button><div className="saved-card-footer">{mapHref(place)&&<a className="map-link" href={mapHref(place)} target="_blank" rel="noreferrer">Показать на карте ↗</a>}<div className="saved-card-controls"><button className="icon-button" aria-label={'Редактировать '+place.name} title={'Редактировать '+place.name} onClick={onEdit}><ActionIcon kind="edit"/></button><ConfirmAction iconOnly label={'Удалить навсегда '+place.name} question={'Удалить «'+place.name+'» навсегда?'} confirmLabel="Удалить навсегда" onConfirm={onDelete}/></div></div></article>;}

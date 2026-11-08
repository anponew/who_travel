'use client';
import {useI18n} from './I18n';
import {Place} from '@/lib/model';
import {mapHref} from '@/lib/maps';
import ActionIcon from './ActionIcon';
import ConfirmAction from './ConfirmAction';
export default function SavedPlaceCard({place,subtitle,onEdit,onDelete}:{place:Place;subtitle:string;onEdit:()=>void;onDelete:()=>Promise<void>}){
const {tr}=useI18n();

  return <article className="saved-place-card">
    <div className="saved-card-header"><div><h3>{place.name}</h3>{subtitle&&<span className="muted">{subtitle}</span>}</div>
      <div className="saved-card-controls"><ConfirmAction iconOnly label={tr("Удалить навсегда ")+place.name} question={tr("Удалить «")+place.name+tr("» навсегда?")} confirmLabel={tr("Удалить навсегда")} onConfirm={onDelete}/><button className="icon-button" aria-label={tr("Редактировать ")+place.name} title={tr("Редактировать ")+place.name} onClick={onEdit}><ActionIcon kind="edit"/></button></div>
    </div>
    {place.note&&<p className="muted prewrap saved-card-description">{place.note}</p>}
    {mapHref(place)&&<div className="saved-card-footer"><a className="map-link" href={mapHref(place)} target="_blank" rel="noreferrer">{tr("Показать на карте ↗")}</a></div>}
  </article>;
}

'use client';
import {useI18n} from './I18n';
export default function LoadingTrips(){
  const{tr}=useI18n();
  return <main className="loading-view" role="status" aria-label={tr('Загрузка')}><div className="loading-orbit" aria-hidden="true"><span>✈</span></div></main>;
}

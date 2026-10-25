import {safeLink,type Place} from './model';
/** A hotel/website URL must never be treated as a map link. */
export function isMapLink(link:string){
  try{const u=new URL(link);if(!['https:','http:'].includes(u.protocol))return false;const h=u.hostname.toLowerCase();
    if(h==='maps.app.goo.gl')return true;
    if(h==='goo.gl')return u.pathname.startsWith('/maps');
    if(/(^|\.)google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/.test(h))return h.startsWith('maps.')||/^\/maps(?:\/|$)/.test(u.pathname);
    if(/(^|\.)yandex\.(?:com|[a-z]{2}|com\.[a-z]{2})$/.test(h))return h.startsWith('maps.')||/^\/maps(?:\/|$)/.test(u.pathname);
    return /(^|\.)(openstreetmap\.org|maps\.apple\.com|2gis\.(?:com|[a-z]{2}))$/.test(h);
  }catch{return false;}
}
export function mapHref(place:{mapLink?:string;name?:string;city?:string;link?:string;address?:string}){const link=place.mapLink?.trim();return link&&isMapLink(link)?safeLink(link):undefined;}

export type RouteStop={name:string;city:string;mapLink?:string};
/** Explicit Google search terms are better than passing opaque short URLs as waypoints. */
function stopQuery(p:RouteStop){
  const url=mapHref(p);if(url){try{const u=new URL(url);if(/(^|\.)google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/.test(u.hostname)){const query=u.searchParams.get('query')??u.searchParams.get('q');if(query)return query;const place=u.pathname.match(/\/maps\/place\/([^/]+)/);if(place)return decodeURIComponent(place[1].replace(/\+/g,' '));}}catch{/* Fall back to the place and city. */}}
  return [p.name,p.city].filter(Boolean).join(', ');
}
export function googleRouteLinks(stops:RouteStop[]):string[]{
  // Three intermediate points work across mobile and desktop. Consecutive chunks share their boundary.
  const queries=stops.map(stopQuery).filter(Boolean).filter((q,i,list)=>!i||q!==list[i-1]);
  const links:string[]=[];let start=0;
  while(start<queries.length-1){let end=Math.min(start+4,queries.length-1);let url='';for(;end>start;end--){const params=new URLSearchParams({api:'1',origin:queries[start],destination:queries[end]});if(end>start+1)params.set('waypoints',queries.slice(start+1,end).join('|'));url='https://www.google.com/maps/dir/?'+params.toString();if(url.length<=2048)break;}if(end===start)break;links.push(url);start=end;}
  return links;
}
export function routePlaces(places:Place[]){return places.filter(p=>mapHref(p));}

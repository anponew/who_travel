/** Parse only explicit coordinates, never geocode a name or follow a short link. */
export function coordinatesFromLink(value:string):{lat:number;lng:number}|null{
try{const u=new URL(value);let lat:number|undefined,lng:number|undefined;const host=u.hostname.toLowerCase();
if(/(^|\.)google\.[a-z.]+$/.test(host)||host==='maps.google.com'){
const explicit=decodeURIComponent(u.pathname+u.search).match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);const q=u.searchParams.get('query')??u.searchParams.get('q');const pair=q?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);const m=explicit??pair;if(m){lat=+m[1];lng=+m[2];}
}else if(/(^|\.)openstreetmap\.org$/.test(host)){const a=u.searchParams.get('mlat'),b=u.searchParams.get('mlon');if(a&&b){lat=+a;lng=+b;}}
else if(/(^|\.)yandex\.[a-z.]+$/.test(host)){const pair=u.searchParams.get('pt')?.split('~')[0].match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,.*)?$/);if(pair){lng=+pair[1];lat=+pair[2];}}
return lat!==undefined&&lng!==undefined&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
}catch{return null;}
}

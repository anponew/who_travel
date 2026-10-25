import {openDB} from 'idb';
import type {Trip} from './model';
const db=()=>openDB('who-travel',1,{upgrade(db){db.createObjectStore('state');db.createObjectStore('files');}});
export async function readTrips():Promise<Trip[]|undefined>{return (await db()).get('state','trips');}
export async function writeTrips(trips:Trip[]){await (await db()).put('state',trips,'trips');}
export async function putFile(id:string,file:Blob){await (await db()).put('files',file,id);}
export async function readFile(id:string):Promise<Blob|undefined>{return (await db()).get('files',id);}
export async function removeFile(id:string){await (await db()).delete('files',id);}

/** Stage blobs first; the caller commits attachment metadata with its owner. */
export async function stageAttachmentFiles(ownerId:string,files:File[],title=''){
  const allowed=['application/pdf','image/png','image/jpeg','image/webp','image/gif'];
  if(files.some(file=>!allowed.includes(file.type)||file.size>20*1024*1024))throw Error('Допустимы PDF, PNG, JPEG, WebP и GIF до 20 МБ.');
  const added:import('./model').Attachment[]=[];
  try{for(const file of files){const id=crypto.randomUUID();await putFile(id,file);added.push({id,ownerId,name:title?(files.length>1?`${title} · ${file.name}`:title):file.name,filename:file.name,type:file.type,size:file.size});}return added;}catch(error){await Promise.all(added.map(file=>removeFile(file.id)));throw error;}
}

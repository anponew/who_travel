import {openDB} from 'idb';
import type {Trip} from './model';
let database:ReturnType<typeof openDB>|undefined;
let loaded=false;
let revision:string|undefined;
function db(){
  if(!database)database=openDB('who-travel',1,{
    upgrade(database){database.createObjectStore('state');database.createObjectStore('files');},
    terminated(){database=undefined;},
  }).catch(error=>{database=undefined;throw error;});
  return database;
}
export async function readTrips():Promise<Trip[]|undefined>{
  const transaction=(await db()).transaction('state');
  const [trips,currentRevision]=await Promise.all([transaction.store.get('trips'),transaction.store.get('revision')]);
  await transaction.done;
  revision=currentRevision;loaded=true;
  return trips;
}
export async function writeTrips(trips:Trip[]){
  // A read/write transaction also prevents an older tab from overwriting newer data.
  const transaction=(await db()).transaction('state','readwrite');
  try{
    const currentRevision=await transaction.store.get('revision');
    if(loaded&&revision!==currentRevision){
      transaction.abort();
      throw Error('Данные изменены в другой вкладке. Обнови страницу перед сохранением.');
    }
    const nextRevision=crypto.randomUUID();
    await transaction.store.put(trips,'trips');
    await transaction.store.put(nextRevision,'revision');
    await transaction.done;
    revision=nextRevision;loaded=true;
  }catch(error){
    await transaction.done.catch(()=>{});
    throw error;
  }
}
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

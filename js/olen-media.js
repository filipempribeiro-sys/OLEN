/* OLEN 5.0 - MEDIA
   Single owner for media session, provider connection, playback, queue and
   experience playlist lifecycle. No legacy ALPHA/OLEN 4.x dependency.
   Provider/OAuth/network work is adapter-driven and never starts automatically.
   Intentionally not loaded by the OLEN 4.x runtime yet.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
const core=ROOT?.core;
if(!core) throw new Error('OLEN 5.0 MEDIA requires core');
if(ROOT.media?.version==='5.0.0') return;

const VERSION='5.0.0';
let initialized=false;
let provider=null;
let session={
  status:'disconnected',
  user:null,
  device:null,
  capabilities:{playback:false,playlist:false}
};
let playback={
  state:'idle',
  item:null,
  context:null,
  positionMs:0,
  durationMs:0,
  volume:null,
  updatedAt:null
};
let queue=[];
let playlists=[];
let activePlaylistId=null;

function clone(value){
  if(value==null) return value;
  try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
}
function emit(name,payload={}){
  core.emit(`media:${name}`,{
    session:clone(session),
    playback:clone(playback),
    activePlaylistId,
    ...payload
  });
}
function setProvider(adapter){
  if(adapter!=null&&typeof adapter!=='object') throw new TypeError('MEDIA provider must be an adapter object');
  provider=adapter||null;
  emit('provider',{connected:!!provider});
  return !!provider;
}
function setSession(next={},reason='session'){
  session={
    ...session,
    ...clone(next),
    capabilities:{...session.capabilities,...clone(next.capabilities||{})}
  };
  emit('session',{reason});
  return clone(session);
}
function setPlayback(next={},reason='playback'){
  playback={...playback,...clone(next),updatedAt:Date.now()};
  emit('playback',{reason});
  return clone(playback);
}

async function connect(options={}){
  if(!provider?.connect) return {ok:false,reason:'provider-unavailable'};
  setSession({status:'connecting'},'connect-start');
  try{
    const result=await provider.connect(clone(options));
    if(result===false||result?.ok===false){
      setSession({status:'disconnected'},'connect-failed');
      return {ok:false,result};
    }
    setSession({
      status:'connected',
      user:result?.user||session.user,
      device:result?.device||session.device,
      capabilities:result?.capabilities||session.capabilities
    },'connect-complete');
    return {ok:true,result};
  }catch(error){
    setSession({status:'disconnected'},'connect-error');
    emit('error',{action:'connect',message:String(error?.message||error)});
    return {ok:false,error};
  }
}

async function disconnect(reason='disconnect'){
  try{await provider?.disconnect?.({reason})}catch(error){emit('error',{action:'disconnect',message:String(error?.message||error)})}
  session={status:'disconnected',user:null,device:null,capabilities:{playback:false,playlist:false}};
  playback={state:'idle',item:null,context:null,positionMs:0,durationMs:0,volume:null,updatedAt:Date.now()};
  queue=[];
  activePlaylistId=null;
  emit('disconnected',{reason});
  return true;
}

async function command(action,payload={}){
  if(session.status!=='connected') return {ok:false,reason:'not-connected'};
  const fn=provider?.[action];
  if(typeof fn!=='function') return {ok:false,reason:'unsupported'};
  try{
    const result=await fn.call(provider,clone(payload));
    if(result===false||result?.ok===false) return {ok:false,result};
    if(result?.playback) setPlayback(result.playback,action);
    if(Array.isArray(result?.queue)) setQueue(result.queue);
    return {ok:true,result};
  }catch(error){
    emit('error',{action,message:String(error?.message||error)});
    return {ok:false,error};
  }
}

async function play(input={}){
  const result=await command('play',input);
  if(result.ok&&!result.result?.playback) setPlayback({state:'playing'},'play');
  return result;
}
async function pause(){
  const result=await command('pause');
  if(result.ok&&!result.result?.playback) setPlayback({state:'paused'},'pause');
  return result;
}
async function next(){return command('next')}
async function previous(){return command('previous')}
async function seek(positionMs){
  const position=Math.max(0,Number(positionMs)||0);
  const result=await command('seek',{positionMs:position});
  if(result.ok&&!result.result?.playback) setPlayback({positionMs:position},'seek');
  return result;
}
async function setVolume(value){
  const volume=Math.max(0,Math.min(100,Number(value)||0));
  const result=await command('setVolume',{volume});
  if(result.ok&&!result.result?.playback) setPlayback({volume},'volume');
  return result;
}

function setQueue(items){
  queue=Array.isArray(items)?clone(items):[];
  emit('queue',{count:queue.length});
  return queue.length;
}
function normalizePlaylist(item){
  if(!item||typeof item!=='object') return null;
  const id=String(item.id||'').trim();
  if(!id) return null;
  return {
    id,
    name:String(item.name||'OLEN'),
    url:item.url?String(item.url):null,
    uri:item.uri?String(item.uri):null,
    conversationId:item.conversationId?String(item.conversationId):null,
    experienceId:item.experienceId?String(item.experienceId):null,
    durationMs:Number.isFinite(Number(item.durationMs))?Number(item.durationMs):null,
    tracks:Array.isArray(item.tracks)?clone(item.tracks):[],
    metadata:item.metadata&&typeof item.metadata==='object'?clone(item.metadata):{},
    createdAt:item.createdAt||new Date().toISOString()
  };
}
function setPlaylists(items){
  playlists=Array.isArray(items)?items.map(normalizePlaylist).filter(Boolean):[];
  if(activePlaylistId&&!playlists.some(item=>item.id===activePlaylistId)) activePlaylistId=null;
  emit('playlists',{count:playlists.length});
  return playlists.length;
}
function upsertPlaylist(item){
  const nextItem=normalizePlaylist(item);
  if(!nextItem) return false;
  const index=playlists.findIndex(current=>current.id===nextItem.id);
  if(index>=0) playlists.splice(index,1,nextItem); else playlists.unshift(nextItem);
  emit('playlist-upserted',{playlist:clone(nextItem)});
  return clone(nextItem);
}
function selectPlaylist(id){
  const key=String(id||'');
  if(!playlists.some(item=>item.id===key)) return false;
  activePlaylistId=key;
  emit('playlist-selected',{playlistId:key});
  return true;
}
function latestPlaylist({conversationId=null,experienceId=null}={}){
  const filtered=playlists.filter(item=>(!conversationId||item.conversationId===String(conversationId))&&(!experienceId||item.experienceId===String(experienceId)));
  return clone(filtered.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null);
}

async function createExperiencePlaylist(spec={}){
  if(!provider?.createPlaylist) return {ok:false,reason:'unsupported'};
  const request={
    name:String(spec.name||'Experiência · OLEN'),
    conversationId:spec.conversationId?String(spec.conversationId):null,
    experienceId:spec.experienceId?String(spec.experienceId):null,
    mood:spec.mood||null,
    durationMs:Number.isFinite(Number(spec.durationMs))?Number(spec.durationMs):null,
    seedTracks:Array.isArray(spec.seedTracks)?clone(spec.seedTracks):[],
    seedArtists:Array.isArray(spec.seedArtists)?clone(spec.seedArtists):[],
    metadata:spec.metadata&&typeof spec.metadata==='object'?clone(spec.metadata):{}
  };
  emit('playlist-create-start',{request:clone(request)});
  try{
    const result=await provider.createPlaylist(clone(request));
    if(result===false||result?.ok===false){
      emit('playlist-create-failed',{result:clone(result)});
      return {ok:false,result};
    }
    const playlist=normalizePlaylist(result?.playlist||result);
    if(!playlist) return {ok:false,reason:'invalid-playlist'};
    playlist.conversationId=playlist.conversationId||request.conversationId;
    playlist.experienceId=playlist.experienceId||request.experienceId;
    playlist.durationMs=playlist.durationMs||request.durationMs;
    upsertPlaylist(playlist);
    activePlaylistId=playlist.id;
    emit('playlist-created',{playlist:clone(playlist)});
    return {ok:true,playlist:clone(playlist),result};
  }catch(error){
    emit('error',{action:'createPlaylist',message:String(error?.message||error)});
    return {ok:false,error};
  }
}

async function refresh(){
  if(!provider?.status) return {ok:false,reason:'unsupported'};
  try{
    const result=await provider.status();
    if(result?.session) setSession(result.session,'refresh');
    if(result?.playback) setPlayback(result.playback,'refresh');
    if(Array.isArray(result?.queue)) setQueue(result.queue);
    if(Array.isArray(result?.playlists)) setPlaylists(result.playlists);
    emit('refreshed');
    return {ok:true,result};
  }catch(error){
    emit('error',{action:'refresh',message:String(error?.message||error)});
    return {ok:false,error};
  }
}

function init(options={}){
  if(initialized) return ROOT.media;
  initialized=true;
  if(options.provider) setProvider(options.provider);
  if(Array.isArray(options.playlists)) setPlaylists(options.playlists);
  if(Array.isArray(options.queue)) setQueue(options.queue);
  emit('registered',{version:VERSION});
  return ROOT.media;
}
function destroy(){
  provider?.destroy?.();
  provider=null;
  initialized=false;
  session={status:'disconnected',user:null,device:null,capabilities:{playback:false,playlist:false}};
  playback={state:'idle',item:null,context:null,positionMs:0,durationMs:0,volume:null,updatedAt:null};
  queue=[];
  playlists=[];
  activePlaylistId=null;
}

ROOT.media=Object.freeze({
  version:VERSION,
  init,
  destroy,
  setProvider,
  connect,
  disconnect,
  refresh,
  play,
  pause,
  next,
  previous,
  seek,
  setVolume,
  setQueue,
  setPlaylists,
  upsertPlaylist,
  selectPlaylist,
  latestPlaylist,
  createExperiencePlaylist,
  get connected(){return session.status==='connected';},
  get session(){return clone(session);},
  get playback(){return clone(playback);},
  get queue(){return clone(queue);},
  get playlists(){return clone(playlists);},
  get activePlaylist(){return clone(playlists.find(item=>item.id===activePlaylistId)||null);}
});

core.register('media',ROOT.media);

})();

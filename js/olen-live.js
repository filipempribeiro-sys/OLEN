/* OLEN 5.0 - LIVE
   Single owner for LIVE view lifecycle, report draft, geolocation snapshot,
   media attachment metadata and report publication flow.
   No legacy ALPHA/OLEN 4.x dependency. No camera/GPS/network starts automatically.
   Intentionally not loaded by the OLEN 4.x runtime yet.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
const core=ROOT?.core;
const router=ROOT?.router;
if(!core||!router) throw new Error('OLEN 5.0 LIVE requires core and router');
if(ROOT.live?.version==='5.0.0') return;

const VERSION='5.0.0';
let initialized=false;
let mounted=false;
let unregister=null;
let provider=null;
let selectors={root:'#report'};
let reports=[];
let draft=freshDraft();

function freshDraft(){
  return {
    id:null,
    type:null,
    text:'',
    location:null,
    media:[],
    createdAt:null,
    updatedAt:null
  };
}
function clone(value){
  if(value==null) return value;
  try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
}
function host(){return core.qs(selectors.root)}
function emit(name,payload={}){
  core.emit(`live:${name}`,{draft:clone(draft),...payload});
}
function touch(){
  const now=new Date().toISOString();
  if(!draft.createdAt) draft.createdAt=now;
  draft.updatedAt=now;
}
function render(reason='render'){
  if(!mounted) return false;
  const h=host();
  if(!h) return false;
  document.documentElement.dataset.olenView='live';
  h.dataset.olenMounted='5.0';
  h.dataset.olenLiveOwner='5.0';
  h.dataset.olenLiveHasDraft=hasDraft()?'true':'false';
  provider?.render?.({host:h,draft:clone(draft),reports:clone(reports),reason});
  emit('rendered',{reason});
  return true;
}
function clearPresentation(){
  const h=host();
  h?.removeAttribute('data-olen-mounted');
  h?.removeAttribute('data-olen-live-owner');
  h?.removeAttribute('data-olen-live-has-draft');
}
function mount(context={}){
  mounted=true;
  provider?.mount?.({host:host(),draft:clone(draft),reports:clone(reports),context});
  core.raf2(()=>render(context.reason||'enter-live'));
  emit('mounted',{context});
  return true;
}
function unmount(context={}){
  if(!mounted) return;
  provider?.unmount?.({host:host(),draft:clone(draft),context});
  clearPresentation();
  mounted=false;
  emit('unmounted',{context});
}
function setProvider(adapter){
  if(adapter!=null&&typeof adapter!=='object') throw new TypeError('LIVE provider must be an adapter object');
  provider=adapter||null;
  emit('provider',{connected:!!provider});
  return !!provider;
}
function hasDraft(){
  return !!(draft.type||draft.text.trim()||draft.location||draft.media.length);
}
function updateDraft(patch={},reason='draft-update'){
  if(!patch||typeof patch!=='object') return clone(draft);
  draft={...draft,...clone(patch)};
  touch();
  emit('draft',{reason});
  if(mounted) render(reason);
  return clone(draft);
}
function setType(type){
  draft.type=type==null?null:String(type).trim()||null;
  touch();
  emit('draft',{reason:'type'});
  if(mounted) render('type');
  return draft.type;
}
function setText(text){
  draft.text=String(text??'');
  touch();
  emit('draft',{reason:'text'});
  if(mounted) render('text');
  return draft.text;
}
function setLocation(location){
  if(location==null){
    draft.location=null;
  }else{
    const latitude=Number(location.latitude??location.lat);
    const longitude=Number(location.longitude??location.lon??location.lng);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)) throw new TypeError('Invalid LIVE location');
    draft.location={
      latitude,
      longitude,
      accuracy:Number.isFinite(Number(location.accuracy))?Number(location.accuracy):null,
      timestamp:location.timestamp||Date.now()
    };
  }
  touch();
  emit('draft',{reason:'location'});
  if(mounted) render('location');
  return clone(draft.location);
}
function useMapLocation(){
  const location=ROOT.mapGo?.state?.location;
  if(!location) return null;
  return setLocation(location);
}
function addMedia(item){
  if(!item||typeof item!=='object') return false;
  const media={
    id:String(item.id||`media-${Date.now()}-${Math.random().toString(36).slice(2,8)}`),
    kind:String(item.kind||item.type||'image'),
    name:item.name?String(item.name):null,
    url:item.url?String(item.url):null,
    mime:item.mime?String(item.mime):null,
    metadata:item.metadata&&typeof item.metadata==='object'?clone(item.metadata):{}
  };
  draft.media=[...draft.media,media];
  touch();
  emit('media-added',{media:clone(media)});
  if(mounted) render('media-add');
  return clone(media);
}
function removeMedia(id){
  const key=String(id||'');
  const before=draft.media.length;
  draft.media=draft.media.filter(item=>item.id!==key);
  if(draft.media.length===before) return false;
  touch();
  emit('media-removed',{id:key});
  if(mounted) render('media-remove');
  return true;
}
function resetDraft(reason='draft-reset'){
  draft=freshDraft();
  emit('draft-reset',{reason});
  if(mounted) render(reason);
  return clone(draft);
}
function validateDraft(){
  const errors=[];
  if(!draft.type) errors.push('type');
  if(!draft.location) errors.push('location');
  if(!draft.text.trim()&&!draft.media.length) errors.push('content');
  return {valid:errors.length===0,errors};
}
async function publish(options={}){
  const validation=validateDraft();
  if(!validation.valid){
    emit('publish-invalid',{errors:validation.errors});
    return {ok:false,errors:validation.errors};
  }
  const report={
    ...clone(draft),
    id:draft.id||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    publishedAt:new Date().toISOString(),
    status:'published'
  };
  emit('publish-start',{report:clone(report)});
  try{
    const result=provider?.publish
      ? await provider.publish(clone(report),clone(options))
      : {ok:true,local:true};
    if(result===false||result?.ok===false){
      emit('publish-failed',{report:clone(report),result:clone(result)});
      return {ok:false,result};
    }
    reports=[report,...reports.filter(item=>item.id!==report.id)];
    emit('published',{report:clone(report),result:clone(result)});
    resetDraft('publish-complete');
    return {ok:true,report:clone(report),result:clone(result)};
  }catch(error){
    emit('publish-error',{message:String(error?.message||error)});
    return {ok:false,error};
  }
}
function setReports(items){
  reports=Array.isArray(items)?clone(items):[];
  emit('reports',{count:reports.length});
  if(mounted) render('reports-update');
  return reports.length;
}
function removeReport(id){
  const key=String(id||'');
  const before=reports.length;
  reports=reports.filter(item=>String(item?.id||'')!==key);
  if(reports.length===before) return false;
  emit('report-removed',{id:key});
  if(mounted) render('report-remove');
  return true;
}
function init(options={}){
  if(initialized) return ROOT.live;
  initialized=true;
  selectors={...selectors,...(options.selectors||{})};
  if(options.provider) setProvider(options.provider);
  if(Array.isArray(options.reports)) setReports(options.reports);
  unregister=router.registerView('live',{
    enter:mount,
    leave:unmount,
    afterEnter:context=>emit('ready',{context})
  });
  emit('registered',{version:VERSION});
  return ROOT.live;
}
function destroy(){
  unregister?.();
  unregister=null;
  if(mounted) unmount({reason:'destroy'});
  provider?.destroy?.();
  provider=null;
  reports=[];
  draft=freshDraft();
  initialized=false;
}

ROOT.live=Object.freeze({
  version:VERSION,
  init,
  destroy,
  mount,
  unmount,
  render,
  setProvider,
  updateDraft,
  setType,
  setText,
  setLocation,
  useMapLocation,
  addMedia,
  removeMedia,
  resetDraft,
  validateDraft,
  publish,
  setReports,
  removeReport,
  get mounted(){return mounted;},
  get hasDraft(){return hasDraft();},
  get draft(){return clone(draft);},
  get reports(){return clone(reports);}
});

core.register('live',ROOT.live);

})();

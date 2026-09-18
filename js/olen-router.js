/* OLEN 5.0 · ROUTER
   Single owner for view navigation, browser/Android back, swipe-back contract,
   history and overlay lifecycle.
   No legacy ALPHA/OLEN 4.x dependency.
   Intentionally not loaded by the current 4.x runtime yet.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
const core=ROOT?.core;
if(!core)throw new Error('OLEN 5.0 router requires olen-core.js');
if(ROOT.router?.version==='5.0.1')return;

const VERSION='5.0.1';
const VALID_VIEWS=new Set(['intro','home','chat','map','go','live','account']);
const HISTORY_KEY='__olen5';
const viewHandlers=new Map();
let initialized=false;
let handlingPop=false;
let sequence=0;
let popOff=null;
let historySnapshot=null;

function normalizeView(view){
  const value=String(view||'').trim().toLowerCase();
  if(!VALID_VIEWS.has(value))throw new Error(`Unknown OLEN view: ${view}`);
  return value;
}
function state(){return core.state}
function current(){return state().view}
function historyState(view,extra={}){return Object.freeze({[HISTORY_KEY]:true,view,seq:++sequence,...extra})}
function closeOverlay(reason='navigation'){
  const before=state();
  if(!before.overlay&&!before.chat?.sidebar)return false;
  core.setState(draft=>{draft.overlay=null;if(draft.chat)draft.chat.sidebar=false},{source:'router',action:'overlay:close',reason});
  core.emit('overlay:closed',{reason});
  return true;
}
function setOverlay(name,payload=null){
  const overlay=name?{name:String(name),payload}:null;
  core.setState(draft=>{draft.overlay=overlay;if(draft.chat)draft.chat.sidebar=overlay?.name==='chat-sidebar'},{source:'router',action:'overlay:set'});
  core.emit('overlay:change',{overlay});
  return overlay;
}
function registerView(name,handlers={}){
  const view=normalizeView(name);
  if(viewHandlers.has(view))throw new Error(`OLEN view already registered: ${view}`);
  viewHandlers.set(view,Object.freeze({beforeEnter:typeof handlers.beforeEnter==='function'?handlers.beforeEnter:null,enter:typeof handlers.enter==='function'?handlers.enter:null,leave:typeof handlers.leave==='function'?handlers.leave:null,afterEnter:typeof handlers.afterEnter==='function'?handlers.afterEnter:null}));
  return ()=>viewHandlers.delete(view);
}
function call(view,hook,context){const fn=viewHandlers.get(view)?.[hook];if(fn)core.safe(()=>fn(context))}
function transition(target,options={}){
  const to=normalizeView(target),from=current(),replace=!!options.replace,historyMode=options.history!==false,reason=options.reason||'navigate',force=!!options.force;
  if(to===from&&!force){closeOverlay('same-view');core.emit('route:stable',{view:to,reason});return state()}
  closeOverlay('view-change');
  const context=Object.freeze({from,to,reason,options:Object.freeze({...options})});
  call(to,'beforeEnter',context);call(from,'leave',context);
  core.setState(draft=>{draft.previousView=from;draft.view=to;draft.transition={from,to,reason}},{source:'router',action:'view:change',from,to,reason});
  call(to,'enter',context);
  core.setState(draft=>{draft.transition=null},{source:'router',action:'view:settled',view:to});
  call(to,'afterEnter',context);
  if(historyMode&&!handlingPop){const hs=historyState(to,{reason});if(replace)history.replaceState(hs,'',location.href);else history.pushState(hs,'',location.href)}
  core.emit('route:change',{from,to,reason});return state();
}
function enter(view,options={}){return transition(view,{...options,reason:options.reason||'enter'})}
function replace(view,options={}){return transition(view,{...options,replace:true,reason:options.reason||'replace'})}
function back(options={}){
  const s=state();
  if(s.overlay||s.chat?.sidebar){closeOverlay(options.reason||'back-overlay');return true}
  if(options.target){transition(options.target,{history:false,reason:options.reason||'back-target'});return true}
  history.back();return true;
}
function onPopState(event){
  handlingPop=true;
  try{
    const hs=event.state;
    if(hs?.[HISTORY_KEY]&&VALID_VIEWS.has(hs.view)){transition(hs.view,{history:false,reason:'history-pop'});return}
    const previous=state().previousView;
    if(previous&&VALID_VIEWS.has(previous)){transition(previous,{history:false,reason:'history-fallback'});return}
    core.emit('route:external-back',{event});
  }finally{handlingPop=false}
}
function nativeBack(){return back({reason:'native-back'})}
function swipeBack(){return back({reason:'swipe-back'})}
function init(options={}){
  if(initialized)return ROOT.router;
  initialized=true;
  const initial=normalizeView(options.initialView||current()||'home');
  core.setState(draft=>{draft.view=initial;draft.previousView=null;draft.overlay=null;if(draft.chat)draft.chat.sidebar=false},{source:'router',action:'init'});
  const existing=history.state;
  historySnapshot={state:existing,url:location.href};
  if(!existing?.[HISTORY_KEY])history.replaceState(historyState(initial,{reason:'init'}),'',location.href);
  popOff=core.listen(window,'popstate',onPopState);
  core.emit('router:ready',{view:initial});return ROOT.router;
}
function destroy(){
  popOff?.();popOff=null;
  closeOverlay('router-destroy');
  viewHandlers.clear();
  if(historySnapshot){
    try{history.replaceState(historySnapshot.state,'',historySnapshot.url)}catch{}
    historySnapshot=null;
  }
  initialized=false;
}
ROOT.router=Object.freeze({version:VERSION,init,destroy,get current(){return current()},enter,replace,back,nativeBack,swipeBack,registerView,setOverlay,closeOverlay,validViews:Object.freeze([...VALID_VIEWS])});
core.register('router',ROOT.router);
})();
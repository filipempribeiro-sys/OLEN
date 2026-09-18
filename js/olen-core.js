/* OLEN 5.0 · CORE
   Clean runtime foundation.
   One shared state, one event bus, one lifecycle registry.
   No legacy ALPHA/OLEN 4.x dependency and no automatic navigation.
   Intentionally not loaded by the current 4.x runtime yet.
*/
(()=>{
'use strict';

if(window.OLEN5?.core?.version==='5.0.0')return;

const VERSION='5.0.0';
const ROOT=window.OLEN5=window.OLEN5||{};
const listeners=new Map();
const disposers=new Set();
const modules=new Map();
let destroyed=false;

const initialState=Object.freeze({
  view:'home',
  previousView:null,
  overlay:null,
  transition:null,
  chat:Object.freeze({conversationId:null,compose:false,sidebar:false}),
  remote:Object.freeze({visible:false}),
  navigation:Object.freeze({routeActive:false})
});

let state=clone(initialState);

function clone(value){
  if(typeof structuredClone==='function'){
    try{return structuredClone(value)}catch{}
  }
  return JSON.parse(JSON.stringify(value));
}

function freeze(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function snapshot(){return freeze(clone(state))}

function safe(fn,fallback){
  try{return typeof fn==='function'?fn():fallback}catch(error){
    console.error('[OLEN 5.0]',error);
    return fallback;
  }
}

function qs(selector,root=document){return safe(()=>root.querySelector(selector),null)}
function qsa(selector,root=document){return safe(()=>[...root.querySelectorAll(selector)],[])}
function byId(id){return document.getElementById(id)}
function visible(el){return !!(el&&el.isConnected&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden')}
function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-PT')}
function escapeHTML(value){
  const el=document.createElement('div');
  el.textContent=String(value??'');
  return el.innerHTML;
}

function on(type,handler){
  if(destroyed||typeof handler!=='function')return ()=>{};
  if(!listeners.has(type))listeners.set(type,new Set());
  listeners.get(type).add(handler);
  return ()=>listeners.get(type)?.delete(handler);
}

function once(type,handler){
  let off=()=>{};
  off=on(type,(payload)=>{off();handler(payload)});
  return off;
}

function emit(type,payload){
  if(destroyed)return;
  [...(listeners.get(type)||[])].forEach(handler=>safe(()=>handler(payload)));
}

function listen(target,type,handler,options){
  if(destroyed||!target?.addEventListener||typeof handler!=='function')return ()=>{};
  target.addEventListener(type,handler,options);
  const dispose=()=>target.removeEventListener(type,handler,options);
  disposers.add(dispose);
  return ()=>{dispose();disposers.delete(dispose)};
}

function setState(updater,meta={}){
  if(destroyed)throw new Error('OLEN core destroyed');
  const previous=snapshot();
  const draft=clone(state);
  const result=typeof updater==='function'?updater(draft):updater;
  if(result&&typeof result==='object')state=clone(result);
  else state=draft;
  const next=snapshot();
  emit('state:change',{previous,next,meta});
  return next;
}

function resetState(meta={reason:'reset'}){
  const previous=snapshot();
  state=clone(initialState);
  const next=snapshot();
  emit('state:change',{previous,next,meta});
  return next;
}

function register(name,module){
  if(!name||!module||typeof module!=='object')throw new TypeError('Invalid OLEN module');
  if(modules.has(name))throw new Error(`OLEN module already registered: ${name}`);
  modules.set(name,module);
  emit('module:registered',{name,module});
  return module;
}

function module(name){return modules.get(name)||null}

function raf(fn){return requestAnimationFrame(()=>safe(fn))}
function raf2(fn){return requestAnimationFrame(()=>requestAnimationFrame(()=>safe(fn)))}
function later(fn,ms=0){
  const id=setTimeout(()=>{disposers.delete(cancel);safe(fn)},ms);
  const cancel=()=>clearTimeout(id);
  disposers.add(cancel);
  return cancel;
}

const storage=Object.freeze({
  local:Object.freeze({
    get:(key,fallback=null)=>safe(()=>localStorage.getItem(key)??fallback,fallback),
    set:(key,value)=>safe(()=>{localStorage.setItem(key,String(value));return true},false),
    remove:(key)=>safe(()=>{localStorage.removeItem(key);return true},false),
    jsonGet:(key,fallback=null)=>safe(()=>JSON.parse(localStorage.getItem(key)??'null')??fallback,fallback),
    jsonSet:(key,value)=>safe(()=>{localStorage.setItem(key,JSON.stringify(value));return true},false)
  }),
  session:Object.freeze({
    get:(key,fallback=null)=>safe(()=>sessionStorage.getItem(key)??fallback,fallback),
    set:(key,value)=>safe(()=>{sessionStorage.setItem(key,String(value));return true},false),
    remove:(key)=>safe(()=>{sessionStorage.removeItem(key);return true},false),
    jsonGet:(key,fallback=null)=>safe(()=>JSON.parse(sessionStorage.getItem(key)??'null')??fallback,fallback),
    jsonSet:(key,value)=>safe(()=>{sessionStorage.setItem(key,JSON.stringify(value));return true},false)
  })
});

function destroy(){
  if(destroyed)return;
  destroyed=true;
  [...disposers].forEach(dispose=>safe(dispose));
  disposers.clear();
  listeners.clear();
  modules.clear();
}

ROOT.core=Object.freeze({
  version:VERSION,
  get state(){return snapshot()},
  setState,
  resetState,
  register,
  module,
  on,
  once,
  emit,
  listen,
  safe,
  qs,
  qsa,
  byId,
  visible,
  norm,
  escapeHTML,
  raf,
  raf2,
  later,
  storage,
  destroy
});

})();

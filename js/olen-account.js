/* OLEN 5.0 - ACCOUNT / PROFILE
   Single owner for account/profile view, identity, preferences, plan,
   achievements and connected-service metadata.
   No legacy ALPHA/OLEN 4.x dependency. Persistence/network/auth are adapter-driven.
   Intentionally not loaded by the OLEN 4.x runtime yet.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
const core=ROOT?.core;
const router=ROOT?.router;
if(!core||!router) throw new Error('OLEN 5.0 ACCOUNT requires core and router');
if(ROOT.account?.version==='5.0.0') return;

const VERSION='5.0.0';
let initialized=false;
let mounted=false;
let unregister=null;
let provider=null;
let selectors={root:'#profile'};

const EMPTY=Object.freeze({
  identity:Object.freeze({id:null,name:'',username:'',email:'',avatar:null}),
  plan:Object.freeze({tier:'free',status:'active',expiresAt:null}),
  preferences:Object.freeze({language:'pt-PT',units:'metric',theme:'system',privacy:'standard'}),
  stats:Object.freeze({experiences:0,distanceKm:0,durationMinutes:0,reports:0}),
  achievements:Object.freeze([]),
  connections:Object.freeze({}),
  updatedAt:null
});
let profile=clone(EMPTY);

function clone(value){
  if(value==null) return value;
  try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
}
function host(){return core.qs(selectors.root)}
function emit(name,payload={}){core.emit(`account:${name}`,{profile:clone(profile),...payload})}
function mergeProfile(next={}){
  profile={
    ...profile,
    ...clone(next),
    identity:{...profile.identity,...clone(next.identity||{})},
    plan:{...profile.plan,...clone(next.plan||{})},
    preferences:{...profile.preferences,...clone(next.preferences||{})},
    stats:{...profile.stats,...clone(next.stats||{})},
    connections:{...profile.connections,...clone(next.connections||{})},
    achievements:Array.isArray(next.achievements)?clone(next.achievements):profile.achievements,
    updatedAt:new Date().toISOString()
  };
  return profile;
}
function render(reason='render'){
  if(!mounted) return false;
  const h=host();
  if(!h) return false;
  document.documentElement.dataset.olenView='account';
  h.dataset.olenMounted='5.0';
  h.dataset.olenAccountOwner='5.0';
  h.dataset.olenAccountPlan=String(profile.plan?.tier||'free');
  provider?.render?.({host:h,profile:clone(profile),reason});
  emit('rendered',{reason});
  return true;
}
function clearPresentation(){
  const h=host();
  h?.removeAttribute('data-olen-mounted');
  h?.removeAttribute('data-olen-account-owner');
  h?.removeAttribute('data-olen-account-plan');
}
function mount(context={}){
  mounted=true;
  provider?.mount?.({host:host(),profile:clone(profile),context});
  core.raf2(()=>render(context.reason||'enter-account'));
  emit('mounted',{context});
  return true;
}
function unmount(context={}){
  if(!mounted) return;
  provider?.unmount?.({host:host(),profile:clone(profile),context});
  clearPresentation();
  mounted=false;
  emit('unmounted',{context});
}
function setProvider(adapter){
  if(adapter!=null&&typeof adapter!=='object') throw new TypeError('ACCOUNT provider must be an adapter object');
  provider=adapter||null;
  emit('provider',{connected:!!provider});
  return !!provider;
}
function setProfile(next={},reason='profile-update'){
  if(!next||typeof next!=='object') return clone(profile);
  mergeProfile(next);
  emit('changed',{reason});
  if(mounted) render(reason);
  return clone(profile);
}
function setIdentity(identity={}){return setProfile({identity},'identity')}
function setPlan(plan={}){return setProfile({plan},'plan')}
function setPreferences(preferences={}){return setProfile({preferences},'preferences')}
function setStats(stats={}){return setProfile({stats},'stats')}
function setAchievements(items=[]){return setProfile({achievements:Array.isArray(items)?items:[]},'achievements')}
function setConnection(name,value){
  const key=String(name||'').trim();
  if(!key) return false;
  return setProfile({connections:{[key]:clone(value)}},'connection');
}
function removeConnection(name){
  const key=String(name||'').trim();
  if(!key||!(key in profile.connections)) return false;
  const connections={...profile.connections};
  delete connections[key];
  profile={...profile,connections,updatedAt:new Date().toISOString()};
  emit('changed',{reason:'connection-remove',name:key});
  if(mounted) render('connection-remove');
  return true;
}
async function load(options={}){
  if(!provider?.load){
    emit('loaded',{local:true});
    return {ok:true,profile:clone(profile),local:true};
  }
  emit('load-start');
  try{
    const result=await provider.load(clone(options));
    if(result===false||result?.ok===false){
      emit('load-failed',{result:clone(result)});
      return {ok:false,result};
    }
    const incoming=result?.profile||result;
    if(incoming&&typeof incoming==='object') mergeProfile(incoming);
    emit('loaded',{result:clone(result)});
    if(mounted) render('load');
    return {ok:true,profile:clone(profile),result};
  }catch(error){
    emit('error',{action:'load',message:String(error?.message||error)});
    return {ok:false,error};
  }
}
async function save(options={}){
  const snapshot=clone(profile);
  if(!provider?.save){
    emit('saved',{local:true});
    return {ok:true,profile:snapshot,local:true};
  }
  emit('save-start');
  try{
    const result=await provider.save(snapshot,clone(options));
    if(result===false||result?.ok===false){
      emit('save-failed',{result:clone(result)});
      return {ok:false,result};
    }
    emit('saved',{result:clone(result)});
    return {ok:true,profile:clone(profile),result};
  }catch(error){
    emit('error',{action:'save',message:String(error?.message||error)});
    return {ok:false,error};
  }
}
async function signIn(options={}){
  if(!provider?.signIn) return {ok:false,reason:'unsupported'};
  try{
    const result=await provider.signIn(clone(options));
    if(result===false||result?.ok===false) return {ok:false,result};
    if(result?.profile) mergeProfile(result.profile);
    emit('signed-in',{result:clone(result)});
    if(mounted) render('sign-in');
    return {ok:true,result};
  }catch(error){
    emit('error',{action:'signIn',message:String(error?.message||error)});
    return {ok:false,error};
  }
}
async function signOut(options={}){
  try{await provider?.signOut?.(clone(options))}catch(error){emit('error',{action:'signOut',message:String(error?.message||error)})}
  profile=clone(EMPTY);
  emit('signed-out');
  if(mounted) render('sign-out');
  return true;
}
function reset(reason='reset'){
  profile=clone(EMPTY);
  emit('reset',{reason});
  if(mounted) render(reason);
  return clone(profile);
}
function init(options={}){
  if(initialized) return ROOT.account;
  initialized=true;
  selectors={...selectors,...(options.selectors||{})};
  if(options.provider) setProvider(options.provider);
  if(options.profile) mergeProfile(options.profile);
  unregister=router.registerView('account',{
    enter:mount,
    leave:unmount,
    afterEnter:context=>emit('ready',{context})
  });
  emit('registered',{version:VERSION});
  return ROOT.account;
}
function destroy(){
  unregister?.();
  unregister=null;
  if(mounted) unmount({reason:'destroy'});
  provider?.destroy?.();
  provider=null;
  profile=clone(EMPTY);
  initialized=false;
}

ROOT.account=Object.freeze({
  version:VERSION,
  init,
  destroy,
  mount,
  unmount,
  render,
  setProvider,
  setProfile,
  setIdentity,
  setPlan,
  setPreferences,
  setStats,
  setAchievements,
  setConnection,
  removeConnection,
  load,
  save,
  signIn,
  signOut,
  reset,
  get mounted(){return mounted;},
  get profile(){return clone(profile);}
});

core.register('account',ROOT.account);

})();

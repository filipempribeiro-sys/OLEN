/* =========================================================
   OLEN 5.0 — CONTEXT ENGINE FOUNDATION
   =========================================================
   Compact, structured context for OLEN conversations.

   Design rules:
   - Memory is structured state, not an ever-growing transcript.
   - Permanent user preferences stay separate from Experience context.
   - Each Experience owns its own contextual decisions/history.
   - New facts replace contradictory active facts instead of accumulating.
   - Context Packs contain only the state relevant to the current request.
   - No network/provider/research/AI calls live in this module.
   ========================================================= */
(function contextEngineModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.contextEngine)return;

  const VERSION='0.1.0';
  const STORAGE_KEY='olen5.context-engine.v1';
  const DEFAULT_STYLE='balanced';
  const MAX_HISTORY=24;

  let userProfile={
    mobility:[],
    interests:[],
    conversationStyle:DEFAULT_STYLE,
    preferences:{}
  };
  let conversationState={};
  let currentIntent={};
  const experienceContexts=new Map();
  const listeners=new Set();

  function clone(value){
    if(value===undefined)return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso(){return new Date().toISOString();}
  function cleanString(value){return typeof value==='string'?value.trim():'';}
  function cleanArray(value){return Array.isArray(value)?clone(value):[];}
  function cleanObject(value){
    return value&&typeof value==='object'&&!Array.isArray(value)?clone(value):{};
  }

  function mergeObject(current,patch){
    const base=cleanObject(current);
    const incoming=cleanObject(patch);
    const next={...base};
    Object.keys(incoming).forEach(key=>{
      const value=incoming[key];
      if(value===undefined)return;
      if(value===null){delete next[key];return;}
      if(
        value&&typeof value==='object'&&!Array.isArray(value)&&
        base[key]&&typeof base[key]==='object'&&!Array.isArray(base[key])
      ) next[key]=mergeObject(base[key],value);
      else next[key]=clone(value);
    });
    return next;
  }

  function storageAvailable(){
    try{return !!global.localStorage;}catch(_error){return false;}
  }

  function serialize(){
    return {
      schemaVersion:1,
      userProfile:clone(userProfile),
      conversationState:clone(conversationState),
      currentIntent:clone(currentIntent),
      experienceContexts:Array.from(experienceContexts.entries()).map(([id,value])=>({id,value:clone(value)}))
    };
  }

  function persist(){
    if(!storageAvailable())return false;
    try{
      global.localStorage.setItem(STORAGE_KEY,JSON.stringify(serialize()));
      return true;
    }catch(error){
      console.warn('OLEN Context persistence unavailable',error);
      return false;
    }
  }

  function hydrate(){
    if(!storageAvailable())return false;
    try{
      const raw=global.localStorage.getItem(STORAGE_KEY);
      if(!raw)return false;
      const stored=JSON.parse(raw);
      userProfile=mergeObject(userProfile,stored?.userProfile);
      conversationState=cleanObject(stored?.conversationState);
      currentIntent=cleanObject(stored?.currentIntent);
      experienceContexts.clear();
      cleanArray(stored?.experienceContexts).forEach(item=>{
        const id=cleanString(item?.id);
        if(id)experienceContexts.set(id,cleanObject(item?.value));
      });
      return true;
    }catch(error){
      console.warn('OLEN Context hydration unavailable',error);
      return false;
    }
  }

  function emit(type,payload={}){
    const event=Object.freeze({type,payload:clone(payload),at:nowIso()});
    listeners.forEach(listener=>{
      try{listener(event);}catch(error){console.error('OLEN Context listener error',error);}
    });
  }

  function getExperienceId(explicitId){
    const explicit=cleanString(explicitId);
    if(explicit)return explicit;
    const active=root.experienceEngine?.getActive?.();
    return cleanString(active?.id);
  }

  function emptyExperienceContext(){
    return {
      requirements:{},
      decisions:{},
      exclusions:{},
      relevantHistory:[],
      session:{},
      updatedAt:''
    };
  }

  function ensureExperienceContext(id){
    const key=getExperienceId(id);
    if(!key)throw new Error('Contexto sem Experience id.');
    if(!experienceContexts.has(key))experienceContexts.set(key,emptyExperienceContext());
    return {key,value:experienceContexts.get(key)};
  }

  function getUserProfile(){return clone(userProfile);}
  function updateUserProfile(patch={}){
    userProfile=mergeObject(userProfile,patch);
    persist(); emit('context:user-profile',userProfile);
    return getUserProfile();
  }

  function getConversationState(){return clone(conversationState);}
  function updateConversationState(patch={}){
    conversationState=mergeObject(conversationState,patch);
    persist(); emit('context:conversation',conversationState);
    return getConversationState();
  }

  function getIntent(){return clone(currentIntent);}
  function setIntent(intent={}){
    currentIntent=cleanObject(intent);
    persist(); emit('context:intent',currentIntent);
    return getIntent();
  }

  function getExperienceContext(id){
    const key=getExperienceId(id);
    return key&&experienceContexts.has(key)?clone(experienceContexts.get(key)):null;
  }

  function updateExperienceContext(id,patch={},meta={}){
    const {key,value}=ensureExperienceContext(id);
    const next=mergeObject(value,patch);
    next.updatedAt=nowIso();
    experienceContexts.set(key,next);
    persist(); emit('context:experience',{experienceId:key,context:next,meta});
    return clone(next);
  }

  function setRequirement(id,name,value,meta={}){
    const key=cleanString(name);
    if(!key)throw new Error('Requirement sem nome.');
    return updateExperienceContext(id,{requirements:{[key]:value}},{...meta,action:'set-requirement',key});
  }

  function forgetRequirement(id,name,meta={}){
    const key=cleanString(name);
    if(!key)throw new Error('Requirement sem nome.');
    return updateExperienceContext(id,{requirements:{[key]:null},exclusions:{[key]:true}},{...meta,action:'forget-requirement',key});
  }

  function setDecision(id,name,value,meta={}){
    const key=cleanString(name);
    if(!key)throw new Error('Decision sem nome.');
    return updateExperienceContext(id,{decisions:{[key]:value}},{...meta,action:'set-decision',key});
  }

  function addRelevantHistory(id,item={}){
    const {key,value}=ensureExperienceContext(id);
    const entry={...cleanObject(item),at:cleanString(item?.at)||nowIso()};
    const history=[...cleanArray(value.relevantHistory),entry].slice(-MAX_HISTORY);
    return updateExperienceContext(key,{relevantHistory:history},{action:'history'});
  }

  function buildPack(options={}){
    const experienceId=getExperienceId(options.experienceId);
    const experience=experienceId?root.experienceEngine?.get?.(experienceId)||null:null;
    const expContext=experienceId?getExperienceContext(experienceId):null;
    const includeHistory=options.includeHistory!==false;

    return {
      schemaVersion:1,
      currentIntent:getIntent(),
      userPreferences:getUserProfile(),
      conversation:getConversationState(),
      experience:experience?{
        id:experience.id,
        lifecycle:experience.lifecycle,
        title:experience.title,
        intent:clone(experience.intent),
        time:clone(experience.time),
        mobility:clone(experience.mobility),
        route:clone(experience.route),
        places:clone(experience.places),
        participants:clone(experience.participants),
        plan:clone(experience.plan)
      }:null,
      experienceContext:expContext?{
        requirements:clone(expContext.requirements),
        decisions:clone(expContext.decisions),
        exclusions:clone(expContext.exclusions),
        relevantHistory:includeHistory?clone(expContext.relevantHistory):[]
      }:null
    };
  }

  function removeExperienceContext(id){
    const key=getExperienceId(id);
    if(!key)return false;
    const removed=experienceContexts.delete(key);
    if(removed){persist();emit('context:experience-removed',{experienceId:key});}
    return removed;
  }

  function subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('Listener inválido.');
    listeners.add(listener);
    return ()=>listeners.delete(listener);
  }

  hydrate();

  root.contextEngine=Object.freeze({
    version:VERSION,
    getUserProfile,
    updateUserProfile,
    getConversationState,
    updateConversationState,
    getIntent,
    setIntent,
    getExperienceContext,
    updateExperienceContext,
    setRequirement,
    forgetRequirement,
    setDecision,
    addRelevantHistory,
    buildPack,
    removeExperienceContext,
    subscribe
  });
})(window);

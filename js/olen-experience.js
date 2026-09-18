/* =========================================================
   OLEN 5.0 — EXPERIENCE ENGINE FOUNDATION
   =========================================================
   Authority for persistent Experience state shared by
   CHAT · MAPA · GO · LIVE.

   Design rules:
   - An Experience is structured data and does not depend on AI.
   - UI modules consume the same Experience instead of rebuilding it.
   - Updates are explicit, immutable at the public boundary and observable.
   - Nested domain state is merged by contract so one module cannot erase
     sibling state owned by another module with a partial update.
   - State is persisted locally so an Experience survives reload/reopen.
   - No network/provider/research calls live in this module.
   - No legacy runtime is modified by loading this file alone.
   ========================================================= */
(function experienceEngineModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.experienceEngine)return;

  const VERSION='0.3.0';
  const STORAGE_KEY='olen5.experience-engine.v1';
  const LIFECYCLE=Object.freeze([
    'IDEA',
    'PLANNING',
    'READY',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED'
  ]);
  const MERGED_DOMAINS=Object.freeze([
    'intent',
    'time',
    'mobility',
    'route',
    'plan',
    'research',
    'map',
    'go',
    'live',
    'integrations',
    'context'
  ]);

  const listeners=new Set();
  const experiences=new Map();
  let activeExperienceId='';

  function clone(value){
    if(value===undefined)return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function cleanString(value){
    return typeof value==='string'?value.trim():'';
  }

  function cleanArray(value){
    return Array.isArray(value)?clone(value):[];
  }

  function cleanObject(value){
    return value&&typeof value==='object'&&!Array.isArray(value)?clone(value):{};
  }

  function mergeObject(current,patch){
    const base=cleanObject(current);
    const incoming=cleanObject(patch);
    const next={...base};

    Object.keys(incoming).forEach(key=>{
      const value=incoming[key];
      if(
        value&&typeof value==='object'&&!Array.isArray(value)&&
        base[key]&&typeof base[key]==='object'&&!Array.isArray(base[key])
      ){
        next[key]=mergeObject(base[key],value);
      }else{
        next[key]=clone(value);
      }
    });

    return next;
  }

  function makeId(){
    if(global.crypto&&typeof global.crypto.randomUUID==='function'){
      return 'exp_'+global.crypto.randomUUID();
    }
    return 'exp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
  }

  function normalizeLifecycle(value,fallback='IDEA'){
    const candidate=cleanString(value).toUpperCase();
    return LIFECYCLE.includes(candidate)?candidate:fallback;
  }

  function baseExperience(input={}){
    const createdAt=cleanString(input.createdAt)||nowIso();
    const lifecycle=normalizeLifecycle(input.lifecycle,'IDEA');

    return {
      schemaVersion:1,
      id:cleanString(input.id)||makeId(),
      lifecycle,
      title:cleanString(input.title),
      intent:cleanObject(input.intent),
      time:cleanObject(input.time),
      mobility:{
        habitual:cleanArray(input.mobility?.habitual),
        contextual:cleanArray(input.mobility?.contextual),
        exceptional:cleanArray(input.mobility?.exceptional),
        segments:cleanArray(input.mobility?.segments)
      },
      route:cleanObject(input.route),
      places:cleanArray(input.places),
      participants:cleanArray(input.participants),
      plan:cleanObject(input.plan),
      research:{
        profile:cleanString(input.research?.profile)||'LIGHT',
        facts:cleanArray(input.research?.facts),
        missing:cleanArray(input.research?.missing),
        updatedAt:cleanString(input.research?.updatedAt)
      },
      map:cleanObject(input.map),
      go:cleanObject(input.go),
      live:cleanObject(input.live),
      integrations:cleanObject(input.integrations),
      context:cleanObject(input.context),
      decisions:cleanArray(input.decisions),
      rejected:cleanArray(input.rejected),
      createdAt,
      updatedAt:cleanString(input.updatedAt)||createdAt
    };
  }

  function assertExperience(value){
    if(!value||typeof value!=='object')throw new TypeError('Experience inválida.');
    if(!cleanString(value.id))throw new TypeError('Experience sem id.');
    if(!LIFECYCLE.includes(value.lifecycle))throw new TypeError('Lifecycle inválido.');
    return value;
  }

  function storageAvailable(){
    try{
      return !!global.localStorage;
    }catch(_error){
      return false;
    }
  }

  function persist(){
    if(!storageAvailable())return false;
    try{
      global.localStorage.setItem(STORAGE_KEY,JSON.stringify({
        schemaVersion:1,
        activeExperienceId,
        experiences:Array.from(experiences.values())
      }));
      return true;
    }catch(error){
      console.warn('OLEN Experience persistence unavailable',error);
      return false;
    }
  }

  function hydrate(){
    if(!storageAvailable())return false;
    try{
      const raw=global.localStorage.getItem(STORAGE_KEY);
      if(!raw)return false;
      const stored=JSON.parse(raw);
      const items=Array.isArray(stored?.experiences)?stored.experiences:[];

      experiences.clear();
      items.forEach(item=>{
        try{
          const experience=assertExperience(baseExperience(item));
          experiences.set(experience.id,experience);
        }catch(error){
          console.warn('OLEN ignored invalid persisted Experience',error);
        }
      });

      const requestedActive=cleanString(stored?.activeExperienceId);
      activeExperienceId=requestedActive&&experiences.has(requestedActive)?requestedActive:'';
      return experiences.size>0;
    }catch(error){
      console.warn('OLEN Experience hydration unavailable',error);
      return false;
    }
  }

  function emit(type,experience,meta={}){
    const event=Object.freeze({
      type,
      experience:experience?clone(experience):null,
      activeExperienceId,
      meta:clone(meta),
      at:nowIso()
    });
    listeners.forEach(listener=>{
      try{listener(event)}catch(error){
        console.error('OLEN Experience listener error',error);
      }
    });
  }

  function create(input={},options={}){
    const experience=assertExperience(baseExperience(input));
    if(experiences.has(experience.id))throw new Error('Experience já existe: '+experience.id);
    experiences.set(experience.id,experience);

    if(options.activate!==false){
      activeExperienceId=experience.id;
    }

    persist();
    emit('experience:created',experience,{activated:activeExperienceId===experience.id});
    return clone(experience);
  }

  function get(id){
    const key=cleanString(id)||activeExperienceId;
    return key&&experiences.has(key)?clone(experiences.get(key)):null;
  }

  function getActive(){
    return get(activeExperienceId);
  }

  function list(){
    return Array.from(experiences.values())
      .map(clone)
      .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function buildUpdate(current,patch){
    const input={...current,...clone(patch)};

    MERGED_DOMAINS.forEach(domain=>{
      if(Object.prototype.hasOwnProperty.call(patch,domain)){
        input[domain]=mergeObject(current[domain],patch[domain]);
      }
    });

    input.id=current.id;
    input.createdAt=current.createdAt;
    input.lifecycle=patch.lifecycle===undefined
      ?current.lifecycle
      :normalizeLifecycle(patch.lifecycle,current.lifecycle);
    input.updatedAt=nowIso();

    return baseExperience(input);
  }

  function update(id,patch={},meta={}){
    const key=cleanString(id)||activeExperienceId;
    if(!key||!experiences.has(key))throw new Error('Experience não encontrada.');
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Patch inválido.');

    const current=experiences.get(key);
    const next=assertExperience(buildUpdate(current,patch));

    experiences.set(key,next);
    persist();
    emit('experience:updated',next,meta);
    return clone(next);
  }

  function updateDomain(id,domain,patch={},meta={}){
    const name=cleanString(domain);
    if(!MERGED_DOMAINS.includes(name))throw new Error('Domínio Experience inválido: '+name);
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Patch de domínio inválido.');
    return update(id,{[name]:patch},{...meta,domain:name});
  }

  function transition(id,nextLifecycle,meta={}){
    const target=normalizeLifecycle(nextLifecycle,'');
    if(!target)throw new Error('Lifecycle inválido: '+nextLifecycle);
    const current=get(id);
    if(!current)throw new Error('Experience não encontrada.');
    if(current.lifecycle===target)return current;
    return update(current.id,{lifecycle:target},{...meta,from:current.lifecycle,to:target});
  }

  function activate(id,meta={}){
    const key=cleanString(id);
    if(!key||!experiences.has(key))throw new Error('Experience não encontrada.');
    activeExperienceId=key;
    const experience=experiences.get(key);
    persist();
    emit('experience:activated',experience,meta);
    return clone(experience);
  }

  function clearActive(meta={}){
    const previous=getActive();
    activeExperienceId='';
    persist();
    emit('experience:deactivated',previous,meta);
    return previous;
  }

  function remove(id,meta={}){
    const key=cleanString(id);
    if(!key||!experiences.has(key))return false;
    const previous=experiences.get(key);
    experiences.delete(key);
    if(activeExperienceId===key)activeExperienceId='';
    persist();
    emit('experience:removed',previous,meta);
    return true;
  }

  function importExperience(raw,{activate:shouldActivate=false,replace=false}={}){
    const experience=assertExperience(baseExperience(raw));
    if(experiences.has(experience.id)&&!replace){
      throw new Error('Experience já existe: '+experience.id);
    }
    experiences.set(experience.id,experience);
    if(shouldActivate)activeExperienceId=experience.id;
    persist();
    emit('experience:imported',experience,{activated:shouldActivate,replace});
    return clone(experience);
  }

  function exportExperience(id){
    return get(id);
  }

  function subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('Listener inválido.');
    listeners.add(listener);
    return ()=>listeners.delete(listener);
  }

  hydrate();

  root.experienceEngine=Object.freeze({
    version:VERSION,
    lifecycle:LIFECYCLE,
    mergedDomains:MERGED_DOMAINS,
    create,
    get,
    getActive,
    list,
    update,
    updateDomain,
    transition,
    activate,
    clearActive,
    remove,
    importExperience,
    exportExperience,
    subscribe
  });
})(window);

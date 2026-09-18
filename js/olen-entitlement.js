/* =========================================================
   OLEN 5.0 — ENTITLEMENT ENGINE FOUNDATION
   =========================================================
   One authority for what the user may do.

   Frozen architecture:
   - Plan != Capability != Unlock != Mobility != Research depth.
   - Modules ask can("capability"), never "is premium?".
   - Plans are bundles of capabilities, not runtime identities.
   - Individual unlocks can add capabilities without changing plan.
   - Access can come from plan, purchase, points, contribution,
     trial, promotion or beta.
   - Expired grants stop access but never delete Experience data.
   - No payments, network, AI or provider calls live here.
   ========================================================= */
(function entitlementEngineModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.entitlementEngine)return;

  const VERSION='0.1.0';
  const STORAGE_KEY='olen5.entitlement-engine.v1';
  const PLAN_ORDER=Object.freeze(['FREE','SILVER','GOLD','PLATINUM']);

  const CAPABILITIES=Object.freeze([
    'outdoor.trails.discover',
    'outdoor.trails.select',
    'experience.create',
    'experience.enrich',
    'map.basic',
    'map.advanced',
    'go.basic',
    'go.navigation',
    'live.basic',
    'live.tracking',
    'live.location_share',
    'collaboration.basic',
    'mobility.multimodal',
    'mobility.vehicle_profile',
    'mobility.maritime_context',
    'mobility.aviation_context',
    'research.light',
    'research.standard',
    'research.deep',
    'integration.spotify',
    'integration.calendar',
    'integration.wearables',
    'profile.personalization',
    'conversation.style'
  ]);

  const PLAN_CAPABILITIES=Object.freeze({
    FREE:Object.freeze([
      'outdoor.trails.discover','outdoor.trails.select','experience.create',
      'map.basic','go.basic','live.basic','collaboration.basic',
      'mobility.multimodal','mobility.vehicle_profile',
      'mobility.maritime_context','mobility.aviation_context',
      'research.light','profile.personalization','conversation.style'
    ]),
    SILVER:Object.freeze([
      'outdoor.trails.discover','outdoor.trails.select','experience.create','experience.enrich',
      'map.basic','go.basic','go.navigation','live.basic','collaboration.basic',
      'mobility.multimodal','mobility.vehicle_profile','mobility.maritime_context','mobility.aviation_context',
      'research.light','profile.personalization','conversation.style'
    ]),
    GOLD:Object.freeze([
      'outdoor.trails.discover','outdoor.trails.select','experience.create','experience.enrich',
      'map.basic','map.advanced','go.basic','go.navigation','live.basic','live.tracking','live.location_share',
      'collaboration.basic','mobility.multimodal','mobility.vehicle_profile','mobility.maritime_context','mobility.aviation_context',
      'research.light','research.standard','integration.spotify','integration.calendar',
      'profile.personalization','conversation.style'
    ]),
    PLATINUM:Object.freeze(CAPABILITIES)
  });

  const GRANT_SOURCES=Object.freeze(['purchase','points','contribution','trial','promotion','beta','admin']);

  let state={plan:'FREE',grants:[]};
  const listeners=new Set();

  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function nowIso(){return new Date().toISOString();}
  function cleanString(value){return typeof value==='string'?value.trim():'';}
  function normalizePlan(value){
    const plan=cleanString(value).toUpperCase();
    if(!PLAN_ORDER.includes(plan))throw new Error(`Plano OLEN inválido: ${value}`);
    return plan;
  }
  function assertCapability(value){
    const capability=cleanString(value);
    if(!CAPABILITIES.includes(capability))throw new Error(`Capability OLEN desconhecida: ${value}`);
    return capability;
  }
  function storageAvailable(){try{return !!global.localStorage;}catch(_error){return false;}}
  function persist(){
    if(!storageAvailable())return false;
    try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,...state}));return true;}
    catch(error){console.warn('OLEN Entitlement persistence unavailable',error);return false;}
  }
  function hydrate(){
    if(!storageAvailable())return false;
    try{
      const raw=global.localStorage.getItem(STORAGE_KEY);
      if(!raw)return false;
      const stored=JSON.parse(raw);
      const plan=PLAN_ORDER.includes(cleanString(stored?.plan).toUpperCase())?cleanString(stored.plan).toUpperCase():'FREE';
      const grants=Array.isArray(stored?.grants)?stored.grants.filter(item=>CAPABILITIES.includes(item?.capability)):[];
      state={plan,grants:clone(grants)};
      return true;
    }catch(error){console.warn('OLEN Entitlement hydration unavailable',error);return false;}
  }
  function emit(type,payload={}){
    const event=Object.freeze({type,payload:clone(payload),at:nowIso()});
    listeners.forEach(listener=>{try{listener(event);}catch(error){console.error('OLEN Entitlement listener error',error);}});
  }
  function isGrantActive(grant,at=Date.now()){
    if(!grant||grant.revokedAt)return false;
    const starts=grant.startsAt?Date.parse(grant.startsAt):NaN;
    const expires=grant.expiresAt?Date.parse(grant.expiresAt):NaN;
    if(Number.isFinite(starts)&&starts>at)return false;
    if(Number.isFinite(expires)&&expires<=at)return false;
    return true;
  }
  function getPlan(){return state.plan;}
  function setPlan(plan,meta={}){
    const next=normalizePlan(plan);
    const previous=state.plan;
    state={...state,plan:next};
    persist();emit('entitlement:plan',{previous,plan:next,meta});
    return next;
  }
  function listPlanCapabilities(plan=state.plan){return [...PLAN_CAPABILITIES[normalizePlan(plan)]];}
  function listGrants(options={}){
    const activeOnly=options.activeOnly===true;
    return clone(activeOnly?state.grants.filter(grant=>isGrantActive(grant)):state.grants);
  }
  function grant(capability,options={}){
    const cap=assertCapability(capability);
    const source=cleanString(options.source)||'admin';
    if(!GRANT_SOURCES.includes(source))throw new Error(`Fonte de unlock inválida: ${source}`);
    const item={
      id:cleanString(options.id)||`grant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
      capability:cap,
      source,
      scope:cleanString(options.scope)||'account',
      experienceId:cleanString(options.experienceId)||null,
      startsAt:cleanString(options.startsAt)||nowIso(),
      expiresAt:cleanString(options.expiresAt)||null,
      createdAt:nowIso(),
      revokedAt:null,
      meta:options.meta&&typeof options.meta==='object'?clone(options.meta):{}
    };
    state={...state,grants:[...state.grants,item]};
    persist();emit('entitlement:grant',item);
    return clone(item);
  }
  function revoke(grantId,meta={}){
    const id=cleanString(grantId);
    let changed=false;
    const grants=state.grants.map(item=>{
      if(item.id!==id||item.revokedAt)return item;
      changed=true;return {...item,revokedAt:nowIso(),revokeMeta:clone(meta)};
    });
    if(changed){state={...state,grants};persist();emit('entitlement:revoke',{grantId:id,meta});}
    return changed;
  }
  function resolve(capability,context={}){
    const cap=assertCapability(capability);
    const plan=state.plan;
    if(PLAN_CAPABILITIES[plan].includes(cap))return {allowed:true,capability:cap,source:'plan',plan,grant:null};

    const experienceId=cleanString(context.experienceId);
    const active=state.grants
      .filter(item=>item.capability===cap&&isGrantActive(item))
      .filter(item=>item.scope!=='experience'||(experienceId&&item.experienceId===experienceId))
      .sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))[0];

    if(active)return {allowed:true,capability:cap,source:active.source,plan,grant:clone(active)};
    return {allowed:false,capability:cap,source:'none',plan,grant:null};
  }
  function can(capability,context={}){return resolve(capability,context).allowed;}
  function effectiveCapabilities(context={}){
    return CAPABILITIES.filter(capability=>can(capability,context));
  }
  function snapshot(context={}){
    return {
      schemaVersion:1,
      plan:state.plan,
      capabilities:effectiveCapabilities(context),
      activeGrants:listGrants({activeOnly:true})
    };
  }
  function subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('Listener inválido.');
    listeners.add(listener);return ()=>listeners.delete(listener);
  }

  hydrate();

  root.entitlementEngine=Object.freeze({
    version:VERSION,
    capabilities:[...CAPABILITIES],
    plans:[...PLAN_ORDER],
    grantSources:[...GRANT_SOURCES],
    getPlan,
    setPlan,
    listPlanCapabilities,
    listGrants,
    grant,
    revoke,
    resolve,
    can,
    effectiveCapabilities,
    snapshot,
    subscribe
  });
})(window);

/* =========================================================
   OLEN 5.0 — ENTITLEMENT ENGINE CONTRACT TEST
   =========================================================
   Local-only deterministic test. No network, AI, research,
   payment provider or production API.

   Explicit invocation:
     OLEN5.entitlementTest.run()

   Coverage:
   1. FREE has the complete narrow Outdoor core
   2. Locked capability is denied by default
   3. Individual unlock works without changing plan
   4. Experience-scoped unlock never leaks to another Experience
   5. Revocation removes access without changing plan
   6. GOLD bundle grants its declared capabilities
   7. Expired unlock never grants access
   8. Resolution reports the real source of access
   ========================================================= */
(function entitlementContractTestModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.entitlementTest)return;

  const VERSION='0.1.0';
  const STORAGE_KEY='olen5.entitlement-engine.v1';

  function assert(condition,message){if(!condition)throw new Error(message);}
  function readStorage(){try{return global.localStorage?.getItem(STORAGE_KEY)??null;}catch(_error){return null;}}
  function writeStorage(value){
    try{
      if(!global.localStorage)return;
      if(value===null)global.localStorage.removeItem(STORAGE_KEY);
      else global.localStorage.setItem(STORAGE_KEY,value);
    }catch(_error){}
  }
  function record(results,name,fn){
    try{fn();results.push({name,pass:true,details:'ok'});}
    catch(error){results.push({name,pass:false,details:error?.message||String(error)});}
  }

  async function run(){
    const engine=root.entitlementEngine;
    if(!engine)throw new Error('OLEN Entitlement Engine não carregado.');

    const results=[];
    const originalStorage=readStorage();
    const originalPlan=engine.getPlan();
    const originalGrants=engine.listGrants();
    const createdGrantIds=[];

    try{
      engine.setPlan('FREE',{source:'contract-test'});

      record(results,'FREE preserves complete narrow Outdoor core',()=>{
        const required=[
          'outdoor.trails.discover','outdoor.trails.select','experience.create',
          'map.basic','go.basic','live.basic','collaboration.basic','research.light'
        ];
        required.forEach(capability=>assert(engine.can(capability),`FREE sem ${capability}`));
      });

      record(results,'Premium capability locked by default',()=>{
        assert(engine.can('integration.spotify')===false,'Spotify não deve vir incluído no FREE');
        assert(engine.can('live.tracking')===false,'tracking avançado não deve vir incluído no FREE');
      });

      const spotifyGrant=engine.grant('integration.spotify',{source:'points',id:`ent_test_spotify_${Date.now()}`});
      createdGrantIds.push(spotifyGrant.id);
      record(results,'Individual unlock does not change plan',()=>{
        assert(engine.getPlan()==='FREE','unlock individual alterou o plano');
        assert(engine.can('integration.spotify')===true,'unlock individual não concedeu Spotify');
      });

      const experienceGrant=engine.grant('live.location_share',{
        source:'promotion',
        scope:'experience',
        experienceId:'exp_entitlement_a',
        id:`ent_test_experience_${Date.now()}`
      });
      createdGrantIds.push(experienceGrant.id);
      record(results,'Experience unlock is isolated',()=>{
        assert(engine.can('live.location_share',{experienceId:'exp_entitlement_a'})===true,'unlock não funciona na Experience certa');
        assert(engine.can('live.location_share',{experienceId:'exp_entitlement_b'})===false,'unlock contaminou outra Experience');
        assert(engine.can('live.location_share')===false,'unlock de Experience contaminou a conta');
      });

      engine.revoke(spotifyGrant.id,{source:'contract-test'});
      record(results,'Revocation removes access without changing plan',()=>{
        assert(engine.getPlan()==='FREE','revogação alterou plano');
        assert(engine.can('integration.spotify')===false,'capability continua ativa após revogação');
      });

      engine.setPlan('GOLD',{source:'contract-test'});
      record(results,'GOLD is a capability bundle',()=>{
        assert(engine.can('integration.spotify')===true,'GOLD sem Spotify');
        assert(engine.can('integration.calendar')===true,'GOLD sem Calendar');
        assert(engine.can('research.standard')===true,'GOLD sem research.standard');
        assert(engine.can('research.deep')===false,'GOLD não deve implicar research.deep');
      });

      engine.setPlan('FREE',{source:'contract-test'});
      const expiredGrant=engine.grant('integration.calendar',{
        source:'trial',
        id:`ent_test_expired_${Date.now()}`,
        startsAt:'2020-01-01T00:00:00.000Z',
        expiresAt:'2020-01-02T00:00:00.000Z'
      });
      createdGrantIds.push(expiredGrant.id);
      record(results,'Expired grant never grants access',()=>{
        assert(engine.can('integration.calendar')===false,'grant expirado concedeu acesso');
      });

      const trackingGrant=engine.grant('live.tracking',{source:'contribution',id:`ent_test_source_${Date.now()}`});
      createdGrantIds.push(trackingGrant.id);
      record(results,'Resolution reports access source',()=>{
        const unlocked=engine.resolve('live.tracking');
        const included=engine.resolve('map.basic');
        const denied=engine.resolve('research.deep');
        assert(unlocked.allowed&&unlocked.source==='contribution','fonte do unlock incorreta');
        assert(included.allowed&&included.source==='plan','fonte de capability incluída incorreta');
        assert(!denied.allowed&&denied.source==='none','fonte de capability negada incorreta');
      });
    }finally{
      createdGrantIds.forEach(id=>engine.revoke(id,{source:'contract-cleanup'}));
      engine.setPlan(originalPlan,{source:'contract-restore'});
      writeStorage(originalStorage);

      // Restore in-memory grants as closely as the public contract permits.
      const currentIds=new Set(engine.listGrants().map(item=>item.id));
      originalGrants.forEach(item=>{
        if(currentIds.has(item.id)||item.revokedAt)return;
        try{
          engine.grant(item.capability,{
            id:item.id,source:item.source,scope:item.scope,
            experienceId:item.experienceId,startsAt:item.startsAt,
            expiresAt:item.expiresAt,meta:item.meta
          });
        }catch(_error){}
      });
      writeStorage(originalStorage);
    }

    const passed=results.filter(item=>item.pass).length;
    const report={
      version:VERSION,
      engineVersion:engine.version,
      passed,total:results.length,
      score:`${passed}/${results.length}`,
      ok:passed===results.length,
      results
    };
    console.table(results);
    console.info(`[OLEN 5.0] Entitlement contract: ${report.score}`);
    return report;
  }

  root.entitlementTest=Object.freeze({version:VERSION,run});
})(window);

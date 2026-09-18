/* =========================================================
   OLEN 5.0 — EXPERIENCE ENGINE CONTRACT TEST
   =========================================================
   Deterministic, local-only test. It does not call network, AI,
   research providers or production APIs.

   Explicit invocation:
     OLEN5.experienceTest.run()

   Coverage:
   1. create + active Experience
   2. isolated nested-domain merge
   3. lifecycle transition
   4. persistence snapshot
   5. export/import continuity
   6. cleanup / restoration of pre-test local state
   ========================================================= */
(function experienceContractTestModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.experienceTest)return;

  const VERSION='0.1.0';
  const STORAGE_KEY='olen5.experience-engine.v1';

  function assert(condition,message){
    if(!condition)throw new Error(message);
  }

  function same(a,b){
    return JSON.stringify(a)===JSON.stringify(b);
  }

  function readStorage(){
    try{return global.localStorage?.getItem(STORAGE_KEY)??null;}
    catch(_error){return null;}
  }

  function writeStorage(value){
    try{
      if(!global.localStorage)return;
      if(value===null)global.localStorage.removeItem(STORAGE_KEY);
      else global.localStorage.setItem(STORAGE_KEY,value);
    }catch(_error){}
  }

  function record(results,name,fn){
    try{
      fn();
      results.push({name,pass:true,details:'ok'});
    }catch(error){
      results.push({name,pass:false,details:error?.message||String(error)});
    }
  }

  async function run(){
    const engine=root.experienceEngine;
    if(!engine)throw new Error('OLEN Experience Engine não carregado.');

    const results=[];
    const originalStorage=readStorage();
    const originalExperiences=engine.list();
    const originalActive=engine.getActive();
    const testId='exp_contract_'+Date.now().toString(36);

    try{
      const created=engine.create({
        id:testId,
        title:'Experience Contract Test',
        intent:{kind:'trail',destination:'Sintra'},
        mobility:{
          habitual:['walk'],
          contextual:[],
          exceptional:[],
          segments:[]
        },
        route:{id:'route-test',distanceKm:8.4},
        map:{viewport:{zoom:12},selectedPoi:'poi-a'},
        go:{progress:{percent:0},currentSegment:'segment-a'},
        live:{tracking:{enabled:false},participants:{visible:1}},
        context:{conversation:{topic:'trail'}}
      });

      record(results,'Create + active Experience',()=>{
        assert(created.id===testId,'id incorreto');
        assert(engine.getActive()?.id===testId,'Experience não ficou ativa');
        assert(created.lifecycle==='IDEA','lifecycle inicial incorreto');
      });

      engine.updateDomain(testId,'go',{progress:{percent:35}});
      const afterGo=engine.get(testId);
      record(results,'GO update preserves sibling domains',()=>{
        assert(afterGo.go.progress.percent===35,'progresso GO não atualizado');
        assert(afterGo.go.currentSegment==='segment-a','GO sibling apagado');
        assert(afterGo.map.selectedPoi==='poi-a','MAPA foi alterado por GO');
        assert(afterGo.live.participants.visible===1,'LIVE foi alterado por GO');
        assert(afterGo.route.distanceKm===8.4,'rota foi alterada por GO');
      });

      engine.updateDomain(testId,'live',{tracking:{enabled:true,accuracy:'high'}});
      const afterLive=engine.get(testId);
      record(results,'LIVE nested merge preserves Experience',()=>{
        assert(afterLive.live.tracking.enabled===true,'tracking não atualizado');
        assert(afterLive.live.tracking.accuracy==='high','campo LIVE novo em falta');
        assert(afterLive.live.participants.visible===1,'LIVE sibling apagado');
        assert(afterLive.go.progress.percent===35,'GO foi alterado por LIVE');
      });

      engine.transition(testId,'PLANNING');
      engine.transition(testId,'READY');
      const ready=engine.get(testId);
      record(results,'Lifecycle transition',()=>{
        assert(ready.lifecycle==='READY','transição para READY falhou');
      });

      const persisted=readStorage();
      record(results,'Persistence snapshot',()=>{
        assert(typeof persisted==='string'&&persisted.length>0,'estado não persistido');
        const parsed=JSON.parse(persisted);
        const stored=parsed.experiences.find(item=>item.id===testId);
        assert(stored?.lifecycle==='READY','lifecycle persistido incorreto');
        assert(stored?.go?.progress?.percent===35,'GO persistido incorreto');
        assert(stored?.live?.tracking?.enabled===true,'LIVE persistido incorreto');
      });

      const exported=engine.exportExperience(testId);
      engine.remove(testId);
      engine.importExperience(exported,{activate:true});
      const restored=engine.getActive();
      record(results,'Export/import continuity',()=>{
        assert(restored?.id===testId,'Experience não restaurada');
        assert(restored.lifecycle==='READY','lifecycle perdido no import');
        assert(restored.map.selectedPoi==='poi-a','MAPA perdido no import');
        assert(restored.go.progress.percent===35,'GO perdido no import');
        assert(restored.live.tracking.enabled===true,'LIVE perdido no import');
        assert(restored.context.conversation.topic==='trail','contexto perdido no import');
      });
    }finally{
      if(engine.get(testId))engine.remove(testId,{source:'contract-test-cleanup'});

      originalExperiences.forEach(item=>{
        if(!engine.get(item.id)){
          engine.importExperience(item,{activate:false,replace:false});
        }
      });
      if(originalActive?.id&&engine.get(originalActive.id)){
        engine.activate(originalActive.id,{source:'contract-test-restore'});
      }else{
        engine.clearActive({source:'contract-test-restore'});
      }

      writeStorage(originalStorage);
    }

    record(results,'Test leaves persisted state unchanged',()=>{
      assert(readStorage()===originalStorage,'teste alterou o estado persistido pré-existente');
      const currentIds=engine.list().map(item=>item.id).sort();
      const originalIds=originalExperiences.map(item=>item.id).sort();
      assert(same(currentIds,originalIds),'teste alterou a coleção Experience em memória');
      assert((engine.getActive()?.id||'')===(originalActive?.id||''),'teste alterou Experience ativa');
    });

    const passed=results.filter(item=>item.pass).length;
    const report={
      version:VERSION,
      engineVersion:engine.version,
      passed,
      total:results.length,
      score:`${passed}/${results.length}`,
      ok:passed===results.length,
      results:results.map(item=>({...item}))
    };

    console.table(report.results);
    console.info(`[OLEN 5.0] Experience contract: ${report.score}`);
    return report;
  }

  root.experienceTest=Object.freeze({version:VERSION,run});
})(window);

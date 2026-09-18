/* =========================================================
   OLEN 5.0 — CONTEXT ENGINE CONTRACT TEST
   =========================================================
   Local-only deterministic test. No network, AI or research.

   Explicit invocation:
     OLEN5.contextTest.run()

   Coverage:
   1. User Profile remains separate from Experience context
   2. Current facts replace previous active facts
   3. Forgotten requirements disappear and become exclusions
   4. Two Experiences never contaminate each other
   5. Short follow-up keeps all relevant prior requirements
   6. Context Pack is structured and compact
   ========================================================= */
(function contextContractTestModule(global){
  'use strict';

  const root=global.OLEN5=global.OLEN5||{};
  if(root.contextTest)return;

  const VERSION='0.1.0';
  const CONTEXT_STORAGE_KEY='olen5.context-engine.v1';
  const EXPERIENCE_STORAGE_KEY='olen5.experience-engine.v1';

  function assert(condition,message){if(!condition)throw new Error(message);}
  function read(key){try{return global.localStorage?.getItem(key)??null;}catch(_error){return null;}}
  function write(key,value){
    try{
      if(!global.localStorage)return;
      if(value===null)global.localStorage.removeItem(key);
      else global.localStorage.setItem(key,value);
    }catch(_error){}
  }
  function record(results,name,fn){
    try{fn();results.push({name,pass:true,details:'ok'});}
    catch(error){results.push({name,pass:false,details:error?.message||String(error)});}
  }

  async function run(){
    const context=root.contextEngine;
    const experience=root.experienceEngine;
    if(!context)throw new Error('OLEN Context Engine não carregado.');
    if(!experience)throw new Error('OLEN Experience Engine não carregado.');

    const results=[];
    const originalContextStorage=read(CONTEXT_STORAGE_KEY);
    const originalExperienceStorage=read(EXPERIENCE_STORAGE_KEY);
    const originalExperiences=experience.list();
    const originalActive=experience.getActive();
    const idA='exp_context_a_'+Date.now().toString(36);
    const idB='exp_context_b_'+Date.now().toString(36);

    try{
      experience.create({id:idA,title:'Sintra Outdoor',intent:{kind:'trail'}},{activate:true});
      experience.create({id:idB,title:'Gerês Weekend',intent:{kind:'trip'}},{activate:false});

      const beforeProfile=context.getUserProfile();
      context.updateUserProfile({mobility:['walk','bike'],conversationStyle:'direct'});
      context.setRequirement(idA,'partySize',2);
      record(results,'User Profile separated from Experience',()=>{
        const profile=context.getUserProfile();
        const exp=context.getExperienceContext(idA);
        assert(profile.mobility.includes('walk'),'mobilidade habitual em falta');
        assert(profile.conversationStyle==='direct','estilo de conversa em falta');
        assert(exp.requirements.partySize===2,'requisito Experience em falta');
        assert(!Object.prototype.hasOwnProperty.call(profile,'partySize'),'requisito contaminou User Profile');
      });

      context.setRequirement(idA,'partySize',4);
      record(results,'Latest active fact replaces previous fact',()=>{
        const exp=context.getExperienceContext(idA);
        assert(exp.requirements.partySize===4,'“afinal somos quatro” não substituiu valor anterior');
      });

      context.setRequirement(idA,'beach',true);
      context.forgetRequirement(idA,'beach');
      record(results,'Forget removes active requirement',()=>{
        const exp=context.getExperienceContext(idA);
        assert(!Object.prototype.hasOwnProperty.call(exp.requirements,'beach'),'praia continua requisito ativo');
        assert(exp.exclusions.beach===true,'exclusão de praia não registada');
      });

      context.setRequirement(idA,'transport','train');
      context.setRequirement(idA,'budget','low');
      context.setRequirement(idB,'transport','car');
      context.setRequirement(idB,'partySize',2);
      record(results,'Experience isolation',()=>{
        const a=context.getExperienceContext(idA);
        const b=context.getExperienceContext(idB);
        assert(a.requirements.transport==='train','Experience A contaminada');
        assert(a.requirements.partySize===4,'party size A perdido');
        assert(b.requirements.transport==='car','Experience B contaminada');
        assert(b.requirements.partySize===2,'party size B incorreto');
        assert(!Object.prototype.hasOwnProperty.call(b.requirements,'budget'),'budget A contaminou B');
      });

      context.setDecision(idA,'destinationChoice','olen');
      context.addRelevantHistory(idA,{kind:'user-request',summary:'trail, comboio, orçamento baixo'});
      context.setIntent({kind:'delegate-choice',text:'Podes escolher o destino'});
      experience.activate(idA);
      const pack=context.buildPack({experienceId:idA});
      record(results,'Short follow-up preserves relevant requirements',()=>{
        assert(pack.currentIntent.text==='Podes escolher o destino','intent curto perdido');
        assert(pack.experience.id===idA,'Experience errada no Context Pack');
        assert(pack.experienceContext.requirements.partySize===4,'número de participantes perdido');
        assert(pack.experienceContext.requirements.transport==='train','transporte perdido');
        assert(pack.experienceContext.requirements.budget==='low','orçamento perdido');
        assert(pack.experienceContext.exclusions.beach===true,'exclusão perdida');
        assert(pack.experienceContext.decisions.destinationChoice==='olen','delegação de escolha perdida');
      });

      record(results,'Context Pack is structured and bounded',()=>{
        assert(!Array.isArray(pack),'Context Pack inválido');
        assert(pack.experienceContext.relevantHistory.length<=24,'histórico excede limite');
        assert(!Object.prototype.hasOwnProperty.call(pack,'fullTranscript'),'transcript integral não deve existir');
        assert(JSON.stringify(pack).length<12000,'Context Pack de teste excessivamente grande');
      });

      context.updateUserProfile(beforeProfile);
    }finally{
      context.removeExperienceContext(idA);
      context.removeExperienceContext(idB);
      if(experience.get(idA))experience.remove(idA,{source:'context-contract-cleanup'});
      if(experience.get(idB))experience.remove(idB,{source:'context-contract-cleanup'});
      originalExperiences.forEach(item=>{
        if(!experience.get(item.id))experience.importExperience(item,{activate:false,replace:false});
      });
      if(originalActive?.id&&experience.get(originalActive.id))experience.activate(originalActive.id,{source:'context-contract-restore'});
      else experience.clearActive({source:'context-contract-restore'});
      write(CONTEXT_STORAGE_KEY,originalContextStorage);
      write(EXPERIENCE_STORAGE_KEY,originalExperienceStorage);
    }

    const passed=results.filter(item=>item.pass).length;
    const report={version:VERSION,engineVersion:context.version,passed,total:results.length,score:`${passed}/${results.length}`,ok:passed===results.length,results};
    console.table(results);
    console.info(`[OLEN 5.0] Context contract: ${report.score}`);
    return report;
  }

  root.contextTest=Object.freeze({version:VERSION,run});
})(window);

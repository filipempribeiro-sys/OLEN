/* OLEN 5.0 — Reality Live Smoke safety contracts */
(function (global) {
  'use strict';
  function assert(v,m){if(!v)throw new Error(m||'assertion_failed');}
  function equal(a,b,m){assert(a===b,m||(String(a)+' !== '+String(b)));}
  async function run(){
    const smoke=global.OLEN5.realityLiveSmoke, bridge=global.OLEN5.realityBridge, results=[];
    async function test(name,fn){try{await fn();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e&&e.message?e.message:String(e)});}}
    await test('Uses the established backend and private Reality path',async()=>{equal(smoke.DEFAULT_BACKEND,'https://alpha-ai-backend-m6l3.onrender.com');equal(smoke.PATH,'/api/olen/reality');});
    await test('Builds endpoint deterministically',async()=>{equal(smoke.endpoint('https://example.invalid/'),'https://example.invalid/api/olen/reality');});
    await test('Refuses live transport without explicit confirmation',async()=>{let calls=0;const old=global.fetch;global.fetch=async()=>{calls++;};const r=await smoke.run();global.fetch=old;equal(r.skipped,true);equal(r.reason,'explicit_confirmation_required');equal(calls,0);});
    await test('Uses one bounded deterministic smoke request when confirmed',async()=>{let seen=null;const old=global.fetch;global.fetch=async(url,opts)=>{seen={url,body:JSON.parse(opts.body)};return{ok:true,status:200,json:async()=>({contract:'olen.reality.v1',requestId:'x',experienceId:'olen5-live-smoke',status:'supported',complete:true,confidenceBand:'high',missing:[],facts:[]})};};const r=await smoke.run({confirm:true,backend:'https://example.invalid',timeoutMs:500});global.fetch=old;equal(r.ok,true);equal(seen.url,'https://example.invalid/api/olen/reality');equal(seen.body.requiredFields.length,1);equal(seen.body.evidence.length,1);});
    await test('Smoke payload requests no external provider or AI work',async()=>{let body=null;const old=global.fetch;global.fetch=async(_,opts)=>{body=JSON.parse(opts.body);return{ok:true,status:200,json:async()=>({contract:'olen.reality.v1',status:'supported',complete:true,confidenceBand:'high',missing:[],facts:[]})};};await smoke.run({confirm:true,backend:'https://example.invalid'});global.fetch=old;equal(body.provider,undefined);equal(body.prompt,undefined);equal(body.model,undefined);});
    await test('Restores disabled bridge state after success',async()=>{bridge.configure({enabled:false});const old=global.fetch;global.fetch=async()=>({ok:true,status:200,json:async()=>({contract:'olen.reality.v1',status:'supported',complete:true,confidenceBand:'high',missing:[],facts:[]})});await smoke.run({confirm:true,backend:'https://example.invalid'});global.fetch=old;equal(bridge.state().enabled,false);});
    await test('Restores disabled bridge state after failure',async()=>{bridge.configure({enabled:false});const old=global.fetch;global.fetch=async()=>{throw new Error('offline');};const r=await smoke.run({confirm:true,backend:'https://example.invalid',timeoutMs:250});global.fetch=old;equal(r.ok,false);equal(bridge.state().enabled,false);});
    await test('Live smoke remains opt-in after validation',async()=>{const r=await smoke.run({confirm:false});equal(r.skipped,true);equal(bridge.state().enabled,false);});
    const passed=results.filter(x=>x.ok).length;return Object.freeze({ok:passed===results.length,score:passed+'/'+results.length,passed,total:results.length,results:Object.freeze(results)});
  }
  global.OLEN5=global.OLEN5||{};global.OLEN5.realityLiveSmokeTest=Object.freeze({run});
})(typeof window!=='undefined'?window:globalThis);

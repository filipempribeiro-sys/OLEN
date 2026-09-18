/* OLEN 5.0 - BOOTSTRAP
   Deterministic composition root for the clean OLEN 5.0 runtime.
   Loads no legacy code, performs no Service Worker injection and owns no domain logic.
   Required script order:
   core -> router -> home -> chat -> map-go -> live -> media -> account -> bootstrap.
   Intentionally not auto-started while OLEN 4.x remains the active runtime.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
if(!ROOT?.core) throw new Error('OLEN 5.0 bootstrap requires olen-core.js');
if(ROOT.bootstrap?.version==='5.0.1') return;

const VERSION='5.0.1';
const REQUIRED=Object.freeze(['router','home','chat','mapGo','live','media','agenda','account']);
const DOMAIN_ORDER=Object.freeze(['home','chat','mapGo','live','media','agenda','account']);
let started=false;
let starting=false;

function assertRuntime(){
  const missing=REQUIRED.filter(name=>!ROOT[name]);
  if(missing.length) throw new Error(`OLEN 5.0 bootstrap missing modules: ${missing.join(', ')}`);
  return true;
}

function moduleOptions(options,name){
  const value=options?.modules?.[name];
  return value&&typeof value==='object'?value:{};
}

function initDomains(options={}){
  for(const name of DOMAIN_ORDER) ROOT[name].init(moduleOptions(options,name));
}

function releaseRuntime(){
  try{ROOT.router?.destroy?.()}catch{}
  for(const name of [...DOMAIN_ORDER].reverse()){
    try{ROOT[name]?.destroy?.()}catch{}
  }
}

function start(options={}){
  if(started) return ROOT.bootstrap;
  if(starting) throw new Error('OLEN 5.0 bootstrap is already starting');
  starting=true;
  try{
    assertRuntime();

    /* Views register first. Router becomes active only after every owner exists. */
    initDomains(options);

    const initialView=String(options.initialView||'home').trim().toLowerCase();
    ROOT.router.init({initialView});

    /* Router init establishes history/state; force one canonical first mount. */
    ROOT.router.replace(initialView,{
      history:false,
      force:true,
      reason:'bootstrap'
    });

    started=true;
    ROOT.core.emit('bootstrap:ready',{
      version:VERSION,
      view:ROOT.router.current
    });
    return ROOT.bootstrap;
  }catch(error){
    /* Startup is transactional: release every owner/router touched by this attempt. */
    releaseRuntime();
    started=false;
    ROOT.core.emit('bootstrap:error',{message:String(error?.message||error)});
    throw error;
  }finally{
    starting=false;
  }
}

function destroy(){
  if(!started&&!starting) return false;
  releaseRuntime();
  started=false;
  starting=false;
  ROOT.core.emit('bootstrap:destroyed',{version:VERSION});
  return true;
}

ROOT.bootstrap=Object.freeze({
  version:VERSION,
  start,
  destroy,
  assertRuntime,
  requiredModules:REQUIRED,
  get started(){return started;}
});

ROOT.core.register('bootstrap',ROOT.bootstrap);

})();
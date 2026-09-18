/* OLEN 5.0 - REVERSIBLE CUTOVER CONTRACT TESTS
   Deterministic browser-side contract checks. No network/provider/Reality use. */
(function(global){
'use strict';
async function run(){
 const results=[];
 const test=async(name,fn)=>{try{await fn();results.push({name,ok:true})}catch(error){results.push({name,ok:false,error:error?.message||String(error)})}};
 const assert=(condition,message)=>{if(!condition)throw new Error(message||'assertion_failed')};
 const major5=value=>/^5\./.test(String(value||''));
 await test('Runtime loader exists',()=>assert(major5(global.OLEN5?.runtimeLoader?.version),'runtime_loader_contract_missing'));
 await test('Production entry exists',()=>assert(major5(global.OLEN5?.productionEntry?.version),'production_entry_contract_missing'));
 await test('Loader owns complete local runtime',()=>{
  const modules=global.OLEN5?.runtimeLoader?.MODULES||[];
  const required=['./js/olen-router.js','./js/olen-home.js','./js/olen-chat.js','./js/olen-map-go.js','./js/olen-live.js','./js/olen-media.js','./js/olen-account.js','./js/olen-bootstrap.js','./js/olen-legacy-dom-adapter.js','./js/olen-integration-shell.js'];
  assert(required.every(src=>modules.includes(src)),'runtime_module_missing');
  assert(!modules.some(src=>/^https?:/i.test(src)),'runtime_not_network_agnostic');
 });
 await test('Bootstrap runtime contract is complete',()=>assert(global.OLEN5?.bootstrap?.assertRuntime?.()===true,'bootstrap_runtime_incomplete'));
 await test('Legacy DOM contract is complete',()=>{const c=global.OLEN5?.legacyDom?.contract?.();assert(c&&c.ready,'legacy_dom_not_ready')});
 await test('Cutover is active',()=>assert(global.OLEN5?.runtimeLoader?.active&&global.OLEN5?.integrationShell?.started,'cutover_not_active'));
 await test('All production view owners are registered',()=>{
  const root=global.OLEN5||{};
  assert(['home','chat','mapGo','live','media','account'].every(name=>root[name]&&typeof root[name].init==='function'&&typeof root[name].destroy==='function'),'production_owner_missing');
 });
 await test('Rollback restores non-active runtime',()=>{
  const stopped=global.OLEN5?.productionEntry?.rollback?.('contract-test');
  assert(stopped?.ok,'rollback_failed');
  assert(global.OLEN5?.runtimeLoader?.active===false,'loader_still_active');
  assert(global.OLEN5?.integrationShell?.started===false,'shell_still_started');
  assert(global.OLEN5?.bootstrap?.started===false,'bootstrap_still_started');
 });
 const passed=results.filter(r=>r.ok).length;
 return {ok:passed===results.length,score:`${passed}/${results.length}`,passed,total:results.length,results};
}
global.OLEN5=global.OLEN5||{};
global.OLEN5.cutoverContractTest=Object.freeze({run});
})(window);

/* OLEN 5.0 - ISOLATED TEST HARNESS
   Deterministic acceptance tests for architecture contracts.
   Runs only when explicitly invoked; no production auto-start.
*/
(()=>{
'use strict';
const ROOT=window.OLEN5;
if(!ROOT?.core||!ROOT?.router||!ROOT?.integrationShell) throw new Error('OLEN 5.0 Test Harness requires core, router and integration shell');
if(ROOT.testHarness?.version==='5.0.0') return;
const VERSION='5.0.0';
const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const results=[];
function record(name,pass,details=''){const item={name,pass:!!pass,details};results.push(item);ROOT.core.emit('test:result',item);return item}
function visible(id){const el=document.querySelector(id);return !!el&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'}
async function route(view){ROOT.integrationShell.navigate(view,'test-harness');await wait()}
async function testHomeGeometry(){
  await route('home');const el=document.querySelector('#lifestyleHome');const a=el?.getBoundingClientRect();
  await route('map');ROOT.router.back({target:'home',reason:'test-back'});await wait();const b=el?.getBoundingClientRect();
  const pass=!!a&&!!b&&Math.abs(a.width-b.width)<.5&&Math.abs(a.height-b.height)<.5&&Math.abs(a.top-b.top)<.5;
  return record('Home geometry after Back',pass,pass?'stable':'geometry changed');
}
async function testChatBack(){
  await route('map');await route('chat');ROOT.router.back({target:'map',reason:'test-chat-back'});await wait();
  return record('Chat Back respects previous view',ROOT.router.current==='map'&&visible('#field'),`current=${ROOT.router.current}`);
}
async function testSidebarCleanup(){
  await route('chat');ROOT.chat?.openSidebar?.();await wait();await route('live');await wait();
  const state=ROOT.core.state;const pass=state.overlay==null&&!state.chat?.sidebar&&ROOT.router.current==='live'&&visible('#report');
  return record('Chat sidebar/scrim teardown',pass,`overlay=${state.overlay||'none'} sidebar=${!!state.chat?.sidebar}`);
}
async function testMapGo(){
  await route('map');const mapOk=ROOT.router.current==='map'&&visible('#field');await route('go');const goOk=ROOT.router.current==='go'&&visible('#field');
  return record('Map ↔ GO ownership',mapOk&&goOk,`map=${mapOk} go=${goOk}`);
}
async function testLiveAccount(){
  await route('live');const liveOk=visible('#report');await route('account');const accountOk=visible('#profile');
  return record('LIVE + Account routing',liveOk&&accountOk,`live=${liveOk} account=${accountOk}`);
}
async function run(){
  results.length=0;
  if(!ROOT.integrationShell.started) ROOT.integrationShell.start({initialView:'home',replaceHistory:true});
  await wait();
  await testHomeGeometry();
  await testChatBack();
  await testSidebarCleanup();
  await testMapGo();
  await testLiveAccount();
  await route('home');
  const passed=results.filter(x=>x.pass).length;
  const report={version:VERSION,passed,total:results.length,score:`${passed}/${results.length}`,ok:passed===results.length,results:results.map(x=>({...x}))};
  ROOT.core.emit('test:complete',report);
  console.table(report.results);
  console.info(`[OLEN 5.0] isolated acceptance: ${report.score}`);
  return report;
}
ROOT.testHarness=Object.freeze({version:VERSION,run,get results(){return results.map(x=>({...x}))}});
ROOT.core.register('testHarness',ROOT.testHarness);
})();
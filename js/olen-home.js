/* OLEN 5.0 - HOME
   Single owner for Home lifecycle and layout.
   Every Home entry uses the same mount and render path.
   Intentionally not loaded by the OLEN 4.x runtime.
*/
(()=>{
'use strict';

const ROOT=window.OLEN5;
const core=ROOT?.core;
const router=ROOT?.router;
if(!core||!router) throw new Error('OLEN 5.0 Home requires core and router');
if(ROOT.home?.version==='5.0.0') return;

const VERSION='5.0.0';
let initialized=false;
let mounted=false;
let unregister=null;
let viewportOff=[];
let selectors={root:'#lifestyleHome',container:null};
let lastViewport='';

function host(){ return core.qs(selectors.root); }
function panel(){
  const h=host();
  if(!h) return null;
  return selectors.container ? core.qs(selectors.container,h) : h;
}
function viewportKey(){
  const v=window.visualViewport;
  return [Math.round(v?.width||innerWidth),Math.round(v?.height||innerHeight),Math.round(v?.offsetTop||0)].join(':');
}
function render(reason='render'){
  if(!mounted) return false;
  const h=host();
  const p=panel();
  if(!h||!p) return false;
  document.documentElement.dataset.olenView='home';
  h.dataset.olenMounted='5.0';
  p.dataset.olenHomeOwner='5.0';
  lastViewport=viewportKey();
  core.emit('home:rendered',{reason,viewport:lastViewport});
  return true;
}
function mount(context={}){
  mounted=true;
  core.raf2(()=>render(context.reason||'enter-home'));
  core.emit('home:mounted',{context});
  return true;
}
function unmount(context={}){
  mounted=false;
  const h=host();
  const p=panel();
  h?.removeAttribute('data-olen-mounted');
  p?.removeAttribute('data-olen-home-owner');
  core.emit('home:unmounted',{context});
}
function onViewport(){
  if(!mounted) return;
  const next=viewportKey();
  if(next===lastViewport) return;
  core.raf2(()=>render('viewport-change'));
}
function init(options={}){
  if(initialized) return ROOT.home;
  initialized=true;
  selectors={...selectors,...(options.selectors||{})};
  unregister=router.registerView('home',{enter:mount,leave:unmount,afterEnter:(context)=>core.emit('home:ready',{context})});
  viewportOff=[
    core.listen(window,'resize',onViewport,{passive:true}),
    core.listen(window,'orientationchange',onViewport,{passive:true})
  ];
  if(window.visualViewport) viewportOff.push(core.listen(window.visualViewport,'resize',onViewport,{passive:true}));
  core.emit('home:registered',{version:VERSION});
  return ROOT.home;
}
function destroy(){
  viewportOff.forEach(off=>off?.());
  viewportOff=[];
  unregister?.();
  unregister=null;
  unmount({reason:'destroy'});
  initialized=false;
}
ROOT.home=Object.freeze({version:VERSION,init,destroy,mount,unmount,render,get mounted(){return mounted;}});
core.register('home',ROOT.home);
})();
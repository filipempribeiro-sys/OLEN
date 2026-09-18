/* OLEN · AGENDA
   Standalone owner for the Agenda view in the clean OLEN repository. */
(()=>{
'use strict';
const ROOT=window.OLEN5,core=ROOT?.core,router=ROOT?.router;
if(!core||!router)throw new Error('OLEN Agenda requires core and router');
if(ROOT.agenda?.version==='1.0.0')return;
let initialized=false,mounted=false,unregister=null,selectors={root:'[data-screen="agenda"]'};
function host(){return core.qs(selectors.root)}
function mount(context={}){mounted=true;const h=host();if(h){h.dataset.olenMounted='agenda';document.documentElement.dataset.olenView='agenda'}core.emit('agenda:mounted',{context});return true}
function unmount(context={}){mounted=false;host()?.removeAttribute('data-olen-mounted');core.emit('agenda:unmounted',{context})}
function init(options={}){if(initialized)return ROOT.agenda;initialized=true;selectors={...selectors,...(options.selectors||{})};unregister=router.registerView('agenda',{enter:mount,leave:unmount});return ROOT.agenda}
function destroy(){unregister?.();unregister=null;unmount({reason:'destroy'});initialized=false}
ROOT.agenda=Object.freeze({version:'1.0.0',init,destroy,mount,unmount,get mounted(){return mounted}});
core.register('agenda',ROOT.agenda);
})();
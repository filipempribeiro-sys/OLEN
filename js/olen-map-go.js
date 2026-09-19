/* OLEN — MAP/GO CLEAN REBUILD 2026-09-20
   Rebuilt from the protected rollback. No dependency on previous map UI generations.
   Scope: Map/GO only. Other OLEN screens are not touched.
*/
(()=>{'use strict';
const NS='oz6',STYLE_ID=NS+'-style',ROOT_ID=NS+'-root';
let active=false,watch=null,timer=null,startedAt=0,last=null,distance=0,mode='walk';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function mapScreen(){return q('.screen[data-screen="map"]')||q('[data-screen="map"]')||q('#mapScreen')||q('#field')?.closest('.screen')}
function field(){const s=mapScreen();return s&&(q('#field',s)||q('.map-field',s)||q('#realMap',s)?.parentElement||s)}
function css(){if(q('#'+STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
/* clean isolated MAP/GO generation */
.screen[data-screen="map"].active{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;padding:0!important;margin:0!important;overflow:hidden!important}
.screen[data-screen="map"] #field,.screen[data-screen="map"] .map-field{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important}
.screen[data-screen="map"] #realMap{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;border:0!important;border-radius:0!important}
#${ROOT_ID}{--top:calc(64px + env(safe-area-inset-top,0px));--bottom:calc(76px + env(safe-area-inset-bottom,0px));position:absolute;z-index:35;inset:0;pointer-events:none;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
#${ROOT_ID} *{box-sizing:border-box}
#${ROOT_ID} button,#${ROOT_ID} input{font:inherit}
.${NS}-top{position:absolute;top:var(--top);left:0;right:0;height:58px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(3,16,12,.96),rgba(3,16,12,.78) 72%,transparent);pointer-events:auto}
.${NS}-title{font-size:24px;font-weight:800;letter-spacing:-.02em}
.${NS}-topright{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700}
.${NS}-topright button{border:0;background:transparent;color:#fff;padding:7px 0;min-height:0}
.${NS}-canvas-mask{position:absolute;top:calc(var(--top) + 58px);bottom:var(--bottom);left:0;right:0;pointer-events:none}
.${NS}-cross{position:absolute;left:50%;top:50%;width:14px;height:14px;border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 1px 8px #0008}
.${NS}-cross:after{content:"";position:absolute;width:4px;height:4px;left:3px;top:3px;background:#56e6a7;border-radius:50%}
.${NS}-controls{position:absolute;left:16px;right:16px;bottom:calc(var(--bottom) + 16px);display:flex;align-items:flex-end;justify-content:space-between;pointer-events:auto}
.${NS}-status{height:48px;max-width:58%;display:flex;align-items:center;gap:8px;padding:0 15px;border:1px solid #ffffff20;border-radius:24px;background:rgba(4,18,14,.9);backdrop-filter:blur(12px);box-shadow:0 8px 24px #0005;font-size:12px;font-weight:700}
.${NS}-actions{display:flex;align-items:center;gap:10px}
.${NS}-round{width:52px;height:52px;border:0;border-radius:50%;display:grid;place-items:center;box-shadow:0 8px 24px #0007;font-weight:900}
.${NS}-report{background:#0a2119;color:#fff;border:1px solid #ffffff24;font-size:23px}
.${NS}-go{background:#56e6a7;color:#03130d;font-size:14px}
.${NS}-nav{position:absolute;top:calc(var(--top) + 68px);left:14px;right:14px;padding:14px 16px;border-radius:18px;background:rgba(4,18,14,.93);backdrop-filter:blur(12px);box-shadow:0 8px 28px #0007;pointer-events:auto}
.${NS}-nav[hidden]{display:none}. ${NS}-nav b{font-size:15px}
.${NS}-navrow{display:flex;justify-content:space-between;align-items:center;gap:12px}. ${NS}-nav small{display:block;color:#b8c7c1;margin-top:3px}
.${NS}-stop{border:0;border-radius:17px;background:#fff;color:#07110e;padding:8px 13px;font-weight:800}
.${NS}-sheet{position:absolute;z-index:4;left:12px;right:12px;bottom:calc(var(--bottom) + 12px);padding:18px;border-radius:24px;background:#081c16;box-shadow:0 18px 50px #000a;pointer-events:auto}
.${NS}-sheet[hidden]{display:none}. ${NS}-sheethead{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}. ${NS}-sheethead b{font-size:18px}. ${NS}-close{border:0;background:transparent;color:#fff;font-size:22px}
.${NS}-dest{width:100%;height:45px;border:1px solid #ffffff1c;border-radius:15px;background:#102820;color:#fff;padding:0 14px;outline:none}
.${NS}-modes{display:flex;gap:8px;overflow:auto;margin:12px 0}. ${NS}-modes button{flex:0 0 43px;height:43px;border:1px solid #ffffff1c;border-radius:50%;background:#102820;color:#fff}. ${NS}-modes button.on{border-color:#56e6a7;background:#153a2d}
.${NS}-start{width:100%;height:45px;border:0;border-radius:22px;background:#56e6a7;color:#03130d;font-weight:900}
@media(min-width:700px){#${ROOT_ID}{--top:0px;--bottom:76px}. ${NS}-top{padding-left:28px;padding-right:28px}. ${NS}-controls{left:28px;right:28px}. ${NS}-sheet{left:auto;width:420px;right:24px}}
`;document.head.appendChild(s)}
function html(){const f=field();if(!f||q('#'+ROOT_ID))return;const r=document.createElement('div');r.id=ROOT_ID;r.innerHTML=`
<div class="${NS}-top"><div class="${NS}-title">MAPA</div><div class="${NS}-topright"><button data-a="layers">CAMADAS</button><button data-a="north">NORTE</button></div></div>
<div class="${NS}-canvas-mask"><i class="${NS}-cross"></i></div>
<div class="${NS}-nav" data-nav hidden><div class="${NS}-navrow"><div><b data-guide>Segue em frente</b><small data-metrics>0 m · 00:00:00</small></div><button class="${NS}-stop" data-a="stop">Terminar</button></div></div>
<div class="${NS}-controls"><div class="${NS}-status" data-status>Localização · pronta</div><div class="${NS}-actions"><button class="${NS}-round ${NS}-report" data-a="report" aria-label="Reportar">+</button><button class="${NS}-round ${NS}-go" data-a="go">GO</button></div></div>
<div class="${NS}-sheet" data-sheet="go" hidden><div class="${NS}-sheethead"><b>Para onde vamos?</b><button class="${NS}-close" data-a="close">×</button></div><input class="${NS}-dest" data-dest placeholder="Destino"><div class="${NS}-modes">${[['walk','🚶'],['bike','🚲'],['moto','🏍️'],['car','🚗'],['transit','🚆']].map(([m,i])=>`<button data-mode="${m}">${i}</button>`).join('')}</div><button class="${NS}-start" data-a="start">Iniciar GO</button></div>
<div class="${NS}-sheet" data-sheet="report" hidden><div class="${NS}-sheethead"><b>+ Report</b><button class="${NS}-close" data-a="close">×</button></div><div class="${NS}-modes"><button>⚠️</button><button>🚧</button><button>🌧️</button><button>🪨</button><button>📍</button></div><button class="${NS}-start" data-a="close">Concluir</button></div>`;f.appendChild(r);bind(r)}
function show(name,on=true){const e=q('[data-sheet="'+name+'"]',q('#'+ROOT_ID));if(e)e.hidden=!on}
function dist(a,b){const p=Math.PI/180,R=6371000,x=(b.latitude-a.latitude)*p,y=(b.longitude-a.longitude)*p,z=Math.sin(x/2)**2+Math.cos(a.latitude*p)*Math.cos(b.latitude*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
function tick(){if(!active)return;const sec=Math.floor((Date.now()-startedAt)/1000),t=[Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(n=>String(n).padStart(2,'0')).join(':'),d=distance<1000?Math.round(distance)+' m':(distance/1000).toFixed(1)+' km';const m=q('[data-metrics]',q('#'+ROOT_ID));if(m)m.textContent=d+' · '+t}
function gps(p){const n={latitude:p.coords.latitude,longitude:p.coords.longitude};if(last)distance+=dist(last,n);last=n;const s=q('[data-status]',q('#'+ROOT_ID));if(s)s.textContent='GPS · '+Math.max(0,Math.round((p.coords.speed||0)*3.6))+' km/h'}
function start(){active=true;distance=0;last=null;startedAt=Date.now();show('go',false);const r=q('#'+ROOT_ID);q('[data-nav]',r).hidden=false;const dest=q('[data-dest]',r)?.value.trim()||'destino';q('[data-guide]',r).textContent='Segue em frente para '+esc(dest);timer=setInterval(tick,1000);tick();if(navigator.geolocation)watch=navigator.geolocation.watchPosition(gps,()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:8000})}
function stop(){active=false;clearInterval(timer);timer=null;if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);watch=null;const r=q('#'+ROOT_ID);if(r)q('[data-nav]',r).hidden=true}
function bind(r){r.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.mode){mode=b.dataset.mode;qa('[data-mode]',r).forEach(x=>x.classList.toggle('on',x===b));return}switch(b.dataset.a){case'go':show('report',false);show('go');break;case'report':show('go',false);show('report');break;case'close':show('go',false);show('report',false);break;case'start':start();break;case'stop':stop();break;case'north':q('#realMap')?.dispatchEvent(new CustomEvent('olen:north',{bubbles:true}));break}});q('[data-mode="walk"]',r)?.classList.add('on')}
function mount(){css();html();const f=field();if(f){f.style.position='absolute';f.style.inset='0';}setTimeout(()=>window.dispatchEvent(new Event('resize')),50)}
function unmount(){stop()}
const obs=new MutationObserver(()=>{const s=mapScreen();if(s?.classList.contains('active'))mount();else if(q('#'+ROOT_ID))unmount()});obs.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(mapScreen()?.classList.contains('active'))mount()},{once:true});else if(mapScreen()?.classList.contains('active'))mount();
window.OLENMapGoClean={version:'2026.09.20-clean',mount,stop};
})();
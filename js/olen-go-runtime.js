/* OLEN GO runtime: isolated active legacy-compatible controller. */
(()=>{"use strict";
const $=x=>document.getElementById(x),show=(id,on)=>{const e=$(id);if(e)e.hidden=!on};
let mode="walk",watch=null,last=null,total=0,t0=0,timer=null,currentName="Destino",rating=0;
const track=window.OLENGpsTrack?.createRecorder((()=>{try{return window.localStorage}catch(_){return null}})());
const modes={walk:["A pé","🚶"],bike:["Bicicleta","🚲"],scooter:["Trotineta","🛴"],moto:["Moto","🏍️"],car:["Carro","🚗"],camper:["Autocaravana","🚐"],transit:["Transportes","🚆"],boat:["Barco","⛵"],air:["Aviação","✈️"]};
const guide=$("rzGuide"),map=$("rzGuide")?.parentElement,host=$("rzGuideHost");
function dist(a,b){const p=Math.PI/180,R=6371000,x=(b.latitude-a.latitude)*p,y=(b.longitude-a.longitude)*p,q=Math.sin(x/2)**2+Math.cos(a.latitude*p)*Math.cos(b.latitude*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function elapsed(){return t0?Math.max(0,Math.floor((Date.now()-t0)/1000)):0}
function fmt(n){return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,"0")).join(":")}
function tick(){const e=$("rzTime");if(e)e.textContent=fmt(elapsed())}
function gps(p){const c=p.coords,n={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,timestamp:p.timestamp};
 const fix=track?.ingest(p);if(!fix?.accepted)return;
 total=fix.state.distanceMeters;last=n;
 $("rzDone").textContent=total<1000?Math.round(total)+" m":(total/1000).toFixed(1)+" km";
 $("rzSpeed").textContent=Math.max(0,Math.round((c.speed||0)*3.6));
 window.OLENMapRouting?.updatePosition?.(n)}
function navigationHeader(on){const h=$("rzHeader"),tools=document.querySelector(".rz-map>.rz-tools");if(!h||!guide)return;h.classList.toggle("rz-navigating",on);if(tools)tools.classList.toggle("rz-tools-go-centered",on);if(on&&host)host.appendChild(guide);else if(!on&&map)map.insertBefore(guide,map.querySelector(".rz-tools"))}
function start(){
 const selected=($("rzDestination").value||"").trim();
 const activeRoute=window.OLENMapRouting?.state;
 if(!activeRoute?.routeReady||!activeRoute?.destination||
    (selected&&selected!==activeRoute.destination.name)||mode!==activeRoute.mode){
   window.OLENMapRouting?.prepareManual?.(selected,mode);
   return false;
 }
 currentName=activeRoute.destination.name;
 show("rzGoPop",false);show("rzIdle",false);show("rzBottom",true);
 show("rzGuide",true);show("rzLive",true);show("rzWarn",false);show("rzDot",false);
 navigationHeader(true);
 const first=activeRoute.route?.maneuvers?.[0];
 if(first?.instruction&&window.OLENNavigationGuide)
   window.OLENNavigationGuide.set({type:"straight",instruction:first.instruction,
     road:first.road||"",distance:window.OLENMapRouting.formatDistance(first.distanceMeters||0)});
 t0=Date.now();total=0;last=null;rating=0;track?.start({name:currentName,mode,startedAt:t0});window.OLENGoExperience?.attach?.(track?.snapshot(),activeRoute);tick();
 clearInterval(timer);timer=setInterval(tick,1000);
 if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);
 try{watch=navigator.geolocation?.watchPosition?.(gps,error=>{
   if(error?.code===1)stop();
   window.OLENMapRouting?.reportGpsError?.(error);
 },{enableHighAccuracy:true,maximumAge:2000,timeout:8000})??null;}
 catch(error){stop();window.OLENMapRouting?.reportGpsError?.(error);return false}
 if(watch===null){stop();window.OLENMapRouting?.reportGpsError?.({code:1});return false}
 window.OLENMapRouting?.beginGuidance?.();
 return true;
}
function fillSummary(){const secs=elapsed(),distance=total<1000?Math.round(total)+" m":(total/1000).toFixed(1)+" km";$("rzFinishTitle").textContent=currentName;$("rzFinishRoute").textContent="Ponto de partida → "+currentName;$("rzFinishTime").textContent=fmt(secs);$("rzFinishDistance").textContent=distance;$("rzFinishMode").textContent=modes[mode][1]+" "+modes[mode][0];$("rzFinishStars").querySelectorAll("button").forEach(b=>b.textContent=Number(b.dataset.star)<=rating?"★":"☆")}
function stop(){if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);watch=null;clearInterval(timer);track?.finish();window.OLENGoExperience?.finish?.(track?.snapshot(),{rating,comment:$("rzFinishComment")?.value||""});window.OLENMapRouting?.stopGuidance?.();fillSummary();show("rzBottom",false);show("rzGuide",false);show("rzLive",false);show("rzWarn",false);show("rzDot",false);navigationHeader(false);show("rzIdle",true);show("rzFinishPop",true)}
function closeSummary(){show("rzFinishPop",false)}
$("rzGo").onclick=()=>show("rzGoPop",true);$("rzClose").onclick=()=>show("rzGoPop",false);$("rzPrepare").onclick=start;$("rzStop").onclick=stop;
$("rzFinishClose").onclick=$("rzFinishDone").onclick=closeSummary;
$("rzFinishStars").querySelectorAll("button").forEach(b=>b.onclick=()=>{rating=Number(b.dataset.star);window.OLENGoExperience?.setRating?.(track?.snapshot(),rating,$("rzFinishComment")?.value||"");fillSummary()});
$("rzShareCommunity").disabled=true;
$("rzShareExternal").onclick=async()=>{const txt="A minha experiência OLEN: "+currentName+" · "+$("rzFinishDistance").textContent+" · "+$("rzFinishTime").textContent;if(navigator.share){try{await navigator.share({title:"Experiência OLEN",text:txt})}catch(_){}}else if(navigator.clipboard){navigator.clipboard.writeText(txt);$("rzShareExternal").innerHTML="✓ <b>Copiado</b>";setTimeout(()=>$("rzShareExternal").innerHTML="↗ <b>Partilhar</b>",1400)}};
$("rzReportIdle").onclick=$("rzReportActive").onclick=()=>show("rzReportPop",true);$("rzReportClose").onclick=()=>show("rzReportPop",false);
document.querySelectorAll("#rzModes button").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$("rzModeLabel").textContent=modes[mode][0];document.querySelectorAll("#rzModes button").forEach(x=>x.classList.toggle("selected",x===b))});document.querySelector("#rzModes [data-mode=walk]").classList.add("selected");
window.OLENGoActivity=Object.freeze({get current(){return track?.snapshot()||null},recover(){return track?.recover()||null}});
window.OLENLegacyGo=Object.freeze({
 startRoute(name,requestedMode="walk"){
  const selected=modes[requestedMode]?requestedMode:"walk";mode=selected;
  $("rzDestination").value=String(name||"Destino").trim();
  $("rzModeLabel").textContent=modes[selected][0];
  document.querySelectorAll("#rzModes button").forEach(b=>b.classList.toggle("selected",b.dataset.mode===selected));
  return start();
 },stop
});
})();
/* STEP 3A — OLEN Maneuver Library compatibility bridge
   The full registry/renderer is owned by js/olen-maneuvers.js. */
(function(){
 if(!window.OLENManeuvers) return;
 window.OLENNavigationGuide=Object.assign({},window.OLENNavigationGuide||{},{
   set:window.OLENManeuvers.set,
   resolve:window.OLENManeuvers.resolve,
   render:window.OLENManeuvers.render,
   registry:window.OLENManeuvers.registry,
   version:window.OLENManeuvers.version
 });
})();
document.querySelectorAll(".rz-tools button[data-rz-tool]").forEach(function(btn){btn.addEventListener("click",async function(){if(btn.disabled)return;btn.disabled=true;try{const action=btn.getAttribute("aria-label");const ok=await window.OLENMapRouting?.controlMap?.(action);if(ok){document.querySelectorAll(".rz-tools button[data-rz-tool]").forEach(function(b){b.classList.remove("selected")});btn.classList.add("selected")}}finally{btn.disabled=false}})});


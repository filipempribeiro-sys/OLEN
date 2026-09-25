/* OLEN Map/GO — in-app, GPS-based map and verified route ownership.
   This module never opens OSM or Google Maps websites and never draws a fabricated path.
   External OSM tiles are loaded only for the visible map, with visible attribution. */
(function(){
'use strict';
const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
const VALID_MODES=new Set(['walk','bike','car','moto','scooter']);
const LIB='https://unpkg.com/leaflet@1.9.4/dist/';
let library=null,map=null,tile=null,routeLine=null,destinationMarker=null,userMarker=null;
let last=null,route=null,destination=null,mode='walk',active=false,serial=0,curve=[];
function $(id){return document.getElementById(id)}
function coord(v){
 if(!v||typeof v!=='object')return null;
 const a=v.latitude??v.lat,b=v.longitude??v.lon??v.lng;
 if(typeof a!=='number'||typeof b!=='number'||!Number.isFinite(a)||!Number.isFinite(b)||
    Math.abs(a)>90||Math.abs(b)>180)return null;
 return {lat:a,lon:b};
}
function meters(a,b){
 const rad=Math.PI/180,x=(b.lat-a.lat)*rad,y=(b.lon-a.lon)*rad;
 const v=Math.sin(x/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(y/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(v)));
}
function formatDistance(m){return m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':Math.round(m)+' m'}
function notice(message,error=false){
 let el=$('olenMapStatus');if(!el)return;
 el.textContent=message||'';
 el.hidden=!message;el.classList.toggle('error',!!error);
}
function showRealMap(){
 const host=document.querySelector('.rz-map'),screen=document.querySelector('.screen[data-screen="map"]');
 if(!host||!screen)throw new Error('Mapa OLEN indisponível.');
 host.classList.add('olen-real-map');screen.classList.add('olen-real-map-screen');
 return $('olenRealMap');
}
function loadLeaflet(){
 if(window.L?.map)return Promise.resolve(window.L);
 if(library)return library;
 library=new Promise((resolve,reject)=>{
   if(!document.querySelector('link[data-olen-leaflet]')){
     const css=document.createElement('link');
     css.rel='stylesheet';css.dataset.olenLeaflet='1';
     css.href=LIB+'leaflet.css';css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
     css.crossOrigin='anonymous';document.head.appendChild(css);
   }
   const script=document.createElement('script');
   script.src=LIB+'leaflet.js';script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
   script.crossOrigin='anonymous';script.async=true;
   script.onload=()=>window.L?.map?resolve(window.L):reject(new Error('Biblioteca de mapas indisponível.'));
   script.onerror=()=>reject(new Error('Não foi possível carregar o mapa. Verifica a ligação.'));
   document.head.appendChild(script);
 }).catch(e=>{library=null;throw e});
 return library;
}
async function ensureMap(){
 const node=showRealMap();
 if(!node)throw new Error('Área do mapa não encontrada.');
 const L=await loadLeaflet();
 if(!map){
   map=L.map(node,{zoomControl:false,scrollWheelZoom:true,attributionControl:true,preferCanvas:true});
   tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
     maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
     updateWhenIdle:true,keepBuffer:1
   }).addTo(map);
   L.control.zoom({position:'bottomright'}).addTo(map);
   map.setView([38.7223,-9.1393],11);
 }
 requestAnimationFrame(()=>requestAnimationFrame(()=>map?.invalidateSize()));
 return map;
}
function draw(){
 if(!map||!window.L)return;
 const L=window.L;
 if(routeLine){map.removeLayer(routeLine);routeLine=null}
 if(destinationMarker){map.removeLayer(destinationMarker);destinationMarker=null}
 if(userMarker){map.removeLayer(userMarker);userMarker=null}
 if(destination){
   destinationMarker=L.circleMarker([destination.lat,destination.lon],{
     radius:9,color:'#eafff7',fillColor:'#59edb6',fillOpacity:1,weight:3
   }).addTo(map);
 }
 if(last){
   userMarker=L.circleMarker([last.lat,last.lon],{
     radius:7,color:'#fff',fillColor:'#5ba8ff',fillOpacity:1,weight:3
   }).addTo(map);
 }
 if(route?.geometry?.type==='LineString'&&route.geometry.coordinates.length>=2){
   routeLine=L.geoJSON(route.geometry,{style:{color:'#4ce6bb',weight:5,opacity:.94,lineCap:'round'}}).addTo(map);
   const bounds=routeLine.getBounds();
   if(bounds.isValid())map.fitBounds(bounds.pad(.18),{animate:false,maxZoom:16});
 }else if(destination){
   map.setView([destination.lat,destination.lon],15,{animate:false});
 }
 requestAnimationFrame(()=>map?.invalidateSize());
}
function findPosition(){
 if(!navigator.geolocation)return Promise.reject(new Error('Este dispositivo não disponibiliza localização GPS.'));
 return new Promise((resolve,reject)=>{
   navigator.geolocation.getCurrentPosition(p=>{
     const c=coord(p.coords);
     if(!c)return reject(new Error('A localização devolvida não é válida.'));
     resolve({...c,accuracy:Number(p.coords.accuracy)||null});
   },e=>reject(new Error(e?.code===1?
     'Autoriza a localização para calcular o percurso real dentro da OLEN.':
     'Não foi possível obter a localização atual. Verifica o GPS e tenta novamente.')),
   {enableHighAccuracy:true,maximumAge:5000,timeout:14000});
 });
}
async function authenticatedPost(path,payload){
 const bridge=window.OLENCloudflareChat;
 if(!bridge?.getTurnstileToken)throw new Error('A proteção do Chat OLEN ainda não está disponível.');
 const turnstileToken=await bridge.getTurnstileToken();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),29000);
 try{
   const r=await fetch(API+path,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
     headers:{'Content-Type':'application/json','Accept':'application/json'},
     body:JSON.stringify({...payload,turnstileToken}),signal:controller.signal});
   const body=await r.json().catch(()=>null);
   if(!r.ok||!body?.ok)throw new Error(String(body?.error||'Não foi possível validar o percurso.').slice(0,250));
   return body;
 }finally{clearTimeout(timer)}
}
function validated(routeResult,start,target,selectedMode){
 const geo=routeResult?.geometry;
 if(!routeResult?.ok||routeResult.mode!==selectedMode||
    geo?.type!=='LineString'||!Array.isArray(geo.coordinates)||geo.coordinates.length<2||
    !Number.isFinite(routeResult.distanceMeters)||routeResult.distanceMeters<=0)return false;
 const first=geo.coordinates[0],end=geo.coordinates.at(-1);
 if(!Array.isArray(first)||!Array.isArray(end))return false;
 return meters(start,{lat:first[1],lon:first[0]})<350 &&
   meters(target,{lat:end[1],lon:end[0]})<350;
}
function routeDistances(){
 curve=[];if(!route?.geometry?.coordinates?.length)return;
 let total=0,prev=null;
 for(const pair of route.geometry.coordinates){
   const point={lat:pair[1],lon:pair[0]};
   if(prev)total+=meters(prev,point);
   curve.push({point,meters:total});
   prev=point;
 }
}
function getNearest(location){
 let idx=0,delta=Infinity;
 for(let i=0;i<curve.length;i++){
   const m=meters(location,curve[i].point);
   if(m<delta){delta=m;idx=i}
 }
 return {idx,delta};
}
function stepFor(positionIndex){
 const steps=Array.isArray(route?.maneuvers)?route.maneuvers:[];
 return steps.find(s=>Number.isSafeInteger(s.pointIndex)&&s.pointIndex>positionIndex)||
   steps.find(s=>Number.isSafeInteger(s.pointIndex)&&s.pointIndex>=positionIndex)||null;
}
function updateInstruction(pos){
 if(!active||!route||!curve.length)return;
 const nearest=getNearest(pos);
 if(nearest.delta>130){
   notice('Estás fora do percurso confirmado. Volta ao trajeto ou toca em «Ir» para recalcular.',true);
   return;
 }
 notice('');
 const progress=curve[nearest.idx].meters,scale=curve.at(-1).meters?route.distanceMeters/curve.at(-1).meters:1;
 const remaining=Math.max(0,route.distanceMeters-progress*scale);
 const step=stepFor(nearest.idx);
 const text=remaining<25?'Chegaste ao destino.':
   step?.instruction||'Continua no percurso apresentado.';
 const road=step?.road||'Percurso confirmado';
 const node=$('rzGuideText'),roadNode=$('rzRoadName'),next=$('rzNextDistance'),status=$('rzStatus');
 if(node)node.textContent=text;
 if(roadNode)roadNode.textContent=road;
 if(next)next.textContent=step?.pointIndex!=null&&curve[step.pointIndex]?
   formatDistance(Math.max(0,curve[step.pointIndex].meters-progress)):
   formatDistance(remaining);
 if(status)status.textContent='GO ativo · '+destination.name+' · '+(mode==='walk'?'A pé':mode==='bike'?'Bicicleta':mode==='car'?'Carro':mode==='moto'?'Moto':'Trotineta');
 const trip=$('rzBottom')?.querySelector('.rz-trip'),labels=trip?.querySelectorAll('span b');
 if(labels?.[0])labels[0].textContent=new Date(Date.now()+remaining/Math.max(route.distanceMeters,1)*route.durationSeconds*1000).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
 if(labels?.[1])labels[1].textContent=formatDistance(remaining);
 if(map&&last&&window.L&&map.getZoom()>11)map.panTo([pos.lat,pos.lon],{animate:false});
}
function updatePosition(c){
 const pos=coord(c);if(!pos)return false;
 last={...pos,accuracy:Number(c?.accuracy)||null};
 if(map&&window.L){
   if(!userMarker)userMarker=window.L.circleMarker([pos.lat,pos.lon],{
     radius:7,color:'#fff',fillColor:'#5ba8ff',fillOpacity:1,weight:3
   }).addTo(map);
   else userMarker.setLatLng([pos.lat,pos.lon]);
 }
 if(active)updateInstruction(pos);
 return true;
}
function beginGuidance(){
 if(!route||!last||!destination)return false;
 active=true;updateInstruction(last);
 return true;
}
function stopGuidance(){
 active=false;notice('Navegação terminada. O percurso mantém-se no mapa.');
 return true;
}
async function open(place,{navigate=false,travelMode='walk'}={}){
 const target=coord(place);
 if(!target){notice('Este local não tem coordenadas confirmadas.',true);return false}
 const current=++serial;
 destination={...target,name:String(place.name||'Destino').slice(0,105)};
 route=null;curve=[];active=false;last=null;mode=travelMode;
 window.OLENPlaceExperience?.close?.();
 try{window.OLEN5?.router?.enter('map',{reason:navigate?'chat-place-go':'chat-place-map',destination:destination.name})}
 catch{document.querySelector('.nav[data-view="map"]')?.click()}
 const input=$('rzDestination');if(input)input.value=destination.name;
 const status=$('rzStatus');if(status)status.textContent='Mapa · '+destination.name;
 notice('A preparar o mapa da OLEN…');
 try{
   await ensureMap();
   if(current!==serial)return false;
   draw();
   if(!VALID_MODES.has(mode)){
     notice('Este modo de transporte ainda não tem um percurso verificado. Escolhe A pé, Bicicleta, Carro, Moto ou Trotineta.',true);
     return false;
   }
   notice('A obter a tua localização para calcular um percurso real…');
   const position=await findPosition();
   if(current!==serial)return false;
   last=position;draw();
   notice('A calcular o percurso confirmado…');
   const candidate=await authenticatedPost('/api/olen/route',{start:{lat:position.lat,lon:position.lon},
     destination:{lat:target.lat,lon:target.lon},mode});
   if(current!==serial)return false;
   if(!validated(candidate,position,target,mode))
     throw new Error('O serviço não devolveu um traçado verificável. Não será iniciada navegação.');
   route=candidate;routeDistances();draw();
   notice('Percurso confirmado · '+formatDistance(route.distanceMeters)+' · cerca de '+
     Math.max(1,Math.ceil(route.durationSeconds/60))+' min · '+route.source);
   if(navigate){
     if(!window.OLENLegacyGo?.startRoute)throw new Error('O modo de navegação OLEN ainda não está pronto.');
     window.OLENLegacyGo.startRoute(destination.name,mode);
     beginGuidance();
     notice('');
   }
   return true;
 }catch(e){
   if(current!==serial)return false;
   route=null;curve=[];active=false;draw();
   notice(String(e?.name==='AbortError'?'O cálculo do percurso demorou demasiado tempo.':e?.message||'Não foi possível calcular o percurso.'),true);
   return false;
 }
}
async function prepareManual(name,travelMode='walk'){
 const q=String(name||'').trim();
 if(q.length<2){notice('Indica primeiro o destino.',true);return false}
 if(!VALID_MODES.has(travelMode)){notice('Este modo ainda não tem um motor de navegação confirmado.',true);return false}
 try{
   notice('A confirmar o destino no mapa…');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
   let d;
   try{
     const r=await fetch(API+'/api/geocode?query='+encodeURIComponent(q),{cache:'no-store',signal:controller.signal});
     d=await r.json();
   }finally{clearTimeout(timer)}
   const list=Array.isArray(d?.data)?d.data:[];
   const first=list.map(x=>({name:x.name,latitude:x.latitude,longitude:x.longitude,admin1:x.admin1}))
     .find(x=>coord(x));
   if(!first)throw new Error('Não foi possível confirmar este destino. Escolhe outro local.');
   if(!window.confirm('Destino encontrado: '+first.name+(first.admin1?', '+first.admin1:'')+'. Preparar rota?')){
     notice('Escolhe o destino pretendido.');return false;
   }
   const panel=$('rzGoPop');if(panel)panel.hidden=true;
   return open(first,{navigate:true,travelMode});
 }catch(e){notice(e?.message||'Não foi possível confirmar o destino.',true);return false}
}
window.OLENMapRouting=Object.freeze({
 open,prepareManual,beginGuidance,stopGuidance,updatePosition,formatDistance,
 get state(){return {destination:destination?{...destination}:null,routeReady:!!route,
  route:route?{...route}:null,navigationActive:active,mode};}
});
})();
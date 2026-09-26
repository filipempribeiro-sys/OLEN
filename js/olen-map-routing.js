/* OLEN Map/GO — in-app, GPS-based map and verified route ownership.
   This module never opens OSM or Google Maps websites and never draws a fabricated path.
   External OSM tiles are loaded only for the visible map, with visible attribution. */
(function(){
'use strict';
const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
const VALID_MODES=new Set(['walk','bike','car','moto','scooter']);
const LIB='https://unpkg.com/leaflet@1.9.4/dist/';
let library=null,map=null,tile=null,routeLine=null,trackLine=null,trailLine=null,destinationMarker=null,userMarker=null;
let last=null,route=null,destination=null,mode='walk',active=false,serial=0,curve=[],lastManeuverKey='';
let following=true,trackVisible=true,trail=null,trailGuide=null,trailActive=false;
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
 if(trailLine){map.removeLayer(trailLine);trailLine=null}
 if(trail?.segments?.length){
   const paths=trail.segments.map(seg=>seg.map(p=>[p.latitude,p.longitude])).filter(seg=>seg.length>1);
   if(paths.length){trailLine=L.polyline(paths,{color:'#f4c96a',weight:5,opacity:.95,interactive:false}).addTo(map);
     if(!route){const area=trailLine.getBounds();if(area.isValid())map.fitBounds(area.pad(.15),{animate:false,maxZoom:16})}
   }
 }
 if(route?.geometry?.type==='LineString'&&route.geometry.coordinates.length>=2){
   routeLine=L.geoJSON(route.geometry,{style:{color:'#4ce6bb',weight:5,opacity:.94,lineCap:'round'}}).addTo(map);
   const bounds=routeLine.getBounds();
   if(bounds.isValid())map.fitBounds(bounds.pad(.18),{animate:false,maxZoom:16});
 }else if(destination){
   map.setView([destination.lat,destination.lon],15,{animate:false});
 }
 refreshTrack();
 requestAnimationFrame(()=>map?.invalidateSize());
}
function refreshTrack(){
 if(!map||!window.L)return;
 const points=window.OLENGoActivity?.current?.points||[];
 if(points.length<2){if(trackLine){map.removeLayer(trackLine);trackLine=null}return}
 const latlngs=points.map(p=>[p.latitude,p.longitude]);
 if(!trackLine){trackLine=window.L.polyline(latlngs,{color:'#62bcff',weight:4,opacity:.95,interactive:false});}
 else trackLine.setLatLngs(latlngs);
 if(trackVisible&&!map.hasLayer(trackLine))trackLine.addTo(map);
 else if(!trackVisible&&map.hasLayer(trackLine))map.removeLayer(trackLine);
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
 return steps.find(s=>Number.isSafeInteger(s.pointIndex)&&s.pointIndex>=positionIndex)||null;
}
/* Translate Valhalla's documented maneuver types into OLEN's real icon library.
   Unknown types deliberately display straight rather than claim an invented turn. */
function maneuverType(type){
 const n=Number(type);
 if([4,5,6].includes(n))return 'finish';
 if([1,2,3].includes(n))return 'start';
 if([9,18,20,23].includes(n))return 'slight-right';
 if([10].includes(n))return 'turn-right';
 if([11].includes(n))return 'sharp-right';
 if([12,13].includes(n))return 'uturn';
 if([14].includes(n))return 'sharp-left';
 if([15].includes(n))return 'turn-left';
 if([16,19,21,24].includes(n))return 'slight-left';
 if([25].includes(n))return 'merge';
 if([26,27].includes(n))return 'roundabout';
 if([28,29].includes(n))return 'ferry';
 return 'straight';
}
function updateInstruction(pos){
 if(!active||!route||!curve.length)return;
 const nearest=getNearest(pos);
 if(nearest.delta>130){
   notice('Estás fora do percurso confirmado. Pára o GO e prepara novamente a rota para recalcular.',true);
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
 const nextMeters=step?.pointIndex!=null&&curve[step.pointIndex]?
   Math.max(0,curve[step.pointIndex].meters-progress):remaining;
 const displayDistance=formatDistance(nextMeters);
 const instructionKey=(step?.pointIndex??-1)+'|'+(step?.type??-1)+'|'+text;
 if(window.OLENNavigationGuide?.set){
   if(lastManeuverKey!==instructionKey){
     window.OLENNavigationGuide.set({type:remaining<25?'finish':maneuverType(step?.type),
       instruction:text,road:remaining<25?'':road,distance:displayDistance});
     lastManeuverKey=instructionKey;
   }else if(next)next.textContent=displayDistance;
 }else{
   if(node)node.textContent=text;
   if(roadNode)roadNode.textContent=road;
   if(next)next.textContent=displayDistance;
 }
 if(status)status.textContent='GO ativo · '+destination.name+' · '+(mode==='walk'?'A pé':mode==='bike'?'Bicicleta':mode==='car'?'Carro':mode==='moto'?'Moto':'Trotineta');
 const trip=$('rzBottom')?.querySelector('.rz-trip'),labels=trip?.querySelectorAll('span b');
 if(labels?.[0])labels[0].textContent=new Date(Date.now()+remaining/Math.max(route.distanceMeters,1)*route.durationSeconds*1000).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
 if(labels?.[1])labels[1].textContent=formatDistance(remaining);
 if(following&&map&&last&&window.L&&map.getZoom()>11)map.panTo([pos.lat,pos.lon],{animate:false});
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
 refreshTrack();
 if(active)updateInstruction(pos);
 if(trailActive&&trailGuide){
   if(following&&map&&map.getZoom()>11)map.panTo([pos.lat,pos.lon],{animate:false});
   const state=trailGuide.locate(pos);
   if(state.offTrail)notice('Estás a mais de 100 m do trilho selecionado. Confirma o percurso antes de prosseguir.',true);
   else {notice('');const label=$('rzGuideText'),next=$('rzNextDistance');
     if(label)label.textContent='Segue o trilho GPX selecionado.';
     if(next)next.textContent=formatDistance(state.remainingMeters);
   }
 }
 return true;
}
function beginTrailGuidance(){
 if(!trailGuide)return false;
 active=false;trailActive=true;following=true;
 document.querySelector('.screen[data-screen="map"]')?.classList.remove('olen-map-preview');
 const label=$('rzGuideText'),road=$('rzRoadName');
 if(label)label.textContent='Segue o trilho GPX selecionado.';
 if(road)road.textContent='Homologação por verificar';
 const status=$('rzStatus');if(status)status.textContent='GO ativo · '+trail.name+' · A pé';
 return true;
}
function stopTrailGuidance(){trailActive=false;return true}
async function previewTrail(parsed){
 if(!parsed?.segments?.length||!window.OLENTrailGuide)throw new Error('GPX sem percurso utilizável.');
 const nextGuide=window.OLENTrailGuide.build(parsed.segments);
 const activated=window.OLENOpenScreen?.('map','gpx-import')===true;
 if(!activated)throw new Error('Não foi possível abrir o Mapa/GO da OLEN.');
 await ensureMap();
 trail=parsed;trailGuide=nextGuide;trailActive=false;route=null;destination=null;active=false;curve=[];
 draw();notice('Trilho selecionado · '+formatDistance(trailGuide.totalMeters)+' · origem: '+(trail.provenance?.type||'utilizador')+' · homologação por verificar.');
 return {name:trail.name,totalMeters:trailGuide.totalMeters,pointCount:trail.pointCount||trail.segments.reduce((n,seg)=>n+seg.length,0)};
}
function beginGuidance(){ 
 if(!route||!last||!destination)return false;
 following=true;refreshTrack();
 document.querySelector('.screen[data-screen="map"]')?.classList.remove('olen-map-preview');
 active=true;updateInstruction(last);
 return true;
}
function stopGuidance(){
 active=false;lastManeuverKey='';notice('Navegação terminada. O percurso mantém-se no mapa.');
 return true;
}
async function open(place,{navigate=false,travelMode='walk'}={}){
 const target=coord(place);
 if(!target){notice('Este local não tem coordenadas confirmadas.',true);return false}
 const current=++serial;
 destination={...target,name:String(place.name||'Destino').slice(0,105)};
 route=null;curve=[];active=false;trail=null;trailGuide=null;trailActive=false;last=null;mode=travelMode;lastManeuverKey='';
 // Preview from "Mapa" shows only the real route; "Ir" owns GPS navigation.
 document.querySelector('.screen[data-screen="map"]')?.classList.toggle('olen-map-preview',!navigate);
 window.OLENPlaceExperience?.close?.();
 const reason=navigate?'chat-place-go':'chat-place-map';
 // Use the active OLEN 4.x/5.x screen owner, not an uninitialised router or a website.
 const activated=window.OLENOpenScreen?.('map',reason)===true;
 if(!activated){
   notice('Não foi possível abrir a aba Mapa/GO da OLEN. Atualiza a aplicação e tenta novamente.',true);
   return false;
 }
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
     if(!window.OLENLegacyGo?.startRoute||typeof navigator.geolocation?.watchPosition!=='function')
       throw new Error('A navegação em tempo real necessita de GPS contínuo disponível.');
     if(window.OLENLegacyGo.startRoute(destination.name,mode)!==true)
       throw new Error('Não foi possível iniciar a navegação GPS da OLEN.');
     if(!beginGuidance())throw new Error('Não foi possível ligar a navegação ao percurso confirmado.');
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
async function showBaseMap(){
 const existing=!!map;
 try{
   if(!existing&&!destination)notice('A preparar o mapa da OLEN…');
   await ensureMap();
   draw();
   if(!existing&&!destination)notice('Mapa OLEN pronto. Escolhe GO para preparar um percurso real.');
   return true;
 }catch(e){
   notice(String(e?.message||'Não foi possível carregar o mapa da OLEN.'),true);
   return false;
 }
}
window.OLEN5?.core?.on?.('route:change',e=>{
 if(e?.to==='map'){
   if(e.reason!=='chat-place-map')
     document.querySelector('.screen[data-screen="map"]')?.classList.remove('olen-map-preview');
   showBaseMap().catch(()=>{});
 }
});
window.OLEN5?.core?.on?.('route:stable',e=>{
 if(e?.view==='map'&&e.reason==='footer'){
   document.querySelector('.screen[data-screen="map"]')?.classList.remove('olen-map-preview');
   showBaseMap().catch(()=>{});
 }
});
function reportGpsError(error){
 const denied=Number(error?.code)===1;
 notice(denied?'A localização foi recusada. O GO foi interrompido para não apresentar uma navegação sem GPS.':
 'Sinal GPS indisponível ou impreciso. A distância não é atualizada até regressarem posições válidas.',true);
}
async function controlMap(action){
 try{
  await ensureMap();
  if(action==='Camadas'){
   if(!trackLine){notice('Ainda não existe um tracking para mostrar ou ocultar.');return false}
   trackVisible=!trackVisible;refreshTrack();
   notice(trackVisible?'Tracking visível.':'Tracking oculto. A gravação continua ativa.');return true;
  }
  if(action==='Direção'){
   following=!following;
   if(following&&last)map.panTo([last.lat,last.lon],{animate:false});
   notice(following?'A acompanhar a posição GPS.':'Acompanhamento do mapa desativado.');return true;
  }
  if(action==='Recentrar'){
   const pos=active&&last?last:await findPosition();
   if(!active)updatePosition(pos);
   map.setView([pos.lat,pos.lon],Math.max(map.getZoom(),15),{animate:false});
   notice('Mapa centrado na tua localização.');return true;
  }
  if(action==='Pesquisar'){
   const panel=$('rzGoPop');if(!panel)return false;
   panel.hidden=false;$('rzDestination')?.focus();return true;
  }
  if(action==='OLEN'){
   if(routeLine?.getBounds()?.isValid())map.fitBounds(routeLine.getBounds().pad(.18),{animate:false,maxZoom:16});
   else if(trackLine?.getBounds()?.isValid())map.fitBounds(trackLine.getBounds().pad(.18),{animate:false,maxZoom:16});
   else map.setView([38.7223,-9.1393],11,{animate:false});
   notice('Vista geral do percurso.');return true;
  }
  return false;
 }catch(error){notice(error?.message||'Controlo do mapa indisponível.',true);return false}
}
window.OLENMapRouting=Object.freeze({
 open,showBaseMap,prepareManual,beginGuidance,stopGuidance,beginTrailGuidance,stopTrailGuidance,previewTrail,updatePosition,formatDistance,controlMap,reportGpsError,
 get state(){return {destination:destination?{...destination}:null,selectedTrail:trail?{name:trail.name,pointCount:trail.pointCount}:null,trailReady:!!trailGuide,routeReady:!!route,
  route:route?{...route}:null,navigationActive:active,mode};}
});
})();
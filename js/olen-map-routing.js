/* OLEN Map/GO — in-app, GPS-based map and verified route ownership.
   This module never opens OSM or Google Maps websites and never draws a fabricated path.
   External OSM tiles are loaded only for the visible map, with visible attribution. */
(function(){
'use strict';
const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
const VALID_MODES=new Set(['walk','bike','car','moto','scooter']);
const LIB='https://unpkg.com/leaflet@1.9.4/dist/';
let library=null,map=null,tile=null,routeLine=null,trackLine=null,trailLine=null,destinationMarker=null,userMarker=null,reportMarkers=[];
let last=null,route=null,destination=null,mode='walk',active=false,serial=0,curve=[],lastManeuverKey='',offRoute=false;
let following=true,trackVisible=true,trailVisible=true,routeVisible=true,reportsVisible=true,trail=null,trailGuide=null,trailActive=false;
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
function routeError(error){
 if(error?.name==='AbortError')return 'O serviço de rotas demorou demasiado tempo. Tenta novamente.';
 if(error instanceof TypeError&&/fetch|network|rede|carregar/i.test(String(error.message)))
   return 'Não foi possível contactar o serviço de destinos/rotas OLEN. Confirma a ligação ao Worker e as permissões CORS antes de tentar novamente.';
 return String(error?.message||'Não foi possível preparar o percurso.');
}
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
     if(!trailVisible)map.removeLayer(trailLine);
     if(!route){const area=trailLine.getBounds();if(area.isValid())map.fitBounds(area.pad(.15),{animate:false,maxZoom:16})}
   }
 }
 if(route?.geometry?.type==='LineString'&&route.geometry.coordinates.length>=2){
   routeLine=L.geoJSON(route.geometry,{style:{color:'#4ce6bb',weight:5,opacity:.94,lineCap:'round'}}).addTo(map);
   if(!routeVisible)map.removeLayer(routeLine);
   const bounds=routeLine.getBounds();
   if(bounds.isValid())map.fitBounds(bounds.pad(.18),{animate:false,maxZoom:16});
 }else if(destination){
   map.setView([destination.lat,destination.lon],15,{animate:false});
 }
 refreshTrack();refreshReports();
 requestAnimationFrame(()=>map?.invalidateSize());
}
function refreshTrack(){
 if(!map||!window.L)return;
 const points=window.OLENGoActivity?.current?.points||[];
 if(points.length<2){if(trackLine){map.removeLayer(trackLine);trackLine=null}return}
 const segments=[];let segment=[];
 for(const p of points){
  if(p.breakBefore&&segment.length){segments.push(segment);segment=[]}
  segment.push([p.latitude,p.longitude]);
 }
 if(segment.length)segments.push(segment);
 const latlngs=segments.length===1?segments[0]:segments;
 if(!trackLine){trackLine=window.L.polyline(latlngs,{color:'#62bcff',weight:4,opacity:.95,interactive:false});}
 else trackLine.setLatLngs(latlngs);
 if(trackVisible&&!map.hasLayer(trackLine))trackLine.addTo(map);
 else if(!trackVisible&&map.hasLayer(trackLine))map.removeLayer(trackLine);
}
function refreshReports(){
 if(!map||!window.L)return;
 reportMarkers.forEach(marker=>map.removeLayer(marker));reportMarkers=[];
 if(!reportsVisible)return;
 for(const report of (window.OLENLocalReports?.list?.()||[]).slice(0,100)){
   const lat=Number(report.latitude),lon=Number(report.longitude);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
   const marker=window.L.circleMarker([lat,lon],{radius:6,color:'#f6d6ac',fillColor:'#e8a45f',fillOpacity:.9,weight:2}).addTo(map);
   const popup=document.createElement('div');popup.textContent=String(report.type||'Report local')+' · '+String(report.description||'Sem descrição')+' · Não publicado';
   marker.bindPopup(popup);reportMarkers.push(marker);
 }
}
function setLayerVisible(layer,visible){
 if(!['route','trails','tracking','reports'].includes(layer))return false;
 const value=!!visible;
 if(layer==='route'){routeVisible=value;if(routeLine&&map){if(value&&!map.hasLayer(routeLine))routeLine.addTo(map);else if(!value&&map.hasLayer(routeLine))map.removeLayer(routeLine)}}
 if(layer==='trails'){trailVisible=value;if(trailLine&&map){if(value&&!map.hasLayer(trailLine))trailLine.addTo(map);else if(!value&&map.hasLayer(trailLine))map.removeLayer(trailLine)}}
 if(layer==='tracking'){trackVisible=value;refreshTrack()}
 if(layer==='reports'){reportsVisible=value;refreshReports()}
 return true;
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
/* ALPHA-compatible road/foot provider fallback. Uses only an actual routable
   geometry returned by OSRM, never a straight line between GPS and destination.
   Unsupported travel modes remain blocked when OLEN's Worker is unavailable. */
async function alphaRoute(start,target,selectedMode){
 const endpoint=selectedMode==='walk'
   ?'https://routing.openstreetmap.de/routed-foot/route/v1/driving/'
   :selectedMode==='car'?'https://router.project-osrm.org/route/v1/driving/':null;
 if(!endpoint)throw new Error('O modo selecionado necessita do motor OLEN.');
 const coords=[start,target].map(c=>c.lon.toFixed(6)+','+c.lat.toFixed(6)).join(';');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),23000);
 try{
  const response=await fetch(endpoint+coords+'?overview=full&geometries=geojson&steps=true',{
   signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw new Error('O serviço alternativo devolveu HTTP '+response.status);
  const data=await response.json(),option=data?.routes?.[0];
  if(data?.code!=='Ok'||!option?.geometry||!Number.isFinite(option.distance)||
     !Number.isFinite(option.duration))throw new Error('O serviço alternativo não devolveu uma rota válida.');
  if(!window.OLENOSRMAdapter?.fromRoute)throw new Error('O adaptador de rotas da ALPHA não está disponível.');
  return window.OLENOSRMAdapter.fromRoute(option,selectedMode,
   selectedMode==='walk'?'OpenStreetMap · pedestrian routing (ALPHA)':'OSRM · road routing (ALPHA)');
 }finally{clearTimeout(timer)}
}
async function resolveRoute(start,target,selectedMode){
 try{
  return await authenticatedPost('/api/olen/route',{start:{lat:start.lat,lon:start.lon},
   destination:{lat:target.lat,lon:target.lon},mode:selectedMode});
 }catch(workerError){
  if(selectedMode!=='walk'&&selectedMode!=='car')throw workerError;
  try{return await alphaRoute(start,target,selectedMode)}
  catch(alternativeError){
   throw new Error('Não foi possível calcular a rota no Worker nem no serviço de rotas da ALPHA: '+
     String(alternativeError?.message||'Serviço indisponível').slice(0,125));
  }
 }
}
function normalizeRouteManeuvers(routeResult){
 if(!routeResult||typeof routeResult!=='object'||!Array.isArray(routeResult.maneuvers))return routeResult;
 const provider=String(routeResult.provider||routeResult.engine||routeResult.source||'').toLowerCase();
 const maneuvers=routeResult.maneuvers.map(step=>{
  if(!step||typeof step!=='object')return step;
  const rawIndex=step.pointIndex??step.beginShapeIndex??step.begin_shape_index;
  const pointIndex=Number(rawIndex);
  const rawExit=step.exitNumber??step.exit??step.roundaboutExitNumber??
    step.roundabout_exit_count??step.roundaboutExitCount;
  const exitNumber=Number(rawExit);
  const streetNames=Array.isArray(step.street_names)?step.street_names:
    Array.isArray(step.streetNames)?step.streetNames:[];
  const beginStreetNames=Array.isArray(step.begin_street_names)?step.begin_street_names:
    Array.isArray(step.beginStreetNames)?step.beginStreetNames:[];
  const road=step.road??step.street??streetNames[0]??beginStreetNames[0]??'';
  const instruction=step.instruction??step.instructions??'';
  const looksValhalla=Number.isFinite(Number(step.type))||
    'begin_shape_index' in step||'roundabout_exit_count' in step||provider.includes('valhalla');
  return {
   ...step,
   ...(Number.isSafeInteger(pointIndex)&&pointIndex>=0?{pointIndex}:{}),
   ...(Number.isInteger(exitNumber)&&exitNumber>=1&&exitNumber<=12?{exitNumber}:{}),
   ...(road?{road:String(road).slice(0,160)}:{}),
   ...(instruction?{instruction:String(instruction).slice(0,500)}:{}),
   ...(!step.provider&&looksValhalla?{provider:'valhalla'}:{})
  };
 });
 return {...routeResult,maneuvers};
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
/* Translate known route types into OLEN's icon library.
   Unknown types must remain neutral; never invent a straight-ahead instruction. */
function maneuverType(type){
 if(typeof type==='string'&&new Set(['start','finish','straight','slight-right','turn-right',
   'sharp-right','uturn','sharp-left','turn-left','slight-left','merge','keep-right','keep-left',
   'exit-right','roundabout','ferry','unknown']).has(type))return type;
 const n=Number(type);
 // Valhalla ManeuverType: keep safe one-to-one semantics. Ramp directions are
 // deliberately neutral until their dedicated visual identity is audited.
 if([1,2,3].includes(n))return 'start';
 if([4,5,6].includes(n))return 'finish';
 if([7,8,22].includes(n))return 'straight';
 if(n===9)return 'slight-right';
 if(n===10)return 'turn-right';
 if(n===11)return 'sharp-right';
 if([12,13].includes(n))return 'uturn';
 if(n===14)return 'sharp-left';
 if(n===15)return 'turn-left';
 if(n===16)return 'slight-left';
 if([17,18,19,21].includes(n))return 'unknown';
 if(n===20)return 'exit-right';
 if(n===23)return 'keep-right';
 if(n===24)return 'keep-left';
 if(n===25)return 'merge';
 if([26,27].includes(n))return 'roundabout';
 if([28,29].includes(n))return 'ferry';
 return 'unknown';
}
function laneDirectionLabel(lane){
 const raw=String(lane?.validIndication||'').trim().toLowerCase()||
   (Array.isArray(lane?.indications)&&lane.indications.length===1?String(lane.indications[0]).trim().toLowerCase():'');
 const labels={
  'straight':'em frente','left':'esquerda','right':'direita','uturn':'inversão',
  'slight left':'ligeiramente à esquerda','slight-left':'ligeiramente à esquerda',
  'slight right':'ligeiramente à direita','slight-right':'ligeiramente à direita',
  'sharp left':'acentuada à esquerda','sharp-left':'acentuada à esquerda',
  'sharp right':'acentuada à direita','sharp-right':'acentuada à direita'
 };
 return labels[raw]||'';
}
function updateLaneCue(step){
 const hint=$('rzNextDistance')?.parentElement?.querySelector('small');
 if(!hint)return;
 if(hint.dataset.olenDefaultHtml===undefined)hint.dataset.olenDefaultHtml=hint.innerHTML;
 const lanes=Array.isArray(step?.lanes)?step.lanes:[];
 const valid=lanes.map((lane,i)=>({lane,index:i+1})).filter(item=>item.lane?.valid===true);
 const active=valid.filter(item=>item.lane.active===true);
 const chosen=active.length?active:valid;
 if(!chosen.length||!lanes.length){
  if(hint.dataset.olenLaneCue==='1')hint.innerHTML=hint.dataset.olenDefaultHtml;
  hint.dataset.olenLaneCue='0';hint.removeAttribute('title');
  hint.removeAttribute('aria-label');return;
 }
 const ids=chosen.map(item=>item.index);
 const base=(ids.length===1?'Faixa ':'Faixas ')+ids.join(', ')+'/'+lanes.length;
 const directions=[...new Set(chosen.map(item=>laneDirectionLabel(item.lane)).filter(Boolean))];
 const label=directions.length===1?base+' · '+directions[0]:base;
 hint.textContent=label;
 hint.dataset.olenLaneCue='1';
 hint.title=label+' · contagem da esquerda para a direita';
 hint.setAttribute('aria-label',hint.title);
}
function updateInstruction(pos){
 if(!active||!route||!curve.length)return;
 const nearest=getNearest(pos);
 if(nearest.delta>130){
   notice('Estás fora do percurso confirmado. Pára o GO e prepara novamente a rota para recalcular.',true);
   if(!offRoute){
     offRoute=true;lastManeuverKey='';
     window.OLENNavigationGuide?.set?.({type:'unknown',
       instruction:'Fora do percurso. Confirma a posição no mapa.',road:'',distance:'—'});
     updateLaneCue(null);
   }
   return;
 }
 if(offRoute){offRoute=false;lastManeuverKey=''}
 notice('');
 const progress=curve[nearest.idx].meters,scale=curve.at(-1).meters?route.distanceMeters/curve.at(-1).meters:1;
 const remaining=Math.max(0,route.distanceMeters-progress*scale);
 const step=stepFor(nearest.idx);
 const text=remaining<25?'Chegaste ao destino.':
   step?.instruction||'Confirma a próxima indicação no percurso.';
 const road=step?.road||'Percurso confirmado';
 const node=$('rzGuideText'),roadNode=$('rzRoadName'),next=$('rzNextDistance'),status=$('rzStatus');
 const nextMeters=step?.pointIndex!=null&&curve[step.pointIndex]?
   Math.max(0,curve[step.pointIndex].meters-progress):remaining;
 const displayDistance=formatDistance(nextMeters);
 const resolvedType=remaining<25?'finish':(step?.provider&&typeof step.type==='string'?step.type:maneuverType(step?.type));
 const instructionKey=(step?.pointIndex??-1)+'|'+String(resolvedType)+'|'+
   (step?.exitNumber??step?.exit??'')+'|'+text;
 if(window.OLENNavigationGuide?.set){
   if(lastManeuverKey!==instructionKey){
     const payload=step?{...step}:{};
     // Preserve provider metadata (exit, modifier, driving side and lanes).
     // Numeric Valhalla types are translated to the canonical OLEN type.
     payload.type=resolvedType;
     payload.instruction=text;
     payload.road=remaining<25?'':(step?.road||'');
     payload.distance=displayDistance;
     window.OLENNavigationGuide.set(payload);
     lastManeuverKey=instructionKey;
   }else if(next)next.textContent=displayDistance;
 }else{
   if(node)node.textContent=text;
   if(roadNode)roadNode.textContent=road;
   if(next)next.textContent=displayDistance;
 }
 updateLaneCue(remaining<25?null:step);
 if(status)status.textContent='GO ativo · '+destination.name+' · '+(mode==='walk'?'A pé':mode==='bike'?'Bicicleta':mode==='car'?'Carro':mode==='moto'?'Moto':'Trotineta');
 const trip=$('rzBottom')?.querySelector('.rz-trip'),labels=trip?.querySelectorAll('span b');
 if(labels?.[0])labels[0].textContent=new Date(Date.now()+remaining/Math.max(route.distanceMeters,1)*route.durationSeconds*1000).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
 if(labels?.[1])labels[1].textContent=formatDistance(remaining);
 if(following&&map&&last&&window.L&&map.getZoom()>11)map.panTo([pos.lat,pos.lon],{animate:false});
}
function updatePosition(c){
 const pos=coord(c);if(!pos)return false;
 last={...pos,accuracy:Number(c?.accuracy)||null,timestamp:Number(c?.timestamp)||Date.now()};
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
 draw();const metrics=window.OLENTrailMetrics?.calculate?.(trail.segments);
 const ascent=metrics?.ascentMeters==null?'':(' · subida '+formatDistance(metrics.ascentMeters));
 notice('Trilho selecionado · '+formatDistance(trailGuide.totalMeters)+ascent+' · origem: '+(trail.provenance?.type||'utilizador')+' · homologação por verificar.');
 return {name:trail.name,totalMeters:trailGuide.totalMeters,pointCount:trail.pointCount||trail.segments.reduce((n,seg)=>n+seg.length,0)};
}
function beginGuidance(){ 
 if(!route||!last||!destination)return false;
 following=true;refreshTrack();
 document.querySelector('.screen[data-screen="map"]')?.classList.remove('olen-map-preview');
 active=true;offRoute=false;lastManeuverKey='';updateInstruction(last);
 return true;
}
function stopGuidance(){
 active=false;offRoute=false;lastManeuverKey='';notice('Navegação terminada. O percurso mantém-se no mapa.');
 return true;
}
async function open(place,{navigate=false,travelMode='walk'}={}){
 const target=coord(place);
 if(!target){notice('Este local não tem coordenadas confirmadas.',true);return false}
 const current=++serial;
 destination={...target,name:String(place.name||'Destino').slice(0,105)};
 route=null;curve=[];active=false;trail=null;trailGuide=null;trailActive=false;last=null;mode=travelMode;lastManeuverKey='';offRoute=false;
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
   const candidate=normalizeRouteManeuvers(await resolveRoute(position,target,mode));
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
   notice(routeError(e),true);
   return false;
 }
}
/* Destination resolver: restore ALPHA's direct Nominatim path when the
   optional OLEN Worker geocoder cannot be contacted by a Pages origin.
   User-initiated only, bounded and cached; never infer coordinates from IP. */
const GEOCODE_CACHE='olen:map:geocode:v1:';
async function lookupDestination(name){
 const q=String(name||'').trim();
 if(q.length<2)return [];
 const cacheKey=GEOCODE_CACHE+q.toLocaleLowerCase('pt-PT');
 try{const record=JSON.parse(window.localStorage?.getItem(cacheKey)||'null');
  if(Array.isArray(record?.items)&&Date.now()-record.at<86400000)return record.items;
 }catch(_){}
 let results=[],workerError=null;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetch(API+'/api/geocode?query='+encodeURIComponent(q),{cache:'no-store',signal:controller.signal});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const body=await r.json();
   results=(Array.isArray(body?.data)?body.data:[]).map(x=>({
     name:x.name,latitude:Number(x.latitude),longitude:Number(x.longitude),
     admin1:x.admin1||'',country:x.country||'',source:'OLEN Worker'
   })).filter(coord);
  }finally{clearTimeout(timer)}
 }catch(error){workerError=error}
 if(!results.length){
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q='+encodeURIComponent(q);
    const r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
    if(!r.ok)throw new Error('Nominatim HTTP '+r.status);
    const body=await r.json();
    results=(Array.isArray(body)?body:[]).map(x=>({
      name:String(x.display_name||x.name||q).slice(0,160),
      latitude:Number(x.lat),longitude:Number(x.lon),
      admin1:x.address?.state||x.address?.county||'',country:x.address?.country||'',source:'OpenStreetMap Nominatim'
    })).filter(coord);
   }finally{clearTimeout(timer)}
  }catch(error){
   throw new Error('Não foi possível consultar os destinos OLEN nem a pesquisa OSM. Verifica a ligação e volta a tentar. ('+
     String(workerError?.message||'Worker indisponível').slice(0,65)+')');
  }
 }
 try{window.localStorage?.setItem(cacheKey,JSON.stringify({at:Date.now(),items:results}))}catch(_){}
 return results;
}
async function prepareManual(name,travelMode='walk'){
 const q=String(name||'').trim();
 if(q.length<2){notice('Indica primeiro o destino.',true);return false}
 if(!VALID_MODES.has(travelMode)){notice('Este modo ainda não tem um motor de navegação confirmado.',true);return false}
 try{
   notice('A confirmar o destino no mapa…');
   const list=await lookupDestination(q);
   if(!list.length)throw new Error('Não foi possível confirmar este destino. Escolhe outro local.');
   const chooser=$('rzGeocodeChoices');
   let chosen=list[0];
   if(list.length>1&&chooser){
     if(chooser.hidden||chooser.dataset.query!==q){
       chooser.replaceChildren();
       const hint=document.createElement('option');hint.value='';hint.textContent='Escolhe a localidade correta';chooser.appendChild(hint);
       list.forEach((item,i)=>{const option=document.createElement('option');option.value=String(i);
         option.textContent=[item.name,item.admin1,item.country].filter(Boolean).join(' · ');
         chooser.appendChild(option)});
       chooser.value='';chooser.dataset.query=q;chooser.hidden=false;
       notice('Encontrámos '+list.length+' localidades. Escolhe a correta e carrega novamente em Preparar rota.');
       return false;
     }
     if(chooser.value===''){notice('Seleciona a localidade correta antes de preparar a rota.',true);return false}
     chosen=list[Number(chooser.value)];
     if(!chosen)throw new Error('A localidade selecionada já não está disponível. Pesquisa novamente.');
   }else if(chooser){chooser.hidden=true;chooser.value='';}
   // A janela de preparação só fecha quando existe rota validada e GO iniciado.
   return open(chosen,{navigate:true,travelMode});
 }catch(e){notice(routeError(e),true);return false}
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
function reportRouteError(error){notice(routeError(error),true)}
function reportGpsError(error){
 const denied=Number(error?.code)===1;
 notice(denied?'A localização foi recusada. O GO foi interrompido para não apresentar uma navegação sem GPS.':
 'Sinal GPS indisponível ou impreciso. A distância não é atualizada até regressarem posições válidas.',true);
}
async function controlMap(action){
 try{
  await ensureMap();
  if(action==='Camadas'){
   const panel=$('rzLayersPop');if(!panel)return false;
   panel.hidden=false;return true;
  }
  if(action==='Direção'){
   following=!following;
   if(following&&last)map.panTo([last.lat,last.lon],{animate:false});
   notice(following?'A acompanhar a posição GPS.':'Acompanhamento do mapa desativado.');return true;
  }
  if(action==='Recentrar'){
   const pos=last&&Number.isFinite(last.timestamp)&&Date.now()-last.timestamp<10000?last:await findPosition();
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
$('rzDestination')?.addEventListener('input',()=>{
 const choices=$('rzGeocodeChoices');
 if(choices){choices.hidden=true;choices.value='';choices.dataset.query=''}
});
window.OLENMapRouting=Object.freeze({
 open,showBaseMap,lookupDestination,prepareManual,beginGuidance,stopGuidance,beginTrailGuidance,stopTrailGuidance,previewTrail,updatePosition,formatDistance,controlMap,reportGpsError,reportRouteError,setLayerVisible,refreshReports,
 searchCenter(){const c=destination||last||(map?.getCenter?.()||null);return c?{latitude:c.lat,longitude:c.lon??c.lng,name:destination?.name||null}:null},
 get state(){return {destination:destination?{...destination}:null,selectedTrail:trail?{id:trail.id||null,name:trail.name,pointCount:trail.pointCount||trail.segments.reduce((n,seg)=>n+seg.length,0),provenance:trail.provenance||{type:'user-import',official:false}}:null,trailReady:!!trailGuide,routeReady:!!route,
  route:route?{...route}:null,navigationActive:active,mode,layers:{route:routeVisible,trails:trailVisible,tracking:trackVisible,reports:reportsVisible}};}
});
})();
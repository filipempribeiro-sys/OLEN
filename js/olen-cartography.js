/* OLEN Cartography — cartography-only adapter.
   Replaces only the basemap rendering. Map/GO controls, HUD, routing, GPS,
   Maneuvers, tracking and interaction remain owned by their existing modules. */
(function(global){
'use strict';
const MAPLIBRE_VERSION='5.6.1';
const ADAPTER_VERSION='0.1.3';
const STYLE='./maps/olen-cartography.json?v=20260930-cartography-v3';
const FALLBACK_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR='OpenFreeMap © OpenMapTiles · © OpenStreetMap contributors';
let loading=null;

function addCss(href,id){
 if(document.getElementById(id))return;
 const link=document.createElement('link');
 link.id=id;link.rel='stylesheet';link.href=href;
 document.head.appendChild(link);
}
function loadScript(src,id){
 const found=document.getElementById(id);
 if(found&&found.dataset.loaded==='1')return Promise.resolve();
 return new Promise((resolve,reject)=>{
   const script=found||document.createElement('script');
   if(!found){script.id=id;script.src=src;script.async=true;document.head.appendChild(script)}
   const timer=setTimeout(()=>fail(),12000);
   const done=()=>{clearTimeout(timer);script.dataset.loaded='1';resolve()};
   const fail=()=>{clearTimeout(timer);reject(new Error('Cartography dependency failed: '+id))};
   script.addEventListener('load',done,{once:true});
   script.addEventListener('error',fail,{once:true});
 });
}
async function ensureVectorRenderer(L){
 if(L?.maplibreGL&&global.maplibregl)return true;
 if(!loading){
   loading=(async()=>{
     addCss('https://unpkg.com/maplibre-gl@'+MAPLIBRE_VERSION+'/dist/maplibre-gl.css','olen-maplibre-css');
     await loadScript('https://unpkg.com/maplibre-gl@'+MAPLIBRE_VERSION+'/dist/maplibre-gl.js','olen-maplibre-js');
     await loadScript('https://unpkg.com/@maplibre/maplibre-gl-leaflet@'+ADAPTER_VERSION+'/leaflet-maplibre-gl.js','olen-maplibre-leaflet-js');
     if(!L?.maplibreGL)throw new Error('Leaflet vector cartography adapter unavailable.');
     return true;
   })().catch(error=>{loading=null;throw error});
 }
 return loading;
}
function rasterFallback(map,L){
 return L.tileLayer(FALLBACK_TILES,{
   maxZoom:19,
   attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
   updateWhenIdle:true,keepBuffer:1
 }).addTo(map);
}
function guardVector(layer,map,L){
 let timer=null,gl=null,canvas=null,failed=false;
 function fail(event){
   if(failed)return;
   failed=true;clearTimeout(timer);
   gl?.off('load',ready);gl?.off('error',fail);
   canvas?.removeEventListener('webglcontextlost',fail);
   console.warn('[OLEN Cartography] vector load failed; using safe raster fallback.',event?.error||event);
   // Remove only the failed basemap, after the renderer finishes dispatching.
   setTimeout(()=>{
     if(map.hasLayer(layer))map.removeLayer(layer);
     rasterFallback(map,L);
   },0);
 }
 function ready(){clearTimeout(timer)}
 layer.once('add',()=>{
   gl=layer.getMaplibreMap();
   if(!gl){fail(new Error('Vector renderer unavailable.'));return}
   canvas=gl.getCanvas();
   gl.on('load',ready);gl.on('error',fail);
   canvas.addEventListener('webglcontextlost',fail);
   timer=setTimeout(()=>fail(new Error('Vector cartography load timed out.')),20000);
   if(gl.loaded())ready();
 });
 layer.once('remove',()=>{
   clearTimeout(timer);
   gl?.off('load',ready);gl?.off('error',fail);
   canvas?.removeEventListener('webglcontextlost',fail);
 });
 return layer;
}
async function attach(map,L){
 try{
   await ensureVectorRenderer(L);
   const layer=L.maplibreGL({
     style:STYLE,
     attribution:ATTR,
     interactive:false
   });
   guardVector(layer,map,L);
   layer.addTo(map);
   return layer;
 }catch(error){
   console.warn('[OLEN Cartography] vector style unavailable; using safe raster fallback.',error);
   return rasterFallback(map,L);
 }
}
global.OLENCartography=Object.freeze({attach,style:STYLE,version:'1.1.0'});
})(window);

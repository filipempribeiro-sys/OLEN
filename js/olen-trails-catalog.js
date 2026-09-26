/* OLEN nearby trail discovery — OpenStreetMap data, NOT official homologation.
   Small bounded queries, 6h local cache, no unsolicited background polling. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENTrailsCatalog=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ENDPOINT='https://overpass-api.de/api/interpreter',TTL=6*60*60*1000,MAX_TRAILS=15;
 function point(v){
  const lat=Number(v?.lat??v?.latitude),lon=Number(v?.lon??v?.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
  return {lat,lon};
 }
 function distance(a,b){
  const r=Math.PI/180,dy=(b.lat-a.lat)*r,dx=(b.lon-a.lon)*r;
  const h=Math.sin(dy/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dx/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 function normalizeRelation(rel,origin){
  if(rel?.type!=='relation'||!Number.isSafeInteger(rel.id))return null;
  const tags=rel.tags||{},segments=[];
  for(const member of rel.members||[]){
   if(!Array.isArray(member.geometry)||member.geometry.length<2)continue;
   const coordinates=member.geometry.map(point);
   if(coordinates.every(Boolean))segments.push(coordinates.map(x=>({latitude:x.lat,longitude:x.lon})));
  }
  if(!segments.length)return null;
  const positions=segments.flat(),mid=positions[Math.floor(positions.length/2)];
  const center=point(rel.center)||{lat:mid.latitude,lon:mid.longitude};
  const sourceUrl='https://www.openstreetmap.org/relation/'+rel.id;
  return {
   id:'osm:relation:'+rel.id,name:String(tags.name||tags.ref||'Trilho OSM '+rel.id).slice(0,160),
   reference:String(tags.ref||'').slice(0,80),network:String(tags.network||'').slice(0,70),
   operator:String(tags.operator||'').slice(0,160),distanceTag:String(tags.distance||'').slice(0,50),
   elevationGainTag:String(tags.ascent||'').slice(0,50),durationTag:String(tags.duration||'').slice(0,50),
   center,metersFromSearch:distance(origin,center),segments,
   provenance:{type:'openstreetmap',sourceUrl,license:'ODbL',retrievedAt:new Date().toISOString(),
     official:false,homologated:false,accessStatus:'unknown'}
  };
 }
 function query(origin,radius=30000){
  const c=point(origin);
  if(!c)throw new Error('Localização inválida para pesquisa de trilhos.');
  const meters=Math.max(500,Math.min(30000,Math.round(radius)));
  return '[out:json][timeout:25];relation(around:'+meters+','+c.lat+','+c.lon+')["type"="route"]["route"~"^(hiking|foot)$"];out body geom '+MAX_TRAILS*5+';';
 }
 function create({request,storage,now=()=>Date.now()}={}){
  const fetcher=request||(typeof fetch==='function'?fetch:null);
  if(typeof fetcher!=='function')throw new Error('Cliente de pesquisa de trilhos indisponível.');
  function key(center){return 'olen:trails:osm:v1:'+center.lat.toFixed(2)+':'+center.lon.toFixed(2)}
  async function nearby(location,{force=false,radius=30000}={}){
   const center=point(location);if(!center)throw new Error('Localização GPS inválida.');
   const cacheKey=key(center);
   if(!force&&storage){
    try{const saved=JSON.parse(storage.getItem(cacheKey)||'null');
      if(saved?.at&&now()-saved.at>=0&&now()-saved.at<TTL&&Array.isArray(saved.trails))
       return {trails:saved.trails,source:'cache',at:saved.at};
    }catch(_){}
   }
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timeout=typeof setTimeout==='function'&&controller?setTimeout(()=>controller.abort(),28000):null;
   try{
    const result=await fetcher(ENDPOINT+'?data='+encodeURIComponent(query(center,radius)),{
      method:'GET',cache:'no-store',signal:controller?.signal});
    if(!result?.ok)throw new Error('Pesquisa de trilhos temporariamente indisponível.');
    const data=await result.json();
    if(!Array.isArray(data?.elements))throw new Error('Dados de trilhos inválidos.');
    const trails=data.elements.map(x=>normalizeRelation(x,center)).filter(Boolean)
      .sort((a,b)=>a.metersFromSearch-b.metersFromSearch).slice(0,MAX_TRAILS);
    const at=now();try{storage?.setItem(cacheKey,JSON.stringify({at,trails}))}catch(_){}
    return {trails,source:'openstreetmap',at};
   }finally{if(timeout!==null)clearTimeout(timeout)}
  }
  return Object.freeze({nearby});
 }
 return Object.freeze({create,query,normalizeRelation,distance});
});

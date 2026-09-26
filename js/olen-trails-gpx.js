/* OLEN GPX boundary: user tracks are not assumed official or homologated.
   No remote fetch, tile download or external entity processing. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENGPX=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_BYTES=2_000_000,MAX_POINTS=20_000;
 const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 function coordinate(lat,lon){
  const a=Number(lat),b=Number(lon);
  if(lat==null||lon==null||String(lat).trim()===''||String(lon).trim()===''||
     !Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)throw new TypeError('GPX contém coordenadas inválidas.');
  return [b,a];
 }
 function parse(xml){
  if(typeof xml!=='string'||!xml.trim()||xml.length>MAX_BYTES)throw new Error('GPX vazio ou demasiado grande.');
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw new Error('Declarações externas não são permitidas no GPX.');
  if(typeof DOMParser!=='function')throw new Error('Este ambiente não disponibiliza um leitor GPX XML.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement?.localName!=='gpx')
   throw new Error('Ficheiro GPX inválido.');
  const elements=(root,name)=>Array.from(root.getElementsByTagNameNS('*',name));
  const text=(root,name)=>elements(root,name)[0]?.textContent?.trim()||'';
  const segments=[];let total=0;
  function readNodes(nodes){
   const output=[];
   for(const n of nodes){
    if(++total>MAX_POINTS)throw new Error('GPX excede o limite de pontos.');
    const [longitude,latitude]=coordinate(n.getAttribute('lat'),n.getAttribute('lon'));
    const elevation=text(n,'ele'),time=text(n,'time');
    output.push({latitude,longitude,
     ...(elevation!==''&&Number.isFinite(Number(elevation))?{elevation:Number(elevation)}:{}),
     ...(time&&!Number.isNaN(Date.parse(time))?{timestamp:Date.parse(time)}:{})});
   }
   if(output.length)segments.push(output);
  }
  for(const segment of elements(doc,'trkseg'))readNodes(elements(segment,'trkpt'));
  for(const route of elements(doc,'rte'))readNodes(elements(route,'rtept'));
  if(!total)throw new Error('GPX não contém pontos de trilho ou rota.');
  const name=text(doc,'name')||'Trilho importado';
  return {schemaVersion:1,name:name.slice(0,140),segments,pointCount:total,
    provenance:{type:'user-import',official:false,homologated:false}};
 }
 function exportTrack(input){
  const points=Array.isArray(input?.points)?input.points:[];
  if(!points.length||points.length>MAX_POINTS)throw new Error('Não existem pontos válidos para exportar.');
  const name=escape(String(input.name||'Atividade OLEN').slice(0,140));
  const lines=['<?xml version="1.0" encoding="UTF-8"?>',
   '<gpx version="1.1" creator="OLEN" xmlns="http://www.topografix.com/GPX/1/1">',
   '<metadata><name>'+name+'</name></metadata>','<trk><name>'+name+'</name><trkseg>'];
  for(const p of points){
   const [longitude,latitude]=coordinate(p?.latitude,p?.longitude);
   let line='<trkpt lat="'+latitude+'" lon="'+longitude+'">';
   if(Number.isFinite(p.elevation))line+='<ele>'+p.elevation+'</ele>';
   if(Number.isFinite(p.timestamp)&&p.timestamp>0)line+='<time>'+new Date(p.timestamp).toISOString()+'</time>';
   lines.push(line+'</trkpt>');
  }
  lines.push('</trkseg></trk></gpx>');
  return lines.join('\n');
 }
 function geometry(parsed){
  const segments=parsed?.segments;
  if(!Array.isArray(segments)||!segments.length)throw new Error('Trilho sem segmentos.');
  const coordinates=segments.map(segment=>segment.map(p=>coordinate(p.latitude,p.longitude)));
  return coordinates.length===1?{type:'LineString',coordinates:coordinates[0]}:
    {type:'MultiLineString',coordinates};
 }
 return Object.freeze({parse,exportTrack,geometry,MAX_BYTES,MAX_POINTS});
});

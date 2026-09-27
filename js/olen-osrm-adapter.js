/* OLEN / ALPHA OSRM compatibility — verified road geometry and real turns.
   No inferred maneuvers or straight-line route generation. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENOSRMAdapter=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const RAD=Math.PI/180;
 const distance=(a,b)=>{
  const dy=(a[1]-b[1])*RAD,dx=(a[0]-b[0])*RAD;
  const h=Math.sin(dy/2)**2+Math.cos(a[1]*RAD)*Math.cos(b[1]*RAD)*Math.sin(dx/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
 };
 const valid=c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&
  Math.abs(c[0])<=180&&Math.abs(c[1])<=90;
 function direction(m){
  const type=String(m?.type||''),modifier=String(m?.modifier||'');
  if(type==='depart')return ['start','Inicia o percurso'];
  if(type==='arrive')return ['finish','Chegaste ao destino'];
  if(type==='roundabout'||type==='rotary')return ['roundabout','Entra na rotunda'];
  if(type==='merge')return ['merge','Entra na via indicada'];
  if(type==='on ramp'||type==='off ramp')return ['merge','Segue a ligação indicada'];
  const normalized=modifier.replace(/\s+/g,'-');
  if(normalized==='right')return ['turn-right','Vira à direita'];
  if(normalized==='left')return ['turn-left','Vira à esquerda'];
  if(normalized==='slight-right')return ['slight-right','Segue ligeiramente à direita'];
  if(normalized==='slight-left')return ['slight-left','Segue ligeiramente à esquerda'];
  if(normalized==='sharp-right')return ['sharp-right','Vira acentuadamente à direita'];
  if(normalized==='sharp-left')return ['sharp-left','Vira acentuadamente à esquerda'];
  if(normalized==='uturn')return ['uturn','Inverte o sentido de marcha'];
  return ['straight','Continua no percurso indicado'];
 }
 function fromRoute(raw,mode,source){
  const geometry=raw?.geometry,points=geometry?.coordinates;
  if(geometry?.type!=='LineString'||!Array.isArray(points)||points.length<2||
     !points.every(valid)||!Number.isFinite(raw.distance)||raw.distance<=0||
     !Number.isFinite(raw.duration)||raw.duration<0)throw new Error('Rota OSRM sem geometria verificável.');
  const maneuvers=[];
  for(const leg of raw.legs||[]){
   for(const step of leg.steps||[]){
    const location=step?.maneuver?.location;
    if(!valid(location))continue;
    let best=-1,meters=Infinity;
    for(let i=0;i<points.length;i++){
     const d=distance(points[i],location);if(d<meters){meters=d;best=i}
    }
    if(best<0||meters>150)continue;
    const [type,instruction]=direction(step.maneuver);
    const road=String(step.name||'').slice(0,130);
    maneuvers.push({type,pointIndex:best,instruction,road,
      distanceMeters:Number.isFinite(step.distance)?Math.max(0,step.distance):0});
   }
  }
  maneuvers.sort((a,b)=>a.pointIndex-b.pointIndex);
  return {ok:true,mode,source,geometry,distanceMeters:raw.distance,durationSeconds:raw.duration,maneuvers};
 }
 return Object.freeze({fromRoute,direction});
});

/* OLEN Trail GO — geometric position on a chosen GPX path.
   Projection is indicative, not a guarantee of safe access or official status.
   Separate GPX segments are never bridged with invented geometry. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENTrailGuide=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const R=6371000,rad=Math.PI/180;
 const point=p=>({latitude:Number(p.latitude),longitude:Number(p.longitude)});
 function meters(a,b){
  const dy=(b.latitude-a.latitude)*rad,dx=(b.longitude-a.longitude)*rad;
  const h=Math.sin(dy/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dx/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 function build(segments){
  if(!Array.isArray(segments)||!segments.length)throw new Error('Trilho sem segmentos.');
  let total=0;const edges=[];
  for(const segment of segments){
   if(!Array.isArray(segment))continue;
   for(let i=1;i<segment.length;i++){
    const a=point(segment[i-1]),b=point(segment[i]);
    if(![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite)||
       Math.abs(a.latitude)>90||Math.abs(b.latitude)>90||
       Math.abs(a.longitude)>180||Math.abs(b.longitude)>180)throw new Error('Ponto de trilho inválido.');
    const length=meters(a,b);
    if(length>0){edges.push({a,b,length,offset:total});total+=length}
   }
  }
  if(!edges.length)throw new Error('Trilho sem geometria percorrível.');
  function locate(raw){
   const p=point(raw);
   if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)
    throw new Error('Localização GPS inválida.');
   let best=null;
   for(const e of edges){
    const latitudeScale=R*rad,longitudeScale=R*rad*Math.cos(p.latitude*rad);
    const ax=(e.a.longitude-p.longitude)*longitudeScale,ay=(e.a.latitude-p.latitude)*latitudeScale;
    const bx=(e.b.longitude-p.longitude)*longitudeScale,by=(e.b.latitude-p.latitude)*latitudeScale;
    const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy;
    const fraction=denom?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/denom)):0;
    const x=ax+fraction*dx,y=ay+fraction*dy,distance=Math.hypot(x,y);
    if(!best||distance<best.distanceMeters){
     const progress=e.offset+fraction*e.length;
     best={distanceMeters:distance,progressMeters:progress,remainingMeters:Math.max(0,total-progress),
       totalMeters:total,offTrail:distance>100};
    }
   }
   return best;
  }
  return Object.freeze({totalMeters:total,locate});
 }
 return Object.freeze({build,meters});
});

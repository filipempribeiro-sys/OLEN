/* OLEN trail metrics from supplied GPX elevation; never invents difficulty.
   Elevation differences under 3m are treated as GPS/DEM noise. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENTrailMetrics=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function calculate(segments){
  if(!Array.isArray(segments))throw new TypeError('Trilho inválido.');
  let ascent=0,descent=0,samples=0,min=Infinity,max=-Infinity;
  for(const segment of segments){
   if(!Array.isArray(segment))continue;
   let last=null;
   for(const p of segment){
    const elevation=p?.elevation;
    if(!Number.isFinite(elevation)){last=null;continue}
    samples++;min=Math.min(min,elevation);max=Math.max(max,elevation);
    if(last!==null){
     const delta=elevation-last;
     if(delta>=3)ascent+=delta;
     else if(delta<=-3)descent-=delta;
    }
    last=elevation;
   }
  }
  return {ascentMeters:samples?Math.round(ascent):null,
   descentMeters:samples?Math.round(descent):null,
   minElevationMeters:samples?min:null,maxElevationMeters:samples?max:null,
   elevationSamples:samples,difficulty:{status:'unknown',method:null,official:false}};
 }
 return Object.freeze({calculate});
});

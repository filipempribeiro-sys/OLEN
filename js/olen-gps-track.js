/* OLEN Map/GO P0 — GPS activity recorder.
   GPS coordinates stay on-device. A rejected fix never contributes distance.
   The recorder is deliberately independent of Leaflet and of the GO UI. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.OLENGpsTrack=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='olen:go:activity:v1';
  const MAX_ACCURACY=65,MAX_POINTS=20000;
  const MODE_MAX_SPEED=Object.freeze({walk:5,bike:23,scooter:20,moto:65,car:65,camper:45,transit:65});
  const clone=x=>JSON.parse(JSON.stringify(x));
  function distance(a,b){
    const r=Math.PI/180,dy=(b.latitude-a.latitude)*r,dx=(b.longitude-a.longitude)*r;
    const h=Math.sin(dy/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dx/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function normalize(raw){
    const p=raw?.coords||raw,latitude=Number(p?.latitude),longitude=Number(p?.longitude);
    const accuracy=Number(p?.accuracy),timestamp=Number(raw?.timestamp??p?.timestamp??Date.now());
    if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||
       !Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(timestamp)||timestamp<=0)return null;
    return {latitude,longitude,accuracy,timestamp};
  }
  function createRecorder(storage){
    let state=null;
    function persist(){
      if(!storage||!state)return;
      try{storage.setItem(KEY,JSON.stringify(state))}catch(_){}
    }
    function snapshot(){return state?clone(state):null}
    function start(options={}){
      const now=Number(options.startedAt)||Date.now();
      state={version:1,id:String(options.id||now),name:String(options.name||'Destino').slice(0,105),
        mode:String(options.mode||'walk'),startedAt:now,finishedAt:null,active:true,
        distanceMeters:0,points:[],rejected:0};
      persist();return snapshot();
    }
    function ingest(raw){
      if(!state?.active)return {accepted:false,reason:'inactive',state:snapshot()};
      const p=normalize(raw);
      if(!p||p.accuracy>MAX_ACCURACY){state.rejected++;persist();return {accepted:false,reason:'accuracy-or-coordinates',state:snapshot()}}
      if(state.points.length>=MAX_POINTS){state.rejected++;persist();return {accepted:false,reason:'point-limit',state:snapshot()}}
      const previous=state.points[state.points.length-1];
      if(previous){
        const dt=(p.timestamp-previous.timestamp)/1000;
        if(dt<=0){state.rejected++;return {accepted:false,reason:'timestamp',state:snapshot()}}
        const meters=distance(previous,p);
        const tolerance=Math.min(20,Math.max(previous.accuracy,p.accuracy));
        const speedLimit=MODE_MAX_SPEED[state.mode]??MODE_MAX_SPEED.walk;
        if(meters>Math.max(25,speedLimit*dt+tolerance)){
          state.rejected++;persist();return {accepted:false,reason:'gps-jump',state:snapshot()};
        }
        // Jitter inside the measured horizontal uncertainty is not movement.
        if(meters<=Math.min(12,Math.max(3,Math.min(previous.accuracy,p.accuracy)*0.5))){
          return {accepted:false,reason:'jitter',state:snapshot()};
        }
        state.distanceMeters+=meters;
      }
      state.points.push(p);persist();
      return {accepted:true,reason:'ok',state:snapshot()};
    }
    function finish(now=Date.now()){
      if(!state)return null;
      if(state.active){state.active=false;state.finishedAt=Math.max(state.startedAt,Number(now)||Date.now());persist()}
      return snapshot();
    }
    function recover(){
      if(!storage)return null;
      try{
        const p=JSON.parse(storage.getItem(KEY)||'null');
        if(p?.version===1&&Array.isArray(p.points)&&Number.isFinite(p.distanceMeters)&&
          p.points.length<=MAX_POINTS){state=p;return snapshot()}
      }catch(_){}
      return null;
    }
    function clear(){state=null;try{storage?.removeItem(KEY)}catch(_){}}
    return Object.freeze({start,ingest,finish,recover,clear,snapshot});
  }
  return Object.freeze({createRecorder,distance,normalize,KEY});
});

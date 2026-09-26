/* OLEN local geo reports. Never claims community publication or authority status.
   Saved only with a valid GPS fix and explicit user action. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENGoReports=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='olen:go:reports:v1',MAX=100;
 const TYPES=Object.freeze(['danger','obstacle','traffic','surface','water','other']);
 const LEVELS=Object.freeze(['information','caution','danger']);
 function create(storage){
  function list(){
   try{const items=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(items)?JSON.parse(JSON.stringify(items)).slice(0,MAX):[]}catch(_){return []}
  }
  function save(input){
   const p=input?.position,latitude=Number(p?.latitude),longitude=Number(p?.longitude);
   const accuracy=Number(p?.accuracy),type=String(input?.type||''),level=String(input?.level||'information');
   if(!TYPES.includes(type)||!LEVELS.includes(level))throw new Error('Tipo ou severidade inválidos.');
   if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||
      !Number.isFinite(accuracy)||accuracy>65||accuracy<0)throw new Error('GPS insuficiente para registar o report.');
   const description=String(input.description||'').trim().slice(0,2000);
   const item={id:'report_'+String(input.id||Date.now()),type,level,description,
     latitude,longitude,accuracy,at:Number(input.at)||Date.now(),status:'local-draft',
     provenance:{type:'user-report',published:false}};
   const items=[item,...list().filter(x=>x.id!==item.id)].slice(0,MAX);
   try{if(!storage)return null;storage.setItem(KEY,JSON.stringify(items));return {...item}}
   catch(_){return null}
  }
  function remove(id){const items=list(),next=items.filter(x=>x.id!==String(id));try{
   if(next.length===items.length||!storage)return false;storage.setItem(KEY,JSON.stringify(next));return true
  }catch(_){return false}}
  return Object.freeze({save,list,remove});
 }
 return Object.freeze({create,TYPES,LEVELS});
});

/* OLEN — local outdoor activity history. Coordinates never leave this device.
   Store only completed tracks. No implied server sync or public sharing. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENGoHistory=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='olen:go:history:v1',MAX_ENTRIES=50,MAX_POINTS=20000;
 function create(storage){
  function read(){
   try{const parsed=JSON.parse(storage?.getItem(KEY)||'[]');
    return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.id==='string'&&x.active===false&&
      Array.isArray(x.points)&&x.points.length<=MAX_POINTS&&Number.isFinite(x.distanceMeters)).slice(0,MAX_ENTRIES):[];
   }catch(_){return []}
  }
  function write(items){
   try{storage?.setItem(KEY,JSON.stringify(items));return !!storage}catch(_){return false}
  }
  function save(activity){
   if(!activity||activity.active!==false||!activity.finishedAt||!Array.isArray(activity.points)||
      activity.points.length>MAX_POINTS||!Number.isFinite(activity.distanceMeters))return false;
   const item=JSON.parse(JSON.stringify(activity));
   const items=read().filter(x=>x.id!==item.id);
   items.unshift(item);items.sort((a,b)=>Number(b.finishedAt)-Number(a.finishedAt));
   return write(items.slice(0,MAX_ENTRIES));
  }
  function get(id){const item=read().find(x=>x.id===String(id));return item?JSON.parse(JSON.stringify(item)):null}
  function list(){return JSON.parse(JSON.stringify(read()))}
  function remove(id){const items=read(),filtered=items.filter(x=>x.id!==String(id));return filtered.length!==items.length&&write(filtered)}
  function clear(){try{storage?.removeItem(KEY);return !!storage}catch(_){return false}}
  return Object.freeze({save,get,list,remove,clear});
 }
 return Object.freeze({create,KEY});
});

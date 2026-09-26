/* OLEN Map/GO -> Experience bridge. No provider, map or UI ownership.
   A failed Experience write never blocks emergency STOP or GPS recording. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OLENGoExperience=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 let linkedId='';
 function engine(){return typeof window==='undefined'?null:window.OLEN5?.experienceEngine||null}
 function attach(activity,route){
   if(!activity?.id)return null;
   const e=engine();if(!e)return null;
   try{
     let current=e.getActive();
     if(!current||['COMPLETED','ARCHIVED'].includes(current.lifecycle)){
       current=e.create({title:activity.name||'Percurso OLEN',lifecycle:'READY',
         route:{destination:route?.destination||null,mode:activity.mode}},{activate:true});
     }
     linkedId=current.id;
     e.updateDomain(linkedId,'go',{activityId:activity.id,startedAt:new Date(activity.startedAt).toISOString(),
       mode:activity.mode,status:'ACTIVE'},{source:'map-go'});
     if(current.lifecycle!=='ACTIVE')e.transition(linkedId,'ACTIVE',{source:'map-go'});
     return linkedId;
   }catch(error){return null}
 }
 function finish(activity,{rating=0,comment=''}={}){
   if(!activity||activity.active)return null;
   const e=engine();if(!e)return null;
   try{
     const current=linkedId?e.get(linkedId):e.getActive();
     if(!current)return null;
     if(current.go?.activityId!==activity.id)return null;
     e.updateDomain(current.id,'go',{activityId:activity.id,status:'COMPLETED',
       finishedAt:new Date(activity.finishedAt).toISOString(),
       distanceMeters:activity.distanceMeters,
       acceptedPoints:activity.points.length,rejectedPoints:activity.rejected,
       rating:Number.isFinite(Number(rating))?Math.max(0,Math.min(5,Number(rating))):0,
       comment:String(comment).slice(0,2000)},{source:'map-go'});
     if(current.lifecycle==='ACTIVE')e.transition(current.id,'COMPLETED',{source:'map-go'});
     return current.id;
   }catch(error){return null}
 }
 function setRating(activity,rating,comment){
   return finish(activity,{rating,comment});
 }
 return Object.freeze({attach,finish,setRating,get linkedExperienceId(){return linkedId}});
});

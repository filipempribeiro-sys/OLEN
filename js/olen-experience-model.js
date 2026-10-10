(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OLENExperienceModel=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function url(value){try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function normalize(items){return (Array.isArray(items)?items:[]).filter(e=>e&&typeof e.experienceId==='string'&&typeof e.title==='string'&&e.sourceUrl&&url(e.sourceUrl)).slice(0,4).map(e=>({...e,bookingUrl:url(e.bookingUrl),sourceUrl:url(e.sourceUrl),price:typeof e.price==='number'&&Number.isFinite(e.price)?e.price:null,duration:typeof e.duration==='number'&&Number.isFinite(e.duration)?e.duration:null,location:{name:String(e.location?.name||''),latitude:typeof e.location?.latitude==='number'&&Math.abs(e.location.latitude)<=90?e.location.latitude:null,longitude:typeof e.location?.longitude==='number'&&Math.abs(e.location.longitude)<=180?e.location.longitude:null}}));}
function facts(e){return [e.duration!==null?e.duration+' min':null,e.difficulty,e.price!==null&&e.currency?e.price+' '+e.currency:null,e.bookingRequired===true?'Reserva necessária':null].filter(Boolean).join(' · ');}
return {normalize,facts,url};
});

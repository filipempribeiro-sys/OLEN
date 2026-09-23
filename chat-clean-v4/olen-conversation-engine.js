(()=>{
"use strict";
const config={
 enabled:false,
 endpoint:"",
 model:"",
 timeoutMs:45000
};
let controller=null;

function configure(options={}){
 if(options&&typeof options==="object"){
  if(typeof options.enabled==="boolean")config.enabled=options.enabled;
  if(typeof options.endpoint==="string")config.endpoint=options.endpoint.trim();
  if(typeof options.model==="string")config.model=options.model.trim();
  if(Number.isFinite(options.timeoutMs)&&options.timeoutMs>0)config.timeoutMs=options.timeoutMs;
 }
 return status();
}
function status(){return{enabled:config.enabled,configured:Boolean(config.endpoint),model:config.model||null}}
function available(){return config.enabled&&Boolean(config.endpoint)}
function abort(){if(controller){controller.abort();controller=null}}
async function reply({messages=[],tone="balanced",signal}={}){
 if(!available())return{ok:false,disabled:true};
 abort();
 controller=new AbortController();
 const timer=setTimeout(()=>controller?.abort(),config.timeoutMs);
 const forwardAbort=()=>controller?.abort();
 signal?.addEventListener?.("abort",forwardAbort,{once:true});
 try{
  const response=await fetch(config.endpoint,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({messages,tone,model:config.model||undefined}),
   signal:controller.signal
  });
  if(!response.ok)throw new Error("Conversation Engine HTTP "+response.status);
  const data=await response.json();
  const text=typeof data?.text==="string"?data.text:typeof data?.message==="string"?data.message:"";
  if(!text)throw new Error("Conversation Engine returned no text");
  return{ok:true,text,data};
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener?.("abort",forwardAbort);
  controller=null;
 }
}
window.OLENConversationEngine=Object.freeze({configure,status,available,reply,abort});
})();

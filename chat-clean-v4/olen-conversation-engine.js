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
  if(typeof options.endpoint==="string"){const endpoint=options.endpoint.trim();if(endpoint){let parsed;try{parsed=new URL(endpoint,location.href)}catch{throw new TypeError("Invalid Conversation Engine endpoint")}const secure=parsed.protocol==="https:",sameOriginHttp=parsed.protocol==="http:"&&parsed.origin===location.origin;if(!secure&&!sameOriginHttp)throw new TypeError("Conversation Engine endpoint must use HTTPS or same-origin HTTP");config.endpoint=parsed.href}else config.endpoint=""}
  if(typeof options.model==="string")config.model=options.model.trim().slice(0,128);
  if(Number.isFinite(options.timeoutMs)&&options.timeoutMs>0)config.timeoutMs=Math.min(Math.max(Math.round(options.timeoutMs),1000),120000);
 }
 return status();
}
function status(){return{enabled:config.enabled,configured:Boolean(config.endpoint),model:config.model||null}}
function available(){return config.enabled&&Boolean(config.endpoint)}
function abort(){if(controller){controller.abort();controller=null}}
async function reply({messages=[],tone="balanced",signal}={}){
 if(!available())return{ok:false,disabled:true};
 const safeMessages=Array.isArray(messages)?messages.filter(m=>m&&typeof m==="object"&&(m.role==="user"||m.role==="assistant")).map(({role,text,title,kind})=>({role,text,title,kind})):[];
 const safeTone=["direct","balanced","explore"].includes(tone)?tone:"balanced";
 abort();
 const requestController=new AbortController();
 controller=requestController;
 const timer=setTimeout(()=>requestController.abort(),config.timeoutMs);
 const forwardAbort=()=>requestController.abort();
 signal?.addEventListener?.("abort",forwardAbort,{once:true});
 try{
  const response=await fetch(config.endpoint,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({messages:safeMessages,tone:safeTone,model:config.model||undefined}),
   signal:requestController.signal
  });
  if(!response.ok)throw new Error("Conversation Engine HTTP "+response.status);
  const data=await response.json();
  const text=(typeof data?.text==="string"?data.text:typeof data?.message==="string"?data.message:"").trim();
  if(!text)throw new Error("Conversation Engine returned no text");
  return{ok:true,text,data};
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener?.("abort",forwardAbort);
  if(controller===requestController)controller=null;
 }
}
window.OLENConversationEngine=Object.freeze({configure,status,available,reply,abort});
})();

(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="olen.chat.conversations",ACTIVE="olen.chat.active";let files=[],longId=null,generation=null,recognition=null,messageIndex=null,timer=null;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}},write=a=>{localStorage.setItem(KEY,JSON.stringify(a));drawSide()},aid=()=>localStorage.getItem(ACTIVE)||read()[0]?.id||"",safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function seed(){let a=read();if(a.length)return;const id="c-"+Date.now();a=[{id,title:"Nova conversa",pinned:false,updated:Date.now(),messages:[{role:"assistant",text:"Olá. O que queres fazer hoje?"}]}];localStorage.setItem(KEY,JSON.stringify(a));localStorage.setItem(ACTIVE,id)}
function current(){seed();return read().find(x=>x.id===aid())||read()[0]}
function navigate(view,detail={}){try{if(window.OLEN5?.router?.enter){window.OLEN5.router.enter(view,detail);return}}catch{}const b=document.querySelector('.nav[data-view="'+view+'"],.nav[data-go="'+view+'"],.desk-nav[data-view="'+view+'"]');if(b)b.click();else window.dispatchEvent(new CustomEvent("olen:navigate",{detail:{view,...detail}}))}
function status(state,text=""){const n=$("ocStatus");n.dataset.state=state;n.textContent=text;n.hidden=!text}
function setActive(id){stop();files=[];drawFiles();localStorage.setItem(ACTIVE,id);drawChat();drawSide();closeSide()}
function msgActions(i,m){const active=m.feedback||"";const icons={copy:"⧉",up:"△",down:"▽",share:"⌯",retry:"↻",more:"•••"};return '<div class="oc-msg-actions" data-index="'+i+'>'+Object.entries(icons).map(([a,v])=>'<button data-act="'+a+'" class="'+(active===a?"active":"")+'" aria-label="'+a+'">'+v+"</button>").join("")+"</div>"}
function drawChat(){
  const conversation=current(),stream=$("ocStream");
  stream.innerHTML=conversation.messages.map((message,index)=>{
    if(message.role==="user"){
      const text=message.text?'<span class="oc-message-text">'+safe(message.text)+'</span>':"";
      const attachments=(message.attachments||[]).map(file=>'<span class="oc-message-attachment">📎 '+safe(file.name)+'</span>').join("");
      return '<div class="oc-user-turn"><div class="oc-bubble">'+text+attachments+"</div></div>";
    }
    const body=message.kind==="card"
      ?'<div class="oc-card" data-card="'+index+'"><small>EXPERIÊNCIA</small><b>'+safe(message.title)+'</b><p>'+safe(message.text)+'</p><button data-card-action="details">Ver detalhes</button><button data-card-action="map">Ver no mapa</button></div>'
      :'<div class="oc-bubble">'+safe(message.text)+"</div>";
    return '<div class="oc-turn">'+body+msgActions(index,message)+"</div>";
  }).join("");
  stream.scrollTop=stream.scrollHeight;
  useful(conversation);
}
function useful(x){const n=$("ocUseful"),turns=x.messages.filter(m=>m.role==="user"||m.role==="assistant"&&!m.kind).length;n.hidden=turns<15||turns-Number(x.usefulLastTurn||0)<15}
function section(name,list,limit,all){if(!list.length)return"";return '<div class="oc-section"><div class="oc-section-title">'+name+"</div>"+list.slice(0,limit).map(x=>'<div class="oc-conv-row"><button class="oc-conv '+(x.id===aid()?"active":"")+'" data-conv="'+safe(x.id)+'">'+safe(x.title)+'</button><button class="oc-conv-more" data-conv-more="'+safe(x.id)+'">⋮</button></div>').join("")+(all&&list.length>limit?'<button id="ocRecentAll" class="oc-side-more">Ver todas</button>':"")+"</div>"}
function drawSide(){const a=read(),p=a.filter(x=>x.pinned).sort((a,b)=>b.updated-a.updated),r=a.filter(x=>!x.pinned).sort((a,b)=>b.updated-a.updated),out=$("ocSections");if(!out)return;out.innerHTML=section("Afixados",p,10,false)+section("Recentes",r,5,true);out.querySelectorAll("[data-conv]").forEach(b=>{b.onclick=()=>setActive(b.dataset.conv);b.onpointerdown=e=>{if(e.pointerType!=="mouse")timer=setTimeout(()=>openLong(b.dataset.conv),500)};["pointerup","pointercancel","pointerleave"].forEach(k=>b.addEventListener(k,()=>clearTimeout(timer)))});out.querySelectorAll("[data-conv-more]").forEach(b=>b.onclick=e=>{e.stopPropagation();openLong(b.dataset.convMore)});$("ocRecentAll")?.addEventListener("click",()=>openSearch(true))}
function applySidebarState(open){
  const sidebar=$("ocSidebar"),chat=$("ocChat"),scrim=$("ocScrim"),mobile=innerWidth<700;
  if(mobile){
    sidebar.hidden=false;
    sidebar.classList.toggle("mobile-open",open);
    sidebar.classList.remove("expanded");
    chat.classList.remove("expanded");
    sidebar.setAttribute("aria-hidden",open?"false":"true");
    scrim.hidden=!open;
    return;
  }
  sidebar.hidden=false;
  sidebar.classList.remove("mobile-open");
  sidebar.classList.toggle("expanded",open);
  chat.classList.toggle("expanded",open);
  sidebar.setAttribute("aria-hidden","false");
  scrim.hidden=true;
}
function openSide(){applySidebarState(true)}
function closeSide(){applySidebarState(false)}
function newConversation(){stop();files=[];drawFiles();const a=read(),id="c-"+Date.now();a.unshift({id,title:"Nova conversa",pinned:false,updated:Date.now(),messages:[{role:"assistant",text:"Olá. O que queres fazer hoje?"}]});write(a);setActive(id)}
function resizeInput(){const n=$("ocInput");n.style.height="auto";n.style.height=Math.min(n.scrollHeight,132)+"px";n.style.overflowY=n.scrollHeight>132?"auto":"hidden";syncAction()}
function syncAction(){const a=$("ocAction"),has=$("ocInput").value.trim()||files.length;if(a.dataset.mode==="stop"){a.querySelector("span").hidden=true;a.querySelector("img").hidden=false;a.querySelector("img").src="./assets/olen-stop-icon.png";$("ocMic").hidden=true;return}a.dataset.mode=has?"send":"voice";a.querySelector("span").hidden=!!has;a.querySelector("img").hidden=!has;if(has)a.querySelector("img").src="./assets/olen-send-msg-icon.png";$("ocMic").hidden=!!has}
function drawFiles(){const n=$("ocFiles");n.hidden=!files.length;n.innerHTML=files.map((f,i)=>'<span class="oc-file">'+safe(f.name)+' <button data-remove="'+i+'">×</button></span>').join("");syncAction()}
function addFiles(list){const seen=new Set(files.map(f=>[f.name,f.size,f.lastModified].join("|")));for(const f of Array.from(list||[])){const k=[f.name,f.size,f.lastModified].join("|");if(files.length<8&&!seen.has(k)){files.push(f);seen.add(k)}}drawFiles();if(files.length>=8)status("limit","Máximo de 8 anexos por mensagem.")}
function prefTone(){try{return JSON.parse(localStorage.getItem("olen.preferences")||"{}").tone||"balanced"}catch{return"balanced"}}
function setTone(v){let p={};try{p=JSON.parse(localStorage.getItem("olen.preferences")||"{}")}catch{}p.tone=v;localStorage.setItem("olen.preferences",JSON.stringify(p));$("ocTone").textContent=({direct:"Direto",explore:"Explorar",balanced:"Equilibrado"}[v]||"Equilibrado")+"⌄"}
function dictate(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){window.dispatchEvent(new CustomEvent("olen:dictation-unavailable"));return}recognition?.stop?.();const r=new SR();recognition=r;r.lang="pt-PT";r.interimResults=true;const base=$("ocInput").value;r.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;$("ocInput").value=(base+(base&&t?" ":"")+t).trimStart();resizeInput()};r.onend=()=>{if(recognition===r)recognition=null};r.onerror=r.onend;r.start()}
function stop(){if(!generation)return;generation.abort();generation=null;$("ocAction").dataset.mode="voice";syncAction();status("stopped","Resposta interrompida.");setTimeout(()=>status("idle",""),1400)}
async function engine(id,retryFrom=null){stop();const x=read().find(v=>v.id===id);if(!x)return;const controller=new AbortController();generation=controller;$("ocAction").dataset.mode="stop";syncAction();status("generating","A OLEN está a preparar a resposta…");const detail={conversationId:id,retryFrom,signal:controller.signal,messages:x.messages.map(m=>({role:m.role,content:m.text||"",kind:m.kind||null,attachments:m.attachments||[]})),respond(text,extra={}){if(controller.signal.aborted)return;const a=read(),y=a.find(v=>v.id===id);if(!y)return;y.messages.push({role:"assistant",text:String(text||""),...extra});y.updated=Date.now();write(a);drawChat()},fail(text){if(!controller.signal.aborted)status("error",String(text||"Não foi possível gerar a resposta."))}};window.dispatchEvent(new CustomEvent("olen:conversation-request",{detail}));try{if(typeof window.OLENConversationEngine?.request==="function")await window.OLENConversationEngine.request(detail)}catch(e){detail.fail(e?.message)}finally{if(generation===controller){generation=null;$("ocAction").dataset.mode="voice";syncAction();if($("ocStatus").dataset.state==="generating")status("idle","")}}}
function send(){
  const input=$("ocInput"),text=input.value.trim();
  if(!text&&!files.length)return;
  const conversations=read(),conversation=conversations.find(item=>item.id===aid());
  if(!conversation)return;
  const attachments=files.map(file=>({name:file.name,type:file.type||"application/octet-stream",size:file.size,lastModified:file.lastModified}));
  conversation.messages.push({role:"user",text,attachments});
  if(conversation.title==="Nova conversa")conversation.title=(text||attachments[0]?.name||"Nova conversa").slice(0,42);
  conversation.updated=Date.now();
  input.value="";
  files=[];
  drawFiles();
  write(conversations);
  drawChat();
  resizeInput();
  engine(conversation.id);
}
function openLong(id){longId=id;$("ocLong").hidden=false;$("ocLongScrim").hidden=false;const x=read().find(v=>v.id===id),b=$("ocLong").querySelector('[data-long="pin"]');b.textContent=x?.pinned?"Desafixar":"Fixar";b.disabled=!x?.pinned&&read().filter(v=>v.pinned).length>=10}
function closeLong(){$("ocLong").hidden=true;$("ocLongScrim").hidden=true;longId=null}
function results(list,empty){const n=$("ocSearchResults");n.innerHTML=list.map(x=>'<button class="oc-search-result" data-result="'+safe(x.id)+'"><b>'+safe(x.title)+'</b><small>'+safe(x.messages.at(-1)?.text||x.messages.at(-1)?.attachments?.[0]?.name||"")+"</small></button>").join("")||'<div class="oc-search-empty">'+empty+"</div>";n.querySelectorAll("[data-result]").forEach(b=>b.onclick=()=>{$("ocSearch").hidden=true;setActive(b.dataset.result)})}
function search(q){q=q.trim().toLowerCase();results(!q?[]:read().filter(x=>x.title.toLowerCase().includes(q)||x.messages.some(m=>String(m.text||"").toLowerCase().includes(q)||(m.attachments||[]).some(f=>String(f.name||"").toLowerCase().includes(q)))),"Nenhuma conversa encontrada.")}
function openSearch(all=false){closeSide();$("ocSearch").hidden=false;$("ocSearchInput").value="";if(all)results(read().sort((a,b)=>b.updated-a.updated),"Sem conversas.");else search("");$("ocSearchInput").focus()}
function shareText(title,text){if(navigator.share)navigator.share({title,text}).catch(()=>{});else navigator.clipboard?.writeText(text)}
function retry(i){const a=read(),x=a.find(v=>v.id===aid());if(!x)return;x.messages.splice(i);x.updated=Date.now();write(a);drawChat();engine(x.id,i)}
function init(){if(!$("ocChat"))return;seed();applySidebarState(false);drawChat();drawSide();resizeInput();setTone(prefTone());
$("ocMenu").onclick=openSide;$("ocRail").onclick=()=>$("ocSidebar").classList.contains("expanded")?closeSide():openSide;$("ocSideCollapse").onclick=closeSide;$("ocScrim").onclick=closeSide;$("ocNew").onclick=$("ocSideNew").onclick=newConversation;
$("ocInput").oninput=resizeInput;$("ocInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}};$("ocAction").onclick=()=>$("ocAction").dataset.mode==="send"?send():$("ocAction").dataset.mode==="stop"?stop():dictate();$("ocMic").onclick=dictate;
$("ocAttach").onclick=()=>$("ocFile").click();$("ocFile").onchange=e=>{addFiles(e.target.files);e.target.value=""};$("ocFiles").onclick=e=>{const b=e.target.closest("[data-remove]");if(b){files.splice(Number(b.dataset.remove),1);drawFiles()}};
$("ocTone").onclick=e=>{e.stopPropagation();$("ocToneMenu").hidden=!$("ocToneMenu").hidden};$("ocToneMenu").onclick=e=>{const b=e.target.closest("[data-tone]");if(b){setTone(b.dataset.tone);$("ocToneMenu").hidden=true}};
$("ocSearchBtn").onclick=()=>openSearch(false);$("ocSearchBack").onclick=()=>$("ocSearch").hidden=true;$("ocSearchInput").oninput=e=>search(e.target.value);
document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{const detail={tool:b.dataset.tool,conversationId:aid()};window.dispatchEvent(new CustomEvent("olen:chat-tool",{detail}))});
document.querySelectorAll("#ocMainNav [data-view]").forEach(b=>b.onclick=()=>navigate(b.dataset.view,{reason:"chat-mainnav"}));
$("ocLongScrim").onclick=closeLong;$("ocLong").onclick=e=>{const b=e.target.closest("[data-long]");if(!b||!longId)return;let a=read(),x=a.find(v=>v.id===longId);if(b.dataset.long==="pin")x.pinned=!x.pinned;if(b.dataset.long==="rename"){const n=prompt("Novo nome da conversa",x.title);if(n?.trim())x.title=n.trim()}if(b.dataset.long==="delete"&&confirm("Eliminar esta conversa?")){a=a.filter(v=>v.id!==longId);if(aid()===longId)localStorage.setItem(ACTIVE,a[0]?.id||"")}write(a);closeLong();seed();drawChat()};
$("ocStream").onclick=e=>{const card=e.target.closest("[data-card-action]");if(card){const host=card.closest("[data-card]"),i=Number(host.dataset.card),m=current().messages[i],action=card.dataset.cardAction;window.dispatchEvent(new CustomEvent("olen:chat-card-action",{detail:{conversationId:aid(),messageIndex:i,action,message:m}}));if(action==="map")navigate("map",{reason:"chat-card",item:m});if(action==="details")window.dispatchEvent(new CustomEvent("olen:chat-card-details",{detail:{conversationId:aid(),messageIndex:i,message:m}}));return}const b=e.target.closest("[data-act]");if(!b)return;const i=Number(b.closest("[data-index]").dataset.index),x=current(),m=x.messages[i],act=b.dataset.act;if(act==="copy")navigator.clipboard?.writeText(m.text||"");if(act==="share")shareText(x.title,m.text||"");if(act==="retry")retry(i);if(act==="up"||act==="down"){const a=read(),y=a.find(v=>v.id===x.id);y.messages[i].feedback=y.messages[i].feedback===act?"":act;y.updated=Date.now();write(a);drawChat()}if(act==="more"){messageIndex=i;$("ocMessageMore").hidden=false;const r=b.getBoundingClientRect();$("ocMessageMore").style.left=Math.max(12,Math.min(r.left,innerWidth-232))+"px";$("ocMessageMore").style.top=Math.max(12,Math.min(r.bottom+4,innerHeight-160))+"px"}};
$("ocMessageMore").onclick=e=>{const b=e.target.closest("[data-message-more]");if(!b||messageIndex===null)return;const x=current(),m=x.messages[messageIndex],act=b.dataset.messageMore;if(act==="copy")navigator.clipboard?.writeText(m.text||"");if(act==="share")shareText(x.title,m.text||"");if(act==="retry")retry(messageIndex);$("ocMessageMore").hidden=true;messageIndex=null};
$("ocUseful").onclick=e=>{const b=e.target.closest("[data-useful]");if(!b)return;const a=read(),x=a.find(v=>v.id===aid()),turns=x.messages.filter(m=>m.role==="user"||m.role==="assistant"&&!m.kind).length;x.usefulLastTurn=turns;if(b.dataset.useful!=="close")x.usefulRating=b.dataset.useful;x.updated=Date.now();write(a);useful(x)};
$("ocMoreBtn").onclick=e=>{e.stopPropagation();$("ocMore").hidden=!$("ocMore").hidden};$("ocMore").onclick=e=>{const b=e.target.closest("[data-more]");if(!b)return;$("ocMore").hidden=true;const x=current();if(b.dataset.more==="conversations")openSide();if(b.dataset.more==="home")navigate("home",{reason:"chat-more"});if(b.dataset.more==="share")shareText(x.title,x.messages.map(m=>(m.role==="user"?"Eu: ":"OLEN: ")+(m.text||"")).join("\n\n"))};
document.addEventListener("click",e=>{if(!e.target.closest("#ocTone")&&!e.target.closest("#ocToneMenu"))$("ocToneMenu").hidden=true;if(!e.target.closest("#ocMoreBtn")&&!e.target.closest("#ocMore"))$("ocMore").hidden=true;if(!e.target.closest("[data-act=more]")&&!e.target.closest("#ocMessageMore"))$("ocMessageMore").hidden=true});
window.addEventListener("resize",()=>applySidebarState(false));
window.OLENChatClean={version:"2.0.0-clean-v2",render:drawChat,newConversation,openSidebar:openSide,closeSidebar:closeSide,send,requestEngine:engine,stopGeneration:stop}}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init()})();
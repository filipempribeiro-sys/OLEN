(()=>{"use strict";
const KEY="olen.chat.conversations.v1",ACTIVE="olen.chat.active.v1",PREFS="olen.preferences";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ui={root:$(".v3-chat"),sidebar:$("#olenChatSidebar"),scrim:$("#olenChatScrim"),messages:$("#olenChatMessages"),sections:$("#olenSideSections"),input:$("#olenChatInput"),action:$("#olenChatAction"),tone:$("#olenToneMenu"),toneLabel:$("#olenToneLabel"),search:$("#olenChatSearchPop"),searchInput:$("#olenSearchInput"),searchResults:$("#olenSearchResults"),more:$("#olenChatMore"),long:$("#olenLongMenu"),longScrim:$("#olenLongScrim"),useful:$("#olenChatUseful")};
let longId=null,generating=false;
const demo=()=>({id:"demo-sintra-scroll-v1",title:"Fim de semana em Sintra",pinned:true,updated:Date.now(),messages:[
{role:"user",text:"Quero preparar um fim de semana em Sintra."},
{role:"assistant",text:"Claro. Posso organizar uma proposta equilibrada entre património, natureza e tempo livre."},
{role:"user",text:"Prefiro evitar um plano demasiado apertado."},
{role:"assistant",text:"Perfeito. Deixo margem entre experiências e concentro o essencial sem transformar o passeio numa corrida."},
{role:"assistant",card:{eyebrow:"EXPERIÊNCIA",title:"Sintra sem pressa",text:"Um plano flexível para descobrir Sintra ao teu ritmo.",actions:["Ver plano","Ver no mapa"]}}
]});
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(x)&&x.length)return x}catch{}const x=[demo()];write(x);return x}
function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
function active(){const a=localStorage.getItem(ACTIVE),x=read();return x.find(v=>v.id===a)||x[0]}
function activate(id){localStorage.setItem(ACTIVE,id);render();closeSidebar()}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon=(name)=>({copy:"⧉",up:"♡",down:"♧",share:"↗",retry:"↻",more:"⋯"}[name]||"");
function messageHTML(m){
 if(m.card)return '<div class="olen-assistant-turn"><div class="olen-demo-card"><small>'+esc(m.card.eyebrow)+'</small><b>'+esc(m.card.title)+'</b><p>'+esc(m.card.text)+'</p><div>'+m.card.actions.map(a=>'<button type="button">'+esc(a)+'</button>').join("")+'</div></div>'+actionsHTML()+'</div>';
 if(m.role==="user")return '<div class="bubble me">'+esc(m.text)+'</div>';
 return '<div class="olen-assistant-turn"><div class="bubble">'+esc(m.text)+'</div>'+actionsHTML()+'</div>'
}
function actionsHTML(){return '<div class="olen-msg-actions">'+["copy","up","down","share","retry","more"].map(a=>'<button type="button" data-msg-action="'+a+'" aria-label="'+a+'">'+icon(a)+'</button>').join("")+'</div>'}
function renderMessages(){const c=active();ui.messages.innerHTML=c.messages.map(messageHTML).join("");ui.useful.hidden=c.messages.length<15;ui.messages.scrollTop=ui.messages.scrollHeight}
function section(title,items,more){if(!items.length)return "";return '<section class="olen-side-section"><div class="olen-side-title"><span>'+title+'</span></div>'+items.map(c=>'<div class="olen-conv-row"><button class="olen-conv" data-conv="'+c.id+'">'+esc(c.title)+'</button><button class="olen-conv-more" data-conv-more="'+c.id+'" aria-label="Opções">⋮</button></div>').join("")+(more?'<button class="olen-side-more" id="olenRecentAll">Ver todas</button>':"")+'</section>'}
function renderSide(){const x=read().sort((a,b)=>(b.updated||0)-(a.updated||0)),pins=x.filter(c=>c.pinned).slice(0,10),recent=x.filter(c=>!c.pinned).slice(0,5);ui.sections.innerHTML=section("Afixados",pins,false)+section("Recentes",recent,x.filter(c=>!c.pinned).length>5);bindConversationRows()}
function render(){renderMessages();renderSide();syncTone();syncAction()}
function openSidebar(){ui.sidebar.classList.add("show");ui.sidebar.setAttribute("aria-hidden","false");ui.root.classList.add("side-expanded");ui.scrim.style.opacity="1";ui.scrim.style.visibility="visible"}
function closeSidebar(){ui.sidebar.classList.remove("show");ui.sidebar.setAttribute("aria-hidden","true");ui.root.classList.remove("side-expanded");ui.scrim.style.opacity="0";ui.scrim.style.visibility="hidden"}
function toggleSidebar(){ui.sidebar.classList.contains("show")?closeSidebar():openSidebar()}
function newChat(){const x=read(),id="chat-"+Date.now();x.unshift({id,title:"Nova conversa",pinned:false,updated:Date.now(),messages:[]});write(x);localStorage.setItem(ACTIVE,id);render();closeSidebar();ui.input.focus()}
function syncAction(){const has=ui.input.value.trim().length>0,mode=generating?"stop":has?"send":"voice";ui.action.dataset.mode=mode;ui.action.setAttribute("aria-label",mode==="send"?"Enviar mensagem":mode==="stop"?"Parar":"Iniciar voz");const img=$("img",ui.action),voice=$(".olen-voice-glyph",ui.action);if(img)img.hidden=mode!=="send";if(voice)voice.hidden=mode==="send";if(mode==="stop")ui.action.textContent="■"}
function resize(){ui.input.style.height="auto";ui.input.style.height=Math.min(ui.input.scrollHeight,112)+"px"}
function send(){const t=ui.input.value.trim();if(!t)return;const x=read(),c=x.find(v=>v.id===active().id);c.messages.push({role:"user",text:t});if(c.title==="Nova conversa")c.title=t.slice(0,42);c.updated=Date.now();write(x);ui.input.value="";resize();render();generating=true;syncAction();setTimeout(()=>{generating=false;const y=read(),d=y.find(v=>v.id===c.id);d.messages.push({role:"assistant",text:"Estou pronta para continuar esta conversa. A ligação ao modelo será feita depois da validação do Chat."});d.updated=Date.now();write(y);render()},450)}
function openSearch(){ui.search.hidden=false;ui.searchInput.value="";renderSearch();setTimeout(()=>ui.searchInput.focus(),0)}
function closeSearch(){ui.search.hidden=true}
function renderSearch(){const q=ui.searchInput.value.trim().toLowerCase(),x=read().filter(c=>!q||c.title.toLowerCase().includes(q)||c.messages.some(m=>(m.text||"").toLowerCase().includes(q)));ui.searchResults.innerHTML=x.length?x.map(c=>'<button class="olen-search-result" data-search-id="'+c.id+'"><b>'+esc(c.title)+'</b></button>').join(""):'<div class="olen-search-hint">Sem resultados.</div>'}
function openLong(id){longId=id;ui.long.hidden=false;ui.longScrim.hidden=false;ui.longScrim.style.opacity="1";ui.longScrim.style.visibility="visible"}
function closeLong(){longId=null;ui.long.hidden=true;ui.longScrim.hidden=true}
function prefs(){try{return JSON.parse(localStorage.getItem(PREFS)||"{}")}catch{return {}}}
function syncTone(){const p=prefs(),v=p.chatTone||"balanced";ui.toneLabel.textContent={direct:"Direto",balanced:"Equilibrado",explore:"Explorar"}[v]||"Equilibrado"}
function bindConversationRows(){$("[data-conv]").forEach(b=>{let timer=null,longOpened=false,startX=0,startY=0;const cancel=()=>{if(timer){clearTimeout(timer);timer=null}};const begin=e=>{if(e.pointerType==="mouse")return;cancel();longOpened=false;startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{timer=null;longOpened=true;openLong(b.dataset.conv)},500)};const move=e=>{if(Math.abs(e.clientX-startX)>12||Math.abs(e.clientY-startY)>12)cancel()};b.addEventListener("pointerdown",begin);b.addEventListener("pointermove",move);b.addEventListener("pointerup",cancel);b.addEventListener("pointercancel",cancel);b.addEventListener("contextmenu",e=>{if(e.pointerType!=="mouse"||matchMedia("(pointer:coarse)").matches){e.preventDefault();cancel();longOpened=true;openLong(b.dataset.conv)}});b.addEventListener("click",e=>{if(longOpened){e.preventDefault();e.stopPropagation();longOpened=false;return}activate(b.dataset.conv)})});$("[data-conv-more]").forEach(b=>b.onclick=e=>{e.stopPropagation();openLong(b.dataset.convMore)})}
$("#olenChatMenuBtn").onclick=toggleSidebar;$("#olenRailToggle").onclick=toggleSidebar;$("#olenSideCollapse").onclick=closeSidebar;ui.scrim.onclick=closeSidebar;
$("#olenNewChatBtn").onclick=newChat;$("#olenSideNew").onclick=newChat;
$("#olenChatSearchBtn").onclick=openSearch;$("#olenSearchBack").onclick=closeSearch;ui.searchInput.oninput=renderSearch;ui.searchResults.onclick=e=>{const b=e.target.closest("[data-search-id]");if(b){closeSearch();activate(b.dataset.searchId)}};
ui.input.addEventListener("input",()=>{resize();syncAction()});ui.input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
ui.action.onclick=()=>{const m=ui.action.dataset.mode;if(m==="send")send();else if(m==="stop"){generating=false;syncAction()}else alert("Modo de voz preparado para integração.")};
$("#olenChatMic").onclick=()=>alert("Ditado preparado para integração.");$("#olenChatAttach").onclick=()=>alert("Anexos preparados para integração.");
$("#olenToneTrigger").onclick=e=>{e.stopPropagation();ui.tone.hidden=!ui.tone.hidden};ui.tone.onclick=e=>{const b=e.target.closest("[data-tone]");if(!b)return;const p=prefs();p.chatTone=b.dataset.tone;localStorage.setItem(PREFS,JSON.stringify(p));ui.tone.hidden=true;syncTone()};
$("#olenChatMoreBtn").onclick=e=>{e.stopPropagation();ui.more.hidden=!ui.more.hidden};
ui.more.onclick=e=>{const b=e.target.closest("[data-chat-more]");if(!b)return;ui.more.hidden=true;if(b.dataset.chatMore==="conversations")openSidebar();if(b.dataset.chatMore==="home")alert("No comparador isolado, a navegação para Início não altera a app real.");if(b.dataset.chatMore==="share")navigator.clipboard?.writeText(location.href)};
ui.longScrim.onclick=closeLong;ui.long.onclick=e=>{const b=e.target.closest("[data-long]");if(!b||!longId)return;const x=read(),c=x.find(v=>v.id===longId);if(!c)return;if(b.dataset.long==="pin")c.pinned=!c.pinned;if(b.dataset.long==="rename"){const n=prompt("Novo nome",c.title);if(n?.trim())c.title=n.trim()}if(b.dataset.long==="delete"){const i=x.findIndex(v=>v.id===longId);x.splice(i,1);if(!x.length)x.push(demo());localStorage.setItem(ACTIVE,x[0].id)}write(x);closeLong();render()};
ui.messages.onclick=e=>{const b=e.target.closest("[data-msg-action]");if(!b)return;const a=b.dataset.msgAction;if(a==="copy"){const turn=b.closest(".olen-assistant-turn"),txt=turn?.querySelector(".bubble")?.textContent||"";navigator.clipboard?.writeText(txt)}if(a==="up"||a==="down")b.classList.toggle("active");if(a==="share")navigator.clipboard?.writeText(location.href);if(a==="retry")alert("Regenerar preparado para ligação ao modelo.");if(a==="more")alert("Mais ações da mensagem.")};
ui.useful.onclick=e=>{const b=e.target.closest("[data-useful]");if(!b)return;if(b.dataset.useful==="close")ui.useful.hidden=true;else b.classList.toggle("active")};
$$(".olen-side-mainnav [data-view]").forEach(b=>b.onclick=()=>{if(b.dataset.view==="chat")closeSidebar();else alert("Comparador isolado: "+b.textContent.trim())});
document.addEventListener("click",e=>{if(!e.target.closest("#olenChatMoreBtn")&&!e.target.closest("#olenChatMore"))ui.more.hidden=true;if(!e.target.closest("#olenToneTrigger")&&!e.target.closest("#olenToneMenu"))ui.tone.hidden=true});
if(!localStorage.getItem(ACTIVE))localStorage.setItem(ACTIVE,read()[0].id);render();
window.OLENChatV3={openSidebar,closeSidebar,newConversation:newChat,render};
})();
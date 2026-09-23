/* OLEN Chatbox isolated runtime — 2026-09-23. No other Chat/UI ownership. */
(function(){'use strict';
let mounted=false,callbacks={},els={};
const $=id=>document.getElementById(id);
function toneName(v){return v==='direct'?'Direto':v==='explore'?'Explorar':'Equilibrado'}
function readTone(){try{return JSON.parse(localStorage.getItem('olen.preferences')||'{}').tone||'balanced'}catch(_){return'balanced'}}
function writeTone(v){let p={};try{p=JSON.parse(localStorage.getItem('olen.preferences')||'{}')}catch(_){}p.tone=v;localStorage.setItem('olen.preferences',JSON.stringify(p))}
function syncTone(){if(els.toneLabel)els.toneLabel.textContent=toneName(readTone())}
function resize(){if(!els.input)return;els.input.style.height='auto';els.input.style.height=Math.min(els.input.scrollHeight,132)+'px';els.input.style.overflowY=els.input.scrollHeight>132?'auto':'hidden';syncAction()}
function syncAction(){if(!els.action||!els.mic)return;const img=els.action.querySelector('img');if(els.action.dataset.mode==='stop'){els.mic.hidden=true;if(img){img.hidden=false;img.src='./assets/olen-stop-icon.png'}els.action.setAttribute('aria-label','Parar resposta');return}if(els.input?.value.trim()){els.mic.hidden=true;els.action.dataset.mode='send';if(img){img.hidden=false;img.src='./assets/olen-send-msg-icon.png'}els.action.setAttribute('aria-label','Enviar mensagem')}else{els.mic.hidden=false;els.action.dataset.mode='voice';if(img)img.hidden=true;els.action.setAttribute('aria-label','Iniciar voz')}}
function submit(){const value=els.input?.value.trim()||'';if(!value)return false;const ok=callbacks.onSend?callbacks.onSend(value)!==false:true;if(ok){els.input.value='';resize()}return ok}
function setGenerating(on){if(!els.action)return;const img=els.action.querySelector('img');if(on){els.action.dataset.mode='stop';if(img){img.hidden=false;img.src='./assets/olen-stop-icon.png'}if(els.mic)els.mic.hidden=true;els.action.setAttribute('aria-label','Parar resposta')}else{els.action.dataset.mode='voice';if(img)img.hidden=true;syncAction()}}
function setText(value){if(!els.input)return false;els.input.value=String(value??'');resize();els.input.focus();return true}
function mount(next={}){callbacks={...next};if(mounted)return true;els={root:document.querySelector('[data-olen-chatbox="2026-clean"]'),input:$('olenCbxInput'),attach:$('olenCbxAttach'),tone:$('olenCbxTone'),toneLabel:$('olenCbxToneLabel'),toneMenu:$('olenCbxToneMenu'),mic:$('olenCbxMic'),action:$('olenCbxAction')};if(!els.root||!els.input||!els.action||!els.mic)return false;
els.input.addEventListener('input',resize);els.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}});
els.action.addEventListener('click',()=>{if(els.action.dataset.mode==='stop'){callbacks.onStop?.();setGenerating(false)}else if(els.action.dataset.mode==='send')submit();else callbacks.onVoice?.()});
els.mic.addEventListener('click',()=>callbacks.onMic?.());els.attach?.addEventListener('click',()=>callbacks.onAttach?.());
els.tone?.addEventListener('click',e=>{e.stopPropagation();els.toneMenu.hidden=!els.toneMenu.hidden});
els.toneMenu?.addEventListener('click',e=>{const b=e.target.closest('[data-tone]');if(!b)return;writeTone(b.dataset.tone);syncTone();els.toneMenu.hidden=true});
document.addEventListener('click',e=>{if(els.toneMenu&&!els.toneMenu.hidden&&!e.target.closest('#olenCbxToneMenu')&&!e.target.closest('#olenCbxTone'))els.toneMenu.hidden=true});
mounted=true;syncTone();resize();return true}
window.OLENChatbox={mount,setGenerating,setText,resize,syncAction,submit};
})();
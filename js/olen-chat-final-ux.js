/* OLEN Chat final UX — fade and jump only. Existing message/composer owners are untouched. */
(function(){'use strict';
 function init(){
  const screen=document.querySelector('.screen[data-screen="chat"]');
  const messages=document.getElementById('olenChatMessages');
  const composer=screen?.querySelector('[data-olen-chatbox="2026-clean"]');
  if(!screen||!messages||!composer||screen.querySelector('.olen-chat-jump-end'))return;
  const fade=document.createElement('div');
  fade.className='olen-chat-final-fade';fade.setAttribute('aria-hidden','true');fade.hidden=true;
  const jump=document.createElement('button');
  jump.type='button';jump.className='olen-chat-jump-end';jump.hidden=true;
  jump.setAttribute('aria-label','Ir para o fim da conversa');
  jump.setAttribute('title','Ir para o fim da conversa');
  jump.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 10 7 7 7-7M12 4v13"/></svg>';
  screen.append(fade,jump);
  function update(){
   if(!screen.classList.contains('active')||!composer.getClientRects().length){
    fade.hidden=true;jump.hidden=true;return;
   }
   const box=composer.getBoundingClientRect(),thread=messages.getBoundingClientRect();
   if(box.width<10||thread.width<10){fade.hidden=true;jump.hidden=true;return}
   const left=Math.max(0,Math.min(box.left,thread.left));
   const right=Math.min(window.innerWidth,Math.max(box.right,thread.right));
   fade.style.left=left+'px';fade.style.width=Math.max(0,right-left)+'px';
   fade.style.top=Math.max(0,box.top-74)+'px';
   fade.style.height=Math.max(90,box.height+86)+'px';
   fade.hidden=false;
   jump.style.left=Math.max(8,Math.min(window.innerWidth-46,box.right-46))+'px';
   jump.style.top=Math.max(8,box.top-52)+'px';
   jump.hidden=messages.scrollHeight-messages.clientHeight-messages.scrollTop<=76;
  }
  jump.addEventListener('click',()=>{
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   messages.scrollTo({top:messages.scrollHeight,behavior:reduce?'auto':'smooth'});
  });
  messages.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update,{passive:true});
  window.visualViewport?.addEventListener('resize',update,{passive:true});
  if(window.ResizeObserver){
   const observer=new ResizeObserver(update);observer.observe(composer);observer.observe(messages);
  }
  new MutationObserver(update).observe(messages,{childList:true});
  new MutationObserver(update).observe(screen,{attributes:true,attributeFilter:['class']});
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();

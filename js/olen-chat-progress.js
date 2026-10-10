/* OLEN Chat progress — migrated from the ALPHA progress lifecycle; OLEN owns presentation.
   This module owns ONLY the transient "A OLEN está a trabalhar" card.
   Pending requests are scoped by conversation and are never written to localStorage. */
(function () {
  'use strict';
  const pending=new Map();
  function esc(value) {
    return String(value??'').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function stepsFor(){return ['A preparar o pedido'];}
  function formatTime(ms) {
    const total=Math.max(0,Math.floor(Number(ms||0)/1000));
    return String(Math.floor(total/60)).padStart(2,'0')+':'+
      String(total%60).padStart(2,'0');
  }
  function stepRows(record) {
    const idx=Math.max(0,Math.min(record.index,record.steps.length-1));
    return record.steps.map((label,i)=>{
      const state=i<idx?'done':i===idx?'active':'waiting';
      const mark=i<idx?'✓':i===idx?'●':'○';
      return '<div class="olen-chat-progress-step '+state+'"'+
        (i===idx?' aria-current="step"':'')+'>'+
        '<span class="olen-chat-progress-mark" aria-hidden="true">'+mark+'</span>'+
        '<span>'+esc(label)+(i===idx?
          '<span class="olen-chat-progress-dots" aria-hidden="true"><i></i><i></i><i></i></span>':'')+
        '</span></div>';
    }).join('');
  }
  function markup(id) {
    const record=pending.get(String(id||''));
    if(!record)return '';
    return '<section class="olen-chat-progress" data-olen-chat-progress-id="'+esc(id)+'" aria-label="Progresso da resposta OLEN">'+
      '<div class="olen-chat-progress-head"><span class="olen-chat-progress-pulse" aria-hidden="true"></span>'+
      '<strong>A OLEN está a trabalhar</strong>'+
      '<span class="olen-chat-progress-time" data-olen-progress-time aria-label="Tempo decorrido">'+
      '⏱ '+formatTime(Date.now()-record.startedAt)+'</span></div>'+
      '<div class="olen-chat-progress-steps" data-olen-progress-steps aria-live="polite">'+stepRows(record)+'</div>'+
      '<p class="olen-chat-progress-note">Progresso operacional da experiência — não mostra raciocínio interno.</p>'+
      '</section>';
  }
  function refresh(id,changeSteps=false) {
    const record=pending.get(String(id||''));
    if(!record)return;
    // The DOM can belong to a different conversation. Never update its progress card.
    const element=document.querySelector('[data-olen-chat-progress-id]');
    if(!element||element.dataset.olenChatProgressId!==record.id)return;
    const timer=element.querySelector('[data-olen-progress-time]');
    if(timer)timer.textContent='⏱ '+formatTime(Date.now()-record.startedAt);
    if(changeSteps){
      const node=element.querySelector('[data-olen-progress-steps]');
      if(node)node.innerHTML=stepRows(record);
      const scroll=element.closest('#olenChatMessages');
      if(scroll&&scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<120)
        scroll.scrollTop=scroll.scrollHeight;
    }
  }
  function stop(id) {
    const key=String(id||''),record=pending.get(key);
    if(!record)return null;
    clearInterval(record.timer);
    pending.delete(key);
    const element=document.querySelector('[data-olen-chat-progress-id]');
    if(element?.dataset.olenChatProgressId===key)element.remove();
    return Math.max(0,Date.now()-record.startedAt);
  }
  function start(id,text,attachments=[]) {
    const key=String(id||'');
    if(!key)throw new TypeError('Conversation id required');
    stop(key);
    const now=Date.now();
    const record={id:key,steps:stepsFor(text,attachments),index:0,startedAt:now,lastAdvanceAt:now,timer:null};
    pending.set(key,record);
    record.timer=setInterval(()=>{
      if(pending.get(key)!==record){clearInterval(record.timer);return}
      refresh(key,false);
    },1000);
    return record;
  }
  function set(id,label) {
    const record=pending.get(String(id||''));
    if(!record||!label)return false;
    const current=record.steps.indexOf(label);
    if(current>=0)record.index=current;
    else{
      const at=Math.min(record.index+1,record.steps.length);
      record.steps.splice(at,0,label);record.index=at;
    }
    record.lastAdvanceAt=Date.now();
    refresh(id,true);
    return true;
  }
  window.OLENChatProgress=Object.freeze({
    start,set,stop,markup,formatTime,stepsFor,
    isPending:id=>pending.has(String(id||'')),
    get count(){return pending.size}
  });
})();

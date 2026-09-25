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
  // ALPHA's context-sensitive sequence, copied as behaviour rather than hard-coded fake API events.
  function stepsFor(text,attachments=[]) {
    const t=String(text||'').toLocaleLowerCase('pt-PT');
    const steps=['A preparar o pedido'];
    const hasPlaces=/\b(visitar|local|museu|aqu[aá]rio|restaurante|miradouro|parque|praia|monumento|passeio|onde|perto|estacionamento)\b/.test(t);
    const hasWeather=/\b(hoje|amanh[aã]|tempo|meteorolog|chuva|vento|calor|frio|tarde|manh[aã])\b/.test(t);
    const hasRoute=/\b(rota|percurso|caminho|ir para|como chegar|carro|conduzir|viagem|trail|trilho|caminhada|dia)\b/.test(t);
    const hasStay=/\b(hotel|alojamento|dormir|estadia|airbnb)\b/.test(t);
    const hasMusic=/\b(spotify|playlist|música|musica)\b/.test(t);
    const hasShare=/\b(whatsapp|partilha|partilhar|envia|enviar)\b/.test(t);
    const hasCalendar=/\b(calend[aá]rio|agenda|agendar|marca|marcar)\b/.test(t);
    if(attachments.length)steps.push('A processar os anexos');
    if(hasPlaces||hasWeather||hasRoute||hasStay)steps.push('A consultar dados relevantes');
    if(hasRoute)steps.push('A montar a experiência');
    if(hasMusic)steps.push('A preparar a componente Spotify');
    if(hasShare)steps.push('A preparar a partilha');
    if(hasCalendar)steps.push('A preparar o calendário');
    steps.push('A compor a resposta');
    steps.push('A finalizar');
    return [...new Set(steps)].slice(0,7);
  }
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
      const now=Date.now(),max=Math.max(0,record.steps.length-2);
      if(record.index<max&&now-record.lastAdvanceAt>=3000){
        record.index++;record.lastAdvanceAt=now;refresh(key,true);
      }else refresh(key,false);
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

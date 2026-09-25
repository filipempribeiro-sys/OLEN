/* OLEN Chat → Cloudflare. Isolated transport: public Site Key only; never ship API secrets. */
(function () {
  'use strict';
  const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
  const SITE_KEY='0x4AAAAAAFDJzZctEJACttl0';
  const ACTION='olen_chat';
  let loader=null,widget=null,accept=null,reject=null,tokenTimeout=null,controller=null,busy=false;
  function clearChallenge(){
    if(tokenTimeout){clearTimeout(tokenTimeout);tokenTimeout=null}
    accept=null;reject=null;
  }
  function settleChallenge(error,token){
    const yes=accept,no=reject;
    clearChallenge();
    if(error){if(no)no(error)}else if(yes)yes(token);
  }
  function loadTurnstile(){
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(loader)return loader;
    loader=new Promise((resolve,rejectLoad)=>{
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;
      script.onload=()=>window.turnstile?resolve(window.turnstile):rejectLoad(new Error('Turnstile indisponível.'));
      script.onerror=()=>rejectLoad(new Error('Não foi possível carregar a verificação de segurança.'));
      document.head.appendChild(script);
    }).catch(e=>{loader=null;throw e});
    return loader;
  }
  async function token(){
    const turnstile=await loadTurnstile();
    if(widget===null){
      const target=document.createElement('div');
      target.id='olen-chat-turnstile';
      target.setAttribute('aria-label','Verificação de segurança do Chat OLEN');
      Object.assign(target.style,{position:'fixed',right:'12px',bottom:'90px',zIndex:'2147483600'});
      document.body.appendChild(target);
      widget=turnstile.render(target,{
        sitekey:SITE_KEY,action:ACTION,execution:'execute',appearance:'interaction-only',
        'response-field':false,theme:'auto',
        callback:value=>settleChallenge(null,value),
        'error-callback':()=>settleChallenge(new Error('Não foi possível validar a segurança. Tenta novamente.')),
        'expired-callback':()=>settleChallenge(new Error('A verificação expirou. Tenta novamente.')),
        'timeout-callback':()=>settleChallenge(new Error('A verificação demorou demasiado tempo. Tenta novamente.'))
      });
      if(widget===undefined||widget===null)throw new Error('Não foi possível iniciar a verificação de segurança.');
    }
    turnstile.reset(widget);
    return new Promise((resolve,rejectToken)=>{
      accept=resolve;reject=rejectToken;
      tokenTimeout=setTimeout(()=>settleChallenge(new Error('A verificação demorou demasiado tempo. Tenta novamente.')),120000);
      try{turnstile.execute(widget)}catch(e){settleChallenge(e)}
    });
  }
  function history(previous){
    return (Array.isArray(previous)?previous:[]).filter(m=>
      (m.role==='assistant'||m.role==='user')&&!m.kind&&typeof m.text==='string'&&m.text.trim()
    ).slice(-16).map(m=>({role:m.role,content:m.text.slice(0,9000)}));
  }
  function context(previous){
    const recent=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&m.conversationState);
    const latest=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&Array.isArray(m.placeCards)&&m.placeCards.length);
    return {conversationMemory:{
      ...(recent?.conversationState?{conversationState:recent.conversationState}:{}),
      ...(latest?{latestPlaceCards:latest.placeCards,places:latest.placeCards.map(p=>p.name).filter(Boolean)}:{})
    }};
  }
  function cards(items){
    return (Array.isArray(items)?items:[]).filter(p=>p&&typeof p.name==='string').slice(0,12).map(p=>{
      const photo=String(p.photo||'');
      return {...p,photo:photo.startsWith('/api/place-photo?')
        ?API+photo:photo};
    });
  }
  function send(request={}){
    if(busy)return false;
    busy=true;
    const task=(async()=>{
      let turnstileToken='';
      try{
        turnstileToken=await token();
        controller=new AbortController();
        const attachments=(Array.isArray(request.images)?request.images:[]).slice(0,3).map(i=>({
          name:String(i.name||'Imagem'),type:String(i.type||'image/png'),dataUrl:String(i.data||'')
        }));
        const response=await fetch(API+'/api/chat',{
          method:'POST',mode:'cors',credentials:'omit',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            currentMessage:String(request.text||''),messages:history(request.previous),
            context:context(request.previous),attachments,turnstileToken
          }),
          signal:controller.signal
        });
        const data=await response.json().catch(()=>null);
        if(!response.ok||!data?.ok)
          throw new Error(String(data?.error||'Não foi possível obter resposta da OLEN.').slice(0,300));
        request.onResponse?.({...data,placeCards:cards(data.placeCards)});
      }catch(e){
        const cancelled=e?.name==='AbortError'||e?.message==='OLEN_STOPPED';
        request.onFailure?.({cancelled,message:cancelled?'Pedido interrompido.':String(e?.message||'Não foi possível comunicar com a OLEN.').slice(0,300)});
      }finally{
        controller=null;
        if(reject)settleChallenge(new Error('OLEN_STOPPED'));
        try{if(widget!==null)window.turnstile?.reset(widget)}catch(_){}
        busy=false;
        request.onComplete?.();
      }
    })();
    task.catch(()=>{busy=false;controller=null;request.onComplete?.()});
    return true;
  }
  function stop(){
    if(reject)settleChallenge(new Error('OLEN_STOPPED'));
    controller?.abort();
  }
  window.OLENCloudflareChat=Object.freeze({
    send,stop,get busy(){return busy},
    get endpoint(){return API}
  });
})();

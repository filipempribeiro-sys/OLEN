/* OLEN Chat → Cloudflare. Isolated transport: public Site Key only; never ship API secrets. */
(function () {
  'use strict';
  const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
  const SITE_KEY='0x4AAAAAAFDJzZctEJACttl0';
  const ACTION='olen_chat';
  let loader=null,widget=null,accept=null,reject=null,tokenTimeout=null,controller=null,busy=false;
  let backendReadyAt=0;
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
  // Browser geolocation is requested only after the user explicitly asks to use
  // their own position. Never store GPS in conversation history or localStorage.
  function needsOwnLocation(message){
    const t=String(message||'').toLocaleLowerCase('pt-PT');
    return /\bminha\s+(?:localiza[cç][aã]o|posi[cç][aã]o)\b|\bonde\s+(?:eu\s+)?estou\b|\bperto\s+de\s+mim\b|\bao\s+meu\s+redor\b|\ba\s+partir\s+(?:da\s+)?minha\s+localiza[cç][aã]o\b/.test(t);
  }
  function locationForRequest(text,signal,onStage){
    if(!needsOwnLocation(text))return Promise.resolve(null);
    onStage?.('A obter localização GPS');
    if(!navigator.geolocation||!window.isSecureContext)
      return Promise.reject(Object.assign(new Error('A localização GPS requer HTTPS e um navegador com localização. Indica a tua localidade no Chat.'),{code:'GPS_UNAVAILABLE'}));
    return new Promise((resolve,rejectLocation)=>{
      let settled=false;
      const onAbort=()=>finish(Object.assign(new Error('OLEN_STOPPED'),{name:'AbortError'}));
      function finish(error,value){
        if(settled)return;settled=true;
        signal?.removeEventListener?.('abort',onAbort);
        if(error)rejectLocation(error);
        else resolve(value);
      }
      if(signal?.aborted)return onAbort();
      signal?.addEventListener?.('abort',onAbort,{once:true});
      try{
        navigator.geolocation.getCurrentPosition(
          position=>{
            if(signal?.aborted)return onAbort();
            const c=position?.coords,latitude=Number(c?.latitude),longitude=Number(c?.longitude);
            if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)
              return finish(Object.assign(new Error('O GPS não devolveu uma posição válida. Indica a tua localidade.'),{code:'GPS_UNAVAILABLE'}));
            onStage?.('Localização GPS confirmada');
            finish(null,{latitude,longitude,accuracyMeters:Number.isFinite(Number(c.accuracy))?Math.round(Number(c.accuracy)):null,source:'browser-geolocation',obtainedAt:new Date().toISOString()});
          },
          error=>finish(Object.assign(new Error(error?.code===1?
            'A localização foi recusada. Autoriza o GPS nas permissões do navegador ou indica a tua localidade.':
            'Não foi possível obter a tua localização GPS. Verifica a localização do dispositivo ou indica uma localidade.'),{code:error?.code===1?'GPS_PERMISSION_DENIED':'GPS_UNAVAILABLE'})),
          {enableHighAccuracy:true,maximumAge:30000,timeout:14000}
        );
      }catch(error){finish(Object.assign(new Error('Não foi possível ativar o GPS. Verifica as permissões do navegador.'),{code:'GPS_UNAVAILABLE'}))}
    });
  }
  function history(previous){
    return (Array.isArray(previous)?previous:[]).filter(m=>
      (m.role==='assistant'||m.role==='user')&&!m.kind&&typeof m.text==='string'&&m.text.trim()
    ).slice(-16).map(m=>({role:m.role,content:m.text.slice(0,9000)}));
  }
  function context(previous,deviceLocation){
    const recent=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&m.conversationState);
    const latest=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&Array.isArray(m.placeCards)&&m.placeCards.length);
    return {...(deviceLocation?{userLocation:deviceLocation}:{}),conversationMemory:{
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
  // ALPHA-style health check: run on cold starts, cache readiness for 90 seconds.
  async function verifyBackend(signal){
    if(Date.now()-backendReadyAt<90000)return;
    const response=await fetch(API+'/api/health',{
      method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal
    });
    if(!response.ok)throw Object.assign(new Error('Não consegui estabelecer ligação ao serviço OLEN.'),{code:'BACKEND_HEALTH',status:response.status});
    const result=await response.json();
    if(!result?.ok||!result?.ready)
      throw Object.assign(new Error('O serviço OLEN ainda não está pronto.'),{code:'BACKEND_NOT_READY',status:503});
    backendReadyAt=Date.now();
  }
  function send(request={}){
    if(busy)return false;
    busy=true;
    const task=(async()=>{
      let turnstileToken='',limitTimer=null,timedOut=false;
      try{
        controller=new AbortController();
        // Start GPS lookup from the send gesture; never infer a location from IP.
        const deviceLocation=await locationForRequest(request.text,controller.signal,request.onStage);
        if(Date.now()-backendReadyAt>=90000){
          request.onStage?.('A verificar ligação ao serviço');
          await verifyBackend(controller.signal);
        }
        if(controller.signal.aborted)throw Object.assign(new Error('OLEN_STOPPED'),{name:'AbortError'});
        turnstileToken=await token();
        if(controller.signal.aborted)throw Object.assign(new Error('OLEN_STOPPED'),{name:'AbortError'});
        const attachments=(Array.isArray(request.images)?request.images:[]).slice(0,3).map(i=>({
          name:String(i.name||'Imagem'),type:String(i.type||'image/png'),dataUrl:String(i.data||'')
        }));
        // One AI request; do not retry automatically after a network failure.
        limitTimer=setTimeout(()=>{timedOut=true;controller?.abort()},360000);
        const response=await fetch(API+'/api/chat',{
          method:'POST',mode:'cors',credentials:'omit',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            currentMessage:String(request.text||''),messages:history(request.previous),
            context:context(request.previous,deviceLocation),attachments,turnstileToken
          }),
          signal:controller.signal
        });
        const data=await response.json().catch(()=>null);
        if(!response.ok||!data?.ok)
          throw Object.assign(new Error(String(data?.error||'Não foi possível obter resposta da OLEN.').slice(0,300)),{
            code:String(data?.code||'HTTP_'+response.status),status:response.status
          });
        request.onResponse?.({...data,placeCards:cards(data.placeCards)});
      }catch(e){
        const cancelled=!timedOut&&(e?.name==='AbortError'||e?.message==='OLEN_STOPPED');
        request.onFailure?.({
          cancelled,timedOut,
          code:timedOut?'CHAT_TIMEOUT':String(e?.code||''),
          status:Number(e?.status||0),
          message:cancelled?'Pedido interrompido.':timedOut?'A investigação ultrapassou o tempo limite.':
            String(e?.message||'Não foi possível comunicar com a OLEN.').slice(0,300)
        });
      }finally{
        if(limitTimer)clearTimeout(limitTimer);
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
    send,stop,getTurnstileToken:token,get busy(){return busy},
    get endpoint(){return API}
  });
})();

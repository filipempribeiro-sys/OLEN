/* OLEN Chat → Cloudflare. Isolated transport: public Site Key only; never ship API secrets. */
(function () {
  'use strict';
  const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
  const SITE_KEY='0x4AAAAAAFDJzZctEJACttl0';
  const ACTION='olen_chat';
  let loader=null,widget=null,accept=null,reject=null,tokenTimeout=null,controller=null,busy=false;
  let backendReadyAt=0,cachedToken=null,warming=null;
  function clearChallenge(){
    if(tokenTimeout){clearTimeout(tokenTimeout);tokenTimeout=null}
    accept=null;reject=null;
  }
  function settleChallenge(error,token){
    const yes=accept,no=reject;
    clearChallenge();
    const target=document.getElementById('olen-chat-turnstile');
    if(target){target.hidden=true;target.style.display='none'}
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
  async function issueToken(){
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
    const target=document.getElementById('olen-chat-turnstile');
    if(target){target.hidden=false;target.style.display=''}
    turnstile.reset(widget);
    return new Promise((resolve,rejectToken)=>{
      accept=resolve;reject=rejectToken;
      tokenTimeout=setTimeout(()=>settleChallenge(new Error('A verificação demorou demasiado tempo. Tenta novamente.')),120000);
      try{turnstile.execute(widget)}catch(e){settleChallenge(e)}
    });
  }
  async function token(){
    if(cachedToken&&cachedToken.until>Date.now()){const value=cachedToken.value;cachedToken=null;return value;}
    if(warming){const value=await warming;cachedToken=null;if(value)return value;}
    return issueToken();
  }
  function warmToken(){
    if(busy||warming||cachedToken?.until>Date.now())return;
    warming=issueToken().then(value=>{cachedToken={value,until:Date.now()+240000};return value;}).catch(()=>null).finally(()=>{warming=null;});
  }
  document.addEventListener?.('focusin',event=>{if(event.target?.id==='olenCbxInput')warmToken();});
  document.addEventListener?.('click',event=>{if(event.target.closest('.nav[data-view="chat"],.desk-nav[data-view="chat"]'))warmToken();});
  function locationForRequest(text,signal,onStage){if(window.OLENDeviceLocation?.intent(text))onStage?.('A obter a localização');return window.OLENLocationBridge?.get(text,signal)||Promise.resolve(null);}
  function history(previous){
    return (Array.isArray(previous)?previous:[]).filter(m=>
      (m.role==='assistant'||m.role==='user')&&!m.kind&&typeof m.text==='string'&&m.text.trim()
    ).slice(-16).map(m=>({role:m.role,content:m.text.slice(0,9000)}));
  }
  function partnerContext(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const catalog=Array.isArray(value.catalog)?value.catalog.slice(0,60).map(item=>({
      id:String(item?.id||'').slice(0,120),
      name:String(item?.name||'').slice(0,220),
      category:String(item?.category||'').slice(0,120),
      price:Number.isFinite(Number(item?.price))?Number(item.price):null,
      currency:String(item?.currency||'EUR').slice(0,8),
      inStock:typeof item?.inStock==='boolean'?item.inStock:null,
      stock:Number.isFinite(Number(item?.stock))?Number(item.stock):null,
      certifications:Array.isArray(item?.certifications)?item.certifications.map(String).slice(0,12):[],
      allergens:Array.isArray(item?.allergens)?item.allergens.map(String).slice(0,16):[],
      tags:Array.isArray(item?.tags)?item.tags.map(String).slice(0,20):[],
      url:String(item?.url||'').slice(0,500)
    })).filter(item=>item.name):[];
    return {
      id:String(value.id||value.partnerId||'').slice(0,120),
      name:String(value.name||value.partnerName||'').slice(0,220),
      type:String(value.type||'').slice(0,120),
      location:value.location&&typeof value.location==='object'?{
        name:String(value.location.name||'').slice(0,220),
        latitude:Number.isFinite(Number(value.location.latitude))?Number(value.location.latitude):null,
        longitude:Number.isFinite(Number(value.location.longitude))?Number(value.location.longitude):null
      }:null,
      services:Array.isArray(value.services)?value.services.map(String).slice(0,30):[],
      catalogVersion:String(value.catalogVersion||'').slice(0,120),
      catalog
    };
  }
  function context(previous,deviceLocation,partner){
    const recent=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&m.conversationState);
    const latest=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&Array.isArray(m.placeCards)&&m.placeCards.length);
    const partnerData=partnerContext(partner);
    const lens=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.lensResult);
    const experiences=[...(Array.isArray(previous)?previous:[])].reverse().find(m=>m.role==='assistant'&&m.experiences?.length);
    return {...(deviceLocation?{deviceLocation}:{}),...(partnerData?{partnerContext:partnerData}:{}),conversationMemory:{
      ...(lens?{latestLensResult:lens.lensResult}:{}),
      ...(recent?.conversationState?{conversationState:recent.conversationState}:{}),
      ...(experiences?{latestExperiences:window.OLENExperienceModel.normalize(experiences.experiences)}:{}),
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
        const basic=window.OLENBasicChat?.reply(request.text,request.images);
        if(basic){await Promise.resolve();request.onResponse?.({ok:true,answer:basic,placeCards:[],experiences:[],conversationState:context(request.previous,null,null).conversationMemory?.conversationState,responseMode:"local-basic",toolsUsed:[]});return;}
        // Start GPS lookup from the send gesture; never infer a location from IP.
        const preparationStarted=performance.now();const [deviceLocation,validatedToken]=await Promise.all([locationForRequest(request.text,controller.signal,request.onStage).then(value=>{request.onStage?.('A validar acesso ao serviço');return value;}),token()]);
        turnstileToken=validatedToken;const clientPreparationMs=performance.now()-preparationStarted;
        if(controller.signal.aborted)throw Object.assign(new Error('OLEN_STOPPED'),{name:'AbortError'});

        if(controller.signal.aborted)throw Object.assign(new Error('OLEN_STOPPED'),{name:'AbortError'});
        const attachments=(Array.isArray(request.images)?request.images:[]).slice(0,3).map(i=>({
          name:String(i.name||'Imagem'),type:String(i.type||'image/png'),dataUrl:String(i.data||'')
        }));
        // One AI request; do not retry automatically after a network failure.
        limitTimer=setTimeout(()=>{timedOut=true;controller?.abort()},360000);
        const response=await fetch(API+'/api/chat',{
          method:'POST',mode:'cors',credentials:'omit',
          headers:{'Content-Type':'application/json',Accept:'text/event-stream'},
          body:JSON.stringify({
            stream:true,lensMode:request.lensMode,decoded:request.decoded,consultResource:request.consultResource,currentMessage:String(request.text||''),messages:history(request.previous),
            context:context(request.previous,deviceLocation,request.partnerContext||window.OLENPartnerContext||null),attachments,turnstileToken
          }),
          signal:controller.signal
        });
        const data=await window.OLENChatStream.read(response,request.onDelta,request.onStage);if(data?.metrics)data.metrics.clientPreparationMs=Math.round(clientPreparationMs);
        if(!response.ok||!data?.ok)
          throw Object.assign(new Error(String(data?.error||'Não foi possível obter resposta da OLEN.').slice(0,300)),{
            code:String(data?.code||'HTTP_'+response.status),status:response.status
          });
        request.onResponse?.({...data,placeCards:cards(data.placeCards)});
        await window.OLENLocationBridge?.execute(data.actions);
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
        try{if(widget!==null&&turnstileToken)window.turnstile?.reset(widget)}catch(_){}
        busy=false;
        request.onComplete?.();
        if(document.querySelector('.screen[data-screen="chat"].active'))warmToken();
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


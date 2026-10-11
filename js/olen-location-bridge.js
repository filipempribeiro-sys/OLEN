(function(){
 'use strict';let inFlight=null;
 async function get(text,signal){
  if(!window.OLENDeviceLocation.intent(text))return null;
  const model=window.OLENDeviceLocation,router=window.OLENMapRouting;
  let permission='prompt';try{permission=(await navigator.permissions?.query({name:'geolocation'}))?.state||'prompt';}catch{}
  if(permission==='denied')return model.normalize({permissionState:'denied'});
  const cached=router?.devicePosition?.();
  if(cached){const fix=model.normalize(cached);if(fix.isFresh)return fix;}
  if(!router?.acquirePosition||!navigator.geolocation)return model.normalize({permissionState:'unavailable'});
  if(!inFlight)inFlight=router.acquirePosition().then(p=>model.normalize({latitude:p.lat,longitude:p.lon,accuracyMeters:p.accuracy,capturedAt:new Date(p.timestamp).toISOString(),source:'browser',permissionState:'granted'})).catch(async()=>{let state='unavailable';try{if((await navigator.permissions?.query({name:'geolocation'}))?.state==='denied')state='denied';}catch{}return model.normalize({permissionState:state});}).finally(()=>{inFlight=null;});
  const fix=await inFlight;if(signal?.aborted)throw Object.assign(Error('Pedido interrompido.'),{name:'AbortError'});return fix;
 }
 async function execute(actions){for(const raw of Array.isArray(actions)?actions:[]){const action=window.OLENDeviceLocation.validateAction(raw);if(!action)continue;
  if(action.type==='OPEN_MAP_AT_CURRENT_LOCATION')await window.OLENMapRouting?.openCurrentLocation?.(action.deviceLocation);
  if(action.type==='OPEN_EXTERNAL_MAP_AT_CURRENT_LOCATION'){
   // Explicit Google Maps request: a visible link avoids popup blocking and automatic external navigation.
   const link=document.createElement('a');link.textContent='Abrir no Google Maps';link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(action.deviceLocation.latitude+','+action.deviceLocation.longitude);link.target='_blank';link.rel='noopener noreferrer';link.className='olen-place-action';
   document.getElementById('olenChatMessages')?.appendChild(link);
  }
 }}
 window.OLENLocationBridge=Object.freeze({get,execute});
})();

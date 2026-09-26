/* OLEN trail discovery: user-initiated OSM lookup only, never an official registry. */
(function(){
 'use strict';
 const button=document.getElementById('rzDiscoverTrails');
 const choices=document.getElementById('rzNearbyTrails');
 const destination=document.getElementById('rzDestination');
 const prepare=document.getElementById('rzPrepare');
 if(!button||!choices||!destination||!prepare)return;
 const store=(()=>{try{return window.localStorage}catch(_){return null}})();
 const catalog=window.OLENTrailsCatalog?.create({storage:store});
 let found=[];
 function notice(text,error=false){
  const status=document.getElementById('olenMapStatus');
  if(status){status.textContent=text;status.hidden=!text;status.classList.toggle('error',error)}
 }
 async function choose(index){
  const trail=found[index];if(!trail)return;
  try{
   const selected={...trail,pointCount:trail.segments.reduce((n,seg)=>n+seg.length,0)};
   await window.OLENMapRouting.previewTrail(selected);
   destination.value=trail.name;prepare.textContent='Seguir trilho';
   notice('Trilho OSM selecionado. Homologação e acesso não verificados; confirma antes de partir.');
  }catch(error){notice(error?.message||'Não foi possível apresentar o trilho.',true)}
 }
 choices.addEventListener('change',()=>choose(Number(choices.value)));
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   if(!navigator.geolocation?.getCurrentPosition)throw new Error('GPS indisponível neste dispositivo.');
   const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
     {enableHighAccuracy:false,maximumAge:30000,timeout:14000}));
   const result=await catalog.nearby(position.coords);
   found=result.trails;
   choices.replaceChildren();
   const hint=document.createElement('option');hint.value='';hint.textContent='Escolhe um trilho';choices.appendChild(hint);
   found.forEach((trail,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=trail.name;choices.appendChild(option)});
   choices.hidden=!found.length;choices.value='';
   notice(found.length?found.length+' trilhos OSM encontrados. Origem cartográfica, não homologação oficial.':
    'Não foram encontrados trilhos mapeados nesta zona.');
  }catch(error){notice(error?.code===1?'Autoriza a localização para descobrir trilhos próximos.':
    error?.message||'Não foi possível pesquisar trilhos agora.',true)}
  finally{button.disabled=false}
 });
})();

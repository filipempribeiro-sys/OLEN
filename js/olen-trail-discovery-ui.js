/* OLEN trail discovery — restore ALPHA destination-first behavior.
   GPS is optional for discovery, not for real GO tracking. */
(function(){
 'use strict';
 const button=document.getElementById('rzDiscoverTrails');
 const choices=document.getElementById('rzNearbyTrails');
 const destination=document.getElementById('rzDestination');
 const prepare=document.getElementById('rzPrepare');
 if(!button||!choices||!destination||!prepare)return;
 const store=(()=>{try{return window.localStorage}catch(_){return null}})();
 const catalog=window.OLENTrailsCatalog?.create({storage:store});
 let found=[],busy=false;
 const facts=document.getElementById('rzTrailFacts');
 function showFacts(trail){
  if(!facts)return;
  facts.replaceChildren();facts.hidden=false;
  const title=document.createElement('h3');title.textContent=trail.name;facts.appendChild(title);
  const entries=[
    ['Referência',trail.reference],['Rede',trail.network],['Pontos GPS',trail.pointCount],['Distância indicada',trail.distanceTag],
    ['Subida indicada',trail.elevationGainTag],['Descida indicada',trail.elevationLossTag],
    ['Duração indicada',trail.durationTag],['Formato',trail.roundtrip==='yes'?'Circular':trail.roundtrip==='no'?'Linear':null],
    ['Partida',trail.from],['Chegada',trail.to],['Operador indicado',trail.operator],
    ['Levantamento indicado',trail.surveyDate]
  ];
  const grid=document.createElement('div');grid.className='olen-trail-facts-grid';
  entries.filter(([,value])=>Boolean(value)).forEach(([label,value])=>{
    const item=document.createElement('div'),name=document.createElement('small'),content=document.createElement('strong');
    name.textContent=label;content.textContent=String(value);item.append(name,content);grid.appendChild(item);
  });
  if(grid.childElementCount)facts.appendChild(grid);
  if(trail.description){const description=document.createElement('p');description.textContent=trail.description;facts.appendChild(description)}
  if(trail.provenance?.sourceUrl){
   const source=document.createElement('a');source.href=trail.provenance.sourceUrl;
   source.target='_blank';source.rel='noopener noreferrer';source.textContent='Ver origem do percurso no OpenStreetMap';
   facts.appendChild(source);
  }
  const warning=document.createElement('p');warning.textContent=trail.provenance?.type==='openstreetmap'?
   'Fonte cartográfica OSM · acesso, estado do piso e homologação oficial não verificados.':
   'GPX importado do dispositivo · publicação e homologação oficial não verificadas.';
  facts.appendChild(warning);
 }
 function notice(text,error=false){
  const status=document.getElementById('olenMapStatus');
  if(status){status.textContent=text;status.hidden=!text;status.classList.toggle('error',error)}
 }
 async function center(){
  const state=window.OLENMapRouting?.state;
  if(state?.destination)return {latitude:state.destination.lat,longitude:state.destination.lon,label:state.destination.name};
  if(state?.selectedTrail?.id){
   const c=window.OLENMapRouting?.searchCenter?.();
   if(c)return {...c,label:state.selectedTrail.name};
  }
  const typed=destination.value.trim();
  if(typed.length>=2){
   // Like ALPHA, a typed destination is sufficient to discover trails,
   // even when the user does not allow GPS.
   const matches=await window.OLENMapRouting?.lookupDestination?.(typed);
   if(matches?.length){
    const exact=matches.find(x=>String(x.name).toLocaleLowerCase('pt-PT')===typed.toLocaleLowerCase('pt-PT'))||matches[0];
    return {latitude:exact.latitude,longitude:exact.longitude,label:exact.name};
   }
   throw new Error('Não foi possível localizar o destino. Escreve uma localidade mais específica.');
  }
  // No typed destination: GPS when permitted; ALPHA's map center otherwise.
  if(navigator.geolocation?.getCurrentPosition){
   try{
    const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
      {enableHighAccuracy:false,maximumAge:30000,timeout:9000}));
    return {latitude:position.coords.latitude,longitude:position.coords.longitude,label:'posição GPS'};
   }catch(_){}
  }
  const mapCenter=window.OLENMapRouting?.searchCenter?.();
  if(mapCenter)return {...mapCenter,label:'zona visível do mapa'};
  throw new Error('Indica um destino ou ativa a localização para descobrir trilhos.');
 }
 async function choose(index){
  if(!Number.isInteger(index)||index<0)return;
  const trail=found[index];if(!trail)return;
  try{
   const selected={...trail,pointCount:trail.segments.reduce((n,seg)=>n+seg.length,0)};
   await window.OLENMapRouting.previewTrail(selected);
   destination.value=trail.name;prepare.textContent='Seguir trilho';
   const chooser=document.getElementById('rzGeocodeChoices');if(chooser){chooser.hidden=true;chooser.value=''}
   const modes=document.getElementById('rzModes'),label=document.getElementById('rzModeLabel');
   if(modes)modes.hidden=true;
   if(label)label.textContent='A pé · Trail GO';
   showFacts(trail);
   notice('Trilho OSM selecionado. Homologação e acesso não verificados; confirma antes de partir.');
  }catch(error){notice(error?.message||'Não foi possível apresentar o trilho.',true)}
 }
 destination.addEventListener('input',()=>{
  if(destination.value===window.OLENMapRouting?.state?.selectedTrail?.name)return;
  if(facts)facts.hidden=true;
  const modes=document.getElementById('rzModes'),label=document.getElementById('rzModeLabel');
  if(modes)modes.hidden=false;
  if(label)label.textContent=String(document.querySelector('#rzModes button.selected')?.textContent||'A pé').trim();
 });
 choices.addEventListener('change',()=>{if(choices.value!=='')choose(Number(choices.value))});
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;button.disabled=true;
  try{
   const location=await center();
   notice('A pesquisar trilhos na zona de '+location.label+'…');
   const result=await catalog.nearby(location);
   found=result.trails;
   choices.replaceChildren();
   const hint=document.createElement('option');hint.value='';hint.textContent='Escolhe um trilho';choices.appendChild(hint);
   found.forEach((trail,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=trail.name;choices.appendChild(option)});
   choices.hidden=!found.length;choices.value='';
   const cached=result.source==='stale-cache';
   notice(found.length?(cached?'A pesquisa OSM está indisponível: a mostrar '+found.length+' trilhos guardados anteriormente na zona de '+location.label+'.':
      found.length+' trilhos OSM encontrados na zona de '+location.label+'.')+' Homologação por verificar.':
    'Não foram encontrados trilhos mapeados na zona de '+location.label+'.');
  }catch(error){notice(error?.message||'Não foi possível pesquisar trilhos agora.',true)}
  finally{busy=false;button.disabled=false}
 });
 window.OLENTrailFacts=Object.freeze({show:showFacts,hide(){if(facts)facts.hidden=true}});
})();

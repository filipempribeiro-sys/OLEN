/* OLEN Map/GO — ALPHA feature entry, adapted to approved Aurora UI.
   Presentation only: the active GO recorder, router, GPS provider and history
   remain owned by their existing modules. No second tracking runtime. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const trigger=$('rzExplore'),modal=$('rzExplorePop'),close=$('rzExploreClose'),body=$('rzExploreBody');
 if(!trigger||!modal||!close||!body)return;
 const tabs=[...modal.querySelectorAll('[data-olen-explore]')];
 let active='trails',gpsFix=null;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el};
 function action(label,callback,primary=false){
  const b=node('button',label,'olen-explore-action'+(primary?' primary':''));b.type='button';
  b.addEventListener('click',callback);return b;
 }
 function info(text){body.appendChild(node('p',text))}
 function closeModal(){modal.hidden=true;trigger.focus?.()}
 function openModal(tab=active){modal.hidden=false;showTab(tab)}
 function goSheet(){
  closeModal();
  const sheet=$('rzGoPop');if(sheet)sheet.hidden=false;
  $('rzDestination')?.focus?.();
 }
 function metric(label,value){
  const cell=node('div',null,'olen-explore-stat');
  cell.append(node('strong',value),node('small',label));return cell;
 }
 function gpsPanel(){
  body.appendChild(node('h3','GPS e registo de atividade'));
  const stats=node('div',null,'olen-explore-statgrid');
  const fix=gpsFix;
  stats.append(metric('Latitude',fix?fix.latitude.toFixed(5):'—'),
   metric('Longitude',fix?fix.longitude.toFixed(5):'—'),
   metric('Precisão',fix?Math.round(fix.accuracy)+' m':'—'),
   metric('Velocidade filtrada',fix&&Number.isFinite(fix.speed)&&fix.accuracy<=35
    ?(fix.speed*3.6<2.2?'0':(fix.speed*3.6).toFixed(1))+' km/h':'—'));
  body.appendChild(stats);
  const button=action('Centrar no meu GPS',async()=>{
   button.disabled=true;button.textContent='A obter GPS…';
   try{
    if(!navigator.geolocation?.getCurrentPosition)throw Error('GPS indisponível neste dispositivo.');
    const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
     resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    const c=position.coords;
    if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
       !Number.isFinite(c.accuracy)||c.accuracy>100)throw Error('O GPS não devolveu uma posição suficientemente precisa.');
    gpsFix={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,speed:c.speed};
    window.OLENMapRouting?.updatePosition?.(gpsFix);
    await window.OLENMapRouting?.controlMap?.('Recentrar');
    showTab('gps');
   }catch(error){button.textContent=error?.code===1?'Permissão de localização recusada. Tenta novamente.':
    error?.message||'Não foi possível obter GPS.'}
   finally{button.disabled=false}
  },true);
  body.appendChild(button);
  const live=window.OLENGoActivity?.trackingLive===true;
  const interrupted=window.OLENGoActivity?.interrupted===true;
  const existing=window.OLENGoActivity?.current;
  if(existing?.active){
   info('Atividade em curso · '+window.OLENMapRouting.formatDistance(existing.distanceMeters||0)+
    (interrupted?' · interrompida, disponível para recuperação.':' · tracking GPS ativo.'));
  }
  body.appendChild(action(live?'Parar e guardar atividade':
    interrupted?'Retomar atividade interrompida':'Iniciar tracking livre',()=>{
   if(live){window.OLENGoActivity?.stop?.();closeModal();return}
   const started=interrupted?window.OLENGoActivity?.resumeFreeTracking?.():
     window.OLENGoActivity?.startFreeTracking?.();
   if(started)closeModal();
   else info('Não foi possível iniciar o tracking. Confirma as permissões de localização.');
  }));
  info('Sem rota planeada, o tracking regista apenas pontos GPS aceites. Não partilha a localização.');
 }
 function savedPanel(){
  body.appendChild(node('h3','As minhas atividades'));
  const items=window.OLENGoActivity?.history?.()||[];
  if(!items.length){info('Ainda não tens atividades concluídas neste dispositivo.');return}
  for(const item of items.slice(0,50)){
   const row=node('div',null,'olen-history-entry');
   row.append(node('strong',item.name||'Atividade OLEN'),
    node('small',(Number.isFinite(item.finishedAt)?new Date(item.finishedAt).toLocaleString('pt-PT'):'Data indisponível')
      +' · '+window.OLENMapRouting.formatDistance(item.distanceMeters||0)+' · '+item.points.length+' pontos'));
   if(item.points.length){
    const exportButton=node('button','Exportar GPX');
    exportButton.type='button';
    exportButton.addEventListener('click',()=>{
     try{
      const xml=window.OLENGPX.exportTrack(item);
      const url=URL.createObjectURL(new Blob([xml],{type:'application/gpx+xml;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;
      anchor.download='OLEN-'+String(item.id||'atividade').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,55)+'.gpx';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
     }catch(error){exportButton.textContent=error?.message||'Não foi possível exportar o GPX.'}
    });row.appendChild(exportButton);
   }
   body.appendChild(row);
  }
 }
 function showTab(tab){
  if(!['trails','routes','gps','saved'].includes(tab))tab='trails';
  active=tab;tabs.forEach(t=>t.setAttribute('aria-current',String(t.dataset.olenExplore===tab)));
  body.replaceChildren();
  if(tab==='trails'){
   body.appendChild(node('h3','Trilhos e caminhos próximos'));
   info('Escolhe uma localidade para procurar nessa zona. Sem destino, procura perto da tua posição GPS.');
   body.appendChild(action('Descobrir trilhos no mapa',()=>{
    goSheet();$('rzDiscoverTrails')?.click();
   },true));
   body.appendChild(action('Camadas do mapa',async()=>{
    closeModal();await window.OLENMapRouting?.controlMap?.('Camadas');
   }));
  }else if(tab==='routes'){
   body.appendChild(node('h3','Planear uma rota'));
   info('Escolhe destino e modo de transporte. Só iniciamos GO depois de receber um traçado real validado.');
   body.appendChild(action('Preparar rota',goSheet,true));
   body.appendChild(action('Ver GPS e tracking',()=>showTab('gps')));
  }else if(tab==='gps')gpsPanel();
  else savedPanel();
 }
 trigger.addEventListener('click',()=>openModal('trails'));
 close.addEventListener('click',closeModal);
 modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});
 tabs.forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.olenExplore)));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeModal()});
 window.OLENMapExplore=Object.freeze({open:openModal,close:closeModal});
})();

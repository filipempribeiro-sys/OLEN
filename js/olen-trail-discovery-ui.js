/* Published OSM hiking routes, presented with the existing OLEN Chat cards.
   Geometry loads directly into Trail GO; no local-file requirement.
   Public conditions/reports are never inferred from absence of local data. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),button=$('rzDiscoverTrails'),choices=$('rzNearbyTrails'),destination=$('rzDestination'),prepare=$('rzPrepare'),facts=$('rzTrailFacts');
 if(!button||!choices||!destination||!prepare)return;
 const storage=(()=>{try{return window.localStorage}catch{return null}})(),catalog=window.OLENTrailsCatalog.create({storage});
 let found=[],busy=false;
 function node(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e}
 function notice(text,error=false){const status=$('rzGoSearchStatus');if(status){status.textContent=text;status.hidden=!text;status.classList.toggle('error',error)}}
 const difficulties={hiking:'Caminhada',mountain_hiking:'Caminhada de montanha',demanding_mountain_hiking:'Caminhada de montanha exigente',alpine_hiking:'Caminhada alpina',demanding_alpine_hiking:'Caminhada alpina exigente',difficult_alpine_hiking:'Caminhada alpina difícil'};
 function difficulty(t){return t.difficultyTag?difficulties[t.difficultyTag]||t.difficultyTag:'Não indicada pela fonte'}
 function condition(t){return t.accessTag==='no'?'Acesso marcado como proibido na fonte':t.accessTag==='private'?'Acesso privado indicado na fonte':'Estado atual não confirmado'}
 function distance(t){
  if(t.distanceTag)return t.distanceTag+' (fonte)';
  let meters=0;for(const seg of t.segments)for(let i=1;i<seg.length;i++)meters+=window.OLENTrailsCatalog.distance({lat:seg[i-1].latitude,lon:seg[i-1].longitude},{lat:seg[i].latitude,lon:seg[i].longitude});
  return window.OLENMapRouting.formatDistance(meters)+' (traçado)';
 }
 function nearSegment(report,a,b){
  const rad=Math.PI/180,xScale=111320*Math.cos(report.latitude*rad),yScale=111320;
  const ax=(a.longitude-report.longitude)*xScale,ay=(a.latitude-report.latitude)*yScale,bx=(b.longitude-report.longitude)*xScale,by=(b.latitude-report.latitude)*yScale;
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len)):0;
  return Math.hypot(ax+t*dx,ay+t*dy)<=100;
 }
 function reports(t){const all=window.OLENGoReports?.create?.(storage)?.list?.()||[];return all.filter(r=>t.segments.some(seg=>seg.some((p,i)=>i>0&&nearSegment(r,seg[i-1],p))))}
 function reportLabel(t){const n=reports(t).length;return (n?n+' report'+(n===1?' local':'s locais'):'Sem reports locais')+' · reports públicos indisponíveis'}
 function addFact(grid,label,value){const item=node('div'),name=node('small',label),content=node('strong',value);item.append(name,content);grid.appendChild(item)}
 function showFacts(trail){
  if(!facts)return;facts.replaceChildren();facts.hidden=false;
  facts.appendChild(node('h3',trail.name));const grid=node('div',null,'olen-trail-facts-grid');
  [['Distância do percurso',distance(trail)],['Dificuldade',difficulty(trail)],['Estado',condition(trail)],['Reports',reportLabel(trail)],['Referência',trail.reference],['Formato',trail.roundtrip==='yes'?'Circular':trail.roundtrip==='no'?'Linear':null],['Subida indicada',trail.elevationGainTag],['Descida indicada',trail.elevationLossTag],['Duração indicada',trail.durationTag],['Partida',trail.from],['Chegada',trail.to],['Operador',trail.operator],['Data indicada',trail.surveyDate]].filter(([,v])=>v).forEach(([k,v])=>addFact(grid,k,v));facts.appendChild(grid);
  if(trail.description)facts.appendChild(node('p',trail.description));
  for(const report of reports(trail)){facts.appendChild(node('p','Report local · '+new Date(report.at).toLocaleDateString('pt-PT')+' · '+(report.description||report.type)))}
  if(trail.provenance?.sourceUrl){const a=node('a','Ver publicação do percurso');a.href=trail.provenance.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';facts.appendChild(a)}
  facts.appendChild(node('p','Percurso publicado no OpenStreetMap. O estado atual e a homologação oficial não estão confirmados.'));
  facts.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 async function center(){
  const typed=destination.value.trim(),selected=window.OLENDestinationSearch?.selected;
  if(selected)return {latitude:selected.latitude,longitude:selected.longitude,label:selected.name};
  if(typed){const resolved=await window.OLENDestinationSearch.search();if(!resolved)return null;return {latitude:resolved.latitude,longitude:resolved.longitude,label:resolved.name}}
  if(!navigator.geolocation?.getCurrentPosition)throw Error('Escolhe uma localidade para pesquisar trilhos.');
  const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:30000,timeout:10000}));
  const c=p.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||!Number.isFinite(c.accuracy)||c.accuracy>1000)throw Error('A localização não está suficientemente precisa. Escolhe uma localidade.');
  return {latitude:c.latitude,longitude:c.longitude,label:'a tua posição GPS'};
 }
 async function choose(index,action='detail'){
  const trail=found[index];if(!trail)return;
  if(action==='detail'){showFacts(trail);return}
  try{
   const selected={...trail,pointCount:trail.segments.reduce((n,s)=>n+s.length,0)};
   await window.OLENMapRouting.previewTrail(selected);destination.value=trail.name;prepare.textContent='Seguir trilho';
   window.OLENDestinationSearch.clear();if($('rzModes'))$('rzModes').hidden=true;if($('rzModeLabel'))$('rzModeLabel').textContent='A pé · Trilho';
   showFacts(trail);notice('Percurso carregado. Escolhe Seguir trilho para iniciar o GPS.');
   if(action==='map')$('rzGoPop').hidden=true;
   if(action==='go')prepare.click();
  }catch(e){notice(e.message||'Não foi possível carregar o trilho.',true)}
 }
 function thumbnail(trail){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 260 90');svg.setAttribute('aria-label','Traçado publicado do trilho');svg.setAttribute('role','img');svg.classList.add('olen-trail-shape');
  const points=trail.segments.flat(),lat0=points[0].latitude,scale=Math.cos(lat0*Math.PI/180),xs=points.map(p=>p.longitude*scale),ys=points.map(p=>p.latitude);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),s=Math.min(236/Math.max(maxX-minX,.00001),66/Math.max(maxY-minY,.00001));
  for(const segment of trail.segments){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',segment.map(p=>[130+(p.longitude*scale-(minX+maxX)/2)*s,45-(p.latitude-(minY+maxY)/2)*s].join(',')).join(' '));svg.appendChild(line)}return svg;
 }
 function render(location,result){
  choices.replaceChildren();choices.hidden=false;choices.appendChild(node('h3','Trilhos perto de '+location.label));
  choices.appendChild(node('p',(result.source==='stale-cache'?'Resultados guardados · ':'')+'Até 30 km · percursos publicados no OpenStreetMap','olen-go-help'));
  if(!found.length){choices.appendChild(node('p','Esta fonte não devolveu percursos pedestres com traçado nesta pesquisa. Isso não confirma que não existem trilhos na zona. Podes repetir a pesquisa ou escolher outra localidade.','olen-go-help'));return}
  const track=node('div',null,'olen-place-track');
  found.forEach((t,i)=>{
   const card=node('article',null,'olen-place-card olen-px-card'),info=node('div',null,'olen-place-info');card.appendChild(thumbnail(t));
   info.append(node('div','TRILHO · '+(t.reference||'OSM'),'olen-place-kicker'),node('h3',t.name),node('p',distance(t)+' · '+window.OLENMapRouting.formatDistance(t.metersFromSearch)+' da zona pesquisada','olen-place-address'),node('p','Dificuldade: '+difficulty(t)+' · '+condition(t),'olen-place-desc'),node('p',reportLabel(t),'olen-trail-report'));
   const actions=node('div',null,'olen-place-actions');[['Detalhes','detail'],['Mapa','map'],['Seguir','go']].forEach(([label,action])=>{
    const b=node('button',label);b.type='button';b.setAttribute('aria-label',label+' · '+t.name);b.addEventListener('click',()=>choose(i,action));actions.appendChild(b)});info.appendChild(actions);card.appendChild(info);track.appendChild(card);
  });choices.appendChild(track);
 }
 destination.addEventListener('input',()=>{choices.hidden=true;if(facts)facts.hidden=true;prepare.textContent='Preparar rota';if($('rzModes'))$('rzModes').hidden=false});
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;button.disabled=true;const query=destination.value.trim(),caption=button.textContent;button.textContent='A procurar trilhos…';notice(query?'A resolver o local pesquisado…':'A obter a tua posição GPS…');destination.blur?.();
  try{const location=await center();if(!location)return;notice('A procurar trilhos perto de '+location.label+'…');
   const result=await catalog.nearby(location);if(destination.value.trim()!==query&&window.OLENDestinationSearch.selected?.name!==location.label)return;
   found=result.trails;render(location,result);notice(found.length?found.length+' trilhos encontrados perto de '+location.label+'.':'A fonte consultada não devolveu percursos nesta pesquisa.');
  }catch(e){notice(e.code===1?'GPS não autorizado. Escolhe uma localidade para pesquisar.':e.message||'Não foi possível pesquisar trilhos.',true)}
  finally{busy=false;button.disabled=false;button.textContent=caption}
 });
 window.OLENTrailFacts=Object.freeze({show:showFacts,hide(){if(facts)facts.hidden=true}});
})();
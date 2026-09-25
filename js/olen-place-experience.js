/* OLEN Place Experience — ALPHA card structure rebuilt under OLEN visual ownership.
   No legacy HTML/CSS overlays. Every field is optional, source-grounded and escaped. */
(function(){
'use strict';
const API='https://olen-alpha-ai.filipe-m-p-ribeiro.workers.dev';
const CACHE='olen.place-media.v1',TTL=12*3600000;
let current=null,overlay=null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function arr(v){return Array.isArray(v)?v:v==null||v===''?[]:[v]}
function cleanText(value){
 return String(value??'')
   .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi,'$1')
   .replace(/\(https?:\/\/[^)]+\)/gi,'')
   .replace(/https?:\/\/[^\s),;]+/gi,'')
   .replace(/<[^>]*>/g,' ')
   .replace(/\s+/g,' ').trim();
}
function uniq(values,max=24){
 const seen=new Set(),items=[];
 const menu=/^(in[ií]cio|saber mais|aceitar cookies|gerir cookies|menu|termos e condições|política de privacidade|contacte-nos|pesquisar|voltar|subscrever|acessibilidade do site|mapa do site)$/i;
 const noise=/((aceitar|gerir) cookies|pol[ií]tica de privacidade|termos e condi[cç][oõ]es|conte[uú]do principal)/gi;
 for(const raw of values.flatMap(arr)){
   const text=typeof raw==='string'||typeof raw==='number'?cleanText(raw):
      (raw&&typeof raw==='object'?cleanText(raw.text||raw.description||raw.value||''):'');
   if(text.length<2||menu.test(text))continue;
   // Navigation/cookie-menu extracts are not factual descriptions of a place.
   if((text.match(noise)||[]).length>=2)continue;
   const id=text.toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
   if(seen.has(id))continue;
   seen.add(id);items.push(text);
   if(items.length>=max)break;
 }
 return items;
}
function first(p,...keys){for(const k of keys)if(p?.[k]!=null&&p[k]!==''&&(!Array.isArray(p[k])||p[k].length))return p[k];return null}
function url(value){
 try{const s=typeof value==='string'?value:value?.url||value?.uri||'';const u=new URL(s,location.href);
   return u.protocol==='https:'?u.href:''}catch{return''}
}
function photoUrl(raw){
 const s=typeof raw==='string'?raw:raw?.url||raw?.photo||raw?.image||'';
 if(String(s).startsWith('/api/place-photo?'))return API+s;
 return url(s);
}
function photos(p){
 const out=[];
 for(const raw of [p?.photo,p?.photoUrl,p?.image,p?.imageUrl,...arr(p?.photos),...arr(p?.images)]){
   const u=photoUrl(raw);if(u&&!out.includes(u))out.push(u);
 }
 return out.slice(0,9);
}
function category(raw){
 const v=cleanText(raw||'Local'),labels={
   viewpoint:'Miradouro',museum:'Museu',restaurant:'Restaurante',attraction:'Atração',
   hotel:'Hotel',park:'Parque',beach:'Praia',trail:'Trilho',castle:'Castelo',
   palace:'Palácio',church:'Igreja',cafe:'Café',garden:'Jardim',monument:'Monumento',
   historic:'Património',tourism:'Turismo',amenity:'Local',artwork:'Arte pública',
   guest_house:'Alojamento',fast_food:'Restauração rápida',picnic_site:'Zona de piquenique',
   nature_reserve:'Reserva natural',information:'Informação turística',
   place_of_worship:'Local de culto',public_building:'Edifício público'
 };
 return labels[v.toLowerCase()]||v.replace(/_/g,' ');
}
function rating(p){const n=Number(p?.rating);return Number.isFinite(n)&&n>0&&n<=5?n:null}
function reviews(p){const n=Number(p?.reviews??p?.userRatingCount);return Number.isSafeInteger(n)&&n>0?n:null}
function coords(p){
 const lat=p?.latitude??p?.lat,lon=p?.longitude??p?.lon??p?.lng;
 return typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
}
function duration(p){return cleanText(first(p,'duration','typicalDuration','visitDuration')||'')}
function status(p){return cleanText(first(p,'currentStatus','openNowText','status')||'')}
function benefits(p){return uniq([
 ...arr(first(p,'freeEntry','freeAdmission','freeConditions')),
 ...arr(first(p,'happyHour','happyHours','specialAdmission','admissionBenefits'))
 ],9)}
function benefitLabel(lines){const s=lines.join(' ').toLowerCase();return /52\s+(entradas|dias)/.test(s)?'52 entradas gratuitas':
 /happy\s*hour/.test(s)?'Condição especial':/gratuit|grátis|gratis|entrada livre/.test(s)?'Entrada gratuita disponível':'Condições de entrada'}
function publishedSources(p){
 return arr(first(p,'sourceUrls','sources','citations')).map(v=>url(v)).filter(Boolean).slice(0,10)
   .filter((v,i,a)=>a.indexOf(v)===i);
}
function officialLink(p,key){
 const u=url(p?.[key]);if(!u)return'';
 const website=url(p?.website),sources=publishedSources(p);
 let host;try{host=new URL(u).hostname.replace(/^www\./,'')}catch{return''}
 return [website,...sources].some(v=>{try{
   const official=new URL(v).hostname.replace(/^www\./,'');
   return official===host;
 }catch{return false}})?u:'';
}
function byName(p){return esc(cleanText(p.name||'Local'))}
function attr(p){
 const items=arr(p?.photoAttributions).map(a=>({name:cleanText(a?.displayName||a?.name||a),uri:url(a?.uri)})).filter(a=>a.name);
 const direct=cleanText(p?.photoCredit||p?.imageAttribution||p?.photoAuthor||'');
 if(direct&&!items.some(a=>a.name===direct))items.push({name:direct,uri:url(p?.photoSource||'')});
 if(!items.length)return'';
 return '<div class="olen-place-photo-credit">Foto: '+items.map(a=>a.uri?
   '<a href="'+esc(a.uri)+'" rel="noopener noreferrer" target="_blank">'+esc(a.name)+'</a>':esc(a.name)).join(' · ')+'</div>';
}
function cards(m,i){
 const items=Array.isArray(m?.placeCards)?m.placeCards.filter(p=>p&&p.name).slice(0,12):[];
 if(!items.length)return'';
 const html=items.map((p,j)=>{
   const photo=photos(p)[0]||'',title=cleanText(p.name),placeCategory=category(p.category||p.type);
   const description=cleanText(p.description||p.summary||'');
   const address=cleanText(p.address||'');
   return '<article class="olen-place-card olen-px-card'+(photo?'':' no-photo')+'">'+
     (photo?'<div class="olen-place-image"><img loading="lazy" src="'+esc(photo)+'" alt="'+esc(title)+'">'+attr(p)+'</div>':'')+
     '<div class="olen-place-info"><div class="olen-place-kicker">'+esc(placeCategory)+
      (p.selected?' <span class="olen-place-check" aria-label="Selecionado">✓</span>':'')+'</div>'+
     '<h3>'+esc(title)+'</h3>'+(address?'<p class="olen-place-address">'+esc(address)+'</p>':'')+
     (description?'<p class="olen-place-desc">'+esc(description)+'</p>':'')+
     '<div class="olen-place-actions">'+
     '<button type="button" data-place-action="detail" data-place-msg="'+i+'" data-place-index="'+j+'">Detalhes</button>'+
     '<button type="button" data-place-action="map" data-place-msg="'+i+'" data-place-index="'+j+'">⌖ Mapa</button>'+
     '<button type="button" data-place-action="go" data-place-msg="'+i+'" data-place-index="'+j+'">Ir</button>'+
     '</div></div></article>';
 }).join('');
 const source=cleanText(m.placeSource||'').replace(/Alpha Tools/gi,'Ferramentas OLEN');
 return '<section class="olen-place-section" aria-label="Locais escolhidos pela OLEN">'+
 '<div class="olen-place-heading"><b>Locais escolhidos pela OLEN</b><small>desliza ↔</small></div>'+
 '<div class="olen-place-track">'+html+'</div>'+
 (source?'<small class="olen-place-source">'+esc(source)+'</small>':'')+'</section>';
}
function ensureOverlay(){
 if(overlay)return overlay;
 overlay=document.createElement('div');
 overlay.id='olenPlaceDetailOverlay';overlay.className='olen-place-overlay olen-px-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="olen-place-modal olen-px-modal" role="dialog" aria-modal="true" aria-label="Detalhes do local">'+
 '<button type="button" class="olen-place-close" aria-label="Fechar detalhes">×</button>'+
 '<div class="olen-place-modal-content"></div><div class="olen-place-modal-footer"></div></section>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{
   if(e.target===overlay||e.target.closest('.olen-place-close')){close();return}
   const button=e.target.closest('[data-olen-px]');
   if(!button||!current)return;
   const action=button.dataset.olenPx;
   if(action==='back')return renderMain();
   if(action==='section')return renderSection(button.dataset.section);
   if(action==='more'){const x=overlay.querySelector('[data-benefit-extra]');if(x){
     x.hidden=!x.hidden;button.textContent=x.hidden?'Ver todas as condições ›':'Ocultar condições ‹';}return}
   if(action==='image')return renderSection('images',Number(button.dataset.index));
   if(action==='calendar')return calendarAction(current.p);
   if(action==='whatsapp')return shareAction(current.p);
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay&&!overlay.hidden)close()});
 document.addEventListener('error',e=>{
   const image=e.target;
   if(image?.tagName==='IMG'&&image.closest('.olen-place-card,.olen-px-modal')){
     const wrapper=image.closest('.olen-place-image,.olen-px-hero,.olen-px-image');
     wrapper?.remove();
     image.closest('.olen-place-card')?.classList.add('no-photo');
   }
 },true);
 return overlay;
}
function close(){if(overlay)overlay.hidden=true;current=null;document.body.classList.remove('olen-px-open')}
function open(p,i,j){
 if(!p?.name)return false;
 current={p,i,j,page:'main'};ensureOverlay();renderMain();
 overlay.hidden=false;document.body.classList.add('olen-px-open');
 overlay.querySelector('.olen-place-close')?.focus({preventScroll:true});
 return true;
}
function footer(){
 if(!current)return'';
 const {p,i,j}=current;
 return '<div class="olen-px-footer">'+
 '<button type="button" data-place-action="select" data-place-msg="'+i+'" data-place-index="'+j+'">'+
 (p.selected?'✓ Selecionado':'＋ Plano')+'</button>'+
 '<button type="button" data-place-action="map" data-place-msg="'+i+'" data-place-index="'+j+'">⌖ Mapa</button>'+
 '<button type="button" class="primary" data-place-action="go" data-place-msg="'+i+'" data-place-index="'+j+'">Ir</button>'+
 '</div>';
}
function sections(p){
 const ps=photos(p),defs=[
 ['hours','◷','Horários',first(p,'openingHours','lastEntry')],
 ['prices','€','Preços',first(p,'prices','familyTicket','discounts','freeEntry','ticketUrl','ticketsUrl','bookingUrl')],
 ['images','▧','Imagens',ps.length],
 ['history','≡',p.history?'História':'Sobre',first(p,'history','description','summary')],
 ['access','♿','Acessibilidade',p.accessibility],
 ['services','＋','Serviços',p.services],
 ['rules','ⓘ','Regras',first(p,'rules','parking','publicTransport')],
 ['transport','⌖','Transportes',p.publicTransport],
 ['parking','▤','Estacionamento',p.parking],
 ['contact','☎','Contactos',first(p,'telephone','phone','email','website')],
 ['discover','◇','Descobrir aqui',first(p,'discover','highlights','inside','pointsOfInterest')]
 ];
 return defs.filter(x=>x[3]).map(([id,icon,title])=>
   '<button type="button" data-olen-px="section" data-section="'+id+'"><span aria-hidden="true">'+icon+'</span>'+esc(title)+'</button>').join('');
}
function renderMain(){
 if(!current||!overlay)return;
 current.page='main';
 const p=current.p,ps=photos(p),r=rating(p),rv=reviews(p),d=duration(p),st=status(p),free=benefits(p);
 const fact=[];
 if(st)fact.push('<span class="olen-px-fact status">'+esc(st.slice(0,90))+'</span>');
 if(free.length)fact.push('<span class="olen-px-fact benefit">🎟 '+esc(benefitLabel(free))+'</span>');
 if(r!==null)fact.push('<span class="olen-px-fact">★ '+r.toFixed(1).replace('.',',')+
   (rv?' · '+rv.toLocaleString('pt-PT')+' avaliações':'')+'</span>');
 if(d)fact.push('<span class="olen-px-fact">⏱ '+esc(d)+'</span>');
 const description=cleanText(p.description||p.summary||'');
 const source=publishedSources(p);
 const box=overlay.querySelector('.olen-place-modal-content');
 box.innerHTML=(ps[0]?'<div class="olen-px-hero"><img src="'+esc(ps[0])+'" alt="'+byName(p)+'">'+attr(p)+'</div>':'')+
 '<div class="olen-px-head"><small>'+esc(category(p.category||p.type))+'</small>'+
 '<h2>'+byName(p)+'</h2>'+
 (p.address?'<p class="olen-px-address">'+esc(cleanText(p.address))+'</p>':'')+
 (fact.length?'<div class="olen-px-facts">'+fact.join('')+'</div>':'')+'</div>'+
 '<div class="olen-px-body"><div class="olen-px-sections">'+sections(p)+'</div>'+
 (description?'<p class="olen-px-desc">'+esc(description.slice(0,260))+(description.length>260?'…':'')+'</p>':'')+
 (p.olenRecommendation?'<p class="olen-px-reco"><strong>OLEN recomenda</strong>'+esc(cleanText(p.olenRecommendation))+'</p>':'')+
 (source.length?'<div class="olen-px-source">'+source.length+' fonte'+(source.length!==1?'s':'')+' consultada'+(source.length!==1?'s':'')+
 ': '+source.slice(0,4).map(u=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(u).hostname)+'</a>').join(' · ')+'</div>':'')+
 '</div>';
 overlay.querySelector('.olen-place-modal-footer').innerHTML=footer();
 box.scrollTop=0;
}
function rows(title,values){
 const normalized=uniq(values,30);
 return '<h3>'+esc(title)+'</h3>'+(normalized.length?
 normalized.map(x=>'<div class="olen-px-row">'+esc(x)+'</div>').join(''):
 '<p class="olen-px-empty">Informação não disponível nas fontes consultadas.</p>');
}
function hours(p){
 const data=uniq([...arr(p.openingHours),...arr(p.lastEntry)],21);
 const days={Monday:'Segunda-feira',Tuesday:'Terça-feira',Wednesday:'Quarta-feira',
   Thursday:'Quinta-feira',Friday:'Sexta-feira',Saturday:'Sábado',Sunday:'Domingo',
   Mo:'Seg.',Tu:'Ter.',We:'Qua.',Th:'Qui.',Fr:'Sex.',Sa:'Sáb.',Su:'Dom.'};
 const norm=data.map(line=>{
   let next=line;
   for(const [english,pt] of Object.entries(days))next=next.replace(new RegExp('\\b'+english+'\\b','gi'),pt);
   return next.replace(/(\d\d?:\d\d)\s*-\s*(\d\d?:\d\d)/g,'$1 — $2');
 });
 return rows('Horários',norm);
}
function prices(p){
 const benefit=benefits(p);
 const main=uniq([...arr(p.prices),...arr(p.familyTicket),...arr(p.ageBands),...arr(p.discounts)],22);
 const ticket=officialLink(p,'ticketUrl')||officialLink(p,'ticketsUrl')||officialLink(p,'officialTicketsUrl')||officialLink(p,'bookingUrl');
 const experience=officialLink(p,'experiencesUrl')||officialLink(p,'officialExperiencesUrl');
 return '<h3>Preços e entradas</h3>'+
 (benefit.length?'<div class="olen-px-benefit"><strong>🎟 '+esc(benefitLabel(benefit))+'</strong>'+
 benefit.slice(0,3).map(t=>'<p>'+esc(t)+'</p>').join('')+
 (benefit.length>3?'<button type="button" data-olen-px="more">Ver todas as condições ›</button>'+
 '<div data-benefit-extra hidden>'+benefit.slice(3).map(t=>'<p>'+esc(t)+'</p>').join('')+'</div>':'')+'</div>':'')+
 (main.length?main.map(t=>'<div class="olen-px-row">'+esc(t)+'</div>').join(''):
 '<p class="olen-px-empty">Preços regulares não confirmados.</p>')+
 ((ticket||experience)?'<div class="olen-px-ctas">'+
 (ticket?'<a class="primary" href="'+esc(ticket)+'" target="_blank" rel="noopener noreferrer">🎟 Comprar bilhetes</a>':'')+
 (experience?'<a href="'+esc(experience)+'" target="_blank" rel="noopener noreferrer">Experiências disponíveis</a>':'')+'</div>':'');
}
function renderSection(id,imageIndex=0){
 if(!current||!overlay)return;
 const p=current.p,ps=photos(p),name=byName(p);
 current.page=id;
 let body='';
 if(id==='hours')body=hours(p);
 else if(id==='prices')body=prices(p);
 else if(id==='history')body=rows(p.history?'História':'Sobre',[p.history,p.description,p.summary]);
 else if(id==='access')body=rows('Acessibilidade',p.accessibility);
 else if(id==='services')body=rows('Serviços',p.services);
 else if(id==='rules')body=rows('Informação prática',[...arr(p.rules),...arr(p.parking),...arr(p.publicTransport)]);
 else if(id==='transport')body=rows('Transportes',p.publicTransport);
 else if(id==='parking')body=rows('Estacionamento',p.parking);
 else if(id==='contact'){
   body=rows('Contactos',[p.telephone||p.phone,p.email]);
   const website=officialLink(p,'website');
   if(website)body+='<div class="olen-px-ctas"><a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">Website oficial</a></div>';
 }else if(id==='discover'){
   const found=arr(first(p,'discover','highlights','inside','pointsOfInterest'));
   body='<h3>Descobrir aqui</h3>'+(found.length?found.slice(0,9).map(v=>'<div class="olen-px-row"><strong>'+esc(cleanText(typeof v==='string'?v:v?.name||v?.title))+
   '</strong>'+(v?.description?'<p>'+esc(cleanText(v.description))+'</p>':'')+'</div>').join(''):'<p class="olen-px-empty">Sem elementos confirmados.</p>');
 }else if(id==='images'){
   body='<h3>Imagens</h3>'+(ps.length?'<div class="olen-px-gallery">'+ps.map((src,i)=>
    '<button type="button" data-olen-px="image" data-index="'+i+'" aria-label="Ver imagem '+(i+1)+'">'+
    '<img src="'+esc(src)+'" alt="'+name+'"></button>').join('')+'</div>'+
    '<div class="olen-px-featured"><img src="'+esc(ps[Math.min(Math.max(0,imageIndex),ps.length-1)])+'" alt="'+name+'">'+attr(p)+'</div>':
    '<p class="olen-px-empty">Ainda não existem fotografias deste local.</p>');
 }
 const sources=publishedSources(p);
 overlay.querySelector('.olen-place-modal-content').innerHTML=
   '<div class="olen-px-sub"><button type="button" class="olen-px-back" data-olen-px="back">‹ '+name+'</button>'+
   body+(sources.length?'<p class="olen-px-source">Fontes: '+sources.slice(0,4).map(u=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(u).hostname)+'</a>').join(' · ')+'</p>':'')+
   '</div>';
 overlay.querySelector('.olen-place-modal-footer').innerHTML=footer();
 overlay.querySelector('.olen-place-modal-content').scrollTop=0;
}
function calendarAction(p){
 const event=current?.message?.calendarEvents?.[0]||null;
 if(!event?.start||!event?.title){
   close();
   try{window.OLEN5.router.enter('agenda',{reason:'place-calendar'})}catch{document.querySelector('.nav[data-view="agenda"]')?.click()}
   window.OLENAgendaPrefill?.({title:'Visitar '+cleanText(p.name),place:cleanText(p.address||p.name)});
   return;
 }
 close();
 window.OLENAgendaPrefill?.({title:event.title,start:event.start,end:event.end,place:event.location||p.address||p.name,notes:event.description||''});
}
function shareAction(p){
 const text=cleanText(p.name)+(p.address?'\n'+cleanText(p.address):'');
 if(navigator.share)navigator.share({title:cleanText(p.name),text}).catch(()=>{});
 else{const link='https://wa.me/?text='+encodeURIComponent(text);window.open(link,'_blank','noopener,noreferrer')}
}
function experienceActions(m,i){
 const events=arr(m.calendarEvents).filter(e=>e?.title&&e?.start);
 const wantsShare=!!(m.shareSummary||m.whatsappShare);
 if(!events.length&&!wantsShare)return'';
 return '<div class="olen-px-experience-actions">'+
 (events.length?'<button type="button" data-olen-experience="calendar" data-msg-index="'+i+'">▣ Adicionar plano à Agenda</button>':'')+
 (wantsShare?'<button type="button" data-olen-experience="share" data-msg-index="'+i+'">↗ Partilhar no WhatsApp</button>':'')+'</div>';
}
function setEventHandlers(){
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-olen-experience]');if(!b)return;
   const index=Number(b.dataset.msgIndex),chat=window.OLENChat?.getCurrent?.(),m=chat?.messages?.[index];if(!m)return;
   if(b.dataset.olenExperience==='calendar'){
     const ev=arr(m.calendarEvents).find(v=>v?.title&&v?.start);if(!ev)return;
     window.OLENAgendaPrefill?.({title:ev.title,start:ev.start,end:ev.end,place:ev.location||'',notes:ev.description||''});
   }
   if(b.dataset.olenExperience==='share'){
     const text=cleanText(m.shareSummary||m.text);
     if(navigator.share)navigator.share({title:cleanText(chat.title||'OLEN'),text}).catch(()=>{});
     else window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
   }
 });
}
function readCache(){try{const v=JSON.parse(localStorage.getItem(CACHE)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
function key(p){
 const c=coords(p);return c?cleanText(p.name).toLowerCase()+'|'+c.lat.toFixed(4)+'|'+c.lon.toFixed(4):'';
}
async function enrichCards(conversationId,requestId){
 const stored=JSON.parse(localStorage.getItem('olen.chat.conversations.v1')||'[]');
 const convo=stored.find(x=>x.id===conversationId),message=convo?.messages?.find(m=>m.requestId===requestId&&m.role==='assistant');
 if(!message?.placeCards?.length)return{updated:0};
 let updated=0;
 for(const original of message.placeCards.slice(0,4)){
   if(photos(original).length||!coords(original))continue;
   const k=key(original),cache=readCache();let result=cache[k];
   if(!result||Date.now()-result.at>TTL){
     try{
       const token=await window.OLENCloudflareChat?.getTurnstileToken?.();
       if(!token)break;
       const c=coords(original);
       const response=await fetch(API+'/api/olen/place-media',{method:'POST',mode:'cors',
         credentials:'omit',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({name:cleanText(original.name),lat:c.lat,lon:c.lon,
           locality:cleanText(original.locality||original.city||''),turnstileToken:token})});
       const body=await response.json();
       if(!response.ok||!body?.ok)continue;
       result={at:Date.now(),matched:body.matched,place:body.place||null};
       cache[k]=result;
       const entries=Object.entries(cache).filter(([name,item])=>Date.now()-item.at<TTL).slice(-32);
       try{localStorage.setItem(CACHE,JSON.stringify(Object.fromEntries(entries)))}catch{}
     }catch{continue}
   }
   if(!result?.matched||!result.place?.photo)continue;
   const fresh=JSON.parse(localStorage.getItem('olen.chat.conversations.v1')||'[]');
   const chat=fresh.find(x=>x.id===conversationId);
   const target=chat?.messages?.find(m=>m.requestId===requestId&&m.role==='assistant');
   const item=target?.placeCards?.find(p=>key(p)===k);
   if(!item)continue;
   const photo=photoUrl(result.place.photo);if(!photo)continue;
   item.photo=photo;item.photoAttributions=arr(result.place.photoAttributions).slice(0,4);
   if(!item.rating&&result.place.rating)item.rating=result.place.rating;
   if(!item.reviews&&result.place.reviews)item.reviews=result.place.reviews;
   if(!arr(item.openingHours).length&&arr(result.place.openingHours).length)item.openingHours=result.place.openingHours;
   try{localStorage.setItem('olen.chat.conversations.v1',JSON.stringify(fresh));updated++}catch{}
   const sc=$('olenChatMessages');
   if(window.OLENChat?.getActive?.()===conversationId&&sc&&sc.scrollHeight-sc.scrollTop-sc.clientHeight<160)
     window.OLENChat.render?.();
 }
 return{updated};
}
setEventHandlers();
window.OLENPlaceExperience=Object.freeze({
 cards,open,close,coords,photos,cleanText,category,experienceActions,enrichCards,
 get isOpen(){return!!overlay&&!overlay.hidden}
});
})();
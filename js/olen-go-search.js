/* OLEN GO destination suggestions: inline results, explicit selected origin.
   Open-Meteo/GeoNames supplies city suggestions; existing full lookup is used
   only on an explicit search. Never autocomplete against public Nominatim. */
(function(){
 'use strict';
 const input=document.getElementById('rzDestination'),list=document.getElementById('rzDestinationSuggestions');
 const status=document.getElementById('rzGoSearchStatus'),discover=document.getElementById('rzDiscoverTrails');
 if(!input||!list)return;
 let selected=null,timer=null,serial=0,controller=null,items=[],cursor=-1;
 const cache=new Map();
 function message(text){if(status){status.textContent=text;status.hidden=!text}}
 function originLabel(){
  if(discover)discover.textContent=selected?'Descobrir trilhos em '+selected.name:
   input.value.trim()?'Descobrir trilhos neste local':'Descobrir trilhos perto de mim';
  const hint=document.getElementById('rzTrailSearchOrigin');
  if(hint)hint.textContent=selected?'Pesquisa num raio de 30 km de '+selected.name+'.':
   input.value.trim()?'Escolhe uma sugestão para definir a zona da pesquisa.':'Sem destino, a pesquisa usa a tua posição GPS, num raio de 30 km.';
 }
 function clear(){list.replaceChildren();list.hidden=true;items=[];cursor=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant')}
 function choose(place){
  serial++;clearTimeout(timer);controller?.abort();
  selected={...place};input.value=place.name;clear();message('Local escolhido · '+[place.name,place.admin1,place.country].filter(Boolean).join(' · '));originLabel();
  input.dispatchEvent(new Event('olen-destination-selected',{bubbles:true}));
 }
 function render(results){
  clear();const seen=new Set();items=results.filter(p=>{
   if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))return false;
   const key=[p.name,p.admin1,p.country,p.latitude,p.longitude].join('|');if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,6);
  items.forEach((p,i)=>{
   const b=document.createElement('button');b.type='button';b.id='rzDestinationOption'+i;b.setAttribute('role','option');b.setAttribute('aria-selected','false');
   const img=document.createElement('img');img.src=window.OLENManeuvers.resolve('location').asset;img.alt='';
   const copy=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small');
   title.textContent=p.name;sub.textContent=[p.admin1,p.country].filter(Boolean).join(' · ');copy.append(title,sub);b.append(img,copy);
   b.addEventListener('click',()=>choose(p));list.appendChild(b);
  });
  list.hidden=!items.length;input.setAttribute('aria-expanded',String(!!items.length));
  message(items.length?'Escolhe o local na lista.':'Sem sugestões. Usa Pesquisar local para procurar uma morada ou outro destino.');
 }
 async function suggestions(q,version){
  if(controller)controller.abort();controller=new AbortController();
  try{
   let results=cache.get(q.toLocaleLowerCase('pt-PT'));
   if(!results){const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=6&language=pt&format=json',{signal:controller.signal});
    if(!r.ok)throw Error('Sugestões temporariamente indisponíveis.');const data=await r.json();
    results=(data.results||[]).map(p=>({name:p.name,latitude:p.latitude,longitude:p.longitude,admin1:p.admin1||'',country:p.country||'',source:'Open-Meteo / GeoNames'}));cache.set(q.toLocaleLowerCase('pt-PT'),results);
   }
   if(version===serial&&input.value.trim()===q)render(results);
  }catch(e){if(version===serial&&e.name!=='AbortError')message('Usa Pesquisar local para encontrar o destino.');}
 }
 async function search(){
  const q=input.value.trim();if(q.length<2){message('Escreve uma localidade ou morada.');return null}
  if(selected&&selected.name===q)return selected;
  const version=++serial;clearTimeout(timer);controller?.abort();message('A pesquisar locais…');
  try{const results=await window.OLENMapRouting.lookupDestination(q);if(version!==serial||q!==input.value.trim())return null;
   if(results.length===1){choose(results[0]);return selected}render(results);return null;
  }catch(e){if(version===serial)message(e.message||'Não foi possível pesquisar o local.');return null}
 }
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
 input.addEventListener('input',()=>{selected=null;serial++;clearTimeout(timer);controller?.abort();clear();message('');originLabel();const q=input.value.trim();if(q.length>=3){const version=serial;timer=setTimeout(()=>suggestions(q,version),700)}});
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){clear();return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   if(!items.length)return;event.preventDefault();cursor=(cursor+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
   [...list.children].forEach((b,i)=>b.setAttribute('aria-selected',String(i===cursor)));input.setAttribute('aria-activedescendant',list.children[cursor].id);
  }else if(event.key==='Enter'){event.preventDefault();if(cursor>=0&&items[cursor])choose(items[cursor]);else search()}
 });
 document.getElementById('rzSearchDestination')?.addEventListener('click',search);
 const modeIcons={walk:'walking',bike:'bicycle',scooter:'scooter',moto:'motorcycle',car:'car',camper:'camper',transit:'carpool',boat:'ferry',air:'plane'};
 document.querySelectorAll('#rzModes button').forEach(button=>{
  const label=button.querySelector('b')?.textContent||button.dataset.mode;button.setAttribute('aria-label',label);button.title=label;
  const host=button.querySelector('i');if(host){const img=document.createElement('img');img.src=window.OLENManeuvers.resolve(modeIcons[button.dataset.mode]).asset;img.alt='';host.replaceChildren(img)}
 });
 originLabel();
 window.OLENDestinationSearch=Object.freeze({search,choose,get selected(){return selected&&selected.name===input.value.trim()?{...selected}:null},clear(){selected=null;clear();message('');originLabel()}});
})();

const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
 const nodes=new Map();class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.attributes={};this.hidden=false;this.value='';this.dataset={};this.classList={add(){},toggle(){}}}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn)} async fire(k,e={}){for(const fn of this.events[k]||[])await fn(e)} click(){return this.fire('click')}
  append(...v){this.children.push(...v)} appendChild(v){this.children.push(v);return v} replaceChildren(...v){this.children=v} setAttribute(k,v){this.attributes[k]=v} removeAttribute(k){delete this.attributes[k]}
  dispatchEvent(e){this.fire(e.type)} querySelector(){return null} scrollIntoView(){}
 }
 const node=id=>{if(!nodes.has(id)){const n=new Element();n.id=id;nodes.set(id,n)}return nodes.get(id)};
 const document={getElementById:node,createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),querySelectorAll:()=>[]};
 const window={localStorage:null,OLENManeuvers:{resolve:()=>({asset:'assets/maneuvers/olen-maneuver-55.png'})}};
 const context={window,document,Event:class{constructor(type){this.type=type}},AbortController,console,setTimeout:fn=>{context.pending=fn;return 1},clearTimeout(){},navigator:{}};
 const run=name=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/',name),'utf8'),context);
 const text=n=>[n.textContent||'',...n.children.map(text)].join(' ');
 return {context,window,node,run,text};
}
test('city suggestions stay inline; selecting one controls the search origin and editing invalidates it',async()=>{
 const h=fixture();let requests=0;h.context.fetch=async url=>{requests++;assert.match(url,/geocoding-api.open-meteo.com/);return {ok:true,json:async()=>({results:[{name:'Porto',latitude:41.15,longitude:-8.61,admin1:'Porto',country:'Portugal'}]})}};
 h.window.OLENMapRouting={lookupDestination:async()=>[]};h.run('olen-go-search.js');h.node('rzDestination').value='Porto';await h.node('rzDestination').fire('input');await h.context.pending();
 assert.equal(requests,1);assert.equal(h.node('rzDestinationSuggestions').children.length,1);assert.equal(h.node('rzDestinationSuggestions').hidden,false);
 await h.node('rzDestinationSuggestions').children[0].click();assert.equal(h.window.OLENDestinationSearch.selected.latitude,41.15);assert.match(h.node('rzDiscoverTrails').textContent,/Porto/);
 h.node('rzDestination').value='Lisboa';await h.node('rzDestination').fire('input');assert.equal(h.window.OLENDestinationSearch.selected,null);
});
function discovery(){
 const h=fixture(),origins=[];let gps=0,prepared=0;
 const trail={name:'Percurso publicado',id:'osm:relation:1',segments:[[{latitude:41.15,longitude:-8.61},{latitude:41.151,longitude:-8.611}]],metersFromSearch:123,provenance:{type:'openstreetmap',sourceUrl:'https://www.openstreetmap.org/relation/1'}};
 h.window.OLENTrailsCatalog={create:()=>({nearby:async origin=>{origins.push(origin);return {trails:[trail],source:'openstreetmap'}}}),distance:()=>140};
 h.window.OLENMapRouting={formatDistance:n=>Math.round(n)+' m',previewTrail:async()=>{prepared++}};
 h.window.OLENDestinationSearch={selected:null,search:async()=>null,clear(){this.selected=null}};
 h.context.navigator={geolocation:{getCurrentPosition:fn=>{gps++;fn({coords:{latitude:38.72,longitude:-9.14,accuracy:20}})}}};
 h.run('olen-trail-discovery-ui.js');return {...h,origins,trail,get gps(){return gps},get prepared(){return prepared}};
}
test('chosen locality wins over GPS and results use Chat cards with grounded facts',async()=>{
 const h=discovery();h.node('rzDestination').value='Porto';h.window.OLENDestinationSearch.selected={name:'Porto',latitude:41.15,longitude:-8.61};await h.node('rzDiscoverTrails').click();
 assert.equal(h.gps,0);assert.equal(h.origins[0].latitude,41.15);assert.match(h.text(h.node('rzNearbyTrails')),/Não indicada pela fonte/);assert.match(h.text(h.node('rzNearbyTrails')),/reports públicos indisponíveis/);
 const card=h.node('rzNearbyTrails').children.at(-1).children[0];assert.equal(card.className,'olen-place-card olen-px-card');const actions=card.children[1].children.at(-1);await actions.children[0].click();assert.match(h.text(h.node('rzTrailFacts')),/Estado atual não confirmado/);assert.equal(h.prepared,0);await actions.children[1].click();assert.equal(h.prepared,1);assert.equal(h.node('rzGoPop').hidden,true);
});
test('empty destination uses GPS; ambiguous text never silently chooses a locality',async()=>{
 const h=discovery();await h.node('rzDiscoverTrails').click();assert.equal(h.gps,1);assert.equal(h.origins[0].latitude,38.72);
 h.node('rzDestination').value='Porto';await h.node('rzDiscoverTrails').click();assert.equal(h.origins.length,1);assert.equal(h.gps,1);
});

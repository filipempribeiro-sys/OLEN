const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-maneuvers.js'),'utf8');
function load(){
 const nodes=new Map();
 const img={hidden:false,attrs:{},style:{},setAttribute(k,v){this.attrs[k]=v},
  getAttribute(k){return this.attrs[k]||null},removeAttribute(k){delete this.attrs[k]}};
 const svg={style:{display:''},insertAdjacentElement(_where,element){nodes.set(element.id,element)}};
 const pathNode={closest:()=>svg};
 nodes.set('rzManeuverPath',pathNode);
 for(const id of ['rzGuideText','rzRoadName','rzNextDistance','rzRoadLine'])
  nodes.set(id,{textContent:'',hidden:false});
 const document={getElementById:id=>nodes.get(id)||null,
  querySelector:()=>svg,createElement:tag=>{assert.equal(tag,'img');return img}};
 const window={};
 vm.runInNewContext(source,{window,document},{filename:'olen-maneuvers.js'});
 return {api:window.OLENManeuvers,guide:window.OLENNavigationGuide,svg,img,nodes};
}
test('96 historical PNG entries remain mapped; 74 is camper',()=>{
 const {api}=load();
 assert.equal(Object.keys(api.registry).length,96);
 assert.equal(api.registry[74].key,'camper');
 assert.equal(api.registry[74].asset,'assets/maneuvers/olen-maneuver-74.png');
 assert.equal(api.registry[92].key,'plane');
 assert.equal(api.registry[96].key,'helicopter');
});
test('straight maps to PNG 01 and ordinary right turn maps to PNG 02',()=>{
 const {api}=load();
 assert.equal(api.resolve('straight').id,1);
 assert.equal(api.resolve({type:'turn-right'}).id,2);
});
test('unrecognised provider instruction never creates a straight arrow',()=>{
 const {api}=load();
 const result=api.resolve({provider:'mapbox',type:'unlisted-turn'});
 assert.equal(result.key,'unknown');assert.equal(result.asset,null);
});
test('an unknown step hides a previous arrow and retains verified text',()=>{
 const {guide,img,nodes,svg}=load();
 guide.set({type:'turn-right',instruction:'Vira à direita',road:'Rua A',distance:'30 m'});
 assert.equal(img.attrs.src,'assets/maneuvers/olen-maneuver-02.png');
 guide.set({provider:'tomtom',type:'unexpected-turn',instruction:'Confirma a indicação',road:'Rua B',distance:'90 m'});
 assert.equal(img.hidden,true);assert.equal(img.attrs.src,undefined);
 assert.equal(nodes.get('rzGuideText').textContent,'Confirma a indicação');
 assert.equal(svg.style.display,'none');
});
test('missing icon image is hidden rather than showing a false arrow',()=>{
 const {guide,img}=load();
 guide.set({type:'turn-right',instruction:'Vira à direita'});
 img.onerror();
 assert.equal(img.hidden,true);
});
test('full provider step keeps roundabout exit number through set()',()=>{
 const {guide,img}=load();
 const step={provider:'mapbox',type:'roundabout',exitNumber:2,instruction:'Usa a segunda saída'};
 const resolved=guide.set(step);
 assert.equal(resolved.id,47);
 assert.equal(img.attrs.src,'assets/maneuvers/olen-maneuver-47.png');
});
test('provider-specific unknown ramp does not claim going straight',()=>{
 const {api}=load();
 assert.equal(api.resolve({provider:'mapbox',type:'on-ramp'}).key,'unknown');
 assert.equal(api.resolve({provider:'tomtom',type:'invented'}).key,'unknown');
});
test('unchanged approved mobility icons retain their identities',()=>{
 const {api}=load();
 assert.equal(api.resolve('autocaravana').id,74);
 assert.equal(api.resolve('mota').id,93);
 assert.equal(api.resolve('bicicleta').id,95);
});


test('Google, Mapbox, HERE and TomTom return the same safe canonical right turn',()=>{
 const {api}=load();
 const samples=[
  {provider:'google',type:'TURN_RIGHT'},
  {provider:'mapbox',type:'turn',modifier:'right'},
  {provider:'here',type:'right-turn'},
  {provider:'tomtom',type:'TURN_RIGHT'}
 ];
 for(const input of samples)assert.equal(api.resolve(input).id,2);
});
test('verified roundabout exits map only to the six approved dedicated PNGs',()=>{
 const {api}=load();
 for(const provider of ['google','mapbox','here','tomtom']){
  const type=provider==='google'?'ROUNDABOUT_RIGHT':
   provider==='here'?'roundabout-exit':
   provider==='tomtom'?'roundabout-right':'roundabout';
  assert.equal(api.resolve({provider,type,exitNumber:2}).id,47);
  assert.equal(api.resolve({provider,type,exitNumber:8}).id,40);
 }
});
test('unknown roundabout exit does not default to first exit',()=>{
 const {api}=load();
 assert.equal(api.resolve({provider:'mapbox',type:'roundabout'}).id,40);
 assert.equal(api.resolve({provider:'mapbox',type:'roundabout',exitNumber:99}).id,40);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-maneuvers.js'),'utf8');
function load(){
 const nodes=new Map();
 const img={hidden:false,attrs:{},style:{},dataset:{},setAttribute(k,v){this.attrs[k]=v},
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

test('camelCase and SCREAMING_SNAKE_CASE provider variants are equivalent',()=>{
 const {api}=load();
 assert.equal(api.resolve({provider:'here',type:'rightTurn'}).id,2);
 assert.equal(api.resolve({provider:'tomtom',type:'turnRight'}).id,2);
 assert.equal(api.resolve({provider:'google',type:'TURN_RIGHT'}).id,2);
 assert.equal(api.resolve({provider:'mapbox',type:'roundaboutTurn',exitNumber:2}).id,47);
});

test('uncertified motorway ramp types do not display ordinary turn arrows',()=>{
 const {api}=load();
 const samples=[
  {provider:'google',type:'RAMP_RIGHT'},
  {provider:'mapbox',type:'on ramp',modifier:'right'},
  {provider:'tomtom',type:'TAKE_EXIT'},
  {provider:'tomtom',type:'motorwayExitLeft'}
 ];
 for(const sample of samples)assert.equal(api.resolve(sample).key,'unknown');
});

test('a failed PNG remains hidden on repeated fixes but a different maneuver can load',()=>{
 const {guide,img}=load();
 guide.set({type:'turn-right',instruction:'Vira à direita'});
 img.onerror();
 assert.equal(img.hidden,true);
 guide.set({type:'turn-right',instruction:'Vira à direita',distance:'20 m'});
 assert.equal(img.hidden,true);
 guide.set({type:'turn-left',instruction:'Vira à esquerda'});
 assert.equal(img.attrs.src,'assets/maneuvers/olen-maneuver-03.png');
 img.onload();
 assert.equal(img.hidden,false);
});

test('full Google RouteLegStep navigationInstruction resolves without pre-flattening',()=>{
 const {api}=load();
 const item=api.resolve({provider:'google',navigationInstruction:{maneuver:'TURN_LEFT',instructions:'Turn left'}});
 assert.equal(item.id,3);
});
test('full Mapbox step maneuver object preserves type, modifier and roundabout exit',()=>{
 const {api}=load();
 assert.equal(api.resolve({provider:'mapbox',maneuver:{type:'turn',modifier:'right'}}).id,2);
 assert.equal(api.resolve({provider:'mapbox',maneuver:{type:'roundabout',exit:3}}).id,48);
});
test('HERE action plus direction and TomTom instructionType use safe provider fields',()=>{
 const {api}=load();
 assert.equal(api.resolve({provider:'here',action:'turn',direction:'left'}).id,3);
 assert.equal(api.resolve({provider:'here',action:'keep',direction:'right'}).id,12);
 assert.equal(api.resolve({provider:'tomtom',instructionType:'TURN_RIGHT'}).id,2);
});

test('Google Routes documented maneuver enum has deterministic safe visual resolution',()=>{
 const {api}=load();
 const cases={
  TURN_SLIGHT_LEFT:5,TURN_SHARP_LEFT:6,UTURN_LEFT:39,TURN_LEFT:3,
  TURN_SLIGHT_RIGHT:4,TURN_SHARP_RIGHT:7,UTURN_RIGHT:38,TURN_RIGHT:2,
  STRAIGHT:1,RAMP_LEFT:0,RAMP_RIGHT:0,MERGE:11,FORK_LEFT:9,FORK_RIGHT:10,
  FERRY:66,FERRY_TRAIN:66,ROUNDABOUT_LEFT:40,ROUNDABOUT_RIGHT:40,DEPART:54,NAME_CHANGE:1,
  MANEUVER_UNSPECIFIED:0
 };
 for(const [type,id] of Object.entries(cases))assert.equal(api.resolve({provider:'google',type}).id,id,type);
});
test('Mapbox documented maneuver types resolve safely, including numbered roundabouts',()=>{
 const {api}=load();
 const samples=[
  [{provider:'mapbox',type:'turn',modifier:'right'},2],
  [{provider:'mapbox',type:'new name'},1],
  [{provider:'mapbox',type:'depart'},54],
  [{provider:'mapbox',type:'arrive'},53],
  [{provider:'mapbox',type:'merge',modifier:'right'},11],
  [{provider:'mapbox',type:'on ramp',modifier:'right'},0],
  [{provider:'mapbox',type:'off ramp',modifier:'left'},0],
  [{provider:'mapbox',type:'fork',modifier:'left'},9],
  [{provider:'mapbox',type:'end of road',modifier:'left'},3],
  [{provider:'mapbox',type:'continue',modifier:'straight'},1],
  [{provider:'mapbox',type:'roundabout',exitNumber:2},47],
  [{provider:'mapbox',type:'rotary'},40],
  [{provider:'mapbox',type:'roundabout turn',exitNumber:3},48],
  [{provider:'mapbox',type:'notification',mode:'ferry'},66],
  [{provider:'mapbox',type:'exit roundabout',exitNumber:4},49],
  [{provider:'mapbox',type:'exit rotary',exitNumber:5},50]
 ];
 for(const [input,id] of samples)assert.equal(api.resolve(input).id,id,JSON.stringify(input));
});

test('left-hand roundabout mirrors only the roundabout asset and resets afterwards',()=>{
 const {guide,img}=load();
 guide.set({provider:'mapbox',type:'roundabout',exitNumber:2,drivingSide:'left',instruction:'Segunda saída'});
 assert.equal(img.style.transform,'scaleX(-1)');
 guide.set({provider:'mapbox',type:'roundabout',exitNumber:2,drivingSide:'right',instruction:'Segunda saída'});
 assert.equal(img.style.transform,'');
 guide.set({type:'turn-right',drivingSide:'left',instruction:'Vira à direita'});
 assert.equal(img.style.transform,'');
});

test('provider-native text, road and distance populate HUD without stale values',()=>{
 const {guide,nodes}=load();
 guide.set({type:'turn-right',instruction:'Vira à direita',road:'Rua Antiga',distance:'30 m'});
 guide.set({provider:'google',navigationInstruction:{maneuver:'TURN_LEFT',instructions:'Vira à esquerda'},
  name:'Avenida Nova',distanceMeters:1250});
 assert.equal(nodes.get('rzGuideText').textContent,'Vira à esquerda');
 assert.equal(nodes.get('rzRoadName').textContent,'Avenida Nova');
 assert.equal(nodes.get('rzNextDistance').textContent,'1,3 km');
 assert.equal(nodes.get('rzRoadLine').hidden,false);
});
test('unknown provider step clears stale road and stale distance safely',()=>{
 const {guide,nodes}=load();
 guide.set({type:'turn-right',instruction:'Vira à direita',road:'Rua Antiga',distance:'30 m'});
 guide.set({provider:'tomtom',instructionType:'UNSUPPORTED_MANEUVER'});
 assert.equal(nodes.get('rzGuideText').textContent,'Confirma a próxima indicação no mapa.');
 assert.equal(nodes.get('rzRoadName').textContent,'');
 assert.equal(nodes.get('rzRoadLine').hidden,true);
 assert.equal(nodes.get('rzNextDistance').textContent,'—');
});

test('Mapbox numeric step distance is formatted as metres for the HUD',()=>{
 const {guide,nodes}=load();
 guide.set({provider:'mapbox',maneuver:{type:'turn',modifier:'right'},instruction:'Vira à direita',name:'Rua B',distance:236.9});
 assert.equal(nodes.get('rzNextDistance').textContent,'237 m');
});

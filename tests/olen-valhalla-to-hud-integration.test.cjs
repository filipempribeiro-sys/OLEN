const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const routing=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
const maneuvers=fs.readFileSync(path.join(__dirname,'../js/olen-maneuvers.js'),'utf8');

function guideFixture(){
 const nodes=new Map();
 const img={hidden:false,attrs:{},style:{},dataset:{},
  setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]||null},
  removeAttribute(k){delete this.attrs[k]}};
 const svg={style:{},insertAdjacentElement(_where,el){nodes.set(el.id,el)}};
 nodes.set('rzManeuverPath',{closest:()=>svg});
 for(const id of ['rzGuideText','rzRoadName','rzNextDistance','rzRoadLine'])
  nodes.set(id,{textContent:'',hidden:false,parentElement:null});
 const hint={innerHTML:'até à próxima<br>indicação',textContent:'',dataset:{},
  setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}};
 nodes.get('rzNextDistance').parentElement={querySelector:()=>hint};
 const document={getElementById:id=>nodes.get(id)||null,
  querySelector:()=>svg,createElement:()=>img};
 const window={};
 vm.runInNewContext(maneuvers,{window,document},{filename:'olen-maneuvers.js'});
 return {window,document,nodes,img,hint};
}
function routingParts(){
 const n0=routing.indexOf('function normalizeRouteManeuvers(routeResult){');
 const n1=routing.indexOf('function validated(',n0);
 const m0=routing.indexOf('function maneuverType(type){');
 const m1=routing.indexOf('function updatePosition(c){',m0);
 assert.ok(n0>=0&&n1>n0&&m0>=0&&m1>m0);
 const normalize=new Function(routing.slice(n0,n1)+'\nreturn normalizeRouteManeuvers;')();
 return {normalize,block:routing.slice(m0,m1)};
}
function driveRaw(rawStep){
 const ui=guideFixture(),{normalize,block}=routingParts();
 const route=normalize({source:'Valhalla',distanceMeters:1800,durationSeconds:900,
  maneuvers:[rawStep]});
 const curve=[{meters:0,point:{lat:38,lon:-9}},
  {meters:700,point:{lat:38.01,lon:-9.01}},
  {meters:1800,point:{lat:38.02,lon:-9.02}}];
 const $=id=>{
  if(id==='rzNextDistance')return ui.nodes.get(id);
  if(!ui.nodes.has(id))ui.nodes.set(id,{textContent:'',querySelector(){return null}});
  return ui.nodes.get(id);
 };
 const context={active:true,route,curve,destination:{name:'Destino'},mode:'car',
  last:null,following:false,map:null,window:ui.window,$,notice(){},
  getNearest:()=>({idx:0,delta:3}),stepFor:()=>route.maneuvers[0],
  formatDistance:m=>Math.round(m)+' m'};
 const run=new Function('context',
  'const {active,route,curve,destination,mode,last,following,map,window,$,notice,getNearest,stepFor,formatDistance}=context;'+
  'let lastManeuverKey="",offRoute=false;'+block+';return updateInstruction;');
 run(context)({lat:38,lon:-9});
 return {...ui,step:route.maneuvers[0]};
}

test('raw Valhalla right turn reaches the approved OLEN PNG and HUD text',()=>{
 const out=driveRaw({type:10,begin_shape_index:1,instruction:'Vira à direita',
  street_names:['Rua do Jardim']});
 assert.equal(out.step.provider,'valhalla');
 assert.equal(out.img.attrs.src,'assets/maneuvers/olen-maneuver-02.png');
 assert.equal(out.nodes.get('rzGuideText').textContent,'Vira à direita');
 assert.equal(out.nodes.get('rzRoadName').textContent,'Rua do Jardim');
 assert.equal(out.nodes.get('rzNextDistance').textContent,'700 m');
});

test('raw Valhalla roundabout exit count reaches the numbered OLEN PNG',()=>{
 const out=driveRaw({type:26,begin_shape_index:1,roundabout_exit_count:4,
  instruction:'Na rotunda, segue pela 4.ª saída',street_names:['Rotunda Central']});
 assert.equal(out.step.exitNumber,4);
 assert.equal(out.img.attrs.src,'assets/maneuvers/olen-maneuver-49.png');
 assert.equal(out.nodes.get('rzGuideText').textContent,'Na rotunda, segue pela 4.ª saída');
});

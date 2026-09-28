const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {fromRoute}=require('../js/olen-osrm-adapter.js');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-maneuvers.js'),'utf8');

function guide(){
 const nodes=new Map();
 const img={hidden:false,attrs:{},style:{},dataset:{},
  setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]||null},
  removeAttribute(k){delete this.attrs[k]}};
 const svg={style:{},insertAdjacentElement(_where,el){nodes.set(el.id,el)}};
 nodes.set('rzManeuverPath',{closest:()=>svg});
 for(const id of ['rzGuideText','rzRoadName','rzNextDistance','rzRoadLine'])
  nodes.set(id,{textContent:'',hidden:false});
 const document={getElementById:id=>nodes.get(id)||null,querySelector:()=>svg,createElement:()=>img};
 const window={};vm.runInNewContext(source,{window,document});
 return {window,nodes,img};
}
const base={distance:1000,duration:600,geometry:{type:'LineString',
 coordinates:[[-9.13,38.72],[-9.125,38.725],[-9.12,38.73]]}};

test('real OSRM right-turn object resolves to OLEN turn-right PNG',()=>{
 const raw={...base,legs:[{steps:[{maneuver:{type:'turn',modifier:'right',location:[-9.125,38.725]},
  name:'Rua Nova',distance:300}]}]};
 const step=fromRoute(raw,'car','OSRM road').maneuvers[0];
 const ui=guide();ui.window.OLENNavigationGuide.set({...step,distance:'100 m'});
 assert.equal(step.provider,'osrm');
 assert.equal(ui.img.attrs.src,'assets/maneuvers/olen-maneuver-02.png');
 assert.equal(ui.nodes.get('rzGuideText').textContent,'Vira à direita');
 assert.equal(ui.nodes.get('rzRoadName').textContent,'Rua Nova');
});

test('real OSRM numbered roundabout resolves to matching approved exit PNG',()=>{
 const raw={...base,legs:[{steps:[{maneuver:{type:'roundabout',exit:2,location:[-9.125,38.725]},
  driving_side:'right',name:'Rotunda',distance:300}]}]};
 const step=fromRoute(raw,'car','OSRM road').maneuvers[0];
 const ui=guide();ui.window.OLENNavigationGuide.set({...step,distance:'80 m'});
 assert.equal(step.exitNumber,2);
 assert.equal(ui.img.attrs.src,'assets/maneuvers/olen-maneuver-47.png');
 assert.match(ui.nodes.get('rzGuideText').textContent,/2\.ª saída/);
});

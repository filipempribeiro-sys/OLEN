const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routing=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../js/olen-go-runtime.js'),'utf8');
function driver(step){
 const start=routing.indexOf('function updateLaneCue(step){');
 const end=routing.indexOf('function updatePosition(c){',start);
 assert.ok(start>=0&&end>start);
 const nodes=new Map();
 const hint={innerHTML:'até à próxima<br>indicação',textContent:'',dataset:{},title:'',
  setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}};
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',
  parentElement:id==='rzNextDistance'?{querySelector:()=>hint}:null,
  querySelector(){return {textContent:'',querySelectorAll(){return []}}},querySelectorAll(){return []}});return nodes.get(id)}
 const calls=[],window={OLENNavigationGuide:{set:data=>calls.push(data)},L:null};
 const route={distanceMeters:2000,durationSeconds:1200,maneuvers:step?[step]:[]};
 const curve=[{meters:0,point:{lat:38,lon:-9}},{meters:800,point:{lat:38.01,lon:-9.01}}];
 const context={active:true,route,curve,destination:{name:'Lisboa'},mode:'car',last:null,
  following:false,map:null,window,$:node,notice(){},getNearest:()=>({idx:0,delta:3}),
  stepFor:()=>step||null,formatDistance:m=>Math.round(m)+' m',
  maneuverType:type=>type==='turn-right'?'turn-right':'unknown'};
 const make=new Function('context','const {active,route,curve,destination,mode,last,following,map,window,$,notice,getNearest,stepFor,formatDistance,maneuverType}=context;let lastManeuverKey="";'+routing.slice(start,end)+';return updateInstruction;');
 make(context)({lat:38,lon:-9});
 return {calls,nodes,hint};
}
test('real OSRM turn is sent to guide with road, distance and lane data',()=>{
 const step={type:'turn-right',instruction:'Vira à direita',road:'Rua Nova',
  pointIndex:1,lanes:[{active:true,valid:true,indications:['right']}]};
 const {calls}=driver(step);assert.equal(calls.length,1);
 assert.equal(calls[0].type,'turn-right');
 assert.equal(calls[0].road,'Rua Nova');
 assert.equal(calls[0].distance,'800 m');
 assert.equal(calls[0].lanes[0].active,true);
});
test('provider-specific roundabout exit survives route-to-HUD integration',()=>{
 const step={provider:'mapbox',type:'roundabout',exitNumber:7,pointIndex:1,
  instruction:'Usa a sétima saída',road:'Rotunda Norte'};
 const {calls}=driver(step);assert.equal(calls[0].provider,'mapbox');
 assert.equal(calls[0].exitNumber,7);
 assert.equal(calls[0].instruction,'Usa a sétima saída');
});
test('missing step sends a neutral instruction rather than fictitious straight',()=>{
 const {calls}=driver(null);assert.equal(calls[0].type,'unknown');
 assert.equal(calls[0].instruction,'Confirma a próxima indicação no percurso.');
});
test('starting GO never overwrites route instructions with demonstration street',()=>{
 const start=runtime.indexOf('function beginSession(');
 const end=runtime.indexOf('function start(){',start);
 assert.ok(start>=0&&end>start);
 const block=runtime.slice(start,end);
 assert.equal(block.includes('R. Damião de Góis'),false);
 assert.equal(block.includes('type:"straight"'),false);
 assert.equal(block.includes("type:'unknown'"),true);
});

test('live lane cue shows only provider-verified valid/active lanes',()=>{
 const step={type:'turn-right',instruction:'Vira à direita',pointIndex:1,
  lanes:[{valid:false,active:false},{valid:true,active:true},{valid:true,active:false}]};
 const {hint}=driver(step);
 assert.equal(hint.textContent,'Faixa 2/3');
 assert.equal(hint.dataset.olenLaneCue,'1');
});
test('missing lane data preserves original GO arrival hint',()=>{
 const {hint}=driver({type:'turn-right',pointIndex:1,instruction:'Vira à direita'});
 assert.equal(hint.innerHTML,'até à próxima<br>indicação');
 assert.equal(hint.dataset.olenLaneCue,'0');
});

test('switching from road GO to Trail GO explicitly clears the previous turn image',()=>{
 const first=runtime.indexOf('if(trailMode){',runtime.indexOf('function beginSession('));
 const last=runtime.indexOf('t0=recovered?.startedAt',first);
 assert.ok(first>=0&&last>first);
 const calls=[],labels=new Map();
 const $=id=>{if(!labels.has(id))labels.set(id,{textContent:''});return labels.get(id)};
 const win={OLENNavigationGuide:{set:data=>calls.push(data)}};
 new Function('window','$','trailMode','free',runtime.slice(first,last))(win,$,true,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].type,'unknown');
 assert.equal(calls[0].road,'Percurso importado · homologação por verificar');
 assert.equal(calls[0].distance,'—');
});

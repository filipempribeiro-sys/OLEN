/* Deterministic GO maneuver transition checks, no real GPS or network.
   Run: node --test tests/olen-maneuvers-sequence.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
const start=source.indexOf('function updateLaneCue(step){');
const end=source.indexOf('function updatePosition(c){',start);
assert.ok(start>=0&&end>start,'real routing implementation exists');
function fixture(){
 const calls=[],notices=[],nodes=new Map();
 const hint={dataset:{},innerHTML:'até à próxima<br>indicação',textContent:'',
  setAttribute(){},removeAttribute(){}};
 function $(id){
  if(!nodes.has(id))nodes.set(id,{textContent:'',parentElement:{querySelector:()=>hint},
   querySelector(){return id==='rzBottom'?{querySelectorAll:()=>[
    {textContent:''},{textContent:''}]}:null;}});
  return nodes.get(id);
 }
 const steps=[
  {type:'turn-right',pointIndex:1,instruction:'Vira à direita',road:'Rua A',exitNumber:null},
  {type:'turn-left',pointIndex:2,instruction:'Vira à esquerda',road:'Rua B'}
 ];
 const curve=[0,200,600,950,1000].map(m=>({meters:m,point:{lat:38,lon:-9}}));
 const c={active:true,route:{distanceMeters:1000,durationSeconds:600,maneuvers:steps},curve,
  destination:{name:'Teste'},mode:'car',last:null,following:false,map:null,
  window:{OLENNavigationGuide:{set:payload=>calls.push(payload)},L:null},$,
  notice:(message,error)=>notices.push({message,error}),getNearest:pos=>({idx:pos.idx,delta:pos.outside?160:3}),
  stepFor:index=>steps.find(step=>step.pointIndex>=index)||null,
  formatDistance:m=>Math.round(m)+' m',maneuverType:type=>type||'unknown'};
 const run=new Function('context',
  'const {active,route,curve,destination,mode,last,following,map,window,$,notice,getNearest,stepFor,formatDistance,maneuverType}=context;'+
  'let offRoute=false,lastManeuverKey="";'+source.slice(start,end)+';return updateInstruction;')(c);
 return {run,calls,nodes,hint,notices};
}
test('right then left: real maneuver changes once, distance refresh does not create extra turns',()=>{
 const f=fixture();f.run({idx:0});f.run({idx:0});f.run({idx:1});f.run({idx:2});
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[0].type,'turn-right');
 assert.equal(f.calls[1].type,'turn-left');
 assert.equal(f.nodes.get('rzNextDistance').textContent,'0 m');
});
test('no step and arrival never create an unverified straight arrow',()=>{
 const f=fixture();f.run({idx:3});f.run({idx:4});
 assert.equal(f.calls[0].type,'unknown');
 assert.equal(f.calls[1].type,'finish');
 assert.equal(f.calls[1].road,'');
});
test('off route removes old turn and reentry restores the current real turn',()=>{
 const f=fixture();f.run({idx:0});f.run({idx:0,outside:true});f.run({idx:0,outside:true});
 f.run({idx:1});
 assert.equal(f.calls.length,3);
 assert.equal(f.calls[1].type,'unknown');
 assert.equal(f.calls[1].distance,'—');
 assert.equal(f.calls[2].type,'turn-right');
});

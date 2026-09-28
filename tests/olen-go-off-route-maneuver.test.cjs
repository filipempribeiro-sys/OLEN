const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routing=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
function harness(){
 const a=routing.indexOf('function laneDirectionLabel(lane){');
 const b=routing.indexOf('function updatePosition(c){',a);
 assert.ok(a>=0&&b>a,'routing instruction implementation exists');
 const hint={innerHTML:'até à próxima<br>indicação',textContent:'',dataset:{},
  setAttribute(){},removeAttribute(){}};
 const nodes=new Map(),calls=[],notices=[];
 function $(id){
  if(id==='rzNextDistance')return {textContent:'',parentElement:{querySelector:()=>hint}};
  if(!nodes.has(id))nodes.set(id,{textContent:'',querySelector(){return null}});
  return nodes.get(id);
 }
 const context={active:true,route:{distanceMeters:1000,durationSeconds:600,
  maneuvers:[{type:'turn-right',instruction:'Vira à direita',road:'Rua Nova',pointIndex:1,
   lanes:[{valid:true,active:true}]}]},
  curve:[{point:{lat:38,lon:-9},meters:0},{point:{lat:38.01,lon:-9.01},meters:1000}],
  destination:{name:'Lisboa'},mode:'car',following:false,map:null,last:null,
  window:{OLENNavigationGuide:{set:payload=>calls.push(payload)},L:null},$,
  notice:(message,error)=>notices.push({message,error}),
  getNearest:pos=>({idx:0,delta:pos.outside?160:3}),stepFor:()=>context.route.maneuvers[0],
  formatDistance:meters=>Math.round(meters)+' m',maneuverType:type=>type};
 const f=new Function('c','const {active,route,curve,destination,mode,following,map,last,window,$,notice,getNearest,stepFor,formatDistance,maneuverType}=c;let offRoute=false,lastManeuverKey="";'+routing.slice(a,b)+';return updateInstruction;');
 return {update:f(context),calls,notices,hint};
}
test('leaving the confirmed route immediately removes the stale turning arrow and lanes',()=>{
 const h=harness();h.update({outside:false});
 assert.equal(h.calls[0].type,'turn-right');
 assert.equal(h.hint.dataset.olenLaneCue,'1');
 h.update({outside:true});
 assert.equal(h.calls[1].type,'unknown');
 assert.equal(h.calls[1].distance,'—');
 assert.equal(h.hint.dataset.olenLaneCue,'0');
 assert.match(h.calls[1].instruction,/Fora do percurso/);
});
test('GPS fluctuations outside route do not repeatedly reset HUD',()=>{
 const h=harness();h.update({outside:false});h.update({outside:true});h.update({outside:true});
 assert.equal(h.calls.length,2);
});
test('GPS returning to confirmed route restores real turn and verified lane cue',()=>{
 const h=harness();h.update({outside:false});h.update({outside:true});h.update({outside:false});
 assert.equal(h.calls.length,3);
 assert.equal(h.calls[2].type,'turn-right');
 assert.equal(h.hint.dataset.olenLaneCue,'1');
});

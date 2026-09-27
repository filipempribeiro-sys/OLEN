const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../js/',file),'utf8');
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
function boot(store){
 const nodes=new Map();let onFix=null,watchIds=0;
 function node(id){
  if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',textContent:'',
   classList:{add(){},remove(){},toggle(){},contains(){return false}},
   querySelectorAll(){return []},querySelector(){return {textContent:'',innerHTML:''}},
   appendChild(){},insertBefore(){},parentElement:{appendChild(){},insertBefore(){},querySelector(){return null}},
   focus(){},dataset:{},style:{}});
  return nodes.get(id);
 }
 const document={getElementById:node,querySelectorAll:()=>[],
  querySelector:q=>q.includes('rzModes')?{classList:{add(){}}}:null};
 const window={localStorage:store,OLENMapRouting:{beginGuidance:()=>false,
  updatePosition(){},stopGuidance(){},stopTrailGuidance(){},reportGpsError(){},state:{routeReady:false}},
  OLENGoExperience:{attach(){},finish(){}}};
 const navigator={geolocation:{watchPosition:fn=>{onFix=fn;return watchIds++},clearWatch(){}}};
 const context={window,document,navigator,setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){}};
 for(const file of ['olen-gps-track.js','olen-go-history.js','olen-go-runtime.js'])
  vm.runInNewContext(read(file),context,{filename:file});
 return {window,node,fix:sample=>onFix?.(sample)};
}
test('ALPHA free tracking starts without a prepared route and records accepted fixes',()=>{
 const ui=boot(storage());assert.equal(ui.window.OLENGoActivity.startFreeTracking(),true);
 ui.fix({coords:{latitude:38.72,longitude:-9.13,accuracy:5,speed:1},timestamp:1000});
 ui.fix({coords:{latitude:38.7201,longitude:-9.13,accuracy:5,speed:1},timestamp:5000});
 assert.equal(ui.window.OLENGoActivity.trackingLive,true);
 assert.ok(ui.window.OLENGoActivity.current.distanceMeters>10);
 assert.equal(ui.node('rzGuide').hidden,true);
});
test('interrupted GPS session resumes without resetting distance and STOP persists it',()=>{
 const store=storage(),first=boot(store);
 assert.equal(first.window.OLENGoActivity.startFreeTracking(),true);
 first.fix({coords:{latitude:38.72,longitude:-9.13,accuracy:5,speed:1},timestamp:1000});
 first.fix({coords:{latitude:38.7201,longitude:-9.13,accuracy:5,speed:1},timestamp:5000});
 const distance=first.window.OLENGoActivity.current.distanceMeters;
 const second=boot(store);assert.equal(second.window.OLENGoActivity.interrupted,true);
 assert.equal(second.window.OLENGoActivity.startFreeTracking(),false);
 assert.equal(second.window.OLENGoActivity.resumeFreeTracking(),true);
 assert.equal(second.window.OLENGoActivity.current.distanceMeters,distance);
 second.window.OLENGoActivity.stop();
 assert.equal(second.window.OLENGoActivity.history().length,1);
 assert.equal(second.window.OLENGoActivity.history()[0].distanceMeters,distance);
});

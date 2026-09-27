/* Run: node --test tests/olen-map-routing-regression.test.cjs
   Exercises the actual current routing module with simulated network responses.
   Does NOT establish that external routing servers or GPS work in production. */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
const adapter=require('../js/olen-osrm-adapter.js');
function resolver(fetcher){
 const cache=new Map(),status={textContent:'',hidden:true,classList:{toggle(){}}};
 const window={localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)}};
 const document={getElementById:id=>id==='olenMapStatus'?status:null};
 vm.runInNewContext(source,{window,document,fetch:fetcher,AbortController,
   setTimeout:()=>1,clearTimeout:()=>{}},{filename:'olen-map-routing.js'});
 return {routing:window.OLENMapRouting,status};
}
test('Worker geocode failure falls back to ALPHA Nominatim and caches the result',async()=>{
 const calls=[];
 const {routing}=resolver(async url=>{
  calls.push(String(url));
  if(String(url).includes('workers.dev'))throw new TypeError('Failed to fetch');
  return {ok:true,json:async()=>[{display_name:'Zambujeira do Mar, Beja, Portugal',
   lat:'37.52799',lon:'-8.78483',address:{state:'Beja',country:'Portugal'}}]};
 });
 const first=await routing.lookupDestination('Zambujeira');
 const second=await routing.lookupDestination('Zambujeira');
 assert.equal(first[0].latitude,37.52799);
 assert.equal(first[0].source,'OpenStreetMap Nominatim');
 assert.equal(second.length,1);
 assert.equal(calls.length,2);
});
test('Neither unavailable geocoder fabricates a destination',async()=>{
 const {routing}=resolver(async()=>{throw new TypeError('Failed to fetch')});
 await assert.rejects(()=>routing.lookupDestination('Zambujeira'),/Não foi possível consultar/);
});
test('ALPHA pedestrian and car fallback accepts only real route geometry',async()=>{
 const start={lat:38.72,lon:-9.13},dest={lat:38.73,lon:-9.12},calls=[];
 // Extract current internal provider implementation without exposing a new browser API.
 const first=source.indexOf('async function alphaRoute(');
 const last=source.indexOf('function routeDistances(){',first);
 assert.ok(first>=0&&last>first);
 const actual=source.slice(first,last);
 const network=async url=>{
  calls.push(String(url));
  return {ok:true,json:async()=>({code:'Ok',routes:[{
   distance:1500,duration:1100,
   geometry:{type:'LineString',coordinates:[[-9.13,38.72],[-9.12,38.73]]},
   legs:[{steps:[{maneuver:{type:'depart',location:[-9.13,38.72]},name:'Rua Inicial',distance:500},
    {maneuver:{type:'turn',modifier:'right',location:[-9.12,38.73]},name:'Rua Final',distance:1000}]}]
  }]})};
 };
 const meter=(a,b)=>Math.hypot(a.lat-b.lat,a.lon-b.lon)*111000;
 const provider=new Function('window','fetch','authenticatedPost','AbortController','setTimeout','clearTimeout','meters',
  actual+'\nreturn {resolveRoute,validated};')(
   {OLENOSRMAdapter:adapter},network,async()=>{throw new TypeError('Failed to fetch')},
   AbortController,()=>1,()=>{},meter);
 const walk=await provider.resolveRoute(start,dest,'walk');
 const car=await provider.resolveRoute(start,dest,'car');
 assert.equal(provider.validated(walk,start,dest,'walk'),true);
 assert.equal(walk.maneuvers[1].type,'turn-right');
 assert.equal(walk.maneuvers[1].road,'Rua Final');
 assert.equal(provider.validated(car,start,dest,'car'),true);
 assert.ok(calls[0].includes('/routed-foot/route/'));
 assert.ok(calls[1].includes('router.project-osrm.org'));
 await assert.rejects(()=>provider.resolveRoute(start,dest,'bike'),/Failed to fetch/);
 assert.equal(calls.length,2);
});

const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const model=require('./js/olen-device-location');
const fix={latitude:41.1,longitude:-8.6,accuracyMeters:12.4,capturedAt:new Date().toISOString(),source:'browser',permissionState:'granted'};
test('Web bridge reuses fresh map GPS, shares one stale refresh, honors denied permission',async()=>{
 let calls=0,permission='granted',cached=fix,release;
 const window={OLENDeviceLocation:model,OLENMapRouting:{devicePosition:()=>cached,acquirePosition:async()=>{calls++;await new Promise(r=>release=r);return {lat:42,lon:-8,accuracy:8,timestamp:Date.now()};}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/js/olen-location-bridge.js','utf8'),{window,navigator:{geolocation:{},permissions:{query:async()=>({state:permission})}},document:{},Date,Error,Promise,setTimeout,clearTimeout});
 assert.equal((await window.OLENLocationBridge.get('tempo aqui')).accuracyMeters,12.4);assert.equal(calls,0);
 cached={...fix,capturedAt:new Date(Date.now()-61000).toISOString()};const a=window.OLENLocationBridge.get('onde estou'),b=window.OLENLocationBridge.get('vai chover?');await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();assert.equal((await a).latitude,42);await b;
 permission='denied';assert.equal((await window.OLENLocationBridge.get('onde estou')).latitude,null);assert.equal(calls,1);
});
test('an unanswered permission prompt is bounded without starting another GPS read',async()=>{
 let calls=0;const timers=[];
 const window={OLENDeviceLocation:model,OLENMapRouting:{devicePosition:()=>null,acquirePosition:()=>{calls++;return new Promise(()=>{});}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/js/olen-location-bridge.js','utf8'),{window,navigator:{geolocation:{},permissions:{query:async()=>({state:'prompt'})}},document:{},Date,Error,Promise,setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){}});
 for(let i=0;i<2;i++){const request=window.OLENLocationBridge.get('onde estou');await new Promise(r=>setImmediate(r));timers.at(-1)();const result=await request;assert.equal(result.latitude,null);assert.equal(result.isFresh,false);assert.equal(result.permissionState,'prompt');}
 assert.equal(calls,1);
});
test('current-location action centers existing map/marker, never starts GO or calls a router',async()=>{
 const views=[],markers=[];let activeScreen='chat';const node={classList:{add(){},remove(){},toggle(){}},addEventListener(){},style:{},appendChild(){}};
 const map={setView:(p,z)=>views.push({p,z}),getZoom:()=>12,on(){},invalidateSize(){}};
 const marker={addTo(){return this;},setLatLng(p){markers.push(p);return this;},setIcon(){},setZIndexOffset(){}};
 const L={map:()=>map,control:{zoom:()=>({addTo(){}})},divIcon:()=>({}),marker:()=>marker,circleMarker:()=>marker};
 const window={L,OLENDeviceLocation:model,OLENCartography:{attach:async()=>({})},OLENOpenScreen:(screen)=>{activeScreen=screen;return true;}};
 const document={getElementById:()=>node,querySelector:()=>node,querySelectorAll:()=>[],addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/js/olen-map-routing.js','utf8'),{window,document,navigator:{},requestAnimationFrame:f=>f(),setTimeout,clearTimeout,console,AbortController,URL,URLSearchParams,Date,fetch:()=>{throw Error('No route/network for centering');}});
 const before=JSON.stringify(window.OLENMapRouting.state);
 assert.equal(await window.OLENMapRouting.openCurrentLocation(fix),true);assert.equal(activeScreen,'map');assert.deepEqual(Array.from(views.at(-1).p),[41.1,-8.6]);assert.equal(JSON.stringify(window.OLENMapRouting.state),before);
 assert.equal(await window.OLENMapRouting.openCurrentLocation({...fix,permissionState:'denied'}),false);
});

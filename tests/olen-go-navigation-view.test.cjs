const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
function boot(){
 const nodes=new Map(),camera=[],fits=[],layers=new Set(),events={},icons=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},dataset:{}});return nodes.get(id)}
 let zoom=11;
 const map={on:(name,fn)=>events[name]=fn,setView:(p,z)=>{zoom=z;camera.push({p,z})},getZoom:()=>zoom,panTo:p=>camera.push({p,z:zoom}),fitBounds:()=>fits.push(true),invalidateSize(){},removeLayer:l=>layers.delete(l),hasLayer:l=>layers.has(l)};
 function layer(kind,options={}){const pointer={style:{},setAttribute(k,v){this[k]=v}};return {kind,options,addTo(){layers.add(this);return this},setLatLng(p){this.position=p},getElement:()=>({querySelector:()=>pointer}),pointer,getBounds:()=>({isValid:()=>true,pad(){return this}})}}
 const L={map:()=>map,tileLayer:()=>layer('tiles'),control:{zoom:()=>({addTo(){}})},circleMarker:(p,o)=>layer('circle',o),marker:(p,o)=>{const m=layer('arrow',o);m.position=p;return m},divIcon:o=>{icons.push(o);return o},geoJSON:()=>layer('route'),polyline:()=>layer('line')};
 const position={coords:{latitude:38.72,longitude:-9.14,accuracy:5,heading:null,speed:0},timestamp:Date.now()};
 const route={ok:true,mode:'car',distanceMeters:1000,durationSeconds:120,source:'Test fixture',geometry:{type:'LineString',coordinates:[[-9.14,38.72],[-9.14,38.721],[-9.14,38.722],[-9.139,38.722],[-9.138,38.722]]},maneuvers:[{type:'turn-right',instruction:'Vira à direita',road:'Rua de teste',pointIndex:2}]};
 const window={L,OLENOpenScreen:()=>true,OLENCloudflareChat:{getTurnstileToken:async()=> 'test-token'},OLENNavigationGuide:{set(){}},OLENLegacyGo:{startRoute:()=>window.OLENMapRouting.beginGuidance()}};
 const document={getElementById:node,querySelector:q=>q.includes('rz-map')||q.includes('data-screen')?node(q):null};
 vm.runInNewContext(source,{window,document,navigator:{geolocation:{getCurrentPosition:fn=>fn(position),watchPosition(){}}},fetch:async()=>({ok:true,json:async()=>route}),AbortController,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn(),console});
 return {routing:window.OLENMapRouting,map,camera,fits,layers,events,icons};
}
test('GO starts near the real position with navigation zoom and route-oriented arrow',async()=>{
 const h=boot();assert.equal(await h.routing.open({latitude:38.722,longitude:-9.138,name:'Destino de teste'},{navigate:true,travelMode:'car'}),true);
 assert.equal(h.routing.state.navigationActive,true);
 assert.equal(h.map.getZoom(),17);
 assert.deepEqual(Array.from(h.camera.at(-1).p),[38.72,-9.14]);
 assert.match(h.icons.at(-1).html,/rotate\(0deg\)/);
 assert.match(h.icons.at(-1).html,/direção do percurso/);
});
test('live heading updates the arrow and returning to Map does not fit the entire route',async()=>{
 const h=boot();await h.routing.open({latitude:38.722,longitude:-9.138,name:'Destino de teste'},{navigate:true,travelMode:'car'});
 h.routing.updatePosition({latitude:38.721,longitude:-9.14,accuracy:5,heading:90,speed:4,timestamp:Date.now()});
 const arrow=[...h.layers].find(l=>l.kind==='arrow');assert.equal(arrow.pointer.style.transform,'rotate(90deg)');
 const count=h.fits.length;await h.routing.showBaseMap();assert.equal(h.fits.length,count);assert.equal(h.map.getZoom(),17);
 h.events.dragstart();const pans=h.camera.length;h.routing.updatePosition({latitude:38.7211,longitude:-9.14,accuracy:5,heading:0,speed:4,timestamp:Date.now()});assert.equal(h.camera.length,pans);
 await h.routing.controlMap('Recentrar');assert.equal(h.map.getZoom(),17);
 h.routing.stopGuidance();assert.equal([...h.layers].some(l=>l.kind==='arrow'),false);
});
test('preview remains an overview and never presents a navigation arrow',async()=>{
 const h=boot();await h.routing.open({latitude:38.722,longitude:-9.138,name:'Destino de teste'},{navigate:false,travelMode:'car'});
 assert.equal(h.routing.state.navigationActive,false);assert.equal(h.icons.length,0);assert.ok(h.fits.length>0);
});


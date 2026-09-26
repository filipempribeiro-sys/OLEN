const test=require('node:test');
const assert=require('node:assert/strict');
const {create,query,normalizeRelation}=require('../js/olen-trails-catalog.js');
const center={lat:38.72,lon:-9.13};
const relation={type:'relation',id:123,tags:{name:'Trilho Teste',ref:'PR1'},members:[{geometry:[{lat:38.72,lon:-9.13},{lat:38.721,lon:-9.13}]}]};
function memory(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}}
test('query bounds search radius and rejects invalid coordinates',()=>{
 assert.match(query(center,100000),/around:30000/);
 assert.throws(()=>query({lat:91,lon:0}));
});
test('OSM relation is marked non-official and retains traceable source',()=>{
 const result=normalizeRelation(relation,center);
 assert.equal(result.provenance.official,false);
 assert.equal(result.provenance.homologated,false);
 assert.equal(result.provenance.accessStatus,'unknown');
 assert.match(result.provenance.sourceUrl,/relation\/123$/);
 assert.equal(result.segments.length,1);
});
test('incomplete OSM geometry is rejected rather than inventing path',()=>{
 assert.equal(normalizeRelation({...relation,members:[]},center),null);
});
test('fetch results are bounded and served from local cache',async()=>{
 let calls=0;const storage=memory(),catalog=create({storage,request:async()=>{calls++;return {ok:true,json:async()=>({elements:[relation]})}},now:()=>1000});
 const first=await catalog.nearby(center),second=await catalog.nearby(center);
 assert.equal(first.trails.length,1);assert.equal(second.source,'cache');assert.equal(calls,1);
});
test('HTTP failures do not fabricate trails',async()=>{
 const catalog=create({request:async()=>({ok:false})});
 await assert.rejects(()=>catalog.nearby(center));
});

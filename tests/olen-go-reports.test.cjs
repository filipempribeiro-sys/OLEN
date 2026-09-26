const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../js/olen-go-reports.js');
const gps={latitude:38.72,longitude:-9.13,accuracy:7};
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}}
test('GPS accuracy and coordinates are mandatory',()=>{
 const r=create(memory());
 assert.throws(()=>r.save({type:'danger',level:'danger',position:{...gps,accuracy:100}}));
 assert.throws(()=>r.save({type:'danger',level:'danger',position:{...gps,latitude:95}}));
 assert.equal(r.list().length,0);
});
test('reports are explicitly local and unpublished',()=>{
 const r=create(memory());const saved=r.save({id:'1',type:'obstacle',level:'caution',position:gps});
 assert.equal(saved.provenance.published,false);assert.equal(saved.status,'local-draft');
 assert.equal(r.list()[0].latitude,38.72);
});
test('invalid category does not create records',()=>{
 const r=create(memory());assert.throws(()=>r.save({type:'official-closure',position:gps}));
});
test('reports survive reload and are removable',()=>{
 const s=memory();create(s).save({id:'1',type:'water',position:gps});
 const r=create(s);assert.equal(r.list().length,1);assert.equal(r.remove('report_1'),true);
 assert.equal(r.list().length,0);
});

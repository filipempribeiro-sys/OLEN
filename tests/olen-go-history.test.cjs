const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../js/olen-go-history.js');
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
const activity=(id,end=1000)=>({id,active:false,startedAt:100,finishedAt:end,distanceMeters:12,points:[{latitude:38,longitude:-9,accuracy:5,timestamp:200}]});
test('only completed activities can be saved',()=>{const h=create(storage());assert.equal(h.save({...activity('a'),active:true}),false);assert.equal(h.list().length,0)});
test('history survives new instance and returns a defensive copy',()=>{const s=storage(),h=create(s);assert.equal(h.save(activity('a')),true);const other=create(s);const a=other.get('a');a.points[0].latitude=90;assert.equal(other.get('a').points[0].latitude,38)});
test('upsert uses id and keeps newest completed tracks first',()=>{const h=create(storage());h.save(activity('a',100));h.save(activity('b',200));h.save(activity('a',300));assert.deepEqual(h.list().map(x=>x.id),['a','b'])});
test('history is limited to fifty records',()=>{const h=create(storage());for(let i=0;i<55;i++)h.save(activity('id'+i,i+1000));assert.equal(h.list().length,50);assert.equal(h.get('id0'),null)});
test('remove and clear do not affect unrelated entries',()=>{const h=create(storage());h.save(activity('a'));h.save(activity('b'));assert.equal(h.remove('a'),true);assert.equal(h.get('a'),null);assert.equal(h.get('b').id,'b');assert.equal(h.clear(),true);assert.equal(h.list().length,0)});
test('corrupt storage is handled without inventing tracks',()=>{const s=storage();s.setItem('olen:go:history:v1','oops');assert.deepEqual(create(s).list(),[])});

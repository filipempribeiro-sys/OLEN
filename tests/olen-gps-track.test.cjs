/* Run locally: node --test tests/olen-gps-track.test.cjs
   No network, Actions, browser or real GPS required. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {createRecorder,distance,normalize}=require('../js/olen-gps-track.js');
function memory(){
  const data=new Map();
  return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
const fix=(lat,lon,time,accuracy=5)=>({coords:{latitude:lat,longitude:lon,accuracy},timestamp:time});
test('rejects invalid coordinates and inaccurate fixes',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  assert.equal(recorder.ingest(fix(91,0,2000)).accepted,false);
  assert.equal(recorder.ingest(fix(38.72,-9.13,3000,100)).accepted,false);
  assert.equal(recorder.snapshot().distanceMeters,0);
});
test('first valid fix is saved without inventing distance',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  assert.equal(recorder.ingest(fix(38.72,-9.13,2000)).accepted,true);
  assert.equal(recorder.snapshot().points.length,1);
  assert.equal(recorder.snapshot().distanceMeters,0);
});
test('genuine movement increases distance',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  recorder.ingest(fix(38.72,-9.13,2000));
  const next=recorder.ingest(fix(38.7205,-9.13,12000));
  assert.equal(next.accepted,true);assert.ok(next.state.distanceMeters>40);
});
test('GPS teleport is rejected and leaves last valid point untouched',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  recorder.ingest(fix(38.72,-9.13,2000));
  const next=recorder.ingest(fix(39.72,-9.13,3000));
  assert.equal(next.accepted,false);assert.equal(next.reason,'gps-jump');
  assert.equal(next.state.points.length,1);assert.equal(next.state.distanceMeters,0);
});
test('minor jitter is not counted as movement',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  recorder.ingest(fix(38.72,-9.13,2000,10));
  const next=recorder.ingest(fix(38.72001,-9.13,3000,10));
  assert.equal(next.accepted,false);assert.equal(next.reason,'jitter');
  assert.equal(next.state.distanceMeters,0);
});
test('non-increasing timestamps are rejected',()=>{
  const recorder=createRecorder(memory());recorder.start({startedAt:1000});
  recorder.ingest(fix(38.72,-9.13,2000));
  assert.equal(recorder.ingest(fix(38.721,-9.13,2000)).reason,'timestamp');
});
test('STOP persists completed track; recovered track cannot be appended to',()=>{
  const storage=memory(),recorder=createRecorder(storage);recorder.start({name:'Trail',startedAt:1000});
  recorder.ingest(fix(38.72,-9.13,2000));
  const done=recorder.finish(3000);assert.equal(done.active,false);assert.equal(done.finishedAt,3000);
  const recovered=createRecorder(storage);assert.equal(recovered.recover().name,'Trail');
  assert.equal(recovered.ingest(fix(38.73,-9.13,12000)).reason,'inactive');
});
test('empty or invalid storage never invents an activity',()=>{
  const storage=memory();storage.setItem('olen:go:activity:v1','{invalid');
  assert.equal(createRecorder(storage).recover(),null);
});
test('haversine distance is zero for same point',()=>{
  assert.equal(distance({latitude:38,longitude:-9},{latitude:38,longitude:-9}),0);
  assert.equal(normalize({latitude:Infinity,longitude:0,accuracy:5}),null);
});

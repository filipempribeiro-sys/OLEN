const test=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../js/olen-trail-guide.js');
const p=(latitude,longitude)=>({latitude,longitude});
test('path length uses only declared segments',()=>{
 const g=build([[p(38,0),p(38.001,0)],[p(40,0),p(40.001,0)]]);
 assert.ok(g.totalMeters>200&&g.totalMeters<240);
});
test('GPS on first edge has monotonic progress and remaining distance',()=>{
 const g=build([[p(38,0),p(38.001,0)]]);
 const a=g.locate(p(38.0002,0)),b=g.locate(p(38.0008,0));
 assert.ok(a.progressMeters<b.progressMeters);
 assert.ok(a.remainingMeters>b.remainingMeters);
 assert.equal(a.offTrail,false);
});
test('off-trail GPS warns without recalculating a route',()=>{
 const g=build([[p(38,0),p(38.001,0)]]);
 const status=g.locate(p(38.01,0));
 assert.equal(status.offTrail,true);
 assert.ok(status.distanceMeters>100);
});
test('invalid GPS and empty geometry fail closed',()=>{
 assert.throws(()=>build([]));
 const g=build([[p(38,0),p(38.001,0)]]);
 assert.throws(()=>g.locate(p(100,0)));
});

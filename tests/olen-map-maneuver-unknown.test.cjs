const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');
const begin=source.indexOf('function maneuverType(type){');
const end=source.indexOf('function updateInstruction(pos){',begin);
assert.ok(begin>=0&&end>begin,'routing maneuver classifier exists');
const classify=new Function(source.slice(begin,end)+'\nreturn maneuverType;')();
test('routing unknown numeric step type cannot trigger straight arrow',()=>{
 assert.equal(classify(999),'unknown');
 assert.equal(classify(undefined),'unknown');
});
test('known Valhalla and OSRM turns retain their intended types',()=>{
 assert.equal(classify(10),'turn-right');
 assert.equal(classify('turn-left'),'turn-left');
 assert.equal(classify('straight'),'straight');
 assert.equal(classify('unknown'),'unknown');
});

test('documented Valhalla continue/stay maneuvers map without inventing ramp turns',()=>{
 assert.equal(classify(7),'straight');
 assert.equal(classify(8),'straight');
 assert.equal(classify(22),'straight');
 assert.equal(classify(23),'keep-right');
 assert.equal(classify(24),'keep-left');
 assert.equal(classify(20),'exit-right');
 assert.equal(classify(17),'unknown');
 assert.equal(classify(18),'unknown');
 assert.equal(classify(19),'unknown');
 assert.equal(classify(21),'unknown');
});

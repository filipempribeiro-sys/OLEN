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

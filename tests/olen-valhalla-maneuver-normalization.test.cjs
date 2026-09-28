const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-routing.js'),'utf8');

const n0=source.indexOf('function normalizeRouteManeuvers(routeResult){');
const n1=source.indexOf('function validated(',n0);
assert.ok(n0>=0&&n1>n0);
const normalize=new Function(source.slice(n0,n1)+'\nreturn normalizeRouteManeuvers;')();

const m0=source.indexOf('function maneuverType(type){');
const m1=source.indexOf('function laneDirectionLabel(',m0);
assert.ok(m0>=0&&m1>m0);
const classify=new Function(source.slice(m0,m1)+'\nreturn maneuverType;')();

test('raw Valhalla maneuver fields become the canonical GO step',()=>{
 const route={source:'Valhalla',maneuvers:[{
  type:26,instruction:'Entra na rotunda',begin_shape_index:12,
  street_names:['Rotunda Central'],roundabout_exit_count:4
 }]};
 const out=normalize(route);
 assert.equal(out.maneuvers[0].provider,'valhalla');
 assert.equal(out.maneuvers[0].pointIndex,12);
 assert.equal(out.maneuvers[0].road,'Rotunda Central');
 assert.equal(out.maneuvers[0].exitNumber,4);
 assert.equal(classify(out.maneuvers[0].type),'roundabout');
});

test('camelCase Valhalla fields are accepted without destroying original metadata',()=>{
 const step={type:10,beginShapeIndex:7,beginStreetNames:['Rua Nova'],
  roundaboutExitCount:2,verbal_pre_transition_instruction:'Vira à direita agora'};
 const out=normalize({engine:'valhalla',maneuvers:[step]}).maneuvers[0];
 assert.equal(out.pointIndex,7);
 assert.equal(out.road,'Rua Nova');
 assert.equal(out.exitNumber,2);
 assert.equal(out.verbal_pre_transition_instruction,'Vira à direita agora');
});

test('roundabout exits above supported 12 are not presented as verified exit numbers',()=>{
 const out=normalize({source:'Valhalla',maneuvers:[{
  type:26,begin_shape_index:3,roundabout_exit_count:18
 }]}).maneuvers[0];
 assert.equal(out.exitNumber,undefined);
});

test('already canonical OSRM maneuver remains canonical',()=>{
 const step={provider:'osrm',type:'turn-right',pointIndex:5,road:'Rua A',instruction:'Vira à direita'};
 const out=normalize({source:'OSRM',maneuvers:[step]}).maneuvers[0];
 assert.equal(out.provider,'osrm');
 assert.equal(out.type,'turn-right');
 assert.equal(out.pointIndex,5);
 assert.equal(out.road,'Rua A');
});

const test=require('node:test');
const assert=require('node:assert/strict');
const {fromRoute,direction}=require('../js/olen-osrm-adapter.js');
const route={distance:1600,duration:750,geometry:{type:'LineString',coordinates:[
 [-9.13,38.72],[-9.125,38.725],[-9.12,38.73]]},legs:[{steps:[
 {maneuver:{type:'depart',location:[-9.13,38.72]},name:'Início',distance:700},
 {maneuver:{type:'turn',modifier:'right',location:[-9.125,38.725]},name:'Rua Verde',distance:650},
 {maneuver:{type:'arrive',location:[-9.12,38.73]},distance:0}
 ]}]};
test('only OSRM geometry with real coordinates is accepted',()=>{
 assert.throws(()=>fromRoute({distance:100,geometry:{type:'LineString',coordinates:[]}},'walk','OSM'));
 assert.throws(()=>fromRoute({...route,geometry:{type:'LineString',coordinates:[[199,38.72],[-9.12,38.73]]}},'walk','OSM'));
});
test('actual OSRM turns preserve maneuver type, road and polyline index',()=>{
 const result=fromRoute(route,'walk','OSM pedestrian');
 assert.equal(result.ok,true);assert.equal(result.mode,'walk');
 assert.equal(result.maneuvers[1].type,'turn-right');
 assert.equal(result.maneuvers[1].pointIndex,1);
 assert.equal(result.maneuvers[1].road,'Rua Verde');
 assert.equal(result.maneuvers[2].type,'finish');
});
test('unmatched OSRM maneuver coordinates cannot generate fictitious instructions',()=>{
 const result=fromRoute({...route,legs:[{steps:[{maneuver:{type:'turn',modifier:'left',location:[-8.1,39.3]}}]}]},'walk','OSM');
 assert.equal(result.maneuvers.length,0);
});
test('unknown maneuver does not claim a turning direction',()=>{
 const [type,instruction]=direction({type:'notification'});
 assert.equal(type,'unknown');assert.equal(instruction,'Confirma a próxima indicação no mapa');
});
test('roundabouts, slight turns and u-turns are mapped to OLEN icons',()=>{
 assert.equal(direction({type:'roundabout'})[0],'roundabout');
 assert.equal(direction({type:'turn',modifier:'slight left'})[0],'slight-left');
 assert.equal(direction({type:'turn',modifier:'uturn'})[0],'uturn');
});

test('explicit straight modifier remains valid without suppressing unknown state',()=>{
 assert.equal(direction({type:'turn',modifier:'straight'})[0],'straight');
 assert.equal(direction({type:'notification'})[0],'unknown');
});

test('roundabouts 1–12 keep their verified exit without inventing missing PNGs',()=>{
 for(let exit=1;exit<=12;exit++){
  const step={maneuver:{type:'roundabout',exit,location:[-9.125,38.725]},
   driving_side:'right',name:'Rotunda do Jardim',distance:150,
   intersections:[{lanes:[{valid:true,active:true,indications:['straight']}]}]};
  const result=fromRoute({...route,legs:[{steps:[step]}]},'car','OSRM road');
  assert.equal(result.maneuvers[0].exitNumber,exit);
  assert.equal(result.maneuvers[0].drivingSide,'right');
  assert.equal(result.maneuvers[0].lanes[0].active,true);
  assert.match(result.maneuvers[0].instruction,new RegExp(''+exit+'\\.ª saída'));
 }
});
test('unknown roundabout exit is never invented',()=>{
 const result=fromRoute({...route,legs:[{steps:[{maneuver:{type:'roundabout',location:[-9.125,38.725]},distance:200}]}]},'walk','OSM');
 assert.equal(result.maneuvers[0].exitNumber,undefined);
 assert.equal(result.maneuvers[0].instruction,'Entra na rotunda');
});

const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../js/olen-go-experience-bridge.js');
function makeEngine(){
 let current=null,serial=0;
 return {
  getActive(){return current},
  get(id){return current?.id===id?current:null},
  create(data){current={...data,id:'exp_'+(++serial),go:{}};return current},
  updateDomain(id,domain,patch){assert.equal(id,current.id);current[domain]={...current[domain],...patch};return current},
  transition(id,next){assert.equal(id,current.id);current.lifecycle=next;return current}
 };
}
const activity={id:'go_1',name:'Trilho de teste',mode:'walk',startedAt:1000,finishedAt:5000,
 active:false,distanceMeters:123,points:[{latitude:38,longitude:-9}],rejected:2};
test('attach does not write without an engine',()=>{
 global.window={OLEN5:{}};assert.equal(bridge.attach(activity),null);
});
test('start links activity to active Experience and transitions to ACTIVE',()=>{
 const engine=makeEngine();global.window={OLEN5:{experienceEngine:engine}};
 const linked=bridge.attach(activity,{destination:{name:'Destino'}});
 assert.equal(linked,'exp_1');
 assert.equal(engine.getActive().go.activityId,'go_1');
 assert.equal(engine.getActive().lifecycle,'ACTIVE');
});
test('STOP writes summary, rating and completes Experience',()=>{
 const engine=makeEngine();global.window={OLEN5:{experienceEngine:engine}};
 bridge.attach(activity);
 const id=bridge.finish(activity,{rating:4,comment:'Percurso agradável'});
 assert.equal(engine.getActive().id,id);
 assert.equal(engine.getActive().go.distanceMeters,123);
 assert.equal(engine.getActive().go.rating,4);
 assert.equal(engine.getActive().lifecycle,'COMPLETED');
});
test('unfinished activity cannot be marked completed',()=>{
 const engine=makeEngine();global.window={OLEN5:{experienceEngine:engine}};
 bridge.attach(activity);assert.equal(bridge.finish({...activity,active:true}),null);
 assert.equal(engine.getActive().lifecycle,'ACTIVE');
});
test('completed unrelated Experience is not overwritten',()=>{
 const engine=makeEngine();global.window={OLEN5:{experienceEngine:engine}};
 bridge.attach(activity);
 assert.equal(bridge.finish({...activity,id:'another'}),null);
 assert.equal(engine.getActive().lifecycle,'ACTIVE');
});

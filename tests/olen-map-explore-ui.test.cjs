const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/olen-map-explore-ui.js'),'utf8');
function fixture(){
 const objects=new Map(),tabs=['trails','routes','gps','saved'].map(key=>element('tab-'+key,{olenExplore:key}));
 function element(id,dataset={}){
  const listeners=new Map();
  return {id,dataset,hidden:true,value:'',textContent:'',children:[],style:{},
   addEventListener:(event,fn)=>listeners.set(event,fn),
   click(){return listeners.get('click')?.()},
   focus(){},setAttribute(key,value){this[key]=value},
   append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},
   replaceChildren(...items){this.children=items},
   querySelectorAll(){return tabs}};
 }
 const id=name=>{
  if(!objects.has(name))objects.set(name,element(name));
  return objects.get(name);
 };
 const document={getElementById:id,createElement:tag=>element(tag),addEventListener(){}};
 const modal=id('rzExplorePop');modal.querySelectorAll=()=>tabs;
 const button=id('rzExplore'),body=id('rzExploreBody'),sheet=id('rzGoPop');
 let tracking=0,trailSearches=0;
 id('rzDiscoverTrails').click=()=>{trailSearches++};
 const window={OLENMapRouting:{formatDistance:m=>Math.round(m)+' m'},
  OLENGoActivity:{current:null,trackingLive:false,interrupted:false,
   history:()=>[],startFreeTracking:()=>{tracking++;return true}}};
 vm.runInNewContext(source,{window,document,navigator:{}},{filename:'olen-map-explore-ui.js'});
 return {window,modal,button,body,tabs,sheet,counts:()=>({tracking,trailSearches})};
}
test('ALPHA outdoor explorer is accessible without replacing map screen',()=>{
 const ui=fixture();ui.button.click();
 assert.equal(ui.modal.hidden,false);
 assert.equal(ui.body.children[0].textContent,'Trilhos e caminhos próximos');
});
test('destination routes open the existing OLEN GO sheet',()=>{
 const ui=fixture();ui.button.click();ui.tabs[1].click();
 const open=ui.body.children.find(x=>x.textContent==='Preparar rota');
 open.click();
 assert.equal(ui.modal.hidden,true);assert.equal(ui.sheet.hidden,false);
});
test('trail discovery reuses existing real discovery rather than a second runtime',()=>{
 const ui=fixture();ui.button.click();
 ui.body.children.find(x=>x.textContent==='Descobrir trilhos no mapa').click();
 assert.equal(ui.counts().trailSearches,1);
});
test('standalone tracking entry is connected to the single GO recorder',()=>{
 const ui=fixture();ui.button.click();ui.tabs[2].click();
 const start=ui.body.children.find(x=>x.textContent==='Iniciar tracking livre');
 start.click();assert.equal(ui.counts().tracking,1);assert.equal(ui.modal.hidden,true);
});

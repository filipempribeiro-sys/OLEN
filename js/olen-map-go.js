/* OLEN 5.0 - MAP / GO
   Single owner for Map and GO lifecycle, map state, route/navigation state,
   location snapshots and remote-safe layout context.
   No legacy ALPHA/OLEN 4.x dependency and no map provider is started automatically.
   Intentionally not loaded by the OLEN 4.x runtime yet.
*/
(()=>{
'use strict';
const ROOT=window.OLEN5,core=ROOT?.core,router=ROOT?.router;
if(!core||!router)throw new Error('OLEN 5.0 Map/GO requires core and router');
if(ROOT.mapGo?.version==='5.0.0')return;
const VERSION='5.0.0',VIEWS=Object.freeze(['map','go']);
let initialized=false,mountedView=null,unregister=[],viewportOff=[],provider=null,travelMode=null,mapLayer='standard',exploreLayers={trails:false,paths:false,routes:false,saved:false};
let selectors={mapRoot:'#field',goRoot:'#field',mapCanvas:'#realMap'};
let model=freshModel();
function freshModel(){return{mapReady:false,location:null,destination:null,selectedTrail:null,route:null,navigation:{active:false,following:true,mode:null,startedAt:null},remoteVisible:false}}
function clone(value){if(value==null)return value;try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}}
function host(view=mountedView){return core.qs(view==='go'?selectors.goRoot:selectors.mapRoot)}
function canvas(){return core.qs(selectors.mapCanvas,host()||document)}
function snapshot(){return clone(model)}
function emit(name,payload={}){core.emit(`map-go:${name}`,{view:mountedView,state:snapshot(),...payload})}
function setModel(updater,reason='state-change'){const draft=clone(model),result=typeof updater==='function'?updater(draft):updater;model=result&&typeof result==='object'?result:draft;emit('state',{reason});if(mountedView)render(reason);return snapshot()}
function syncCoreNavigation(){core.setState(draft=>{draft.navigation={...(draft.navigation||{}),routeActive:!!model.navigation.active};draft.remote={...(draft.remote||{}),visible:!!model.remoteVisible}},{source:'map-go',action:'sync'})}
function render(reason='render'){
  if(!mountedView)return false;const h=host();if(!h)return false;
  document.documentElement.dataset.olenView=mountedView;h.dataset.olenMounted='5.0';h.dataset.olenMapGoOwner='5.0';h.dataset.olenMapGoView=mountedView;h.dataset.olenNavigationActive=model.navigation.active?'true':'false';h.dataset.olenRemoteVisible=model.remoteVisible?'true':'false';canvas()?.setAttribute('data-olen-map-canvas','5.0');
  provider?.resize?.({view:mountedView,reason,state:snapshot()});emit('rendered',{reason});return true;
}
function clearPresentation(view=mountedView){const h=host(view);h?.removeAttribute('data-olen-mounted');h?.removeAttribute('data-olen-map-go-owner');h?.removeAttribute('data-olen-map-go-view');h?.removeAttribute('data-olen-navigation-active');h?.removeAttribute('data-olen-remote-visible');canvas()?.removeAttribute('data-olen-map-canvas')}
function mount(view,context={}){mountedView=view;provider?.mount?.({view,host:host(view),canvas:canvas(),state:snapshot(),context});core.raf2(()=>render(context.reason||`enter-${view}`));emit('mounted',{context});return true}
function unmount(view,context={}){if(mountedView!==view)return;provider?.unmount?.({view,host:host(view),canvas:canvas(),state:snapshot(),context});clearPresentation(view);mountedView=null;emit('unmounted',{context,view})}
function setProvider(adapter){if(adapter!=null&&typeof adapter!=='object')throw new TypeError('Map provider must be an adapter object');provider=adapter||null;if(provider){provider.setTravelMode?.(clone(travelMode));provider.setMapLayer?.(mapLayer);provider.setExploreLayers?.(clone(exploreLayers));if(model.location)provider.setLocation?.(clone(model.location));if(model.destination)provider.setDestination?.(clone(model.destination));if(model.route)provider.setRoute?.(clone(model.route))}emit('provider',{connected:!!provider});return!!provider}
function setTravelMode(mode){travelMode=mode?clone(mode):null;provider?.setTravelMode?.(clone(travelMode));emit('travel-mode',{travelMode:clone(travelMode)});return clone(travelMode)}
function setMapLayer(layer='standard'){const allowed=['standard','terrain','satellite'];mapLayer=allowed.includes(layer)?layer:'standard';provider?.setMapLayer?.(mapLayer);emit('map-layer',{layer:mapLayer});return mapLayer}
function setExploreLayer(layer,value=true){if(!Object.prototype.hasOwnProperty.call(exploreLayers,layer))return false;exploreLayers={...exploreLayers,[layer]:!!value};provider?.setExploreLayer?.(layer,!!value);emit('explore-layer',{layer,visible:!!value,layers:clone(exploreLayers)});return!!value}
function setExploreLayers(layers={}){Object.keys(exploreLayers).forEach(k=>{if(k in layers)exploreLayers[k]=!!layers[k]});provider?.setExploreLayers?.(clone(exploreLayers));emit('explore-layers',{layers:clone(exploreLayers)});return clone(exploreLayers)}
function setLocation(location){
  if(location==null){setModel(draft=>{draft.location=null},'location-clear');return null}
  const latitude=Number(location.latitude??location.lat),longitude=Number(location.longitude??location.lon??location.lng);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new TypeError('Invalid location');
  const next={latitude,longitude,accuracy:Number.isFinite(Number(location.accuracy))?Number(location.accuracy):null,speed:Number.isFinite(Number(location.speed))?Number(location.speed):null,heading:Number.isFinite(Number(location.heading))?Number(location.heading):null,timestamp:location.timestamp||Date.now()};
  setModel(draft=>{draft.location=next},'location');provider?.setLocation?.(clone(next));return clone(next);
}
function setDestination(destination){const next=destination?clone(destination):null;setModel(draft=>{draft.destination=next},next?'destination':'destination-clear');provider?.setDestination?.(clone(next));return clone(next)}
function selectTrail(trail){const next=trail?clone(trail):null;setModel(draft=>{draft.selectedTrail=next},next?'trail-select':'trail-clear');provider?.selectTrail?.(clone(next));return clone(next)}
function setRoute(route){const next=route?clone(route):null;setModel(draft=>{draft.route=next},next?'route':'route-clear');provider?.setRoute?.(clone(next));return clone(next)}
function startNavigation(options={}){if(!model.route&&!options.allowWithoutRoute)return false;setModel(draft=>{draft.navigation={active:true,following:options.following!==false,mode:options.mode||draft.navigation.mode||null,startedAt:Date.now()}},'navigation-start');syncCoreNavigation();provider?.startNavigation?.({state:snapshot(),options:clone(options)});emit('navigation-started');return true}
function stopNavigation(reason='navigation-stop'){if(!model.navigation.active)return false;provider?.stopNavigation?.({reason,state:snapshot()});setModel(draft=>{draft.navigation={...draft.navigation,active:false,startedAt:null}},reason);syncCoreNavigation();emit('navigation-stopped',{reason});return true}
function setFollowing(value){setModel(draft=>{draft.navigation.following=!!value},'navigation-follow');provider?.setFollowing?.(!!value);return model.navigation.following}
function setRemoteVisible(value){const visible=!!value;if(model.remoteVisible===visible)return visible;setModel(draft=>{draft.remoteVisible=visible},'remote-visibility');syncCoreNavigation();emit('remote',{visible});return visible}
function clearRoute({keepDestination=false}={}){if(model.navigation.active)stopNavigation('route-clear');setModel(draft=>{draft.route=null;if(!keepDestination)draft.destination=null},'route-clear');provider?.clearRoute?.({keepDestination});return true}
function onViewport(){if(!mountedView)return;core.raf2(()=>render('viewport-change'))}
function init(options={}){
  if(initialized)return ROOT.mapGo;initialized=true;selectors={...selectors,...(options.selectors||{})};if(options.provider)setProvider(options.provider);
  unregister=VIEWS.map(view=>router.registerView(view,{enter:context=>mount(view,context),leave:context=>unmount(view,context),afterEnter:context=>emit('ready',{context,view})}));
  viewportOff=[core.listen(window,'resize',onViewport,{passive:true}),core.listen(window,'orientationchange',onViewport,{passive:true})];
  if(window.visualViewport)viewportOff.push(core.listen(window.visualViewport,'resize',onViewport,{passive:true}));
  syncCoreNavigation();emit('registered',{version:VERSION});return ROOT.mapGo;
}
function destroy(){viewportOff.forEach(off=>off?.());viewportOff=[];unregister.forEach(off=>off?.());unregister=[];if(mountedView)unmount(mountedView,{reason:'destroy'});provider?.destroy?.();provider=null;travelMode=null;mapLayer='standard';exploreLayers={trails:false,paths:false,routes:false,saved:false};model=freshModel();syncCoreNavigation();initialized=false}
ROOT.mapGo=Object.freeze({version:VERSION,init,destroy,render,setProvider,setTravelMode,setMapLayer,setExploreLayer,setExploreLayers,setLocation,setDestination,selectTrail,setRoute,clearRoute,startNavigation,stopNavigation,setFollowing,setRemoteVisible,get mountedView(){return mountedView},get state(){return snapshot()},get travelMode(){return clone(travelMode)},get mapLayer(){return mapLayer},get exploreLayers(){return clone(exploreLayers)},get navigationActive(){return!!model.navigation.active}});
core.register('map-go',ROOT.mapGo);
})();
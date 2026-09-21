/* OLEN Maneuver Library — registry / resolver / renderer
   Assets: assets/maneuvers/olen-maneuver-01.png ... 96.png
   Historical sheet mapping: 01..91 row-major (7 x 13).
   Deliberate override: 74 = camper/autocaravana.
   Extra assets: 92 plane, 93 motorcycle, 94 scooter, 95 bicycle, 96 helicopter.
*/
(function(global){"use strict";
var VERSION="1.0.0",BASE="assets/maneuvers/";
function pad(n){return String(n).padStart(2,"0")}
function asset(n){return BASE+"olen-maneuver-"+pad(n)+".png"}
var visualKeys=["straight","turn-right","turn-left","slight-right","slight-left","sharp-left","sharp-right","curve-right","fork-left","fork-right","merge","keep-right","uturn","fork","split","straight-or-right","straight-or-left","keep-right-branch","keep-left-branch","curve-right-alt","straight-or-right-alt","motorway","exit-right","lane-straight","motorway-crossing","motorway-end","bend-right","keep-right-lane","keep-left-lane","branch-left","turn-right-alt","branch-right","turn-left-alt","branch-left-alt","fork-left-alt","turn-right-sharp-alt","keep-left-alt","uturn-right","uturn-left","roundabout","roundabout-alt","roundabout-four-way","roundabout-three-way","roundabout-exit","roundabout-more","roundabout-exit-1","roundabout-exit-2","roundabout-exit-3","roundabout-exit-4","roundabout-exit-5","roundabout-exit-5-alt","roundabout-exit-6","finish","start","location-pin","turn-right-marker","waypoint","information","warning","roadworks","incident","slippery-road","car","pedestrian","walking","ferry","ferry-alt","carpool","car-alt","fuel","motorway-junction","tunnel","mountain","cycle-crossing","lane-narrowing","car-front","road","waypoint-marker","truck","ferry-service","road-label","fuel-alt","motorway-alt","uturn-alt","mountain-alt","snow","camper","fuel-station","cafe","parking","lane-guidance"];
var registry=Object.create(null);
visualKeys.forEach(function(key,index){var id=index+1;registry[id]=Object.freeze({id:id,key:key,asset:asset(id),layer:id<=52?"guidance":"context"})});
registry[74]=Object.freeze({id:74,key:"camper",asset:asset(74),layer:"mobility",label:"Autocaravana"});
[[92,"plane","Avião"],[93,"motorcycle","Mota"],[94,"scooter","Trotineta"],[95,"bicycle","Bicicleta"],[96,"helicopter","Helicóptero"]].forEach(function(x){registry[x[0]]=Object.freeze({id:x[0],key:x[1],asset:asset(x[0]),layer:"mobility",label:x[2]})});
var aliases=Object.freeze({"straight":1,"continue":1,"depart":1,"right":2,"turn-right":2,"left":3,"turn-left":3,"slight-right":4,"slight-left":5,"sharp-left":6,"sharp-right":7,"curve-right":8,"fork-left":9,"fork-right":10,"merge":11,"keep-right":12,"uturn":13,"u-turn":13,"keep-left":37,"roundabout":40,"roundabout-exit-1":46,"roundabout-exit-2":47,"roundabout-exit-3":48,"roundabout-exit-4":49,"roundabout-exit-5":50,"roundabout-exit-6":52,"finish":53,"arrive":53,"arrival":53,"start":54,"location":55,"location-pin":55,"waypoint":57,"information":58,"warning":59,"roadworks":60,"incident":61,"slippery-road":62,"car":63,"pedestrian":64,"walking":65,"walk":65,"ferry":66,"carpool":68,"fuel":70,"tunnel":72,"mountain":73,"camper":74,"motorhome":74,"autocaravana":74,"truck":79,"snow":86,"cafe":89,"parking":90,"lane-guidance":91,"plane":92,"air":92,"airplane":92,"aviao":92,"motorcycle":93,"moto":93,"scooter":94,"trotineta":94,"bicycle":95,"bike":95,"bicicleta":95,"helicopter":96,"helicoptero":96});
function normalize(value){return String(value==null?"":value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_\s]+/g,"-")}
function providerKey(input){
 if(!input||typeof input!=="object")return input;
 var p=normalize(input.provider||input.source||"");
 var raw=input.type||input.key||input.maneuver||input.action||input.modifier||"";
 var key=normalize(raw),mod=normalize(input.modifier||input.direction||"");
 var google={
  "turn-slight-left":"slight-left","turn-sharp-left":"sharp-left","uturn-left":"uturn-left","turn-left":"left",
  "turn-slight-right":"slight-right","turn-sharp-right":"sharp-right","uturn-right":"uturn-right","turn-right":"right",
  "straight":"straight","ramp-left":"left","ramp-right":"right","merge":"merge","fork-left":"fork-left","fork-right":"fork-right",
  "ferry":"ferry","ferry-train":"ferry","roundabout-left":"roundabout","roundabout-right":"roundabout","depart":"start","name-change":"straight"
 };
 if(p.indexOf("google")>=0&&google[key])return google[key];
 if(p.indexOf("mapbox")>=0){
   if(key==="turn"||key==="continue"||key==="new-name"||key==="roundabout-turn")return mod||"straight";
   if(key==="depart")return "start";
   if(key==="arrive")return "arrive";
   if(key==="merge")return "merge";
   if(key==="fork")return mod==="left"?"fork-left":mod==="right"?"fork-right":"straight";
   if(key==="end-of-road")return mod||"straight";
   if(key==="on-ramp"||key==="off-ramp")return mod||"straight";
   if(key==="roundabout"||key==="rotary"||key==="exit-roundabout"||key==="exit-rotary"){
     var ex=Number(input.exit||input.exitNumber||input.exit_number);
     return ex>=1&&ex<=6?"roundabout-exit-"+ex:"roundabout";
   }
   if(key==="notification"&&normalize(input.mode)==="ferry")return "ferry";
 }
 var here={
  "arrive":"arrive","continue-on":"straight","depart":"start",
  "enter-highway-from-left":"merge","enter-highway-from-right":"merge",
  "keep-left":"keep-left","keep-right":"keep-right",
  "left-turn":"left","right-turn":"right","slightly-left-turn":"slight-left","slightly-right-turn":"slight-right",
  "sharp-left-turn":"sharp-left","sharp-right-turn":"sharp-right","u-turn":"uturn",
  "roundabout-enter":"roundabout","roundabout-exit":"roundabout","ferry":"ferry"
 };
 if(p.indexOf("here")>=0&&here[key])return here[key];
 var tomtom={
  "depart":"start","arrive":"arrive","arrive-left":"arrive","arrive-right":"arrive",
  "straight":"straight","continue-straight":"straight","keep-right":"keep-right","keep-left":"keep-left",
  "bear-right":"slight-right","turn-slight-right":"slight-right","turn-right":"right","sharp-right":"sharp-right","turn-sharp-right":"sharp-right",
  "bear-left":"slight-left","turn-slight-left":"slight-left","turn-left":"left","sharp-left":"sharp-left","turn-sharp-left":"sharp-left",
  "make-uturn":"uturn","make-u-turn":"uturn","try-make-uturn":"uturn",
  "enter-motorway":"motorway","enter-freeway":"motorway","enter-highway":"motorway",
  "take-exit":"exit-right","motorway-exit-left":"left","exit-motorway-left":"left","motorway-exit-right":"exit-right","exit-motorway-right":"exit-right",
  "take-ferry":"ferry","take-ship-ferry":"ferry","roundabout-cross":"roundabout","roundabout-straight":"roundabout",
  "roundabout-right":"roundabout","roundabout-left":"roundabout","roundabout-back":"roundabout",
  "entrance-ramp":"straight","waypoint-left":"waypoint","waypoint-right":"waypoint","waypoint-reached":"waypoint"
 };
 if(p.indexOf("tomtom")>=0&&tomtom[key]){
   if(key.indexOf("roundabout")===0){var tx=Number(input.exit||input.exitNumber||input.exit_number||input.roundaboutExitNumber);if(tx>=1&&tx<=6)return "roundabout-exit-"+tx}
   return tomtom[key];
 }
 if((key==="turn"||key==="turning")&&mod)return mod;
 if((key==="fork"||key==="keep")&&mod)return key+"-"+mod.replace(/^keep-/,"");
 if(key==="roundabout"||key==="rotary"){var exit=Number(input.exit||input.exitNumber||input.exit_number);if(exit>=1&&exit<=6)return "roundabout-exit-"+exit;return "roundabout"}
 if(key==="arrive"||key==="arrival"||key==="destination")return "arrive";
 if(key==="depart"||key==="departure")return "start";
 if(key==="continue"||key==="new-name"||key==="name-change"||key==="notification")return "straight";
 if(key==="on-ramp"||key==="off-ramp"||key==="ramp")return mod||"straight";
 if(key==="merge"||key==="ferry"||key==="uturn"||key==="u-turn")return key;
 return raw;
}
function resolve(input){if(typeof input==="number"&&registry[input])return registry[input];if(input&&typeof input==="object"){if(Number.isInteger(input.id)&&registry[input.id])return registry[input.id];input=providerKey(input)}var key=normalize(input),id=aliases[key];if(!id){for(var i=1;i<=96;i++)if(registry[i]&&registry[i].key===key){id=i;break}}return registry[id||1]}
function ensureImage(){var oldSvg=document.getElementById("rzManeuverPath"),host=oldSvg&&oldSvg.closest("svg");if(!host)host=document.querySelector("#rzGuide svg");if(!host)return null;var img=document.getElementById("olenManeuverIcon");if(!img){img=document.createElement("img");img.id="olenManeuverIcon";img.alt="";img.setAttribute("aria-hidden","true");img.style.cssText="width:64px;height:64px;object-fit:contain;display:block;filter:drop-shadow(0 0 8px rgba(65,255,222,.18));";host.insertAdjacentElement("afterend",img)}host.style.display="none";return img}
function render(maneuver){var item=resolve(maneuver),img=ensureImage();if(img&&img.getAttribute("src")!==item.asset)img.setAttribute("src",item.asset);return item}
function set(data){data=data||{};var item=render(data.id||data.type||data.key||data.maneuver||data.action||1),t=document.getElementById("rzGuideText"),r=document.getElementById("rzRoadName"),d=document.getElementById("rzNextDistance"),line=document.getElementById("rzRoadLine");if(t&&data.instruction!=null)t.textContent=data.instruction;if(r&&data.road!=null)r.textContent=data.road;if(line)line.hidden=data.road===false||data.road==="";if(d&&data.distance!=null)d.textContent=data.distance;return item}
var api=Object.freeze({version:VERSION,registry:registry,aliases:aliases,asset:asset,providerKey:providerKey,resolve:resolve,render:render,set:set});
global.OLENManeuvers=api;
var previous=global.OLENNavigationGuide||{};
global.OLENNavigationGuide=Object.assign({},previous,{set:set,resolve:resolve,render:render,registry:registry,version:VERSION});
})(window);

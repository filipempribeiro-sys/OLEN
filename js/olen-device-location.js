/* Shared Web/Android/Worker contract. Never infer a device fix from a place or text. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.OLENDeviceLocation=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const FRESH_MS=60000;
 function normalize(value,now=Date.now()){
  const v=value&&typeof value==='object'?value:{};
  const permissionState=['granted','denied','prompt','unavailable'].includes(v.permissionState)?v.permissionState:'unavailable';
  const stamp=typeof v.capturedAt==='string'?Date.parse(v.capturedAt):NaN;
  const valid=permissionState==='granted'&&typeof v.latitude==='number'&&typeof v.longitude==='number'&&Number.isFinite(v.latitude)&&Number.isFinite(v.longitude)&&Math.abs(v.latitude)<=90&&Math.abs(v.longitude)<=180&&Number.isFinite(stamp)&&stamp<=now+5000;
  const ageMs=valid?Math.max(0,now-stamp):null;
  return {latitude:valid?v.latitude:null,longitude:valid?v.longitude:null,accuracyMeters:valid&&typeof v.accuracyMeters==='number'&&Number.isFinite(v.accuracyMeters)&&v.accuracyMeters>=0?v.accuracyMeters:null,capturedAt:valid?new Date(stamp).toISOString():null,source:['gps','network','browser','fused'].includes(v.source)?v.source:'unknown',permissionState,isFresh:valid&&ageMs<=FRESH_MS,ageMs};
 }
 function fromPlatform(p,source){const c=p?.coords;return normalize({latitude:c?.latitude,longitude:c?.longitude,accuracyMeters:c?.accuracy,capturedAt:typeof p?.timestamp==='number'&&Number.isFinite(p.timestamp)?new Date(p.timestamp).toISOString():null,source,permissionState:'granted'});}
 function intent(text){const t=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/google\s*maps/.test(t))return 'external';
  if(/\b(?:morada|endereco|rua onde estou|em que rua)\b/.test(t)&&(/onde (?:eu )?estou|minha (?:morada|localizacao)|(?:morada|endereco) atual|aqui|rua onde estou|em que rua/.test(t)||/^(?:(?:qual e|diz.me|mostra.me) (?:a |o )?)?(?:morada|endereco)(?: (?:exata|exato|atual))?[?!.\s]*$/.test(t)))return 'address';
  if(/coordenadas.*(?:minha|atuais|onde estou)|(?:minhas?|atuais).*coordenadas|^(?:coordenadas)(?: gps)?[?!.\s]*$/.test(t))return 'coordinates';
  if(/(?:mostra|abre|ver|centra).*(?:nosso mapa|mapa\/go|no mapa|aqui.*mapa|minha localizacao|minha posicao)/.test(t))return 'map';
  if(/onde (?:eu )?estou|minha (?:localizacao|posicao)|localizacao exata|acede.*localizacao/.test(t))return /meteo|tempo|chuva|chover/.test(t)?'weather':'location';
  // A named destination supplies the research location; it must not be blocked by local GPS permission.
  if(/(?:tempo|meteorologia|meteo|chover|chuva).*\b(?:em|no|na|para)\s+[a-z]/.test(t)&&!/aqui|perto de mim|minha localizacao|minha posicao|onde estou|meu local|minha zona/.test(t))return '';
  if(/tempo (?:aqui|hoje|ai)|meteorologia|meteo|vai chover|estado do tempo/.test(t))return 'weather';
  if(/o que (?:sugeres|posso fazer|recomendas).*hoje|sugest.*hoje/.test(t))return 'today';
  if(/perto de mim|ao meu redor|proxim[oa].*de mim/.test(t))return 'nearby';
  if(/leva.me ate|ir ate/.test(t))return 'destination';
  return '';
 }
 function missing(v){if(v.permissionState==='denied')return 'A localização está recusada. Autoriza-a nas permissões da OLEN ou indica a tua localidade.';if(v.latitude!==null&&!v.isFresh)return 'A última localização já não é recente. Não a vou apresentar como a tua posição atual. Ativa a localização e tenta novamente, ou indica a tua localidade.';return 'Não tenho uma localização atual confirmada. Ativa a localização do dispositivo e autoriza a OLEN, ou indica a tua localidade.';}
 function action(type,v){const fix=normalize(v);return fix.isFresh&&['OPEN_MAP_AT_CURRENT_LOCATION','OPEN_EXTERNAL_MAP_AT_CURRENT_LOCATION'].includes(type)?{type,deviceLocation:fix}:null;}
 function localUnavailable(text,v){const kind=intent(text),fix=normalize(v);return kind&&kind!=='destination'&&!fix.isFresh?missing(fix):null;}
 function validateAction(a,now=Date.now()){return a&&action(a.type,normalize(a.deviceLocation,now));}
 return {FRESH_MS,normalize,fromPlatform,intent,missing,localUnavailable,action,validateAction};
});

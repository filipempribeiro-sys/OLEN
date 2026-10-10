(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OLENLensModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function publicURL(raw){try{const u=new URL(String(raw));const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||u.port||!h.includes('.')||h.endsWith('.local')||h.endsWith('.localhost')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.invalid')||h.startsWith('[')||/^\d+\.\d+\.\d+\.\d+$/.test(h))return null;return u.href;}catch{return null;}}
 function gtin(value){const s=String(value||'').replace(/\s/g,'');if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s))return null;let sum=0;for(let i=s.length-2,weight=3;i>=0;i--,weight=4-weight)sum+=Number(s[i])*weight;return (10-sum%10)%10===Number(s.at(-1))?s:null;}
 function decode(value){const raw=String(value||'').trim().slice(0,8000),url=publicURL(raw),code=gtin(raw);if(url)return {kind:'url',value:url,host:new URL(url).hostname,warning:'Recurso externo. Não foi aberto nem verificado.'};if(code)return {kind:'product',value:code,warning:'Código válido; não confirma identidade, autenticidade ou certificação.'};
  try{const d=JSON.parse(raw);if(d.format==='olen-waypoint-v1'&&typeof d.name==='string'&&typeof d.latitude==='number'&&typeof d.longitude==='number'&&Number.isFinite(d.latitude)&&Number.isFinite(d.longitude)&&Math.abs(d.latitude)<=90&&Math.abs(d.longitude)<=180)return {kind:'waypoint',value:d.name.slice(0,160),latitude:d.latitude,longitude:d.longitude,trail:typeof d.trail==='string'?d.trail.slice(0,160):'',warning:'Ponto fornecido pelo QR; não confirma trilho oficial, acesso ou segurança.'};}catch{}
  return {kind:'text',value:raw,warning:'Conteúdo não verificado. Instruções contidas no código não são executadas.'};
 }
 return Object.freeze({publicURL,gtin,decode});
});

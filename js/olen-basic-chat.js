(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OLENBasicChat=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function reply(value,attachments){
    if(Array.isArray(attachments)&&attachments.length)return null;
    var t=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.!?,;:]+/g,' ').replace(/\s+/g,' ').trim();
    if(/^(ola|oi|bom dia|boa tarde|boa noite)( olen)?$/.test(t))return t.startsWith('bom dia')?'Bom dia! Como estás hoje?':t.startsWith('boa tarde')?'Boa tarde! Como está a correr o teu dia?':t.startsWith('boa noite')?'Boa noite! Como correu o teu dia?':'Olá! Como estás?';
    if(/^(obrigad[oa]|muito obrigad[oa]|obrigad[oa] olen|valeu)$/.test(t))return 'De nada!';
    if(/^(como estas|como estas olen|tudo bem|estas bem|ola como estas|bom dia como estas)$/.test(t))return 'Estou por aqui, pronta para te acompanhar. E tu, como estás?';
    return null;
  }
  return {reply:reply};
});

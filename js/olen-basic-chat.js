(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OLENBasicChat=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function reply(value,attachments){
    if(Array.isArray(attachments)&&attachments.length)return null;
    var t=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.!?,;:]+/g,' ').replace(/\s+/g,' ').trim();
    if(/^(ola|oi|bom dia|boa tarde|boa noite)( olen)?$/.test(t))return t.startsWith('bom dia')?'Bom dia! Como estás hoje?':t.startsWith('boa tarde')?'Boa tarde! Como está a correr o teu dia?':t.startsWith('boa noite')?'Boa noite! Como correu o teu dia?':'Diz-me o que tens em mente.';
    if(/^(obrigad[oa]|muito obrigad[oa]|obrigad[oa] olen|valeu)$/.test(t))return 'De nada!';
    if(/^((?:ola |oi |bom dia |boa tarde |boa noite )?(?:como (?:estas|tas)|(?:tudo|td|ta|esta) (?:bem|bom)|(?:estas|tas) bem)(?: olen)?)$/.test(t))return 'Tudo bem por aqui. E contigo?';
    if(/^(?:estou|tou|to) (?:bem|otim[oa]|fixe)(?: obrigad[oa])?$/.test(t))return 'Ainda bem! Diz-me o que tens em mente.';
    if(/^(?:ate ja|ate logo|ate amanha|adeus|tchau)(?: olen)?$/.test(t))return 'Até à próxima!';
    return null;
  }
  return {reply:reply};
});

(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OLENChatStream=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 async function read(response,onDelta){
  if(!String(response.headers.get('content-type')||'').includes('text/event-stream'))return response.json();
  if(!response.body?.getReader)throw Error('A resposta progressiva não está disponível neste dispositivo.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result=null,answer='';
  try{while(true){const chunk=await reader.read();buffer+=chunk.done?decoder.decode():decoder.decode(chunk.value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');if(buffer.length>2000000)throw Error('Resposta demasiado grande.');let i;
   while((i=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,i);buffer=buffer.slice(i+2);const event=block.match(/^event:\s*(\w+)/m)?.[1],raw=block.split('\n').filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');if(!raw)continue;const data=JSON.parse(raw);
    if(event==='delta'){answer+=String(data.text||'');onDelta?.(answer,data);}
    if(event==='done')result=data;
    if(event==='error')throw Object.assign(Error(data.error||'A resposta foi interrompida.'),{code:data.code});
   }if(chunk.done)break;
  }if(!result)throw Error('A ligação terminou antes de concluir a resposta.');return result;
  }catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 }
 return {read};
});

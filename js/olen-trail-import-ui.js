/* OLEN GPX import control. Only explicitly chosen local files are read.
   This never publishes GPS data or labels an imported path official. */
(function(){
 'use strict';
 const button=document.getElementById('rzImportGPX'),file=document.getElementById('rzGPXFile');
 const prepare=document.getElementById('rzPrepare'),destination=document.getElementById('rzDestination');
 if(!button||!file||!prepare||!destination)return;
 const notice=(message,error=false)=>{
  const status=document.getElementById('olenMapStatus');
  if(status){status.textContent=message;status.hidden=!message;status.classList.toggle('error',!!error)}
 };
 button.addEventListener('click',()=>file.click());
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected)return;
  button.disabled=true;
  try{
   if(selected.size>window.OLENGPX.MAX_BYTES)throw new Error('O ficheiro GPX excede o limite permitido.');
   const parsed=window.OLENGPX.parse(await selected.text());
   const summary=await window.OLENMapRouting.previewTrail(parsed);
   destination.value=summary.name;prepare.textContent='Seguir trilho';
   notice('GPX preparado · '+summary.pointCount+' pontos. O percurso ainda não foi homologado.');
  }catch(error){
   notice(error?.message||'Não foi possível importar este GPX.',true);
  }finally{
   file.value='';button.disabled=false;
  }
 });
 destination.addEventListener('input',()=>{if(destination.value!==window.OLENMapRouting?.state?.selectedTrail?.name)
   prepare.textContent='Preparar rota'});
})();

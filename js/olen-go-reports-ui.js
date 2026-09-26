/* OLEN local report flow. No silent publishing, no background GPS sharing. */
(function(){
 'use strict';
 const popup=document.getElementById('rzReportPop');
 if(!popup||!window.OLENGoReports)return;
 const storage=(()=>{try{return window.localStorage}catch(_){return null}})();
 const reports=window.OLENGoReports.create(storage);
 const options=Array.from(popup.querySelectorAll('.rz-reports button'));
 const typeNames=window.OLENGoReports.TYPES;
 const severity=popup.querySelector('.rz-report-form select');
 const description=popup.querySelector('.rz-report-form textarea');
 const button=popup.querySelector('.rz-publish');
 const note=popup.querySelector('.rz-report-note');
 let type=null;
 options.forEach((option,index)=>option.addEventListener('click',()=>{
   type=typeNames[index];
   options.forEach(item=>item.setAttribute('aria-pressed',String(item===option)));
   note.textContent='Report local · seleciona a severidade e descreve a ocorrência.';
 }));
 if(button){
   button.textContent='Guardar report no dispositivo';
   button.addEventListener('click',async()=>{
     if(!type){note.textContent='Escolhe primeiro o tipo de ocorrência.';return}
     if(!navigator.geolocation?.getCurrentPosition){note.textContent='Localização GPS indisponível.';return}
     button.disabled=true;
     try{
       const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
         {enableHighAccuracy:true,maximumAge:5000,timeout:14000}));
       const item=reports.save({type,level:['information','caution','danger'][severity?.selectedIndex||0],
         description:description?.value||'',position:position.coords});
       if(!item)throw new Error('Não foi possível guardar o report neste dispositivo.');
       note.textContent='Report guardado localmente. Ainda não foi publicado na comunidade.';
       if(description)description.value='';
       popup.hidden=true;
       const status=document.getElementById('olenMapStatus');
       if(status){status.textContent=note.textContent;status.hidden=false;status.classList.remove('error')}
     }catch(error){
       note.textContent=error?.code===1?'Autoriza o GPS para associar a localização ao report.':
         error?.message||'Não foi possível registar o report.';
     }finally{button.disabled=false}
   });
 }
 window.OLENLocalReports=Object.freeze({list:()=>reports.list(),remove:id=>reports.remove(id)});
})();

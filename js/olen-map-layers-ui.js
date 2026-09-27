/* OLEN Aurora map layer controls. Only presentation, no map ownership. */
(function(){
 'use strict';
 const panel=document.getElementById('rzLayersPop'),close=document.getElementById('rzLayersClose');
 if(!panel||!close)return;
 const inputs=Array.from(panel.querySelectorAll('[data-olen-layer]'));
 function sync(){
  const layers=window.OLENMapRouting?.state?.layers||{};
  inputs.forEach(input=>{input.checked=layers[input.dataset.olenLayer]!==false});
 }
 close.addEventListener('click',()=>{panel.hidden=true});
 panel.addEventListener('click',event=>{if(event.target===panel)panel.hidden=true});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)panel.hidden=true});
 inputs.forEach(input=>input.addEventListener('change',()=>{
  window.OLENMapRouting?.setLayerVisible?.(input.dataset.olenLayer,input.checked);
 }));
 document.querySelector('[data-rz-tool][aria-label="Camadas"]')?.addEventListener('click',sync);
 sync();
})();

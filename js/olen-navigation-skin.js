/* OLEN Navigation Skin — DOM composition only. The GO runtime and 96 Maneuvers
   remain the exclusive owners of navigation and turn instructions. */
(function(){
'use strict';
function init(){
 const screen=document.querySelector('.screen[data-screen="map"]');
 if(!screen||screen.dataset.olenNavSkin==='1')return;
 const bottom=document.getElementById('rzBottom');
 const trip=bottom?.querySelector('.rz-trip');
 const stop=document.getElementById('rzStop');
 const speed=bottom?.querySelector('.rz-speed');
 const report=document.getElementById('rzReportActive');
 const header=screen.querySelector('.rz-header-idle');
 if(!bottom||!trip||!stop||!speed||!report||!header)return;
 screen.dataset.olenNavSkin='1';
 const logo=document.createElement('img');
 logo.className='olen-navigation-wordmark';
 logo.src='./assets/olen-wordmark.png';
 logo.alt='OLEN';
 logo.loading='eager';
 header.insertBefore(logo,header.firstChild);
 const time=document.createElement('span');
 const value=document.createElement('b');
 value.id='rzTimeRemaining';
 value.textContent='—';
 const label=document.createElement('small');
 label.textContent='TEMPO';
 time.append(value,label);
 trip.appendChild(time);
 bottom.insertBefore(stop,speed);
 bottom.classList.add('olen-nav-bottom');
 stop.textContent='■ STOP';
 stop.setAttribute('aria-label','Parar navegação GO');
 report.textContent='＋ Reportar';
 report.setAttribute('aria-label','Reportar ocorrência');
 const status=document.getElementById('olenMapStatus');
 let timeout=null;
 if(status&&typeof MutationObserver!=='undefined'){
   const observer=new MutationObserver(function(){
     if(timeout!==null)clearTimeout(timeout);
     timeout=null;
     if(status.textContent.trim()==='Navegação terminada. O percurso mantém-se no mapa.'&&!status.hidden){
       timeout=setTimeout(function(){
         if(status.textContent.trim()==='Navegação terminada. O percurso mantém-se no mapa.')status.hidden=true;
       },3500);
     }
   });
   observer.observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
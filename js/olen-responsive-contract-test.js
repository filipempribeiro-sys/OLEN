/* OLEN standalone responsive contract test — deterministic, no network/Render. */
(async()=>{
'use strict';
const results=[];
function ok(name,pass,detail=''){results.push({name,pass:!!pass,detail});if(!pass)throw new Error(name+(detail?': '+detail:''))}
ok('runtime core',!!window.OLEN5?.core);
ok('runtime router',!!window.OLEN5?.router);
ok('runtime bootstrap',!!window.OLEN5?.bootstrap?.started);
ok('agenda owner',!!window.OLEN5?.agenda);
ok('official assets',!!document.querySelector('img.official-wordmark')&&getComputedStyle(document.getElementById('splash')).backgroundImage.includes('olen-splash-bacground.png'));
const navs=[...document.querySelectorAll('.nav')];
ok('five footer destinations',navs.length===5,String(navs.length));
for(const view of ['home','map','chat','agenda','account']){
 window.OLEN5.router.enter(view,{history:false,reason:'responsive-contract'});
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const dom=view==='account'?'profile':view;
 const screen=document.querySelector('[data-screen="'+dom+'"]');
 ok('route '+view,window.OLEN5.router.current===view&&screen?.classList.contains('active'));
}
const footer=document.querySelector('.footer'),composer=document.querySelector('.composer');
ok('footer fixed',getComputedStyle(footer).position==='fixed');
ok('composer exists',!!composer);
const width=innerWidth;
const expected=width<700?'mobile':width<1024?'tablet':'desktop';
const screen=document.querySelector('.screen.active');
const cs=screen?getComputedStyle(screen):null;
ok('responsive width',document.documentElement.scrollWidth<=innerWidth+1,document.documentElement.scrollWidth+' / '+innerWidth);
ok('active screen bounded',!!screen&&screen.getBoundingClientRect().width<=innerWidth+1);
const sidebar=document.querySelector('.desktop-sidebar'),footer=document.querySelector('.footer');
if(width>=1100){ok('desktop sidebar visible',getComputedStyle(sidebar).display!=='none');ok('desktop footer replaced',getComputedStyle(footer).display==='none')}
else if(width>=700){ok('tablet keeps touch footer',getComputedStyle(footer).display!=='none');ok('tablet no desktop sidebar',getComputedStyle(sidebar).display==='none')}
else{ok('mobile footer visible',getComputedStyle(footer).display!=='none');ok('mobile no desktop sidebar',getComputedStyle(sidebar).display==='none')}
ok('safe responsive layout',!!cs&&parseFloat(cs.paddingLeft)>=0&&parseFloat(cs.paddingRight)>=0);
const report={pass:results.every(x=>x.pass),profile:expected,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},results};
window.__OLEN_RESPONSIVE_TEST__=report;
console.table(results);console.log('OLEN RESPONSIVE CONTRACT',report);
})();
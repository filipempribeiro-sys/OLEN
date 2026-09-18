import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const width=Number(process.env.VP_WIDTH),height=Number(process.env.VP_HEIGHT),name=process.env.VP_NAME;
const dir='artifacts/'+name; await fs.mkdir(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,800));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width,height}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4173/?test',{waitUntil:'networkidle'});
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.__OLEN_RESPONSIVE_TEST__!==undefined);
 const report=await page.evaluate(()=>window.__OLEN_RESPONSIVE_TEST__);
 const routes=['home','map','chat','agenda','profile'];
 for(const route of routes){
   const selector='[data-view="'+route+'"]';
   const candidates=page.locator(selector);
   let clicked=false;
   for(let i=0;i<await candidates.count();i++){
     const candidate=candidates.nth(i);
     if(await candidate.isVisible()){await candidate.click();clicked=true;break}
   }
   if(!clicked)throw new Error('No visible navigation control for '+route);
   await page.waitForTimeout(120);
   await page.screenshot({path:dir+'/'+route+'.png',fullPage:true});
 }
 const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth}));
 const result={name,width,height,report,overflow,errors};
 await fs.writeFile(dir+'/result.json',JSON.stringify(result,null,2));
 if(!report.pass||errors.length||overflow.doc>width+1||overflow.body>width+1){console.error(result);process.exitCode=1}
 else console.log(JSON.stringify(result,null,2));
}finally{if(browser)await browser.close();server.kill()}

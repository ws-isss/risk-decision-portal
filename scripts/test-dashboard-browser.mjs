import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const html=await readFile(path.join(root,'dist/index.html'));
const server=createServer((req,res)=>{if(req.url?.startsWith('/risk-decision-portal/')){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}else{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[];
try{
 await mkdir(path.join(root,'output'),{recursive:true});
 for(const mode of ['source','subpath','mobile']){
  const context=await browser.newContext({offline:mode!=='subpath',viewport:mode==='mobile'?{width:390,height:844}:{width:1440,height:1050}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(mode==='subpath'?`http://127.0.0.1:${server.address().port}/risk-decision-portal/`:pathToFileURL(path.join(root,mode==='source'?'index.html':'dist/index.html')).href);
  assert.equal(await page.locator('#dashboard-risk').count(),1);
  await page.locator('#language-menu summary').click();await page.locator('[data-language="zh"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  assert.equal(await page.locator('header').count(),1);
  await page.locator('#notifications-toggle').click();
  const toggle=await page.locator('#notifications-toggle').boundingBox(),panel=await page.locator('#notifications-panel').boundingBox();assert.ok(panel.y>=toggle.y+toggle.height);
  await page.locator('#notifications-toggle').click();
  await page.locator('.more-roles summary').click();await page.locator('#viewer').selectOption('P03');assert.equal(await page.locator('#viewer').inputValue(),'P03');
  await page.locator('[data-viewer="P01"]').click();
  await page.screenshot({path:path.join(root,'output',`home-${mode}-top.png`)});
  await page.locator('[href="#exceptions"]').first().click();
  assert.equal(await page.locator('main').getAttribute('data-page'),'home');
  await page.screenshot({path:path.join(root,'output',`home-${mode}-exceptions.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  if(mode==='mobile'){
   await page.locator('#tour-start').click();await page.locator('#confirm-tour-start').click();
   await page.locator('#demo-next-step').click();await page.locator('#demo-next-step').click();
   await page.locator('[data-select-plan="A"]').click();await page.locator('#draft-task-briefs').click();await page.locator('#confirm-task-briefs').click();await page.locator('#tour-next-act').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const bar=await page.locator('.demo-timeline').boundingBox();assert.ok(bar.height<300,'Tour controls leave room to read content on a phone');
   await page.screenshot({path:path.join(root,'output','tour-mobile-act-two.png')});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Dashboard browser checks passed: relative source file, standalone mobile, local repository subpath, Chinese entries, navigation, collapsed roles, accessible notifications and tour footer space.');
}finally{await browser.close();await new Promise(r=>server.close(r));}

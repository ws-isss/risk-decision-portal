import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
await mkdir(path.join(root,'output'),{recursive:true});const errors=[];
async function role(p,id){await p.locator('.more-roles').evaluate(el=>el.open=true);await p.locator('#viewer').selectOption(id);}
async function shot(p,name,target){await p.locator(target).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(root,'output',name+'.png')});}
try {
 for(const lang of ['en','zh']){
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:1050}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(root,'dist/index.html')).href+'#risk');
  if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  const d=await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA)));
  const published=lang==='zh'?/药明发布证据/:/WuXi published evidence/;
  const received=lang==='zh'?/客户团队收到证据/:/Customer team received evidence/;
  const response=lang==='zh'?/资源及暂留回复.*计划时间.*最晚.*11月16日/:/Resource and hold response.*planned time.*latest.*11\/16/;
  const expiry=lang==='zh'?/资源确认最晚期限（报价有效期）/:/Latest resource confirmation deadline \(quotation expiry\)/;
  for(const id of Object.keys(d.people)){
   await role(p,id);
   const pub=p.locator('[data-risk-event="materialReady"]'),rec=p.locator('[data-risk-event="customerPacketAvailable"]'),reply=p.locator('[data-risk-event="resourceConfirmed"]'),deadline=p.locator('[data-risk-event="resourceConfirmationDeadline"]');
   assert.match(await pub.innerText(),published);assert.match(await rec.innerText(),received);assert.match(await reply.innerText(),response);assert.match(await deadline.innerText(),expiry);
   for(const [row,at] of [[pub,d.events.materialReady.at],[rec,d.events.customerPacketAvailable.at],[reply,d.events.resourceConfirmed.at],[deadline,d.events.resourceConfirmationDeadline.at]]) assert.equal(Date.parse(await row.locator('time').first().getAttribute('datetime')),Date.parse(at));
   assert.notEqual(Date.parse(d.events.materialReady.at),Date.parse(d.events.customerPacketAvailable.at));
   assert.equal(await reply.getAttribute('data-event-status'),'planned');
   assert.doesNotMatch(await reply.innerText(),/subject to confirmation|初步/i);
   if(['P07','P08'].includes(id))assert.equal(await pub.locator('[data-new-york-time] time').getAttribute('datetime'),d.events.materialReady.at);
   await p.locator('[data-info="evidenceVersion"] summary').click();const ny=p.locator('[data-evidence-new-york]');assert.equal(await ny.locator('time').getAttribute('datetime'),d.events.materialReady.at);assert.match(await ny.innerText(),lang==='zh'?/03:00.*纽约/:/3:00 AM.*New York/);await p.keyboard.press('Escape');
   await p.locator('#notifications-toggle').click();const evidence=p.locator('[data-notification-kind="reviewReady"]');for(const notice of await evidence.all()){assert.match(await notice.locator('.notification-title').innerText(),received);assert.equal(await notice.locator('[data-notification-received] time').getAttribute('datetime'),d.events.customerPacketAvailable.at);}await p.keyboard.press('Escape');
  }
  await role(p,'P07');await shot(p,`time-evidence-and-resource-${lang}`,'#risk-timeline');
  await p.locator('[data-info="evidenceVersion"] summary').click();await shot(p,`time-evidence-conversion-${lang}`,'#risk-evidence');await p.keyboard.press('Escape');
  await role(p,'P01');await p.locator('#notifications-toggle').click();await shot(p,`time-client-receipt-${lang}`,'#risk-evidence');await p.keyboard.press('Escape');
  await p.locator('#chapter-select').selectOption('hold');assert.match(await p.locator('#decision-deadline').innerText(),expiry);assert.match(await p.locator('#wuxi').innerText(),response);
  await shot(p,`time-resource-plan-${lang}`,'#wuxi');
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await p.evaluate(()=>JSON.stringify(DEMO_DATA)),JSON.stringify(d));await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Time wording checks passed: eight roles in both languages, separate publication and receipt events, unchanged instants with New York conversion, one planned resource reply and a distinct quotation-expiry deadline; offline and mobile.');
}finally{await browser.close();}

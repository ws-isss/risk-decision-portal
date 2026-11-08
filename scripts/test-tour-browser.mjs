import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[],results=[];await mkdir(path.join(root,'output'),{recursive:true});
const url=pathToFileURL(path.join(root,'dist/index.html')).href;
const clock=p=>p.locator('.demo-clock time').getAttribute('datetime');
const source={select:'[data-select-plan="A"]',draft:'#draft-task-briefs',confirm:'#confirm-task-briefs',managementBrief:'#generate-management-brief',previewBrief:'#preview-management-brief',attachBrief:'#attach-management-brief',viewAttachment:'#view-management-brief',replyReceipt:'#return-resource-receipt'};
async function next(p,key) {
 const guide=p.locator('#demo-next-step');assert.equal(await guide.getAttribute('data-guide-key'),key);const before=await clock(p);await guide.click();assert.equal(await clock(p),before);
 if(source[key]) await p.locator(source[key]).click();
 if(key==='draft') await p.locator('#confirm-task-briefs').waitFor();
 if(key==='managementBrief') await p.locator('#management-brief-editor').waitFor();
 if(key==='authorize'){await p.locator('#fill-example-signature').click();await p.locator('#authorization-form [name="acknowledged"]').check();await p.locator('#authorize-budget').click();}
}
async function begin(p){await p.locator('#tour-start, #tour-restart').first().click();await p.locator('#confirm-tour-start').click();}
try {
 for(const lang of ['en','zh']) {
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:1050}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
  if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  assert.equal(await p.locator('main').getAttribute('data-page'),'home');assert.equal(await p.locator('[data-dashboard-plan]').count(),2);
  assert.equal(await p.locator('.dashboard > .page-heading [href="#main"]').count(),0,'No duplicate workspace button');
  const data=await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA)));
  const disabled=await p.locator('.dashboard-modules button').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity,cursor:getComputedStyle(el).cursor}));
  assert.equal(disabled.cursor,'not-allowed');assert.ok(Number(disabled.opacity)<1);assert.equal(disabled.bg,'rgb(229, 231, 235)');
  await p.screenshot({path:path.join(root,'output',`dashboard-${lang}.png`),fullPage:true});
  await begin(p);const times=[await clock(p)];
  assert.equal(await p.locator('.tour-timeline #chapter-select').count(),0,'No chapter reset inside the active guide');
  await next(p,'openRisk');await next(p,'compare');await next(p,'select');await next(p,'draft');
  const editor=p.locator('[data-draft-role="technical"]');await editor.fill(lang==='zh'?'Emma 实际编辑的技术任务。':'Emma edited this technical task.');
  const edited=await editor.inputValue();await next(p,'confirm');
  assert.equal(await p.locator('#tour-next-act').isEnabled(),true);await p.locator('#tour-next-act').click();times.push(await clock(p));
  assert.equal(await p.locator('#notice').textContent(),'','Act transition clears both toast and live-region text');
  assert.equal(await p.locator('.tour-timeline').getAttribute('data-tour-act'),'2');assert.match(await p.locator('.tour-guidance').innerText(),lang==='zh'?/预置演示记录/:/Preset demo records/);
  assert.ok((await p.locator('[data-created-task="technical"] p').textContent()).includes(edited));
  await next(p,'managementBrief');await next(p,'previewBrief');await next(p,'attachBrief');await next(p,'viewAttachment');
  assert.equal(await p.locator('#management-brief-editor').count(),0,'Elena cannot see private editor');
  await next(p,'authorize');
  assert.equal(await p.locator('#notice').getAttribute('class'),'notice visible');
  for(const viewport of [{width:390,height:844},{width:1440,height:1050}]) {
    await p.setViewportSize(viewport);await p.waitForTimeout(100);
    const toast=await p.locator('#notice').boundingBox(),bar=await p.locator('.tour-timeline').boundingBox();
    assert.ok(toast.y+toast.height<=bar.y,'Toast must sit above, not over, the guide controls');
    assert.ok(bar.height<(viewport.width===390?330:190),'Compact guide height');
    for(const id of ['tour-full','tour-restart']) {const b=await p.locator('#'+id).boundingBox();assert.ok(b.y>=bar.y && b.y+b.height<=viewport.height);}
  }
  const basis=await p.locator('[data-authorization-basis="main"]').innerText();
  await p.locator('#tour-next-act').click();times.push(await clock(p));assert.equal(await p.locator('.tour-timeline').getAttribute('data-tour-act'),'3');
  assert.equal(await p.locator('[data-authorization-basis="main"]').innerText(),basis,'Act 3 preserves signed basis');
  assert.equal(await p.locator('#notice').textContent(),'','Third act clears authorization toast');
  await next(p,'replyReceipt');await next(p,'finish');
  assert.equal(await p.locator('#notice').textContent(),'','No old authorization toast on the completed dashboard');
  assert.equal(await p.locator('#notice.visible').count(),0);assert.equal(await p.locator('main').getAttribute('data-page'),'home');assert.equal(await p.locator('#tour-summary').count(),1);
  assert.equal(await p.locator('[data-dashboard-plan]').count(),0);assert.equal(await p.locator('[data-dashboard-selected="A"]').count(),1);
  assert.equal(await p.locator('[data-dashboard-timing="holdExpiry"] time').getAttribute('datetime'),data.plans.A.holdUntil);
  assert.equal(await p.locator('[data-dashboard-timing="authorization"]').count(),0);assert.equal(await p.locator('[data-dashboard-timing="resource"]').count(),0);
  assert.deepEqual(times,[data.initialClock,data.events.budgetAuthorized.at,data.events.resourceConfirmed.at]);
  assert.equal(await p.locator('[data-exception]').first().getAttribute('data-exception'),'quality');
  await p.screenshot({path:path.join(root,'output',`tour-complete-${lang}.png`),fullPage:true});
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:path.join(root,'output',`dashboard-mobile-${lang}.png`),fullPage:true});
  await p.locator('[data-exception="quality"]').click();await p.locator('[data-enter-exception="quality"]').click();assert.equal(await p.locator('#viewer').inputValue(),'P03');assert.equal(await p.locator('#review-quality-form [name="outcome"]').inputValue(),'');
  await p.locator('#review-quality-form [name="outcome"]').selectOption('needsInformation');await p.locator('#review-quality-form [type="submit"]').click();
  await p.locator('[data-viewer="P06"]').click();assert.equal(await p.locator('#authorize-budget').isDisabled(),true);
  await p.locator('.workspace-nav [href="#home"]').click();assert.match(await p.locator('[data-dashboard-status]').innerText(),lang==='zh'?/补充/:/information/i);
  assert.equal(await p.locator('[data-dashboard-blocker-owner]').getAttribute('data-dashboard-blocker-owner'),'P01');
  assert.match(await p.locator('[data-dashboard-blocker-owner]').innerText(),lang==='zh'?/Emma.*补充证据或调整范围后重新提交/:/Emma.*add evidence or adjust the scope.*resubmit/);
  assert.match(await p.locator('[data-dashboard-task="decisions"]').innerText(),lang==='zh'?/受阻/:/Blocked/);
  assert.equal(await p.locator('[data-dashboard-task="decisions"] > strong').innerText(),'1');
  await p.screenshot({path:path.join(root,'output',`qa-blocked-home-${lang}.png`)});

  await begin(p);await next(p,'openRisk');await next(p,'compare');await p.locator('[data-select-plan="B"]').click();assert.equal(await p.locator('#tour-next-act').isDisabled(),true);assert.match(await p.locator('#tour-blocker').innerText(),/A/);
  await p.locator('#tour-choose-a').click();assert.match(await p.locator('[data-select-plan="A"]').innerText(),lang==='zh'?/已选/:/Selected/);
  await p.locator('[data-select-plan="B"]').click();await p.locator('#draft-task-briefs').click();await p.locator('#confirm-task-briefs').click();
  assert.equal(await p.locator('#tour-next-act').isDisabled(),true);assert.equal(await p.locator('#tour-choose-a').count(),0,'Created task scope remains locked');
  const beforeExit=await clock(p);await p.locator('#tour-full').click();assert.equal(await clock(p),beforeExit);assert.equal(await p.locator('.tour-timeline').count(),0);assert.equal(await p.locator('#decision').getAttribute('data-task-count'),'3');
  assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA))),data);
  results.push({lang,times,disabled});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'output','tour-browser-qa.json'),JSON.stringify({results,errors},null,2));console.log('Tour browser checks passed: English and Chinese complete three-act guides, frozen attachment/signature continuity, dashboard lifecycle, QA entry, B guard, disabled style, mobile layout and offline file.');
} finally {await browser.close();}

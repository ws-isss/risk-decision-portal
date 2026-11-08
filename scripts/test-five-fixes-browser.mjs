import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
await mkdir(path.join(root,'output'),{recursive:true});
const errors=[],url=pathToFileURL(path.join(root,'dist/index.html')).href;
async function role(p,id){await p.locator('.more-roles').evaluate(el=>el.open=true);await p.locator('#viewer').selectOption(id);}
async function route(p,hash){await p.evaluate(hash=>{location.hash=hash;},hash);await p.waitForTimeout(60);}
async function shot(p,id,target){if(target) await p.locator(target).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(root,'output',id+'.png'),style:'#notice { visibility:hidden !important; }'});}
async function begin(p,plan){await p.locator('#chapter-select').selectOption('selection');await p.locator(`[data-select-plan="${plan}"]`).click();await p.locator('#draft-task-briefs').click();await p.locator('#confirm-task-briefs').waitFor();await p.locator('#confirm-task-briefs').click();await p.locator('#assign-support').click();await p.locator('#designate-approver').click();await role(p,'P05');await p.locator('#accept-support').click();for(const [id,kind] of [['P02','technical'],['P03','quality']]){await role(p,id);await p.locator('#start-'+kind).click();}}
async function review(p,kind,outcome){await role(p,kind==='quality'?'P03':'P02');await p.locator(`#review-${kind}-form [name="outcome"]`).selectOption(outcome);if(outcome!=='approved') await p.locator(`#review-${kind}-form [name="reason"]`).fill(await p.locator('html').getAttribute('lang')==='zh-CN'?'需要补充缩小规模模型回收率数据后才能支持本次小试。':'Recovery data for the scale-down model is required before this study can proceed.');}
async function submit(p,kind){await p.locator(`#review-${kind}-form [type="submit"]`).click();}
async function sign(p,reschedule=false){await role(p,'P06');await p.locator(reschedule?'#fill-reschedule-signature':'#fill-example-signature').click();await p.locator(`#${reschedule?'reschedule-authorization':'authorization'}-form [name="acknowledged"]`).check();await p.locator(reschedule?'#authorize-reschedule':'#authorize-budget').click();}
async function brief(p){await role(p,'P01');await p.locator('#generate-management-brief').click();await p.locator('#management-brief-editor').waitFor();return p.locator('#management-brief-editor').inputValue();}
try {
 for(const lang of ['en','zh']){
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:1050}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
  if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  const d=await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA)));
  await begin(p,'B');await role(p,'P01');await route(p,'main');
  assert.match(await p.locator('#milestone-strip').innerText(),lang==='zh'?/2月15日.*\n.*候选窗口，待确认/s:/Feb 15.*\n.*Candidate window.*pending confirmation/s);
  assert.match(await p.locator('#milestone-strip').innerText(),lang==='zh'?/4月22日/:/Apr 22/);
  await shot(p,`five-b-milestones-${lang}`,'#context');
  await route(p,'home');assert.match(await p.locator('[data-dashboard-window]').innerText(),lang==='zh'?/2月15日/:/Feb 15/);assert.match(await p.locator('[data-dashboard-delivery]').innerText(),lang==='zh'?/4月22日/:/Apr 22/);
  await route(p,'main');await role(p,'P07');assert.equal(await p.locator('#edit-requirement').count(),0);await p.locator('[data-info="requirement"] summary').click();
  await shot(p,`five-readonly-requirement-${lang}`,'#comparison');
  await role(p,'P08');assert.equal(await p.locator('#edit-requirement').count(),0);await role(p,'P01');await p.locator('#edit-requirement').click();
  assert.equal(await p.locator('#requirement-form input').count(),1);assert.equal(await p.locator('#requirement-date').getAttribute('type'),'date');await p.locator('#requirement-date').fill('2027-03-20');await p.locator('#requirement-form [type="submit"]').click();
  assert.match(await p.locator('#milestone-strip').innerText(),lang==='zh'?/4月22日/:/Apr 22/);
  await p.locator('#advance-event').click();for(const kind of ['technical','quality']){await review(p,kind,'approved');await submit(p,kind);}
  await sign(p);await role(p,'P07');await p.locator('#request-reschedule').click();await p.locator('#advance-event').click();await role(p,'P08');await p.locator('#record-reschedule-quote').click();await role(p,'P07');await p.locator('#return-reschedule-quote').click();await p.locator('#advance-event').click();await role(p,'P01');await p.locator('#launch-reschedule-decision').click();await role(p,'P06');
  assert.match(await p.locator('#reschedule-included-fee').innerText(),/\$40,000.*\$10,000/s);assert.match(await p.locator('#reschedule-included-fee').innerText(),lang==='zh'?/非新增费用/:/not an additional fee/);
  await shot(p,`five-b-release-${lang}`,'#reschedule-included-fee');
  await sign(p,true);await p.locator('#advance-event').click();await role(p,'P07');await p.locator('#confirm-reschedule').click();await route(p,'main');
  const milestone=await p.locator('#milestone-strip').innerText();assert.match(milestone,lang==='zh'?/已确认/:/Confirmed/);assert.match(milestone,lang==='zh'?/待重新评估/:/reassess/i);assert.doesNotMatch(milestone,/Apr 22|4月22日|Mar 11|3月11日/);
  await route(p,'home');assert.match(await p.locator('[data-dashboard-delivery]').innerText(),lang==='zh'?/重新评估/:/reassess/i);
  await route(p,'main');const finalBrief=await brief(p);assert.doesNotMatch(finalBrief,/Apr 22|4月22日|Mar 11|3月11日/);
  // Same-day rejection, explicit scope-change branch, then v2 still waits for the original completion time.
  await begin(p,'A');await review(p,'quality','needsInformation');assert.equal(await p.locator('#review-quality-form [type="submit"]').isEnabled(),true);await submit(p,'quality');await role(p,'P01');
  assert.equal(await p.locator('#review-resubmit-form [name="mode"]:checked').count(),0);assert.equal(await p.locator('#resubmit-reviews').isDisabled(),true);
  await p.locator('#review-resubmit-form [name="mode"][value="scopeChange"]').check();await shot(p,`five-scope-change-${lang}`,'#review-blockers');
  assert.match(await p.locator('#scope-change-notice').innerText(),/Emma.*Alex/s);assert.equal(await p.locator('#resubmit-reviews').isDisabled(),true);assert.equal(await p.locator('#decision').getAttribute('data-request-version'),'1');
  await route(p,'home');assert.match(await p.locator('[data-dashboard-blocker-owner]').innerText(),/Emma.*Alex/s);assert.equal(await p.locator('[data-dashboard-blocked]').count(),1);
  await route(p,'main');await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true);await role(p,'P01');
  await p.locator('#review-resubmit-form [name="mode"][value="evidence"]').check();await p.locator('#review-resubmit-form [name="supplement"]').fill(lang==='zh'?'补充原范围内的回收率证据。':'Added recovery evidence within the original scope.');await p.locator('#resubmit-reviews').click();
  assert.equal(await p.locator('#decision').getAttribute('data-request-version'),'2');assert.equal(await p.locator('.demo-clock time').getAttribute('datetime'),d.initialClock);
  for(const [id,kind] of [['P02','technical'],['P03','quality']]){await role(p,id);await p.locator('#start-'+kind).click();await review(p,kind,'approved');assert.equal(await p.locator(`#review-${kind}-form [type="submit"]`).isDisabled(),true);}
  await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true);await p.locator('#advance-event').click();
  for(const kind of ['technical','quality']){await review(p,kind,'approved');assert.equal(await p.locator(`#review-${kind}-form [type="submit"]`).isEnabled(),true);await submit(p,kind);}await sign(p);assert.equal(await p.locator('#decision-status').getAttribute('data-authorized'),'true');
  // The other immediate outcome is equally available; scope choice stays visible on narrow screens.
  await begin(p,'A');await review(p,'technical','rejected');assert.equal(await p.locator('#review-technical-form [type="submit"]').isEnabled(),true);await submit(p,'technical');await role(p,'P01');await p.locator('#review-resubmit-form [name="mode"][value="scopeChange"]').check();
  await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await shot(p,`five-scope-mobile-${lang}`,'#scope-change-notice');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Five fixes browser checks passed in English and Chinese, offline: selected B/current milestones, read-only requirement, scope choices and blockers, same-day v2 guard and original B release explanation.');
}finally{await browser.close();}

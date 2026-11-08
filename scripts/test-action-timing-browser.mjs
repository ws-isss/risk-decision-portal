import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const checks=[],errors=[];await mkdir(path.join(root,'output'),{recursive:true});
const selectors={editRisk:'#review-publication-draft',publishRisk:'#publish-risk',select:'[data-select-plan="A"]',draft:'#draft-task-briefs',confirm:'#confirm-task-briefs',assignSupport:'#assign-support',designate:'#designate-approver',acceptSupport:'#accept-support',startTechnical:'#start-technical',startQuality:'#start-quality',completeTechnical:'#review-technical-form [type="submit"]',completeQuality:'#review-quality-form [type="submit"]',managementBrief:'#generate-management-brief',updateBrief:'#regenerate-management-brief',previewBrief:'#preview-management-brief',attachBrief:'#attach-management-brief',startResources:'#start-resource-review',replyReceipt:'#return-resource-receipt',reschedule:'#request-reschedule',rescheduleQuote:'#record-reschedule-quote',returnQuote:'#return-reschedule-quote',rescheduleDecision:'#launch-reschedule-decision',confirmReschedule:'#confirm-reschedule'};
const clock=p=>p.locator('.demo-clock time').getAttribute('datetime');
async function step(p,outcome,trace) {
  const guide=p.locator('#demo-next-step');
  if(await guide.count()) {
    const key=await guide.getAttribute('data-guide-key'),before=await clock(p);await guide.click();
    assert.equal(await clock(p),before);
    if(['completeTechnical','completeQuality'].includes(key)) await p.locator(`${key==='completeTechnical'?'#review-technical-form':'#review-quality-form'} [name="outcome"]`).selectOption('approved');
    if(['authorize','rescheduleAuthorization'].includes(key)) {
      const res=key==='rescheduleAuthorization',form=p.locator(res?'#reschedule-authorization-form':'#authorization-form');
      await p.locator(res?'#fill-reschedule-signature':'#fill-example-signature').click();await form.locator('[name="acknowledged"]').check();await form.locator('[type="submit"]').click();
    } else if(key==='scheduling') {await p.locator('#resource-response-form [name="outcome"]').selectOption(outcome);await p.locator('#confirm-resource-response').click();}
    else {assert.ok(selectors[key],key);await p.locator(selectors[key]).click();}
    if(key==='draft') await p.locator('#confirm-task-briefs').waitFor();
    if(['managementBrief','updateBrief'].includes(key)) await p.locator('#management-brief-editor').waitFor();
    trace.push({action:key,at:await clock(p)});
  } else {
    const advance=p.locator('#advance-event');if(await advance.isDisabled()) return false;
    await advance.click();trace.push({advance:await clock(p)});
  }
  assert.equal(await p.locator('#decision-error:visible').count(),0);
  return true;
}
try {
  for(const lang of ['en','zh']) for(const chapter of ['selection','prepublication','hold','unavailable']) {
    const context=await browser.newContext({offline:true,viewport:lang==='zh'?{width:390,height:844}:{width:1440,height:1050}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(pathToFileURL(path.join(root,'dist/index.html')).href+'#main');
    if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
    const data=await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA))),trace=[];
    if(chapter!=='selection') await p.locator('#chapter-select').selectOption(chapter);
    if(chapter==='selection') {
      await p.locator('[data-select-plan="A"]').click();await p.locator('#draft-task-briefs').click();await p.locator('#confirm-task-briefs').click();
      assert.equal(await clock(p),data.initialClock);assert.equal(await p.locator('#assign-support').isEnabled(),true);assert.equal(await p.locator('#designate-approver').isEnabled(),true);
      await p.locator('#assign-support').click();await p.locator('#designate-approver').click();assert.equal(await clock(p),data.initialClock);
      for(const id of ['P05','P06']) {
        await p.locator('#viewer').selectOption(id,{force:true});await p.locator('#notifications-toggle').click();
        const notice=p.locator('[data-notification-received]').first();assert.match(await notice.innerText(),lang==='zh'?/收到于/:/Received at/);
        assert.equal(await notice.locator('time').getAttribute('datetime'),data.initialClock);
        await p.locator('#notifications-toggle').click();
      }
      assert.equal(await p.locator('#authorize-budget').isDisabled(),true);assert.match(await p.locator('#budget-action-blocker').innerText(),/QA/);
      await p.locator('#viewer').selectOption('P01',{force:true});
      assert.match(await p.locator('#task-assignBen [data-task-actual]').innerText(),/9:00|09:00/);
      assert.equal(await p.locator('#task-assignBen .action-due > time').getAttribute('datetime'),data.events.backupAssigned.at);
      await p.screenshot({path:path.join(root,'output',`early-assignment-${lang}.png`),fullPage:true});
    }
    for(let n=0;n<65;n++) if(!await step(p,chapter==='unavailable'?'unavailable':'held',trace)) break;
    if(chapter==='unavailable') assert.equal(await p.locator('#reschedule-workspace').getAttribute('data-reschedule-stage'),'confirmed');
    else assert.equal(await p.locator('#wuxi-response').getAttribute('data-receipt-outcome'),'held');
    if(chapter==='selection') {
      const advances=trace.filter(x=>x.advance).map(x=>x.advance);
      assert.deepEqual(advances,[data.events.reviewsComplete.at,data.events.resourceConfirmed.at]);
      assert.equal(trace.find(x=>x.action==='authorize').at,data.events.reviewsComplete.at);
    }
    assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(DEMO_DATA))),data);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    checks.push({lang,chapter,trace});await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(path.join(root,'output','action-timing-qa.json'),JSON.stringify({checks,errors},null,2));
  console.log('Action timing browser checks passed: English and Chinese four-chapter guides, 09:00 assignment and designation, received timestamps, prerequisites, skipped unlock advances, fixed external waits, offline and mobile.');
} finally {await browser.close();}

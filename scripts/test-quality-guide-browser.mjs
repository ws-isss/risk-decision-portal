import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[],checks=[];await mkdir(path.join(root,'output'),{recursive:true});
const clock=p=>p.locator('.demo-clock time').getAttribute('datetime');
async function guide(p,key,role){
 assert.equal(await p.locator('#demo-next-step').getAttribute('data-guide-key'),key);
 const before=await clock(p);await p.locator('#demo-next-step').click();assert.equal(await clock(p),before);assert.equal(await p.locator('#viewer').inputValue(),role);
}
try{
 for(const lang of ['en','zh']){
  const context=await browser.newContext({offline:true,viewport:lang==='en'?{width:1440,height:1050}:{width:390,height:844}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(root,'dist/index.html')).href);
  if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  await p.locator('[data-exception="quality"]').click();await p.locator('[data-enter-exception="quality"]').click();
  const start=await clock(p);assert.equal(await p.locator('#viewer').inputValue(),'P03');
  const hint=await p.locator('#advance-blocker').innerText();assert.match(hint,lang==='zh'?/请选择“需要补充信息”/:/choose More information required/);assert.doesNotMatch(hint,/choose Agree|选择“同意”/);
  assert.match(await p.locator('#review-quality-form textarea').inputValue(),lang==='zh'?/缩小规模模型回收率数据/:/recovery data for the scale-down model/);
  await guide(p,'qaMoreInfo','P03');assert.equal(await p.locator('#review-quality-form select').inputValue(),'','Guide cannot choose an outcome');
  await p.locator('#review-quality-form select').selectOption('needsInformation');await p.locator('#review-quality-form [type="submit"]').click();
  assert.equal(await p.locator('[data-confirmation-key="quality"]').getAttribute('data-status'),'needsInformation');
  await guide(p,'qaEmmaBlocker','P01');assert.match(await p.locator('#review-blockers').innerText(),lang==='zh'?/Emma.*补充/:/Emma/);
  assert.equal(await p.locator('#decision').getAttribute('data-request-version'),'1','Viewing blocker does not resubmit');
  assert.equal(await p.locator('#review-resubmit-form textarea').inputValue(),'');
  await guide(p,'qaElenaBlocked','P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true);assert.equal(await p.locator('#authorization-signature').inputValue(),'');
  assert.equal(await p.locator('#decision-status').getAttribute('data-authorized'),'false');
  await p.screenshot({path:path.join(root,'output',`qa-guide-authorization-${lang}.png`)});
  await guide(p,'managementBrief','P01');await p.locator('#generate-management-brief').click();await p.locator('#management-brief-editor').waitFor();
  const first=(await p.locator('#management-brief-editor').inputValue()).split('\n')[0];assert.match(first,lang==='zh'?/授权受阻.*QA.*需要补充信息/:/authorization.*blocked.*QA.*More information required/i);
  await guide(p,'previewBrief','P01');await p.locator('#preview-management-brief').click();assert.equal(await p.locator('#demo-next-step').count(),0);assert.match(await p.locator('#advance-blocker').innerText(),lang==='zh'?/未发生授权或资源确认/:/No authorization or resource confirmation/);
  assert.equal(await clock(p),start);assert.equal(await p.locator('#decision-status').getAttribute('data-authorized'),'false');
  assert.equal(await p.locator('[data-authorization-basis]').count(),0);assert.equal(await p.locator('#advance-event').isDisabled(),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await p.screenshot({path:path.join(root,'output',`qa-guide-brief-${lang}.png`)});
  // Explicit re-entry resets presentation progress, not the meaning of outcomes.
  await p.locator('#chapter-select').selectOption('quality');assert.equal(await p.locator('#demo-next-step').getAttribute('data-guide-key'),'qaMoreInfo');
  await p.locator('#review-quality-form select').selectOption('approved');await p.locator('#review-quality-form [type="submit"]').click();assert.match(await p.locator('#advance-blocker').innerText(),lang==='zh'?/没有触发 QA 拦截/:/no QA blocker/);assert.equal(await p.locator('#decision-status').getAttribute('data-authorized'),'false');
  checks.push({lang,first,clock:start});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'output','quality-guide-qa.json'),JSON.stringify({checks,errors},null,2));console.log('QA exception guide passed in English and Chinese: Nina needs information, Emma owns follow-up, Elena is blocked, brief opens with blocker, explicit outcomes, no automatic resubmission/authorization, stable clock and reset.');
}finally{await browser.close();}

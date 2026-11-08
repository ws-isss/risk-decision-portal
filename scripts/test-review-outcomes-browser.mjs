import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[],checks=[];
await mkdir(path.join(root,'output'),{recursive:true});
const role=(p,id)=>p.locator('#viewer').selectOption(id);
async function review(p,kind,outcome,reason) {
  await role(p,kind==='quality'?'P03':'P02');
  const form=p.locator(`#review-${kind}-form`);
  await form.locator('[name="outcome"]').selectOption(outcome);
  await form.locator('[name="reason"]').fill(reason);
  await form.locator('[type="submit"]').click();
  assert.equal(await p.locator(`[data-confirmation-key="${kind}"]`).getAttribute('data-status'),outcome);
}
async function generate(p) {
  await role(p,'P01');
  if(await p.locator('#regenerate-management-brief').count()) {
    await p.locator('#regenerate-management-brief').click();
    if(await p.locator('#confirm-regenerate-brief').isVisible()) await p.locator('#confirm-regenerate-brief').click();
  } else await p.locator('#generate-management-brief').click();
  await p.locator('#management-brief-editor').waitFor();
  return p.locator('#management-brief-editor').inputValue();
}
async function screenshot(p,name) {
  await p.screenshot({path:path.join(root,'output',name),fullPage:true,style:'#notice {visibility:hidden !important;}'});
}
async function run(lang,outcome,mobile=false) {
  const context=await browser.newContext({offline:true,viewport:mobile?{width:390,height:844}:{width:1440,height:1050}});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(root,'dist/index.html')).href);
  if(lang==='zh') {await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  const original=await p.evaluate(()=>JSON.stringify(DEMO_DATA));
  await p.locator('#chapter-select').selectOption('coverage');
  await role(p,'P01');await p.locator('#assign-support').click();
  await role(p,'P05');await p.locator('#accept-support').click();
  await role(p,'P01');await p.locator('#designate-approver').click();await p.locator('#advance-event').click();
  await role(p,'P03');
  assert.equal(await p.locator('#review-quality-form [name="outcome"]').inputValue(),'','Outcome has no default');
  await p.locator('#review-quality-form [type="submit"]').click();
  assert.equal(await p.locator('[data-confirmation-key="quality"]').getAttribute('data-status'),'inProgress','No result means no recorded approval');
  await review(p,'technical','approved',lang==='zh'?'同意当前小试范围。':'The bounded technical scope is acceptable.');
  const negative=outcome==='rejected'?'Not approved. Additional quality evidence is required before this study can proceed.':'Additional quality evidence is required. Please supplement the evidence and resubmit.';
  await review(p,'quality',outcome,negative);
  const expected=lang==='zh'?(outcome==='rejected'?'不同意':'需要补充信息'):(outcome==='rejected'?'Disagree':'More information required');
  assert.ok((await p.locator('#priority-risk').innerText()).includes(expected));
  await role(p,'P01');assert.equal(await p.locator('#task-resolveReviews').count(),1);
  assert.match(await p.locator('#review-blockers').innerText(),/Emma/);
  await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true);
  assert.ok((await p.locator('#review-blockers').innerText()).includes(expected));
  assert.equal(await p.locator('.signature-record').count(),0);
  const blockedBrief=await generate(p);
  assert.ok(blockedBrief.split('\n')[0].includes(expected),'First brief line identifies QA opposition or missing information');
  assert.ok(!/Technical and QA agree|技术及 QA（质量保证）均同意/.test(blockedBrief));
  await p.locator('#preview-management-brief').click();await p.locator('#attach-management-brief').click();
  await role(p,'P06');assert.ok((await p.locator('#management-brief-preview').innerText()).includes(expected));
  await screenshot(p,`review-${lang}-${outcome}-blocked.png`);
  if(outcome==='needsInformation') {
    await role(p,'P01');
    await p.locator('#review-resubmit-form [name="supplement"]').fill(lang==='zh'?'补充质量证据说明，范围限定为现有样品和已确认的方法，请重新评估。':'Provide the additional quality evidence; restrict the scope to existing samples and confirmed methods. Please reassess.');
    const before=await p.locator('.demo-clock time').getAttribute('datetime');
    await p.locator('#resubmit-reviews').click();
    assert.equal(await p.locator('.demo-clock time').getAttribute('datetime'),before,'Resubmission never rewinds the clock');
    assert.equal(await p.locator('#decision').getAttribute('data-request-version'),'2');
    for(const kind of ['technical','quality']) assert.equal(await p.locator(`[data-confirmation-key="${kind}"]`).getAttribute('data-status'),'readyForReview');
    await p.locator('#review-version-history > summary').click();
    assert.match(await p.locator('[data-review-history-version="1"]').innerText(),lang==='zh'?/已失效/:/superseded/);
    assert.ok((await p.locator('[data-review-history-version="1"]').innerText()).includes(expected));
    await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true);
    assert.equal(await p.locator('#management-brief-preview').count(),0,'The v1 brief is not the active v2 attachment');
    await role(p,'P02');await p.locator('#start-technical').click();
    assert.equal(await p.locator('#review-technical-form [name="outcome"]').inputValue(),'','Old selection is cleared');
    await review(p,'technical','approved','Agree to the revised request v2.');
    await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isDisabled(),true,'Both reviewers must decide again');
    await role(p,'P03');await p.locator('#start-quality').click();await review(p,'quality','approved','The additional quality evidence supports request v2.');
    const currentBrief=await generate(p);
    assert.ok(!currentBrief.split('\n')[0].includes(expected),'New brief is not still blocked after both Agree to v2');
    await p.locator('#preview-management-brief').click();await p.locator('#attach-management-brief').click();
    await role(p,'P06');assert.equal(await p.locator('#authorize-budget').isEnabled(),true);
    await p.locator('#fill-example-signature').click();await p.locator('#authorization-form [name="acknowledged"]').check();await p.locator('#authorize-budget').click();
    assert.equal(await p.locator('#decision-status').getAttribute('data-authorized'),'true');
    assert.match(await p.locator('[data-authorization-basis="main"]').getAttribute('data-authorization-request-key'),/:v2$/);
    assert.match(await p.locator('.signature-record').innerText(),/v2/);
    assert.match(await p.locator('#decision').innerText(),/\$80,000/);
    await screenshot(p,`review-${lang}-v2-authorized.png`);
  }
  assert.equal(await p.evaluate(()=>JSON.stringify(DEMO_DATA)),original);
  if(mobile) assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'New review controls fit 390px');
  checks.push(`${lang}: ${outcome}${outcome==='needsInformation'?' → request v2 → two new Agree results → authorization':''}`);
  await context.close();
}
try {
  await run('en','rejected');await run('zh','rejected');await run('en','needsInformation');await run('zh','needsInformation',true);
  assert.deepEqual(errors,[]);
  await writeFile(path.join(root,'output/review-outcomes-qa.json'),JSON.stringify({checks,errors},null,2));
  console.log('Review outcome browser checks passed: both languages, rejected authorization/brief, supplementary v2 with two fresh approvals, old review and brief isolation, v2 signature and mobile layout.');
} finally {await browser.close();}

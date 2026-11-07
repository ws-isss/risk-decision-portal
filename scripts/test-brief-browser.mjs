import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, mkdtemp, copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const endpointsOnly = process.argv.includes('--endpoints-only');
const authorizationVersionsOnly = process.argv.includes('--authorization-versions-only');
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-brief-offline-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [], network = [];

async function makePage(mobile = false, clipboardMode = mobile ? 'exec' : 'rich') {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, offline: true });
  await context.addInitScript(({ clipboardMode }) => {
    globalThis.testCopies = [];
    globalThis.testRichCopies = [];
    globalThis.ClipboardItem = class ClipboardItem {
      constructor(parts) { this.parts = parts; this.types = Object.keys(parts); }
      getType(type) { return Promise.resolve(this.parts[type]); }
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async items => {
        if (clipboardMode !== 'rich') throw new Error('Rich clipboard unavailable in this local-file test');
        const item = items[0];
        const plain = await (await item.getType('text/plain')).text();
        const html = await (await item.getType('text/html')).text();
        globalThis.testCopies.push(plain);
        globalThis.testRichCopies.push({ plain, html });
      },
      writeText: async content => {
        if (clipboardMode === 'exec') throw new Error('Clipboard API unavailable in this local-file test');
        globalThis.testCopies.push(content);
      }
    } });
    if (clipboardMode === 'exec') document.execCommand = command => {
      if (command !== 'copy') return false;
      globalThis.testCopies.push(document.activeElement.value ?? document.getSelection().toString());
      return true;
    };
  }, { clipboardMode });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  return { page, context };
}
const clock = page => page.locator('.demo-clock time').getAttribute('datetime');
const exceptionTimes = {
  requested: '2026-11-16T09:00:00+08:00', quote: '2026-11-17T15:00:00+08:00', returned: '2026-11-17T17:00:00+08:00',
  decision: '2026-11-17T10:00:00-05:00', authorized: '2026-11-18T15:00:00-05:00',
  confirmed: '2026-11-20T17:00:00+08:00'
};
const copies = page => page.evaluate(() => globalThis.testCopies);
const normalized = content => content.replace(/\s+/g, ' ').trim();
const wordCount = content => normalized(content).split(' ').length;
const prerequisiteLabels = ['technical study-scope review', 'QA study-scope review', 'approver designation'];
function pendingPrerequisites(content, expected) {
  const pending = content.split('\n').find(line => line.includes('Pending before authorization:'));
  assert.ok(pending, 'An early brief identifies the approvals that are still outstanding');
  for (const label of prerequisiteLabels) assert.equal(pending.includes(label), expected.includes(label), `Only outstanding ${label} belongs in the pending list`);
  assert.doesNotMatch(content, /Technical and QA study-scope reviews and approver designation: completed\./, 'An incomplete prerequisite list must not claim completion');
}
function currentOnly(content) {
  assert.doesNotMatch(content, /\$80,000|\$40,000|Mar 11|Apr 22|Historical comparison|previous conditional delivery|8 calendar days before|34 calendar days after/i, 'Inactive A/B quotes and delivery forecasts stay in the decision record, outside the current brief');
}
async function role(page, id) {
  const before = await clock(page);
  await page.locator('#viewer').selectOption(id);
  assert.equal(await clock(page), before);
}
async function privateFromElena(page, { content, checkRisk = false, state } = {}) {
  await role(page, 'P06');
  assert.equal(await page.locator('#management-brief-editor, #management-brief-preview, #view-management-brief').count(), 0, 'No current draft or attachment is exposed to Elena before explicit attachment to this request');
  if (await page.locator('#management-brief').count()) assert.ok(await page.locator('#brief-version-history').count(),'Only previous-request attachment history may remain visible');
  if (content) assert.ok(!(await page.locator('body').innerText()).includes(content), 'Emma’s private wording is absent from Elena’s rendered page');
  if (state) assert.equal(await page.locator('#authorization-brief-status').getAttribute('data-brief-state'), state);
  if (checkRisk) {
    await page.locator('#risk-title a').click();
    assert.equal(await page.locator('#management-brief-editor, #management-brief-preview').count(), 0, 'Risk-page navigation does not reveal the private draft');
    if (content) assert.ok(!(await page.locator('body').innerText()).includes(content));
    await page.locator('.risk-back').click();
  }
}
async function businessSnapshot(page) {
  return page.evaluate(() => ({ clock:document.querySelector('.demo-clock time')?.dateTime, taskCount:document.querySelector('#decision')?.dataset.taskCount, authorized:document.querySelector('#decision-status')?.dataset.authorized, confirmations:[...document.querySelectorAll('[data-confirmation-key]')].map(node=>[node.dataset.confirmationKey,node.dataset.status]), resourceStatus:document.querySelector('#wuxi')?.dataset.resourceStatus, incurred:document.querySelector('#wuxi [data-fee-incurred]')?.dataset.feeIncurred }));
}
async function attach(page) {
  const before = await businessSnapshot(page);
  const expected = await page.locator('#management-brief-preview').innerText();
  await page.locator('#attach-management-brief').click();
  assert.deepEqual(await businessSnapshot(page), before, 'Attaching a brief never changes approval, task, resource, fee or clock records');
  return expected;
}
async function sharedReadonly(page, { content, state, version } = {}) {
  await role(page, 'P06');
  const panel = page.locator('#management-brief');
  assert.equal(await panel.getAttribute('data-brief-readonly'), 'true', 'Elena reads the shared brief without becoming its editor');
  assert.equal(await page.locator('#management-brief-editor, #generate-management-brief, #regenerate-management-brief, #edit-management-brief, #copy-management-brief, #preview-management-brief, #attach-management-brief').count(), 0, 'Elena has no generation, editing, preview-confirmation, attachment or copy controls');
  if (content) assert.ok((await page.locator('#management-brief-preview').innerText()).includes(content), 'The read-only brief contains Emma’s exact manual wording');
  if (state) assert.equal(await page.locator('#authorization-brief-status').getAttribute('data-brief-state'), state);
  if (version) {
    assert.equal(await page.locator('#management-brief-preview').getAttribute('data-brief-version'), String(version));
    assert.match(await panel.innerText(), new RegExp(`v${version}[\\s\\S]*Emma|Emma[\\s\\S]*v${version}`, 'i'));
    assert.match(await panel.innerText(), /attached|data as of/i, 'The frozen version retains attribution, attachment time and data-as-of metadata');
  }
}
async function noRepeatedBriefGuide(page, message) {
  const next = page.locator('#demo-next-step');
  const key = await next.count() ? await next.getAttribute('data-guide-key') : null;
  assert.ok(!['managementBrief', 'updateBrief', 'previewBrief', 'attachBrief'].includes(key), message);
}
async function advanceTo(page, at) {
  while (Date.parse(await clock(page)) < Date.parse(at)) {
    const before = await clock(page);
    const resource = page.locator('#wuxi');
    const status = await resource.count() ? await resource.getAttribute('data-resource-status') : null;
    assert.equal(await page.locator('#advance-event').isEnabled(), true, `A pending action must not block advancement before ${at}`);
    await page.locator('#advance-event').click();
    assert.ok(Date.parse(await clock(page)) > Date.parse(before));
    assert.ok(Date.parse(await clock(page)) <= Date.parse(at));
    assert.equal(await resource.count() ? await resource.getAttribute('data-resource-status') : null, status, 'Advancement never submits the next resource action');
  }
  assert.equal(Date.parse(await clock(page)), Date.parse(at));
}
async function chapter(page, id) {
  await page.locator('#chapter-select').selectOption(id);
  assert.equal(await page.locator('#management-brief').count(), 0, 'Explicit chapter reset discards the prior brief and manual edits');
  assert.match(await page.locator('#chapter-notice').innerText(), /reset|fresh scenario/i);
}
async function generate(page, status) {
  const before = await clock(page);
  await role(page, 'P01');
  if (await page.locator('#regenerate-management-brief').count()) await page.locator('#regenerate-management-brief').click();
  else await page.locator('#generate-management-brief').click();
  if (await page.locator('#confirm-regenerate-brief').isVisible()) await page.locator('#confirm-regenerate-brief').click();
  await page.locator('#management-brief-editor').waitFor();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-status'), status);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  assert.equal(await clock(page), before, 'Brief generation does not alter the simulation clock');
  assert.equal(await page.locator('#copy-management-brief').count(), 0, 'An unpreviewed draft cannot be copied');
  assert.equal(await page.locator('#management-brief-editor').evaluate(node => node.scrollHeight <= node.clientHeight + 2), true, 'The editor expands to fit the complete brief');
  return page.locator('#management-brief-editor').inputValue();
}
async function preview(page, { generated = true } = {}) {
  const before = await copies(page);
  await page.locator('#preview-management-brief').click();
  const recipient = page.locator('#management-brief-preview');
  const content = await recipient.innerText();
  assert.deepEqual(await copies(page), before, 'Preview never automatically copies or sends a brief');
  assert.match(content, /Demo data[\s\S]*Case design assumption[\s\S]*AI draft \(simulated\)/);
  assert.match(content, /Data as of:/);
  assert.match(content, /Source versions:[\s\S]*SEC-001 v1/);
  const beforeAuthorization = await page.locator('#management-brief').getAttribute('data-brief-status') === 'beforeAuthorization';
  assert.equal(await recipient.locator('table').count(), beforeAuthorization ? 1 : 0, 'A/B comparison belongs only in an authorization-before brief; later states summarize the current result');
  if (beforeAuthorization) assert.equal(await recipient.locator('table tbody tr').count(), 2);
  assert.ok(await recipient.locator('strong, h1, h2, h3, h4').count() > 0, 'The recipient preview has a bold title');
  assert.ok(await recipient.locator('li').count() <= 3, 'At most three unresolved items are shown');
  if (beforeAuthorization) assert.equal(await recipient.evaluate(node => Boolean(node.querySelector('table').compareDocumentPosition(node.querySelector('ul')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, 'The A/B table appears before unresolved items');
  assert.match(await page.locator('#management-brief-word-count').innerText(), new RegExp(`^${wordCount(content)} words`), 'The displayed count covers exactly the recipient text');
  if (generated) {
    assert.ok(wordCount(content) >= 150 && wordCount(content) <= 200, `The complete generated recipient brief is 150–200 English words; got ${wordCount(content)}`);
    assert.equal((content.match(/case design assumption/gi) || []).length, 1);
    assert.equal((content.match(/not a delivery commitment/gi) || []).length, 1);
  }
  return content;
}
async function copyFresh(page) {
  const expected = await page.locator('#management-brief-preview').innerText();
  const before = (await copies(page)).length;
  await page.locator('#copy-management-brief').click();
  await page.waitForFunction(count => globalThis.testCopies.length === count + 1, before);
  await page.locator('#management-brief-copied').waitFor();
  const actual = await copies(page);
  assert.equal(actual.length, before + 1);
  assert.equal(normalized(actual.at(-1)), normalized(expected), 'Plain clipboard content matches the formatted recipient preview');
  const richCopies = await page.evaluate(() => globalThis.testRichCopies);
  if (richCopies.length) {
    const rich = richCopies.at(-1);
    assert.equal(normalized(rich.plain), normalized(expected));
    assert.equal(/<table[\s>]/.test(rich.html), await page.locator('#management-brief-preview table').count() > 0, 'The rich clipboard preserves the preview’s comparison or current-result structure');
    assert.match(rich.html, /<(?:strong|h[1-4])[\s>]/);
    assert.doesNotMatch(rich.html, /<script|<img|<iframe|<a\s[^>]*href="javascript:/i, 'Copying user-edited content never turns raw HTML into active content');
  }
}
async function capture(page, name) {
  await page.locator('h1').click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, name), fullPage: true, style: '#notice { visibility: hidden !important; }' });
  if (await page.locator('#management-brief-preview').isVisible()) await page.locator('#management-brief').screenshot({ path: path.join(output, name.replace('.png', '-panel.png')), style: '.demo-timeline, .topbar, .skip-link, #notice { visibility: hidden !important; }' });
}
async function mobileLayout(page) {
  const table = page.locator('#management-brief-preview .brief-table-wrap');
  if (await table.count()) {
    assert.equal(await table.evaluate(node => node.scrollWidth > node.clientWidth), true, 'The small-screen A/B table keeps readable columns inside its own scroll region');
    assert.equal(await table.evaluate(node => { node.scrollLeft = node.scrollWidth; return node.scrollLeft > 0; }), true, 'All A/B columns remain reachable on mobile');
    await table.evaluate(node => { node.scrollLeft = 0; });
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'The brief does not create horizontal page overflow');
}
async function returnResource(page, outcome) {
  await chapter(page, 'unavailable');
  await page.locator('#resource-response-form select[name="outcome"]').selectOption(outcome);
  await page.locator('#confirm-resource-response').click();
  await role(page, 'P07');
  await page.locator('#return-resource-receipt').click();
  await role(page, 'P01');
}
async function fee(page, expected) {
  assert.equal(await page.locator('#wuxi [data-fee-incurred]').getAttribute('data-fee-incurred'), String(expected));
}

async function authorizationVersionScenario(page) {
  await chapter(page, 'authorization');
  await generate(page, 'beforeAuthorization');
  const v1 = await preview(page);
  await attach(page);
  await page.locator('#edit-management-brief').click();
  const v2Note = 'Emma’s reviewed coordination note for the authorization package.';
  await page.locator('#management-brief-editor').fill(`${await page.locator('#management-brief-editor').inputValue()}\n\n${v2Note}`);
  await sharedReadonly(page, { state:'current', version:1 });
  assert.ok(!(await page.locator('body').innerText()).includes(v2Note),'Unattached v2 is private');
  await role(page, 'P01');
  const v2 = await preview(page, { generated:false });
  await attach(page);
  await sharedReadonly(page, { state:'current', version:2 });
  assert.equal(await page.locator('#brief-version-history').getAttribute('open'), null,'Version history is collapsed by default');
  await page.locator('#brief-version-history > summary').click();
  const oldVersion = page.locator('[data-brief-history-version="1"]');
  assert.match(await oldVersion.locator('summary').innerText(),/Superseded by v2/);
  assert.match(await oldVersion.locator('summary').innerText(),/Emma Chen[\s\S]*Nov 12, 2026, 5:00 PM ET/);
  await oldVersion.locator('summary').click();
  assert.equal(await page.locator('[data-brief-history-content="1"]').innerText(),v1);
  assert.equal(await oldVersion.locator('textarea,input,button,[contenteditable="true"]').count(),0,'Historical versions have no edit, restore or comparison actions');
  await page.locator('#fill-example-signature').click();
  await page.locator('#authorization-form input[name="acknowledged"]').check();
  await page.locator('#authorize-budget').click();
  const basis = page.locator('[data-authorization-basis="main"]');
  assert.equal(await basis.getAttribute('data-authorized-brief-version'),'2');
  assert.match(await basis.innerText(),/Original decision request[\s\S]*Q-A v1[\s\S]*\$80,000[\s\S]*brief v2[\s\S]*Emma Chen[\s\S]*Nov 12, 2026, 5:00 PM ET/);
  assert.match(await basis.innerText(),/supporting material only/);
  assert.match(await basis.innerText(),/new decision request and authorization/);
  const signedRecord = await basis.innerText();
  const signedBusiness = await businessSnapshot(page);
  await generate(page,'authorized');
  const v3Note = 'Progress update: Alex is coordinating the authorized resource assessment.';
  await page.locator('#management-brief-editor').fill(`${await page.locator('#management-brief-editor').inputValue()}\n\n${v3Note}`);
  await preview(page,{generated:false});
  await attach(page);
  assert.deepEqual(await businessSnapshot(page),signedBusiness,'Attaching progress v3 changes neither approval nor charges');
  assert.equal(await basis.innerText(),signedRecord,'The signed decision, quote and brief-v2 metadata are immutable after v3');
  assert.equal(await page.locator('#fallback-authorization').isDisabled(),true,'Signed scope cannot be enlarged by a later brief');
  assert.equal(await page.locator('[data-select-plan="B"]').isDisabled(),true);
  await sharedReadonly(page,{version:3});
  assert.equal(await basis.getAttribute('data-authorized-brief-version'),'2');
  assert.equal(await basis.innerText(),signedRecord);
  assert.ok((await page.locator('#management-brief-preview').innerText()).includes(v3Note));
  await page.locator('#brief-version-history > summary').click();
  assert.equal(await page.locator('[data-brief-history-version]').count(),3);
  assert.match(await page.locator('[data-brief-history-version="2"] > summary').innerText(),/Superseded by v3/);
  await page.locator('[data-brief-history-version="2"] > summary').click();
  assert.equal(await page.locator('[data-brief-history-content="2"]').innerText(),v2,'Version v2 retains exactly the signed supporting content');
  await basis.screenshot({path:path.join(output,'authorization-bound-to-v2.png')});
  await page.locator('#brief-version-history').screenshot({path:path.join(output,'brief-version-history.png'),style:'.demo-timeline, .topbar, #notice {visibility:hidden !important}'});
  await role(page,'P01');
  await page.locator('#edit-management-brief').click();
  const privateNote = 'Private unfinished fourth draft should never be in attachment history.';
  await page.locator('#management-brief-editor').fill(`${await page.locator('#management-brief-editor').inputValue()}\n\n${privateNote}`);
  await sharedReadonly(page,{version:3});
  assert.ok(!(await page.locator('body').textContent()).includes(privateNote));
  assert.equal(await basis.innerText(),signedRecord);
}

try {
  const { page } = await makePage();
  const frozen = await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA));

  if (authorizationVersionsOnly) {
    await authorizationVersionScenario(page);
  } else {
  if (!endpointsOnly) {
  // Publication and role boundaries also apply to direct links and an in-flight
  // simulated generation; a delayed callback must not reveal a private brief.
  await chapter(page, 'prepublication');
  for (const id of ['P01', 'P02', 'P06', 'P07', 'P08']) {
    await role(page, id);
    await page.evaluate(() => { location.hash = 'management-brief'; });
    await page.waitForTimeout(20);
    assert.equal(await page.locator('#generate-management-brief, #management-brief-editor, #management-brief-preview').count(), 0);
  }
  await chapter(page, 'selection');
  await page.locator('#generate-management-brief').click();
  assert.equal(await page.locator('#management-brief').getAttribute('aria-busy'), 'true');
  await role(page, 'P07');
  await page.waitForTimeout(750);
  assert.equal(await page.locator('#management-brief').count(), 0);
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief[aria-busy="true"]').count(), 0, 'Cancelled generation does not leave a perpetual loading panel');

  // A management brief has independent edits and a recipient preview. Neither
  // generation nor copying creates tasks, authorizes fees or changes evidence.
  const original = await generate(page, 'beforeAuthorization');
  assert.match(original, /\$80,000[\s\S]*\$40,000/);
  assert.match(original, /2\.8%[\s\S]*2\.0%/);
  assert.match(original.split('\n')[0], /\$80,000[\s\S]*\$40,000[\s\S]*Nov 13/);
  assert.match(original, /8 (?:calendar )?days (?:before|early)/);
  assert.match(original, /34 (?:calendar )?days (?:after|late)/);
  pendingPrerequisites(original, prerequisiteLabels);
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0');
  await noRepeatedBriefGuide(page, 'An early manual brief does not create an extra guided checkpoint');
  await preview(page);
  await capture(page, 'brief-before-authorization-clean.png');
  await page.locator('#edit-management-brief').click();
  const edited = `${original}\n\nEmma’s note: preserve this manual wording when the underlying records change. <img src=x onerror="globalThis.briefInjected=true">`;
  await page.locator('#management-brief-editor').fill(edited);
  await page.locator('#risk-title a').click();
  await page.locator('#risk-evidence').waitFor();
  await page.locator('.risk-back').click();
  assert.equal(await page.locator('#management-brief-editor').inputValue(), edited);
  await privateFromElena(page, { content: 'Emma’s note: preserve this manual wording', checkRisk:true });
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief-editor').inputValue(), edited);
  const initialPreview = await preview(page, { generated: false });
  assert.ok(initialPreview.includes('Emma’s note: preserve this manual wording'));
  assert.equal(await page.locator('#management-brief-preview img').count(), 0);
  assert.equal(await page.evaluate(() => globalThis.briefInjected), undefined);
  assert.ok(initialPreview.includes('<img src=x'), 'Raw HTML in a PM note remains visible text');
  await copyFresh(page);
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0');
  assert.equal(await page.locator('#attach-management-brief:enabled').count(), 0, 'A private preview cannot be attached before a decision request exists');
  await privateFromElena(page, { content:'Emma’s note: preserve this manual wording', checkRisk:true });
  await role(page, 'P01');
  await capture(page, 'brief-before-authorization.png');

  // Customer requirement changes invalidate the captured brief without silently
  // overwriting it. Copying that exact earlier version requires a second action.
  const originalAsOf = await page.locator('#management-brief > .brief-metadata time').getAttribute('datetime');
  await page.locator('#edit-requirement').click();
  await page.locator('#requirement-date').fill('2027-03-20');
  await page.locator('#requirement-form [type="submit"]').click();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true');
  assert.match(await page.locator('#management-brief-stale').innerText(), /customer requirement has changed/i);
  assert.ok((await page.locator('#management-brief-preview').innerText()).includes('Emma’s note: preserve this manual wording'));
  const earlierPreview = await page.locator('#management-brief-preview').innerText();
  assert.match(earlierPreview, /Earlier version.*may be out of date/);
  assert.equal(await page.locator('#management-brief > .brief-metadata time').getAttribute('datetime'), originalAsOf);
  const copyCount = (await copies(page)).length;
  await page.locator('#copy-management-brief').click();
  await page.locator('#confirm-copy-stale-brief').waitFor();
  assert.equal((await copies(page)).length, copyCount);
  await page.locator('#dialog [data-close]').first().click();
  assert.equal((await copies(page)).length, copyCount);
  await page.locator('#copy-management-brief').click();
  await page.locator('#confirm-copy-stale-brief').click();
  await page.waitForFunction(count => globalThis.testCopies.length === count + 1, copyCount);
  await page.locator('#management-brief-copied').waitFor();
  assert.equal(normalized((await copies(page)).at(-1)), normalized(earlierPreview));
  await page.locator('#regenerate-management-brief').click();
  await page.locator('#confirm-regenerate-brief').waitFor();
  await page.locator('#dialog [data-close]').first().click();
  assert.ok((await page.locator('#management-brief-preview').innerText()).includes('Emma’s note: preserve this manual wording'));
  await page.locator('#regenerate-management-brief').click();
  await page.locator('#confirm-regenerate-brief').click();
  await page.locator('#management-brief-editor').waitFor();
  const updated = await page.locator('#management-brief-editor').inputValue();
  assert.ok(!updated.includes('Emma’s note'));
  assert.match(updated, /9 (?:calendar )?days (?:before|early)/);
  assert.match(updated, /33 (?:calendar )?days (?:after|late)/);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  await preview(page);
  await copyFresh(page);

  await page.locator('[data-select-plan="A"]').click();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'Selecting a plan invalidates a previously generated comparison');
  await privateFromElena(page);
  await generate(page, 'beforeAuthorization');
  await preview(page);
  const attachedV1 = await attach(page);
  await sharedReadonly(page, { version:1 });
  assert.equal(await page.locator('#management-brief-preview').innerText(), attachedV1);
  const attachmentMetadataV1 = await page.locator('.brief-attachment-metadata').innerText();
  await capture(page, 'brief-attached-v1.png');
  await role(page, 'P01');
  await page.locator('#edit-management-brief').click();
  const privateNote = 'Emma’s private revision: draft wording must not reach Elena until I attach it.';
  await page.locator('#management-brief-editor').fill(`${await page.locator('#management-brief-editor').inputValue()}\n\n${privateNote}`);
  await sharedReadonly(page, { version:1 });
  assert.equal(await page.locator('#management-brief-preview').innerText(), attachedV1, 'Editing the private draft cannot mutate frozen v1');
  assert.ok(!(await page.locator('body').innerText()).includes(privateNote));
  await page.locator('#risk-title a').click();
  assert.ok(!(await page.locator('body').innerText()).includes(privateNote), 'The risk page also reads only the frozen attachment');
  assert.equal(await page.locator('#management-brief-preview').innerText(), attachedV1);
  await page.locator('.risk-back').click();
  await role(page, 'P01');
  await page.locator('#fallback-authorization').check();
  const beforeFallbackEdit = await page.locator('#management-brief-editor').inputValue();
  await sharedReadonly(page, { version:1 });
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true');
  assert.match(await page.locator('#management-brief-stale').innerText(), /amount|scope|fallback|authorization|decision/i, 'Changing the requested amount marks Elena’s brief as outdated');
  assert.match(await page.locator('#management-brief-stale').innerText(), /Emma|update/i);
  await capture(page, 'brief-attached-v1-stale.png');
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief-editor').inputValue(), beforeFallbackEdit);
  await generate(page, 'beforeAuthorization');
  assert.match(await page.locator('#management-brief-editor').inputValue(), /\$90,000/);
  await capture(page, 'brief-private-draft-with-stale-attachment.png');
  await page.locator('#management-brief').screenshot({ path:path.join(output, 'brief-private-draft-with-stale-attachment-panel.png'), style:'.demo-timeline, .topbar, .skip-link, #notice { visibility:hidden !important; }' });
  await sharedReadonly(page, { version:1 });
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'Regenerating Emma’s private draft does not refresh a stale attachment');
  assert.equal(await page.locator('.brief-attachment-metadata').innerText(), attachmentMetadataV1, 'Private regeneration preserves frozen attachment attribution and timestamps');
  assert.ok(!(await page.locator('#management-brief-preview').innerText()).includes('$90,000'), 'Elena still sees the old amount until reattachment');
  await role(page, 'P01');
  await preview(page);
  const attachedV2 = await attach(page);
  await sharedReadonly(page, { version:2 });
  assert.equal(await page.locator('#management-brief-preview').innerText(), attachedV2);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  await capture(page, 'brief-attached-v2.png');
  await role(page, 'P01');
  if (await page.locator('#attach-management-brief:enabled').count()) await page.locator('#attach-management-brief').click();
  await sharedReadonly(page, { version:2 });
  assert.equal(await page.locator('#management-brief-preview').innerText(), attachedV2, 'Repeated attachment without changes is idempotent');
  await role(page, 'P01');
  await page.locator('#fallback-authorization').uncheck();
  await generate(page, 'beforeAuthorization');
  await preview(page);
  await attach(page);
  const copiesBeforeTasks = (await copies(page)).length;
  await page.locator('#draft-task-briefs').click();
  await page.locator('#confirm-task-briefs').waitFor();
  await page.locator('#confirm-task-briefs').click();
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'startTechnical', 'An already previewed current brief does not trap the new task milestone in a copy loop');
  assert.equal((await copies(page)).length, copiesBeforeTasks);

  // Brief prerequisites follow recorded actions, not the planned dates. The
  // designation itself invalidates a draft even though no review has completed.
  await role(page, 'P02');
  await page.locator('#start-technical').click();
  await role(page, 'P03');
  await page.locator('#start-quality').click();
  await advanceTo(page, '2026-11-09T11:00:00-05:00');
  await role(page, 'P01');
  await page.locator('#assign-support').click();
  await role(page, 'P05');
  await page.locator('#accept-support').click();
  await advanceTo(page, '2026-11-10T09:00:00-05:00');
  let prerequisiteDraft = await generate(page, 'beforeAuthorization');
  pendingPrerequisites(prerequisiteDraft, prerequisiteLabels);
  await preview(page);
  await page.locator('#edit-management-brief').click();
  const preservedPrerequisiteDraft = `${prerequisiteDraft}\n\nEmma’s note: keep this wording until I update the brief.`;
  await page.locator('#management-brief-editor').fill(preservedPrerequisiteDraft);
  await page.locator('#designate-approver').click();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'Recording the approver designation invalidates the earlier pending list');
  assert.match(await page.locator('#management-brief-stale').innerText(), /approver designation/i);
  assert.equal(await page.locator('#management-brief-editor').inputValue(), preservedPrerequisiteDraft, 'Designation never silently replaces an edited brief');
  prerequisiteDraft = await generate(page, 'beforeAuthorization');
  pendingPrerequisites(prerequisiteDraft, prerequisiteLabels.slice(0, 2));
  await preview(page);
  await advanceTo(page, '2026-11-11T17:00:00-05:00');
  prerequisiteDraft = await generate(page, 'beforeAuthorization');
  pendingPrerequisites(prerequisiteDraft, prerequisiteLabels.slice(0, 2));
  assert.equal(await page.locator('[data-confirmation-key="technical"]').getAttribute('data-status'), 'inProgress');
  assert.equal(await page.locator('[data-confirmation-key="quality"]').getAttribute('data-status'), 'inProgress');
  await role(page, 'P02');
  await page.locator('#review-technical-form [type="submit"]').click();
  prerequisiteDraft = await generate(page, 'beforeAuthorization');
  pendingPrerequisites(prerequisiteDraft, ['QA study-scope review']);
  await preview(page);
  await role(page, 'P03');
  await page.locator('#review-quality-form [type="submit"]').click();
  await advanceTo(page, '2026-11-12T17:00:00-05:00');
  await sharedReadonly(page, { state: 'stale' });
  await capture(page, 'brief-elena-stale.png');
  await page.locator('#authorization-brief-status').screenshot({ path: path.join(output, 'brief-elena-stale-status.png') });
  await page.locator('#update-shared-brief').click();
  assert.equal(await page.locator('#viewer').inputValue(), 'P01');
  assert.equal(await page.locator('#regenerate-management-brief').evaluate(node => document.activeElement === node), true);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'Requesting Emma’s update does not regenerate or replace the earlier brief');
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'updateBrief', 'The single before-signature checkpoint requests an update if an earlier brief is stale');
  await page.locator('#demo-next-step').click();
  assert.equal(await page.locator('#viewer').inputValue(), 'P01');
  assert.equal(await page.locator('#regenerate-management-brief').evaluate(node => document.activeElement === node), true);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'Guidance never silently regenerates a stale brief');
  prerequisiteDraft = await generate(page, 'beforeAuthorization');
  assert.match(prerequisiteDraft, /Technical and QA study-scope reviews and approver designation: completed\./);
  assert.doesNotMatch(prerequisiteDraft, /Pending before authorization:/);
  assert.match(prerequisiteDraft, /If authorized by[\s\S]*Alex Lin’s resource assessment result is expected[\s\S]*a hold is not guaranteed\./, 'The next update promises an assessment result, never a successful hold');
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'previewBrief');
  await sharedReadonly(page, { state: 'stale', version:3 });
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'A fresh private draft leaves the old attachment stale');
  await role(page, 'P01');
  await preview(page);
  await copyFresh(page);
  const readyPreview = await page.locator('#management-brief-preview').innerText();
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'attachBrief');
  await sharedReadonly(page, { state:'stale', version:3 });
  await page.locator('#demo-next-step').click();
  assert.equal(await page.locator('#viewer').inputValue(), 'P01');
  assert.equal(await page.locator('#attach-management-brief').evaluate(node=>document.activeElement===node), true);
  await attach(page);
  await sharedReadonly(page, { state: 'current', version:4 });
  assert.equal(await page.locator('#management-brief-preview').innerText(), readyPreview);
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'authorize');
  await capture(page, 'brief-elena-current.png');
  await page.locator('#authorization-brief-status').screenshot({ path: path.join(output, 'brief-elena-current-status.png') });

  }

  // A customer authorization is not a resource receipt. An internal Mei result
  // must neither leak into the brief nor invalidate it until Alex returns it.
  await chapter(page, 'hold');
  await noRepeatedBriefGuide(page, 'An authorized chapter does not reinsert brief generation');
  let content = await generate(page, 'authorized');
  assert.match(content.split('\n')[0], /authorized[\s\S]*\$80,000|\$80,000[\s\S]*authorized/i);
  assert.match(content, /await[\s\S]*(?:resource|WuXi)|(?:resource|WuXi)[\s\S]*await/i);
  assert.match(content, /resource assessment result is expected[\s\S]*a hold is not guaranteed\./);
  assert.doesNotMatch(content, /Pending before authorization:/);
  await preview(page);
  await capture(page, 'brief-authorized.png');
  await role(page, 'P07');
  await page.locator('#start-resource-review').click();
  await page.locator('#advance-event').click();
  content = await generate(page, 'authorized');
  await preview(page);
  await attach(page);
  const preInternal = await page.locator('#management-brief-preview').innerText();
  await role(page, 'P08');
  await page.locator('#resource-response-form select[name="outcome"]').selectOption('held');
  await page.locator('#confirm-resource-response').click();
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  assert.equal(await page.locator('#management-brief-preview').innerText(), preInternal);
  await role(page, 'P07');
  await page.locator('#return-resource-receipt').click();
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true');
  assert.match(await page.locator('#management-brief-stale').innerText(), /resource response has changed/i);
  await noRepeatedBriefGuide(page, 'The completed hold does not reinsert a brief checkpoint');
  await sharedReadonly(page);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true');
  content = await generate(page, 'held');
  assert.match(content, /Dec 9, 2026, 5:00 PM Shanghai/);
  assert.match(content, /\$80,000/);
  assert.match(content, /\$50,000/);
  assert.match(content, /\$30,000/);
  assert.match(content, /not (?:yet )?started|has(?:n’t| not) started/i, 'The $30,000 additional study has not begun at the hold endpoint');
  assert.match(content, /Next update/i);
  assert.match(content.split('\n')[0], /held|hold|coordination complete/i);
  assert.match(content.split('\n')[0], /readiness|process|assess|study/i);
  assert.doesNotMatch(content, /please approve|approval requested|\bauthorize\b/i);
  assert.doesNotMatch(content, /\$40,000|Apr 22|34 (?:calendar )?days (?:after|late)/, 'Unselected B history is absent from a held-state management brief');
  await preview(page);
  await copyFresh(page);
  await writeFile(path.join(output, 'brief-held-recipient.txt'), await page.locator('#management-brief-preview').innerText());
  await capture(page, 'brief-held.png');

  // The exception brief distinguishes historical forecasts, new quotes,
  // customer authorization and the eventual fee-triggering formal confirmation.
  await returnResource(page, 'unavailable');
  await noRepeatedBriefGuide(page, 'A failed resource hold does not reinsert brief generation');
  content = await generate(page, 'unavailable');
  currentOnly(content);
  assert.match(content, /unavailable|cannot support|could not support/i);
  await preview(page);
  await capture(page, 'brief-unavailable.png');
  await role(page, 'P07');
  await advanceTo(page, exceptionTimes.requested);
  await page.locator('#request-reschedule').click();
  content = await generate(page, 'awaitingWuXiQuote');
  currentOnly(content);
  await preview(page);
  const preQuote = await page.locator('#management-brief-preview').innerText();
  await role(page, 'P08');
  await advanceTo(page, exceptionTimes.quote);
  await page.locator('#record-reschedule-quote').click();
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  assert.equal(await page.locator('#management-brief-preview').innerText(), preQuote);
  await role(page, 'P07');
  await advanceTo(page, exceptionTimes.returned);
  await page.locator('#return-reschedule-quote').click();
  await role(page, 'P01');
  assert.match(await page.locator('#management-brief-stale').innerText(), /resource response has changed[\s\S]*quote version or source data has changed/i);
  await noRepeatedBriefGuide(page, 'The returned rescheduling quote continues directly to customer decision');
  content = await generate(page, 'awaitingCustomerDecision');
  currentOnly(content);
  assert.match(content, /Feb 15, 2027/);
  assert.match(content, /\$10,000/);
  assert.match(content, /no fee|\$0|not incurred|unconfirmed|not confirmed/i);
  await preview(page);
  await attach(page);
  assert.match(await page.locator('#management-brief-preview').innerText(), /Q-B v1/);
  assert.ok(!/To be agreed|timing unassigned|last scheduled snapshot/i.test(await page.locator('#management-brief-preview').innerText()), 'Recipient copy uses the exception schedule and its actual data-as-of time');
  assert.equal(await page.locator('#management-brief > .brief-metadata time').getAttribute('datetime'), exceptionTimes.returned);
  await advanceTo(page, exceptionTimes.decision);
  await page.locator('#launch-reschedule-decision').click();
  await privateFromElena(page, { state:'missing', checkRisk:true });
  assert.match(await page.locator('#authorization-brief-status').innerText(), /attach|brief/i, 'A new exception decision cannot reuse an attachment bound to the original request');
  await noRepeatedBriefGuide(page, 'A new exception decision warns manually without adding another brief checkpoint');
  currentOnly(await generate(page, 'awaitingCustomerAuthorization'));
  await preview(page);
  await attach(page);
  await sharedReadonly(page, { state:'current', version:1 });
  await advanceTo(page, exceptionTimes.authorized);
  await page.locator('#fill-reschedule-signature').click();
  await page.locator('#reschedule-authorization-form input[name="acknowledged"]').check();
  await page.locator('#authorize-reschedule').click();
  await fee(page, 0);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'An authorization state change is visible in Elena’s shared view');
  await noRepeatedBriefGuide(page, 'Exception authorization does not repeat the guide’s brief step');
  content = await generate(page, 'awaitingWuXiConfirmation');
  currentOnly(content);
  assert.match(content, /\$0|no fee|not incurred|fee.*formal|formal.*fee/i);
  await preview(page);
  await role(page, 'P07');
  await advanceTo(page, exceptionTimes.confirmed);
  await page.locator('#confirm-reschedule').click();
  await fee(page, 10000);
  await noRepeatedBriefGuide(page, 'Formal confirmation ends the workflow without requesting a new guided brief');
  content = await generate(page, 'confirmed');
  currentOnly(content);
  assert.match(content.split('\n')[0], /Feb 15, 2027/);
  assert.match(content.split('\n')[0], /\$10,000/);
  assert.match(content.split('\n')[0], /incurred/i);
  assert.match(content, /Feb 15, 2027[\s\S]*Shanghai|Shanghai[\s\S]*Feb 15, 2027/);
  assert.match(content, /delivery[\s\S]*(?:reassess|re-assess)|(?:reassess|re-assess)[\s\S]*delivery/i);
  assert.match(content, /Next update/i);
  assert.doesNotMatch(content, /B Confirmed|\|\s*[AB]\s*\|/i, 'The separately authorized reschedule does not masquerade as a selected A/B plan');
  assert.match(content.split('\n')[0], /assess|readiness|technical/i);
  assert.doesNotMatch(content, /please approve|approval requested|\bauthorize\b/i);
  assert.ok(!/To be agreed|timing unassigned|last scheduled snapshot/i.test(content));
  assert.equal(await page.locator('#management-brief > .brief-metadata time').getAttribute('datetime'), exceptionTimes.confirmed);
  await preview(page);
  await copyFresh(page);
  await writeFile(path.join(output, 'brief-rescheduled-recipient.txt'), await page.locator('#management-brief-preview').innerText());
  await capture(page, 'brief-rescheduled.png');
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozen, 'Brief generation never modifies frozen facts, dates, fees or source versions');

  if (!endpointsOnly) {
  const { page: mobile, context: mobileContext } = await makePage(true);
  await generate(mobile, 'beforeAuthorization');
  const longCopy = `${await mobile.locator('#management-brief-editor').inputValue()}\n${'Additional PM note for the meeting.\n'.repeat(20)}`;
  await mobile.locator('#management-brief-editor').fill(longCopy);
  assert.equal(await mobile.locator('#management-brief-editor').evaluate(node => node.scrollHeight <= node.clientHeight + 2), true);
  await preview(mobile, { generated: false });
  await copyFresh(mobile);
  await mobileLayout(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'A long recipient preview fits a mobile viewport');
  await mobile.locator('#copy-management-brief').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(() => {
    const button = document.querySelector('#copy-management-brief').getBoundingClientRect();
    return button.bottom <= document.querySelector('.demo-timeline').getBoundingClientRect().top;
  });
  await capture(mobile, 'brief-mobile.png');
  await chapter(mobile, 'authorization');
  await generate(mobile, 'beforeAuthorization');
  await preview(mobile);
  const mobileV1 = await attach(mobile);
  await sharedReadonly(mobile, { state:'current', version:1 });
  assert.equal(await mobile.locator('#management-brief-preview').innerText(), mobileV1);
  await mobileLayout(mobile);
  await capture(mobile, 'brief-attached-v1-mobile.png');
  await role(mobile, 'P01');
  await mobile.locator('#edit-management-brief').click();
  const mobilePrivate = 'Emma’s mobile revision remains private until attached.';
  await mobile.locator('#management-brief-editor').fill(`${await mobile.locator('#management-brief-editor').inputValue()}\n\n${mobilePrivate}`);
  await sharedReadonly(mobile, { state:'current', version:1 });
  assert.equal(await mobile.locator('#management-brief-preview').innerText(), mobileV1);
  assert.ok(!(await mobile.locator('body').innerText()).includes(mobilePrivate));
  await role(mobile, 'P01');
  await preview(mobile, { generated:false });
  const mobileV2 = await attach(mobile);
  await sharedReadonly(mobile, { state:'current', version:2 });
  assert.equal(await mobile.locator('#management-brief-preview').innerText(), mobileV2);
  await mobileLayout(mobile);
  await capture(mobile, 'brief-attached-v2-mobile.png');
  await role(mobile, 'P01');
  await mobile.locator('#edit-requirement').click();
  await mobile.locator('#requirement-date').fill('2027-03-20');
  await mobile.locator('#requirement-form [type="submit"]').click();
  await sharedReadonly(mobile, { state:'stale', version:2 });
  await mobileLayout(mobile);
  await capture(mobile, 'brief-attached-stale-mobile.png');
  await returnResource(mobile, 'unavailable');
  await role(mobile, 'P07');
  await advanceTo(mobile, exceptionTimes.requested);
  await mobile.locator('#request-reschedule').click();
  await role(mobile, 'P08');
  await advanceTo(mobile, exceptionTimes.quote);
  await mobile.locator('#record-reschedule-quote').click();
  await role(mobile, 'P07');
  await advanceTo(mobile, exceptionTimes.returned);
  await mobile.locator('#return-reschedule-quote').click();
  await role(mobile, 'P01');
  await advanceTo(mobile, exceptionTimes.decision);
  await mobile.locator('#launch-reschedule-decision').click();
  await role(mobile, 'P06');
  await advanceTo(mobile, exceptionTimes.authorized);
  await mobile.locator('#fill-reschedule-signature').click();
  await mobile.locator('#reschedule-authorization-form input[name="acknowledged"]').check();
  await mobile.locator('#authorize-reschedule').click();
  await fee(mobile, 0);
  await role(mobile, 'P07');
  await advanceTo(mobile, exceptionTimes.confirmed);
  await mobile.locator('#confirm-reschedule').click();
  await fee(mobile, 10000);
  await generate(mobile, 'confirmed');
  await preview(mobile);
  await copyFresh(mobile);
  await mobileLayout(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await capture(mobile, 'brief-rescheduled-mobile.png');
  await mobileContext.close();
  const { page: plainFallback, context: plainContext } = await makePage(false, 'plain');
  await generate(plainFallback, 'beforeAuthorization');
  await preview(plainFallback);
  await copyFresh(plainFallback);
  assert.deepEqual(await plainFallback.evaluate(() => globalThis.testRichCopies), [], 'A browser without rich clipboard support receives the same readable plain brief');
  await plainContext.close();
  }
  }
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)),frozen);
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], 'The brief, clipboard fallback and full follow-up flow work without external requests');
  console.log(authorizationVersionsOnly ? 'Authorization version checks passed: attach v1, edit and attach v2, sign against request + Q-A v1 + brief v2, attach progress v3; signed basis remains v2, old versions are read-only, private drafts stay hidden, no scope or fee changes.' : endpointsOnly ? 'Endpoint brief browser checks passed: generated and regenerated held and separately authorized rescheduling outcomes, current amounts and windows, outstanding assessments and next updates, no post-authorization A/B table, preview and rich/plain copy parity, frozen source data, zero external requests. Recipient texts and screenshots saved under output/.' : 'Management brief browser checks passed: Emma-only private drafts on both pages, explicit immutable v1/v2 attachments and metadata, read-only Elena permissions, plan/amount/state staleness until reattachment, no approval changes or duplicate attachments, request-specific attachment isolation, one generate–preview–attach–authorize guide checkpoint without later repeats, action-derived prerequisites, conditional resource-assessment wording, compact briefs with before-authorization comparison tables, current-result summaries and bold titles, safe HTML/plain clipboard parity, independent edits and captured metadata, private-result isolation, generation cancellation, all main states and full rescheduling, frozen data, offline clipboard fallbacks and mobile layout.');
} finally {
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

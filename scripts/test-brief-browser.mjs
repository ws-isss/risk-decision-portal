import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-brief-offline-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [], network = [];

async function makePage(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, offline: true });
  await context.addInitScript(({ fallback }) => {
    globalThis.testCopies = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async content => {
      if (fallback) throw new Error('Clipboard API unavailable in this local-file test');
      globalThis.testCopies.push(content);
    } } });
    if (fallback) document.execCommand = command => {
      if (command !== 'copy') return false;
      globalThis.testCopies.push(document.activeElement.value);
      return true;
    };
  }, { fallback: mobile });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  return { page, context };
}
const clock = page => page.locator('.demo-clock time').getAttribute('datetime');
const copies = page => page.evaluate(() => globalThis.testCopies);
async function role(page, id) {
  const before = await clock(page);
  await page.locator('#viewer').selectOption(id);
  assert.equal(await clock(page), before);
}
async function chapter(page, id) {
  await page.locator('#chapter-select').selectOption(id);
  assert.equal(await page.locator('#management-brief').count(), 0, 'Explicit chapter reset discards the prior brief and manual edits');
  assert.match(await page.locator('#chapter-notice').innerText(), /reset|fresh scenario/i);
}
async function generate(page, status) {
  const before = await clock(page);
  await role(page, 'P01');
  await page.locator('#generate-management-brief').click();
  if (await page.locator('#confirm-regenerate-brief').isVisible()) await page.locator('#confirm-regenerate-brief').click();
  await page.locator('#management-brief-editor').waitFor();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-status'), status);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  assert.equal(await clock(page), before, 'Brief generation does not alter the simulation clock');
  assert.equal(await page.locator('#copy-management-brief').count(), 0, 'An unpreviewed draft cannot be copied');
  assert.equal(await page.locator('#management-brief-editor').evaluate(node => node.scrollHeight <= node.clientHeight + 2), true, 'The editor expands to fit the complete brief');
  return page.locator('#management-brief-editor').inputValue();
}
async function preview(page) {
  const before = await copies(page);
  await page.locator('#preview-management-brief').click();
  const content = await page.locator('#management-brief-preview').innerText();
  assert.deepEqual(await copies(page), before, 'Preview never automatically copies or sends a brief');
  assert.match(content, /Demo data[\s\S]*Case design assumption[\s\S]*AI draft \(simulated\)/);
  assert.match(content, /Data as of:[\s\S]*Source versions:[\s\S]*SEC-001 v1/);
  return content;
}
async function copyFresh(page) {
  const expected = await page.locator('#management-brief-preview').innerText();
  const before = (await copies(page)).length;
  await page.locator('#copy-management-brief').click();
  await page.locator('#management-brief-copied').waitFor();
  const actual = await copies(page);
  assert.equal(actual.length, before + 1);
  assert.equal(actual.at(-1), expected, 'Clipboard content exactly matches the recipient preview');
}
async function capture(page, name) {
  await page.locator('h1').click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, name), fullPage: true, style: '#notice { visibility: hidden !important; }' });
  if (await page.locator('#management-brief-preview').isVisible()) await page.locator('#management-brief').screenshot({ path: path.join(output, name.replace('.png', '-panel.png')), style: '.demo-timeline, .topbar, .skip-link, #notice { visibility: hidden !important; }' });
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

try {
  const { page } = await makePage();
  const frozen = await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA));

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
  assert.match(original, /8 calendar days before/);
  assert.match(original, /34 calendar days after/);
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0');
  const edited = `${original}\n\nEmma’s note: preserve this manual wording when the underlying records change.`;
  await page.locator('#management-brief-editor').fill(edited);
  await page.locator('#risk-title a').click();
  await page.locator('#risk-evidence').waitFor();
  await page.locator('.risk-back').click();
  assert.equal(await page.locator('#management-brief-editor').inputValue(), edited);
  await role(page, 'P06');
  assert.equal(await page.locator('#management-brief, #generate-management-brief').count(), 0);
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief-editor').inputValue(), edited);
  const initialPreview = await preview(page);
  assert.ok(initialPreview.includes('Emma’s note: preserve this manual wording'));
  await copyFresh(page);
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0');
  await capture(page, 'brief-before-authorization.png');

  // Customer requirement changes invalidate the captured brief without silently
  // overwriting it. Copying that exact earlier version requires a second action.
  const originalAsOf = await page.locator('.brief-metadata time').getAttribute('datetime');
  await page.locator('#edit-requirement').click();
  await page.locator('#requirement-date').fill('2027-03-20');
  await page.locator('#requirement-form [type="submit"]').click();
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'true');
  assert.match(await page.locator('#management-brief-stale').innerText(), /customer requirement has changed/i);
  assert.ok((await page.locator('#management-brief-preview').innerText()).includes(edited));
  const earlierPreview = await page.locator('#management-brief-preview').innerText();
  assert.match(earlierPreview, /Earlier version.*may be out of date/);
  assert.equal(await page.locator('.brief-metadata time').getAttribute('datetime'), originalAsOf);
  const copyCount = (await copies(page)).length;
  await page.locator('#copy-management-brief').click();
  await page.locator('#confirm-copy-stale-brief').waitFor();
  assert.equal((await copies(page)).length, copyCount);
  await page.locator('#dialog [data-close]').first().click();
  assert.equal((await copies(page)).length, copyCount);
  await page.locator('#copy-management-brief').click();
  await page.locator('#confirm-copy-stale-brief').click();
  await page.locator('#management-brief-copied').waitFor();
  assert.equal((await copies(page)).at(-1), earlierPreview);
  await page.locator('#regenerate-management-brief').click();
  await page.locator('#confirm-regenerate-brief').waitFor();
  await page.locator('#dialog [data-close]').first().click();
  assert.ok((await page.locator('#management-brief-preview').innerText()).includes(edited));
  await page.locator('#regenerate-management-brief').click();
  await page.locator('#confirm-regenerate-brief').click();
  await page.locator('#management-brief-editor').waitFor();
  const updated = await page.locator('#management-brief-editor').inputValue();
  assert.ok(!updated.includes('Emma’s note'));
  assert.match(updated, /9 calendar days before/);
  assert.match(updated, /33 calendar days after/);
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  await preview(page);
  await copyFresh(page);

  await page.locator('[data-select-plan="A"]').click();
  await generate(page, 'beforeAuthorization');
  await preview(page);
  const copiesBeforeTasks = (await copies(page)).length;
  await page.locator('#draft-task-briefs').click();
  await page.locator('#confirm-task-briefs').waitFor();
  await page.locator('#confirm-task-briefs').click();
  assert.equal(await page.locator('#demo-next-step').getAttribute('data-guide-key'), 'startTechnical', 'An already previewed current brief does not trap the new task milestone in a copy loop');
  assert.equal((await copies(page)).length, copiesBeforeTasks);

  // A customer authorization is not a resource receipt. An internal Mei result
  // must neither leak into the brief nor invalidate it until Alex returns it.
  await chapter(page, 'hold');
  let content = await generate(page, 'authorized');
  assert.match(content, /authorized up to \$80,000/);
  assert.match(content, /fee status awaits|fees.*awaits/i);
  await preview(page);
  await capture(page, 'brief-authorized.png');
  await role(page, 'P07');
  await page.locator('#start-resource-review').click();
  await page.locator('#advance-event').click();
  content = await generate(page, 'authorized');
  await preview(page);
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
  content = await generate(page, 'held');
  assert.match(content, /Dec 9, 2026, 5:00 PM Shanghai/);
  assert.match(content, /\$50,000[\s\S]*\$30,000/);
  assert.match(content, /study has not started|that has not occurred/);
  assert.match(content, /aggregate issue is not resolved/i);
  await preview(page);
  await copyFresh(page);
  await capture(page, 'brief-held.png');

  // The exception brief distinguishes historical forecasts, new quotes,
  // customer authorization and the eventual fee-triggering formal confirmation.
  await returnResource(page, 'unavailable');
  content = await generate(page, 'unavailable');
  assert.match(content, /No replacement window or revised delivery date is confirmed/);
  assert.match(content, /Historical comparison only/);
  assert.match(content, /resource-unavailability reason is a case design assumption/i);
  await preview(page);
  await capture(page, 'brief-unavailable.png');
  await role(page, 'P07');
  await page.locator('#request-reschedule').click();
  content = await generate(page, 'awaitingWuXiQuote');
  await preview(page);
  const preQuote = await page.locator('#management-brief-preview').innerText();
  await role(page, 'P08');
  await page.locator('#record-reschedule-quote').click();
  await role(page, 'P01');
  assert.equal(await page.locator('#management-brief').getAttribute('data-brief-stale'), 'false');
  assert.equal(await page.locator('#management-brief-preview').innerText(), preQuote);
  await role(page, 'P07');
  await page.locator('#return-reschedule-quote').click();
  await role(page, 'P01');
  assert.match(await page.locator('#management-brief-stale').innerText(), /resource response has changed[\s\S]*quote version or source data has changed/i);
  content = await generate(page, 'awaitingCustomerDecision');
  assert.match(content, /Feb 15, 2027[\s\S]*\$10,000/);
  assert.match(content, /No replacement window is confirmed or fee incurred/);
  await preview(page);
  assert.match(await page.locator('#management-brief-preview').innerText(), /Q-B v1/);
  assert.match(await page.locator('#management-brief-preview').innerText(), /recorded in sequence with timing unassigned/);
  await page.locator('#launch-reschedule-decision').click();
  await generate(page, 'awaitingCustomerAuthorization');
  await preview(page);
  await role(page, 'P06');
  await page.locator('#fill-reschedule-signature').click();
  await page.locator('#reschedule-authorization-form input[name="acknowledged"]').check();
  await page.locator('#authorize-reschedule').click();
  await fee(page, 0);
  content = await generate(page, 'awaitingWuXiConfirmation');
  assert.match(content, /Authorization alone does not incur the fee/);
  await preview(page);
  await role(page, 'P07');
  await page.locator('#confirm-reschedule').click();
  await fee(page, 10000);
  content = await generate(page, 'confirmed');
  assert.match(content, /\$10,000 rescheduling fee is now incurred/);
  assert.match(content, /\$30,000 study has not started/);
  assert.match(content, /revised delivery estimate still needs review/);
  await preview(page);
  await copyFresh(page);
  await capture(page, 'brief-rescheduled.png');
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozen, 'Brief generation never modifies frozen facts, dates, fees or source versions');

  const { page: mobile, context: mobileContext } = await makePage(true);
  await generate(mobile, 'beforeAuthorization');
  const longCopy = `${await mobile.locator('#management-brief-editor').inputValue()}\n${'Additional PM note for the meeting.\n'.repeat(20)}`;
  await mobile.locator('#management-brief-editor').fill(longCopy);
  assert.equal(await mobile.locator('#management-brief-editor').evaluate(node => node.scrollHeight <= node.clientHeight + 2), true);
  await preview(mobile);
  await copyFresh(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'A long recipient preview fits a mobile viewport');
  await mobile.locator('#copy-management-brief').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(() => {
    const button = document.querySelector('#copy-management-brief').getBoundingClientRect();
    return button.bottom <= document.querySelector('.demo-timeline').getBoundingClientRect().top;
  });
  await capture(mobile, 'brief-mobile.png');
  await returnResource(mobile, 'unavailable');
  await role(mobile, 'P07');
  await mobile.locator('#request-reschedule').click();
  await role(mobile, 'P08');
  await mobile.locator('#record-reschedule-quote').click();
  await role(mobile, 'P07');
  await mobile.locator('#return-reschedule-quote').click();
  await role(mobile, 'P01');
  await mobile.locator('#launch-reschedule-decision').click();
  await role(mobile, 'P06');
  await mobile.locator('#fill-reschedule-signature').click();
  await mobile.locator('#reschedule-authorization-form input[name="acknowledged"]').check();
  await mobile.locator('#authorize-reschedule').click();
  await fee(mobile, 0);
  await role(mobile, 'P07');
  await mobile.locator('#confirm-reschedule').click();
  await fee(mobile, 10000);
  await generate(mobile, 'confirmed');
  await preview(mobile);
  await copyFresh(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await capture(mobile, 'brief-rescheduled-mobile.png');
  await mobileContext.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], 'The brief, clipboard fallback and full follow-up flow work without external requests');
  console.log('Management brief browser checks passed: independent editing and exact preview/copy, stale requirement/business/source changes, explicit replacement and earlier-copy confirmations, private-result isolation, generation cancellation, four main states and full rescheduling, frozen data, offline clipboard fallback and mobile layout.');
} finally {
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

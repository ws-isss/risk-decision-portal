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
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-resource-offline-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [];
const network = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, offline: true });
const page = await context.newPage();
const chapterTimes = {
  prepublication: '2026-11-09T10:00:00+08:00', selection: '2026-11-09T09:00:00-05:00',
  coverage: '2026-11-09T11:00:00-05:00', authorization: '2026-11-12T17:00:00-05:00',
  hold: '2026-11-13T09:00:00+08:00', unavailable: '2026-11-13T17:00:00+08:00'
};
const exceptionTimes = {
  requested: '2026-11-16T09:00:00+08:00', quote: '2026-11-17T15:00:00+08:00', returned: '2026-11-17T17:00:00+08:00',
  customerAvailable: '2026-11-17T09:00:00-05:00', decision: '2026-11-17T11:00:00-05:00', authorized: '2026-11-19T17:00:00-05:00',
  confirmed: '2026-11-20T17:00:00+08:00', nextUpdate: '2026-11-23T17:00:00+08:00'
};
const chapterRoles = { prepublication: 'P07', selection: 'P01', coverage: 'P01', authorization: 'P06', hold: 'P07', unavailable: 'P08' };
const clock = targetPage => targetPage.locator('#snapshot-time, .demo-clock time').first().getAttribute('datetime');
function observe(targetPage) {
  targetPage.on('pageerror', error => errors.push(error.message));
  targetPage.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
}
observe(page);
async function role(targetPage, id) {
  const before = await clock(targetPage);
  await targetPage.locator('#viewer').selectOption(id);
  assert.equal(await clock(targetPage), before, 'Viewing another role never rewinds or advances time');
}
async function navigate(targetPage, hash) {
  const before = await clock(targetPage);
  await targetPage.evaluate(nextHash => { location.hash = nextHash; }, hash);
  await targetPage.waitForFunction(nextHash => location.hash === nextHash, hash);
  await targetPage.waitForTimeout(30);
  assert.equal(await clock(targetPage), before, 'Hash navigation does not move the simulation clock');
}
async function chapter(targetPage, id) {
  await targetPage.locator('#chapter-select').selectOption(id);
  await targetPage.locator('#chapter-notice').waitFor();
  assert.equal(await targetPage.locator('#chapter-select').inputValue(), '', 'The chapter picker resets its placeholder so the same chapter can be explicitly reloaded');
  assert.equal(Date.parse(await clock(targetPage)), Date.parse(chapterTimes[id]), `${id} loads its frozen entry time`);
  assert.equal(await targetPage.locator('#viewer').inputValue(), chapterRoles[id]);
  assert.equal(await targetPage.locator('#dialog').getAttribute('open'), null, 'Selecting a chapter is the explicit reset action; no extra approval dialog');
  assert.equal(await targetPage.locator('#notifications-toggle').getAttribute('aria-expanded'), 'false', 'Chapter reset closes role notification overlays');
  assert.match(await targetPage.locator('#chapter-notice').innerText(), /reset|loaded|chapter/i);
  if (['coverage', 'authorization', 'hold', 'unavailable'].includes(id)) assert.match(await targetPage.locator('#chapter-notice').innerText(), /simulat|preload|seed|demo record/i, 'Seeded history has visible provenance');
}
async function notifications(targetPage) {
  if (await targetPage.locator('#notifications-toggle').getAttribute('aria-expanded') !== 'true') await targetPage.locator('#notifications-toggle').click();
  await targetPage.locator('#notifications-panel').waitFor();
}
async function guide(targetPage, key, viewer, target) {
  if (await targetPage.locator('#demo-next-step').getAttribute('data-guide-key') === 'managementBrief' && key !== 'managementBrief') {
    const milestoneClock = await clock(targetPage);
    await targetPage.locator('#demo-next-step').click();
    await targetPage.locator('#generate-management-brief').click();
    if (await targetPage.locator('#confirm-regenerate-brief').isVisible()) await targetPage.locator('#confirm-regenerate-brief').click();
    await targetPage.locator('#management-brief-editor').waitFor();
    await targetPage.locator('#preview-management-brief').click();
    assert.equal(await clock(targetPage), milestoneClock, 'Brief preview does not advance the business clock');
  }
  const before = await clock(targetPage);
  const initialViewer = await targetPage.locator('#viewer').inputValue();
  const resourceBefore = await targetPage.locator('#wuxi').getAttribute('data-resource-status');
  assert.equal(await targetPage.locator('#demo-next-step').getAttribute('data-guide-key'), key);
  await targetPage.locator('#demo-next-step').click();
  assert.equal(await targetPage.locator('#viewer').inputValue(), viewer);
  assert.equal(await clock(targetPage), before, 'Guidance is not a simulated business event');
  if (initialViewer === viewer) assert.equal(await targetPage.locator('#wuxi').getAttribute('data-resource-status'), resourceBefore, 'Guidance does not execute a resource response');
  assert.equal(await targetPage.locator(target).evaluate(node => document.activeElement === node), true);
  await targetPage.waitForFunction(selector => {
    const field = document.querySelector(selector).getBoundingClientRect();
    const bar = document.querySelector('.demo-timeline').getBoundingClientRect();
    const header = document.querySelector('.topbar').getBoundingClientRect();
    const reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--demo-bar-space'));
    return field.top >= header.bottom && field.bottom <= bar.top && reserve >= bar.height;
  }, target, { timeout: 3000 });
}
async function assertNoCustomerEvidence(targetPage) {
  await targetPage.locator('main[data-page="unpublished"]').waitFor();
  const copy = await targetPage.locator('main').innerText();
  assert.ok(!/2\.8%|SEC-001|EXP-001|\$80,000|\$40,000/.test(copy), 'Unpublished risk, evidence and quotes are absent from the customer DOM');
  assert.equal(await targetPage.locator('#comparison, #risk-evidence, #draft-task-briefs, #risk-publication-form, #publish-risk').count(), 0);
  await notifications(targetPage);
  assert.equal(await targetPage.locator('#notifications-panel [data-notification-id]').count(), 0, 'No notification can reveal an unpublished customer task');
  await targetPage.keyboard.press('Escape');
}
async function resourceStatus(targetPage, status) {
  assert.equal(await targetPage.locator('#wuxi').getAttribute('data-resource-status'), status);
}
async function incurred(targetPage, amount) {
  assert.equal(await targetPage.locator('#wuxi [data-fee-incurred]').getAttribute('data-fee-incurred'), String(amount));
}
async function advance(targetPage, at) {
  const previous = await clock(targetPage);
  assert.equal(await targetPage.locator('#advance-event').isEnabled(), true);
  await targetPage.locator('#advance-event').click();
  assert.equal(Date.parse(await clock(targetPage)), Date.parse(at));
  assert.ok(Date.parse(await clock(targetPage)) >= Date.parse(previous));
}
async function advanceTo(targetPage, at) {
  while (Date.parse(await clock(targetPage)) < Date.parse(at)) {
    const before = await clock(targetPage);
    const status = await targetPage.locator('#wuxi').getAttribute('data-resource-status');
    const amount = await targetPage.locator('#wuxi [data-fee-incurred]').getAttribute('data-fee-incurred');
    assert.equal(await targetPage.locator('#advance-event').isEnabled(), true, `Advance is available before ${at}`);
    await targetPage.locator('#advance-event').click();
    assert.ok(Date.parse(await clock(targetPage)) > Date.parse(before), 'An exception advance moves forward');
    assert.ok(Date.parse(await clock(targetPage)) <= Date.parse(at), 'Exception advancement does not skip its next action');
    assert.equal(await targetPage.locator('#wuxi').getAttribute('data-resource-status'), status, 'Advancing the clock does not submit a quote, authorize or confirm a window');
    assert.equal(await targetPage.locator('#wuxi [data-fee-incurred]').getAttribute('data-fee-incurred'), amount, 'Clock advancement never incurs a fee');
  }
  assert.equal(Date.parse(await clock(targetPage)), Date.parse(at));
  assert.ok(!/To be agreed/i.test(await targetPage.locator('body').innerText()), 'Exception states use their scheduled times');
}
async function earlyAction(targetPage, id) {
  assert.equal(await targetPage.locator(`${id}:enabled`).count(), 0, 'A future business action is unavailable before its scheduled event');
}
async function assertMobile(targetPage, controls) {
  assert.equal(await targetPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await targetPage.locator(controls).evaluateAll(nodes => nodes.every(node => {
    const bounds = node.getBoundingClientRect();
    return bounds.width === 0 || bounds.left >= 0 && bounds.right <= innerWidth;
  })), true, 'Resource actions remain inside the phone viewport');
}
async function capture(targetPage, name) {
  await targetPage.locator('h1').click();
  await targetPage.evaluate(() => scrollTo(0, 0));
  await targetPage.screenshot({ path: path.join(output, name), fullPage: true, style: '#notice { visibility: hidden !important; }' });
}
async function startAndRespond(targetPage, outcome) {
  await chapter(targetPage, 'hold');
  await resourceStatus(targetPage, 'awaitingReview');
  await incurred(targetPage, 0);
  assert.equal(await targetPage.locator('#advance-event').isDisabled(), true, 'Resource review must be explicitly started');
  await guide(targetPage, 'startResources', 'P07', '#start-resource-review');
  await targetPage.locator('#start-resource-review').click();
  await resourceStatus(targetPage, 'reviewing');
  await advance(targetPage, chapterTimes.unavailable);
  await resourceStatus(targetPage, 'reviewing');
  await guide(targetPage, 'scheduling', 'P08', '#resource-response-form select[name="outcome"]');
  const form = targetPage.locator('#resource-response-form');
  await form.locator('select[name="outcome"]').selectOption(outcome);
  await form.locator('textarea[name="reason"]').fill(outcome === 'held' ? 'The earlier laboratory slots and original production-window hold are available within the approved scope.' : 'The requested earlier laboratory slots and original-window hold cannot both be confirmed. Alex must reassess resources.');
  await form.locator('#confirm-resource-response').click();
  await resourceStatus(targetPage, outcome === 'held' ? 'schedulingHeld' : 'schedulingUnavailable');
  await incurred(targetPage, outcome === 'held' ? 50000 : 0);
}
async function authorizeB(targetPage) {
  await chapter(targetPage, 'selection');
  await targetPage.locator('[data-select-plan="B"]').click();
  await targetPage.locator('#draft-task-briefs').click();
  await targetPage.locator('#confirm-task-briefs').waitFor();
  await targetPage.locator('#confirm-task-briefs').click();
  await role(targetPage, 'P02');
  await targetPage.locator('#start-technical').click();
  await role(targetPage, 'P03');
  await targetPage.locator('#start-quality').click();
  await advance(targetPage, chapterTimes.coverage);
  await role(targetPage, 'P01');
  await targetPage.locator('#assign-support').click();
  await role(targetPage, 'P05');
  await targetPage.locator('#accept-support').click();
  await advance(targetPage, '2026-11-10T09:00:00-05:00');
  await role(targetPage, 'P01');
  await targetPage.locator('#designate-approver').click();
  await advance(targetPage, '2026-11-11T17:00:00-05:00');
  await role(targetPage, 'P02');
  await targetPage.locator('#review-technical-form [type="submit"]').click();
  await role(targetPage, 'P03');
  await targetPage.locator('#review-quality-form [type="submit"]').click();
  await advance(targetPage, chapterTimes.authorization);
  await role(targetPage, 'P06');
  await targetPage.locator('#fill-example-signature').click();
  await targetPage.locator('#authorization-form input[name="acknowledged"]').check();
  await targetPage.locator('#authorize-budget').click();
  assert.match(await targetPage.locator('#decision-status').innerText(), /Customer authorized/i);
  assert.match(await targetPage.locator('.decision-summary').innerText(), /\$40,000/);
}

try {
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  const frozen = await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA));
  assert.deepEqual(await page.locator('#chapter-select option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean)), Object.keys(chapterTimes));

  // Customers cannot bypass draft publication through role switching, hash
  // links, notifications, evidence controls or the task-drafting workspace.
  await chapter(page, 'prepublication');
  await page.locator('#risk-publication-form').waitFor();
  assert.equal(await page.locator('#publish-risk').isDisabled(), true, 'Evidence is not yet available at the initial discovery time');
  for (const viewer of ['P01', 'P02', 'P03', 'P04', 'P05', 'P06']) {
    await role(page, viewer);
    for (const hash of ['#main', '#risk', '#risk-evidence', '#decision', '#task-startTechnical']) {
      await navigate(page, hash);
      await assertNoCustomerEvidence(page);
    }
  }
  await role(page, 'P07');
  await navigate(page, '#main');
  await page.locator('#risk-publication-form').waitFor();
  const publication = page.locator('#risk-publication-form');
  await publication.locator('select[name="certainty"]').selectOption('potentialImpact');
  const updates = await publication.locator('select[name="nextUpdateEvent"] option').evaluateAll(nodes => nodes.filter(node => !node.disabled).map(node => node.value));
  const updateEvent = updates.find(value => value !== 'reviewsComplete');
  assert.ok(updateEvent, 'The update picker provides another existing event without inventing a new date');
  await publication.locator('select[name="nextUpdateEvent"]').selectOption(updateEvent);
  const updateAt = await page.evaluate(id => globalThis.DEMO_DATA.events[id].at, updateEvent);
  assert.match(await page.locator('#risk-client-preview').innerText(), /possible|potential|may/i);
  assert.equal(await page.locator('[data-preview-certainty]').getAttribute('data-preview-certainty'), 'potentialImpact');
  assert.match(await page.locator('#risk-client-preview').innerText(), /2\.8%/);
  await page.locator('#review-publication-draft').click();
  assert.equal(await page.locator('#demo-next-step').count(), 0, 'A reviewed prepublication draft guides to time advancement, not the same review again');
  assert.equal(await page.locator('#advance-event').isEnabled(), true);
  await publication.locator('select[name="certainty"]').selectOption('underAssessment');
  assert.equal(await page.locator('#review-publication-draft').count(), 1, 'Editing the draft requires a fresh review');
  assert.equal(await page.locator('#publish-risk').isDisabled(), true);
  await publication.locator('select[name="certainty"]').selectOption('potentialImpact');
  await page.locator('#review-publication-draft').click();
  await advance(page, '2026-11-09T16:00:00+08:00');
  await page.locator('#publish-risk').click();
  assert.equal(Date.parse(await clock(page)), Date.parse(chapterTimes.selection), 'Publishing advances to the existing customer snapshot, never backwards');
  await role(page, 'P01');
  await navigate(page, '#main');
  await page.locator('#risk-title').waitFor();
  await page.locator('#risk-title a').click();
  await page.locator('#risk-evidence').waitFor();
  assert.match(await page.locator('#risk-evidence').innerText(), /2\.8%[\s\S]*2\.0%[\s\S]*SEC-001[\s\S]*v1/);
  assert.equal(await page.locator('.risk-update-strip time').getAttribute('datetime'), updateAt, 'Published next update propagates to the customer risk page');
  assert.equal(await page.locator('[data-risk-certainty]').getAttribute('data-risk-certainty'), 'potentialImpact');
  assert.match(await page.locator('[data-risk-certainty]').innerText(), /possible|potential|may/i);
  await capture(page, 'wuxi-publication.png');
  await page.locator('.risk-back').click();
  await page.locator('[data-select-plan="A"]').click();
  await page.locator('#draft-task-briefs').click();
  await page.locator('#confirm-task-briefs').waitFor();
  for (const draft of await page.locator('.draft-editor textarea').all()) {
    assert.match(await draft.inputValue(), /possible|potential|may/i, 'AI task drafts use the published certainty');
    assert.match(await draft.inputValue(), /Nov 13/, 'AI task drafts use the explicitly published resource-update event');
  }

  // Chapter changes intentionally load named fixtures and clear user-entered
  // form values, read markers and all response outcomes from the prior path.
  await chapter(page, 'authorization');
  await page.locator('#authorization-form input[name="signature"]').fill('Temporary draft name');
  await page.locator('#authorization-form textarea[name="reason"]').fill('Temporary rationale that must not survive a chapter reset.');
  await page.locator('#authorization-form input[name="acknowledged"]').check();
  await notifications(page);
  await page.locator('#mark-notifications-read').click();
  await chapter(page, 'hold');
  await chapter(page, 'authorization');
  assert.equal(await page.locator('#authorization-form input[name="signature"]').inputValue(), '');
  assert.ok(!(await page.locator('#authorization-form textarea[name="reason"]').inputValue()).includes('Temporary rationale'));
  assert.equal(await page.locator('#authorization-form input[name="acknowledged"]').isChecked(), false);
  await notifications(page);
  assert.equal(await page.locator('[data-notification-read="true"]').count(), 0, 'Chapter entry clears role-scoped read markers');
  await page.keyboard.press('Escape');
  await chapter(page, 'coverage');
  assert.match(await page.locator('[data-task="assignBen"]').innerText(), /pending/i);
  await chapter(page, 'selection');
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0');
  assert.equal(await page.locator('#decision-status').count(), 0, 'A selection reset discards seeded authorization history');

  // Mei makes the internal resource decision; Alex separately returns the
  // named receipt. Customer-visible fees and window status wait for that handoff.
  await startAndRespond(page, 'held');
  await role(page, 'P01');
  await resourceStatus(page, 'reviewing');
  assert.equal(await page.locator('#wuxi [data-hold-status="confirmed"]').count(), 0);
  assert.ok(!/No fees incurred/i.test(await page.locator('#decision').innerText()), 'Unknown customer-facing fee status is not misreported as a zero charge');
  await notifications(page);
  assert.equal(await page.locator('[data-notification-kind="resourceConfirmed"]').count(), 0, 'Customers cannot receive an internal Mei outcome before Alex returns it');
  await page.keyboard.press('Escape');
  await page.locator('#risk-title a').click();
  await page.locator('#risk-timeline').waitFor();
  assert.equal(await page.locator('[data-risk-event="schedulingHeld"]').count(), 0, 'The customer timeline does not leak the internal scheduling response');
  assert.equal(await page.locator('[data-risk-event="resourceConfirmed"]').getAttribute('data-event-status'), 'pending');
  assert.equal(await page.locator('[data-risk-hold]').getAttribute('data-risk-hold'), 'pending');
  await page.locator('.risk-back').click();
  await page.locator('#wuxi').waitFor();
  await guide(page, 'replyReceipt', 'P07', '#return-resource-receipt');
  await page.locator('#return-resource-receipt').click();
  await resourceStatus(page, 'held');
  await incurred(page, 50000);
  await role(page, 'P01');
  await resourceStatus(page, 'held');
  await incurred(page, 50000);
  assert.equal(await page.locator('#wuxi [data-hold-status]').getAttribute('data-hold-status'), 'confirmed');
  assert.match(await page.locator('#wuxi').innerText(), /Dec 9[\s\S]*5:00 PM[\s\S]*Shanghai/);
  assert.match(await page.locator('#wuxi').innerText(), /experiment.*not.*started|study.*not.*started|experiment.*not.*charged/i);
  assert.match(await page.locator('#wuxi').innerText(), /process lock pending assessment|does not approve process lock/i);
  assert.equal(await page.locator('#wuxi-response [data-scheduling-by="P08"]').count(), 1);
  assert.equal(await page.locator('#wuxi-response [data-receipt-by="P07"]').count(), 1);
  assert.match(await page.locator('[data-metric="confirmation"] [data-plan="A"]').innerText(), /held|hold confirmed/i);
  assert.match(await page.locator('#project-status').innerText(), /At risk/);
  assert.equal(await page.locator('#decision-deadline').getAttribute('data-deadline-state'), 'held');
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), '2026-12-09T17:00:00+08:00');
  await page.locator('#risk-title a').click();
  await page.locator('#risk-timeline').waitFor();
  assert.equal(await page.locator('[data-risk-event="resourceConfirmed"]').getAttribute('data-event-status'), 'recorded');
  assert.match(await page.locator('.risk-hold-line').innerText(), /held|confirmed/i);
  await capture(page, 'wuxi-hold-risk.png');

  // The exception chapter loads prerequisites, never a fabricated completed
  // rejection. Mei and Alex must still record their separate actions.
  await chapter(page, 'unavailable');
  await resourceStatus(page, 'reviewing');
  await incurred(page, 0);
  const response = page.locator('#resource-response-form');
  await response.locator('select[name="outcome"]').selectOption('unavailable');
  const reason = 'The requested earlier laboratory slots and original-window hold cannot both be confirmed. Reassess the resource plan.';
  await response.locator('textarea[name="reason"]').fill(reason);
  await response.locator('#confirm-resource-response').click();
  await resourceStatus(page, 'schedulingUnavailable');
  await incurred(page, 0);
  await guide(page, 'replyReceipt', 'P07', '#return-resource-receipt');
  await page.locator('#return-resource-receipt').click();
  await role(page, 'P01');
  await resourceStatus(page, 'unavailable');
  await incurred(page, 0);
  assert.match(await page.locator('#wuxi').innerText(), /Alex Lin/);
  assert.ok((await page.locator('#wuxi').innerText()).includes(reason));
  assert.equal(await page.locator('#wuxi [data-hold-status="confirmed"]').count(), 0);
  assert.match(await page.locator('[data-metric="delivery"]').innerText(), /reassessment|required|reassess/i);
  assert.ok(!(await page.locator('[data-metric="gap"]').innerText()).match(/8 days before|34 days after/), 'A rejected resource assumption cannot retain an active delivery-gap forecast');
  await role(page, 'P07');
  await earlyAction(page, '#request-reschedule');
  await advanceTo(page, exceptionTimes.requested);
  await guide(page, 'reschedule', 'P07', '#request-reschedule');
  await page.locator('#request-reschedule').click();
  await resourceStatus(page, 'awaitingWuXiQuote');
  await incurred(page, 0);
  assert.match(await page.locator('#wuxi').innerText(), /pending|awaiting/i);
  assert.equal(await page.locator('[data-task="reschedule"] time').getAttribute('datetime'), exceptionTimes.requested, 'The enquiry uses its own Monday Shanghai start time');
  assert.match(await page.locator('#decision-deadline').innerText(), /Expected WuXi response/i);
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), exceptionTimes.returned);
  assert.equal(await page.locator('#wuxi [data-hold-status="confirmed"]').count(), 0);
  assert.ok(!/Apr 22/.test(await page.locator('#wuxi').innerText()), 'A reschedule request does not inherit option B delivery');
  assert.match(await page.locator('[data-metric="confirmation"] [data-plan="B"]').innerText(), /pending|not yet|awaiting|waiting/i);
  await page.locator('#risk-title a').click();
  await page.locator('#risk-timeline').waitFor();
  assert.equal(await page.locator('[data-risk-event="resourceRejected"]').getAttribute('data-event-status'), 'recorded');
  assert.equal(await page.locator('[data-risk-event="resourceConfirmed"]').count(), 0, 'Unavailable and confirmed receipts remain mutually exclusive');
  assert.equal(await page.locator('[data-risk-event="A-finalAnalysis"]').getAttribute('data-event-status'), 'historicalEstimate');
  assert.equal(await page.locator('#risk-followup-timeline [data-event-status="recorded"]').count(), 1);
  assert.equal(await page.locator('#risk-followup-timeline [data-event-status="planned"]').count(), 5, 'Future exception steps remain planned until explicitly completed');
  assert.equal(await page.locator('[data-risk-event="rescheduleAuthorized"] time').first().getAttribute('datetime'), exceptionTimes.authorized);
  await page.locator('#risk-followup-timeline').screenshot({ path: path.join(output, 'risk-exception-planned.png'), style: '.demo-timeline, .topbar, #notice { visibility: hidden !important; }' });
  await page.locator('.risk-back').click();
  await page.locator('#wuxi').waitFor();
  await capture(page, 'wuxi-unavailable.png');

  // Quote preparation, customer response, a new decision and a fresh signed
  // authorization all precede the only rescheduling fee-triggering action.
  await role(page, 'P08');
  await earlyAction(page, '#record-reschedule-quote');
  await advanceTo(page, exceptionTimes.quote);
  await guide(page, 'rescheduleQuote', 'P08', '#record-reschedule-quote');
  await page.locator('#record-reschedule-quote').click();
  await resourceStatus(page, 'quoteReadyInternal');
  await incurred(page, 0);
  await role(page, 'P01');
  await resourceStatus(page, 'awaitingWuXiQuote');
  assert.equal(await page.locator('[data-reschedule-quote-visible]').count(), 0, 'An internal quote is not customer-visible before Alex returns it');
  assert.equal(await page.locator('#launch-reschedule-decision').count(), 0);
  await role(page, 'P07');
  await earlyAction(page, '#return-reschedule-quote');
  await advanceTo(page, exceptionTimes.returned);
  await guide(page, 'returnQuote', 'P07', '#return-reschedule-quote');
  await page.locator('#return-reschedule-quote').click();
  await incurred(page, 0);
  await role(page, 'P01');
  await earlyAction(page, '#launch-reschedule-decision');
  assert.match(await page.locator('#decision-deadline').innerText(), /Customer action due/i);
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), exceptionTimes.decision);
  await advanceTo(page, exceptionTimes.customerAvailable);
  await earlyAction(page, '#launch-reschedule-decision');
  await advanceTo(page, exceptionTimes.decision);
  await guide(page, 'rescheduleDecision', 'P01', '#launch-reschedule-decision');
  await resourceStatus(page, 'awaitingCustomerDecision');
  assert.match(await page.locator('[data-reschedule-quote-visible]').innerText(), /Feb 15[\s\S]*\$10,000[\s\S]*Q-B[\s\S]*v1/);
  await page.locator('#launch-reschedule-decision').click();
  assert.match(await page.locator('#decision-deadline').innerText(), /Customer action due/i);
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), exceptionTimes.authorized);
  await page.locator('#priority-risk').screenshot({ path: path.join(output, 'exception-customer-action-banner.png'), style: '.demo-timeline, .topbar, #notice { visibility: hidden !important; }' });
  await page.locator('#risk-title a').click();
  await page.locator('#risk-followup-timeline').screenshot({ path: path.join(output, 'risk-exception-awaiting-authorization.png'), style: '.demo-timeline, .topbar, #notice { visibility: hidden !important; }' });
  assert.equal(await page.locator('#risk-followup-timeline [data-event-status="recorded"]').count(), 4);
  assert.equal(await page.locator('#risk-followup-timeline [data-event-status="planned"]').count(), 2);
  await page.locator('.risk-back').click();
  await role(page, 'P06');
  await earlyAction(page, '#authorize-reschedule');
  await advanceTo(page, exceptionTimes.authorized);
  await guide(page, 'rescheduleAuthorization', 'P06', '#reschedule-authorization-form input[name="signature"]');
  await resourceStatus(page, 'awaitingCustomerAuthorization');
  await incurred(page, 0);
  await page.locator('#authorize-reschedule').click();
  assert.equal(await page.locator('#reschedule-authorization-form input[name="signature"]').evaluate(node => node.validity.valueMissing), true);
  await role(page, 'P07');
  assert.equal(await page.locator('#confirm-reschedule').count(), 0, 'Leaving Elena unsigned cannot be treated as authorization');
  await resourceStatus(page, 'awaitingCustomerAuthorization');
  await incurred(page, 0);
  await guide(page, 'rescheduleAuthorization', 'P06', '#reschedule-authorization-form input[name="signature"]');
  await page.locator('#fill-reschedule-signature').click();
  await resourceStatus(page, 'awaitingCustomerAuthorization');
  await page.locator('#reschedule-authorization-form textarea[name="reason"]').fill('I authorize the returned $10,000 rescheduling quote. Technical readiness and delivery remain under assessment.');
  await page.locator('#reschedule-authorization-form input[name="acknowledged"]').check();
  await page.locator('#authorize-reschedule').click();
  await resourceStatus(page, 'awaitingWuXiConfirmation');
  await incurred(page, 0);
  assert.match(await page.locator('#decision-deadline').innerText(), /Expected WuXi response/i);
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), exceptionTimes.confirmed);
  await page.locator('#priority-risk').screenshot({ path: path.join(output, 'exception-wuxi-response-banner.png'), style: '.demo-timeline, .topbar, #notice { visibility: hidden !important; }' });
  await role(page, 'P07');
  await earlyAction(page, '#confirm-reschedule');
  await advanceTo(page, exceptionTimes.confirmed);
  await guide(page, 'confirmReschedule', 'P07', '#confirm-reschedule');
  await page.locator('#confirm-reschedule').click();
  await resourceStatus(page, 'confirmed');
  await incurred(page, 10000);
  assert.equal(await clock(page), exceptionTimes.confirmed, 'Formal confirmation has its own Friday Shanghai business time');
  await role(page, 'P01');
  await incurred(page, 10000);
  assert.match(await page.locator('#reschedule-workspace').innerText(), /readiness[\s\S]*under assessment|readiness pending|delivery requires reassessment/i);
  assert.match(await page.locator('[data-metric="delivery"]').innerText(), /reassessment required/i);
  const expectedRecords = ['requested', 'quote', 'returned', 'decision', 'authorized', 'confirmed'].map(key => Date.parse(exceptionTimes[key]));
  const recordTimes = await page.locator('.reschedule-records time').evaluateAll(nodes => nodes.map(node => Date.parse(node.dateTime)));
  assert.deepEqual(recordTimes, expectedRecords, 'Every performed action records its own preset event time');
  await page.locator('.reschedule-records summary').click();
  assert.equal(await page.locator('.reschedule-records p').count(), 6);
  assert.ok(!/1970|Invalid Date/.test(await page.locator('.reschedule-records').innerText()));
  assert.equal(await page.locator('#decision-deadline').getAttribute('data-deadline-state'), 'rescheduled');
  await notifications(page);
  await page.locator('[data-task-link="rescheduleConfirmation"]').click();
  await page.locator('#task-rescheduleConfirmation').waitFor();
  assert.equal(await page.locator('#task-rescheduleConfirmation a').getAttribute('href'), '#wuxi');
  await page.locator('#risk-title a').click();
  assert.equal(await page.locator('.risk-request-state').getAttribute('data-risk-decision-state'), 'confirmed');
  assert.equal(await page.locator('[data-risk-replacement="confirmed"]').count(), 1);
  assert.ok(!/1970|Invalid Date/.test(await page.locator('#risk-timeline').innerText()));
  assert.equal(await page.locator('#risk-followup-timeline [data-event-time-status="notScheduled"]').count(), 0);
  assert.ok(await page.locator('#risk-followup-timeline time').count() >= 6, 'The exception timeline has separately dated events');
  assert.ok(!/To be agreed|timing.*unassigned/i.test(await page.locator('#risk-followup-timeline').innerText()));
  const timelineTimes = await page.locator('#risk-followup-timeline [data-event-status="recorded"]').evaluateAll(nodes => nodes.map(node => Date.parse(node.querySelector('time').dateTime)));
  assert.deepEqual(timelineTimes, expectedRecords, 'Recorded exception actions have their own chronological business dates');
  const localTimes = await page.evaluate(() => globalThis.DEMO_DATA.rescheduleTimeline.map(item => {
    const owner = globalThis.DEMO_DATA.people[item.ownerIds[0]];
    const at = globalThis.DEMO_DATA.events[item.eventRef].at;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: owner.timezone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(at));
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  }));
  for (const local of localTimes) {
    assert.ok(!['Sat', 'Sun'].includes(local.weekday), 'No action assumes weekend duty');
    assert.ok(Number(local.hour) >= 9 && Number(local.hour) <= 17, 'Each actor acts during their own office day');
  }
  assert.equal(await page.locator('#risk-followup-now').count(), 1);
  await page.locator('#risk-followup-timeline').screenshot({ path: path.join(output, 'risk-exception-recorded.png'), style: '.demo-timeline, .topbar, #notice { visibility: hidden !important; }' });
  await page.locator('.risk-back').click();
  await capture(page, 'wuxi-rescheduled.png');
  await authorizeB(page);
  await incurred(page, 0);
  assert.equal(await page.locator('#wuxi [data-hold-status="confirmed"]').count(), 0);
  assert.equal(await page.locator('#resource-response-form option[value="held"]:enabled').count(), 0, 'Option B never offers an original-window hold');
  await role(page, 'P07');
  await earlyAction(page, '#request-reschedule');
  await advanceTo(page, exceptionTimes.requested);
  await guide(page, 'reschedule', 'P07', '#request-reschedule');
  await page.locator('#request-reschedule').click();
  await resourceStatus(page, 'awaitingWuXiQuote');
  await incurred(page, 0);
  assert.equal(await page.locator('#wuxi [data-hold-status="confirmed"]').count(), 0);
  assert.ok(!/Apr 22/.test(await page.locator('#wuxi').innerText()), 'B authorization submits a reschedule request, not a confirmed delivery date');
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozen, 'Phase 5 never changes frozen scenario parameters');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, offline: true });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(pathToFileURL(standalone).href);
  await chapter(mobile, 'prepublication');
  await assertMobile(mobile, '#risk-publication-form select, #publish-risk, #chapter-select, #demo-next-step');
  await startAndRespond(mobile, 'held');
  await assertMobile(mobile, '#wuxi input, #wuxi select, #wuxi textarea, #wuxi button, #chapter-select');
  await guide(mobile, 'replyReceipt', 'P07', '#return-resource-receipt');
  await mobile.locator('#return-resource-receipt').click();
  await role(mobile, 'P01');
  await assertMobile(mobile, '#wuxi [data-fee-incurred], #wuxi [data-hold-status], #wuxi-response');
  await capture(mobile, 'wuxi-hold-mobile.png');
  await mobileContext.close();
  assert.deepEqual(errors, [], 'No browser exceptions in publication, resources or exceptions');
  assert.deepEqual(network, [], 'Every Phase 5 action works from an isolated offline HTML file');
  console.log('WuXi browser checks passed: customer draft isolation, publication review and metadata, explicit chapter resets and seed provenance, form/read-state reset, named resource response separation, hold and fee triggers, full quote/decision/authorization/reschedule flow, separate dated exception actions, office-calendar progression, unchanged original dates/amounts, offline and mobile.');
} finally {
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

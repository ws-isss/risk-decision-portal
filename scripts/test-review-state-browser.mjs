import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-review-states-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [], network = [], checked = [];
const taskKeys = ['startTechnical', 'startQuality'];
const oldAmbiguousText = /complete review packet|combined review package|完整审阅材料|合并审阅材料|审阅材料已齐备/i;
const copy = {
  en: { evidence: /Evidence published/i, pending: /Task briefs (?:pending|awaiting) confirmation/i, ready: /Ready to start review/i, sent: /Sent at/i, start: /Start by/i },
  zh: { evidence: /证据已发布/, pending: /任务说明待确认/, ready: /可以开始审阅/, sent: /发送于/, start: /最晚开始/ }
};
const clock = page => page.locator('.demo-clock time').getAttribute('datetime');
async function role(page, id) {
  const before = await clock(page);
  await page.locator('#viewer').selectOption(id);
  assert.equal(await clock(page), before, 'Role switching cannot move the simulated clock');
}
async function navigate(page, hash) {
  await page.evaluate(hash => { location.hash = hash; }, hash);
  await page.locator(hash === '#risk' ? '#risk-timeline' : '#decision').waitFor();
}
async function taskState(page, key) {
  return page.locator(`[data-task="${key}"] [data-task-status]`).getAttribute('data-task-status');
}
async function snapshot(page) {
  return page.evaluate(() => ({
    clock: document.querySelector('.demo-clock time').dateTime,
    taskCount: document.querySelector('#decision')?.dataset.taskCount,
    tasks: [...document.querySelectorAll('[data-task]')].map(node => [node.dataset.task, node.querySelector('[data-task-status]')?.dataset.taskStatus]),
    confirmations: [...document.querySelectorAll('[data-confirmation-key]')].map(node => ({ ...node.dataset }))
  }));
}
async function notifications(page) {
  if (await page.locator('#notifications-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#notifications-toggle').click();
  await page.locator('#notifications-panel').waitFor({ state: 'visible' });
}
async function checkNotification(page, lang, key, kind, status, { sentAt, statePattern } = {}) {
  await notifications(page);
  const notification = page.locator(`#notifications-panel [data-task-link="${key}"]`);
  assert.equal(await notification.count(), 1, 'Each task has one current notification');
  assert.equal(await notification.getAttribute('data-notification-kind'), kind);
  assert.equal(await notification.locator('[data-notification-status]').getAttribute('data-notification-status'), status);
  if (statePattern) assert.match(await notification.locator('.notification-title').innerText(), statePattern);
  const sent = notification.locator('[data-notification-sent]');
  const timing = notification.locator('[data-notification-timing]');
  assert.match(await sent.innerText(), copy[lang].sent, 'Notification timestamps explicitly identify when the message was sent');
  assert.match(await timing.innerText(), copy[lang].start, 'The separate task timing explicitly identifies its latest start');
  const at = await sent.locator('time').getAttribute('datetime');
  if (sentAt) assert.equal(at, sentAt);
  assert.ok(Date.parse(at) <= Date.parse(await clock(page)), 'Only sending times describe an already occurred event');
  const taskAt = await page.locator(`[data-task="${key}"] .action-due time`).first().getAttribute('datetime');
  assert.equal(await timing.locator('time').first().getAttribute('datetime'), taskAt, 'Notification and task row use the same latest-start timestamp');
  assert.doesNotMatch(await notification.innerText(), oldAmbiguousText);
  await page.keyboard.press('Escape');
  return taskAt;
}
async function checkReviewRisk(page, { status, assigned, startAt, completeAt, lang }) {
  await navigate(page, '#risk');
  assert.doesNotMatch(await page.locator('body').innerText(), oldAmbiguousText);
  const evidence = page.locator('[data-risk-event="customerPacketAvailable"]');
  assert.equal(await evidence.getAttribute('data-event-status'), 'recorded');
  assert.match(await evidence.innerText(), copy[lang].evidence);
  assert.match(await evidence.innerText(), /SEC-001/);
  assert.match(await evidence.innerText(), /EXP-001/);
  const review = page.locator('.risk-review-progress');
  assert.equal(await review.getAttribute('data-review-state'), status, 'Risk detail uses the same assigned/review state as the task');
  const pending = page.locator('[data-risk-event="taskBriefPending"]');
  if (!assigned) {
    assert.equal(await pending.getAttribute('data-event-status'), 'pending');
    assert.equal(await pending.locator('time').count(), 0, 'Pending task confirmation has no fabricated event timestamp');
    assert.match(await pending.innerText(), copy[lang].pending);
    assert.equal(await page.locator('[data-risk-event="tasksCreated"]').count(), 0);
  } else {
    assert.equal(await pending.count(), 0);
    const created = page.locator('[data-risk-event="tasksCreated"]');
    assert.equal(await created.getAttribute('data-event-status'), 'recorded');
    assert.ok(await created.locator('time').count(), 'Only real assignment receives a recorded timestamp');
  }
  assert.equal(await page.locator('[data-risk-event="latestReviewStart"] [data-field="time"] time').first().getAttribute('datetime'), startAt);
  assert.equal(await page.locator('[data-risk-event="reviewsComplete"] [data-field="time"] time').first().getAttribute('datetime'), completeAt);
  if (['briefPending', 'readyForReview'].includes(status)) {
    assert.equal(await page.locator('.risk-review-start time').first().getAttribute('datetime'), startAt, 'Risk review guidance and task latest-start agree');
  }
  await navigate(page, '#main');
}
async function makePage(lang, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, offline: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  if (lang === 'zh') {
    await page.locator('#language-menu summary').click();
    await page.locator('[data-language="zh"]').click();
  }
  return { page, context };
}
async function mobileLayout(page, label) {
  await notifications(page);
  const result = await page.evaluate(() => {
    const panel = document.querySelector('#notifications-panel').getBoundingClientRect();
    const contents = [...document.querySelectorAll('#notifications-panel [data-task-link], [data-notification-sent], [data-notification-timing]')].map(node => ({ r: node.getBoundingClientRect(), scroll: node.scrollWidth, width: node.clientWidth }));
    return { panel: panel.left >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight, horizontal: document.documentElement.scrollWidth <= innerWidth + 1 && contents.every(({r, scroll, width}) => r.left >= 0 && r.right <= innerWidth + 1 && scroll <= width + 2) };
  });
  assert.equal(result.panel, true, `${label}: notification panel fits the viewport`);
  assert.equal(result.horizontal, true, `${label}: sending and task times wrap without horizontal overflow`);
  await page.screenshot({ path: path.join(output, `review-states-${label}.png`) });
  await page.keyboard.press('Escape');
}
async function run(lang, mobile = false) {
  const { page, context } = await makePage(lang, mobile);
  const { initialClock, latestReviewStart, reviewsComplete } = await page.evaluate(() => ({ initialClock: DEMO_DATA.initialClock, latestReviewStart: DEMO_DATA.events.latestReviewStart.at, reviewsComplete: DEMO_DATA.events.reviewsComplete.at }));
  const frozen = await page.evaluate(() => JSON.stringify(DEMO_DATA));
  for (const key of taskKeys) {
    assert.equal(await taskState(page, key), 'briefPending');
    await checkNotification(page, lang, key, 'reviewReady', 'briefPending', { sentAt: initialClock, statePattern: copy[lang].evidence });
  }
  await role(page, 'P02');
  assert.equal(await page.locator('#start-technical').count(), 0, 'Evidence availability alone does not create a review task');
  await checkReviewRisk(page, { status: 'briefPending', assigned: false, startAt: latestReviewStart, completeAt: reviewsComplete, lang });
  await navigate(page, '#risk');
  for (const id of ['SEC-001', 'EXP-001']) {
    await page.locator(`[data-report="${id}"], [data-source-report="${id}"]`).first().click();
    assert.equal(await page.locator('#dialog').isVisible(), true);
    assert.match(await page.locator('#dialog').innerText(), new RegExp(id));
    await page.locator('#dialog [data-close]').first().click();
  }
  await navigate(page, '#main');
  await role(page, 'P01');
  await page.locator('[data-select-plan="A"]').click();
  await checkNotification(page, lang, 'startTechnical', 'taskBriefPending', 'briefPending', { statePattern: copy[lang].pending });
  await page.locator('#draft-task-briefs').click();
  await page.locator('#confirm-task-briefs').waitFor();
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '0', 'AI generation alone creates no tasks');
  for (const key of taskKeys) {
    assert.equal(await taskState(page, key), 'briefPending');
    await checkNotification(page, lang, key, 'taskBriefPending', 'briefPending', { statePattern: copy[lang].pending });
  }
  if (mobile) await mobileLayout(page, `${lang}-pending-mobile`);
  await page.locator('#confirm-task-briefs').click();
  assert.equal(await page.locator('#decision').getAttribute('data-task-count'), '3');
  for (const key of taskKeys) {
    assert.equal(await taskState(page, key), 'readyForReview');
    await checkNotification(page, lang, key, 'tasksAssigned', 'readyForReview', { sentAt: initialClock, statePattern: copy[lang].ready });
  }
  const beforeRead = await snapshot(page);
  await notifications(page);
  await page.locator('#mark-notifications-read').click();
  assert.deepEqual(await snapshot(page), beforeRead, 'Reading notifications neither assigns tasks nor starts or completes a review');
  await page.keyboard.press('Escape');
  if (mobile) await mobileLayout(page, `${lang}-assigned-mobile`);
  await role(page, 'P02');
  await checkReviewRisk(page, { status: 'readyForReview', assigned: true, startAt: latestReviewStart, completeAt: reviewsComplete, lang });
  assert.equal(await page.locator('#start-technical').isEnabled(), true);
  await page.locator('#start-technical').click();
  assert.equal(await taskState(page, 'startTechnical'), 'inProgress');
  await checkNotification(page, lang, 'startTechnical', 'reviewStarted', 'inProgress', { sentAt: initialClock });
  await role(page, 'P03');
  assert.equal(await page.locator('#start-quality').isEnabled(), true);
  await page.locator('#start-quality').click();
  assert.equal(await taskState(page, 'startQuality'), 'inProgress');
  await page.locator('#advance-event').click();
  await role(page, 'P01'); await page.locator('#assign-support').click();
  await role(page, 'P05'); await page.locator('#accept-support').click();
  await page.locator('#advance-event').click();
  await role(page, 'P01'); await page.locator('#designate-approver').click();
  await page.locator('#advance-event').click();
  assert.equal(await clock(page), reviewsComplete);
  await role(page, 'P02'); await page.locator('#review-technical-form select[name="outcome"]').selectOption('approved');
  await page.locator('#review-technical-form [type="submit"]').click();
  await checkNotification(page, lang, 'startTechnical', 'reviewCompleted', 'approved', { sentAt: reviewsComplete });
  await navigate(page, '#risk');
  assert.equal(await page.locator('[data-risk-event="technicalCompleted"]').getAttribute('data-event-status'), 'recorded');
  assert.notEqual(await page.locator('[data-risk-event="reviewsComplete"]').getAttribute('data-event-status'), 'recorded', 'One recorded opinion does not make both review opinions complete');
  await page.locator('[data-info="riskNextUpdate"] > summary').click();
  assert.match(await page.locator('[data-review-opinion="technical"]').innerText(), lang === 'zh' ? /同意/ : /Agree/i);
  assert.match(await page.locator('[data-review-opinion="quality"]').innerText(), lang === 'zh' ? /尚未记录|未记录/ : /not (?:yet )?recorded/i);
  await page.keyboard.press('Escape');
  assert.doesNotMatch(await page.locator('body').innerText(), oldAmbiguousText);
  await navigate(page, '#main');
  await role(page, 'P03'); await page.locator('#review-quality-form select[name="outcome"]').selectOption('approved');
  await page.locator('#review-quality-form [type="submit"]').click();
  await checkNotification(page, lang, 'startQuality', 'reviewCompleted', 'approved', { sentAt: reviewsComplete });
  await navigate(page, '#risk');
  assert.equal(await page.locator('[data-risk-event="reviewsComplete"]').getAttribute('data-event-status'), 'recorded');
  assert.match(await page.locator('[data-risk-event="reviewsComplete"]').innerText(), lang === 'zh' ? /意见/ : /opinions/i);
  assert.doesNotMatch(await page.locator('body').innerText(), oldAmbiguousText);
  assert.equal(await page.evaluate(() => JSON.stringify(DEMO_DATA)), frozen, 'Review actions preserve the frozen scenario data');
  checked.push(`${lang}-${mobile ? '390px' : 'desktop'}: evidence → pending briefs → assigned → started → one opinion → both opinions`);
  await context.close();
}
try {
  await run('en');
  await run('zh');
  await run('zh', true);
  assert.deepEqual(errors, [], 'No JavaScript errors');
  assert.deepEqual(network, [], 'The full review flow works from the isolated offline HTML');
  await writeFile(path.join(output, 'review-state-qa-report.json'), JSON.stringify({ checked, errors, network }, null, 2));
  console.log('Review-state browser checks passed: English and Chinese evidence/brief/assignment boundaries, separate sent/latest-start times, shared task and risk timestamps, independent reviewer opinions, read-only notifications, and offline 390px layouts.');
} finally {
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

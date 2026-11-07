import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Optional QA dependency. It is never bundled or required by the website.
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const screenshots = path.join(root, 'output');
await mkdir(screenshots, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-offline-'));
const standalonePath = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalonePath);
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, offline: true });
const page = await context.newPage();
const errors = [];
const externalRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
async function assertInfoPlacement(targetPage, key) {
  await targetPage.waitForFunction(infoKey => {
    const tip = document.querySelector(`[data-info="${infoKey}"]`);
    if (!tip?.open) return false;
    const panel = tip.querySelector('.info-content');
    const rect = panel.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
  }, key, { timeout: 3000 });
}
async function assertFeeBreakdown(scope) {
  const amounts = {
    shared: ['$30,000', '$30,000'], expedite: ['$30,000', 'Not included'],
    hold: ['$20,000', 'Not included'], reschedule: ['Not included', '$10,000']
  };
  for (const [fee, values] of Object.entries(amounts)) {
    const row = scope.locator(`[data-fee="${fee}"]`);
    assert.deepEqual(await row.locator('[data-fee-plan]').allTextContents(), values);
  }
  assert.match(await scope.locator('[data-fee="shared"] .fee-condition').innerText(), /experiment starts/);
  assert.match(await scope.locator('[data-fee="expedite"]').innerText(), /Expedite fee/);
  assert.match(await scope.locator('[data-fee="expedite"] .fee-condition').innerText(), /Non-refundable only after WuXi confirms/);
  assert.match(await scope.locator('[data-fee="hold"] .fee-condition').innerText(), /Non-refundable only after WuXi confirms/);
  assert.match(await scope.locator('[data-fee="reschedule"] .fee-condition').innerText(), /after rescheduling is confirmed/);
  assert.match(await scope.locator('.fee-current-state').innerText(), /No fees committed/);
  assert.match(await scope.locator('.fee-fallback').innerText(), /not selected.*\$10,000.*\$90,000/);
}
async function assertTimelineBoundary(targetPage, expectedClock) {
  const separator = targetPage.locator('#risk-timeline-now');
  assert.equal(await separator.count(), 1, 'Timeline has one current-time separator');
  assert.equal(await separator.locator('time').getAttribute('datetime'), expectedClock, 'Now uses the simulated clock');
  const rows = await targetPage.locator('.risk-timeline-table tbody > tr').evaluateAll(nodes => nodes.map(node => ({
    now: node.id === 'risk-timeline-now', status: node.dataset.eventStatus
  })));
  const boundary = rows.findIndex(row => row.now);
  assert.ok(boundary > 0 && boundary < rows.length - 1, 'Now separates recorded and upcoming rows');
  assert.ok(rows.slice(0, boundary).every(row => row.status === 'recorded'), 'Only recorded events precede Now');
  assert.ok(rows.slice(boundary + 1).every(row => ['planned', 'deadline', 'conditionalForecast'].includes(row.status)), 'Future states stay after Now');
}
async function assertShanghaiContext(targetPage, shanghaiViewer = false) {
  const dualTimeEvents = ['riskDiscovered', 'materialReady', 'resourceConfirmed', 'resourceConfirmationDeadline'];
  for (const event of dualTimeEvents) {
    const row = targetPage.locator(`[data-risk-event="${event}"]`);
    const secondary = row.locator('[data-shanghai-time]');
    assert.equal(await secondary.count(), shanghaiViewer ? 0 : 1, `${event} adds Shanghai context only when needed`);
    if (!shanghaiViewer) {
      assert.match(await secondary.innerText(), /Shanghai/);
      const times = await row.locator('[data-field="time"] time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime')));
      assert.equal(times.length, 2);
      assert.equal(Date.parse(times[0]), Date.parse(times[1]), `${event} displays one instant in both zones`);
    }
  }
  for (const event of ['customerPacketAvailable', 'budgetOwnerNotified', 'backupAssigned', 'alternateAssigned', 'latestReviewStart', 'reviewsComplete', 'budgetAuthorized', 'latestAuthorization', 'A-customerResultReview']) {
    assert.equal(await targetPage.locator(`[data-risk-event="${event}"] [data-shanghai-time]`).count(), 0, 'Customer-side events do not gain a Shanghai work label');
  }
  for (const event of ['A-finalAnalysis', 'A-windowUseConfirmation']) {
    const row = targetPage.locator(`[data-risk-event="${event}"]`);
    assert.equal(await row.locator('[data-shanghai-time]').count(), 0, 'Shanghai forecast milestones do not duplicate their execution time');
    assert.match(await row.locator('[data-field="time"]').innerText(), /Shanghai/);
  }
}
async function openNotifications(targetPage) {
  const toggle = targetPage.locator('#notifications-toggle');
  assert.equal(await toggle.getAttribute('aria-controls'), 'notifications-panel');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await targetPage.locator('#notifications-panel').isVisible(), true);
  assert.equal(await targetPage.locator('#notifications-panel').getAttribute('aria-labelledby'), 'notifications-title');
}
async function unreadNotificationCount(targetPage) {
  const badge = targetPage.locator('#notification-count');
  return await badge.count() && await badge.isVisible() ? Number(await badge.innerText()) : 0;
}
async function assertNotificationsForTasks(targetPage, expectedTasks) {
  await openNotifications(targetPage);
  const links = targetPage.locator('#notifications-panel [data-notification-id][data-task-link]');
  const tasks = await links.evaluateAll(nodes => nodes.map(node => node.dataset.taskLink));
  assert.deepEqual([...tasks].sort(), [...expectedTasks].sort(), 'Notifications use the current role’s task records');
  assert.equal(new Set(await links.evaluateAll(nodes => nodes.map(node => node.dataset.notificationId))).size, tasks.length, 'Notifications have stable unique identities');
  const clock = await targetPage.locator('#snapshot-time').getAttribute('datetime');
  for (const at of await links.locator('time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime')))) {
    assert.ok(Date.parse(at) <= Date.parse(clock), 'Notifications cannot announce future events as already received');
  }
  assert.ok(!(await links.evaluateAll(nodes => nodes.map(node => node.dataset.notificationKind))).includes('authorizationReceived'), 'Customer authorization is not reported before it occurs');
  for (const task of tasks) {
    const link = targetPage.locator(`#notifications-panel [data-task-link="${task}"]`);
    assert.equal(await link.getAttribute('href'), `#task-${task}`);
    const row = targetPage.locator(`[data-task="${task}"]`);
    const status = await row.getAttribute('data-task-status') || await row.locator('[data-task-status]').getAttribute('data-task-status');
    assert.equal(await link.locator('[data-notification-status]').getAttribute('data-notification-status'), status, 'Notification status follows the linked task');
    assert.equal(await row.getAttribute('id'), `task-${task}`);
  }
  if (!tasks.length) {
    assert.equal(await unreadNotificationCount(targetPage), 0);
    assert.match(await targetPage.locator('#notifications-panel').innerText(), /no notifications|no task notifications|no assigned tasks/i, 'Unassigned roles see an explicit empty state');
  }
  await targetPage.keyboard.press('Escape');
  assert.equal(await targetPage.locator('#notifications-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await targetPage.locator('#notifications-panel').isVisible(), false);
  assert.equal(await targetPage.locator('#notifications-toggle').evaluate(node => document.activeElement === node), true, 'Escape returns focus to the notification control');
}
let server;
try {
  await page.goto(pathToFileURL(standalonePath).href);
  await page.locator('#risk-title').waitFor();
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('h1').innerText(), 'Project overview');
  assert.equal(await page.locator('#comparison-title').innerText(), 'Compare options');
  assert.equal(await page.locator('#actions-title').innerText(), 'Today’s actions');
  assert.equal(await page.locator('#context-title').innerText(), 'Project progress');
  assert.equal(await page.locator('#risk-title').innerText(), 'Purification aggregates above target');
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), '2026-11-13T17:00:00-05:00');
  assert.match(await page.locator('#decision-deadline').innerText(), /Customer authorization due\s+Fri, Nov 13, 5:00 PM\s+ET/);
  assert.deepEqual(await page.locator('main > section').evaluateAll(elements => elements.map(e => e.id)), ['priority-risk', 'comparison', 'actions', 'context']);
  assert.equal(await page.locator('#delivery').count(), 0, 'The comparison replaces the separate delivery block');
  assert.equal(await page.locator('[data-decision-summary]').count(), 0, 'The decision must be a comparison, not repeated prose');
  assert.deepEqual(await page.locator('#comparison-table [data-metric]').evaluateAll(nodes => nodes.map(n => n.dataset.metric)), ['cost', 'window', 'delivery', 'gap', 'confirmation']);
  assert.match(await page.locator('[data-metric="cost"] [data-plan="A"]').innerText(), /\$80,000/);
  assert.match(await page.locator('[data-metric="cost"] [data-plan="B"]').innerText(), /\$40,000/);
  assert.match(await page.locator('[data-metric="window"] [data-plan="A"]').innerText(), /Jan 4, 2027/);
  assert.match(await page.locator('[data-metric="window"] [data-plan="B"]').innerText(), /Feb 15, 2027/);
  assert.match(await page.locator('[data-metric="confirmation"] [data-plan="A"]').innerText(), /Not yet requested/);
  assert.equal(await page.locator('[data-metric="confirmation"] [data-plan="B"]').innerText(), 'Not yet requested');
  assert.match(await page.locator('[data-gap="A"]').innerText(), /8 days before/);
  assert.match(await page.locator('[data-gap="B"]').innerText(), /34 days after/);
  assert.equal(await page.locator('.shared-prerequisite').isVisible(), true);
  assert.match(await page.locator('.shared-prerequisite').innerText(), /technical readiness and resource confirmation/);
  assert.equal(await page.locator('#toggle-costs').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#cost-details').isVisible(), false);
  await page.locator('#toggle-costs').click();
  assert.equal(await page.locator('#toggle-costs').getAttribute('aria-expanded'), 'true');
  await assertFeeBreakdown(page.locator('#overview-cost-detail'));
  await page.locator('#toggle-costs').click();
  assert.equal(await page.locator('#cost-details').isVisible(), false);
  await page.locator('#language-menu > summary').click();
  assert.equal(await page.locator('[data-language="en"]').getAttribute('aria-current'), 'true');
  assert.equal(await page.locator('[data-language="zh"]').isDisabled(), true);
  assert.match(await page.locator('[data-language="zh"]').innerText(), /available after the core flow/);
  await page.locator('[data-language="en"]').click();
  assert.equal(await page.locator('#language-menu').getAttribute('open'), null);
  const emmaTasks = ['assignBen', 'startTechnical', 'startQuality', 'designateElena'];
  assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.task)), emmaTasks);
  assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.owner)), ['P01', 'P02', 'P03', 'P01']);
  assert.deepEqual(await page.locator('[data-task] time').evaluateAll(nodes => nodes.map(n => n.getAttribute('datetime'))), [
    '2026-11-09T11:00:00-05:00', '2026-11-10T09:00:00-05:00', '2026-11-10T09:00:00-05:00', '2026-11-10T09:00:00-05:00'
  ]);
  assert.match(await page.locator('[data-task="assignBen"]').innerText(), /Pending assignment/);
  assert.match(await page.locator('[data-task="designateElena"]').innerText(), /Pending designation/);
  for (const task of ['startTechnical', 'startQuality']) assert.match(await page.locator(`[data-task="${task}"]`).innerText(), /Not started/);
  assert.match(await page.locator('.actions-table thead').innerText(), /Start by/);
  assert.equal(await page.locator('[data-role-action="P01"] time').getAttribute('datetime'), '2026-11-09T11:00:00-05:00');
  assert.equal(await page.locator('[data-info][open]').count(), 0, 'Explanatory text starts collapsed');
  await page.locator('[data-info="coverage"] > summary').click();
  assert.match(await page.locator('[data-info="coverage"] .info-content').innerText(), /Ben/);
  assert.match(await page.locator('[data-info="coverage"] .info-content').innerText(), /Elena/);
  assert.match(await page.locator('[data-info="coverage"] .info-content').innerText(), /pending/i);
  assert.match(await page.locator('[data-info="coverage"] .info-content').innerText(), /cannot approve/i);
  await assertInfoPlacement(page, 'coverage');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-info="coverage"]').getAttribute('open'), null, 'Escape closes the explanation');
  assert.equal(await page.locator('[data-info="coverage"] > summary').evaluate(node => document.activeElement === node), true, 'Escape returns focus to the information control');
  await page.locator('[data-info="risk"] > summary').click();
  await assertInfoPlacement(page, 'risk');
  await page.locator('h1').click();
  assert.equal(await page.locator('[data-info="risk"]').getAttribute('open'), null, 'A click outside closes the explanation');
  assert.deepEqual(await page.locator('[data-workstream]').evaluateAll(nodes => nodes.map(n => [n.dataset.workstream, n.dataset.status])), [
    ['cellLineBank', 'completed'], ['upstream', 'completed'], ['downstream', 'atRisk'], ['analytical', 'inProgress'], ['formulation', 'inProgress']
  ]);
  assert.match(await page.locator('[data-research-status="completed"]').innerText(), /Research complete/);
  for (const workstream of ['cellLineBank', 'upstream']) assert.match(await page.locator(`[data-workstream="${workstream}"]`).innerText(), /Development work complete/);
  assert.equal(await page.locator('#forecast-basis').getAttribute('open'), null);
  const comparisonBounds = await page.locator('#comparison-table').boundingBox();
  const lastActionBounds = await page.locator('[data-task="designateElena"]').boundingBox();
  assert.ok(comparisonBounds.y + comparisonBounds.height <= 1050, 'A/B summary is visible immediately on desktop');
  assert.ok(lastActionBounds.y + lastActionBounds.height <= 1050, 'All four current actions are visible immediately on desktop');
  const baselineClock = await page.locator('#snapshot-time').getAttribute('datetime');
  const aDate = await page.locator('[data-forecast="A"] time').getAttribute('datetime');
  const fixedBasis = await page.locator('#forecast-basis table').textContent();
  const byRole = { P01: emmaTasks, P02: ['startTechnical'], P03: ['startQuality'], P04: ['budget'], P05: [], P06: [], P07: ['monitor', 'receipt'], P08: ['schedule'] };
  for (const [role, expected] of Object.entries(byRole)) {
    await page.locator('#viewer').selectOption(role);
    assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.task)), expected);
    await assertNotificationsForTasks(page, expected);
    assert.equal(await page.locator('.role-next-action').getAttribute('data-role-action'), role);
    assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock, 'Viewer switching must not move time');
    assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), '2026-11-13T17:00:00-05:00');
    assert.match(await page.locator('#decision-deadline').innerText(), /Fri, Nov 13, 5:00 PM\s+ET/);
    assert.match(await page.locator('[data-gap="A"]').innerText(), /8 days/);
    assert.match(await page.locator('[data-gap="B"]').innerText(), /34 days/);
    assert.equal(await page.locator('#forecast-basis table').textContent(), fixedBasis, 'Execution dates must not follow the viewer timezone');
    if (['P01', 'P04', 'P05', 'P06'].includes(role)) {
      assert.match(await page.locator('.coverage-note').innerText(), /Olivia Grant.*On leave/);
      assert.equal(await page.locator('[data-info="coverage"]').getAttribute('open'), null);
    }
    if (role === 'P04') {
      assert.match(await page.locator('.viewer-picker label').innerText(), /On leave/);
      assert.match(await page.locator('[data-task="budget"]').innerText(), /Awaiting coverage/);
      assert.equal(await page.locator('[data-task="budget"] time').getAttribute('datetime'), '2026-11-13T09:00:00-05:00');
      await page.locator('h1').click();
      await page.screenshot({ path: path.join(screenshots, 'homepage-olivia.png'), fullPage: true });
    }
    if (['P05', 'P06'].includes(role)) assert.equal(await page.locator('.role-next-action time').count(), 0, 'Unassigned roles do not get an invented action deadline');
  }
  assert.match(await page.locator('[data-forecast="A"] time').innerText(), /Mar 11/);
  assert.match(await page.locator('[data-forecast="B"] time').innerText(), /Apr 22/);
  await page.locator('#viewer').selectOption('P01');
  const unchangedTasks = await page.locator('[data-task]').evaluateAll(nodes => nodes.map(node => ({ key: node.dataset.task, status: node.dataset.taskStatus || node.querySelector('[data-task-status]').dataset.taskStatus })));
  const initialUnread = await unreadNotificationCount(page);
  assert.equal(initialUnread, emmaTasks.length, 'Opening a panel does not mark notifications as read');
  await openNotifications(page);
  assert.match(await page.locator('[data-task-link="assignBen"]').innerText(), /Ben/);
  assert.match(await page.locator('[data-task-link="assignBen"]').innerText(), /pending|arrange|assign/i);
  assert.match(await page.locator('[data-task-link="designateElena"]').innerText(), /pending|designate/i);
  await page.screenshot({ path: path.join(screenshots, 'notifications-desktop.png') });
  await page.locator('[data-task-link="assignBen"]').click();
  await page.locator('#task-assignBen').waitFor();
  assert.equal(new URL(page.url()).hash, '#task-assignBen');
  assert.equal(await page.locator('#task-assignBen').evaluate(node => document.activeElement === node), true, 'Notification navigation focuses its task');
  assert.equal(await page.locator('#task-assignBen').evaluate(node => node.classList.contains('task-highlight')), true, 'The linked task is visually highlighted');
  assert.equal(await page.locator('#notifications-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await unreadNotificationCount(page), initialUnread - 1);
  await openNotifications(page);
  assert.equal(await page.locator('[data-task-link="assignBen"]').getAttribute('data-notification-read'), 'true');
  await page.locator('h1').click();
  assert.equal(await page.locator('#notifications-panel').isVisible(), false, 'An outside click closes notifications');
  await page.locator('#viewer').selectOption('P02');
  assert.equal(await unreadNotificationCount(page), 1, 'Emma’s reading state does not mark Daniel’s notification as read');
  await openNotifications(page);
  await page.locator('#mark-notifications-read').click();
  assert.equal(await unreadNotificationCount(page), 0);
  await page.locator('#viewer').selectOption('P01');
  assert.equal(await unreadNotificationCount(page), initialUnread - 1, 'Read state stays scoped to its viewer');
  await openNotifications(page);
  await page.locator('#mark-notifications-read').click();
  assert.equal(await unreadNotificationCount(page), 0);
  assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(node => ({ key: node.dataset.task, status: node.dataset.taskStatus || node.querySelector('[data-task-status]').dataset.taskStatus }))), unchangedTasks, 'Reading notifications cannot assign or complete tasks');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock, 'Reading notifications cannot advance time');
  assert.equal(await page.locator('[data-confirmation="A"]').innerText(), 'Not yet requested');
  assert.equal(await page.locator('[data-confirmation="B"]').innerText(), 'Not yet requested');
  await page.keyboard.press('Escape');
  await page.locator('h1').click();
  await page.screenshot({ path: path.join(screenshots, 'homepage-desktop.png'), fullPage: true });
  await page.locator('#forecast-basis > summary').click();
  assert.equal(await page.locator('#forecast-basis tbody tr').count(), 20);
  assert.equal(await page.locator('#forecast-basis').getAttribute('open'), '');
  assert.equal(await page.locator('#forecast-basis thead th').count(), 4);
  assert.match(await page.locator('#forecast-basis thead').innerText(), /Execution time zone/);
  assert.equal(await page.locator('[data-stage="seedExpansion"] .execution-zone').innerText(), 'Shanghai');
  assert.equal(await page.locator('[data-stage="customerResultReview"] .execution-zone').innerText(), 'New York');
  assert.match(await page.locator('[data-stage="seedExpansion"] [data-plan="A"]').innerText(), /^Jan 4, 2027/);
  assert.match(await page.locator('[data-stage="customerResultReview"] [data-plan="A"]').innerText(), /^Dec 4, 2026/);
  assert.match(await page.locator('.basis-notes').innerText(), /Cross-border transport uses Shanghai/);
  await page.locator('#forecast-basis').screenshot({ path: path.join(screenshots, 'forecast-basis.png') });
  await page.locator('#forecast-basis > summary').click();
  await page.locator('#edit-requirement').click();
  await page.locator('#requirement-date').fill('2027-03-10');
  await page.locator('#requirement-form [type="submit"]').click();
  assert.match(await page.locator('[data-gap="A"]').innerText(), /1 day after/);
  assert.match(await page.locator('[data-gap="B"]').innerText(), /43 days after/);
  assert.equal(await page.locator('[data-forecast="A"] time').getAttribute('datetime'), aDate);
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  await page.locator('#risk-title a').click();
  await page.locator('.risk-detail-page').waitFor();
  assert.equal(new URL(page.url()).hash, '#risk');
  assert.equal(await page.locator('h1').innerText(), 'Risk details');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.equal(await page.locator('#risk-role-focus').getAttribute('data-risk-role'), 'P01');
  assert.deepEqual(await page.locator('[data-result-plan="A"] time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime'))), [
    '2026-11-25T17:00:00+08:00', '2026-12-02T17:00:00+08:00', '2026-12-04T17:00:00+08:00'
  ]);
  assert.deepEqual(await page.locator('[data-result-plan="B"] time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime'))), [
    '2026-12-09T17:00:00+08:00', '2026-12-16T17:00:00+08:00', '2026-12-18T17:00:00+08:00'
  ]);
  assert.match(await page.locator('.risk-hold-line').innerText(), /Not yet requested/);
  assert.match(await page.locator('.risk-hold-line').innerText(), /If requested and confirmed: hold until\s+Dec 9, 5:00 PM\s+Shanghai/);
  assert.equal(await page.locator('.risk-hold-line time').getAttribute('datetime'), '2026-12-09T17:00:00+08:00');
  assert.deepEqual(await page.locator('[data-assessment]').evaluateAll(nodes => nodes.map(node => node.dataset.assessment)), ['known', 'unknown', 'possible']);
  const evidence = await page.locator('.risk-evidence-table').innerText();
  for (const expected of ['SEC-HPLC', '2.8%', '≤ 2.0%', 'Final small-scale purification sample', 'SEC-001', 'v1']) assert.ok(evidence.includes(expected), `Evidence includes ${expected}`);
  assert.match(await page.locator('.risk-evidence-meta').innerText(), /Alex Lin/);
  assert.match(await page.locator('.risk-update-strip').innerText(), /Alex Lin/);
  assert.equal(await page.locator('.risk-update-strip time').getAttribute('datetime'), '2026-11-11T17:00:00-05:00');
  assert.equal(await page.locator('[data-risk-event="backupAssigned"]').getAttribute('data-event-status'), 'planned');
  assert.equal(await page.locator('[data-risk-event="alternateAssigned"]').getAttribute('data-event-status'), 'planned');
  assert.equal(await page.locator('[data-risk-event="budgetAuthorized"]').getAttribute('data-event-status'), 'planned');
  assert.equal(await page.locator('[data-risk-event="resourceConfirmed"]').getAttribute('data-event-status'), 'planned');
  const timeline = await page.locator('[data-risk-event]').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.riskEvent, status: node.dataset.eventStatus, at: node.querySelector('time').getAttribute('datetime')
  })));
  assert.ok(timeline.some(event => event.status === 'recorded'), 'Timeline distinguishes recorded events');
  assert.ok(timeline.some(event => event.status === 'conditionalForecast'), 'Timeline distinguishes conditional forecasts');
  for (const event of timeline.filter(event => Date.parse(event.at) > Date.parse(baselineClock))) {
    assert.ok(['planned', 'deadline', 'conditionalForecast'].includes(event.status), `${event.id} must not be recorded as complete`);
  }
  await assertTimelineBoundary(page, baselineClock);
  assert.match(await page.locator('#risk-timeline-now').innerText(), /Now\s*·\s*Nov 9, 9:00 AM\s+ET/);
  await assertShanghaiContext(page);
  assert.match(await page.locator('[data-risk-event="riskDiscovered"] [data-field="time"]').innerText(), /Nov 8, 2026, 9:00 PM[\s\S]*Nov 9, (?:2026, )?10:00 AM[\s\S]*Shanghai/, 'WuXi local time preserves the cross-day discovery date');
  assert.match(await page.locator('[data-risk-event="resourceConfirmed"] [data-shanghai-time]').innerText(), /Nov 13, (?:2026, )?5:00 PM/);
  await openNotifications(page);
  await page.locator('[data-task-link="startTechnical"]').click();
  await page.locator('#task-startTechnical').waitFor();
  assert.equal(new URL(page.url()).hash, '#task-startTechnical');
  assert.equal(await page.locator('main').getAttribute('data-page'), 'overview');
  assert.equal(await page.locator('#viewer').inputValue(), 'P01');
  assert.equal(await page.locator('#task-startTechnical').evaluate(node => document.activeElement === node && node.classList.contains('task-highlight')), true, 'A risk-page notification opens, focuses and highlights its overview task');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.match(await page.locator('#need-date-display').innerText(), /Mar 10, 2027/);
  assert.match(await page.locator('[data-gap="A"]').innerText(), /1 day after/);
  await page.locator('#risk-title a').click();
  await page.locator('.risk-detail-page').waitFor();
  await page.locator('[data-report="SEC-001"]').click();
  assert.match(await page.locator('#dialog').innerText(), /SEC-001 · v1/);
  assert.match(await page.locator('#dialog').innerText(), /not a GMP release failure/);
  await page.keyboard.press('Escape');
  await page.locator('#notice.visible').waitFor({ state: 'hidden', timeout: 8000 });
  await page.locator('h1').click();
  await page.screenshot({ path: path.join(screenshots, 'risk-emma.png'), fullPage: true });
  const focusHeadings = [await page.locator('#risk-focus-title').innerText()];
  await page.locator('#viewer').selectOption('P06');
  assert.equal(await page.locator('#risk-role-focus').getAttribute('data-risk-role'), 'P06');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  focusHeadings.push(await page.locator('#risk-focus-title').innerText());
  assert.match(await page.locator('.risk-budget-summary').innerText(), /\$80,000.*\$40,000.*No paid commitment yet/s);
  assert.match(await page.locator('#risk-role-focus').innerText(), /\$50,000 becomes non-refundable only after/);
  assert.match(await page.locator('#risk-role-focus').innerText(), /Approval designation is pending/);
  await assertFeeBreakdown(page.locator('#risk-fees'));
  await page.locator('h1').click();
  await page.screenshot({ path: path.join(screenshots, 'risk-elena.png'), fullPage: true });
  await page.locator('#viewer').selectOption('P03');
  assert.equal(await page.locator('#risk-role-focus').getAttribute('data-risk-role'), 'P03');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  focusHeadings.push(await page.locator('#risk-focus-title').innerText());
  assert.equal(new Set(focusHeadings).size, 3, 'Emma, Elena and Nina see different priorities');
  assert.match(await page.locator('#risk-role-focus .risk-scope-boundary').innerText(), /does not approve process lock, GMP production start or batch release/);
  assert.equal(await page.locator('.risk-review-start time').getAttribute('datetime'), '2026-11-10T09:00:00-05:00');
  await page.locator('h1').click();
  await page.screenshot({ path: path.join(screenshots, 'risk-nina.png'), fullPage: true });
  await page.locator('#risk-compare-options').click();
  await page.locator('#comparison').waitFor();
  assert.equal(new URL(page.url()).hash, '#comparison');
  assert.equal(await page.locator('#viewer').inputValue(), 'P03');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.match(await page.locator('[data-gap="A"]').innerText(), /1 day after/);
  assert.equal(await page.locator('#comparison').evaluate(node => node.getBoundingClientRect().top >= 0 && node.getBoundingClientRect().top < innerHeight), true, 'Compare entry scrolls to the existing A/B section');
  await page.locator('.role-next-action a[href="#risk"]').click();
  await page.locator('.risk-detail-page').waitFor();
  await page.locator('#risk-assign-tasks').click();
  assert.equal(await page.locator('#dialog').isVisible(), true);
  assert.match(await page.locator('#dialog').innerText(), /coming soon|not available.*yet|not yet available/i, 'Assignment entry must disclose that the assignment workflow is not implemented yet');
  await page.locator('#view-pending-actions').click();
  await page.locator('#actions').waitFor();
  assert.equal(new URL(page.url()).hash, '#actions');
  assert.equal(await page.locator('#dialog').getAttribute('open'), null);
  assert.equal(await page.locator('#viewer').inputValue(), 'P03');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.task)), ['startQuality'], 'Navigation does not create or assign tasks');
  assert.equal(await page.locator('#actions').evaluate(node => node.getBoundingClientRect().top >= 0 && node.getBoundingClientRect().top < innerHeight), true, 'Pending-action entry scrolls to the existing role list');
  await page.locator('.role-next-action a[href="#risk"]').click();
  await page.locator('.risk-detail-page').waitFor();
  await page.locator('#viewer').selectOption('P07');
  await assertTimelineBoundary(page, baselineClock);
  await assertShanghaiContext(page, true);
  assert.match(await page.locator('#risk-timeline-now').innerText(), /Now\s*·\s*Nov 9, 10:00 PM\s+Shanghai/);
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock, 'Changing the Now display timezone cannot move time');
  await page.locator('#viewer').selectOption('P03');
  await page.locator('.risk-back').click();
  await page.locator('#risk-title').waitFor();
  assert.equal(await page.locator('#viewer').inputValue(), 'P03');
  assert.equal(await page.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.match(await page.locator('#need-date-display').innerText(), /Mar 10, 2027/);
  assert.match(await page.locator('[data-gap="A"]').innerText(), /1 day after/);
  assert.match(await page.locator('[data-gap="B"]').innerText(), /43 days after/);
  await page.locator('#viewer').selectOption('P01');
  await page.locator('#edit-requirement').click();
  await page.locator('#requirement-date').fill('2027-03-11');
  await page.locator('#requirement-item').fill('<img src=x onerror=alert(1)>');
  await page.locator('#requirement-form [type="submit"]').click();
  assert.match(await page.locator('[data-gap="A"]').innerText(), /on the need date/i);
  assert.equal(await page.locator('main img[src="x"]').count(), 0, 'Edited text must be escaped');
  await page.locator('#reset-demo').click();
  await page.locator('#confirm-reset').click();
  assert.match(await page.locator('#notice').innerText(), /Scenario reset/);
  assert.match(await page.locator('[data-gap="A"]').innerText(), /8 days/);
  assert.equal(await unreadNotificationCount(page), emmaTasks.length, 'Explicit scenario reset restores the initial unread state');
  await openNotifications(page);
  assert.equal(await page.locator('[data-notification-read="true"]').count(), 0, 'Reset clears prior read markers');
  await page.keyboard.press('Escape');
  await page.locator('[data-info="risk"] > summary').click();
  await page.locator('[data-info="risk"] [data-open-report]').click();
  assert.match(await page.locator('#dialog').innerText(), /2.8%/);
  assert.match(await page.locator('#dialog').innerText(), /not a GMP release failure/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#dialog').getAttribute('open'), null);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Desktop page overflow');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, offline: true });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  mobile.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await mobile.goto(pathToFileURL(standalonePath).href);
  await mobile.locator('#risk-title').waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile page overflow');
  assert.equal(await mobile.getByText('Demo data', { exact: true }).first().isVisible(), true, 'Demo data label must remain visible on mobile');
  assert.equal(await mobile.locator('[data-metric="confirmation"] [data-plan="B"]').innerText(), 'Not yet requested');
  assert.deepEqual(await mobile.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.task)), emmaTasks);
  assert.equal(await mobile.locator('[data-gap]').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'Both A/B delivery gaps must be visible without horizontal scrolling on mobile');
  assert.equal(await mobile.locator('[data-task] .action-due, [data-task] [data-task-status]').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'All action deadlines and statuses must stay within the mobile viewport');
  await mobile.screenshot({ path: path.join(screenshots, 'homepage-mobile.png'), fullPage: true });
  await openNotifications(mobile);
  assert.equal(await mobile.locator('#notifications-panel').evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  }), true, 'The notification panel fits the mobile viewport');
  assert.equal(await mobile.locator('#notifications-panel [data-task-link]').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'Notification text and task links need no horizontal scrolling');
  await mobile.screenshot({ path: path.join(screenshots, 'notifications-mobile.png') });
  await mobile.locator('[data-task-link="designateElena"]').click();
  await mobile.locator('#task-designateElena').waitFor();
  assert.equal(await mobile.locator('#task-designateElena').evaluate(node => document.activeElement === node && node.classList.contains('task-highlight')), true, 'Notification navigation works on mobile');
  assert.equal(await mobile.locator('#snapshot-time').getAttribute('datetime'), baselineClock);
  assert.match(await mobile.locator('#task-designateElena').innerText(), /Pending designation/);
  await mobile.locator('#actions').scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(screenshots, 'homepage-mobile-actions.png') });
  await mobile.locator('[data-info="support"] > summary').click();
  assert.match(await mobile.locator('[data-info="support"] .info-content').innerText(), /cannot approve/i);
  await assertInfoPlacement(mobile, 'support');
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.locator('[data-info="support"]').getAttribute('open'), null);
  await mobile.locator('[data-info="window"] > summary').click();
  await assertInfoPlacement(mobile, 'window');
  await mobile.keyboard.press('Escape');
  await mobile.locator('#toggle-costs').click();
  await assertFeeBreakdown(mobile.locator('#overview-cost-detail'));
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Expanded fee details stay inside the mobile page');
  assert.equal(await mobile.locator('#overview-cost-detail .fee-condition').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'Fee commitment conditions remain visible without horizontal scrolling');
  await mobile.locator('#toggle-costs').click();
  await mobile.locator('#edit-requirement').click();
  assert.equal(await mobile.locator('#dialog').isVisible(), true);
  await mobile.keyboard.press('Escape');
  await mobile.locator('.role-next-action a[href="#risk"]').click();
  await mobile.locator('.risk-detail-page').waitFor();
  assert.equal(await mobile.locator('#risk-role-focus').getAttribute('data-risk-role'), 'P01');
  await assertTimelineBoundary(mobile, baselineClock);
  await assertShanghaiContext(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Risk details stay inside the mobile page');
  assert.equal(await mobile.locator('#risk-timeline [data-field="status"], #risk-evidence [data-field="report"], #risk-evidence [data-field="version"], [data-result-plan] td, #risk-timeline-now, [data-shanghai-time], #risk-next-steps a, #risk-next-steps button').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'Timeline states, Now separator, Shanghai context, next-step entries, report versions and study milestones remain visible on mobile');
  await mobile.screenshot({ path: path.join(screenshots, 'risk-mobile.png'), fullPage: true });
  await mobile.locator('#viewer').selectOption('P06');
  assert.equal(await mobile.locator('#risk-role-focus').getAttribute('data-risk-role'), 'P06');
  await assertFeeBreakdown(mobile.locator('#risk-fees'));
  assert.equal(await mobile.locator('#risk-fees .fee-condition').evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth;
  })), true, 'Elena can read every fee commitment condition on mobile');
  await mobile.screenshot({ path: path.join(screenshots, 'risk-mobile-elena.png'), fullPage: true });
  await mobile.reload();
  await mobile.locator('.risk-detail-page').waitFor();
  assert.equal(await mobile.locator('h1').innerText(), 'Risk details', 'Offline risk route survives refresh');
  await mobile.locator('.risk-back').click();
  await mobile.locator('#risk-title').waitFor();
  await mobileContext.close();
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.locator('#risk-title').waitFor();
  assert.deepEqual(await page.locator('[data-task]').evaluateAll(nodes => nodes.map(n => n.dataset.task)), emmaTasks, 'Relative-path source HTML must also work over file://');
  await page.locator('#priority-risk').click({ position: { x: 5, y: 5 } });
  await page.locator('.risk-detail-page').waitFor();
  assert.equal(new URL(page.url()).hash, '#risk', 'Risk banner background opens the detail route');
  await page.reload();
  await page.locator('.risk-detail-page').waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, [], 'Offline file version must not request external resources');

  // Serve the exact artifact beneath a repository prefix, as on GitHub Pages.
  const html = await readFile(path.join(root, 'dist/index.html'));
  server = http.createServer((request, response) => {
    if (request.url === '/interview-project/' || request.url === '/interview-project/index.html') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html); }
    else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const online = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const hosted = await online.newPage();
  const hostedErrors = [];
  hosted.on('pageerror', error => hostedErrors.push(error.message));
  await hosted.goto(`http://127.0.0.1:${server.address().port}/interview-project/`);
  await hosted.locator('#risk-title').waitFor();
  await hosted.getByRole('link', { name: 'Today’s actions', exact: true }).click();
  await hosted.reload();
  await hosted.locator('#risk-title').waitFor();
  await hosted.locator('#risk-title a').click();
  await hosted.locator('.risk-detail-page').waitFor();
  await hosted.reload();
  await hosted.locator('.risk-detail-page').waitFor();
  assert.equal(await hosted.locator('h1').innerText(), 'Risk details', 'Repository subpath preserves the risk hash route on refresh');
  assert.deepEqual(hostedErrors, []);
  await online.close();
  console.log('Browser checks passed: homepage deadlines and scoped progress, cost conditions, language availability, A/B and four Emma actions, 8 role views, role-scoped notifications and task status, independent read state and reset, notification task links from either page, risk role priorities, conditional hold, evidence versions, Now separator, WuXi Shanghai times, next-step navigation, future timeline status, shared state, execution timezones, need-date gaps, popovers, report/reset, offline single file, relative assets, mobile and risk subpath refresh.');
  console.log('Screenshots: output/homepage-desktop.png, homepage-mobile.png, notifications-desktop.png, notifications-mobile.png, forecast-basis.png, risk-emma.png, risk-elena.png, risk-nina.png and risk-mobile.png');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

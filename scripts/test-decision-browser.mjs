import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Optional local QA dependencies are never part of the public artifact.
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-decision-offline-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [];
const externalRequests = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, offline: true });
const page = await context.newPage();
function observe(targetPage) {
  targetPage.on('pageerror', error => errors.push(error.message));
  targetPage.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
}
observe(page);
const initialClock = '2026-11-09T09:00:00-05:00';
const stops = ['2026-11-09T11:00:00-05:00', '2026-11-10T09:00:00-05:00', '2026-11-11T17:00:00-05:00', '2026-11-12T17:00:00-05:00'];
const confirmation = (targetPage, key) => targetPage.locator(`[data-confirmation-key="${key}"]`);
const clock = targetPage => targetPage.locator('#snapshot-time').getAttribute('datetime');
async function role(targetPage, id) {
  const before = await clock(targetPage);
  await targetPage.locator('#viewer').selectOption(id);
  assert.equal(await clock(targetPage), before, 'Role changes preserve the simulation clock');
}
async function noAdvance(targetPage) {
  const before = await clock(targetPage);
  assert.equal(await targetPage.locator('#advance-event').isDisabled(), true, 'The next preset is gated by incomplete current work');
  assert.equal(await clock(targetPage), before);
}
async function advance(targetPage, expected) {
  const before = await clock(targetPage);
  assert.equal(await targetPage.locator('#advance-event').isEnabled(), true, 'Completed prerequisites allow clock-only advancement');
  await targetPage.locator('#advance-event').click();
  assert.equal(await clock(targetPage), expected);
  assert.ok(Date.parse(expected) >= Date.parse(before), 'Only an explicit reset can move time back');
}
async function reset(targetPage) {
  await targetPage.locator('#reset-demo').click();
  await targetPage.locator('#confirm-reset').click();
  assert.match(await targetPage.locator('#notice').innerText(), /Scenario reset/);
  assert.equal(await clock(targetPage), initialClock);
  if ((await targetPage.locator('main').getAttribute('data-page')) === 'risk') await targetPage.locator('.risk-back').click();
  await role(targetPage, 'P01');
}
async function openNotifications(targetPage) {
  if (await targetPage.locator('#notifications-toggle').getAttribute('aria-expanded') !== 'true') await targetPage.locator('#notifications-toggle').click();
  assert.equal(await targetPage.locator('#notifications-panel').isVisible(), true);
}
async function notificationToTask(targetPage, key, kind) {
  const before = await clock(targetPage);
  await openNotifications(targetPage);
  const notice = targetPage.locator(`#notifications-panel [data-task-link="${key}"]`);
  assert.equal(await notice.count(), 1, 'A task has one current notification, without duplicates');
  if (kind) assert.equal(await notice.getAttribute('data-notification-kind'), kind);
  const expectedStatus = await notice.locator('[data-notification-status]').getAttribute('data-notification-status');
  await notice.click();
  const task = targetPage.locator(`#task-${key}`);
  await task.waitFor();
  assert.equal(await task.locator('[data-task-status]').getAttribute('data-task-status'), expectedStatus, 'Notification status matches the shared task record');
  assert.equal(await task.evaluate(node => node.classList.contains('task-highlight') && document.activeElement === node), true);
  assert.equal(await clock(targetPage), before, 'Reading a notification is not a business action');
}
async function assertDraftGrowth(targetPage) {
  assert.equal(await targetPage.locator('textarea[data-draft-role]').evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2)), true, 'Every AI brief grows to its content without an internal scrollbar');
}
async function assertAboveTimeline(targetPage, selector) {
  await targetPage.waitForFunction(targetSelector => {
    const node = document.querySelector(targetSelector);
    const bar = document.querySelector('.demo-timeline');
    if (!node || !bar) return false;
    const box = node.getBoundingClientRect();
    const topbar = document.querySelector('.topbar').getBoundingClientRect();
    return box.top >= topbar.bottom && box.bottom <= bar.getBoundingClientRect().top && box.left >= 0 && box.right <= innerWidth;
  }, selector, { timeout: 3000 });
}
async function assertFooterSpace(targetPage) {
  await targetPage.waitForFunction(() => {
    const footer = document.querySelector('.demo-timeline');
    const reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--demo-bar-space'));
    const mainPadding = parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom);
    return footer && reserve >= footer.getBoundingClientRect().height && mainPadding >= footer.getBoundingClientRect().height;
  }, undefined, { timeout: 3000 });
}
async function decisionSnapshot(targetPage) {
  return targetPage.evaluate(() => ({
    clock: document.querySelector('#snapshot-time').getAttribute('datetime'),
    count: document.querySelector('#decision')?.dataset.taskCount || '0',
    authorized: document.querySelector('#decision-status')?.dataset.authorized || 'false',
    confirmations: [...document.querySelectorAll('[data-confirmation-key]')].map(node => [node.dataset.confirmationKey, node.dataset.status])
  }));
}
async function guide(targetPage, key, viewer, target) {
  const before = await decisionSnapshot(targetPage);
  const button = targetPage.locator('#demo-next-step');
  assert.equal(await button.getAttribute('data-guide-key'), key);
  assert.equal(await button.getAttribute('data-guide-role'), viewer);
  await button.click();
  assert.equal(await targetPage.locator('#viewer').inputValue(), viewer);
  assert.deepEqual(await decisionSnapshot(targetPage), before, 'Guidance only changes role and focus; it never performs a decision action');
  assert.equal(await targetPage.locator(target).evaluate(node => document.activeElement === node), true, 'Guidance focuses the next operation');
  await assertAboveTimeline(targetPage, target === '#comparison' ? '[data-select-plan="A"]' : target);
}
async function selectAndDraft(targetPage, plan = 'A', fallback = false) {
  await guide(targetPage, 'select', 'P01', '#comparison');
  await targetPage.locator(`[data-select-plan="${plan}"]`).click();
  assert.match(await targetPage.locator('#decision-status').innerText(), /request|pending|review/i);
  assert.equal(await targetPage.locator('#decision').getAttribute('data-task-count'), '0', 'Selecting a plan creates a request, not tasks or approvals');
  assert.deepEqual(await targetPage.locator('[data-confirmation-key]').evaluateAll(nodes => nodes.map(node => node.dataset.confirmationKey)), ['technical', 'quality', 'budget', 'schedule']);
  for (const [key, owner] of [['technical', 'Daniel Reed'], ['quality', 'Nina Patel'], ['budget', 'Elena Torres'], ['schedule', 'Mei Zhang']]) {
    assert.match(await confirmation(targetPage, key).innerText(), new RegExp(owner));
  }
  assert.match(await confirmation(targetPage, 'budget').innerText(), /technical|quality|review/i);
  assert.match(await confirmation(targetPage, 'schedule').innerText(), /customer authorization/i);
  if (plan === 'A') {
    assert.equal(await targetPage.locator('#fallback-authorization').isChecked(), false, 'Fallback authorization is opt-in');
    if (fallback) await targetPage.locator('#fallback-authorization').check();
    assert.match(await targetPage.locator('#decision').innerText(), /\$10,000/);
  } else assert.equal(await targetPage.locator('#fallback-authorization').count(), 0, 'B does not inherit A fallback authorization');
  assert.equal(await targetPage.locator('.decision-summary > div:last-child strong').innerText(), plan === 'B' ? '$40,000' : fallback ? '$90,000' : '$80,000', 'Requested authorization reflects exactly the selected scope');
  await noAdvance(targetPage);
  await guide(targetPage, 'draft', 'P01', '#draft-task-briefs');
  await targetPage.locator('#draft-task-briefs').click();
  assert.equal(await targetPage.locator('#draft-task-briefs').isDisabled(), true, 'Simulated generation has an observable loading state');
  await targetPage.locator('textarea[data-draft-role="technical"]').waitFor();
  assert.equal(await targetPage.locator('#decision').getAttribute('data-task-count'), '0', 'AI generation alone does not create tasks');
  assert.match(await targetPage.locator('#decision').innerText(), /AI draft \(simulated\)/);
  assert.equal(await targetPage.locator('.draft-editor textarea[data-draft-role]').count(), 3);
  for (const kind of ['technical', 'quality', 'budget']) {
    const copy = await targetPage.locator(`textarea[data-draft-role="${kind}"]`).inputValue();
    assert.match(copy, /SEC-001.*v1/s, 'Each draft cites a report and version');
    assert.match(copy, /missing|pending|confirm|unconfirmed/i, 'The brief states information or confirmations still needed');
    assert.match(copy, /Nov|2026|start/i, 'The brief includes its preset start requirement');
    assert.ok(!/preset (?:event|review-completion)|record.*preset/i.test(copy), 'Task briefs describe business action timing without demo-controller instructions');
  }
  await assertDraftGrowth(targetPage);
  const initialHeight = await targetPage.locator('textarea[data-draft-role="technical"]').evaluate(node => node.clientHeight);
  const edited = `${await targetPage.locator('textarea[data-draft-role="technical"]').inputValue()}\nPM note: verify recovery alongside HMW before confirming.\n${'Additional review note: retain the comparison of recovery and HMW and identify missing evidence.\n'.repeat(12)}`;
  await targetPage.locator('textarea[data-draft-role="technical"]').fill(edited);
  await assertDraftGrowth(targetPage);
  assert.ok(await targetPage.locator('textarea[data-draft-role="technical"]').evaluate(node => node.clientHeight) > initialHeight, 'Typing a longer brief increases the editor height');
  await noAdvance(targetPage);
  await guide(targetPage, 'confirm', 'P01', '#confirm-task-briefs');
  await targetPage.locator('#confirm-task-briefs').click();
  assert.match(await targetPage.locator('#decision').innerText(), /created|assigned/i);
  assert.equal(await targetPage.locator('#decision').getAttribute('data-task-count'), '3');
  assert.deepEqual(await targetPage.locator('[data-created-task]').evaluateAll(nodes => nodes.map(node => node.dataset.createdTask)), ['technical', 'quality', 'budget']);
  assert.match(await targetPage.locator('[data-created-task="technical"]').textContent(), /PM note: verify recovery alongside HMW before confirming\./);
  assert.equal(await targetPage.locator('#confirm-task-briefs:enabled').count(), 0, 'A confirmed batch cannot be created twice');
  assert.equal(await targetPage.locator('#draft-task-briefs:enabled').count(), 0, 'Existing assigned briefs cannot be overwritten by regeneration');
  assert.equal(await targetPage.locator('[data-select-plan]:enabled').count(), 0, 'Tasks cannot silently switch to another option after confirmation');
  return edited;
}
async function startReviews(targetPage) {
  await guide(targetPage, 'startTechnical', 'P02', '#start-technical');
  await notificationToTask(targetPage, 'startTechnical', 'tasksAssigned');
  await targetPage.locator('#start-technical').click();
  assert.match(await confirmation(targetPage, 'technical').innerText(), /in progress|reviewing|started/i);
  assert.equal(await clock(targetPage), initialClock, 'Review starts preserve the three-day preset turnaround');
  assert.ok((await targetPage.locator('#review-technical-form textarea[name="reason"]').inputValue()).trim(), 'Technical rationale starts with editable example text');
  await guide(targetPage, 'startQuality', 'P03', '#start-quality');
  await targetPage.locator('#start-quality').click();
  assert.match(await confirmation(targetPage, 'quality').innerText(), /in progress|reviewing|started/i);
  await role(targetPage, 'P01');
}
async function completeReviews(targetPage) {
  await guide(targetPage, 'completeTechnical', 'P02', '#review-technical-form textarea[name="reason"]');
  const technical = targetPage.locator('#review-technical-form');
  assert.ok((await technical.locator('textarea[name="reason"]').inputValue()).trim(), 'Example rationale remains editable before confirmation');
  await technical.locator('textarea[name="reason"]').fill('');
  await technical.locator('[type="submit"]').click();
  assert.equal(await technical.evaluate(node => node.checkValidity()), false, 'Deleting an example reason still requires a nonempty rationale');
  const technicalReason = 'Accept the bounded existing-method study and recovery criteria; no GMP readiness approval.';
  await technical.locator('textarea[name="reason"]').fill(technicalReason);
  await role(targetPage, 'P01');
  await targetPage.locator('#risk-title a').click();
  await targetPage.locator('#risk-assign-tasks').click();
  await targetPage.locator('#decision').waitFor();
  await guide(targetPage, 'completeTechnical', 'P02', '#review-technical-form textarea[name="reason"]');
  assert.equal(await technical.locator('textarea[name="reason"]').inputValue(), technicalReason, 'Edited rationale survives role and page navigation');
  await technical.locator('[type="submit"]').click();
  assert.match(await confirmation(targetPage, 'technical').innerText(), /confirmed|complete/i);
  await notificationToTask(targetPage, 'startTechnical', 'reviewCompleted');
  await role(targetPage, 'P06');
  assert.equal(await targetPage.locator('#authorize-budget').isDisabled(), true, 'One review is insufficient for budget authorization');
  await guide(targetPage, 'completeQuality', 'P03', '#review-quality-form textarea[name="reason"]');
  const quality = targetPage.locator('#review-quality-form');
  assert.ok((await quality.locator('textarea[name="reason"]').inputValue()).trim(), 'QA rationale starts with editable example text');
  await quality.locator('textarea[name="reason"]').fill('Accept the defined quality evidence and evaluation scope only; batch release remains separate.');
  await quality.locator('[type="submit"]').click();
  assert.match(await confirmation(targetPage, 'quality').innerText(), /confirmed|complete/i);
}
async function sign(targetPage) {
  // This is the only guided brief checkpoint. All earlier guide calls assert
  // their business action directly, so an extra brief step fails the flow.
  await role(targetPage, 'P06');
  assert.equal(await targetPage.locator('#authorization-brief-status').getAttribute('data-brief-state'), 'missing');
  const before = await decisionSnapshot(targetPage);
  await guide(targetPage, 'managementBrief', 'P01', '#generate-management-brief');
  assert.equal(await targetPage.locator('#management-brief').count(), 0, 'The guide focuses generation without generating automatically');
  await targetPage.locator('#generate-management-brief').click();
  await targetPage.locator('#management-brief-editor').waitFor();
  const draft = `${await targetPage.locator('#management-brief-editor').inputValue()}\n\nEmma’s authorization note: confirm the selected study scope before signing.`;
  await targetPage.locator('#management-brief-editor').fill(draft);
  await guide(targetPage, 'previewBrief', 'P01', '#preview-management-brief');
  await targetPage.locator('#preview-management-brief').click();
  const sharedPreview = await targetPage.locator('#management-brief-preview').innerText();
  assert.deepEqual(await decisionSnapshot(targetPage), before, 'Generating and previewing a private brief does not sign or complete a workflow action');
  await role(targetPage, 'P06');
  assert.equal(await targetPage.locator('#authorization-brief-status').getAttribute('data-brief-state'), 'missing');
  assert.equal(await targetPage.locator('#management-brief').count(), 0, 'Elena cannot see Emma’s private draft, even after preview');
  await guide(targetPage, 'attachBrief', 'P01', '#attach-management-brief');
  assert.equal(await targetPage.locator('#management-brief-preview').innerText(), sharedPreview, 'Returning from Elena preserves the private preview');
  await targetPage.locator('#attach-management-brief').click();
  assert.deepEqual(await decisionSnapshot(targetPage), before, 'Attaching a frozen brief does not sign, complete or change any workflow action');
  await guide(targetPage, 'authorize', 'P06', '#authorization-form input[name="signature"]');
  assert.equal(await targetPage.locator('#authorization-brief-status').getAttribute('data-brief-state'), 'current');
  assert.equal(await targetPage.locator('#management-brief').getAttribute('data-brief-readonly'), 'true');
  assert.equal(await targetPage.locator('#management-brief-preview').innerText(), sharedPreview, 'Elena sees the frozen version that Emma explicitly attached');
  assert.equal(await targetPage.locator('#management-brief-preview').getAttribute('data-brief-version'), '1');
  assert.match(await targetPage.locator('#management-brief').innerText(), /v1[\s\S]*Emma|Emma[\s\S]*v1/i);
  assert.equal(await targetPage.locator('#management-brief-editor, #generate-management-brief, #regenerate-management-brief, #edit-management-brief, #copy-management-brief, #preview-management-brief, #attach-management-brief').count(), 0, 'Elena cannot edit, regenerate, attach or copy Emma’s private draft');
  await targetPage.locator('#view-management-brief').click();
  assert.equal(await targetPage.locator('#management-brief').evaluate(node => document.activeElement === node), true);
  await guide(targetPage, 'authorize', 'P06', '#authorization-form input[name="signature"]');
  const form = targetPage.locator('#authorization-form');
  const sampleReason = await form.locator('textarea[name="reason"]').inputValue();
  assert.ok(sampleReason.trim(), 'Budget rationale is prefilled without recording an authorization');
  assert.equal(await form.locator('input[name="signature"]').inputValue(), '', 'An example reason never silently signs for Elena');
  assert.equal(await form.locator('input[name="acknowledged"]').isChecked(), false);
  await targetPage.locator('#fill-example-signature').click();
  assert.equal(await form.locator('input[name="signature"]').inputValue(), 'Elena Torres');
  assert.equal(await form.locator('textarea[name="reason"]').inputValue(), sampleReason);
  assert.equal(await form.locator('input[name="acknowledged"]').isChecked(), false, 'Signature shortcut does not accept the authorization scope');
  assert.equal(await targetPage.locator('#decision-status').getAttribute('data-authorized'), 'false');
  await form.locator('input[name="signature"]').fill('');
  await form.locator('#authorize-budget').click();
  assert.equal(await form.evaluate(node => node.checkValidity()), false, 'A signature, reason and acknowledgement are required');
  assert.ok(!/Customer authorized/i.test(await targetPage.locator('#decision-status').innerText()));
  await form.locator('input[name="signature"]').fill('Ben Lewis');
  const budgetReason = 'Authorize the selected bounded study and resource request within my approval limit.';
  await form.locator('textarea[name="reason"]').fill(budgetReason);
  await form.locator('input[name="acknowledged"]').check();
  await form.locator('#authorize-budget').click();
  assert.ok(!/Customer authorized/i.test(await targetPage.locator('#decision-status').innerText()), 'A different person’s signature cannot authorize');
  assert.match(await targetPage.locator('#decision-error').innerText(), /Elena|signature|name/i);
  await role(targetPage, 'P01');
  await targetPage.locator('#risk-title a').click();
  await targetPage.locator('#risk-assign-tasks').click();
  await targetPage.locator('#decision').waitFor();
  await guide(targetPage, 'authorize', 'P06', '#authorization-form input[name="signature"]');
  assert.equal(await form.locator('input[name="signature"]').inputValue(), 'Ben Lewis');
  assert.equal(await form.locator('textarea[name="reason"]').inputValue(), budgetReason);
  assert.equal(await form.locator('input[name="acknowledged"]').isChecked(), true, 'Authorization form inputs survive navigation without submission');
  await targetPage.locator('#fill-example-signature').click();
  assert.equal(await form.locator('input[name="signature"]').inputValue(), 'Elena Torres');
  assert.equal(await form.locator('textarea[name="reason"]').inputValue(), budgetReason);
  assert.equal(await form.locator('#authorize-budget').isEnabled(), true);
  await form.locator('#authorize-budget').click();
  assert.match(await targetPage.locator('#decision-status').innerText(), /Customer authorized.*awaiting WuXi confirmation/i);
  assert.match(await confirmation(targetPage, 'schedule').innerText(), /awaiting|pending|ready/i);
  assert.equal(await targetPage.locator('#management-brief').getAttribute('data-brief-stale'), 'true', 'The new authorization state marks the same shared brief as outdated');
  assert.equal(await targetPage.locator('#demo-next-step').count(), 0, 'Authorization completes the single brief checkpoint; no repeat generation is inserted before the next resource event');
}
async function assertMobileFit(targetPage, selector) {
  assert.equal(await targetPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile page has no horizontal overflow');
  assert.equal(await targetPage.locator(selector).evaluateAll(nodes => nodes.every(node => {
    const rect = node.getBoundingClientRect();
    return rect.width === 0 || (rect.left >= 0 && rect.right <= innerWidth);
  })), true, 'Critical status and action elements remain readable inside the viewport');
}
async function capture(targetPage, name) {
  await targetPage.locator('h1').click();
  await targetPage.evaluate(() => scrollTo(0, 0));
  await targetPage.screenshot({ path: path.join(output, name), fullPage: true, style: '#notice { visibility: hidden !important; }' });
}

let server;
try {
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  const frozenData = await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA));
  assert.equal(await clock(page), initialClock);
  assert.match(await page.locator('#project-status').innerText(), /At risk/);
  assert.match(await page.locator('#milestone-strip').innerText(), /Jan 4[\s\S]*Mar 11[\s\S]*IND/);
  await noAdvance(page);
  for (const id of ['P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08']) {
    await role(page, id);
    assert.equal(await page.locator('[data-select-plan]:enabled').count(), 0, 'Only Emma may select a plan');
  }
  await role(page, 'P01');
  const edited = await selectAndDraft(page);
  await role(page, 'P02');
  assert.ok((await page.locator('[data-created-task="technical"]').textContent()).includes(edited), 'Edited task instructions persist for the assignee');
  await role(page, 'P01');
  await noAdvance(page);
  await startReviews(page);
  await advance(page, stops[0]);
  assert.match(await page.locator('[data-task="assignBen"]').innerText(), /pending/i, 'Reaching the event time does not assign support');
  await noAdvance(page);
  await guide(page, 'assignSupport', 'P01', '#assign-support');
  await page.locator('#assign-support').click();
  await notificationToTask(page, 'assignBen', 'supportAssigned');
  await guide(page, 'acceptSupport', 'P05', '#accept-support');
  assert.equal(await page.locator('#unauthorized-approve').isDisabled(), true);
  assert.match(await page.locator('#decision').innerText(), /cannot approve|no.*approval|no.*sign/i);
  await page.locator('#accept-support').click();
  assert.equal(await page.locator('#unauthorized-approve').isDisabled(), true, 'Accepting preparation never grants financial authority');
  assert.equal(await page.locator('#unauthorized-approve').getAttribute('aria-describedby'), 'ben-approval-reason');
  assert.match(await page.locator('#ben-approval-reason').innerText(), /preparation authority only|cannot approve|no fee approval authority/i);
  assert.equal(await page.locator('#ben-approval-reason').evaluate(node => {
    const reason = node.getBoundingClientRect();
    const button = document.getElementById('unauthorized-approve').getBoundingClientRect();
    return Math.abs(reason.top - button.top) < 80;
  }), true, 'The approval restriction is next to Ben’s disabled action');
  await notificationToTask(page, 'support', 'supportAccepted');
  await capture(page, 'decision-ben.png');
  await role(page, 'P01');
  await advance(page, stops[1]);
  assert.match(await page.locator('[data-task="designateElena"]').innerText(), /pending/i, 'Reaching the designation time does not appoint an approver');
  await role(page, 'P06');
  assert.equal(await page.locator('#authorize-budget:enabled').count(), 0, 'Elena has no authority on this request until designated');
  await role(page, 'P01');
  await guide(page, 'designate', 'P01', '#designate-approver');
  await page.locator('#designate-approver').click();
  await role(page, 'P06');
  assert.equal(await page.locator('#authorize-budget').isDisabled(), true, 'Designation does not bypass technical and QA prerequisites');
  await advance(page, stops[2]);
  assert.ok(!/confirmed|complete/i.test(await confirmation(page, 'technical').getAttribute('data-status')), 'Time advancement alone does not confirm a review');
  await noAdvance(page);
  await completeReviews(page);
  await role(page, 'P01');
  await page.locator('#risk-title a').click();
  assert.match(await page.locator('.risk-owner-next').innerText(), /Elena|budget|authorization/i);
  assert.equal(await page.locator('[data-risk-event="reviewsComplete"]').getAttribute('data-event-status'), 'recorded');
  assert.equal(await page.locator('[data-risk-event="budgetAuthorized"]').getAttribute('data-event-status'), 'planned');
  await page.locator('#risk-assign-tasks').click();
  await page.locator('#decision').waitFor();
  assert.match(new URL(page.url()).hash, /decision/);
  await advance(page, stops[3]);
  assert.ok(!/Customer authorized/i.test(await page.locator('#decision-status').innerText()), 'Authorization needs an explicit signed action');
  await sign(page);
  assert.equal(await clock(page), stops[3]);
  assert.match(await page.locator('#priority-risk .risk-status:not(#project-status)').innerText(), /awaiting WuXi confirmation/i, 'The homepage banner no longer asks for a customer decision after authorization');
  assert.match(await page.locator('#decision-deadline').innerText(), /WuXi|confirmation/i);
  assert.equal(await page.locator('#decision-deadline time').getAttribute('datetime'), '2026-11-16T17:00:00+08:00');
  assert.equal(await page.locator('#advance-event').isEnabled(), true, 'A valid authorization unlocks the next WuXi work event, without confirming resources');
  await capture(page, 'decision-authorized.png');
  for (const [id, task] of [['P07', 'receipt'], ['P08', 'schedule']]) {
    await role(page, id);
    await notificationToTask(page, task, 'authorizationReceived');
    assert.equal(await page.locator('#confirm-resource-response:enabled').count(), 0, 'Authorization alone cannot confirm resources before WuXi review and its response event');
  }
  await role(page, 'P01');
  assert.match(await page.locator('#decision-status').innerText(), /Customer authorized.*awaiting WuXi confirmation/i);
  assert.match(await page.locator('[data-metric="confirmation"] [data-plan="A"]').innerText(), /awaiting|pending|requested/i);
  await page.locator('#toggle-costs').click();
  assert.match(await page.locator('.fee-current-state').innerText(), /No fees committed|No paid commitment|not.*charged|fee status awaits|authorization alone does not incur|awaiting WuXi.*named resource response/i);
  await page.locator('#toggle-costs').click();
  await page.locator('#risk-title a').click();
  assert.match(await page.locator('.risk-request-state').innerText(), /Customer authorized.*awaiting WuXi confirmation/i);
  assert.match(await page.locator('.risk-owner-next').innerText(), /Await Alex and Mei.*window remains unconfirmed/i);
  assert.equal(await page.locator('[data-risk-event="budgetAuthorized"]').getAttribute('data-event-status'), 'recorded');
  assert.equal(await page.locator('[data-risk-event="resourceConfirmed"]').getAttribute('data-event-status'), 'planned');
  assert.equal(await page.locator('#risk-timeline-now time').getAttribute('datetime'), stops[3]);
  assert.ok(!(await page.locator('.risk-hold-line').innerText()).includes('Window held'), 'Customer authorization does not hold a window');
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozenData, 'No operation mutates frozen dates, people, fees or forecasts');
  await capture(page, 'decision-risk-authorized.png');

  // Explicit reset is the sole route back to the early scenario; option B and
  // the optional A fallback use the same authority and commitment boundaries.
  await reset(page);
  await selectAndDraft(page, 'A', true);
  assert.match(await page.locator('#decision').innerText(), /\$90,000/);
  assert.equal(await page.locator('#fallback-authorization').isDisabled(), true, 'Created instructions fix the selected authorization scope');
  await reset(page);
  await selectAndDraft(page, 'B');
  assert.match(await page.locator('#decision').innerText(), /\$40,000/);
  assert.match(await page.locator('[data-metric="confirmation"] [data-plan="B"]').innerText(), /not yet requested|pending|request/i);
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozenData);

  // A fresh 390 px offline session exercises the editor, role controls and
  // signed authorization layout rather than relying on desktop screenshots.
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, offline: true });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(pathToFileURL(standalone).href);
  await selectAndDraft(mobile);
  await assertFooterSpace(mobile);
  await mobile.setViewportSize({ width: 320, height: 640 });
  await assertFooterSpace(mobile);
  await guide(mobile, 'startTechnical', 'P02', '#start-technical');
  await mobile.setViewportSize({ width: 390, height: 844 });
  await assertFooterSpace(mobile);
  await assertMobileFit(mobile, '[data-confirmation-key], #decision-status, #advance-event');
  await capture(mobile, 'decision-mobile.png');
  await startReviews(mobile);
  await advance(mobile, stops[0]);
  await guide(mobile, 'assignSupport', 'P01', '#assign-support');
  await mobile.locator('#assign-support').click();
  await guide(mobile, 'acceptSupport', 'P05', '#accept-support');
  await mobile.locator('#accept-support').click();
  await role(mobile, 'P01');
  await advance(mobile, stops[1]);
  await guide(mobile, 'designate', 'P01', '#designate-approver');
  await mobile.locator('#designate-approver').click();
  await advance(mobile, stops[2]);
  await completeReviews(mobile);
  await advance(mobile, stops[3]);
  await role(mobile, 'P06');
  await assertMobileFit(mobile, '#authorization-form input, #authorization-form textarea, #authorization-form button, [data-confirmation-key]');
  await capture(mobile, 'decision-mobile-signature.png');
  await sign(mobile);
  await assertFooterSpace(mobile);
  await role(mobile, 'P07');
  await openNotifications(mobile);
  await assertMobileFit(mobile, '#notifications-panel, [data-notification-id]');
  await mobile.screenshot({ path: path.join(output, 'decision-mobile-wuxi.png'), style: '#notice { visibility: hidden !important; }' });
  await mobileContext.close();

  assert.deepEqual(errors, [], 'The offline flow has no browser exceptions');
  assert.deepEqual(externalRequests, [], 'The app needs no remote API, font, CDN or other network request');

  // Verify a repository-prefixed route against the exact local artifact only.
  // No request to the published site is made before the user's release review.
  const html = await readFile(path.join(root, 'dist/index.html'));
  server = http.createServer((request, response) => {
    if (request.url === '/risk-decision-portal/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html); }
    else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localContext = await browser.newContext();
  const hosted = await localContext.newPage();
  const hostedErrors = [];
  const failedResponses = [];
  hosted.on('pageerror', error => hostedErrors.push(error.message));
  hosted.on('response', response => { if (response.status() >= 400) failedResponses.push(response.url()); });
  await hosted.goto(`http://127.0.0.1:${server.address().port}/risk-decision-portal/#decision`);
  await hosted.locator('#risk-title').waitFor();
  await hosted.locator('[data-select-plan="A"]').click();
  await hosted.reload();
  await hosted.locator('#risk-title').waitFor();
  assert.deepEqual(hostedErrors, []);
  assert.deepEqual(failedResponses, []);
  await localContext.close();
  console.log('Decision browser checks passed: offline A flow, role permissions, editable simulated drafts, explicit creation, Ben support-only authority, Elena designation/review/signature gates, one generate–preview–attach–authorize brief checkpoint, private draft isolation and read-only frozen Elena view, four monotonic clock stops, task/notification/risk synchronization, authorization stop before WuXi confirmation, fallback and B reset boundaries, frozen data, mobile layouts and local repository subpath.');
  console.log('Screenshots: output/decision-ben.png, decision-authorized.png, decision-risk-authorized.png, decision-mobile.png, decision-mobile-signature.png and decision-mobile-wuxi.png');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

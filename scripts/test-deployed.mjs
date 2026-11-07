import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Optional release QA only. Neither Playwright nor this script is shipped in dist/.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.env.DEPLOY_URL, 'Set DEPLOY_URL to the published GitHub Pages repository URL.');
const deployedUrl = new URL(process.env.DEPLOY_URL);
assert.ok(['http:', 'https:'].includes(deployedUrl.protocol), 'DEPLOY_URL must be an HTTP(S) URL.');
assert.ok(deployedUrl.pathname !== '/' && deployedUrl.pathname.endsWith('/'), 'DEPLOY_URL must include the repository subpath and trailing slash.');
assert.equal(deployedUrl.search, '', 'Use the canonical deployment URL without a query.');
assert.equal(deployedUrl.hash, '', 'Use the canonical deployment URL without a hash.');

const localHtml = await readFile(path.join(root, 'dist/index.html'));
const response = await fetch(deployedUrl, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30_000) });
assert.equal(response.status, 200, 'Published repository URL returns HTTP 200.');
assert.equal(new URL(response.url).pathname, deployedUrl.pathname, 'Published page stays under the repository subpath.');
assert.match(response.headers.get('content-type') || '', /text\/html/i);
const deployedHtml = Buffer.from(await response.arrayBuffer());
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const localSha256 = sha256(localHtml);
const deployedSha256 = sha256(deployedHtml);
assert.equal(deployedSha256, localSha256, 'Published HTML must exactly match the local built artifact. Rebuild/deploy rather than accepting a stale version.');

const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const failures = [];
const requests = [];
const comparisons = [];
const contexts = [];

function observe(page, label, online) {
  page.on('pageerror', error => failures.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`${label}: console: ${message.text()}`); });
  page.on('requestfailed', request => failures.push(`${label}: ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', result => { if (result.status() >= 400) failures.push(`${label}: HTTP ${result.status()} ${result.url()}`); });
  page.on('request', request => {
    if (!/^https?:/.test(request.url())) return;
    requests.push({ label, url: request.url() });
    const url = new URL(request.url());
    if (!online || url.origin !== deployedUrl.origin || !url.pathname.startsWith(deployedUrl.pathname)) {
      failures.push(`${label}: resource outside the deployment subpath: ${request.url()}`);
    }
  });
}

async function snapshot(page) {
  return page.evaluate(() => ({
    page: document.querySelector('main')?.dataset.page,
    heading: document.querySelector('h1')?.innerText,
    role: document.querySelector('#viewer')?.value,
    main: document.querySelector('main')?.innerText,
    times: [...document.querySelectorAll('main time')].map(node => [node.dateTime, node.innerText]),
    tasks: [...document.querySelectorAll('[data-task]')].map(node => [node.dataset.task, node.dataset.owner, node.innerText]),
    notificationPanel: document.querySelector('#notifications-panel')?.innerText,
    notifications: [...document.querySelectorAll('[data-notification-id]')].map(node => ({
      id: node.dataset.notificationId,
      task: node.dataset.taskLink,
      href: node.getAttribute('href'),
      read: node.dataset.notificationRead,
      status: node.querySelector('[data-notification-status]')?.dataset.notificationStatus
    }))
  }));
}

async function compare(local, online, label) {
  assert.deepEqual(await snapshot(online), await snapshot(local), `${label}: hosted content and state match the local artifact.`);
  comparisons.push(label);
}

async function applyToBoth(pages, operation) {
  await Promise.all(pages.map(operation));
}

async function switchToChinese(page) {
  await page.locator('#language-menu summary').click();
  await page.locator('[data-language="zh"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
}

async function visibleWithinWidth(page, selector, message) {
  const elements = page.locator(selector);
  assert.ok(await elements.count(), `${message}: elements exist.`);
  assert.ok(await elements.evaluateAll(nodes => nodes.every(node => {
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1;
  })), message);
}

try {
  const localContext = await browser.newContext({ viewport: { width: 1440, height: 1050 }, offline: true });
  const onlineContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  contexts.push(localContext, onlineContext);
  const local = await localContext.newPage();
  const online = await onlineContext.newPage();
  observe(local, 'local desktop', false);
  observe(online, 'published desktop', true);
  await local.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
  const navigation = await online.goto(deployedUrl.href);
  assert.equal(navigation.status(), 200);
  const pages = [local, online];
  await applyToBoth(pages, page => page.locator('#risk-title').waitFor());
  assert.equal(await online.locator('h1').innerText(), 'Project overview');
  await compare(local, online, 'Initial overview');
  await online.screenshot({ path: path.join(output, 'deployed-desktop.png'), fullPage: true });

  await applyToBoth(pages, page => page.locator('#toggle-costs').click());
  assert.ok(await online.locator('#overview-cost-detail').isVisible());
  await compare(local, online, 'Expanded fees and commitment conditions');
  await applyToBoth(pages, page => page.locator('#toggle-costs').click());
  await applyToBoth(pages, page => page.locator('#notifications-toggle').click());
  assert.ok(await online.locator('#notifications-panel').isVisible());
  await compare(local, online, 'Role notifications');
  await applyToBoth(pages, page => page.locator('[data-task-link="assignBen"]').click());
  assert.equal(new URL(online.url()).hash, '#task-assignBen');
  assert.ok(await online.locator('#task-assignBen').evaluate(node => document.activeElement === node && node.classList.contains('task-highlight')));
  await compare(local, online, 'Notification task navigation and read state');

  await applyToBoth(pages, page => page.locator('#risk-title a').click());
  await applyToBoth(pages, page => page.locator('.risk-detail-page').waitFor());
  assert.equal(new URL(online.url()).pathname, deployedUrl.pathname);
  for (const role of ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08']) {
    await applyToBoth(pages, page => page.locator('#viewer').selectOption(role));
    assert.equal(await online.locator('#risk-role-focus').getAttribute('data-risk-role'), role);
    await compare(local, online, `Risk details for ${role}`);
  }
  await applyToBoth(pages, page => page.locator('#viewer').selectOption('P01'));
  await online.screenshot({ path: path.join(output, 'deployed-risk.png'), fullPage: true });
  await applyToBoth(pages, page => page.reload());
  await applyToBoth(pages, page => page.locator('.risk-detail-page').waitFor());
  assert.equal(new URL(online.url()).hash, '#risk');
  await compare(local, online, 'Risk hash route after refresh');
  await applyToBoth(pages, page => page.locator('#risk-compare-options').click());
  await applyToBoth(pages, page => page.locator('#comparison').waitFor());
  assert.equal(new URL(online.url()).hash, '#comparison');
  await compare(local, online, 'Return to overview comparison');
  await applyToBoth(pages, page => page.reload());
  await applyToBoth(pages, page => page.locator('#comparison').waitFor());
  await compare(local, online, 'Overview hash route after refresh');

  await applyToBoth(pages, switchToChinese);
  await compare(local, online, 'Chinese overview and guided next action');
  await applyToBoth(pages, page => page.locator('#toggle-costs').click());
  await compare(local, online, 'Chinese fees and commitment conditions');
  await applyToBoth(pages, page => page.locator('#notifications-toggle').click());
  await compare(local, online, 'Chinese role notifications');
  await applyToBoth(pages, page => page.locator('#notifications-toggle').click());
  await applyToBoth(pages, page => page.locator('#risk-title a').click());
  for (const role of ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08']) {
    await applyToBoth(pages, page => page.locator('#viewer').selectOption(role));
    await compare(local, online, `Chinese risk details and dates for ${role}`);
  }
  await online.screenshot({ path: path.join(output, 'deployed-chinese-risk.png'), fullPage: true });

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  contexts.push(mobileContext);
  const mobile = await mobileContext.newPage();
  observe(mobile, 'published mobile', true);
  assert.equal((await mobile.goto(deployedUrl.href)).status(), 200);
  await mobile.locator('#risk-title').waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await visibleWithinWidth(mobile, '[data-gap], [data-task] .action-due, [data-task] [data-task-status]', 'Mobile comparison, action times and statuses fit');
  await mobile.locator('#notifications-toggle').click();
  await visibleWithinWidth(mobile, '#notifications-panel, #notifications-panel [data-task-link]', 'Mobile notifications fit');
  await mobile.locator('[data-task-link="designateElena"]').click();
  assert.ok(await mobile.locator('#task-designateElena').evaluate(node => node.classList.contains('task-highlight')));
  await mobile.locator('#risk-title a').click();
  await mobile.locator('.risk-detail-page').waitFor();
  await visibleWithinWidth(mobile, '#risk-timeline [data-field="status"], #risk-evidence [data-field="report"], #risk-timeline-now, [data-shanghai-time], #risk-next-steps a', 'Mobile risk evidence and timeline fit');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.screenshot({ path: path.join(output, 'deployed-mobile-risk.png'), fullPage: true });
  await mobile.reload();
  await mobile.locator('.risk-detail-page').waitFor();
  assert.equal(new URL(mobile.url()).pathname, deployedUrl.pathname);
  await switchToChinese(mobile);
  await visibleWithinWidth(mobile, '#language-menu, #viewer, #risk-next-steps a', 'Chinese mobile controls fit');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.locator('#risk-compare-options').click();
  await mobile.locator('#comparison').waitFor();
  await visibleWithinWidth(mobile, '[data-gap], [data-task] .action-due, [data-task] [data-task-status]', 'Chinese mobile comparison and tasks fit');
  await mobile.screenshot({ path: path.join(output, 'deployed-chinese-mobile.png'), fullPage: true });
  assert.deepEqual(failures, [], 'No runtime, console, failed resource or out-of-subpath requests.');

  const report = {
    url: deployedUrl.href, checkedAt: new Date().toISOString(),
    bytes: localHtml.length, localSha256, deployedSha256,
    comparisons, requests, failures,
    screenshots: ['deployed-desktop.png', 'deployed-risk.png', 'deployed-mobile-risk.png', 'deployed-chinese-risk.png', 'deployed-chinese-mobile.png']
  };
  await writeFile(path.join(output, 'deployment-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Published HTML matches local dist/index.html exactly (${localHtml.length} bytes, SHA-256 ${localSha256}).`);
  console.log(`Passed ${comparisons.length} local-versus-online content checks in English and Chinese, all eight risk role views, fee expansion, notification task navigation, hash-route refresh, mobile layout and resource-path checks.`);
  console.log('Release evidence: output/deployment-verification.json and output/deployed-*.png');
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, mkdtemp, copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require('playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const output = path.join(root, 'output');
await mkdir(output, { recursive: true });
const isolated = await mkdtemp(path.join(os.tmpdir(), 'wuxi-i18n-offline-'));
const standalone = path.join(isolated, 'InterviewDemo.html');
await copyFile(path.join(root, 'dist/index.html'), standalone);
const errors = [], network = [], leaks = [], layouts = [], steps = [];
const allowed = new Set('DaVinci Harbor Biotherapeutics Emma Chen Daniel Reed Nina Patel Olivia Grant Ben Lewis Elena Torres Alex Lin Mei Zhang SEC-HPLC HMW GMP DS IND CMC QA AI DNA A280 CE-SDS SEC EXP Q A B R D M v1 v2 v3 HBT101 HBT-101 P01 P02 P03 P04 P05 P06 P07 P08 SEC-001 EXP-001 Q-A Q-B'.split(' '));

async function pageFor(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, offline: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.goto(pathToFileURL(standalone).href);
  await page.locator('#risk-title').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Each reload starts in English');
  await language(page, 'zh');
  return { page, context };
}
const clock = page => page.locator('.demo-clock time').getAttribute('datetime');
async function snapshot(page) {
  return page.evaluate(() => ({
    clock: document.querySelector('.demo-clock time')?.dateTime,
    data: JSON.stringify(globalThis.DEMO_DATA),
    viewer: document.querySelector('#viewer')?.value,
    request: document.querySelector('#decision')?.dataset,
    resources: document.querySelector('#wuxi')?.dataset,
    confirmations: [...document.querySelectorAll('[data-confirmation-key]')].map(node => ({ ...node.dataset })),
    authorization: [...document.querySelectorAll('[data-authorization-basis]')].map(node => ({ ...node.dataset })),
    attachments: [...document.querySelectorAll('[data-brief-history-version]')].map(node => ({ ...node.dataset }))
  }));
}
async function language(page, lang) {
  const before = await snapshot(page);
  await page.locator('#language-menu summary').click();
  await page.locator(`[data-language="${lang}"]`).click();
  assert.equal(await page.locator('html').getAttribute('lang'), lang === 'zh' ? 'zh-CN' : 'en');
  assert.deepEqual(await snapshot(page), before, 'Changing language preserves business state, data, record identity and clock');
}
async function audit(page, label, { fields = true } = {}) {
  const content = await page.evaluate(includeFields => {
    const visible = node => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const strings = [document.body.innerText];
    for (const node of document.querySelectorAll('button, a, input, select, textarea, summary, [aria-label], [title]')) {
      if (!visible(node)) continue;
      for (const name of ['aria-label', 'title', 'placeholder']) if (node.getAttribute(name)) strings.push(node.getAttribute(name));
      if (includeFields && node.matches('textarea, input:not([type="date"]):not([type="checkbox"]):not([type="hidden"]):not([type="radio"])')) strings.push(node.value);
    }
    return strings.join('\n');
  }, fields);
  const tokens = [...new Set(content.match(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/g) || [])].filter(token => !allowed.has(token) && !/^v\d+$/.test(token));
  if (tokens.length) leaks.push({ label, tokens, lines: content.split('\n').filter(line => tokens.some(token => line.includes(token))).slice(0, 30) });
  const layout = await page.evaluate(() => {
    const visible = node => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const controls = [...document.querySelectorAll('button, input, select, textarea, .role-action-button')].filter(visible);
    const overflow = controls.filter(node => {
      const r = node.getBoundingClientRect();
      return r.left < -1 || r.right > innerWidth + 1 || (!node.classList.contains('icon-button') && node.scrollWidth > node.clientWidth + 2);
    }).map(node => ({ id: node.id, text: node.textContent.trim().slice(0, 100), width: node.clientWidth, contentWidth: node.scrollWidth }));
    const bar = document.querySelector('.demo-timeline');
    const reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--demo-bar-space'));
    return { pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, overflow, footerReserved: !bar || reserve >= bar.getBoundingClientRect().height };
  });
  if (layout.pageOverflow || layout.overflow.length || !layout.footerReserved) layouts.push({ label, ...layout });
  assert.ok(!/undefined|Invalid Date|NaN|To be agreed/.test(content), `No broken placeholders in ${label}`);
}
async function capture(page, name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, name), fullPage: true, style: '#notice { visibility: hidden !important; }' });
}
async function chapter(page, id) {
  await page.locator('#chapter-select').selectOption(id);
  await page.locator('#chapter-notice').waitFor();
  assert.match(await page.locator('#chapter-notice').innerText(), /重置|新场景/);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN', 'Chapter reset preserves chosen interface language');
  await audit(page, `${id}:entry`);
}
async function role(page, id) {
  const previous = await clock(page);
  await page.locator('#viewer').selectOption(id);
  assert.equal(await clock(page), previous);
}
async function navigate(page, hash) {
  await page.evaluate(value => { location.hash = value; }, hash);
  await page.waitForTimeout(40);
}
async function notifications(page, label) {
  await page.locator('#notifications-toggle').click();
  await page.locator('#notifications-panel').waitFor();
  await audit(page, `${label}:notifications`);
  await page.keyboard.press('Escape');
}
async function expandRecords(page, label) {
  await page.locator('main details:not(.info-tip)').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
  await audit(page, `${label}:expanded-records`);
}
async function errorsAndDialogs(page) {
  await page.locator('#edit-requirement').click();
  await audit(page, 'requirement-dialog');
  await page.locator('#requirement-date').fill('');
  await page.locator('#requirement-form [type="submit"]').click();
  const validation = await page.locator('#requirement-date').evaluate(node => node.validationMessage);
  assert.match(validation, /[\u4e00-\u9fff]/, 'Browser field validation is localized');
  await audit(page, 'requirement-validation');
  await page.locator('#dialog [data-close]').first().click();
  await page.locator('#reset-demo').click();
  await audit(page, 'reset-dialog');
  await page.locator('#dialog [data-close]').first().click();
  for (const summary of await page.locator('.info-tip > summary').all()) {
    await summary.click();
    await audit(page, 'overview-info');
    await page.keyboard.press('Escape');
  }
  await page.locator('#toggle-costs').click();
  await audit(page, 'cost-breakdown');
  await page.locator('#forecast-basis > summary').click();
  await audit(page, 'forecast-basis');
  await page.locator('#risk-title a').click();
  await page.locator('#risk-evidence').waitFor();
  await page.locator('[data-report="SEC-001"], [data-open-report]').first().click();
  await audit(page, 'evidence-report');
  await page.locator('#dialog [data-close]').first().click();
  await page.locator('.risk-back').click();
}
const actionSelectors = {
  editRisk: '#review-publication-draft', publishRisk: '#publish-risk', select: '[data-select-plan="A"]', draft: '#draft-task-briefs', confirm: '#confirm-task-briefs',
  startTechnical: '#start-technical', startQuality: '#start-quality', assignSupport: '#assign-support', acceptSupport: '#accept-support', designate: '#designate-approver',
  completeTechnical: '#review-technical-form [type="submit"]', completeQuality: '#review-quality-form [type="submit"]',
  managementBrief: '#generate-management-brief', updateBrief: '#regenerate-management-brief', previewBrief: '#preview-management-brief', attachBrief: '#attach-management-brief',
  startResources: '#start-resource-review', replyReceipt: '#return-resource-receipt', reschedule: '#request-reschedule', rescheduleQuote: '#record-reschedule-quote', returnQuote: '#return-reschedule-quote',
  rescheduleDecision: '#launch-reschedule-decision', confirmReschedule: '#confirm-reschedule'
};
async function oneStep(page, scenario, outcome = 'held') {
  if (await page.locator('#demo-next-step').count()) {
    const key = await page.locator('#demo-next-step').getAttribute('data-guide-key');
    const before = await clock(page);
    await page.locator('#demo-next-step').click();
    assert.equal(await clock(page), before, 'Guidance does not advance time');
    await audit(page, `${scenario}:${key}:focused`);
    if (key === 'authorize' || key === 'rescheduleAuthorization') {
      const reschedule = key === 'rescheduleAuthorization';
      const form = page.locator(reschedule ? '#reschedule-authorization-form' : '#authorization-form');
      await page.locator(reschedule ? '#fill-reschedule-signature' : '#fill-example-signature').click();
      await form.locator('input[name="acknowledged"]').check();
      await page.locator(reschedule ? '#authorize-reschedule' : '#authorize-budget').click();
    } else if (key === 'scheduling') {
      await page.locator('#resource-response-form select[name="outcome"]').selectOption(outcome);
      await audit(page, `${scenario}:scheduling-${outcome}`);
      await page.locator('#confirm-resource-response').click();
    } else {
      assert.ok(actionSelectors[key], `Known guided action ${key}`);
      if (key === 'completeTechnical' || key === 'completeQuality') await page.locator('#review-' + (key === 'completeTechnical' ? 'technical' : 'quality') + '-form select[name="outcome"]').selectOption('approved');
      await page.locator(actionSelectors[key]).click();
      if (key === 'draft') await page.locator('#confirm-task-briefs').waitFor();
      if (key === 'managementBrief' || key === 'updateBrief') {
        if (await page.locator('#confirm-regenerate-brief').isVisible()) await page.locator('#confirm-regenerate-brief').click();
        await page.locator('#management-brief-editor').waitFor();
        assert.match(await page.locator('#management-brief-editor').inputValue(), /[\u4e00-\u9fff]/);
      }
      if (key === 'previewBrief') {
        await capture(page, scenario.includes('mobile') ? 'zh-brief-mobile.png' : 'zh-brief.png');
        await page.locator('#management-brief').screenshot({ path: path.join(output, scenario.includes('mobile') ? 'zh-brief-detail-mobile.png' : 'zh-brief-detail.png'), style: '.demo-timeline,.topbar,#notice { visibility: hidden !important; }' });
      }
    }
    steps.push(`${scenario}:${key}`);
    await audit(page, `${scenario}:${key}:complete`);
    await notifications(page, `${scenario}:${key}`);
    return key;
  }
  const before = await clock(page);
  assert.equal(await page.locator('#advance-event').isEnabled(), true, `${scenario} can advance when no user action is pending`);
  await page.locator('#advance-event').click();
  assert.ok(Date.parse(await clock(page)) > Date.parse(before));
  steps.push(`${scenario}:advance`);
  await audit(page, `${scenario}:advance`);
  return 'advance';
}
async function walk(page, scenario, done, outcome = 'held') {
  for (let count = 0; count < 60; count++) {
    if (await done()) return;
    await oneStep(page, scenario, outcome);
  }
  throw new Error(`Guided path ${scenario} did not reach endpoint`);
}
async function endpointBrief(page, label) {
  await role(page, 'P01');
  await navigate(page, '#decision');
  await page.locator('#generate-management-brief').click();
  if (await page.locator('#confirm-regenerate-brief').isVisible()) await page.locator('#confirm-regenerate-brief').click();
  await page.locator('#management-brief-editor').waitFor();
  await page.locator('#preview-management-brief').click();
  await audit(page, `${label}:brief`);
  assert.equal(await page.locator('#management-brief-preview table').count(), 0, 'Terminal brief uses current outcome rather than historical A/B table');
}

try {
  const { page, context } = await pageFor();
  const frozen = await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA));
  await audit(page, 'initial-overview');
  await capture(page, 'zh-overview.png');
  await errorsAndDialogs(page);
  for (const id of ['P01','P02','P03','P04','P05','P06','P07','P08']) {
    await role(page, id);
    await navigate(page, '#risk');
    await audit(page, `risk:${id}`);
    await notifications(page, `risk:${id}`);
    if (id === 'P01') await capture(page, 'zh-risk.png');
    for (const summary of await page.locator('.info-tip > summary').all()) {
      await summary.click(); await audit(page, `risk:${id}:info`); await page.keyboard.press('Escape');
    }
  }
  await chapter(page, 'prepublication');
  await walk(page, 'prepublication', async () => (await page.locator('#risk-publication-form').count()) === 0);
  await role(page, 'P01'); await navigate(page, '#main');
  await audit(page, 'published-client');
  await chapter(page, 'selection');
  await walk(page, 'selection', async () => (await page.locator('[data-authorization-basis="main"]').count()) === 1);
  assert.equal(await page.locator('[data-authorization-basis="main"]').getAttribute('data-authorized-brief-version'), '1');
  const briefBefore = await page.locator('#management-brief-preview').innerText();
  const basisBefore = await page.locator('[data-authorization-basis="main"]').evaluate(node => ({ ...node.dataset }));
  await language(page, 'en');
  assert.match(await page.locator('#management-brief-preview').innerText(), /\$80,000[\s\S]*2\.8%[\s\S]*Nov 12, 2026/, 'Frozen generated translations preserve the same financial and evidence facts');
  await language(page, 'zh');
  assert.equal(await page.locator('#management-brief-preview').innerText(), briefBefore, 'Returning to Chinese shows the same captured version without re-generation');
  assert.deepEqual(await page.locator('[data-authorization-basis="main"]').evaluate(node => ({ ...node.dataset })), basisBefore);
  await audit(page, 'authorized-records');
  await expandRecords(page, 'authorized');
  for (const id of ['coverage','authorization']) { await chapter(page, id); await notifications(page, `${id}:entry`); }
  await chapter(page, 'hold');
  await walk(page, 'hold', async () => await page.locator('#wuxi').getAttribute('data-resource-status') === 'held');
  await role(page, 'P01'); await audit(page, 'held-customer'); await capture(page, 'zh-held.png');
  await expandRecords(page, 'held');
  await endpointBrief(page, 'held');
  await chapter(page, 'unavailable');
  await walk(page, 'unavailable', async () => await page.locator('#wuxi').getAttribute('data-resource-status') === 'confirmed', 'unavailable');
  await role(page, 'P01'); await audit(page, 'rescheduled-customer'); await capture(page, 'zh-rescheduled.png');
  await expandRecords(page, 'rescheduled');
  await endpointBrief(page, 'rescheduled');
  assert.equal(await page.evaluate(() => JSON.stringify(globalThis.DEMO_DATA)), frozen);
  await page.reload(); await page.locator('#risk-title').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Reload retains the default English interface');
  await context.close();

  const { page: mobile, context: mobileContext } = await pageFor(true);
  await audit(mobile, 'mobile-overview'); await capture(mobile, 'zh-overview-mobile.png');
  await chapter(mobile, 'selection');
  await walk(mobile, 'mobile-selection', async () => (await mobile.locator('[data-authorization-basis="main"]').count()) === 1);
  await chapter(mobile, 'unavailable');
  await walk(mobile, 'mobile-unavailable', async () => await mobile.locator('#wuxi').getAttribute('data-resource-status') === 'confirmed', 'unavailable');
  await role(mobile, 'P01'); await capture(mobile, 'zh-rescheduled-mobile.png');
  await mobile.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const footerSafe = await mobile.locator('footer').evaluate(node => node.getBoundingClientRect().bottom <= document.querySelector('.demo-timeline').getBoundingClientRect().top);
  assert.ok(footerSafe, 'Bottom content remains above the fixed guide bar');
  await mobileContext.close();
  await writeFile(path.join(output, 'zh-qa-report.json'), JSON.stringify({ steps, leaks, layouts, errors, network }, null, 2));
  assert.deepEqual(errors, [], 'No JavaScript errors');
  assert.deepEqual(network, [], 'Every Chinese flow works from the isolated offline file');
  assert.deepEqual(leaks, [], 'No untranslated interface text; report contains leaked tokens and context');
  assert.deepEqual(layouts, [], 'Chinese controls fit and fixed guidance reserves footer space');
  console.log(`Chinese browser checks passed: ${steps.length} guided actions/advances; four chapters, eight risk roles, notification/popover/dialog/error surfaces, generated task briefs and all management-brief states, immutable language switches, offline and 390px mobile.`);
} finally {
  await writeFile(path.join(output, 'zh-qa-report.json'), JSON.stringify({ steps, leaks, layouts, errors, network }, null, 2));
  await browser.close();
  await rm(isolated, { recursive: true, force: true });
}

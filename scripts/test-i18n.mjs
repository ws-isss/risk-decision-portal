import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { Intl, Date };
const locales = ['en', 'risk-en', 'decision-en', 'wuxi-en', 'portal-en', 'brief-en', 'zh', 'risk-zh', 'decision-zh', 'wuxi-zh', 'portal-zh', 'brief-zh', 'tour-en', 'tour-zh'];
for (const file of ['src/data.js', ...locales.map(name => `src/locales/${name}.js`), 'src/core.js', 'src/workflow.js', 'src/i18n.js', 'src/wuxi-view.js']) vm.runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const { DEMO_MESSAGES: messages, DEMO_CORE: core, DEMO_I18N: i18n, DEMO_DATA: data } = context;
const flatten = (value, path = '') => Object.fromEntries(Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? Object.entries(flatten(item, `${path}${key}.`)) : [[`${path}${key}`, item]]));
const en = flatten(messages.en), zh = flatten(messages.zh);
assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort(), 'Both languages cover the same UI, errors, guide and brief keys');
for (const key of Object.keys(en)) {
  assert.equal(typeof zh[key], typeof en[key], key);
  if (typeof en[key] === 'string') {
    assert.ok(zh[key].trim(), `${key}: no empty translation`);
    assert.deepEqual((zh[key].match(/\{\w+\}/g) || []).sort(), (en[key].match(/\{\w+\}/g) || []).sort(), `${key}: preserve shared data placeholders`);
  }
}
const frozen = JSON.stringify(data);
const z = i18n.coreFor(messages.zh), e = i18n.coreFor(messages.en);
assert.equal(z.formatInstant('2026-11-13T17:00:00+08:00', 'Asia/Shanghai'), '2026年11月13日（周五）17:00');
assert.equal(z.formatInstant('2026-11-13T17:00:00+08:00', 'America/New_York'), '2026年11月13日（周五）04:00');
assert.equal(z.formatInstant(data.plans.A.window.at, 'Asia/Shanghai', { hour: undefined, minute: undefined }), '2027年1月4日');
assert.equal(z.formatInstant(data.initialClock, 'America/New_York', { month: undefined, day: undefined }), '09:00');
assert.equal(z.formatLocalDate('2027-03-19'), '2027年3月19日');
assert.equal(z.formatInstant('2027-03-19T17:00:00-04:00', 'Asia/Shanghai'), '2027年3月20日（周六）05:00');
assert.equal(z.formatInstant(data.initialClock, data.baseline.timezone, { locale: 'en-US' }), e.formatInstant(data.initialClock, data.baseline.timezone), 'Captured alternate-language briefs can explicitly format English');

const s = core.createSession(data);
const publication = { certainty: 'underAssessment', nextUpdateEvent: 'reviewsComplete' };
const drafts = i18n.taskBriefs({ data, text: messages.en, plan: 'A', fallbackSelected: false, publication });
const fixtures = { drafts, reviewReasons: { technical: messages.en.decision.examples.technical, quality: messages.en.decision.examples.quality }, authorizationReason: messages.en.decision.examples.authorization.replace('{plan}', 'A').replace('{amount}', '$80,000') };
s.enterChapter('hold', fixtures);
const state = s.getState(), stateBefore = JSON.stringify(state);
const input = { data, state, text: messages.zh };
const translatedDrafts = i18n.taskBriefs({ ...input, plan: 'A', fallbackSelected: false, publication });
for (const key of ['technical', 'quality', 'budget']) assert.equal(i18n.recordText(drafts[key], input), translatedDrafts[key]);
assert.equal(i18n.recordText(fixtures.reviewReasons.technical, input), messages.zh.decision.examples.technical);
assert.ok(i18n.recordText(fixtures.authorizationReason, input).includes('授权'));
assert.equal(i18n.recordText('Emma edited this text herself.', input), 'Emma edited this text herself.', 'User-authored text is retained, not silently translated');
for (const outcome of ['held', 'unavailable']) {
  const original = context.DEMO_WUXI_VIEW.defaultReason({ data, core: e, text: messages.en, outcome });
  const translated = context.DEMO_WUXI_VIEW.defaultReason({ data, core: z, text: messages.zh, outcome });
  assert.equal(i18n.recordText(original, input), translated);
}
assert.equal(JSON.stringify(state), stateBefore, 'Localizing display text does not rewrite signatures or event records');
assert.equal(JSON.stringify(data), frozen, 'Both languages share one frozen dataset');
console.log(`i18n checks passed: ${Object.keys(en).length} matching locale keys, unchanged placeholders, Chinese dates across time zones/DST, preserved user text and immutable business records.`);

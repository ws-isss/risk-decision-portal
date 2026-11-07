/* Independent checks for the frozen case. This file is never shipped to the browser. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');
const sandbox = {};
vm.runInNewContext(read('src/data.js'), sandbox, { filename: 'src/data.js', timeout: 1000 });
const data = JSON.parse(JSON.stringify(sandbox.DEMO_DATA));
const failures = [];
let checks = 0;
function check(name, fn) {
  try { fn(); checks += 1; console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
const same = (actual, expected, label) => assert.deepEqual(actual, expected, label);
const at = (key) => data.events[key].at;
const time = (value) => Date.parse(value);
const stage = (plan, id) => data.plans[plan].stages.find((item) => item.id === id);
const DAY = 24 * 60 * 60 * 1000;

function localParts(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, hour: Number(value.hour), minute: Number(value.minute) };
}

// Count hours inside already specified intervals; do not generate or repair dates.
function officeHours(start, end, calendarId) {
  const calendar = data.calendars[calendarId];
  const first = localParts(start, calendar.timezone);
  const last = localParts(end, calendar.timezone);
  let hours = 0;
  for (let date = Date.parse(first.date); date <= Date.parse(last.date); date += DAY) {
    const day = new Date(date).toISOString().slice(0, 10);
    if (!calendar.weekdays.includes(new Date(date).getUTCDay()) || calendar.holidays.includes(day)) continue;
    const from = day === first.date ? Math.max(calendar.startHour, first.hour + first.minute / 60) : calendar.startHour;
    const to = day === last.date ? Math.min(calendar.endHour, last.hour + last.minute / 60) : calendar.endHour;
    hours += Math.max(0, to - from);
  }
  return hours;
}

check('40 frozen PRD rows and source references', () => {
  const rows = read('PRD.md').split('\n').filter((line) => /^\| [DP]\d{2} \|/.test(line));
  same(rows.length, 40);
  // Authorized display-name change only; the approved numbers and wording stay frozen.
  const normalized = rows.join('\n').replaceAll('加急费（Expedite fee）', '优先资源费');
  let checksum = 2166136261;
  for (const character of normalized) checksum = Math.imul(checksum ^ character.codePointAt(0), 16777619) >>> 0;
  same(checksum.toString(16).padStart(8, '0'), '769baeb0', 'Frozen PRD table changed; do not auto-update this baseline.');
  const ids = [...Array.from({ length: 32 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 8 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)];
  same(data.sourceRefs, ids);
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    if (value.ref) assert.ok(ids.includes(value.ref), `Unknown source ${value.ref}`);
    if (value.refs) value.refs.forEach((ref) => assert.ok(ids.includes(ref), `Unknown source ${ref}`));
    Object.values(value).forEach(inspect);
  }
  inspect(data);
  same(data.schemaVersion, 1);
  assert.ok(Object.isFrozen(sandbox.DEMO_DATA) && Object.isFrozen(sandbox.DEMO_DATA.plans.A.forecast));
});

check('project, evidence, people and authority limits', () => {
  same([data.project.id, data.project.customer], ['HBT-101', 'Harbor Biotherapeutics']);
  same([data.risk.hmwPct, data.risk.targetPct, data.risk.notGmpReleaseFailure], [2.8, 2, true]);
  same(data.risk.reportRefs, ['SEC-001', 'EXP-001', 'Q-A', 'Q-B']);
  Object.entries(data.reports).forEach(([id, report]) => same([report.id, report.version, report.synthetic], [id, 1, true]));
  const names = ['Emma Chen', 'Daniel Reed', 'Nina Patel', 'Olivia Grant', 'Ben Lewis', 'Elena Torres', 'Alex Lin', 'Mei Zhang'];
  names.forEach((name, index) => {
    const person = data.people[`P0${index + 1}`];
    same(person.name, name);
    same(person.budgetLimit, [3, 5].includes(index) ? 100000 : 0);
    same(person.timezone, index < 6 ? 'America/New_York' : 'Asia/Shanghai');
  });
  same(data.people.P04.statusKey, 'onLeave');
  same(data.people.P05.statusKey, 'supportOnly');
  same(data.people.P05.roleKey, 'budgetSupport');
  same(data.people.P06.roleKey, 'budget');
});

check('approved development workstreams remain distinct from project milestones', () => {
  same(data.project.researchStatusKey, 'completed');
  same(data.project.developmentWorkstreams, [
    { id: 'cellLineBank', statusKey: 'completed' },
    { id: 'upstream', statusKey: 'completed' },
    { id: 'downstream', statusKey: 'atRisk' },
    { id: 'analytical', statusKey: 'inProgress' },
    { id: 'formulation', statusKey: 'inProgress' },
  ]);
  same(new Set(data.project.developmentWorkstreams.map((item) => item.id)).size, data.project.developmentWorkstreams.length);
  assert.ok(time(at('backupAssigned')) > time(data.initialClock), 'Initial support handoff must remain pending.');
  assert.ok(time(at('alternateAssigned')) > time(at('backupAssigned')), 'Approval handoff follows support assignment.');
  assert.ok(time(at('backupAssigned')) < time(at('latestAuthorization')), 'Current coordination is due before final authorization.');
});

check('risk evidence and timeline distinguish records from future conditions', () => {
  same(data.risk.evidence, { ref: 'D04', reportRef: 'SEC-001', sourceKey: 'syntheticAnalyticalReport', publisherId: 'P07', availableAtEvent: 'materialReady' });
  same(data.reports[data.risk.evidence.reportRef].version, 1);
  same(data.reports[data.risk.evidence.reportRef].synthetic, true);
  same([data.risk.nextUpdateOwnerId, data.risk.nextUpdateEvent], ['P07', 'reviewsComplete']);
  same(data.people[data.risk.nextUpdateOwnerId].roleKey, 'wuxiPM');
  const timeline = data.risk.timeline;
  same(new Set(timeline.map((item) => item.id)).size, timeline.length);
  same(timeline.filter((item) => item.statusKey === 'recorded').map((item) => item.eventRef), ['riskDiscovered', 'materialReady', 'customerPacketAvailable', 'budgetOwnerNotified']);
  same(timeline.filter((item) => item.statusKey === 'planned').map((item) => item.eventRef), ['backupAssigned', 'alternateAssigned', 'reviewsComplete', 'budgetAuthorized', 'resourceConfirmed']);
  same(timeline.filter((item) => item.statusKey === 'deadline').map((item) => item.eventRef), ['latestReviewStart', 'latestAuthorization', 'resourceConfirmationDeadline']);
  same(timeline.filter((item) => item.statusKey === 'conditionalForecast').map((item) => item.stageId), ['finalAnalysis', 'customerResultReview', 'windowUseConfirmation']);
  for (const item of timeline) {
    assert.ok(['recorded', 'planned', 'deadline', 'conditionalForecast'].includes(item.statusKey), `Unknown timeline state ${item.id}`);
    assert.ok(!('at' in item) && !('start' in item) && !('end' in item), `${item.id} must reference an existing timestamp`);
    item.ownerIds.forEach((id) => assert.ok(data.people[id], `${item.id} unknown owner ${id}`));
    let instant;
    if (item.eventRef) {
      assert.ok(!item.planId && data.events[item.eventRef], `${item.id} invalid event reference`);
      instant = at(item.eventRef);
      same(item.ownerIds, data.events[item.eventRef].actorIds);
    } else {
      same([item.planId, item.endpoint, item.statusKey], ['A', 'end', 'conditionalForecast']);
      assert.ok(stage(item.planId, item.stageId), `${item.id} unknown stage`);
      instant = stage(item.planId, item.stageId)[item.endpoint];
    }
    if (item.statusKey === 'recorded') assert.ok(time(instant) <= time(data.initialClock), `${item.id} is not a recorded initial event`);
    else assert.ok(time(instant) > time(data.initialClock), `${item.id} must remain a future scenario entry`);
  }
});

check('calendars, effort and turnaround remain distinct', () => {
  for (const calendar of [data.calendars.customer, data.calendars.base]) {
    same([calendar.weekdays, calendar.startHour, calendar.endHour], [[1, 2, 3, 4, 5], 9, 17]);
  }
  same(data.calendars.customer.holidays, []);
  same(data.calendars.base.holidays, ['2027-01-01', '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12', '2027-04-05']);
  same([data.calendars.continuous.hoursPerDay, data.calendars.continuous.coverageAssumed], [24, true]);
  same(['technicalReview', 'qualityReview', 'budgetReview', 'resourceConfirmation'].map((key) => [data.durations[key].effortHours, data.durations[key].turnaroundWorkdays]), [[6, 3], [8, 3], [2, 1], [2, 1]]);
  same(officeHours('2026-12-25T09:00:00+08:00', '2026-12-25T17:00:00+08:00', 'base'), 8);
});

check('frozen action events and original/candidate window instants', () => {
  const expected = {
    riskDiscovered: '2026-11-09T10:00:00+08:00', materialReady: '2026-11-09T16:00:00+08:00',
    customerPacketAvailable: '2026-11-09T09:00:00-05:00', budgetOwnerNotified: '2026-11-09T09:00:00-05:00',
    backupAssigned: '2026-11-09T11:00:00-05:00', alternateAssigned: '2026-11-10T09:00:00-05:00',
    reviewsComplete: '2026-11-11T17:00:00-05:00', budgetStart: '2026-11-12T09:00:00-05:00',
    budgetAuthorized: '2026-11-12T17:00:00-05:00', resourceReviewStart: '2026-11-13T09:00:00+08:00',
    resourceConfirmed: '2026-11-13T17:00:00+08:00', resourceConfirmationDeadline: '2026-11-16T17:00:00+08:00',
    customerResponseHandoff: '2026-11-16T09:00:00+08:00', latestAuthorization: '2026-11-13T17:00:00-05:00',
    latestReviewStart: '2026-11-10T09:00:00-05:00', latestReviewComplete: '2026-11-12T17:00:00-05:00',
    latestBudgetStart: '2026-11-13T09:00:00-05:00', originalWindow: '2027-01-04T09:00:00+08:00',
    candidateWindow: '2027-02-15T09:00:00+08:00',
  };
  same(Object.fromEntries(Object.entries(data.events).map(([key, value]) => [key, value.at])), expected);
  same(data.initialClock, expected.customerPacketAvailable);
  assert.ok(time(at('riskDiscovered')) < time(at('materialReady')) && time(at('materialReady')) < time(data.initialClock));
  same(data.risk.publishedAt, expected.materialReady);
  same(data.risk.nextUpdateEvent, 'reviewsComplete');
  same((time(at('candidateWindow')) - time(at('originalWindow'))) / DAY, 42);
});

check('D08–D11 handoffs, client working-day cutoff and actionable margin', () => {
  same(officeHours(data.initialClock, at('reviewsComplete'), 'customer'), 24);
  same(officeHours(at('latestReviewStart'), at('latestReviewComplete'), 'customer'), 24);
  same(officeHours(at('budgetStart'), at('budgetAuthorized'), 'customer'), 8);
  same(officeHours(at('latestBudgetStart'), at('latestAuthorization'), 'customer'), 8);
  same(officeHours(at('resourceReviewStart'), at('resourceConfirmed'), 'base'), 8);
  same(officeHours(at('customerResponseHandoff'), at('resourceConfirmationDeadline'), 'base'), 8);
  same(officeHours(data.initialClock, at('latestReviewStart'), 'customer'), 8);
  same(officeHours(at('latestAuthorization'), at('customerResponseHandoff'), 'customer'), 0);
  same(officeHours(at('budgetAuthorized'), at('latestAuthorization'), 'customer'), 8);
  assert.ok(time(at('reviewsComplete')) < time(at('budgetStart')));
  assert.ok(time(at('budgetAuthorized')) < time(at('resourceReviewStart')));
  assert.ok(time(at('resourceConfirmed')) <= time(at('resourceConfirmationDeadline')));
  same(localParts(at('customerResponseHandoff'), 'America/New_York'), { date: '2026-11-15', hour: 20, minute: 0 });
  same(localParts(at('resourceConfirmed'), 'America/New_York'), { date: '2026-11-13', hour: 4, minute: 0 });
});

check('common experiment scope and duration, with queue separately counted', () => {
  same(data.lab.scope, { baselineConditions: 1, candidateConditions: 3, replicatesPerCondition: 2, screeningRuns: 8, confirmationRuns: 2, totalRuns: 10, allSampleAnalysisKeys: ['secHplcHmw', 'a280ConcentrationRecovery'], baselineAndConfirmationAnalysisKeys: ['ceSds', 'activityTrend'] });
  same((data.lab.scope.baselineConditions + data.lab.scope.candidateConditions) * data.lab.scope.replicatesPerCondition, data.lab.scope.screeningRuns);
  same(data.lab.scope.screeningRuns + data.lab.scope.confirmationRuns, data.lab.scope.totalRuns);
  same(data.lab.phaseWorkdays, { sampleCheck: 2, screening: 3, firstAnalysis: 2, candidateConfirmation: 2, finalAnalysis: 3 });
  same(Object.values(data.lab.phaseWorkdays).reduce((sum, days) => sum + days, 0), 12);
  same(data.lab.successGuaranteed, false);
  same([data.plans.A.queueWorkdays, data.plans.B.queueWorkdays], [0, 10]);
  assert.equal(stage('A', 'resourceQueue'), undefined);
  same(stage('B', 'resourceQueue').duration, 10);
  for (const id of Object.keys(data.lab.phaseWorkdays)) same(stage('A', id).duration, stage('B', id).duration);
});

check('all frozen stage dates and shared base durations', () => {
  const expected = {
    A: 'sampleCheck:2026-11-17/2026-11-18,screening:2026-11-19/2026-11-23,firstAnalysis:2026-11-24/2026-11-25,candidateConfirmation:2026-11-26/2026-11-27,finalAnalysis:2026-11-30/2026-12-02,internalAssessment:2026-12-03/2026-12-04,customerResultReview:2026-12-04/2026-12-08,windowUseConfirmation:2026-12-09/2026-12-09,productionPreparation:2026-12-10/2026-12-30,preparationBuffer:2026-12-31/2026-12-31,windowWait:2026-12-31/2027-01-04,seedExpansion:2027-01-04/2027-01-18,productionCulture:2027-01-18/2027-02-01,harvestPurification:2027-02-01/2027-02-08,releaseTesting:2027-02-08/2027-03-01,recordReview:2027-02-15/2027-02-26,finalQA:2027-03-01/2027-03-03,dispatchPreparation:2027-03-04/2027-03-04,transport:2027-03-04/2027-03-09,deliveryBuffer:2027-03-09/2027-03-11',
    B: 'resourceQueue:2026-11-17/2026-11-30,sampleCheck:2026-12-01/2026-12-02,screening:2026-12-03/2026-12-07,firstAnalysis:2026-12-08/2026-12-09,candidateConfirmation:2026-12-10/2026-12-11,finalAnalysis:2026-12-14/2026-12-16,internalAssessment:2026-12-17/2026-12-18,customerResultReview:2026-12-18/2026-12-22,windowUseConfirmation:2026-12-23/2026-12-23,productionPreparation:2026-12-24/2027-01-14,preparationBuffer:2027-01-15/2027-01-15,windowWait:2027-01-15/2027-02-15,seedExpansion:2027-02-15/2027-03-01,productionCulture:2027-03-01/2027-03-15,harvestPurification:2027-03-15/2027-03-22,releaseTesting:2027-03-22/2027-04-12,recordReview:2027-03-22/2027-04-02,finalQA:2027-04-12/2027-04-14,dispatchPreparation:2027-04-15/2027-04-15,transport:2027-04-15/2027-04-20,deliveryBuffer:2027-04-20/2027-04-22',
  };
  for (const code of ['A', 'B']) {
    const stages = data.plans[code].stages;
    same(stages.map((item) => `${item.id}:${item.start.slice(0, 10)}/${item.end.slice(0, 10)}`).join(','), expected[code]);
    same(new Set(stages.map((item) => item.id)).size, stages.length);
    for (const item of stages) {
      assert.ok(time(item.start) <= time(item.end), `${code}/${item.id} runs backward`);
      if (item.unit === 'workdays') {
        same(officeHours(item.start, item.end, item.calendar), item.duration * 8, `${code}/${item.id} working duration`);
        same(localParts(item.start, data.calendars[item.calendar].timezone).hour, 9);
        same(localParts(item.end, data.calendars[item.calendar].timezone).hour, 17);
      } else if (item.unit === 'calendarDays') {
        same((time(item.end) - time(item.start)) / DAY, item.duration, `${code}/${item.id} continuous duration`);
      }
      for (const dependency of item.dependsOn) {
        assert.ok(stage(code, dependency), `${code}/${item.id} missing dependency ${dependency}`);
        assert.ok(time(item.start) >= time(stage(code, dependency).end), `${code}/${item.id} starts before ${dependency} finishes`);
      }
      const other = stage(code === 'A' ? 'B' : 'A', item.id);
      if (other && item.unit !== 'interval') same([item.duration, item.unit, item.calendar], [other.duration, other.unit, other.calendar], `${item.id} common base duration`);
    }
    same(data.plans[code].window.at, stage(code, 'seedExpansion').start);
    same(data.plans[code].window.startDefinitionKey, 'cellThawSeedExpansion');
    same(data.plans[code].forecast.delivery, stage(code, 'deliveryBuffer').end);
  }
});

check('stage dates use execution timezones, including cross-border reference', () => {
  for (const code of ['A', 'B']) {
    for (const item of data.plans[code].stages) {
      const expectedZone = ['customerResultReview', 'deliveryBuffer'].includes(item.id) ? 'America/New_York' : 'Asia/Shanghai';
      same(item.executionTimezone, expectedZone, `${code}/${item.id} execution timezone`);
      same(localParts(item.start, item.executionTimezone).date, item.start.slice(0, 10), `${code}/${item.id} local start date`);
      same(localParts(item.end, item.executionTimezone).date, item.end.slice(0, 10), `${code}/${item.id} local end date`);
      if (item.unit === 'workdays') same(item.executionTimezone, data.calendars[item.calendar].timezone);
    }
    same(stage(code, 'transport').executionTimezoneNoteKey, 'crossBorderShanghaiReference');
  }
  same(localParts(stage('A', 'seedExpansion').start, stage('A', 'seedExpansion').executionTimezone).date, '2027-01-04');
  same(localParts(stage('A', 'seedExpansion').start, 'America/New_York').date, '2027-01-03');
});

check('parallel review join, buffers, result review and readiness', () => {
  for (const code of ['A', 'B']) {
    same(stage(code, 'recordReview').parallelWith, 'releaseTesting');
    assert.ok(time(stage(code, 'recordReview').start) < time(stage(code, 'releaseTesting').end));
    same(time(stage(code, 'finalQA').start), Math.max(time(stage(code, 'recordReview').end), time(stage(code, 'releaseTesting').end)));
    same(stage(code, 'finalQA').dependsOn, ['releaseTesting', 'recordReview']);
    same(stage(code, 'customerResultReview').parallelActorIds, ['P02', 'P03']);
    same(stage(code, 'customerResultReview').duration, data.durations.technicalReview.turnaroundWorkdays);
    same(stage(code, 'preparationBuffer').duration, 1);
    same(stage(code, 'deliveryBuffer').duration, 3);
    same(stage(code, 'deliveryBuffer').bufferOnly, true);
    assert.ok(time(stage(code, 'sampleCheck').start) > time(at('resourceConfirmationDeadline')));
  }
  same(data.plans.A.holdUntil, stage('A', 'windowUseConfirmation').end);
  assert.ok(time(stage('A', 'preparationBuffer').end) < time(at('originalWindow')));
  assert.ok(time(stage('B', 'productionPreparation').end) > time(at('originalWindow')));
  same(data.plans.B.window.statusKey, 'candidatePendingConfirmation');
  same(data.plans.B.windowStatusKey, 'pendingConfirmation');
});

check('delivery estimates, customer-day differences and DST', () => {
  same(data.baseline, { ref: 'D28', needBy: '2027-03-19T17:00:00-04:00', needByLocalDate: '2027-03-19', timezone: 'America/New_York', deliveryGapUnit: 'customerCalendarDays' });
  same([data.plans.A.forecast.delivery, data.plans.B.forecast.delivery], ['2027-03-11T17:00:00-05:00', '2027-04-22T17:00:00-04:00']);
  for (const code of ['A', 'B']) {
    const forecast = data.plans[code].forecast;
    same(localParts(forecast.delivery, data.baseline.timezone), { date: forecast.localDate, hour: 17, minute: 0 });
    same((Date.parse(data.baseline.needByLocalDate) - Date.parse(forecast.localDate)) / DAY, forecast.needByGapDays);
    same([forecast.statusKey, forecast.includesBuffer], ['conditionalEstimate', true]);
  }
  same([data.plans.A.forecast.needByGapDays, data.plans.B.forecast.needByGapDays], [8, -34]);
  same((Date.parse(data.plans.B.forecast.localDate) - Date.parse(data.plans.A.forecast.localDate)) / DAY, 42);
  same(localParts(stage('A', 'transport').end, 'America/New_York'), { date: '2027-03-09', hour: 4, minute: 0 });
  same(localParts(stage('B', 'transport').end, 'America/New_York'), { date: '2027-04-20', hour: 5, minute: 0 });
  same(localParts(data.initialClock, 'Asia/Shanghai'), { date: '2026-11-09', hour: 22, minute: 0 });
});

check('fees, commitment conditions and optional fallback authority', () => {
  const fee = data.fees;
  same([fee.currency, fee.shared, fee.expedite, fee.hold, fee.reschedule], ['USD', 30000, 30000, 20000, 10000]);
  same(fee.totals, { A: 80000, B: 40000, AWithFallback: 90000 });
  same(fee.totals.A, fee.shared + fee.expedite + fee.hold);
  same(fee.totals.B, fee.shared + fee.reschedule);
  same(fee.totals.AWithFallback, fee.totals.A + fee.reschedule);
  same(fee.resourceCommitment, fee.expedite + fee.hold);
  same(fee.premiumOverB, fee.totals.A - fee.totals.B);
  same(fee.fallbackCap, fee.reschedule);
  same([fee.fallbackSelectedByDefault, fee.unconfirmedFeesAccrue, fee.additionalTechnicalWorkIncluded], [false, false, false]);
  same(fee.chargeTriggers, { shared: 'experimentStarted', expedite: 'resourceConfirmed', hold: 'windowHoldConfirmed', reschedule: 'rescheduleConfirmed' });
  for (const id of ['P04', 'P06']) assert.ok(data.people[id].budgetLimit >= fee.totals.AWithFallback);
  for (const code of ['A', 'B']) same(data.plans[code].total, fee.totals[code]);
  same(data.branchPresets.customerRejected.nextOwnerId, 'P01');
  same(data.branchPresets.resourceRejected.nextOwnerId, 'P07');
  Object.values(data.branchPresets).forEach((branch) => {
    same(branch.confirmsCandidateWindow, false);
    assert.ok(data.events[branch.atEvent]);
  });
});

if (failures.length) {
  console.error(`\n${failures.length} validation group(s) failed. Fix the implementation; frozen inputs were not modified.`);
  process.exitCode = 1;
} else {
  console.log(`\n${checks} validation groups passed. Frozen inputs were not modified.`);
}

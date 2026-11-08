import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { Intl, Date };
for (const file of ['src/data.js', 'src/core.js', 'src/workflow.js']) vm.runInNewContext(readFileSync(path.join(root, file), 'utf8'), context);
const { DEMO_DATA: data, DEMO_CORE: core, DEMO_WORKFLOW: workflow } = context;
const session = core.createSession(data);
const initial = session.getState();
const serializedData = JSON.stringify(data);
const task = (state, viewer, key) => workflow.tasks(data, state, viewer).find(item => item.key === key);
const notification = (state, viewer, key) => workflow.notifications(data, state, viewer).find(item => item.taskKey === key);
const plain = value => JSON.parse(JSON.stringify(value));

// Initial notifications describe actionable needs, never completed handoffs.
assert.deepEqual(plain(workflow.tasks(data, initial, 'P01').map(item => [item.key, item.owner, item.event, item.status])), [
  ['assignBen', 'P01', 'backupAssigned', 'pendingAssignment'],
  ['startTechnical', 'P02', 'latestReviewStart', 'briefPending'],
  ['startQuality', 'P03', 'latestReviewStart', 'briefPending'],
  ['designateElena', 'P01', 'alternateAssigned', 'pendingDesignation']
]);
assert.deepEqual(plain(workflow.notifications(data, initial, 'P01').map(item => item.kind)), ['leaveSupport', 'reviewReady', 'reviewReady', 'leaveApprover']);
assert.equal(task(initial, 'P02', 'startTechnical').owner, 'P02');
assert.equal(task(initial, 'P03', 'startQuality').owner, 'P03');
assert.equal(workflow.project(data, initial).evidencePublished, true, 'Published evidence is available even before task briefs are confirmed');
assert.equal(workflow.project(data, initial).reviewReadiness, 'briefPending');
assert.equal(notification(initial, 'P02', 'startTechnical').at, data.events.customerPacketAvailable.at);
assert.equal(notification(initial, 'P02', 'startTechnical').timing.at, data.events.latestReviewStart.at);
assert.notEqual(notification(initial, 'P02', 'startTechnical').at, notification(initial, 'P02', 'startTechnical').timing.at, 'Sending time and the latest start time are distinct');
assert.equal(task(initial, 'P04', 'budget').status, 'blocked');
for (const viewer of ['P05', 'P06']) {
  assert.equal(workflow.tasks(data, initial, viewer).length, 0, 'Unassigned people must not acquire tasks by viewing their role');
  assert.equal(workflow.notifications(data, initial, viewer).length, 0, 'Unassigned people must not receive fictitious assignment notices');
}
assert.deepEqual(plain(workflow.tasks(data, initial, 'P07').map(item => item.status)), ['nonbinding', 'waiting']);
assert.equal(task(initial, 'P08', 'schedule').status, 'nonbinding');

function verifyLinks(state) {
  const projection = workflow.project(data, state);
  for (const record of Object.values(projection.records)) {
    assert.ok(Object.isFrozen(record.timing), 'Task timing is an immutable projection');
    assert.equal(record.timing.eventRef, record.event);
    assert.equal(record.timing.at, data.events[record.timing.eventRef].at);
    assert.deepEqual(plain(workflow.taskTiming(data, state, record.key)), plain(record.timing));
    assert.deepEqual(plain(workflow.eventTiming(data, state, record.timing.eventRef)), plain(record.timing));
    if (record.completionTiming) {
      assert.ok(Object.isFrozen(record.completionTiming));
      assert.equal(record.completionTiming.at, data.events[record.completionTiming.eventRef].at);
      assert.deepEqual(plain(workflow.taskTiming(data, state, record.key, 'completion')), plain(record.completionTiming));
      assert.deepEqual(plain(workflow.eventTiming(data, state, record.completionTiming.eventRef)), plain(record.completionTiming));
    }
  }
  for (const viewer of Object.keys(data.people)) {
    const tasks = workflow.tasks(data, state, viewer);
    const notices = workflow.notifications(data, state, viewer);
    assert.equal(new Set(notices.map(item => item.id)).size, notices.length, 'Repeated projection must not duplicate notifications');
    assert.equal(new Set(notices.map(item => item.taskKey)).size, notices.length, 'Each task has at most one current state notification');
    for (const notice of notices) {
      assert.deepEqual(plain(notice.task), plain(tasks.find(item => item.key === notice.taskKey)), 'A notification must point to a visible task with the identical current state');
      assert.equal(notice.timing, notice.task.timing, 'Notification timing comes directly from its task projection');
      assert.equal(notice.completionTiming, notice.task.completionTiming, 'Completion timing cannot drift from the linked task');
      assert.ok(Date.parse(notice.at) <= Date.parse(state.clock), 'Future events cannot be notified as recorded');
    }
  }
}
verifyLinks(initial);

// Passing a scheduled date is never an action or an approval.
const clockOnly = { ...initial, clock: data.events.resourceConfirmed.at };
assert.equal(task(clockOnly, 'P01', 'assignBen').status, 'pendingAssignment');
assert.equal(task(clockOnly, 'P02', 'startTechnical').status, 'briefPending');
assert.equal(workflow.project(data, clockOnly).reviewReadiness, 'briefPending', 'A later clock cannot distribute task briefs');
assert.equal(workflow.tasks(data, clockOnly, 'P05').length, 0);
assert.equal(workflow.tasks(data, clockOnly, 'P06').length, 0);
assert.equal(task(clockOnly, 'P07', 'receipt').status, 'waiting');
assert.ok(!workflow.notifications(data, clockOnly, 'P07').some(item => item.kind === 'authorizationReceived'));
verifyLinks(clockOnly);

// An isolated completion ID must not bypass the recorded prerequisites for a
// valid authorization or make a resource receipt valid without authorization.
for (const eventIds of [['budgetAuthorized'], ['resourceConfirmed'], ['budgetAuthorized', 'resourceConfirmed']]) {
  const incompleteRecords = { ...initial, clock: data.events.resourceConfirmed.at, eventIds };
  assert.equal(task(incompleteRecords, 'P07', 'receipt').status, 'waiting');
  assert.equal(task(incompleteRecords, 'P08', 'schedule').status, 'nonbinding');
  assert.equal(task(incompleteRecords, 'P04', 'budget').status, 'blocked');
  for (const viewer of ['P07', 'P08']) {
    assert.ok(!workflow.notifications(data, incompleteRecords, viewer).some(item => ['authorizationReceived', 'resourceConfirmed'].includes(item.kind)), 'Incomplete records cannot announce a valid authorization or resource confirmation');
  }
  verifyLinks(incompleteRecords);
}

for (const eventIds of [['alternateAssigned', 'budgetAuthorized'], ['reviewsComplete', 'budgetAuthorized']]) {
  const missingPrerequisite = { ...initial, clock: data.events.budgetAuthorized.at, eventIds };
  assert.equal(task(missingPrerequisite, 'P07', 'receipt').status, 'waiting', 'Both approver designation and completed reviews are required');
  assert.ok(!workflow.notifications(data, missingPrerequisite, 'P07').some(item => item.kind === 'authorizationReceived'));
}

// Even an accidentally supplied future event ID cannot create an early fact.
const futureIds = { ...initial, eventIds: ['backupAssigned', 'alternateAssigned', 'reviewsComplete', 'budgetAuthorized', 'resourceConfirmed'] };
for (const viewer of Object.keys(data.people)) {
  assert.deepEqual(plain(workflow.tasks(data, futureIds, viewer)), plain(workflow.tasks(data, initial, viewer)));
  assert.deepEqual(plain(workflow.notifications(data, futureIds, viewer)), plain(workflow.notifications(data, initial, viewer)));
}

session.selectPlan('A');
const selected = session.getState();
assert.equal(task(selected, 'P02', 'startTechnical').status, 'briefPending', 'Selecting a plan does not assign review tasks');
assert.equal(notification(selected, 'P02', 'startTechnical').kind, 'taskBriefPending');
assert.equal(notification(selected, 'P02', 'startTechnical').at, selected.decision.createdAt, 'Pending task brief notice uses its recorded request creation time');
assert.equal(workflow.project(data, selected).reviewReadiness, 'briefPending');
verifyLinks(selected);
session.saveDrafts({ technical: 'Review SEC-001 v1', quality: 'Review SEC-001 v1 scope', budget: 'Review Q-001 v1 costs' });
assert.equal(task(session.getState(), 'P03', 'startQuality').status, 'briefPending', 'Generating or editing drafts is not distribution');
const unrecordedAssignment = plain(session.getState());
unrecordedAssignment.decision.tasksCreated = true;
assert.equal(task(unrecordedAssignment, 'P02', 'startTechnical').status, 'briefPending', 'An assignment flag without its explicit event does not make a task ready');
session.confirmTasks();
let created = session.getState();
assert.equal(notification(created, 'P02', 'startTechnical').kind, 'tasksAssigned');
assert.equal(notification(created, 'P02', 'startTechnical').at, created.decision.tasksCreatedAt);
assert.equal(task(created, 'P02', 'startTechnical').status, 'readyForReview');
assert.equal(task(created, 'P03', 'startQuality').status, 'readyForReview');
assert.equal(workflow.project(data, created).reviewReadiness, 'readyForReview');
assert.equal(task(created, 'P01', 'budget').created, true);
assert.equal(task(created, 'P04', 'budget').event, 'budgetStart');
verifyLinks(created);
session.setViewer('P02'); session.startReview('technical');
assert.equal(notification(session.getState(), 'P02', 'startTechnical').kind, 'reviewStarted');
assert.equal(task(session.getState(), 'P03', 'startQuality').status, 'readyForReview');
assert.equal(workflow.project(data, session.getState()).reviewReadiness, 'inProgress');
session.setViewer('P03'); session.startReview('quality');
session.advanceNext();
assert.equal(task(session.getState(), 'P01', 'assignBen').status, 'pendingAssignment', 'Advancing to the handoff time does not assign Ben');
session.setViewer('P01'); session.assignSupport();
const supported = session.getState();
assert.equal(task(supported, 'P01', 'assignBen').status, 'taskCompleted');
assert.equal(notification(supported, 'P01', 'assignBen').kind, 'supportAssigned');
assert.equal(task(supported, 'P05', 'support').owner, 'P05');
assert.equal(task(supported, 'P05', 'support').info, 'supportPreparation');
assert.equal(task(supported, 'P05', 'budget'), undefined, 'Preparation support never grants budget ownership');
assert.equal(task(supported, 'P04', 'budget').status, 'blocked', 'Ben assignment cannot unblock financial authorization');
assert.equal(notification(supported, 'P04', 'budget').kind, 'supportAssigned');
assert.equal(data.people.P05.budgetLimit, 0);
verifyLinks(supported);
session.setViewer('P05'); session.acceptSupport();
assert.equal(task(session.getState(), 'P05', 'support').status, 'inProgress');
assert.equal(notification(session.getState(), 'P05', 'support').kind, 'supportAccepted');
session.advanceNext();
assert.equal(workflow.tasks(data, session.getState(), 'P06').length, 0, 'Scheduled designation alone grants no task access');
session.setViewer('P01'); session.designateApprover();
const designated = session.getState();
assert.equal(task(designated, 'P01', 'designateElena').status, 'taskCompleted');
assert.equal(task(designated, 'P06', 'budget').owner, 'P06');
assert.equal(task(designated, 'P06', 'budget').status, 'pendingReview', 'Designation alone is not final authorization readiness');
assert.equal(task(designated, 'P04', 'budget').owner, 'P06', 'Olivia sees the same transferred budget record');
assert.equal(notification(designated, 'P06', 'budget').kind, 'approverDesignated');
verifyLinks(designated);

session.advanceNext();
assert.equal(task(session.getState(), 'P06', 'budget').status, 'pendingReview', 'Scheduled review completion is not an opinion');
session.setViewer('P02'); session.completeReview('technical', 'Technical scope is reviewable.', 'approved');
assert.equal(task(session.getState(), 'P02', 'startTechnical').status, 'approved');
assert.equal(task(session.getState(), 'P03', 'startQuality').status, 'inProgress');
assert.equal(task(session.getState(), 'P06', 'budget').status, 'pendingReview');
session.setViewer('P03'); session.completeReview('quality', 'QA scope is acceptable for the study.', 'approved');
const reviewed = session.getState();
for (const [viewer, key] of [['P02', 'startTechnical'], ['P03', 'startQuality']]) {
  assert.equal(task(reviewed, viewer, key).status, 'approved');
  assert.equal(notification(reviewed, viewer, key).kind, 'reviewCompleted');
}
assert.equal(task(reviewed, 'P06', 'budget').status, 'readyForAuthorization');
assert.equal(workflow.project(data, reviewed).reviewReadiness, 'approved');
assert.equal(notification(reviewed, 'P06', 'budget').kind, 'reviewsCompleted');
assert.equal(task(reviewed, 'P07', 'receipt').status, 'waiting');
verifyLinks(reviewed);

session.advanceNext();
assert.equal(task(session.getState(), 'P07', 'receipt').status, 'waiting', 'Scheduled authorization time does not authorize');
session.setViewer('P06');
session.authorize({ signature: data.people.P06.name, reason: 'Reviewed the complete package and fee conditions.', acknowledged: true });
const authorized = session.getState();
assert.equal(task(authorized, 'P06', 'budget').status, 'taskCompleted');
assert.equal(notification(authorized, 'P06', 'budget').kind, 'authorizationRecorded');
for (const [viewer, key] of [['P07', 'receipt'], ['P08', 'schedule']]) {
  assert.equal(task(authorized, viewer, key).status, 'ready');
  assert.equal(notification(authorized, viewer, key).kind, 'authorizationReceived');
}
assert.ok(!workflow.notifications(data, authorized, 'P07').some(item => item.kind === 'resourceConfirmed'), 'Customer authorization does not confirm WuXi resources');
assert.equal(workflow.project(data, authorized).resourceConfirmed, false);
assert.equal(workflow.confirmations(data, authorized).find(item => item.key === 'schedule').status, 'ready');
verifyLinks(authorized);
const duplicateEvents = { ...authorized, eventIds: [...authorized.eventIds, ...authorized.eventIds] };
assert.deepEqual(plain(workflow.notifications(data, duplicateEvents, 'P07')), plain(workflow.notifications(data, authorized, 'P07')));

// Identity is stable through viewing/requirement edits, while evidence revisions
// create a new notification identity that can be distinguished from a read one.
session.reset('customer');
session.setRequirement({ needByLocalDate: '2027-03-20', deliverableOverride: '', destinationOverride: '' });
session.setViewer('P02');
assert.equal(notification(session.getState(), 'P02', 'startTechnical').id, notification(initial, 'P02', 'startTechnical').id);
const revisedData = plain(data);
revisedData.reports['SEC-001'].version += 1;
assert.notEqual(workflow.notifications(revisedData, initial, 'P02')[0].id, workflow.notifications(data, initial, 'P02')[0].id);
session.reset('prepublication');
assert.equal(workflow.project(data, session.getState()).evidencePublished, false);
for (const viewer of ['P01', 'P02', 'P03', 'P04', 'P05', 'P06']) {
  assert.equal(workflow.notifications(data, session.getState(), viewer).length, 0, 'Unpublished risk must not leak into customer notifications');
}
assert.equal(workflow.taskTiming(data, initial, 'unknown'), null);
assert.equal(workflow.eventTiming(data, initial, 'riskDiscovered'), null, 'Fact timestamps remain facts rather than fabricated task deadlines');
assert.equal(workflow.taskTiming(data, initial, 'startTechnical', 'completion').eventRef, 'reviewsComplete');
assert.equal(workflow.taskTiming(data, initial, 'budget', 'completion').eventRef, 'latestAuthorization');
assert.equal(workflow.taskTiming(data, initial, 'receipt', 'completion').eventRef, 'resourceConfirmationDeadline');
const timingData = plain(data);
timingData.events.latestReviewStart.at = '2026-11-10T10:00:00-05:00';
timingData.events.reviewsComplete.at = '2026-11-11T18:00:00-05:00';
const timingView = workflow.project(timingData, initial);
const timingNotice = workflow.notifications(timingData, initial, 'P02')[0];
assert.equal(timingView.records.startTechnical.timing.at, timingData.events.latestReviewStart.at);
assert.equal(timingView.records.startQuality.timing.at, timingData.events.latestReviewStart.at);
assert.equal(timingNotice.timing.at, timingData.events.latestReviewStart.at, 'Notification latest start reads the shared event source');
assert.equal(workflow.eventTiming(timingData, initial, 'latestReviewStart').at, timingNotice.timing.at, 'Timeline lookup reads the same task timing as notifications');
assert.equal(timingNotice.completionTiming.at, timingData.events.reviewsComplete.at);
assert.equal(timingNotice.at, data.events.customerPacketAvailable.at, 'Changing task timing cannot change recorded sending time');
assert.equal(JSON.stringify(data), serializedData, 'Projection must never modify frozen demo facts, parameters or authority');
assert.equal(JSON.stringify(initial), JSON.stringify(core.createSession(data).getState()), 'Projection must not mutate session state');
console.log('Workflow checks passed: evidence availability, pending briefs versus assigned reviews, shared task and notification timing, role-scoped records, leave coverage, authorization dependencies, future-event suppression, stable identities, no duplicates and no parameter mutations.');

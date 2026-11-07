import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { Intl, Date };
for (const file of ['src/data.js', 'src/core.js', 'src/workflow.js']) vm.runInNewContext(readFileSync(path.join(root, file), 'utf8'), context);
const { DEMO_DATA: data, DEMO_CORE: core, DEMO_WORKFLOW: workflow } = context;
const originalData = JSON.stringify(data);
const fixtures = {
  drafts: { technical: 'Review SEC-001 v1 and EXP-001 v2.', quality: 'Review the study criteria and evidence.', budget: 'Review the final quote and both opinions.' },
  reviewReasons: { technical: 'The additional study scope is acceptable.', quality: 'The proposed quality evidence is sufficient for this study.' },
  authorizationReason: 'The scope and quote are within the authorized budget.',
  rejectionReason: 'The quoted laboratory slots and original-window hold cannot be confirmed.'
};
const plain = value => JSON.parse(JSON.stringify(value));
const s = core.createSession(data);
assert.equal(s.getState().publication.status, 'published');
assert.equal(workflow.project(data, s.getState()).clientVisible, true);
s.enterChapter('prepublication');
assert.equal(s.getState().viewer, 'P07');
assert.equal(s.getState().clock, data.events.riskDiscovered.at);
assert.equal(s.getState().chapterSeeded, false);
assert.equal(s.getState().resetNotice, true);
for (const viewer of ['P01','P02','P03','P04','P05','P06']) {
  s.setViewer(viewer);
  assert.equal(workflow.project(data, s.getState()).clientVisible, false);
  assert.equal(workflow.tasks(data, s.getState()).length, 0);
  assert.equal(workflow.notifications(data, s.getState()).length, 0);
  assert.throws(() => s.selectPlan('A'), /UNPUBLISHED_RISK/);
  assert.throws(() => s.publishRisk(), /ROLE_NOT_ALLOWED/);
}
s.setViewer('P08'); assert.throws(() => s.saveRiskDraft({ certainty:'potentialImpact',nextUpdateEvent:'resourceConfirmed' }), /ROLE_NOT_ALLOWED/);
s.setViewer('P07');
assert.throws(() => s.publishRisk(), /TOO_EARLY/);
assert.throws(() => s.saveRiskDraft({ certainty:'certainFailure',nextUpdateEvent:'reviewsComplete' }), /INVALID_CERTAINTY/);
assert.throws(() => s.saveRiskDraft({ certainty:'potentialImpact',nextUpdateEvent:'newDate' }), /INVALID_UPDATE_EVENT/);
s.saveRiskDraft({ certainty:'potentialImpact',nextUpdateEvent:'resourceConfirmed' });
assert.equal(s.getState().publication.status, 'draft');
assert.equal(s.getAdvanceInfo().nextEvent, 'materialReady');
s.advanceNext();
assert.equal(s.getState().clock, data.events.materialReady.at);
assert.equal(s.getState().publication.status, 'draft');
assert.equal(s.getAdvanceInfo().blockKey, 'publishRisk');
s.publishRisk();
assert.equal(s.getState().publication.status, 'published');
assert.equal(s.getState().publication.publishedAt, data.events.materialReady.at);
assert.equal(s.getState().publication.certainty, 'potentialImpact');
assert.equal(s.getState().publication.nextUpdateEvent, 'resourceConfirmed');
assert.equal(s.getState().clock, data.initialClock, 'Publishing moves forward to the existing customer-availability snapshot');
assert.equal(s.getState().scene, 'customer');
assert.equal(workflow.project(data, s.getState()).clientVisible, true);
const publishedRevision = s.getState().revision; s.publishRisk(); assert.equal(s.getState().revision, publishedRevision);
assert.throws(() => s.saveRiskDraft({ certainty:'underAssessment',nextUpdateEvent:'reviewsComplete' }), /RISK_ALREADY_PUBLISHED/);
assert.throws(() => s.advanceTo('materialReady'), /CLOCK_CANNOT_REWIND/);

const expectedChapters = {
  selection: ['P01',data.initialClock,false],
  coverage: ['P01',data.events.backupAssigned.at,true],
  authorization: ['P06',data.events.budgetAuthorized.at,true],
  hold: ['P07',data.events.resourceReviewStart.at,true],
  unavailable: ['P08',data.events.resourceConfirmed.at,true]
};
for (const [chapter,[viewer,clock,seeded]] of Object.entries(expectedChapters)) {
  s.enterChapter(chapter, fixtures);
  const state = s.getState();
  assert.equal(state.chapterId, chapter); assert.equal(state.viewer, viewer); assert.equal(state.clock, clock);
  assert.equal(state.resetNotice, true); assert.equal(state.chapterSeeded, seeded);
  assert.deepEqual(plain(state.seededEventIds), plain(state.eventIds), 'Chapter prerequisite records are explicitly identifiable as seeded');
  if (chapter === 'selection') assert.equal(state.decision, null);
  else {
    assert.ok(state.decision.tasksCreated);
    assert.equal(state.decision.support.assignedAt === null, chapter === 'coverage');
    assert.equal(state.decision.authorization === null, ['coverage','authorization'].includes(chapter));
    assert.equal(state.decision.resource.startedAt === null, chapter !== 'unavailable');
    assert.equal(state.decision.resource.scheduling, null, 'Entering even the unavailable chapter does not record a resource outcome');
    assert.equal(state.decision.resource.receipt, null);
  }
}
const preserved = JSON.stringify(s.getState());
assert.throws(() => s.enterChapter('hold', {}), /INVALID_CHAPTER_FIXTURE/);
assert.equal(JSON.stringify(s.getState()), preserved, 'Invalid fixture input cannot erase the current run');
assert.throws(() => s.enterChapter('unknown', fixtures), /UNKNOWN_CHAPTER/);

s.enterChapter('hold', fixtures);
assert.equal(s.getState().branchIntent, 'held');
assert.equal(s.getAdvanceInfo().blockKey, 'startResourceReview');
for (const role of ['P01','P06','P08']) { s.setViewer(role); assert.throws(() => s.startResourceReview(), /ROLE_NOT_ALLOWED/); }
s.setViewer('P07');
assert.throws(() => s.returnResourceReceipt(), /SCHEDULING_RESPONSE_REQUIRED/);
s.startResourceReview();
assert.equal(workflow.project(data, s.getState()).resourceStarted, true);
const startedRevision = s.getState().revision; s.startResourceReview(); assert.equal(s.getState().revision, startedRevision);
s.setViewer('P08');
assert.throws(() => s.respondScheduling({outcome:'held',reason:'available'}), /TOO_EARLY/);
s.advanceNext();
assert.equal(s.getState().clock, data.events.resourceConfirmed.at);
assert.equal(s.getState().decision.resource.scheduling, null, 'The clock does not reserve resources');
assert.equal(s.getAdvanceInfo().done, true);
assert.throws(() => s.respondScheduling({outcome:'held',reason:' '}), /REASON_REQUIRED/);
s.respondScheduling({outcome:'held',reason:'Earlier laboratory slots and the original-window hold are confirmed.'});
let state = s.getState();
assert.equal(state.decision.resource.scheduling.outcome, 'held');
assert.equal(state.decision.resource.receipt, null);
assert.equal(workflow.project(data,state,'P08').committedFees, data.fees.resourceCommitment, 'Mei confirmation commits the quoted resource and hold fees before Alex returns the receipt');
assert.equal(workflow.project(data,state,'P08').schedulingOutcome,'held');
for (const role of ['P01','P02','P03','P04','P05','P06']) {
  const projection = workflow.project(data,state,role);
  assert.equal(projection.schedulingOutcome,null, 'Private scheduling outcome is not a customer receipt');
  assert.equal(projection.schedulingReason,'');
  assert.equal(projection.resourceConfirmed,false);
  assert.equal(projection.committedFees,0, 'Unpublished fee outcomes are not exposed through customer projections');
  for (const id of ['schedulingHeld','resourceSlotsConfirmed','windowHoldConfirmed']) assert.equal(projection.occurred(id),false);
  assert.ok(!workflow.notifications(data,state,role).some(item=>['resourceConfirmed','schedulingResponded'].includes(item.kind)));
}
const scheduledRevision = state.revision;
s.respondScheduling({outcome:'held',reason:'duplicate'}); assert.equal(s.getState().revision, scheduledRevision);
assert.throws(() => s.respondScheduling({outcome:'unavailable',reason:'opposite'}), /RESOURCE_RESPONSE_LOCKED/);
assert.throws(() => s.returnResourceReceipt(), /ROLE_NOT_ALLOWED/);
s.setViewer('P07'); s.returnResourceReceipt();
state = s.getState();
assert.equal(workflow.project(data,state,'P01').resourceConfirmed,true);
assert.equal(workflow.project(data,state,'P01').resourceRejected,false);
assert.equal(workflow.project(data,state,'P01').committedFees,data.fees.resourceCommitment);
assert.ok(workflow.notifications(data,state,'P01').some(item=>item.kind==='resourceConfirmed' && item.taskKey==='receipt'));
assert.ok(!state.eventIds.includes('experimentStarted'));
assert.ok(!state.eventIds.includes('rescheduleConfirmed'));
const receiptRevision = state.revision; s.returnResourceReceipt(); assert.equal(s.getState().revision,receiptRevision);
assert.throws(() => s.requestReschedule(), /RESCHEDULE_NOT_AVAILABLE/);
assert.throws(() => s.advanceNext(), /NO_NEXT_EVENT/);

s.enterChapter('unavailable', fixtures);
assert.equal(s.getState().branchIntent, 'unavailable');
s.respondScheduling({outcome:'unavailable',reason:fixtures.rejectionReason});
assert.equal(workflow.project(data,s.getState(),'P07').committedFees,0);
assert.equal(workflow.project(data,s.getState(),'P01').resourceRejected,false);
s.setViewer('P01'); assert.throws(() => s.requestReschedule(), /RESCHEDULE_NOT_AVAILABLE/);
s.setViewer('P07'); s.returnResourceReceipt();
state = s.getState();
assert.equal(workflow.project(data,state,'P01').resourceRejected,true);
assert.equal(workflow.project(data,state,'P01').resourceConfirmed,false);
assert.equal(workflow.project(data,state,'P01').schedulingReason,fixtures.rejectionReason);
assert.equal(workflow.project(data,state,'P01').committedFees,0);
const rescheduleTask = workflow.tasks(data,state,'P01').find(task => task.key === 'reschedule');
assert.equal(rescheduleTask.event,null, 'A new rescheduling request cannot inherit the earlier resource-review start deadline');
assert.equal(rescheduleTask.timingKey,'notScheduled', 'No replacement start deadline has been agreed in the frozen scenario');
assert.ok(!state.eventIds.includes('resourceSlotsConfirmed'));
assert.ok(!state.eventIds.includes('windowHoldConfirmed'));
s.setViewer('P05'); assert.throws(() => s.requestReschedule(), /ROLE_NOT_ALLOWED/);
s.setViewer('P01'); s.requestReschedule();
const requested = s.getState();
assert.equal(requested.decision.resource.rescheduleRequest.by,'P01');
assert.equal(workflow.project(data,requested).rescheduleRequested,true);
assert.equal(workflow.project(data,requested).resourceConfirmed,false);
assert.equal(workflow.project(data,requested).committedFees,0);
assert.ok(!requested.eventIds.includes('rescheduleConfirmed'));
s.requestReschedule(); assert.equal(s.getState().revision,requested.revision);
for (const role of Object.keys(data.people)) {
  const tasks = workflow.tasks(data,s.getState(),role), notices = workflow.notifications(data,s.getState(),role);
  for (const notice of notices) {
    assert.ok(tasks.some(task=>task.key===notice.taskKey),'Every notification has a visible task target');
    assert.ok(Date.parse(notice.at)<=Date.parse(s.getState().clock),'No future notification is recorded');
  }
}

s.enterChapter('selection'); s.selectPlan('B'); s.saveDrafts(fixtures.drafts); s.confirmTasks();
s.setViewer('P02'); s.startReview('technical'); s.setViewer('P03'); s.startReview('quality'); s.advanceNext();
s.setViewer('P01'); s.assignSupport(); s.setViewer('P05'); s.acceptSupport(); s.advanceNext();
s.setViewer('P01'); s.designateApprover(); s.advanceNext();
s.setViewer('P02'); s.completeReview('technical',fixtures.reviewReasons.technical);
s.setViewer('P03'); s.completeReview('quality',fixtures.reviewReasons.quality); s.advanceNext();
s.setViewer('P06'); s.authorize({signature:data.people.P06.name,reason:fixtures.authorizationReason,acknowledged:true});
assert.equal(s.getAdvanceInfo().done,true,'B does not enter the A resource hold flow');
s.setViewer('P07'); assert.throws(() => s.startResourceReview(), /ORIGINAL_WINDOW_ONLY/);
s.requestReschedule();
assert.equal(workflow.project(data,s.getState()).rescheduleRequested,true);
assert.equal(workflow.project(data,s.getState()).committedFees,0);
assert.equal(workflow.project(data,s.getState()).resourceConfirmed,false);
assert.equal(s.getState().decision.resource.scheduling,null);
assert.equal(s.getState().clock,data.events.budgetAuthorized.at);
const finalClock = s.getState().clock;
s.setViewer('P01'); assert.equal(s.getState().clock,finalClock);
s.enterChapter('selection');
assert.equal(s.getState().decision,null);
assert.deepEqual(plain(s.getState().eventIds),[]);
assert.equal(s.getState().chapterSeeded,false);
assert.equal(s.getState().resetNotice,true);
assert.equal(JSON.stringify(data),originalData,'Phase5 never modifies frozen facts, dates, windows or fees');
console.log('WuXi checks passed: publication isolation, monotonic clock, explicit seeded chapters, role guards, distinct scheduling/receipt records, private outcome isolation, exact fee triggers, rejection and pending rescheduling, B boundary and reset.');

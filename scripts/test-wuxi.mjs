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
assert.equal(s.getAdvanceInfo().blockKey, 'reviewRiskDraft');
assert.throws(() => s.advanceNext(), /ADVANCE_BLOCKED_reviewRiskDraft/);
s.reviewRiskDraft();
assert.equal(s.getState().publication.reviewedAt,data.events.riskDiscovered.at);
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
s.setViewer('P07'); assert.throws(() => s.requestReschedule(), /RESCHEDULE_NOT_AVAILABLE/);
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
s.setViewer('P01'); assert.throws(() => s.requestReschedule(), /ROLE_NOT_ALLOWED/);
s.setViewer('P07'); s.requestReschedule();
const requested = s.getState();
assert.equal(requested.decision.resource.rescheduleRequest.by,'P07');
assert.equal(workflow.project(data,requested).rescheduleRequested,true);
assert.equal(workflow.project(data,requested).resourceConfirmed,false);
assert.equal(workflow.project(data,requested).committedFees,0);
assert.ok(!requested.eventIds.includes('rescheduleConfirmed'));
s.requestReschedule(); assert.equal(s.getState().revision,requested.revision);
for (const role of Object.keys(data.people)) {
  const tasks = workflow.tasks(data,s.getState(),role), notices = workflow.notifications(data,s.getState(),role);
  for (const notice of notices) {
    assert.ok(tasks.some(task=>task.key===notice.taskKey),'Every notification has a visible task target');
    assert.ok(notice.timeStatus === 'notScheduled' && notice.at === null || Date.parse(notice.at)<=Date.parse(s.getState().clock),'No future notification is recorded');
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
function finishRescheduling(session, expectedOriginalFailure) {
  const frozenClock = session.getState().clock;
  const project = role => workflow.project(data, session.getState(), role);
  assert.equal(project('P01').rescheduleStage,'awaitingWuXiQuote');
  assert.equal(project('P01').rescheduleQuote,null);
  assert.equal(project('P01').rescheduleFees,0);
  session.setViewer('P07');
  assert.throws(() => session.returnRescheduleQuote(), /RESCHEDULE_QUOTE_REQUIRED/);
  assert.throws(() => session.confirmReschedule(), /RESCHEDULE_AUTHORIZATION_REQUIRED/);
  const customerBeforeQuote = JSON.stringify(project('P01'));
  const clientNoticesBeforeQuote = JSON.stringify(workflow.notifications(data,session.getState(),'P01'));
  session.setViewer('P01'); assert.throws(() => session.respondRescheduleQuote(), /ROLE_NOT_ALLOWED/);
  assert.throws(() => session.createRescheduleDecision(), /RESCHEDULE_QUOTE_RETURN_REQUIRED/);
  session.setViewer('P08'); session.respondRescheduleQuote();
  assert.equal(project('P08').rescheduleStage,'quoteReadyInternal');
  assert.equal(project('P08').rescheduleQuote.amount,data.fees.reschedule);
  assert.equal(project('P08').rescheduleQuote.candidateWindow,data.plans.B.window.at);
  assert.equal(project('P08').rescheduleQuote.quoteRef,'Q-B');
  assert.equal(project('P08').rescheduleQuote.version,data.reports['Q-B'].version);
  assert.equal(JSON.stringify(project('P01')),customerBeforeQuote,'A private quote cannot change client-visible data or brief source fingerprint');
  assert.equal(JSON.stringify(workflow.notifications(data,session.getState(),'P01')),clientNoticesBeforeQuote,'A private quote cannot leak through customer notifications');
  const quotedRevision = session.getState().revision; session.respondRescheduleQuote(); assert.equal(session.getState().revision,quotedRevision);
  assert.equal(project('P08').committedFees,0);
  session.setViewer('P07'); session.returnRescheduleQuote();
  assert.equal(project('P01').rescheduleStage,'awaitingCustomerDecision');
  assert.equal(project('P01').rescheduleQuote.amount,data.fees.reschedule);
  assert.equal(project('P01').rescheduleConfirmed,false);
  session.setViewer('P06'); assert.throws(() => session.authorizeReschedule({signature:data.people.P06.name,reason:'ok',acknowledged:true}), /RESCHEDULE_DECISION_REQUIRED/);
  session.setViewer('P01'); session.createRescheduleDecision();
  assert.equal(project('P01').rescheduleStage,'awaitingCustomerAuthorization');
  assert.equal(project('P01').committedFees,0);
  session.setViewer('P07'); assert.throws(() => session.confirmReschedule(), /RESCHEDULE_AUTHORIZATION_REQUIRED/);
  session.setViewer('P05'); assert.throws(() => session.authorizeReschedule({signature:data.people.P06.name,reason:'ok',acknowledged:true}), /ROLE_NOT_ALLOWED/);
  session.setViewer('P06');
  assert.throws(() => session.authorizeReschedule({signature:'Ben Lewis',reason:'ok',acknowledged:true}), /INVALID_SIGNATURE/);
  assert.throws(() => session.authorizeReschedule({signature:data.people.P06.name,reason:' ',acknowledged:true}), /REASON_REQUIRED/);
  assert.throws(() => session.authorizeReschedule({signature:data.people.P06.name,reason:'ok',acknowledged:false}), /ACKNOWLEDGEMENT_REQUIRED/);
  session.authorizeReschedule({signature:data.people.P06.name,reason:'Authorize the quoted rescheduling scope separately.',acknowledged:true});
  assert.equal(project('P01').rescheduleStage,'awaitingWuXiConfirmation');
  assert.equal(project('P01').rescheduleAuthorized,true);
  assert.equal(project('P01').rescheduleConfirmed,false);
  assert.equal(project('P01').committedFees,0,'Elena authorization alone cannot commit a fee or confirm the alternative window');
  assert.equal(project('P01').rescheduleAuthorization.at,null,'No calendar timestamp exists for this new approval');
  assert.equal(project('P01').rescheduleAuthorization.timeStatus,'notScheduled');
  const authorizedRevision = session.getState().revision;
  session.authorizeReschedule({signature:data.people.P06.name,reason:'duplicate',acknowledged:true}); assert.equal(session.getState().revision,authorizedRevision);
  assert.throws(() => session.confirmReschedule(), /ROLE_NOT_ALLOWED/);
  session.setViewer('P07'); session.confirmReschedule();
  assert.equal(project('P01').rescheduleStage,'confirmed');
  assert.equal(project('P01').rescheduleConfirmed,true);
  assert.equal(project('P01').rescheduleConfirmation.candidateWindow,data.plans.B.window.at);
  assert.equal(project('P01').rescheduleFees,data.fees.reschedule);
  assert.equal(project('P01').resourceFees,0);
  assert.equal(project('P01').committedFees,data.fees.reschedule,'Only the separate rescheduling fee is committed');
  assert.equal(project('P01').forecastReassessmentRequired,true,'A confirmed alternative window cannot revive a previous delivery forecast');
  assert.equal(project('P01').resourceRejected,expectedOriginalFailure);
  if (expectedOriginalFailure) assert.equal(workflow.confirmations(data,session.getState()).find(item=>item.key==='schedule').status,'resourceUnavailable','Original A resource rejection remains distinct from Alex’s new B confirmation');
  const completedRevision = session.getState().revision; session.confirmReschedule(); assert.equal(session.getState().revision,completedRevision);
  assert.equal(session.getState().clock,frozenClock,'Unscheduled new steps cannot fabricate a clock or same-time approval');
  const ids = ['rescheduleRequested','rescheduleQuotePrepared','rescheduleQuoteReturned','rescheduleDecisionCreated','rescheduleAuthorized','rescheduleConfirmed'];
  const records = ids.map(id => session.getState().decision.audit.find(item=>item.id===id));
  for (let index=0; index<records.length; index++) {
    assert.equal(records[index].at,null); assert.equal(records[index].timeStatus,'notScheduled');
    if (index) assert.ok(records[index].sequence>records[index-1].sequence);
    assert.equal(session.getState().decision.audit.filter(item=>item.id===ids[index]).length,1);
  }
  for (const viewer of Object.keys(data.people)) {
    const tasks = workflow.tasks(data,session.getState(),viewer);
    for (const item of workflow.notifications(data,session.getState(),viewer)) {
      assert.ok(tasks.some(task=>task.key===item.taskKey));
      if (ids.includes(item.id.split(':')[0])) { assert.equal(item.at,null); assert.equal(item.timeStatus,'notScheduled'); assert.ok(item.sequence>0); }
    }
    for (const task of tasks.filter(task=>task.key.startsWith('reschedule'))) { assert.equal(task.event,null); assert.equal(task.timingKey,'notScheduled'); }
  }
}
finishRescheduling(s,false);

// A prior optional fallback never substitutes for this separately quoted,
// explicitly signed decision. Exercise both unchecked and checked scopes.
for (const fallback of [false,true]) {
  const a = core.createSession(data);
  a.selectPlan('A'); if (fallback) a.setFallback(true); a.saveDrafts(fixtures.drafts); a.confirmTasks();
  a.setViewer('P02'); a.startReview('technical'); a.setViewer('P03'); a.startReview('quality'); a.advanceNext();
  a.setViewer('P01'); a.assignSupport(); a.setViewer('P05'); a.acceptSupport(); a.advanceNext();
  a.setViewer('P01'); a.designateApprover(); a.advanceNext();
  a.setViewer('P02'); a.completeReview('technical',fixtures.reviewReasons.technical);
  a.setViewer('P03'); a.completeReview('quality',fixtures.reviewReasons.quality); a.advanceNext();
  a.setViewer('P06'); a.authorize({signature:data.people.P06.name,reason:fixtures.authorizationReason,acknowledged:true}); a.advanceNext();
  a.setViewer('P07'); a.startResourceReview(); a.advanceNext(); a.setViewer('P08'); a.respondScheduling({outcome:'unavailable',reason:fixtures.rejectionReason});
  a.setViewer('P07'); a.returnResourceReceipt(); a.requestReschedule();
  assert.equal(a.getState().decision.fallbackSelected,fallback);
  finishRescheduling(a,true);
}

s.setViewer('P01'); assert.equal(s.getState().clock,finalClock);
s.enterChapter('selection');
assert.equal(s.getState().decision,null);
assert.deepEqual(plain(s.getState().eventIds),[]);
assert.equal(s.getState().chapterSeeded,false);
assert.equal(s.getState().resetNotice,true);
s.enterChapter('prepublication');
s.reviewRiskDraft();
const reviewedDraft = s.getState().publication.reviewedAt;
s.saveRiskDraft({certainty:'underAssessment',nextUpdateEvent:'reviewsComplete'});
assert.equal(s.getState().publication.reviewedAt,reviewedDraft,'Saving unchanged draft fields keeps the explicit review');
s.saveRiskDraft({certainty:'potentialImpact',nextUpdateEvent:'reviewsComplete'});
assert.equal(s.getState().publication.reviewedAt,null,'Changed draft content requires a new explicit review');
assert.equal(s.getAdvanceInfo().blockKey,'reviewRiskDraft');
s.advanceTo('materialReady');
assert.throws(() => s.publishRisk(), /RISK_REVIEW_REQUIRED/);
s.reviewRiskDraft(); s.publishRisk();
assert.equal(JSON.stringify(data),originalData,'Phase5 never modifies frozen facts, dates, windows or fees');
console.log('WuXi checks passed: publication isolation, monotonic clock, explicit seeded chapters, role guards, distinct scheduling/receipt records, private outcome isolation, exact fee triggers, rejection and separate rescheduling quote/decision/signature/confirmation, untimed ordering, fallback isolation, B boundary and reset.');

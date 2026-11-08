import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = { Intl, Date };
for (const file of ['data','locales/en','locales/zh','locales/decision-en','locales/decision-zh','locales/brief-en','locales/brief-zh','core','workflow','brief']) vm.runInNewContext(readFileSync(new URL(`../src/${file}.js`,import.meta.url),'utf8'),context);
const {DEMO_DATA:data,DEMO_CORE:core,DEMO_WORKFLOW:workflow,DEMO_BRIEF:brief,DEMO_MESSAGES:messages}=context;
const original = JSON.stringify(data);
const fixtures={drafts:{technical:'Review technical scope.',quality:'Review quality evidence.',budget:'Review quote and outcomes.'},reviewReasons:{technical:'Accept.',quality:'Accept.'},authorizationReason:'Authorize scope.'};
const sign={signature:data.people.P06.name,reason:'Authorize the current reviewed scope.',acknowledged:true};
function pending() {
  const s=core.createSession(data);s.enterChapter('coverage',fixtures);
  s.setViewer('P01');s.assignSupport();s.setViewer('P05');s.acceptSupport();s.advanceTo('alternateAssigned');s.setViewer('P01');s.designateApprover();s.advanceTo('reviewsComplete');
  s.setViewer('P02');s.completeReview('technical','Technically acceptable.','approved');s.setViewer('P03');return s;
}
for(const outcome of ['rejected','needsInformation']) {
  const s=pending();
  assert.throws(()=>s.completeReview('quality','Not approved.'),/REVIEW_OUTCOME_REQUIRED/);
  s.completeReview('quality','Not approved. Additional quality evidence is required before this study can proceed.',outcome);
  const rejected=s.getState();
  assert.equal(workflow.project(data,rejected).reviewsComplete,true,'Submission and agreement are separate');
  assert.equal(workflow.project(data,rejected).reviewsApproved,false);
  assert.equal(workflow.confirmations(data,rejected).find(c=>c.key==='quality').status,outcome);
  assert.equal(s.getAdvanceInfo().blockKey,'resolveReviews');
  s.setViewer('P06');s.advanceTo('budgetAuthorized');
  assert.throws(()=>s.authorize(sign),/REVIEWS_NOT_APPROVED/,'Core guard blocks a direct authorization call, even at its scheduled time');
  s.setViewer('P01');
  for(const lang of ['en','zh']) {
    const b=brief.generate({data,core,state:s.getState(),text:messages[lang]});
    assert.match(b.content.split('\n')[0],lang==='en'?new RegExp(outcome==='rejected'?'QA: Disagree':'QA: More information required'):new RegExp(outcome==='rejected'?'QA：不同意':'QA：需要补充信息'));
    assert.ok(!b.content.includes(messages[lang].brief.prerequisitesComplete));
  }
  const b=brief.generate({data,core,state:s.getState(),text:messages.en});b.previewed=true;
  const attachment=brief.attach({brief:b,attachments:[],data,core,state:s.getState()});
  s.setViewer('P03');assert.throws(()=>s.resubmitReviews('New evidence'),/ROLE_NOT_ALLOWED/);
  s.setViewer('P01');assert.throws(()=>s.resubmitReviews(' ', 'evidence'),/SUPPLEMENT_REQUIRED/);
  const clock=s.getState().clock;s.resubmitReviews('Add quality evidence for the original study scope.', 'evidence');
  assert.equal(s.getState().clock,clock,'Revision cannot rewind or invent a new schedule');
  assert.equal(s.getState().decision.version,2);
  assert.equal(s.getState().decision.reviewHistory[0].reviews.quality.outcome,outcome);
  assert.equal(brief.currentAttachment([attachment],{state:s.getState()}),null,'A v1 brief is not an attachment to v2');
  assert.equal(brief.history([attachment],{state:s.getState(),requestKey:attachment.requestKey}).length,1,'V1 history remains read only and discoverable');
  assert.ok(brief.staleReasons(b,{data,state:s.getState()}).includes('business'));
  s.setViewer('P06');assert.throws(()=>s.authorize(sign),/REVIEWS_REQUIRED/);
  s.setViewer('P02');s.startReview('technical');s.completeReview('technical','The revised scope is acceptable.','approved');
  s.setViewer('P06');assert.throws(()=>s.authorize(sign),/REVIEWS_REQUIRED/,'V1 QA decision cannot be reused');
  s.setViewer('P03');s.startReview('quality');s.completeReview('quality','The additional evidence is sufficient.','approved');
  s.setViewer('P06');assert.throws(()=>s.authorize({...sign,briefAttachment:attachment}),/BRIEF_REQUEST_MISMATCH/);
  s.authorize(sign);
  const signed=s.getState().decision.authorization;
  assert.equal(signed.total,80000);
  assert.equal(signed.basis.request.version,2);
  assert.equal(signed.basis.request.key,core.mainRequestKey(s.getState().decision));
  assert.match(signed.basis.scope.reviewScope,/quality evidence/);
  assert.equal(workflow.project(data,s.getState()).authorized,true);
  s.setViewer('P01');assert.throws(()=>s.resubmitReviews('More changes'),/DECISION_LOCKED/);
}
const explicit=pending();explicit.completeReview('quality','Not approved is quoted here, but the selected result is Agree.','approved');
assert.equal(workflow.project(data,explicit.getState()).reviewsApproved,true,'Free text is never interpreted as an authorization outcome');
for(const chapter of ['authorization','hold','unavailable']) {
  const s=core.createSession(data);s.enterChapter(chapter,fixtures);
  assert.ok(Object.values(s.getState().decision.reviews).every(r=>r.outcome==='approved'&&r.requestVersion===1),'Seeded later chapters explicitly record Agree');
}
for (const lang of ['en','zh']) {
  const s=core.createSession(data);s.enterChapter('quality',fixtures);
  assert.equal(s.getState().decision.reviews.quality.outcome,null,'QA exception starts before an explicit outcome');
  const at=s.getState().clock;
  s.completeReview('quality',messages[lang].decision.qualityScenario.reason,'needsInformation');
  s.setViewer('P06');assert.throws(()=>s.authorize(sign),/REVIEWS_NOT_APPROVED/);
  s.setViewer('P01');
  const generated=brief.generate({data,core,state:s.getState(),text:messages[lang]});
  const firstSentence=generated.content.split('\n')[0].split(/[。]/)[0];
  assert.match(firstSentence,lang==='zh'?/授权受阻.*QA.*需要补充信息/:/Authorization is blocked.*QA.*More information required/);
  assert.equal(s.getState().clock,at);assert.equal(s.getState().decision.authorization,null);
}
assert.equal(JSON.stringify(data),original);
console.log('Review outcome checks passed: explicit outcomes, core authorization guard, bilingual blocked briefs, versioned resubmission, obsolete reviews and attachments, v2 signature scope and positive chapter fixtures.');

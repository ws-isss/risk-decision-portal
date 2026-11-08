import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c={Intl,Date};
for(const file of ['data','core','workflow','locales/en','locales/zh','locales/decision-en','locales/decision-zh','locales/brief-en','locales/brief-zh','brief']) vm.runInNewContext(readFileSync(new URL(`../src/${file}.js`,import.meta.url),'utf8'),c);
const {DEMO_DATA:d,DEMO_CORE:core,DEMO_WORKFLOW:w,DEMO_BRIEF:b,DEMO_MESSAGES:messages}=c;
const frozen=JSON.stringify(d),sign={signature:d.people.P06.name,reason:'Authorize reviewed request and quote.',acknowledged:true};
function created(plan='A') {const s=core.createSession(d);s.selectPlan(plan);s.saveDrafts({technical:'Review scope.',quality:'Review evidence.',budget:'Review quote.'});s.confirmTasks();s.assignSupport();s.designateApprover();s.setViewer('P05');s.acceptSupport();return s;}
function begin(s) {s.setViewer('P02');s.startReview('technical');s.setViewer('P03');s.startReview('quality');}
function agree(s) {for(const [kind,role] of [['technical','P02'],['quality','P03']]){s.setViewer(role);s.completeReview(kind,'Evidence supports original scope.','approved');}}
function brief(s,lang='en'){s.setViewer('P01');return b.generate({data:d,core,state:s.getState(),text:messages[lang]}).content;}
const unselected=core.createSession(d);assert.equal(w.outlook(d,unselected.getState()).baseline,true);assert.equal(w.outlook(d,unselected.getState()).window,d.plans.A.window.at);
for(const plan of ['A','B']) {
 const s=created(plan);begin(s);const o=w.outlook(d,s.getState());assert.equal(o.window,d.plans[plan].window.at);assert.equal(o.forecast.localDate,d.plans[plan].forecast.localDate);assert.equal(o.baseline,false);
 assert.equal(w.dashboard(d,s.getState()).window,o.window);
 for(const lang of ['en','zh']) assert.ok(brief(s,lang).includes(core.formatLocalDate(o.forecast.localDate,{locale:messages[lang].meta.locale})));
 s.advanceTo('reviewsComplete');agree(s);s.setViewer('P06');s.authorize(sign);
 assert.equal(w.outlook(d,s.getState()).forecast.localDate,o.forecast.localDate);
 for(const lang of ['en','zh']) assert.ok(brief(s,lang).includes(core.formatLocalDate(o.forecast.localDate,{locale:messages[lang].meta.locale})));
 if(plan==='B') {
  const main=s.getState().decision.authorization;assert.equal(main.total,d.fees.totals.B);
  const item=main.basis.scope.items.find(x=>x.feeKey==='reschedule');assert.equal(item.amount,d.fees.reschedule);
  assert.equal(main.basis.scope.items.reduce((n,x)=>n+x.amount,0),main.total);
  s.setViewer('P07');s.requestReschedule();assert.equal(w.outlook(d,s.getState()).forecast,null);
  s.advanceTo('rescheduleQuotePrepared');s.setViewer('P08');s.respondRescheduleQuote();s.setViewer('P07');s.returnRescheduleQuote();s.setViewer('P01');s.createRescheduleDecision();s.setViewer('P06');s.authorizeReschedule(sign);
  assert.equal(s.getState().decision.authorization.total,main.total);assert.equal(w.project(d,s.getState()).committedFees,0);
  s.advanceTo('rescheduleConfirmed');s.setViewer('P07');s.confirmReschedule();s.confirmReschedule();
  assert.equal(w.project(d,s.getState()).committedFees,item.amount,'Original B fee occurs once, not an extra authorization total');
  const final=w.outlook(d,s.getState());assert.equal(final.window,d.plans.B.window.at);assert.equal(final.windowStatus,'confirmedWindow');assert.equal(final.forecast,null);
  for(const lang of ['en','zh']){const content=brief(s,lang);assert.ok(!content.includes(core.formatLocalDate(d.plans.B.forecast.localDate,{locale:messages[lang].meta.locale})));}
 }
}
const req=core.createSession(d);
for(const id of Object.keys(d.people).filter(id=>id!=='P01')) {req.setViewer(id);const before=JSON.stringify(req.getState());assert.throws(()=>req.setRequirement({needByLocalDate:'2027-03-20'}),/ROLE_NOT_ALLOWED/);assert.equal(JSON.stringify(req.getState()),before);}
req.setViewer('P01');for(const field of ['deliverableOverride','destinationOverride']) assert.throws(()=>req.setRequirement({needByLocalDate:'2027-03-20',[field]:'Changed scope'}),/REQUIREMENT_SCOPE_FIXED/);
req.setRequirement({needByLocalDate:'2027-03-20'});assert.equal(req.getState().needByLocalDate,'2027-03-20');assert.equal(w.outlook(d,req.getState()).forecast.localDate,d.plans.A.forecast.localDate);
for(const kind of ['technical','quality']) for(const outcome of ['needsInformation','rejected']) {
 const s=created();s.setViewer(kind==='quality'?'P03':'P02');assert.throws(()=>s.completeReview(kind,'Missing evidence.',outcome),/REVIEW_NOT_STARTED/);begin(s);s.setViewer(kind==='quality'?'P03':'P02');s.completeReview(kind,'Missing recovery evidence.',outcome);
 assert.equal(s.getState().clock,d.initialClock);s.setViewer('P06');assert.throws(()=>s.authorize(sign),/REVIEWS_REQUIRED|REVIEWS_NOT_APPROVED/);
 s.setViewer('P01');assert.throws(()=>s.resubmitReviews('Evidence'),/RESUBMISSION_MODE_REQUIRED/);
 s.setResubmissionIntent('scopeChange');const v1=s.getState().decision.version;
 assert.throws(()=>s.resubmitReviews('Changed scope.','scopeChange'),/SCOPE_REASSESSMENT_REQUIRED/);assert.throws(()=>s.resubmitReviews('Evidence','evidence'),/SCOPE_REASSESSMENT_REQUIRED/);assert.equal(s.getState().decision.version,v1);
 assert.equal(w.dashboard(d,s.getState()).groups[0].blocked,true);
 for(const lang of ['en','zh']) assert.ok(brief(s,lang).includes(messages[lang].decision.reviewFlow.scopeNext));
 s.setResubmissionIntent('evidence');s.resubmitReviews('Recovery evidence within original study scope.','evidence');assert.equal(s.getState().decision.version,2);assert.equal(s.getState().clock,d.initialClock);begin(s);
 for(const [review,role] of [['technical','P02'],['quality','P03']]) {s.setViewer(role);assert.throws(()=>s.completeReview(review,'Agree.','approved'),/TOO_EARLY/);}
 s.setViewer('P06');assert.throws(()=>s.authorize(sign),/REVIEWS_REQUIRED/);assert.equal(w.project(d,s.getState()).authorized,false);
 assert.equal(w.project(d,s.getState()).records.startQuality.completionTiming.at,d.events.reviewsComplete.at);
 assert.equal(s.getAdvanceInfo().nextEvent,'reviewsComplete');s.advanceNext();agree(s);s.setViewer('P06');s.authorize(sign);assert.equal(w.project(d,s.getState()).authorized,true);
}
assert.equal(JSON.stringify(d),frozen);
console.log('Five-fix checks passed: shared A/B/current milestones and briefs, date-only permission, scope-change blocking, same-day v2 approval guard, original B fee inclusion and exact-once charging.');

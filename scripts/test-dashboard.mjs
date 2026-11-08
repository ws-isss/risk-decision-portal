import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c={Intl,Date};for(const name of ['data','core','workflow','locales/en','locales/zh','locales/decision-en','locales/decision-zh','locales/portal-en','locales/portal-zh','locales/tour-en','locales/tour-zh','dashboard-view']) vm.runInNewContext(readFileSync(new URL(`../src/${name}.js`,import.meta.url),'utf8'),c);
const {DEMO_DATA:d,DEMO_CORE:core,DEMO_WORKFLOW:w}=c,s=core.createSession(d),f={drafts:{technical:'Review.',quality:'Review.',budget:'Review.'},reviewReasons:{technical:'Agree.',quality:'Agree.'},authorizationReason:'Authorize.',resourceReason:'Held.'};
const model=()=>w.dashboard(d,s.getState()),counts=()=>model().groups.map(g=>g.count).join(',');
assert.equal(counts(),'1,0,0');assert.equal(model().showOptions,true);
s.selectPlan('A');s.saveDrafts(f.drafts);s.confirmTasks();assert.equal(counts(),'1,2,0');
s.enterTourAct(2,f);assert.equal(counts(),'1,0,0');s.setViewer('P06');s.authorize({signature:d.people.P06.name,reason:'Authorize.',acknowledged:true});
assert.equal(model().showOptions,false);assert.equal(counts(),'0,0,1');assert.ok(!model().timings.some(t=>t.label==='authorization'));
s.enterTourAct(3,f);assert.equal(counts(),'0,0,1');assert.equal(model().view.resourceConfirmed,false);
s.returnResourceReceipt();assert.equal(counts(),'0,0,0');assert.equal(model().timings.map(t=>t.label).join(','),'holdExpiry,firstResults');assert.equal(model().timings[0].at,d.plans.A.holdUntil);
s.enterChapter('unavailable',f);s.respondScheduling({outcome:'unavailable',reason:'Slots unavailable.'});s.setViewer('P07');s.returnResourceReceipt();assert.equal(model().forecast,null);assert.equal(model().timings[0].label,'expectedResponse');assert.equal(counts(),'0,0,1');
s.requestReschedule();s.advanceNext();s.setViewer('P08');s.respondRescheduleQuote();s.setViewer('P07');s.returnRescheduleQuote();assert.equal(counts(),'1,0,0');assert.equal(model().timings[0].label,'customerActionDue');
s.enterChapter('quality',f);s.completeReview('quality','Need evidence.','needsInformation');assert.equal(counts(),'1,0,0');assert.equal(model().view.reviewBlockers.length,1);assert.equal(model().blockerOwner,'P01');assert.equal(model().groups[0].blocked,true);
console.log('Dashboard checks passed: actionable counts, authorization versus client confirmation, effective times, invalidated delivery and QA blockers share canonical records.');

const summary=(session,lang)=>c.DEMO_DASHBOARD_VIEW.impactSummary({data:d,core,state:session.getState(),text:c.DEMO_MESSAGES[lang]});
for(const lang of ['en','zh']) {
 const x=core.createSession(d),texts=c.DEMO_MESSAGES[lang].dashboard.impact;
 const get=key=>summary(x,lang).rows.find(r=>r.key===key).text;
 assert.equal(summary(x,lang).rows.length,3);assert.equal(summary(x,lang).rows[0].key,'decision');
 assert.match(get('delivery'),/8/);assert.match(get('delivery'),/34/);assert.match(get('decision'),/80,000/);assert.match(get('decision'),/40,000/);assert.match(get('resource'),new RegExp(String(d.plans.B.queueWorkdays)));
 x.setViewer('P07');assert.equal(summary(x,lang).rows[0].key,'resource');x.setViewer('P01');
 x.selectPlan('B');assert.equal(summary(x,lang).planIds.join(','),'B');assert.ok(!get('resource').includes('A:')&&!get('resource').includes('A：'));
 x.setRequirement({needByLocalDate:d.plans.B.forecast.localDate});assert.ok(get('delivery').includes(texts.onTime));
 x.enterChapter('hold',f);x.startResourceReview();x.advanceNext();x.setViewer('P01');const before=JSON.stringify(summary(x,lang));
 x.setViewer('P08');x.respondScheduling({outcome:'held',reason:'Resource slots held.'});assert.match(get('resource'),/Mei/);
 x.setViewer('P01');assert.equal(JSON.stringify(summary(x,lang)),before,'Customer must not see internal hold before Alex returns it');
 x.setViewer('P07');x.returnResourceReceipt();x.setViewer('P01');assert.equal(get('decision'),texts.heldNext);assert.ok(get('resource').includes(core.formatInstant(d.plans.A.holdUntil,d.calendars.base.timezone,{locale:c.DEMO_MESSAGES[lang].meta.locale})));
 x.enterChapter('unavailable',f);x.setViewer('P01');const beforeReject=JSON.stringify(summary(x,lang));x.setViewer('P08');x.respondScheduling({outcome:'unavailable',reason:'No slots.'});x.setViewer('P01');assert.equal(JSON.stringify(summary(x,lang)),beforeReject,'Internal refusal also remains private');
 x.setViewer('P07');x.returnResourceReceipt();assert.ok(!get('delivery').includes('8'));
 x.enterChapter('quality',f);x.completeReview('quality','Need evidence.','needsInformation');assert.match(get('decision'),/QA/);assert.ok(summary(x,lang).blockerNext.includes('Emma'));
 x.setViewer('P01');x.setResubmissionIntent('scopeChange');assert.ok(summary(x,lang).blockerNext.includes('Alex'));
}
console.log('Impact summary checks passed: three role-ordered rows, selected-only scope, live need-date gaps, authorization and hold lifecycle, blockers, and no customer exposure of internal held/unavailable outcomes.');

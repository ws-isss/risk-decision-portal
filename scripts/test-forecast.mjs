import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c={Intl,Date};
for(const name of ['data','core','workflow','forecast-view']) vm.runInNewContext(readFileSync(new URL(`../src/${name}.js`,import.meta.url),'utf8'),c);
const {DEMO_DATA:d,DEMO_CORE:core,DEMO_FORECAST:chart}=c;
const frozen=JSON.stringify(d), s=core.createSession(d), model=()=>chart.model(d,s.getState());
const caption=chart.captionValues(d,{meta:{locale:'zh-CN'}});
assert.equal(caption.days,core.calendarGap(d.plans.B.forecast.localDate,d.plans.A.forecast.localDate));
assert.equal(caption.queue,d.plans.B.queueWorkdays);
assert.equal(caption.weeks,2);
assert.equal(caption.reportDate,'12月16日');assert.equal(caption.originalWindow,'1月4日');assert.equal(caption.candidateWindow,'2月15日');
const fixtures={drafts:{technical:'Review.',quality:'Review.',budget:'Review.'},reviewReasons:{technical:'Agree.',quality:'Agree.'},authorizationReason:'Authorize.',resourceReason:'Held.'};
for(const row of model().rows){
 const p=d.plans[row.id];
 assert.equal(row.phases.length,4);
 for(let i=1;i<4;i++) assert.equal(row.phases[i-1].end,row.phases[i].start,'Every handoff is continuous, including nights and non-working days');
 assert.equal(row.phases[1].end,p.stages.find(s=>s.id==='windowUseConfirmation').end);
 assert.equal(row.phases[2].end,p.window.at);
 assert.equal(row.phases[3].end,p.forecast.delivery);
 assert.equal(row.forecast,p.forecast);
 assert.equal(row.gap,core.calendarGap(s.getState().needByLocalDate,p.forecast.localDate));
 assert.equal(row.waitStart,p.stages.find(s=>s.id==='windowWait').start);
}
assert.equal(model().rows[0].phases[0].start,model().rows[0].phases[0].end,'A has no extra resource queue');
assert.equal(model().markers[0].status,'proposedHold');
for(const date of ['2026-08-05','2027-07-19','2030-10-25']){
 s.setRequirement({needByLocalDate:date,deliverableOverride:'',destinationOverride:''});
 const m=model(),need=Date.parse(m.markers[2].at);
 assert.ok(m.start<=need && m.end>need,'Axis includes the changed requirement');
 assert.ok(m.ticks.length<=6);
 assert.equal(m.rows[0].forecast.delivery,d.plans.A.forecast.delivery);
 assert.equal(m.rows[1].gap,core.calendarGap(date,d.plans.B.forecast.localDate));
 assert.equal(m.rows[0].gap-m.rows[1].gap,caption.days,'B versus A difference remains consistent with both need-date gaps');
}
s.enterChapter('hold',fixtures);s.startResourceReview();s.advanceNext();s.setViewer('P08');s.respondScheduling({outcome:'held',reason:'Held.'});
assert.equal(model().markers[0].status,'proposedHold','Internal Mei confirmation is not yet the customer receipt');
s.setViewer('P07');s.returnResourceReceipt();
assert.equal(model().markers[0].status,'heldUntil');assert.equal(model().rows[0].held,true);
s.enterChapter('unavailable',fixtures);s.respondScheduling({outcome:'unavailable',reason:'No slot.'});s.setViewer('P07');s.returnResourceReceipt();
assert.equal(model().markers[0].status,'invalidHold');
for(const row of model().rows){assert.equal(row.forecast,null);assert.equal(row.gap,null);assert.ok(row.phases.every(p=>p.id!==4),'No old delivery endpoint in the plotted model');}
assert.equal(JSON.stringify(d),frozen);
console.log('Forecast timeline checks passed: canonical dates/gaps, complete handoffs, zero queue, adaptive axis, receipt-gated hold and removal of invalid delivery endpoints.');

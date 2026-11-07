import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { Intl, Date };
for (const file of ['src/data.js', 'src/core.js', 'src/workflow.js', 'src/locales/en.js', 'src/locales/brief-en.js', 'src/brief.js', 'src/brief-view.js']) vm.runInNewContext(readFileSync(path.join(root, file), 'utf8'), context);
const { DEMO_DATA: data, DEMO_CORE: core, DEMO_BRIEF: briefModel, DEMO_BRIEF_VIEW: briefView } = context;
const text = context.DEMO_MESSAGES.en;
const plain = value => JSON.parse(JSON.stringify(value));
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const originalData = JSON.stringify(data);
const session = core.createSession(data);
const fixtures = {
  drafts: { technical: 'Review SEC-001 and the study plan.', quality: 'Review the study quality criteria.', budget: 'Review both opinions and the final quote.' },
  reviewReasons: { technical: 'The study scope is acceptable.', quality: 'The proposed evidence is sufficient for the study.' },
  authorizationReason: 'Approve the defined study and resource scope.'
};
const checked = new Map();
const generate = (s = session) => {
  const brief = briefModel.generate({ data, core, state: s.getState(), text });
  const words = briefModel.wordCount(brief, text);
  assert.ok(words >= 150 && words <= 200, `${brief.statusKey}: ${words} recipient words, expected 150–200`);
  checked.set(brief.statusKey,words);
  const copied = briefModel.copyText(brief,text);
  assert.match(brief.content,/^\*\*[^\n]+\*\*\n\n\|/,'The first line is a bold state-specific summary, followed directly by the options table');
  assert.equal(brief.content.split('\n').filter(line => line.startsWith('- ')).length,3,'At most three unresolved items');
  assert.equal((copied.match(/case design assumption/gi)||[]).length,1);
  assert.equal((copied.match(/not a delivery commitment/gi)||[]).length,1);
  assert.equal(copied.includes('**'),false,'Plain clipboard does not expose Markdown markers');
  assert.ok(copied.startsWith(briefModel.plainText(brief.content).split('\n')[0]),'Captured metadata must not precede the state-specific summary');
  assert.equal(brief.content.includes('Historical comparison'),false);
  return brief;
};
const stale = brief => plain(briefModel.staleReasons(brief, { data, state: session.getState() }));
const firstLine = brief => briefModel.copyText(brief,text).split('\n')[0];
const noOldComparison = brief => {
  for(const value of ['$80,000','$40,000','Mar 11, 2027','Apr 22, 2027']) assert.equal(brief.content.includes(value),false,`Current reassessment brief must omit previous ${value}`);
};
let brief = generate();
assert.equal(brief.statusKey,'beforeAuthorization');
for (const value of ['$80,000','$40,000','2.8%','2.0%','8 days early','34 days late','Mar 11, 2027','Apr 22, 2027']) assert.ok(brief.content.includes(value),`Initial data-derived value ${value}`);
assert.match(firstLine(brief),/Decide.*\$80,000.*\$40,000.*Nov 13, 2026, 5:00 PM ET/);
assert.equal(brief.generatedAt,data.initialClock);
assert.deepEqual(plain(brief.metadata.sourceVersions),['SEC-001 v1','EXP-001 v1','Q-A v1','Q-B v1']);
assert.deepEqual(stale(brief),[]);
for (const viewer of ['P02','P03','P04','P05','P06','P07','P08']) {
  session.setViewer(viewer);
  assert.throws(generate,/ROLE_NOT_ALLOWED/);
  assert.deepEqual(stale(brief),[],'Role switching does not change shareable records');
  const html=briefView.render({brief,state:session.getState(),text,helpers:{escape}});
  assert.equal(html,'','Generated and edited drafts remain private to Emma, including when Elena is the viewer');
}
session.setViewer('P01');session.advanceTo('backupAssigned');
assert.deepEqual(stale(brief),[],'Time alone does not create an outcome');
session.setRequirement({needByLocalDate:'2027-03-20',deliverableOverride:'Released drug substance',destinationOverride:'Customer receiving site'});
assert.deepEqual(stale(brief),['requirement']);
const oldText=briefModel.copyText(brief,text);
const edited={...brief,content:brief.content+'\n\nEmma’s note: coordinate with the study team.',edited:true};
assert.ok(briefModel.copyText(edited,text).includes('Emma’s note'));
assert.equal(briefModel.copyText(brief,text),oldText,'Detecting changes preserves the earlier content and captured metadata');
const updated=generate();
assert.ok(updated.content.includes('9 days early'));
assert.ok(updated.content.includes('33 days late'));
assert.ok(updated.content.includes('Customer receiving site'));
const modifiedData=plain(data);modifiedData.reports['SEC-001'].version++;
assert.ok(briefModel.staleReasons(brief,{data:modifiedData,state:session.getState()}).includes('sources'));
for(const eventId of ['resourceReviewStart','rescheduleDecisionDue','rescheduleAuthorizationDue']) {
  const changedTiming=plain(data);changedTiming.events[eventId].at=data.events.resourceConfirmed.at;
  assert.ok(briefModel.staleReasons(brief,{data:changedTiming,state:session.getState()}).includes('sources'),`Changing ${eventId} invalidates the captured timing source`);
}
assert.ok(briefModel.copyText(brief,text).includes('SEC-001 v1'));
assert.equal(briefModel.copyText(brief,text).includes('SEC-001 v2'),false);

session.enterChapter('selection');session.selectPlan('A');
assert.match(firstLine(generate()),/Authorize selected option A.*\$80,000.*Nov 13/);
session.setFallback(true);
assert.match(firstLine(generate()),/\$80,000.*\$10,000.*\$90,000.*Nov 13/);
session.selectPlan('B');session.saveDrafts(fixtures.drafts);session.confirmTasks();
assert.match(firstLine(generate()),/Authorize selected option B.*\$40,000/,'A locked selected request asks for authorization, not a new A/B choice');
session.enterChapter('prepublication');session.setViewer('P01');
assert.throws(generate,/UNPUBLISHED_RISK/);
assert.equal(briefView.render({brief,state:session.getState(),text,helpers:{}}),'');
assert.ok(stale(brief).includes('publication'));

session.enterChapter('hold',fixtures);session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'authorized');
assert.match(firstLine(brief),/authorized up to \$80,000/);
assert.equal(brief.content.includes('$50,000'),false);
session.setViewer('P07');session.startResourceReview();session.advanceNext();session.setViewer('P01');brief=generate();
const internalBaseline=JSON.stringify(brief.snapshot);
session.setViewer('P08');session.respondScheduling({outcome:'held',reason:'Internal private resource details.'});
assert.equal(JSON.stringify(briefModel.fingerprint({data,state:session.getState()})),internalBaseline);
session.setViewer('P01');assert.equal(generate().statusKey,'authorized');
session.setViewer('P07');session.returnResourceReceipt();assert.ok(stale(brief).includes('business'));
session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'held');
assert.match(firstLine(brief),/Coordination complete.*Dec 9, 2026, 5:00 PM Shanghai.*Next decision: process readiness/);
assert.equal(/please approve|must authorize|authorize selected/i.test(firstLine(brief)),false);
assert.ok(brief.content.includes('$80,000 authorized; $50,000 incurred'));
for(const old of ['$40,000','Apr 22, 2027','34 days late'])assert.equal(brief.content.includes(old),false,'Unselected B is not a live comparison after successful hold');
assert.ok(brief.content.includes('first-round analysis expected Nov 25, 2026, 5:00 PM Shanghai'));
assert.deepEqual(plain(brief.metadata.sourceVersions),['SEC-001 v1','EXP-001 v1','Q-A v1']);

session.enterChapter('unavailable',fixtures);session.respondScheduling({outcome:'unavailable',reason:'The planned expedited experiment and analysis slots are unavailable.'});
session.setViewer('P07');session.returnResourceReceipt();session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'unavailable');noOldComparison(brief);
assert.ok(brief.content.includes('expedited experiment and analysis slots are unavailable'));
assert.equal(brief.content.includes('$10,000'),false,'No unreturned quotation leaks into the brief');
assert.equal(brief.content.includes('Feb 15, 2027'),false);
assert.ok(brief.content.includes('Nov 17, 2026, 5:00 PM Shanghai'));
session.setViewer('P07');session.advanceTo('rescheduleRequested');session.requestReschedule();session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'awaitingWuXiQuote');noOldComparison(brief);
const quoteBaseline=JSON.stringify(brief.snapshot);
session.setViewer('P08');session.advanceTo('rescheduleQuotePrepared');session.respondRescheduleQuote();
assert.equal(JSON.stringify(briefModel.fingerprint({data,state:session.getState()})),quoteBaseline);
session.setViewer('P01');assert.equal(generate().content.includes('$10,000'),false);
session.setViewer('P07');session.advanceTo('rescheduleQuoteReturned');session.returnRescheduleQuote();assert.ok(stale(brief).includes('business'));
session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'awaitingCustomerDecision');noOldComparison(brief);
assert.match(firstLine(brief),/\$10,000.*Nov 17, 2026, 11:00 AM ET/);
assert.ok(brief.content.includes('Feb 15, 2027'));
assert.ok(brief.content.includes('rescheduling quoted'));
assert.ok(brief.content.includes('Customer action due: Emma'));
session.advanceTo('rescheduleDecisionCreated');session.createRescheduleDecision();brief=generate();
assert.equal(brief.statusKey,'awaitingCustomerAuthorization');noOldComparison(brief);
assert.match(firstLine(brief),/Elena.*\$10,000.*Nov 19, 2026, 5:00 PM ET/);
session.setViewer('P06');session.advanceTo('rescheduleAuthorized');session.authorizeReschedule({signature:data.people.P06.name,reason:'Approve the quoted rescheduling scope.',acknowledged:true});
session.setViewer('P01');brief=generate();assert.equal(brief.statusKey,'awaitingWuXiConfirmation');noOldComparison(brief);
assert.ok(brief.content.includes('No rescheduling fee is incurred yet'));
assert.ok(brief.content.includes('Nov 20, 2026, 5:00 PM Shanghai'));
session.setViewer('P07');session.advanceTo('rescheduleConfirmed');session.confirmReschedule();session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'confirmed');noOldComparison(brief);
assert.match(firstLine(brief),/new window is confirmed for Feb 15, 2027.*\$10,000.*incurred.*under assessment/);
assert.equal(/please approve|must authorize|authorize selected/i.test(firstLine(brief)),false);
assert.ok(brief.content.includes('Nov 23, 2026, 5:00 PM Shanghai'));
assert.ok(brief.content.includes('technical reassessment status update'));
assert.equal(brief.generatedAt,data.events.rescheduleConfirmed.at);
assert.deepEqual(plain(brief.metadata.sourceVersions),['SEC-001 v1','EXP-001 v1','Q-B v1']);

function authorizedSession(plan,fallback=false) {
  const s=core.createSession(data);s.selectPlan(plan);if(fallback)s.setFallback(true);s.saveDrafts(fixtures.drafts);s.confirmTasks();
  s.setViewer('P02');s.startReview('technical');s.setViewer('P03');s.startReview('quality');s.advanceNext();s.setViewer('P01');s.assignSupport();s.setViewer('P05');s.acceptSupport();s.advanceNext();s.setViewer('P01');s.designateApprover();s.advanceNext();s.setViewer('P02');s.completeReview('technical','Accept scope.');s.setViewer('P03');s.completeReview('quality','Accept scope.');s.advanceNext();s.setViewer('P06');s.authorize({signature:data.people.P06.name,reason:'Accept scope.',acknowledged:true});s.setViewer('P01');return s;
}
// Completion comes from explicit shared records, not the phase label or clock.
// Exercise all prerequisite combinations, including an early brief that still
// lacks approver designation after both study-scope opinions are available.
for (const [plan, withFallback] of [['A',false],['A',true],['B',false]]) {
  const completedState = plain(authorizedSession(plan,withFallback).getState());
  for (let mask = 0; mask < 8; mask++) {
    const state = plain(completedState);
    const missing = [];
    const remove = new Set(['budgetAuthorized']);
    state.decision.authorization = null;
    for (const [bit,kind] of [[1,'technical'],[2,'quality']]) {
      if (!(mask & bit)) {
        state.decision.reviews[kind].status = 'inProgress';
        state.decision.reviews[kind].completedAt = null;
        remove.add(kind+'Completed');remove.add('reviewsComplete');
        missing.push(text.brief.prerequisites[kind]);
      }
    }
    if (!(mask & 4)) {
      state.decision.approver = {id:null,designatedAt:null};
      remove.add('alternateAssigned');missing.push(text.brief.prerequisites.approver);
    }
    state.eventIds = state.eventIds.filter(id => !remove.has(id));
    state.decision.audit = state.decision.audit.filter(item => !remove.has(item.id));
    const currentBrief = generate({getState:()=>state});
    assert.doesNotMatch(firstLine(currentBrief),/opinions must be recorded/);
    if (missing.length) {
      assert.ok(currentBrief.content.includes(`Pending before authorization: ${missing.join('; ')}.`),`Only outstanding prerequisites: ${plan}, fallback ${withFallback}, mask ${mask}`);
      assert.equal(currentBrief.content.includes(text.brief.prerequisitesComplete),false);
    } else {
      assert.ok(currentBrief.content.includes(text.brief.prerequisitesComplete));
      assert.equal(currentBrief.content.includes('Pending before authorization:'),false);
    }
    if ((mask & 3) === 3) {
      const expected = plan === 'B'
        ? /If authorized by Nov 13, 2026, 5:00 PM ET, Alex Lin’s resource assessment and rescheduling quote are expected Nov 17, 2026, 5:00 PM Shanghai; no window is guaranteed/
        : /If authorized by Nov 13, 2026, 9:00 AM Shanghai \(Nov 12, 2026, 8:00 PM ET\), Alex Lin’s resource assessment result is expected Nov 13, 2026, 5:00 PM Shanghai; a hold is not guaranteed/;
      assert.match(currentBrief.content,expected);
      const responseEvent = plan === 'B' ? 'rescheduleQuoteReturned' : 'resourceConfirmed';
      const authorizationEvent = plan === 'B' ? 'latestAuthorization' : 'resourceReviewStart';
      assert.ok(Date.parse(data.events[responseEvent].at)>Date.parse(data.events[authorizationEvent].at),'The conditional resource reply follows the specified authorization time');
    }
    assert.deepEqual(plain(briefModel.staleReasons(currentBrief,{data,state:{...state,clock:data.events.latestAuthorization.at}})),[],'Clock advancement alone does not complete a prerequisite');
    if (mask === 3) {
      const designated = plain(state);
      designated.decision.approver = plain(completedState.decision.approver);
      designated.eventIds.push('alternateAssigned');
      designated.decision.audit.push(plain(completedState.decision.audit.find(item=>item.id==='alternateAssigned')));
      const before = currentBrief.content;
      assert.deepEqual(plain(briefModel.staleReasons(currentBrief,{data,state:designated})),['business'],'Designation invalidates the earlier pending-prerequisite brief');
      assert.equal(currentBrief.content,before,'Staleness never overwrites the earlier brief');
    }
  }
}
const fallback=authorizedSession('A',true);
assert.match(firstLine(generate(fallback)),/\$90,000.*\$10,000/);
assert.match(generate(fallback).content,/Alex Lin’s resource assessment result is expected Nov 13, 2026, 5:00 PM Shanghai; a hold is not guaranteed/);
assert.equal(generate(fallback).content.includes('Pending before authorization:'),false);
fallback.advanceNext();fallback.setViewer('P07');fallback.startResourceReview();fallback.advanceNext();fallback.setViewer('P08');fallback.respondScheduling({outcome:'held',reason:'Confirmed scope.'});fallback.setViewer('P07');fallback.returnResourceReceipt();fallback.setViewer('P01');
const heldFallback=generate(fallback);assert.ok(heldFallback.content.includes('separate $10,000 fallback cap'));
const directB=authorizedSession('B');assert.match(firstLine(generate(directB)),/Option B.*\$40,000/);
assert.ok(generate(directB).content.includes('Nov 17, 2026, 5:00 PM Shanghai'),'B retains its quote-response date after authorization');
directB.setViewer('P07');directB.advanceTo('rescheduleRequested');directB.requestReschedule();directB.setViewer('P01');const directBBrief=generate(directB);
assert.ok(directBBrief.content.includes('Not selected'));
assert.equal(/unavailable|Closed/.test(directBBrief.content),false,'Selecting B does not invent a failed A scheduling attempt');
assert.equal(directBBrief.content.includes('$10,000'),false,'The old B comparison is not a newly returned rescheduling quote');

// Attachment records are an explicit, request-scoped publication boundary.
// Changing Emma's mutable workspace must never change Elena's frozen copy.
const attachmentSession=core.createSession(data);
let attachmentDraft=generate(attachmentSession);
const attach=(draft=attachmentDraft,attachments=[],state=attachmentSession.getState())=>briefModel.attach({brief:draft,attachments,data,core,state});
assert.equal(briefModel.requestKey({data,state:attachmentSession.getState()}),null);
assert.equal(briefModel.currentAttachment([],{data,state:attachmentSession.getState()}),null);
assert.throws(()=>attach({...attachmentDraft,previewed:true}),/DECISION_REQUIRED/);
attachmentSession.enterChapter('authorization',fixtures);attachmentSession.setViewer('P01');
attachmentDraft=generate(attachmentSession);
assert.throws(()=>attach(),/PREVIEW_REQUIRED/);
attachmentDraft.previewed=true;
const beforeAttach=JSON.stringify(attachmentSession.getState());
const privateBeforeAttach=JSON.stringify(attachmentDraft);
const v1=attach();
assert.equal(v1.requestKey,`main:${attachmentSession.getState().decision.createdAt}`);
assert.equal(v1.version,1);
assert.deepEqual(plain(v1.attachedBy),{id:'P01',name:data.people.P01.name});
assert.equal(v1.attachedAt,attachmentSession.getState().clock);
assert.equal(v1.attachedAtLabel,`${core.formatInstant(v1.attachedAt,data.baseline.timezone,{year:'numeric'})} ${text.common.easternTime}`);
assert.match(v1.attachedAtLabel,/ ET$/,'Attachment timestamps use the same ET display label as the rest of the portal');
assert.doesNotMatch(v1.attachedAtLabel,/\bE[SD]T\b/);
assert.equal(v1.brief.generatedAt,attachmentDraft.generatedAt,'Attachment keeps the captured data-as-of time');
assert.equal(JSON.stringify(attachmentSession.getState()),beforeAttach,'Attaching changes no approvals, tasks, events, fees or clock');
assert.equal(JSON.stringify(attachmentDraft),privateBeforeAttach,'Attaching leaves the private draft untouched');
for(const value of [v1,v1.attachedBy,v1.brief,v1.brief.snapshot,v1.brief.snapshot.business,v1.brief.metadata,v1.brief.metadata.sourceVersions])assert.ok(Object.isFrozen(value),'Every nested attachment field is frozen');
assert.throws(()=>{v1.brief.metadata.sourceVersions.push('Unexpected source');},/extensible|read only/);
const attachments=[v1];
assert.strictEqual(briefModel.currentAttachment(attachments,{data,state:attachmentSession.getState()}),v1);
assert.strictEqual(attach(attachmentDraft,attachments),v1,'Repeated attach returns the same version and does not append');
assert.strictEqual(attach({...attachmentDraft,edited:true},attachments),v1,'UI edit flags alone do not create another shared version');
assert.equal(attachments.length,1,'The model never mutates the attachment collection');
assert.ok(briefModel.isAttachedDraft(attachmentDraft,v1));
const frozenV1=JSON.stringify(v1);
const changedPlan=plain(attachmentSession.getState());changedPlan.decision.planId='B';
assert.ok(briefModel.staleReasons(v1.brief,{data,state:changedPlan}).includes('business'),'A plan change marks the attached version stale');
const changedAmount=plain(data);changedAmount.plans.A.total+=1;
assert.ok(briefModel.staleReasons(v1.brief,{data:changedAmount,state:attachmentSession.getState()}).includes('sources'),'An amount change marks the attached version stale');
const newlyAuthorized=authorizedSession('A').getState();
assert.ok(briefModel.staleReasons(v1.brief,{data,state:newlyAuthorized}).includes('business'),'Authorization changes the current state and marks the attachment stale');
attachmentDraft.content+='\n\nPrivate revision pending Emma’s preview.';
attachmentDraft.metadata.sourceVersions.push('Private editorial note');
attachmentDraft.edited=true;attachmentDraft.previewed=false;
assert.equal(JSON.stringify(v1),frozenV1,'Editing text and nested metadata cannot modify v1');
assert.deepEqual(plain(briefModel.staleReasons(v1.brief,{data,state:attachmentSession.getState()})),[],'Private edits do not mark an otherwise current attachment stale');
assert.equal(briefModel.isAttachedDraft(attachmentDraft,v1),false);
assert.throws(()=>attach(attachmentDraft,attachments),/PREVIEW_REQUIRED/,'An edited draft requires a new preview');
attachmentDraft.previewed=true;
const v2=attach(attachmentDraft,attachments);
assert.equal(v2.version,2);
assert.equal(v2.brief.content,attachmentDraft.content);
assert.equal(JSON.stringify(v1),frozenV1,'Reattaching creates v2 without mutating v1');
attachments.push(v2);
assert.strictEqual(briefModel.currentAttachment([v2,v1],{data,state:attachmentSession.getState()}),v2,'Latest version does not depend on storage order');
attachmentDraft=generate(attachmentSession);
assert.equal(JSON.stringify(v2.brief).includes('Private revision'),true,'Regeneration also leaves the existing attachment unchanged');
for(const role of ['P02','P03','P04','P05','P06','P07','P08']) {
  const state={...attachmentSession.getState(),viewer:role};
  assert.throws(()=>attach({...attachmentDraft,previewed:true},attachments,state),/ROLE_NOT_ALLOWED/);
}
attachmentSession.setRequirement({needByLocalDate:'2027-03-20'});
assert.deepEqual(plain(briefModel.staleReasons(v2.brief,{data,state:attachmentSession.getState()})),['requirement']);
assert.throws(()=>attach({...attachmentDraft,previewed:true},attachments),/STALE_BRIEF/,'An old snapshot cannot be republished as current');
assert.equal(JSON.stringify(v1),frozenV1,'Marking an attachment stale never rewrites its content');
attachmentDraft=generate(attachmentSession);attachmentDraft.previewed=true;
const v3=attach(attachmentDraft,attachments);assert.equal(v3.version,3);
const oldIdentity={...attachmentSession.getState(),decision:{...attachmentSession.getState().decision,createdAt:data.events.backupAssigned.at}};
assert.equal(briefModel.currentAttachment(attachments,{data,state:oldIdentity}),null,'A different request cannot inherit the prior request’s attachment');
assert.throws(()=>attach(attachmentDraft,attachments,oldIdentity),/STALE_BRIEF/,'A prior request’s draft cannot be silently relabelled for a new request');
const rescheduleState=session.getState();
assert.equal(briefModel.requestKey({data,state:rescheduleState}),`reschedule:${rescheduleState.decision.resource.rescheduleRequest.decision.at}`);
assert.equal(briefModel.currentAttachment(attachments,{data,state:rescheduleState}),null,'Rescheduling is a separate decision request');
const rescheduleDraft={...generate(),previewed:true};
const rescheduleAttachment=attach(rescheduleDraft,attachments,rescheduleState);
assert.equal(rescheduleAttachment.version,1,'Version numbering begins again within the new request');
assert.equal(JSON.stringify(v1),frozenV1,'The old request record remains unchanged');
attachmentSession.enterChapter('prepublication');attachmentSession.setViewer('P01');
assert.throws(()=>attach(attachmentDraft,attachments),/UNPUBLISHED_RISK/);

const editedPreview={...brief,content:'**Emma note** <script>unsafe()</script>\n\n| Cost | Scope |\n| --- | --- |\n| $10,000 | A \\| B |',edited:true};
let html=briefView.render({brief:editedPreview,state:session.getState(),text,helpers:{escape},preview:false});
assert.ok(html.includes('id="management-brief-editor"'));
assert.equal(html.includes('id="copy-management-brief"'),false);
assert.equal(html.includes('<script>unsafe()'),false);
html=briefView.render({brief:editedPreview,state:session.getState(),text,helpers:{escape},preview:true,staleReasons:['business']});
assert.ok(html.includes('<strong>Emma note</strong> &lt;script&gt;unsafe()&lt;/script&gt;'));
assert.ok(html.includes('brief-options-table'));
assert.ok(html.includes('>A | B</td>'));
assert.equal(briefModel.plainText(editedPreview.content),'Emma note <script>unsafe()</script>\n\nCost\tScope\n$10,000\tA | B');
assert.equal(briefModel.plainText('| ordinary | text |'),'| ordinary | text |','A pipe line without a valid delimiter row is not a table');
assert.ok(html.includes(text.brief.staleRecipient));
assert.ok(html.includes('id="management-brief-stale"'));
assert.ok(html.includes('id="copy-management-brief"'));
assert.equal(html.includes('id="generate-management-brief"'),false);
assert.ok(briefModel.copyText(editedPreview,text,{staleReasons:['business']}).includes(text.brief.staleRecipient));
const existingBrief=JSON.stringify(editedPreview);
const previewAttachment=briefModel.attach({brief:{...editedPreview,previewed:true},attachments:[],data,core,state:session.getState()});
session.setViewer('P06');
assert.equal(briefView.render({brief:editedPreview,state:session.getState(),text,helpers:{escape}}),'','Elena cannot read an unattached private draft');
html=briefView.render({brief:{...editedPreview,content:'Emma’s private next revision'},attachment:previewAttachment,state:session.getState(),text,helpers:{escape},preview:false,attachmentStaleReasons:['business'],copied:true});
assert.ok(html.includes('data-brief-readonly="true"'));
assert.ok(html.includes('data-brief-preview="true"'),'Elena always sees the frozen attachment rendering, not the private editor');
assert.ok(html.includes('<strong>Emma note</strong> &lt;script&gt;unsafe()&lt;/script&gt;'));
assert.ok(html.includes('>A | B</td>'));
assert.equal(html.includes('Emma’s private next revision'),false,'Elena never receives live draft changes');
assert.ok(html.includes(text.brief.authorizationBriefStale));
assert.ok(html.includes(text.brief.authorizationBriefStaleHint));
assert.ok(html.includes(text.brief.staleRecipient),'The captured attachment shows its current stale warning for Elena');
for(const control of ['<textarea','id="attach-management-brief"','id="edit-management-brief"','id="copy-management-brief"','id="preview-management-brief"','id="regenerate-management-brief"','id="management-brief-copied"'])assert.equal(html.includes(control),false,`Elena must not receive ${control}`);
assert.equal(JSON.stringify(editedPreview),existingBrief,'Viewing as Elena neither regenerates nor modifies Emma’s draft');
html=briefView.render({brief:editedPreview,attachment:previewAttachment,state:session.getState(),text,helpers:{escape}});
assert.equal(html.includes('id="management-brief-unreviewed"'),false);
session.enterChapter('prepublication');session.setViewer('P06');
assert.equal(briefView.render({brief:editedPreview,attachment:previewAttachment,state:session.getState(),text,helpers:{escape}}),'','Attached brief remains hidden before risk publication');
assert.equal(JSON.stringify(data),originalData,'Brief generation and copying never change scenario data');
console.log('Management brief checks passed: private drafts, frozen request-scoped attachments and versions, explicit preview/attach guards, stale attachment isolation; 150–200 recipient words across all states, quote privacy and safe formatted preview/copy.',Object.fromEntries(checked));

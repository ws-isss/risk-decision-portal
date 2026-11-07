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
const originalData = JSON.stringify(data);
const session = core.createSession(data);
const fixtures = {
  drafts: { technical: 'Review SEC-001 and the study plan.', quality: 'Review the study quality criteria.', budget: 'Review both opinions and the final quote.' },
  reviewReasons: { technical: 'The study scope is acceptable.', quality: 'The proposed evidence is sufficient for the study.' },
  authorizationReason: 'Approve the defined study and resource scope.'
};
const generate = () => briefModel.generate({ data, core, state: session.getState(), text });
const stale = brief => plain(briefModel.staleReasons(brief, { data, state: session.getState() }));

let brief = generate();
assert.equal(brief.statusKey, 'beforeAuthorization');
assert.equal(brief.generatedAt, data.initialClock);
for (const value of ['$80,000', '$40,000', '2.8%', '2.0%', '8 calendar days before', '34 calendar days after', 'Mar 11, 2027', 'Apr 22, 2027']) assert.ok(brief.content.includes(value), `The initial brief must include data-derived ${value}`);
assert.ok(brief.content.includes('Technical opinion: pending'));
assert.deepEqual(plain(brief.metadata.sourceVersions), ['SEC-001 v1','EXP-001 v1','Q-A v1','Q-B v1']);
assert.ok(brief.metadata.labels.includes('AI draft (simulated)'));
assert.deepEqual(stale(brief), []);

for (const viewer of ['P02','P03','P04','P05','P06','P07','P08']) {
  session.setViewer(viewer);
  assert.throws(generate, /ROLE_NOT_ALLOWED/);
  assert.deepEqual(stale(brief), [], 'Changing viewer does not change shareable facts');
  assert.equal(briefView.render({brief,state:session.getState(),text,helpers:{}}), '');
}
session.setViewer('P01');
session.advanceTo('backupAssigned');
assert.deepEqual(stale(brief), [], 'Time alone is not a new business record or an implicit receipt');
assert.equal(brief.generatedAt, data.initialClock, 'The draft retains its own data-as-of timestamp');
session.setRequirement({needByLocalDate:'2027-03-20',deliverableOverride:'Released drug substance',destinationOverride:'Customer receiving site'});
assert.deepEqual(stale(brief), ['requirement']);
const oldText = briefModel.copyText(brief,text);
const edited = { ...brief, content: brief.content + '\n\nEmma’s note: coordinate with the study team.', edited: true };
assert.deepEqual(stale(edited), ['requirement']);
assert.ok(briefModel.copyText(edited,text).includes('Emma’s note'));
assert.equal(briefModel.copyText(brief,text),oldText,'Stale detection does not overwrite text or protected metadata');
const updated = generate();
assert.ok(updated.content.includes('9 calendar days before'));
assert.ok(updated.content.includes('33 calendar days after'));
assert.ok(updated.content.includes('Customer receiving site'));
assert.equal(updated.content.includes('Emma’s note'),false,'Regeneration creates a separate draft for explicit UI replacement');

const modifiedData = plain(data);
modifiedData.reports['SEC-001'].version += 1;
assert.ok(briefModel.staleReasons(brief,{data:modifiedData,state:session.getState()}).includes('sources'));
assert.ok(briefModel.copyText(brief,text).includes('SEC-001 v1'));
assert.equal(briefModel.copyText(brief,text).includes('SEC-001 v2'),false,'Copying an older version must not relabel it with current source versions');

session.enterChapter('prepublication');
session.setViewer('P01');
assert.throws(generate,/UNPUBLISHED_RISK/);
assert.equal(briefView.render({brief,state:session.getState(),text,helpers:{}}),'');
assert.ok(stale(brief).includes('publication'));

session.enterChapter('hold',fixtures);
session.setViewer('P01');
brief = generate();
assert.equal(brief.statusKey,'authorized');
assert.ok(brief.content.includes('authorized up to $80,000'));
assert.ok(brief.content.includes('awaits WuXi’s named response'));
assert.equal(brief.content.includes('$50,000'),false,'No private fee outcome is published before Alex returns it');
session.setViewer('P07'); session.startResourceReview(); session.advanceNext();
session.setViewer('P01');
brief = generate();
const internalBaseline = JSON.stringify(brief.snapshot);
session.setViewer('P08');session.respondScheduling({outcome:'held',reason:'Internal resource details not returned yet.'});
assert.equal(JSON.stringify(briefModel.fingerprint({data,state:session.getState()})),internalBaseline,'Mei’s private scheduling response must not leak through staleness');
session.setViewer('P01');
assert.equal(generate().content.includes('Internal resource details'),false);
assert.equal(generate().statusKey,'authorized');
session.setViewer('P07');session.returnResourceReceipt();
assert.ok(stale(brief).includes('business'));
session.setViewer('P01');
brief=generate();
assert.equal(brief.statusKey,'held');
assert.ok(brief.content.includes('Dec 9, 2026, 5:00 PM Shanghai'));
assert.ok(brief.content.includes('$50,000'));
assert.ok(brief.content.includes('The aggregate issue is not resolved'));
assert.ok(brief.content.includes('Nov 25, 2026, 5:00 PM Shanghai'));
assert.equal(brief.content.includes('will return the resource / window response'),false,'A completed response cannot remain the next update');

session.enterChapter('unavailable',fixtures);
session.respondScheduling({outcome:'unavailable',reason:'The planned expedited experiment and analysis slots are unavailable.'});
session.setViewer('P07');session.returnResourceReceipt();session.setViewer('P01');
brief=generate();
assert.equal(brief.statusKey,'unavailable');
assert.ok(brief.content.includes('The planned expedited experiment and analysis slots are unavailable.'));
assert.ok(brief.content.includes('case design assumption'));
assert.ok(brief.content.includes('Historical comparison only'));
assert.ok(brief.content.includes('current forecast requires reassessment'));
assert.ok(brief.content.includes('Expected WuXi response: Alex'));
assert.ok(brief.content.includes('Nov 17, 2026, 5:00 PM Shanghai'));
assert.equal(/to be agreed|timing unassigned/i.test(briefModel.copyText(brief,text)), false);
assert.equal(brief.content.includes('No further window choice is required'),false);

session.setViewer('P07');session.advanceTo('rescheduleRequested');session.requestReschedule();session.setViewer('P01');
brief=generate();
assert.equal(brief.statusKey,'awaitingWuXiQuote');
const quoteBaseline=JSON.stringify(brief.snapshot);
session.setViewer('P08');session.advanceTo('rescheduleQuotePrepared');session.respondRescheduleQuote();
assert.equal(JSON.stringify(briefModel.fingerprint({data,state:session.getState()})),quoteBaseline,'The internal Mei quote cannot stale or leak into a client brief');
session.setViewer('P01');
assert.equal(generate().statusKey,'awaitingWuXiQuote');
assert.equal(generate().content.includes('Alex returned the candidate-window quote'),false);
session.setViewer('P07');session.advanceTo('rescheduleQuoteReturned');session.returnRescheduleQuote();
assert.ok(stale(brief).includes('business'));
session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'awaitingCustomerDecision');
assert.ok(brief.content.includes('quoted $10,000 rescheduling fee'));
assert.ok(brief.content.includes('Feb 15, 2027'));
assert.ok(brief.content.includes('No replacement window is confirmed or fee incurred'));
assert.equal(brief.metadata.sequenceNote,undefined);
assert.equal(brief.generatedAt,data.events.rescheduleQuoteReturned.at);
assert.ok(brief.content.includes('Customer action due: Emma'));
assert.ok(brief.content.includes('Nov 17, 2026, 11:00 AM ET'));
assert.equal(/to be agreed|timing unassigned/i.test(briefModel.copyText(brief,text)),false);
session.advanceTo('rescheduleDecisionCreated');session.createRescheduleDecision();brief=generate();
assert.equal(brief.statusKey,'awaitingCustomerAuthorization');
assert.ok(brief.content.includes('Elena must decide'));
assert.ok(brief.content.includes('Customer action due: Elena'));
assert.ok(brief.content.includes('Nov 19, 2026, 5:00 PM ET'));
assert.equal(brief.generatedAt,data.events.rescheduleDecisionCreated.at);
session.setViewer('P06');session.advanceTo('rescheduleAuthorized');session.authorizeReschedule({signature:data.people.P06.name,reason:'Approve the quoted rescheduling scope.',acknowledged:true});
session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'awaitingWuXiConfirmation');
assert.ok(brief.content.includes('Authorization alone does not incur the fee'));
assert.ok(brief.content.includes('Nov 20, 2026, 5:00 PM Shanghai'));
assert.equal(brief.generatedAt,data.events.rescheduleAuthorized.at);
session.setViewer('P07');session.advanceTo('rescheduleConfirmed');session.confirmReschedule();session.setViewer('P01');brief=generate();
assert.equal(brief.statusKey,'confirmed');
assert.ok(brief.content.includes('Nov 23, 2026, 5:00 PM Shanghai'));
assert.ok(brief.content.includes('status update, not a promised experimental result'));
assert.equal(brief.generatedAt,data.events.rescheduleConfirmed.at);
assert.ok(brief.content.includes('$10,000 rescheduling fee is now incurred'));
assert.ok(brief.content.includes('current forecast requires reassessment'));
assert.ok(brief.content.includes('does not inherit option B’s previous delivery estimate'));
assert.ok(briefModel.copyText(brief,text).split(/\s+/).length<=550,'Generated management brief remains concise enough for a one-page summary');

const escape = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const editedPreview={...brief,content:'Emma note <script>unsafe()</script>',edited:true};
let html=briefView.render({brief:editedPreview,state:session.getState(),text,helpers:{escape},preview:false});
assert.ok(html.includes('id="management-brief-editor"'));
assert.ok(!html.includes('id="copy-management-brief"'),'Copy is only offered in the recipient preview');
assert.ok(!html.includes('<script>unsafe()'));
html=briefView.render({brief:editedPreview,state:session.getState(),text,helpers:{escape},preview:true,staleReasons:['business']});
assert.ok(html.includes(escape(briefModel.copyText(editedPreview,text,{staleReasons:['business']}))),'Recipient preview and clipboard contain exactly the same text and protected metadata');
assert.ok(html.includes(text.brief.staleRecipient),'The recipient preview itself identifies an explicitly retained older version');
assert.ok(html.includes('id="management-brief-stale"'));
assert.ok(html.includes('id="copy-management-brief"'));
assert.ok(!html.includes('id="generate-management-brief"'),'Workspace does not duplicate page entry-button IDs');

assert.equal(JSON.stringify(data),originalData,'Generating, editing and copying briefs never alters frozen scenario data');
console.log('Management brief checks passed: role/publication guards, data-sourced facts and delivery gaps, state-specific content, private-outcome isolation, stale reasons, preserved edits/metadata, preview-copy parity and HTML escaping.');

# DaVinci delivery decisions — concept demo

When a development deviation threatens a GMP production window, customers and WuXi need to understand the options, obtain the right authorization and confirm resources before options expire. This synthetic HBT-101 demo shows that decision workflow as an extension of DaVinci’s existing capabilities. Built as a concept extension of DaVinci's client portal.

## Why this, for whom

- Users: customer CMC PM (Emma) and her technical, QA and budget approvers; WuXi project manager (Alex) and scheduling (Mei).
- Pain: when a development deviation threatens a GMP window, options, quotes and evidence versions are spread across email and meetings in two time zones. Customer authorization is easily confused with confirmed resources, and windows can expire while decisions wait.
- MVP scope: one deviation → compare options → structured reviews → authorization bound to request and quote versions → WuXi resource confirmation → shared status and brief.
- Proposed success metrics (not measured): time from risk publication to customer authorization; share of decisions completed before the resource-confirmation deadline; clarification loops per decision; zero authorizations on outdated evidence or quotes.
- Next (backlog): withdraw and reselect before authorization; WuXi re-quote when scope changes; links to the QA evaluation basis; real identity and Part 11-compliant e-signature; integration with quotation, LIMS and scheduling systems.

## Five-minute tour

Start on the project dashboard and choose **Start 5-minute tour**. This tour uses option A.

1. **Emma — understand and organize:** open the risk, compare A/B, select A, generate and confirm editable task briefs.
2. **Elena — authorize:** explicitly enter the next act. Labelled preset records cover Ben’s acceptance, Elena’s designation and both positive reviews. As Emma, generate, preview and attach a frozen management brief; then switch to Elena, read it and sign.
3. **Alex — return the result:** explicitly enter the next act. Labelled records cover resource coordination and Mei’s hold confirmation. Alex returns the receipt; Emma’s dashboard shows the result, hold expiry and remaining assessment.

The two act transitions move forward to existing scenario times. They preserve actual task edits, attachments and signatures. Guide buttons only change role and focus; they do not submit actions. Option B remains available in the full workflow; its next-act button is disabled. A transition whose start time has passed explains that the tour must be restarted. Restarting is an explicit reset.

## Exception scenarios

- **QA requests more information:** Nina selects **More information required** with an editable scale-down-model recovery-data example. The dedicated guide then shows Emma’s blocker and responsibility, Elena’s disabled authorization, and Emma’s brief opening with the blocked authorization. It does not resubmit or approve; manual resubmission remains available.
- **Budget approver on leave:** assign Ben’s preparation work and designate Elena; preparation does not confer signing authority.
- **WuXi unable to hold / rescheduling:** obtain a quote, initiate a separate decision, authorize and formally confirm rescheduling.
- **Before risk publication:** Alex reviews and publishes the private risk draft when evidence is ready.

Exception cards and the chapter selector explicitly reset the scenario and label preset records. The original chapters, all eight roles and the complete workflow remain available.

## Open the demo

- **Local single file:** double-click `dist/index.html`. It works when copied or renamed, without the source folder, a server or internet access.
- **Source preview:** double-click the root `index.html`, keeping its sibling `src/` folder in place. All paths are relative.
- **Online preview:** https://ws-isss.github.io/risk-decision-portal/
- **Source repository:** https://github.com/ws-isss/risk-decision-portal

The interface opens in English. Use the top-right language menu to switch the whole workspace to Chinese. Preset copy lives in paired files under `src/locales/`; both languages use the same dates, amounts, people and business state. Chinese timestamps use a 24-hour clock and explicitly label Shanghai or New York. The glossary explains retained technical abbreviations. Selection, drafts and actions are held in the current browser session. Reloading opens a fresh demonstration; Reset demo explicitly clears the run and shows a reset notice.

## Click through the customer decision

Open **Project workspace** or choose **Continue in full workflow** to use the complete path below. Use the next-action guide to switch to the role responsible for the next unfinished action and focus its control. The guide does not start a review, assign or accept work, record an opinion, or authorize a request; complete each operation explicitly. The top-right **More roles** menu keeps the full **View as** selector available for manual exploration. The bottom **Demo timeline** control separately advances only the simulated clock and explains any missing prerequisite. All times in this walkthrough are New York time.

| Step | Role and action | Visible result |
| --- | --- | --- |
| 1 | Emma: select A in Compare options | A decision request for $80,000, four confirmation owners and their dependencies; no approval or window hold. |
| 2 | Leave the fallback unchecked, or opt in before creating tasks | Unchecked is $80,000. Checked adds a $10,000 conditional cap, for a known total of $90,000. |
| 3 | Emma: Draft task briefs | A brief loading state, then three editable AI draft (simulated) instructions with scope, evidence versions, missing items and business dates. The inputs expand to show their content. No tasks yet. |
| 4 | Edit a brief, then Confirm and create 3 tasks | Three shared tasks and role notifications. The selected request is fixed; repeated creation is unavailable. |
| 5 | Daniel: Start review. Nina: Start review | Both reviews become In progress at the initial Monday event, preserving the frozen three-workday review interval. |
| 6 | Emma, after tasks are created: Assign preparation to Ben | Preparation assigned; budget approval is still pending. |
| 7 | Ben: Accept preparation task | The view states: Can prepare materials, but has no approval authority. Ben accepts preparation; his approval button remains disabled. |
| 8 | Emma, after tasks are created: Designate Elena | Elena owns the budget review, which still waits for technical and QA opinions. |
| 9 | Advance to Nov 11, 5:00 PM. Daniel and Nina: each review or edit the example rationale, then Confirm review opinion | Two recorded opinions, visible in the request. Confirmation concerns the additional study, not GMP readiness or batch release. |
| 10 | After both reviews agree, follow the guide to Emma: generate, edit, preview and **Attach to decision request**; then switch to Elena | Elena sees only the frozen attached version, with version number, attaching person, attachment time and original data-as-of time. The signing area shows whether the attachment is current, missing or needs updating. Private drafts are never shown to her. |
| 11 | Elena: enter or use the shortcut to fill Elena Torres, review or edit the example reason, check the acknowledgement and Authorize request | Customer authorized – awaiting WuXi confirmation. Signature, reason, amount and scope are recorded. No fees have been incurred and no window is confirmed. |
| 12 | Switch to Alex or Mei; open Notifications and the risk page | Customer authorization received; the linked task and risk timeline share the same state. Use the guide to continue to the WuXi workflow below. |

An explicit reset allows a fresh B request ($40,000) or another A run. The optional fallback never automatically confirms an alternative window. Example reasons remain editable, and filling the signature does not check the acknowledgement or submit authorization. The electronic signature is simulated, with no identity or signature service behind it.

## Continue through WuXi

The bottom **Jump to chapter** selector explicitly resets the scenario. It offers Before risk publication, Option selection & AI briefs, Budget approver on leave, Customer authorization, WuXi hold confirmation, WuXi unable to hold, and QA requests more information. Chapters that need preceding actions load clearly labelled preset demo records; they do not claim those actions were just performed. The guide switches roles and focuses controls, without submitting them.

| Path | Clicks and result |
| --- | --- |
| Publish | Choose **Before risk publication**. As Alex, edit certainty and the next update, then explicitly finish draft review. The publish button explains that the study proposal and evidence package are due at 16:00 Shanghai. The guide now points to **Advance to next event**. Once the package is ready, **Publish to client** makes the record visible to customer roles. |
| Successful hold | Continue after customer authorization, or choose **WuXi hold confirmation**. Alex starts resource review; advance time; Mei records the held outcome; Alex returns it. The banner now shows **Dec 9, 5:00 PM Shanghai**, the hold expiry, and states that coordination is complete while the aggregate issue and process readiness remain under assessment. Emma can manually update the brief; the guide does not repeat this step. |
| Unavailable resources | Choose **WuXi unable to hold**. Mei's editable example explains that the Nov 17 expedited experiment and supporting analysis slots cannot be arranged, so the original window cannot be supported. Submit the response and follow the guide to Alex to return it. Emma can generate and preview the unavailable-state brief. The delivery forecast requires reassessment. |
| Request a quote | Alex clicks **Request next available window and rescheduling quote**. No new window is confirmed and no fee is incurred. The guide switches to Mei to record the frozen candidate window and $10,000 quote, then to Alex to return it. The customer sees **Waiting for customer decision**. |
| Obtain a fresh decision | Emma launches the rescheduling decision. Elena reviews the returned quote, enters or fills her example signature, reviews the reason, checks the scope acknowledgement and explicitly authorizes. Until she submits, the customer decision remains pending and no fee is incurred. The earlier fallback checkbox does not bypass this approval. |
| Formally confirm | After Elena's authorization, the guide switches to Alex for **Confirm rescheduling**. Only this action confirms the quoted replacement window and incurs the $10,000 rescheduling fee. Technical readiness and delivery remain under assessment; option B's former delivery estimate is not adopted. Emma can manually update the brief. |

The original six chapter entries remain available alongside the QA exception. The WuXi-unable-to-hold exception has its own preset timeline: Alex enquires Monday Nov 16 at 09:00 Shanghai; Mei quotes Tuesday Nov 17 at 15:00 Shanghai; Alex returns it at 17:00 Shanghai. Customer handling opens Tuesday at 09:00 New York; Emma initiates by 11:00, Elena authorizes by Thursday Nov 19 at 17:00, and Alex formally confirms Friday Nov 20 at 17:00 Shanghai. The next progress update is expected Monday Nov 23 at 17:00 Shanghai. No weekend duty is assumed. All are case design assumptions from PRD E01–E08. Advance time between steps; advancing never records a decision. The frozen simulation clock does not move backwards.

Before a completed response, WuXi banners show the existing resource-response deadline. After a successful hold, the next key date is the hold expiry. Exception banners distinguish **Expected WuXi response** from **Customer action due**, alongside the actual owner and pending state. The clock, action times, separate exception timeline, notifications and briefs all use the same preset event data. Mei's explicit original-resource confirmation commits $50,000 in resource/hold fees; the failed original-resource branch does not incur those fees.

## Generate a management brief

As Emma, open the risk page or decision request and click **Generate management brief**. A short simulated loading state produces a 150–200-word English brief or a compact Chinese brief with the same decision information. Both generated language views are captured from the same source snapshot; switching language does not regenerate a frozen attachment, add a version, change its data-as-of time or rewrite a signature. Manually authored text stays verbatim, with a note when it differs from the viewing language. Its bold opening gives the current decision, amount and deadline before authorization, or the coordination result and remaining assessment after confirmation. Before authorization, a small A/B table shows costs, windows and delivery implications. Afterwards, the current-result summary replaces the A/B table. Both formats have at most three uncertainties and the next update. Captured source versions and data-as-of time remain in a compact footer. Inactive historical quotes and forecasts stay in the project records rather than appearing in the current brief. Amounts, dates and percentages are deterministically read from the shared data.

Edit the content, choose **Preview recipient content**, then **Copy brief**. Copying never sends a message. The recipient preview renders bold headings and an A/B table. Copy includes rich HTML when supported and an equivalent plain-text fallback, including synthetic/AI labels and captured source metadata. The editable draft uses simple bold, table and list formatting; a live word count leaves manual edits under Emma’s control. Editing again requires another preview. A requirement, published business state or source-version change preserves the edited draft and shows why it may be stale. **Update from current records** asks before replacing edits. Copying an earlier version requires explicit confirmation and keeps a visible outdated warning in the copied content. Internal Mei responses and quotations do not leak into a client brief before Alex returns them.

Generation, editing and preview remain private to Emma. After preview, **Attach to decision request** creates a frozen v1 for that request, including the attaching person, simulation time and captured data-as-of time. Elena can only read the attachment. Later private edits or regeneration leave v1 unchanged; previewing and explicitly attaching an updated draft creates v2. Repeated clicks on identical content do not add versions. Earlier versions remain captured in the session, and a new rescheduling request does not inherit the original request's attachment.

The guide offers one brief checkpoint immediately before the first Elena signature: **Generate → Preview → Attach to decision request → Switch to Elena and authorize**. It does not repeat at authorization, resource replies or rescheduling milestones. Attaching does not authorize, change any approval or resource state, charge fees, send messages or advance time. Both initial and rescheduling signing areas show missing or outdated attachments and provide a viewing link or a switch back to Emma. Plan, amount, scope or published-state changes mark the attached version **Content is out of date — awaiting Emma’s update**. Updating the private draft alone does not clear that warning; a current draft must be previewed and reattached. Existing authorization rules remain unchanged.

The dashboard presents project risk, current milestones and deadlines, pending counts and exception entries. The project workspace retains role actions and shared notifications. The risk page includes evidence, known/unknown/possible impacts, role context, named updates, recorded versus pending timeline rows, and owners with the next action. Fee details and forecast phases remain expandable. Changing the customer requirement updates only the forecast gap.

## Develop and verify

The expanded forecast basis includes a shared A/B timeline with execution-zone dates, continuous phase handoffs and an unscaled reassessment placeholder when delivery estimates are invalid. Run `node scripts/test-forecast-browser.mjs` for bilingual offline, mobile and state-sync checks using the existing Playwright environment.

Node.js 18 or newer is needed for development checks, not for opening the HTML. No application dependencies are required.

```sh
npm run check
node scripts/audit-public.mjs
```

- `src/data.js` is the frozen scenario; `scripts/validate.mjs` checks dates, calendars, dependencies, fees and authority without rewriting them.
- `src/i18n.js` supplies localized date formatting and display-only equivalents of untouched example text; arbitrary user edits remain verbatim. `scripts/test-i18n.mjs` checks all language keys and placeholders; `scripts/test-brief-i18n.mjs` checks both brief languages and immutable records. `scripts/test-i18n-browser.mjs` walks the four Chinese guided paths and checks desktop/mobile text and layout.
- `src/core.js` owns the monotonic clock and explicit decision actions. `src/workflow.js` derives tasks, confirmations and notifications from that same record.
- `src/app.js`, `src/decision-view.js`, `src/wuxi-view.js`, `src/risk-view.js` and `src/brief-view.js` render the shared record. Drafts are editable only until confirmation; rendering never creates tasks.
- `scripts/test-core.mjs`, `scripts/test-workflow.mjs`, `scripts/test-decision.mjs`, `scripts/test-wuxi.mjs` and `scripts/test-brief.mjs` cover role limits, clock-only advancement, drafts, idempotence, review prerequisites, signatures, frozen values and reset.
- `scripts/build.mjs` uses an explicit source allowlist to build relative-path `index.html` and standalone `dist/index.html`.

Optional browser QA requires Playwright and Chromium, neither of which is bundled in the app:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/test-browser.mjs

PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/test-decision-browser.mjs

PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/test-wuxi-browser.mjs

PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/test-brief-browser.mjs
```

`test-quality-guide-browser.mjs` checks the dedicated QA sequence in both languages, explicit outcomes, blocked authorization and the brief opening, without changing the simulation clock. The `test-tour-browser.mjs` checks both languages through the three acts, attachment/signature continuity, option-B handling and disabled styling. `test-dashboard-browser.mjs` checks local source, standalone mobile, the repository subpath, navigation, role menus and notification positioning.

Browser checks cover standalone offline execution, the relative-path source entry, desktop and mobile flows, permissions, notifications, timeline state and a locally hosted repository subpath. Review screenshots go to ignored `output/`.

## Publication and private inputs

Public content excludes original research materials and derived research. The development-conversation record is delivered separately and is not included in the public repository or site. All people, findings, dates and prices shown in the application are synthetic case assumptions.

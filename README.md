# DaVinci delivery decisions — concept demo

Stage 5 adds Alex’s private risk draft and publication, WuXi resource coordination, Mei’s scheduling response and Alex’s client receipt. The successful path ends at **Additional study authorized; original window held; process lock pending assessment**. The unavailable path ends at **Rescheduling requested – awaiting WuXi confirmation**, with no alternate window confirmed. All dates, costs and people remain frozen. Editable management briefs and Chinese translation belong to stage 6.

## Open the demo

- **Local single file:** double-click `dist/index.html`. It works when copied or renamed, without the source folder, a server or internet access.
- **Source preview:** double-click the root `index.html`, keeping its sibling `src/` folder in place. All paths are relative.
- **Online preview:** https://ws-isss.github.io/risk-decision-portal/
- **Source repository:** https://github.com/ws-isss/risk-decision-portal

The interface is English. Preset copy lives in `src/locales/`; the retained language menu explains that Chinese will become available after the core flow. Selection, drafts and actions are held in the current browser session. Reloading opens a fresh demonstration; Reset demo explicitly clears the run and shows a reset notice.

## Click through the customer decision

Use the next-action guide to switch to the role responsible for the next unfinished action and focus its control. The guide does not start a review, assign or accept work, record an opinion, or authorize a request; complete each operation explicitly. The top-right **View as** selector remains available for manual exploration. The bottom **Demo timeline** control separately advances only the simulated clock and explains any missing prerequisite. All times in this walkthrough are New York time.

| Step | Role and action | Visible result |
| --- | --- | --- |
| 1 | Emma: select A in Compare options | A decision request for $80,000, four confirmation owners and their dependencies; no approval or window hold. |
| 2 | Leave the fallback unchecked, or opt in before creating tasks | Unchecked is $80,000. Checked adds a $10,000 conditional cap, for a known total of $90,000. |
| 3 | Emma: Draft task briefs | A brief loading state, then three editable AI draft (simulated) instructions with scope, evidence versions, missing items and business dates. The inputs expand to show their content. No tasks yet. |
| 4 | Edit a brief, then Confirm and create 3 tasks | Three shared tasks and role notifications. The selected request is fixed; repeated creation is unavailable. |
| 5 | Daniel: Start review. Nina: Start review | Both reviews become In progress at the initial Monday event, preserving the frozen three-workday review interval. |
| 6 | Advance to Nov 9, 11:00 AM. Emma: Assign preparation to Ben | Preparation assigned; budget approval is still pending. |
| 7 | Ben: Accept preparation task | The view states: Can prepare materials, but has no approval authority. Ben accepts preparation; his approval button remains disabled. |
| 8 | Advance to Nov 10, 9:00 AM. Emma: Designate Elena | Elena owns the budget review, which still waits for technical and QA opinions. |
| 9 | Advance to Nov 11, 5:00 PM. Daniel and Nina: each review or edit the example rationale, then Confirm review opinion | Two recorded opinions, visible in the request. Confirmation concerns the additional study, not GMP readiness or batch release. |
| 10 | Advance to Nov 12, 5:00 PM. Elena: review the opinions, brief, quote and fee conditions | The final budget review period is identified as the preset simulated Thursday period. Signing is now available. |
| 11 | Elena: enter or use the shortcut to fill Elena Torres, review or edit the example reason, check the acknowledgement and Authorize request | Customer authorized – awaiting WuXi confirmation. Signature, reason, amount and scope are recorded. No fees have been incurred and no window is confirmed. |
| 12 | Switch to Alex or Mei; open Notifications and the risk page | Customer authorization received; the linked task and risk timeline share the same state. Use the guide to continue to the WuXi workflow below. |

An explicit reset allows a fresh B request ($40,000) or another A run. The optional fallback never automatically confirms an alternative window. Example reasons remain editable, and filling the signature does not check the acknowledgement or submit authorization. The electronic signature is simulated, with no identity or signature service behind it.

## Continue through WuXi

The bottom **Jump to chapter** selector explicitly resets the scenario. It offers Before risk publication, Option selection & AI briefs, Budget approver on leave, Customer authorization, WuXi hold confirmation, and WuXi unable to hold. Chapters that need preceding actions load clearly labelled preset demo records; they do not claim those actions were just performed. The guide switches roles and focuses controls, without submitting them.

| Path | Clicks and result |
| --- | --- |
| Publish | Choose **Before risk publication**. As Alex, edit certainty and the next update and review the preview. Customer roles cannot see the draft. Advance to the existing material-ready event, then **Publish to client**. The published context is now shared with customer views and new task briefs. |
| Success | Continue after customer authorization, or choose **WuXi hold confirmation**. Use the guide to Alex, then **Start resource review**. Advance to the next event, use the guide to Mei, select the held outcome, review/edit the response and submit it. Use the guide to Alex and return the response to the client. The original window is held until **Dec 9, 5:00 PM Shanghai**; the study is authorized but has not started, and process lock remains pending assessment. |
| Unable to hold | Choose **WuXi unable to hold**. Use the guide to Mei and explicitly submit the unavailable outcome with its editable reason. Use the guide to Alex and return the response. The reason, Feb 15 candidate window and Alex as next owner appear. Use the next guide and request rescheduling. It stops awaiting WuXi confirmation; no alternative window, revised delivery or rescheduling charge is confirmed. |

WuXi banners show **Nov 16, 5:00 PM Shanghai**, the resource response deadline. The frozen main path returns its response on Nov 13. Mei’s explicit confirmation commits the quoted $50,000 in resource and hold fees; Alex’s subsequent return makes the named response visible to the client. Customer authorization alone does not incur fees. Until the response is returned, the customer sees that the named response is pending. If resources cannot be held, the active delivery forecast requires reassessment; previous conditional estimates are retained only as reference.

The homepage includes overall project risk, frozen original-window milestones, role actions and shared notifications. The risk page includes evidence, known/unknown/possible impacts, role context, named updates, recorded versus pending timeline rows, and owners with the next action. Fee details and forecast phases remain expandable. Changing the customer requirement updates only the forecast gap.

## Develop and verify

Node.js 18 or newer is needed for development checks, not for opening the HTML. No application dependencies are required.

```sh
npm run check
node scripts/audit-public.mjs
```

- `src/data.js` is the frozen scenario; `scripts/validate.mjs` checks dates, calendars, dependencies, fees and authority without rewriting them.
- `src/core.js` owns the monotonic clock and explicit decision actions. `src/workflow.js` derives tasks, confirmations and notifications from that same record.
- `src/app.js`, `src/decision-view.js`, `src/wuxi-view.js` and `src/risk-view.js` render the shared record. Drafts are editable only until confirmation; rendering never creates tasks.
- `scripts/test-core.mjs`, `scripts/test-workflow.mjs`, `scripts/test-decision.mjs` and `scripts/test-wuxi.mjs` cover role limits, clock-only advancement, drafts, idempotence, review prerequisites, signatures, frozen values and reset.
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
```

Browser checks cover standalone offline execution, the relative-path source entry, desktop and mobile flows, permissions, notifications, timeline state and a locally hosted repository subpath. Review screenshots go to ignored `output/`.

## Publication and private inputs

The user has approved publishing this round to the same address. After the required checks, pushing `main` runs `.github/workflows/pages.yml`: validate, unit-test, build, audit and upload only `dist/` to GitHub Pages. The same repository and URL are retained. Before each push, stage only reviewed source files and run the public-input audit; never push local app snapshot refs. After deployment, `scripts/test-deployed.mjs` compares the online HTML SHA-256 with the local artifact and checks the published interface.

`reference/`, derived research, local archives and conversation exports remain private and ignored. The build and browser checks neither read nor package research inputs. A real development-conversation export is a separate private deliverable. The PRD is the specification; AGENTS.md holds the stable business and implementation rules. All people, findings, dates and prices shown in the application are synthetic case assumptions.

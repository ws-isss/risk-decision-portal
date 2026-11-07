# DaVinci delivery decisions — concept demo

Stage 2 is ready for review: the project overview and role-specific risk details share the frozen scenario, evidence, fees and timeline. Detailed option workflows, task creation/authorization, WuXi exception handling and the brief remain later stages.

## Open the demo

- **Online preview:** https://ws-isss.github.io/risk-decision-portal/
- **Source repository:** https://github.com/ws-isss/risk-decision-portal

- **Single file:** double-click `dist/index.html`. It can be copied or renamed and opened without the source folder, a server or an internet connection.
- **Source preview:** double-click the root `index.html`, keeping its sibling `src/` folder in place. All asset paths are relative.

The interface is English. Preset copy is centralized in `src/locales/en.js` and `src/locales/risk-en.js`. The retained language menu identifies English as current and Chinese as available after the core flow; the Chinese option is explicitly unavailable at this stage.

The overview leads with the risk and decision deadline, an A/B comparison, the selected role’s action list, and compact project progress. Emma’s view has four unique coordination actions. Context and authority notes open from information icons. You can switch roles, edit the customer requirement, inspect the forecast basis, open the synthetic study finding and explicitly reset the scene. Click the risk banner or role action to open the risk details, including role-specific decision context, a versioned evidence table, known/unknown/possible impacts, the named next update and a timeline with explicit recorded versus future states. Expand the cost row for fee amounts and commitment conditions. The top-right notification bell shows the selected role’s current task updates. A notification opens and highlights its task; read status is separate for each role and is cleared with the scenario reset. Pending leave coverage never appears as a completed handoff. Assignment and authorization notifications derive from explicit event records; the actual workflow controls remain scheduled for later stages. These view-only actions do not authorize spending or reserve resources. A single run cannot rewind its scenario clock; only an explicit reset can do so.

## Develop and verify

Node.js 18 or newer is needed for development checks, not for opening the HTML. No application dependencies need to be installed.

```sh
node scripts/validate.mjs
node scripts/test-core.mjs
node scripts/test-workflow.mjs
node scripts/build.mjs
```

- `src/data.js` contains the frozen scenario keyed to the PRD. It is read-only, with no scheduling engine.
- `scripts/validate.mjs` checks the PRD baseline, dates, calendars, dependencies, parallel phases, fees and authority limits. It fails on inconsistencies and never repairs the source data.
- `src/core.js` provides local-date gap comparison, time-zone display and scene state with a monotonic clock. Business dates are preset; editing a customer need date never recalculates the schedule.
- `src/workflow.js` derives role-visible tasks and notifications from the same scenario and recorded events; `scripts/test-workflow.mjs` checks synchronization, future-event suppression, permissions and stable notification identities.
- `src/app.js` renders the overview, shared fee breakdown and hash navigation; `src/risk-view.js` renders the role-specific risk detail. `src/styles.css` provides responsive styling using system fonts.
- `scripts/build.mjs` uses an explicit asset allowlist to generate the relative-path source entry and self-contained `dist/index.html`.

Optional browser QA uses Playwright and an installed Chromium browser. These are development tools only and are not bundled:

```sh
# With Playwright available to Node:
node scripts/test-browser.mjs

# Or supply existing installations:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node scripts/test-browser.mjs
```

Browser QA opens a standalone copy in an isolated folder with the network offline, checks the relative-path version, role views, dates, reports, reset, narrow-screen layout and a repository-prefixed HTTP path. Review screenshots are written to ignored `output/`.

## Delivery and private inputs

Hash routes, including a direct `#risk` entry, work offline and under the `/risk-decision-portal/` repository subpath. Pushing `main` runs `.github/workflows/pages.yml`: scenario checks and unit tests, standalone build, public-input audit, then upload and deploy only `dist/` to GitHub Pages. Later approved updates use this same repository and URL. The repository Pages source is GitHub Actions.

Before each push, run `node scripts/audit-public.mjs` after staging the explicit source files and building. Research inputs, local archives and review artifacts must stay untracked. Push only the project branch, never local app snapshot refs. After deployment, `DEPLOY_URL=https://ws-isss.github.io/risk-decision-portal/ node scripts/test-deployed.mjs` (with the same optional Playwright settings above) compares the online HTML SHA-256 with `dist/index.html` and verifies role views, notifications, mobile layout and hash routes.

`reference/` and all derived research files remain private and ignored. Neither the build nor browser QA reads or packages them. Public-source and output checks must still run before future publication. Real development conversation exports are a separate, private delivery item.

The PRD is the specification; `AGENTS.md` carries stable business, labeling and implementation constraints. Dates and prices are synthetic assumptions, not WuXi operating commitments.

(function (global) {
  "use strict";
  const data = global.DEMO_DATA;
  const core = global.DEMO_CORE;
  const workflow = global.DEMO_WORKFLOW;
  const text = global.DEMO_MESSAGES.en;
  const session = core.createSession(data);
  const root = document.getElementById("app");
  const dialog = document.getElementById("dialog");
  let noticeTimer;
  let feesExpanded = false;
  let activePage = location.hash.startsWith("#risk") ? "risk" : "overview";
  let notificationsOpen = false;
  const notificationReads = new Map();

  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const interpolate = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));
  const iconPaths = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    actions: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    risk: '<path d="m10.3 3.8-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.2l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5m0 3h.01"/>',
    report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8M8 17h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>',
    edit: '<path d="m16 3 5 5-12 12H4v-5Zm-2 2 5 5"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2.5 8M3 4v6h6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    truck: '<path d="M3 5h11v12H3Zm11 4h4l3 4v4h-7"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>'
  };
  const icon = (name, className = "") => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
  const city = zone => zone === data.calendars.base.timezone ? text.common.shanghai : text.common.newYork;
  const initials = name => name.split(" ").map(part => part[0]).join("");
  function instant(at, zone, options) { return escape(core.formatInstant(at, zone, options)); }
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const zoneLabel = zone => zone === data.baseline.timezone ? text.common.easternTime : city(zone);
  const dateOnly = (at, zone) => instant(at, zone, { year: "numeric", hour: undefined, minute: undefined });
  function badge(key) { return `<span class="status status-${key}">${escape(text.common[key])}</span>`; }
  function info(key, label, content, align = "start") {
    return `<details class="info-tip info-${align}" data-info="${key}"><summary aria-label="${escape(label)}" title="${escape(label)}">${icon("info")}</summary><div class="info-content" role="note"><strong>${escape(label)}</strong>${content}</div></details>`;
  }
  const note = copy => `<p>${escape(copy)}</p>`;

  function actionTitle(action) {
    if (action.info === "budgetReview") return text.actions.rows.budgetReview.title;
    return text.overview[action.key] || text.actions.rows[action.key].title;
  }
  function actionInfo(action) {
    if (action.info === "support") return info("support", text.overview.supportInfo, note(text.overview.supportExplanation));
    if (action.info === "approver") return info("approver", text.overview.approverInfo, note(text.overview.approverExplanation));
    const copy = text.actions.rows[action.info];
    return info(action.info, copy.title, note(copy.detail));
  }
  function actionDue(action, person) {
    const at = data.events[action.event].at;
    const value = action.day && person.timezone === data.baseline.timezone
      ? `${text.common[action.day]}, ${core.formatInstant(at, person.timezone, { month: undefined, day: undefined })}`
      : core.formatInstant(at, person.timezone, { weekday: "short" });
    return `<time datetime="${at}" class="${action.day === "today" ? "due-today" : ""}">${escape(value)} <span>${zoneLabel(person.timezone)}</span></time>`;
  }
  function renderActions(state, person) {
    const actions = workflow.tasks(data, state);
    const hasCoverage = ["P01", "P04", "P05", "P06"].includes(person.id);
    return `<section id="actions" class="section" aria-labelledby="actions-title">
      <div class="section-heading"><div class="heading-with-info"><h2 id="actions-title">${person.id === "P01" ? text.overview.todayTitle : text.overview.roleTitle}</h2>${person.id === "P01" ? info("actionScope", text.overview.actionScope, note(text.overview.actionScopeExplanation)) : ""}</div>
        ${hasCoverage ? `<div class="coverage-note">${text.overview.coverageNote}${info("coverage", text.overview.coverageInfo, note(text.overview.coverageExplanation), "end")}</div>` : `<span class="role-label">${escape(text.roles[person.roleKey])}</span>`}
      </div>
      ${actions.length ? `<div class="table-wrap actions-wrap"><table class="actions-table"><thead><tr><th scope="col">${text.overview.person}</th><th scope="col">${text.overview.action}</th><th scope="col">${text.overview.deadline}</th><th scope="col">${text.overview.status}</th></tr></thead><tbody>${actions.map(action => {
        const owner = data.people[action.owner];
        const title = actionTitle(action);
        return `<tr id="task-${action.key}" data-task="${action.key}" data-owner="${owner.id}" tabindex="-1"${location.hash === `#task-${action.key}` ? ' class="task-highlight"' : ""}><td class="task-person">${escape(owner.name)}</td><td class="task-description"><span>${escape(title)}</span>${actionInfo(action)}</td><td class="action-due" data-label="${escape(text.overview.deadline)}">${actionDue(action, person)}</td><td data-task-status="${action.status}">${badge(action.status)}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty-actions"><strong>${text.actions.noTasks}</strong>${info("unassigned", text.overview.coverageInfo, note(person.id === "P05" ? text.actions.backupNote : text.actions.alternateNote))}</div>`}
    </section>`;
  }

  function readNotifications(viewer) {
    if (!notificationReads.has(viewer)) notificationReads.set(viewer, new Set());
    return notificationReads.get(viewer);
  }
  function renderNotifications(state, person) {
    const t = text.notifications;
    const notifications = workflow.notifications(data, state);
    const read = readNotifications(person.id);
    const unread = notifications.filter(item => !read.has(item.id)).length;
    const label = unread ? `${t.title} · ${interpolate(t.unreadCount, { count: unread })}` : t.title;
    return `<div id="notifications"><button id="notifications-toggle" class="icon-button" aria-label="${escape(label)}" aria-expanded="${notificationsOpen}" aria-controls="notifications-panel" title="${t.title}">${icon("bell")}<span id="notification-count" aria-hidden="true"${unread ? "" : " hidden"}>${unread}</span></button><section id="notifications-panel" role="region" aria-labelledby="notifications-title"${notificationsOpen ? "" : " hidden"}><div class="notifications-heading"><div><h2 id="notifications-title">${t.title}</h2><span>${escape(person.name)}</span></div><button id="mark-notifications-read" class="text-button"${unread ? "" : " disabled"}>${t.markAll}</button></div>${notifications.length ? `<ul class="notification-list">${notifications.map(item => {
      const message = t.kinds[item.kind];
      const owner = data.people[item.task.owner];
      const isRead = read.has(item.id);
      return `<li><a href="#task-${item.taskKey}" data-notification-id="${escape(item.id)}" data-task-link="${item.taskKey}" data-notification-read="${isRead}" data-notification-kind="${item.kind}"><div class="notification-title"><strong>${escape(message.title)}</strong><span class="notification-read-state">${isRead ? t.read : t.unread}</span></div><p>${escape(interpolate(message.body, { owner: owner.name }))}</p><div class="notification-task">${escape(actionTitle(item.task))}${icon("arrow")}</div><div class="notification-meta"><span>${t.owner}: ${escape(owner.name)}</span><span data-notification-status="${item.task.status}">${badge(item.task.status)}</span></div><time datetime="${item.at}">${instant(item.at, person.timezone)} ${zoneLabel(person.timezone)}</time></a></li>`;
    }).join("")}</ul>` : `<p class="notifications-empty">${t.empty}</p>`}<div class="notifications-footer"><span class="data-tag">${text.common.assumption}</span><p>${t.readBoundary}</p></div></section></div>`;
  }
  function updateNotifications(open, restoreFocus = false) {
    notificationsOpen = open;
    const state = session.getState();
    document.getElementById("notifications").outerHTML = renderNotifications(state, data.people[state.viewer]);
    if (restoreFocus) document.getElementById("notifications-toggle").focus();
  }

  function gapMarkup(plan, state) {
    const gap = core.calendarGap(state.needByLocalDate, plan.forecast.localDate);
    const copy = gap === 1 ? text.overview.beforeOne : gap === -1 ? text.overview.afterOne : gap > 0 ? interpolate(text.overview.before, { days: gap }) : gap < 0 ? interpolate(text.overview.after, { days: -gap }) : text.overview.onDate;
    return `<span class="gap ${gap < 0 ? "gap-risk" : ""}" data-gap="${plan.id}">${gap < 0 ? icon("risk") : ""}${escape(copy)}</span>`;
  }
  function stageDate(stage) {
    return `${dateOnly(stage.start, stage.executionTimezone)}<span class="range-arrow">→</span>${dateOnly(stage.end, stage.executionTimezone)}`;
  }
  function renderBasis() {
    const keys = ["sampleCheck", "screening", "firstAnalysis", "candidateConfirmation", "finalAnalysis", "internalAssessment", "customerResultReview", "windowUseConfirmation", "productionPreparation", "preparationBuffer", "windowWait", "seedExpansion", "productionCulture", "harvestPurification", "releaseTesting", "recordReview", "finalQA", "dispatchPreparation", "transport", "deliveryBuffer"];
    const row = key => {
      const a = data.plans.A.stages.find(stage => stage.id === key);
      const b = data.plans.B.stages.find(stage => stage.id === key);
      const duration = a.unit === "workdays" ? a.duration === 1 ? text.delivery.workdayOne : interpolate(text.delivery.workdays, { days: a.duration }) : a.unit === "calendarDays" ? a.duration === 1 ? text.delivery.calendarDayOne : interpolate(text.delivery.calendarDays, { days: a.duration }) : text.delivery.elapsedWait;
      return `<tr data-stage="${key}"><th scope="row">${escape(text.delivery.phaseNames[key])}<small>${escape(duration)}</small></th><td class="execution-zone" data-zone="${a.executionTimezone}">${city(a.executionTimezone)}${a.executionTimezoneNoteKey ? " *" : ""}</td><td data-plan="A">${stageDate(a)}</td><td data-plan="B">${stageDate(b)}</td></tr>`;
    };
    return `<details id="forecast-basis" class="forecast-basis"><summary>${icon("chevron")}<span>${text.delivery.basis}</span></summary><div class="basis-content"><div class="section-heading"><h3>${text.delivery.basisTitle}</h3><span class="data-tag">${text.common.assumption}</span></div><p>${text.delivery.basisIntro}</p><div class="queue-summary">${text.delivery.phaseNames.resourceQueue} · ${text.common.shanghai}: <strong>A ${interpolate(text.delivery.workdays, { days: data.plans.A.queueWorkdays })}</strong><span>/</span><strong>B ${interpolate(text.delivery.workdays, { days: data.plans.B.queueWorkdays })}</strong></div><div class="table-wrap basis-table-wrap" role="region" aria-label="${escape(text.delivery.basisTitle)}" tabindex="0"><table><caption>${text.delivery.executionDates}</caption><thead><tr><th scope="col">${text.delivery.phase}</th><th scope="col">${text.delivery.executionTimezone}</th><th scope="col">${text.delivery.originalPath}</th><th scope="col">${text.delivery.candidatePath}</th></tr></thead><tbody>${keys.map(row).join("")}</tbody></table></div><div class="basis-notes"><p>* ${text.delivery.timezoneNotes.crossBorderShanghaiReference}</p><p>${text.delivery.parallelNote}</p><p>${text.delivery.bufferNote}</p><p>${text.delivery.assumptions}</p></div></div></details>`;
  }

  function renderFeeBreakdown(id = "cost-detail") {
    const rows = [
      { key: "shared", a: data.fees.shared, b: data.fees.shared, condition: "sharedCondition" },
      { key: "expedite", a: data.fees.expedite, condition: "expediteCondition" },
      { key: "hold", a: data.fees.hold, condition: "holdCondition" },
      { key: "reschedule", b: data.fees.reschedule, condition: "rescheduleCondition" }
    ];
    return `<div class="fee-breakdown" id="${escape(id)}"><div class="section-heading"><h3>${text.fees.title}</h3><span class="data-tag">${text.common.assumption}</span></div><p class="fee-current-state">${text.fees.currentState}</p><div class="table-wrap fee-table-wrap"><table class="fee-table"><thead><tr><th scope="col">${text.fees.item}</th><th scope="col">${text.fees.optionA}</th><th scope="col">${text.fees.optionB}</th><th scope="col">${text.fees.trigger}</th></tr></thead><tbody>${rows.map(row => `<tr data-fee="${row.key}"><th scope="row">${text.fees[row.key]}${row.key === "expedite" ? `<small>${text.fees.expediteDescription}</small>` : ""}</th><td data-fee-plan="A" data-label="${text.fees.optionA}">${row.a ? money(row.a) : text.fees.notIncluded}</td><td data-fee-plan="B" data-label="${text.fees.optionB}">${row.b ? money(row.b) : text.fees.notIncluded}</td><td class="fee-condition" data-label="${text.fees.trigger}">${text.fees[row.condition]}</td></tr>`).join("")}</tbody></table></div><p class="fee-fallback">${escape(interpolate(text.fees.fallback, { cap: money(data.fees.fallbackCap), total: money(data.fees.totals.AWithFallback) }))}</p><p class="fee-policy-note">${text.fees.syntheticTerms}</p></div>`;
  }

  function renderRoleAction(person, state) {
    const eventKey = { P01: "backupAssigned", P02: "latestReviewStart", P03: "latestReviewStart" }[person.id];
    const action = eventKey ? workflow.tasks(data, state, person.id)[0] : null;
    return `<div class="role-next-action" data-role-action="${person.id}"><span><strong>${escape(person.name)}</strong><span class="role-action-divider">·</span>${text.overview.roleInstructions[person.id]}${action ? ` ${text.overview.by} ${actionDue(action, person)}` : ""}</span><a class="button button-secondary role-action-button" href="#risk">${text.overview.roleButtons[person.id]}${icon("arrow")}</a></div>`;
  }

  function renderComparison(state) {
    const a = data.plans.A;
    const b = data.plans.B;
    const requirement = `<dl class="info-facts"><dt>${text.delivery.deliveryItem}</dt><dd id="requirement-item-display">${escape(state.deliverableOverride || text.project.released)}</dd><dt>${text.delivery.destination}</dt><dd id="requirement-destination-display">${escape(state.destinationOverride || text.project.newJerseyFormulationSite)}</dd><dt>${text.delivery.needBy}</dt><dd>${core.formatLocalDate(state.needByLocalDate)} · ${text.common.newYork}</dd></dl>${note(text.delivery.calendarNote)}`;
    const row = (key, heading, content, help = "") => `<tr data-metric="${key}"><th scope="row"><div class="metric-label">${heading}${help}</div></th>${[a,b].map(plan => `<td data-plan="${plan.id}"${key === "delivery" ? ` data-forecast="${plan.id}"` : ""}>${content(plan)}</td>`).join("")}</tr>`;
    return `<section id="comparison" class="section comparison-section" aria-labelledby="comparison-title">
      <div class="section-heading"><h2 id="comparison-title">${text.overview.compare}</h2><div class="requirement-controls"><span>${text.overview.needDate}: <strong id="need-date-display">${core.formatLocalDate(state.needByLocalDate)}</strong></span>${info("requirement", text.overview.requirementInfo, requirement, "end")}<button class="button button-secondary" id="edit-requirement">${icon("edit")}${text.delivery.edit}</button></div></div>
      <div class="comparison-panel"><div class="table-wrap comparison-wrap"><table id="comparison-table"><thead><tr><th scope="col">${text.overview.factor}</th><th scope="col"><div>${text.overview.optionA}${info("optionA", text.overview.optionAInfo, note(text.delivery.originalCondition))}</div></th><th scope="col"><div>${text.overview.optionB}${info("optionB", text.overview.optionBInfo, note(text.delivery.candidateCondition), "end")}</div></th></tr></thead><tbody>
        ${row("cost", `<button id="toggle-costs" class="cost-toggle" aria-expanded="${feesExpanded}" aria-controls="cost-details" aria-label="${text.fees.toggle}">${icon("chevron")}${text.overview.cost}</button>`, plan => `<strong class="amount">${money(plan.total)}</strong>${plan.id === "A" ? `<span class="cost-difference">${interpolate(text.overview.premium, { amount: money(a.total - b.total) })}</span>` : ""}`)}
        <tr id="cost-details"${feesExpanded ? "" : " hidden"}><td colspan="3">${renderFeeBreakdown("overview-cost-detail")}</td></tr>
        ${row("window", text.overview.window, plan => `<time datetime="${plan.window.at}">${dateOnly(plan.window.at, data.calendars.base.timezone)}</time><span class="inline-meta">${text.common.shanghai}</span>`, info("window", text.overview.windowInfo, note(text.overview.windowExplanation)))}
        ${row("delivery", text.overview.estimatedDelivery, plan => `<time datetime="${plan.forecast.delivery}">${dateOnly(plan.forecast.delivery, data.baseline.timezone)}</time><span class="inline-meta">${text.common.newYork}</span>`, info("delivery", text.overview.deliveryInfo, note(text.overview.deliveryExplanation)))}
        ${row("gap", text.overview.difference, plan => gapMarkup(plan, state))}
        ${row("confirmation", text.overview.confirmed, plan => `<span class="confirmation-status" data-confirmation="${plan.id}">${text.overview.notRequested}</span>`)}
      </tbody></table></div><p class="shared-prerequisite">${text.overview.sharedPrerequisite}</p>${renderBasis()}</div>
    </section>`;
  }

  function renderContext() {
    const milestones = `${note(text.overview.developmentScope)}<dl class="info-facts"><dt>${text.context.gmp}</dt><dd>${dateOnly(data.plans.A.window.at, data.calendars.base.timezone)} · ${text.common.shanghai}</dd><dt>${text.context.releasedDS}</dt><dd>${core.formatLocalDate(data.plans.A.forecast.localDate)} · ${text.common.newYork} · ${text.common.estimated}</dd><dt>${text.context.ind}</dt><dd>${text.context.noDate}</dd></dl>${note(text.context.shipmentNote)}<button class="text-button" data-open-report>${text.context.study} · ${data.reports["SEC-001"].id}</button>`;
    return `<section id="context" class="section context-section" aria-labelledby="context-title"><div class="section-heading"><div class="heading-with-info"><h2 id="context-title">${text.context.title}</h2>${info("program", text.overview.contextInfo, milestones)}</div></div>
      <ol class="progress-track" aria-label="${escape(text.context.milestones)}"><li class="research-complete" data-research-status="${data.project.researchStatusKey}"><span class="progress-node">${icon("check")}</span><span>R · ${text.context.research}</span><span class="current-label research-status">${text.common.researchComplete}</span></li><li aria-current="step"><span class="progress-node"></span><strong>D · ${text.context.development}</strong><span class="current-label">${text.context.current}</span></li><li><span class="progress-node"></span><span>M · ${text.context.manufacturing}</span><span class="current-label">${text.common.notStarted}</span></li></ol>
      <div class="table-wrap development-wrap"><table class="development-table" aria-label="${escape(text.context.developmentWorkstreams)}"><thead><tr>${data.project.developmentWorkstreams.map(stream => `<th scope="col">${text.context.workstreamNames[stream.id]}</th>`).join("")}</tr></thead><tbody><tr>${data.project.developmentWorkstreams.map(stream => `<td data-workstream="${stream.id}" data-status="${stream.statusKey}" data-label="${escape(text.context.workstreamNames[stream.id])}">${badge(stream.statusKey)}</td>`).join("")}</tr></tbody></table></div>
    </section>`;
  }

  function render() {
    const isRisk = activePage === "risk";
    document.title = isRisk ? `${text.riskDetail.title} · ${data.project.id}` : text.meta.title;
    const state = session.getState();
    const person = data.people[state.viewer];
    const finding = interpolate(text.overview.finding, { measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1) });
    const riskInfo = note(finding) + note(text.overview.riskImpact) + `<p>${text.common.nextUpdate}: ${instant(data.events.reviewsComplete.at, person.timezone)} · ${city(person.timezone)}</p><button class="text-button" data-open-report>${text.risk.report} · ${data.reports["SEC-001"].id}</button>`;
    root.innerHTML = `<a class="skip-link" href="#main">${text.nav.skip}</a>
      <header class="topbar"><div class="app-identity"><a class="brand" href="#main">${text.common.brand}</a><span class="project-id">${data.project.id}</span><span class="customer-name">${escape(data.project.customer)}</span></div><div class="topbar-tools"><details id="language-menu" class="language-menu"><summary aria-label="${text.overview.language}">${icon("globe")}<span>${text.common.english}</span>${icon("down")}</summary><div class="language-options"><button type="button" data-language="en" aria-current="true">${text.overview.languageCurrent}</button><button type="button" data-language="zh" disabled>${text.overview.languagePending}</button></div></details><span class="data-tag demo-tag">${text.common.demo}</span><button class="icon-button" id="reset-demo" aria-label="${escape(text.common.reset)}" title="${escape(text.common.reset)}">${icon("reset")}</button><div class="viewer-picker"><label for="viewer">${text.common.viewAs}${person.statusKey === "onLeave" ? ` · ${text.common.unavailable}` : ""}</label><select id="viewer" aria-label="${escape(text.common.viewAs)}">${Object.values(data.people).map(p => `<option value="${p.id}"${p.id === state.viewer ? " selected" : ""}>${escape(p.name)} · ${escape(text.roles[p.roleKey])}</option>`).join("")}</select></div>${renderNotifications(state, person)}</div></header>
      <main id="main" tabindex="-1" data-page="${isRisk ? "risk" : "overview"}">${isRisk ? global.DEMO_RISK_VIEW.render({data, core, state, person, text, helpers: {escape, interpolate, icon, info, note, instant, dateOnly, city, zoneLabel, money, badge, renderFeeBreakdown, renderRoleAction}}) : `<div class="page-heading"><h1>${text.project.title}</h1><nav aria-label="${escape(text.nav.workspace)}"><a href="#comparison">${text.overview.compare}</a><a href="#actions">${text.overview.todayTitle}</a><a href="#context">${text.context.title}</a></nav><div class="snapshot"><span>${text.overview.snapshot}</span> <time datetime="${state.clock}" id="snapshot-time">${instant(state.clock, person.timezone, { weekday: "short" })}</time> ${zoneLabel(person.timezone)}</div></div>
      <section id="priority-risk" class="priority-risk" data-open-risk aria-labelledby="risk-title"><div class="risk-fact"><h2 id="risk-title"><a href="#risk" aria-label="${text.overview.riskDetails}">${text.overview.riskTitle}</a></h2><span class="risk-status">${text.overview.riskState}</span>${info("risk", text.overview.riskInfo, riskInfo)}<span class="data-tag assumption-tag">${text.common.assumption}</span></div><div id="decision-deadline"><span>${text.overview.decisionBy}${info("decision", text.overview.decisionInfo, note(text.overview.decisionExplanation), "end")}</span><time datetime="${data.events.latestAuthorization.at}">${instant(data.events.latestAuthorization.at, data.baseline.timezone, { weekday: "short" })} ${text.common.easternTime}</time></div></section>${renderRoleAction(person, state)}
      ${renderComparison(state)}${renderActions(state, person)}${renderContext()}`}
      <footer class="page-footer">${text.overview.footer}</footer></main>`;
  }

  function notify(message) {
    const notice = document.getElementById("notice");
    clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.classList.add("visible");
    noticeTimer = setTimeout(() => notice.classList.remove("visible"), 6500);
  }
  function openDialog(content) {
    if (notificationsOpen) updateNotifications(false);
    document.querySelectorAll(".info-tip[open]").forEach(tip => { tip.open = false; });
    dialog.innerHTML = content;
    dialog.showModal();
  }
  function dialogHeading(title, subtitle) {
    return `<div class="dialog-heading"><div>${subtitle ? `<p class="dialog-subtitle">${escape(subtitle)}</p>` : ""}<h2 id="dialog-title">${escape(title)}</h2></div><button class="icon-button" data-close aria-label="${escape(text.common.close)}">${icon("close")}</button></div>`;
  }
  function openRequirement() {
    const state = session.getState();
    openDialog(`${dialogHeading(text.delivery.requirementTitle)}<p class="dialog-intro">${text.delivery.requirementHint}</p><form id="requirement-form"><label for="requirement-item">${text.delivery.deliveryItem}</label><input id="requirement-item" name="item" required maxlength="120" value="${escape(state.deliverableOverride || text.project.released)}"><label for="requirement-date">${text.delivery.needDateLabel}</label><input id="requirement-date" name="date" type="date" required value="${state.needByLocalDate}"><label for="requirement-destination">${text.delivery.destination}</label><input id="requirement-destination" name="destination" required maxlength="180" value="${escape(state.destinationOverride || text.project.newJerseyFormulationSite)}"><p id="requirement-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button button-secondary" data-close>${text.common.cancel}</button><button type="submit" class="button button-primary">${text.common.save}</button></div></form>`);
  }
  function openReport() {
    const person = data.people[session.getState().viewer];
    openDialog(`${dialogHeading(text.risk.reportTitle, text.risk.reportIntro)}<div class="report-badges"><span class="data-tag">${text.common.demo}</span><span>${text.risk.notFailure}</span></div><dl class="report-facts"><div><dt>${text.risk.version}</dt><dd>${data.reports["SEC-001"].id} · v${data.reports["SEC-001"].version}</dd></div><div><dt>${text.risk.sample}</dt><dd>${text.risk.reportSample}</dd></div><div><dt>${text.risk.method}</dt><dd>${text.risk.reportMethod}</dd></div><div><dt>${text.risk.found}</dt><dd>${instant(data.events.riskDiscovered.at, person.timezone, { year: "numeric" })} · ${city(person.timezone)}</dd></div></dl><div class="report-result"><div><span>${text.risk.measured}</span><strong>${data.risk.hmwPct.toFixed(1)}%</strong></div><div><span>${text.risk.target}</span><strong>≤ ${data.risk.targetPct.toFixed(1)}%</strong></div></div><p class="dialog-intro">${text.risk.reportConclusion}</p><p class="report-note">${text.risk.releaseRequired}</p><div class="dialog-actions"><button class="button button-primary" data-close>${text.common.close}</button></div>`);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#notifications-toggle")) {
      document.querySelectorAll(".info-tip[open], #language-menu[open]").forEach(item => { item.open = false; });
      updateNotifications(!notificationsOpen, true);
      return;
    }
    if (event.target.closest("#mark-notifications-read")) {
      const state = session.getState();
      workflow.notifications(data, state).forEach(item => readNotifications(state.viewer).add(item.id));
      updateNotifications(true);
      const heading = document.getElementById("notifications-title");
      heading.setAttribute("tabindex", "-1"); heading.focus();
      return;
    }
    const notificationLink = event.target.closest("[data-notification-id]");
    if (notificationLink) {
      event.preventDefault();
      const state = session.getState();
      const item = workflow.notifications(data, state).find(item => item.id === notificationLink.dataset.notificationId);
      if (!item) return;
      readNotifications(state.viewer).add(item.id);
      notificationsOpen = false;
      activePage = "overview";
      location.hash = `task-${item.taskKey}`;
      render(); focusRouteTarget();
      return;
    }
    if (notificationsOpen && !event.target.closest("#notifications")) updateNotifications(false);
    const banner = event.target.closest("[data-open-risk]");
    if (banner && !event.target.closest("a, button, details")) location.hash = "risk";
    const languageMenu = document.getElementById("language-menu");
    if (languageMenu && (!languageMenu.contains(event.target) || event.target.closest("[data-language=\"en\"]"))) languageMenu.open = false;
    if (event.target.closest("#toggle-costs")) {
      feesExpanded = !feesExpanded;
      document.getElementById("cost-details").hidden = !feesExpanded;
      document.getElementById("toggle-costs").setAttribute("aria-expanded", String(feesExpanded));
    }
    document.querySelectorAll(".info-tip[open]").forEach(tip => {
      if (!tip.contains(event.target)) tip.open = false;
    });
    if (event.target.closest("[data-open-report], [data-report=\"SEC-001\"]")) openReport();
    if (event.target.closest("#edit-requirement")) openRequirement();
    if (event.target.closest("#risk-assign-tasks")) openDialog(`${dialogHeading(text.riskDetail.assignTasks)}<p class="dialog-intro">${text.riskDetail.assignmentUnavailable}</p><div class="dialog-actions"><button class="button button-secondary" data-close>${text.common.close}</button><a class="button button-primary" id="view-pending-actions" href="#actions" data-close>${text.riskDetail.viewPendingActions}</a></div>`);
    if (event.target.closest("[data-close]")) dialog.close();
    if (event.target.closest("#reset-demo")) openDialog(`${dialogHeading(text.common.resetTitle)}<p class="dialog-intro">${text.common.resetBody}</p><div class="dialog-actions"><button class="button button-secondary" data-close>${text.common.cancel}</button><button class="button button-primary" id="confirm-reset">${text.common.resetConfirm}</button></div>`);
    if (event.target.closest("#confirm-reset")) {
      session.reset("customer"); feesExpanded = false; notificationsOpen = false; notificationReads.clear(); dialog.close(); render();
      notify(text.common.resetNotice); document.getElementById("reset-demo").focus();
    }
  });
  document.addEventListener("change", event => {
    if (event.target.id === "viewer") {
      notificationsOpen = false;
      session.setViewer(event.target.value); render();
      document.getElementById("viewer").focus();
    }
  });
  document.addEventListener("submit", event => {
    if (event.target.id !== "requirement-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    const date = String(form.get("date"));
    if (!core.validLocalDate(date)) { document.getElementById("requirement-error").textContent = text.common.invalidDate; return; }
    const item = String(form.get("item")).trim();
    const destination = String(form.get("destination")).trim();
    session.setRequirement({ needByLocalDate: date, deliverableOverride: item === text.project.released ? "" : item, destinationOverride: destination === text.project.newJerseyFormulationSite ? "" : destination });
    dialog.close(); render(); notify(text.common.savedNotice);
    document.getElementById("edit-requirement").focus();
  });
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  document.addEventListener("toggle", event => {
    const tip = event.target;
    if (!tip.matches(".info-tip") || !tip.open) return;
    const anchor = tip.querySelector("summary").getBoundingClientRect();
    const panel = tip.querySelector(".info-content");
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
    tip.style.setProperty("--tip-left", `${left}px`);
    const height = panel.getBoundingClientRect().height;
    const top = anchor.bottom + height + 8 < window.innerHeight ? anchor.bottom + 8 : Math.max(12, anchor.top - height - 8);
    tip.style.setProperty("--tip-top", `${top}px`);
  }, true);
  window.addEventListener("resize", () => {
    document.querySelectorAll(".info-tip[open]").forEach(tip => { tip.open = false; });
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (notificationsOpen) { updateNotifications(false, true); return; }
    const languageMenu = document.getElementById("language-menu");
    if (languageMenu?.open) { languageMenu.open = false; languageMenu.querySelector("summary").focus(); }
    const activeTip = document.querySelector(".info-tip[open]");
    if (activeTip) {
      activeTip.open = false;
      activeTip.querySelector("summary").focus();
    }
  });
  function focusRouteTarget() {
    const target = document.getElementById(location.hash.slice(1)) || document.getElementById("main");
    document.querySelectorAll("[data-task]").forEach(row => row.classList.toggle("task-highlight", row === target));
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (target.id === "main") window.scrollTo(0, 0);
    else target.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", () => {
    const nextPage = location.hash.startsWith("#risk") ? "risk" : "overview";
    notificationsOpen = false;
    if (nextPage !== activePage) {
      activePage = nextPage;
      render();
    } else updateNotifications(false);
    focusRouteTarget();
  });
  render();
})(globalThis);

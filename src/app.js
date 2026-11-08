(function (global) {
  "use strict";
  const data = global.DEMO_DATA;
  let language = "en";
  let text = global.DEMO_MESSAGES[language];
  let core = global.DEMO_I18N.coreFor(text);
  const workflow = global.DEMO_WORKFLOW;
  const session = core.createSession(data);
  const root = document.getElementById("app");
  const dialog = document.getElementById("dialog");
  let noticeTimer;
  let feesExpanded = false;
  let activePage = location.hash.startsWith("#risk") ? "risk" : "overview";
  let notificationsOpen = false;
  let draftLoading = false;
  let draftGeneration = 0;
  let decisionError = "";
  let formValues = {};
  let managementBrief = null;
  const briefAttachments = [];
  let briefOpen = false;
  let briefLoading = false;
  let briefPreview = false;
  let briefGeneration = 0;
  let briefCopied = false;
  let layoutFrame;
  const footerObserver = new ResizeObserver(() => reserveFooterSpace());
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
  const recordText = value => global.DEMO_I18N.recordText(value, {data,state:session.getState(),text});
  const dateOnly = (at, zone) => instant(at, zone, { year: "numeric", hour: undefined, minute: undefined });
  function badge(key) { return `<span class="status status-${key}">${escape(text.common[key] || text.portal.statuses[key] || text.wuxi.statuses?.[key] || key)}</span>`; }
  function info(key, label, content, align = "start") {
    return `<details class="info-tip info-${align}" data-info="${key}"><summary aria-label="${escape(label)}" title="${escape(label)}">${icon("info")}</summary><div class="info-content" role="note"><strong>${escape(label)}</strong>${content}</div></details>`;
  }
  const note = copy => `<p>${escape(copy)}</p>`;
  function explainTerms(container) {
    if (language !== "zh") return;
    const seen = new Set();
    const nodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest("script,style,textarea,select,abbr,[data-info=terminology]") || !node.parentElement.getClientRects().length) continue;
      nodes.push(node);
    }
    const pattern = /\b(SEC-HPLC|HMW|GMP|DS|IND|CMC|QA)\b/g;
    for (const node of nodes) {
      let start = 0;
      const fragment = document.createDocumentFragment();
      for (const match of node.textContent.matchAll(pattern)) {
        if (seen.has(match[0])) continue;
        seen.add(match[0]);
        fragment.append(node.textContent.slice(start, match.index));
        const term = document.createElement("abbr");
        term.textContent = match[0]; term.title = text.common.glossary[match[0]]; term.tabIndex = 0;
        fragment.append(term); start = match.index + match[0].length;
      }
      if (start) { fragment.append(node.textContent.slice(start)); node.replaceWith(fragment); }
    }
  }

  function decisionStatus(state) {
    const view = workflow.project(data,state);
    if (view.reviewBlockers.length) return `${text.decision.reviewFlow.blocked} · ${reviewBlockerSummary(state)}`;
    if (view.rescheduleStage && view.rescheduleStage !== "none") return text.portal.rescheduleStages[view.rescheduleStage];
    if (view.resourceRejected) return text.portal.unavailable;
    if (view.resourceConfirmed) return text.portal.success;
    return state.decision?.authorization ? text.decision.authorized : text.decision.requestOpen;
  }
  function reviewBlockerSummary(state) {
    const f = text.decision.reviewFlow;
    return workflow.project(data,state).reviewBlockers.map(b => interpolate(f.summary,{review:f.roles[b.kind],outcome:f.outcomes[b.outcome]})).join("; ");
  }
  function feeStatement(state) {
    const view = workflow.project(data,state);
    if (view.rescheduleConfirmed) return interpolate(text.portal.rescheduleCommitted,{amount:money(data.fees.reschedule),study:money(data.fees.shared)});
    if (view.rescheduleQuoteReturned) return interpolate(text.portal.reschedulePendingFee,{amount:money(data.fees.reschedule)});
    if (view.committedFees) return interpolate(text.portal.committed,{amount:money(view.committedFees),study:money(data.fees.shared)});
    if (view.resourceRejected) return text.portal.failureNote;
    if (state.decision?.authorization && !["P07","P08"].includes(state.viewer)) return text.portal.feesAwaiting;
    return text.fees.currentState;
  }
  function windowStatus(plan, state) {
    const view = workflow.project(data,state);
    if (view.rescheduleConfirmed && plan.id === "B") return text.portal.confirmedWindow;
    if (view.rescheduleRequested && plan.id === "B") return text.portal.rescheduleStages[view.rescheduleStage];
    if (plan.id !== state.decision?.planId) return text.overview.notRequested;
    if (view.resourceConfirmed) return interpolate(text.portal.heldUntil,{time:core.formatInstant(data.plans.A.holdUntil,data.calendars.base.timezone)});
    if (view.resourceRejected) return text.portal.unavailable;
    return state.decision?.authorization ? text.portal.awaiting : text.overview.notRequested;
  }

  function bannerState(state) {
    const view = workflow.project(data,state);
    if (view.reviewBlockers.length) return {label:text.overview.decisionBy,at:data.events.latestAuthorization.at,zone:data.baseline.timezone,status:decisionStatus(state)};
    if (view.nextTiming) return {label:text.portal.timingLabels[view.rescheduleConfirmed ? "technicalReassessment" : view.nextTiming.kind],at:data.events[view.nextTiming.eventRef].at,zone:view.nextTiming.timezone,status:view.rescheduleRequested ? text.portal.rescheduleStages[view.rescheduleStage] : view.resourceRejected ? text.portal.unavailable : text.portal.pendingReschedule,kind:view.nextTiming.kind};
    if (view.resourceConfirmed) return {label:text.portal.holdExpiry,at:data.plans.A.holdUntil,zone:data.calendars.base.timezone,status:text.portal.success};
    const isWuxi = ["P07","P08"].includes(state.viewer);
    if (isWuxi || state.decision?.authorization) return {label:text.portal.resourceDue,at:data.events.resourceConfirmationDeadline.at,zone:data.calendars.base.timezone,status:state.decision?.authorization ? text.decision.authorized : text.overview.riskState};
    return {label:text.overview.decisionBy,at:data.events.latestAuthorization.at,zone:data.baseline.timezone,status:text.overview.riskState};
  }

  function renderManagementBrief(state) {
    const attachment = global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state});
    if (state.viewer === "P06" && !briefAttachments.length) return "";
    if (!briefOpen && !(state.viewer === "P06" && briefAttachments.length)) return "";
    const draft = state.viewer === "P01" ? managementBrief : null;
    return global.DEMO_BRIEF_VIEW.render({brief:draft,attachment,attachments:briefAttachments,loading:briefLoading,state,text,helpers:{escape,requestTime:at=>`${core.formatInstant(at,data.baseline.timezone,{year:"numeric"})} ${text.common.easternTime}`},staleReasons:global.DEMO_BRIEF.staleReasons(draft,{data,state}),attachmentStaleReasons:global.DEMO_BRIEF.staleReasons(attachment?.brief,{data,state}),preview:briefPreview,copied:briefCopied});
  }

  function renderAuthorizationBasis(state, authorization, kind = "main") {
    if (!authorization?.basis) return "";
    const t = text.brief.authorizationBasis;
    const basis = authorization.basis;
    const brief = basis.brief;
    const changed = !core.authorizationMatches(data,state,kind);
    const requestTime = `${core.formatInstant(basis.request.createdAt,data.baseline.timezone,{year:"numeric"})} ${text.common.easternTime}${basis.request.kind === "main" ? ` · ${interpolate(text.decision.reviewFlow.version,{version:basis.request.version || 1})}` : ""}`;
    const briefLabel = brief ? interpolate(t.briefBasis,{version:brief.version,name:brief.attachedBy.name,attachedAt:`${core.formatInstant(brief.attachedAt,data.baseline.timezone,{year:"numeric"})} ${text.common.easternTime}`,dataAsOf:`${core.formatInstant(brief.dataAsOf,data.baseline.timezone,{year:"numeric"})} ${text.common.easternTime}`}) : t.noBriefAtSigning;
    return `<section class="authorization-basis" data-authorization-basis="${kind}" data-authorization-request-key="${escape(basis.request.key)}" data-authorized-brief-version="${brief ? brief.version : "none"}" data-authorization-current="${!changed}"><h4>${t.title}</h4><dl class="info-facts"><dt>${t.boundRequest}</dt><dd>${escape(t.requestKinds[basis.request.kind])} · ${escape(data.project.id)} · ${escape(requestTime)}</dd><dt>${t.amount}</dt><dd>${money(basis.scope.amount)}</dd><dt>${t.boundQuote}</dt><dd>${basis.quotes.map(quote=>`${escape(quote.id)} v${escape(quote.version)} · ${money(quote.amount)} · ${escape(t.quoteScopes[quote.scopeKey])}`).join("<br>")}</dd><dt>${t.supportingBrief}</dt><dd>${escape(briefLabel)}</dd></dl><p class="decision-note">${t.boundary}</p><p class="decision-note">${t.progressOnly}</p>${changed ? `<p class="brief-stale" role="status"><strong>${t.newAuthorization}</strong> · ${t.scopeChanged}</p>` : `<p class="decision-note">${t.scopeChanged}</p>`}</section>`;
  }

  function renderAuthorizationBrief(state) {
    if (state.viewer !== "P06" || state.publication?.status !== "published") return "";
    const t = text.brief;
    const attachment = global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state});
    const reasons = global.DEMO_BRIEF.staleReasons(attachment?.brief,{data,state});
    const status = !attachment ? "missing" : reasons.length ? "stale" : "current";
    const title = {missing:t.authorizationBriefMissing,stale:t.authorizationBriefStale,current:t.authorizationBriefCurrent}[status];
    const hint = {missing:t.authorizationBriefMissingHint,stale:t.authorizationBriefStaleHint}[status];
    return `<aside id="authorization-brief-status" class="authorization-brief-status" data-brief-state="${status}" role="status"><strong>${title}${attachment ? ` · v${attachment.version}` : ""}</strong>${hint ? `<p>${hint}</p>` : ""}${reasons.length ? `<ul>${reasons.map(reason=>`<li>${escape(t.staleReasons[reason])}</li>`).join("")}</ul>` : ""}<p class="decision-note">${t.authorizationBasis.boundary}</p><div class="decision-action-group">${attachment ? `<button type="button" id="view-management-brief" class="button button-secondary">${t.viewShared}</button>` : ""}${status !== "current" ? `<button type="button" id="update-shared-brief" class="button button-secondary">${attachment ? t.updateShared : t.prepareShared}</button>` : ""}</div></aside>`;
  }

  function clearBrief() {
    briefAttachments.length = 0;
    managementBrief = null; briefOpen = false; briefLoading = false; briefPreview = false; briefCopied = false; briefGeneration++;
  }

  function actionTitle(action) {
    if (action.key === "resolveReviews") return reviewBlockerSummary(session.getState());
    if (text.portal.actions[action.key]) return text.portal.actions[action.key].title;
    if (action.info === "budgetReview") return text.actions.rows.budgetReview.title;
    return text.overview[action.key] || text.actions.rows[action.key].title;
  }
  function actionInfo(action) {
    if (text.portal.actions[action.key]) return info(action.key, text.portal.actions[action.key].title, note(text.portal.actions[action.key].detail));
    const d = session.getState().decision;
    if (d && action.info === "support" && d.support.assignedAt) return info("support", text.overview.supportInfo, note(d.support.acceptedAt ? text.decision.supportAccepted : text.decision.supportAssigned) + note(interpolate(text.decision.supportOnly, {limit: money(data.people.P05.budgetLimit)})));
    if (d && action.info === "approver" && d.approver.id) return info("approver", text.overview.approverInfo, note(text.decision.designated));
    if (action.info === "support") return info("support", text.overview.supportInfo, note(text.overview.supportExplanation));
    if (action.info === "approver") return info("approver", text.overview.approverInfo, note(text.overview.approverExplanation));
    const copy = text.actions.rows[action.info];
    return info(action.info, copy.title, note(copy.detail));
  }
  function actionDue(action, person, withLabel = false) {
    if (!action.timing) return escape(text.portal.notScheduled);
    const { at, kind } = action.timing;
    const value = action.day && session.getState().clock === data.initialClock && person.timezone === data.baseline.timezone
      ? `${text.common[action.day]}, ${core.formatInstant(at, person.timezone, { month: undefined, day: undefined })}`
      : core.formatInstant(at, person.timezone, { weekday: "short" });
    return `${withLabel ? `<span class="task-time-kind">${text.portal.taskTimingLabels[kind]}</span>` : ""}<time datetime="${at}" class="${action.day === "today" ? "due-today" : ""}">${escape(value)} <span>${zoneLabel(person.timezone)}</span></time>`;
  }
  function renderActions(state, person) {
    const actions = workflow.tasks(data, state);
    const mixedTiming = actions.some(action => action.timingKey);
    const timingHeading = mixedTiming ? text.portal.timing : text.overview.deadline;
    const hasCoverage = ["P01", "P04", "P05", "P06"].includes(person.id);
    return `<section id="actions" class="section" aria-labelledby="actions-title">
      <div class="section-heading"><div class="heading-with-info"><h2 id="actions-title">${person.id === "P01" ? (state.clock === data.initialClock ? text.overview.todayTitle : text.nav.actions) : text.overview.roleTitle}</h2>${person.id === "P01" ? info("actionScope", text.overview.actionScope, note(text.overview.actionScopeExplanation)) : ""}</div>
        ${hasCoverage ? `<div class="coverage-note">${text.overview.coverageNote}${info("coverage", text.overview.coverageInfo, note(state.decision ? coverageCopy(state.decision) : text.overview.coverageExplanation), "end")}</div>` : `<span class="role-label">${escape(text.roles[person.roleKey])}</span>`}
      </div>
      ${actions.length ? `<div class="table-wrap actions-wrap"><table class="actions-table"><thead><tr><th scope="col">${text.overview.person}</th><th scope="col">${text.overview.action}</th><th scope="col">${timingHeading}</th><th scope="col">${text.overview.status}</th></tr></thead><tbody>${actions.map(action => {
        const owner = data.people[action.owner];
        const title = actionTitle(action);
        return `<tr id="task-${action.key}" data-task="${action.key}" data-owner="${owner.id}" tabindex="-1"${location.hash === `#task-${action.key}` ? ' class="task-highlight"' : ""}><td class="task-person">${escape(owner.name)}</td><td class="task-description"><span>${state.decision ? `<a href="${(["resource","schedule","monitor","receipt"].includes(action.key) || action.key.startsWith("reschedule")) ? "#wuxi" : "#decision"}">${escape(title)}</a>` : escape(title)}</span>${actionInfo(action)}</td><td class="action-due" data-label="${escape(timingHeading)}">${actionDue(action, person, mixedTiming)}</td><td data-task-status="${action.status}">${badge(action.status)}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty-actions"><strong>${text.actions.noTasks}</strong>${info("unassigned", text.overview.coverageInfo, note(person.id === "P05" ? text.actions.backupNote : text.actions.alternateNote))}</div>`}
    </section>`;
  }

  function coverageCopy(d) {
    return [d.support.acceptedAt ? text.decision.supportAccepted : d.support.assignedAt ? text.decision.supportAssigned : text.decision.coveragePending, d.approver.id ? text.decision.designated : text.decision.awaitingDesignation, interpolate(text.decision.supportOnly, {limit: money(data.people.P05.budgetLimit)})].join(" ");
  }

  function renderAdvance(state, person) {
    const step = session.getAdvanceInfo();
    const guide = nextGuidedAction(state);
    const guideButton = guide && guide.key !== "advancePublication";
    const stepZone = data.events[step.nextEvent]?.executionTimezone || (state.scene === "prepublication" || ["resourceReviewStart","resourceConfirmed"].includes(step.nextEvent) ? data.calendars.base.timezone : data.baseline.timezone);
    return `<aside class="demo-timeline" aria-label="${text.decision.timeline}"><div class="demo-clock"><strong>${text.decision.timeline}</strong><time datetime="${state.clock}">${instant(state.clock, person.timezone)} ${zoneLabel(person.timezone)}</time><label class="chapter-picker">${text.portal.chapter}<select id="chapter-select"><option value="" disabled selected>${text.portal.chooseChapter}</option>${Object.entries(text.portal.chapters).map(([key,label]) => `<option value="${key}">${label}</option>`).join("")}</select></label></div><div class="demo-controls">${guideButton ? `<button class="button button-primary" id="demo-next-step" data-guide-key="${guide.key}" data-guide-role="${guide.role}"${draftLoading || briefLoading ? " disabled" : ""}>${text.portal.guides[guide.key] || text.decision.guide[guide.key]}</button>` : ""}<button class="button ${guideButton ? "button-secondary" : "button-primary"}" id="advance-event"${step.done || step.blockKey ? " disabled" : ""}>${text.decision.advance}${step.nextEvent ? ` · ${instant(data.events[step.nextEvent].at, stepZone)} ${zoneLabel(stepZone)}` : ""}</button></div><p id="advance-blocker">${guide?.key === "advancePublication" ? text.portal.guides.advancePublication : step.done && !guide ? text.portal.terminal : ["completeTechnical","completeQuality"].includes(guide?.key) ? text.decision.reviewFlow.guided : guide ? text.decision.guide.hint : text.decision.clockOnly}</p>${state.resetNotice ? `<p id="chapter-notice" role="status" data-seeded="${state.chapterSeeded}">${state.chapterSeeded ? text.portal.chapterSeeded : text.portal.chapterBeginning}</p>` : ""}</aside>`;
  }

  function nextGuidedAction(state) {
    const d = state.decision;
    const step = (key, role, target) => ({key,role,target});
    const scheduledStep = (key, role, target, eventRef) => Date.parse(state.clock) >= Date.parse(data.events[eventRef].at) ? step(key,role,target) : null;
    if (state.publication?.status === "draft") {
      if (!state.publication.reviewedAt) return step("editRisk","P07","#review-publication-draft");
      return Date.parse(state.clock) >= Date.parse(data.events.materialReady.at) ? step("publishRisk","P07","#publish-risk") : step("advancePublication","P07","#advance-event");
    }
    if (!d) return step("select","P01","#comparison");
    if (workflow.project(data,state).reviewBlockers.length) return step("resolveReviews","P01",'#review-resubmit-form textarea[name="supplement"]');
    if (!d.tasksCreated) return Object.values(d.drafts).every(value => value.trim()) ? step("confirm","P01","#confirm-task-briefs") : step("draft","P01","#draft-task-briefs");
    if (d.authorization) {
      const r = d.resource;
      const q = r?.rescheduleRequest;
      if (q) {
        if (q.confirmation) return null;
        if (q.authorization) return scheduledStep("confirmReschedule","P07","#confirm-reschedule","rescheduleConfirmed");
        if (q.decision) return scheduledStep("rescheduleAuthorization","P06",'#reschedule-authorization-form input[name="signature"]',"rescheduleAuthorized");
        if (q.quoteReceipt) return scheduledStep("rescheduleDecision","P01","#launch-reschedule-decision","rescheduleDecisionCreated");
        if (q.quote) return scheduledStep("returnQuote","P07","#return-reschedule-quote","rescheduleQuoteReturned");
        return scheduledStep("rescheduleQuote","P08","#record-reschedule-quote","rescheduleQuotePrepared");
      }
      if (r?.receipt?.outcome === "held") return null;
      if (r?.receipt?.outcome === "unavailable" || d.planId === "B") return scheduledStep("reschedule","P07","#request-reschedule","rescheduleRequested");
      if (r?.scheduling && !r.receipt) return step("replyReceipt","P07","#return-resource-receipt");
      if (!r?.startedAt) return Date.parse(state.clock) >= Date.parse(data.events.resourceReviewStart.at) ? step("startResources","P07","#start-resource-review") : null;
      if (Date.parse(state.clock) >= Date.parse(data.events.resourceConfirmed.at)) return step("scheduling","P08",'#resource-response-form select[name="outcome"]');
      return null;
    }
    if (d.reviews.technical.status === "notStarted") return step("startTechnical","P02","#start-technical");
    if (d.reviews.quality.status === "notStarted") return step("startQuality","P03","#start-quality");
    const reached = key => Date.parse(state.clock) >= Date.parse(data.events[key].at);
    if (reached("backupAssigned") && !d.support.assignedAt) return step("assignSupport","P01","#assign-support");
    if (d.support.assignedAt && !d.support.acceptedAt) return step("acceptSupport","P05","#accept-support");
    if (reached("alternateAssigned") && !d.approver.id) return step("designate","P01","#designate-approver");
    if (reached("reviewsComplete")) {
      if (d.reviews.technical.status !== "completed") return step("completeTechnical","P02",'#review-technical-form textarea[name="reason"]');
      if (d.reviews.quality.status !== "completed") return step("completeQuality","P03",'#review-quality-form textarea[name="reason"]');
    }
    if (reached("budgetAuthorized")) {
      // One guide checkpoint before the initial signature. Later business events
      // retain manual updates and shared stale warnings, never another milestone.
      const attachment = global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state});
      if (attachment && !global.DEMO_BRIEF.staleReasons(attachment.brief,{data,state}).length) return step("authorize","P06",'#authorization-form input[name="signature"]');
      if (!managementBrief) return step("managementBrief","P01","#generate-management-brief");
      if (global.DEMO_BRIEF.staleReasons(managementBrief,{data,state}).length) return step("updateBrief","P01","#regenerate-management-brief");
      if (!managementBrief.previewed) return step("previewBrief","P01","#preview-management-brief");
      return step("attachBrief","P01","#attach-management-brief");
    }
    return null;
  }

  function reserveFooterSpace() {
    const bar = document.querySelector(".demo-timeline");
    if (!bar) return;
    document.documentElement.style.setProperty("--demo-bar-space", `${Math.ceil(bar.getBoundingClientRect().height) + 24}px`);
  }
  function fitDraft(field) {
    field.style.height = "auto";
    const border = field.offsetHeight - field.clientHeight;
    field.style.height = `${field.scrollHeight + border + 1}px`;
  }
  function refreshLayout() {
    document.querySelectorAll("[data-draft-role], .decision-form textarea, #management-brief-editor").forEach(fitDraft);
    reserveFooterSpace();
  }
  function focusOperation(target) {
    if (!target) return;
    if (!target.matches("button,input,textarea,select,a")) target.setAttribute("tabindex","-1");
    target.focus({preventScroll:true});
    const headerHeight = document.querySelector(".topbar").getBoundingClientRect().height;
    window.scrollBy({top:target.getBoundingClientRect().top - headerHeight - 32,behavior:"instant"});
  }
  function openGuidedAction() {
    const guide = nextGuidedAction(session.getState());
    if (!guide || draftLoading || briefLoading) return;
    session.setViewer(guide.role); decisionError = ""; notificationsOpen = false;
    activePage = "overview";
    const briefGuide = ["managementBrief","updateBrief","previewBrief","attachBrief"].includes(guide.key);
    if (briefGuide) { briefOpen = Boolean(managementBrief); if (guide.key === "previewBrief") briefPreview = false; if (guide.key === "attachBrief") briefPreview = true; }
    history.pushState(null,"",briefGuide ? (managementBrief ? "#management-brief" : "#decision") : guide.key === "select" ? "#comparison" : text.portal.guides[guide.key] ? "#wuxi" : "#decision");
    render();
    focusOperation(document.querySelector(guide.target));
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
      const message = text.wuxi.notifications[item.kind] || t.kinds[item.kind];
      const owner = data.people[item.task.owner];
      const isRead = read.has(item.id);
      const timing = item.task.timing;
      return `<li><a href="#task-${item.taskKey}" data-notification-id="${escape(item.id)}" data-task-link="${item.taskKey}" data-notification-read="${isRead}" data-notification-kind="${item.kind}"><div class="notification-title"><strong>${escape(message.title)}</strong><span class="notification-read-state">${isRead ? t.read : t.unread}</span></div><p>${escape(interpolate(message.body, { owner: owner.name }))}</p><div class="notification-task">${escape(actionTitle(item.task))}${icon("arrow")}</div><div class="notification-meta"><span>${t.owner}: ${escape(owner.name)}</span><span data-notification-status="${item.task.status}">${badge(item.task.status)}</span></div>${item.at ? `<div class="notification-time" data-notification-sent><span>${t.sentAt}</span> <time datetime="${item.at}">${instant(item.at, person.timezone)} ${zoneLabel(person.timezone)}</time></div>` : `<span class="notification-sequence">${text.portal.sequenceOnly}</span>`}${timing ? `<div class="notification-time" data-notification-timing="${timing.kind}" data-timing-event="${timing.eventRef}"><span>${text.portal.taskTimingLabels[timing.kind]}</span> <time datetime="${timing.at}">${instant(timing.at, person.timezone)} ${zoneLabel(person.timezone)}</time></div>` : ""}</a></li>`;
    }).join("")}</ul>` : `<p class="notifications-empty">${t.empty}</p>`}<div class="notifications-footer"><span class="data-tag">${text.common.assumption}</span><p>${t.readBoundary}</p></div></section></div>`;
  }
  function updateNotifications(open, restoreFocus = false) {
    notificationsOpen = open;
    const state = session.getState();
    document.getElementById("notifications").outerHTML = renderNotifications(state, data.people[state.viewer]);
    if (restoreFocus) document.getElementById("notifications-toggle").focus();
  }

  function gapMarkup(plan, state) {
    if (workflow.project(data,state).forecastReassessmentRequired) return `<span class="gap gap-risk" data-gap="${plan.id}">${text.portal.reassessment}</span>`;
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
    const d = session.getState().decision;
    const rows = [
      { key: "shared", a: data.fees.shared, b: data.fees.shared, condition: "sharedCondition" },
      { key: "expedite", a: data.fees.expedite, condition: "expediteCondition" },
      { key: "hold", a: data.fees.hold, condition: "holdCondition" },
      { key: "reschedule", b: data.fees.reschedule, condition: "rescheduleCondition" }
    ];
    return `<div class="fee-breakdown" id="${escape(id)}"><div class="section-heading"><h3>${text.fees.title}</h3><span class="data-tag">${text.common.assumption}</span></div><p class="fee-current-state">${escape(feeStatement(session.getState()))}</p><div class="table-wrap fee-table-wrap"><table class="fee-table"><thead><tr><th scope="col">${text.fees.item}</th><th scope="col">${text.fees.optionA}</th><th scope="col">${text.fees.optionB}</th><th scope="col">${text.fees.trigger}</th></tr></thead><tbody>${rows.map(row => `<tr data-fee="${row.key}"><th scope="row">${text.fees[row.key]}${row.key === "expedite" ? `<small>${text.fees.expediteDescription}</small>` : ""}</th><td data-fee-plan="A" data-label="${text.fees.optionA}">${row.a ? money(row.a) : text.fees.notIncluded}</td><td data-fee-plan="B" data-label="${text.fees.optionB}">${row.b ? money(row.b) : text.fees.notIncluded}</td><td class="fee-condition" data-label="${text.fees.trigger}">${text.fees[row.condition]}</td></tr>`).join("")}</tbody></table></div><p class="fee-fallback">${escape(interpolate(d?.fallbackSelected ? text.decision.fallbackSelectedFee : text.fees.fallback, { cap: money(data.fees.fallbackCap), total: money(data.fees.totals.AWithFallback) }))}</p><p class="fee-policy-note">${text.fees.syntheticTerms}</p></div>`;
  }

  function renderRoleAction(person, state) {
    if (state.decision) return `<div class="role-next-action" data-role-action="${person.id}"><span><strong>${escape(person.name)}</strong><span class="role-action-divider">·</span>${nextActionCopy(state,person)}</span><a class="button button-secondary role-action-button" href="${state.decision.authorization ? "#wuxi" : "#decision"}">${state.decision.authorization ? text.portal.roleResources : text.decision.openTask}${icon("arrow")}</a></div>`;
    const eventKey = { P01: "backupAssigned", P02: "latestReviewStart", P03: "latestReviewStart" }[person.id];
    const action = eventKey ? workflow.tasks(data, state, person.id)[0] : null;
    const awaitingBrief = action?.status === "briefPending";
    const instruction = awaitingBrief ? text.portal.statuses.briefPending : text.overview.roleInstructions[person.id];
    return `<div class="role-next-action" data-role-action="${person.id}"><span><strong>${escape(person.name)}</strong><span class="role-action-divider">·</span>${instruction}${action ? ` · ${awaitingBrief ? text.portal.taskTimingLabels[action.timing.kind] : text.overview.by} ${actionDue(action, person)}` : ""}</span><a class="button button-secondary role-action-button" href="#risk">${text.overview.roleButtons[person.id]}${icon("arrow")}</a></div>`;
  }

  function nextActionCopy(state, person) {
    const d = state.decision, t = text.decision, n = t.next;
    if (workflow.project(data,state).reviewBlockers.length) return t.reviewFlow.next;
    if (d.authorization) return decisionStatus(state);
    if (!d.tasksCreated) return person.id === "P01" ? n.create : t.blockers.createTasks;
    const reviewsDone = Object.values(d.reviews).every(r => r.status === "completed");
    if (person.id === "P01") return Object.values(d.reviews).some(r => r.status === "notStarted") ? n.start : !d.support.assignedAt ? n.support : !d.support.acceptedAt ? n.accepted : !d.approver.id ? n.designate : !reviewsDone ? n.opinions : n.budget;
    if (["P02","P03"].includes(person.id)) { const r = d.reviews[person.id === "P02" ? "technical" : "quality"]; return r.status === "completed" ? n.reviewerDone : r.status === "inProgress" ? n.reviewerWorking : n.reviewerStart; }
    if (person.id === "P05") return d.support.acceptedAt ? n.preparation : d.support.assignedAt ? t.acceptSupport : t.awaitingAssignment;
    if (person.id === "P06") return !d.approver.id ? t.awaitingDesignation : reviewsDone ? n.sign : n.opinions;
    return t.nextRole[person.id];
  }

  function renderComparison(state) {
    const a = data.plans.A;
    const b = data.plans.B;
    const reassess = workflow.project(data,state).forecastReassessmentRequired;
    const select = plan => state.viewer === "P01" ? `<button class="button button-secondary select-plan" data-select-plan="${plan}"${state.decision?.tasksCreated || draftLoading ? " disabled" : ""}>${state.decision?.planId === plan ? text.decision.selected : interpolate(text.decision.choose, {plan})}</button>` : "";
    const requirement = `<dl class="info-facts"><dt>${text.delivery.deliveryItem}</dt><dd id="requirement-item-display">${escape(state.deliverableOverride || text.project.released)}</dd><dt>${text.delivery.destination}</dt><dd id="requirement-destination-display">${escape(state.destinationOverride || text.project.newJerseyFormulationSite)}</dd><dt>${text.delivery.needBy}</dt><dd>${core.formatLocalDate(state.needByLocalDate)} · ${text.common.newYork}</dd></dl>${note(text.delivery.calendarNote)}`;
    const row = (key, heading, content, help = "") => `<tr data-metric="${key}"><th scope="row"><div class="metric-label">${heading}${help}</div></th>${[a,b].map(plan => `<td data-plan="${plan.id}"${key === "delivery" ? ` data-forecast="${plan.id}"` : ""}>${content(plan)}</td>`).join("")}</tr>`;
    return `<section id="comparison" class="section comparison-section" aria-labelledby="comparison-title">
      <div class="section-heading"><h2 id="comparison-title">${text.overview.compare}</h2><div class="requirement-controls"><span>${text.overview.needDate}: <strong id="need-date-display">${core.formatLocalDate(state.needByLocalDate)}</strong></span>${info("requirement", text.overview.requirementInfo, requirement, "end")}<button class="button button-secondary" id="edit-requirement">${icon("edit")}${text.delivery.edit}</button></div></div>
      <div class="comparison-panel"><div class="table-wrap comparison-wrap"><table id="comparison-table"><thead><tr><th scope="col">${text.overview.factor}</th><th scope="col"><div>${text.overview.optionA}${info("optionA", text.overview.optionAInfo, note(text.delivery.originalCondition))}</div>${select("A")}</th><th scope="col"><div>${text.overview.optionB}${info("optionB", text.overview.optionBInfo, note(text.delivery.candidateCondition), "end")}</div>${select("B")}</th></tr></thead><tbody>
        ${row("cost", `<button id="toggle-costs" class="cost-toggle" aria-expanded="${feesExpanded}" aria-controls="cost-details" aria-label="${text.fees.toggle}">${icon("chevron")}${text.overview.cost}</button>`, plan => `<strong class="amount">${money(plan.total)}</strong>${plan.id === "A" ? `<span class="cost-difference">${interpolate(text.overview.premium, { amount: money(a.total - b.total) })}</span>` : ""}`)}
        <tr id="cost-details"${feesExpanded ? "" : " hidden"}><td colspan="3">${renderFeeBreakdown("overview-cost-detail")}</td></tr>
        ${row("window", text.overview.window, plan => `<time datetime="${plan.window.at}">${dateOnly(plan.window.at, data.calendars.base.timezone)}</time><span class="inline-meta">${text.common.shanghai}</span>`, info("window", text.overview.windowInfo, note(text.overview.windowExplanation)))}
        ${row("delivery", text.overview.estimatedDelivery, plan => `${reassess ? `<strong>${text.portal.reassessment}</strong><small>${text.portal.previousEstimate}</small>` : ""}<time datetime="${plan.forecast.delivery}">${dateOnly(plan.forecast.delivery, data.baseline.timezone)}</time><span class="inline-meta">${text.common.newYork}</span>`, info("delivery", text.overview.deliveryInfo, note(reassess ? text.portal.forecastInvalid : text.overview.deliveryExplanation)))}
        ${row("gap", text.overview.difference, plan => gapMarkup(plan, state))}
        ${row("confirmation", text.overview.confirmed, plan => `<span class="confirmation-status" data-confirmation="${plan.id}">${windowStatus(plan,state)}</span>`)}
      </tbody></table></div><p class="shared-prerequisite">${text.overview.sharedPrerequisite}</p>${renderBasis()}</div>
    </section>`;
  }

  function renderContext(state) {
    const contextView = workflow.project(data,state);
    const reassess = contextView.forecastReassessmentRequired;
    const milestoneWindow = contextView.rescheduleConfirmed ? data.plans.B.window.at : data.plans.A.window.at;
    const milestoneWindowLabel = contextView.rescheduleConfirmed ? text.portal.confirmedWindow : text.decision.original;
    const milestones = `${note(text.overview.developmentScope)}<dl class="info-facts"><dt>${text.context.gmp}</dt><dd>${dateOnly(milestoneWindow, data.calendars.base.timezone)} · ${text.common.shanghai}</dd><dt>${text.context.releasedDS}</dt><dd>${reassess ? text.portal.reassessment + " · " + text.portal.previousEstimate + " · " : ""}${core.formatLocalDate(data.plans.A.forecast.localDate)} · ${text.common.newYork} · ${text.common.estimated}</dd><dt>${text.context.ind}</dt><dd>${text.context.noDate}</dd></dl>${note(text.context.shipmentNote)}<button class="text-button" data-open-report>${text.context.study} · ${data.reports["SEC-001"].id}</button>`;
    return `<section id="context" class="section context-section" aria-labelledby="context-title"><div class="section-heading"><div class="heading-with-info"><h2 id="context-title">${text.context.title}</h2>${info("program", text.overview.contextInfo, milestones)}</div></div>
      <ol class="progress-track" aria-label="${escape(text.context.milestones)}"><li class="research-complete" data-research-status="${data.project.researchStatusKey}"><span class="progress-node">${icon("check")}</span><span>R · ${text.context.research}</span><span class="current-label research-status">${text.common.researchComplete}</span></li><li aria-current="step"><span class="progress-node"></span><strong>D · ${text.context.development}</strong><span class="current-label">${text.context.current}</span></li><li><span class="progress-node"></span><span>M · ${text.context.manufacturing}</span><span class="current-label">${text.common.notStarted}</span></li></ol>
      <div id="milestone-strip"><div><span>${text.context.gmp}</span><strong>${dateOnly(milestoneWindow, data.calendars.base.timezone)}</strong><small>${milestoneWindowLabel} · ${text.common.shanghai}</small></div><div><span>${text.context.releasedDS}</span><strong>${reassess ? text.portal.reassessment : core.formatLocalDate(data.plans.A.forecast.localDate)}</strong><small>${reassess ? text.portal.previousEstimate + " · " + core.formatLocalDate(data.plans.A.forecast.localDate) : text.common.estimated} · ${text.common.newYork}</small></div><div><span>${text.context.ind}</span><strong>${text.context.noDate}</strong></div></div>
      <div class="table-wrap development-wrap"><table class="development-table" aria-label="${escape(text.context.developmentWorkstreams)}"><thead><tr>${data.project.developmentWorkstreams.map(stream => `<th scope="col">${text.context.workstreamNames[stream.id]}</th>`).join("")}</tr></thead><tbody><tr>${data.project.developmentWorkstreams.map(stream => `<td data-workstream="${stream.id}" data-status="${stream.statusKey}" data-label="${escape(text.context.workstreamNames[stream.id])}">${badge(stream.statusKey)}</td>`).join("")}</tr></tbody></table></div>
    </section>`;
  }

  function renderWuxi(state) {
    return global.DEMO_WUXI_VIEW.render({data,core,state,text,formValues,helpers:{escape,interpolate,money,instant,dateOnly,zoneLabel,city,icon,info,note,badge,renderFeeBreakdown,renderAuthorizationBrief,renderAuthorizationBasis,recordText}});
  }
  function renderUnpublished(state, person) {
    return `<div class="page-heading"><h1>${state.viewer === "P07" ? text.portal.privateDraft : text.project.title}</h1><div class="snapshot"><span>${text.overview.snapshot}</span> <time id="snapshot-time" datetime="${state.clock}">${instant(state.clock,person.timezone)}</time> ${zoneLabel(person.timezone)}</div></div>${state.viewer === "P07" ? renderWuxi(state) : `<section class="unpublished-state"><h2>${text.portal.hiddenTitle}</h2><p>${text.portal.hiddenBody}</p></section>`}`;
  }

  function render() {
    const isRisk = activePage === "risk";
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.querySelector('meta[name="description"]').content = text.meta.description;
    document.title = isRisk ? `${text.riskDetail.title} · ${data.project.id}` : text.meta.title;
    const state = session.getState();
    const person = data.people[state.viewer];
    const unpublished = state.publication?.status === "draft";
    const view = workflow.project(data,state);
    const isWuxi = ["P07","P08"].includes(state.viewer);
    const banner = bannerState(state);
    const finding = interpolate(text.overview.finding, { measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1) });
    const nextTimingInfo = view.nextTiming ? `<p>${text.portal.timingLabels[view.rescheduleConfirmed ? "technicalReassessment" : view.nextTiming.kind]}: ${instant(data.events[view.nextTiming.eventRef].at, view.nextTiming.timezone)} · ${city(view.nextTiming.timezone)}</p>` : "";
    const riskInfo = note(finding) + note(text.portal.certainty[state.publication?.certainty || "underAssessment"]) + (view.reviewBlockers.length ? note(reviewBlockerSummary(state)) + note(text.decision.reviewFlow.next) : state.decision?.version > 1 && !view.reviewsApproved ? note(text.decision.reviewFlow.recheck) : view.nextTiming ? nextTimingInfo + (view.resourceRejected ? note(text.portal.forecastInvalid) : "") : view.resourceConfirmed ? note(text.portal.successNote) : view.resourceRejected ? note(text.portal.forecastInvalid) : `<p>${text.common.nextUpdate}: ${instant(data.events[state.decision?.authorization ? "resourceConfirmed" : state.publication?.nextUpdateEvent || "reviewsComplete"].at, person.timezone)} · ${city(person.timezone)}</p>`) + `<button class="text-button" data-open-report>${text.risk.report} · ${data.reports["SEC-001"].id}</button>`;
    root.innerHTML = `<a class="skip-link" href="#main">${text.nav.skip}</a>
      <header class="topbar"><div class="app-identity"><a class="brand" href="#main">${text.common.brand}</a><span class="project-id">${data.project.id}</span><span class="customer-name">${escape(data.project.customer)}</span></div><div class="topbar-tools">${language === "zh" ? info("terminology",text.common.glossaryTitle,`<dl class="info-facts">${Object.entries(text.common.glossary).map(([term,meaning])=>`<dt>${escape(term)}</dt><dd>${escape(meaning)}</dd>`).join("")}</dl>`,"end") : ""}<details id="language-menu" class="language-menu"><summary aria-label="${text.overview.language}">${icon("globe")}<span>${text.common.languageCurrent}</span>${icon("down")}</summary><div class="language-options"><button type="button" data-language="en" aria-current="${language === "en"}">${text.common.languageEnglish}</button><button type="button" data-language="zh" aria-current="${language === "zh"}">${text.common.languageChinese}</button></div></details><span class="data-tag demo-tag">${text.common.demo}</span><button class="icon-button" id="reset-demo" aria-label="${escape(text.common.reset)}" title="${escape(text.common.reset)}">${icon("reset")}</button><div class="viewer-picker"><label for="viewer">${text.common.viewAs}${person.statusKey === "onLeave" ? ` · ${text.common.unavailable}` : ""}</label><select id="viewer" aria-label="${escape(text.common.viewAs)}">${Object.values(data.people).map(p => `<option value="${p.id}"${p.id === state.viewer ? " selected" : ""}>${escape(p.name)} · ${escape(text.roles[p.roleKey])}</option>`).join("")}</select></div>${renderNotifications(state, person)}</div></header>
      <main id="main" tabindex="-1" data-page="${unpublished ? "unpublished" : isRisk ? "risk" : "overview"}">${unpublished ? renderUnpublished(state,person) : isRisk ? global.DEMO_RISK_VIEW.render({data, core, state, person, text, helpers: {escape, interpolate, icon, info, note, instant, dateOnly, city, zoneLabel, money, badge, renderFeeBreakdown, renderRoleAction, recordText}}) : `<div class="page-heading"><h1>${text.project.title}</h1><nav aria-label="${escape(text.nav.workspace)}"><a href="#comparison">${text.overview.compare}</a><a href="#actions">${text.nav.actions}</a><a href="#decision">${text.decision.title}</a><a href="#context">${text.context.title}</a></nav><div class="snapshot"><span>${text.overview.snapshot}</span> <time datetime="${state.clock}" id="snapshot-time">${instant(state.clock, person.timezone, { weekday: "short" })}</time> ${zoneLabel(person.timezone)}</div></div>
      <section id="priority-risk" class="priority-risk" data-open-risk aria-labelledby="risk-title"><div class="risk-fact"><h2 id="risk-title"><a href="#risk" aria-label="${text.overview.riskDetails}">${text.overview.riskTitle}</a></h2><span class="risk-status">${banner.status}</span><span id="project-status" class="risk-status" aria-label="${text.decision.projectStatus}">${text.common.atRisk}</span>${info("risk", text.overview.riskInfo, riskInfo)}<span class="data-tag assumption-tag">${text.common.assumption}</span></div><div id="decision-deadline" data-timing-kind="${banner.kind || "milestone"}" data-deadline-state="${view.rescheduleConfirmed ? "rescheduled" : view.resourceConfirmed ? "held" : view.resourceRejected || view.rescheduleRequested ? "pending" : "due"}"><span>${banner.label}</span>${banner.at ? `<time datetime="${banner.at}">${instant(banner.at,banner.zone,{weekday:"short"})} ${zoneLabel(banner.zone)}</time>` : `<strong>${text.portal.notScheduled}</strong>`}</div></section>${renderRoleAction(person, state)}
      ${renderComparison(state)}${renderActions(state, person)}${global.DEMO_DECISION_VIEW.render({data,core,state,text,draftLoading,error:decisionError,formValues,helpers:{escape,interpolate,money,instant,zoneLabel,decisionStatus,feeStatement,renderAuthorizationBrief,renderAuthorizationBasis,recordText}})}${renderWuxi(state)}${renderContext(state)}`}
      ${renderManagementBrief(state)}${renderAdvance(state,person)}
      <footer class="page-footer">${text.overview.footer}</footer></main>`;
    explainTerms(root);
    footerObserver.disconnect();
    refreshLayout();
    footerObserver.observe(document.querySelector(".demo-timeline"));
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
    explainTerms(dialog);
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

  function performDecision(action, message) {
    try {
      action(); decisionError = ""; render();
      if (message) notify(message);
      return true;
    } catch (error) {
      decisionError = text.brief.errors[error.message] || text.wuxi.errors[error.message] || text.decision.errors[error.message] || text.decision.errors.default;
      // Keep the current form and its rationale intact when validation fails.
      const target = document.getElementById("decision-error");
      if (target) { target.textContent = decisionError; target.hidden = false; target.scrollIntoView({block:"nearest"}); }
      else notify(decisionError);
      return false;
    }
  }
  function createBriefs(plan, fallbackSelected, publication) {
    return global.DEMO_I18N.taskBriefs({data,text,plan,fallbackSelected,publication});
  }
  function enterChapter(id) {
    const fixtures = {
      drafts:createBriefs("A",false,{certainty:"underAssessment",nextUpdateEvent:"reviewsComplete"}),
      reviewReasons:{technical:text.decision.examples.technical,quality:text.decision.examples.quality},
      authorizationReason:interpolate(text.decision.examples.authorization,{plan:"A",amount:money(data.plans.A.total)})
    };
    if (!performDecision(() => session.enterChapter(id,fixtures))) return;
    formValues = {}; draftGeneration++; draftLoading = false; decisionError = ""; feesExpanded = false;
    notificationsOpen = false; notificationReads.clear(); dialog.close(); clearBrief(); activePage = "overview";
    history.replaceState(null,"",["prepublication","hold","unavailable"].includes(id) ? "#wuxi" : id === "selection" ? "#comparison" : "#decision");
    render(); notify(interpolate(text.portal.chapterReset,{chapter:text.portal.chapters[id]}));
    focusRouteTarget();
  }
  function generateDrafts() {
    const state = session.getState();
    if (draftLoading || state.viewer !== "P01" || !state.decision || state.decision.tasksCreated) return;
    const generation = ++draftGeneration;
    const plan = state.decision.planId;
    draftLoading = true; render();
    setTimeout(() => {
      if (generation !== draftGeneration) return;
      const current = session.getState();
      draftLoading = false;
      if (current.viewer !== "P01" || current.decision?.planId !== plan || current.decision?.tasksCreated) { render(); return; }
      performDecision(() => session.saveDrafts(createBriefs(plan,current.decision.fallbackSelected,current.publication)), text.decision.draftSaved);
    }, 800);
  }
  function openSource(id) {
    if (id === "SEC-001") { openReport(); return; }
    if (!data.reports[id]) return;
    openDialog(`${dialogHeading(`${id} · v${data.reports[id].version}`,text.decision.sourceTitle)}<span class="data-tag">${text.common.demo}</span><span class="data-tag">${text.common.assumption}</span>${id === "EXP-001" ? `<p class="dialog-intro">${text.decision.experimentScope}</p><p>${text.delivery.assumptions}</p>` : renderFeeBreakdown("source-cost-detail")}<div class="dialog-actions"><button class="button button-primary" data-close>${text.common.close}</button></div>`);
  }

  function requestBriefUpdate() {
    if (session.getState().viewer !== "P01") return;
    openDialog(`${dialogHeading(text.brief.regenerateTitle)}<p class="dialog-intro">${text.brief.regenerateBody}</p><div class="dialog-actions"><button class="button button-secondary" data-close>${text.common.cancel}</button><button class="button button-primary" id="confirm-regenerate-brief">${text.brief.regenerateConfirm}</button></div>`);
  }
  function generateManagementBrief(replace = false) {
    const state = session.getState();
    if (briefLoading || state.viewer !== "P01" || state.publication.status !== "published") return;
    briefOpen = true;
    if (managementBrief && !replace) {
      render(); focusOperation(document.getElementById("management-brief"));
      if (global.DEMO_BRIEF.staleReasons(managementBrief,{data,state}).length) requestBriefUpdate();
      return;
    }
    const generation = ++briefGeneration;
    briefLoading = true; briefPreview = false; briefCopied = false; render(); focusOperation(document.getElementById("management-brief"));
    setTimeout(() => {
      if (generation !== briefGeneration) return;
      briefLoading = false;
      const current = session.getState();
      if (current.viewer !== "P01" || current.publication.status !== "published") { render(); return; }
      managementBrief = global.DEMO_BRIEF.generate({data,core,state:current,text});
      render(); focusOperation(document.getElementById("management-brief-editor"));
    },650);
  }
  function attachManagementBrief() {
    const state = session.getState();
    if (state.viewer !== "P01" || !managementBrief || !briefPreview || briefLoading) return;
    try {
      const attachment = global.DEMO_BRIEF.attach({brief:managementBrief,attachments:briefAttachments,data,core,state});
      if (!briefAttachments.includes(attachment)) briefAttachments.push(attachment);
      render(); focusOperation(document.getElementById("brief-attachment-status"));
      notify(interpolate(text.brief.attachedNotice,{version:attachment.version}));
    } catch (error) { notify(text.brief.errors[error.message] || text.brief.attachmentFailed); }
  }
  async function copyManagementBrief(allowStale = false) {
    const state = session.getState();
    if (state.viewer !== "P01" || state.publication.status !== "published" || !managementBrief || !briefPreview) return;
    const staleReasons = global.DEMO_BRIEF.staleReasons(managementBrief,{data,state});
    if (staleReasons.length && !allowStale) {
      openDialog(`${dialogHeading(text.brief.staleCopyTitle)}<p class="dialog-intro">${text.brief.staleCopyBody}</p><div class="dialog-actions"><button class="button button-secondary" data-close>${text.common.cancel}</button><button class="button button-primary" id="confirm-copy-stale-brief">${text.brief.staleCopyConfirm}</button></div>`); return;
    }
    const content = global.DEMO_BRIEF.copyText(managementBrief,text,{staleReasons});
    const html = global.DEMO_BRIEF_VIEW.copyHtml(managementBrief,text,{staleReasons});
    let copied = false;
    if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
      try { await navigator.clipboard.write([new ClipboardItem({"text/plain": new Blob([content],{type:"text/plain"}),"text/html": new Blob([html],{type:"text/html"})})]); copied = true; } catch (_) { /* Try the compatible plain-text clipboard path below. */ }
    }
    if (!copied) { try { await navigator.clipboard.writeText(content); copied = true; } catch (_) { /* Local file previews may require the selection fallback. */ } }
    if (!copied) {
      const field = document.createElement("textarea"); field.value = content;
      field.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.append(field); field.select();
      const clipboard = event => { if (event.clipboardData) { event.clipboardData.setData("text/plain",content); event.clipboardData.setData("text/html",html); event.preventDefault(); } };
      document.addEventListener("copy",clipboard);
      try { copied = document.execCommand("copy"); } catch (_) { copied = false; } finally { document.removeEventListener("copy",clipboard); field.remove(); }
    }
    briefCopied = copied; render();
    notify(copied ? text.brief.copied : text.brief.copyFailed);
    const preview = document.getElementById("management-brief-preview");
    if (!copied && preview) { const range = document.createRange(); range.selectNodeContents(preview); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
  }

  document.addEventListener("click", event => {
    const languageButton = event.target.closest("[data-language]");
    if (languageButton) {
      const nextLanguage = languageButton.dataset.language;
      if (!global.DEMO_MESSAGES[nextLanguage]) return;
      const previousText = text;
      const errorKey = ["brief", "wuxi", "decision"].flatMap(group => Object.entries(previousText[group].errors).map(([key,value])=>({group,key,value}))).find(item=>item.value === decisionError);
      language = nextLanguage; text = global.DEMO_MESSAGES[language]; core = global.DEMO_I18N.coreFor(text);
      if (managementBrief) managementBrief = global.DEMO_BRIEF.localize(managementBrief,text);
      decisionError = errorKey ? text[errorKey.group].errors[errorKey.key] : ""; briefCopied = false;
      clearTimeout(noticeTimer); document.getElementById("notice").classList.remove("visible");
      render(); document.querySelector("#language-menu summary").focus(); return;
    }
    if (event.target.closest("#attach-management-brief:not(:disabled)")) { attachManagementBrief(); return; }
    if (event.target.closest("#view-management-brief")) {
      const state = session.getState();
      if (state.viewer !== "P06" || !global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state})) return;
      briefOpen = true; render(); focusOperation(document.getElementById("management-brief")); return;
    }
    if (event.target.closest("#update-shared-brief")) {
      if (session.getState().viewer !== "P06") return;
      session.setViewer("P01"); notificationsOpen = false; activePage = "overview"; briefOpen = Boolean(managementBrief);
      const staleDraft = managementBrief && global.DEMO_BRIEF.staleReasons(managementBrief,{data,state:session.getState()}).length;
      const target = !managementBrief ? "generate-management-brief" : staleDraft ? "regenerate-management-brief" : !managementBrief.previewed ? "preview-management-brief" : "attach-management-brief";
      if (target === "preview-management-brief") briefPreview = false;
      if (target === "attach-management-brief") briefPreview = true;
      render(); focusOperation(document.getElementById(target)); return;
    }
    if (event.target.closest("#generate-management-brief")) { generateManagementBrief(); return; }
    if (event.target.closest("#regenerate-management-brief")) { requestBriefUpdate(); return; }
    if (event.target.closest("#confirm-regenerate-brief")) { dialog.close(); generateManagementBrief(true); return; }
    if (event.target.closest("#preview-management-brief")) {
      if (session.getState().viewer !== "P01" || !managementBrief) return;
      briefPreview = true; managementBrief.previewed = true;
      render(); focusOperation(document.getElementById("management-brief-preview")); return;
    }
    if (event.target.closest("#edit-management-brief")) {
      if (session.getState().viewer !== "P01" || !managementBrief) return;
      briefPreview = false; briefCopied = false; render(); focusOperation(document.getElementById("management-brief-editor")); return;
    }
    if (event.target.closest("#copy-management-brief")) { void copyManagementBrief(); return; }
    if (event.target.closest("#confirm-copy-stale-brief")) { dialog.close(); void copyManagementBrief(true); return; }
    if (event.target.closest("#demo-next-step:not(:disabled)")) { openGuidedAction(); return; }
    if (event.target.closest("#fill-example-signature:not(:disabled)")) {
      const input = document.querySelector('#authorization-form input[name="signature"]');
      if (input && !input.disabled) { input.value = data.people.P06.name; formValues.signature = input.value; focusOperation(input); }
      return;
    }
    if (event.target.closest("#fill-reschedule-signature:not(:disabled)")) {
      const input = document.querySelector('#reschedule-authorization-form input[name="signature"]');
      if (input && !input.disabled) { input.value = data.people.P06.name; formValues.rescheduleSignature = input.value; focusOperation(input); } return;
    }
    const selection = event.target.closest("[data-select-plan]");
    if (selection && !selection.disabled) {
      if (performDecision(() => session.selectPlan(selection.dataset.selectPlan))) { location.hash = "decision"; focusRouteTarget(); }
      return;
    }
    if (event.target.closest("#draft-task-briefs:not(:disabled)")) { generateDrafts(); return; }
    const decisionActions = {
      "confirm-task-briefs": [() => session.confirmTasks(),text.decision.createdNotice],
      "start-technical": [() => session.startReview("technical")], "start-quality": [() => session.startReview("quality")],
      "assign-support": [() => session.assignSupport()], "accept-support": [() => session.acceptSupport()],
      "designate-approver": [() => session.designateApprover()],
      "start-resource-review": [() => session.startResourceReview()],
      "return-resource-receipt": [() => session.returnResourceReceipt()],
      "request-reschedule": [() => session.requestReschedule()],
      "review-publication-draft": [() => session.reviewRiskDraft()],
      "record-reschedule-quote": [() => session.respondRescheduleQuote()],
      "return-reschedule-quote": [() => session.returnRescheduleQuote()],
      "launch-reschedule-decision": [() => session.createRescheduleDecision()],
      "confirm-reschedule": [() => session.confirmReschedule()],
      "advance-event": [() => session.advanceNext(),text.decision.advanceNotice]
    };
    const button = event.target.closest("button");
    if (button && !button.disabled && decisionActions[button.id]) { performDecision(...decisionActions[button.id]); return; }
    const source = event.target.closest("[data-source-report]");
    if (source) { openSource(source.dataset.sourceReport); return; }
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
    if (event.target.closest("[data-close]")) dialog.close();
    if (event.target.closest("#reset-demo")) openDialog(`${dialogHeading(text.common.resetTitle)}<p class="dialog-intro">${text.common.resetBody}</p><div class="dialog-actions"><button class="button button-secondary" data-close>${text.common.cancel}</button><button class="button button-primary" id="confirm-reset">${text.common.resetConfirm}</button></div>`);
    if (event.target.closest("#confirm-reset")) {
      session.reset("customer"); clearBrief(); formValues = {}; draftGeneration++; draftLoading = false; decisionError = ""; feesExpanded = false; notificationsOpen = false; notificationReads.clear(); dialog.close(); render();
      notify(text.common.resetNotice); document.getElementById("reset-demo").focus();
    }
  });
  document.addEventListener("change", event => {
    if (event.target.id === "chapter-select") { enterChapter(event.target.value); return; }
    if (event.target.closest("#risk-publication-form")) {
      const name = event.target.name;
      const fields = new FormData(event.target.closest("form"));
      performDecision(() => session.saveRiskDraft({certainty:String(fields.get("certainty")),nextUpdateEvent:String(fields.get("nextUpdateEvent"))}));
      document.querySelector(`#risk-publication-form [name="${name}"]`)?.focus({preventScroll:true});
      return;
    }
    if (event.target.closest("#resource-response-form") && event.target.name === "outcome") {
      formValues.resourceOutcome = event.target.value;
      const defaults = ["held","unavailable"].map(outcome => global.DEMO_WUXI_VIEW.defaultReason({data,core,text,outcome}));
      if (!formValues.resourceReason || defaults.includes(formValues.resourceReason)) formValues.resourceReason = global.DEMO_WUXI_VIEW.defaultReason({data,core,text,outcome:event.target.value});
      render(); document.querySelector('#resource-response-form select[name="outcome"]')?.focus({preventScroll:true}); return;
    }
    if (event.target.id === "fallback-authorization") { draftGeneration++; draftLoading = false; performDecision(() => session.setFallback(event.target.checked)); return; }
    if (event.target.id === "viewer") {
      notificationsOpen = false; decisionError = ""; draftGeneration++; draftLoading = false;
      if (briefLoading && !managementBrief) briefOpen = false;
      briefGeneration++; briefLoading = false;
      session.setViewer(event.target.value); render();
      document.getElementById("viewer").focus();
    }
  });
  document.addEventListener("input", event => {
    const field = event.target;
    if (field.setCustomValidity) field.setCustomValidity("");
    const form = field.closest("form");
    if (field.id === "management-brief-editor") {
      if (session.getState().viewer !== "P01" || !managementBrief) return;
      managementBrief.content = field.value; managementBrief.edited = true; managementBrief.previewed = false; briefPreview = false; briefCopied = false; fitDraft(field);
      const counter = document.getElementById("management-brief-word-count");
      if (counter) counter.textContent = interpolate(text.brief.wordCount,{count:global.DEMO_BRIEF.wordCount(managementBrief,text,{staleReasons:global.DEMO_BRIEF.staleReasons(managementBrief,{data,state:session.getState()})})});
      return;
    }
    if (field.matches(".decision-form textarea")) fitDraft(field);
    if (form?.id === "resource-response-form" && field.name === "reason") formValues.resourceReason = field.value;
    if (form?.id === "review-technical-form") formValues[field.name === "outcome" ? "technicalOutcome" : "technicalReason"] = field.value;
    if (form?.id === "review-quality-form") formValues[field.name === "outcome" ? "qualityOutcome" : "qualityReason"] = field.value;
    if (form?.id === "review-resubmit-form") formValues.supplement = field.value;
    if (form?.id === "authorization-form") {
      if (field.name === "reason") formValues.authorizationReason = field.value;
      if (field.name === "signature") formValues.signature = field.value;
      if (field.name === "acknowledged") formValues.acknowledged = field.checked;
    }
    if (form?.id === "reschedule-authorization-form") {
      if (field.name === "reason") formValues.rescheduleAuthorizationReason = field.value;
      if (field.name === "signature") formValues.rescheduleSignature = field.value;
      if (field.name === "acknowledged") formValues.rescheduleAcknowledged = field.checked;
    }
    if (!event.target.matches("[data-draft-role]")) return;
    fitDraft(event.target);
    try { session.saveDrafts(Object.fromEntries([...document.querySelectorAll("[data-draft-role]")].map(field => [field.dataset.draftRole,field.value]))); }
    catch (error) { notify(text.wuxi.errors[error.message] || text.decision.errors[error.message] || text.decision.errors.default); }
  });
  document.addEventListener("invalid", event => {
    const field = event.target;
    if (field.setCustomValidity) field.setCustomValidity(field.validity.valueMissing ? text.common.requiredField : text.common.invalidField);
  }, true);
  document.addEventListener("submit", event => {
    if (event.target.id === "review-resubmit-form") {
      event.preventDefault(); const values = new FormData(event.target);
      if (performDecision(() => session.resubmitReviews(String(values.get("supplement"))), text.decision.reviewFlow.resubmitted)) { formValues = {}; render(); }
      return;
    }
    if (event.target.id === "reschedule-authorization-form") {
      event.preventDefault(); const form = new FormData(event.target);
      performDecision(() => session.authorizeReschedule({signature:String(form.get("signature")),reason:String(form.get("reason")),acknowledged:form.get("acknowledged") === "on",briefAttachment:global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state:session.getState()})})); return;
    }
    if (event.target.id === "risk-publication-form") {
      event.preventDefault();
      if (performDecision(() => session.publishRisk())) { activePage = "overview"; history.replaceState(null,"","#main"); render(); focusRouteTarget(); }
      return;
    }
    if (event.target.id === "resource-response-form") {
      event.preventDefault(); const fields = new FormData(event.target);
      performDecision(() => session.respondScheduling({outcome:String(fields.get("outcome")),reason:String(fields.get("reason"))})); return;
    }
    if (/^review-(technical|quality)-form$/.test(event.target.id)) {
      event.preventDefault();
      const kind = event.target.id.split("-")[1];
      const values = new FormData(event.target);
      performDecision(() => session.completeReview(kind,String(values.get("reason")),String(values.get("outcome"))));
      return;
    }
    if (event.target.id === "authorization-form") {
      event.preventDefault(); const form = new FormData(event.target);
      performDecision(() => session.authorize({signature: String(form.get("signature")),reason: String(form.get("reason")),acknowledged: form.get("acknowledged") === "on",briefAttachment:global.DEMO_BRIEF.currentAttachment(briefAttachments,{data,state:session.getState()})}),text.decision.authorizationNotice);
      return;
    }
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
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(refreshLayout);
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

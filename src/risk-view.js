(function (global) {
  "use strict";

  function render({ data, core, state, person, text, helpers }) {
    const t = text.riskDetail;
    const { escape, interpolate, icon, info, note, instant, dateOnly, city, zoneLabel, money } = helpers;
    const a = data.plans.A;
    const b = data.plans.B;
    const baseZone = data.calendars.base.timezone;
    const customerZone = data.calendars.customer.timezone;
    const stage = (plan, id) => plan.stages.find(item => item.id === id);
    const copy = (template, values) => escape(interpolate(template, values));
    const time = (at, zone, options) => `<time datetime="${at}">${instant(at, zone, options)}</time>`;
    const resultDate = (plan, id) => {
      const value = stage(plan, id);
      return `<time datetime="${value.end}">${dateOnly(value.end, value.executionTimezone)}</time>`;
    };
    const reviewStart = `<div class="risk-review-start"><span>${t.reviewDue}</span> <strong>${time(data.events.latestReviewStart.at, person.timezone, { weekday: "short" })} ${zoneLabel(person.timezone)}</strong></div>`;
    const supportBoundary = copy(t.supportBoundary, { name: data.people.P05.name });
    const assumption = `<span class="data-tag assumption-tag">${text.common.assumption}</span>`;

    function resultFocus() {
      const review = stage(a, "customerResultReview");
      const reviewDates = {
        start: core.formatInstant(review.start, customerZone, { hour: undefined, minute: undefined }),
        end: core.formatInstant(review.end, customerZone, { hour: undefined, minute: undefined }),
        deadline: core.formatInstant(a.holdUntil, baseZone)
      };
      return `<div class="table-wrap risk-result-wrap"><table class="risk-result-table"><caption>${t.resultDates}</caption><thead><tr><th scope="col">${t.option}</th><th scope="col">${t.firstResults}</th><th scope="col">${t.fullReport}</th><th scope="col">${t.internalAssessment}</th></tr></thead><tbody>${[a, b].map(plan => `<tr data-result-plan="${plan.id}"><th scope="row">${plan.id}</th><td>${resultDate(plan, "firstAnalysis")}</td><td>${resultDate(plan, "finalAnalysis")}</td><td>${resultDate(plan, "internalAssessment")}</td></tr>`).join("")}</tbody></table></div>
        <div class="risk-hold-line"><strong>${t.originalWindow}: ${dateOnly(a.window.at, baseZone)}</strong><span class="status">${t.notRequested}</span>${info("conditionalHold", t.holdUntil, note(t.holdExplanation))}<span>${t.holdUntil} <strong>${time(a.holdUntil, baseZone)} ${city(baseZone)}</strong></span></div>
        <p class="risk-focus-statement">${t.originalAvailable}</p><p class="risk-focus-detail">${copy(t.resultReview, reviewDates)}</p><p class="risk-focus-detail">${t.bWindow}</p>`;
    }

    function reviewFocus() {
      return `${reviewStart}<p class="risk-focus-statement">${person.id === "P03" ? t.qualityScope : t.technicalScope}</p><ul class="risk-review-scope"><li>${copy(t.studyRuns, { screening: data.lab.scope.screeningRuns, confirmation: data.lab.scope.confirmationRuns, total: data.lab.scope.totalRuns })}</li><li>${t.allSamples}</li><li>${t.selectedSamples}</li><li>${t.evaluation}</li></ul><div class="risk-scope-boundary">${t.reviewBoundary}${info("reviewScope", t.scope, note(t.scopeExclusions))}</div>`;
    }

    function budgetFocus() {
      return `<div class="risk-budget-summary"><div><span>${t.proposedCommitment} · ${t.commitmentA}</span><strong>${money(a.total)}</strong></div><div><span>${t.proposedCommitment} · ${t.commitmentB}</span><strong>${money(b.total)}</strong></div><span class="status">${t.noCommitment}</span></div>
        <p class="risk-focus-statement">${copy(t.irreversible, { amount: money(data.fees.resourceCommitment) })}</p><p>${copy(t.commonCommitment, { amount: money(data.fees.shared) })}</p><p class="risk-focus-detail">${t.designationPending}${info("finalBudgetPackage", t.finalPackageTitle, note(t.finalPackage) + note(t.rescheduleCommitment.replace("{amount}", money(data.fees.reschedule))))}</p>
        ${helpers.renderFeeBreakdown ? helpers.renderFeeBreakdown("risk-fees") : ""}`;
    }

    function roleFocus() {
      let content;
      if (person.id === "P01") content = resultFocus();
      else if (["P02", "P03"].includes(person.id)) content = reviewFocus();
      else if (person.id === "P06") content = budgetFocus();
      else if (person.id === "P04") content = `<span class="status status-onLeave">${t.leave}</span><p class="risk-focus-statement">${copy(t.leaveCoverage, { pm: data.people.P01.name, support: data.people.P05.name, approver: data.people.P06.name })}</p><p>${supportBoundary}</p>`;
      else if (person.id === "P05") content = `<span class="status">${t.supportPending}</span><p class="risk-focus-statement">${supportBoundary}</p><p>${t.finalPackage}</p>`;
      else content = `<p class="risk-focus-statement">${t.coordinationScope}</p><p>${t.confirmationScope}</p><div class="risk-review-start"><span>${t.confirmationDue}</span> <strong>${time(data.events.resourceConfirmationDeadline.at, person.timezone, { weekday: "short" })} ${zoneLabel(person.timezone)}</strong></div>`;
      return `<section id="risk-role-focus" class="section role-risk-focus" data-risk-role="${person.id}" aria-labelledby="risk-focus-title"><div class="section-heading"><h2 id="risk-focus-title">${t.focus[person.id]}</h2>${assumption}</div>${content}</section>`;
    }

    function evidence() {
      const evidence = data.risk.evidence;
      const report = data.reports[evidence.reportRef];
      const publisher = data.people[evidence.publisherId];
      return `<section id="risk-evidence" class="section" aria-labelledby="risk-evidence-title"><div class="section-heading"><h2 id="risk-evidence-title">${t.evidence}</h2><button class="button button-secondary" data-report="${report.id}">${icon("report")}${t.reportAction}</button></div><div class="table-wrap"><table class="risk-evidence-table"><thead><tr><th scope="col">${t.method}</th><th scope="col">${t.measured}</th><th scope="col">${t.target}</th><th scope="col">${t.sample}</th><th scope="col">${t.report}</th><th scope="col">${t.version}</th></tr></thead><tbody><tr><td data-field="method" data-label="${escape(t.method)}">${t.methodValue}<small>${t.measurement}</small></td><td class="risk-measurement" data-field="measured" data-label="${escape(t.measured)}">${data.risk.hmwPct.toFixed(1)}%</td><td data-field="target" data-label="${escape(t.target)}">≤ ${data.risk.targetPct.toFixed(1)}%</td><td data-field="sample" data-label="${escape(t.sample)}">${t.sampleValue}</td><td data-field="report" data-label="${escape(t.report)}">${report.id}</td><td data-field="version" data-label="${escape(t.version)}">v${report.version}</td></tr></tbody></table></div><div class="risk-evidence-meta"><span>${t.source}</span><span>${copy(t.publishedBy, { name: publisher.name, role: text.roles[publisher.roleKey] })}</span>${info("evidenceVersion", t.evidenceAvailable, `<p>${time(data.events[evidence.availableAtEvent].at, baseZone)} ${city(baseZone)}</p>`)}</div></section>`;
    }

    function assessment() {
      const finding = copy(t.knownFinding, { measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1) });
      const columns = [
        { id: "known", title: t.known, items: [finding, t.knownMaterials, t.knownMethods] },
        { id: "unknown", title: t.unknown, items: [t.unknownOutcome, t.unknownResource, t.unknownExtraWork] },
        { id: "possible", title: t.possible, items: [t.possibleReadiness, t.possibleDelivery, t.possibleScope] }
      ];
      return `<section id="risk-assessment" class="section" aria-labelledby="risk-assessment-title"><div class="section-heading"><h2 id="risk-assessment-title">${t.assessment}</h2></div><div class="risk-assessment-grid">${columns.map(column => `<div class="risk-assessment-column" data-assessment="${column.id}"><h3>${column.title}</h3><ul>${column.items.map(item => `<li>${item}</li>`).join("")}</ul></div>`).join("")}</div><div class="risk-scope-boundary">${t.notReleaseFailure}</div></section>`;
    }

    function nextUpdate() {
      const owner = data.people[data.risk.nextUpdateOwnerId];
      const update = data.events[data.risk.nextUpdateEvent];
      return `<section class="risk-update-strip" aria-labelledby="risk-update-title"><h2 id="risk-update-title">${t.nextUpdate}</h2><strong>${time(update.at, person.timezone, { weekday: "short" })} ${zoneLabel(person.timezone)}</strong><span>${t.updateOwner}: ${escape(owner.name)}</span>${info("riskNextUpdate", t.updatePurpose, note(t.updateExplanation))}</section>`;
    }

    function timeline() {
      let nowInserted = false;
      const now = `<tr id="risk-timeline-now"><td colspan="4"><span>${t.now} · ${time(state.clock, person.timezone)} ${zoneLabel(person.timezone)}</span></td></tr>`;
      const rows = data.risk.timeline.map(entry => {
        const event = entry.eventRef ? data.events[entry.eventRef] : null;
        const forecastStage = entry.planId ? stage(data.plans[entry.planId], entry.stageId) : null;
        const at = event ? event.at : forecastStage[entry.endpoint];
        const zone = event ? person.timezone : forecastStage.executionTimezone;
        // Completion is explicit snapshot metadata, never inferred from the displayed time.
        const status = entry.statusKey;
        const owners = entry.ownerIds.map(id => escape(data.people[id].name)).join(" / ");
        const isWuXi = entry.ownerIds.some(id => ["wuxiPM", "scheduling"].includes(data.people[id].roleKey));
        const shanghaiTime = isWuXi && zone !== baseZone ? `<small data-shanghai-time>${time(at, baseZone)} ${city(baseZone)}</small>` : "";
        // The marker separates explicit records from pending work; passing time never completes a task.
        const boundary = !nowInserted && status !== "recorded" ? now : "";
        if (boundary) nowInserted = true;
        return `${boundary}<tr data-risk-event="${entry.id}" data-event-status="${status}"><td data-field="time" data-label="${escape(t.timelineDate)}">${time(at, zone, { year: "numeric" })}<small>${zoneLabel(zone)}</small>${shanghaiTime}</td><td data-field="event" data-label="${escape(t.timelineEvent)}">${escape(t.timelineEvents[entry.id])}</td><td data-field="owner" data-label="${escape(t.timelineOwner)}">${owners}</td><td data-field="status" data-label="${escape(t.timelineStatus)}"><span class="status status-${status}">${t.timelineStatuses[status]}</span></td></tr>`;
      }).join("");
      return `<section id="risk-timeline" class="section" aria-labelledby="risk-timeline-title"><div class="section-heading"><div class="heading-with-info"><h2 id="risk-timeline-title">${t.timeline}</h2>${info("timelineStatus", t.timelineScope, note(t.timelineExplanation))}</div>${assumption}</div><div class="table-wrap"><table class="risk-timeline-table"><caption>${copy(t.timelineZone, { zone: city(person.timezone) })}</caption><thead><tr><th scope="col">${t.timelineDate}</th><th scope="col">${t.timelineEvent}</th><th scope="col">${t.timelineOwner}</th><th scope="col">${t.timelineStatus}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }

    function nextSteps() {
      return `<nav id="risk-next-steps" aria-labelledby="risk-next-steps-title"><h2 id="risk-next-steps-title">${t.nextSteps}</h2><div class="risk-next-step-links"><a id="risk-compare-options" class="button button-primary" href="#comparison">${t.compareOptions}${icon("arrow")}</a><button id="risk-assign-tasks" class="button button-secondary">${t.assignTasks}<span class="status">${t.comingSoon}</span>${icon("arrow")}</button></div></nav>`;
    }

    return `<div class="risk-detail-page"><div class="risk-page-heading"><a href="#main" class="risk-back">${icon("arrow")}${t.back}</a><div class="page-heading"><h1>${t.title}</h1><nav aria-label="${t.navigation}"><a href="#risk-evidence">${t.evidenceLink}</a><a href="#risk-assessment">${t.assessmentLink}</a><a href="#risk-timeline">${t.timelineLink}</a></nav><div class="snapshot"><span>${text.overview.snapshot}</span> <time id="snapshot-time" datetime="${state.clock}">${instant(state.clock, person.timezone, { weekday: "short" })}</time> ${zoneLabel(person.timezone)}</div></div></div><div class="risk-detail-summary"><h2>${text.overview.riskTitle}</h2><span class="risk-status">${text.risk.state}</span><span class="data-tag">${text.common.demo}</span></div>${roleFocus()}${evidence()}${assessment()}${nextUpdate()}${timeline()}${nextSteps()}</div>`;
  }

  global.DEMO_RISK_VIEW = Object.freeze({ render });
})(globalThis);

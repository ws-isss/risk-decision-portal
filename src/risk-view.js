(function (global) {
  "use strict";

  function render({ data, core, state, person, text, helpers }) {
    const t = text.riskDetail;
    const { escape, interpolate, icon, info, note, instant, dateOnly, city, zoneLabel, money } = helpers;
    const a = data.plans.A;
    const b = data.plans.B;
    const baseZone = data.calendars.base.timezone;
    const customerZone = data.calendars.customer.timezone;
    const decision = state.decision;
    const workflow = global.DEMO_WORKFLOW;
    const view = workflow.project(data, state, person.id);
    const publication = state.publication;
    const resource = decision?.resource;
    const isWuXi = ["P07", "P08"].includes(person.id);
    const resourceHeld = view.resourceConfirmed || view.schedulingOutcome === "held";
    const resourceUnavailable = view.resourceRejected || view.schedulingOutcome === "unavailable";
    const rescheduleStage = view.rescheduleStage || "none";
    const forecastReassessment = resourceUnavailable || view.forecastReassessmentRequired || view.rescheduleRequested;
    const rescheduleOwners = { none: "P07", awaitingWuXiQuote: "P08", quoteReadyInternal: "P07", awaitingCustomerDecision: "P01", awaitingCustomerAuthorization: "P06", awaitingWuXiConfirmation: "P07", confirmed: "P07" };
    const rescheduleStatus = () => text.wuxi.rescheduleFlow.stages[rescheduleStage];
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

    function requestState() {
      if (!decision) return "";
      const status = rescheduleStage !== "none" ? rescheduleStage : view.resourceConfirmed ? "resourceHeld" : view.resourceRejected ? "resourceUnavailable" : view.schedulingOutcome ? "schedulingRecorded" : decision.authorization ? "authorized" : decision.tasksCreated ? "confirmationsPending" : "requestCreated";
      return `<div class="risk-request-state" data-risk-decision-state="${status}"><strong>${copy(t.selectedOption, { option: decision.planId })}</strong><span class="status">${rescheduleStage !== "none" ? rescheduleStatus() : t.requestStatuses[status]}</span></div>`;
    }

    function reviewProgress() {
      const review = decision?.reviews[person.id === "P03" ? "quality" : "technical"];
      if (!review || !decision.tasksCreated) return reviewStart;
      const at = review.completedAt || review.startedAt;
      return `<div class="risk-review-progress" data-review-state="${review.status}"><span class="status">${t.reviewStatuses[review.status]}</span>${at ? `<span>${time(at, person.timezone)} ${zoneLabel(person.timezone)}</span>` : ""}</div>${review.status === "notStarted" ? reviewStart : ""}`;
    }

    function coverageStatus() {
      const support = decision?.support;
      const supportKey = support?.acceptedAt ? "supportAccepted" : support?.assignedAt ? "supportAssigned" : "supportPending";
      const approverKey = decision?.authorization ? "approverAuthorized" : decision?.approver.id ? "approverDesignated" : "approverPending";
      return `<p data-risk-coverage="support">${copy(t[supportKey], { name: data.people.P05.name })}</p><p data-risk-coverage="approver">${copy(t[approverKey], { name: data.people.P06.name })}</p>`;
    }

    function resultFocus() {
      const review = stage(a, "customerResultReview");
      const reviewDates = {
        start: core.formatInstant(review.start, customerZone, { hour: undefined, minute: undefined }),
        end: core.formatInstant(review.end, customerZone, { hour: undefined, minute: undefined }),
        deadline: core.formatInstant(a.holdUntil, baseZone)
      };
      const holdStatus = resourceHeld ? t.holdConfirmed : resourceUnavailable ? t.holdUnavailable : decision?.authorization && decision.planId === "A" ? t.awaitingWuXi : t.notRequested;
      const holdDetail = forecastReassessment ? `<p class="risk-focus-statement">${t.forecastReassessment}</p><p class="risk-focus-detail">${view.rescheduleConfirmed ? t.replacementReadinessPending : t.alternativeUnconfirmed}</p>` : `<span>${resourceHeld ? t.confirmedHoldUntil : t.holdUntil} <strong>${time(a.holdUntil, baseZone)} ${city(baseZone)}</strong></span>`;
      const replacement = view.rescheduleConfirmed ? `<div class="risk-hold-line" data-risk-replacement="confirmed"><strong>${t.replacementWindow}: ${time(b.window.at, baseZone)} ${city(baseZone)}</strong><span class="status">${t.replacementReadinessPending}</span></div>` : rescheduleStage !== "none" ? `<p class="risk-focus-statement">${rescheduleStatus()}</p>` : "";
      return `${forecastReassessment ? `<p class="risk-forecast-warning">${t.forecastReassessment}</p>` : ""}<div class="table-wrap risk-result-wrap"><table class="risk-result-table"><caption>${forecastReassessment ? t.historicalResultDates : t.resultDates}</caption><thead><tr><th scope="col">${t.option}</th><th scope="col">${t.firstResults}</th><th scope="col">${t.fullReport}</th><th scope="col">${t.internalAssessment}</th></tr></thead><tbody>${[a, b].map(plan => `<tr data-result-plan="${plan.id}"><th scope="row">${plan.id}</th><td>${resultDate(plan, "firstAnalysis")}</td><td>${resultDate(plan, "finalAnalysis")}</td><td>${resultDate(plan, "internalAssessment")}</td></tr>`).join("")}</tbody></table></div>
        <div class="risk-hold-line" data-risk-hold="${resourceHeld ? "confirmed" : resourceUnavailable ? "unavailable" : "pending"}"><strong>${t.originalWindow}: ${dateOnly(a.window.at, baseZone)}</strong><span class="status">${holdStatus}</span>${resourceHeld ? info("conditionalHold", t.confirmedHoldUntil, note(t.holdStillConditional)) : forecastReassessment ? "" : info("conditionalHold", t.holdUntil, note(t.holdExplanation))}${holdDetail}</div>
        ${forecastReassessment ? replacement : `<p class="risk-focus-statement">${resourceHeld ? t.holdSuccess : t.originalAvailable}</p><p class="risk-focus-detail">${copy(t.resultReview, reviewDates)}</p>`}<p class="risk-focus-detail">${view.rescheduleConfirmed ? t.replacementNoOriginalHold : t.bWindow}</p>`;
    }

    function reviewFocus() {
      return `${reviewProgress()}<p class="risk-focus-statement">${person.id === "P03" ? t.qualityScope : t.technicalScope}</p><ul class="risk-review-scope"><li>${copy(t.studyRuns, { screening: data.lab.scope.screeningRuns, confirmation: data.lab.scope.confirmationRuns, total: data.lab.scope.totalRuns })}</li><li>${t.allSamples}</li><li>${t.selectedSamples}</li><li>${t.evaluation}</li></ul><div class="risk-scope-boundary">${t.reviewBoundary}${info("reviewScope", t.scope, note(t.scopeExclusions))}</div>`;
    }

    function budgetFocus() {
      const designation = decision?.authorization ? resourceHeld ? t.authorizationAndHold : resourceUnavailable ? t.authorizationResourceUnavailable : t.authorizationRecorded : decision?.approver.id ? view.reviewsComplete ? t.designatedReady : t.designatedAwaitingReviews : t.designationPending;
      const selected = decision ? `<p class="risk-selected-budget">${copy(t.selectedBudget, { option: decision.planId, amount: money(data.plans[decision.planId].total) })}${decision.fallbackSelected ? ` ${copy(t.fallbackSelected, { cap: money(data.fees.fallbackCap), total: money(data.fees.totals.AWithFallback) })}` : ` ${t.noFallback}`}</p>` : "";
      const feeState = view.rescheduleConfirmed ? copy(t.rescheduleFeesCommitted, {amount: money(view.rescheduleFees)}) : resourceHeld ? copy(t.resourceFeesCommitted, {amount: money(view.resourceFees ?? view.committedFees)}) : decision?.authorization && !resourceUnavailable && decision.planId === "A" ? t.feeStatusPending : t.noCommitment;
      return `<div class="risk-budget-summary"><div><span>${t.quotedAmount} · ${t.commitmentA}</span><strong>${money(a.total)}</strong></div><div><span>${t.quotedAmount} · ${t.commitmentB}</span><strong>${money(b.total)}</strong></div><span class="status" data-risk-fee-incurred="${view.committedFees || 0}">${feeState}</span></div>
        ${selected}${rescheduleStage !== "none" ? `<p data-risk-reschedule-status="${rescheduleStage}">${rescheduleStatus()}</p>` : ""}<p class="risk-focus-statement">${copy(resourceHeld ? t.irreversibleConfirmed : resourceUnavailable ? t.unconfirmedFeesNotIncurred : t.irreversible, { amount: money(data.fees.resourceCommitment) })}</p><p>${copy(t.commonCommitment, { amount: money(data.fees.shared) })}</p><p class="risk-focus-detail" data-risk-budget-state>${designation}${decision?.authorization ? ` ${time(decision.authorization.at, person.timezone)} ${zoneLabel(person.timezone)}.` : ""}${info("finalBudgetPackage", t.finalPackageTitle, note(t.finalPackage) + note(t.rescheduleCommitment.replace("{amount}", money(data.fees.reschedule))))}</p>
        ${helpers.renderFeeBreakdown ? helpers.renderFeeBreakdown("risk-fees") : ""}`;
    }

    function roleFocus() {
      let content;
      if (person.id === "P01") content = resultFocus();
      else if (["P02", "P03"].includes(person.id)) content = reviewFocus();
      else if (person.id === "P06") content = budgetFocus();
      else if (person.id === "P04") content = `<span class="status status-onLeave">${t.leave}</span>${coverageStatus()}<p>${supportBoundary}</p>`;
      else if (person.id === "P05") content = `${coverageStatus()}<p class="risk-focus-statement">${supportBoundary}</p><p>${t.finalPackage}</p>`;
      else content = `<p class="risk-focus-statement">${view.rescheduleConfirmed ? t.replacementReadinessPending : rescheduleStage !== "none" ? rescheduleStatus() : resourceHeld ? t.holdSuccess : resourceUnavailable ? t.forecastReassessment : decision?.authorization ? t.authorizedCoordination : t.coordinationScope}</p><p>${view.rescheduleConfirmed ? t.replacementNoDelivery : resourceHeld ? t.holdStillConditional : resourceUnavailable || view.rescheduleRequested ? t.alternativeUnconfirmed : decision?.authorization ? t.receiptStillPending : t.confirmationScope}</p>${view.schedulingOutcome ? `<p class="preserved-text">${escape(view.schedulingReason)}</p>` : ""}${view.schedulingOutcome && !resource?.receipt ? `<p class="status">${t.internalResponsePending}</p>` : ""}`;
      const heading = person.id === "P06" && decision?.authorization ? t.authorizedFocus : t.focus[person.id];
      return `<section id="risk-role-focus" class="section role-risk-focus" data-risk-role="${person.id}" aria-labelledby="risk-focus-title"><div class="section-heading"><h2 id="risk-focus-title">${heading}</h2>${assumption}</div>${requestState()}${content}</section>`;
    }

    function evidence() {
      const evidence = data.risk.evidence;
      const report = data.reports[evidence.reportRef];
      const publisher = data.people[evidence.publisherId];
      return `<section id="risk-evidence" class="section" aria-labelledby="risk-evidence-title"><div class="section-heading"><h2 id="risk-evidence-title">${t.evidence}</h2><button class="button button-secondary" data-report="${report.id}">${icon("report")}${t.reportAction}</button></div><div class="table-wrap"><table class="risk-evidence-table"><thead><tr><th scope="col">${t.method}</th><th scope="col">${t.measured}</th><th scope="col">${t.target}</th><th scope="col">${t.sample}</th><th scope="col">${t.report}</th><th scope="col">${t.version}</th></tr></thead><tbody><tr><td data-field="method" data-label="${escape(t.method)}">${t.methodValue}<small>${t.measurement}</small></td><td class="risk-measurement" data-field="measured" data-label="${escape(t.measured)}">${data.risk.hmwPct.toFixed(1)}%</td><td data-field="target" data-label="${escape(t.target)}">≤ ${data.risk.targetPct.toFixed(1)}%</td><td data-field="sample" data-label="${escape(t.sample)}">${t.sampleValue}</td><td data-field="report" data-label="${escape(t.report)}">${report.id}</td><td data-field="version" data-label="${escape(t.version)}">v${report.version}</td></tr></tbody></table></div><div class="risk-evidence-meta"><span>${t.source}</span><span>${copy(t.publishedBy, { name: publisher.name, role: text.roles[publisher.roleKey] })}</span>${info("evidenceVersion", t.evidenceAvailable, `<p>${time(data.events[evidence.availableAtEvent].at, baseZone)} ${city(baseZone)}</p>`)}</div></section>`;
    }

    function assessment() {
      const finding = copy(t.knownFinding, { measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1) });
      const resourceFact = resourceHeld ? copy(t.knownResourceHeld, {until: core.formatInstant(a.holdUntil, baseZone)}) : resourceUnavailable ? t.knownResourceUnavailable : null;
      const columns = [
        { id: "known", title: t.known, items: [finding, t.knownMaterials, t.knownMethods, ...(resourceFact ? [resourceFact] : []), ...(view.rescheduleConfirmed ? [copy(t.knownReplacement, { window: core.formatInstant(b.window.at, baseZone) })] : [])] },
        { id: "unknown", title: t.unknown, items: [t.unknownOutcome, view.rescheduleConfirmed ? t.unknownReplacementReadiness : resourceHeld ? t.unknownReadiness : forecastReassessment ? t.unknownAlternative : t.unknownResource, t.unknownExtraWork] },
        { id: "possible", title: t.possible, items: [t.possibleReadiness, forecastReassessment ? t.forecastReassessment : t.possibleDelivery, t.possibleScope] }
      ];
      return `<section id="risk-assessment" class="section" aria-labelledby="risk-assessment-title"><div class="section-heading"><h2 id="risk-assessment-title">${t.assessment}</h2></div><div class="risk-assessment-grid">${columns.map(column => `<div class="risk-assessment-column" data-assessment="${column.id}"><h3>${column.title}</h3><ul>${column.items.map(item => `<li>${item}</li>`).join("")}</ul></div>`).join("")}</div><div class="risk-scope-boundary">${t.notReleaseFailure}</div></section>`;
    }

    function nextUpdate() {
      const owner = data.people[data.risk.nextUpdateOwnerId];
      if (view.nextTiming) {
        const timing = view.nextTiming;
        return `<section class="risk-update-strip" data-update-state="${rescheduleStage}" data-timing-kind="${timing.kind}" aria-labelledby="risk-update-title"><h2 id="risk-update-title">${text.wuxi.rescheduleFlow.timingLabels[timing.kind]}</h2><strong>${time(data.events[timing.eventRef].at, timing.timezone, { weekday: "short" })} ${city(timing.timezone)}</strong><span>${t.updateOwner}: ${escape(data.people[timing.ownerId].name)}</span><p>${view.rescheduleConfirmed ? t.replacementNoDelivery : rescheduleStatus()}</p></section>`;
      }
      if (view.resourceConfirmed || view.resourceRejected) return `<section class="risk-update-strip" data-update-state="${view.resourceConfirmed ? "resourceRecorded" : "resourceRejected"}" aria-labelledby="risk-update-title"><h2 id="risk-update-title">${t.resourceUpdateRecorded}</h2><strong>${time(resource.receipt.at, person.timezone, { weekday: "short" })} ${zoneLabel(person.timezone)}</strong><span>${t.updateOwner}: ${escape(owner.name)}</span><p>${view.resourceRejected ? t.nextUpdateReassessment : t.holdStillConditional}</p></section>`;
      const authorized = Boolean(decision?.authorization);
      const selectedUpdate = authorized ? "resourceConfirmed" : publication?.nextUpdateEvent || data.risk.nextUpdateEvent;
      const update = data.events[selectedUpdate];
      const updated = view.reviewsComplete && selectedUpdate === "reviewsComplete";
      const resourcePlanned = selectedUpdate === "resourceConfirmed";
      const heading = updated ? t.reviewUpdateAvailable : t.nextUpdate;
      const explanation = resourcePlanned ? t.resourceUpdateExplanation : updated ? t.reviewUpdateExplanation : t.updateExplanation;
      return `<section class="risk-update-strip" data-update-state="${resourcePlanned ? "resourcePlanned" : updated ? "reviewsRecorded" : "reviewsPlanned"}" aria-labelledby="risk-update-title"><h2 id="risk-update-title">${heading}</h2><strong>${time(update.at, person.timezone, { weekday: "short" })} ${zoneLabel(person.timezone)}</strong><span>${t.updateOwner}: ${escape(owner.name)}</span>${resourcePlanned ? `<span class="status">${t.plannedResponse}</span>` : ""}${info("riskNextUpdate", resourcePlanned ? t.resourceUpdatePurpose : t.updatePurpose, note(explanation))}</section>`;
    }

    function timeline() {
      const now = `<tr id="risk-timeline-now"><td colspan="4"><span>${t.now} · ${time(state.clock, person.timezone)} ${zoneLabel(person.timezone)}</span></td></tr>`;
      const audit = decision?.audit || [];
      const auditById = new Map(audit.map(item => [item.id, item]));
      const entries = data.risk.timeline.map(original => {
        const entry = original.id === "resourceConfirmed" && view.resourceRejected ? { ...original, id: "resourceRejected", eventRef: "resourceRejected" } : original;
        const event = entry.eventRef ? data.events[entry.eventRef] : null;
        const forecastStage = entry.planId ? stage(data.plans[entry.planId], entry.stageId) : null;
        const record = auditById.get(entry.eventRef);
        const at = record ? record.at : event ? event.at : forecastStage[entry.endpoint];
        const zone = entry.eventRef ? person.timezone : forecastStage.executionTimezone;
        // Advancing the clock never creates a business record.
        let status = entry.eventRef && view.occurred(entry.eventRef) ? "recorded" : entry.statusKey;
        const deadlineMet = entry.id === "latestReviewStart" && decision?.reviews.technical.startedAt && decision?.reviews.quality.startedAt || entry.id === "latestAuthorization" && decision?.authorization || entry.id === "resourceConfirmationDeadline" && resourceHeld;
        if (status === "deadline" && deadlineMet) status = "satisfiedDeadline";
        if (status === "planned" && Date.parse(at) <= Date.parse(state.clock)) status = "pending";
        if (status === "conditionalForecast" && forecastReassessment) status = "historicalEstimate";
        const label = status === "recorded" && t.recordedTimelineEvents[entry.id] ? t.recordedTimelineEvents[entry.id] : t.timelineEvents[entry.id];
        return { ...entry, at, zone, status, label };
      });
      const auditOwners = {
        decisionCreated: ["P01"], tasksCreated: ["P01"], supportAccepted: ["P05"],
        technicalStarted: ["P02"], qualityStarted: ["P03"],
        technicalCompleted: ["P02"], qualityCompleted: ["P03"],
        resourceReviewStarted: ["P07"], schedulingHeld: ["P08"], schedulingUnavailable: ["P08"],
      };
      for (const record of audit) {
        if (!auditOwners[record.id] || !view.occurred(record.id)) continue;
        entries.push({ id: record.id, at: record.at, sequence: record.sequence, zone: person.timezone, status: "recorded", ownerIds: auditOwners[record.id], label: t.recordedTimelineEvents[record.id] });
      }
      if (view.occurred("riskPublished")) entries.push({ id:"riskPublished", at:publication.publishedAt, zone:person.timezone, status:"recorded", ownerIds:["P07"], label:t.recordedTimelineEvents.riskPublished });
      function renderEntry(entry) {
        const { at, zone, status, label } = entry;
        const owners = entry.ownerIds.map(id => escape(data.people[id].name)).join(" / ");
        const isWuXi = entry.ownerIds.some(id => ["wuxiPM", "scheduling"].includes(data.people[id].roleKey));
        const shanghaiTime = at && isWuXi && zone !== baseZone ? `<small data-shanghai-time>${time(at, baseZone)} ${city(baseZone)}</small>` : "";
        const when = `${time(at, zone, { year: "numeric", weekday: "short" })}<small>${zoneLabel(zone)}</small>${shanghaiTime}`;
        return `<tr data-risk-event="${entry.id}" data-event-status="${status}"><td data-field="time" data-label="${escape(t.timelineDate)}">${when}</td><td data-field="event" data-label="${escape(t.timelineEvent)}">${escape(label)}</td><td data-field="owner" data-label="${escape(t.timelineOwner)}">${owners}</td><td data-field="status" data-label="${escape(t.timelineStatus)}"><span class="status status-${status}">${t.timelineStatuses[status]}</span></td></tr>`;
      }
      // Recorded actions stay above Now, even when their audit row was added later.
      const recorded = entries.filter(entry => entry.status === "recorded" && entry.at).sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
      const remaining = entries.filter(entry => entry.status !== "recorded");
      const rows = recorded.map(renderEntry).join("") + now + remaining.map(renderEntry).join("");
      const tableHead = `<thead><tr><th scope="col">${t.timelineDate}</th><th scope="col">${t.timelineEvent}</th><th scope="col">${t.timelineOwner}</th><th scope="col">${t.timelineStatus}</th></tr></thead>`;
      const exceptionEntries = view.nextTiming ? data.rescheduleTimeline.map(entry => {
        const record = view.occurred(entry.eventRef) ? auditById.get(entry.eventRef) : null;
        const at = record?.at || data.events[entry.eventRef].at;
        const status = record ? "recorded" : Date.parse(at) <= Date.parse(state.clock) ? "pending" : "planned";
        return { ...entry, id: entry.eventRef, at, zone: data.people[entry.ownerIds[0]].timezone, status, label: record ? t.recordedTimelineEvents[entry.eventRef] : t.timelineEvents[entry.eventRef] };
      }) : [];
      const exceptionRows = exceptionEntries.filter(entry => entry.status === "recorded").map(renderEntry).join("") + now.replace('id="risk-timeline-now"', 'id="risk-followup-now"') + exceptionEntries.filter(entry => entry.status !== "recorded").map(renderEntry).join("");
      const handoff = data.events.rescheduleCustomerAvailable;
      const followup = exceptionEntries.length ? `<div id="risk-followup-timeline"><h3>${t.followupTimeline}</h3><p class="decision-note">${t.followupTimelineExplanation}</p><p>${t.customerWorkdayStart}: ${time(handoff.at, customerZone, { weekday: "short" })} ${city(customerZone)}</p><div class="table-wrap"><table class="risk-timeline-table"><caption>${t.followupTimelineZone}</caption>${tableHead}<tbody>${exceptionRows}</tbody></table></div></div>` : "";
      return `<section id="risk-timeline" class="section" aria-labelledby="risk-timeline-title"><div class="section-heading"><div class="heading-with-info"><h2 id="risk-timeline-title">${t.timeline}</h2>${info("timelineStatus", t.timelineScope, note(t.timelineExplanation))}</div>${assumption}</div><div class="table-wrap"><table class="risk-timeline-table"><caption>${copy(t.timelineZone, { zone: city(person.timezone) })}</caption>${tableHead}<tbody>${rows}</tbody></table></div>${followup}</section>`;
    }

    function nextAction() {
      if (rescheduleStage !== "none") return t.nextActions[rescheduleStage === "confirmed" ? "rescheduleConfirmed" : rescheduleStage];
      if (resourceUnavailable) return view.resourceRejected ? t.nextActions.requestReschedule : t.nextActions.returnResponse;
      if (resourceHeld) return view.resourceConfirmed ? t.nextActions.heldStudyNext : t.nextActions.returnResponse;
      if (decision?.authorization && decision.planId === "B") return t.nextActions.requestReschedule;
      if (view.resourceStarted) return person.id === "P08" ? t.nextActions.recordScheduling : t.nextActions.awaitScheduling;
      if (decision?.authorization) return ["P07", "P08"].includes(person.id) ? t.nextActions.resourceResponse : t.nextActions.awaitWuXi;
      if (!decision) return person.id === "P01" ? t.nextActions.chooseOption : t.nextActions.awaitDecision;
      if (!decision.tasksCreated) return person.id === "P01" ? t.nextActions.draftBriefs : t.nextActions.awaitBriefs;
      if (person.id === "P01") {
        if (!decision.support.assignedAt) return t.nextActions.assignSupport;
        if (!decision.support.acceptedAt) return t.nextActions.acceptSupport;
        if (!decision.approver.id) return t.nextActions.designateApprover;
        return view.reviewsComplete ? t.nextActions.followAuthorization : t.nextActions.followReviews;
      }
      if (["P02", "P03"].includes(person.id)) {
        const review = decision.reviews[person.id === "P02" ? "technical" : "quality"];
        return t.nextActions[review.status === "completed" ? "reviewRecorded" : review.status === "inProgress" ? "completeReview" : "startReview"];
      }
      if (person.id === "P04") return t.nextActions.leaveCoverage;
      if (person.id === "P05") return t.nextActions[!decision.support.assignedAt ? "awaitSupportAssignment" : !decision.support.acceptedAt ? "acceptPreparation" : "prepareBudget"];
      if (person.id === "P06") return t.nextActions[!decision.approver.id ? "awaitDesignation" : !view.reviewsComplete ? "awaitReviews" : "authorizeBudget"];
      return t.nextActions.nonbinding;
    }

    function nextSteps() {
      return `<section id="risk-ownership" class="section" aria-labelledby="risk-ownership-title"><div class="section-heading"><h2 id="risk-ownership-title">${t.ownership}</h2></div><dl class="risk-owner-grid"><div class="risk-owner-row"><dt>${t.riskOwner}</dt><dd>${escape(data.people.P07.name)}</dd></div><div class="risk-owner-row"><dt>${t.customerCoordinator}</dt><dd>${escape(data.people.P01.name)}</dd></div><div class="risk-owner-row"><dt>${t.schedulingOwner}</dt><dd>${escape(data.people.P08.name)}</dd></div></dl><p class="risk-owner-next" data-risk-next-action="${person.id}"><strong>${escape(person.name)}</strong><span>${nextAction()}</span></p><nav id="risk-next-steps" aria-label="${t.nextSteps}"><div class="risk-next-step-links"><a id="risk-compare-options" class="button button-primary" href="#comparison">${t.compareOptions}${icon("arrow")}</a><a id="risk-assign-tasks" class="button button-secondary" href="#decision">${t.assignTasks}${icon("arrow")}</a>${decision?.authorization ? `<a id="risk-resource-response" class="button button-secondary" href="#wuxi">${t.resourceResponseLink}${icon("arrow")}</a>` : ""}${person.id === "P01" ? `<button id="generate-management-brief" class="button button-secondary" type="button">${t.generateBrief}</button>` : ""}</div></nav></section>`;
    }

    function resourceMilestone() {
      if (view.nextTiming) {
        const timing = view.nextTiming;
        return `<div id="risk-resource-deadline" class="risk-resource-deadline" data-timing-kind="${timing.kind}"><span>${text.wuxi.rescheduleFlow.timingLabels[timing.kind]}</span><strong>${time(data.events[timing.eventRef].at, timing.timezone, { weekday: "short" })} ${city(timing.timezone)}</strong></div>`;
      }
      if (!isWuXi) return "";
      const laterWindowRequest = decision?.authorization && decision.planId === "B";
      const title = view.rescheduleConfirmed ? t.replacementWindow : rescheduleStage !== "none" || resourceUnavailable || laterWindowRequest ? t.rescheduleUpdate : resourceHeld ? t.confirmedHoldUntil : text.wuxi.deadline;
      const value = view.rescheduleConfirmed ? `${time(b.window.at, baseZone)} ${city(baseZone)}<small>${t.replacementReadinessPending}</small>` : rescheduleStage !== "none" ? rescheduleStatus() : resourceUnavailable ? resource?.receipt ? text.wuxi.rescheduleFlow.stages.none : t.internalResponsePending : laterWindowRequest ? text.wuxi.rescheduleFlow.stages.none : `${time(resourceHeld ? a.holdUntil : data.events.resourceConfirmationDeadline.at, baseZone)} ${city(baseZone)}`;
      return `<div id="risk-resource-deadline" class="risk-resource-deadline"><span>${title}</span><strong>${value}</strong></div>`;
    }
    const resourceDeadline = resourceMilestone();
    const certainty = publication?.certainty || "underAssessment";
    return `<div class="risk-detail-page"><div class="risk-page-heading"><a href="#main" class="risk-back">${icon("arrow")}${t.back}</a><div class="page-heading"><h1>${t.title}</h1><nav aria-label="${t.navigation}"><a href="#risk-evidence">${t.evidenceLink}</a><a href="#risk-assessment">${t.assessmentLink}</a><a href="#risk-timeline">${t.timelineLink}</a></nav><div class="snapshot"><span>${text.overview.snapshot}</span> <time id="snapshot-time" datetime="${state.clock}">${instant(state.clock, person.timezone, { weekday: "short" })}</time> ${zoneLabel(person.timezone)}</div></div>${resourceDeadline}</div><div class="risk-detail-summary"><h2>${text.overview.riskTitle}</h2><span class="risk-status">${text.risk.state}</span><span class="data-tag">${text.common.demo}</span></div><p class="risk-publication-assessment" data-risk-certainty="${certainty}">${text.wuxi.certaintyCopy[certainty]}</p>${roleFocus()}${evidence()}${assessment()}${nextUpdate()}${timeline()}${nextSteps()}</div>`;
  }

  global.DEMO_RISK_VIEW = Object.freeze({ render });
})(globalThis);

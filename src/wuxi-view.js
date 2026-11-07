(function (global) {
  "use strict";

  function render({ data, core, state, text, helpers, formValues = {} }) {
    const t = text.wuxi;
    const { escape, interpolate, money, instant, city } = helpers;
    const baseZone = data.calendars.base.timezone;
    const d = state.decision;
    const publication = state.publication;
    const person = data.people[state.viewer];
    const isWuXi = ["P07", "P08"].includes(person.id);
    const view = global.DEMO_WORKFLOW.project(data, state, person.id);
    const resource = d?.resource;
    const value = (key, fallback) => Object.hasOwn(formValues, key) ? formValues[key] : fallback;
    const copy = (template, values) => escape(interpolate(template, values));
    const time = at => `<time datetime="${at}">${instant(at, baseZone)} ${city(baseZone)}</time>`;
    const disabled = when => when ? " disabled" : "";
    const reached = id => Date.parse(state.clock) >= Date.parse(data.events[id].at);
    const tags = `<span class="data-tag">${text.common.demo}</span><span class="data-tag">${text.common.assumption}</span>`;

    function publishedSummary() {
      if (!publication || person.id !== "P07") return "";
      return `<details class="wuxi-published-summary"><summary>${t.publishedTitle}</summary><p>${t.certaintyOptions[publication.certainty]}</p><p>${t.publishedAt}: ${time(publication.publishedAt)}</p><p>${t.originalUpdate}: ${time(data.events[publication.nextUpdateEvent].at)}</p></details>`;
    }

    function publicationDraft() {
      if (person.id !== "P07") return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="draft"><h2>${t.publicationHiddenTitle}</h2><p>${t.publicationHiddenBody}</p></section>`;
      const certainty = value("publicationCertainty", publication.certainty);
      const nextUpdate = value("publicationNextUpdateEvent", publication.nextUpdateEvent);
      return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="draft"><div class="section-heading"><h2>${t.draftTitle}</h2>${tags}</div><p><span class="status">${t.previewState}</span> · ${t.publicationOwner}: ${escape(data.people.P07.name)}</p><form id="risk-publication-form" class="decision-form wuxi-form"><label>${t.certainty}<select name="certainty">${Object.entries(t.certaintyOptions).map(([key,label]) => `<option value="${key}"${certainty === key ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>${t.nextUpdate}<select name="nextUpdateEvent">${Object.entries(t.updateChoices).map(([key,label]) => `<option value="${key}"${nextUpdate === key ? " selected" : ""}>${label} · ${escape(core.formatInstant(data.events[key].at, baseZone))} ${city(baseZone)}</option>`).join("")}</select></label><div id="risk-client-preview" class="wuxi-preview" aria-live="polite"><h3>${t.preview}</h3><h4>${text.overview.riskTitle}</h4><p>${text.riskDetail.methodValue}: <strong>${data.risk.hmwPct.toFixed(1)}%</strong> · ${text.riskDetail.target}: ≤ ${data.risk.targetPct.toFixed(1)}%</p><p data-preview-certainty="${certainty}">${t.certaintyCopy[certainty]}</p><p>${t.nextUpdate}: ${time(data.events[nextUpdate].at)} · ${escape(data.people.P07.name)}</p><p class="decision-note">${t.draftBoundary}</p></div><p class="decision-note">${t.publishAvailable}: ${time(data.events.materialReady.at)}</p><button type="submit" class="button button-primary" id="publish-risk"${disabled(!reached("materialReady"))}>${t.publish}</button></form></section>`;
    }

    if (publication?.status === "draft") return publicationDraft();
    if (!d?.authorization) {
      if (!isWuXi) return "";
      return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="awaitingAuthorization"><div class="section-heading"><h2>${t.title}</h2>${tags}</div>${publishedSummary()}<h3>${t.awaitingAuthorization}</h3><p>${t.nonbinding}</p></section>`;
    }

    const visibleOutcome = view.schedulingOutcome;
    const receipt = resource?.receipt;
    const reschedule = resource?.rescheduleRequest;
    const status = view.rescheduleRequested ? "reschedulePending" : view.resourceConfirmed ? "held" : view.resourceRejected ? "unavailable" : visibleOutcome === "held" ? "schedulingHeld" : visibleOutcome === "unavailable" ? "schedulingUnavailable" : view.resourceStarted ? "reviewing" : "awaitingReview";
    const confirmation = view.resourceConfirmed || visibleOutcome === "held";
    const feePending = !isWuXi && !receipt;
    const feeSummary = `<div class="wuxi-fees" data-fee-incurred="${view.committedFees || 0}" data-fee-disclosure="${feePending ? "pending" : "recorded"}"><p>${feePending ? t.customerFeesPending : confirmation ? copy(t.resourceFees, {amount: money(data.fees.resourceCommitment)}) : t.noResourceFees}</p><p class="decision-note">${copy(t.studyFees, {amount: money(data.fees.shared)})}</p></div>`;
    const authorization = `<dl class="wuxi-facts"><div><dt>${t.authorization}</dt><dd>${t.option} ${d.planId}</dd></div><div><dt>${t.amount}</dt><dd>${money(d.authorization.total)}</dd></div><div><dt>${t.authorizedBy}</dt><dd>${escape(data.people[d.authorization.by].name)}</dd></div><div><dt>${t.authorizedAt}</dt><dd>${time(d.authorization.at)}</dd></div></dl>`;

    function candidateRequest() {
      const mayRequest = ["P01", "P07"].includes(person.id);
      return `<div class="wuxi-next-step"><p>${t.nextOwner}: <strong>${escape(data.people.P07.name)}</strong></p><p>${t.nextAction}</p><p>${t.candidate}: <strong><time datetime="${data.plans.B.window.at}">${core.formatInstant(data.plans.B.window.at, baseZone, {hour:undefined,minute:undefined})}</time> ${city(baseZone)}</strong> <span class="status">${t.candidatePending}</span></p><p>${t.noCandidateDelivery}</p>${reschedule ? `<p class="status" data-reschedule-status="pending">${t.reschedulePending}</p><p>${t.rescheduleBy}: ${escape(data.people[reschedule.by].name)} · ${time(reschedule.at)}</p>` : mayRequest ? `<button type="button" class="button button-primary" id="request-reschedule">${t.reschedule}</button>` : ""}<p class="decision-note">${t.rescheduleBoundary}</p></div>`;
    }

    function result() {
      const held = receipt.outcome === "held";
      return `<div id="wuxi-response" class="wuxi-receipt" data-receipt-outcome="${receipt.outcome}" data-hold-status="${held ? "confirmed" : "unconfirmed"}"><h3>${held ? t.held : t.unavailable}</h3>${held ? `<p class="wuxi-hold-until">${t.heldUntil}: <strong>${time(data.plans.A.holdUntil)}</strong></p><p class="wuxi-conclusion">${t.heldConclusion}</p><p>${t.heldBoundary}</p>` : `<p class="wuxi-conclusion">${t.unavailableConclusion}</p>`}<p><strong>${t.refusalReason}</strong></p><p class="preserved-text" data-response-reason>${escape(view.schedulingReason || "")}</p><dl class="wuxi-facts"><div data-scheduling-by="${resource.scheduling.by}"><dt>${t.responseBy}</dt><dd>${escape(data.people[resource.scheduling.by].name)} · ${time(resource.scheduling.at)}</dd></div><div data-receipt-by="${receipt.by}"><dt>${t.returnedBy}</dt><dd>${escape(data.people[receipt.by].name)} · ${time(receipt.at)}</dd></div></dl>${feeSummary}${!held ? candidateRequest() : ""}</div>`;
    }

    function actionPanel() {
      if (d.planId === "B") return `<div class="wuxi-branch-outcome" data-hold-status="unconfirmed"><p>${t.bScope}</p>${feeSummary}${candidateRequest()}</div>`;
      if (receipt) return result();
      if (!isWuXi) return `<p>${t.privateResponse}</p><div data-hold-status="unconfirmed">${feeSummary}</div>`;
      if (visibleOutcome) return `<div class="wuxi-internal-response" data-internal-outcome="${visibleOutcome}" data-hold-status="${visibleOutcome === "held" ? "confirmed" : "unconfirmed"}"><h3>${t.internalResponse}</h3><p class="status">${t.outcomeOptions[visibleOutcome]}</p><p data-response-reason class="preserved-text">${escape(view.schedulingReason)}</p><p data-scheduling-by="${resource.scheduling.by}">${t.responseBy}: ${escape(data.people[resource.scheduling.by].name)} · ${time(resource.scheduling.at)}</p>${visibleOutcome === "held" ? `<p>${t.heldUntil}: ${time(data.plans.A.holdUntil)}</p>` : ""}${feeSummary}<p>${t.returnOwner}: ${escape(data.people.P07.name)}</p>${person.id === "P07" ? `<button type="button" class="button button-primary" id="return-resource-receipt">${t.returnReceipt}</button>` : ""}</div>`;
      if (person.id === "P07") return `<div class="wuxi-review-start"><p>${t.startDue}: ${time(data.events.resourceReviewStart.at)}</p>${view.resourceStarted ? `<p class="status">${t.started}</p><p>${t.startedAt}: ${time(resource.startedAt)}</p><p>${t.waitForResponse}</p>` : `<button type="button" class="button button-primary" id="start-resource-review"${disabled(!reached("resourceReviewStart"))}>${t.start}</button>`}<p>${t.scheduleOwner}: ${escape(data.people.P08.name)}</p><p>${t.responseDue}: ${time(data.events.resourceConfirmed.at)}</p>${feeSummary}</div>`;
      const outcome = value("resourceOutcome", state.branchIntent === "unavailable" ? "unavailable" : "held");
      const reason = value("resourceReason", t.examples[outcome]);
      const ready = view.resourceStarted && reached("resourceConfirmed");
      return `<div class="wuxi-scheduling-work"><h3>${t.response}</h3>${!view.resourceStarted ? `<p>${t.waitForStart}</p>` : ""}<p>${t.responseDue}: ${time(data.events.resourceConfirmed.at)}</p><form id="resource-response-form" class="decision-form wuxi-form"><label>${t.outcome}<select name="outcome"${disabled(!view.resourceStarted)}>${Object.entries(t.outcomeOptions).map(([key,label]) => `<option value="${key}"${outcome === key ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>${t.reason}<textarea name="reason" rows="5" maxlength="3000" required${disabled(!view.resourceStarted)}>${escape(reason)}</textarea></label><p class="decision-note">${t.reasonHint}</p><button type="submit" class="button button-primary" id="confirm-resource-response"${disabled(!ready)}>${t.confirmResponse}</button></form>${feeSummary}</div>`;
    }

    const heading = receipt ? t.receivedResponse : t.title;
    return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="${status}"><div class="section-heading"><h2>${heading}</h2>${tags}</div>${publishedSummary()}${authorization}${actionPanel()}</section>`;
  }

  global.DEMO_WUXI_VIEW = Object.freeze({ render });
})(globalThis);

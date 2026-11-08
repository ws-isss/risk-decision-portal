(function (global) {
  "use strict";

  function defaultReason({ data, core, text, outcome }) {
    const start = data.plans.A.stages.find(item => item.id === "sampleCheck").start;
    const formatted = `${core.formatInstant(start, data.calendars.base.timezone)} ${text.common.shanghai}`;
    return text.wuxi.examples[outcome].replaceAll("{start}", formatted);
  }

  function render({ data, core, state, text, helpers, formValues = {} }) {
    const t = text.wuxi;
    const { escape, interpolate, money, instant, city } = helpers;
    const recordText = helpers.recordText || (value => value);
    const baseZone = data.calendars.base.timezone;
    const d = state.decision;
    const publication = state.publication;
    const person = data.people[state.viewer];
    const isWuXi = ["P07", "P08"].includes(person.id);
    const view = global.DEMO_WORKFLOW.project(data, state, person.id);
    const resource = d?.resource;
    const value = (key, fallback) => {
      const current = Object.hasOwn(formValues, key) ? formValues[key] : fallback;
      return typeof current === "string" && /reason/i.test(key) ? recordText(current) : current;
    };
    const copy = (template, values) => escape(interpolate(template, values));
    const time = (at, zone = baseZone) => `<time datetime="${at}">${instant(at, zone, { weekday: "short" })} ${city(zone)}</time>`;
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
      const reviewed = Boolean(publication.reviewedAt);
      return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="draft"><div class="section-heading"><h2>${t.draftTitle}</h2>${tags}</div><p><span class="status">${t.previewState}</span> · ${t.publicationOwner}: ${escape(data.people.P07.name)}</p><form id="risk-publication-form" class="decision-form wuxi-form"><label>${t.certainty}<select name="certainty">${Object.entries(t.certaintyOptions).map(([key,label]) => `<option value="${key}"${certainty === key ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>${t.nextUpdate}<select name="nextUpdateEvent">${Object.entries(t.updateChoices).map(([key,label]) => `<option value="${key}"${nextUpdate === key ? " selected" : ""}>${label} · ${escape(core.formatInstant(data.events[key].at, baseZone))} ${city(baseZone)}</option>`).join("")}</select></label><div id="risk-client-preview" class="wuxi-preview" aria-live="polite"><h3>${t.preview}</h3><h4>${text.overview.riskTitle}</h4><p>${text.riskDetail.methodValue}: <strong>${data.risk.hmwPct.toFixed(1)}%</strong> · ${text.riskDetail.target}: ≤ ${data.risk.targetPct.toFixed(1)}%</p><p data-preview-certainty="${certainty}">${t.certaintyCopy[certainty]}</p><p>${t.nextUpdate}: ${time(data.events[nextUpdate].at)} · ${escape(data.people.P07.name)}</p><p class="decision-note">${t.draftBoundary}</p></div><div class="decision-action-group">${reviewed ? `<span class="status" data-publication-reviewed>${t.reviewedDraft}</span>` : `<button type="button" class="button button-secondary" id="review-publication-draft">${t.reviewDraft}</button>`}<button type="submit" class="button button-primary" id="publish-risk"${disabled(!reviewed || !reached("materialReady"))}>${t.publish}</button></div><p class="decision-note" id="publication-wait">${reviewed && !reached("materialReady") ? t.reviewedWait : reviewed ? t.publishReady : t.reviewBeforePublish} ${!reached("materialReady") ? time(data.events.materialReady.at) : ""}</p></form></section>`;
    }

    if (publication?.status === "draft") return publicationDraft();
    if (!d?.authorization) {
      if (!isWuXi) return "";
      return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="awaitingAuthorization"><div class="section-heading"><h2>${t.title}</h2>${tags}</div>${publishedSummary()}<h3>${t.awaitingAuthorization}</h3><p>${t.nonbinding}</p></section>`;
    }

    const visibleOutcome = view.schedulingOutcome;
    const receipt = resource?.receipt;
    const reschedule = resource?.rescheduleRequest;
    const status = view.rescheduleStage && view.rescheduleStage !== "none" ? view.rescheduleStage : view.rescheduleRequested ? "reschedulePending" : view.resourceConfirmed ? "held" : view.resourceRejected ? "unavailable" : visibleOutcome === "held" ? "schedulingHeld" : visibleOutcome === "unavailable" ? "schedulingUnavailable" : view.resourceStarted ? "reviewing" : "awaitingReview";
    const confirmation = view.resourceConfirmed || visibleOutcome === "held";
    const feePending = d.planId === "A" && !isWuXi && !receipt;
    const feeSummary = `<div class="wuxi-fees" data-fee-incurred="${view.committedFees || 0}" data-fee-disclosure="${feePending ? "pending" : "recorded"}"><p>${feePending ? t.customerFeesPending : confirmation ? copy(t.resourceFees, {amount: money(data.fees.resourceCommitment)}) : t.noResourceFees}</p>${view.rescheduleConfirmed ? `<p>${copy(t.rescheduleFlow.feeIncurred,{amount:money(data.fees.reschedule)})}</p>` : ""}<p class="decision-note">${copy(t.studyFees, {amount: money(data.fees.shared)})}</p></div>`;
    const authorization = `<dl class="wuxi-facts"><div><dt>${t.authorization}</dt><dd>${t.option} ${d.planId}</dd></div><div><dt>${t.amount}</dt><dd>${money(d.authorization.total)}</dd></div><div><dt>${t.authorizedBy}</dt><dd>${escape(data.people[d.authorization.by].name)}</dd></div><div><dt>${t.authorizedAt}</dt><dd>${time(d.authorization.at)}</dd></div></dl>`;

    function candidateRequest() {
      const f = t.rescheduleFlow;
      const step = view.rescheduleStage || "none";
      const quoteVisible = Boolean(view.rescheduleQuoteReady);
      const quote = quoteVisible ? view.rescheduleQuote || reschedule?.quote : null;
      const record = item => item ? `<span>${time(item.at, data.people[item.by].timezone)}</span>` : "";
      const ownerIds = {none:"P07",awaitingWuXiQuote:"P08",quoteReadyInternal:"P07",awaitingCustomerDecision:"P01",awaitingCustomerAuthorization:"P06",awaitingWuXiConfirmation:"P07",confirmed:"P07"};
      const stageCopy = f.stages[step] || f.stages.none;
      const actionEvents = {none:"rescheduleRequested",awaitingWuXiQuote:"rescheduleQuotePrepared",quoteReadyInternal:"rescheduleQuoteReturned",awaitingCustomerDecision:"rescheduleDecisionCreated",awaitingCustomerAuthorization:"rescheduleAuthorized",awaitingWuXiConfirmation:"rescheduleConfirmed"};
      const actionEvent = actionEvents[step];
      const waitingForResult = ["awaitingWuXiQuote", "awaitingWuXiConfirmation"].includes(step);
      const actionReady = !waitingForResult || reached(actionEvent);
      const actionZone = data.people[ownerIds[step] || "P07"].timezone;
      const timing = view.nextTiming;
      const timingLine = timing ? `<p id="reschedule-next-timing" data-timing-kind="${timing.kind}"><strong>${f.timingLabels[view.rescheduleConfirmed ? "technicalReassessment" : timing.kind]}: ${time(data.events[timing.eventRef].at, timing.timezone)}</strong></p>` : "";
      const actionHint = actionEvent && person.id === ownerIds[step] ? `<p class="decision-note" data-reschedule-action-event="${actionEvent}">${actionReady ? text.decision.timingRules.readyNow : `${text.decision.timingRules.externalWait}: ${time(data.events[actionEvent].at, actionZone)}`}</p>` : "";
      const original = d.authorization;
      const includedFee = original?.basis?.scope?.items?.find(item => item.feeKey === "reschedule");
      const includedNote = d.planId === "B" && includedFee && reschedule?.decision ? `<aside id="reschedule-included-fee" class="decision-note"><strong>${interpolate(f.includedFee,{total:money(original.total),amount:money(reschedule.decision.amount)})}</strong><p>${f.includedBoundary}</p></aside>` : "";
      let action = "";
      if (!reschedule && person.id === "P07") action = `<button type="button" class="button button-primary" id="request-reschedule"${disabled(!actionReady)}>${t.reschedule}</button>`;
      else if (step === "awaitingWuXiQuote" && person.id === "P08") action = `<div id="reschedule-quote-form" class="decision-form"><p>${f.prepareQuote}</p><p>${t.candidate}: ${time(data.plans.B.window.at)}</p><p>${f.quoteFee}: ${money(data.fees.reschedule)}</p><button type="button" class="button button-primary" id="record-reschedule-quote"${disabled(!actionReady)}>${f.recordQuote}</button></div>`;
      else if (step === "quoteReadyInternal" && person.id === "P07") action = `<button type="button" class="button button-primary" id="return-reschedule-quote"${disabled(!actionReady)}>${f.returnQuote}</button>`;
      else if (step === "awaitingCustomerDecision" && person.id === "P01") action = `<button type="button" class="button button-primary" id="launch-reschedule-decision"${disabled(!actionReady)}>${f.launchDecision}</button>`;
      else if (step === "awaitingCustomerAuthorization" && person.id === "P06") action = `${helpers.renderAuthorizationBrief?.(state) || ""}<form id="reschedule-authorization-form" class="decision-form">${includedNote}<label for="reschedule-signature">${text.decision.signature}</label><div class="signature-entry"><input id="reschedule-signature" name="signature" value="${escape(value("rescheduleSignature",""))}" autocomplete="off" required maxlength="100" placeholder="${escape(data.people.P06.name)}"><button type="button" class="button button-secondary" id="fill-reschedule-signature">${text.decision.fillExampleSignature}</button></div><label>${text.decision.reason}<textarea name="reason" rows="4" maxlength="2000" required>${escape(value("rescheduleAuthorizationReason",interpolate(f.exampleReason,{amount:money(data.fees.reschedule)})))}</textarea></label><label class="checkbox-label"><input type="checkbox" name="acknowledged" required${value("rescheduleAcknowledged",false) ? " checked" : ""}><span>${f.authorizeScope}</span></label><p class="decision-note">${text.decision.signatureHint}</p><button type="submit" class="button button-primary" id="authorize-reschedule"${disabled(!actionReady)}>${f.authorize} · ${money(data.fees.reschedule)}</button></form>`;
      else if (step === "awaitingWuXiConfirmation" && person.id === "P07") action = `<button type="button" class="button button-primary" id="confirm-reschedule"${disabled(!actionReady)}>${f.confirm}</button>`;
      const quoteDisplay = quote ? `<div class="reschedule-quote" data-reschedule-quote-visible><h4>${view.rescheduleQuoteReturned ? f.returnedQuote : f.internalQuote}</h4><dl class="wuxi-facts"><div><dt>${view.rescheduleConfirmed ? f.confirmedWindow : t.candidate}</dt><dd>${time(quote.candidateWindow)} <span class="status">${view.rescheduleConfirmed ? f.windowConfirmed : t.candidatePending}</span></dd></div><div><dt>${f.quoteFee}</dt><dd>${money(quote.amount)}</dd></div><div><dt>${f.quoteReference}</dt><dd>${quote.quoteRef} · v${quote.version}</dd></div></dl><p>${f.quoteScope}</p></div>` : `<p>${f.enquiryBoundary}</p>`;
      const history = reschedule ? `${reschedule.authorization ? helpers.renderAuthorizationBasis?.(state,reschedule.authorization,"reschedule") || "" : ""}<details class="reschedule-records"><summary>${f.recordHistory}</summary>${[[reschedule,f.enquiryRecorded],[view.rescheduleQuoteReady && reschedule.quote,f.quotePrepared],[reschedule.quoteReceipt,f.quoteReturned],[reschedule.decision,f.decisionCreated],[reschedule.authorization,f.authorized],[reschedule.confirmation,f.confirmed]].filter(([item])=>item).map(([item,label])=>`<p><strong>${label}</strong> · ${escape(data.people[item.by].name)} · ${record(item)}</p>`).join("")}</details>` : "";
      return `<section id="reschedule-workspace" class="wuxi-next-step" data-reschedule-stage="${step}"><h3>${f.title}</h3><p class="status" data-reschedule-status="${step}">${stageCopy}</p>${timingLine}<p>${t.nextOwner}: <strong>${escape(data.people[ownerIds[step] || "P07"].name)}</strong></p>${quoteDisplay}${view.rescheduleConfirmed ? `<p class="wuxi-conclusion">${f.finalBoundary}</p>` : `<p>${t.noCandidateDelivery}</p>`}${step === "awaitingCustomerAuthorization" && person.id === "P06" ? "" : includedNote}${action}${actionHint}<p class="decision-note">${f.scheduleNote}</p>${history}</section>`;
    }

    function result() {
      const held = receipt.outcome === "held";
      return `<div id="wuxi-response" class="wuxi-receipt" data-receipt-outcome="${receipt.outcome}" data-hold-status="${held ? "confirmed" : "unconfirmed"}"><h3>${held ? t.held : t.unavailable}</h3>${held ? `<p class="wuxi-hold-until">${t.heldUntil}: <strong>${time(data.plans.A.holdUntil)}</strong></p><p class="wuxi-conclusion">${t.heldConclusion}</p><p>${t.heldBoundary}</p>` : `<p class="wuxi-conclusion">${t.unavailableConclusion}</p>`}<p><strong>${t.refusalReason}</strong></p><p class="preserved-text" data-response-reason>${escape(recordText(view.schedulingReason || ""))}</p><dl class="wuxi-facts"><div data-scheduling-by="${resource.scheduling.by}"><dt>${t.responseBy}</dt><dd>${escape(data.people[resource.scheduling.by].name)} · ${time(resource.scheduling.at)}</dd></div><div data-receipt-by="${receipt.by}"><dt>${t.returnedBy}</dt><dd>${escape(data.people[receipt.by].name)} · ${time(receipt.at)}</dd></div></dl>${feeSummary}${!held ? candidateRequest() : ""}</div>`;
    }

    function actionPanel() {
      if (d.planId === "B") return `<div class="wuxi-branch-outcome" data-hold-status="unconfirmed"><p>${t.bScope}</p>${feeSummary}${candidateRequest()}</div>`;
      if (receipt) return result();
      if (!isWuXi) return `<p>${t.privateResponse}</p><div data-hold-status="unconfirmed">${feeSummary}</div>`;
      if (visibleOutcome) return `<div class="wuxi-internal-response" data-internal-outcome="${visibleOutcome}" data-hold-status="${visibleOutcome === "held" ? "confirmed" : "unconfirmed"}"><h3>${t.internalResponse}</h3><p class="status">${t.outcomeOptions[visibleOutcome]}</p><p data-response-reason class="preserved-text">${escape(recordText(view.schedulingReason))}</p><p data-scheduling-by="${resource.scheduling.by}">${t.responseBy}: ${escape(data.people[resource.scheduling.by].name)} · ${time(resource.scheduling.at)}</p>${visibleOutcome === "held" ? `<p>${t.heldUntil}: ${time(data.plans.A.holdUntil)}</p>` : ""}${feeSummary}<p>${t.returnOwner}: ${escape(data.people.P07.name)}</p>${person.id === "P07" ? `<button type="button" class="button button-primary" id="return-resource-receipt">${t.returnReceipt}</button>` : ""}</div>`;
      if (person.id === "P07") return `<div class="wuxi-review-start"><p>${t.startDue}: ${time(data.events.resourceReviewStart.at)}</p>${view.resourceStarted ? `<p class="status">${t.started}</p><p>${t.startedAt}: ${time(resource.startedAt)}</p><p>${t.waitForResponse}</p>` : `<button type="button" class="button button-primary" id="start-resource-review">${t.start}</button>`}<p>${t.scheduleOwner}: ${escape(data.people.P08.name)}</p><p>${t.responseDue}: ${time(data.events.resourceConfirmed.at)}</p>${feeSummary}</div>`;
      const outcome = value("resourceOutcome", state.branchIntent === "unavailable" ? "unavailable" : "held");
      const reason = value("resourceReason", defaultReason({data,core,text,outcome}));
      const ready = view.resourceStarted && reached("resourceConfirmed");
      return `<div class="wuxi-scheduling-work"><h3>${t.response}</h3>${!view.resourceStarted ? `<p>${t.waitForStart}</p>` : ""}<p>${t.responseDue}: ${time(data.events.resourceConfirmed.at)}</p>${view.resourceStarted && !ready ? `<p class="decision-note">${text.decision.timingRules.externalWait}</p>` : ""}<form id="resource-response-form" class="decision-form wuxi-form"><label>${t.outcome}<select name="outcome"${disabled(!view.resourceStarted)}>${Object.entries(t.outcomeOptions).map(([key,label]) => `<option value="${key}"${outcome === key ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>${t.reason}<textarea name="reason" rows="5" maxlength="3000" required${disabled(!view.resourceStarted)}>${escape(reason)}</textarea></label><p class="decision-note">${t.reasonHint}</p><button type="submit" class="button button-primary" id="confirm-resource-response"${disabled(!ready)}>${t.confirmResponse}</button></form>${feeSummary}</div>`;
    }

    const heading = receipt ? t.receivedResponse : t.title;
    return `<section id="wuxi" class="section wuxi-workspace" data-resource-status="${status}"><div class="section-heading"><h2>${heading}</h2>${tags}</div>${publishedSummary()}${authorization}${actionPanel()}</section>`;
  }

  global.DEMO_WUXI_VIEW = Object.freeze({ render, defaultReason });
})(globalThis);

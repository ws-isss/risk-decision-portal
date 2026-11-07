(function (global) {
  "use strict";

  const clone = value => JSON.parse(JSON.stringify(value));
  const interpolate = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  const customerView = (data, state) => global.DEMO_WORKFLOW.project(data, state, "P01");

  function statusKey(view) {
    if (view.rescheduleStage && view.rescheduleStage !== "none") return view.rescheduleStage === "quoteReadyInternal" ? "awaitingWuXiQuote" : view.rescheduleStage;
    if (view.resourceConfirmed) return "held";
    if (view.resourceRejected) return "unavailable";
    if (view.rescheduleRequested) return "awaitingWuXiQuote";
    return view.authorized ? "authorized" : "beforeAuthorization";
  }

  // Fingerprints include only records Emma can share. In particular, neither an
  // internal scheduling response nor an unreturned quote invalidates her brief.
  function fingerprint({ data, state }) {
    const view = customerView(data, state);
    const d = view.clientVisible ? state.decision : null;
    const quote = view.rescheduleQuoteReturned ? view.rescheduleQuote : null;
    return clone({
      publication: { visible: view.clientVisible, status: state.publication?.status, certainty: state.publication?.certainty, nextUpdateEvent: state.publication?.nextUpdateEvent, publishedAt: state.publication?.publishedAt },
      requirement: { needByLocalDate: state.needByLocalDate, deliverable: state.deliverableOverride || "", destination: state.destinationOverride || "" },
      sources: {
        reports: data.risk.reportRefs.map(id => ({ id, version: data.reports[id].version })),
        evidence: { measured: data.risk.hmwPct, target: data.risk.targetPct },
        quotes: Object.values(data.plans).map(plan => ({ id: plan.id, total: plan.total, window: plan.window.at, holdUntil: plan.holdUntil, delivery: plan.forecast.localDate })),
        fees: data.fees,
        quote: quote ? { quoteRef: quote.quoteRef, version: quote.version } : null
      },
      business: {
        planId: d?.planId || null, fallbackSelected: Boolean(d?.fallbackSelected),
        technicalComplete: view.technicalComplete, qualityComplete: view.qualityComplete,
        authorized: view.authorized, authorization: view.authorized ? { by: d.authorization.by, at: d.authorization.at, total: d.authorization.total } : null,
        resourceStarted: view.resourceStarted, resourceConfirmed: view.resourceConfirmed, resourceRejected: view.resourceRejected,
        reason: view.resourceRejected ? view.schedulingReason : "", committedFees: view.committedFees,
        rescheduleStage: statusKey(view),
        quote: quote ? { candidateWindow: quote.candidateWindow, amount: quote.amount } : null,
        rescheduleAuthorized: Boolean(view.rescheduleAuthorized), rescheduleConfirmed: Boolean(view.rescheduleConfirmed)
      }
    });
  }

  function staleReasons(brief, current) {
    if (!brief?.snapshot) return [];
    const next = fingerprint(current);
    return ["business", "requirement", "sources", "publication"].filter(key => JSON.stringify(brief.snapshot[key]) !== JSON.stringify(next[key]));
  }

  function generate({ data, core, state, text }) {
    if (state.viewer !== "P01") throw new Error("ROLE_NOT_ALLOWED");
    const view = customerView(data, state);
    if (!view.clientVisible || state.publication?.status !== "published") throw new Error("UNPUBLISHED_RISK");
    const t = text.brief;
    const d = state.decision;
    const key = statusKey(view);
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: data.fees.currency, maximumFractionDigits: 0 }).format(value);
    const customerZone = data.baseline.timezone;
    const baseZone = data.calendars.base.timezone;
    const localTime = (value, zone) => `${core.formatInstant(value, zone, { year: "numeric" })} ${zone === baseZone ? text.common.shanghai : text.common.easternTime}`;
    const dateOnly = (value, zone) => core.formatInstant(value, zone, { year: "numeric", hour: undefined, minute: undefined });
    const needDate = core.formatLocalDate(state.needByLocalDate);
    const quote = view.rescheduleQuoteReturned ? view.rescheduleQuote : null;
    const values = {
      aTotal: money(data.plans.A.total), bTotal: money(data.plans.B.total),
      authorizationDue: localTime(data.events.latestAuthorization.at, customerZone),
      selected: d?.planId || "", authorizedTotal: d?.authorization ? money(d.authorization.total) : "",
      holdUntil: localTime(data.plans.A.holdUntil, baseZone),
      candidateWindow: dateOnly(quote?.candidateWindow || data.plans.B.window.at, baseZone),
      rescheduleFee: money(quote?.amount ?? data.fees.reschedule),
      measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1),
      shared: money(data.fees.shared), expedite: money(data.fees.expedite), hold: money(data.fees.hold),
      premium: money(data.fees.premiumOverB), committed: money(view.committedFees),
      technical: view.technicalComplete ? t.opinionRecorded : t.opinionPending,
      quality: view.qualityComplete ? t.opinionRecorded : t.opinionPending,
      reason: view.resourceRejected ? view.schedulingReason : "", needDate,
      deliverable: state.deliverableOverride || text.project[data.project.deliveryStatusKey],
      destination: state.destinationOverride || text.project[data.project.destinationKey],
      owner: data.people[data.risk.nextUpdateOwnerId].name,
      approver: data.people.P06.name
    };
    const copy = template => interpolate(template, values);
    const facts = [copy(t.finding), t.factsBase, copy(t.reviewProgress)];
    if (view.resourceConfirmed) facts.push(copy(t.holdFact), copy(t.feesHeld));
    else if (view.resourceRejected) facts.push(copy(t.failureFact), t.failureAssumption, copy(view.rescheduleConfirmed ? t.feesRescheduled : t.feesUnavailable));
    else if (view.authorized) facts.push(t.feesPending);
    if (quote && !view.rescheduleConfirmed) facts.push(copy(t.quoteFact));
    if (view.rescheduleConfirmed && !view.resourceRejected) facts.push(copy(t.feesRescheduled));
    const historical = Boolean(view.forecastReassessmentRequired || view.resourceRejected || view.rescheduleRequested);
    const options = ["A", "B"].map(id => {
      const plan = data.plans[id];
      const gap = core.calendarGap(state.needByLocalDate, plan.forecast.localDate);
      const gapText = gap === 0 ? t.onNeed : interpolate(gap > 0 ? t.beforeNeed : t.afterNeed, { days: Math.abs(gap) });
      return interpolate(historical ? t.optionHistorical : t.option, Object.assign({}, values, {
        option: id, total: money(plan.total), costs: copy(id === "A" ? t.costsA : t.costsB),
        windowLabel: id === "A" ? t.originalWindow : t.candidateWindow,
        window: dateOnly(plan.window.at, baseZone), delivery: core.formatLocalDate(plan.forecast.localDate), gap: gapText
      }));
    });
    options.push(copy(historical ? t.premiumHistorical : t.premium), copy(t.requirement));
    if (d?.planId === "A") options.push(d.fallbackSelected ? interpolate(t.fallbackOn, { cap: money(data.fees.fallbackCap), total: money(data.fees.totals.AWithFallback) }) : t.fallbackOff);
    let nextUpdate;
    if (["awaitingCustomerDecision", "awaitingCustomerAuthorization"].includes(key)) nextUpdate = interpolate(t.nextCustomer, { owner: data.people.P01.name, approver: data.people.P06.name });
    else if (view.resourceRejected || view.rescheduleRequested || key === "confirmed") nextUpdate = copy(t.nextUnavailable);
    else if (view.resourceConfirmed) {
      const firstAnalysis = data.plans.A.stages.find(stage => stage.id === "firstAnalysis");
      nextUpdate = interpolate(t.nextHeld, Object.assign({}, values, { time: localTime(firstAnalysis.end, firstAnalysis.executionTimezone) }));
    } else {
      const eventId = view.authorized || view.reviewsComplete ? "resourceConfirmed" : state.publication.nextUpdateEvent || data.risk.nextUpdateEvent;
      const template = view.authorized || eventId === "resourceConfirmed" ? t.nextResource : view.reviewsComplete ? t.reviewAvailable : t.nextReview;
      nextUpdate = interpolate(template, Object.assign({}, values, { time: localTime(data.events[eventId].at, eventId === "resourceConfirmed" ? baseZone : customerZone) }));
    }
    const sections = [
      [t.sections.decision, copy(t.decisions[key] || t.decisions.unavailable)],
      [t.sections.facts, facts.join("\n")],
      [t.sections.options, options.join("\n")],
      [t.sections.unknowns, historical || key === "confirmed" ? t.unknownsUnavailable : t.unknowns],
      [t.sections.update, nextUpdate]
    ];
    const sourceVersions = data.risk.reportRefs.map(id => `${id} v${data.reports[id].version}`);
    if (quote) {
      const quotedVersion = `${quote.quoteRef} v${quote.version}`;
      if (!sourceVersions.includes(quotedVersion)) sourceVersions.push(quotedVersion);
    }
    return {
      content: sections.map(([heading, body]) => `${heading}\n${body}`).join("\n\n"),
      snapshot: fingerprint({ data, state }), generatedAt: state.clock, statusKey: key,
      edited: false, previewed: false,
      metadata: {
        title: `${data.project.id} · ${t.title}`, status: t.status[key] || t.status.unavailable,
        asOf: localTime(state.clock, customerZone), sourceVersions,
        labels: [text.common.demo, text.common.assumption, t.simulated],
        sourceNote: t.sourceNote,
        sequenceNote: view.rescheduleRequested ? t.sameClockNote : ""
      }
    };
  }

  // Use captured metadata, never the current dataset, when copying an old brief.
  function copyText(brief, text, { staleReasons = [] } = {}) {
    if (!brief) return "";
    const t = text.brief;
    const meta = brief.metadata;
    const warning = staleReasons.length ? `${t.staleRecipient}\n${staleReasons.map(key => t.staleReasons[key]).join(" ")}` : "";
    return [meta.title, meta.status, meta.labels.join(" · "), `${t.asOf}: ${meta.asOf}`, warning, "", brief.content, "", `${t.versions}: ${meta.sourceVersions.join("; ")}`, meta.sourceNote, meta.sequenceNote].filter((line, index, lines) => line || lines[index - 1]).join("\n");
  }

  global.DEMO_BRIEF = Object.freeze({ generate, fingerprint, staleReasons, copyText, statusKey });
})(globalThis);

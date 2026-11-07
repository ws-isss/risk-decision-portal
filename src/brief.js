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
        rescheduleTiming: Object.fromEntries(Object.entries(data.rescheduleTiming).filter(([key]) => key.endsWith("Event")).map(([key, eventId]) => [key, data.events[eventId].at])),
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
    const quote = view.rescheduleQuoteReturned ? view.rescheduleQuote : null;
    const reassessing = Boolean(view.forecastReassessmentRequired || view.resourceRejected || view.rescheduleRequested);
    const values = {
      aTotal: money(data.plans.A.total), bTotal: money(data.plans.B.total),
      authorizationDue: localTime(data.events.latestAuthorization.at, customerZone),
      actionDue: view.nextTiming?.kind === "customerActionDue" ? localTime(data.events[view.nextTiming.eventRef].at, view.nextTiming.timezone) : "",
      selected: d?.planId || "", selectedTotal: d ? money(data.plans[d.planId].total) : "",
      authorizedTotal: d?.authorization ? money(d.authorization.total) : "",
      fallbackCap: money(data.fees.fallbackCap), fallbackTotal: money(data.fees.totals.AWithFallback),
      holdUntil: localTime(data.plans.A.holdUntil, baseZone),
      candidateWindow: quote ? dateOnly(quote.candidateWindow, baseZone) : "",
      rescheduleFee: quote ? money(quote.amount) : "",
      measured: data.risk.hmwPct.toFixed(1), target: data.risk.targetPct.toFixed(1),
      committed: money(view.committedFees), shared: money(data.fees.shared),
      needDate: core.formatLocalDate(state.needByLocalDate),
      deliverable: state.deliverableOverride || text.project[data.project.deliveryStatusKey],
      destination: state.destinationOverride || text.project[data.project.destinationKey],
      owner: data.people[data.risk.nextUpdateOwnerId].name,
      approver: data.people.P06.name
    };
    const copy = template => interpolate(template, values);
    let opening = t.decisions[key];
    if (key === "beforeAuthorization" && d) opening = d.fallbackSelected ? t.selectedFallbackDecision : t.selectedDecision;
    if (key === "authorized" && d?.fallbackSelected) opening = t.authorizedFallbackDecision;
    const rows = ["A", "B"].map(id => {
      const plan = data.plans[id];
      if (reassessing) {
        if (id === "A") return [id, t.table.notApplicable, view.resourceRejected ? t.table.unavailable : t.table.notSelected, t.table.notCurrent, view.resourceRejected ? t.table.closed : t.table.outsideDecision];
        if (!quote) return [id, t.table.awaitingQuote, t.table.awaitingQuote, t.table.reassessment, t.table.pending];
        return [id, interpolate(view.rescheduleConfirmed ? t.table.feeIncurred : t.table.feeQuoted, values), values.candidateWindow, t.table.reassessment, view.rescheduleConfirmed ? t.table.confirmed : t.table.candidate];
      }
      if (view.resourceConfirmed && id === "B") return [id, t.table.notApplicable, t.table.notSelected, t.table.notCurrent, t.table.outsideDecision];
      const gap = core.calendarGap(state.needByLocalDate, plan.forecast.localDate);
      const gapText = gap === 0 ? t.onNeed : interpolate(gap > 0 ? t.beforeNeed : t.afterNeed, { days: Math.abs(gap) });
      const delivery = `${core.formatLocalDate(plan.forecast.localDate)} (${gapText})`;
      const cost = view.resourceConfirmed ? interpolate(t.table.heldCost, values) : `${money(plan.total)} ${view.authorized && id === d.planId ? t.table.authorized : t.table.quoted}`;
      return [id, cost, dateOnly(plan.window.at, baseZone), delivery, view.resourceConfirmed ? t.table.held : t.table.unconfirmed];
    });
    const table = [t.table.headers, t.table.headers.map(() => "---"), ...rows].map(cells => `| ${cells.join(" | ")} |`).join("\n");
    let unknowns = reassessing ? t.unknownsUnavailable : view.resourceConfirmed ? t.unknownsHeld : t.unknowns;
    let nextUpdate;
    if (view.nextTiming) {
      const timing = view.nextTiming;
      const template = timing.kind === "customerActionDue" ? t.nextCustomer : key === "confirmed" ? t.nextReassessment : t.nextUnavailable;
      nextUpdate = interpolate(template, { ...values, owner: data.people[timing.ownerId].name, time: localTime(data.events[timing.eventRef].at, timing.timezone) });
    } else if (view.resourceConfirmed) {
      const firstAnalysis = data.plans.A.stages.find(stage => stage.id === "firstAnalysis");
      nextUpdate = interpolate(t.nextHeld, { ...values, time: localTime(firstAnalysis.end, firstAnalysis.executionTimezone) });
    } else {
      const eventId = view.authorized || view.reviewsComplete ? "resourceConfirmed" : state.publication.nextUpdateEvent || data.risk.nextUpdateEvent;
      nextUpdate = interpolate(eventId === "resourceConfirmed" ? t.nextResource : t.nextReview, { ...values, time: localTime(data.events[eventId].at, eventId === "resourceConfirmed" ? baseZone : customerZone) });
    }
    const scope = view.resourceConfirmed ? copy(d?.fallbackSelected ? t.heldFallbackScope : t.heldScope)
      : reassessing ? quote ? copy(t.rescheduleScope) : view.resourceRejected ? t.enquiryScope : t.optionBEnquiryScope
      : copy(t.requirement);
    const sections = [
      `**${data.project.id}: ${copy(opening)}**`, table,
      `${copy(t.finding)} ${scope}`,
      `**${t.sections.unknowns}**\n${unknowns.map(item => `- ${item}`).join("\n")}`,
      `**${t.sections.update}:** ${nextUpdate}`
    ];
    // Only currently relevant quotations accompany the brief. Previous A/B
    // projections remain in the project record, never in the current summary.
    const sourceIds = data.risk.reportRefs.filter(id => !id.startsWith("Q-") || (!reassessing && (!view.resourceConfirmed || id === "Q-A")));
    const sourceVersions = sourceIds.map(id => `${id} v${data.reports[id].version}`);
    if (quote) {
      const quotedVersion = `${quote.quoteRef} v${quote.version}`;
      if (!sourceVersions.includes(quotedVersion)) sourceVersions.push(quotedVersion);
    }
    return {
      content: sections.join("\n\n"),
      snapshot: fingerprint({ data, state }), generatedAt: state.clock, statusKey: key,
      edited: false, previewed: false,
      metadata: {
        title: `${data.project.id} · ${t.title}`, status: t.status[key] || t.status.unavailable,
        asOf: localTime(state.clock, customerZone), sourceVersions,
        labels: [text.common.demo, text.common.assumption, t.simulated],
        sourceNote: t.sourceNote
      }
    };
  }

  // Use captured metadata, never the current dataset, for an edited or old brief.
  function recipientMarkdown(brief, text, { staleReasons = [] } = {}) {
    if (!brief) return "";
    const t = text.brief;
    const meta = brief.metadata;
    const warning = staleReasons.length ? `**${t.staleRecipient}** ${staleReasons.map(key => t.staleReasons[key]).join(" ")}` : "";
    return [brief.content, warning, `${meta.labels.join(" · ")}. ${meta.sourceNote}`, `${t.versions}: ${meta.sourceVersions.join("; ")}. ${t.asOf}: ${meta.asOf}.`].filter(Boolean).join("\n\n");
  }

  function plainText(markdown) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const inline = value => value.replace(/\*\*([^*\n]+)\*\*/g, "$1");
    const cells = line => line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, "|"));
    const output = [];
    for (let index = 0; index < lines.length;) {
      const line = lines[index].trim();
      const headers = cells(line);
      const separators = cells(lines[index + 1] || "");
      const table = line.startsWith("|") && lines[index + 1]?.trim().startsWith("|") && headers.length > 1 && headers.length === separators.length && separators.every(value => /^:?-{3,}:?$/.test(value));
      if (table) {
        output.push(headers.map(inline).join("\t")); index += 2;
        while (index < lines.length && lines[index].trim().startsWith("|") && cells(lines[index]).length === headers.length) output.push(cells(lines[index++]).map(inline).join("\t"));
      } else {
        output.push(inline(line.replace(/^#{1,3}\s+/, "").replace(/^-\s+/, ""))); index++;
      }
    }
    return output.join("\n");
  }

  function copyText(brief, text, options) { return plainText(recipientMarkdown(brief, text, options)); }
  function wordCount(brief, text, options) { return copyText(brief, text, options).trim().split(/\s+/).filter(Boolean).length; }

  global.DEMO_BRIEF = Object.freeze({ generate, fingerprint, staleReasons, recipientMarkdown, plainText, copyText, wordCount, statusKey });
})(globalThis);

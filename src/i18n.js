(function (global) {
  "use strict";
  const interpolate = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: global.DEMO_DATA.fees.currency, maximumFractionDigits: 0 }).format(value);

  function coreFor(text) {
    const core = global.DEMO_CORE;
    return {
      ...core,
      formatInstant: (value, zone, options) => core.formatInstant(value, zone, { locale: text.meta.locale || "en-US", ...options }),
      formatLocalDate: (value, options) => core.formatLocalDate(value, { locale: text.meta.locale || "en-US", ...options })
    };
  }

  function taskBriefs({ data, text, plan, fallbackSelected, publication }) {
    const core = coreFor(text);
    const et = id => `${core.formatInstant(data.events[id].at, data.baseline.timezone)} ${text.common.easternTime}`;
    const values = {
      evidence: ["SEC-001", "EXP-001", `Q-${plan}`].map(id => `${id} · v${data.reports[id].version}`).join("; "),
      plannedStart: `${core.formatInstant(data.initialClock, data.baseline.timezone)} ${text.common.easternTime}`,
      reviewStart: et("latestReviewStart"), reviewComplete: et("reviewsComplete"),
      designation: et("alternateAssigned"), budgetStart: et("budgetStart"), budgetEnd: et("budgetAuthorized"),
      plan, amount: money(data.plans[plan].total + (fallbackSelected ? data.fees.fallbackCap : 0))
    };
    const context = interpolate(text.portal.publishedContext, { certainty: text.portal.certainty[publication.certainty], update: et(publication.nextUpdateEvent) });
    return Object.fromEntries(["technical", "quality", "budget"].map(key => [key, context + interpolate(text.decision.template[key], values)]));
  }

  // Only exact, untouched example text has an alternate presentation. Authored
  // text and the original signed business records are never rewritten.
  function recordText(value, { data, state, text }) {
    if (typeof value !== "string" || !value) return value;
    const pairs = [];
    const d = state.decision;
    for (const source of Object.values(global.DEMO_MESSAGES)) {
      if (source.decision.qualityScenario && text.decision.qualityScenario) pairs.push([source.decision.qualityScenario.reason, text.decision.qualityScenario.reason]);
      for (const key of ["technical", "quality"]) pairs.push([source.decision.examples[key], text.decision.examples[key]]);
      for (const outcome of ["held", "unavailable"]) pairs.push([
        global.DEMO_WUXI_VIEW.defaultReason({ data, core: coreFor(source), text: source, outcome }),
        global.DEMO_WUXI_VIEW.defaultReason({ data, core: coreFor(text), text, outcome })
      ]);
      pairs.push([
        interpolate(source.wuxi.rescheduleFlow.exampleReason, { amount: money(data.fees.reschedule) }),
        interpolate(text.wuxi.rescheduleFlow.exampleReason, { amount: money(data.fees.reschedule) })
      ]);
      if (d) {
        const scope = { plan: d.planId, amount: money(d.authorization?.total ?? data.plans[d.planId].total + (d.fallbackSelected ? data.fees.fallbackCap : 0)) };
        pairs.push([interpolate(source.decision.examples.authorization, scope), interpolate(text.decision.examples.authorization, scope)]);
        const args = { data, plan: d.planId, fallbackSelected: d.fallbackSelected, publication: state.publication };
        const from = taskBriefs({ ...args, text: source });
        const to = taskBriefs({ ...args, text });
        for (const key of Object.keys(from)) pairs.push([from[key], to[key]]);
      }
    }
    return pairs.find(([original]) => original === value)?.[1] ?? value;
  }
  global.DEMO_I18N = Object.freeze({ coreFor, taskBriefs, recordText });
})(globalThis);

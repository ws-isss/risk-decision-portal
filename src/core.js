(function (global) {
  "use strict";

  function validLocalDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  // Calendar-date comparison deliberately ignores elapsed DST hours.
  function calendarGap(needDate, deliveryDate) {
    if (!validLocalDate(needDate) || !validLocalDate(deliveryDate)) throw new Error("INVALID_LOCAL_DATE");
    return Math.round((Date.parse(needDate + "T12:00:00Z") - Date.parse(deliveryDate + "T12:00:00Z")) / 86400000);
  }

  function formatInstant(value, timeZone, options) {
    const { locale = "en-US", ...fields } = options || {};
    if (locale === "zh-CN") {
      const date = new Date(value);
      const hasDate = !(Object.hasOwn(fields, "month") && fields.month === undefined && Object.hasOwn(fields, "day") && fields.day === undefined);
      const hasTime = !(Object.hasOwn(fields, "hour") && fields.hour === undefined && Object.hasOwn(fields, "minute") && fields.minute === undefined);
      const labels = global.DEMO_MESSAGES.zh.common;
      let datePart = hasDate ? new Intl.DateTimeFormat(locale, { timeZone, year: "numeric", month: "long", day: "numeric" }).format(date) : "";
      if (hasDate && (fields.weekday || hasTime)) {
        const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(date);
        datePart = labels.dateWithWeekday.replace("{date}", datePart).replace("{weekday}", weekday);
      }
      const timePart = hasTime ? new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date) : "";
      return hasDate && hasTime ? labels.dateTime.replace("{date}", datePart).replace("{time}", timePart) : datePart || timePart;
    }
    return new Intl.DateTimeFormat(locale, Object.assign({ timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }, fields)).format(new Date(value));
  }

  function formatLocalDate(value, options) {
    if (!validLocalDate(value)) throw new Error("INVALID_LOCAL_DATE");
    const { locale = "en-US", ...fields } = options || {};
    if (locale === "zh-CN") return formatInstant(value + "T12:00:00Z", "UTC", { ...fields, locale, hour: undefined, minute: undefined });
    return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }, fields)).format(new Date(value + "T12:00:00Z"));
  }

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }

  // Commercial authority is captured from the structured request and quotation,
  // never from the editable management brief or the current progress narrative.
  const mainRequestKey = d => `main:${d.createdAt}${(d.version || 1) > 1 ? `:v${d.version}` : ""}`;
  function authorizationContext(data, state, kind) {
    const d = state.decision;
    if (!d) return null;
    const r = d.resource?.rescheduleRequest;
    const selectedKind = kind || (r?.decision ? "reschedule" : "main");
    if (!["main", "reschedule"].includes(selectedKind)) throw new Error("UNKNOWN_AUTHORIZATION_KIND");
    if (selectedKind === "reschedule") {
      if (!r?.decision || !r.quote) return null;
      return deepFreeze({
        request: { key: `reschedule:${r.decision.at}`, kind: "reschedule", planId: d.planId, createdAt: r.decision.at },
        quotes: [{ id: r.quote.quoteRef, version: r.quote.version, amount: r.quote.amount, scopeKey: "reschedulingOnly" }],
        scope: {
          currency: data.fees.currency, amount: r.decision.amount, quoteAmount: r.quote.amount,
          decisionQuote: { id: r.decision.quoteRef, version: r.decision.version },
          fallbackCap: 0, window: r.quote.candidateWindow,
          items: [{ feeKey: "reschedule", amount: r.quote.amount, chargeTrigger: data.fees.chargeTriggers.reschedule }]
        }
      });
    }
    const plan = data.plans[d.planId];
    const fallbackCap = d.fallbackSelected ? data.fees.fallbackCap : 0;
    const quote = data.reports[plan.quoteRef];
    const quotes = [{ id: plan.quoteRef, version: quote.version, amount: plan.total, scopeKey: "mainPlan" }];
    if (d.fallbackSelected) quotes.push({ id: data.plans.B.quoteRef, version: data.reports[data.plans.B.quoteRef].version, amount: fallbackCap, scopeKey: "fallbackRescheduling" });
    const feeKeys = d.planId === "A" ? ["shared", "expedite", "hold"] : ["shared", "reschedule"];
    return deepFreeze({
      request: { key: mainRequestKey(d), kind: "main", planId: d.planId, createdAt: d.createdAt, version: d.version || 1 },
      quotes,
      scope: {
        currency: data.fees.currency,
        reviewScope: d.supplement || "",
        amount: d.fallbackSelected ? data.fees.totals.AWithFallback : data.fees.totals[d.planId],
        planAmount: data.fees.totals[d.planId], fallbackCap, window: plan.window.at,
        studyPlan: { id: "EXP-001", version: data.reports["EXP-001"].version },
        items: feeKeys.map(feeKey => ({ feeKey, amount: data.fees[feeKey], chargeTrigger: data.fees.chargeTriggers[feeKey] })),
        fallback: d.fallbackSelected ? { feeKey: "reschedule", amount: fallbackCap, chargeTrigger: data.fees.chargeTriggers.reschedule } : null
      }
    });
  }

  function authorizationMatches(data, state, kind) {
    const context = authorizationContext(data, state, kind);
    if (!context) return false;
    const authorization = context.request.kind === "reschedule" ? state.decision.resource.rescheduleRequest.authorization : state.decision.authorization;
    if (!authorization?.basis) return false;
    return ["request", "quotes", "scope"].every(key => JSON.stringify(context[key]) === JSON.stringify(authorization.basis[key]));
  }

  function authorizationBasis(data, state, kind, attachment) {
    const context = authorizationContext(data, state, kind);
    if (!context) throw new Error("DECISION_REQUIRED");
    if (attachment && attachment.requestKey !== context.request.key) throw new Error("BRIEF_REQUEST_MISMATCH");
    if (attachment && (!Number.isInteger(attachment.version) || attachment.version < 1 || attachment.attachedBy?.id !== "P01" || !attachment.attachedAt || !attachment.brief?.generatedAt || !attachment.brief?.metadata?.asOf)) throw new Error("INVALID_BRIEF_ATTACHMENT");
    return deepFreeze(JSON.parse(JSON.stringify({ ...context, brief: attachment ? {
      requestKey: attachment.requestKey, version: attachment.version,
      attachedBy: attachment.attachedBy, attachedAt: attachment.attachedAt, attachedAtLabel: attachment.attachedAtLabel,
      dataAsOf: attachment.brief.generatedAt, dataAsOfLabel: attachment.brief.metadata.asOf
    } : null })));
  }

  function createSession(data) {
    let state;
    const reviewOwners = { technical: "P02", quality: "P03" };
    function initial(scene) {
      return {
        scene, viewer: scene === "prepublication" ? "P07" : "P01",
        clock: scene === "prepublication" ? data.events.riskDiscovered.at : data.initialClock,
        needByLocalDate: data.baseline.needByLocalDate,
        deliverableOverride: "", destinationOverride: "", revision: 0,
        eventIds: [], decision: null, resetNotice: false,
        chapterId: scene === "prepublication" ? "prepublication" : "selection", chapterSeeded: false, seededEventIds: [], branchIntent: null,
        publication: { status: scene === "prepublication" ? "draft" : "published", certainty: "underAssessment", nextUpdateEvent: "reviewsComplete", reviewedAt: null, publishedAt: scene === "prepublication" ? null : data.events.materialReady.at, updatedAt: scene === "prepublication" ? data.events.riskDiscovered.at : data.events.materialReady.at }
      };
    }
    state = initial("customer");
    function snapshot() { return deepFreeze(JSON.parse(JSON.stringify(state))); }
    function ensure(condition, code) { if (!condition) throw new Error(code); }
    function customer() { ensure(state.scene === "customer" && state.publication.status === "published", "UNPUBLISHED_RISK"); }
    function role(id) { customer(); ensure(state.viewer === id, "ROLE_NOT_ALLOWED"); }
    function request() { customer(); ensure(state.decision, "DECISION_REQUIRED"); return state.decision; }
    function tasksRequired() { const d = request(); ensure(d.tasksCreated, "TASKS_REQUIRED"); return d; }
    function at(value) { ensure(Date.parse(state.clock) >= Date.parse(value), "TOO_EARLY"); }
    function atEvent(id) { at(data.events[id].at); }
    function changed() { state.revision += 1; return snapshot(); }
    function record(id, recordedAt = state.clock, timeStatus) {
      if (!state.eventIds.includes(id)) state.eventIds.push(id);
      if (!state.decision) return null;
      let entry = state.decision.audit.find(item => item.id === id);
      if (!entry) {
        state.decision.nextAuditSequence = (state.decision.nextAuditSequence || 0) + 1;
        entry = { id, at: recordedAt, by: state.viewer, sequence: state.decision.nextAuditSequence };
        if (timeStatus) entry.timeStatus = timeStatus;
        state.decision.audit.push(entry);
      }
      return entry;
    }
    function rescheduleRecord(id, fields = {}) {
      const entry = record(id);
      return Object.assign({ by: entry.by, at: entry.at, sequence: entry.sequence }, fields);
    }
    function rescheduleRequest() {
      const d = tasksRequired();
      ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED");
      ensure(d.resource.rescheduleRequest, "RESCHEDULE_ENQUIRY_REQUIRED");
      return d.resource.rescheduleRequest;
    }
    function review(kind) { ensure(Object.hasOwn(reviewOwners, kind), "UNKNOWN_REVIEW"); role(reviewOwners[kind]); return tasksRequired().reviews[kind]; }
    function bothReviews(d) { return d.reviews.technical.status === "completed" && d.reviews.quality.status === "completed"; }
    function reviewsApproved(d) { return bothReviews(d) && Object.values(d.reviews).every(r => r.outcome === "approved" && r.requestVersion === d.version); }
    function reviewBlocked(d) { return d && Object.values(d.reviews).some(r => r.status === "completed" && r.outcome !== "approved"); }
    function getAdvanceInfo() {
      if (state.publication.status === "draft") {
        return Date.parse(state.clock) < Date.parse(data.events.materialReady.at)
          ? Object.freeze({ nextEvent: "materialReady", blockKey: state.publication.reviewedAt ? null : "reviewRiskDraft", done: false })
          : Object.freeze({ nextEvent: null, blockKey: "publishRisk", done: true });
      }
      customer();
      const d = state.decision;
      const blocked = blockKey => Object.freeze({ nextEvent: null, blockKey, done: false });
      const wait = (nextEvent, blockKey) => Date.parse(state.clock) < Date.parse(data.events[nextEvent].at)
        ? Object.freeze({ nextEvent, blockKey: null, done: false }) : blocked(blockKey);
      if (!d) return blocked("choosePlan");
      if (!d.tasksCreated) return blocked("createTasks");
      if (reviewBlocked(d)) return blocked("resolveReviews");
      if (!d.authorization) {
        if (!d.support.assignedAt) return blocked("assignSupport");
        if (!d.approver.id) return blocked("designateApprover");
        if (!d.support.acceptedAt) return blocked("acceptSupport");
        if (Object.values(d.reviews).some(r => r.status === "notStarted")) return blocked("startReviews");
        if (!bothReviews(d)) return d.version > 1 ? blocked("completeReviews") : wait("reviewsComplete", "completeReviews");
        return blocked("authorizeCustomer");
      }
      const resource = d.resource;
      const exceptionActive = d.planId === "B" || resource.receipt?.outcome === "unavailable";
      if (exceptionActive) {
        const r = resource.rescheduleRequest;
        if (!r) return blocked("requestReschedule");
        if (!r.quote) return wait("rescheduleQuotePrepared", "prepareRescheduleQuote");
        if (!r.quoteReceipt) return blocked("returnRescheduleQuote");
        // A suggested daytime handoff in the guide, never an action lock.
        if (!r.decision && Date.parse(state.clock) < Date.parse(data.events.rescheduleCustomerAvailable.at)) return wait("rescheduleCustomerAvailable", "createRescheduleDecision");
        if (!r.decision) return blocked("createRescheduleDecision");
        if (!r.authorization) return blocked("authorizeReschedule");
        if (!r.confirmation) return wait("rescheduleConfirmed", "confirmReschedule");
      } else {
        if (!resource.startedAt) return blocked("startResourceReview");
        if (!resource.scheduling) return wait("resourceConfirmed", "schedulingResponse");
        if (!resource.receipt) return blocked("returnResourceReceipt");
      }
      return Object.freeze({ nextEvent: null, blockKey: null, done: true });
    }

    const api = {
      getState: snapshot,
      getAdvanceInfo,
      setViewer(id) {
        ensure(data.people[id], "UNKNOWN_VIEWER");
        state.viewer = id;
        return snapshot();
      },
      setRequirement(values) {
        ensure(validLocalDate(values.needByLocalDate), "INVALID_LOCAL_DATE");
        const didChange = state.needByLocalDate !== values.needByLocalDate || state.deliverableOverride !== (values.deliverableOverride || "") || state.destinationOverride !== (values.destinationOverride || "");
        state.needByLocalDate = values.needByLocalDate;
        state.deliverableOverride = values.deliverableOverride || "";
        state.destinationOverride = values.destinationOverride || "";
        return didChange ? changed() : snapshot();
      },
      // Clock movement never records task completion or a business receipt.
      advanceTo(eventId) {
        const event = data.events[eventId];
        ensure(event, "UNKNOWN_EVENT");
        ensure(Date.parse(event.at) >= Date.parse(state.clock), "CLOCK_CANNOT_REWIND");
        if (Date.parse(event.at) === Date.parse(state.clock)) return snapshot();
        state.clock = event.at;
        return changed();
      },
      advanceNext() {
        const info = getAdvanceInfo();
        ensure(!info.done, "NO_NEXT_EVENT");
        ensure(!info.blockKey, "ADVANCE_BLOCKED_" + info.blockKey);
        state.clock = data.events[info.nextEvent].at;
        return changed();
      },
      selectPlan(planId) {
        role("P01"); ensure(Object.hasOwn(data.plans, planId), "UNKNOWN_PLAN");
        ensure(!state.decision || !state.decision.tasksCreated, "REQUEST_LOCKED");
        if (state.decision && state.decision.planId === planId) return snapshot();
        if (state.decision) {
          state.decision.planId = planId;
          state.decision.fallbackSelected = false;
          state.decision.drafts = { technical: "", quality: "", budget: "" };
          record("planChanged" + planId);
        } else {
          state.decision = {
            planId, version: 1, supplement: "", reviewHistory: [], fallbackSelected: false, tasksCreated: false,
            drafts: { technical: "", quality: "", budget: "" },
            createdAt: state.clock, tasksCreatedAt: null,
            reviews: Object.fromEntries(Object.entries(reviewOwners).map(([key, owner]) => [key, { owner, requestVersion: 1, outcome: null, status: "notStarted", startedAt: null, completedAt: null, reason: "" }])),
            support: { owner: "P05", assignedAt: null, acceptedAt: null },
            approver: { id: null, designatedAt: null }, authorization: null, audit: [],
            resource: { startedAt: null, scheduling: null, receipt: null, rescheduleRequest: null }
          };
          record("decisionCreated");
        }
        return changed();
      },
      setFallback(selected) {
        role("P01"); const d = request();
        ensure(!d.tasksCreated, "REQUEST_LOCKED");
        ensure(typeof selected === "boolean", "INVALID_FALLBACK");
        ensure(d.planId === "A" || !selected, "FALLBACK_ONLY_FOR_A");
        if (d.fallbackSelected === selected) return snapshot();
        d.fallbackSelected = selected;
        // A changed authorization scope requires briefs to be regenerated or edited.
        d.drafts = { technical: "", quality: "", budget: "" };
        return changed();
      },
      saveDrafts(drafts) {
        role("P01"); const d = request(); ensure(!d.tasksCreated, "REQUEST_LOCKED");
        ensure(drafts && ["technical", "quality", "budget"].every(key => typeof drafts[key] === "string"), "INVALID_DRAFTS");
        const next = Object.fromEntries(["technical", "quality", "budget"].map(key => [key, drafts[key]]));
        if (JSON.stringify(next) === JSON.stringify(d.drafts)) return snapshot();
        d.drafts = next;
        return changed();
      },
      confirmTasks() {
        role("P01"); const d = request();
        if (d.tasksCreated) return snapshot();
        ensure(Object.values(d.drafts).every(value => value.trim()), "EMPTY_TASK_BRIEF");
        d.tasksCreated = true; d.tasksCreatedAt = state.clock; record("tasksCreated");
        return changed();
      },
      startReview(kind) {
        const r = review(kind);
        if (r.status !== "notStarted") return snapshot();
        r.status = "inProgress"; r.startedAt = state.clock; record(kind + "Started");
        return changed();
      },
      assignSupport() {
        role("P01"); const d = tasksRequired();
        if (d.support.assignedAt) return snapshot();
        d.support.assignedAt = state.clock; record("backupAssigned");
        return changed();
      },
      acceptSupport() {
        role("P05"); const d = tasksRequired(); ensure(d.support.assignedAt, "SUPPORT_ASSIGNMENT_REQUIRED");
        if (d.support.acceptedAt) return snapshot();
        d.support.acceptedAt = state.clock; record("supportAccepted");
        return changed();
      },
      designateApprover() {
        role("P01"); const d = tasksRequired();
        if (d.approver.id) return snapshot();
        d.approver.id = "P06"; d.approver.designatedAt = state.clock; record("alternateAssigned");
        return changed();
      },
      completeReview(kind, reason, outcome) {
        const r = review(kind);
        if (r.status === "completed") return snapshot();
        ensure(r.status === "inProgress", "REVIEW_NOT_STARTED");
        if (state.decision.version === 1) atEvent("reviewsComplete");
        ensure(typeof reason === "string" && reason.trim(), "REASON_REQUIRED");
        ensure(["approved", "needsInformation", "rejected"].includes(outcome), "REVIEW_OUTCOME_REQUIRED");
        r.status = "completed"; r.outcome = outcome; r.requestVersion = state.decision.version; r.completedAt = state.clock; r.reason = reason.trim(); record(kind + "Completed");
        if (bothReviews(state.decision)) record("reviewsComplete");
        return changed();
      },
      resubmitReviews(supplement) {
        role("P01"); const d = tasksRequired();
        ensure(!d.authorization, "DECISION_LOCKED");
        ensure(reviewBlocked(d), "REVIEW_RESUBMIT_NOT_AVAILABLE");
        ensure(typeof supplement === "string" && supplement.trim(), "SUPPLEMENT_REQUIRED");
        const reviewIds = ["decisionCreated", "tasksCreated", "technicalStarted", "qualityStarted", "technicalCompleted", "qualityCompleted", "reviewsComplete"];
        d.reviewHistory.push({ version: d.version, requestKey: mainRequestKey(d), createdAt: d.createdAt, submittedAt: d.tasksCreatedAt, supplement: d.supplement, reviews: JSON.parse(JSON.stringify(d.reviews)), audit: d.audit.filter(item => reviewIds.includes(item.id)) });
        d.version += 1; d.supplement = supplement.trim(); d.tasksCreatedAt = state.clock;
        d.reviews = Object.fromEntries(Object.entries(reviewOwners).map(([key, owner]) => [key, { owner, requestVersion: d.version, outcome: null, status: "notStarted", startedAt: null, completedAt: null, reason: "" }]));
        d.audit = d.audit.filter(item => !reviewIds.includes(item.id));
        state.eventIds = state.eventIds.filter(id => !reviewIds.includes(id));
        record("decisionCreated"); record("tasksCreated"); record("requestResubmittedV" + d.version);
        return changed();
      },
      authorize(values) {
        role("P06"); const d = tasksRequired();
        if (d.authorization) { ensure(authorizationMatches(data, state, "main"), "NEW_AUTHORIZATION_REQUIRED"); return snapshot(); }
        ensure(d.approver.id === "P06", "APPROVER_REQUIRED");
        ensure(bothReviews(d), "REVIEWS_REQUIRED");
        ensure(reviewsApproved(d), "REVIEWS_NOT_APPROVED");
        ensure(values && typeof values.signature === "string" && values.signature.trim() === data.people.P06.name, "INVALID_SIGNATURE");
        ensure(typeof values.reason === "string" && values.reason.trim(), "REASON_REQUIRED");
        ensure(values.acknowledged === true, "ACKNOWLEDGEMENT_REQUIRED");
        const total = d.fallbackSelected ? data.fees.totals.AWithFallback : data.fees.totals[d.planId];
        ensure(total <= data.people.P06.budgetLimit, "BUDGET_LIMIT_EXCEEDED");
        const basis = authorizationBasis(data, state, "main", values.briefAttachment);
        d.authorization = { by: "P06", at: state.clock, signature: values.signature.trim(), reason: values.reason.trim(), acknowledged: true, total, fallbackCap: d.fallbackSelected ? data.fees.fallbackCap : 0, budgetReviewStartedAt: state.clock, basis };
        record("budgetStart"); record("budgetAuthorized");
        return changed();
      },
      saveRiskDraft(values) {
        ensure(state.viewer === "P07", "ROLE_NOT_ALLOWED");
        ensure(state.publication.status === "draft", "RISK_ALREADY_PUBLISHED");
        ensure(values && ["underAssessment", "potentialImpact"].includes(values.certainty), "INVALID_CERTAINTY");
        ensure(["reviewsComplete", "resourceConfirmed"].includes(values.nextUpdateEvent), "INVALID_UPDATE_EVENT");
        if (state.publication.certainty === values.certainty && state.publication.nextUpdateEvent === values.nextUpdateEvent) return snapshot();
        state.publication.certainty = values.certainty; state.publication.nextUpdateEvent = values.nextUpdateEvent;
        state.publication.updatedAt = state.clock; state.publication.reviewedAt = null;
        return changed();
      },
      reviewRiskDraft() {
        ensure(state.viewer === "P07", "ROLE_NOT_ALLOWED");
        ensure(state.publication.status === "draft", "RISK_ALREADY_PUBLISHED");
        if (state.publication.reviewedAt) return snapshot();
        state.publication.reviewedAt = state.clock; record("riskDraftReviewed");
        return changed();
      },
      publishRisk() {
        ensure(state.viewer === "P07", "ROLE_NOT_ALLOWED");
        if (state.publication.status === "published") return snapshot();
        atEvent("materialReady");
        ensure(state.publication.reviewedAt, "RISK_REVIEW_REQUIRED");
        state.publication.status = "published"; state.publication.publishedAt = state.clock; state.publication.updatedAt = state.clock;
        record("riskPublished");
        state.scene = "customer";
        if (Date.parse(state.clock) < Date.parse(data.initialClock)) state.clock = data.initialClock;
        return changed();
      },
      startResourceReview() {
        role("P07"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED"); ensure(d.planId === "A", "ORIGINAL_WINDOW_ONLY");
        ensure(authorizationMatches(data, state, "main"), "NEW_AUTHORIZATION_REQUIRED");
        if (d.resource.startedAt) return snapshot();
        d.resource.startedAt = state.clock; record("resourceReviewStarted");
        return changed();
      },
      respondScheduling(values) {
        role("P08"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED"); ensure(d.planId === "A", "ORIGINAL_WINDOW_ONLY");
        ensure(authorizationMatches(data, state, "main"), "NEW_AUTHORIZATION_REQUIRED");
        ensure(d.resource.startedAt, "RESOURCE_REVIEW_REQUIRED");
        ensure(values && ["held", "unavailable"].includes(values.outcome), "INVALID_RESOURCE_OUTCOME");
        if (d.resource.scheduling) {
          ensure(d.resource.scheduling.outcome === values.outcome, "RESOURCE_RESPONSE_LOCKED"); return snapshot();
        }
        atEvent("resourceConfirmed");
        ensure(typeof values.reason === "string" && values.reason.trim(), "REASON_REQUIRED");
        d.resource.scheduling = { outcome: values.outcome, by: "P08", at: state.clock, reason: values.reason.trim() };
        if (values.outcome === "held") {
          record("schedulingHeld"); record("resourceSlotsConfirmed"); record("windowHoldConfirmed");
        } else record("schedulingUnavailable");
        return changed();
      },
      returnResourceReceipt() {
        role("P07"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED");
        ensure(d.resource.scheduling, "SCHEDULING_RESPONSE_REQUIRED");
        if (d.resource.receipt) return snapshot();
        d.resource.receipt = { outcome: d.resource.scheduling.outcome, by: "P07", at: state.clock };
        record(d.resource.receipt.outcome === "held" ? "resourceConfirmed" : "resourceRejected");
        return changed();
      },
      requestReschedule() {
        role("P07"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED");
        ensure(authorizationMatches(data, state, "main"), "NEW_AUTHORIZATION_REQUIRED");
        ensure(d.planId === "B" || (d.resource.receipt && d.resource.receipt.outcome === "unavailable"), "RESCHEDULE_NOT_AVAILABLE");
        if (d.resource.rescheduleRequest) return snapshot();
        d.resource.rescheduleRequest = rescheduleRecord("rescheduleRequested", { quote: null, quoteReceipt: null, decision: null, authorization: null, confirmation: null });
        return changed();
      },
      respondRescheduleQuote() {
        role("P08"); const r = rescheduleRequest();
        if (r.quote) return snapshot();
        atEvent("rescheduleQuotePrepared");
        r.quote = rescheduleRecord("rescheduleQuotePrepared", { candidateWindow: data.plans.B.window.at, amount: data.fees.reschedule, quoteRef: "Q-B", version: data.reports["Q-B"].version });
        return changed();
      },
      returnRescheduleQuote() {
        role("P07"); const r = rescheduleRequest();
        ensure(r.quote, "RESCHEDULE_QUOTE_REQUIRED");
        if (r.quoteReceipt) return snapshot();
        r.quoteReceipt = rescheduleRecord("rescheduleQuoteReturned");
        return changed();
      },
      createRescheduleDecision() {
        role("P01"); const r = rescheduleRequest();
        ensure(r.quoteReceipt, "RESCHEDULE_QUOTE_RETURN_REQUIRED");
        if (r.decision) return snapshot();
        r.decision = rescheduleRecord("rescheduleDecisionCreated", { amount: r.quote.amount, quoteRef: r.quote.quoteRef, version: r.quote.version });
        return changed();
      },
      authorizeReschedule(values) {
        role("P06"); const r = rescheduleRequest();
        ensure(r.decision, "RESCHEDULE_DECISION_REQUIRED");
        ensure(state.decision.approver.id === "P06", "APPROVER_REQUIRED");
        if (r.authorization) { ensure(authorizationMatches(data, state, "reschedule"), "NEW_AUTHORIZATION_REQUIRED"); return snapshot(); }
        ensure(values && typeof values.signature === "string" && values.signature.trim() === data.people.P06.name, "INVALID_SIGNATURE");
        ensure(typeof values.reason === "string" && values.reason.trim(), "REASON_REQUIRED");
        ensure(values.acknowledged === true, "ACKNOWLEDGEMENT_REQUIRED");
        ensure(r.quote.amount <= data.people.P06.budgetLimit, "BUDGET_LIMIT_EXCEEDED");
        const basis = authorizationBasis(data, state, "reschedule", values.briefAttachment);
        ensure(basis.scope.amount === basis.scope.quoteAmount && basis.scope.decisionQuote.id === r.quote.quoteRef && basis.scope.decisionQuote.version === r.quote.version, "NEW_AUTHORIZATION_REQUIRED");
        r.authorization = rescheduleRecord("rescheduleAuthorized", { signature: values.signature.trim(), reason: values.reason.trim(), acknowledged: true, amount: r.quote.amount, quoteRef: r.quote.quoteRef, version: r.quote.version, basis });
        return changed();
      },
      confirmReschedule() {
        role("P07"); const r = rescheduleRequest();
        ensure(r.authorization, "RESCHEDULE_AUTHORIZATION_REQUIRED");
        ensure(authorizationMatches(data, state, "reschedule"), "NEW_AUTHORIZATION_REQUIRED");
        if (r.confirmation) return snapshot();
        atEvent("rescheduleConfirmed");
        r.confirmation = rescheduleRecord("rescheduleConfirmed", { candidateWindow: r.quote.candidateWindow, amount: r.authorization.amount });
        return changed();
      },
      enterChapter(id, fixtures = {}) {
        ensure(["prepublication", "selection", "coverage", "authorization", "hold", "unavailable"].includes(id), "UNKNOWN_CHAPTER");
        const seeded = !["prepublication", "selection"].includes(id);
        if (seeded) {
          ensure(fixtures.drafts && ["technical", "quality", "budget"].every(key => typeof fixtures.drafts[key] === "string" && fixtures.drafts[key].trim()), "INVALID_CHAPTER_FIXTURE");
          if (id !== "coverage") ensure(fixtures.reviewReasons && ["technical", "quality"].every(key => typeof fixtures.reviewReasons[key] === "string" && fixtures.reviewReasons[key].trim()), "INVALID_CHAPTER_FIXTURE");
          if (["hold", "unavailable"].includes(id)) ensure(typeof fixtures.authorizationReason === "string" && fixtures.authorizationReason.trim(), "INVALID_CHAPTER_FIXTURE");
        }
        state = initial(id === "prepublication" ? "prepublication" : "customer");
        if (seeded) {
          api.selectPlan("A"); api.saveDrafts(fixtures.drafts); api.confirmTasks();
          api.setViewer("P02"); api.startReview("technical"); api.setViewer("P03"); api.startReview("quality"); api.advanceTo("backupAssigned");
          api.setViewer("P01");
          if (id !== "coverage") {
            api.assignSupport(); api.setViewer("P05"); api.acceptSupport(); api.advanceTo("alternateAssigned");
            api.setViewer("P01"); api.designateApprover(); api.advanceTo("reviewsComplete");
            api.setViewer("P02"); api.completeReview("technical", fixtures.reviewReasons.technical, "approved");
            api.setViewer("P03"); api.completeReview("quality", fixtures.reviewReasons.quality, "approved"); api.advanceTo("budgetAuthorized"); api.setViewer("P06");
            if (["hold", "unavailable"].includes(id)) {
              api.authorize({ signature: data.people.P06.name, reason: fixtures.authorizationReason, acknowledged: true });
              api.advanceTo("resourceReviewStart"); api.setViewer("P07");
              if (id === "unavailable") { api.startResourceReview(); api.advanceNext(); api.setViewer("P08"); }
            }
          }
        }
        state.chapterId = id; state.chapterSeeded = seeded; state.seededEventIds = state.eventIds.slice();
        state.branchIntent = id === "unavailable" ? "unavailable" : id === "hold" ? "held" : null;
        state.resetNotice = true;
        return snapshot();
      },
      reset(scene) {
        ensure(scene === "customer" || scene === "prepublication", "UNKNOWN_SCENE");
        state = initial(scene); state.resetNotice = true;
        return snapshot();
      }
    };
    return Object.freeze(api);
  }

  global.DEMO_CORE = Object.freeze({ validLocalDate, calendarGap, formatInstant, formatLocalDate, mainRequestKey, authorizationContext, authorizationMatches, createSession });
})(globalThis);

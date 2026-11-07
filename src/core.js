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
    return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }, options)).format(new Date(value));
  }

  function formatLocalDate(value, options) {
    if (!validLocalDate(value)) throw new Error("INVALID_LOCAL_DATE");
    return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }, options)).format(new Date(value + "T12:00:00Z"));
  }

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }

  function createSession(data) {
    let state;
    const steps = ["backupAssigned", "alternateAssigned", "reviewsComplete", "budgetAuthorized", "resourceReviewStart", "resourceConfirmed"];
    const reviewOwners = { technical: "P02", quality: "P03" };
    function initial(scene) {
      return {
        scene, viewer: scene === "prepublication" ? "P07" : "P01",
        clock: scene === "prepublication" ? data.events.riskDiscovered.at : data.initialClock,
        needByLocalDate: data.baseline.needByLocalDate,
        deliverableOverride: "", destinationOverride: "", revision: 0,
        eventIds: [], decision: null, resetNotice: false,
        chapterId: scene === "prepublication" ? "prepublication" : "selection", chapterSeeded: false, seededEventIds: [], branchIntent: null,
        publication: { status: scene === "prepublication" ? "draft" : "published", certainty: "underAssessment", nextUpdateEvent: "reviewsComplete", publishedAt: scene === "prepublication" ? null : data.events.materialReady.at, updatedAt: scene === "prepublication" ? data.events.riskDiscovered.at : data.events.materialReady.at }
      };
    }
    state = initial("customer");
    function snapshot() { return deepFreeze(JSON.parse(JSON.stringify(state))); }
    function ensure(condition, code) { if (!condition) throw new Error(code); }
    function customer() { ensure(state.scene === "customer" && state.publication.status === "published", "UNPUBLISHED_RISK"); }
    function role(id) { customer(); ensure(state.viewer === id, "ROLE_NOT_ALLOWED"); }
    function request() { customer(); ensure(state.decision, "DECISION_REQUIRED"); return state.decision; }
    function tasksRequired() { const d = request(); ensure(d.tasksCreated, "TASKS_REQUIRED"); return d; }
    function at(value) { ensure(Date.parse(state.clock) >= Date.parse(value), "TOO_EARLY"); ensure(Date.parse(state.clock) === Date.parse(value), "WRONG_SCENARIO_TIME"); }
    function atEvent(id) { at(data.events[id].at); }
    function changed() { state.revision += 1; return snapshot(); }
    function record(id, recordedAt = state.clock) {
      if (!state.eventIds.includes(id)) state.eventIds.push(id);
      if (state.decision && !state.decision.audit.some(item => item.id === id)) state.decision.audit.push({ id, at: recordedAt, by: state.viewer });
    }
    function review(kind) { ensure(Object.hasOwn(reviewOwners, kind), "UNKNOWN_REVIEW"); role(reviewOwners[kind]); return tasksRequired().reviews[kind]; }
    function bothReviews(d) { return d.reviews.technical.status === "completed" && d.reviews.quality.status === "completed"; }
    function getAdvanceInfo() {
      if (state.publication.status === "draft") {
        return Date.parse(state.clock) < Date.parse(data.events.materialReady.at)
          ? Object.freeze({ nextEvent: "materialReady", blockKey: null, done: false })
          : Object.freeze({ nextEvent: null, blockKey: "publishRisk", done: true });
      }
      customer();
      if (state.decision && state.decision.planId === "B" && Date.parse(state.clock) >= Date.parse(data.events.budgetAuthorized.at)) return Object.freeze({ nextEvent: null, blockKey: null, done: true });
      const nextEvent = steps.find(id => Date.parse(data.events[id].at) > Date.parse(state.clock)) || null;
      if (!nextEvent) return Object.freeze({ nextEvent: null, blockKey: null, done: true });
      const d = state.decision;
      let blockKey = null;
      if (!d) blockKey = "choosePlan";
      else if (!d.tasksCreated) blockKey = "createTasks";
      else if (nextEvent === "backupAssigned" && Object.values(d.reviews).some(r => r.status === "notStarted")) blockKey = "startReviews";
      else if (nextEvent === "alternateAssigned" && !d.support.assignedAt) blockKey = "assignSupport";
      else if (nextEvent === "alternateAssigned" && !d.support.acceptedAt) blockKey = "acceptSupport";
      else if (nextEvent === "reviewsComplete" && !d.approver.id) blockKey = "designateApprover";
      else if (nextEvent === "budgetAuthorized" && !bothReviews(d)) blockKey = "completeReviews";
      else if (nextEvent === "resourceReviewStart" && !d.authorization) blockKey = "authorizeCustomer";
      else if (nextEvent === "resourceConfirmed" && !d.resource.startedAt) blockKey = "startResourceReview";
      return Object.freeze({ nextEvent, blockKey, done: false });
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
            planId, fallbackSelected: false, tasksCreated: false,
            drafts: { technical: "", quality: "", budget: "" },
            createdAt: state.clock, tasksCreatedAt: null,
            reviews: Object.fromEntries(Object.entries(reviewOwners).map(([key, owner]) => [key, { owner, status: "notStarted", startedAt: null, completedAt: null, reason: "" }])),
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
        at(data.initialClock);
        d.tasksCreated = true; d.tasksCreatedAt = state.clock; record("tasksCreated");
        return changed();
      },
      startReview(kind) {
        const r = review(kind);
        if (r.status !== "notStarted") return snapshot();
        at(data.initialClock);
        r.status = "inProgress"; r.startedAt = state.clock; record(kind + "Started");
        return changed();
      },
      assignSupport() {
        role("P01"); const d = tasksRequired();
        if (d.support.assignedAt) return snapshot();
        atEvent("backupAssigned");
        d.support.assignedAt = state.clock; record("backupAssigned");
        return changed();
      },
      acceptSupport() {
        role("P05"); const d = tasksRequired(); ensure(d.support.assignedAt, "SUPPORT_ASSIGNMENT_REQUIRED");
        if (d.support.acceptedAt) return snapshot();
        atEvent("backupAssigned");
        d.support.acceptedAt = state.clock; record("supportAccepted");
        return changed();
      },
      designateApprover() {
        role("P01"); const d = tasksRequired();
        if (d.approver.id) return snapshot();
        ensure(d.support.acceptedAt, "SUPPORT_ACCEPTANCE_REQUIRED");
        atEvent("alternateAssigned");
        d.approver.id = "P06"; d.approver.designatedAt = state.clock; record("alternateAssigned");
        return changed();
      },
      completeReview(kind, reason) {
        const r = review(kind);
        if (r.status === "completed") return snapshot();
        ensure(r.status === "inProgress", "REVIEW_NOT_STARTED");
        atEvent("reviewsComplete");
        ensure(typeof reason === "string" && reason.trim(), "REASON_REQUIRED");
        r.status = "completed"; r.completedAt = state.clock; r.reason = reason.trim(); record(kind + "Completed");
        if (bothReviews(state.decision)) record("reviewsComplete");
        return changed();
      },
      authorize(values) {
        role("P06"); const d = tasksRequired();
        if (d.authorization) return snapshot();
        ensure(d.approver.id === "P06", "APPROVER_REQUIRED");
        ensure(bothReviews(d), "REVIEWS_REQUIRED");
        ensure(d.support.acceptedAt, "SUPPORT_ACCEPTANCE_REQUIRED");
        atEvent("budgetAuthorized");
        ensure(values && typeof values.signature === "string" && values.signature.trim() === data.people.P06.name, "INVALID_SIGNATURE");
        ensure(typeof values.reason === "string" && values.reason.trim(), "REASON_REQUIRED");
        ensure(values.acknowledged === true, "ACKNOWLEDGEMENT_REQUIRED");
        const total = d.fallbackSelected ? data.fees.totals.AWithFallback : data.fees.totals[d.planId];
        ensure(total <= data.people.P06.budgetLimit, "BUDGET_LIMIT_EXCEEDED");
        d.authorization = { by: "P06", at: state.clock, signature: values.signature.trim(), reason: values.reason.trim(), acknowledged: true, total, fallbackCap: d.fallbackSelected ? data.fees.fallbackCap : 0, budgetReviewStartedAt: data.events.budgetStart.at };
        record("budgetStart", data.events.budgetStart.at); record("budgetAuthorized");
        return changed();
      },
      saveRiskDraft(values) {
        ensure(state.viewer === "P07", "ROLE_NOT_ALLOWED");
        ensure(state.publication.status === "draft", "RISK_ALREADY_PUBLISHED");
        ensure(values && ["underAssessment", "potentialImpact"].includes(values.certainty), "INVALID_CERTAINTY");
        ensure(["reviewsComplete", "resourceConfirmed"].includes(values.nextUpdateEvent), "INVALID_UPDATE_EVENT");
        if (state.publication.certainty === values.certainty && state.publication.nextUpdateEvent === values.nextUpdateEvent) return snapshot();
        state.publication.certainty = values.certainty; state.publication.nextUpdateEvent = values.nextUpdateEvent;
        state.publication.updatedAt = state.clock;
        return changed();
      },
      publishRisk() {
        ensure(state.viewer === "P07", "ROLE_NOT_ALLOWED");
        if (state.publication.status === "published") return snapshot();
        atEvent("materialReady");
        state.publication.status = "published"; state.publication.publishedAt = state.clock; state.publication.updatedAt = state.clock;
        record("riskPublished");
        state.scene = "customer";
        state.clock = data.initialClock;
        return changed();
      },
      startResourceReview() {
        role("P07"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED"); ensure(d.planId === "A", "ORIGINAL_WINDOW_ONLY");
        if (d.resource.startedAt) return snapshot();
        atEvent("resourceReviewStart");
        d.resource.startedAt = state.clock; record("resourceReviewStarted");
        return changed();
      },
      respondScheduling(values) {
        role("P08"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED"); ensure(d.planId === "A", "ORIGINAL_WINDOW_ONLY");
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
        atEvent("resourceConfirmed");
        d.resource.receipt = { outcome: d.resource.scheduling.outcome, by: "P07", at: state.clock };
        record(d.resource.receipt.outcome === "held" ? "resourceConfirmed" : "resourceRejected");
        return changed();
      },
      requestReschedule() {
        customer(); ensure(["P01", "P07"].includes(state.viewer), "ROLE_NOT_ALLOWED"); const d = tasksRequired();
        ensure(d.authorization, "CUSTOMER_AUTHORIZATION_REQUIRED");
        ensure(d.planId === "B" || (d.resource.receipt && d.resource.receipt.outcome === "unavailable"), "RESCHEDULE_NOT_AVAILABLE");
        if (d.resource.rescheduleRequest) return snapshot();
        d.resource.rescheduleRequest = { by: state.viewer, at: state.clock };
        record("rescheduleRequested");
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
          api.setViewer("P02"); api.startReview("technical"); api.setViewer("P03"); api.startReview("quality"); api.advanceNext();
          api.setViewer("P01");
          if (id !== "coverage") {
            api.assignSupport(); api.setViewer("P05"); api.acceptSupport(); api.advanceNext();
            api.setViewer("P01"); api.designateApprover(); api.advanceNext();
            api.setViewer("P02"); api.completeReview("technical", fixtures.reviewReasons.technical);
            api.setViewer("P03"); api.completeReview("quality", fixtures.reviewReasons.quality); api.advanceNext(); api.setViewer("P06");
            if (["hold", "unavailable"].includes(id)) {
              api.authorize({ signature: data.people.P06.name, reason: fixtures.authorizationReason, acknowledged: true });
              api.advanceNext(); api.setViewer("P07");
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

  global.DEMO_CORE = Object.freeze({ validLocalDate, calendarGap, formatInstant, formatLocalDate, createSession });
})(globalThis);

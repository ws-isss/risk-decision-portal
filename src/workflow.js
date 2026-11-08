(function (global) {
  "use strict";

  // Tasks, confirmation slots and notifications are projections of one explicit
  // decision record. Advancing the scenario clock cannot execute any action.
  function project(data, state, viewerId = state.viewer) {
    const clock = Date.parse(state.clock);
    const published = state.publication ? state.publication.status === "published" : data.risk.publicationStatusKey === "published";
    const customerVisible = state.scene !== "prepublication" && published;
    const internalViewer = ["P07", "P08"].includes(viewerId);
    const d = customerVisible ? state.decision : null;
    const initialRecords = new Set(data.risk.timeline.filter(item => item.statusKey === "recorded" && item.eventRef).map(item => item.eventRef));
    const explicitRecords = new Set(state.eventIds || []);
    const audit = d && d.audit || [];
    const recorded = id => {
      const record = audit.find(item => item.id === id);
      return !!record && explicitRecords.has(id) && Number.isFinite(Date.parse(record.at)) && Date.parse(record.at) <= clock;
    };
    const supportAssigned = !!(d && d.support.assignedAt && recorded("backupAssigned"));
    const supportAccepted = supportAssigned && !!(d.support.acceptedAt && recorded("supportAccepted"));
    const approverDesignated = !!(d && d.approver.id === "P06" && recorded("alternateAssigned"));
    const technicalComplete = !!(d && d.reviews.technical.status === "completed" && d.reviews.technical.requestVersion === d.version && recorded("technicalCompleted"));
    const qualityComplete = !!(d && d.reviews.quality.status === "completed" && d.reviews.quality.requestVersion === d.version && recorded("qualityCompleted"));
    const reviewsComplete = technicalComplete && qualityComplete && recorded("reviewsComplete");
    const reviewsApproved = reviewsComplete && Object.values(d.reviews).every(r => r.outcome === "approved");
    const budgetReadyAt = reviewsApproved && approverDesignated ? [d.reviews.technical.completedAt, d.reviews.quality.completedAt, d.approver.designatedAt, d.tasksCreatedAt].reduce((latest, at) => Date.parse(at) > Date.parse(latest) ? at : latest) : null;
    const reviewBlockers = d ? Object.entries(d.reviews).filter(([kind, r]) => (kind === "technical" ? technicalComplete : qualityComplete) && r.outcome !== "approved").map(([kind, r]) => ({ kind, outcome: r.outcome, reason: r.reason, reviewer: r.owner, owner: "P01", requestVersion: d.version })) : [];
    const authorized = !!(d && d.authorization && d.authorization.by === "P06" && d.authorization.total <= data.people.P06.budgetLimit && approverDesignated && reviewsApproved && recorded("budgetAuthorized"));
    const resource = d && d.resource;
    const resourceStarted = !!(authorized && resource && resource.startedAt && recorded("resourceReviewStarted"));
    const receipt = resource && resource.receipt;
    const resourceConfirmed = !!(resourceStarted && receipt && receipt.outcome === "held" && recorded("resourceConfirmed"));
    const resourceRejected = !!(resourceStarted && receipt && receipt.outcome === "unavailable" && recorded("resourceRejected"));
    const schedulingVisible = internalViewer || resourceConfirmed || resourceRejected;
    const schedulingOutcome = resourceStarted && resource.scheduling && schedulingVisible ? resource.scheduling.outcome : null;
    const schedulingReason = schedulingOutcome ? resource.scheduling.reason : "";
    const rescheduleRequested = !!(authorized && resource && resource.rescheduleRequest && recorded("rescheduleRequested"));
    const r = rescheduleRequested ? resource.rescheduleRequest : null;
    const quotePrepared = !!(r && r.quote && recorded("rescheduleQuotePrepared"));
    const rescheduleQuoteReturned = !!(quotePrepared && r.quoteReceipt && recorded("rescheduleQuoteReturned"));
    const rescheduleQuoteReady = quotePrepared && (internalViewer || rescheduleQuoteReturned);
    const rescheduleQuote = rescheduleQuoteReady ? r.quote : null;
    const rescheduleDecisionCreated = !!(rescheduleQuoteReturned && r.decision && recorded("rescheduleDecisionCreated"));
    const rescheduleAuthorized = !!(rescheduleDecisionCreated && r.authorization && r.authorization.by === "P06" && r.authorization.amount === r.quote.amount && recorded("rescheduleAuthorized"));
    const rescheduleConfirmed = !!(rescheduleAuthorized && r.confirmation && r.confirmation.by === "P07" && r.confirmation.amount === r.authorization.amount && recorded("rescheduleConfirmed"));
    const rescheduleStage = rescheduleConfirmed ? "confirmed" : rescheduleAuthorized ? "awaitingWuXiConfirmation" : rescheduleDecisionCreated ? "awaitingCustomerAuthorization" : rescheduleQuoteReturned ? "awaitingCustomerDecision" : rescheduleQuoteReady ? "quoteReadyInternal" : rescheduleRequested ? "awaitingWuXiQuote" : "none";
    const nextTiming = rescheduleConfirmed ? { eventRef: "rescheduleNextUpdate", kind: "expectedResponse", ownerId: "P07", timezone: data.people.P07.timezone }
      : rescheduleAuthorized ? { eventRef: "rescheduleConfirmed", kind: "expectedResponse", ownerId: "P07", timezone: data.people.P07.timezone }
      : rescheduleDecisionCreated ? { eventRef: data.rescheduleTiming.authorizationDueEvent, kind: "customerActionDue", ownerId: "P06", timezone: data.people.P06.timezone }
      : rescheduleQuoteReturned ? { eventRef: data.rescheduleTiming.decisionDueEvent, kind: "customerActionDue", ownerId: "P01", timezone: data.people.P01.timezone }
      : authorized && (d.planId === "B" || resourceRejected) ? { eventRef: "rescheduleQuoteReturned", kind: "expectedResponse", ownerId: "P07", timezone: data.people.P07.timezone }
      : null;
    const resourceFees = schedulingOutcome === "held" ? data.fees.resourceCommitment : 0;
    const rescheduleFees = rescheduleConfirmed ? data.fees.reschedule : 0;
    const committedFees = resourceFees + rescheduleFees;
    const privateEventIds = new Set(["schedulingHeld", "schedulingUnavailable", "resourceSlotsConfirmed", "windowHoldConfirmed"]);
    const occurred = id => {
      if (id === "backupAssigned") return supportAssigned;
      if (id === "supportAccepted") return supportAccepted;
      if (id === "alternateAssigned") return approverDesignated;
      if (id === "reviewsComplete") return reviewsComplete;
      if (id === "budgetAuthorized" || id === "budgetStart") return authorized && recorded(id);
      if (id === "resourceConfirmed") return resourceConfirmed;
      if (id === "resourceRejected") return resourceRejected;
      if (id === "resourceReviewStarted") return resourceStarted;
      if (id === "rescheduleRequested") return rescheduleRequested;
      if (id === "rescheduleQuotePrepared") return rescheduleQuoteReady;
      if (id === "rescheduleQuoteReturned") return rescheduleQuoteReturned;
      if (id === "rescheduleDecisionCreated") return rescheduleDecisionCreated;
      if (id === "rescheduleAuthorized") return rescheduleAuthorized;
      if (id === "rescheduleConfirmed") return rescheduleConfirmed;
      if (id === "riskDraftReviewed") return internalViewer && state.publication && state.publication.reviewedAt && explicitRecords.has(id);
      if (privateEventIds.has(id) && !schedulingVisible) return false;
      if (id === "riskPublished") return published && explicitRecords.has(id) && state.publication && Date.parse(state.publication.publishedAt) <= clock;
      const event = data.events[id];
      return (initialRecords.has(id) && event && Date.parse(event.at) <= clock) || recorded(id);
    };
    const packetAvailable = customerVisible && occurred("customerPacketAvailable");
    const budgetNotified = customerVisible && occurred("budgetOwnerNotified");
    const evidenceAvailable = occurred("materialReady");
    const initialSnapshot = state.clock === data.initialClock;
    const tasksCreated = !!(d && d.tasksCreated && recorded("tasksCreated"));
    const reviewStatus = kind => !tasksCreated ? "briefPending" : d.reviews[kind].status === "completed" ? d.reviews[kind].outcome : d.reviews[kind].status === "notStarted" ? "readyForReview" : d.reviews[kind].status;
    const evidencePublished = customerVisible && evidenceAvailable;
    const reviewReadiness = !tasksCreated ? "briefPending" : reviewBlockers.length ? "reviewBlocked" : reviewsApproved ? "approved" : ["technical", "quality"].some(kind => d.reviews[kind].status !== "notStarted") ? "inProgress" : "readyForReview";
    const completionEvents = {
      startTechnical: "reviewsComplete", startQuality: "reviewsComplete",
      budget: "latestAuthorization", monitor: "resourceConfirmationDeadline",
      receipt: "resourceConfirmationDeadline", schedule: "resourceConfirmationDeadline"
    };
    const timing = (eventRef, kind) => Object.freeze({ eventRef, at: data.events[eventRef].at, kind });
    const records = {};
    const roleKeys = Object.fromEntries(Object.keys(data.people).map(id => [id, []]));
    const add = (task, roles) => {
      const revisedReview = d?.version > 1 && ["startTechnical", "startQuality"].includes(task.key);
      const completionEvent = completionEvents[task.key];
      const actualEvents = {assignBen:"backupAssigned", designateElena:"alternateAssigned", startTechnical:"technicalStarted", startQuality:"qualityStarted", budget:"budgetAuthorized", support:"supportAccepted", receipt:"resourceReviewStarted", schedule: schedulingOutcome === "held" ? "schedulingHeld" : "schedulingUnavailable", reschedule:"rescheduleRequested", rescheduleQuote:"rescheduleQuotePrepared", rescheduleQuoteReceipt:"rescheduleQuoteReturned", rescheduleDecision:"rescheduleDecisionCreated", rescheduleAuthorization:"rescheduleAuthorized", rescheduleConfirmation:"rescheduleConfirmed"};
      const actualAt = occurred(actualEvents[task.key]) ? audit.find(item => item.id === actualEvents[task.key])?.at || null : null;
      const availableAt = task.key === "reschedule" && authorized ? (resourceRejected ? resource.receipt.at : d.authorization.at) : task.key === "rescheduleQuote" && internalViewer ? r?.at : task.key === "rescheduleQuoteReceipt" && rescheduleQuoteReady ? r.quote.at : task.key === "rescheduleDecision" && rescheduleQuoteReturned ? r.quoteReceipt.at : task.key === "rescheduleAuthorization" && rescheduleDecisionCreated ? r.decision.at : task.key === "rescheduleConfirmation" && rescheduleAuthorized ? r.authorization.at : task.key === "budget" ? budgetReadyAt : ["receipt", "monitor"].includes(task.key) && authorized ? d.authorization.at : task.key === "schedule" && resourceStarted ? resource.startedAt : task.key === "support" ? d.support.assignedAt : ["startTechnical", "startQuality"].includes(task.key) && tasksCreated ? d.tasksCreatedAt : null;
      records[task.key] = Object.freeze({
        ...task, actualAt, availableAt,
        timing: revisedReview ? Object.freeze({ eventRef: "tasksCreated", at: d.tasksCreatedAt, kind: "assignedAt" }) : task.key === "support" ? Object.freeze({eventRef:"backupAssigned",at:d.support.assignedAt,kind:"assignedAt"}) : timing(task.event, task.timingKey || "startBy"),
        ...(completionEvent ? { completionTiming: timing(completionEvent, "actionDue") } : {})
      });
      roles.forEach(id => { if (!roleKeys[id].includes(task.key)) roleKeys[id].push(task.key); });
    };
    if (budgetNotified) add({ key: "assignBen", owner: "P01", event: "backupAssigned", day: initialSnapshot ? "today" : undefined, status: supportAssigned ? "taskCompleted" : "pendingAssignment", info: "support" }, ["P01"]);
    if (packetAvailable) {
      for (const [kind, key, owner, info] of [["technical", "startTechnical", "P02", "technical"], ["quality", "startQuality", "P03", "quality"]]) {
        add({ key, owner, event: "latestReviewStart", day: initialSnapshot ? "tomorrow" : undefined, status: reviewStatus(kind), info, created: tasksCreated, brief: tasksCreated ? d.drafts[kind] : null, dependencyKeys: [] }, ["P01", owner]);
      }
    }
    if (budgetNotified) {
      add({ key: "designateElena", owner: "P01", event: "alternateAssigned", day: initialSnapshot ? "tomorrow" : undefined, status: approverDesignated ? "taskCompleted" : "pendingDesignation", info: "approver" }, ["P01"]);
      const budgetRoles = approverDesignated ? ["P04", "P06"] : ["P04"];
      if (tasksCreated) budgetRoles.push("P01");
      add({ key: "budget", owner: approverDesignated ? "P06" : "P04", plannedOwner: "P06", event: "latestBudgetStart", status: authorized ? "taskCompleted" : reviewBlockers.length ? "reviewBlocked" : approverDesignated ? reviewsApproved ? "readyForAuthorization" : "pendingReview" : "blocked", info: approverDesignated ? "budgetReview" : "budget", created: tasksCreated, brief: tasksCreated ? d.drafts.budget : null, dependencyKeys: ["startTechnical", "startQuality", "designateElena"] }, budgetRoles);
    }
    if (reviewBlockers.length) add({ key: "resolveReviews", owner: "P01", event: "latestAuthorization", timingKey: "actionDue", status: "reviewBlocked", info: "resolveReviews", blockers: reviewBlockers }, ["P01"]);
    if (supportAssigned) add({ key: "support", owner: "P05", event: "backupAssigned", status: supportAccepted ? "inProgress" : "assigned", info: "supportPreparation", created: true, dependencyKeys: ["assignBen"] }, ["P05"]);
    if (evidenceAvailable) {
      add({ key: "monitor", owner: "P07", event: "resourceReviewStart", status: resourceConfirmed || resourceRejected ? "taskCompleted" : resourceStarted ? "inProgress" : "nonbinding", info: "monitor" }, ["P07"]);
      const receiptStatus = resourceConfirmed ? "taskCompleted" : resourceRejected ? "resourceUnavailable" : schedulingOutcome ? "ready" : resourceStarted ? "inProgress" : authorized ? "ready" : "waiting";
      add({ key: "receipt", owner: "P07", event: "resourceReviewStart", status: receiptStatus, info: "receipt", dependencyKeys: ["budget"] }, authorized ? ["P07", "P01"] : ["P07"]);
      add({ key: "schedule", owner: "P08", event: "resourceReviewStart", status: schedulingOutcome === "held" ? "taskCompleted" : schedulingOutcome === "unavailable" ? "resourceUnavailable" : resourceStarted ? "inProgress" : authorized ? "ready" : "nonbinding", info: "schedule", dependencyKeys: ["budget"] }, ["P08"]);
      if (authorized && (d.planId === "B" || resourceRejected)) add({ key: "reschedule", owner: "P07", event: "rescheduleRequested", timingKey: "startBy", status: rescheduleRequested ? "taskCompleted" : "ready", info: "reschedule", dependencyKeys: ["budget"] }, ["P01", "P07"]);
      if (rescheduleRequested) add({ key: "rescheduleQuote", owner: "P08", event: "rescheduleQuotePrepared", timingKey: "expectedReply", status: rescheduleQuoteReady ? "taskCompleted" : "ready", info: "rescheduleQuote", dependencyKeys: ["reschedule"] }, internalViewer ? ["P07", "P08"] : []);
      if (rescheduleQuoteReady) add({ key: "rescheduleQuoteReceipt", owner: "P07", event: "rescheduleQuoteReturned", timingKey: "expectedReply", status: rescheduleQuoteReturned ? "taskCompleted" : "ready", info: "rescheduleQuoteReceipt", dependencyKeys: ["rescheduleQuote"] }, ["P07"]);
      if (rescheduleQuoteReturned) add({ key: "rescheduleDecision", owner: "P01", event: data.rescheduleTiming.decisionDueEvent, timingKey: "actionDue", status: rescheduleDecisionCreated ? "taskCompleted" : "ready", info: "rescheduleDecision", dependencyKeys: ["rescheduleQuoteReceipt"] }, ["P01", "P07"]);
      if (rescheduleDecisionCreated) add({ key: "rescheduleAuthorization", owner: "P06", event: data.rescheduleTiming.authorizationDueEvent, timingKey: "actionDue", status: rescheduleAuthorized ? "taskCompleted" : "readyForAuthorization", info: "rescheduleAuthorization", dependencyKeys: ["rescheduleDecision"] }, ["P01", "P06"]);
      if (rescheduleAuthorized) add({ key: "rescheduleConfirmation", owner: "P07", event: "rescheduleConfirmed", timingKey: "expectedReply", status: rescheduleConfirmed ? "taskCompleted" : "ready", info: "rescheduleConfirmation", dependencyKeys: ["rescheduleAuthorization"] }, ["P01", "P07"]);
    }
    return { records, roleKeys, occurred, supportAssigned, supportAccepted, approverDesignated, technicalComplete, qualityComplete, reviewsComplete, reviewsApproved, budgetReadyAt, reviewBlockers, authorized, published, evidencePublished, reviewReadiness, clientVisible: customerVisible, resourceStarted, schedulingOutcome, schedulingReason, resourceConfirmed, resourceRejected, rescheduleRequested, rescheduleQuoteReady, rescheduleQuoteReturned, rescheduleQuote, rescheduleDecisionCreated, rescheduleAuthorized, rescheduleConfirmed, rescheduleStage, nextTiming, rescheduleAuthorization: rescheduleAuthorized ? r.authorization : null, rescheduleConfirmation: rescheduleConfirmed ? r.confirmation : null, resourceFees, rescheduleFees, committedFees, forecastReassessmentRequired: resourceRejected || rescheduleRequested, customerRejected: false, tasksCreated };
  }

  function tasks(data, state, viewerId = state.viewer) {
    const view = project(data, state, viewerId);
    return Object.freeze((view.roleKeys[viewerId] || []).map(key => view.records[key]));
  }

  // All task surfaces read the same projection; event data remains the sole
  // source of dates. Notification send time is a separate recorded event.
  function taskTiming(data, state, taskKey, phase = "start", viewerId = state.viewer) {
    const task = project(data, state, viewerId).records[taskKey];
    return task ? task[phase === "completion" ? "completionTiming" : "timing"] || null : null;
  }

  function eventTiming(data, state, eventRef, viewerId = state.viewer) {
    const view = project(data,state,viewerId);
    if (eventRef === "budgetStart" && view.budgetReadyAt) return {eventRef,at:view.budgetReadyAt,kind:"availableAt"};
    for (const task of Object.values(view.records)) {
      for (const value of [task.timing, task.completionTiming]) {
        if (value && value.eventRef === eventRef) return value;
      }
    }
    return null;
  }

  function confirmations(data, state) {
    const view = project(data, state);
    const d = state.scene === "customer" ? state.decision : null;
    const status = key => view.records[key] ? view.records[key].status : "notStarted";
    return Object.freeze([
      Object.freeze({ key: "technical", owner: "P02", status: status("startTechnical"), dependencies: [], taskKey: "startTechnical" }),
      Object.freeze({ key: "quality", owner: "P03", status: status("startQuality"), dependencies: [], taskKey: "startQuality" }),
      Object.freeze({ key: "budget", owner: "P06", status: view.authorized ? "taskCompleted" : view.reviewBlockers.length ? "reviewBlocked" : !view.approverDesignated ? "pendingDesignation" : !view.reviewsApproved ? "pendingReview" : "readyForAuthorization", dependencies: ["technical", "quality"], taskKey: "budget", designated: view.approverDesignated }),
      Object.freeze({ key: "schedule", owner: "P08", status: view.resourceConfirmed || view.schedulingOutcome === "held" ? "taskCompleted" : view.resourceRejected || view.schedulingOutcome === "unavailable" ? "resourceUnavailable" : view.resourceStarted ? "inProgress" : view.authorized ? "ready" : "waiting", dependencies: ["budget"], taskKey: "schedule", requested: !!(d && view.authorized) })
    ]);
  }

  function notifications(data, state, viewerId = state.viewer) {
    const view = project(data, state, viewerId);
    const items = [];
    const d = state.scene === "customer" ? state.decision : null;
    const evidenceVersion = data.risk.reportRefs.map(id => `${id}:v${data.reports[id].version}`).join("|");
    const add = (task, kind, eventId, versioned = false) => {
      if (!view.occurred(eventId)) return;
      const record = d && d.audit.find(item => item.id === eventId);
      const at = record ? record.at : data.events[eventId].at;
      const suffix = versioned ? `:${evidenceVersion}:request-v${d?.version || 1}` : "";
      items.push(Object.freeze({ id: `${eventId}:${task.key}:${kind}${suffix}`, taskKey: task.key, kind, at, timeStatus: record && record.timeStatus || "recorded", sequence: record && record.sequence || 0, timing: task.timing, completionTiming: task.completionTiming, task }));
    };
    for (const key of view.roleKeys[viewerId] || []) {
      const task = view.records[key];
      switch (key) {
        case "assignBen":
          add(task, view.supportAssigned ? "supportAssigned" : "leaveSupport", view.supportAssigned ? "backupAssigned" : "budgetOwnerNotified");
          break;
        case "startTechnical":
        case "startQuality": {
          const kind = key === "startTechnical" ? "technical" : "quality";
          if (view.occurred(kind + "Completed")) add(task, d.reviews[kind].outcome === "approved" ? "reviewCompleted" : d.reviews[kind].outcome, kind + "Completed", true);
          else if (view.occurred(kind + "Started")) add(task, "reviewStarted", kind + "Started", true);
          else if (view.tasksCreated) add(task, "tasksAssigned", "tasksCreated", true);
          else if (d) add(task, "taskBriefPending", "decisionCreated", true);
          else add(task, "reviewReady", "customerPacketAvailable", true);
          break;
        }
        case "designateElena":
          add(task, view.approverDesignated ? "approverDesignated" : "leaveApprover", view.approverDesignated ? "alternateAssigned" : "budgetOwnerNotified");
          break;
        case "budget":
          if (view.authorized) add(task, "authorizationRecorded", "budgetAuthorized");
          else if (view.reviewBlockers.length) add(task, "reviewBlocked", view.reviewBlockers[0].kind + "Completed", true);
          else if (view.approverDesignated && view.reviewsApproved) add(task, "reviewsCompleted", "reviewsComplete", true);
          else if (view.approverDesignated) add(task, "approverDesignated", "alternateAssigned");
          else if (view.supportAccepted) add(task, "supportAccepted", "supportAccepted");
          else if (view.supportAssigned) add(task, "supportAssigned", "backupAssigned");
          else add(task, "leaveBudget", "budgetOwnerNotified");
          break;
        case "resolveReviews":
          add(task, "reviewBlocked", view.reviewBlockers[0].kind + "Completed", true);
          break;
        case "support":
          add(task, view.supportAccepted ? "supportAccepted" : "supportAssigned", view.supportAccepted ? "supportAccepted" : "backupAssigned");
          break;
        case "monitor":
          if (!view.authorized) add(task, "evidenceReady", "materialReady", true);
          break;
        case "receipt":
          if (view.resourceConfirmed) add(task, "resourceConfirmed", "resourceConfirmed");
          else if (view.resourceRejected) add(task, "resourceUnavailable", "resourceRejected");
          else if (view.schedulingOutcome) add(task, "schedulingResponded", view.schedulingOutcome === "held" ? "schedulingHeld" : "schedulingUnavailable");
          else if (view.resourceStarted) add(task, "resourceStarted", "resourceReviewStarted");
          else if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "authorizationWaiting", "materialReady");
          break;
        case "schedule":
          if (view.schedulingOutcome) add(task, "schedulingResponded", view.schedulingOutcome === "held" ? "schedulingHeld" : "schedulingUnavailable");
          else if (view.resourceStarted) add(task, "resourceStarted", "resourceReviewStarted");
          else if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "evidenceReady", "materialReady", true);
          break;
        case "reschedule":
          if (view.rescheduleRequested) add(task, "rescheduleRequested", "rescheduleRequested");
          else if (view.resourceRejected) add(task, "resourceUnavailable", "resourceRejected");
          else add(task, "rescheduleReady", "budgetAuthorized");
          break;
        case "rescheduleQuote":
          add(task, view.rescheduleQuoteReady ? "rescheduleQuotePrepared" : "rescheduleRequested", view.rescheduleQuoteReady ? "rescheduleQuotePrepared" : "rescheduleRequested");
          break;
        case "rescheduleQuoteReceipt":
          add(task, view.rescheduleQuoteReturned ? "rescheduleQuoteReturned" : "rescheduleQuotePrepared", view.rescheduleQuoteReturned ? "rescheduleQuoteReturned" : "rescheduleQuotePrepared");
          break;
        case "rescheduleDecision":
          add(task, view.rescheduleDecisionCreated ? "rescheduleDecisionCreated" : "rescheduleQuoteReturned", view.rescheduleDecisionCreated ? "rescheduleDecisionCreated" : "rescheduleQuoteReturned");
          break;
        case "rescheduleAuthorization":
          add(task, view.rescheduleAuthorized ? "rescheduleAuthorized" : "rescheduleDecisionCreated", view.rescheduleAuthorized ? "rescheduleAuthorized" : "rescheduleDecisionCreated");
          break;
        case "rescheduleConfirmation":
          add(task, view.rescheduleConfirmed ? "rescheduleConfirmed" : "rescheduleAuthorized", view.rescheduleConfirmed ? "rescheduleConfirmed" : "rescheduleAuthorized");
          break;
      }
    }
    return Object.freeze(items.sort((a, b) => {
      return Date.parse(b.at) - Date.parse(a.at) || b.sequence - a.sequence;
    }));
  }

  // One current outlook for dashboard, workspace milestones and generated briefs.
  function outlook(data, state) {
    const view = project(data, state), planId = state.decision?.planId || "A";
    return { planId, baseline: !state.decision,
      forecast: view.forecastReassessmentRequired ? null : data.plans[planId].forecast,
      window: view.rescheduleConfirmed ? state.decision.resource.rescheduleRequest.confirmation.candidateWindow : view.rescheduleQuoteReturned ? view.rescheduleQuote.candidateWindow : data.plans[planId].window.at,
      windowStatus: view.rescheduleConfirmed ? "confirmedWindow" : planId === "B" || view.rescheduleQuoteReturned ? "candidateWindow" : view.forecastReassessmentRequired ? "windowReassessment" : view.resourceConfirmed ? "heldWindow" : "originalWindow"
    };
  }
  function dashboard(data, state) {
    const view = project(data,state);
    const d = state.decision;
    const pendingReviews = Object.values(view.records).filter(r => ["startTechnical","startQuality"].includes(r.key) && r.created && !["approved","rejected","needsInformation"].includes(r.status));
    const decisionPending = view.clientVisible && (!view.authorized || ["awaitingCustomerDecision","awaitingCustomerAuthorization"].includes(view.rescheduleStage));
    const resourcePending = view.authorized && !view.resourceConfirmed && !view.rescheduleConfirmed && (!view.nextTiming || view.nextTiming.kind === "expectedResponse");
    const decisionRole = view.rescheduleStage === "awaitingCustomerAuthorization" || view.reviewsApproved && view.approverDesignated && !view.authorized ? "P06" : "P01";
    const timings = [];
    const event = (key,label,zone) => ({at:data.events[key].at,label,zone});
    if (view.nextTiming) timings.push(event(view.nextTiming.eventRef,view.rescheduleConfirmed ? "technicalReassessment" : view.nextTiming.kind,view.nextTiming.timezone));
    else if (view.resourceConfirmed) {
      timings.push({at:data.plans.A.holdUntil,label:"holdExpiry",zone:data.calendars.base.timezone});
      const first=data.plans.A.stages.find(s=>s.id==="firstAnalysis");
      timings.push({at:first.end,label:"firstResults",zone:first.executionTimezone});
    } else {
      if (!view.authorized) timings.push(event("latestAuthorization","authorization",data.baseline.timezone));
      timings.push(event("resourceConfirmationDeadline","resource",data.calendars.base.timezone));
    }
    return {view,blockerOwner:view.reviewBlockers[0]?.owner || null,...outlook(data,state),showOptions:!d,timings,
      groups:[
        {key:"decisions",count:Number(decisionPending),blocked:view.reviewBlockers.length>0,role:decisionRole,href:!d?"#comparison":view.rescheduleStage!=="none"?"#wuxi":"#decision"},
        {key:"reviews",count:pendingReviews.length,role:pendingReviews[0]?.owner || "P02",href:"#decision"},
        {key:"wuxi",count:Number(resourcePending),role:"P07",href:"#wuxi"}
      ]};
  }

  global.DEMO_WORKFLOW = Object.freeze({ project, tasks, taskTiming, eventTiming, confirmations, notifications, dashboard, outlook });
})(globalThis);

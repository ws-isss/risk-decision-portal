(function (global) {
  "use strict";

  // Tasks, confirmation slots and notifications are projections of one explicit
  // decision record. Advancing the scenario clock cannot execute any action.
  function project(data, state) {
    const clock = Date.parse(state.clock);
    const customerVisible = state.scene !== "prepublication" && data.risk.publicationStatusKey === "published";
    const d = customerVisible ? state.decision : null;
    const initialRecords = new Set(data.risk.timeline.filter(item => item.statusKey === "recorded" && item.eventRef).map(item => item.eventRef));
    const explicitRecords = new Set(state.eventIds || []);
    const audit = d && d.audit || [];
    const recorded = id => {
      const record = audit.find(item => item.id === id);
      return !!record && explicitRecords.has(id) && Date.parse(record.at) <= clock;
    };
    const supportAssigned = !!(d && d.support.assignedAt && recorded("backupAssigned"));
    const supportAccepted = supportAssigned && !!(d.support.acceptedAt && recorded("supportAccepted"));
    const approverDesignated = supportAccepted && !!(d && d.approver.id === "P06" && recorded("alternateAssigned"));
    const technicalComplete = !!(d && d.reviews.technical.status === "completed" && recorded("technicalCompleted"));
    const qualityComplete = !!(d && d.reviews.quality.status === "completed" && recorded("qualityCompleted"));
    const reviewsComplete = technicalComplete && qualityComplete && recorded("reviewsComplete");
    const authorized = !!(d && d.authorization && d.authorization.by === "P06" && d.authorization.total <= data.people.P06.budgetLimit && approverDesignated && reviewsComplete && recorded("budgetAuthorized"));
    const resourceConfirmed = false; // WuXi response belongs to the next reviewed phase.
    const occurred = id => {
      if (id === "backupAssigned") return supportAssigned;
      if (id === "supportAccepted") return supportAccepted;
      if (id === "alternateAssigned") return approverDesignated;
      if (id === "reviewsComplete") return reviewsComplete;
      if (id === "budgetAuthorized" || id === "budgetStart") return authorized && recorded(id);
      if (id === "resourceConfirmed") return resourceConfirmed;
      const event = data.events[id];
      return (initialRecords.has(id) && event && Date.parse(event.at) <= clock) || recorded(id);
    };
    const packetAvailable = customerVisible && occurred("customerPacketAvailable");
    const budgetNotified = customerVisible && occurred("budgetOwnerNotified");
    const evidenceAvailable = occurred("materialReady");
    const initialSnapshot = state.clock === data.initialClock;
    const tasksCreated = !!(d && d.tasksCreated && recorded("tasksCreated"));
    const reviewStatus = kind => !tasksCreated ? d ? "draft" : "notStarted" : d.reviews[kind].status === "completed" ? "taskCompleted" : d.reviews[kind].status;
    const records = {};
    const roleKeys = Object.fromEntries(Object.keys(data.people).map(id => [id, []]));
    const add = (task, roles) => {
      records[task.key] = Object.freeze(task);
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
      add({ key: "budget", owner: approverDesignated ? "P06" : "P04", plannedOwner: "P06", event: d ? "budgetStart" : "latestBudgetStart", status: authorized ? "taskCompleted" : approverDesignated ? reviewsComplete ? "readyForAuthorization" : "pendingReview" : "blocked", info: approverDesignated ? "budgetReview" : "budget", created: tasksCreated, brief: tasksCreated ? d.drafts.budget : null, dependencyKeys: ["startTechnical", "startQuality", "designateElena"] }, budgetRoles);
    }
    if (supportAssigned) add({ key: "support", owner: "P05", event: "backupAssigned", status: supportAccepted ? "inProgress" : "assigned", info: "supportPreparation", created: true, dependencyKeys: ["assignBen"] }, ["P05"]);
    if (evidenceAvailable) {
      add({ key: "monitor", owner: "P07", event: "resourceReviewStart", status: "nonbinding", info: "monitor" }, ["P07"]);
      add({ key: "receipt", owner: "P07", event: "resourceReviewStart", status: authorized ? "ready" : "waiting", info: "receipt", dependencyKeys: ["budget"] }, ["P07"]);
      add({ key: "schedule", owner: "P08", event: "resourceReviewStart", status: authorized ? "ready" : "nonbinding", info: "schedule", dependencyKeys: ["budget"] }, ["P08"]);
    }
    return { records, roleKeys, occurred, supportAssigned, supportAccepted, approverDesignated, technicalComplete, qualityComplete, reviewsComplete, authorized, resourceConfirmed, tasksCreated };
  }

  function tasks(data, state, viewerId = state.viewer) {
    const view = project(data, state);
    return Object.freeze((view.roleKeys[viewerId] || []).map(key => view.records[key]));
  }

  function confirmations(data, state) {
    const view = project(data, state);
    const d = state.scene === "customer" ? state.decision : null;
    const status = key => view.records[key] ? view.records[key].status : "notStarted";
    return Object.freeze([
      Object.freeze({ key: "technical", owner: "P02", status: status("startTechnical"), dependencies: [], taskKey: "startTechnical" }),
      Object.freeze({ key: "quality", owner: "P03", status: status("startQuality"), dependencies: [], taskKey: "startQuality" }),
      Object.freeze({ key: "budget", owner: "P06", status: view.authorized ? "taskCompleted" : !view.approverDesignated ? "pendingDesignation" : !view.reviewsComplete ? "pendingReview" : "readyForAuthorization", dependencies: ["technical", "quality"], taskKey: "budget", designated: view.approverDesignated }),
      Object.freeze({ key: "schedule", owner: "P08", status: view.authorized ? "ready" : "waiting", dependencies: ["budget"], taskKey: "schedule", requested: !!(d && view.authorized) })
    ]);
  }

  function notifications(data, state, viewerId = state.viewer) {
    const view = project(data, state);
    const items = [];
    const d = state.scene === "customer" ? state.decision : null;
    const evidenceVersion = data.risk.reportRefs.map(id => `${id}:v${data.reports[id].version}`).join("|");
    const add = (task, kind, eventId, versioned = false) => {
      if (!view.occurred(eventId)) return;
      const record = d && d.audit.find(item => item.id === eventId);
      const at = record ? record.at : data.events[eventId].at;
      const suffix = versioned ? `:${evidenceVersion}` : "";
      items.push(Object.freeze({ id: `${eventId}:${task.key}:${kind}${suffix}`, taskKey: task.key, kind, at, task }));
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
          if (view.occurred(kind + "Completed")) add(task, "reviewCompleted", kind + "Completed", true);
          else if (view.occurred(kind + "Started")) add(task, "reviewStarted", kind + "Started", true);
          else if (view.tasksCreated) add(task, "tasksAssigned", "tasksCreated", true);
          else add(task, "reviewReady", "customerPacketAvailable", true);
          break;
        }
        case "designateElena":
          add(task, view.approverDesignated ? "approverDesignated" : "leaveApprover", view.approverDesignated ? "alternateAssigned" : "budgetOwnerNotified");
          break;
        case "budget":
          if (view.authorized) add(task, "authorizationRecorded", "budgetAuthorized");
          else if (view.approverDesignated && view.reviewsComplete) add(task, "reviewsCompleted", "reviewsComplete", true);
          else if (view.approverDesignated) add(task, "approverDesignated", "alternateAssigned");
          else if (view.supportAccepted) add(task, "supportAccepted", "supportAccepted");
          else if (view.supportAssigned) add(task, "supportAssigned", "backupAssigned");
          else add(task, "leaveBudget", "budgetOwnerNotified");
          break;
        case "support":
          add(task, view.supportAccepted ? "supportAccepted" : "supportAssigned", view.supportAccepted ? "supportAccepted" : "backupAssigned");
          break;
        case "monitor":
          if (!view.authorized) add(task, "evidenceReady", "materialReady", true);
          break;
        case "receipt":
          if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "authorizationWaiting", "materialReady");
          break;
        case "schedule":
          if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "evidenceReady", "materialReady", true);
          break;
      }
    }
    return Object.freeze(items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
  }

  global.DEMO_WORKFLOW = Object.freeze({ project, tasks, confirmations, notifications });
})(globalThis);

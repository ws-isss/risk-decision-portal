(function (global) {
  "use strict";

  // These projections share task records. Opening or reading a notification has
  // no authority to assign work, complete an action or advance the scenario.
  function project(data, state) {
    const clock = Date.parse(state.clock);
    const initialRecords = new Set(data.risk.timeline.filter(item => item.statusKey === "recorded" && item.eventRef).map(item => item.eventRef));
    const explicitRecords = new Set(state.eventIds || []);
    const occurred = id => {
      const event = data.events[id];
      if (!event || !Number.isFinite(clock) || Date.parse(event.at) > clock) return false;
      return explicitRecords.has(id) || initialRecords.has(id);
    };
    const customerVisible = state.scene !== "prepublication" && data.risk.publicationStatusKey === "published";
    const packetAvailable = customerVisible && occurred("customerPacketAvailable");
    const budgetNotified = customerVisible && occurred("budgetOwnerNotified");
    const supportAssigned = customerVisible && occurred("backupAssigned");
    const approverDesignated = customerVisible && occurred("alternateAssigned");
    const reviewsComplete = customerVisible && occurred("reviewsComplete");
    const authorized = approverDesignated && reviewsComplete && occurred("budgetAuthorized");
    const resourceConfirmed = authorized && occurred("resourceConfirmed");
    const evidenceAvailable = occurred("materialReady");
    const initialSnapshot = state.clock === data.initialClock;
    const records = {};
    const roleKeys = Object.fromEntries(Object.keys(data.people).map(id => [id, []]));
    const add = (task, roles) => {
      records[task.key] = Object.freeze(task);
      roles.forEach(id => roleKeys[id].push(task.key));
    };
    if (budgetNotified) add({ key: "assignBen", owner: "P01", event: "backupAssigned", day: initialSnapshot ? "today" : undefined, status: supportAssigned ? "taskCompleted" : "pendingAssignment", info: "support" }, ["P01"]);
    if (packetAvailable) {
      add({ key: "startTechnical", owner: "P02", event: "latestReviewStart", day: initialSnapshot ? "tomorrow" : undefined, status: reviewsComplete ? "taskCompleted" : "notStarted", info: "technical" }, ["P01", "P02"]);
      add({ key: "startQuality", owner: "P03", event: "latestReviewStart", day: initialSnapshot ? "tomorrow" : undefined, status: reviewsComplete ? "taskCompleted" : "notStarted", info: "quality" }, ["P01", "P03"]);
    }
    if (budgetNotified) {
      add({ key: "designateElena", owner: "P01", event: "alternateAssigned", day: initialSnapshot ? "tomorrow" : undefined, status: approverDesignated ? "taskCompleted" : "pendingDesignation", info: "approver" }, ["P01"]);
      add({ key: "budget", owner: approverDesignated ? "P06" : "P04", event: "latestBudgetStart", status: authorized ? "taskCompleted" : approverDesignated ? reviewsComplete ? "readyForAuthorization" : "pendingReview" : "blocked", info: approverDesignated ? "budgetReview" : "budget" }, approverDesignated ? ["P04", "P06"] : ["P04"]);
    }
    if (supportAssigned) add({ key: "support", owner: "P05", event: "backupAssigned", status: "assigned", info: "supportPreparation" }, ["P05"]);
    if (evidenceAvailable) {
      add({ key: "monitor", owner: "P07", event: "resourceReviewStart", status: resourceConfirmed ? "taskCompleted" : "nonbinding", info: "monitor" }, ["P07"]);
      add({ key: "receipt", owner: "P07", event: "resourceReviewStart", status: resourceConfirmed ? "taskCompleted" : authorized ? "ready" : "waiting", info: "receipt" }, ["P07"]);
      add({ key: "schedule", owner: "P08", event: "resourceReviewStart", status: resourceConfirmed ? "taskCompleted" : authorized ? "ready" : "nonbinding", info: "schedule" }, ["P08"]);
    }
    return { records, roleKeys, occurred, supportAssigned, approverDesignated, reviewsComplete, authorized, resourceConfirmed };
  }

  function tasks(data, state, viewerId = state.viewer) {
    const view = project(data, state);
    return Object.freeze((view.roleKeys[viewerId] || []).map(key => view.records[key]));
  }

  function notifications(data, state, viewerId = state.viewer) {
    const view = project(data, state);
    const items = [];
    const evidenceVersion = data.risk.reportRefs.map(id => `${id}:v${data.reports[id].version}`).join("|");
    const add = (task, kind, eventId, versioned = false) => {
      if (!view.occurred(eventId)) return;
      const suffix = versioned ? `:${evidenceVersion}` : "";
      items.push(Object.freeze({ id: `${eventId}:${task.key}:${kind}${suffix}`, taskKey: task.key, kind, at: data.events[eventId].at, task }));
    };
    for (const key of view.roleKeys[viewerId] || []) {
      const task = view.records[key];
      switch (key) {
        case "assignBen":
          add(task, view.supportAssigned ? "supportAssigned" : "leaveSupport", view.supportAssigned ? "backupAssigned" : "budgetOwnerNotified");
          break;
        case "startTechnical":
        case "startQuality":
          add(task, view.reviewsComplete ? "reviewsCompleted" : "reviewReady", view.reviewsComplete ? "reviewsComplete" : "customerPacketAvailable", true);
          break;
        case "designateElena":
          add(task, view.approverDesignated ? "approverDesignated" : "leaveApprover", view.approverDesignated ? "alternateAssigned" : "budgetOwnerNotified");
          break;
        case "budget":
          if (view.authorized) add(task, "authorizationRecorded", "budgetAuthorized");
          else if (view.approverDesignated && view.reviewsComplete) add(task, "reviewsCompleted", "reviewsComplete", true);
          else if (view.approverDesignated) add(task, "approverDesignated", "alternateAssigned");
          else if (view.supportAssigned) add(task, "supportAssigned", "backupAssigned");
          else add(task, "leaveBudget", "budgetOwnerNotified");
          break;
        case "support":
          add(task, "supportAssigned", "backupAssigned");
          break;
        case "monitor":
          // Once an authorization arrives, the receipt task is the single
          // notification destination for WuXi PM's next decision handoff.
          if (!view.authorized) add(task, "evidenceReady", "materialReady", true);
          break;
        case "receipt":
          if (view.resourceConfirmed) add(task, "resourceConfirmed", "resourceConfirmed");
          else if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "authorizationWaiting", "materialReady");
          break;
        case "schedule":
          if (view.resourceConfirmed) add(task, "resourceConfirmed", "resourceConfirmed");
          else if (view.authorized) add(task, "authorizationReceived", "budgetAuthorized");
          else add(task, "evidenceReady", "materialReady", true);
          break;
      }
    }
    return Object.freeze(items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
  }

  global.DEMO_WORKFLOW = Object.freeze({ tasks, notifications });
})(globalThis);

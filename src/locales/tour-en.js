(function (global) {
  global.DEMO_MESSAGES.en.tour = {
  "title": "5-minute tour",
  "actNames": [
    "Emma · Understand the risk",
    "Elena · Authorize the decision",
    "Alex · Return the resource result"
  ],
  "seededShort": "Preset demo records",
  "aOnly": "This tour follows option A. The full workflow supports both options.",
  "nextAct": "Enter next act",
  "coverageNext": "The next act will preset: {support} has taken over preparation, and {approver} has been designated as approver.",
  "start": "Start 5-minute tour",
  "restart": "Restart tour",
  "full": "Continue in full workflow",
  "backA": "Choose A instead",
  "moreRoles": "More roles",
  "home": "Dashboard",
  "workspace": "Project workspace",
  "exceptions": "Exception scenarios",
  "openRisk": "Emma: open the risk",
  "compare": "Emma: compare A/B",
  "viewAttachment": "Switch to Elena and read the attached brief",
  "sign": "Elena: sign the decision request",
  "finish": "Return to Emma’s dashboard",
  "next2": "Preset: Ben assigned and accepted; Elena designated; Daniel and Nina reviewed and agreed. Your task text and decision request are retained.",
  "next3": "Preset: Alex coordinated resources; Mei confirmed the original window hold. Your signature and attached brief remain unchanged. Alex must still return the result.",
  "at": "Advance to {time}",
  "seeded": "Preset demo records · see the risk timeline for their source.",
  "reasons": {
    "past": "The next act’s start time has passed. Please restart the tour.",
    "planB": "This tour uses option A. Choose A before creating tasks, or continue option B in the full workflow.",
    "tasks": "Confirm the task briefs before entering the next act.",
    "blocked": "The current review or resource outcome needs follow-up. Continue in the full workflow.",
    "authorization": "Elena must authorize the request before the next act.",
    "alreadyAuthorized": "This request is already authorized. Continue in the full workflow.",
    "invalid": "This act is unavailable."
  },
  "doneTitle": "The coordination round is complete",
  "takeaways": [
    "Emma understood the risk and the trade-off between options.",
    "Reviewers agreed and Elena authorized the customer request.",
    "Alex returned WuXi’s resource confirmation. The hold has an expiry; aggregate reduction and process readiness still need assessment."
  ],
  "exceptionNames": {
    "quality": "QA requests more information",
    "coverage": "Budget approver on leave",
    "unavailable": "WuXi unable to hold / rescheduling",
    "prepublication": "Before risk publication"
  },
  "exceptionHint": "Each exception opens an existing scenario with an explicit reset and labelled preset records.",
  "exceptionReset": "Open exception and reset scenario",
  "resetTitle": "Start a fresh tour?",
  "resetBody": "This clears the current run, drafts, attachments and notifications, and returns to the initial time. Act-to-act transitions preserve your work.",
  "resetConfirm": "Reset and start tour"
};
  global.DEMO_MESSAGES.en.portal.chapters.quality = global.DEMO_MESSAGES.en.tour.exceptionNames.quality;
  global.DEMO_MESSAGES.en.dashboard = {
  "purpose": "When a development deviation threatens the GMP window, align customer decisions and WuXi resource confirmation before the deadline.",
  "title": "Project dashboard",
  "finding": "HMW aggregates {measured}% · development target ≤{target}%",
  "times": "Key dates",
  "tasks": "Pending actions",
  "decisions": "Decisions",
  "reviews": "Reviews",
  "wuxi": "WuXi confirmation",
  "next": "Next update · first study results expected",
  "modules": "DaVinci modules",
  "moduleNote": "Existing DaVinci capability · outside this demo",
  "moduleNames": [
    "Data & reports",
    "Quotes",
    "Logistics"
  ],
  "initialEstimate": "Option {plan} estimate · conditional",
  "summary": "Next: assess aggregate reduction and process readiness. The hold does not authorize GMP production.",
  "noTasks": "No pending items",
  "countHint": "Project-wide counts. Select an item to open its owner’s task.",
  "taskOpen": "Open task · {name}",
  "rescheduled": "Separately authorized rescheduling",
  "need": "Customer need date",
  "blocked": "Blocked",
  "blockerNext": "{name}: add evidence within the original scope, then resubmit for review.",
  "scheduledUpdate": "Next scheduled update"
};
})(globalThis);

(function(global) {
  global.DEMO_MESSAGES.en.dashboard.impact = {
  "labels": {
    "decision": "Decision pending",
    "delivery": "Delivery impact",
    "resource": "Resource impact"
  },
  "join": "; ",
  "deliveryPlan": "{plan}: estimated {gap}",
  "early": "{days} days before need date",
  "late": "{days} days after need date",
  "onTime": "on the need date",
  "deliveryInvalid": "{plan}: delivery needs reassessment; the previous forecast is no longer current.",
  "resourceA": "A: expedite and request a hold on the {window} window, Shanghai (WuXi confirmation due by {deadline})",
  "resourceB": "B: queue for {days} working days, then move to the {window} candidate window, Shanghai; pending confirmation",
  "decide": "Customer authorization due {due}: A ({a}) or B ({b}).",
  "decideSelected": "Option {plan} selected; customer authorization of {amount} due {due}. Selection is not authorization.",
  "authorized": "Customer authorized {plan} ({amount}); awaiting WuXi resource and window confirmation.",
  "held": "A: expedited slots confirmed; original {window} window held until {until}.",
  "internalHeld": "A: Mei has confirmed expedited slots and the original-window hold internally until {until}; Alex has not returned the receipt to the customer.",
  "internalUnavailable": "A: Mei reported that the original window cannot be held; Alex has not returned the result to the customer.",
  "unavailable": "A: WuXi cannot arrange the expedited slots or hold the original window; Alex coordinates the next window and quote.",
  "heldNext": "This coordination round is complete. Next: assess aggregate reduction and process readiness; this is not GMP production approval.",
  "blocker": "Authorization blocked — {reviews}.",
  "quoteCandidate": "Candidate window: {window}, Shanghai; pending confirmation. Rescheduling quote: {amount}.",
  "confirmedWindow": "New window confirmed for {window}, Shanghai; technical readiness remains under assessment.",
  "rescheduleDone": "Rescheduling confirmed; incurred fee {amount}. Alex coordinates the technical reassessment and next update.",
  "rescheduleDecision": "{status}; rescheduling amount {amount}.",
  "awaitQuote": "Awaiting WuXi’s next-window and rescheduling-quote response; no new window is confirmed."
};
})(globalThis);

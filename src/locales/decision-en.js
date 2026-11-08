(function (global) {
  "use strict";
  global.DEMO_MESSAGES.en.decision = {
    title: "Decision request", choose: "Select {plan}", selected: "Selected · request only", selectionLocked: "Selection is fixed after task creation. Reset the scenario to compare a new decision path.",
    authorizedAt: "Customer authorized at", recordedOpinions: "Recorded review opinions", opinionAt: "Recorded at",
    empty: "Emma can select an option in the comparison table to create a decision request.", requestOpen: "Decision request – confirmations pending", authorized: "Customer authorized – awaiting WuXi confirmation",
    notApproval: "Selecting an option creates a request. It does not approve fees or secure a production window.", plan: "Selected option", amount: "Requested authorization", noFees: "No fees incurred. Resources and the production window remain unconfirmed.",
    fallback: "Authorize a fallback release / rescheduling request if the agreed conditions are not met", fallbackLimit: "Additional cap {cap}; known total up to {total}. Additional technical work is excluded. No rescheduling fee is incurred until confirmed.", fallbackOff: "Fallback not authorized", fallbackOn: "Fallback authorized up to {cap}",
    fallbackSelectedFee: "Optional A fallback selected: an additional cap of {cap}, with a known total up to {total}. Rescheduling is charged only when confirmed. Additional technical work is excluded; the same study is not charged twice.",
    sourceTitle: "Synthetic decision evidence", experimentScope: "Existing samples and methods only; the bounded study covers purification screening, candidate confirmation, HMW, recovery and the agreed analytical assessment. Additional method development or expanded research is outside this quote.",
    confirmations: "Four confirmations", confirmationNames: { technical: "Technical", quality: "Quality", budget: "Budget", schedule: "Scheduling" }, owner: "Owner", status: "Status", dependencies: "Depends on",
    dependencyCopy: { technical: "Assigned task with confirmed brief; published SEC-001 and EXP-001", quality: "Assigned task with confirmed brief; published SEC-001 and EXP-001", budget: "Elena designated; Agree from technical and QA on this request version; final quote", schedule: "Customer authorization, then WuXi resource assessment" },
    statuses: { notStarted: "Not started", draft: "Draft · not assigned", inProgress: "In progress", taskCompleted: "Confirmed", pendingDesignation: "Designation pending", pendingReview: "Waiting for technical + QA", readyForAuthorization: "Ready for authorization", waiting: "Waiting for customer authorization", ready: "Awaiting WuXi confirmation" },
    draft: "Draft task briefs", drafting: "Drafting…", simulated: "AI draft (simulated)", draftReady: "Drafts ready", draftsIntro: "Review and edit each brief. Tasks are created only when Emma confirms below.", confirmDrafts: "Confirm and create 3 tasks", tasksCreated: "3 tasks created", briefs: "Task briefs", taskNames: { technical: "Daniel · technical review", quality: "Nina · QA review", budget: "Budget authorization owner" },
    template: { technical: "Judgment required\nReview the proposed additional small-scale study scope and technical evaluation requirements; assess more than aggregates alone. This does not approve GMP production.\n\nEvidence\n{evidence}\n\nStill missing\nYour recorded technical opinion; QA opinion and final budget authorization remain separate. Laboratory and production resources are not confirmed.\n\nStart\nPlanned start: {plannedStart}. Start by {reviewStart}. Complete the review opinion by {reviewComplete}.", quality: "Judgment required\nDecide whether the proposed study evaluation criteria and quality evidence requirements are adequate. This does not approve process lock or batch release.\n\nEvidence\n{evidence}\n\nStill missing\nYour recorded QA opinion; technical opinion and budget authorization remain separate. Resources are unconfirmed.\n\nStart\nPlanned start: {plannedStart}. Start by {reviewStart}. Complete the review opinion by {reviewComplete}.", budget: "Judgment required\nReview option {plan} and authorize up to {amount}, including only the explicitly selected fallback. Review each fee trigger; authorization does not reserve capacity.\n\nEvidence\n{evidence}\n\nStill missing\nEmma must designate Elena; Daniel and Nina must both Agree to this request. Ben may prepare the package but cannot approve.\n\nStart\nBegin pre-reading as soon as Emma designates you; the designation reminder is {designation}. Technical and QA opinions are expected by {reviewComplete}. You may authorize after both Agree. The original budget plan ({budgetStart} to {budgetEnd}) is a reference, not an unlock period." },
    yourStep: "Your next step", openTask: "Open task", startReview: "Start review", reviewStarted: "Review in progress", reviewRecorded: "Opinion recorded", reviewReason: "Review opinion and rationale", confirmReview: "Confirm review opinion", reviewBoundary: "This confirmation concerns the additional small-scale study only. It does not authorize GMP start or batch release.", reviewWait: "Review opinion due by",
    assignSupport: "Assign preparation to Ben", supportAssigned: "Preparation assigned to Ben", acceptSupport: "Accept preparation task", supportAccepted: "Ben accepted preparation", designate: "Designate Elena", designated: "Elena is the designated budget approver", coverage: "Budget coverage", coveragePending: "Olivia is on leave. Preparation transfer to Ben and approval designation to Elena are pending.", supportOnly: "Ben can prepare and follow up on the package. His approval limit is {limit}; he cannot approve fees.", cannotApprove: "Ben can prepare the materials, but has no fee approval authority.", approve: "Authorize request", awaitingAssignment: "Await Emma’s assignment before accepting preparation.", awaitingDesignation: "Emma must designate Elena before she can approve.",
    signature: "Electronic signature · full name", reason: "Authorization reason", signatureHint: "Enter Elena Torres exactly. This is a simulated electronic signature for the demo.", acknowledge: "I have reviewed the technical and QA opinions, the final quote and fee conditions, and authorize only the scope and amount shown.", reviewPeriod: "Budget review period: {start}–{end}. Review the complete technical and QA opinions, final quote and fee conditions before signing.", signedBy: "Signed by", signedAt: "Signed at", authorizationReason: "Recorded reason", budgetBlocked: "Authorization requires Elena’s designation, both reviewers agreeing to the current request version, Ben’s preparation acceptance, and completion of the budget review.",
    fillExampleSignature: "Fill example signature",
    exampleReasonHint: "Example rationale · edit before confirming.",
    examples: {
      technical: "I support the additional small-scale purification study described in EXP-001 v1, based on the HMW finding in SEC-001 v1. The proposed scope uses existing samples and methods to assess aggregates, recovery and the agreed supporting attributes. This opinion covers the study scope and technical evaluation requirements only; it does not approve process lock or GMP production.",
      quality: "I consider the evaluation criteria and quality evidence requirements in EXP-001 v1 appropriate for this bounded additional study, with SEC-001 v1 as the baseline finding. The final evidence must include the agreed analyses and any deviations for subsequent review. This opinion does not approve process lock, GMP production or batch release.",
      authorization: "I authorize option {plan} up to {amount} for the stated study and resource scope after reviewing the technical and QA opinions and final quote. Any fallback is limited to the scope explicitly selected in this request. Fees remain subject to their quoted confirmation or execution conditions; this authorization does not confirm resources, a production window or GMP readiness."
    },
    guide: {
      select: "Switch to Emma · select an option",
      draft: "Switch to Emma · draft task briefs",
      confirm: "Switch to Emma · confirm task briefs",
      startTechnical: "Switch to Daniel · start review",
      startQuality: "Switch to Nina · start review",
      assignSupport: "Switch to Emma · assign Ben",
      acceptSupport: "Switch to Ben · accept preparation",
      designate: "Switch to Emma · designate Elena",
      completeTechnical: "Switch to Daniel · record review opinion",
      completeQuality: "Switch to Nina · record review opinion",
      authorize: "Switch to Elena · authorize request",
      reviewWuXi: "Switch to Alex · review customer authorization",
      hint: "Switches to the responsible role and opens the action. No action is completed automatically."
    },
    pmWait: "Track the assigned reviews and remaining confirmations below.", wuXiWait: "Prepare non-binding resource checks. Paid requests require customer authorization.", wuXiNext: "Alex and Mei can now assess the authorized resource request. No resource or window confirmation has been received.", onLeave: "Olivia is on leave. Ben handles preparation; Elena must be designated for approval.",
    timeline: "Demo timeline", advance: "Advance to next event", finalEvent: "Final customer event reached", clockOnly: "Advancing time does not assign, confirm or authorize work.",
    blockers: { choosePlan: "Emma: select an option first.", createTasks: "Emma: review the drafts and create the tasks first.", startReviews: "Daniel and Nina: start both reviews to preserve the planned review period.", assignSupport: "Emma: assign Ben’s budget preparation task.", acceptSupport: "Ben: accept the preparation task before continuing.", designateApprover: "Emma: designate Elena as the budget approver.", completeReviews: "Daniel and Nina: record both opinions before final budget review." },
    nextRole: { P01: "Coordinate the decision request and budget coverage.", P02: "Review and record the technical opinion.", P03: "Review and record the QA opinion.", P04: "On leave; follow the preparation and approval coverage.", P05: "Accept preparation; fee approval remains unavailable.", P06: "Review the budget authorization materials and authorize within your limit.", P07: "Coordinate the authorized request with WuXi scheduling.", P08: "Assess resources after customer authorization." },
    next: { create: "Review the three task briefs and confirm their creation.", start: "Ask Daniel and Nina to start their parallel reviews.", support: "Assign Ben to prepare the budget materials.", accepted: "Await Ben’s acceptance of the preparation task.", designate: "Designate Elena as the alternate budget approver.", opinions: "Await Daniel’s technical opinion and Nina’s QA opinion.", budget: "Await Elena’s signed budget authorization.", reviewerStart: "Start your assigned review and assess the versioned evidence.", reviewerWorking: "Review in progress; record your opinion when complete.", reviewerDone: "Your review opinion is recorded; budget authorization is separate.", preparation: "Preparation accepted; support Elena’s package. You cannot approve fees.", sign: "Review the evidence and fee conditions, then sign the authorization." },
    projectStatus: "Project status", original: "Original window", estimated: "Estimated", indUnset: "Date not set", draftSaved: "Task brief drafts saved. No tasks have been created.", createdNotice: "Tasks created once; shared status and notifications updated.", advanceNotice: "Scenario time advanced. No task was automatically confirmed.", authorizationNotice: "Customer authorization recorded. Awaiting WuXi confirmation.",
    errors: { ROLE_NOT_ALLOWED: "This role cannot perform this action.", TASKS_REQUIRED: "Emma must confirm the task briefs and assign the review tasks first.", TOO_EARLY: "This action is not yet due. Check its planned work period and prerequisites.", WRONG_SCENARIO_TIME: "This action is available during its planned work period.", REVIEWS_REQUIRED: "Both technical and QA opinions are required.", SUPPORT_ACCEPTANCE_REQUIRED: "Ben must accept the preparation task first.", APPROVER_REQUIRED: "Emma must designate Elena first.", INVALID_SIGNATURE: "Enter the designated approver’s full name: Elena Torres.", REASON_REQUIRED: "Enter a reason before confirming.", ACKNOWLEDGEMENT_REQUIRED: "Confirm that you have reviewed the technical and QA opinions, final quote and fee conditions.", REQUEST_LOCKED: "The request is fixed after tasks are created. Reset to start a different request.", EMPTY_TASK_BRIEF: "Complete all three editable briefs before creating tasks.", DECISION_REQUIRED: "Select an option to create a request first.", REVIEW_NOT_STARTED: "Start this review before recording its opinion.", DECISION_LOCKED: "The request is already authorized.", FALLBACK_ONLY_FOR_A: "Fallback authorization applies only to option A.", default: "Complete the stated prerequisites before continuing." }
  };
  global.DEMO_MESSAGES.en.decision.reviewFlow = {
  "outcome": "Review outcome · required",
  "choose": "Select an outcome…",
  "outcomes": {
    "approved": "Agree",
    "needsInformation": "More information required",
    "rejected": "Disagree"
  },
  "roles": {
    "technical": "Technical",
    "quality": "QA"
  },
  "summary": "{review}: {outcome}",
  "blocked": "Authorization blocked",
  "blockedDetail": "{review}: {outcome}. Owner: Emma. Add supporting evidence or revise the scope, then resubmit for both reviews.",
  "next": "Emma: address the review concerns and resubmit. Both reviewers must agree to the current request before authorization.",
  "supplement": "Additional evidence / revised scope",
  "supplementHint": "Describe the response to the review concerns. This creates a new request version; quoted fees and production dates stay unchanged. Any changed scope is included in the new authorization basis.",
  "resubmit": "Resubmit as request v{version}",
  "version": "Request v{version}",
  "history": "Earlier request reviews",
  "expired": "Applies to request v{version} · superseded, no longer valid for authorization",
  "currentScope": "Current request supplement",
  "recheck": "Both Daniel and Nina must review this version again.",
  "revisionTiming": "Re-review is a manual demo step at the current scenario time. Its real turnaround is not estimated; the original review schedule is historical.",
  "resubmitted": "New request version created. Earlier opinions no longer authorize this version.",
  "revisedPending": "Current request awaits new technical and QA decisions.",
  "briefBlocked": "Request v{version}: {blockers}. Authorization is blocked; Emma must address the concerns and resubmit for both reviews.",
  "briefNext": "Emma owns the next update: address the concerns and resubmit; both reviewers must agree before Elena may authorize. Resource confirmation remains pending.",
  "briefPending": "Request v{version} requires new technical and QA decisions; previous opinions do not apply.",
  "originalTiming": "Original request review timing · superseded",
  "approvedBoth": "Technical and QA agree to the current request.",
  "guided": "Guided path: choose Agree, then submit your review."
};
  Object.assign(global.DEMO_MESSAGES.en.decision.errors, {"REVIEW_OUTCOME_REQUIRED":"Select Agree, More information required or Disagree.","REVIEWS_NOT_APPROVED":"The current request requires Agree from both technical and QA reviewers.","REVIEW_RESUBMIT_NOT_AVAILABLE":"Resubmission requires an unresolved review outcome.","SUPPLEMENT_REQUIRED":"Enter the additional evidence or revised scope before resubmitting.","REVIEW_TIMING_EXPIRED":"The planned authorization time has passed. This demo cannot confirm a revised review schedule.","ADVANCE_BLOCKED_resolveReviews":"Emma must address the review concerns and resubmit first."});
  global.DEMO_MESSAGES.en.decision.guide.resolveReviews = "Switch to Emma · address review concerns";
  global.DEMO_MESSAGES.en.decision.dependencyCopy.budget = "Elena designated; technical and QA both Agree to this version; final quote";
  global.DEMO_MESSAGES.en.decision.budgetBlocked = "Authorization requires both reviewers to Agree to the current request, Elena’s designation, Ben’s preparation acceptance and completion of the budget review.";
  global.DEMO_MESSAGES.en.decision.timingRules = {
  "readyNow": "Prerequisites are met. You can act now; the due time is a reminder, not a release time.",
  "externalWait": "Waiting for the scheduled review or external result. Advancing the demo clock simulates this wait; no decision is made automatically.",
  "officeHandoff": "The guide waits for the New York working day before involving the client. The action is already available; this is not a permission lock.",
  "budgetAvailable": "Authorization is available as soon as both reviews agree and Elena is designated. Record the actual signature time.",
  "budgetReady": "Budget authorization prerequisites met",
  "budgetRecord": "Budget review recorded with the authorization",
  "recordedAt": "Recorded at",
  "availableAt": "Available since",
  "overdue": "Past due · action still available when prerequisites are met",
  "needTasks": "Create and assign the tasks first.",
  "needApprover": "Emma must designate Elena first.",
  "needReviews": "Technical and QA must both agree to this request first.",
  "scopeLocked": "Tasks have been created. This request’s option and authorized scope are locked."
};
  global.DEMO_MESSAGES.en.decision.budgetBlocked = "Authorization requires technical and QA agreement on the current request, the designated approver and the final quotation. Ben’s preparation does not grant approval rights.";
  global.DEMO_MESSAGES.en.decision.reviewWait = "Waiting for the review result, expected by";
  global.DEMO_MESSAGES.en.decision.errors.TOO_EARLY = "The required review or external result is not available yet.";
})(globalThis);

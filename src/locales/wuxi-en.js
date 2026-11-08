(function (global) {
  "use strict";
  global.DEMO_MESSAGES.en.wuxi = {
    title: "WuXi resource response",
    deadline: "WuXi resource confirmation due",
    chapters: { customer: "Customer decision", publication: "WuXi risk publication", resourceUnavailable: "Resource unavailable" },
    publicationHiddenTitle: "No published risk to display",
    publicationHiddenBody: "Alex is preparing the risk update. Customer evidence, decisions and tasks become available after publication.",
    draftTitle: "Prepare the customer risk update",
    publishedTitle: "Published risk update",
    publicationOwner: "Publication owner",
    certainty: "Impact assessment",
    certaintyOptions: { underAssessment: "Technical impact under assessment", potentialImpact: "Potential delivery impact" },
    certaintyCopy: {
      underAssessment: "The purification result is above the development target. Technical impact and process readiness remain under assessment.",
      potentialImpact: "The purification result may affect readiness for the original production window. Delivery impact remains under assessment."
    },
    nextUpdate: "Next customer update",
    originalUpdate: "Update commitment at publication",
    updateChoices: { reviewsComplete: "Technical / QA review status", resourceConfirmed: "Resource and window response" },
    draftBoundary: "The evidence is fixed. This wording does not declare a failed GMP batch or a confirmed delivery delay.",
    preview: "Customer preview",
    previewState: "Draft · not customer-visible",
    publish: "Publish to client",
    reviewDraft: "Review customer preview",
    reviewedDraft: "Customer preview reviewed",
    reviewBeforePublish: "Review the wording and customer preview before publication. Complete study materials are available at",
    reviewedWait: "Preview reviewed. Wait for the complete study materials before publishing at",
    publishReady: "Preview reviewed and complete study materials available. Ready to publish to the client.",
    publishAvailable: "Study proposal and evidence available at",
    publishedAt: "Published at",
    awaitingAuthorization: "Non-binding preparation only",
    nonbinding: "Check laboratory availability, resource feasibility and quotes. Before valid customer authorization, do not incur fees, reserve resources or promise a window.",
    authorization: "Customer authorization",
    option: "Option",
    amount: "Authorized scope cap",
    authorizedBy: "Authorized by",
    authorizedAt: "Authorized at",
    received: "Customer authorized – awaiting WuXi confirmation",
    start: "Start resource review",
    startDue: "Resource review starts",
    started: "Resource review in progress",
    startedAt: "Started at",
    responseDue: "Planned scheduling response",
    scheduleOwner: "Scheduling owner",
    response: "Record the resource and window response",
    outcome: "Scheduling result",
    outcomeOptions: { held: "Expedited resources arranged; original window held", unavailable: "Unable to confirm the requested resources / hold" },
    reason: "Response reason",
    reasonHint: "Example wording · edit to match the response before confirming.",
    examples: {
      held: "The earlier experiment and analysis slots in Q-A v1 are available and arranged within the customer's authorized scope. The original production window is held until the stated expiry. Continued use still requires satisfactory study evidence and process readiness confirmation; this is not GMP production approval.",
      unavailable: "The earlier laboratory and analysis slots needed for the study starting {start} are unavailable. The requested resources and original-window hold therefore cannot be confirmed under Q-A v1. No expedited-resource or hold fee is incurred. This cause is a case design assumption."
    },
    confirmResponse: "Record scheduling response",
    waitForStart: "Alex must start the authorized resource review before scheduling can respond.",
    waitForResponse: "Mei will provide a named resource and window response after the resource review.",
    internalResponse: "Internal scheduling response · not yet returned to the customer",
    returnReceipt: "Return response to customer",
    returnOwner: "Customer response owner",
    receivedResponse: "WuXi response recorded",
    responseBy: "Scheduling response by",
    returnedBy: "Returned to customer by",
    responseAt: "Response recorded at",
    held: "Original window held",
    heldUntil: "Confirmed hold until",
    heldConclusion: "Resource coordination complete; original window held. Aggregate reduction and process readiness remain under assessment.",
    heldBoundary: "The experiment has not started. The hold does not approve process lock, GMP production or batch release. Delivery remains a conditional estimate.",
    resourceFees: "Expedited-resource and hold fees: {amount} confirmed and non-refundable under the quote.",
    studyFees: "The shared {amount} study package becomes non-cancellable only after the experiment starts; that start has not occurred.",
    noResourceFees: "No expedited-resource or hold fees incurred.",
    customerFeesPending: "Resource fee status awaits WuXi's named response. Customer authorization alone does not incur these fees.",
    unavailable: "Requested resources / hold unavailable",
    unavailableConclusion: "Delivery forecast requires reassessment. The original-window estimate is retained for comparison only.",
    refusalReason: "Reason",
    nextOwner: "Next action owner",
    nextAction: "Coordinate the alternative scope and request a revised resource / window arrangement.",
    candidate: "Candidate later window",
    candidatePending: "Not confirmed",
    noCandidateDelivery: "No revised delivery date is confirmed. Rescheduling does not resolve the technical issue or inherit option B's delivery estimate.",
    reschedule: "Request next available window and rescheduling quote",
    reschedulePending: "Rescheduling request – awaiting WuXi confirmation",
    rescheduleBy: "Requested by",
    rescheduleBoundary: "This request does not confirm a replacement window or incur a rescheduling fee. Additional technical work needs a separate assessment and authorization; the same completed study is not charged twice.",
    rescheduleFlow: {
      title: "Rescheduling decision",
      stages: {
        none: "Next available window and quote not yet requested",
        awaitingWuXiQuote: "Awaiting WuXi window and quote response",
        quoteReadyInternal: "Internal quote ready · customer response pending",
        awaitingCustomerDecision: "Awaiting customer decision · Emma to initiate",
        awaitingCustomerAuthorization: "Awaiting customer decision · Elena to authorize",
        awaitingWuXiConfirmation: "Customer authorized · awaiting formal WuXi confirmation",
        confirmed: "Replacement window confirmed · technical readiness pending"
      },
      prepareQuote: "Record the existing later-window proposal and the quoted rescheduling fee for Alex to return to the customer.",
      quoteFee: "Rescheduling fee",
      recordQuote: "Record window and rescheduling quote",
      returnQuote: "Return window and quote to customer",
      launchDecision: "Create rescheduling decision request",
      exampleReason: "I authorize the quoted {amount} rescheduling fee for the proposed later window. The fee is incurred only when WuXi formally confirms the reschedule. This authorization does not establish aggregate reduction, process readiness, GMP production approval or a revised delivery date; additional technical scope needs a separate assessment and authorization.",
      authorizeScope: "I reviewed the returned window and quote and authorize the rescheduling scope only. Technical readiness and delivery remain under assessment.",
      authorize: "Authorize rescheduling",
      confirm: "Confirm reschedule and record fee",
      returnedQuote: "Window and quote returned to customer",
      internalQuote: "Internal window and quote · not yet returned to customer",
      confirmedWindow: "Confirmed replacement window",
      windowConfirmed: "Confirmed · subject to technical readiness",
      quoteReference: "Quote and version",
      quoteScope: "The fee applies to rescheduling only and is incurred on formal WuXi confirmation. A non-refundable cancellation term is not specified. No additional technical study is priced by this quote.",
      enquiryBoundary: "This enquiry checks the next available window and quote. It does not reserve a replacement window, authorize a fee or commit a delivery date.",
      finalBoundary: "The replacement window is formally confirmed. Aggregate reduction and process readiness remain under assessment, and delivery requires reassessment. The original study is not charged twice.",
      feeIncurred: "Rescheduling fee: {amount} incurred on formal WuXi confirmation. A non-refundable cancellation term is not specified.",
      scheduleNote: "Demo schedule uses Shanghai and New York business days. Each response still requires its named owner to submit it; advancing time does not confirm an outcome or revise delivery.",
      timingLabels: { expectedResponse: "Expected WuXi response", customerActionDue: "Customer action due", technicalReassessment: "Technical reassessment status update" },
      actionScheduled: "Scheduled action time",
      actionReady: "Scheduled for",
      advanceTime: "Advance the demo clock before recording this action",
      recordHistory: "Rescheduling record",
      enquiryRecorded: "Window and quote enquiry sent",
      quotePrepared: "Mei prepared the window and quote",
      quoteReturned: "Alex returned the window and quote",
      decisionCreated: "Emma initiated the customer decision",
      authorized: "Elena authorized rescheduling",
      confirmed: "Alex formally confirmed the reschedule and fee"
    },
    bScope: "Option B requests the later candidate window. No original-window hold is included.",
    privateResponse: "A resource response is being prepared. The customer view changes only when Alex returns the named response.",
    statuses: { draft: "Draft · not customer-visible", published: "Published", resourceReviewing: "Resource review in progress", schedulingRecorded: "Scheduling response recorded", resourceHeld: "Original window held", resourceRejected: "Resources unavailable", reschedulePending: "Rescheduling request pending" },
    guide: { publishRisk: "Switch to Alex · publish the risk update", startResourceReview: "Switch to Alex · start resource review", scheduling: "Switch to Mei · record scheduling response", returnReceipt: "Switch to Alex · return the customer response", requestReschedule: "Switch to Alex · request rescheduling" },
    notifications: {
      riskPublished: { title: "Risk update published", body: "The versioned risk and study proposal are now available for review." },
      resourceReviewStarted: { title: "Resource review started", body: "Alex has started the authorized resource review; a scheduling response is pending." },
      schedulingResponseReady: { title: "Scheduling response ready", body: "Mei has recorded the resource result. Alex must return the named response to the customer." },
      resourceConfirmed: { title: "Original window held", body: "Alex returned the confirmed resources and conditional window hold. Process readiness remains under assessment." },
      resourceRejected: { title: "Resources could not be confirmed", body: "Review the recorded reason and coordinate the next step with Alex." },
      rescheduleRequested: { title: "Window and quote enquiry recorded", body: "Mei needs to provide the next available window and rescheduling quote. No window or fee is confirmed." },
      rescheduleQuotePrepared: { title: "Window and quote prepared", body: "Alex needs to return Mei's proposed window and rescheduling quote to the customer." },
      rescheduleQuoteReturned: { title: "Window and quote available", body: "Alex returned the proposed window and quote. Emma can initiate the customer rescheduling decision." },
      rescheduleDecisionCreated: { title: "Rescheduling decision requested", body: "Emma initiated the decision. Elena must review and authorize the quoted rescheduling scope." },
      rescheduleAuthorized: { title: "Rescheduling authorized", body: "Elena authorized the quoted scope. Alex must formally confirm the reschedule before the fee is incurred." },
      rescheduleConfirmed: { title: "Replacement window confirmed", body: "Alex formally confirmed the replacement window and rescheduling fee. Technical readiness and delivery remain under assessment." }
    },
    errors: { RISK_ALREADY_PUBLISHED: "The risk update has already been published.", RISK_DRAFT_REQUIRED: "Open the draft risk update before editing it.", INVALID_CERTAINTY: "Choose one of the available impact assessments.", INVALID_NEXT_UPDATE: "Choose an existing customer update point.", AUTHORIZATION_REQUIRED: "Valid customer authorization is required before this action.", RESOURCE_REVIEW_REQUIRED: "Alex must start the resource review first.", SCHEDULING_RESPONSE_REQUIRED: "Mei must record a response before Alex returns it.", INVALID_RESOURCE_OUTCOME: "Choose a scheduling result.", RESOURCE_RESPONSE_LOCKED: "This response is already recorded. Reset the scenario to explore another outcome.", RESCHEDULE_NOT_AVAILABLE: "A rescheduling request requires option B authorization or a returned unavailable-resource response." }
  };
  const notifications = global.DEMO_MESSAGES.en.wuxi.notifications;
  notifications.resourceStarted = notifications.resourceReviewStarted;
  notifications.schedulingResponded = notifications.schedulingResponseReady;
  notifications.resourceUnavailable = notifications.resourceRejected;
  notifications.rescheduleReady = { title: "Revised resource request needed", body: "Coordinate the next arrangement with Alex. The candidate window and delivery date remain unconfirmed." };
  const errors = global.DEMO_MESSAGES.en.wuxi.errors;
  errors.INVALID_UPDATE_EVENT = errors.INVALID_NEXT_UPDATE;
  errors.CUSTOMER_AUTHORIZATION_REQUIRED = errors.AUTHORIZATION_REQUIRED;
  errors.ORIGINAL_WINDOW_ONLY = "Original-window resource confirmation applies to option A. Option B requires a rescheduling request.";
  errors.RISK_REVIEW_REQUIRED = "Alex must review the customer preview before publishing the risk update.";
  errors.ADVANCE_BLOCKED_reviewRiskDraft = "Review the customer preview before advancing to the complete evidence package.";
  errors.RESCHEDULE_ENQUIRY_REQUIRED = "Alex must request the next available window and rescheduling quote first.";
  errors.RESCHEDULE_QUOTE_REQUIRED = "Mei must prepare the candidate window and rescheduling quote first.";
  errors.RESCHEDULE_QUOTE_RETURN_REQUIRED = "Alex must return the window and quote to the customer before a decision is initiated.";
  errors.RESCHEDULE_DECISION_REQUIRED = "Emma must initiate the rescheduling decision before Elena can authorize it.";
  errors.RESCHEDULE_AUTHORIZATION_REQUIRED = "Elena must authorize the rescheduling scope before Alex can formally confirm it.";
})(globalThis);

(function (global) {
  Object.assign(global.DEMO_MESSAGES.en.wuxi.rescheduleFlow, {
  "includedFee": "Already authorized total: {total}. This release: {amount}.",
  "includedBoundary": "Included in the original option B authorization, not an additional fee. This signature confirms release for rescheduling; the fee is incurred only upon WuXi’s formal confirmation."
});
})(globalThis);

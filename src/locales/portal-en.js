(function (global) {
  "use strict";
  global.DEMO_MESSAGES.en.portal = {
    chapter: "Jump to chapter · resets scenario",
    chooseChapter: "Choose a chapter…",
    notScheduled: "To be agreed",
    updateUnscheduled: "Next update to be agreed with {owner}; the candidate window remains unconfirmed.",
    chapters: { prepublication: "Before risk publication", selection: "Option selection & AI briefs", coverage: "Budget approver on leave", authorization: "Customer authorization", hold: "WuXi hold confirmation", unavailable: "WuXi unable to hold" },
    chapterSeeded: "Chapter reset · preceding actions are preset demo records.",
    chapterReset: "Scenario reset to {chapter}. Previous actions and edits were cleared.",
    chapterBeginning: "Chapter starts a fresh scenario. Actions are recorded only when performed.",
    chapterTimeline: "Chapter preset: earlier action records were loaded for this demonstration.",
    hiddenTitle: "No published risk to review",
    hiddenBody: "Alex is preparing the risk update. Client evidence, task briefs and decisions will become available only after publication.",
    privateDraft: "Risk draft · internal preview",
    resourceDue: "WuXi resource confirmation due",
    resourceDueInfo: "Complete the resource response before this quote expires. Customer authorization, resource confirmation and process readiness are separate decisions.",
    terminal: "Demonstration endpoint reached",
    awaiting: "Awaiting WuXi confirmation",
    feesAwaiting: "Awaiting WuXi’s named resource response. Any resource or hold fee follows the confirmed quote terms; the study has not started.",
    held: "Original window held",
    heldUntil: "Held until {time} Shanghai",
    unavailable: "Original window cannot be held",
    reassessment: "Reassessment required",
    previousEstimate: "Previous conditional estimate",
    forecastInvalid: "The original resource assumption is no longer valid. Both delivery estimates need reassessment; requesting another window does not adopt its previous forecast.",
    pendingReschedule: "Rescheduling requested – awaiting WuXi confirmation",
    success: "Additional study authorized; original window held; process lock pending assessment",
    successNote: "The additional experiment has not started. Process readiness, GMP start and batch release remain separate decisions.",
    committed: "{amount} in resource and hold fees is now non-refundable under the confirmed quote. The {study} study has not started; no rescheduling fee is incurred.",
    internalReceipt: "Scheduling response recorded internally; Alex must return the named response to the client.",
    failureNote: "No resource or hold fee is committed. Alex coordinates the next candidate window; any rescheduling remains unconfirmed.",
    roleResources: "Open WuXi coordination",
    openResources: "View resource response",
    publishedContext: "Published risk context\n{certainty}\nNext update: {update}.\n\n",
    certainty: { underAssessment: "Impact on process readiness is under assessment.", potentialImpact: "Process readiness may affect the original production window; this remains conditional." },
    actions: {
      publication: { title: "Publish the risk update", detail: "Alex reviews the certainty and next-update commitment before publishing the client-visible evidence." },
      reschedule: { title: "Coordinate the rescheduling request", detail: "Alex reviews the request against the candidate window. No alternate window or delivery date is confirmed by the request." }
    },
    statuses: { draft: "Draft", resourceReview: "Resource review in progress", responseReady: "Response ready for Alex", holdConfirmed: "Hold confirmed", resourceUnavailable: "Unable to hold", reschedulePending: "Awaiting WuXi confirmation", pendingReschedule: "Awaiting WuXi confirmation", published: "Published" },
    guides: { editRisk: "Switch to Alex · review risk draft", publishRisk: "Switch to Alex · publish to client", startResources: "Switch to Alex · start resource review", scheduling: "Switch to Mei · record resource response", replyReceipt: "Switch to Alex · return response to client", reschedule: "Switch to Alex · request rescheduling" }
  };
})(globalThis);

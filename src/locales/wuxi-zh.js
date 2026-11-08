(function (global) {
  "use strict";
  global.DEMO_MESSAGES.zh.wuxi = {
    title: "药明资源回复",
    deadline: "药明资源确认截止",
    chapters: { customer: "客户决策", publication: "药明风险发布", resourceUnavailable: "资源不可用" },
    publicationHiddenTitle: "暂无已发布风险",
    publicationHiddenBody: "Alex 正在准备风险更新。发布后，客户才能查看证据、决策和任务。",
    draftTitle: "准备面向客户的风险更新",
    publishedTitle: "已发布的风险更新",
    publicationOwner: "发布负责人",
    certainty: "影响评估",
    certaintyOptions: { underAssessment: "技术影响评估中", potentialImpact: "可能影响交付" },
    certaintyCopy: {
      underAssessment: "纯化检测结果高于开发目标。技术影响和工艺就绪仍在评估中。",
      potentialImpact: "纯化检测结果可能影响原生产窗口的就绪条件，交付影响仍在评估中。"
    },
    nextUpdate: "下次客户更新",
    originalUpdate: "发布时约定的更新时间",
    updateChoices: { reviewsComplete: "技术／QA 审阅状态", resourceConfirmed: "资源与窗口回复" },
    draftBoundary: "实测证据保持不变。本表述不代表 GMP 批次不合格，也不代表交付已确定延期。",
    preview: "客户预览",
    previewState: "草稿 · 客户不可见",
    publish: "向客户发布",
    reviewDraft: "审阅客户预览",
    reviewedDraft: "已审阅客户预览",
    reviewBeforePublish: "发布前请审阅表述及客户预览。完整小试材料预计齐备于",
    reviewedWait: "预览已审阅。等待小试方案及证据包齐备后发布，时间为",
    publishReady: "预览已审阅，完整小试材料已齐备，可以向客户发布。",
    publishAvailable: "小试方案及证据包齐备时间",
    publishedAt: "发布时间",
    awaitingAuthorization: "仅可进行非约束性准备",
    nonbinding: "可以询问实验档期、评估资源可行性并获取报价。有效客户授权前，不得产生费用、预订资源或承诺窗口。",
    authorization: "客户授权",
    option: "方案",
    amount: "已授权范围上限",
    authorizedBy: "授权人",
    authorizedAt: "授权时间",
    received: "客户已授权 · 等待药明确认",
    start: "开始资源评估",
    startDue: "资源评估开始时间",
    started: "资源评估中",
    startedAt: "开始时间",
    responseDue: "计划排产回复时间",
    scheduleOwner: "排产负责人",
    response: "记录资源与窗口回复",
    outcome: "排产结果",
    outcomeOptions: { held: "加急资源已安排，原窗口已暂留", unavailable: "无法确认所申请的资源／暂留" },
    reason: "回复原因",
    reasonHint: "示例表述 · 确认前请按实际回复编辑。",
    examples: {
      held: "Q-A v1 所列的较早实验及分析时段可用，已在客户授权范围内安排。原生产窗口已暂留至约定到期时间。后续使用仍需满足小试证据要求并确认工艺就绪；这不代表批准 GMP 生产。",
      unavailable: "无法按计划安排 {start} 开始的加急实验及配套分析时段，因此无法按 Q-A v1 确认所申请的资源和原窗口暂留。未产生加急费或暂留费。此原因为本案设计假设。"
    },
    confirmResponse: "记录排产回复",
    waitForStart: "Alex 需先开始已获授权的资源评估，排产方才能回复。",
    waitForResponse: "资源评估后，由 Mei 具名回复资源与窗口安排。",
    internalResponse: "内部排产回复 · 尚未回传客户",
    returnReceipt: "向客户回传回复",
    returnOwner: "客户回复负责人",
    receivedResponse: "药明回复已记录",
    responseBy: "排产回复人",
    returnedBy: "客户回传人",
    responseAt: "回复记录时间",
    held: "原窗口已暂留",
    heldUntil: "已确认暂留至",
    heldConclusion: "本轮资源协调完成，原窗口已暂留；聚集体降低情况和工艺就绪仍在评估中。",
    heldBoundary: "小试尚未开始。暂留不代表批准工艺锁定、GMP 生产或批次放行；交付仍为条件性预测。",
    resourceFees: "加急费及暂留费：{amount} 已确认，按报价条款不可退。",
    studyFees: "共用的 {amount} 小试包仅在实验开始后不可取消；目前尚未开始。",
    noResourceFees: "未产生加急费或暂留费。",
    customerFeesPending: "资源费用状态等待药明具名回复；仅客户授权不产生这些费用。",
    unavailable: "所申请的资源／暂留无法确认",
    unavailableConclusion: "交付预测需重新评估，原窗口的预测仅留作历史比较。",
    refusalReason: "原因",
    nextOwner: "下一步负责人",
    nextAction: "协调替代范围，申请调整资源和窗口安排。",
    candidate: "后续候选窗口",
    candidatePending: "待确认",
    noCandidateDelivery: "尚未确认新的交付日期。改期不解决技术问题，也不沿用方案 B 的交付预测。",
    reschedule: "询问后续可用窗口及改期报价",
    reschedulePending: "改期请求 · 等待药明确认",
    rescheduleBy: "申请人",
    rescheduleBoundary: "本次请求不确认替代窗口，也不产生改期费。追加技术工作需单独评估和授权；已完成的相同小试不重复收费。",
    rescheduleFlow: {
      title: "改期决策",
      stages: {
        none: "尚未询问后续可用窗口及报价",
        awaitingWuXiQuote: "等待药明回复窗口及报价",
        quoteReadyInternal: "内部报价已就绪 · 待回传客户",
        awaitingCustomerDecision: "等待客户决定 · 待 Emma 发起",
        awaitingCustomerAuthorization: "等待客户授权 · 待 Elena 签署",
        awaitingWuXiConfirmation: "客户已授权 · 等待药明正式确认",
        confirmed: "药明已确认新窗口 · 技术就绪待评估"
      },
      prepareQuote: "记录已有的后续候选窗口及改期报价，由 Alex 回传客户。",
      quoteFee: "改期费",
      recordQuote: "记录窗口及改期报价",
      returnQuote: "向客户回传窗口和报价",
      launchDecision: "发起改期决策请求",
      exampleReason: "我授权候选后续窗口的 {amount} 改期报价。药明正式确认改期时才产生该费用。本授权不代表聚集体已降低、工艺已就绪、GMP 生产已批准或新交付日期已确认；追加技术范围需单独评估和授权。",
      authorizeScope: "我已审阅回传的窗口和报价，仅授权本次改期范围；技术就绪和交付仍在评估中。",
      authorize: "授权改期",
      confirm: "确认改期并记录费用",
      returnedQuote: "窗口及报价已回传客户",
      internalQuote: "内部窗口及报价 · 尚未回传客户",
      confirmedWindow: "已确认的新窗口",
      windowConfirmed: "药明已确认 · 技术仍需就绪",
      quoteReference: "报价及版本",
      quoteScope: "本费用仅用于改期，药明正式确认时才产生。报价未规定取消时不可退的条款，也未包含任何追加技术研究的定价。",
      enquiryBoundary: "本次仅询问后续可用窗口和报价，不预订新窗口、不授权费用，也不承诺交付日期。",
      finalBoundary: "药明已正式确认新窗口。聚集体降低情况和工艺就绪仍在评估中，交付需重新评估；原小试不重复收费。",
      feeIncurred: "改期费：{amount} 已在药明正式确认时产生。报价未规定取消时不可退的条款。",
      scheduleNote: "演示按上海和纽约工作日安排。每次回复仍需由具名负责人提交；推进时间不会自动确认结果或更新交付日期。",
      timingLabels: { expectedResponse: "药明预计回复时间", customerActionDue: "客户行动截止时间", technicalReassessment: "技术重评估状态更新时间" },
      actionScheduled: "计划办理时间",
      actionReady: "计划办理时间",
      advanceTime: "请先推进演示时间，再记录此操作",
      recordHistory: "改期记录",
      enquiryRecorded: "已发起窗口与报价询问",
      quotePrepared: "Mei 已准备窗口和报价",
      quoteReturned: "Alex 已回传窗口和报价",
      decisionCreated: "Emma 已发起客户决策",
      authorized: "Elena 已授权改期",
      confirmed: "Alex 已正式确认改期并记录费用"
    },
    bScope: "方案 B 申请后续候选窗口，不包含原窗口暂留。",
    privateResponse: "正在准备资源回复。Alex 具名回传后，客户视图才会更新。",
    statuses: { draft: "草稿 · 客户不可见", published: "已发布", resourceReviewing: "资源评估中", schedulingRecorded: "排产回复已记录", resourceHeld: "原窗口已暂留", resourceRejected: "资源不可用", reschedulePending: "改期请求待处理" },
    guide: { publishRisk: "切换到 Alex · 发布风险更新", startResourceReview: "切换到 Alex · 开始资源评估", scheduling: "切换到 Mei · 记录排产回复", returnReceipt: "切换到 Alex · 向客户回传", requestReschedule: "切换到 Alex · 申请改期" },
    notifications: {
      riskPublished: { title: "风险更新已发布", body: "带版本的风险证据和小试方案现已可供审阅。" },
      resourceReviewStarted: { title: "资源评估已开始", body: "Alex 已开始评估客户授权的资源请求，等待排产回复。" },
      schedulingResponseReady: { title: "排产回复已就绪", body: "Mei 已记录资源评估结果，需由 Alex 具名回传客户。" },
      resourceConfirmed: { title: "药明已确认原窗口暂留", body: "Alex 已回传资源确认和条件性窗口暂留；工艺就绪仍在评估中。" },
      resourceRejected: { title: "药明无法确认资源", body: "请查看已记录的原因，并与 Alex 协调下一步。" },
      rescheduleRequested: { title: "窗口与报价询问已记录", body: "Mei 需回复后续可用窗口及改期报价，尚未确认窗口或费用。" },
      rescheduleQuotePrepared: { title: "窗口与报价已准备", body: "Alex 需向客户回传 Mei 提供的候选窗口及改期报价。" },
      rescheduleQuoteReturned: { title: "窗口与报价已回传", body: "Alex 已回传候选窗口和报价，Emma 可发起客户改期决策。" },
      rescheduleDecisionCreated: { title: "改期决策已发起", body: "Emma 已发起请求，需由 Elena 审阅并授权报价中的改期范围。" },
      rescheduleAuthorized: { title: "客户已授权改期", body: "Elena 已授权报价范围；Alex 正式确认改期后才会产生费用。" },
      rescheduleConfirmed: { title: "药明已确认新窗口", body: "Alex 已正式确认新窗口并记录改期费；技术就绪和交付仍在评估中。" }
    },
    errors: { RISK_ALREADY_PUBLISHED: "风险更新已发布。", RISK_DRAFT_REQUIRED: "请先打开风险草稿再编辑。", INVALID_CERTAINTY: "请选择一种可用的影响评估。", INVALID_NEXT_UPDATE: "请选择已有的客户更新节点。", AUTHORIZATION_REQUIRED: "此操作需要有效的客户授权。", RESOURCE_REVIEW_REQUIRED: "Alex 需先开始资源评估。", SCHEDULING_RESPONSE_REQUIRED: "Mei 需先记录回复，Alex 才能回传。", INVALID_RESOURCE_OUTCOME: "请选择排产结果。", RESOURCE_RESPONSE_LOCKED: "回复已记录。如需体验另一结果，请重置场景。", RESCHEDULE_NOT_AVAILABLE: "申请改期需先获得方案 B 授权，或向客户回传资源无法确认的结果。" }
  };
  const notifications = global.DEMO_MESSAGES.zh.wuxi.notifications;
  notifications.resourceStarted = notifications.resourceReviewStarted;
  notifications.schedulingResponded = notifications.schedulingResponseReady;
  notifications.resourceUnavailable = notifications.resourceRejected;
  notifications.rescheduleReady = { title: "需提出新的资源请求", body: "请与 Alex 协调后续安排；候选窗口和交付日期尚未确认。" };
  const errors = global.DEMO_MESSAGES.zh.wuxi.errors;
  errors.INVALID_UPDATE_EVENT = errors.INVALID_NEXT_UPDATE;
  errors.CUSTOMER_AUTHORIZATION_REQUIRED = errors.AUTHORIZATION_REQUIRED;
  errors.ORIGINAL_WINDOW_ONLY = "原窗口资源确认仅适用于方案 A；方案 B 需提出改期请求。";
  errors.RISK_REVIEW_REQUIRED = "Alex 需先审阅客户预览，再发布风险更新。";
  errors.ADVANCE_BLOCKED_reviewRiskDraft = "请先审阅客户预览，再推进至完整证据包齐备。";
  errors.RESCHEDULE_ENQUIRY_REQUIRED = "Alex 需先询问后续可用窗口及改期报价。";
  errors.RESCHEDULE_QUOTE_REQUIRED = "Mei 需先准备候选窗口及改期报价。";
  errors.RESCHEDULE_QUOTE_RETURN_REQUIRED = "Alex 需先向客户回传窗口和报价，才能发起决策。";
  errors.RESCHEDULE_DECISION_REQUIRED = "Emma 需先发起改期决策，Elena 才能授权。";
  errors.RESCHEDULE_AUTHORIZATION_REQUIRED = "Elena 需先授权改期范围，Alex 才能正式确认。";
})(globalThis);

(function (global) {
  Object.assign(global.DEMO_MESSAGES.zh.wuxi.rescheduleFlow, {
  "includedFee": "已授权总额：{total}；本次释放金额：{amount}。",
  "includedBoundary": "已含在原方案 B 授权内，非新增费用。本次签字确认改期金额的释放；仅在药明正式确认改期时产生费用。"
});
})(globalThis);

(function (global) {
  "use strict";
  global.DEMO_MESSAGES.zh.decision = {
    title: "决策请求", choose: "选择{plan}", selected: "已选择 · 尚未授权", selectionLocked: "任务创建后，本请求的方案不可更改。可重置场景体验另一条决策路径。",
    authorizedAt: "客户授权时间", recordedOpinions: "已记录的审阅意见", opinionAt: "记录时间",
    empty: "Emma 可在比较表中选择方案，创建决策请求。", requestOpen: "决策请求 · 各项确认待完成", authorized: "客户已授权 · 等待药明确认",
    notApproval: "选择方案只创建请求，不批准费用，也不确认生产窗口。", plan: "所选方案", amount: "申请授权金额", noFees: "尚未产生费用。资源和生产窗口尚未确认。",
    fallback: "若约定条件未满足，授权提出释放原窗口／改期的后备请求", fallbackLimit: "追加上限 {cap}；已知总额上限 {total}。不含追加技术工作。正式确认改期前不产生改期费。", fallbackOff: "未授权后备方案", fallbackOn: "后备授权上限 {cap}",
    fallbackSelectedFee: "已选择 A 的可选后备授权：追加上限 {cap}，已知总额上限 {total}。正式确认改期时才收费。不含追加技术工作；相同小试不重复收费。",
    sourceTitle: "合成决策依据", experimentScope: "仅使用现有样品和方法；本次小试范围包括纯化筛选、候选条件确认、HMW、回收率及约定的分析评估。新增方法开发或扩大研究范围不在本报价内。",
    confirmations: "四项确认", confirmationNames: { technical: "技术", quality: "质量", budget: "预算", schedule: "排产" }, owner: "负责人", status: "状态", dependencies: "前置条件",
    dependencyCopy: { technical: "已确认说明并分派任务；已发布 SEC-001 和 EXP-001", quality: "已确认说明并分派任务；已发布 SEC-001 和 EXP-001", budget: "已指定 Elena；技术与 QA 意见齐备；最终报价已提供", schedule: "客户授权后，由药明评估资源" },
    statuses: { notStarted: "未开始", draft: "草稿 · 未分派", inProgress: "进行中", taskCompleted: "已确认", pendingDesignation: "待指定授权人", pendingReview: "等待技术与 QA 意见", readyForAuthorization: "待授权", waiting: "等待客户授权", ready: "等待药明确认" },
    draft: "起草任务说明", drafting: "正在起草…", simulated: "AI 起草（模拟生成）", draftReady: "草稿已生成", draftsIntro: "请逐项审阅并编辑说明。Emma 确认后才会创建任务。", confirmDrafts: "确认并创建 3 项任务", tasksCreated: "已创建 3 项任务", briefs: "任务说明", taskNames: { technical: "Daniel · 技术审阅", quality: "Nina · QA 审阅", budget: "预算授权负责人" },
    template: { technical: "需要判断什么\n审阅追加小试的范围及技术评估要求；评估不只限于聚集体。本次意见不批准 GMP 生产。\n\n依据\n{evidence}\n\n仍缺少什么\n您的正式技术意见；QA 意见和最终预算授权分别记录。实验与生产资源尚未确认。\n\n何时办理\n计划开始：{plannedStart}。最晚于 {reviewStart} 开始。请于 {reviewComplete} 前提交审阅意见。", quality: "需要判断什么\n判断拟定的小试评价标准和质量证据要求是否充分。本次意见不批准工艺锁定或批次放行。\n\n依据\n{evidence}\n\n仍缺少什么\n您的正式 QA 意见；技术意见和预算授权分别记录。资源尚未确认。\n\n何时办理\n计划开始：{plannedStart}。最晚于 {reviewStart} 开始。请于 {reviewComplete} 前提交审阅意见。", budget: "需要判断什么\n审阅方案 {plan}，授权上限 {amount}，仅包含本请求明确选择的后备范围。请核对各项费用的发生条件；客户授权不等于预订产能。\n\n依据\n{evidence}\n\n仍缺少什么\nEmma 需指定 Elena；Daniel 和 Nina 需记录各自意见。Ben 可以准备材料，但不能批准费用。\n\n何时办理\n指定授权人后于 {designation} 开始预读。技术与 QA 审阅意见应于 {reviewComplete} 前提交，供预算授权使用。最终预算审阅时段：{budgetStart} 至 {budgetEnd}。" },
    yourStep: "您的下一步", openTask: "打开任务", startReview: "开始审阅", reviewStarted: "审阅进行中", reviewRecorded: "意见已记录", reviewReason: "审阅意见与理由", confirmReview: "确认审阅意见", reviewBoundary: "本次确认仅针对追加小试，不授权 GMP 开工或批次放行。", reviewWait: "审阅意见提交截止",
    assignSupport: "指派 Ben 准备材料", supportAssigned: "已指派 Ben 准备材料", acceptSupport: "接手材料准备", supportAccepted: "Ben 已接手准备", designate: "指定 Elena", designated: "已指定 Elena 为预算授权人", coverage: "预算工作安排", coveragePending: "Olivia 休假中。待安排 Ben 准备材料，待指定 Elena 审批。", supportOnly: "Ben 可以准备并跟进材料；其签批额度为 {limit}，不能批准费用。", cannotApprove: "Ben 可以准备材料，但没有费用签批权限。", approve: "授权本请求", awaitingAssignment: "请等待 Emma 指派后再接手材料准备。", awaitingDesignation: "Emma 需先指定 Elena，Elena 才能授权。",
    signature: "电子签名 · 全名", reason: "授权理由", signatureHint: "请填写 Elena Torres。本签名仅用于模拟演示。", acknowledge: "我已审阅技术与 QA 意见、最终报价及费用条款，仅授权此处列明的范围和金额。", reviewPeriod: "预算审阅时段：{start} 至 {end}。签字前请审阅完整的技术与 QA 意见、最终报价及费用条款。", signedBy: "签字人", signedAt: "签字时间", authorizationReason: "已记录的理由", budgetBlocked: "授权前需指定 Elena、记录技术与 QA 意见、由 Ben 接手材料准备，并完成预算审阅。",
    fillExampleSignature: "填入示例签名",
    exampleReasonHint: "示例理由 · 确认前可编辑。",
    examples: {
      technical: "基于 SEC-001 v1 的 HMW 检测结果，我支持 EXP-001 v1 所述的追加纯化小试。拟定范围使用现有样品和方法，评估聚集体、回收率及约定的相关属性。本意见仅确认小试范围和技术评估要求，不批准工艺锁定或 GMP 生产。",
      quality: "以 SEC-001 v1 的检测结果为依据，我认为 EXP-001 v1 的评价标准和质量证据要求适用于本次限定范围的小试。最终证据应包含约定分析和任何偏差，供后续审阅。本意见不批准工艺锁定、GMP 生产或批次放行。",
      authorization: "审阅技术与 QA 意见及最终报价后，我授权方案 {plan} 所列小试和资源范围，金额上限 {amount}。后备授权仅限本请求明确选择的范围。费用按报价约定的确认或执行条件发生；本授权不确认资源、生产窗口或 GMP 就绪。"
    },
    guide: {
      select: "切换到 Emma · 选择方案",
      draft: "切换到 Emma · 起草任务说明",
      confirm: "切换到 Emma · 确认任务说明",
      startTechnical: "切换到 Daniel · 开始审阅",
      startQuality: "切换到 Nina · 开始审阅",
      assignSupport: "切换到 Emma · 指派 Ben",
      acceptSupport: "切换到 Ben · 接手材料准备",
      designate: "切换到 Emma · 指定 Elena",
      completeTechnical: "切换到 Daniel · 记录审阅意见",
      completeQuality: "切换到 Nina · 记录审阅意见",
      authorize: "切换到 Elena · 授权请求",
      reviewWuXi: "切换到 Alex · 查看客户授权",
      hint: "仅切换到负责人并定位操作，不会自动完成任何行动。"
    },
    pmWait: "请在下方跟进已分派的审阅和未完成的确认。", wuXiWait: "可先进行非约束性的资源询问。付费请求需等待客户授权。", wuXiNext: "Alex 和 Mei 现在可以评估已获授权的资源请求。尚未收到资源或窗口确认。", onLeave: "Olivia 休假中。Ben 负责准备材料；审批需由 Emma 指定 Elena。",
    timeline: "演示时间线", advance: "推进到下一个事件", finalEvent: "已到客户操作终点", clockOnly: "推进时间不会自动分派、确认或授权。",
    blockers: { choosePlan: "Emma：请先选择方案。", createTasks: "Emma：请先审阅草稿并创建任务。", startReviews: "Daniel 和 Nina：请先开始各自审阅，保留计划的完整审阅时段。", assignSupport: "Emma：请指派 Ben 准备预算材料。", acceptSupport: "Ben：请先接手材料准备。", designateApprover: "Emma：请指定 Elena 为预算授权人。", completeReviews: "Daniel 和 Nina：最终预算审阅前，请先记录各自意见。" },
    nextRole: { P01: "协调决策请求和预算工作安排。", P02: "审阅并记录技术意见。", P03: "审阅并记录 QA 意见。", P04: "休假中；查看材料准备和审批安排。", P05: "接手材料准备；仍无费用签批权限。", P06: "审阅预算授权资料，在额度内授权。", P07: "与药明排产协调已获授权的请求。", P08: "客户授权后评估资源。" },
    next: { create: "审阅三份任务说明并确认创建。", start: "请 Daniel 和 Nina 并行开始审阅。", support: "指派 Ben 准备预算材料。", accepted: "等待 Ben 接手材料准备。", designate: "指定 Elena 为替代预算授权人。", opinions: "等待 Daniel 的技术意见和 Nina 的 QA 意见。", budget: "等待 Elena 签署预算授权。", reviewerStart: "开始已分派的审阅，评估有版本记录的证据。", reviewerWorking: "审阅进行中；完成后请记录意见。", reviewerDone: "您的审阅意见已记录；预算授权单独办理。", preparation: "已接手材料准备；请支持 Elena 审阅。您不能批准费用。", sign: "审阅证据和费用条款后签署授权。" },
    projectStatus: "项目状态", original: "原窗口", estimated: "预计", indUnset: "日期未定", draftSaved: "任务草稿已保存，尚未创建任务。", createdNotice: "任务已创建，共享状态和通知已同步；重复操作不会重复创建。", advanceNotice: "演示时间已推进，未自动确认任何任务。", authorizationNotice: "客户授权已记录，等待药明确认。",
    errors: { ROLE_NOT_ALLOWED: "当前角色无权执行此操作。", TASKS_REQUIRED: "Emma 需先确认任务说明并创建任务。", TOO_EARLY: "尚未到办理时间，请查看计划时段及前置条件。", WRONG_SCENARIO_TIME: "请在计划办理时段内执行此操作。", REVIEWS_REQUIRED: "需先记录技术与 QA 两项意见。", SUPPORT_ACCEPTANCE_REQUIRED: "Ben 需先接手材料准备。", APPROVER_REQUIRED: "Emma 需先指定 Elena。", INVALID_SIGNATURE: "请填写指定授权人的全名：Elena Torres。", REASON_REQUIRED: "确认前请填写理由。", ACKNOWLEDGEMENT_REQUIRED: "请确认已审阅技术与 QA 意见、最终报价和费用条款。", REQUEST_LOCKED: "任务创建后，本请求不可更改。请重置场景以体验其他请求。", EMPTY_TASK_BRIEF: "创建任务前请补齐三份任务说明。", DECISION_REQUIRED: "请先选择方案并创建请求。", REVIEW_NOT_STARTED: "请先开始审阅，再记录意见。", DECISION_LOCKED: "此请求已获授权。", FALLBACK_ONLY_FOR_A: "后备授权仅适用于方案 A。", default: "请先完成列明的前置条件。" }
  };
  global.DEMO_MESSAGES.zh.decision.reviewFlow = {
  "outcome": "审阅结果 · 必选",
  "choose": "请选择审阅结果…",
  "outcomes": {
    "approved": "同意",
    "needsInformation": "需要补充信息",
    "rejected": "不同意"
  },
  "roles": {
    "technical": "技术",
    "quality": "QA"
  },
  "summary": "{review}：{outcome}",
  "blocked": "授权受阻",
  "blockedDetail": "{review}：{outcome}。负责人：Emma。补充证据或调整范围后，重新提交两项审阅。",
  "next": "Emma：处理审阅提出的问题并重新提交。两位审阅人均同意当前请求后，才能授权。",
  "supplement": "补充说明／调整后的范围",
  "supplementHint": "说明如何回应审阅问题。提交将生成新请求版本；报价金额和生产日期不变，调整说明纳入新版本的授权依据。",
  "resubmit": "重新提交为请求 v{version}",
  "version": "请求 v{version}",
  "history": "历史请求审阅意见",
  "expired": "适用于请求 v{version}，已失效，不能用于当前授权",
  "currentScope": "当前请求补充说明",
  "recheck": "Daniel 和 Nina 都须针对本版本重新审阅。",
  "revisionTiming": "重新审阅是当前演示时刻下的手动步骤，实际周转尚未估算；原审阅排期仅作为历史记录。",
  "resubmitted": "已生成新请求版本，原审阅意见不能用于本版本授权。",
  "revisedPending": "当前请求等待新的技术与 QA 审阅结果。",
  "briefBlocked": "请求 v{version}：{blockers}。当前不能授权；Emma 须处理问题并重新提交两项审阅。",
  "briefNext": "下次更新由 Emma 负责：补充证据或调整范围后重新提交，两位审阅人同意后 Elena 才能授权。药明资源确认仍待办理。",
  "briefPending": "请求 v{version} 须取得新的技术与 QA 意见；原版本意见不再适用。",
  "originalTiming": "原请求审阅时间 · 已失效",
  "approvedBoth": "技术与 QA 已同意当前请求。",
  "guided": "引导路径：选择“同意”，再提交审阅意见。"
};
  Object.assign(global.DEMO_MESSAGES.zh.decision.errors, {"REVIEW_OUTCOME_REQUIRED":"请选择“同意”“需要补充信息”或“不同意”。","REVIEWS_NOT_APPROVED":"技术与 QA 必须均同意当前请求，才可授权。","REVIEW_RESUBMIT_NOT_AVAILABLE":"存在需要处理的审阅结果时，才可重新提交。","SUPPLEMENT_REQUIRED":"请先填写补充说明或调整后的范围。","REVIEW_TIMING_EXPIRED":"已过计划授权时刻，本演示不能确认新的审阅排期。","ADVANCE_BLOCKED_resolveReviews":"Emma 须先处理审阅问题并重新提交。"});
  global.DEMO_MESSAGES.zh.decision.guide.resolveReviews = "切换到 Emma · 处理审阅问题";
  global.DEMO_MESSAGES.zh.decision.dependencyCopy.budget = "已指定 Elena；技术与 QA 均同意当前版本；最终报价";
  global.DEMO_MESSAGES.zh.decision.budgetBlocked = "授权须满足：技术与 QA 均同意当前请求、Elena 已被指定、Ben 已接手准备，并已完成预算审阅。";
})(globalThis);

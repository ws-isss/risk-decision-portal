(function (global) {
  global.DEMO_MESSAGES.zh.tour = {
  "title": "5 分钟导览",
  "actNames": [
    "Emma · 看清风险",
    "Elena · 完成客户授权",
    "Alex · 回传资源结果"
  ],
  "seededShort": "预置演示记录",
  "aOnly": "本导览按方案 A 演示；完整流程仍支持两个方案。",
  "nextAct": "进入下一幕",
  "coverageNext": "下一幕将预置：{support} 已接手准备工作，{approver} 已被指定为审批人。",
  "start": "开始 5 分钟导览",
  "restart": "重新开始导览",
  "full": "进入完整流程",
  "backA": "改选 A",
  "moreRoles": "更多角色",
  "home": "首页",
  "workspace": "项目工作区",
  "exceptions": "异常场景",
  "openRisk": "Emma：查看风险详情",
  "compare": "Emma：对比 A/B",
  "viewAttachment": "切换到 Elena 并阅读已附简报",
  "sign": "Elena：签署决策请求",
  "finish": "返回 Emma 的首页",
  "next2": "将预置：Ben 已分派并接手、Elena 已指定、Daniel 和 Nina 已审阅并同意。保留你实际编辑的任务说明和决策请求。",
  "next3": "将预置：Alex 已协调资源、Mei 已确认原窗口暂留。保留实际签字及已附简报，仍由 Alex 回传结果。",
  "at": "推进至 {time}",
  "seeded": "预置演示记录 · 可在风险时间线查看记录来源。",
  "reasons": {
    "past": "当前时间已超过下一幕起点，请重新开始导览。",
    "planB": "本导览按方案 A 演示。创建任务前可改选 A，也可进入完整流程继续方案 B。",
    "tasks": "请先确认任务说明，再进入下一幕。",
    "blocked": "当前审阅或资源结果需要跟进，请进入完整流程处理。",
    "authorization": "请先由 Elena 授权，再进入下一幕。",
    "alreadyAuthorized": "当前请求已获授权，请进入完整流程继续。",
    "invalid": "此幕不可用。"
  },
  "doneTitle": "本轮协调完成",
  "takeaways": [
    "Emma 看清了风险和两个方案的取舍。",
    "相关人员同意审阅范围，Elena 完成客户授权。",
    "Alex 回传药明资源确认。暂留有到期日；聚集体改善和工艺就绪仍待评估。"
  ],
  "exceptionNames": {
    "quality": "QA 要求补充资料",
    "coverage": "审批人休假转交",
    "unavailable": "药明无法暂留与改期",
    "prepublication": "风险发布前"
  },
  "exceptionHint": "进入异常场景会明确重置当前流程，并标明预置演示记录。",
  "exceptionReset": "重置并进入异常场景",
  "resetTitle": "重新开始导览？",
  "resetBody": "这会清除当前流程、草稿、附件和通知，并回到初始时间。幕与幕之间的切换会保留实际操作。",
  "resetConfirm": "重置并开始导览"
};
  global.DEMO_MESSAGES.zh.portal.chapters.quality = global.DEMO_MESSAGES.zh.tour.exceptionNames.quality;
  global.DEMO_MESSAGES.zh.dashboard = {
  "purpose": "开发偏差影响 GMP 生产窗口时，客户与药明如何在截止前共同决定方案、完成授权并确认资源。",
  "title": "项目首页",
  "finding": "HMW 聚集体 {measured}% · 开发目标 ≤{target}%",
  "times": "关键时间点",
  "tasks": "待处理事项",
  "decisions": "待决策",
  "reviews": "待审阅",
  "wuxi": "待药明确认",
  "next": "下次更新 · 预计首轮小试结果",
  "modules": "DaVinci 模块",
  "moduleNote": "DaVinci 现有能力，不在本演示内",
  "moduleNames": [
    "数据与报告",
    "报价",
    "物流"
  ],
  "initialEstimate": "方案 {plan} 预计 · 以条件满足为前提",
  "summary": "下一步：评估聚集体改善和工艺就绪。暂留不代表可以开始 GMP 生产。",
  "noTasks": "暂无待处理事项",
  "countHint": "按项目汇总；点击可打开对应负责人的任务。",
  "taskOpen": "查看任务 · {name}",
  "rescheduled": "单独授权的改期",
  "need": "客户需求日",
  "blocked": "受阻",
  "blockerNext": "{name}：补充原范围内的证据后重新提交审阅。",
  "scheduledUpdate": "下次预计更新"
};
})(globalThis);

(function(global) {
  global.DEMO_MESSAGES.zh.dashboard.impact = {
  "labels": {
    "decision": "待决事项",
    "delivery": "交付影响",
    "resource": "资源影响"
  },
  "join": "；",
  "deliveryPlan": "{plan}：预计{gap}",
  "early": "比需求日提前 {days} 天",
  "late": "比需求日晚 {days} 天",
  "onTime": "在需求日交付",
  "deliveryInvalid": "{plan}：交付待重新评估，原预测不再作为当前交期。",
  "resourceA": "A：加急并申请暂留 {window}窗口（上海；药明最晚 {deadline} 确认）",
  "resourceB": "B：排队 {days} 个工作日，改到 {window}候选窗口（上海），待确认",
  "decide": "客户须在 {due} 前决定授权 A（{a}）或 B（{b}）。",
  "decideSelected": "已选择方案 {plan}；客户须在 {due} 前授权 {amount}。选择不等于授权。",
  "authorized": "客户已授权 {plan}（{amount}），等待药明确认资源和窗口。",
  "held": "A：加急时段已确认；{window}原窗口已暂留至 {until}。",
  "internalHeld": "A：Mei 已在内部确认加急时段和原窗口暂留至 {until}，Alex 尚未向客户回传。",
  "internalUnavailable": "A：Mei 已在内部回复无法暂留原窗口，Alex 尚未向客户回传。",
  "unavailable": "A：药明无法安排加急时段及原窗口暂留；由 Alex 协调后续窗口和报价。",
  "heldNext": "本轮协调已完成；下一步评估聚集体改善和工艺就绪，不代表已批准 GMP 生产。",
  "blocker": "授权受阻：{reviews}。",
  "quoteCandidate": "候选窗口：{window}（上海），待确认；改期报价：{amount}。",
  "confirmedWindow": "新窗口已确认：{window}（上海）；技术就绪仍待评估。",
  "rescheduleDone": "改期已确认，已产生费用 {amount}。由 Alex 协调技术重评估和下次更新。",
  "rescheduleDecision": "{status}；改期金额 {amount}。",
  "awaitQuote": "等待药明回复后续窗口和改期报价，尚未确认新窗口。"
};
})(globalThis);

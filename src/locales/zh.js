(function (global) {
  "use strict";
  global.DEMO_MESSAGES.zh = {
    meta: {
      locale: "zh-CN", language: "zh",
      title: "DaVinci 概念方案 · 交付风险决策",
      description: "临床原液项目的模拟决策协作工作区。",
      noscript: "请启用 JavaScript 以打开交互演示，无需连接互联网。"
    },
    common: {
      brand: "DaVinci", demo: "演示数据", assumption: "本案设计假设", concept: "概念工作区",
      english: "English", chinese: "中文", languageEnglish: "英文", languageChinese: "中文", languageCurrent: "中文",
      dateWithWeekday: "{date}（{weekday}）", dateTime: "{date}{time}", requiredField: "请填写此项。", invalidField: "请检查输入内容。",
      glossaryTitle: "术语说明", glossary: { "SEC-HPLC": "体积排阻高效液相色谱", HMW: "高分子量组分", GMP: "药品生产质量管理规范", DS: "原液", IND: "新药临床试验申请", CMC: "化学、生产和质量控制", QA: "质量保证" },
      close: "关闭", cancel: "取消", save: "保存修改", reset: "重置演示",
      viewAs: "当前角色", owner: "负责人", startBy: "最晚开始", respondBy: "回复期限", arrangeBy: "安排期限",
      nextUpdate: "下次更新", estimated: "预计", pending: "待确认",
      asOf: "数据截至", viewerTime: "查看者时间", baseTime: "基地时间", evidence: "证据",
      newYork: "纽约", shanghai: "上海", customerCalendar: "客户工作日历 · 纽约",
      conceptNote: "DaVinci 客户体验的概念延伸。",
      syntheticNote: "本页人物、检测结果、日期和费用均为模拟数据。",
      resetTitle: "重置此演示？",
      resetBody: "返回风险已发布的客户初始场景，并恢复原始需求。本次演示中的修改将被清除。",
      resetConfirm: "重置场景",
      resetNotice: "场景已重置，已返回风险发布后的客户初始场景。",
      savedNotice: "客户需求已更新，预计交付日期和生产窗口保持不变。",
      invalidDate: "请输入有效的客户需求日期。",
      startClock: "模拟时间", noApproval: "无签批权限", unavailable: "休假中",
      futureAssignment: "尚未分派", notStarted: "尚未开始", draft: "草稿 · 尚未分派", waiting: "等待所需信息",
      ready: "可开始协调", planned: "待审阅", nonbinding: "非约束性协调",
      pendingAssignment: "待分派", pendingDesignation: "待指定", blocked: "等待安排代办及授权人",
      taskCompleted: "任务已完成", assigned: "已分派", pendingReview: "等待审阅意见", readyForAuthorization: "可提交授权",
      easternTime: "纽约", today: "今天", tomorrow: "明天", information: "更多说明",
      completed: "开发工作完成", researchComplete: "研究已完成", atRisk: "有风险", inProgress: "进行中"
    },
    nav: { workspace: "客户工作区", overview: "项目概览", actions: "下一步行动", delivery: "交付展望", context: "项目进度", project: "当前项目", skip: "跳至正文" },
    roles: { customerPM: "客户 CMC 项目经理", technical: "技术负责人", quality: "客户 QA", budget: "预算授权人", budgetSupport: "预算准备支持", wuxiPM: "药明项目经理", scheduling: "排产协调人" },
    project: {
      eyebrow: "项目概览", title: "项目概览",
      conventionalMab: "单克隆抗体", development: "工艺开发",
      drugSubstance: "临床 GMP 原液", released: "已放行原液",
      newJerseyFormulationSite: "客户指定制剂基地 · 新泽西",
      stage: "首个临床 GMP 批次 · 尚未开工", program: "项目背景"
    },
    risk: {
      kicker: "关键风险", state: "评估中",
      title: "纯化小试聚集体偏高",
      summary: "纯化小试聚集体偏高，可能影响计划批次的工艺就绪。",
      action: "并行启动技术与 QA 审阅，并安排预算代办与授权人，以便本周完成客户授权。",
      actionLabel: "当前要做的事", deadlineLabel: "最晚开始审阅",
      deadlineNote: "在资源确认前，为审阅及授权留足完整办理时间。",
      startToday: "今天协调 · 本周授权",
      decisionLabel: "本周需要决定",
      decision: "多付 {premium} 争取保留原窗口（{originalTiming}），或改到后续窗口（{candidateTiming}）。",
      beforeNeed: "预计比需求日早 {days} 天", afterNeed: "预计比需求日晚 {days} 天",
      beforeNeedOne: "预计比需求日早 1 天", afterNeedOne: "预计比需求日晚 1 天", onNeed: "预计在需求日送达",
      decisionCondition: "两项预测均以技术就绪和资源确认为前提。后续窗口尚未确认。",
      goActions: "查看下一步行动", report: "查看小试结果",
      measured: "HMW 实测值", target: "开发目标", originalWindow: "原生产窗口",
      notFailure: "工艺开发发现 · 不等于 GMP 放行不合格",
      reportTitle: "小试检测结果", reportIntro: "合成报告摘要",
      reportSample: "纯化小试最终样品", reportMethod: "SEC-HPLC（体积排阻高效液相色谱）· HMW（高分子量组分）峰面积",
      sample: "样品", method: "检测方法", found: "结果记录时间", version: "报告版本",
      reportConclusion: "高于项目开发目标，目前正在进行技术评估。该结果不能直接认定 GMP 批次不合格。",
      releaseRequired: "仍需进一步技术和质量评估，才能确认工艺就绪。"
    },
    actions: {
      eyebrow: "角色职责", title: "下一步行动",
      subtitle: "当前角色需要协调和审阅的事项。",
      readOnly: "按已约定的审阅顺序进行分派与授权。",
      details: "行动内容", dueLabel: "最晚行动时间", roleLabel: "角色职责",
      rows: {
        coordinate: { title: "协调技术与 QA 审阅", detail: "向两位审阅人提供已发布的小试结果及实验方案，两项审阅可并行开展。", status: "ready" },
        coverage: { title: "安排预算代办与授权人", detail: "今天安排 Ben 准备材料，明早指定 Elena 为替代授权人。目前两项安排均未完成。Ben 可以准备材料，但不能批准费用。", status: "ready" },
        technical: { title: "审阅追加小试方案", detail: "审阅实验范围、可用材料、分析证据及技术评价要求。本次仅确认小试范围，不批准 GMP 生产。", status: "planned" },
        quality: { title: "审阅质量证据要求", detail: "审阅拟采用的评价标准和所需证据。本项不批准工艺锁定或批次放行。", status: "planned" },
        budget: { title: "等待指定替代授权人", detail: "Olivia 正在休假，Emma 尚需指定 Elena 为替代授权人。最终授权还需技术及 QA 意见和最终报价，目前尚未向 Elena 发起授权。", status: "waiting" },
        monitor: { title: "跟进报价对应的资源可用性", detail: "在现有报价范围内询问档期、评估可行性。客户授权前仅作非约束性准备，不收费、不预订产能、不承诺窗口。", status: "nonbinding" },
        receipt: { title: "准备资源确认回执", detail: "客户有效授权后，与排产协调并具名回传确认结果。客户点击授权本身不能确保生产窗口。", status: "waiting" },
        schedule: { title: "评估拟定窗口安排", detail: "先评估可行性，不承诺资源。付费预订和正式窗口确认必须处于有效授权范围内。", status: "nonbinding" },
        support: { title: "准备预算授权资料" },
        supportPreparation: { title: "预算材料准备支持", detail: "准备并跟进预算授权资料。本项分派不授予费用签批权限。" },
        budgetReview: { title: "审阅预算授权资料", detail: "审阅技术与 QA 意见及最终报价，再在指定额度内授权费用。" }
      },
      noTasks: "当前场景没有已分派给此角色的行动。",
      backupNote: "Emma 尚需安排 Ben 准备材料。Ben 可以准备材料，但不能批准费用。",
      alternateNote: "Emma 尚需指定 Elena 为替代授权人。目前尚未向 Elena 发起授权。",
      coverageTitle: "预算代办与授权人安排", coverageOwner: "协调负责人：{name}",
      supportPending: "待安排准备支持 · {name}", approvalPending: "待指定授权人 · {name}",
      supportScope: "仅准备材料，不能批准费用。", approvalScope: "先指定替代授权人，再审阅最终材料并授权。"
    },
    delivery: {
      eyebrow: "客户需求", title: "交付展望",
      subtitle: "已放行原液的条件性预测，包含计划物流缓冲。",
      edit: "修改客户需求", needBy: "客户需求日期", deliveryItem: "交付物", destination: "交付地点",
      requirementTitle: "客户需求", requirementHint: "修改需求日期只更新交付差距，不会重新预订生产或改变预计交付日期。",
      needDateLabel: "需求日期 · 客户日历", original: "原窗口情景", candidate: "候选窗口情景",
      originalCondition: "以小试及工艺就绪条件满足、原窗口得以保留为前提。",
      candidateCondition: "以完成必要技术工作并确认后续窗口为前提。",
      forecast: "预计交付", buffer: "预计提前 {days} 天", gap: "预计晚 {days} 天", bufferOne: "预计提前 1 天", gapOne: "预计晚 1 天", onDate: "预计在需求日送达",
      calendarNote: "差距按客户当地日历日期计算，切换查看者时区不会改变比较结果。",
      basis: "查看预测依据", basisTitle: "预测依据", basisIntro: "两种情景采用相同的基础工作周期，资源排队与窗口等待单独列出。",
      phase: "阶段", originalPath: "原窗口情景", candidatePath: "候选窗口情景",
      executionTimezone: "执行时区", executionDates: "各阶段日期按该行执行时区显示，不随查看者时区变化。",
      timezoneNotes: { crossBorderShanghaiReference: "跨境运输以出发地及协调方的上海时间为日期参照。本阶段包含跨地区运输、清关和最终送达。" },
      duration: "相同基础周期", calendarDays: "{days} 个日历日", calendarDayOne: "1 个日历日", workdays: "{days} 个工作日", workdayOne: "1 个工作日", elapsedWait: "窗口等待",
      parallelNote: "放行检测与记录审阅并行，最终 QA 处置须等待两者完成；记录审阅不在检测后重复计时。",
      bufferNote: "准备及交付缓冲是计划预留时间，不代表操作已经完成或交付日期已获承诺。",
      assumptions: "假设已有样品及方法适用、资源可用、技术证据满足要求、顺利放行并订妥运输。任一前提失效，相关预测都需重新评估。",
      notConfirmed: "预测不是已确认的交付承诺。",
      changed: "客户需求已修改", datesUnchanged: "生产日期和预测保持不变",
      phaseNames: { sampleCheck: "样品及方法核查", screening: "条件筛选", firstAnalysis: "首轮分析", candidateConfirmation: "候选条件确认", finalAnalysis: "最终分析及报告", internalAssessment: "内部技术评估", customerResultReview: "客户技术 / QA 审阅", windowUseConfirmation: "工艺就绪 / 窗口使用确认", productionPreparation: "生产准备", preparationBuffer: "准备缓冲", windowWait: "等待生产窗口", resourceQueue: "额外资源排队", seedExpansion: "细胞复苏及种子扩增", productionCulture: "生产培养", harvestPurification: "收获、纯化及 DS 制备", releaseTesting: "放行检测", recordReview: "记录审阅 · 与检测并行", finalQA: "最终 QA 处置", dispatchPreparation: "发运准备", transport: "运输、清关及最终送达", deliveryBuffer: "交付计划缓冲" }
    },
    context: {
      eyebrow: "项目状态", title: "项目进度",
      research: "研究", researchNote: "DNA 与分子开发", development: "开发", developmentNote: "工艺开发 · 当前重点", manufacturing: "生产", manufacturingNote: "首个临床 GMP 批次尚未开工",
      developmentWorkstreams: "开发工作线",
      workstreamNames: { cellLineBank: "细胞株与细胞库", upstream: "上游工艺", downstream: "下游纯化", analytical: "分析方法", formulation: "制剂开发" },
      current: "当前", upcoming: "待开展", milestones: "DNA 至 IND 里程碑", dna: "DNA / 分子", process: "工艺开发", gmp: "首个 GMP DS 批次", releasedDS: "已放行 DS 送达", ind: "IND", noDate: "日期未定", forecastLabel: "原窗口预测", originalWindow: "原窗口 · 基地时间",
      reports: "项目证据", study: "纯化小试结果", noShipment: "暂无待处理发运", shipmentNote: "首个临床 GMP 批次尚未开工。"
    },
    overview: {
      projectInfo: "项目信息", contextInfo: "项目里程碑及发运状态",
      snapshot: "当前时点", riskTitle: "纯化小试聚集体高于开发目标", riskState: "需要决策",
      decisionBy: "客户授权截止", riskInfo: "风险证据及下次更新",
      finding: "纯化小试 HMW（高分子量组分）：{measured}%。开发目标：≤ {target}%。",
      riskImpact: "这一工艺开发发现可能影响首个临床 GMP 批次的工艺就绪，不等于 GMP 放行不合格。",
      decisionInfo: "客户决策期限",
      decisionExplanation: "这是客户最晚授权时间。授权前须具备技术与 QA 意见及最终报价，之后由药明确认资源。客户决定本身不能确保任何窗口。",
      compare: "比较方案", factor: "比较项", optionA: "A · 争取保留原窗口", optionB: "B · 改到后续窗口",
      optionAInfo: "方案 A 的前提", optionBInfo: "方案 B 的前提",
      cost: "项目追加费用", costInfo: "费用及承诺条件", premium: "比 B 多 {amount}",
      costExplanation: "这些费用对应追加小试及窗口安排，不是整个项目预算。查看比较不会产生费用，付费承诺须有有效授权。",
      window: "生产窗口", windowInfo: "开工定义", windowExplanation: "开工指在上海开始 GMP 细胞复苏及种子扩增。两方案的基础工作周期相同，差异在资源排队和窗口等待。",
      estimatedDelivery: "预计交付", deliveryInfo: "交付预测前提",
      deliveryExplanation: "已放行原液送达客户指定基地，日期使用纽约时间。预测含交付缓冲，并以技术就绪、放行及资源确认为前提。",
      needDate: "客户需求日", requirementInfo: "当前客户需求", requirementChanged: "已修改",
      difference: "相对需求日 · 预计", before: "提前 {days} 天", after: "晚 {days} 天", beforeOne: "提前 1 天", afterOne: "晚 1 天", onDate: "需求日当天",
      confirmed: "窗口申请状态", notRequested: "尚未申请",
      todayTitle: "今天要做的事", roleTitle: "当前角色待办", person: "人员", action: "行动", deadline: "最晚开始", status: "状态",
      coverageNote: "Olivia Grant · 休假中", coverageInfo: "预算代办与授权人安排",
      coverageExplanation: "Emma 尚需安排 Ben 支持并指定 Elena 为替代授权人，两项安排都未完成。Ben 仅准备材料，不能批准费用。Elena 的授权须等待技术与 QA 意见及最终报价。",
      actionScope: "今天的协调事项", actionScopeExplanation: "今天组织好这四项行动。所示时间为最晚安排或开始审阅时间，不是完成审阅的期限。",
      assignBen: "指派 Ben 准备预算材料", startTechnical: "开始技术审阅", startQuality: "开始 QA 审阅", designateElena: "指定 Elena 为预算授权人",
      supportInfo: "Ben 的准备权限", supportExplanation: "等待 Emma 分派。Ben 可以准备材料，但不能批准费用。",
      approverInfo: "Elena 的授权人指定", approverExplanation: "等待 Emma 指定。Elena 具备所需签批额度，最终授权仍需技术与 QA 意见及最终报价。",
      workstream: "开发工作线", progressInfo: "项目进度详情", program: "项目背景",
      footer: "DaVinci 概念延伸方案。人物、检测结果、日期和费用均为模拟；预测以相关条件满足为前提，不构成交付承诺。",
      sharedPrerequisite: "两个方案都以技术就绪和资源确认为前提。",
      developmentScope: "“已完成”仅指对应开发工作线完成，不代表已具备 GMP 生产条件或已批准批次放行。",
      riskDetails: "查看风险详情",
      language: "语言", languagePending: "中文", languageCurrent: "中文 · 当前",
      nextActionLead: "当前角色", by: "最晚",
      roleInstructions: {
        P01: "安排 Ben 提供预算准备支持", P02: "开始技术审阅", P03: "开始 QA 审阅",
        P04: "休假中；Emma 正在安排代办及替代授权人。", P05: "等待分派准备支持；仅准备材料，无签批权限。",
        P06: "等待指定；可先审阅拟承诺的范围。", P07: "先进行非约束性资源评估，授权后回传结果。", P08: "评估窗口可行性，暂不承诺资源。"
      },
      roleButtons: { P01: "查看风险", P02: "审阅证据", P03: "查看 QA 范围", P04: "查看代办安排", P05: "查看职责范围", P06: "审阅拟承诺范围", P07: "查看风险", P08: "查看前提条件" }
    },
    notifications: {
      title: "通知", unreadCount: "{count} 条未读通知", markAll: "全部标为已读", empty: "当前角色暂无通知。",
      owner: "任务负责人", status: "任务状态", receivedAt: "收到于", openTask: "查看任务", read: "已读", unread: "未读",
      readBoundary: "阅读通知不代表任务完成或已获授权。",
      kinds: {
        leaveSupport: { title: "Olivia 休假中", body: "请安排 Ben 准备材料，转交尚未完成。" },
        leaveApprover: { title: "需要替代授权人", body: "请指定 Elena 审阅授权材料，目前尚未指定。" },
        leaveBudget: { title: "需要安排代办及授权人", body: "Emma 正在协调。Ben 可以准备材料；Elena 尚需被指定为授权人。" },
        reviewReady: { title: "客户团队收到证据", body: "SEC-001、EXP-001 已可查看。Emma 尚未确认审阅任务说明，审阅任务尚未分派。" },
        taskBriefPending: { title: "任务说明待确认", body: "Emma 尚未确认审阅任务说明。任务分派后，Daniel 和 Nina 才可以开始审阅。" },
        tasksAssigned: { title: "可以开始审阅", body: "Emma 已确认任务说明并分派审阅任务。{owner} 可以打开已分派的任务，开始审阅已发布的证据材料。" },
        reviewStarted: { title: "审阅已开始", body: "{owner} 已开始审阅，最终意见尚待提交。" },
        reviewCompleted: { title: "审阅意见已记录", body: "{owner} 已记录审阅意见，其他确认仍分别处理。" },
        supportAccepted: { title: "Ben 已接手材料准备", body: "Olivia 休假期间，Ben 已接手准备任务，但不能批准费用。" },
        evidenceReady: { title: "资源评估证据已齐备", body: "可以询问档期及评估可行性，暂不预订资源或产生费用。" },
        authorizationWaiting: { title: "等待客户授权", body: "资源确认回执须等待授权。此提醒不代表窗口已获保障。" },
        supportAssigned: { title: "预算材料准备已分派给 Ben", body: "Olivia 休假期间由 Ben 支持准备材料，Ben 不能批准费用。" },
        approverDesignated: { title: "Elena 已被指定为预算授权人", body: "由 Elena 审阅并授权。最终授权须具备技术及 QA 意见和最终报价。" },
        reviewsCompleted: { title: "技术与 QA 意见已记录", body: "意见已可纳入最终预算材料。这不代表 GMP 生产或批次放行已获批准。" },
        authorizationRecorded: { title: "客户授权已记录", body: "已授权请求可交由药明协调。资源与窗口确认仍是独立步骤。" },
        authorizationReceived: { title: "已收到客户授权", body: "请协调已授权资源并具名回传结果。客户授权本身不能确保窗口。" },
        resourceConfirmed: { title: "资源回执已记录", body: "请查看已授权请求对应的具名资源及窗口回执。" }
      }
    },
    fees: {
      shared: "小试与评估", expedite: "加急费", expediteDescription: "用于预订较早的实验及分析时段。", hold: "窗口暂留费", reschedule: "改期费",
      title: "费用明细及承诺条件", item: "费用项目", optionA: "A", optionB: "B", trigger: "何时形成费用承诺", notIncluded: "不包含",
      sharedCondition: "实验开始后不可取消。",
      expediteCondition: "仅在药明确认较早的实验及分析时段后不可退；未确认则不收费。",
      holdCondition: "仅在药明确认原窗口暂留后不可退；未确认则不收费。",
      rescheduleCondition: "改期确认后产生费用。本演示报价未注明退款条件。",
      currentState: "当前尚未形成费用承诺。任何付费承诺均须先取得有效授权。",
      fallback: "尚未勾选 A 的后备授权。若勾选，已确认改期最多增加 {cap}（已知范围合计 {total}）；不含追加技术工作，同一小试不重复收费。",
      syntheticTerms: "以上是模拟报价条款，不代表药明收费政策。", toggle: "展开费用明细"
    }
  };
  Object.assign(global.DEMO_MESSAGES.zh.notifications.kinds, {"rejected":{"title":"审阅结果：不同意","body":"{owner} 不同意当前请求。Emma 须处理问题并重新提交；当前不能授权。"},"needsInformation":{"title":"审阅结果：需要补充信息","body":"{owner} 要求补充信息。由 Emma 补充并重新提交；当前不能授权。"},"reviewBlocked":{"title":"审阅结果阻止授权","body":"Emma 须处理审阅问题并重新提交。技术与 QA 必须均同意新版本后，才可授权。"}});
})(globalThis);

(function (global) {
  global.DEMO_MESSAGES.zh.delivery.timeline = {
  "whyLate": "为什么晚 {days} 天？",
  "whyLateOne": "为什么晚 {days} 天？",
  "title": "为什么 B 比 A 晚 {days} 天",
  "explanation": "B 要先排队 {queue} 个工作日，小试结果晚 {weeks} 周（{reportDate}），赶不上 {originalWindow} 的窗口，只能等到 {candidateWindow}。生产本身的时长不变。",
  "phases": [
    "等实验资源",
    "小试和技术／QA 评估",
    "生产准备及等窗口",
    "生产、放行和运输"
  ],
  "proposedHold": "拟暂留至",
  "heldUntil": "已暂留至",
  "invalidHold": "原拟暂留日期 · 已失效",
  "originalWindow": "原生产窗口",
  "needDate": "客户需求日",
  "held": "已暂留 · 工艺就绪仍在评估",
  "conditional": "条件性预测",
  "historical": "原计划参考 · 需重新评估",
  "noQueue": "无额外排队",
  "fullResults": "预计小试完整结果",
  "productionWindow": "生产窗口",
  "pureWait": "准备及缓冲结束后等待窗口",
  "noEndpoint": "暂无预计交付日期。本占位区位于时间刻度之外。",
  "hatchingNote": "斜线表示等待生产窗口。",
  "phaseDetails": [
    "小试开始前的额外资源排队，A 无额外排队。所有阶段的夜间及非工作日交接均计入对应区间。",
    "包含小试、内部评估、客户技术／QA 审阅，以及工艺就绪／窗口使用确认。",
    "包含生产准备及缓冲，斜线部分为之后等待生产窗口的时间。",
    "包含生产、放行、运输及交付缓冲。放行检测与记录审阅的并行时间不重复累加。"
  ],
  "zoneSummary": "实验和生产窗口按上海时间，客户审阅和交付按纽约时间。",
  "zoneHelp": "执行时区说明",
  "zoneDetails": "评估段包含两地工作，客户技术／QA 审阅按纽约时间，具体执行时区见下方日期明细表。月份位置用于概览，各节点日期保留其执行地时区。"
};
})(globalThis);

(function (global) {
  global.DEMO_MESSAGES.zh.overview.arrangements = {
    resources: "资源安排", expedited: "加急", noQueue: "无需额外排队", queue: "先排队 {days} 个工作日",
    hold: "窗口暂留", requestHoldUntil: "申请原生产窗口暂留至", heldUntil: "原生产窗口已暂留至",
    holdConditional: "待药明确认；确认后暂留费不退。",
    holdCommitted: "暂留费已产生且不退。",
    noHold: "不暂留原生产窗口。", candidateUnconfirmed: "候选窗口尚未确认。",
    separateReschedule: "后续窗口由单独的改期请求处理。",
    holdUnavailable: "无法暂留原生产窗口，详见资源回执。",
    holdNotPursued: "当前按单独的改期请求推进，不申请原窗口暂留。",
    reassessResources: "原安排参考，资源可行性需重新评估。",
    scope: "研究范围", sameScope: "两者相同",
    scopeDescription: "纯化条件筛选、候选条件确认、HMW 和回收率评估及约定的分析，不含额外的方法开发。"
  };
})(globalThis);

(function (global) {
  Object.assign(global.DEMO_MESSAGES.zh.context, {
  "originalBaseline": "原基线",
  "originalWindow": "原窗口 · 工艺就绪待评估",
  "candidateWindow": "候选窗口，待确认",
  "confirmedWindow": "已确认 · 工艺就绪待评估",
  "heldWindow": "窗口已暂留 · 工艺就绪待评估",
  "windowReassessment": "历史窗口 · 待重新评估"
});
})(globalThis);

(function (global) {
  Object.assign(global.DEMO_MESSAGES.zh.delivery, {
  "readOnly": "仅查看 · Emma 可修改需求日期",
  "fixedScope": "交付物和地点为固定案例条件；变更须由药明重新评估范围、报价和交期。"
});
})(globalThis);

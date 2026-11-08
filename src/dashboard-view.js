(function (global) {
  "use strict";
  function impactSummary({data,state,text,core}) {
    const model=global.DEMO_WORKFLOW.dashboard(data,state),v=model.view,t=text.dashboard.impact,d=state.decision;
    const format=(template,values={})=>template.replace(/\{(\w+)\}/g,(_,key)=>values[key] ?? "");
    const base=data.calendars.base.timezone,client=data.calendars.customer.timezone;
    const date=at=>core.formatInstant(at,base,{locale:text.meta.locale,year:undefined,month:"short",day:"numeric",hour:undefined,minute:undefined});
    const time=(at,zone)=>`${core.formatInstant(at,zone,{locale:text.meta.locale})} ${zone===base?text.common.shanghai:text.common.newYork}`;
    const money=amount=>new Intl.NumberFormat(text.meta.locale,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(amount).replace("US$","$");
    const planIds=d?[d.planId]:["A","B"];
    const internal=["P07","P08"].includes(state.viewer);
    const invalid=v.forecastReassessmentRequired || internal && v.schedulingOutcome === "unavailable";
    const deliveryParts=planIds.map(id=>{
      if(invalid) return {id,text:format(t.deliveryInvalid,{plan:id})};
      const gap=core.calendarGap(state.needByLocalDate,data.plans[id].forecast.localDate);
      return {id,text:format(t.deliveryPlan,{plan:id,gap:format(gap>0?t.early:gap<0?t.late:t.onTime,{days:Math.abs(gap)})})};
    });
    const delivery=deliveryParts.map(part=>part.text).join(t.join);
    let resource=planIds.map(id=>format(id==="A"?t.resourceA:t.resourceB,{window:date(data.plans[id].window.at),deadline:date(data.events.resourceConfirmationDeadline.at),days:data.plans[id].queueWorkdays})).join(t.join);
    let decision=d?format(t.decideSelected,{plan:d.planId,amount:money(d.fallbackSelected?data.fees.totals.AWithFallback:data.plans[d.planId].total),due:time(data.events.latestAuthorization.at,client)}):format(t.decide,{a:money(data.plans.A.total),b:money(data.plans.B.total),due:time(data.events.latestAuthorization.at,client)});
    let blockerNext="";
    if(v.reviewBlockers.length){
      const f=text.decision.reviewFlow;
      decision=format(t.blocker,{reviews:v.reviewBlockers.map(b=>format(f.summary,{review:f.roles[b.kind],outcome:f.outcomes[b.outcome]})).join(t.join)});
      blockerNext=d.resubmissionIntent==="scopeChange"?f.scopeNext:format(text.dashboard.blockerNext,{name:data.people.P01.name});
    }else if(v.authorized) decision=format(t.authorized,{plan:d.planId,amount:money(d.authorization.total)});
    if(v.resourceConfirmed){resource=format(t.held,{window:date(data.plans.A.window.at),until:time(data.plans.A.holdUntil,base)});decision=t.heldNext;}
    else if(internal && v.schedulingOutcome==="held") resource=format(t.internalHeld,{until:time(data.plans.A.holdUntil,base)});
    else if(v.resourceRejected) resource=t.unavailable;
    else if(internal && v.schedulingOutcome==="unavailable") resource=t.internalUnavailable;
    if(v.rescheduleStage!=="none"){
      // Only customer-visible quotations may appear here; an internal quote stays private.
      if(v.rescheduleQuoteReturned) resource=format(t.quoteCandidate,{window:date(v.rescheduleQuote.candidateWindow),amount:money(v.rescheduleQuote.amount)});
      else resource=t.awaitQuote;
      decision=v.rescheduleQuoteReturned?format(t.rescheduleDecision,{status:text.portal.rescheduleStages[v.rescheduleStage],amount:money(v.rescheduleQuote.amount)}):t.awaitQuote;
    }
    if(v.rescheduleConfirmed){resource=format(t.confirmedWindow,{window:date(v.rescheduleConfirmation.candidateWindow)});decision=format(t.rescheduleDone,{amount:money(v.rescheduleConfirmation.amount)});}
    const content={decision,delivery,resource};
    return {planIds,deliveryParts,selected:Boolean(d),blockerNext,rows:(internal?["resource","delivery","decision"]:["decision","delivery","resource"]).map(key=>({key,label:t.labels[key],text:content[key]}))};
  }
  function render({data,state,text,core,complete,helpers:h}) {
    const {escape:e,interpolate:fmt,instant,dateOnly,city,badge,gapMarkup,decisionStatus}=h;
    const model=global.DEMO_WORKFLOW.dashboard(data,state),v=model.view,t=text.dashboard;
    const labels={authorization:text.overview.decisionBy,resource:text.portal.resourceDue,holdExpiry:text.portal.holdExpiry,firstResults:t.next,...text.portal.timingLabels};
    const impact=impactSummary({data,state,text,core});
    const summary=complete?`<section id="tour-summary" class="tour-summary"><h2>${text.tour.doneTitle}</h2><ol>${text.tour.takeaways.map(copy=>`<li>${e(copy)}</li>`).join("")}</ol><a class="button button-secondary" href="#exceptions">${text.tour.exceptions}</a></section>`:"";
    return `<div id="home" class="dashboard"><div class="page-heading"><h1>${t.title}</h1></div>
      <section class="dashboard-intro"><p>${t.purpose}</p><div class="decision-action-group"><button id="tour-start" class="button button-primary">${text.tour.start}</button><a class="button button-secondary" href="#exceptions">${text.tour.exceptions}</a></div></section>${summary}${state.chapterSeeded?`<p class="dashboard-preset"><span class="data-tag">${text.tour.seeded}</span></p>`:""}
      <a id="dashboard-risk" class="dashboard-risk" href="#risk"><div class="section-heading"><h2>${data.project.id} · ${text.overview.riskTitle}</h2><span class="risk-status">${text.common.atRisk}</span></div><p class="dashboard-finding">${fmt(t.finding,{measured:data.risk.hmwPct.toFixed(1),target:data.risk.targetPct.toFixed(1)})}</p><dl class="dashboard-impact">${impact.rows.map(row=>`<div data-impact="${row.key}"><dt>${e(row.label)}</dt><dd${row.key==="decision"?' data-dashboard-status':""}${row.key==="delivery" && impact.selected?` data-dashboard-selected="${model.planId}"`:""}>${row.key==="delivery" && !impact.selected?impact.deliveryParts.map(part=>`<span data-dashboard-plan="${part.id}">${e(part.text)}</span>`).join(e(t.impact.join)):e(row.text)}${row.key==="decision" && impact.blockerNext?` <span data-dashboard-blocker-owner="${model.blockerOwner}">${e(impact.blockerNext)}</span>`:""}</dd></div>`).join("")}</dl><span class="data-tag">${text.common.assumption}</span><span class="dashboard-open">${text.overview.riskDetails} →</span></a>
      <section class="section dashboard-progress"><h2>${text.context.title}</h2><ol class="progress-track"><li><span>R · ${text.context.research}</span><span>${text.common.researchComplete}</span></li><li aria-current="step"><strong>D · ${text.context.development}</strong><span class="risk-status">${text.common.atRisk}</span></li><li><span>M · ${text.context.manufacturing}</span><span>${text.common.notStarted}</span></li></ol><div class="dashboard-milestones">
      <div><span>${text.context.gmp}</span><strong data-dashboard-window>${dateOnly(model.window,data.calendars.base.timezone)} · ${city(data.calendars.base.timezone)}</strong><span class="risk-status">${text.common.atRisk}</span><small>${text.context[model.windowStatus]}</small></div>
      <div><span>${text.overview.estimatedDelivery}</span><strong data-dashboard-delivery>${model.forecast?core.formatLocalDate(model.forecast.localDate):text.portal.reassessment}</strong><small>${city(data.baseline.timezone)} · ${v.forecastReassessmentRequired?text.portal.forecastInvalid:model.baseline?text.context.originalBaseline:text.common.estimated}</small></div>
      <div><span>${t.need}</span><strong>${core.formatLocalDate(state.needByLocalDate)}</strong><small>${city(data.baseline.timezone)}</small></div>
      <div><span>${text.context.ind}</span><strong>${text.context.noDate}</strong></div></div></section>
      <div class="dashboard-bottom"><section class="section dashboard-dates"><h2>${t.times}</h2>${model.timings.map(item=>`<div data-dashboard-timing="${item.label}"><span>${labels[item.label]||t.scheduledUpdate}</span><strong><time datetime="${item.at}">${instant(item.at,item.zone)}</time> · ${city(item.zone)}</strong></div>`).join("")}${v.resourceConfirmed?`<p>${t.summary}</p>`:""}</section>
      <section class="section"><h2>${t.tasks}</h2><p class="decision-note">${t.countHint}</p><div class="dashboard-counts">${model.groups.map(group=>`<button class="dashboard-count" data-dashboard-task="${group.key}"${group.count?'':' disabled'}><strong>${group.count}</strong><span>${t[group.key]}${group.blocked?` · <span class="risk-status" data-dashboard-blocked>${t.blocked}</span>`:""}</span><small>${group.count?fmt(t.taskOpen,{name:data.people[group.role].name}):t.noTasks}</small></button>`).join("")}</div></section></div>
      ${global.DEMO_TOUR_VIEW.exceptions(text,e)}
      <section class="section"><h2>${t.modules}</h2><p class="decision-note">${t.moduleNote}</p><div class="dashboard-modules">${t.moduleNames.map(label=>`<button class="button button-secondary" disabled>${label}</button>`).join("")}</div></section></div>`;
  }
  global.DEMO_DASHBOARD_VIEW=Object.freeze({render,impactSummary});
})(globalThis);

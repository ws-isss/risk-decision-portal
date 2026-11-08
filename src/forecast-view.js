(function (global) {
  "use strict";
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ms = value => Date.parse(value);
  const interpolate = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));
  function captionValues(data, text) {
    const a = data.plans.A, b = data.plans.B;
    const report = plan => plan.stages.find(s => s.id === 'finalAnalysis');
    const localDay = stage => {
      const parts = new Intl.DateTimeFormat('en-US',{timeZone:stage.executionTimezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(stage.end));
      const value = key => parts.find(p=>p.type===key).value;
      return `${value('year')}-${value('month')}-${value('day')}`;
    };
    const shortDate = at => new Intl.DateTimeFormat(text.meta.locale,{timeZone:data.calendars.base.timezone,month:'short',day:'numeric'}).format(new Date(at));
    return {
      days:global.DEMO_CORE.calendarGap(b.forecast.localDate,a.forecast.localDate),
      queue:b.queueWorkdays,
      weeks:global.DEMO_CORE.calendarGap(localDay(report(b)),localDay(report(a)))/7,
      reportDate:shortDate(report(b).end),
      originalWindow:shortDate(a.window.at), candidateWindow:shortDate(b.window.at)
    };
  }
  // Coordinates only: these are existing instants, not a scheduling calculation.
  // A date-only customer requirement is positioned by its calendar-day ordinal.
  function model(data, state) {
    const view = global.DEMO_WORKFLOW.project(data, state);
    const rows = Object.values(data.plans).map(plan => {
      const stage = id => plan.stages.find(s => s.id === id);
      const start = stage('resourceQueue')?.start || stage('sampleCheck').start;
      const boundaries = [start, stage('sampleCheck').start, stage('windowUseConfirmation').end, plan.window.at, plan.forecast.delivery];
      return {
        id: plan.id, held: plan.id === 'A' && view.resourceConfirmed,
        invalid: view.forecastReassessmentRequired,
        // Half-open visual intervals share the same boundary. Overnight handoffs,
        // weekends and the readiness confirmation stay inside their parent phase.
        phases: boundaries.slice(0, -1).map((at, i) => ({id:i+1, start:at, end:boundaries[i+1]})).filter(p => !view.forecastReassessmentRequired || p.id !== 4),
        waitStart: stage('windowWait').start,
        report: stage('finalAnalysis').end,
        window: plan.window.at,
        forecast: view.forecastReassessmentRequired ? null : plan.forecast,
        gap: view.forecastReassessmentRequired ? null : global.DEMO_CORE.calendarGap(state.needByLocalDate, plan.forecast.localDate)
      };
    });
    const markers = [
      {id:'hold', at:data.plans.A.holdUntil, status:view.forecastReassessmentRequired ? 'invalidHold' : view.resourceConfirmed ? 'heldUntil' : 'proposedHold', zone:data.calendars.base.timezone},
      {id:'window', at:data.plans.A.window.at, status:'originalWindow', zone:data.calendars.base.timezone},
      {id:'need', at:state.needByLocalDate+'T12:00:00Z', localDate:state.needByLocalDate, status:'needDate', zone:data.baseline.timezone}
    ];
    const points = [...rows.flatMap(r => r.phases.flatMap(p => [ms(p.start),ms(p.end)])), ...markers.map(m => ms(m.at))];
    const first = new Date(Math.min(...points)), last = new Date(Math.max(...points));
    const start = Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),1), end = Date.UTC(last.getUTCFullYear(),last.getUTCMonth()+1,1);
    const monthCount = (last.getUTCFullYear()-first.getUTCFullYear())*12+last.getUTCMonth()-first.getUTCMonth()+1;
    // Bounded tick count even for a distant edited requirement; no business dates change.
    const stride = Math.max(1,Math.ceil(monthCount/6));
    const ticks = [];
    for(let i=0;i<monthCount;i+=stride) ticks.push(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1));
    return {rows, markers, start, end, ticks, invalid:view.forecastReassessmentRequired};
  }
  function render({data,state,text,core,gapMarkup,info}) {
    const m = model(data,state), t = text.delivery.timeline;
    const caption = captionValues(data,text);
    const percent = value => 100*(ms(value)-m.start)/(m.end-m.start);
    const zone = z => z === data.calendars.base.timezone ? text.common.shanghai : text.common.newYork;
    const date = (at,z) => core.formatInstant(at,z,{year:'numeric',hour:undefined,minute:undefined});
    const symbols = ['Ⅰ','Ⅱ','Ⅲ'];
    const refs = m.markers.map((r,i) => `<li data-reference="${r.id}"><b>${symbols[i]}</b> ${esc(t[r.status])}: <time datetime="${esc(r.localDate || r.at)}">${esc(r.localDate ? core.formatLocalDate(r.localDate) : core.formatInstant(r.at,r.zone,{year:'numeric'}))}</time> · ${esc(zone(r.zone))}</li>`).join('');
    const lines = () => m.markers.map((r,i) => `<span class="ft-reference ft-reference-${r.id}" style="left:${percent(r.at)}%" aria-hidden="true"><b>${symbols[i]}</b></span>`).join('');
    const ticks = m.ticks.map((at,i) => {
      const year = new Date(at).getUTCFullYear();
      const yearChanged = i > 0 && year !== new Date(m.ticks[i-1]).getUTCFullYear();
      const month = new Intl.DateTimeFormat(text.meta.locale,{timeZone:'UTC',month:'short'}).format(at);
      const full = new Intl.DateTimeFormat(text.meta.locale,{timeZone:'UTC',month:'short',year:'numeric'}).format(at);
      return `<span style="left:${100*(at-m.start)/(m.end-m.start)}%"><span class="ft-month-desktop">${esc(full)}</span><span class="ft-month-mobile">${yearChanged?`<b class="ft-axis-year">${year}</b>`:''}${esc(month)}</span></span>`;
    }).join('');
    const rows = m.rows.map(row => {
      const plan = data.plans[row.id];
      const phases = row.phases.map(p => {
        const width = percent(p.end)-percent(p.start);
        if (!width) return '';
        const wait = p.id === 3 ? `<span class="ft-pure-wait" style="left:${100*(ms(row.waitStart)-ms(p.start))/(ms(p.end)-ms(p.start))}%" title="${esc(t.pureWait)}"></span>` : '';
        const endZone = p.id === 4 ? data.baseline.timezone : data.calendars.base.timezone;
        const label = `${t.phases[p.id-1]}: ${date(p.start,data.calendars.base.timezone)} ${zone(data.calendars.base.timezone)} → ${date(p.end,endZone)} ${zone(endZone)}`;
        return `<span class="ft-segment ft-phase-${p.id}" data-phase="${p.id}" data-start="${esc(p.start)}" data-end="${esc(p.end)}" style="left:${percent(p.start)}%;width:${width}%" role="img" aria-label="${esc(label)}" title="${esc(label)}">${wait}<b${width<3?' class="ft-small-number"':''}>${p.id}</b></span>`;
      }).join('');
      const result = row.invalid ? `<div class="ft-unknown" data-forecast-unknown="${row.id}"><strong>4 · ${esc(t.phases[3])} — ${esc(text.portal.reassessment)}</strong><span>${esc(t.noEndpoint)}</span></div>` : `<div class="ft-result" data-timeline-result="${row.id}"><span>${esc(text.delivery.forecast)}: <time datetime="${esc(row.forecast.delivery)}">${esc(date(row.forecast.delivery,data.baseline.timezone))}</time> · ${esc(text.common.newYork)}</span>${gapMarkup(plan,state).replace('data-gap=', 'data-timeline-gap=')}</div>`;
      return `<section class="ft-row" data-timeline-plan="${row.id}" data-forecast-valid="${!row.invalid}"><div class="ft-row-heading"><strong>${row.id}</strong><span>${esc(row.invalid ? t.historical : row.held ? t.held : t.conditional)}</span>${plan.queueWorkdays===0?`<span class="ft-zero">1 · ${esc(t.noQueue)}</span>`:''}</div><div class="ft-track">${phases}${lines()}</div><div class="ft-key-dates"><span>${esc(t.fullResults)}: <time datetime="${esc(row.report)}">${esc(date(row.report,data.calendars.base.timezone))}</time> · ${esc(text.common.shanghai)}</span><span>${esc(t.productionWindow)}: <time datetime="${esc(row.window)}">${esc(date(row.window,data.calendars.base.timezone))}</time> · ${esc(text.common.shanghai)}</span></div>${result}</section>`;
    }).join('');
    return `<figure id="forecast-timeline" class="forecast-timeline" data-axis-start="${new Date(m.start).toISOString()}" data-axis-end="${new Date(m.end).toISOString()}"><figcaption><h4>${m.invalid?`${esc(t.historical)} · `:''}${esc(interpolate(t.title,caption))}</h4><p>${esc(interpolate(t.explanation,caption))}</p></figcaption><ol class="ft-legend">${t.phases.map((label,i)=>`<li><span class="ft-swatch ft-phase-${i+1}">${i+1}</span><span class="ft-legend-label">${esc(label)} ${info(`forecast-phase-${i+1}`,label,`<p>${esc(t.phaseDetails[i])}</p>`)}</span></li>`).join('')}</ol><p class="ft-detail-note ft-hatching-note">${esc(t.hatchingNote)}</p><ul class="ft-references">${refs}</ul><div class="ft-axis" aria-hidden="true">${ticks}</div>${rows}<div class="ft-detail-note ft-zone-note"><span>${esc(t.zoneSummary)}</span> ${info('forecast-zones',t.zoneHelp,`<p>${esc(t.zoneDetails)}</p>`)}</div></figure>`;
  }
  global.DEMO_FORECAST = Object.freeze({model,render,captionValues});
})(globalThis);

(function (global) {
  "use strict";
  function exceptions(text, escape) {
    return `<section id="exceptions" class="section"><h2>${text.tour.exceptions}</h2><p>${text.tour.exceptionHint}</p><div class="exception-grid">${Object.entries(text.tour.exceptionNames).map(([id,label])=>`<button class="button button-secondary" data-exception="${id}">${escape(label)}</button>`).join("")}</div></section>`;
  }
  function render({act,state,text,guide,transition,clock,at,loading,escape}) {
    const t=text.tour;
    const next=act===1?2:3;
    const transitionVisible=act===1 || act===2 && state.decision?.authorization;
    return `<aside class="demo-timeline tour-timeline" data-tour-act="${act}"><div class="demo-clock"><strong>${t.title} · ${act}/3 · ${t.actNames[act-1]}</strong>${clock}</div><div class="tour-guidance"><span>${t.aOnly}</span>${state.chapterSeeded?`<span class="data-tag">${t.seededShort}</span>`:""}</div><div class="demo-controls">${guide?`<button class="button button-primary" id="demo-next-step" data-guide-key="${guide.key}" data-guide-role="${guide.role}"${loading?' disabled':''}>${escape(t[guide.key] || text.portal.guides[guide.key] || text.decision.guide[guide.key])}</button>`:""}${transitionVisible?`<button class="button button-primary" id="tour-next-act" data-next-act="${next}"${!transition.allowed||loading?' disabled':''}>${t.nextAct}</button>`:""}<button class="button button-secondary" id="tour-full">${t.full}</button><button class="text-button" id="tour-restart">${t.restart}</button></div>${transitionVisible?`${transition.allowed?`<p id="tour-transition-description">${t['next'+next]} ${at}</p>`:""}${transition.reason?`<p id="tour-blocker" role="status">${t.reasons[transition.reason]}</p>`:""}${transition.reason==='planB'&&!state.decision.tasksCreated?`<button class="button button-secondary" id="tour-choose-a">${t.backA}</button>`:""}`:""}</aside>`;
  }
  global.DEMO_TOUR_VIEW=Object.freeze({render,exceptions});
})(globalThis);

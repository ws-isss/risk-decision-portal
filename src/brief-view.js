(function (global) {
  "use strict";

  function render({ brief, loading = false, state, text, helpers, staleReasons = [], preview = false, copied = false }) {
    if (state.viewer !== "P01" || state.publication?.status !== "published" || state.scene === "prepublication") return "";
    const t = text.brief;
    const { escape } = helpers;
    const heading = `<div class="section-heading"><h2>${t.title}</h2><span class="data-tag">${t.simulated}</span></div>`;
    if (loading || !brief) return `<section id="management-brief" class="section management-brief" aria-busy="${loading}">${heading}<p role="status">${t.generating}</p></section>`;
    const meta = brief.metadata;
    const stale = staleReasons.length > 0 ? `<div id="management-brief-stale" class="brief-stale" role="status"><strong>${t.staleTitle}</strong><ul>${staleReasons.map(key => `<li>${escape(t.staleReasons[key])}</li>`).join("")}</ul></div>` : "";
    const metadata = `<div class="brief-metadata"><span>${t.asOf}: <time datetime="${escape(brief.generatedAt)}">${escape(meta.asOf)}</time></span><span>${t.versions}: ${meta.sourceVersions.map(escape).join(" · ")}</span></div>`;
    const body = preview ? `<div class="brief-recipient-preview"><h3>${t.previewHeading}</h3><p class="decision-note">${t.previewHint}</p><pre id="management-brief-preview" tabindex="0">${escape(global.DEMO_BRIEF.copyText(brief, text, { staleReasons }))}</pre></div>` : `<label class="brief-editor-label" for="management-brief-editor">${t.editLabel}<textarea id="management-brief-editor" rows="24" maxlength="18000">${escape(brief.content)}</textarea></label>`;
    const controls = preview ? `<button id="edit-management-brief" class="button button-secondary">${t.edit}</button><button id="copy-management-brief" class="button button-primary">${t.copy}</button>` : `<button id="preview-management-brief" class="button button-primary">${t.preview}</button>`;
    return `<section id="management-brief" class="section management-brief" data-brief-status="${escape(brief.statusKey)}" data-brief-stale="${staleReasons.length > 0}" data-brief-preview="${preview}">${heading}<p>${t.intro}</p><p class="status">${escape(meta.status)}</p>${brief.edited ? `<span class="data-tag">${t.edited}</span>` : ""}${metadata}${stale}${body}<div class="brief-controls">${controls}<button id="regenerate-management-brief" class="button button-secondary">${t.regenerate}</button></div>${copied ? `<p id="management-brief-copied" role="status">${t.copied}</p>` : ""}</section>`;
  }

  global.DEMO_BRIEF_VIEW = Object.freeze({ render });
})(globalThis);

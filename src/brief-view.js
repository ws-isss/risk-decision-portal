(function (global) {
  "use strict";

  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const inline = value => escapeHtml(value).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  function cells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, "|"));
  }
  function tableStart(lines, index) {
    if (!lines[index]?.trim().startsWith("|") || !lines[index + 1]?.trim().startsWith("|")) return false;
    const headers = cells(lines[index]), separators = cells(lines[index + 1]);
    return headers.length > 1 && headers.length === separators.length && separators.every(value => /^:?-{3,}:?$/.test(value));
  }
  // A small, deliberately limited formatter for editable brief content. Raw HTML,
  // links, images and other Markdown constructs are always displayed as text.
  function renderMarkdown(markdown) {
    const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    for (let index = 0; index < lines.length;) {
      const line = lines[index].trim();
      if (!line) { index++; continue; }
      if (tableStart(lines, index)) {
        const headers = cells(line), rows = [];
        index += 2;
        while (index < lines.length && lines[index].trim().startsWith("|") && cells(lines[index]).length === headers.length) rows.push(cells(lines[index++]));
        html.push(`<div class="brief-table-wrap"><table class="brief-options-table" style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;margin:12px 0"><thead><tr>${headers.map(header => `<th scope="col" style="border:1px solid #cbd1d8;padding:8px;vertical-align:top;background:#f3f5f7">${inline(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell,index) => `<td data-label="${escapeHtml(headers[index])}" style="border:1px solid #cbd1d8;padding:8px;vertical-align:top">${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      } else if (/^-\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^-\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^-\s+/, ""));
        html.push(`<ul style="padding-left:20px;margin:8px 0 14px">${items.map(item => `<li>${inline(item)}</li>`).join("")}</ul>`);
      } else if (/^#{1,3}\s+/.test(line)) {
        html.push(`<p style="margin:0 0 12px"><strong>${inline(line.replace(/^#{1,3}\s+/, ""))}</strong></p>`); index++;
      } else {
        const paragraph = [line]; index++;
        while (index < lines.length && lines[index].trim() && !tableStart(lines,index) && !/^(?:-\s+|#{1,3}\s+)/.test(lines[index].trim())) paragraph.push(lines[index++].trim());
        html.push(`<p style="margin:0 0 12px">${paragraph.map(inline).join("<br>")}</p>`);
      }
    }
    return html.join("\n");
  }

  function copyHtml(brief, text, options = {}) {
    return `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#20262e">${renderMarkdown(global.DEMO_BRIEF.recipientMarkdown(brief,text,options))}</div>`;
  }

  function render({ brief, loading = false, state, text, helpers, staleReasons = [], preview = false, copied = false }) {
    if (!["P01", "P06"].includes(state.viewer) || state.publication?.status !== "published" || state.scene === "prepublication") return "";
    const readonly = state.viewer === "P06";
    if (readonly && !brief) return "";
    const t = text.brief;
    const { escape } = helpers;
    const heading = `<div class="section-heading"><h2>${t.title}</h2><span class="data-tag">${t.simulated}</span></div>`;
    if (!readonly && (loading || !brief)) return `<section id="management-brief" class="section management-brief" aria-busy="${loading}">${heading}<p role="status">${t.generating}</p></section>`;
    const meta = brief.metadata;
    const stale = staleReasons.length > 0 ? `<div id="management-brief-stale" class="brief-stale" role="status"><strong>${readonly ? t.authorizationBriefStale : t.staleTitle}</strong><ul>${staleReasons.map(key => `<li>${escape(t.staleReasons[key])}</li>`).join("")}</ul>${readonly ? `<p>${t.authorizationBriefStaleHint}</p>` : ""}</div>` : "";
    const metadata = `<div class="brief-metadata"><span>${t.asOf}: <time datetime="${escape(brief.generatedAt)}">${escape(meta.asOf)}</time></span><span>${t.versions}: ${meta.sourceVersions.map(escape).join(" · ")}</span></div>`;
    const count = global.DEMO_BRIEF.wordCount(brief,text,{staleReasons});
    const counter = `<p id="management-brief-word-count" class="brief-word-count">${t.wordCount.replace("{count}",count)}</p>`;
    const showPreview = preview || readonly;
    const body = showPreview ? `<div class="brief-recipient-preview"><h3>${readonly ? t.sharedHeading : t.previewHeading}</h3>${readonly ? "" : `<p class="decision-note">${t.previewHint}</p>`}<article id="management-brief-preview" tabindex="0" aria-label="${escape(readonly ? t.sharedHeading : t.previewHeading)}">${renderMarkdown(global.DEMO_BRIEF.recipientMarkdown(brief, text, { staleReasons }))}</article></div>` : `<label class="brief-editor-label" for="management-brief-editor">${t.editLabel}<span class="decision-note">${t.editHint}</span><textarea id="management-brief-editor" rows="12" maxlength="18000">${escape(brief.content)}</textarea></label>`;
    const controls = readonly ? "" : `<div class="brief-controls">${preview ? `<button id="edit-management-brief" class="button button-secondary">${t.edit}</button><button id="copy-management-brief" class="button button-primary">${t.copy}</button>` : `<button id="preview-management-brief" class="button button-primary">${t.preview}</button>`}<button id="regenerate-management-brief" class="button button-secondary">${t.regenerate}</button></div>`;
    const unreviewed = readonly && !brief.previewed ? `<p id="management-brief-unreviewed" class="decision-note" role="status">${t.authorizationBriefUnreviewedHint}</p>` : "";
    return `<section id="management-brief" class="section management-brief" data-brief-status="${escape(brief.statusKey)}" data-brief-stale="${staleReasons.length > 0}" data-brief-preview="${showPreview}" data-brief-readonly="${readonly}">${heading}<p>${readonly ? t.readonlyIntro : t.intro}</p><p class="status">${escape(meta.status)}</p>${brief.edited ? `<span class="data-tag">${t.edited}</span>` : ""}${metadata}${stale}${unreviewed}${body}${counter}${controls}${!readonly && copied ? `<p id="management-brief-copied" role="status">${t.copied}</p>` : ""}</section>`;
  }

  global.DEMO_BRIEF_VIEW = Object.freeze({ render, renderMarkdown, copyHtml });
})(globalThis);

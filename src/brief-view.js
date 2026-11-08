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

  function renderVersionHistory({ attachments, state, text, helpers }) {
    if (!["P01", "P06"].includes(state.viewer) || state.publication?.status !== "published" || state.scene === "prepublication") return "";
    const model = global.DEMO_BRIEF;
    const t = text.brief;
    const { escape } = helpers;
    const currentKey = model.requestKey({ state });
    const groups = [...new Set((attachments || []).map(item => item.requestKey))]
      .map(key => ({ key, history: model.history(attachments, { state, requestKey: key }) }))
      .filter(group => group.history.length)
      .sort((a, b) => (a.key === currentKey ? -1 : b.key === currentKey ? 1 : a.key.localeCompare(b.key)));
    if (!groups.length) return "";
    const contents = groups.map(({ key, history }) => {
      const separator = key.indexOf(":"), kind = key.slice(0, separator), createdAt = key.slice(separator + 1).replace(/:v\d+$/, "");
      const requestName = t.authorizationBasis.requestKinds[kind] + (kind === "main" ? ` · ${text.decision.reviewFlow.version.replace("{version}",key.match(/:v(\d+)$/)?.[1] || 1)}` : "");
      const requestTime = helpers.requestTime ? helpers.requestTime(createdAt) : createdAt;
      const entries = history.map((item, index) => {
        const captured = model.localize(item.brief, text);
        const attachedAt = helpers.requestTime ? helpers.requestTime(item.attachedAt) : item.attachedAtLabel;
        const next = history[index + 1];
        const status = next ? t.historySuperseded.replace("{version}", next.version) : t.historyCurrent;
        const title = t.historyContent.replace("{version}", item.version);
        return `<details class="brief-history-version" data-brief-history-version="${escape(item.version)}"><summary><strong>v${escape(item.version)}</strong><span>${t.attachedBy}: ${escape(item.attachedBy.name)}</span><span>${t.attachedAt}: <time datetime="${escape(item.attachedAt)}">${escape(attachedAt)}</time></span><span class="brief-history-status">${escape(status)}</span></summary><div class="brief-history-body"><div class="brief-metadata"><span>${t.asOf}: <time datetime="${escape(captured.generatedAt)}">${escape(captured.metadata.asOf)}</time></span><span>${t.versions}: ${captured.metadata.sourceVersions.map(escape).join(" · ")}</span></div><article class="brief-history-content" data-brief-history-content="${escape(item.version)}" tabindex="0" aria-label="${escape(title)}">${renderMarkdown(model.recipientMarkdown(captured, text))}</article></div></details>`;
      }).join("");
      return `<div class="brief-history-group" data-brief-history-request="${escape(key)}" data-brief-request-kind="${escape(kind)}" data-current-request="${key === currentKey}"><h3>${escape(requestName)}<span>${escape(t.historyRequestCreated.replace("{time}", requestTime))}</span>${key === currentKey ? `<span>${t.historyCurrentRequest}</span>` : ""}</h3>${entries}</div>`;
    }).join("");
    const count = groups.reduce((sum, group) => sum + group.history.length, 0);
    return `<details id="brief-version-history" class="brief-version-history"><summary>${t.historyTitle.replace("{count}", count)}</summary><p class="decision-note">${t.historyHint}</p>${contents}</details>`;
  }

  function render({ brief, attachment = null, attachments = [], loading = false, state, text, helpers, staleReasons = [], attachmentStaleReasons = [], preview = false, copied = false }) {
    if (!["P01", "P06"].includes(state.viewer) || state.publication?.status !== "published" || state.scene === "prepublication") return "";
    const readonly = state.viewer === "P06";
    const t = text.brief;
    const { escape } = helpers;
    const model = global.DEMO_BRIEF;
    brief = model.localize(brief, text);
    if (attachment) attachment = { ...attachment, brief: model.localize(attachment.brief, text) };
    const heading = `<div class="section-heading"><h2>${t.title}</h2><span class="data-tag">${t.simulated}</span></div>`;
    const history = renderVersionHistory({ attachments, state, text, helpers });
    if (readonly && !attachment) return history ? `<section id="management-brief" class="section management-brief" data-brief-readonly="true">${heading}<p>${t.historyOnlyIntro}</p>${history}</section>` : "";
    const attachedAt = attachment && (helpers.requestTime ? helpers.requestTime(attachment.attachedAt) : attachment.attachedAtLabel);
    const attachedMetadata = attachment ? `<div class="brief-metadata brief-attachment-metadata"><span>${t.version}: v${escape(attachment.version)}</span><span>${t.attachedBy}: ${escape(attachment.attachedBy.name)}</span><span>${t.attachedAt}: <time datetime="${escape(attachment.attachedAt)}">${escape(attachedAt)}</time></span><span>${t.asOf}: <time datetime="${escape(attachment.brief.generatedAt)}">${escape(attachment.brief.metadata.asOf)}</time></span></div>` : "";
    const attachmentStatus = !readonly && attachment ? `<aside id="brief-attachment-status" class="authorization-brief-status" data-brief-version="${escape(attachment.version)}" data-brief-stale="${attachmentStaleReasons.length > 0}" role="status"><strong>${attachmentStaleReasons.length ? t.authorizationBriefStale : t.attachmentCurrent.replace("{version}",attachment.version)}</strong>${attachedMetadata}${attachmentStaleReasons.length ? `<ul>${attachmentStaleReasons.map(key => `<li>${escape(t.staleReasons[key])}</li>`).join("")}</ul>` : ""}<p>${t.attachmentFrozenHint}</p></aside>` : "";
    if (!readonly && (loading || !brief)) return `<section id="management-brief" class="section management-brief" aria-busy="${loading}">${heading}<p>${t.intro}</p>${attachmentStatus}${history}<p role="status">${loading ? t.generating : t.noPrivateDraft}</p></section>`;
    // Elena only receives the captured attachment. The private editor can keep
    // changing without changing this rendered source or its original metadata.
    if (readonly) { brief = attachment.brief; staleReasons = attachmentStaleReasons; }
    const meta = brief.metadata;
    const stale = staleReasons.length > 0 ? `<div id="management-brief-stale" class="brief-stale" role="status"><strong>${readonly ? t.authorizationBriefStale : t.staleTitle}</strong><ul>${staleReasons.map(key => `<li>${escape(t.staleReasons[key])}</li>`).join("")}</ul>${readonly ? `<p>${t.authorizationBriefStaleHint}</p>` : ""}</div>` : "";
    const metadata = `${readonly ? attachedMetadata : ""}<div class="brief-metadata">${readonly ? "" : `<span>${t.asOf}: <time datetime="${escape(brief.generatedAt)}">${escape(meta.asOf)}</time></span>`}<span>${t.versions}: ${meta.sourceVersions.map(escape).join(" · ")}</span></div>`;
    const count = model.wordCount(brief,text,{staleReasons});
    const counter = `<p id="management-brief-word-count" class="brief-word-count">${t.wordCount.replace("{count}",count)}</p>`;
    const showPreview = preview || readonly;
    const authoredHint = brief.edited && brief.authoredLanguage && brief.authoredLanguage !== brief.language ? `<p class="decision-note">${t.authoredLanguageHint}</p>` : "";
    const body = showPreview ? `<div class="brief-recipient-preview"><h3>${readonly ? t.sharedHeading : t.previewHeading}</h3>${readonly ? "" : `<p class="decision-note">${t.previewHint}</p>`}<article id="management-brief-preview" tabindex="0"${readonly ? ` data-brief-version="${escape(attachment.version)}"` : ""} aria-label="${escape(readonly ? t.sharedHeading : t.previewHeading)}">${renderMarkdown(model.recipientMarkdown(brief, text, { staleReasons }))}</article></div>` : `<label class="brief-editor-label" for="management-brief-editor">${t.editLabel}<span class="decision-note">${t.editHint}</span><textarea id="management-brief-editor" rows="12" maxlength="18000">${escape(brief.content)}</textarea></label>`;
    const alreadyAttached = !readonly && attachment && model.isAttachedDraft(brief,attachment);
    const noRequest = !readonly && !model.requestKey({state});
    const attachmentBlocked = alreadyAttached || noRequest || staleReasons.length || !brief.previewed;
    const attachHint = !readonly && preview ? noRequest ? t.attachRequiresRequest : staleReasons.length ? t.attachRequiresCurrent : !brief.previewed ? t.attachRequiresPreview : alreadyAttached ? t.attachmentFrozenHint : t.attachHint : "";
    const attachButton = !readonly && preview ? `<button id="attach-management-brief" class="button button-primary"${attachmentBlocked ? " disabled" : ""} aria-describedby="brief-attach-hint">${alreadyAttached ? t.attachAlready.replace("{version}",attachment.version) : attachment ? t.reattach : t.attach}</button>` : "";
    const controls = readonly ? "" : `<div class="brief-controls">${preview ? `<button id="edit-management-brief" class="button button-secondary">${t.edit}</button>${attachButton}<button id="copy-management-brief" class="button button-secondary">${t.copy}</button>` : `<button id="preview-management-brief" class="button button-primary">${t.preview}</button>`}<button id="regenerate-management-brief" class="button button-secondary">${t.regenerate}</button></div>${attachHint ? `<p id="brief-attach-hint" class="decision-note">${attachHint}</p>` : ""}`;
    return `<section id="management-brief" class="section management-brief" data-brief-status="${escape(brief.statusKey)}" data-brief-stale="${staleReasons.length > 0}" data-brief-preview="${showPreview}" data-brief-readonly="${readonly}"${readonly ? ` data-brief-version="${escape(attachment.version)}"` : ""}>${heading}<p>${readonly ? t.readonlyIntro : t.intro}</p>${attachmentStatus}${readonly ? "" : history}<p class="status">${escape(meta.status)}</p>${brief.edited ? `<span class="data-tag">${t.edited}</span>` : ""}${metadata}${readonly ? history : ""}${stale}${authoredHint}${body}${counter}${controls}${!readonly && copied ? `<p id="management-brief-copied" role="status">${t.copied}</p>` : ""}</section>`;
  }

  global.DEMO_BRIEF_VIEW = Object.freeze({ render, renderVersionHistory, renderMarkdown, copyHtml });
})(globalThis);

// Software register page. Field definitions and compliance rules live in
// register-data.js (window.RegisterModel); this file is the page itself:
// views, saving, and Excel/CSV import and export.
(function () {
  "use strict";

  // ── Everything start-up uses is declared here, above init() ──────────────
  // (init() runs on the last line of this file. An earlier tracker bug read a
  // const declared below its load call, and saved data was lost on reload.)
  const RM = window.RegisterModel;
  const AM = window.AssessmentModel;
  const SL = window.SchoolLookup;
  const HIDDEN_SHEET = "_software_register";
  const HIDDEN_MARKER = "software-register-snapshot";
  const CELL_CHUNK = 30000;                       // Excel cells hold at most 32,767 characters
  const MAX_HIDDEN_JSON = 5 * 1024 * 1024;
  const MAX_CSV_BYTES = 10 * 1024 * 1024;
  const RAG_CLASS = { Red: "red", Amber: "amber", Green: "green", Removed: "met" };
  const VIEW_TITLES = {
    dashboard: "Software Register", list: "Software list", edit: "Edit software", quick: "Quick add and CSV import",
    school: "School details", guide: "Field guide and rules"
  };
  // Dashboard "needs attention" lists: [title, reason codes]
  const ATTENTION = [
    ["Unsupported or past the support end date", ["unsupported"]],
    ["No support end date recorded", ["no-support-date"]],
    ["Cloud services without MFA", ["cloud-no-mfa"]],
    ["Personal data without a DPIA or data processing agreement", ["no-dpia", "no-dpa"]],
    ["Unlicensed, or no update arrangements", ["unlicensed", "no-updates"]],
    ["Licence renewals due", ["renewal-due", "renewal-passed"]],
    ["Support ending soon", ["support-ending"]],
    ["Reviews overdue", ["review-overdue"]]
  ];

  let reg = RM.emptyState();
  let view = "dashboard";
  let editId = null;
  let filters = { q: "", category: "", type: "", status: "", rag: "" };
  let sort = { key: "name", dir: 1 };
  let saveTimer = null;
  let profileConflict = null;

  const $ = id => document.getElementById(id);

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Escape for HTML text and attribute values (including inside <textarea>)
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // Only http(s) links are ever put into an href
  function safeHref(v) {
    try {
      const u = new URL(String(v || "").trim());
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
    } catch (e) { return ""; }
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 4000);
  }
  const today = () => RM.isoToday();
  const fmt = iso => RM.formatDate(iso) || "";
  const findItem = id => reg.items.find(e => e.id === id);
  const displayName = e => (e.name || "").trim() || "Untitled software";
  const ragPill = r => `<span class="rag-pill ${RAG_CLASS[r] || "not-set"}">${esc(r)}</span>`;

  // ── Saving ─────────────────────────────────────────────────────────────────
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(RM.STATE_KEY, JSON.stringify(reg));
      return true;
    } catch (e) {
      toast("Could not save in this browser. Export to Excel to keep a copy.");
      return false;
    }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (saveNow()) {
        const ind = $("save-indicator");
        clearTimeout(save.shown);
        ind.classList.add("saved");
        save.shown = setTimeout(() => ind.classList.remove("saved"), 2000);
      }
    }, 300);
  }

  // ── Shared school profile ─────────────────────────────────────────────────
  // Fill an empty school name and URN from the school chosen on the home page.
  // If the register holds a different school, offer to switch instead.
  function syncFromProfile() {
    const profile = SL && SL.loadProfile();
    if (!profile) return;
    const s = reg.school;
    if ((s.name || s.urn) && SL.differs(s.urn, s.name, profile)) {
      if (s.keptURN !== String(profile.urn)) profileConflict = profile;
      return;
    }
    let changed = false;
    if (!s.name && profile.name) { s.name = String(profile.name); changed = true; }
    if (!s.urn && profile.urn) { s.urn = String(profile.urn); changed = true; }
    if (changed) saveNow();
  }
  function profileNotice() {
    if (!profileConflict) return "";
    const p = profileConflict, s = reg.school;
    return `<div class="profile-notice" role="status">
      The school chosen on the home page is <strong>${esc(p.name)}</strong> (URN ${esc(p.urn)}), but this register holds
      <strong>${esc(s.name || "another school")}</strong>${s.urn ? ` (URN ${esc(s.urn)})` : ""}.
      Switching changes the school details only. Your software list stays as it is.
      <div class="reg-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(s.name || "current details")}</button>
      </div>
    </div>`;
  }

  // ── Dialog (confirmations and import choice) ──────────────────────────────
  // Resolves with the value of the button chosen, or "cancel".
  function ask(title, body, buttons) {
    return new Promise(resolve => {
      const d = $("reg-dialog");
      $("reg-dialog-title").textContent = title;
      const b = $("reg-dialog-body");
      b.textContent = "";
      (Array.isArray(body) ? body : [body]).forEach(text => {
        const p = document.createElement("p");
        p.textContent = text;
        b.appendChild(p);
      });
      const wrap = $("reg-dialog-buttons");
      wrap.textContent = "";
      const done = v => { d.close(); resolve(v); };
      buttons.forEach(([label, value, cls]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn " + (cls || "btn-secondary");
        btn.textContent = label;
        btn.dataset.value = value;
        btn.addEventListener("click", () => done(value));
        wrap.appendChild(btn);
      });
      d.oncancel = e => { e.preventDefault(); done("cancel"); };
      d.showModal();
      const first = wrap.querySelector("button");
      if (first) first.focus();
    });
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  function navigate(v, id) {
    leaveEdit();
    if (v === "add") {
      const e = RM.blankEntry();
      reg.items.push(e);
      v = "edit"; id = e.id;
    }
    view = v;
    editId = v === "edit" ? id : null;
    if (view === "edit" && !findItem(editId)) view = "list";
    render();
    window.scrollTo(0, 0);
    $("sidebar").classList.remove("open");
    const h = $("content").querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // An entry left completely empty (Add, then away) is removed again
  function leaveEdit() {
    if (view !== "edit" || !editId) return;
    const e = findItem(editId);
    if (e && isBlank(e)) {
      reg.items = reg.items.filter(x => x !== e);
    }
    saveNow();
  }
  function isBlank(e) {
    const b = RM.blankEntry();
    return RM.FIELDS.every(f => {
      const v = e[f.key], d = b[f.key];
      return Array.isArray(v) ? v.length === 0 : String(v || "") === String(d || "");
    });
  }

  function render() {
    const views = { dashboard: viewDashboard, list: viewList, edit: viewEdit, quick: viewQuick, school: viewSchool, guide: viewGuide };
    $("content").innerHTML = (views[view] || viewDashboard)();
    $("topbar-title").textContent = VIEW_TITLES[view] || "Software Register";
    document.title = (VIEW_TITLES[view] && view !== "dashboard" ? VIEW_TITLES[view] + " – " : "") + "Software Register";
    $("sidebar-nav").querySelectorAll("a[data-view]").forEach(a => {
      const on = a.dataset.view === view || (view === "edit" && a.dataset.view === "list");
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function viewDashboard() {
    const t = today();
    const evals = reg.items.map(e => ({ e, r: RM.evaluate(e, t) }));
    const counts = { Red: 0, Amber: 0, Green: 0, Removed: 0 };
    evals.forEach(x => counts[x.r.rag]++);
    const s = reg.school;
    const schoolLine = s.name || s.urn
      ? `<p class="reg-school">School: <strong>${esc(s.name)}</strong>${s.urn ? ` &nbsp;|&nbsp; URN: <strong>${esc(s.urn)}</strong>` : ""}</p>`
      : `<p class="reg-school"><a href="#" data-view="school">Add your school's details</a></p>`;

    if (!reg.items.length) {
      return `<div class="reg-page">
        <h2>Software register</h2>
        ${profileNotice()}${schoolLine}
        <div class="card card-body">
          <p style="margin-top:0">Your register is empty. Record every piece of software and cloud service your school uses, so you can show it is licensed, supported, kept up to date and safe for your data.</p>
          <div class="reg-actions">
            <a href="#" class="btn btn-primary" data-view="quick">Quick add common school software</a>
            <a href="#" class="btn btn-secondary" data-view="add">Add software by hand</a>
            <button type="button" class="btn btn-secondary" data-action="import">Import an Excel register</button>
          </div>
        </div>
        ${evidenceBlock()}
      </div>`;
    }

    const cards = ["Red", "Amber", "Green", "Removed"].map(k => `
      <a class="dash-card reg-count" href="#" data-filter-rag="${k}">
        <div class="dash-card-title"><span class="rag-dot ${RAG_CLASS[k]}"></span>${k === "Removed" ? "Removed" : esc(k)}</div>
        <div class="reg-count-num">${counts[k]}</div>
        <div class="reg-count-sub">${{ Red: "need action now", Amber: "need attention soon", Green: "no issues found", Removed: "kept for the record" }[k]}</div>
      </a>`).join("");

    const lists = ATTENTION.map(([title, codes]) => {
      const rows = [];
      evals.forEach(({ e, r }) => r.reasons.filter(x => codes.includes(x.code)).forEach(x =>
        rows.push(`<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(x.level)} <span>${esc(x.text)}</span></li>`)));
      if (!rows.length) return "";
      return `<details class="reg-attention" ${rows.length <= 8 ? "open" : ""}>
        <summary>${esc(title)} <span class="reg-badge">${rows.length}</span></summary>
        <ul>${rows.join("")}</ul></details>`;
    }).join("");

    const active = reg.items.filter(e => e.status !== "Removed");
    const tally = (key, opts) => {
      const c = {};
      active.forEach(e => { const k = e[key] || "Not recorded"; c[k] = (c[k] || 0) + 1; });
      return opts.concat(["Not recorded"]).filter(o => c[o]).map(o =>
        `<tr><td>${esc(o)}</td><td>${c[o]}</td></tr>`).join("") || `<tr><td colspan="2">None</td></tr>`;
    };

    return `<div class="reg-page">
      <h2>Software register</h2>
      ${profileNotice()}${schoolLine}
      <p class="reg-muted">${reg.items.length} item${reg.items.length === 1 ? "" : "s"} recorded, ${active.length} not removed. Checked against today's date, ${esc(fmt(t))}.
        <a href="#" data-view="guide">How the checks work</a></p>
      <div class="dashboard-grid reg-counts">${cards}</div>
      <h3>Needs attention</h3>
      ${lists || `<p class="reg-muted">Nothing needs attention. Keep reviewing the register whenever something changes.</p>`}
      <div class="reg-two-col">
        <div><h3>By category</h3><div class="card reg-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Category</th><th scope="col">Items</th></tr></thead><tbody>${tally("category", RM.CATEGORIES)}</tbody></table></div></div>
        <div><h3>By type</h3><div class="card reg-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Type</th><th scope="col">Items</th></tr></thead><tbody>${tally("type", RM.TYPES)}</tbody></table></div></div>
      </div>
      ${evidenceBlock()}
    </div>`;
  }

  function evidenceBlock() {
    const link = id => { const s = RM.SOURCES[id]; return `<a class="guidance-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`; };
    return `<div class="card card-body reg-evidence">
      <h3 style="margin-top:0">Using this register as evidence</h3>
      <p>Export the register to Excel and refer to it from your trackers:</p>
      <ul>
        <li><a href="dfe.html">DfE standards tracker</a>: ${link("dfe-licence")}, and ${link("dfe-registers")} (the register covers the software parts of the contracts and information asset registers).</li>
        <li><a href="ce.html">Cyber Essentials tracker</a>: Security update management (sum-1 to sum-4: licensed and supported, unsupported software removed, automatic updates, 14-day fixes), User access control (uac-4: MFA for every cloud service) and Scope (scope-3: every cloud service listed).</li>
      </ul>
    </div>`;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  const LIST_COLS = [
    ["name", "Name"], ["vendor", "Vendor"], ["category", "Category"], ["type", "Type"], ["status", "Status"],
    ["supportEnd", "Support ends"], ["renewalDate", "Renewal"], ["rag", "Check"]
  ];
  const RAG_ORDER = { Red: 0, Amber: 1, Green: 2, Removed: 3 };

  function viewList() {
    const opt = (list, cur, all) => `<option value="">${esc(all)}</option>` +
      list.map(o => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
    return `<div class="reg-page reg-wide">
      <h2>Software list</h2>
      <div class="reg-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="add">&#43; Add software</a>
        <a href="#" class="btn btn-secondary btn-sm" data-view="quick">Quick add</a>
      </div>
      <div class="reg-filters" role="search">
        <div class="form-field"><label for="f-q">Search name or vendor</label>
          <input type="search" id="f-q" value="${esc(filters.q)}" autocomplete="off" /></div>
        <div class="form-field"><label for="f-category">Category</label>
          <select id="f-category" data-filter="category">${opt(RM.CATEGORIES, filters.category, "All categories")}</select></div>
        <div class="form-field"><label for="f-type">Type</label>
          <select id="f-type" data-filter="type">${opt(RM.TYPES, filters.type, "All types")}</select></div>
        <div class="form-field"><label for="f-status">Status</label>
          <select id="f-status" data-filter="status">${opt(RM.STATUSES, filters.status, "All statuses")}</select></div>
        <div class="form-field"><label for="f-rag">Check</label>
          <select id="f-rag" data-filter="rag">${opt(["Red", "Amber", "Green", "Removed"], filters.rag, "All results")}</select></div>
      </div>
      <p class="reg-muted" id="list-count" role="status" aria-live="polite"></p>
      <div class="card reg-table-wrap" id="list-table"></div>
    </div>`;
  }

  function renderListTable() {
    const t = today();
    const q = filters.q.trim().toLowerCase();
    let rows = reg.items.map(e => ({ e, r: RM.evaluate(e, t) })).filter(({ e, r }) =>
      (!q || (e.name + " " + e.vendor).toLowerCase().includes(q)) &&
      (!filters.category || e.category === filters.category) &&
      (!filters.type || e.type === filters.type) &&
      (!filters.status || e.status === filters.status) &&
      (!filters.rag || r.rag === filters.rag));
    const key = sort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "rag") { x = RAG_ORDER[a.r.rag]; y = RAG_ORDER[b.r.rag]; }
      else { x = String(a.e[key] || "").toLowerCase(); y = String(b.e[key] || "").toLowerCase(); }
      // Blanks sort last in both directions
      if (x === "" && y !== "") return 1;
      if (y === "" && x !== "") return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || displayName(a.e).localeCompare(displayName(b.e));
    });
    $("list-count").textContent = `Showing ${rows.length} of ${reg.items.length} item${reg.items.length === 1 ? "" : "s"}.`;
    const head = LIST_COLS.map(([k, label]) => {
      const s = sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none";
      const arrow = s === "ascending" ? "&#9650;" : s === "descending" ? "&#9660;" : "";
      return `<th scope="col" aria-sort="${s}"><button type="button" class="reg-sort" data-sort="${k}">${esc(label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("") + `<th scope="col">Actions</th>`;
    const body = rows.map(({ e, r }) => `<tr>
      <td><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a></td>
      <td>${esc(e.vendor)}</td><td>${esc(e.category)}</td><td>${esc(e.type)}</td><td>${esc(e.status)}</td>
      <td class="reg-nowrap">${esc(fmt(e.supportEnd))}</td><td class="reg-nowrap">${esc(fmt(e.renewalDate))}</td>
      <td>${ragPill(r.rag)}${r.reasons.length ? `<span class="reg-reason-count">${r.reasons.length} issue${r.reasons.length === 1 ? "" : "s"}</span>` : ""}</td>
      <td class="reg-row-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${esc(e.id)}" aria-label="Edit ${esc(displayName(e))}">Edit</button>
        <button type="button" class="btn btn-secondary btn-sm" data-duplicate="${esc(e.id)}" aria-label="Duplicate ${esc(displayName(e))}">Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(e.id)}" aria-label="Delete ${esc(displayName(e))}">Delete</button>
      </td></tr>`).join("");
    $("list-table").innerHTML = `<table class="summary-table reg-table"><thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LIST_COLS.length + 1}">${reg.items.length ? "No software matches these filters." : "No software recorded yet."}</td></tr>`}</tbody></table>`;
    $("list-table").querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      sort = sort.key === b.dataset.sort ? { key: sort.key, dir: -sort.dir } : { key: b.dataset.sort, dir: 1 };
      renderListTable();
      const again = $("list-table").querySelector(`[data-sort="${b.dataset.sort}"]`);
      if (again) again.focus();
    }));
    bindRowActions($("list-table"));
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  function fieldInput(f, e) {
    const id = "fld-" + f.key;
    const describedBy = `help-${f.key} why-${f.key}`;
    const v = e[f.key];
    if (f.type === "checks") {
      return f.options.map((o, i) => `<label class="reg-check"><input type="checkbox" data-key="${f.key}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""} id="${id}-${i}" /> ${esc(o)}</label>`).join("");
    }
    if (f.type === "select") {
      return `<select id="${id}" data-key="${f.key}" aria-describedby="${describedBy}"><option value="">Not recorded</option>${f.options.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea id="${id}" data-key="${f.key}" rows="4" aria-describedby="${describedBy}">${esc(v)}</textarea>`;
    }
    const type = f.type === "date" ? "date" : f.type === "url" ? "url" : "text";
    return `<input type="${type}" id="${id}" data-key="${f.key}" value="${esc(v)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} aria-describedby="${describedBy}" ${f.key === "name" ? "required" : ""} />`;
  }

  function whyLine(f) {
    if (!f.refs.length) return "";
    return "Why: " + f.refs.map(id => {
      const s = RM.SOURCES[id];
      return `<a href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`;
    }).join(" · ");
  }

  function viewEdit() {
    const e = findItem(editId);
    if (!e) return "<p>Not found.</p>";
    const groups = RM.GROUPS.map(g => {
      const fields = g.fields.map(f => {
        const wide = f.type === "textarea" || f.type === "checks" || f.key === "name";
        const badge = f.basis === "required"
          ? `<span class="reg-basis req">Required by a standard</span>` : `<span class="reg-basis good">Good practice</span>`;
        const label = f.type === "checks"
          ? `<fieldset class="reg-checks" aria-describedby="help-${f.key} why-${f.key}"><legend>${esc(f.label)} ${badge}</legend>${fieldInput(f, e)}</fieldset>`
          : `<label for="fld-${f.key}">${esc(f.label)} ${badge}</label>${fieldInput(f, e)}`;
        const link = f.type === "url" ? `<div class="reg-link-preview" id="preview-${f.key}">${linkPreview(e[f.key])}</div>` : "";
        return `<div class="form-field reg-field${wide ? " full-width" : ""}" data-wrap="${f.key}">
          ${label}${link}
          <p class="reg-help" id="help-${f.key}">${esc(f.help)}${f.showIfText ? ` <em>(${esc(f.showIfText)})</em>` : ""}</p>
          <p class="reg-why" id="why-${f.key}">${whyLine(f)}</p>
        </div>`;
      }).join("");
      return `<fieldset class="card reg-group" id="group-${g.id}">
        <legend>${esc(g.title)}</legend>
        ${g.intro ? `<p class="reg-muted">${esc(g.intro)}</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>`;
    }).join("");
    return `<div class="reg-page">
      <p><a href="#" data-view="list">&#8592; Back to the software list</a></p>
      <h2 id="edit-title">${esc(displayName(e))}</h2>
      <p class="reg-muted">Changes save automatically. Fields marked <span class="reg-basis req">Required by a standard</span> support a DfE standard, Cyber Essentials or data protection law; the others are good practice. Fields that don't apply are hidden.</p>
      <div id="rag-panel" class="card card-body reg-rag-panel" aria-live="polite"></div>
      ${groups}
      <div class="reg-actions">
        <a href="#" class="btn btn-primary" data-view="list">Done</a>
        <button type="button" class="btn btn-secondary" data-duplicate="${esc(e.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-delete="${esc(e.id)}">Delete</button>
      </div>
    </div>`;
  }

  function linkPreview(v) {
    const h = safeHref(v);
    if (h) return `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">Open link<span class="visually-hidden"> (opens in a new tab)</span></a>`;
    return String(v || "").trim() ? `<span class="reg-warn">Only links starting with https:// or http:// can be opened.</span>` : "";
  }

  function updateRagPanel(e) {
    const p = $("rag-panel");
    if (!p) return;
    const r = RM.evaluate(e, today());
    const items = r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("");
    p.className = "card card-body reg-rag-panel " + (RAG_CLASS[r.rag] || "");
    p.innerHTML = `<div class="reg-rag-head"><strong>Check:</strong> ${ragPill(r.rag)}</div>` +
      (r.rag === "Removed" ? `<p class="reg-muted">Removed software is kept for the record and not checked.</p>`
        : items ? `<ul class="reg-reasons">${items}</ul>` : `<p class="reg-muted">No issues found.</p>`);
  }

  function updateVisibility(e) {
    RM.FIELDS.forEach(f => {
      const w = $("content").querySelector(`[data-wrap="${f.key}"]`);
      if (w) w.hidden = !!(f.showIf && !f.showIf(e));
    });
  }

  // Take a value from a form control and store it, validated for its field type
  function setField(e, key, value) {
    const f = RM.FIELD_BY_KEY[key];
    if (!f) return;
    const clean = RM.sanitiseEntry({ [key]: value });
    e[key] = clean[key];
    if (key === "status" && !value) e.status = "";
  }

  // ── Quick add and CSV ──────────────────────────────────────────────────────
  const nameKey = (name, vendor) => (String(name || "").trim() + "|" + String(vendor || "").trim()).toLowerCase();
  function existingNames() {
    return new Set(reg.items.map(e => String(e.name || "").trim().toLowerCase()));
  }

  function viewQuick() {
    const have = existingNames();
    const rows = RM.STARTERS.map((s, i) => {
      const exists = have.has(s.name.toLowerCase());
      return `<li><label class="reg-check"><input type="checkbox" data-starter="${i}" ${exists ? "disabled" : ""} />
        ${esc(s.name)} <span class="reg-muted">${esc(s.category)}${exists ? " · already in your register" : ""}</span></label></li>`;
    }).join("");
    return `<div class="reg-page">
      <h2>Quick add</h2>
      <p>Tick the software your school uses. Each is added with its name and category only: fill in the versions, dates and other details from your own records and suppliers.</p>
      <div class="card card-body">
        <p style="margin-top:0"><button type="button" class="btn btn-secondary btn-sm" id="btn-select-all">Select all</button></p>
        <ul class="reg-starters">${rows}</ul>
        <button type="button" class="btn btn-primary" id="btn-quick-add">Add selected</button>
      </div>
      <h2>Import a list from CSV</h2>
      <div class="card card-body">
        <p style="margin-top:0">Add a basic list from a spreadsheet saved as CSV. Use a header row with the columns <strong>Name</strong>, <strong>Vendor</strong> and <strong>Category</strong> (vendor and category are optional). Software already in the register (same name and vendor) is skipped.</p>
        <button type="button" class="btn btn-secondary" id="btn-csv">&#8593; Choose a CSV file</button>
      </div>
    </div>`;
  }

  function addStarters(indexes) {
    const have = existingNames();
    let added = 0;
    indexes.forEach(i => {
      const s = RM.STARTERS[i];
      if (!s || have.has(s.name.toLowerCase()) || reg.items.length >= RM.MAX_ITEMS) return;
      reg.items.push(RM.sanitiseEntry({ name: s.name, category: s.category, status: "In use" }));
      have.add(s.name.toLowerCase());
      added++;
    });
    saveNow();
    return added;
  }

  // Minimal CSV parser (RFC 4180: quoted fields, doubled quotes, CRLF)
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function importCSV(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name || "")) { toast(`Import failed: "${file.name}" is not a .csv file.`); return; }
    if (file.size > MAX_CSV_BYTES) { toast(`Import failed: "${file.name}" is over 10 MB, so it was refused.`); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const rows = parseCSV(String(ev.target.result || "").replace(/^﻿/, "")).filter(r => r.some(c => c.trim()));
        if (!rows.length) throw new Error("the file is empty");
        const head = rows[0].map(c => c.trim().toLowerCase());
        let cols = { name: 0, vendor: 1, category: 2 }, start = 0;
        if (head.includes("name")) {
          cols = { name: head.indexOf("name"), vendor: head.findIndex(h => h === "vendor" || h === "supplier" || h === "vendor or supplier"), category: head.indexOf("category") };
          start = 1;
        }
        const have = new Set(reg.items.map(e => nameKey(e.name, e.vendor)));
        const add = [];
        let skipped = 0;
        rows.slice(start).forEach(r => {
          const cell = k => (cols[k] >= 0 && r[cols[k]] != null ? AM.limitText(r[cols[k]]).trim() : "");
          const name = cell("name").slice(0, 300);
          if (!name) return;
          const vendor = cell("vendor").slice(0, 300);
          const k = nameKey(name, vendor);
          if (have.has(k)) { skipped++; return; }
          have.add(k);
          const catText = cell("category");
          const category = RM.CATEGORIES.find(c => c.toLowerCase() === catText.toLowerCase()) || (catText ? "Other" : "");
          add.push(RM.sanitiseEntry({ name, vendor, category, status: "In use" }));
        });
        const room = RM.MAX_ITEMS - reg.items.length;
        if (!add.length) { toast(`Nothing to add from ${file.name}${skipped ? `: ${skipped} already in the register` : ""}.`); return; }
        const n = Math.min(add.length, room);
        const choice = await ask("Add software from CSV?", [
          `${n} item${n === 1 ? "" : "s"} will be added to your register from ${file.name}.`,
          skipped ? `${skipped} already in the register will be skipped.` : "",
          add.length > room ? `Only ${room} more can be added: the register holds up to ${RM.MAX_ITEMS} items.` : ""
        ].filter(Boolean), [["Add them", "add", "btn-primary"], ["Cancel", "cancel"]]);
        if (choice !== "add") return;
        reg.items.push(...add.slice(0, room));
        saveNow();
        navigate("list");
        toast(`Added ${n} item${n === 1 ? "" : "s"} from ${file.name}.`);
      } catch (err) { toast("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  }

  // ── School details ─────────────────────────────────────────────────────────
  function viewSchool() {
    return `<div class="reg-page" style="max-width:680px">
      <h2>School details</h2>
      ${profileNotice()}
      <p class="reg-muted">Filled in from the school you choose on the <a href="index.html">home page</a>. Anything you type here is kept. Changes save automatically.</p>
      <div class="form-grid">
        <div class="form-field full-width"><label for="sch-name">School, college or trust name</label>
          <input type="text" id="sch-name" data-school="name" value="${esc(reg.school.name)}" /></div>
        <div class="form-field"><label for="sch-urn">URN</label>
          <input type="text" id="sch-urn" data-school="urn" value="${esc(reg.school.urn)}" inputmode="numeric" /></div>
      </div>
    </div>`;
  }

  // ── Field guide ────────────────────────────────────────────────────────────
  function viewGuide() {
    const th = RM.THRESHOLDS;
    const rules = ["Red", "Amber", "Green", "Removed"].map(k => `<div class="rag-key-row">${ragPill(k)}<ul class="reg-rule-list">${RM.RULES[k].map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
    const rows = RM.GROUPS.map(g => g.fields.map(f => `<tr>
      <td>${esc(g.title)}</td><td>${esc(f.label)}</td>
      <td>${f.basis === "required" ? "Required by a standard" : "Good practice"}</td>
      <td>${esc(f.help)}${f.showIfText ? ` <em>Applies to: ${esc(f.showIfText)}.</em>` : ""}</td>
      <td>${whyLine(f).replace(/^Why: /, "") || "–"}</td></tr>`).join("")).join("");
    return `<div class="reg-page reg-wide">
      <h2>Field guide and rules</h2>
      <h3>How each item is checked</h3>
      <p class="reg-muted">Checks use today's date. Thresholds: support ending within ${th.supportEndWarnMonths} months, renewal within ${th.renewalWarnDays} days, review older than ${th.reviewOverdueMonths} months. Any Red reason makes the item Red; otherwise any Amber reason makes it Amber.</p>
      <div class="rag-key">${rules}</div>
      ${evidenceBlock()}
      <h3>Fields</h3>
      <p class="reg-muted">The full reasoning and source quotes are in <a href="https://github.com/jonesj1994/DFEStandards/blob/main/docs/SOFTWARE-REGISTER.md" target="_blank" rel="noopener">SOFTWARE-REGISTER.md</a>.</p>
      <div class="card reg-table-wrap"><table class="summary-table reg-guide">
        <thead><tr><th scope="col">Area</th><th scope="col">Field</th><th scope="col">Basis</th><th scope="col">What it means</th><th scope="col">Requirement it supports</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>`;
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function bindRowActions(root) {
    root.querySelectorAll("[data-edit]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("edit", a.dataset.edit); }));
    root.querySelectorAll("[data-duplicate]").forEach(b => b.addEventListener("click", () => duplicate(b.dataset.duplicate)));
    root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => remove(b.dataset.delete)));
  }

  function bind() {
    const c = $("content");
    c.querySelectorAll("a[data-view]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate(a.dataset.view); }));
    c.querySelectorAll("[data-filter-rag]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      filters = { q: "", category: "", type: "", status: "", rag: a.dataset.filterRag };
      navigate("list");
    }));
    c.querySelectorAll("[data-action=import]").forEach(b => b.addEventListener("click", () => $("file-input").click()));
    if (view === "dashboard") bindRowActions(c);

    const sw = $("btn-profile-switch");
    if (sw) {
      sw.addEventListener("click", () => {
        reg.school.name = String(profileConflict.name || "");
        reg.school.urn = String(profileConflict.urn || "");
        reg.school.keptURN = "";
        profileConflict = null;
        saveNow(); render(); toast("School details updated.");
      });
      $("btn-profile-keep").addEventListener("click", () => {
        reg.school.keptURN = String(profileConflict.urn || "");
        profileConflict = null;
        saveNow(); render();
      });
    }

    if (view === "list") {
      $("f-q").addEventListener("input", ev => { filters.q = ev.target.value; renderListTable(); });
      c.querySelectorAll("[data-filter]").forEach(s => s.addEventListener("change", () => { filters[s.dataset.filter] = s.value; renderListTable(); }));
      renderListTable();
    }

    if (view === "edit") {
      const e = findItem(editId);
      bindRowActions(c.querySelector(".reg-actions:last-child"));
      c.querySelectorAll("[data-key]").forEach(el => {
        const handler = () => {
          const key = el.dataset.key;
          if (el.type === "checkbox") {
            setField(e, key, Array.from(c.querySelectorAll(`input[type=checkbox][data-key="${key}"]:checked`)).map(x => x.value));
          } else {
            setField(e, key, el.value);
          }
          if (key === "name") $("edit-title").textContent = displayName(e);
          if (RM.FIELD_BY_KEY[key].type === "url") $("preview-" + key).innerHTML = linkPreview(e[key]);
          updateVisibility(e);
          updateRagPanel(e);
          save();
        };
        el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date" ? "change" : "input", handler);
      });
      updateVisibility(e);
      updateRagPanel(e);
    }

    if (view === "quick") {
      $("btn-select-all").addEventListener("click", () => c.querySelectorAll("[data-starter]:not(:disabled)").forEach(x => { x.checked = true; }));
      $("btn-quick-add").addEventListener("click", () => {
        const picked = Array.from(c.querySelectorAll("[data-starter]:checked:not(:disabled)")).map(x => Number(x.dataset.starter));
        if (!picked.length) { toast("Tick the software you want to add first."); return; }
        const n = addStarters(picked);
        navigate("list");
        toast(`Added ${n} item${n === 1 ? "" : "s"}. Open each one to fill in its details.`);
      });
      $("btn-csv").addEventListener("click", () => $("csv-input").click());
    }

    if (view === "school") {
      c.querySelectorAll("[data-school]").forEach(el => el.addEventListener("input", () => {
        reg.school[el.dataset.school] = AM.limitText(el.value).slice(0, 300);
        save();
      }));
    }
  }

  function duplicate(id) {
    const e = findItem(id);
    if (!e || reg.items.length >= RM.MAX_ITEMS) return;
    leaveEdit();
    const copy = RM.sanitiseEntry(JSON.parse(JSON.stringify(e)));
    copy.id = RM.newId();
    copy.name = (e.name || "Untitled software") + " (copy)";
    reg.items.splice(reg.items.indexOf(e) + 1, 0, copy);
    saveNow();
    view = "list";               // so navigate's leaveEdit does nothing
    navigate("edit", copy.id);
    toast("Copy made. Change the details that differ.");
  }

  async function remove(id) {
    const e = findItem(id);
    if (!e) return;
    const choice = await ask("Delete this software?", [
      `"${displayName(e)}" will be removed from the register. This cannot be undone.`,
      "If the software has just stopped being used, you could set its status to Removed instead, to keep the record."
    ], [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    reg.items = reg.items.filter(x => x.id !== id);
    saveNow();
    if (view === "edit") { view = "list"; editId = null; }
    navigate(view);
    toast(`Deleted "${displayName(e)}".`);
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  const cellValue = (f, v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : v);

  function exportExcel() {
    leaveEdit();
    const t = today();
    const wb = XLSX.utils.book_new();
    const sum = RM.summarise(reg, t);

    const info = [
      ["Software Register"],
      ["School", reg.school.name],
      ["URN", reg.school.urn],
      ["Exported on", t],
      ["Items", reg.items.length],
      ["Red", sum.Red], ["Amber", sum.Amber], ["Green", sum.Green], ["Removed", sum.Removed],
      [],
      ["Checks", `Red and Amber are worked out on the export date. Thresholds: support ending within ${RM.THRESHOLDS.supportEndWarnMonths} months, renewal within ${RM.THRESHOLDS.renewalWarnDays} days, review older than ${RM.THRESHOLDS.reviewOverdueMonths} months.`],
      ["Import", "Import this file on the Software Register page to restore it exactly."]
    ];
    const wsI = XLSX.utils.aoa_to_sheet(info);
    wsI["!cols"] = [{ wch: 14 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsI, "Info");

    const header = ["ID"].concat(RM.FIELDS.map(f => f.label), ["Check", "Reasons"]);
    const rows = [header];
    reg.items.forEach(e => {
      const r = RM.evaluate(e, t);
      rows.push([e.id].concat(RM.FIELDS.map(f => cellValue(f, e[f.key])), [r.rag, r.reasons.map(x => `${x.level}: ${x.text}`).join("\n")]));
    });
    const wsR = XLSX.utils.aoa_to_sheet(rows);
    wsR["!cols"] = header.map((h, i) => ({ wch: i === 0 ? 20 : h === "Reasons" ? 70 : h === "Notes" ? 50 : Math.max(14, Math.min(30, h.length)) }));
    wsR["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 1), c: header.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsR, "Register");

    const att = [["Software", "Vendor", "Check", "Issue", "Business owner", "Technical owner"]];
    reg.items.forEach(e => RM.evaluate(e, t).reasons.forEach(x => att.push([e.name, e.vendor, x.level, x.text, e.businessOwner, e.technicalOwner])));
    if (att.length === 1) att.push(["Nothing needs attention."]);
    const wsA = XLSX.utils.aoa_to_sheet(att);
    wsA["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 90 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Needs attention");

    const guide = [["Area", "Field", "Basis", "What it means", "Applies to", "Requirement it supports", "Source links"]];
    RM.FIELDS.forEach(f => guide.push([
      f.groupTitle, f.label, f.basis === "required" ? "Required by a standard" : "Good practice", f.help, f.showIfText || "All software",
      f.refs.map(id => RM.SOURCES[id].short).join("; "), f.refs.map(id => RM.SOURCES[id].url).filter((u, i, a) => a.indexOf(u) === i).join(" ")
    ]));
    guide.push([]);
    Object.keys(RM.RULES).forEach(k => RM.RULES[k].forEach(r => guide.push(["Check rules", k, "", r])));
    const wsG = XLSX.utils.aoa_to_sheet(guide);
    wsG["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 22 }, { wch: 70 }, { wch: 30 }, { wch: 80 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsG, "Field guide");

    writeHiddenSheet(wb, { kind: HIDDEN_MARKER, schemaVersion: RM.SCHEMA_VERSION, exportedAt: new Date().toISOString(), school: reg.school, items: reg.items });

    const name = reg.school.name ? "_" + reg.school.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) : "";
    const file = `Software_Register${name}_${t}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file);
  }

  // Hidden sheet for an exact round trip, chunked like assessment-model.js's
  // "_assessment" sheet. Row 1: [marker, schema version, number of chunks].
  function writeHiddenSheet(wb, obj) {
    const json = JSON.stringify(obj);
    const rows = [[HIDDEN_MARKER, RM.SCHEMA_VERSION, 0]];
    for (let i = 0; i < json.length; i += CELL_CHUNK) rows.push([json.slice(i, i + CELL_CHUNK)]);
    rows[0][2] = rows.length - 1;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), HIDDEN_SHEET);
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Sheets = wb.Workbook.Sheets || [];
    const idx = wb.SheetNames.indexOf(HIDDEN_SHEET);
    while (wb.Workbook.Sheets.length <= idx) wb.Workbook.Sheets.push({});
    wb.Workbook.Sheets[idx].Hidden = 1;
  }

  // Returns the raw object, or null if there is no hidden sheet. Throws if it is damaged.
  function readHiddenSheet(wb) {
    const ws = wb.Sheets[HIDDEN_SHEET];
    if (!ws) return null;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    if (!rows.length || rows[0][0] !== HIDDEN_MARKER) throw new Error("not in the expected format");
    const n = Number(rows[0][2]);
    if (!Number.isInteger(n) || n < 1 || n > Math.ceil(MAX_HIDDEN_JSON / CELL_CHUNK)) throw new Error("too large or damaged");
    let json = "";
    for (const r of rows.slice(1, 1 + n)) {
      json += String(r[0] == null ? "" : r[0]);
      if (json.length > MAX_HIDDEN_JSON) throw new Error("too large");
    }
    const obj = JSON.parse(json);
    if (!obj || obj.kind !== HIDDEN_MARKER) throw new Error("not a software register");
    return obj;
  }

  // ── Excel import ───────────────────────────────────────────────────────────
  // Hidden sheet first (exact), then the visible Register sheet (older or
  // hand-edited files). Tracker exports are refused with a clear message.
  function readWorkbook(wb) {
    const notes = [];
    if (wb.Sheets[HIDDEN_SHEET]) {
      try {
        const raw = readHiddenSheet(wb);
        if (raw.schemaVersion > RM.SCHEMA_VERSION) notes.push("the file was made by a newer version of the register; some details may be missing");
        return { state: RM.sanitiseState(raw), from: "hidden", notes };
      } catch (e) {
        notes.push("the hidden sheet was damaged (" + e.message + "), so the visible Register sheet was used");
      }
    }
    if (wb.Sheets.Register) return { state: readVisible(wb), from: "visible", notes };
    // Not a register: say what it is if we can
    let framework = "";
    try {
      const snap = AM && AM.readSnapshotSheet(XLSX, wb);
      if (snap && AM.isFramework(snap.framework)) framework = snap.framework;
    } catch (e) { /* not a tracker snapshot */ }
    if (!framework && wb.Sheets.Info && wb.Sheets.Info.A1) {
      const a1 = String(wb.Sheets.Info.A1.v || "");
      if (/digital (&|and) technology standards/i.test(a1)) framework = "dfe";
      else if (/cyber essentials/i.test(a1)) framework = "cyber-essentials";
    }
    if (framework) {
      const f = AM.FRAMEWORKS[framework];
      throw new Error(`this file is a ${f.label} export, not a software register. Open it in the ${f.shortLabel} tracker instead.`);
    }
    throw new Error("no software register found in this file (it needs a sheet called Register)");
  }

  const norm = s => String(s == null ? "" : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Excel date serials and dd/mm/yyyy text become ISO dates
  function importDate(v) {
    if (typeof v === "number" && isFinite(v) && v > 0 && v < 200000) {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return RM.validDate(`${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`);
    }
    const s = String(v == null ? "" : v).trim();
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (uk) return RM.validDate(`${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`);
    return RM.validDate(s.slice(0, 10));
  }

  function readVisible(wb) {
    const s = RM.emptyState();
    if (wb.Sheets.Info) {
      XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1, raw: true, defval: "" }).forEach(r => {
        if (norm(r[0]) === "school") s.school.name = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "urn") s.school.urn = AM.limitText(r[1]).slice(0, 300);
      });
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Register, { header: 1, raw: true, defval: "" });
    const hi = rows.findIndex(r => r.some(c => norm(c) === "name"));
    if (hi < 0) throw new Error("the Register sheet has no Name column");
    const map = rows[hi].map(h => {
      const n = norm(h);
      if (n === "id") return "id";
      const f = RM.FIELDS.find(x => norm(x.label) === n || norm(x.key) === n);
      return f ? f.key : null;
    });
    const items = [];
    rows.slice(hi + 1).forEach(r => {
      if (items.length >= RM.MAX_ITEMS) return;
      const raw = {};
      map.forEach((key, i) => {
        if (!key || r[i] === "" || r[i] == null) return;
        const f = RM.FIELD_BY_KEY[key];
        if (key === "id") raw.id = String(r[i]);
        else if (f.type === "date") raw[key] = importDate(r[i]);
        else raw[key] = AM.limitText(r[i]);
      });
      if (!String(raw.name || "").trim()) return;
      items.push(raw);
    });
    s.items = items;
    return RM.sanitiseState(s);
  }

  function importExcel(file) {
    try { AM.checkImportFile(file); }
    catch (err) { toast("Import failed: " + err.message); return; }
    leaveEdit();
    const reader = new FileReader();
    reader.onload = async ev => {
      let parsed;
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), AM.SAFE_XLSX_READ);
        parsed = readWorkbook(wb);
      } catch (err) { toast("Import failed: " + err.message); return; }
      const n = parsed.state.items.length, m = reg.items.length;
      const lines = [`${file.name} has ${n} item${n === 1 ? "" : "s"}${parsed.state.school.name ? ` for ${parsed.state.school.name}` : ""}. Your register has ${m}.`];
      if (parsed.from === "visible") lines.push("This file has no hidden copy, so it was read from the visible Register sheet. Check the details after importing.");
      parsed.notes.forEach(x => lines.push("Note: " + x + "."));
      let choice;
      if (!m) {
        choice = await ask("Import this register?", lines, [["Import", "replace", "btn-primary"], ["Cancel", "cancel"]]);
      } else {
        lines.push("Merge: add the file's items to your register, updating items with the same ID, or the same name and vendor.");
        lines.push(`Replace: remove your ${m} current item${m === 1 ? "" : "s"} and use the file's instead. This cannot be undone, so export your register first if you might need it.`);
        choice = await ask("Import: merge or replace?", lines, [["Merge", "merge", "btn-primary"], ["Replace", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      }
      if (choice === "cancel") return;
      applyImport(parsed.state, choice);
      view = "dashboard";
      render();
      toast(`Imported ${n} item${n === 1 ? "" : "s"} (${choice === "merge" ? "merged" : "replaced"}).`);
    };
    reader.readAsArrayBuffer(file);
  }

  function applyImport(incoming, mode) {
    if (mode === "replace") {
      const current = reg.school;
      reg = incoming;
      // A file with no school details keeps the current ones
      if (!reg.school.name && !reg.school.urn) reg.school = { name: current.name, urn: current.urn, keptURN: "" };
      reg.school.keptURN = current.keptURN || "";
    } else {
      incoming.items.forEach(e => {
        let i = reg.items.findIndex(x => x.id === e.id);
        if (i < 0) i = reg.items.findIndex(x => nameKey(x.name, x.vendor) === nameKey(e.name, e.vendor));
        if (i >= 0) reg.items[i] = Object.assign(e, { id: reg.items[i].id });
        else if (reg.items.length < RM.MAX_ITEMS) {
          if (reg.items.some(x => x.id === e.id)) e.id = RM.newId();
          reg.items.push(e);
        }
      });
      if (!reg.school.name) reg.school.name = incoming.school.name;
      if (!reg.school.urn) reg.school.urn = incoming.school.urn;
    }
    profileConflict = null;
    syncFromProfile();
    saveNow();
  }

  // ── Start-up ───────────────────────────────────────────────────────────────
  function init() {
    reg = RM.loadState();
    syncFromProfile();
    $("btn-export").addEventListener("click", exportExcel);
    $("btn-import").addEventListener("click", () => $("file-input").click());
    $("file-input").addEventListener("change", ev => {
      if (ev.target.files[0]) importExcel(ev.target.files[0]);
      ev.target.value = "";
    });
    $("csv-input").addEventListener("change", ev => {
      if (ev.target.files[0]) importCSV(ev.target.files[0]);
      ev.target.value = "";
    });
    $("menu-toggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    $("sidebar-nav").addEventListener("click", ev => {
      const a = ev.target.closest("a[data-view]");
      if (!a) return;
      ev.preventDefault();
      navigate(a.dataset.view);
    });
    // Save any pending change when the page is closed or reloaded
    window.addEventListener("pagehide", () => { if (saveTimer) saveNow(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && saveTimer) saveNow(); });
    render();
  }

  init();
})();

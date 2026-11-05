// Backup and disaster recovery register page. Field definitions and checks
// live in backup-data.js (window.BackupModel); this file is the page itself:
// views, saving, and Excel/CSV import and export.
(function () {
  "use strict";

  // ── Everything start-up uses is declared here, above init() ──────────────
  // (init() runs on the last line of this file. An earlier tracker bug read a
  // const declared below its load call, and saved data was lost on reload.)
  const BM = window.BackupModel;
  const AM = window.AssessmentModel;
  const SL = window.SchoolLookup;
  const RM = window.RegisterModel;               // software register (optional, read only)
  const TITLE = "Backup and Disaster Recovery Register";
  const HIDDEN_SHEET = "_backup_register";
  const HIDDEN_MARKER = "backup-register-snapshot";
  const SHEET_ITEMS = "Backups";
  const SHEET_LOG = "Restore log";
  const SHEET_PLAN = "DR plan";
  const CELL_CHUNK = 30000;                       // Excel cells hold at most 32,767 characters
  const MAX_HIDDEN_JSON = 5 * 1024 * 1024;
  const MAX_CSV_BYTES = 10 * 1024 * 1024;
  const RAG_CLASS = { Red: "red", Amber: "amber", Green: "green", Retired: "met" };
  const RAG_ORDER = { Red: 0, Amber: 1, Green: 2, Retired: 3 };
  const PRIORITY_ORDER = { Critical: 0, High: 1, "": 2, Normal: 3 };
  // Other registers' hidden sheets, so their files get a clear message
  const OTHER_REGISTERS = [
    ["_software_register", "Software Register"],
    ["_hardware_register", "Hardware and Asset Register"],
    ["_accounts_register", "User Accounts and Access Privileges Register"],
    ["_incident_log", "Cyber Incident and Breach Log"]
  ];
  const VIEW_TITLES = {
    dashboard: TITLE, list: "Backup list", edit: "Edit backup", log: "Restore test and DR log", logedit: "Edit log entry",
    plan: "Disaster recovery plan", quick: "Quick add and CSV import", school: "School details", guide: "Field guide and rules"
  };
  // Dashboard "needs attention" lists: [title, reason codes]
  const ATTENTION = [
    ["Not backed up, or not known", ["no-backup"]],
    ["Relying on the supplier's standard retention", ["supplier-only"]],
    ["No offline or off-network copy", ["no-offline"]],
    ["Fewer than 3 copies, or no off-site copy", ["copies", "no-offsite"]],
    ["Restore tests missing, old or failed", ["restore-test", "restore-failed", "restore-partial"]],
    ["Restores slower than the recovery time", ["rto-exceeded"]],
    ["Backup success not monitored", ["not-monitored", "success-check"]],
    ["Physical media not secure", ["media-insecure"]],
    ["Not encrypted, or no immutable copy", ["not-encrypted", "not-immutable"]],
    ["Recovery time, recovery point or frequency", ["no-objectives", "frequency"]],
    ["Owner, priority, DR plan or review", ["no-owner", "no-priority", "not-in-plan", "review-overdue"]]
  ];
  const LIST_COLS = [
    ["name", "System or data"], ["category", "Category"], ["priority", "Priority"], ["runBy", "Run by"],
    ["frequency", "How often"], ["offlineCopy", "Offline copy"], ["lastTest", "Last restore test"], ["rag", "Check"]
  ];
  const LOG_COLS = [["date", "Date"], ["type", "Type"], ["systems", "Systems"], ["result", "Result"], ["hours", "Time taken"], ["actionStatus", "Actions"]];

  let reg = BM.emptyState();
  let view = "dashboard";
  let editId = null;
  let filters = { q: "", category: "", priority: "", status: "", rag: "" };
  let logFilters = { q: "", type: "", result: "" };
  let sort = { key: "priority", dir: 1 };
  let logSort = { key: "date", dir: -1 };
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
  const today = () => BM.isoToday();
  const fmt = iso => BM.formatDate(iso) || "";
  const findItem = id => reg.items.find(e => e.id === id);
  const findLog = id => reg.log.find(e => e.id === id);
  const displayName = e => (e.name || "").trim() || "Untitled system";
  const logName = x => `${fmt(x.date) || "No date"} · ${x.type || "Log entry"}`;
  const ragPill = r => `<span class="rag-pill ${RAG_CLASS[r] || "not-set"}">${esc(r)}</span>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
  const systemNames = ids => ids.map(id => { const e = findItem(id); return e ? displayName(e) : ""; }).filter(Boolean);
  const softwareNames = () => {
    try {
      return RM ? RM.loadState().items.filter(e => e.status !== "Removed").map(e => String(e.name || "").trim()).filter(Boolean) : [];
    } catch (e) { return []; }
  };

  // ── Saving ─────────────────────────────────────────────────────────────────
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(BM.STATE_KEY, JSON.stringify(reg));
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
        ind.classList.add("saved");
        setTimeout(() => ind.classList.remove("saved"), 2000);
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
      Switching changes the school details only. Your backups, log and plan stay as they are.
      <div class="bk-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(s.name || "current details")}</button>
      </div>
    </div>`;
  }

  // ── Dialog (confirmations and import choice) ──────────────────────────────
  // Resolves with the value of the button chosen, or "cancel".
  function ask(title, body, buttons) {
    return new Promise(resolve => {
      const d = $("bk-dialog");
      $("bk-dialog-title").textContent = title;
      const b = $("bk-dialog-body");
      b.textContent = "";
      (Array.isArray(body) ? body : [body]).forEach(text => {
        const p = document.createElement("p");
        p.textContent = text;
        b.appendChild(p);
      });
      const wrap = $("bk-dialog-buttons");
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
      const e = BM.blankEntry();
      reg.items.push(e);
      v = "edit"; id = e.id;
    } else if (v === "addlog") {
      const x = BM.blankLog();
      x.date = today();
      if (id && findItem(id)) x.systems = [id];
      reg.log.unshift(x);
      v = "logedit"; id = x.id;
    }
    view = v;
    editId = v === "edit" || v === "logedit" ? id : null;
    if (view === "edit" && !findItem(editId)) view = "list";
    if (view === "logedit" && !findLog(editId)) view = "log";
    render();
    window.scrollTo(0, 0);
    $("sidebar").classList.remove("open");
    const h = $("content").querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // A row left completely empty (Add, then away) is removed again
  function leaveEdit() {
    if (view === "edit" && editId) {
      const e = findItem(editId);
      if (e && isBlank(e, BM.FIELDS, BM.blankEntry())) reg.items = reg.items.filter(x => x !== e);
      saveNow();
    } else if (view === "logedit" && editId) {
      const x = findLog(editId);
      const blank = BM.blankLog();
      blank.date = x ? x.date : "";
      if (x && isBlank(x, BM.LOG_FIELDS, blank)) reg.log = reg.log.filter(y => y !== x);
      saveNow();
    }
  }
  function isBlank(e, fields, b) {
    return fields.every(f => {
      const v = e[f.key], d = b[f.key];
      return Array.isArray(v) ? v.length === 0 : String(v || "") === String(d || "");
    });
  }

  function render() {
    const views = {
      dashboard: viewDashboard, list: viewList, edit: viewEdit, log: viewLog, logedit: viewLogEdit,
      plan: viewPlan, quick: viewQuick, school: viewSchool, guide: viewGuide
    };
    $("content").innerHTML = (views[view] || viewDashboard)();
    $("topbar-title").textContent = VIEW_TITLES[view] || TITLE;
    document.title = (VIEW_TITLES[view] && view !== "dashboard" ? VIEW_TITLES[view] + " – " : "") + "Backup and DR Register";
    const navFor = { edit: "list", logedit: "log" };
    $("sidebar-nav").querySelectorAll("a[data-view]").forEach(a => {
      const on = a.dataset.view === view || a.dataset.view === navFor[view];
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function schoolLine() {
    const s = reg.school;
    return s.name || s.urn
      ? `<p class="bk-school">School: <strong>${esc(s.name)}</strong>${s.urn ? ` &nbsp;|&nbsp; URN: <strong>${esc(s.urn)}</strong>` : ""}</p>`
      : `<p class="bk-school"><a href="#" data-view="school">Add your school's details</a></p>`;
  }
  function credentialsNote() {
    return `<p class="bk-secret" role="note"><strong>Never record passwords, encryption keys or recovery codes here.</strong>
      Record only <em>where</em> they are kept (for example "sealed envelope in the head's safe" or "IT provider's password vault"),
      on the <a href="#" data-view="plan">disaster recovery plan</a> page or in each backup's Security section.</p>`;
  }

  function viewDashboard() {
    const t = today();
    const evals = reg.items.map(e => ({ e, r: BM.evaluate(e, t, reg.log) }));
    const counts = { Red: 0, Amber: 0, Green: 0, Retired: 0 };
    evals.forEach(x => counts[x.r.rag]++);
    const planEval = BM.evaluatePlan(reg, t);

    if (!reg.items.length && !reg.log.length) {
      return `<div class="bk-page">
        <h2>Backup and disaster recovery register</h2>
        ${profileNotice()}${schoolLine()}
        <div class="card card-body">
          <p style="margin-top:0">Your register is empty. Record each system and set of data your school relies on, how it is backed up, and when restores were last tested, so you know you can recover after a cyber attack, fire or flood.</p>
          <div class="bk-actions">
            <a href="#" class="btn btn-primary" data-view="quick">Quick add common school systems</a>
            <a href="#" class="btn btn-secondary" data-view="add">Add a system by hand</a>
            <button type="button" class="btn btn-secondary" data-action="import">Import an Excel register</button>
          </div>
        </div>
        ${credentialsNote()}
        ${evidenceBlock()}
      </div>`;
    }

    const cards = ["Red", "Amber", "Green", "Retired"].map(k => `
      <a class="dash-card bk-count" href="#" data-filter-rag="${k}">
        <div class="dash-card-title"><span class="rag-dot ${RAG_CLASS[k]}"></span>${esc(k)}</div>
        <div class="bk-count-num">${counts[k]}</div>
        <div class="bk-count-sub">${{ Red: "need action now", Amber: "need attention soon", Green: "no issues found", Retired: "kept for the record" }[k]}</div>
      </a>`).join("");

    const lists = ATTENTION.map(([title, codes]) => {
      const rows = [];
      evals.forEach(({ e, r }) => r.reasons.filter(x => codes.includes(x.code)).forEach(x =>
        rows.push(`<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(x.level)} <span>${esc(x.text)}</span></li>`)));
      if (!rows.length) return "";
      return `<details class="bk-attention" ${rows.length <= 8 ? "open" : ""}>
        <summary>${esc(title)} <span class="bk-badge">${rows.length}</span></summary>
        <ul>${rows.join("")}</ul></details>`;
    }).join("");

    const openLogs = reg.log.filter(BM.logNeedsAttention);
    const logList = openLogs.length ? `<details class="bk-attention" open>
        <summary>Restore tests with open actions <span class="bk-badge">${openLogs.length}</span></summary>
        <ul>${openLogs.map(x => `<li><a href="#" data-logedit="${esc(x.id)}">${esc(logName(x))}</a> ${x.result ? ragPill(x.result === "Failed" ? "Red" : "Amber") : ""}
          <span>${esc(systemNames(x.systems).join(", ") || x.whatRestored || "")}</span></li>`).join("")}</ul></details>` : "";

    const planBlock = `<div class="card card-body bk-rag-panel ${RAG_CLASS[planEval.rag]}">
        <div class="bk-rag-head"><strong>Disaster recovery plan:</strong> ${ragPill(planEval.rag)}
          <a href="#" data-view="plan" class="bk-inline-link">Open the plan details</a></div>
        ${planEval.reasons.length ? `<ul class="bk-reasons">${planEval.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("")}</ul>`
          : `<p class="bk-muted">No issues found.</p>`}
      </div>`;

    // Recovery order: active systems by priority, with their targets and last test
    const order = evals.filter(x => x.r.rag !== "Retired").sort((a, b) =>
      (PRIORITY_ORDER[a.e.priority] - PRIORITY_ORDER[b.e.priority]) || displayName(a.e).localeCompare(displayName(b.e)));
    const orderRows = order.map(({ e, r }) => {
      const lr = BM.lastRestore(e, reg.log);
      return `<tr><td><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a></td><td>${esc(e.priority || "Not set")}</td>
        <td>${esc(e.rto || "–")}</td><td>${esc(e.rpo || "–")}</td>
        <td class="bk-nowrap">${lr ? esc(fmt(lr.date)) + (lr.result ? " · " + esc(lr.result) : "") : "None"}</td><td>${ragPill(r.rag)}</td></tr>`;
    }).join("");

    const sum = BM.summarise(reg, t);
    return `<div class="bk-page">
      <h2>Backup and disaster recovery register</h2>
      ${profileNotice()}${schoolLine()}
      <p class="bk-muted">${plural(reg.items.length, "system")} recorded, ${sum.active} in use · ${plural(reg.log.length, "log entry", "log entries")}${sum.lastTest ? ` · last restore test ${esc(fmt(sum.lastTest))}` : ""}.
        Checked against today's date, ${esc(fmt(t))}. <a href="#" data-view="guide">How the checks work</a></p>
      <div class="dashboard-grid bk-counts">${cards}</div>
      <div class="bk-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="addlog">&#43; Log a restore test</a>
        <a href="#" class="btn btn-secondary btn-sm" data-view="add">&#43; Add a system</a>
      </div>
      <h3>Disaster recovery plan</h3>
      ${planBlock}
      <h3>Needs attention</h3>
      ${lists || logList ? lists + logList : `<p class="bk-muted">No backups need attention. Keep testing restores every term.</p>`}
      <h3>Recovery order</h3>
      <p class="bk-muted">Systems in the order to recover them, with how long you can be without each one and how much work you could lose.</p>
      <div class="card bk-table-wrap"><table class="summary-table bk-table bk-order">
        <thead><tr><th scope="col">System or data</th><th scope="col">Priority</th><th scope="col">Can be without it for</th><th scope="col">Work we could lose</th><th scope="col">Last restore test</th><th scope="col">Check</th></tr></thead>
        <tbody>${orderRows || `<tr><td colspan="6">No systems in use.</td></tr>`}</tbody></table></div>
      ${credentialsNote()}
      ${evidenceBlock()}
    </div>`;
  }

  function evidenceBlock() {
    const link = id => { const s = BM.SOURCES[id]; return `<a class="guidance-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`; };
    return `<div class="card card-body bk-evidence">
      <h3 style="margin-top:0">Using this register as evidence</h3>
      <p>Export the register to Excel and refer to it from your trackers:</p>
      <ul>
        <li><a href="dfe.html">DfE standards tracker</a>: ${link("dfe-backup")} (cyber-6), ${link("dfe-continuity")} (leadership-3) and ${link("dfe-cloud-backup")} (cloud-5).</li>
        <li><a href="ce.html">Cyber Essentials tracker</a>: backups are recommended but not assessed (rec-1).</li>
        <li>Risk Protection Arrangement (RPA) members: ${link("rpa-cyber")}. The backup condition is the DfE "3 copies, 2 devices, 1 off-site" rule, and you must be able to show you meet it when you claim.</li>
        <li><a href="register.html">Software register</a>: use the same system names so the two registers match.</li>
      </ul>
    </div>`;
  }

  // ── Backup list ────────────────────────────────────────────────────────────
  const opt = (list, cur, all) => `<option value="">${esc(all)}</option>` +
    list.map(o => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");

  function viewList() {
    return `<div class="bk-page bk-wide">
      <h2>Backup list</h2>
      <div class="bk-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="add">&#43; Add a system</a>
        <a href="#" class="btn btn-secondary btn-sm" data-view="quick">Quick add</a>
      </div>
      <div class="bk-filters" role="search">
        <div class="form-field"><label for="f-q">Search name, owner or method</label>
          <input type="search" id="f-q" value="${esc(filters.q)}" autocomplete="off" /></div>
        <div class="form-field"><label for="f-category">Category</label>
          <select id="f-category" data-filter="category">${opt(BM.CATEGORIES, filters.category, "All categories")}</select></div>
        <div class="form-field"><label for="f-priority">Priority</label>
          <select id="f-priority" data-filter="priority">${opt(BM.PRIORITIES, filters.priority, "All priorities")}</select></div>
        <div class="form-field"><label for="f-status">Status</label>
          <select id="f-status" data-filter="status">${opt(BM.STATUSES, filters.status, "All statuses")}</select></div>
        <div class="form-field"><label for="f-rag">Check</label>
          <select id="f-rag" data-filter="rag">${opt(["Red", "Amber", "Green", "Retired"], filters.rag, "All results")}</select></div>
      </div>
      <p class="bk-muted" id="list-count" role="status" aria-live="polite"></p>
      <div class="card bk-table-wrap" id="list-table"></div>
    </div>`;
  }

  // Sort helper: blanks last in both directions, then by a name
  function compare(x, y, dir, nameA, nameB) {
    if (x === "" && y !== "") return 1;
    if (y === "" && x !== "") return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * dir || nameA.localeCompare(nameB);
  }
  function sortHead(cols, s, attr) {
    return cols.map(([k, label]) => {
      const st = s.key === k ? (s.dir > 0 ? "ascending" : "descending") : "none";
      const arrow = st === "ascending" ? "&#9650;" : st === "descending" ? "&#9660;" : "";
      return `<th scope="col" aria-sort="${st}"><button type="button" class="bk-sort" ${attr}="${k}">${esc(label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("") + `<th scope="col">Actions</th>`;
  }
  function rowActions(kind, id, name) {
    const a = kind === "log" ? ["data-logedit", "data-logduplicate", "data-logdelete"] : ["data-edit", "data-duplicate", "data-delete"];
    return `<td class="bk-row-actions">
      <button type="button" class="btn btn-secondary btn-sm" ${a[0]}="${esc(id)}" aria-label="Edit ${esc(name)}">Edit</button>
      <button type="button" class="btn btn-secondary btn-sm" ${a[1]}="${esc(id)}" aria-label="Duplicate ${esc(name)}">Duplicate</button>
      <button type="button" class="btn btn-danger btn-sm" ${a[2]}="${esc(id)}" aria-label="Delete ${esc(name)}">Delete</button>
    </td>`;
  }

  function renderListTable() {
    const t = today();
    const q = filters.q.trim().toLowerCase();
    const rows = reg.items.map(e => ({ e, r: BM.evaluate(e, t, reg.log), lr: BM.lastRestore(e, reg.log) })).filter(({ e, r }) =>
      (!q || [e.name, e.softwareName, e.dataOwner, e.method, e.coverage].join(" ").toLowerCase().includes(q)) &&
      (!filters.category || e.category === filters.category) &&
      (!filters.priority || e.priority === filters.priority) &&
      (!filters.status || e.status === filters.status) &&
      (!filters.rag || r.rag === filters.rag));
    const key = sort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "rag") { x = RAG_ORDER[a.r.rag]; y = RAG_ORDER[b.r.rag]; }
      else if (key === "priority") { x = a.e.priority ? PRIORITY_ORDER[a.e.priority] : ""; y = b.e.priority ? PRIORITY_ORDER[b.e.priority] : ""; }
      else if (key === "lastTest") { x = a.lr ? a.lr.date : ""; y = b.lr ? b.lr.date : ""; }
      else { x = String(a.e[key] || "").toLowerCase(); y = String(b.e[key] || "").toLowerCase(); }
      return compare(x, y, sort.dir, displayName(a.e), displayName(b.e));
    });
    $("list-count").textContent = `Showing ${rows.length} of ${plural(reg.items.length, "system")}.`;
    const body = rows.map(({ e, r, lr }) => `<tr>
      <td><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a>${e.softwareName && e.softwareName !== e.name ? `<span class="bk-sub">${esc(e.softwareName)}</span>` : ""}</td>
      <td>${esc(e.category)}</td><td>${esc(e.priority)}</td><td>${esc(e.runBy)}</td><td>${esc(e.frequency)}</td><td>${esc(e.offlineCopy)}</td>
      <td class="bk-nowrap">${lr ? esc(fmt(lr.date)) + (lr.result ? `<span class="bk-sub">${esc(lr.result)}${lr.source === "log" ? " (log)" : ""}</span>` : "") : ""}</td>
      <td>${ragPill(r.rag)}${r.reasons.length ? `<span class="bk-sub">${plural(r.reasons.length, "issue")}</span>` : ""}</td>
      ${rowActions("item", e.id, displayName(e))}</tr>`).join("");
    $("list-table").innerHTML = `<table class="summary-table bk-table"><thead><tr>${sortHead(LIST_COLS, sort, "data-sort")}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LIST_COLS.length + 1}">${reg.items.length ? "No systems match these filters." : "No systems recorded yet."}</td></tr>`}</tbody></table>`;
    $("list-table").querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      sort = sort.key === b.dataset.sort ? { key: sort.key, dir: -sort.dir } : { key: b.dataset.sort, dir: 1 };
      renderListTable();
      const again = $("list-table").querySelector(`[data-sort="${b.dataset.sort}"]`);
      if (again) again.focus();
    }));
    bindRowActions($("list-table"));
  }

  // ── Restore test and DR log ────────────────────────────────────────────────
  function viewLog() {
    return `<div class="bk-page bk-wide">
      <h2>Restore test and DR log</h2>
      <p class="bk-muted">Log every restore test, disaster recovery exercise and real recovery. The DfE asks for backups to be tested and logged every term. Each system's last restore test is taken from here.</p>
      <div class="bk-actions"><a href="#" class="btn btn-primary btn-sm" data-view="addlog">&#43; Log a restore test</a></div>
      <div class="bk-filters bk-filters-log" role="search">
        <div class="form-field"><label for="lf-q">Search systems, issues or actions</label>
          <input type="search" id="lf-q" value="${esc(logFilters.q)}" autocomplete="off" /></div>
        <div class="form-field"><label for="lf-type">Type</label>
          <select id="lf-type" data-logfilter="type">${opt(BM.LOG_TYPES, logFilters.type, "All types")}</select></div>
        <div class="form-field"><label for="lf-result">Result</label>
          <select id="lf-result" data-logfilter="result">${opt(BM.RESULTS, logFilters.result, "All results")}</select></div>
      </div>
      <p class="bk-muted" id="log-count" role="status" aria-live="polite"></p>
      <div class="card bk-table-wrap" id="log-table"></div>
    </div>`;
  }

  // "2 hours: within the recovery time" or which systems it was too slow for
  function rtoText(x) {
    if (x.hours === "") return "";
    const over = [], within = [];
    x.systems.forEach(id => {
      const e = findItem(id);
      const rto = e && BM.rtoHours(e);
      if (typeof rto !== "number") return;
      (Number(x.hours) > rto ? over : within).push(displayName(e));
    });
    if (over.length) return `Over the recovery time for ${over.join(", ")}`;
    if (within.length) return "Within the recovery time";
    return "";
  }

  function renderLogTable() {
    const q = logFilters.q.trim().toLowerCase();
    const rows = reg.log.filter(x =>
      (!q || [systemNames(x.systems).join(" "), x.whatRestored, x.issues, x.actions, x.testedBy].join(" ").toLowerCase().includes(q)) &&
      (!logFilters.type || x.type === logFilters.type) &&
      (!logFilters.result || x.result === logFilters.result));
    const key = logSort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "systems") { x = systemNames(a.systems).join(", ").toLowerCase(); y = systemNames(b.systems).join(", ").toLowerCase(); }
      else if (key === "hours") { x = a.hours === "" ? "" : Number(a.hours); y = b.hours === "" ? "" : Number(b.hours); }
      else { x = String(a[key] || "").toLowerCase(); y = String(b[key] || "").toLowerCase(); }
      return compare(x, y, logSort.dir, a.date || "", b.date || "");
    });
    $("log-count").textContent = `Showing ${rows.length} of ${plural(reg.log.length, "log entry", "log entries")}.`;
    const body = rows.map(x => {
      const names = systemNames(x.systems);
      const rt = rtoText(x);
      const res = x.result ? ragPill(x.result === "Success" ? "Green" : x.result === "Partial" ? "Amber" : "Red").replace(/>(Green|Amber|Red)</, `>${esc(x.result)}<`) : "";
      return `<tr>
        <td class="bk-nowrap"><a href="#" data-logedit="${esc(x.id)}">${esc(fmt(x.date) || "No date")}</a></td>
        <td>${esc(x.type)}</td>
        <td>${esc(names.join(", "))}${x.whatRestored ? `<span class="bk-sub">${esc(x.whatRestored)}</span>` : ""}</td>
        <td>${res}</td>
        <td>${esc(BM.formatHours(x.hours))}${rt ? `<span class="bk-sub ${/^Over/.test(rt) ? "bk-warn" : ""}">${esc(rt)}</span>` : ""}</td>
        <td>${esc(x.actionStatus)}${BM.logNeedsAttention(x) ? `<span class="bk-sub bk-warn">Needs follow-up</span>` : ""}</td>
        ${rowActions("log", x.id, logName(x))}</tr>`;
    }).join("");
    $("log-table").innerHTML = `<table class="summary-table bk-table"><thead><tr>${sortHead(LOG_COLS, logSort, "data-logsort")}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LOG_COLS.length + 1}">${reg.log.length ? "No log entries match these filters." : "No restore tests logged yet."}</td></tr>`}</tbody></table>`;
    $("log-table").querySelectorAll("[data-logsort]").forEach(b => b.addEventListener("click", () => {
      logSort = logSort.key === b.dataset.logsort ? { key: logSort.key, dir: -logSort.dir } : { key: b.dataset.logsort, dir: 1 };
      renderLogTable();
      const again = $("log-table").querySelector(`[data-logsort="${b.dataset.logsort}"]`);
      if (again) again.focus();
    }));
    bindRowActions($("log-table"));
  }

  // ── Forms (backup rows, log entries and the DR plan share these) ──────────
  function badge(f) {
    return f.basis === "required"
      ? `<span class="bk-basis req">Required by a standard</span>` : `<span class="bk-basis good">Good practice</span>`;
  }
  function whyLine(f) {
    if (!f.refs || !f.refs.length) return "";
    return "Why: " + f.refs.map(id => {
      const s = BM.SOURCES[id];
      return `<a href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`;
    }).join(" · ");
  }
  // attr: "data-key" for backups and log entries, "data-plan" for the plan
  function fieldInput(f, e, attr) {
    const id = "fld-" + f.key;
    const describedBy = `help-${f.key} why-${f.key}`;
    const v = e[f.key];
    if (f.type === "checks") {
      return f.options.map((o, i) => `<label class="bk-check"><input type="checkbox" ${attr}="${f.key}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""} id="${id}-${i}" /> ${esc(o)}</label>`).join("");
    }
    if (f.type === "systems") {
      if (!reg.items.length) return `<p class="bk-muted">No systems in your backup register yet. <a href="#" data-view="add">Add one</a> first, or describe the systems below.</p>`;
      return reg.items.map((s, i) => `<label class="bk-check"><input type="checkbox" ${attr}="${f.key}" value="${esc(s.id)}" ${v.includes(s.id) ? "checked" : ""} id="${id}-${i}" /> ${esc(displayName(s))}${s.status === "Retired" ? " (retired)" : ""}</label>`).join("");
    }
    if (f.type === "select") {
      return `<select id="${id}" ${attr}="${f.key}" aria-describedby="${describedBy}"><option value="">Not recorded</option>${f.options.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea id="${id}" ${attr}="${f.key}" rows="4" aria-describedby="${describedBy}">${esc(v)}</textarea>`;
    }
    const type = f.type === "date" ? "date" : "text";
    const extra = f.type === "hours" ? ` inputmode="decimal" autocomplete="off"` : f.type === "software" ? ` list="software-names" autocomplete="off"` : "";
    return `<input type="${type}" id="${id}" ${attr}="${f.key}" value="${esc(v)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} aria-describedby="${describedBy}"${extra} />`;
  }
  function formGroups(groups, e, attr) {
    return groups.map(g => {
      const fields = g.fields.map(f => {
        const wide = ["textarea", "checks", "systems"].includes(f.type) || f.key === "name";
        const grouped = f.type === "checks" || f.type === "systems";
        const label = grouped
          ? `<fieldset class="bk-checks" aria-describedby="help-${f.key} why-${f.key}"><legend>${esc(f.label)} ${badge(f)}</legend>${fieldInput(f, e, attr)}</fieldset>`
          : `<label for="fld-${f.key}">${esc(f.label)} ${badge(f)}</label>${fieldInput(f, e, attr)}`;
        return `<div class="form-field bk-field${wide ? " full-width" : ""}" data-wrap="${f.key}">
          ${label}
          <p class="bk-help" id="help-${f.key}">${esc(f.help)}${f.showIfText ? ` <em>(${esc(f.showIfText)})</em>` : ""}</p>
          <p class="bk-why" id="why-${f.key}">${whyLine(f)}</p>
        </div>`;
      }).join("");
      return `<fieldset class="card bk-group" id="group-${g.id}">
        <legend>${esc(g.title)}</legend>
        ${g.intro ? `<p class="bk-muted">${esc(g.intro)}</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>`;
    }).join("");
  }

  function viewEdit() {
    const e = findItem(editId);
    if (!e) return "<p>Not found.</p>";
    const names = softwareNames();
    const datalist = `<datalist id="software-names">${names.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>`;
    return `<div class="bk-page">
      <p><a href="#" data-view="list">&#8592; Back to the backup list</a></p>
      <h2 id="edit-title">${esc(displayName(e))}</h2>
      <p class="bk-muted">Changes save automatically. Fields marked <span class="bk-basis req">Required by a standard</span> support a DfE standard or the RPA conditions of cover; the others are good practice. Fields that don't apply are hidden.</p>
      <div id="rag-panel" class="card card-body bk-rag-panel" aria-live="polite"></div>
      ${formGroups(BM.GROUPS, e, "data-key")}
      ${datalist}
      <div class="card card-body bk-related">
        <h3 style="margin-top:0">Restore tests for this system</h3>
        <div id="related-log"></div>
        <a href="#" class="btn btn-secondary btn-sm" data-addlog-for="${esc(e.id)}">&#43; Log a restore test for this system</a>
      </div>
      <div class="bk-actions bk-edit-actions">
        <a href="#" class="btn btn-primary" data-view="list">Done</a>
        <button type="button" class="btn btn-secondary" data-duplicate="${esc(e.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-delete="${esc(e.id)}">Delete</button>
      </div>
    </div>`;
  }
  function relatedLog(e) {
    const rows = reg.log.filter(x => x.systems.includes(e.id)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!rows.length) return `<p class="bk-muted">None logged yet.</p>`;
    return `<ul class="bk-plain">${rows.slice(0, 10).map(x => `<li><a href="#" data-logedit="${esc(x.id)}">${esc(logName(x))}</a> ${esc(x.result)} ${x.hours ? "· " + esc(BM.formatHours(x.hours)) : ""}</li>`).join("")}</ul>`;
  }

  function viewLogEdit() {
    const x = findLog(editId);
    if (!x) return "<p>Not found.</p>";
    return `<div class="bk-page">
      <p><a href="#" data-view="log">&#8592; Back to the log</a></p>
      <h2 id="edit-title">${esc(logName(x))}</h2>
      <p class="bk-muted">Changes save automatically.</p>
      <div id="rag-panel" class="card card-body bk-rag-panel" aria-live="polite"></div>
      ${formGroups(BM.LOG_GROUPS, x, "data-key")}
      <div class="bk-actions bk-edit-actions">
        <a href="#" class="btn btn-primary" data-view="log">Done</a>
        <button type="button" class="btn btn-secondary" data-logduplicate="${esc(x.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-logdelete="${esc(x.id)}">Delete</button>
      </div>
    </div>`;
  }

  function updateRagPanel(e) {
    const p = $("rag-panel");
    if (!p) return;
    if (view === "logedit") {
      const rt = rtoText(e);
      const attention = BM.logNeedsAttention(e);
      const lines = [];
      if (rt) lines.push(`<li>${ragPill(/^Over/.test(rt) ? "Amber" : "Green")} ${esc(rt)}.</li>`);
      if (attention) lines.push(`<li>${ragPill("Amber")} ${esc(e.actionStatus === "Open" ? "Actions are still open." : "The test did not fully succeed. Record the actions and mark them done when complete.")}</li>`);
      if (!e.systems.length) lines.push(`<li>${ragPill("Amber")} No systems ticked, so no system's last restore test will be updated.</li>`);
      p.className = "card card-body bk-rag-panel " + (lines.some(l => l.includes("amber")) ? "amber" : "green");
      p.innerHTML = `<div class="bk-rag-head"><strong>This entry</strong></div>` + (lines.length ? `<ul class="bk-reasons">${lines.join("")}</ul>` : `<p class="bk-muted">Nothing to follow up.</p>`);
      return;
    }
    const r = BM.evaluate(e, today(), reg.log);
    const items = r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("");
    p.className = "card card-body bk-rag-panel " + (RAG_CLASS[r.rag] || "");
    p.innerHTML = `<div class="bk-rag-head"><strong>Check:</strong> ${ragPill(r.rag)}</div>` +
      (r.rag === "Retired" ? `<p class="bk-muted">Retired systems are kept for the record and not checked.</p>`
        : items ? `<ul class="bk-reasons">${items}</ul>` : `<p class="bk-muted">No issues found.</p>`);
  }

  function updateVisibility(e, fields) {
    fields.forEach(f => {
      const w = $("content").querySelector(`[data-wrap="${f.key}"]`);
      if (w) w.hidden = !!(f.showIf && !f.showIf(e));
    });
  }

  // ── DR plan ────────────────────────────────────────────────────────────────
  function viewPlan() {
    const p = reg.plan;
    const fields = BM.PLAN_FIELDS.map(f => `<div class="form-field bk-field${f.type === "textarea" ? " full-width" : ""}" data-wrap="${f.key}">
        <label for="fld-${f.key}">${esc(f.label)} ${badge(f)}</label>${fieldInput(f, p, "data-plan")}
        <p class="bk-help" id="help-${f.key}">${esc(f.help)}</p>
        <p class="bk-why" id="why-${f.key}">${whyLine(f)}</p></div>`).join("");
    const lastTest = BM.lastDrTest(reg);
    return `<div class="bk-page">
      <h2>Disaster recovery plan</h2>
      <p class="bk-muted">Where your plan is, when it was last reviewed and tested, and who to call. The DfE asks for the backup plan and the disaster recovery plan to be reviewed every year, and the DR plan to be tested at least once a year. Changes save automatically.</p>
      <div id="plan-panel" class="card card-body bk-rag-panel" aria-live="polite"></div>
      ${credentialsNote().replace(/<a href="#" data-view="plan">disaster recovery plan<\/a> page/, "this page")}
      <fieldset class="card bk-group"><legend>Plan details</legend>
        ${lastTest && lastTest !== p.drPlanTested ? `<p class="bk-muted">The newest DR exercise or real recovery in the log is ${esc(fmt(lastTest))}; this counts as the last test.</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>
      <fieldset class="card bk-group"><legend>Key contacts</legend>
        <p class="bk-muted">Organisations and work phone numbers to call in a disaster. Use roles and work contact details only: no personal phone numbers or home addresses.
          Check numbers against the official pages: <a href="${esc(safeHref(BM.SOURCES["rpa-cyber"].url))}" target="_blank" rel="noopener">RPA contact details (GOV.UK)</a>,
          <a href="https://www.ncsc.gov.uk/" target="_blank" rel="noopener">NCSC</a>, and your IT support and internet provider contracts.</p>
        <div class="bk-table-wrap" id="contacts"></div>
        <div class="bk-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-contact">&#43; Add a contact</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-key-contacts">Add the usual roles</button>
        </div>
      </fieldset>
    </div>`;
  }
  function renderContacts() {
    const cs = reg.plan.contacts;
    const roleSel = c => `<select data-contact="${esc(c.id)}" data-ckey="role" aria-label="Role"><option value="">Choose a role</option>${BM.CONTACT_ROLES.map(o => `<option value="${esc(o)}" ${o === c.role ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    const input = (c, k, label, type) => `<input type="${type || "text"}" data-contact="${esc(c.id)}" data-ckey="${k}" value="${esc(c[k])}" aria-label="${esc(label)}" ${type === "tel" ? `inputmode="tel" maxlength="30"` : ""} />`;
    $("contacts").innerHTML = cs.length ? `<table class="summary-table bk-contacts"><thead><tr><th scope="col">Role</th><th scope="col">Organisation</th><th scope="col">Work phone</th><th scope="col">Notes</th><th scope="col"><span class="visually-hidden">Remove</span></th></tr></thead>
      <tbody>${cs.map(c => `<tr><td>${roleSel(c)}</td><td>${input(c, "organisation", "Organisation")}</td><td>${input(c, "phone", "Work phone", "tel")}</td><td>${input(c, "notes", "Notes")}</td>
        <td><button type="button" class="btn btn-danger btn-sm" data-remove-contact="${esc(c.id)}" aria-label="Remove contact ${esc(c.role || c.organisation || "")}">Remove</button></td></tr>`).join("")}</tbody></table>`
      : `<p class="bk-muted">No contacts yet.</p>`;
    $("contacts").querySelectorAll("[data-contact]").forEach(el => {
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
        const c = reg.plan.contacts.find(x => x.id === el.dataset.contact);
        if (!c) return;
        const clean = BM.sanitiseContact({ [el.dataset.ckey]: el.value });
        c[el.dataset.ckey] = clean[el.dataset.ckey];
        updatePlanPanel();
        save();
      });
    });
    $("contacts").querySelectorAll("[data-remove-contact]").forEach(b => b.addEventListener("click", () => {
      reg.plan.contacts = reg.plan.contacts.filter(x => x.id !== b.dataset.removeContact);
      saveNow(); renderContacts(); updatePlanPanel();
    }));
  }
  function updatePlanPanel() {
    const p = $("plan-panel");
    if (!p) return;
    const r = BM.evaluatePlan(reg, today());
    p.className = "card card-body bk-rag-panel " + RAG_CLASS[r.rag];
    p.innerHTML = `<div class="bk-rag-head"><strong>Check:</strong> ${ragPill(r.rag)}</div>` +
      (r.reasons.length ? `<ul class="bk-reasons">${r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("")}</ul>` : `<p class="bk-muted">No issues found.</p>`);
  }

  // ── Quick add and CSV ──────────────────────────────────────────────────────
  const nameKey = n => String(n || "").trim().toLowerCase();
  const existingNames = () => new Set(reg.items.flatMap(e => [nameKey(e.name), nameKey(e.softwareName)]).filter(Boolean));
  // Software register categories that usually hold data worth backing up
  const SW_CATEGORY = {
    "MIS": "MIS", "Safeguarding": "Safeguarding", "Finance and HR": "Finance and HR", "Productivity and email": "Email",
    "Learning platform": "Learning platform and pupil work", "Communication": "Other", "Curriculum and classroom": "Learning platform and pupil work"
  };
  function softwareCandidates() {
    if (!RM) return [];
    let items = [];
    try { items = RM.loadState().items; } catch (e) { return []; }
    const have = existingNames();
    return items.filter(e => e.status !== "Removed" && String(e.name || "").trim() && hasOwnKey(SW_CATEGORY, e.category))
      .map(e => ({ name: String(e.name).trim().slice(0, 300), category: SW_CATEGORY[e.category], cloud: RM.isCloud(e), exists: have.has(nameKey(e.name)) }));
  }
  function hasOwnKey(o, k) { return typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k); }

  function viewQuick() {
    const have = existingNames();
    const rows = BM.STARTERS.map((s, i) => {
      const exists = have.has(nameKey(s.name));
      return `<li><label class="bk-check"><input type="checkbox" data-starter="${i}" ${exists ? "disabled" : ""} />
        ${esc(s.name)} <span class="bk-muted">${esc(s.category)}${exists ? " · already in your register" : ""}</span></label></li>`;
    }).join("");
    const sw = softwareCandidates();
    const swRows = sw.map((s, i) => `<li><label class="bk-check"><input type="checkbox" data-sw="${i}" ${s.exists ? "disabled" : ""} />
        ${esc(s.name)} <span class="bk-muted">${esc(s.category)}${s.exists ? " · already in your register" : ""}</span></label></li>`).join("");
    return `<div class="bk-page">
      <h2>Quick add</h2>
      <p>Tick the systems your school relies on. Each is added with its name and category only: fill in how it is backed up, its priority and test dates from your own records and your IT support provider.</p>
      <div class="card card-body">
        <p style="margin-top:0"><button type="button" class="btn btn-secondary btn-sm" id="btn-select-all">Select all</button></p>
        <ul class="bk-starters">${rows}</ul>
        <button type="button" class="btn btn-primary" id="btn-quick-add">Add selected</button>
      </div>
      <h2>Add from your software register</h2>
      <div class="card card-body">
        ${sw.length ? `<p style="margin-top:0">Systems from your <a href="register.html">software register</a> that usually hold school data (MIS, safeguarding, finance, email and learning platforms). They are added with the same name so the registers match.</p>
          <ul class="bk-starters">${swRows}</ul>
          <button type="button" class="btn btn-primary" id="btn-sw-add">Add selected</button>`
          : `<p style="margin:0" class="bk-muted">Nothing to add: your <a href="register.html">software register</a> in this browser has no MIS, safeguarding, finance, email or learning platform entries.</p>`}
      </div>
      <h2>Import a list from CSV</h2>
      <div class="card card-body">
        <p style="margin-top:0">Add a basic list from a spreadsheet saved as CSV. Use a header row with the columns <strong>System or data</strong> (or <strong>Name</strong>), and optionally <strong>Category</strong>, <strong>Data owner</strong> and <strong>Priority</strong>. Systems already in the register (same name) are skipped.</p>
        <button type="button" class="btn btn-secondary" id="btn-csv">&#8593; Choose a CSV file</button>
      </div>
    </div>`;
  }

  function addRows(list) {
    const have = existingNames();
    let added = 0;
    list.forEach(raw => {
      if (have.has(nameKey(raw.name)) || reg.items.length >= BM.MAX_ITEMS) return;
      reg.items.push(BM.sanitiseEntry(raw));
      have.add(nameKey(raw.name));
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
        const head = rows[0].map(c => norm(c));
        let cols = { name: 0, category: 1, dataOwner: 2, priority: 3 }, start = 0;
        const nameCol = head.findIndex(h => h === "system or data" || h === "name" || h === "system");
        if (nameCol >= 0) {
          cols = { name: nameCol, category: head.indexOf("category"), dataOwner: head.findIndex(h => h === "data owner" || h === "owner"), priority: head.findIndex(h => h === "priority" || h === "recovery priority") };
          start = 1;
        }
        const have = existingNames();
        const add = [];
        let skipped = 0;
        rows.slice(start).forEach(r => {
          const cell = k => (cols[k] >= 0 && r[cols[k]] != null ? AM.limitText(r[cols[k]]).trim().slice(0, 300) : "");
          const name = cell("name");
          if (!name) return;
          if (have.has(nameKey(name))) { skipped++; return; }
          have.add(nameKey(name));
          const catText = cell("category");
          const category = BM.CATEGORIES.find(c => c.toLowerCase() === catText.toLowerCase()) || (catText ? "Other" : "");
          add.push(BM.sanitiseEntry({ name, category, dataOwner: cell("dataOwner"), priority: cell("priority") }));
        });
        const room = BM.MAX_ITEMS - reg.items.length;
        if (!add.length) { toast(`Nothing to add from ${file.name}${skipped ? `: ${skipped} already in the register` : ""}.`); return; }
        const n = Math.min(add.length, room);
        const choice = await ask("Add systems from CSV?", [
          `${plural(n, "system")} will be added to your register from ${file.name}.`,
          skipped ? `${skipped} already in the register will be skipped.` : "",
          add.length > room ? `Only ${room} more can be added: the register holds up to ${BM.MAX_ITEMS} systems.` : ""
        ].filter(Boolean), [["Add them", "add", "btn-primary"], ["Cancel", "cancel"]]);
        if (choice !== "add") return;
        reg.items.push(...add.slice(0, room));
        saveNow();
        navigate("list");
        toast(`Added ${plural(n, "system")} from ${file.name}.`);
      } catch (err) { toast("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  }

  // ── School details ─────────────────────────────────────────────────────────
  function viewSchool() {
    return `<div class="bk-page" style="max-width:680px">
      <h2>School details</h2>
      ${profileNotice()}
      <p class="bk-muted">Filled in from the school you choose on the <a href="index.html">home page</a>. Anything you type here is kept. Changes save automatically.</p>
      <div class="form-grid">
        <div class="form-field full-width"><label for="sch-name">School, college or trust name</label>
          <input type="text" id="sch-name" data-school="name" value="${esc(reg.school.name)}" /></div>
        <div class="form-field"><label for="sch-urn">URN</label>
          <input type="text" id="sch-urn" data-school="urn" value="${esc(reg.school.urn)}" inputmode="numeric" /></div>
      </div>
    </div>`;
  }

  // ── Field guide ────────────────────────────────────────────────────────────
  function guideRows(title, fields) {
    return fields.map(f => `<tr>
      <td>${esc(title || f.groupTitle)}</td><td>${esc(f.label)}</td>
      <td>${f.basis === "required" ? "Required by a standard" : "Good practice"}</td>
      <td>${esc(f.help)}${f.showIfText ? ` <em>Applies to: ${esc(f.showIfText)}.</em>` : ""}</td>
      <td>${whyLine(f).replace(/^Why: /, "") || "–"}</td></tr>`).join("");
  }
  function viewGuide() {
    const th = BM.THRESHOLDS;
    const rules = ["Red", "Amber", "Green", "Retired"].map(k => `<div class="rag-key-row">${ragPill(k)}<ul class="bk-rule-list">${BM.RULES[k].map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
    const head = `<thead><tr><th scope="col">Area</th><th scope="col">Field</th><th scope="col">Basis</th><th scope="col">What it means</th><th scope="col">Requirement it supports</th></tr></thead>`;
    return `<div class="bk-page bk-wide">
      <h2>Field guide and rules</h2>
      <h3>How each system is checked</h3>
      <p class="bk-muted">Checks use today's date. Thresholds: restore test older than ${th.restoreTestWarnMonths} months (Amber, as the DfE asks for termly tests) or ${th.restoreTestMaxMonths} months (Red for critical and high priority), successful backup not checked for ${th.successCheckWarnDays} days, reviews older than ${th.reviewMonths} months.
        "Important" means critical or high priority, or no priority set yet. Any Red reason makes the system Red; otherwise any Amber reason makes it Amber.</p>
      <div class="rag-key">${rules}</div>
      ${evidenceBlock()}
      <h3>Backup register fields</h3>
      <p class="bk-muted">The full reasoning and source quotes are in <a href="https://github.com/jonesj1994/DFEStandards/blob/main/docs/BACKUP-REGISTER.md" target="_blank" rel="noopener">BACKUP-REGISTER.md</a>.</p>
      <div class="card bk-table-wrap"><table class="summary-table bk-guide">${head}<tbody>${guideRows("", BM.FIELDS)}</tbody></table></div>
      <h3>Restore test and DR log fields</h3>
      <div class="card bk-table-wrap"><table class="summary-table bk-guide">${head}<tbody>${guideRows("", BM.LOG_FIELDS)}</tbody></table></div>
      <h3>Disaster recovery plan fields</h3>
      <div class="card bk-table-wrap"><table class="summary-table bk-guide">${head}<tbody>${guideRows("DR plan", BM.PLAN_FIELDS)}</tbody></table></div>
    </div>`;
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function bindRowActions(root) {
    if (!root) return;
    root.querySelectorAll("[data-edit]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("edit", a.dataset.edit); }));
    root.querySelectorAll("[data-duplicate]").forEach(b => b.addEventListener("click", () => duplicate(b.dataset.duplicate)));
    root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => remove(b.dataset.delete)));
    root.querySelectorAll("[data-logedit]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("logedit", a.dataset.logedit); }));
    root.querySelectorAll("[data-logduplicate]").forEach(b => b.addEventListener("click", () => duplicateLog(b.dataset.logduplicate)));
    root.querySelectorAll("[data-logdelete]").forEach(b => b.addEventListener("click", () => removeLog(b.dataset.logdelete)));
  }

  // Wire up the inputs of a backup or log form
  function bindForm(c, e, fields, byKey) {
    c.querySelectorAll("[data-key]").forEach(el => {
      const handler = () => {
        const key = el.dataset.key;
        const f = byKey.get(key);
        if (!f) return;
        const value = el.type === "checkbox"
          ? Array.from(c.querySelectorAll(`input[type=checkbox][data-key="${key}"]:checked`)).map(x => x.value)
          : el.value;
        e[key] = BM.cleanValue(f, value);
        if (key === "systems") e.systems = e.systems.filter(id => findItem(id));
        if (view === "edit" && key === "name") $("edit-title").textContent = displayName(e);
        if (view === "logedit" && (key === "date" || key === "type")) $("edit-title").textContent = logName(e);
        updateVisibility(e, fields);
        updateRagPanel(e);
        save();
      };
      el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date" ? "change" : "input", handler);
    });
    updateVisibility(e, fields);
    updateRagPanel(e);
  }

  function bind() {
    const c = $("content");
    c.querySelectorAll("a[data-view]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate(a.dataset.view); }));
    c.querySelectorAll("[data-addlog-for]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("addlog", a.dataset.addlogFor); }));
    c.querySelectorAll("[data-filter-rag]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      filters = { q: "", category: "", priority: "", status: "", rag: a.dataset.filterRag };
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
    if (view === "log") {
      $("lf-q").addEventListener("input", ev => { logFilters.q = ev.target.value; renderLogTable(); });
      c.querySelectorAll("[data-logfilter]").forEach(s => s.addEventListener("change", () => { logFilters[s.dataset.logfilter] = s.value; renderLogTable(); }));
      renderLogTable();
    }
    if (view === "edit") {
      const e = findItem(editId);
      bindRowActions(c.querySelector(".bk-edit-actions"));
      bindForm(c, e, BM.FIELDS, BM.FIELD_BY_KEY);
      $("related-log").innerHTML = relatedLog(e);
      bindRowActions($("related-log"));
    }
    if (view === "logedit") {
      const x = findLog(editId);
      bindRowActions(c.querySelector(".bk-edit-actions"));
      bindForm(c, x, BM.LOG_FIELDS, BM.LOG_FIELD_BY_KEY);
    }
    if (view === "plan") {
      c.querySelectorAll("[data-plan]").forEach(el => {
        el.addEventListener(el.tagName === "SELECT" || el.type === "date" ? "change" : "input", () => {
          const f = BM.PLAN_FIELD_BY_KEY.get(el.dataset.plan);
          if (!f) return;
          reg.plan[f.key] = BM.cleanValue(f, el.value);
          updatePlanPanel();
          save();
        });
      });
      $("btn-add-contact").addEventListener("click", () => {
        if (reg.plan.contacts.length >= BM.MAX_CONTACTS) { toast(`Up to ${BM.MAX_CONTACTS} contacts can be kept.`); return; }
        reg.plan.contacts.push(BM.blankContact());
        saveNow(); renderContacts(); updatePlanPanel();
        const last = $("contacts").querySelector("tbody tr:last-child select");
        if (last) last.focus();
      });
      $("btn-add-key-contacts").addEventListener("click", () => {
        const have = new Set(reg.plan.contacts.map(x => x.role));
        const roles = ["Disaster recovery lead", "IT support provider", "Internet service provider", "Insurer or RPA", "MIS supplier", "Data protection officer", "Action Fraud or Report Fraud", "NCSC"].filter(r => !have.has(r));
        roles.forEach(r => { if (reg.plan.contacts.length < BM.MAX_CONTACTS) reg.plan.contacts.push(BM.sanitiseContact({ role: r })); });
        saveNow(); renderContacts(); updatePlanPanel();
        toast(roles.length ? `Added ${plural(roles.length, "role")}. Fill in the organisations and work numbers.` : "The usual roles are already listed.");
      });
      renderContacts();
      updatePlanPanel();
    }
    if (view === "quick") {
      $("btn-select-all").addEventListener("click", () => c.querySelectorAll("[data-starter]:not(:disabled)").forEach(x => { x.checked = true; }));
      $("btn-quick-add").addEventListener("click", () => {
        const picked = Array.from(c.querySelectorAll("[data-starter]:checked:not(:disabled)")).map(x => BM.STARTERS[Number(x.dataset.starter)]).filter(Boolean);
        if (!picked.length) { toast("Tick the systems you want to add first."); return; }
        const n = addRows(picked.map(s => ({ name: s.name, category: s.category })));
        navigate("list");
        toast(`Added ${plural(n, "system")}. Open each one to fill in its details.`);
      });
      const swBtn = $("btn-sw-add");
      if (swBtn) swBtn.addEventListener("click", () => {
        const list = softwareCandidates();
        const picked = Array.from(c.querySelectorAll("[data-sw]:checked:not(:disabled)")).map(x => list[Number(x.dataset.sw)]).filter(Boolean);
        if (!picked.length) { toast("Tick the systems you want to add first."); return; }
        const n = addRows(picked.map(s => ({ name: s.name, softwareName: s.name, category: s.category, hosting: s.cloud ? "Cloud service (SaaS)" : "" })));
        navigate("list");
        toast(`Added ${plural(n, "system")} from the software register.`);
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
    if (!e || reg.items.length >= BM.MAX_ITEMS) return;
    leaveEdit();
    const copy = BM.sanitiseEntry(JSON.parse(JSON.stringify(e)));
    copy.id = BM.newId("bk");
    copy.name = (e.name || "Untitled system") + " (copy)";
    copy.lastRestoreTest = ""; copy.lastRestoreResult = ""; copy.lastRestoreHours = "";
    reg.items.splice(reg.items.indexOf(e) + 1, 0, copy);
    saveNow();
    view = "list";               // so navigate's leaveEdit does nothing
    navigate("edit", copy.id);
    toast("Copy made. Change the details that differ. Restore tests are not copied.");
  }

  async function remove(id) {
    const e = findItem(id);
    if (!e) return;
    const used = reg.log.filter(x => x.systems.includes(id)).length;
    const choice = await ask("Delete this system?", [
      `"${displayName(e)}" will be removed from the register. This cannot be undone.`,
      used ? `${plural(used, "log entry", "log entries")} mention it. They are kept, but will no longer be linked to it.` : "",
      "If the system is just no longer used, you could set its status to Retired instead, to keep the record."
    ].filter(Boolean), [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    reg.items = reg.items.filter(x => x.id !== id);
    reg.log.forEach(x => { x.systems = x.systems.filter(s => s !== id); });
    saveNow();
    if (view === "edit") { view = "list"; editId = null; }
    navigate(view);
    toast(`Deleted "${displayName(e)}".`);
  }

  function duplicateLog(id) {
    const x = findLog(id);
    if (!x || reg.log.length >= BM.MAX_LOG) return;
    leaveEdit();
    const copy = BM.sanitiseLog(JSON.parse(JSON.stringify(x)));
    copy.id = BM.newId("log");
    copy.date = today();
    reg.log.splice(reg.log.indexOf(x), 0, copy);
    saveNow();
    view = "log";
    navigate("logedit", copy.id);
    toast("Copy made with today's date. Change the details that differ.");
  }

  async function removeLog(id) {
    const x = findLog(id);
    if (!x) return;
    const choice = await ask("Delete this log entry?", [`"${logName(x)}" will be removed from the log. This cannot be undone.`],
      [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    reg.log = reg.log.filter(y => y.id !== id);
    saveNow();
    if (view === "logedit") { view = "log"; editId = null; }
    navigate(view);
    toast(`Deleted "${logName(x)}".`);
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  const cellValue = v => (Array.isArray(v) ? v.join("; ") : v == null ? "" : v);
  function sheet(rows, widths) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = widths.map(w => ({ wch: w }));
    return ws;
  }

  function exportExcel() {
    leaveEdit();
    const t = today();
    const wb = XLSX.utils.book_new();
    const sum = BM.summarise(reg, t);

    const info = [
      [TITLE],
      ["School", reg.school.name],
      ["URN", reg.school.urn],
      ["Exported on", t],
      ["Systems", reg.items.length],
      ["Red", sum.Red], ["Amber", sum.Amber], ["Green", sum.Green], ["Retired", sum.Retired],
      ["Log entries", reg.log.length],
      ["Last restore test", sum.lastTest],
      ["DR plan check", sum.plan.rag],
      [],
      ["Checks", `Red and Amber are worked out on the export date. Thresholds: restore test older than ${BM.THRESHOLDS.restoreTestWarnMonths} months (Amber) or ${BM.THRESHOLDS.restoreTestMaxMonths} months (Red for critical and high priority), backup success not checked for ${BM.THRESHOLDS.successCheckWarnDays} days, reviews older than ${BM.THRESHOLDS.reviewMonths} months.`],
      ["Security", "This register must never hold passwords, encryption keys or recovery codes. It records only where they are kept."],
      ["Import", "Import this file on the Backup and Disaster Recovery Register page to restore it exactly."]
    ];
    XLSX.utils.book_append_sheet(wb, sheet(info, [18, 90]), "Info");

    const header = ["ID"].concat(BM.FIELDS.map(f => f.label), ["Latest restore test", "Latest restore result", "Check", "Reasons"]);
    const rows = [header];
    reg.items.forEach(e => {
      const r = BM.evaluate(e, t, reg.log);
      const lr = BM.lastRestore(e, reg.log);
      rows.push([e.id].concat(BM.FIELDS.map(f => cellValue(e[f.key])), [lr ? lr.date : "", lr ? lr.result : "", r.rag, r.reasons.map(x => `${x.level}: ${x.text}`).join("\n")]));
    });
    const wsR = sheet(rows, header.map((h, i) => (i === 0 ? 22 : h === "Reasons" ? 70 : h === "Notes" ? 50 : Math.max(14, Math.min(30, h.length)))));
    wsR["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 1), c: header.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsR, SHEET_ITEMS);

    const logHeader = ["ID"].concat(BM.LOG_FIELDS.map(f => f.label), ["Against the recovery time"]);
    const logRows = [logHeader];
    reg.log.forEach(x => logRows.push([x.id].concat(BM.LOG_FIELDS.map(f => f.key === "systems" ? systemNames(x.systems).join("; ") : cellValue(x[f.key])), [rtoText(x)])));
    const wsL = sheet(logRows, logHeader.map((h, i) => (i === 0 ? 22 : /Issues|Actions agreed/.test(h) ? 50 : Math.max(14, Math.min(30, h.length)))));
    wsL["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(logRows.length - 1, 1), c: logHeader.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsL, SHEET_LOG);

    const plan = [["Field", "Value"]];
    BM.PLAN_FIELDS.forEach(f => plan.push([f.label, cellValue(reg.plan[f.key])]));
    plan.push(["Last DR test (including log)", BM.lastDrTest(reg)]);
    plan.push([]);
    plan.push(["Key contacts"]);
    plan.push(BM.CONTACT_FIELDS.map(f => f.label));
    reg.plan.contacts.forEach(c => plan.push(BM.CONTACT_FIELDS.map(f => c[f.key])));
    XLSX.utils.book_append_sheet(wb, sheet(plan, [40, 50, 20, 40]), SHEET_PLAN);

    const att = [["Area", "Item", "Check", "Issue", "Owner"]];
    sum.plan.reasons.forEach(x => att.push(["DR plan", "Disaster recovery plan", x.level, x.text, reg.plan.drLead]));
    reg.items.forEach(e => BM.evaluate(e, t, reg.log).reasons.forEach(x => att.push(["Backup", e.name, x.level, x.text, e.dataOwner])));
    reg.log.filter(BM.logNeedsAttention).forEach(x => att.push(["Restore log", logName(x), "Amber", "Actions not marked done: " + (x.actions || "none recorded"), x.testedBy]));
    if (att.length === 1) att.push(["Nothing needs attention."]);
    XLSX.utils.book_append_sheet(wb, sheet(att, [14, 34, 8, 90, 24]), "Needs attention");

    const guide = [["Part", "Area", "Field", "Basis", "What it means", "Applies to", "Requirement it supports", "Source links"]];
    const addGuide = (part, f, area) => guide.push([
      part, area || f.groupTitle, f.label, f.basis === "required" ? "Required by a standard" : "Good practice", f.help, f.showIfText || "All",
      (f.refs || []).map(id => BM.SOURCES[id].short).join("; "), (f.refs || []).map(id => BM.SOURCES[id].url).filter((u, i, a) => a.indexOf(u) === i).join(" ")
    ]);
    BM.FIELDS.forEach(f => addGuide("Backup register", f));
    BM.LOG_FIELDS.forEach(f => addGuide("Restore log", f));
    BM.PLAN_FIELDS.forEach(f => addGuide("DR plan", f, "DR plan"));
    guide.push([]);
    Object.keys(BM.RULES).forEach(k => BM.RULES[k].forEach(r => guide.push(["Check rules", k, "", "", r])));
    XLSX.utils.book_append_sheet(wb, sheet(guide, [16, 22, 40, 22, 70, 24, 80, 60]), "Field guide");

    writeHiddenSheet(wb, { kind: HIDDEN_MARKER, schemaVersion: BM.SCHEMA_VERSION, exportedAt: new Date().toISOString(), school: reg.school, items: reg.items, log: reg.log, plan: reg.plan });

    const name = reg.school.name ? "_" + reg.school.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) : "";
    const file = `Backup_DR_Register${name}_${t}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file);
  }

  // Hidden sheet for an exact round trip, chunked like assessment-model.js's
  // "_assessment" sheet. Row 1: [marker, schema version, number of chunks].
  function writeHiddenSheet(wb, obj) {
    const json = JSON.stringify(obj);
    const rows = [[HIDDEN_MARKER, BM.SCHEMA_VERSION, 0]];
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
    if (!obj || typeof obj !== "object" || obj.kind !== HIDDEN_MARKER) throw new Error("not a backup register");
    return obj;
  }

  // ── Excel import ───────────────────────────────────────────────────────────
  // Hidden sheet first (exact), then the visible sheets (older or hand-edited
  // files). Tracker and other register exports are refused with a clear message.
  function readWorkbook(wb) {
    const notes = [];
    if (wb.Sheets[HIDDEN_SHEET]) {
      try {
        const raw = readHiddenSheet(wb);
        if (typeof raw.schemaVersion === "number" && raw.schemaVersion > BM.SCHEMA_VERSION) notes.push("the file was made by a newer version of the register; some details may be missing");
        return { state: BM.sanitiseState(raw), from: "hidden", notes };
      } catch (e) {
        notes.push("the hidden sheet was damaged (" + e.message + "), so the visible sheets were used");
      }
    }
    const a1 = wb.Sheets.Info && wb.Sheets.Info.A1 ? String(wb.Sheets.Info.A1.v || "").trim() : "";
    if (wb.Sheets[SHEET_ITEMS] && (!a1 || a1 === TITLE)) return { state: readVisible(wb), from: "visible", notes };
    // Not a backup register: say what it is if we can
    const other = OTHER_REGISTERS.find(([sheetName]) => wb.Sheets[sheetName]);
    if (other) throw new Error(`this file is a ${other[1]} export, not a backup register. Open it on the ${other[1]} page instead.`);
    let framework = "";
    try {
      const snap = AM && AM.readSnapshotSheet(XLSX, wb);
      if (snap && AM.isFramework(snap.framework)) framework = snap.framework;
    } catch (e) { /* not a tracker snapshot */ }
    if (!framework && a1) {
      if (/digital (&|and) technology standards/i.test(a1)) framework = "dfe";
      else if (/cyber essentials/i.test(a1)) framework = "cyber-essentials";
    }
    if (framework) {
      const f = AM.FRAMEWORKS[framework];
      throw new Error(`this file is a ${f.label} export, not a backup register. Open it in the ${f.shortLabel} tracker instead.`);
    }
    if (a1 && /register|log/i.test(a1)) throw new Error(`this file looks like a "${a1.slice(0, 80)}" export, not a backup register.`);
    throw new Error(`no backup register found in this file (it needs a sheet called ${SHEET_ITEMS})`);
  }

  const norm = s => String(s == null ? "" : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Excel date serials and dd/mm/yyyy text become ISO dates
  function importDate(v) {
    if (typeof v === "number" && isFinite(v) && v > 0 && v < 200000) {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return BM.validDate(`${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`);
    }
    const s = String(v == null ? "" : v).trim();
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (uk) return BM.validDate(`${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`);
    return BM.validDate(s.slice(0, 10));
  }

  // Read a visible table: find the header row by a required column label,
  // map columns to known fields, and return plain objects.
  function readTable(ws, fields, byKey, required, max) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    const hi = rows.findIndex(r => r.some(c => norm(c) === norm(required)));
    if (hi < 0) return null;
    const map = rows[hi].map(h => {
      const n = norm(h);
      if (n === "id") return "id";
      const f = fields.find(x => norm(x.label) === n || norm(x.key) === n);
      return f ? f.key : null;
    });
    const out = [];
    rows.slice(hi + 1).forEach(r => {
      if (out.length >= max) return;
      const raw = {};
      map.forEach((key, i) => {
        if (!key || r[i] === "" || r[i] == null) return;
        if (key === "id") { raw.id = String(r[i]).slice(0, 64); return; }
        const f = byKey.get(key);
        raw[key] = f.type === "date" ? importDate(r[i]) : f.type === "hours" ? r[i] : AM.limitText(r[i]);
      });
      if (Object.keys(raw).length) out.push(raw);
    });
    return out;
  }

  function readVisible(wb) {
    const s = { school: { name: "", urn: "" }, items: [], log: [], plan: {} };
    if (wb.Sheets.Info) {
      XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1, raw: true, defval: "" }).forEach(r => {
        if (norm(r[0]) === "school") s.school.name = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "urn") s.school.urn = AM.limitText(r[1]).slice(0, 300);
      });
    }
    const items = readTable(wb.Sheets[SHEET_ITEMS], BM.FIELDS, BM.FIELD_BY_KEY, "System or data", BM.MAX_ITEMS);
    if (!items) throw new Error(`the ${SHEET_ITEMS} sheet has no "System or data" column`);
    s.items = items.filter(r => String(r.name || "").trim());
    // Give rows without a usable ID a new one so log entries can link to them
    const used = new Set();
    s.items.forEach(r => {
      if (typeof r.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id) || used.has(r.id)) r.id = BM.newId("bk");
      used.add(r.id);
    });
    // Log systems are written as names: match them back to rows by name
    if (wb.Sheets[SHEET_LOG]) {
      const byName = new Map();
      s.items.forEach(r => { const k = nameKey(r.name); if (k && !byName.has(k)) byName.set(k, r.id); });
      const logs = readTable(wb.Sheets[SHEET_LOG], BM.LOG_FIELDS, BM.LOG_FIELD_BY_KEY, "Date", BM.MAX_LOG) || [];
      s.log = logs.map(x => {
        const names = String(x.systems || "").split(/\s*;\s*/).map(nameKey).filter(Boolean);
        x.systems = names.map(n => byName.get(n)).filter(Boolean);
        return x;
      });
    }
    if (wb.Sheets[SHEET_PLAN]) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET_PLAN], { header: 1, raw: true, defval: "" });
      let inContacts = false, cmap = null;
      const contacts = [];
      rows.forEach(r => {
        const k = norm(r[0]);
        if (k === "key contacts") { inContacts = true; return; }
        if (!inContacts) {
          const f = BM.PLAN_FIELDS.find(x => norm(x.label) === k);
          if (f && r[1] !== "") s.plan[f.key] = f.type === "date" ? importDate(r[1]) : AM.limitText(r[1]);
          return;
        }
        if (!cmap) { cmap = r.map(h => { const f = BM.CONTACT_FIELDS.find(x => norm(x.label) === norm(h)); return f ? f.key : null; }); return; }
        const c = {};
        cmap.forEach((key, i) => { if (key && r[i] !== "" && r[i] != null) c[key] = AM.limitText(r[i]); });
        if (Object.keys(c).length && contacts.length < BM.MAX_CONTACTS) contacts.push(c);
      });
      s.plan.contacts = contacts;
    }
    return BM.sanitiseState(s);
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
      const st = parsed.state;
      const n = st.items.length, m = reg.items.length;
      const lines = [`${file.name} has ${plural(n, "system")} and ${plural(st.log.length, "log entry", "log entries")}${st.school.name ? ` for ${st.school.name}` : ""}. Your register has ${plural(m, "system")} and ${plural(reg.log.length, "log entry", "log entries")}.`];
      if (parsed.from === "visible") lines.push("This file has no hidden copy, so it was read from the visible sheets. Check the details after importing.");
      parsed.notes.forEach(x => lines.push("Note: " + x + "."));
      let choice;
      if (!m && !reg.log.length) {
        choice = await ask("Import this register?", lines, [["Import", "replace", "btn-primary"], ["Cancel", "cancel"]]);
      } else {
        lines.push("Merge: add the file's systems and log entries to yours, updating those with the same ID or the same name. Plan details you have already filled in are kept.");
        lines.push("Replace: remove your current register and use the file's instead. This cannot be undone, so export your register first if you might need it.");
        choice = await ask("Import: merge or replace?", lines, [["Merge", "merge", "btn-primary"], ["Replace", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      }
      if (choice === "cancel") return;
      applyImport(st, choice);
      view = "dashboard";
      render();
      toast(`Imported ${plural(n, "system")} (${choice === "merge" ? "merged" : "replaced"}).`);
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
      // Systems: match by ID, then by name. Keep a map so log links follow.
      const idMap = new Map();
      incoming.items.forEach(e => {
        let i = reg.items.findIndex(x => x.id === e.id);
        if (i < 0) i = reg.items.findIndex(x => nameKey(x.name) === nameKey(e.name));
        if (i >= 0) {
          idMap.set(e.id, reg.items[i].id);
          reg.items[i] = Object.assign(e, { id: reg.items[i].id });
        } else if (reg.items.length < BM.MAX_ITEMS) {
          const oldId = e.id;
          if (reg.items.some(x => x.id === e.id) || reg.log.some(x => x.id === e.id)) e.id = BM.newId("bk");
          idMap.set(oldId, e.id);
          reg.items.push(e);
        }
      });
      incoming.log.forEach(x => {
        x.systems = x.systems.map(id => idMap.get(id)).filter(Boolean);
        let i = reg.log.findIndex(y => y.id === x.id);
        if (i < 0) i = reg.log.findIndex(y => y.date === x.date && y.type === x.type && y.whatRestored === x.whatRestored);
        if (i >= 0) reg.log[i] = Object.assign(x, { id: reg.log[i].id });
        else if (reg.log.length < BM.MAX_LOG) {
          if (reg.log.some(y => y.id === x.id) || reg.items.some(y => y.id === x.id)) x.id = BM.newId("log");
          reg.log.push(x);
        }
      });
      // Plan: fill in only what is blank; add contacts not already listed
      BM.PLAN_FIELDS.forEach(f => { if (!reg.plan[f.key] && incoming.plan[f.key]) reg.plan[f.key] = incoming.plan[f.key]; });
      incoming.plan.contacts.forEach(c => {
        const dup = reg.plan.contacts.some(x => x.role === c.role && x.organisation === c.organisation && x.phone === c.phone);
        if (!dup && reg.plan.contacts.length < BM.MAX_CONTACTS) {
          if (reg.plan.contacts.some(x => x.id === c.id)) c.id = BM.newId("ct");
          reg.plan.contacts.push(c);
        }
      });
      if (!reg.school.name) reg.school.name = incoming.school.name;
      if (!reg.school.urn) reg.school.urn = incoming.school.urn;
      reg = BM.sanitiseState(reg);    // re-check ids and links after merging
    }
    profileConflict = null;
    syncFromProfile();
    saveNow();
  }

  // ── Start-up ───────────────────────────────────────────────────────────────
  function init() {
    reg = BM.loadState();
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

// Cyber incident and breach log page. Field definitions and checks live in
// incidents-data.js (window.IncidentModel); this file is the page itself:
// views, saving, the live ICO countdown, and Excel import and export.
(function () {
  "use strict";

  // ── Everything start-up uses is declared here, above init() ──────────────
  // (init() runs on the last line of this file. An earlier tracker bug read a
  // const declared below its load call, the catch hid the error, and saved
  // data was lost on reload.)
  const IM = window.IncidentModel;
  const AM = window.AssessmentModel;
  const SL = window.SchoolLookup;
  const HIDDEN_SHEET = "_incident_log";
  const HIDDEN_MARKER = "incident-log-snapshot";
  const CELL_CHUNK = 30000;                       // Excel cells hold at most 32,767 characters
  const MAX_HIDDEN_JSON = 5 * 1024 * 1024;
  const TICK_MS = 30000;                          // how often the ICO countdown refreshes
  const RAG_CLASS = { Red: "red", Amber: "amber", Green: "green" };
  const RAG_ORDER = { Red: 0, Amber: 1, Green: 2 };
  const VIEW_TITLES = {
    dashboard: "Cyber Incident and Breach Log", list: "Incident log", edit: "Incident",
    who: "Who to tell", school: "School details", guide: "Field guide and rules"
  };
  // Dashboard "needs attention" lists: [title, reason codes]
  const ATTENTION = [
    ["Personal data breach decisions overdue", ["pdb-unassessed", "risk-unassessed", "no-reasoning"]],
    ["ICO decisions to record", ["ico-mismatch", "ico-no-reason", "ico-late"]],
    ["People affected not told", ["not-informed"]],
    ["Cyber attacks not reported", ["not-reported", "rpa-not-told", "dfe-not-told"]],
    ["DPO, governors and reasons", ["no-dpo", "governors", "notify-no-reason"]],
    ["Missing basics", ["no-discovery", "no-type", "no-outcome"]],
    ["Open too long", ["open-long"]],
    ["Lessons and risk assessment", ["no-lessons", "ra-not-updated"]]
  ];
  const LIST_COLS = [
    ["ref", "Ref"], ["title", "Title"], ["discoveredAt", "Discovered"], ["type", "Type"],
    ["pdb", "Personal data"], ["status", "Status"], ["ico", "ICO"], ["rag", "Check"]
  ];
  // Text that may be personal data or a secret. Only a prompt to the user;
  // nothing is blocked or sent anywhere.
  const PII_PATTERNS = [
    /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i,                      // email address
    /\b(password|passcode|passwd|pwd|pin)\b\s*(is|was|:|=)/i,   // "password: …"
    /\b(?:\d[ -]?){10,11}\b/                                    // phone-like number
  ];

  let log = IM.emptyState();
  let view = "dashboard";
  let editId = null;
  let fresh = null;                               // { id, snapshot } for a just-added, untouched incident
  let filters = { q: "", type: "", status: "", pdb: "", rag: "" };
  let sort = { key: "discoveredAt", dir: -1 };
  let saveTimer = null;
  let tickTimer = null;
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
  const extLink = (url, text) => {
    const h = safeHref(url);
    return h ? `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="visually-hidden"> (opens in a new tab)</span></a>` : esc(text);
  };
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 5000);
  }
  const now = () => Date.now();
  const ctx = () => ({ cover: log.school.cover });
  const evaluate = e => IM.evaluate(e, now(), ctx());
  const findItem = id => log.items.find(e => e.id === id);
  const displayName = e => [e.ref, (e.title || "").trim() || "Untitled incident"].filter(Boolean).join(" ");
  const ragPill = r => `<span class="rag-pill ${RAG_CLASS[r] || "not-set"}">${esc(r)}</span>`;
  const isOpen = e => !e.status || IM.OPEN_STATUSES.includes(e.status);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // Countdown badge for the ICO clock. data-ico-id lets the timer refresh it.
  function countdown(e, c) {
    if (!c) return "";
    const cls = c.state !== "due" ? "done" : c.left <= IM.THRESHOLDS.icoWarnHours * 3600000 ? "red" : "amber";
    return `<span class="inc-countdown ${cls}" data-ico-id="${esc(e.id)}" aria-live="off">${esc(IM.icoText(c))}</span>`;
  }

  // ── Saving ─────────────────────────────────────────────────────────────────
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(IM.STATE_KEY, JSON.stringify(log));
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
  // If the log holds a different school, offer to switch instead.
  function syncFromProfile() {
    const profile = SL && SL.loadProfile();
    if (!profile) return;
    const s = log.school;
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
    const p = profileConflict, s = log.school;
    return `<div class="profile-notice" role="status">
      The school chosen on the home page is <strong>${esc(p.name)}</strong> (URN ${esc(p.urn)}), but this log holds
      <strong>${esc(s.name || "another school")}</strong>${s.urn ? ` (URN ${esc(s.urn)})` : ""}.
      Switching changes the school details only. Your incidents stay as they are.
      <div class="inc-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(s.name || "current details")}</button>
      </div>
    </div>`;
  }

  // ── Dialog (confirmations and import choice) ──────────────────────────────
  // Resolves with the value of the button chosen, or "cancel".
  function ask(title, body, buttons) {
    return new Promise(resolve => {
      const d = $("inc-dialog");
      $("inc-dialog-title").textContent = title;
      const b = $("inc-dialog-body");
      b.textContent = "";
      (Array.isArray(body) ? body : [body]).forEach(text => {
        const p = document.createElement("p");
        p.textContent = text;
        b.appendChild(p);
      });
      const wrap = $("inc-dialog-buttons");
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

  // ── Data minimisation notice (shown on the dashboard and the form) ────────
  function privacyNotice(short) {
    return `<div class="inc-privacy" role="note">
      <h3>Keep this log free of personal data</h3>
      ${short ? "" : `<p>A breach log must not become a second copy of the breached data. Describe <strong>what kind</strong> of people and data were affected and <strong>roughly how many</strong>, never who they are.</p>`}
      <ul>
        <li>Do <strong>not</strong> record names of pupils, staff or parents. Use roles (e.g. "office manager") and numbers (e.g. "about 30 pupils").</li>
        <li>Do <strong>not</strong> record passwords, sign-in details or security codes.</li>
        <li>Do <strong>not</strong> paste or attach copies of leaked data, phishing emails or screenshots that contain personal data. Say where the investigation file is kept instead.</li>
      </ul>
      <p>Everything you enter stays in <strong>this browser</strong> on this device. The Excel export is a sensitive document: store it in a restricted, secure location and do not send it by unencrypted email.</p>
    </div>`;
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  function navigate(v, id) {
    leaveEdit();
    if (v === "add") {
      const e = IM.blankEntry();
      e.ref = IM.nextRef(log.items, now());
      e.discoveredAt = IM.msToDateTime(now());
      log.items.push(e);
      fresh = { id: e.id, snapshot: JSON.stringify(e) };
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

  // An incident added and left untouched (Log an incident, then away) is removed again
  function leaveEdit() {
    if (view !== "edit" || !editId) return;
    const e = findItem(editId);
    if (e && fresh && fresh.id === e.id && JSON.stringify(e) === fresh.snapshot) {
      log.items = log.items.filter(x => x !== e);
    }
    fresh = null;
    saveNow();
  }

  function render() {
    const views = { dashboard: viewDashboard, list: viewList, edit: viewEdit, who: viewWho, school: viewSchool, guide: viewGuide };
    $("content").innerHTML = (views[view] || viewDashboard)();
    $("topbar-title").textContent = VIEW_TITLES[view] || VIEW_TITLES.dashboard;
    document.title = (view !== "dashboard" ? (VIEW_TITLES[view] || "") + " – " : "") + "Cyber Incident and Breach Log";
    $("sidebar-nav").querySelectorAll("a[data-view]").forEach(a => {
      const on = a.dataset.view === view || (view === "edit" && a.dataset.view === "list");
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function schoolLine() {
    const s = log.school;
    return s.name || s.urn
      ? `<p class="inc-school">School: <strong>${esc(s.name)}</strong>${s.urn ? ` &nbsp;|&nbsp; URN: <strong>${esc(s.urn)}</strong>` : ""}${s.cover ? ` &nbsp;|&nbsp; Cover: ${esc(s.cover)}` : ""}</p>`
      : `<p class="inc-school"><a href="#" data-view="school">Add your school's details</a></p>`;
  }

  function viewDashboard() {
    const t = now();
    const evals = log.items.map(e => ({ e, r: IM.evaluate(e, t, ctx()) }));
    if (!log.items.length) {
      return `<div class="inc-page">
        <h2>Cyber incident and breach log</h2>
        ${profileNotice()}${schoolLine()}
        <div class="card card-body">
          <p style="margin-top:0">No incidents logged. Record every cyber incident, attack, near miss and personal data breach here, including ones you decide not to report, with who was told and when.</p>
          <div class="inc-actions">
            <a href="#" class="btn btn-primary" data-view="add">Log an incident</a>
            <a href="#" class="btn btn-secondary" data-view="who">Who to tell</a>
            <button type="button" class="btn btn-secondary" data-action="import">Import an Excel log</button>
          </div>
        </div>
        ${privacyNotice(false)}
        ${evidenceBlock()}
      </div>`;
    }

    const counts = { Red: 0, Amber: 0, Green: 0 };
    evals.forEach(x => counts[x.r.rag]++);
    const sum = IM.summarise(log, t);

    // ICO deadlines first: the most time-critical thing on the page
    const due = evals.filter(x => x.r.ico && x.r.ico.state === "due").sort((a, b) => a.r.ico.deadline - b.r.ico.deadline);
    const icoPanel = due.length ? `<section class="inc-ico-panel" aria-labelledby="ico-title">
        <h3 id="ico-title">ICO deadlines (${due.length})</h3>
        <ul>${due.map(({ e, r }) => `<li>${countdown(e, r.ico)}
          <a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a>
          <span class="inc-muted"> · deadline ${esc(IM.formatDateTime(IM.msToDateTime(r.ico.deadline)))}${r.ico.maybe ? " · still being assessed" : ""}</span></li>`).join("")}</ul>
        <p class="inc-muted">Report to the ICO within 72 hours of becoming aware of a personal data breach, unless it is unlikely to result in a risk to people. <a href="#" data-view="who">Who to tell and how</a></p>
      </section>` : "";

    const cards = [["Red", "need action now"], ["Amber", "need attention"], ["Green", "no issues found"]].map(([k, sub]) => `
      <a class="dash-card inc-count" href="#" data-filter-rag="${k}">
        <div class="dash-card-title"><span class="rag-dot ${RAG_CLASS[k]}"></span>${esc(k)}</div>
        <div class="inc-count-num">${counts[k]}</div>
        <div class="inc-count-sub">${sub}</div>
      </a>`).join("") + `
      <a class="dash-card inc-count" href="#" data-filter-status="open">
        <div class="dash-card-title">Open</div>
        <div class="inc-count-num">${sum.open}</div>
        <div class="inc-count-sub">open or contained</div>
      </a>`;

    const open = evals.filter(x => isOpen(x.e)).sort((a, b) => RAG_ORDER[a.r.rag] - RAG_ORDER[b.r.rag] || String(b.e.discoveredAt).localeCompare(String(a.e.discoveredAt)));
    const openList = open.length
      ? `<ul class="inc-plain-list">${open.map(({ e, r }) => `<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(r.rag)} <span class="inc-muted">${esc(e.status || "Open")} · discovered ${esc(IM.formatDateTime(e.discoveredAt) || "date not recorded")}</span></li>`).join("")}</ul>`
      : `<p class="inc-muted card-body">No open incidents.</p>`;

    const lists = ATTENTION.map(([title, codes]) => {
      const rows = [];
      evals.forEach(({ e, r }) => r.reasons.filter(x => codes.includes(x.code)).forEach(x =>
        rows.push(`<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(x.level)} <span>${esc(x.text)}</span></li>`)));
      if (!rows.length) return "";
      return `<details class="inc-attention" ${rows.length <= 8 ? "open" : ""}>
        <summary>${esc(title)} <span class="inc-badge">${rows.length}</span></summary>
        <ul>${rows.join("")}</ul></details>`;
    }).join("");

    // Overdue follow-up actions
    const today = IM.isoToday(t);
    const overdue = [];
    log.items.forEach(e => (e.actions || []).forEach(a => { if (!a.done && a.due && a.due < today) overdue.push({ e, a }); }));
    overdue.sort((x, y) => x.a.due.localeCompare(y.a.due));
    const overdueTable = overdue.length
      ? `<div class="card inc-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Incident</th><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">Due</th></tr></thead><tbody>
        ${overdue.map(({ e, a }) => `<tr><td><a href="#" data-edit="${esc(e.id)}">${esc(e.ref || displayName(e))}</a></td><td>${esc(a.what)}</td><td>${esc(a.owner)}</td><td class="inc-nowrap">${esc(IM.formatDate(a.due))}</td></tr>`).join("")}
        </tbody></table></div>`
      : `<p class="inc-muted">No follow-up actions are overdue.</p>`;

    // This academic year by type
    const yearStart = IM.academicYearStart(t);
    const thisYear = log.items.filter(e => e.discoveredAt && e.discoveredAt.slice(0, 10) >= yearStart);
    const byType = new Map();
    thisYear.forEach(e => { const k = e.type || "Not recorded"; byType.set(k, (byType.get(k) || 0) + 1); });
    const typeRows = IM.TYPES.concat(["Not recorded"]).filter(k => byType.has(k)).map(k =>
      `<tr><td>${esc(k)}</td><td>${byType.get(k)}</td></tr>`).join("") || `<tr><td colspan="2">None this year</td></tr>`;
    const pdbYear = thisYear.filter(e => e.pdb === "Yes").length;
    const icoYear = thisYear.filter(e => e.ico === "Submitted").length;

    return `<div class="inc-page">
      <h2>Cyber incident and breach log</h2>
      ${profileNotice()}${schoolLine()}
      ${icoPanel}
      <p class="inc-muted">${plural(log.items.length, "incident")} logged. Checked against the current date and time. <a href="#" data-view="guide">How the checks work</a></p>
      <div class="dashboard-grid inc-counts">${cards}</div>
      <h3>Open incidents</h3>
      <div class="card">${openList}</div>
      <h3>Needs attention</h3>
      ${lists || `<p class="inc-muted">Nothing needs attention.</p>`}
      <h3>Overdue follow-up actions</h3>
      ${overdueTable}
      <div class="inc-two-col">
        <div><h3>This academic year (${esc(IM.academicYearLabel(t))}) by type</h3>
          <div class="card inc-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Type</th><th scope="col">Incidents</th></tr></thead><tbody>${typeRows}</tbody></table></div>
          <p class="inc-muted">${plural(thisYear.length, "incident")} this academic year, ${pdbYear} personal data breach${pdbYear === 1 ? "" : "es"},${icoYear} reported to the ICO.</p></div>
        <div><h3>Before you start</h3>${privacyNotice(true)}</div>
      </div>
      ${evidenceBlock()}
    </div>`;
  }

  function evidenceBlock() {
    const link = id => { const s = IM.SOURCES[id]; return extLink(s.url, s.short); };
    return `<div class="card card-body inc-evidence">
      <h3 style="margin-top:0">Using this log as evidence</h3>
      <ul>
        <li><a href="dfe.html">DfE standards tracker</a>: ${link("dfe-report")} says "Any incidents, attacks or near misses should be recorded in an internal incident report or system." This log is that record.</li>
        <li>${link("dfe-risk")}: the risk assessment should "capture how many cyber incidents or attacks have already occurred and what they are". Use the totals by type above.</li>
        <li>${link("gdpr-33")}: you must document every personal data breach, including ones you do not report to the ICO.</li>
      </ul>
    </div>`;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  function viewList() {
    const opt = (list, cur, all) => `<option value="">${esc(all)}</option>` +
      list.map(o => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
    return `<div class="inc-page inc-wide">
      <h2>Incident log</h2>
      <div class="inc-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="add">&#43; Log an incident</a>
      </div>
      <div class="inc-filters" role="search">
        <div class="form-field"><label for="f-q">Search reference, title, systems or description</label>
          <input type="search" id="f-q" value="${esc(filters.q)}" autocomplete="off" /></div>
        <div class="form-field"><label for="f-type">Type</label>
          <select id="f-type" data-filter="type">${opt(IM.TYPES, filters.type, "All types")}</select></div>
        <div class="form-field"><label for="f-status">Status</label>
          <select id="f-status" data-filter="status"><option value="">All statuses</option>
            <option value="open" ${filters.status === "open" ? "selected" : ""}>Open or contained</option>
            ${IM.STATUSES.map(o => `<option value="${esc(o)}" ${o === filters.status ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
        <div class="form-field"><label for="f-pdb">Personal data breach</label>
          <select id="f-pdb" data-filter="pdb">${opt(IM.PDB, filters.pdb, "Any")}</select></div>
        <div class="form-field"><label for="f-rag">Check</label>
          <select id="f-rag" data-filter="rag">${opt(["Red", "Amber", "Green"], filters.rag, "All results")}</select></div>
      </div>
      <p class="inc-muted" id="list-count" role="status" aria-live="polite"></p>
      <div class="card inc-table-wrap" id="list-table"></div>
    </div>`;
  }

  function renderListTable() {
    const t = now();
    const q = filters.q.trim().toLowerCase();
    let rows = log.items.map(e => ({ e, r: IM.evaluate(e, t, ctx()) })).filter(({ e, r }) =>
      (!q || [e.ref, e.title, e.systems, e.description].join(" ").toLowerCase().includes(q)) &&
      (!filters.type || e.type === filters.type) &&
      (!filters.status || (filters.status === "open" ? isOpen(e) : e.status === filters.status)) &&
      (!filters.pdb || e.pdb === filters.pdb) &&
      (!filters.rag || r.rag === filters.rag));
    const key = sort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "rag") { x = RAG_ORDER[a.r.rag]; y = RAG_ORDER[b.r.rag]; }
      else if (key === "ico") { x = a.r.ico && a.r.ico.state === "due" ? a.r.ico.deadline : ""; y = b.r.ico && b.r.ico.state === "due" ? b.r.ico.deadline : ""; }
      else { x = String(a.e[key] || "").toLowerCase(); y = String(b.e[key] || "").toLowerCase(); }
      // Blanks sort last in both directions
      if (x === "" && y !== "") return 1;
      if (y === "" && x !== "") return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || String(a.e.ref).localeCompare(String(b.e.ref));
    });
    $("list-count").textContent = `Showing ${rows.length} of ${plural(log.items.length, "incident")}.`;
    const head = LIST_COLS.map(([k, label]) => {
      const s = sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none";
      const arrow = s === "ascending" ? "&#9650;" : s === "descending" ? "&#9660;" : "";
      return `<th scope="col" aria-sort="${s}"><button type="button" class="inc-sort" data-sort="${k}">${esc(label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("") + `<th scope="col">Actions</th>`;
    const body = rows.map(({ e, r }) => `<tr>
      <td class="inc-nowrap"><a href="#" data-edit="${esc(e.id)}">${esc(e.ref || "No ref")}</a></td>
      <td>${esc((e.title || "").trim() || "Untitled incident")}</td>
      <td class="inc-nowrap">${esc(IM.formatDateTime(e.discoveredAt))}</td>
      <td>${esc(e.type)}</td><td>${esc(e.pdb)}</td><td>${esc(e.status)}</td>
      <td>${r.ico ? countdown(e, r.ico) : `<span class="inc-small">${esc(e.ico === "Not required" ? "Not required" : "")}</span>`}</td>
      <td>${ragPill(r.rag)}${r.reasons.length ? `<span class="inc-reason-count">${plural(r.reasons.length, "issue")}</span>` : ""}</td>
      <td class="inc-row-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${esc(e.id)}" aria-label="Edit ${esc(displayName(e))}">Edit</button>
        <button type="button" class="btn btn-secondary btn-sm" data-duplicate="${esc(e.id)}" aria-label="Duplicate ${esc(displayName(e))}">Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(e.id)}" aria-label="Delete ${esc(displayName(e))}">Delete</button>
      </td></tr>`).join("");
    $("list-table").innerHTML = `<table class="summary-table inc-table"><thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LIST_COLS.length + 1}">${log.items.length ? "No incidents match these filters." : "No incidents logged yet."}</td></tr>`}</tbody></table>`;
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
    const describedBy = `help-${f.key} why-${f.key}${f.pii ? " pii-" + f.key : ""}`;
    const v = e[f.key];
    if (f.type === "checks") {
      return f.options.map((o, i) => `<label class="inc-check"><input type="checkbox" data-key="${f.key}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""} id="${id}-${i}" /> ${esc(o)}</label>`).join("");
    }
    if (f.type === "actions") return `<div id="actions-editor">${actionsEditor(e)}</div>`;
    if (f.type === "select") {
      return `<select id="${id}" data-key="${f.key}" aria-describedby="${describedBy}"><option value="">Not recorded</option>${f.options.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea id="${id}" data-key="${f.key}" rows="4" aria-describedby="${describedBy}">${esc(v)}</textarea>`;
    }
    const type = f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text";
    return `<input type="${type}" id="${id}" data-key="${f.key}" value="${esc(v)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} aria-describedby="${describedBy}" ${f.key === "title" ? "required" : ""} />`;
  }

  function actionsEditor(e) {
    const today = IM.isoToday(now());
    const rows = (e.actions || []).map((a, i) => `<li class="inc-action">
      <div><label for="act-what-${i}">Action ${i + 1}</label><input type="text" id="act-what-${i}" data-act="${i}" data-prop="what" value="${esc(a.what)}" /></div>
      <div><label for="act-owner-${i}">Owner (role)</label><input type="text" id="act-owner-${i}" data-act="${i}" data-prop="owner" value="${esc(a.owner)}" /></div>
      <div><label for="act-due-${i}">Due</label><input type="date" id="act-due-${i}" data-act="${i}" data-prop="due" value="${esc(a.due)}" /></div>
      <label class="inc-check"><input type="checkbox" data-act="${i}" data-prop="done" ${a.done ? "checked" : ""} /> Done</label>
      <button type="button" class="btn btn-secondary btn-sm" data-act-remove="${i}" aria-label="Remove action ${i + 1}">Remove</button>
      ${!a.done && a.due && a.due < today ? `<span class="inc-action-overdue">Overdue since ${esc(IM.formatDate(a.due))}</span>` : ""}
    </li>`).join("");
    return `<ul class="inc-action-list">${rows}</ul>
      ${(e.actions || []).length < IM.MAX_ACTIONS ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-add-action">&#43; Add a follow-up action</button>` : ""}`;
  }

  function whyLine(f) {
    if (!f.refs.length) return "";
    return "Why: " + f.refs.map(id => extLink(IM.SOURCES[id].url, IM.SOURCES[id].short)).join(" · ");
  }

  function viewEdit() {
    const e = findItem(editId);
    if (!e) return "<p>Not found.</p>";
    const groups = IM.GROUPS.map(g => {
      const fields = g.fields.map(f => {
        const wide = f.type === "textarea" || f.type === "checks" || f.type === "actions" || f.key === "title";
        const badge = f.basis === "required"
          ? `<span class="inc-basis req">Required</span>` : `<span class="inc-basis good">Good practice</span>`;
        const label = f.type === "checks"
          ? `<fieldset class="inc-checks" aria-describedby="help-${f.key} why-${f.key}"><legend>${esc(f.label)} ${badge}</legend>${fieldInput(f, e)}</fieldset>`
          : f.type === "actions"
            ? `<fieldset class="inc-checks" aria-describedby="help-${f.key} why-${f.key}"><legend>${esc(f.label)} ${badge}</legend>${fieldInput(f, e)}</fieldset>`
            : `<label for="fld-${f.key}">${esc(f.label)} ${badge}</label>${fieldInput(f, e)}`;
        return `<div class="form-field inc-field${wide ? " full-width" : ""}" data-wrap="${f.key}">
          ${label}
          ${f.pii ? `<p class="inc-pii" id="pii-${f.key}" hidden>This looks like it might contain an email address, phone number or password. Record roles, types and numbers only.</p>` : ""}
          <p class="inc-help" id="help-${f.key}">${esc(f.help)}${f.showIfText ? ` <em>(${esc(f.showIfText)})</em>` : ""}</p>
          <p class="inc-why" id="why-${f.key}">${whyLine(f)}</p>
        </div>`;
      }).join("");
      return `<fieldset class="card inc-group" id="group-${g.id}">
        <legend>${esc(g.title)}</legend>
        ${g.intro ? `<p class="inc-muted">${esc(g.intro)}</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>`;
    }).join("");
    return `<div class="inc-page">
      <p><a href="#" data-view="list">&#8592; Back to the incident log</a></p>
      <h2 id="edit-title">${esc(displayName(e))}</h2>
      <p class="inc-muted">Changes save automatically. <span class="inc-basis req">Required</span> fields support the DfE standards, UK GDPR or the RPA rules; the others are good practice. Fields that don't apply are hidden. <a href="#" data-view="who">Who to tell</a></p>
      ${privacyNotice(true)}
      <div id="rag-panel" class="card card-body inc-rag-panel" aria-live="polite"></div>
      ${groups}
      <div class="inc-actions" id="edit-actions">
        <a href="#" class="btn btn-primary" data-view="list">Done</a>
        <button type="button" class="btn btn-secondary" data-duplicate="${esc(e.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-delete="${esc(e.id)}">Delete</button>
      </div>
    </div>`;
  }

  function updateRagPanel(e) {
    const p = $("rag-panel");
    if (!p) return;
    const r = evaluate(e);
    const items = r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("");
    p.className = "card card-body inc-rag-panel " + (RAG_CLASS[r.rag] || "");
    p.innerHTML = `<div class="inc-rag-head"><strong>Check:</strong> ${ragPill(r.rag)} ${countdown(e, r.ico)}</div>` +
      (items ? `<ul class="inc-reasons">${items}</ul>` : `<p class="inc-muted">No issues found.</p>`);
  }

  function updateVisibility(e) {
    IM.FIELDS.forEach(f => {
      const w = $("content").querySelector(`[data-wrap="${f.key}"]`);
      if (w) w.hidden = !!(f.showIf && !f.showIf(e));
    });
  }

  function piiCheck(key, value) {
    const el = $("pii-" + key);
    if (el) el.hidden = !PII_PATTERNS.some(re => re.test(String(value || "")));
  }

  // Take a value from a form control and store it, validated for its field type
  function setField(e, key, value) {
    const f = IM.FIELD_BY_KEY[key];
    if (!f) return;
    const raw = {};
    raw[key] = value;
    e[key] = IM.sanitiseEntry(raw)[key];
    if (key === "status" && !value) e.status = "";
    // Closing an incident fills in today's date if none is recorded
    if (key === "status" && (value === "Closed" || value === "Resolved") && !e.closedOn) {
      e.closedOn = IM.isoToday(now());
      const c = $("fld-closedOn");
      if (c) c.value = e.closedOn;
    }
  }

  function bindActionsEditor(e) {
    const wrap = $("actions-editor");
    if (!wrap) return;
    const refresh = () => { wrap.innerHTML = actionsEditor(e); bindActionsEditor(e); updateRagPanel(e); save(); };
    wrap.querySelectorAll("[data-act]").forEach(el => {
      const i = Number(el.dataset.act), prop = el.dataset.prop;
      el.addEventListener(el.type === "checkbox" || el.type === "date" ? "change" : "input", () => {
        const a = e.actions[i];
        if (!a) return;
        const next = { what: a.what, owner: a.owner, due: a.due, done: a.done };
        next[prop] = el.type === "checkbox" ? el.checked : el.value;
        e.actions[i] = IM.sanitiseAction(next);
        if (prop === "due" || prop === "done") refresh();
        else { updateRagPanel(e); save(); }
      });
    });
    wrap.querySelectorAll("[data-act-remove]").forEach(b => b.addEventListener("click", () => {
      e.actions.splice(Number(b.dataset.actRemove), 1);
      refresh();
    }));
    const add = $("btn-add-action");
    if (add) add.addEventListener("click", () => {
      e.actions.push({ what: "", owner: "", due: "", done: false });
      refresh();
      const last = wrap.querySelector(`#act-what-${e.actions.length - 1}`);
      if (last) last.focus();
    });
  }

  // ── Who to tell ───────────────────────────────────────────────────────────
  function viewWho() {
    const S = IM.SOURCES;
    const row = (who, when, how) => `<tr><th scope="row">${who}</th><td>${when}</td><td>${how}</td></tr>`;
    return `<div class="inc-page inc-wide">
      <h2>Who to tell</h2>
      <p>Follow your own cyber response plan first. This page summarises who the DfE standard, UK GDPR and the RPA rules say to tell. Check the official pages, as contact details can change.</p>

      <h3>In the first hours</h3>
      <ol class="inc-steps">
        <li>Tell <strong>IT support</strong> and the <strong>SLT digital lead</strong> straight away. Anyone can report an incident, and nobody should be blamed for doing so.</li>
        <li>Contain it on IT support's advice. Keep evidence: don't delete emails, logs or files unless IT support says to.</li>
        <li><strong>RPA members:</strong> for a cyber incident, call RPA cyber emergency assistance on <strong>0800 368 6378</strong> (24 hours a day) or email <strong>RPAresponse@CyberClan.com</strong>. Costs incurred before the RPA accepts the claim in writing are not covered.</li>
        <li>Tell your <strong>data protection officer</strong>. Decide together, quickly, whether it is a personal data breach and how much risk it poses to the people affected. This log asks for that decision within ${IM.THRESHOLDS.assessWithinHours} hours.</li>
        <li>If there is a risk to people, report to the <strong>ICO within 72 hours</strong> of becoming aware. If the risk is high, tell the people affected too.</li>
        <li>Report cyber attacks to <strong>Report Fraud</strong> and the <strong>DfE sector cyber team</strong>, and tell your <strong>governors or trustees</strong>.</li>
      </ol>

      <h3>The 72-hour rule</h3>
      <div class="inc-rule-box">
        <blockquote>"In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the [ICO], unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons." UK GDPR Article 33(1)</blockquote>
        <ul>
          <li>The 72 hours start when the school <strong>becomes aware</strong> of the breach, and include evenings, weekends and school holidays.</li>
          <li>You don't need every detail before reporting. Article 33(4) allows you to give information "in phases".</li>
          <li>If you report after 72 hours, you must give the reasons for the delay.</li>
          <li><strong>Record every breach</strong>, including ones you decide not to report, with the reasons for that decision (Article 33(5)). The DfE says: "It is good practice to record and investigate every personal data breach, however small."</li>
          <li>If the breach is likely to result in a <strong>high risk</strong> to people, tell them without undue delay, in clear and plain language (Article 34).</li>
        </ul>
        <p class="inc-muted">${extLink(S["gdpr-33"].url, "Article 33")} · ${extLink(S["gdpr-34"].url, "Article 34")} · ${extLink(S["dp-breach"].url, "DfE: Managing breaches of data")}</p>
      </div>

      <h3>Who, when and how</h3>
      <div class="card inc-table-wrap"><table class="summary-table inc-who-table">
        <thead><tr><th scope="col">Who</th><th scope="col">When</th><th scope="col">How</th></tr></thead>
        <tbody>
          ${row("IT support and the SLT digital lead", "Every incident, attack or near miss, straight away.", "Your school's usual route. The SLT digital lead appoints someone to make any formal reports.")}
          ${row("Data protection officer (DPO)", "Any incident that might involve personal data.", "The DPO establishes whether a data breach has occurred and liaises with the ICO.")}
          ${row("Designated safeguarding lead", "Any incident that might have safeguarding implications.", "Internal.")}
          ${row("Information Commissioner's Office (ICO)", "A personal data breach, within 72 hours of becoming aware, unless it is unlikely to result in a risk to people.", `${extLink("https://ico.org.uk/for-organisations/report-a-breach/", "Report a breach on the ICO website")}. ICO helpline: 0303 123 1113.`)}
          ${row("The people affected", "A personal data breach likely to result in a high risk to them, without undue delay.", "Plain language: what happened, the likely consequences, what you have done, and your DPO's contact details.")}
          ${row("Report Fraud (formerly Action Fraud)", "Cyber incidents or attacks where any security breach may have taken place or other damage was caused.", `Phone 0300 123 2040, or ${extLink("https://www.reportfraud.police.uk/", "the Report Fraud website")}. Not sure where to report? Use ${extLink("https://www.gov.uk/report-cyber", "GOV.UK: Where to report a cyber incident")}.`)}
          ${row("DfE sector cyber team", "As above.", "Email Sector.Incidentreporting@education.gov.uk")}
          ${row("RPA or cyber insurer", "As above. RPA: as soon as reasonably practicable. RPA cyber cover is \"claims made\", so the claim must be notified in the membership year.", `RPA cyber emergency assistance: 0800 368 6378, RPAresponse@CyberClan.com. ${extLink(S["rpa-claim"].url, "Make a claim through the RPA (GOV.UK)")}. Insurers: follow your policy.`)}
          ${row("National Cyber Security Centre (NCSC)", "If the attack causes long-term school closure, the closure of more than one school, or serious financial damage.", extLink("https://report.ncsc.gov.uk/", "Report an incident to the NCSC"))}
          ${row("Police", "A crime in progress or someone in danger: 999. Theft of devices. RPA members must tell the police immediately about theft or suspected fraud.", "999 in an emergency, otherwise 101.")}
          ${row("Governors or trustees", "Every cyber incident or attack, and personal data breaches.", "They need to know the risk and what the school is doing to resolve it.")}
          ${row("Trust or local authority", "If you are part of a trust or a local authority school.", "Your trust's or local authority's IT lead. Trusts must also follow Part 6 of the academy trust handbook.")}
          ${row("Jisc", "Further education institutions only.", "Your Jisc contact.")}
        </tbody></table></div>
      <p class="inc-muted">Sources: ${extLink(S["dfe-report"].url, S["dfe-report"].short)} · ${extLink(S["gdpr-33"].url, S["gdpr-33"].short)} · ${extLink(S["rpa-rules"].url, S["rpa-rules"].short)} · ${extLink(S["dp-breach"].url, S["dp-breach"].short)}</p>
    </div>`;
  }

  // ── School details ─────────────────────────────────────────────────────────
  function viewSchool() {
    return `<div class="inc-page" style="max-width:680px">
      <h2>School details</h2>
      ${profileNotice()}
      <p class="inc-muted">Filled in from the school you choose on the <a href="index.html">home page</a>. Anything you type here is kept. Changes save automatically.</p>
      <div class="form-grid">
        <div class="form-field full-width"><label for="sch-name">School, college or trust name</label>
          <input type="text" id="sch-name" data-school="name" value="${esc(log.school.name)}" /></div>
        <div class="form-field"><label for="sch-urn">URN</label>
          <input type="text" id="sch-urn" data-school="urn" value="${esc(log.school.urn)}" inputmode="numeric" /></div>
        <div class="form-field full-width"><label for="sch-cover">Cyber cover</label>
          <select id="sch-cover" data-school="cover" aria-describedby="sch-cover-help"><option value="">Not recorded</option>
            ${IM.COVER.map(o => `<option value="${esc(o)}" ${o === log.school.cover ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <p class="inc-help" id="sch-cover-help">RPA members get a Red check when a cyber incident has not been reported to the RPA. Academies and local authority maintained schools can both be RPA members.</p></div>
      </div>
    </div>`;
  }

  // ── Field guide ────────────────────────────────────────────────────────────
  function viewGuide() {
    const th = IM.THRESHOLDS;
    const rules = ["Red", "Amber", "Green"].map(k => `<div class="rag-key-row">${ragPill(k)}<ul class="inc-rule-list">${IM.RULES[k].map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
    const rows = IM.GROUPS.map(g => g.fields.map(f => `<tr>
      <td>${esc(g.title)}</td><td>${esc(f.label)}</td>
      <td>${f.basis === "required" ? "Required" : "Good practice"}</td>
      <td>${esc(f.help)}${f.showIfText ? ` <em>Applies to: ${esc(f.showIfText)}.</em>` : ""}</td>
      <td>${whyLine(f).replace(/^Why: /, "") || "–"}</td></tr>`).join("")).join("");
    return `<div class="inc-page inc-wide">
      <h2>Field guide and rules</h2>
      <h3>How each incident is checked</h3>
      <p class="inc-muted">Checks use the current date and time. The ICO deadline is ${th.icoDeadlineHours} hours after the later of the discovery time and the time you became aware it was a personal data breach. Thresholds: Red when the deadline is less than ${th.icoWarnHours} hours away or has passed; a breach decision is due within ${th.assessWithinHours} hours of discovery; Amber when open for more than ${th.openWarnDays} days. Any Red reason makes the incident Red; otherwise any Amber reason makes it Amber.</p>
      <div class="rag-key">${rules}</div>
      ${evidenceBlock()}
      <h3>Fields</h3>
      <p class="inc-muted">The full reasoning and source quotes are in <a href="https://github.com/jonesj1994/DFEStandards/blob/main/docs/INCIDENT-LOG.md" target="_blank" rel="noopener noreferrer">INCIDENT-LOG.md</a>.</p>
      <div class="card inc-table-wrap"><table class="summary-table inc-guide">
        <thead><tr><th scope="col">Area</th><th scope="col">Field</th><th scope="col">Basis</th><th scope="col">What it means</th><th scope="col">Requirement it supports</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>`;
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function bindRowActions(root) {
    if (!root) return;
    root.querySelectorAll("[data-edit]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("edit", a.dataset.edit); }));
    root.querySelectorAll("[data-duplicate]").forEach(b => b.addEventListener("click", () => duplicate(b.dataset.duplicate)));
    root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => remove(b.dataset.delete)));
  }

  function bind() {
    const c = $("content");
    c.querySelectorAll("a[data-view]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate(a.dataset.view); }));
    c.querySelectorAll("[data-filter-rag]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      filters = { q: "", type: "", status: "", pdb: "", rag: a.dataset.filterRag };
      navigate("list");
    }));
    c.querySelectorAll("[data-filter-status]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      filters = { q: "", type: "", status: a.dataset.filterStatus, pdb: "", rag: "" };
      navigate("list");
    }));
    c.querySelectorAll("[data-action=import]").forEach(b => b.addEventListener("click", () => $("file-input").click()));
    if (view === "dashboard") bindRowActions(c);

    const sw = $("btn-profile-switch");
    if (sw) {
      sw.addEventListener("click", () => {
        log.school.name = String(profileConflict.name || "");
        log.school.urn = String(profileConflict.urn || "");
        log.school.keptURN = "";
        profileConflict = null;
        saveNow(); render(); toast("School details updated.");
      });
      $("btn-profile-keep").addEventListener("click", () => {
        log.school.keptURN = String(profileConflict.urn || "");
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
      bindRowActions($("edit-actions"));
      c.querySelectorAll("[data-key]").forEach(el => {
        const handler = () => {
          const key = el.dataset.key;
          if (el.type === "checkbox") {
            setField(e, key, Array.from(c.querySelectorAll(`input[type=checkbox][data-key="${key}"]`)).filter(x => x.checked).map(x => x.value));
          } else {
            setField(e, key, el.value);
          }
          if (key === "title" || key === "ref") $("edit-title").textContent = displayName(e);
          if (IM.FIELD_BY_KEY[key].pii) piiCheck(key, el.value);
          updateVisibility(e);
          updateRagPanel(e);
          save();
        };
        el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date" || el.type === "datetime-local" ? "change" : "input", handler);
      });
      IM.FIELDS.filter(f => f.pii).forEach(f => piiCheck(f.key, e[f.key]));
      bindActionsEditor(e);
      updateVisibility(e);
      updateRagPanel(e);
    }

    if (view === "school") {
      c.querySelectorAll("[data-school]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
        const k = el.dataset.school;
        if (k === "cover") log.school.cover = IM.COVER.includes(el.value) ? el.value : "";
        else log.school[k] = AM.limitText(el.value).slice(0, 300);
        save();
      }));
    }
  }

  function duplicate(id) {
    const e = findItem(id);
    if (!e || log.items.length >= IM.MAX_ITEMS) return;
    leaveEdit();
    const copy = IM.sanitiseEntry(JSON.parse(JSON.stringify(e)));
    copy.id = IM.newId();
    copy.ref = IM.nextRef(log.items, now());
    copy.title = ((e.title || "Untitled incident") + " (copy)").slice(0, 300);
    log.items.splice(log.items.indexOf(e) + 1, 0, copy);
    saveNow();
    view = "list";               // so navigate's leaveEdit does nothing
    navigate("edit", copy.id);
    toast("Copy made with a new reference. Change the details that differ.");
  }

  async function remove(id) {
    const e = findItem(id);
    if (!e) return;
    const choice = await ask("Delete this incident?", [
      `"${displayName(e)}" will be removed from the log. This cannot be undone.`,
      "UK GDPR asks you to keep a record of every personal data breach. Usually it is better to set the status to Closed than to delete the record."
    ], [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    log.items = log.items.filter(x => x.id !== id);
    if (fresh && fresh.id === id) fresh = null;
    saveNow();
    if (view === "edit") { view = "list"; editId = null; }
    navigate(view);
    toast(`Deleted "${displayName(e)}".`);
  }

  // ── Live ICO countdown ─────────────────────────────────────────────────────
  // Refresh the countdown text and colour without re-rendering the page, so
  // nothing the user is typing is disturbed.
  function tick() {
    const t = now();
    let colourChanged = false;
    document.querySelectorAll("[data-ico-id]").forEach(el => {
      const e = findItem(el.dataset.icoId);
      const c = e && IM.icoClock(e, t);
      if (!c) return;
      el.textContent = IM.icoText(c);
      const cls = c.state !== "due" ? "done" : c.left <= IM.THRESHOLDS.icoWarnHours * 3600000 ? "red" : "amber";
      if (!el.classList.contains(cls)) { colourChanged = true; el.className = "inc-countdown " + cls; }
    });
    // Crossing the 24-hour line changes an incident from Amber to Red
    if (colourChanged && view === "edit") { const e = findItem(editId); if (e) updateRagPanel(e); }
    else if (colourChanged && view === "list") renderListTable();
    else if (colourChanged && view === "dashboard" && !$("inc-dialog").open) render();
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  // Dates and times are written as text ("2026-11-05 14:30") so they read the
  // same everywhere and import back exactly.
  function cellValue(f, v) {
    if (f.type === "datetime") return v ? v.replace("T", " ") : "";
    if (f.type === "actions") return (v || []).map(a => [a.what, a.owner && "Owner: " + a.owner, a.due && "Due: " + IM.formatDate(a.due), a.done ? "Done" : "Not done"].filter(Boolean).join(" | ")).join("\n");
    if (Array.isArray(v)) return v.join("; ");
    return v == null ? "" : v;
  }

  async function exportExcel() {
    saveNow();
    const choice = await ask("Export the incident log?", [
      "The file describes your school's security incidents and data breaches, so treat it as sensitive.",
      "Save it somewhere only the people who need it can open, such as a restricted folder. Do not send it by unencrypted email or leave it in Downloads on a shared computer."
    ], [["Export", "export", "btn-primary"], ["Cancel", "cancel"]]);
    if (choice !== "export") return;
    const t = now();
    const wb = XLSX.utils.book_new();
    // Leave out an incident that was just added and not filled in yet
    const items = log.items.filter(e => !(fresh && fresh.id === e.id && JSON.stringify(e) === fresh.snapshot));
    const exp = { schemaVersion: log.schemaVersion, school: log.school, items };
    const sum = IM.summarise(exp, t);
    const c = ctx();

    const info = [
      ["Cyber Incident and Breach Log"],
      ["Handling", "SENSITIVE. Describes security incidents and data breaches. Store securely and share only with people who need it."],
      ["School", log.school.name],
      ["URN", log.school.urn],
      ["Cyber cover", log.school.cover],
      ["Exported on", IM.formatDateTime(IM.msToDateTime(t))],
      ["Incidents", items.length],
      ["This academic year", sum.thisYear],
      ["Open", sum.open],
      ["ICO reports due", sum.icoDue],
      ["Red", sum.Red], ["Amber", sum.Amber], ["Green", sum.Green],
      [],
      ["Checks", `Worked out at the export date and time. ICO deadline: ${IM.THRESHOLDS.icoDeadlineHours} hours after becoming aware; Red within ${IM.THRESHOLDS.icoWarnHours} hours. Breach decision due within ${IM.THRESHOLDS.assessWithinHours} hours. Amber when open more than ${IM.THRESHOLDS.openWarnDays} days.`],
      ["Import", "Import this file on the Cyber Incident and Breach Log page to restore it exactly."]
    ];
    const wsI = XLSX.utils.aoa_to_sheet(info);
    wsI["!cols"] = [{ wch: 18 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsI, "Info");

    const header = ["ID"].concat(IM.FIELDS.map(f => f.label), ["ICO deadline", "Check", "Reasons"]);
    const rows = [header];
    items.forEach(e => {
      const r = IM.evaluate(e, t, c);
      rows.push([e.id].concat(IM.FIELDS.map(f => cellValue(f, e[f.key])), [
        r.ico ? IM.icoText(r.ico) + " (" + IM.formatDateTime(IM.msToDateTime(r.ico.deadline)) + ")" : "",
        r.rag, r.reasons.map(x => `${x.level}: ${x.text}`).join("\n")]));
    });
    const wsL = XLSX.utils.aoa_to_sheet(rows);
    wsL["!cols"] = header.map((h, i) => ({ wch: i === 0 ? 20 : h === "Reasons" ? 70 : Math.max(14, Math.min(40, h.length)) }));
    wsL["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 1), c: header.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsL, "Log");

    const acts = [["Incident ID", "Reference", "Action", "Owner", "Due", "Done"]];
    items.forEach(e => (e.actions || []).forEach(a => acts.push([e.id, e.ref, a.what, a.owner, a.due, a.done ? "Yes" : "No"])));
    const wsAc = XLSX.utils.aoa_to_sheet(acts);
    wsAc["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 60 }, { wch: 24 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsAc, "Actions");

    const att = [["Reference", "Title", "Check", "Issue", "Lead"]];
    items.forEach(e => IM.evaluate(e, t, c).reasons.forEach(x => att.push([e.ref, e.title, x.level, x.text, e.lead])));
    if (att.length === 1) att.push(["Nothing needs attention."]);
    const wsA = XLSX.utils.aoa_to_sheet(att);
    wsA["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 90 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Needs attention");

    const guide = [["Area", "Field", "Basis", "What it means", "Applies to", "Requirement it supports", "Source links"]];
    IM.FIELDS.forEach(f => guide.push([
      f.groupTitle, f.label, f.basis === "required" ? "Required" : "Good practice", f.help, f.showIfText || "All incidents",
      f.refs.map(id => IM.SOURCES[id].short).join("; "), f.refs.map(id => IM.SOURCES[id].url).filter((u, i, a) => a.indexOf(u) === i).join(" ")
    ]));
    guide.push([]);
    Object.keys(IM.RULES).forEach(k => IM.RULES[k].forEach(r => guide.push(["Check rules", k, "", r])));
    const wsG = XLSX.utils.aoa_to_sheet(guide);
    wsG["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 70 }, { wch: 30 }, { wch: 80 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsG, "Field guide");

    writeHiddenSheet(wb, { kind: HIDDEN_MARKER, schemaVersion: IM.SCHEMA_VERSION, exportedAt: new Date(t).toISOString(), school: log.school, items });

    const name = log.school.name ? "_" + log.school.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) : "";
    const file = `Incident_Log${name}_${IM.isoToday(t)}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file + ". Store it securely.");
  }

  // Hidden sheet for an exact round trip, chunked like assessment-model.js's
  // "_assessment" sheet. Row 1: [marker, schema version, number of chunks].
  function writeHiddenSheet(wb, obj) {
    const json = JSON.stringify(obj);
    const rows = [[HIDDEN_MARKER, IM.SCHEMA_VERSION, 0]];
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
    if (!obj || typeof obj !== "object" || obj.kind !== HIDDEN_MARKER) throw new Error("not an incident log");
    return obj;
  }

  // ── Excel import ───────────────────────────────────────────────────────────
  const norm = s => String(s == null ? "" : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const sheet = (wb, name) => (Object.prototype.hasOwnProperty.call(wb.Sheets, name) ? wb.Sheets[name] : null);
  const infoTitle = wb => {
    const ws = sheet(wb, "Info");
    return ws && ws.A1 ? String(ws.A1.v == null ? "" : ws.A1.v).slice(0, 80) : "";
  };

  // A visible Log sheet is ours if its header has our Reference and Short title columns
  function ourLogHeader(wb) {
    const ws = sheet(wb, "Log");
    if (!ws) return -1;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }).slice(0, 20);
    return rows.findIndex(r => r.some(c => norm(c) === "reference") && r.some(c => norm(c) === "short title"));
  }

  // Hidden sheet first (exact), then the visible Log sheet (older or
  // hand-edited files). Trackers' and other registers' exports are refused
  // with a clear message.
  function readWorkbook(wb) {
    const notes = [];
    if (sheet(wb, HIDDEN_SHEET)) {
      try {
        const raw = readHiddenSheet(wb);
        if (raw.schemaVersion > IM.SCHEMA_VERSION) notes.push("the file was made by a newer version of the log; some details may be missing");
        return { state: IM.sanitiseState(raw), from: "hidden", notes };
      } catch (e) {
        notes.push("the hidden sheet was damaged (" + e.message + "), so the visible Log sheet was used");
      }
    }
    if (ourLogHeader(wb) >= 0) return { state: readVisible(wb), from: "visible", notes };
    // Not an incident log: say what it is if we can
    let framework = "";
    try {
      const snap = AM && AM.readSnapshotSheet(XLSX, wb);
      if (snap && AM.isFramework(snap.framework)) framework = snap.framework;
    } catch (e) { /* not a tracker snapshot */ }
    const title = infoTitle(wb);
    if (!framework && /digital (&|and) technology standards/i.test(title)) framework = "dfe";
    if (!framework && /cyber essentials/i.test(title)) framework = "cyber-essentials";
    if (framework) {
      const f = AM.FRAMEWORKS[framework];
      throw new Error(`this file is a ${f.label} export, not an incident log. Open it in the ${f.shortLabel} tracker instead.`);
    }
    if (sheet(wb, "_software_register") || /software register/i.test(title)) {
      throw new Error("this file is a Software Register export, not an incident log. Open it on the Software Register page instead.");
    }
    if (title && !/incident/i.test(title)) {
      throw new Error(`this file looks like a "${title}" export, not an incident log. Open it on the matching page instead.`);
    }
    if (wb.SheetNames.some(n => /^_/.test(n))) {
      throw new Error("this file is another register's or tracker's export, not an incident log.");
    }
    throw new Error("no incident log found in this file (it needs a sheet called Log with Reference and Short title columns)");
  }

  // Excel date serials and dd/mm/yyyy text become ISO dates (and times)
  function importDate(v, withTime) {
    if (typeof v === "number" && isFinite(v) && v > 0 && v < 200000) {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return "";
      const date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      return withTime ? IM.validDateTime(`${date}T${String(d.H).padStart(2, "0")}:${String(d.M).padStart(2, "0")}`) : IM.validDate(date);
    }
    const s = String(v == null ? "" : v).trim();
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(s);
    if (uk) {
      const date = `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
      return withTime ? IM.validDateTime(`${date}T${(uk[4] || "00").padStart(2, "0")}:${uk[5] || "00"}`) : IM.validDate(date);
    }
    return withTime ? IM.validDateTime(s.slice(0, 16)) : IM.validDate(s.slice(0, 10));
  }

  function readVisible(wb) {
    const s = IM.emptyState();
    const info = sheet(wb, "Info");
    if (info) {
      XLSX.utils.sheet_to_json(info, { header: 1, raw: true, defval: "" }).forEach(r => {
        if (norm(r[0]) === "school") s.school.name = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "urn") s.school.urn = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "cyber cover") s.school.cover = AM.limitText(r[1]).slice(0, 300);
      });
    }
    const rows = XLSX.utils.sheet_to_json(sheet(wb, "Log"), { header: 1, raw: true, defval: "" });
    const hi = ourLogHeader(wb);
    // Column number → field key (an array, never an object keyed by file text)
    const map = rows[hi].map(h => {
      const n = norm(h);
      if (n === "id") return "id";
      const f = IM.FIELDS.find(x => x.type !== "actions" && (norm(x.label) === n || norm(x.key) === n));
      return f ? f.key : null;
    });
    const items = [];
    rows.slice(hi + 1).forEach(r => {
      if (items.length >= IM.MAX_ITEMS) return;
      const raw = {};
      map.forEach((key, i) => {
        if (!key || r[i] === "" || r[i] == null) return;
        const f = IM.FIELD_BY_KEY[key];
        if (key === "id") raw.id = String(r[i]);
        else if (f.type === "date") raw[key] = importDate(r[i], false);
        else if (f.type === "datetime") raw[key] = importDate(r[i], true);
        else raw[key] = AM.limitText(r[i]);
      });
      if (!String(raw.ref || "").trim() && !String(raw.title || "").trim()) return;
      raw.actions = [];
      items.push(raw);
    });
    // Follow-up actions from the Actions sheet, matched by incident ID or reference
    const actWs = sheet(wb, "Actions");
    if (actWs) {
      const ar = XLSX.utils.sheet_to_json(actWs, { header: 1, raw: true, defval: "" });
      const h = (ar[0] || []).map(norm);
      const col = name => h.indexOf(name);
      ar.slice(1).forEach(r => {
        const id = String(r[col("incident id")] == null ? "" : r[col("incident id")]);
        const ref = String(r[col("reference")] == null ? "" : r[col("reference")]);
        const target = items.find(x => (id && x.id === id) || (ref && x.ref === ref));
        if (!target || target.actions.length >= IM.MAX_ACTIONS) return;
        target.actions.push({
          what: AM.limitText(r[col("action")]), owner: AM.limitText(r[col("owner")]),
          due: importDate(r[col("due")], false), done: norm(r[col("done")]) === "yes"
        });
      });
    }
    s.items = items;
    return IM.sanitiseState(s);
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
      const n = parsed.state.items.length, m = log.items.length;
      const lines = [`${file.name} has ${plural(n, "incident")}${parsed.state.school.name ? ` for ${parsed.state.school.name}` : ""}. Your log has ${m}.`];
      if (parsed.from === "visible") lines.push("This file has no hidden copy, so it was read from the visible Log sheet. Check the details after importing.");
      parsed.notes.forEach(x => lines.push("Note: " + x + "."));
      let choice;
      if (!m) {
        choice = await ask("Import this log?", lines, [["Import", "replace", "btn-primary"], ["Cancel", "cancel"]]);
      } else {
        lines.push("Merge: add the file's incidents to your log, updating incidents with the same ID or reference.");
        lines.push(`Replace: remove your ${plural(m, "current incident")} and use the file's instead. This cannot be undone, so export your log first if you might need it.`);
        choice = await ask("Import: merge or replace?", lines, [["Merge", "merge", "btn-primary"], ["Replace", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      }
      if (choice === "cancel") return;
      applyImport(parsed.state, choice);
      view = "dashboard";
      render();
      toast(`Imported ${plural(n, "incident")} (${choice === "merge" ? "merged" : "replaced"}).`);
    };
    reader.readAsArrayBuffer(file);
  }

  function applyImport(incoming, mode) {
    if (mode === "replace") {
      const current = log.school;
      log = incoming;
      // A file with no school details keeps the current ones
      if (!log.school.name && !log.school.urn) log.school = { name: current.name, urn: current.urn, keptURN: "", cover: log.school.cover || current.cover };
      log.school.keptURN = current.keptURN || "";
    } else {
      incoming.items.forEach(e => {
        let i = log.items.findIndex(x => x.id === e.id);
        if (i < 0 && e.ref) i = log.items.findIndex(x => x.ref === e.ref);
        if (i >= 0) { e.id = log.items[i].id; log.items[i] = e; }
        else if (log.items.length < IM.MAX_ITEMS) {
          if (log.items.some(x => x.id === e.id)) e.id = IM.newId();
          log.items.push(e);
        }
      });
      if (!log.school.name) log.school.name = incoming.school.name;
      if (!log.school.urn) log.school.urn = incoming.school.urn;
      if (!log.school.cover) log.school.cover = incoming.school.cover;
    }
    fresh = null;
    profileConflict = null;
    syncFromProfile();
    saveNow();
  }

  // ── Start-up ───────────────────────────────────────────────────────────────
  function init() {
    log = IM.loadState();
    syncFromProfile();
    $("btn-export").addEventListener("click", exportExcel);
    $("btn-import").addEventListener("click", () => $("file-input").click());
    $("file-input").addEventListener("change", ev => {
      if (ev.target.files[0]) importExcel(ev.target.files[0]);
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
    tickTimer = setInterval(tick, TICK_MS);
    render();
  }

  init();
})();

// User accounts and access privileges register page. Field definitions and
// compliance rules live in accounts-data.js (window.AccountsModel); this file
// is the page itself: views, saving, termly review, leavers check, and
// Excel/CSV import and export.
//
// This register must never hold passwords, PINs, recovery codes or MFA
// secrets. Imported columns that look like credentials are dropped with a
// warning, and the review page refuses change notes that look like one.
(function () {
  "use strict";

  // ── Everything start-up uses is declared here, above init() ──────────────
  // (init() runs on the last line of this file. An earlier tracker bug read a
  // const declared below its load call, and saved data was lost on reload.)
  const RM = window.AccountsModel;
  const AM = window.AssessmentModel;
  const SL = window.SchoolLookup;
  const SW = window.RegisterModel;                 // software register (optional, for system name suggestions)
  const HIDDEN_SHEET = "_accounts_register";
  const HIDDEN_MARKER = "accounts-register-snapshot";
  const INFO_TITLE = "User Accounts and Access Privileges Register";
  const CELL_CHUNK = 30000;                        // Excel cells hold at most 32,767 characters
  const MAX_HIDDEN_JSON = 5 * 1024 * 1024;
  const MAX_CSV_BYTES = 10 * 1024 * 1024;
  const RAG_CLASS = { Red: "red", Amber: "amber", Green: "green", Inactive: "met" };
  const RAG_ORDER = { Red: 0, Amber: 1, Green: 2, Inactive: 3 };
  // Hidden sheets written by the other trackers and registers, so their
  // exports can be refused with a clear message
  const OTHER_EXPORTS = [
    ["_software_register", "Software Register", "register.html"],
    ["_hardware_register", "Hardware and Asset Register", "hardware.html"],
    ["_backup_register", "Backup and Disaster Recovery Register", "index.html"],
    ["_incident_log", "Cyber Incident and Breach Log", "index.html"]
  ];
  const VIEW_TITLES = {
    dashboard: "User Accounts Register", list: "Account list", edit: "Edit account", review: "Termly access review",
    leavers: "Leavers check", quick: "Quick add and CSV import", school: "School details", guide: "Field guide and rules"
  };
  // Dashboard "needs attention" lists: [title, reason codes]
  const ATTENTION = [
    ["Possible passwords or codes recorded", ["credential"]],
    ["Leavers still active", ["leaver-active"]],
    ["Admin accounts without MFA", ["admin-no-mfa"]],
    ["Cloud or remote access without MFA", ["cloud-no-mfa"]],
    ["Admin accounts not separate, or shared", ["admin-not-separate", "shared-admin"]],
    ["Supplier access not approved or not controlled", ["supplier-no-approval", "supplier-always-on", "supplier-controls"]],
    ["Leaving soon", ["leaving-soon"]],
    ["MFA by text message only", ["mfa-sms"]],
    ["Shared accounts", ["shared"]],
    ["No approver or no owner", ["no-approver", "no-owner"]],
    ["Access reviews due", ["review-overdue"]]
  ];
  const LIST_COLS = [
    ["name", "Account"], ["holderName", "Holder"], ["accountType", "Type"], ["privilege", "Privilege"],
    ["mfa", "MFA"], ["status", "Status"], ["endDate", "End date"], ["lastReview", "Last review"], ["rag", "Check"]
  ];
  // CSV columns accepted, by normalised header
  const CSV_SYNONYMS = new Map([
    ["account", "accountName"], ["account name", "accountName"], ["account id", "accountName"], ["username", "accountName"],
    ["user name", "accountName"], ["sign in name", "accountName"], ["upn", "accountName"], ["email", "accountName"], ["email address", "accountName"],
    ["userprincipalname", "accountName"], ["user principal name", "accountName"], ["primary email", "accountName"], ["samaccountname", "accountName"],
    ["name", "holderName"], ["holder", "holderName"], ["holder name", "holderName"], ["display name", "holderName"], ["displayname", "holderName"],
    ["role", "holderRole"], ["job title", "holderRole"], ["jobtitle", "holderRole"], ["holder s role", "holderRole"],
    ["type", "accountType"], ["account type", "accountType"],
    ["systems", "systems"], ["systems covered", "systems"],
    ["privilege", "privilege"], ["privilege level", "privilege"]
  ]);

  let reg = RM.emptyState();
  let view = "dashboard";
  let editId = null;
  let filters = { q: "", accountType: "", privilege: "", status: "", rag: "" };
  let sort = { key: "name", dir: 1 };
  let reviewShowAll = false;
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
    toast.timer = setTimeout(() => t.classList.remove("show"), 5000);
  }
  const today = () => RM.isoToday();
  const fmt = iso => RM.formatDate(iso) || "";
  const findItem = id => reg.items.find(e => e.id === id);
  const displayName = e => RM.displayName(e);
  const ragPill = r => `<span class="rag-pill ${RAG_CLASS[r] || "not-set"}">${esc(r)}</span>`;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const field = key => RM.FIELD_BY_KEY.get(key);

  const CREDENTIAL_WARNING = `<div class="acc-warning" role="note"><strong>Never record passwords, PINs, recovery codes or MFA secrets here.</strong>
    This register lists who has which account and what it can do. Keep credentials in your password manager, or in the sealed emergency process agreed with SLT.</div>`;

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
        ind.classList.add("saved");
        setTimeout(() => ind.classList.remove("saved"), 2000);
      }
    }, 300);
  }

  // ── Shared school profile ─────────────────────────────────────────────────
  function syncFromProfile() {
    const profile = SL && SL.loadProfile();
    if (!profile) return;
    const s = reg.school;
    if ((s.name || s.urn) && SL.differs(s.urn, s.name, profile)) {
      if (s.keptURN !== String(profile.urn)) profileConflict = profile;
      return;
    }
    let changed = false;
    if (!s.name && profile.name) { s.name = String(profile.name).slice(0, 300); changed = true; }
    if (!s.urn && profile.urn) { s.urn = String(profile.urn).slice(0, 300); changed = true; }
    if (changed) saveNow();
  }
  function profileNotice() {
    if (!profileConflict) return "";
    const p = profileConflict, s = reg.school;
    return `<div class="profile-notice" role="status">
      The school chosen on the home page is <strong>${esc(p.name)}</strong> (URN ${esc(p.urn)}), but this register holds
      <strong>${esc(s.name || "another school")}</strong>${s.urn ? ` (URN ${esc(s.urn)})` : ""}.
      Switching changes the school details only. Your account list stays as it is.
      <div class="acc-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(s.name || "current details")}</button>
      </div>
    </div>`;
  }

  // ── Software register names for the "Systems covered" suggestions ─────────
  function fillSoftwareNames() {
    const dl = $("software-names");
    if (!dl || !SW) return;
    let names = [];
    try {
      names = SW.loadState().items.filter(x => x.status !== "Removed").map(x => String(x.name || "").trim()).filter(Boolean);
    } catch (e) { names = []; }
    dl.textContent = "";
    Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)).slice(0, 500).forEach(n => {
      const o = document.createElement("option");
      o.value = n;
      dl.appendChild(o);
    });
  }

  // ── Dialog (confirmations and import choice) ──────────────────────────────
  function ask(title, body, buttons) {
    return new Promise(resolve => {
      const d = $("acc-dialog");
      $("acc-dialog-title").textContent = title;
      const b = $("acc-dialog-body");
      b.textContent = "";
      (Array.isArray(body) ? body : [body]).forEach(text => {
        const p = document.createElement("p");
        p.textContent = text;
        b.appendChild(p);
      });
      const wrap = $("acc-dialog-buttons");
      wrap.textContent = "";
      const done = v => { d.close(); resolve(v); };
      buttons.forEach(([label, value, cls]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn " + (cls || "btn-secondary");
        btn.textContent = label;
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
    if (e && isBlank(e)) reg.items = reg.items.filter(x => x !== e);
    saveNow();
  }
  function isBlank(e) {
    const b = RM.blankEntry();
    return RM.FIELDS.every(f => String(e[f.key] || "") === String(b[f.key] || ""));
  }

  function render() {
    const views = { dashboard: viewDashboard, list: viewList, edit: viewEdit, review: viewReview, leavers: viewLeavers, quick: viewQuick, school: viewSchool, guide: viewGuide };
    $("content").innerHTML = (views[view] || viewDashboard)();
    $("topbar-title").textContent = VIEW_TITLES[view] || "User Accounts Register";
    document.title = (VIEW_TITLES[view] && view !== "dashboard" ? VIEW_TITLES[view] + " – " : "") + "User Accounts Register";
    $("sidebar-nav").querySelectorAll("a[data-view]").forEach(a => {
      const on = a.dataset.view === view || (view === "edit" && a.dataset.view === "list");
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  function schoolLine() {
    const s = reg.school;
    return s.name || s.urn
      ? `<p class="acc-school">School: <strong>${esc(s.name)}</strong>${s.urn ? ` &nbsp;|&nbsp; URN: <strong>${esc(s.urn)}</strong>` : ""}</p>`
      : `<p class="acc-school"><a href="#" data-view="school">Add your school's details</a></p>`;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function viewDashboard() {
    const t = today();
    const evals = reg.items.map(e => ({ e, r: RM.evaluate(e, t) }));
    const counts = { Red: 0, Amber: 0, Green: 0, Inactive: 0 };
    evals.forEach(x => counts[x.r.rag]++);

    if (!reg.items.length) {
      return `<div class="acc-page">
        <h2>User accounts register</h2>
        ${profileNotice()}${schoolLine()}
        ${CREDENTIAL_WARNING}
        <div class="card card-body">
          <p style="margin-top:0">Your register is empty. Record the accounts that matter most first: IT admin accounts, supplier and IT support provider (MSP) accounts, service and shared accounts, and staff with access to sensitive systems. Then add every staff account, so you can show who has access to what, that MFA is on, and that leavers are removed.</p>
          <div class="acc-actions">
            <a href="#" class="btn btn-primary" data-view="quick">Quick add common roles</a>
            <a href="#" class="btn btn-secondary" data-view="add">Add an account by hand</a>
            <button type="button" class="btn btn-secondary" data-action="import">Import an Excel register</button>
          </div>
        </div>
        ${evidenceBlock()}
      </div>`;
    }

    const sum = RM.summarise(reg, t);
    const cards = ["Red", "Amber", "Green", "Inactive"].map(k => `
      <a class="dash-card acc-count" href="#" data-filter-rag="${k}">
        <div class="dash-card-title"><span class="rag-dot ${RAG_CLASS[k]}"></span>${esc(k)}</div>
        <div class="acc-count-num">${counts[k]}</div>
        <div class="acc-count-sub">${{ Red: "need action now", Amber: "need attention soon", Green: "no issues found", Inactive: "suspended, disabled or deleted" }[k]}</div>
      </a>`).join("");

    const lists = ATTENTION.map(([title, codes]) => {
      const rows = [];
      evals.forEach(({ e, r }) => r.reasons.filter(x => codes.includes(x.code)).forEach(x =>
        rows.push(`<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(x.level)} <span>${esc(x.text)}</span></li>`)));
      if (!rows.length) return "";
      return `<details class="acc-attention" ${rows.length <= 8 ? "open" : ""}>
        <summary>${esc(title)} <span class="acc-badge">${rows.length}</span></summary>
        <ul>${rows.join("")}</ul></details>`;
    }).join("");

    const active = reg.items.filter(e => !RM.isInactive(e));
    const tally = (key, opts) => {
      const c = new Map();
      active.forEach(e => { const k = e[key] || "Not recorded"; c.set(k, (c.get(k) || 0) + 1); });
      return opts.concat(["Not recorded"]).filter(o => c.get(o)).map(o =>
        `<tr><td>${esc(o)}</td><td>${c.get(o)}</td></tr>`).join("") || `<tr><td colspan="2">None</td></tr>`;
    };
    const mfaOn = active.filter(e => e.mfa === "Yes").length;
    const due = active.filter(e => RM.reviewDue(e, t)).length;

    return `<div class="acc-page">
      <h2>User accounts register</h2>
      ${profileNotice()}${schoolLine()}
      ${CREDENTIAL_WARNING}
      <p class="acc-muted">${plural(reg.items.length, "account")} recorded, ${active.length} active (${plural(sum.admin, "admin account")}). MFA on for ${mfaOn} of ${active.length} active accounts.
        ${due ? `<a href="#" data-view="review">${due} due for this term's access review</a>.` : "All active accounts reviewed this term."}
        Checked against today's date, ${esc(fmt(t))}. <a href="#" data-view="guide">How the checks work</a></p>
      <div class="dashboard-grid acc-counts">${cards}</div>
      <h3>Needs attention</h3>
      ${lists || `<p class="acc-muted">Nothing needs attention. Keep the register up to date whenever someone joins, moves role or leaves.</p>`}
      <div class="acc-two-col">
        <div><h3>Active accounts by type</h3><div class="card acc-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Type</th><th scope="col">Accounts</th></tr></thead><tbody>${tally("accountType", RM.TYPES)}</tbody></table></div></div>
        <div><h3>Active accounts by privilege</h3><div class="card acc-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Privilege</th><th scope="col">Accounts</th></tr></thead><tbody>${tally("privilege", RM.PRIVILEGES)}</tbody></table></div></div>
      </div>
      ${evidenceBlock()}
    </div>`;
  }

  function evidenceBlock() {
    const link = id => { const s = RM.SOURCES[id]; return `<a class="guidance-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`; };
    return `<div class="card card-body acc-evidence">
      <h3 style="margin-top:0">Using this register as evidence</h3>
      <p>Export the register to Excel and refer to it from your trackers:</p>
      <ul>
        <li><a href="dfe.html">DfE standards tracker</a>: ${link("dfe-accounts")} (approval, MFA, separate admin accounts, leavers and termly reviews), and ${link("dfe-cloud-idam")} (roles with the right levels of access).</li>
        <li><a href="ce.html">Cyber Essentials tracker</a>: User access control (uac-1 to uac-6: approval process, unique credentials, removing accounts and privileges, MFA, separate admin accounts), Secure configuration (sc-1: unnecessary accounts removed) and Scope (scope-7: supplier and MSP accounts).</li>
      </ul>
      <p>This register holds staff names and roles, so treat the export as personal data: store it securely and keep it only as long as your retention schedule allows.</p>
    </div>`;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  function opt(list, cur, all) {
    return `<option value="">${esc(all)}</option>` +
      list.map(o => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
  }

  function viewList() {
    return `<div class="acc-page acc-wide">
      <h2>Account list</h2>
      <div class="acc-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="add">&#43; Add account</a>
        <a href="#" class="btn btn-secondary btn-sm" data-view="quick">Quick add</a>
      </div>
      <div class="acc-filters" role="search">
        <div class="form-field"><label for="f-q">Search account, holder, role or systems</label>
          <input type="search" id="f-q" value="${esc(filters.q)}" autocomplete="off" /></div>
        <div class="form-field"><label for="f-type">Type</label>
          <select id="f-type" data-filter="accountType">${opt(RM.TYPES, filters.accountType, "All types")}</select></div>
        <div class="form-field"><label for="f-privilege">Privilege</label>
          <select id="f-privilege" data-filter="privilege">${opt(RM.PRIVILEGES, filters.privilege, "All privileges")}</select></div>
        <div class="form-field"><label for="f-status">Status</label>
          <select id="f-status" data-filter="status">${opt(RM.STATUSES, filters.status, "All statuses")}</select></div>
        <div class="form-field"><label for="f-rag">Check</label>
          <select id="f-rag" data-filter="rag">${opt(["Red", "Amber", "Green", "Inactive"], filters.rag, "All results")}</select></div>
      </div>
      <p class="acc-muted" id="list-count" role="status" aria-live="polite"></p>
      <div class="card acc-table-wrap" id="list-table"></div>
    </div>`;
  }

  function renderListTable() {
    const t = today();
    const q = filters.q.trim().toLowerCase();
    const rows = reg.items.map(e => ({ e, r: RM.evaluate(e, t) })).filter(({ e, r }) =>
      (!q || [e.accountName, e.holderName, e.holderRole, e.systems, e.supplierName, e.purpose].join(" ").toLowerCase().includes(q)) &&
      (!filters.accountType || e.accountType === filters.accountType) &&
      (!filters.privilege || e.privilege === filters.privilege) &&
      (!filters.status || e.status === filters.status) &&
      (!filters.rag || r.rag === filters.rag));
    const key = sort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "rag") { x = RAG_ORDER[a.r.rag]; y = RAG_ORDER[b.r.rag]; }
      else if (key === "name") { x = displayName(a.e).toLowerCase(); y = displayName(b.e).toLowerCase(); }
      else { x = String(a.e[key] || "").toLowerCase(); y = String(b.e[key] || "").toLowerCase(); }
      if (x === "" && y !== "") return 1;           // blanks last in both directions
      if (y === "" && x !== "") return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || displayName(a.e).localeCompare(displayName(b.e));
    });
    $("list-count").textContent = `Showing ${rows.length} of ${plural(reg.items.length, "account")}.`;
    const head = LIST_COLS.map(([k, label]) => {
      const s = sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none";
      const arrow = s === "ascending" ? "&#9650;" : s === "descending" ? "&#9660;" : "";
      return `<th scope="col" aria-sort="${s}"><button type="button" class="acc-sort" data-sort="${k}">${esc(label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("") + `<th scope="col">Actions</th>`;
    const body = rows.map(({ e, r }) => `<tr>
      <td><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a>${e.systems ? `<span class="acc-sub">${esc(e.systems)}</span>` : ""}</td>
      <td>${esc(e.holderName || e.owner)}${e.holderRole ? `<span class="acc-sub">${esc(e.holderRole)}</span>` : ""}</td>
      <td>${esc(e.accountType)}</td><td>${esc(e.privilege)}</td><td>${esc(e.mfa)}</td><td>${esc(e.status)}</td>
      <td class="acc-nowrap">${esc(fmt(e.endDate))}</td><td class="acc-nowrap">${esc(fmt(e.lastReview))}</td>
      <td>${ragPill(r.rag)}${r.reasons.length ? `<span class="acc-reason-count">${plural(r.reasons.length, "issue")}</span>` : ""}</td>
      <td class="acc-row-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${esc(e.id)}" aria-label="Edit ${esc(displayName(e))}">Edit</button>
        <button type="button" class="btn btn-secondary btn-sm" data-duplicate="${esc(e.id)}" aria-label="Duplicate ${esc(displayName(e))}">Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(e.id)}" aria-label="Delete ${esc(displayName(e))}">Delete</button>
      </td></tr>`).join("");
    $("list-table").innerHTML = `<table class="summary-table acc-table"><thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LIST_COLS.length + 1}">${reg.items.length ? "No accounts match these filters." : "No accounts recorded yet."}</td></tr>`}</tbody></table>`;
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
    if (f.type === "select") {
      return `<select id="${id}" data-key="${f.key}" aria-describedby="${describedBy}"><option value="">Not recorded</option>${f.options.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea id="${id}" data-key="${f.key}" rows="3" aria-describedby="${describedBy}">${esc(v)}</textarea>`;
    }
    const type = f.type === "date" ? "date" : "text";
    const list = f.type === "systems" ? ` list="software-names"` : "";
    return `<input type="${type}" id="${id}" data-key="${f.key}" value="${esc(v)}"${list} autocomplete="off" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} aria-describedby="${describedBy}" />`;
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
        const wide = f.type === "textarea" || f.key === "accountName" || f.type === "systems";
        const badge = f.basis === "required"
          ? `<span class="acc-basis req">Required by a standard</span>` : `<span class="acc-basis good">Good practice</span>`;
        return `<div class="form-field acc-field${wide ? " full-width" : ""}" data-wrap="${f.key}">
          <label for="fld-${f.key}">${esc(f.label)} ${badge}</label>${fieldInput(f, e)}
          <p class="acc-help" id="help-${f.key}">${esc(f.help)}${f.showIfText ? ` <em>(${esc(f.showIfText)})</em>` : ""}</p>
          <p class="acc-why" id="why-${f.key}">${whyLine(f)}</p>
        </div>`;
      }).join("");
      return `<fieldset class="card acc-group" id="group-${g.id}" data-group="${g.id}">
        <legend>${esc(g.title)}</legend>
        ${g.intro ? `<p class="acc-muted">${esc(g.intro)}</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>`;
    }).join("");
    return `<div class="acc-page">
      <p><a href="#" data-view="list">&#8592; Back to the account list</a></p>
      <h2 id="edit-title">${esc(displayName(e))}</h2>
      ${CREDENTIAL_WARNING}
      <p class="acc-muted">Changes save automatically. Fields marked <span class="acc-basis req">Required by a standard</span> support a DfE standard, Cyber Essentials or data protection law; the others are good practice. Fields that don't apply are hidden.</p>
      <div id="rag-panel" class="card card-body acc-rag-panel" aria-live="polite"></div>
      ${groups}
      <div class="acc-actions" id="edit-actions">
        <a href="#" class="btn btn-primary" data-view="list">Done</a>
        <button type="button" class="btn btn-secondary" data-duplicate="${esc(e.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-delete="${esc(e.id)}">Delete</button>
      </div>
    </div>`;
  }

  function updateRagPanel(e) {
    const p = $("rag-panel");
    if (!p) return;
    const r = RM.evaluate(e, today());
    const items = r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("");
    p.className = "card card-body acc-rag-panel " + (RAG_CLASS[r.rag] || "");
    p.innerHTML = `<div class="acc-rag-head"><strong>Check:</strong> ${ragPill(r.rag)}</div>` +
      (r.rag === "Inactive" ? `<p class="acc-muted">Suspended, disabled and deleted accounts are kept for the record and not checked.</p>`
        : items ? `<ul class="acc-reasons">${items}</ul>` : `<p class="acc-muted">No issues found.</p>`);
  }

  function updateVisibility(e) {
    RM.GROUPS.forEach(g => {
      const box = $("content").querySelector(`[data-group="${g.id}"]`);
      if (box) box.hidden = !!(g.showIf && !g.showIf(e));
    });
    RM.FIELDS.forEach(f => {
      const w = $("content").querySelector(`[data-wrap="${f.key}"]`);
      if (w) w.hidden = !!(f.showIf && !f.showIf(e));
    });
  }

  // Take a value from a form control and store it, validated for its field type
  function setField(e, key, value) {
    if (!field(key)) return;
    const raw = {};
    raw[key] = value;
    const clean = RM.sanitiseEntry(raw);
    e[key] = clean[key];
    if (key === "status" && !value) e.status = "";
    // Record when an account was closed, if not already set
    if (key === "status" && RM.isInactive(e) && !e.disabledDate) {
      e.disabledDate = today();
      const d = $("fld-disabledDate");
      if (d) d.value = e.disabledDate;
    }
  }

  // ── Termly access review ───────────────────────────────────────────────────
  function viewReview() {
    const t = today();
    const active = reg.items.filter(e => !RM.isInactive(e));
    const done = active.filter(e => !RM.reviewDue(e, t)).length;
    const pct = active.length ? Math.round(done / active.length * 100) : 0;
    return `<div class="acc-page acc-wide">
      <h2>Termly access review</h2>
      <p>The DfE standard asks IT support to "review accounts with your business professionals or the finance team every term", changing access levels and suspending or deleting accounts no longer in use. Work through each account below with your business manager. An account counts as reviewed this term if its last review was within ${RM.THRESHOLDS.accessReviewMonths} months and its next review date has not passed.</p>
      ${CREDENTIAL_WARNING}
      <div class="card card-body">
        <div class="acc-review-bar">
          <div class="form-field"><label for="rv-reviewer">Reviewed by (recorded on each account you mark)</label>
            <input type="text" id="rv-reviewer" value="${esc(reg.reviewer)}" autocomplete="off" placeholder="e.g. J Jones (IT) and A Patel (SBM)" /></div>
          <label class="acc-check"><input type="checkbox" id="rv-all" ${reviewShowAll ? "checked" : ""} /> Show all active accounts, not just those due</label>
        </div>
        <p class="acc-muted" id="rv-progress" role="status" aria-live="polite">${done} of ${plural(active.length, "active account")} reviewed this term (${pct}%).</p>
        <div class="acc-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
      </div>
      <p class="acc-muted">For each account: <strong>No change</strong> if access is still right; <strong>Access changed</strong> after you have changed it (describe the change first, never a password); <strong>Disable</strong> if it is no longer needed. Leavers whose end date has passed are listed on the <a href="#" data-view="leavers">Leavers check</a>.</p>
      <div class="card acc-table-wrap" id="review-table"></div>
    </div>`;
  }

  function renderReviewTable() {
    const t = today();
    const rows = reg.items.filter(e => !RM.isInactive(e) && (reviewShowAll || RM.reviewDue(e, t)))
      .sort((a, b) => {
        // Admin and supplier accounts first, then oldest review first
        const pa = RM.isAdmin(a) || RM.isSupplier(a) ? 0 : 1, pb = RM.isAdmin(b) || RM.isSupplier(b) ? 0 : 1;
        return pa - pb || String(a.lastReview || "").localeCompare(String(b.lastReview || "")) || displayName(a).localeCompare(displayName(b));
      });
    const body = rows.map(e => {
      const r = RM.evaluate(e, t);
      const due = RM.reviewDue(e, t);
      const name = esc(displayName(e));
      return `<tr class="${due ? "" : "acc-done"}">
        <td><a href="#" data-edit="${esc(e.id)}">${name}</a><span class="acc-sub">${esc(e.holderName || e.owner)}${e.holderRole ? " · " + esc(e.holderRole) : ""}</span></td>
        <td>${esc(e.accountType)}<span class="acc-sub">${esc(e.privilege)}</span></td>
        <td>${esc(e.systems)}</td>
        <td class="acc-nowrap">${esc(fmt(e.lastReview)) || "Never"}${e.reviewOutcome ? `<span class="acc-sub">${esc(e.reviewOutcome)}</span>` : ""}</td>
        <td>${ragPill(r.rag)}</td>
        <td><label class="visually-hidden" for="rv-change-${esc(e.id)}">Change made to ${name}</label>
          <input type="text" class="acc-change" id="rv-change-${esc(e.id)}" data-change="${esc(e.id)}" maxlength="500" placeholder="Change made, if any" autocomplete="off" /></td>
        <td class="acc-row-actions">
          <button type="button" class="btn btn-success btn-sm" data-review="${esc(e.id)}" data-outcome="No change needed" aria-label="No change needed for ${name}">No change</button>
          <button type="button" class="btn btn-secondary btn-sm" data-review="${esc(e.id)}" data-outcome="Access changed" aria-label="Access changed for ${name}">Access changed</button>
          <button type="button" class="btn btn-danger btn-sm" data-disable="${esc(e.id)}" aria-label="Disable ${name}">Disable</button>
        </td></tr>`;
    }).join("");
    $("review-table").innerHTML = `<table class="summary-table acc-table acc-review-table"><thead><tr>
      <th scope="col">Account</th><th scope="col">Type and privilege</th><th scope="col">Systems</th><th scope="col">Last review</th>
      <th scope="col">Check</th><th scope="col">Change made</th><th scope="col">Review</th></tr></thead>
      <tbody>${body || `<tr><td colspan="7">${reg.items.length ? "Every active account has been reviewed this term." : "No accounts recorded yet."}</td></tr>`}</tbody></table>`;
    $("review-table").querySelectorAll("[data-edit]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); navigate("edit", a.dataset.edit); }));
    $("review-table").querySelectorAll("[data-review]").forEach(b => b.addEventListener("click", () => reviewAccount(b.dataset.review, b.dataset.outcome)));
    $("review-table").querySelectorAll("[data-disable]").forEach(b => b.addEventListener("click", () => disableAccount(b.dataset.disable, "review")));
  }

  function changeText(id) {
    const input = $("review-table") && $("review-table").querySelector(`[data-change="${CSS.escape(id)}"]`);
    return input ? AM.limitText(input.value).trim().slice(0, 500) : "";
  }

  function appendNote(e, text) {
    e.notes = AM.limitText((e.notes ? e.notes + "\n" : "") + text);
  }

  function reviewAccount(id, outcome) {
    const e = findItem(id);
    if (!e) return;
    const change = changeText(id);
    if (outcome === "Access changed" && !change) { toast("Describe the change you made first, in the \"Change made\" box."); return; }
    if (RM.looksLikeCredentialText(change)) { toast("That looks like a password or code, so it was not saved. Describe the change without it."); return; }
    const t = today();
    e.lastReview = t;
    e.reviewedBy = reg.reviewer;
    e.reviewOutcome = outcome;
    e.nextReview = RM.addMonths(t, RM.THRESHOLDS.accessReviewMonths);
    if (change) appendNote(e, `${fmt(t)} access review${reg.reviewer ? " (" + reg.reviewer + ")" : ""}: ${change}`);
    saveNow();
    refreshReview();
    toast(`${displayName(e)}: marked reviewed (${outcome.toLowerCase()}).`);
  }

  async function disableAccount(id, from) {
    const e = findItem(id);
    if (!e) return;
    const change = from === "review" ? changeText(id) : "";
    if (RM.looksLikeCredentialText(change)) { toast("That looks like a password or code, so it was not saved. Describe the change without it."); return; }
    const choice = await ask("Mark this account as disabled?", [
      `"${displayName(e)}" will be marked Disabled in the register, with today's date.`,
      "This only updates the register. Make sure the account is actually disabled in each system it covers" + (e.systems ? ` (${e.systems})` : "") + "."
    ], [["Mark as disabled", "disable", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "disable") return;
    const t = today();
    e.status = "Disabled";
    e.disabledDate = t;
    if (from === "review") {
      e.lastReview = t;
      e.reviewedBy = reg.reviewer;
      e.reviewOutcome = "Disabled or removed";
    }
    appendNote(e, `${fmt(t)} disabled${from === "review" ? " at access review" : " from the leavers check"}${reg.reviewer && from === "review" ? " (" + reg.reviewer + ")" : ""}${change ? ": " + change : ""}`);
    saveNow();
    if (view === "review") refreshReview(); else render();
    toast(`${displayName(e)}: marked as disabled.`);
  }

  function refreshReview() {
    const t = today();
    const active = reg.items.filter(e => !RM.isInactive(e));
    const done = active.filter(e => !RM.reviewDue(e, t)).length;
    const pct = active.length ? Math.round(done / active.length * 100) : 0;
    $("rv-progress").textContent = `${done} of ${plural(active.length, "active account")} reviewed this term (${pct}%).`;
    $("content").querySelector(".acc-progress span").style.width = pct + "%";
    renderReviewTable();
    const next = $("review-table").querySelector("[data-review]");
    if (next) next.focus();
    else { const h = $("content").querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } }
  }

  // ── Leavers check ──────────────────────────────────────────────────────────
  function viewLeavers() {
    const t = today();
    const soon = RM.addDays(t, RM.THRESHOLDS.leaverWarnDays);
    const active = reg.items.filter(e => !RM.isInactive(e));
    const past = active.filter(e => e.endDate && e.endDate < t).sort((a, b) => a.endDate.localeCompare(b.endDate));
    const coming = active.filter(e => e.endDate && e.endDate >= t && e.endDate <= soon).sort((a, b) => a.endDate.localeCompare(b.endDate));
    const temporary = active.filter(e => !e.endDate && (e.accountType === "Volunteer or supply" || RM.isSupplier(e)));
    const old = reg.items.filter(e => RM.retentionDue(e, t));
    const table = (rows, withButton) => rows.length ? `<div class="card acc-table-wrap"><table class="summary-table acc-table" style="min-width:640px"><thead><tr>
        <th scope="col">Account</th><th scope="col">Holder</th><th scope="col">Systems</th><th scope="col">Date</th>${withButton ? `<th scope="col">Action</th>` : ""}</tr></thead><tbody>
        ${rows.map(e => `<tr><td><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a><span class="acc-sub">${esc(e.accountType)}</span></td>
          <td>${esc(e.holderName || e.owner)}${e.holderRole ? `<span class="acc-sub">${esc(e.holderRole)}</span>` : ""}</td>
          <td>${esc(e.systems)}</td><td class="acc-nowrap">${esc(fmt(e.endDate || e.disabledDate))}</td>
          ${withButton ? `<td><button type="button" class="btn btn-danger btn-sm" data-disable="${esc(e.id)}" aria-label="Disable ${esc(displayName(e))}">Disable</button></td>` : ""}</tr>`).join("")}
        </tbody></table></div>` : `<p class="acc-muted">None.</p>`;
    return `<div class="acc-page acc-wide">
      <h2>Leavers check</h2>
      <p>Cyber Essentials asks you to "remove or disable user accounts when they're no longer required (for example, when a user leaves the organisation …)", and the DfE standard asks IT support to disable accounts "as soon as someone leaves their role". Check this list against HR's leavers list.</p>
      <h3>Still active after their end or leave date <span class="acc-badge">${past.length}</span></h3>
      ${table(past, true)}
      <h3>Leaving in the next ${RM.THRESHOLDS.leaverWarnDays} days <span class="acc-badge">${coming.length}</span></h3>
      ${table(coming, false)}
      <h3>Supply, volunteer and supplier accounts with no end date <span class="acc-badge">${temporary.length}</span></h3>
      <p class="acc-muted">Temporary access should have an end date so it is not forgotten.</p>
      ${table(temporary, false)}
      <h3>Closed accounts to check against your retention schedule <span class="acc-badge">${old.length}</span></h3>
      <p class="acc-muted">Disabled or deleted more than ${RM.THRESHOLDS.closedRecordMonths} months ago. Personal data should be kept only as long as it is needed: ask your data protection officer how long to keep these records, then delete the rows you no longer need.</p>
      ${table(old, false)}
    </div>`;
  }

  // ── Quick add and CSV ──────────────────────────────────────────────────────
  function viewQuick() {
    const roleCount = new Map();
    reg.items.forEach(e => { const k = String(e.holderRole || "").trim().toLowerCase(); roleCount.set(k, (roleCount.get(k) || 0) + 1); });
    const rows = RM.STARTERS.map((s, i) => {
      const n = roleCount.get(s.role.toLowerCase()) || 0;
      return `<li><label class="acc-check"><input type="checkbox" data-starter="${i}" />
        ${esc(s.role)} <span class="acc-muted">${esc(s.accountType)}${s.privilege !== "Standard user" ? " · " + esc(s.privilege) : ""}${n ? ` · ${n} already` : ""}</span></label></li>`;
    }).join("");
    return `<div class="acc-page">
      <h2>Quick add</h2>
      <p>Tick the roles your school has. One account is added for each, with its role, type and privilege level only. Then open each one to add the account name, holder and dates, and use <strong>Duplicate</strong> for more people in the same role.</p>
      ${CREDENTIAL_WARNING}
      <div class="card card-body">
        <p style="margin-top:0"><button type="button" class="btn btn-secondary btn-sm" id="btn-select-all">Select all</button></p>
        <ul class="acc-starters">${rows}</ul>
        <button type="button" class="btn btn-primary" id="btn-quick-add">Add selected</button>
      </div>
      <h2>Import a list from CSV</h2>
      <div class="card card-body">
        <p style="margin-top:0">Add a basic list from a spreadsheet saved as CSV, for example an export of users from Microsoft 365 or Google Admin. Use a header row with any of: <strong>Account</strong> (or Username, Email, UPN), <strong>Name</strong>, <strong>Role</strong> (or Job title), <strong>Type</strong>, <strong>Privilege</strong> and <strong>Systems</strong>. Accounts already in the register (same account name) are skipped.</p>
        <p class="acc-muted"><strong>Any column that looks like a password, PIN, secret, token or recovery code is dropped and never saved.</strong> Remove such columns from the file before you import it, and delete the file securely afterwards.</p>
        <button type="button" class="btn btn-secondary" id="btn-csv">&#8593; Choose a CSV file</button>
      </div>
    </div>`;
  }

  function addStarters(indexes) {
    let added = 0;
    indexes.forEach(i => {
      const s = RM.STARTERS[i];
      if (!s || reg.items.length >= RM.MAX_ITEMS) return;
      reg.items.push(RM.sanitiseEntry({ holderRole: s.role, accountType: s.accountType, privilege: s.privilege, status: "Active" }));
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

  const accountKey = e => String(e.accountName || "").trim().toLowerCase();

  function importCSV(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name || "")) { toast(`Import failed: "${file.name}" is not a .csv file.`); return; }
    if (file.size > MAX_CSV_BYTES) { toast(`Import failed: "${file.name}" is over 10 MB, so it was refused.`); return; }
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const rows = parseCSV(String(ev.target.result || "").replace(/^﻿/, "")).filter(r => r.some(c => c.trim()));
        if (!rows.length) throw new Error("the file is empty");
        const head = rows[0].map(c => RM.normHeader(c));
        const dropped = [];
        const cols = [];                       // [column index, field key]
        head.forEach((h, i) => {
          if (RM.looksLikeCredentialHeader(h)) { dropped.push(AM.limitText(rows[0][i]).trim().slice(0, 60)); return; }
          const key = CSV_SYNONYMS.get(h) || (RM.FIELDS.find(f => RM.normHeader(f.label) === h || f.key.toLowerCase() === h.replace(/ /g, "")) || {}).key;
          if (key && !cols.some(c => c[1] === key)) cols.push([i, key]);
        });
        if (!cols.length) throw new Error("no recognised columns. Use a header row with Account, Name, Role, Type, Privilege or Systems");
        const have = new Set(reg.items.map(accountKey).filter(Boolean));
        const add = [];
        let skipped = 0;
        rows.slice(1).forEach(r => {
          const raw = { status: "Active" };
          cols.forEach(([i, key]) => {
            const v = r[i] == null ? "" : AM.limitText(r[i]).trim();
            if (v) raw[key] = field(key).type === "select" ? v : v.slice(0, 1000);
          });
          const e = RM.sanitiseEntry(raw);
          if (!e.accountName && !e.holderName && !e.holderRole) return;
          const k = accountKey(e);
          if (k && have.has(k)) { skipped++; return; }
          if (k) have.add(k);
          add.push(e);
        });
        const room = RM.MAX_ITEMS - reg.items.length;
        const lines = [];
        if (dropped.length) lines.push(`Warning: ${plural(dropped.length, "column")} that looked like passwords or other credentials (${dropped.join(", ")}) ${dropped.length === 1 ? "was" : "were"} dropped and not saved. Delete the original file securely.`);
        if (!add.length) {
          toast(`Nothing to add from ${file.name}${skipped ? `: ${skipped} already in the register` : ""}.${dropped.length ? " Credential columns were dropped." : ""}`);
          return;
        }
        const n = Math.min(add.length, room);
        lines.unshift(`${plural(n, "account")} will be added to your register from ${file.name}.`);
        if (skipped) lines.push(`${skipped} already in the register will be skipped.`);
        if (add.length > room) lines.push(`Only ${room} more can be added: the register holds up to ${RM.MAX_ITEMS} accounts.`);
        const choice = await ask("Add accounts from CSV?", lines, [["Add them", "add", "btn-primary"], ["Cancel", "cancel"]]);
        if (choice !== "add") return;
        reg.items.push(...add.slice(0, room));
        saveNow();
        navigate("list");
        toast(`Added ${plural(n, "account")} from ${file.name}.${dropped.length ? " Credential columns were dropped." : ""}`);
      } catch (err) { toast("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  }

  // ── School details ─────────────────────────────────────────────────────────
  function viewSchool() {
    return `<div class="acc-page" style="max-width:680px">
      <h2>School details</h2>
      ${profileNotice()}
      <p class="acc-muted">Filled in from the school you choose on the <a href="index.html">home page</a>. Anything you type here is kept. Changes save automatically.</p>
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
    const rules = ["Red", "Amber", "Green", "Inactive"].map(k => `<div class="rag-key-row">${ragPill(k)}<ul class="acc-rule-list">${RM.RULES[k].map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
    const rows = RM.GROUPS.map(g => g.fields.map(f => `<tr>
      <td>${esc(g.title)}</td><td>${esc(f.label)}</td>
      <td>${f.basis === "required" ? "Required by a standard" : "Good practice"}</td>
      <td>${esc(f.help)}${f.showIfText ? ` <em>Applies to: ${esc(f.showIfText)}.</em>` : ""}</td>
      <td>${whyLine(f).replace(/^Why: /, "") || "–"}</td></tr>`).join("")).join("");
    return `<div class="acc-page acc-wide">
      <h2>Field guide and rules</h2>
      ${CREDENTIAL_WARNING}
      <h3>How each account is checked</h3>
      <p class="acc-muted">Checks use today's date. "Every term" is taken as every ${th.accessReviewMonths} months (three terms a year). Leavers are flagged ${th.leaverWarnDays} days ahead. Any Red reason makes the account Red; otherwise any Amber reason makes it Amber.</p>
      <div class="rag-key">${rules}</div>
      <h3>Personal data in this register</h3>
      <p class="acc-muted">The register holds staff names, roles and account names, which are personal data. Record only what you need to manage access: no dates of birth, home addresses, personal phone numbers or credentials. Keep closed accounts only as long as your retention schedule says (ask your data protection officer), then delete the rows. The <a href="#" data-view="leavers">Leavers check</a> lists accounts closed more than ${th.closedRecordMonths} months ago.</p>
      ${evidenceBlock()}
      <h3>Fields</h3>
      <p class="acc-muted">The full reasoning and source quotes are in <a href="https://github.com/jonesj1994/DFEStandards/blob/main/docs/ACCOUNTS-REGISTER.md" target="_blank" rel="noopener">ACCOUNTS-REGISTER.md</a>.</p>
      <div class="card acc-table-wrap"><table class="summary-table acc-guide">
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
      filters = { q: "", accountType: "", privilege: "", status: "", rag: a.dataset.filterRag };
      navigate("list");
    }));
    c.querySelectorAll("[data-action=import]").forEach(b => b.addEventListener("click", () => $("file-input").click()));
    if (view === "dashboard") bindRowActions(c);

    const sw = $("btn-profile-switch");
    if (sw) {
      sw.addEventListener("click", () => {
        reg.school.name = String(profileConflict.name || "").slice(0, 300);
        reg.school.urn = String(profileConflict.urn || "").slice(0, 300);
        reg.school.keptURN = "";
        profileConflict = null;
        saveNow(); render(); toast("School details updated.");
      });
      $("btn-profile-keep").addEventListener("click", () => {
        reg.school.keptURN = String(profileConflict.urn || "").slice(0, 300);
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
          setField(e, key, el.value);
          if (["accountName", "holderName", "holderRole"].includes(key)) $("edit-title").textContent = displayName(e);
          updateVisibility(e);
          updateRagPanel(e);
          save();
        };
        el.addEventListener(el.tagName === "SELECT" || el.type === "date" ? "change" : "input", handler);
      });
      updateVisibility(e);
      updateRagPanel(e);
    }

    if (view === "review") {
      $("rv-reviewer").addEventListener("input", ev => { reg.reviewer = AM.limitText(ev.target.value).slice(0, 300); save(); });
      $("rv-all").addEventListener("change", ev => { reviewShowAll = ev.target.checked; renderReviewTable(); });
      renderReviewTable();
    }

    if (view === "leavers") {
      bindRowActions(c);
      c.querySelectorAll("[data-disable]").forEach(b => b.addEventListener("click", () => disableAccount(b.dataset.disable, "leavers")));
    }

    if (view === "quick") {
      $("btn-select-all").addEventListener("click", () => c.querySelectorAll("[data-starter]").forEach(x => { x.checked = true; }));
      $("btn-quick-add").addEventListener("click", () => {
        const picked = Array.from(c.querySelectorAll("[data-starter]:checked")).map(x => Number(x.dataset.starter));
        if (!picked.length) { toast("Tick the roles you want to add first."); return; }
        const n = addStarters(picked);
        navigate("list");
        toast(`Added ${plural(n, "account")}. Open each one to fill in its details.`);
      });
      $("btn-csv").addEventListener("click", () => $("csv-input").click());
    }

    if (view === "school") {
      c.querySelectorAll("[data-school]").forEach(el => el.addEventListener("input", () => {
        const k = el.dataset.school;
        if (k !== "name" && k !== "urn") return;
        reg.school[k] = AM.limitText(el.value).slice(0, 300);
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
    // A copy is for another person in the same role: clear who and when
    ["accountName", "holderName", "approvalDate", "startDate", "endDate", "disabledDate", "lastReview", "reviewedBy", "reviewOutcome", "nextReview", "notes"].forEach(k => { copy[k] = ""; });
    copy.status = "Active";
    reg.items.splice(reg.items.indexOf(e) + 1, 0, copy);
    saveNow();
    view = "list";               // so navigate's leaveEdit does nothing
    navigate("edit", copy.id);
    toast("Copy made with the same role, systems and settings. Fill in the account name and holder.");
  }

  async function remove(id) {
    const e = findItem(id);
    if (!e) return;
    const choice = await ask("Delete this account from the register?", [
      `"${displayName(e)}" will be removed from the register. This cannot be undone.`,
      "If the account has just been closed, set its status to Disabled or Deleted instead, to keep a record of when it was closed. Delete rows only when your retention schedule says you no longer need them."
    ], [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    reg.items = reg.items.filter(x => x.id !== id);
    saveNow();
    if (view === "edit") { view = "list"; editId = null; }
    navigate(view);
    toast(`Deleted "${displayName(e)}".`);
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  function exportExcel() {
    leaveEdit();
    const t = today();
    const wb = XLSX.utils.book_new();
    const sum = RM.summarise(reg, t);

    const info = [
      [INFO_TITLE],
      ["School", reg.school.name],
      ["URN", reg.school.urn],
      ["Exported on", t],
      ["Accounts", reg.items.length],
      ["Active", sum.active], ["Admin (active)", sum.admin], ["Leavers still active", sum.leavers],
      ["Red", sum.Red], ["Amber", sum.Amber], ["Green", sum.Green], ["Inactive", sum.Inactive],
      [],
      ["Checks", `Red and Amber are worked out on the export date. Access reviews are due every ${RM.THRESHOLDS.accessReviewMonths} months (once a term); leavers are flagged ${RM.THRESHOLDS.leaverWarnDays} days ahead.`],
      ["Personal data", "This file holds staff names and roles. Store it securely, share it only with people who need it, and keep it only as long as your retention schedule allows."],
      ["Credentials", "This register never holds passwords, PINs, recovery codes or MFA secrets. Do not add them to this file."],
      ["Import", "Import this file on the User Accounts Register page to restore it exactly."]
    ];
    const wsI = XLSX.utils.aoa_to_sheet(info);
    wsI["!cols"] = [{ wch: 20 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsI, "Info");

    const header = ["ID"].concat(RM.FIELDS.map(f => f.label), ["Check", "Reasons"]);
    const rows = [header];
    reg.items.forEach(e => {
      const r = RM.evaluate(e, t);
      rows.push([e.id].concat(RM.FIELDS.map(f => e[f.key] == null ? "" : e[f.key]), [r.rag, r.reasons.map(x => `${x.level}: ${x.text}`).join("\n")]));
    });
    const wsR = XLSX.utils.aoa_to_sheet(rows);
    wsR["!cols"] = header.map((h, i) => ({ wch: i === 0 ? 22 : h === "Reasons" ? 70 : h === "Notes" ? 50 : Math.max(14, Math.min(30, h.length)) }));
    wsR["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 1), c: header.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsR, "Register");

    const att = [["Account", "Holder", "Type", "Check", "Issue", "Approved by"]];
    reg.items.forEach(e => RM.evaluate(e, t).reasons.forEach(x => att.push([displayName(e), e.holderName || e.owner, e.accountType, x.level, x.text, e.approvedBy])));
    if (att.length === 1) att.push(["Nothing needs attention."]);
    const wsA = XLSX.utils.aoa_to_sheet(att);
    wsA["!cols"] = [{ wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 8 }, { wch: 90 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Needs attention");

    const guide = [["Area", "Field", "Basis", "What it means", "Applies to", "Requirement it supports", "Source links"]];
    RM.FIELDS.forEach(f => guide.push([
      f.groupTitle, f.label, f.basis === "required" ? "Required by a standard" : "Good practice", f.help, f.showIfText || "All accounts",
      f.refs.map(id => RM.SOURCES[id].short).join("; "), f.refs.map(id => RM.SOURCES[id].url).filter((u, i, a) => a.indexOf(u) === i).join(" ")
    ]));
    guide.push([]);
    Object.keys(RM.RULES).forEach(k => RM.RULES[k].forEach(r => guide.push(["Check rules", k, "", r])));
    const wsG = XLSX.utils.aoa_to_sheet(guide);
    wsG["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 22 }, { wch: 70 }, { wch: 30 }, { wch: 80 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsG, "Field guide");

    writeHiddenSheet(wb, { kind: HIDDEN_MARKER, schemaVersion: RM.SCHEMA_VERSION, exportedAt: new Date().toISOString(), school: reg.school, reviewer: reg.reviewer, items: reg.items });

    const name = reg.school.name ? "_" + reg.school.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) : "";
    const file = `User_Accounts_Register${name}_${t}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file + ". It holds staff personal data, so store it securely.");
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
    if (!obj || typeof obj !== "object" || obj.kind !== HIDDEN_MARKER) throw new Error("not a user accounts register");
    return obj;
  }

  const sheetNames = wb => (Array.isArray(wb.SheetNames) ? wb.SheetNames : []);
  const hasSheet = (wb, name) => sheetNames(wb).includes(name) && !!wb.Sheets[name];

  // ── Excel import ───────────────────────────────────────────────────────────
  // Hidden sheet first (exact), then the visible Register sheet (older or
  // hand-edited files). Tracker and other register exports are refused.
  function readWorkbook(wb) {
    const notes = [];
    if (hasSheet(wb, HIDDEN_SHEET)) {
      try {
        const raw = readHiddenSheet(wb);
        if (typeof raw.schemaVersion === "number" && raw.schemaVersion > RM.SCHEMA_VERSION) notes.push("the file was made by a newer version of the register; some details may be missing");
        const rep = RM.sanitiseStateWithReport(raw);
        if (rep.dropped) notes.push(`${plural(rep.dropped, "field")} that looked like passwords or other credentials ${rep.dropped === 1 ? "was" : "were"} dropped and not saved`);
        return { state: rep.state, from: "hidden", notes, dropped: rep.dropped ? ["hidden data"] : [] };
      } catch (e) {
        notes.push("the hidden sheet was damaged (" + e.message + "), so the visible Register sheet was used");
      }
    }
    // Another register's export?
    for (const [sheet, label, page] of OTHER_EXPORTS) {
      if (hasSheet(wb, sheet)) throw new Error(`this file is a ${label} export, not a user accounts register.${page !== "index.html" ? ` Import it on the ${label} page (${page}) instead.` : ""}`);
    }
    // A tracker export?
    let framework = "";
    try {
      const snap = AM && AM.readSnapshotSheet(XLSX, wb);
      if (snap && AM.isFramework(snap.framework)) framework = snap.framework;
    } catch (e) { /* not a tracker snapshot */ }
    const a1 = hasSheet(wb, "Info") && wb.Sheets.Info.A1 ? String(wb.Sheets.Info.A1.v || "").slice(0, 200) : "";
    if (!framework && a1) {
      if (/digital (&|and) technology standards/i.test(a1)) framework = "dfe";
      else if (/cyber essentials/i.test(a1)) framework = "cyber-essentials";
    }
    if (framework) {
      const f = AM.FRAMEWORKS[framework];
      throw new Error(`this file is a ${f.label} export, not a user accounts register. Open it in the ${f.shortLabel} tracker instead.`);
    }
    if (a1 && a1 !== INFO_TITLE && /register|log|tracker|overview/i.test(a1)) {
      throw new Error(`this file looks like a "${a1}" export, not a user accounts register.`);
    }
    if (hasSheet(wb, "Register")) {
      const v = readVisible(wb);
      if (v.dropped.length) notes.push(`${plural(v.dropped.length, "column")} that looked like passwords or other credentials (${v.dropped.join(", ")}) ${v.dropped.length === 1 ? "was" : "were"} dropped and not saved`);
      return { state: v.state, from: "visible", notes, dropped: v.dropped };
    }
    throw new Error("no user accounts register found in this file (it needs a sheet called Register)");
  }

  const norm = s => RM.normHeader(s);

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
    if (hasSheet(wb, "Info")) {
      XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1, raw: true, defval: "" }).forEach(r => {
        if (norm(r[0]) === "school") s.school.name = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "urn") s.school.urn = AM.limitText(r[1]).slice(0, 300);
      });
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Register, { header: 1, raw: true, defval: "" });
    const accountLabel = norm(field("accountName").label);
    const hi = rows.findIndex(r => r.some(c => { const n = norm(c); return n === accountLabel || n === "account name" || n === "accountname"; }));
    if (hi < 0) throw new Error("the Register sheet has no \"Account name or ID\" column, so it is not a user accounts register");
    const dropped = [];
    const map = rows[hi].map(h => {
      const n = norm(h);
      if (n === "id") return "id";
      if (RM.looksLikeCredentialHeader(n)) { dropped.push(AM.limitText(h).trim().slice(0, 60)); return null; }
      const f = RM.FIELDS.find(x => norm(x.label) === n || x.key.toLowerCase() === n.replace(/ /g, ""));
      return f ? f.key : null;
    });
    const items = [];
    rows.slice(hi + 1).forEach(r => {
      if (items.length >= RM.MAX_ITEMS) return;
      const raw = {};
      map.forEach((key, i) => {
        if (!key || r[i] === "" || r[i] == null) return;
        if (key === "id") { raw.id = String(r[i]); return; }
        raw[key] = field(key).type === "date" ? importDate(r[i]) : AM.limitText(r[i]);
      });
      if (!String(raw.accountName || "").trim() && !String(raw.holderName || "").trim() && !String(raw.holderRole || "").trim()) return;
      items.push(raw);
    });
    s.items = items;
    return { state: RM.sanitiseState(s), dropped };
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
      const lines = [`${file.name} has ${plural(n, "account")}${parsed.state.school.name ? ` for ${parsed.state.school.name}` : ""}. Your register has ${m}.`];
      if (parsed.from === "visible") lines.push("This file has no hidden copy, so it was read from the visible Register sheet. Check the details after importing.");
      parsed.notes.forEach(x => lines.push((/credential/.test(x) ? "Warning: " : "Note: ") + x + "."));
      let choice;
      if (!m) {
        choice = await ask("Import this register?", lines, [["Import", "replace", "btn-primary"], ["Cancel", "cancel"]]);
      } else {
        lines.push("Merge: add the file's accounts to your register, updating accounts with the same ID or the same account name.");
        lines.push(`Replace: remove your ${plural(m, "current account")} and use the file's instead. This cannot be undone, so export your register first if you might need it.`);
        choice = await ask("Import: merge or replace?", lines, [["Merge", "merge", "btn-primary"], ["Replace", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      }
      if (choice === "cancel") return;
      applyImport(parsed.state, choice);
      view = "dashboard";
      render();
      toast(`Imported ${plural(n, "account")} (${choice === "merge" ? "merged" : "replaced"}).${parsed.dropped.length ? " Credential columns were dropped." : ""}`);
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
        if (i < 0 && accountKey(e)) i = reg.items.findIndex(x => accountKey(x) === accountKey(e));
        if (i >= 0) { e.id = reg.items[i].id; reg.items[i] = e; }
        else if (reg.items.length < RM.MAX_ITEMS) {
          if (reg.items.some(x => x.id === e.id)) e.id = RM.newId();
          reg.items.push(e);
        }
      });
      if (!reg.school.name) reg.school.name = incoming.school.name;
      if (!reg.school.urn) reg.school.urn = incoming.school.urn;
      if (!reg.reviewer) reg.reviewer = incoming.reviewer;
    }
    profileConflict = null;
    syncFromProfile();
    saveNow();
  }

  // ── Start-up ───────────────────────────────────────────────────────────────
  function init() {
    reg = RM.loadState();
    syncFromProfile();
    fillSoftwareNames();
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

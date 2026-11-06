// Hardware and asset register page. Field definitions and compliance rules
// live in hardware-data.js (window.HardwareModel); this file is the page
// itself: views, saving, and Excel/CSV import and export.
(function () {
  "use strict";

  // ── Everything start-up uses is declared here, above init() ──────────────
  // (init() runs on the last line of this file. An earlier tracker bug read a
  // const declared below its load call, and saved data was lost on reload.)
  const HM = window.HardwareModel;
  const AM = window.AssessmentModel;
  const SL = window.SchoolLookup;
  const HIDDEN_SHEET = "_hardware_register";
  const HIDDEN_MARKER = "hardware-register-snapshot";
  const INFO_TITLE = "Hardware and Asset Register";
  const DFE_TEMPLATE_SHEET = "Digital technology assets";   // DfE asset register template
  // Example rows in the DfE template, skipped on import (by serial number)
  const DFE_TEMPLATE_EXAMPLES = ["d12398765x", "as987612435d", "ip34567654z", "ramp341290d", "hpe9876t543e", "vs7654321a"];
  const CELL_CHUNK = 30000;                       // Excel cells hold at most 32,767 characters
  const MAX_HIDDEN_JSON = 8 * 1024 * 1024;
  const MAX_CSV_BYTES = 10 * 1024 * 1024;
  const RAG_CLASS = { Red: "red", Amber: "amber", Green: "green", Closed: "met" };
  const RAG_LIST = ["Red", "Amber", "Green", "Closed"];
  const RAG_ORDER = { Red: 0, Amber: 1, Green: 2, Closed: 3 };
  const RAG_SUB = { Red: "need action now", Amber: "need attention soon", Green: "no issues found", Closed: "disposed of or lost, all recorded" };
  const VIEW_TITLES = {
    dashboard: "Hardware and Asset Register", list: "Asset list", edit: "Edit asset", quick: "Quick add and CSV import",
    school: "School details", guide: "Field guide and rules"
  };
  // Dashboard "needs attention" lists: [title, reason codes]
  const ATTENTION = [
    ["Unsupported, or no support end date", ["unsupported", "no-support-date", "unsupported-stored"]],
    ["Portable devices not confirmed as encrypted", ["not-encrypted"]],
    ["Default admin passwords and exposed admin pages", ["default-password", "admin-exposed"]],
    ["No malware protection, screen lock or firewall", ["no-malware", "no-screen-lock", "no-firewall"]],
    ["Disposal records missing", ["disposal-no-wipe", "disposal-no-weee", "disposal-no-date", "awaiting-disposal"]],
    ["Lost or stolen", ["lost-no-action", "lost-no-dpo", "lost-no-date"]],
    ["Support ending soon", ["support-ending"]],
    ["Updates and firmware checks", ["updates-unknown", "updates-overdue", "firmware-check"]],
    ["Warranties and leases ending", ["warranty-ending", "lease-ending", "lease-ended"]],
    ["Below DfE minimum requirements", ["home-edition", "short-support", "short-warranty"]],
    ["Security settings not confirmed", ["encryption-unknown", "malware-unknown", "screen-lock-unknown", "firewall-unknown", "admin-unknown", "not-managed"]],
    ["Checks overdue, or replacement due", ["audit-overdue", "replacement-due"]],
    ["Missing asset number, serial number or location", ["no-identity", "no-location"]]
  ];
  const LIST_COLS = [
    ["assetTag", "Asset number"], ["type", "Type"], ["makeModel", "Make and model"], ["where", "Where or who"],
    ["osText", "OS or firmware"], ["supportEnd", "Support ends"], ["status", "Status"], ["rag", "Check"]
  ];
  const BLANK_FILTERS = Object.freeze({ q: "", type: "", status: "", site: "", ownership: "", rag: "" });

  let reg = HM.emptyState();
  let view = "dashboard";
  let editId = null;
  let filters = Object.assign({}, BLANK_FILTERS);
  let sort = { key: "assetTag", dir: 1 };
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
  const today = () => HM.isoToday();
  const fmt = iso => HM.formatDate(iso) || "";
  const findItem = id => reg.items.find(e => e.id === id);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const makeModel = e => [e.make, e.model].map(x => String(x || "").trim()).filter(Boolean).join(" ");
  const where = e => [e.site, e.room, e.assignedTo].map(x => String(x || "").trim()).filter(Boolean).join(", ");
  const osText = e => [e.os, e.osVersion].map(x => String(x || "").trim()).filter(Boolean).join(" ");
  function displayName(e) {
    const tag = String(e.assetTag || "").trim();
    const what = makeModel(e) || e.type || "";
    if (tag && what) return `${tag} · ${what}`;
    return tag || (what ? `${what}${e.serialNumber ? " (" + String(e.serialNumber).trim() + ")" : " (no asset number)"}` : "Untitled asset");
  }
  const ragPill = r => `<span class="rag-pill ${RAG_CLASS[r] || "not-set"}">${esc(r)}</span>`;
  const sortValue = (e, key) => key === "makeModel" ? makeModel(e) : key === "where" ? where(e) : key === "osText" ? osText(e) : String(e[key] || "");
  // Records with the same serial number, or (if no serial) the same asset number, are the same device
  const deviceKey = e => {
    const s = String(e.serialNumber || "").trim().toLowerCase();
    if (s) return "s|" + s;
    const a = String(e.assetTag || "").trim().toLowerCase();
    return a ? "a|" + a : "";
  };

  // ── Saving ─────────────────────────────────────────────────────────────────
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(HM.STATE_KEY, JSON.stringify(reg));
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
    if (!s.name && profile.name) { s.name = AM.limitText(profile.name).slice(0, 300); changed = true; }
    if (!s.urn && profile.urn) { s.urn = AM.limitText(profile.urn).slice(0, 300); changed = true; }
    if (changed) saveNow();
  }
  function profileNotice() {
    if (!profileConflict) return "";
    const p = profileConflict, s = reg.school;
    return `<div class="profile-notice" role="status">
      The school chosen on the home page is <strong>${esc(p.name)}</strong> (URN ${esc(p.urn)}), but this register holds
      <strong>${esc(s.name || "another school")}</strong>${s.urn ? ` (URN ${esc(s.urn)})` : ""}.
      Switching changes the school details only. Your asset list stays as it is.
      <div class="hw-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(s.name || "current details")}</button>
      </div>
    </div>`;
  }

  // ── Dialog (confirmations and import choice) ──────────────────────────────
  // Resolves with the value of the button chosen, or "cancel". Text is set
  // with textContent, so nothing in it is treated as HTML.
  function ask(title, body, buttons) {
    return new Promise(resolve => {
      const d = $("hw-dialog");
      $("hw-dialog-title").textContent = title;
      const b = $("hw-dialog-body");
      b.textContent = "";
      (Array.isArray(body) ? body : [body]).forEach(text => {
        const p = document.createElement("p");
        p.textContent = text;
        b.appendChild(p);
      });
      const wrap = $("hw-dialog-buttons");
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
      if (reg.items.length >= HM.MAX_ITEMS) { toast(`The register holds up to ${HM.MAX_ITEMS} assets.`); v = "list"; }
      else {
        const e = HM.blankEntry();
        reg.items.push(e);
        v = "edit"; id = e.id;
      }
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
    const b = HM.blankEntry();
    return HM.FIELDS.every(f => {
      const v = e[f.key], d = b[f.key];
      return Array.isArray(v) ? v.length === 0 : String(v || "") === String(d || "");
    });
  }

  function render() {
    const views = { dashboard: viewDashboard, list: viewList, edit: viewEdit, quick: viewQuick, school: viewSchool, guide: viewGuide };
    $("content").innerHTML = (views[view] || viewDashboard)();
    $("topbar-title").textContent = VIEW_TITLES[view] || INFO_TITLE;
    document.title = (VIEW_TITLES[view] && view !== "dashboard" ? VIEW_TITLES[view] + " – " : "") + INFO_TITLE;
    $("sidebar-nav").querySelectorAll("a[data-view]").forEach(a => {
      const on = a.dataset.view === view || (view === "edit" && a.dataset.view === "list");
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  function schoolLine() {
    const s = reg.school;
    return s.name || s.urn
      ? `<p class="hw-school">School: <strong>${esc(s.name)}</strong>${s.urn ? ` &nbsp;|&nbsp; URN: <strong>${esc(s.urn)}</strong>` : ""}</p>`
      : `<p class="hw-school"><a href="#" data-view="school">Add your school's details</a></p>`;
  }

  function reviewBanner(t) {
    if (!reg.items.length || !HM.registerReviewDue(reg, t)) return "";
    const d = reg.school.lastRegisterReview;
    return `<div class="card card-body hw-banner" role="status">
      <strong>Termly review due.</strong> ${d ? `The whole register was last reviewed on ${esc(fmt(d))}.` : "No whole-register review is recorded yet."}
      The DfE asks for the asset register to be reviewed every term and updated whenever something changes.
      <div class="hw-actions"><button type="button" class="btn btn-secondary btn-sm" id="btn-reviewed">Mark the register as reviewed today</button>
      <a href="#" class="btn btn-secondary btn-sm" data-view="school">Change the date</a></div>
    </div>`;
  }

  function viewDashboard() {
    const t = today();
    const evals = reg.items.map(e => ({ e, r: HM.evaluate(e, t) }));
    const counts = { Red: 0, Amber: 0, Green: 0, Closed: 0 };
    evals.forEach(x => counts[x.r.rag]++);

    if (!reg.items.length) {
      return `<div class="hw-page">
        <h2>Hardware and asset register</h2>
        ${profileNotice()}${schoolLine()}
        <div class="card card-body">
          <p style="margin-top:0">Your register is empty. Record every device and piece of network equipment your school has, so you can show it is supported, secure, and disposed of safely.</p>
          <div class="hw-actions">
            <a href="#" class="btn btn-primary" data-view="quick">Quick add by device type</a>
            <a href="#" class="btn btn-secondary" data-view="add">Add an asset by hand</a>
            <button type="button" class="btn btn-secondary" data-action="import">Import an Excel register or the DfE template</button>
          </div>
        </div>
        ${evidenceBlock()}
      </div>`;
    }

    const cards = RAG_LIST.map(k => `
      <a class="dash-card hw-count" href="#" data-filter-rag="${k}">
        <div class="dash-card-title"><span class="rag-dot ${RAG_CLASS[k]}"></span>${esc(k)}</div>
        <div class="hw-count-num">${counts[k]}</div>
        <div class="hw-count-sub">${esc(RAG_SUB[k])}</div>
      </a>`).join("");

    const lists = ATTENTION.map(([title, codes]) => {
      const rows = [];
      evals.forEach(({ e, r }) => r.reasons.filter(x => codes.includes(x.code)).forEach(x =>
        rows.push(`<li><a href="#" data-edit="${esc(e.id)}">${esc(displayName(e))}</a> ${ragPill(x.level)} <span>${esc(x.text)}</span></li>`)));
      if (!rows.length) return "";
      return `<details class="hw-attention" ${rows.length <= 8 ? "open" : ""}>
        <summary>${esc(title)} <span class="hw-badge">${rows.length}</span></summary>
        <ul>${rows.join("")}</ul></details>`;
    }).join("");

    const active = reg.items.filter(e => e.status !== HM.ST_DISPOSED && e.status !== HM.ST_LOST);
    const tally = (key, opts) => {
      const c = new Map();
      active.forEach(e => { const k = e[key] || "Not recorded"; c.set(k, (c.get(k) || 0) + 1); });
      return opts.concat(["Not recorded"]).filter(o => c.has(o)).map(o =>
        `<tr><td>${esc(o)}</td><td>${c.get(o)}</td></tr>`).join("") || `<tr><td colspan="2">None</td></tr>`;
    };
    // Operating systems and firmware in use, with the earliest support end date
    const osMap = new Map();
    active.forEach(e => {
      const k = osText(e) || "Not recorded";
      const x = osMap.get(k) || { n: 0, end: "" };
      x.n++;
      if (e.supportEnd && (!x.end || e.supportEnd < x.end)) x.end = e.supportEnd;
      osMap.set(k, x);
    });
    const osRows = Array.from(osMap.entries()).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).slice(0, 25)
      .map(([k, x]) => `<tr><td>${esc(k)}</td><td>${x.n}</td><td class="hw-nowrap">${x.end ? esc(fmt(x.end)) : "Not recorded"}</td></tr>`).join("");

    return `<div class="hw-page">
      <h2>Hardware and asset register</h2>
      ${profileNotice()}${schoolLine()}
      <p class="hw-muted">${plural(reg.items.length, "asset")} recorded, ${active.length} not disposed of or lost. Checked against today's date, ${esc(fmt(t))}.
        <a href="#" data-view="guide">How the checks work</a></p>
      ${reviewBanner(t)}
      <div class="dashboard-grid hw-counts">${cards}</div>
      <h3>Needs attention</h3>
      ${lists || `<p class="hw-muted">Nothing needs attention. Keep the register up to date whenever something changes.</p>`}
      <div class="hw-two-col">
        <div><h3>By device type</h3><div class="card hw-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Type</th><th scope="col">Assets</th></tr></thead><tbody>${tally("type", HM.TYPES)}</tbody></table></div></div>
        <div><h3>By status</h3><div class="card hw-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Status</th><th scope="col">Assets</th></tr></thead><tbody>${tally("status", HM.STATUSES)}</tbody></table></div></div>
      </div>
      <h3>Operating systems and firmware in use</h3>
      <p class="hw-muted">Use this to check each version against the manufacturer's support dates, and to keep the operating systems in your software register up to date.</p>
      <div class="card hw-table-wrap"><table class="summary-table"><thead><tr><th scope="col">Operating system or firmware</th><th scope="col">Assets</th><th scope="col">Earliest support end</th></tr></thead><tbody>${osRows || `<tr><td colspan="3">None</td></tr>`}</tbody></table></div>
      ${evidenceBlock()}
    </div>`;
  }

  function evidenceBlock() {
    const link = id => { const s = HM.SOURCES[id]; return `<a class="guidance-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`; };
    return `<div class="card card-body hw-evidence">
      <h3 style="margin-top:0">Using this register as evidence</h3>
      <p>Export the register to Excel and refer to it from your trackers:</p>
      <ul>
        <li><a href="dfe.html">DfE standards tracker</a>: ${link("dfe-registers")} (the asset register), ${link("dfe-devices-secure")}, ${link("dfe-devices-min")}, ${link("dfe-devices-dispose")} and ${link("dfe-licence")} (end-of-support dates).</li>
        <li><a href="ce.html">Cyber Essentials tracker</a>: Scope (scope-2, scope-4, scope-5: devices, staff BYOD and devices loaned to pupils), Firewalls (fw-2, fw-3), Secure configuration (sc-2, sc-6), Security update management (sum-1 to sum-4: supported operating systems and firmware) and Malware protection (mp-1).</li>
        <li><a href="register.html">Software register</a>: list each operating system shown above, with its support end date.</li>
      </ul>
    </div>`;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  function sites() {
    const set = new Set();
    reg.items.forEach(e => { const s = String(e.site || "").trim(); if (s) set.add(s); });
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 200);
  }

  function viewList() {
    const opt = (list, cur, all) => `<option value="">${esc(all)}</option>` +
      list.map(o => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
    return `<div class="hw-page hw-wide">
      <h2>Asset list</h2>
      <div class="hw-actions">
        <a href="#" class="btn btn-primary btn-sm" data-view="add">&#43; Add an asset</a>
        <a href="#" class="btn btn-secondary btn-sm" data-view="quick">Quick add</a>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-mark-checked">Mark the assets shown as checked today</button>
      </div>
      <div class="hw-filters" role="search">
        <div class="form-field"><label for="f-q">Search</label>
          <input type="search" id="f-q" value="${esc(filters.q)}" autocomplete="off" aria-describedby="f-q-help" />
          <span class="hw-sub" id="f-q-help">Asset number, serial, make, model, room or person</span></div>
        <div class="form-field"><label for="f-type">Type</label>
          <select id="f-type" data-filter="type">${opt(HM.TYPES, filters.type, "All types")}</select></div>
        <div class="form-field"><label for="f-status">Status</label>
          <select id="f-status" data-filter="status">${opt(HM.STATUSES, filters.status, "All statuses")}</select></div>
        <div class="form-field"><label for="f-site">Site</label>
          <select id="f-site" data-filter="site">${opt(sites(), filters.site, "All sites")}</select></div>
        <div class="form-field"><label for="f-ownership">Ownership</label>
          <select id="f-ownership" data-filter="ownership">${opt(HM.OWNERSHIP, filters.ownership, "Any ownership")}</select></div>
        <div class="form-field"><label for="f-rag">Check</label>
          <select id="f-rag" data-filter="rag">${opt(RAG_LIST, filters.rag, "All results")}</select></div>
      </div>
      <p class="hw-muted" id="list-count" role="status" aria-live="polite"></p>
      <div class="card hw-table-wrap" id="list-table"></div>
    </div>`;
  }

  function filteredRows() {
    const t = today();
    const q = filters.q.trim().toLowerCase();
    return reg.items.map(e => ({ e, r: HM.evaluate(e, t) })).filter(({ e, r }) =>
      (!q || [e.assetTag, e.serialNumber, e.make, e.model, e.site, e.room, e.assignedTo, e.os].join(" ").toLowerCase().includes(q)) &&
      (!filters.type || e.type === filters.type) &&
      (!filters.status || e.status === filters.status) &&
      (!filters.site || String(e.site || "").trim() === filters.site) &&
      (!filters.ownership || e.ownership === filters.ownership) &&
      (!filters.rag || r.rag === filters.rag));
  }

  function renderListTable() {
    const rows = filteredRows();
    const key = sort.key;
    rows.sort((a, b) => {
      let x, y;
      if (key === "rag") { x = RAG_ORDER[a.r.rag]; y = RAG_ORDER[b.r.rag]; }
      else { x = sortValue(a.e, key).toLowerCase(); y = sortValue(b.e, key).toLowerCase(); }
      // Blanks sort last in both directions
      if (x === "" && y !== "") return 1;
      if (y === "" && x !== "") return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || displayName(a.e).localeCompare(displayName(b.e));
    });
    $("list-count").textContent = `Showing ${rows.length} of ${plural(reg.items.length, "asset")}.`;
    const head = LIST_COLS.map(([k, label]) => {
      const s = sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none";
      const arrow = s === "ascending" ? "&#9650;" : s === "descending" ? "&#9660;" : "";
      return `<th scope="col" aria-sort="${s}"><button type="button" class="hw-sort" data-sort="${k}">${esc(label)} <span aria-hidden="true">${arrow}</span></button></th>`;
    }).join("") + `<th scope="col">Actions</th>`;
    const body = rows.map(({ e, r }) => `<tr>
      <td><a href="#" data-edit="${esc(e.id)}">${esc(String(e.assetTag || "").trim() || "No number")}</a>${e.serialNumber ? `<span class="hw-sub">S/N ${esc(e.serialNumber)}</span>` : ""}</td>
      <td>${esc(e.type)}</td><td>${esc(makeModel(e))}</td><td>${esc(where(e))}</td><td>${esc(osText(e))}</td>
      <td class="hw-nowrap">${esc(fmt(e.supportEnd))}</td><td>${esc(e.status)}</td>
      <td>${ragPill(r.rag)}${r.reasons.length ? `<span class="hw-reason-count">${plural(r.reasons.length, "issue")}</span>` : ""}</td>
      <td class="hw-row-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${esc(e.id)}" aria-label="Edit ${esc(displayName(e))}">Edit</button>
        <button type="button" class="btn btn-secondary btn-sm" data-duplicate="${esc(e.id)}" aria-label="Duplicate ${esc(displayName(e))}">Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(e.id)}" aria-label="Delete ${esc(displayName(e))}">Delete</button>
      </td></tr>`).join("");
    $("list-table").innerHTML = `<table class="summary-table hw-table"><thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${LIST_COLS.length + 1}">${reg.items.length ? "No assets match these filters." : "No assets recorded yet."}</td></tr>`}</tbody></table>`;
    $("list-table").querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      sort = sort.key === b.dataset.sort ? { key: sort.key, dir: -sort.dir } : { key: b.dataset.sort, dir: 1 };
      renderListTable();
      const again = $("list-table").querySelector(`[data-sort="${b.dataset.sort}"]`);
      if (again) again.focus();
    }));
    bindRowActions($("list-table"));
  }

  async function markShownChecked() {
    const rows = filteredRows().filter(({ e }) => e.status !== HM.ST_DISPOSED && e.status !== HM.ST_LOST);
    if (!rows.length) { toast("No assets to mark: disposed of and lost assets are skipped."); return; }
    const t = today();
    const choice = await ask("Mark these assets as checked today?", [
      `${plural(rows.length, "asset")} shown in the list will have "Last checked" set to ${fmt(t)}.`,
      "Only do this if someone has seen each device and checked its details. Disposed of and lost assets are skipped."
    ], [["Mark as checked", "ok", "btn-primary"], ["Cancel", "cancel"]]);
    if (choice !== "ok") return;
    rows.forEach(({ e }) => { e.lastAudited = t; });
    saveNow();
    renderListTable();
    toast(`${plural(rows.length, "asset")} marked as checked today.`);
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  function fieldInput(f, e) {
    const id = "fld-" + f.key;
    const describedBy = `help-${f.key} why-${f.key}`;
    const v = e[f.key];
    if (f.type === "checks") {
      return f.options.map((o, i) => `<label class="hw-check"><input type="checkbox" data-key="${esc(f.key)}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""} id="${id}-${i}" /> ${esc(o)}</label>`).join("");
    }
    if (f.type === "select") {
      const blank = f.key === "status" ? "" : `<option value="">Not recorded</option>`;
      return `<select id="${id}" data-key="${esc(f.key)}" aria-describedby="${describedBy}">${blank}${f.options.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    }
    if (f.type === "textarea") {
      return `<textarea id="${id}" data-key="${esc(f.key)}" rows="4" aria-describedby="${describedBy}">${esc(v)}</textarea>`;
    }
    const type = f.type === "date" ? "date" : "text";
    return `<input type="${type}" id="${id}" data-key="${esc(f.key)}" value="${esc(v)}" aria-describedby="${describedBy}" />`;
  }

  function whyLine(f) {
    if (!f.refs.length) return "";
    return "Why: " + f.refs.map(id => {
      const s = HM.SOURCES[id];
      return `<a href="${esc(safeHref(s.url))}" target="_blank" rel="noopener">${esc(s.short)}</a>`;
    }).join(" · ");
  }

  function viewEdit() {
    const e = findItem(editId);
    if (!e) return "<p>Not found.</p>";
    const groups = HM.GROUPS.map(g => {
      const fields = g.fields.map(f => {
        const wide = f.type === "textarea" || f.type === "checks";
        const badge = f.basis === "required"
          ? `<span class="hw-basis req">Required by a standard</span>` : `<span class="hw-basis good">Good practice</span>`;
        const label = f.type === "checks"
          ? `<fieldset class="hw-checks" aria-describedby="help-${f.key} why-${f.key}"><legend>${esc(f.label)} ${badge}</legend>${fieldInput(f, e)}</fieldset>`
          : `<label for="fld-${f.key}">${esc(f.label)} ${badge}</label>${fieldInput(f, e)}`;
        return `<div class="form-field hw-field${wide ? " full-width" : ""}" data-wrap="${esc(f.key)}">
          ${label}
          <p class="hw-help" id="help-${f.key}">${esc(f.help)}${f.showIfText ? ` <em>(${esc(f.showIfText)})</em>` : ""}</p>
          <p class="hw-why" id="why-${f.key}">${whyLine(f)}</p>
        </div>`;
      }).join("");
      return `<fieldset class="card hw-group" id="group-${g.id}" data-group="${g.id}">
        <legend>${esc(g.title)}</legend>
        ${g.intro ? `<p class="hw-muted">${esc(g.intro)}</p>` : ""}
        <div class="form-grid">${fields}</div>
      </fieldset>`;
    }).join("");
    return `<div class="hw-page">
      <p><a href="#" data-view="list">&#8592; Back to the asset list</a></p>
      <h2 id="edit-title">${esc(displayName(e))}</h2>
      <p class="hw-muted">Changes save automatically. Fields marked <span class="hw-basis req">Required by a standard</span> support a DfE standard, Cyber Essentials, UK GDPR or waste law; the others are good practice. Questions that don't apply to this device are hidden.</p>
      <div id="rag-panel" class="card card-body hw-rag-panel" aria-live="polite"></div>
      ${groups}
      <div class="hw-actions" id="edit-actions">
        <a href="#" class="btn btn-primary" data-view="list">Done</a>
        <button type="button" class="btn btn-secondary" data-duplicate="${esc(e.id)}">Duplicate</button>
        <button type="button" class="btn btn-danger" data-delete="${esc(e.id)}">Delete</button>
      </div>
    </div>`;
  }

  function updateRagPanel(e) {
    const p = $("rag-panel");
    if (!p) return;
    const t = today();
    const r = HM.evaluate(e, t);
    const items = r.reasons.map(x => `<li>${ragPill(x.level)} ${esc(x.text)}</li>`).join("");
    const age = HM.ageText(e.madeDate || e.purchaseDate, t);
    const info = `<p class="hw-info">Cyber Essentials scope: ${esc(HM.ceScope(e))}${age ? ` · Age: ${esc(age)}` : ""}</p>`;
    p.className = "card card-body hw-rag-panel " + (RAG_CLASS[r.rag] || "");
    p.innerHTML = `<div class="hw-rag-head"><strong>Check:</strong> ${ragPill(r.rag)}</div>` +
      (r.rag === "Closed" ? `<p class="hw-muted">Disposed of or lost, with everything recorded. Kept for the record.</p>`
        : items ? `<ul class="hw-reasons">${items}</ul>` : `<p class="hw-muted">No issues found.</p>`) + info;
  }

  function updateVisibility(e) {
    const c = $("content");
    HM.FIELDS.forEach(f => {
      const w = c.querySelector(`[data-wrap="${f.key}"]`);
      if (w) w.hidden = !!(f.showIf && !f.showIf(e));
    });
    HM.GROUPS.forEach(g => {
      const el = c.querySelector(`[data-group="${g.id}"]`);
      if (el) el.hidden = !!(g.showIf && !g.showIf(e));
    });
  }

  // Take a value from a form control and store it, validated for its field type
  function setField(e, key, value) {
    if (!HM.FIELD_BY_KEY.has(key)) return;
    const clean = HM.sanitiseEntry({ [key]: value });
    e[key] = clean[key];
  }

  // ── Quick add and CSV ──────────────────────────────────────────────────────
  function viewQuick() {
    const rows = HM.QUICK_TYPES.map((t, i) => `<tr><td><label for="q-${i}">${esc(t)}</label></td>
      <td><input type="number" id="q-${i}" data-quick="${i}" min="0" max="${HM.QUICK_MAX}" step="1" inputmode="numeric" value="" /></td></tr>`).join("");
    return `<div class="hw-page">
      <h2>Quick add</h2>
      <p>Enter how many of each type of device you have. Each one is added as a separate asset with its type only: fill in the asset number, make, model, serial number and dates from your own records, or import them from a CSV file below.</p>
      <div class="card card-body">
        <div class="form-grid">
          <div class="form-field"><label for="q-site">Site or building (optional)</label><input type="text" id="q-site" autocomplete="off" /></div>
          <div class="form-field"><label for="q-room">Room (optional)</label><input type="text" id="q-room" autocomplete="off" /></div>
        </div>
        <table class="summary-table hw-quick"><thead><tr><th scope="col">Device type</th><th scope="col">How many</th></tr></thead><tbody>${rows}</tbody></table>
        <p><button type="button" class="btn btn-primary" id="btn-quick-add">Add these assets</button></p>
      </div>
      <h2>Import a list from CSV</h2>
      <div class="card card-body">
        <p style="margin-top:0">Add assets from a spreadsheet saved as CSV, for example an export from Intune, Google Admin or your network management platform. Use a header row; these column names are recognised:</p>
        <p class="hw-muted">${HM.FIELDS.filter(f => f.type !== "checks").map(f => esc(f.label)).join(" · ")}</p>
        <p>Dates can be dd/mm/yyyy or yyyy-mm-dd. Devices already in the register (same serial number, or the same asset number when there is no serial) are skipped.</p>
        <button type="button" class="btn btn-secondary" id="btn-csv">&#8593; Choose a CSV file</button>
      </div>
    </div>`;
  }

  function quickAdd() {
    const c = $("content");
    const site = AM.limitText($("q-site").value).trim().slice(0, 300);
    const room = AM.limitText($("q-room").value).trim().slice(0, 300);
    const picks = [];
    let bad = false;
    c.querySelectorAll("[data-quick]").forEach(el => {
      const raw = el.value.trim();
      if (!raw) return;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > HM.QUICK_MAX) { bad = true; return; }
      if (n) picks.push([HM.QUICK_TYPES[Number(el.dataset.quick)], n]);
    });
    if (bad) { toast(`Enter whole numbers from 0 to ${HM.QUICK_MAX}.`); return; }
    const total = picks.reduce((s, [, n]) => s + n, 0);
    if (!total) { toast("Enter how many of at least one device type."); return; }
    const room2 = HM.MAX_ITEMS - reg.items.length;
    if (total > room2) { toast(`Only ${room2} more can be added: the register holds up to ${HM.MAX_ITEMS} assets.`); return; }
    picks.forEach(([type, n]) => {
      for (let i = 0; i < n; i++) reg.items.push(HM.sanitiseEntry({ type, site, room, status: HM.ST_IN_USE }));
    });
    saveNow();
    filters = Object.assign({}, BLANK_FILTERS);
    navigate("list");
    toast(`Added ${plural(total, "asset")}. Open each one to fill in its details.`);
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
        const items = rowsToItems(rows, false);
        const have = new Set(reg.items.map(deviceKey).filter(Boolean));
        const add = [];
        let skipped = 0;
        items.forEach(e => {
          const k = deviceKey(e);
          if (k && have.has(k)) { skipped++; return; }
          if (k) have.add(k);
          add.push(e);
        });
        const room = HM.MAX_ITEMS - reg.items.length;
        if (!add.length) { toast(`Nothing to add from ${file.name}${skipped ? `: ${skipped} already in the register` : ""}.`); return; }
        const n = Math.min(add.length, room);
        const choice = await ask("Add assets from CSV?", [
          `${plural(n, "asset")} will be added to your register from ${file.name}.`,
          skipped ? `${skipped} already in the register will be skipped.` : "",
          add.length > room ? `Only ${room} more can be added: the register holds up to ${HM.MAX_ITEMS} assets.` : ""
        ].filter(Boolean), [["Add them", "add", "btn-primary"], ["Cancel", "cancel"]]);
        if (choice !== "add") return;
        reg.items.push(...add.slice(0, room));
        saveNow();
        filters = Object.assign({}, BLANK_FILTERS);
        navigate("list");
        toast(`Added ${plural(n, "asset")} from ${file.name}.`);
      } catch (err) { toast("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  }

  // ── School details ─────────────────────────────────────────────────────────
  function viewSchool() {
    return `<div class="hw-page" style="max-width:680px">
      <h2>School details</h2>
      ${profileNotice()}
      <p class="hw-muted">Filled in from the school you choose on the <a href="index.html">home page</a>. Anything you type here is kept. Changes save automatically.</p>
      <div class="form-grid">
        <div class="form-field full-width"><label for="sch-name">School, college or trust name</label>
          <input type="text" id="sch-name" data-school="name" value="${esc(reg.school.name)}" /></div>
        <div class="form-field"><label for="sch-urn">URN</label>
          <input type="text" id="sch-urn" data-school="urn" value="${esc(reg.school.urn)}" inputmode="numeric" /></div>
        <div class="form-field"><label for="sch-review">Whole register last reviewed</label>
          <input type="date" id="sch-review" value="${esc(reg.school.lastRegisterReview)}" aria-describedby="sch-review-help" />
          <p class="hw-help" id="sch-review-help">The DfE asks for the asset register to be reviewed every term by the person responsible for IT equipment, and checked by the SLT digital lead.</p></div>
      </div>
    </div>`;
  }

  // ── Field guide ────────────────────────────────────────────────────────────
  function viewGuide() {
    const th = HM.THRESHOLDS;
    const rules = RAG_LIST.map(k => `<div class="rag-key-row">${ragPill(k)}<ul class="hw-rule-list">${HM.RULES[k].map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
    const rows = HM.GROUPS.map(g => g.fields.map(f => `<tr>
      <td>${esc(g.title)}</td><td>${esc(f.label)}</td>
      <td>${f.basis === "required" ? "Required by a standard" : "Good practice"}</td>
      <td>${esc(f.help)}${f.showIfText ? ` <em>Applies to: ${esc(f.showIfText)}.</em>` : ""}</td>
      <td>${whyLine(f).replace(/^Why: /, "") || "–"}</td></tr>`).join("")).join("");
    return `<div class="hw-page hw-wide">
      <h2>Field guide and rules</h2>
      <h3>How each asset is checked</h3>
      <p class="hw-muted">Checks use today's date. Thresholds: support ending within ${th.supportEndWarnMonths} months, warranty within ${th.warrantyWarnDays} days, lease within ${th.leaseWarnDays} days, not checked for ${th.auditOverdueMonths} months, updates within ${th.patchWindowDays} days, firewall firmware and whole-register review every ${th.termlyCheckMonths} months (termly). Any Red reason makes the asset Red; otherwise any Amber reason makes it Amber.</p>
      <div class="rag-key">${rules}</div>
      ${evidenceBlock()}
      <h3>Fields</h3>
      <p class="hw-muted">The full reasoning and source quotes are in <a href="https://github.com/jonesj1994/DFEStandards/blob/main/docs/HARDWARE-REGISTER.md" target="_blank" rel="noopener">HARDWARE-REGISTER.md</a>. Column names from the <a href="${esc(safeHref(HM.SOURCES["dfe-template"].url))}" target="_blank" rel="noopener">DfE asset register template</a> are recognised on import.</p>
      <div class="card hw-table-wrap"><table class="summary-table hw-guide">
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
      filters = Object.assign({}, BLANK_FILTERS, { rag: a.dataset.filterRag });
      navigate("list");
    }));
    c.querySelectorAll("[data-action=import]").forEach(b => b.addEventListener("click", () => $("file-input").click()));
    if (view === "dashboard") {
      bindRowActions(c.querySelector(".hw-page"));
      const rv = $("btn-reviewed");
      if (rv) rv.addEventListener("click", () => {
        reg.school.lastRegisterReview = today();
        saveNow(); render(); toast("Register marked as reviewed today.");
      });
    }

    const sw = $("btn-profile-switch");
    if (sw) {
      sw.addEventListener("click", () => {
        reg.school.name = AM.limitText(profileConflict.name).slice(0, 300);
        reg.school.urn = AM.limitText(profileConflict.urn).slice(0, 300);
        reg.school.keptURN = "";
        profileConflict = null;
        saveNow(); render(); toast("School details updated.");
      });
      $("btn-profile-keep").addEventListener("click", () => {
        reg.school.keptURN = AM.limitText(profileConflict.urn).slice(0, 300);
        profileConflict = null;
        saveNow(); render();
      });
    }

    if (view === "list") {
      $("f-q").addEventListener("input", ev => { filters.q = ev.target.value; renderListTable(); });
      c.querySelectorAll("[data-filter]").forEach(s => s.addEventListener("change", () => { filters[s.dataset.filter] = s.value; renderListTable(); }));
      $("btn-mark-checked").addEventListener("click", markShownChecked);
      renderListTable();
    }

    if (view === "edit") {
      const e = findItem(editId);
      bindRowActions($("edit-actions"));
      c.querySelectorAll("[data-key]").forEach(el => {
        const handler = () => {
          const key = el.dataset.key;
          if (el.type === "checkbox") {
            setField(e, key, Array.from(c.querySelectorAll(`input[type=checkbox][data-key="${key}"]:checked`)).map(x => x.value));
          } else {
            setField(e, key, el.value);
          }
          if (["assetTag", "make", "model", "type", "serialNumber"].includes(key)) $("edit-title").textContent = displayName(e);
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
      $("btn-quick-add").addEventListener("click", quickAdd);
      $("btn-csv").addEventListener("click", () => $("csv-input").click());
    }

    if (view === "school") {
      c.querySelectorAll("[data-school]").forEach(el => el.addEventListener("input", () => {
        reg.school[el.dataset.school === "urn" ? "urn" : "name"] = AM.limitText(el.value).slice(0, 300);
        save();
      }));
      $("sch-review").addEventListener("change", ev => {
        reg.school.lastRegisterReview = HM.validDate(ev.target.value);
        save();
      });
    }
  }

  function duplicate(id) {
    const e = findItem(id);
    if (!e) return;
    if (reg.items.length >= HM.MAX_ITEMS) { toast(`The register holds up to ${HM.MAX_ITEMS} assets.`); return; }
    leaveEdit();
    const copy = HM.sanitiseEntry(JSON.parse(JSON.stringify(e)));
    copy.id = HM.newId();
    // Each device has its own asset number and serial number
    copy.assetTag = "";
    copy.serialNumber = "";
    reg.items.splice(reg.items.indexOf(e) + 1, 0, copy);
    saveNow();
    view = "list";               // so navigate's leaveEdit does nothing
    navigate("edit", copy.id);
    toast("Copy made. Add its asset number and serial number, and change anything else that differs.");
  }

  async function remove(id) {
    const e = findItem(id);
    if (!e) return;
    const choice = await ask("Delete this asset?", [
      `"${displayName(e)}" will be removed from the register. This cannot be undone.`,
      "If the device has been disposed of, lost or stolen, set its status instead, so the register keeps a record of what happened to it."
    ], [["Delete", "delete", "btn-danger"], ["Cancel", "cancel"]]);
    if (choice !== "delete") return;
    reg.items = reg.items.filter(x => x.id !== id);
    saveNow();
    if (view === "edit") { view = "list"; editId = null; }
    navigate(view);
    toast(`Deleted "${displayName(e)}".`);
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  const cellValue = v => (Array.isArray(v) ? v.join(", ") : v == null ? "" : v);

  function exportExcel() {
    leaveEdit();
    const t = today();
    const wb = XLSX.utils.book_new();
    const sum = HM.summarise(reg, t);
    const th = HM.THRESHOLDS;

    const info = [
      [INFO_TITLE],
      ["School", reg.school.name],
      ["URN", reg.school.urn],
      ["Exported on", t],
      ["Register last reviewed", reg.school.lastRegisterReview],
      ["Assets", reg.items.length],
      ["Red", sum.Red], ["Amber", sum.Amber], ["Green", sum.Green], ["Closed", sum.Closed],
      [],
      ["Checks", `Red and Amber are worked out on the export date. Thresholds: support ending within ${th.supportEndWarnMonths} months, warranty within ${th.warrantyWarnDays} days, lease within ${th.leaseWarnDays} days, not checked for ${th.auditOverdueMonths} months, updates within ${th.patchWindowDays} days, firewall firmware checked every ${th.termlyCheckMonths} months.`],
      ["Import", "Import this file on the Hardware and Asset Register page to restore it exactly."]
    ];
    const wsI = XLSX.utils.aoa_to_sheet(info);
    wsI["!cols"] = [{ wch: 22 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsI, "Info");

    const header = ["ID"].concat(HM.FIELDS.map(f => f.label), ["Age", "Cyber Essentials scope", "Check", "Reasons"]);
    const rows = [header];
    reg.items.forEach(e => {
      const r = HM.evaluate(e, t);
      rows.push([e.id].concat(HM.FIELDS.map(f => cellValue(e[f.key])),
        [HM.ageText(e.madeDate || e.purchaseDate, t), HM.ceScope(e), r.rag, r.reasons.map(x => `${x.level}: ${x.text}`).join("\n")]));
    });
    const wsR = XLSX.utils.aoa_to_sheet(rows);
    wsR["!cols"] = header.map((h, i) => ({ wch: i === 0 ? 20 : h === "Reasons" ? 70 : h === "Notes" ? 50 : Math.max(14, Math.min(30, h.length)) }));
    wsR["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 1), c: header.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsR, "Register");

    const att = [["Asset number", "Type", "Make and model", "Serial number", "Where or who", "Check", "Issue"]];
    reg.items.forEach(e => HM.evaluate(e, t).reasons.forEach(x => att.push([e.assetTag, e.type, makeModel(e), e.serialNumber, where(e), x.level, x.text])));
    if (att.length === 1) att.push(["Nothing needs attention."]);
    const wsA = XLSX.utils.aoa_to_sheet(att);
    wsA["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Needs attention");

    const guide = [["Area", "Field", "Basis", "What it means", "Applies to", "Requirement it supports", "Source links"]];
    HM.FIELDS.forEach(f => guide.push([
      f.groupTitle, f.label, f.basis === "required" ? "Required by a standard" : "Good practice", f.help, f.showIfText || "All assets",
      f.refs.map(id => HM.SOURCES[id].short).join("; "), f.refs.map(id => HM.SOURCES[id].url).filter((u, i, a) => a.indexOf(u) === i).join(" ")
    ]));
    guide.push([]);
    RAG_LIST.forEach(k => HM.RULES[k].forEach(r => guide.push(["Check rules", k, "", r])));
    const wsG = XLSX.utils.aoa_to_sheet(guide);
    wsG["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 22 }, { wch: 70 }, { wch: 30 }, { wch: 80 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsG, "Field guide");

    writeHiddenSheet(wb, { kind: HIDDEN_MARKER, schemaVersion: HM.SCHEMA_VERSION, exportedAt: new Date().toISOString(), school: reg.school, items: reg.items });

    const name = reg.school.name ? "_" + reg.school.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) : "";
    const file = `Hardware_Register${name}_${t}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file);
  }

  // Hidden sheet for an exact round trip, chunked like assessment-model.js's
  // "_assessment" sheet. Row 1: [marker, schema version, number of chunks].
  function writeHiddenSheet(wb, obj) {
    const json = JSON.stringify(obj);
    const rows = [[HIDDEN_MARKER, HM.SCHEMA_VERSION, 0]];
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
    const ws = sheet(wb, HIDDEN_SHEET);
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
    if (!obj || typeof obj !== "object" || obj.kind !== HIDDEN_MARKER) throw new Error("not a hardware register");
    return obj;
  }

  // Sheet by name, only if the workbook really lists it (never via the prototype)
  function sheet(wb, name) {
    return Array.isArray(wb.SheetNames) && wb.SheetNames.includes(name) && Object.prototype.hasOwnProperty.call(wb.Sheets, name) ? wb.Sheets[name] : null;
  }

  // ── Excel import ───────────────────────────────────────────────────────────
  // Hidden sheet first (exact), then the visible Register sheet or a filled-in
  // DfE asset register template. Tracker and other register exports are
  // refused with a clear message.
  function readWorkbook(wb) {
    const notes = [];
    if (sheet(wb, HIDDEN_SHEET)) {
      try {
        const raw = readHiddenSheet(wb);
        if (Number(raw.schemaVersion) > HM.SCHEMA_VERSION) notes.push("the file was made by a newer version of the register; some details may be missing");
        return { state: HM.sanitiseState(raw), from: "hidden", notes };
      } catch (e) {
        notes.push("the hidden sheet was damaged (" + e.message + "), so the visible Register sheet was used");
      }
    }
    // Not a hardware register export: say what it is if we can
    let framework = "";
    try {
      const snap = AM && AM.readSnapshotSheet(XLSX, wb);
      if (snap && AM.isFramework(snap.framework)) framework = snap.framework;
    } catch (e) { /* not a tracker snapshot */ }
    const info = sheet(wb, "Info");
    const a1 = info && info.A1 ? AM.limitText(info.A1.v).trim().slice(0, 80) : "";
    if (!framework && a1) {
      if (/digital (&|and) technology standards/i.test(a1)) framework = "dfe";
      else if (/cyber essentials/i.test(a1)) framework = "cyber-essentials";
    }
    if (framework) {
      const f = AM.FRAMEWORKS[framework];
      throw new Error(`this file is a ${f.label} export, not a hardware register. Open it in the ${f.shortLabel} tracker instead.`);
    }
    if (a1 && a1 !== INFO_TITLE) {
      throw new Error(`this file is a "${a1}" export, not a hardware register. Import it on that page instead.`);
    }
    const otherHidden = (wb.SheetNames || []).find(n => /^_/.test(n) && n !== HIDDEN_SHEET);
    if (otherHidden && !notes.length) {
      throw new Error("this file was exported from another tracker or register, not the hardware register.");
    }
    if (sheet(wb, "Register")) return { state: readVisible(wb, "Register", false), from: "visible", notes };
    if (sheet(wb, DFE_TEMPLATE_SHEET)) return { state: readVisible(wb, DFE_TEMPLATE_SHEET, true), from: "template", notes };
    throw new Error(`no hardware register found in this file (it needs a sheet called Register, or "${DFE_TEMPLATE_SHEET}" from the DfE template)`);
  }

  const norm = s => String(s == null ? "" : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Column heading -> field key (labels, keys and DfE template headings).
  // A Map keyed by normalised text, so headings can never reach the prototype.
  const HEADINGS = (() => {
    const m = new Map();
    HM.FIELDS.forEach(f => [f.label, f.key].concat(f.aliases || []).forEach(h => { const n = norm(h); if (n && !m.has(n)) m.set(n, f.key); }));
    m.set("id", "id");
    m.set(norm("Is the asset owned by your school or college?"), "_owned");
    m.set(norm("Is this asset leased or loaned?"), "_leaseLoan");
    return m;
  })();

  // Excel date serials and dd/mm/yyyy text become ISO dates
  function importDate(v) {
    if (typeof v === "number" && isFinite(v) && v > 0 && v < 200000) {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return HM.validDate(`${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`);
    }
    const s = String(v == null ? "" : v).trim();
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (uk) return HM.validDate(`${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`);
    return HM.validDate(s.slice(0, 10));
  }

  // Rows (first row with a known heading is the header) -> sanitised entries.
  // Used by the visible Register sheet, the DfE template and CSV files.
  function rowsToItems(rows, template) {
    const hi = rows.findIndex(r => r.filter(c => HEADINGS.has(norm(c)) && HEADINGS.get(norm(c)) !== "id").length >= 2);
    if (hi < 0) throw new Error("no column headings were recognised (for example Asset number, Device type, Serial number)");
    const map = rows[hi].map(h => HEADINGS.get(norm(h)) || null);
    const items = [];
    rows.slice(hi + 1).forEach(r => {
      if (items.length >= HM.MAX_ITEMS) return;
      const first = String(r.find(c => String(c).trim() !== "") || "");
      if (/^how to fill in/i.test(first.trim())) return;
      const raw = {};
      map.forEach((key, i) => {
        if (!key || r[i] === "" || r[i] == null) return;
        const f = HM.FIELD_BY_KEY.get(key);
        if (key === "id") raw.id = String(r[i]);
        else if (key === "_owned" || key === "_leaseLoan") raw[key] = AM.limitText(r[i]).trim();
        else if (f && f.type === "date") raw[key] = importDate(r[i]);
        else if (f) raw[key] = AM.limitText(r[i]);
      });
      // DfE template: two ownership columns become one
      const ll = String(raw._leaseLoan || "").toLowerCase(), own = String(raw._owned || "").toLowerCase();
      if (!raw.ownership) {
        if (/lease/.test(ll)) raw.ownership = "Leased";
        else if (/loan/.test(ll)) raw.ownership = "Loaned or provided by another organisation";
        else if (own === "yes") raw.ownership = "Owned by the school";
      }
      delete raw._leaseLoan; delete raw._owned;
      const e = HM.sanitiseEntry(raw);
      if (!["assetTag", "serialNumber", "make", "model", "type"].some(k => String(e[k] || "").trim())) return;
      if (template && DFE_TEMPLATE_EXAMPLES.includes(String(e.serialNumber).trim().toLowerCase())) return;
      items.push(e);
    });
    return items;
  }

  function readVisible(wb, name, template) {
    const s = HM.emptyState();
    const info = sheet(wb, "Info");
    if (info) {
      XLSX.utils.sheet_to_json(info, { header: 1, raw: true, defval: "" }).forEach(r => {
        if (norm(r[0]) === "school") s.school.name = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "urn") s.school.urn = AM.limitText(r[1]).slice(0, 300);
        if (norm(r[0]) === "register last reviewed") s.school.lastRegisterReview = importDate(r[1]);
      });
    }
    const rows = XLSX.utils.sheet_to_json(sheet(wb, name), { header: 1, raw: true, defval: "" });
    s.items = rowsToItems(rows, template);
    return HM.sanitiseState(s);
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
      const lines = [`${file.name} has ${plural(n, "asset")}${parsed.state.school.name ? ` for ${parsed.state.school.name}` : ""}. Your register has ${m}.`];
      if (parsed.from === "visible") lines.push("This file has no hidden copy, so it was read from the visible Register sheet. Check the details after importing.");
      if (parsed.from === "template") lines.push("This looks like the DfE asset register template. Its example rows are skipped. Check the details after importing: security questions are not in the template, so they will show as not confirmed.");
      parsed.notes.forEach(x => lines.push("Note: " + x + "."));
      let choice;
      if (!m) {
        choice = await ask("Import this register?", lines, [["Import", "replace", "btn-primary"], ["Cancel", "cancel"]]);
      } else {
        lines.push("Merge: add the file's assets to your register, updating assets with the same ID, the same serial number, or (if there is no serial number) the same asset number.");
        lines.push(`Replace: remove your ${plural(m, "current asset")} and use the file's instead. This cannot be undone, so export your register first if you might need it.`);
        choice = await ask("Import: merge or replace?", lines, [["Merge", "merge", "btn-primary"], ["Replace", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      }
      if (choice === "cancel") return;
      applyImport(parsed.state, choice);
      view = "dashboard";
      render();
      toast(`Imported ${plural(n, "asset")} (${choice === "merge" ? "merged" : "replaced"}).`);
    };
    reader.readAsArrayBuffer(file);
  }

  function applyImport(incoming, mode) {
    if (mode === "replace") {
      const current = reg.school;
      reg = incoming;
      // A file with no school details keeps the current ones
      if (!reg.school.name && !reg.school.urn) { reg.school.name = current.name; reg.school.urn = current.urn; }
      if (!reg.school.lastRegisterReview) reg.school.lastRegisterReview = current.lastRegisterReview;
      reg.school.keptURN = current.keptURN || "";
    } else {
      incoming.items.forEach(e => {
        let i = reg.items.findIndex(x => x.id === e.id);
        const k = deviceKey(e);
        if (i < 0 && k) i = reg.items.findIndex(x => deviceKey(x) === k);
        if (i >= 0) reg.items[i] = Object.assign(e, { id: reg.items[i].id });
        else if (reg.items.length < HM.MAX_ITEMS) {
          if (reg.items.some(x => x.id === e.id)) e.id = HM.newId();
          reg.items.push(e);
        }
      });
      if (!reg.school.name) reg.school.name = incoming.school.name;
      if (!reg.school.urn) reg.school.urn = incoming.school.urn;
      if (incoming.school.lastRegisterReview > (reg.school.lastRegisterReview || "")) reg.school.lastRegisterReview = incoming.school.lastRegisterReview;
    }
    profileConflict = null;
    syncFromProfile();
    saveNow();
  }

  // ── Start-up ───────────────────────────────────────────────────────────────
  function init() {
    reg = HM.loadState();
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

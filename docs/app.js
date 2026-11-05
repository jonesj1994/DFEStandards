// ── State ──────────────────────────────────────────────────────────────────
const STATE_KEY = "dfe_tracker_v1";

function defaultState() {
  const ratings = {};
  const notes = {};
  const recommendations = {};
  const ownership = {};
  STANDARDS_DATA.forEach(cat => {
    cat.items.forEach(item => {
      ratings[item.id] = "Not Set";
      notes[item.id] = "";
      recommendations[item.id] = "";
      ownership[item.id] = "";
    });
  });
  return {
    schoolName: "",
    schoolURN: "",
    schoolDfENumber: "",
    schoolPhase: "",
    schoolType: "",
    schoolLA: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolWebsite: "",
    schoolTrust: "",
    schoolPupils: "",
    assessorName: "",
    assessmentDate: "",
    ratings,
    notes,
    recommendations,
    ownership
  };
}

// Declared before loadState() runs, because loadState() uses it
const RAG_VALUES = ["Not Set", "Red", "Amber", "Green", "Met"];

let state = loadState();

// ── Shared school profile (chosen on the home page) ────────────────────────
// Fill any empty school fields from it. Fields the user has already entered are
// never overwritten here; if the tracker holds a different school, a notice
// offers to switch instead.
let profileConflict = null;
function syncFromProfile() {
  const SL = window.SchoolLookup;
  const profile = SL && SL.loadProfile();
  profileConflict = null;
  if (!profile) return;
  if (SL.differs(state.schoolURN, state.schoolName, profile)) {
    // "Keep" was chosen for this profile before: don't ask again
    if (state.profileKeptURN !== profile.urn) profileConflict = profile;
    return;
  }
  if (SL.applyTo(state, SL.DFE_FIELDS, profile, false)) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
}
syncFromProfile();

function profileNotice() {
  if (!profileConflict) return "";
  const p = profileConflict;
  return `<div class="profile-notice" role="status">
    The school chosen on the home page is <strong>${escHtml(p.name)}</strong> (URN ${escHtml(p.urn)}), but this tracker holds
    <strong>${escHtml(state.schoolName || "another school")}</strong>${state.schoolURN ? ` (URN ${escHtml(state.schoolURN)})` : ""}.
    This tracker keeps one assessment, so switching changes the school details only. Your ratings and notes stay as they are.
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${escHtml(p.name)}</button>
      <button class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${escHtml(state.schoolName || "current school")}</button>
    </div>
  </div>`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return defaultState();
    const def = defaultState();
    // Start from the defaults and copy in only known standards, valid ratings and
    // plain text, so tampered or out-of-date storage can't inject anything odd
    const out = { ...def };
    Object.keys(def).forEach(k => {
      if (typeof def[k] === "string" && (typeof saved[k] === "string" || typeof saved[k] === "number")) out[k] = String(saved[k]);
    });
    // Not part of the assessment: remembers "keep this school" on the profile notice
    if (typeof saved.profileKeptURN === "string" || typeof saved.profileKeptURN === "number") {
      out.profileKeptURN = String(saved.profileKeptURN);
    }
    const pick = (field, ok) => {
      const src = saved[field] && typeof saved[field] === "object" ? saved[field] : {};
      Object.keys(def[field]).forEach(id => {
        if (Object.prototype.hasOwnProperty.call(src, id) && ok(src[id])) out[field][id] = src[id];
      });
    };
    pick("ratings", v => RAG_VALUES.includes(v));
    ["notes", "recommendations", "ownership"].forEach(f => pick(f, v => typeof v === "string"));
    return out;
  } catch (e) {
    return defaultState();
  }
}

// Save straight away (used for one-off choices, so a quick page close can't lose them)
function saveStateNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    const ind = document.getElementById("save-indicator");
    if (ind) {
      ind.textContent = "✓ Saved";
      ind.classList.add("saved");
      setTimeout(() => ind.classList.remove("saved"), 2000);
    }
  }, 500);
}

// ── Routing ────────────────────────────────────────────────────────────────
let currentView = "dashboard";
let currentCategoryId = null;

function navigate(view, categoryId) {
  currentView = view;
  currentCategoryId = categoryId || null;
  renderView();
  updateSidebarActive();
  document.getElementById("topbar-title").textContent = viewTitle();
}

function viewTitle() {
  if (currentView === "dashboard") return "Dashboard";
  if (currentView === "school-info") return "School Information";
  if (currentView === "summary") return "Summary";
  if (currentView === "category") {
    const cat = STANDARDS_DATA.find(c => c.id === currentCategoryId);
    return cat ? cat.title : "";
  }
  return "";
}

function updateSidebarActive() {
  document.querySelectorAll(".sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    const v = a.dataset.view;
    const c = a.dataset.category;
    if (currentView !== "category" && v === currentView) a.classList.add("active");
    if (currentView === "category" && c === currentCategoryId) a.classList.add("active");
  });
}

// ── RAG helpers ────────────────────────────────────────────────────────────

function ragClass(val) {
  if (val === "Red") return "red";
  if (val === "Amber") return "amber";
  if (val === "Green") return "green";
  if (val === "Met") return "met";
  return "not-set";
}

function categoryRagSummary(cat) {
  const counts = { Red: 0, Amber: 0, Green: 0, Met: 0, "Not Set": 0 };
  cat.items.forEach(item => {
    const r = state.ratings[item.id] || "Not Set";
    counts[r] = (counts[r] || 0) + 1;
  });
  return counts;
}

function categoryOverallDot(cat) {
  const s = categoryRagSummary(cat);
  if (s.Red > 0) return "red";
  if (s.Amber > 0) return "amber";
  if (s["Not Set"] > 0) return "not-set";
  if (s.Green > 0) return "green";
  return "met";
}

// ── Sidebar nav ────────────────────────────────────────────────────────────
function buildSidebarNav() {
  const nav = document.getElementById("sidebar-nav");
  // Remove old category items (keep first 3 fixed + hr)
  const existing = nav.querySelectorAll("li[data-cat-nav]");
  existing.forEach(el => el.remove());

  STANDARDS_DATA.forEach(cat => {
    const li = document.createElement("li");
    li.dataset.catNav = cat.id;
    const dot = `<span class="rag-dot ${categoryOverallDot(cat)}"></span>`;
    const core = cat.isCore ? `<span class="core-badge">CORE</span>` : "";
    li.innerHTML = `<a href="#" data-view="category" data-category="${cat.id}">${dot}${escHtml(cat.title)}${core}</a>`;
    nav.appendChild(li);
  });

  nav.querySelectorAll("a[data-view]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const v = a.dataset.view;
      const c = a.dataset.category;
      navigate(v, c);
      // Close sidebar on mobile
      document.getElementById("sidebar").classList.remove("open");
    });
  });
}

// ── Views ──────────────────────────────────────────────────────────────────
function renderView() {
  const content = document.getElementById("content");
  if (currentView === "dashboard") content.innerHTML = renderDashboard();
  else if (currentView === "school-info") content.innerHTML = renderSchoolInfo();
  else if (currentView === "summary") content.innerHTML = renderSummary();
  else if (currentView === "category") content.innerHTML = renderCategory(currentCategoryId);
  attachViewEvents();
  buildSidebarNav();
}

// Dashboard
function renderDashboard() {
  const totalItems = STANDARDS_DATA.reduce((n, c) => n + c.items.length, 0);
  // Count only standards that are in the current data. Saved state can still hold
  // ratings for standards GOV.UK has since removed, and those must not be counted.
  const allRatings = STANDARDS_DATA.flatMap(c => c.items.map(i => state.ratings[i.id] || "Not Set"));
  const met = allRatings.filter(r => r === "Met" || r === "Green").length;
  const pct = Math.round((met / totalItems) * 100);

  const cards = STANDARDS_DATA.map(cat => {
    const s = categoryRagSummary(cat);
    const catMet = s.Met + s.Green;
    const catPct = Math.round((catMet / cat.items.length) * 100);
    const core = cat.isCore ? `<span class="core-badge" style="font-size:10px;margin-left:4px">CORE</span>` : "";
    return `
    <a class="dash-card" href="#" data-view="category" data-category="${cat.id}">
      <div class="dash-card-title">${escHtml(cat.title)}${core}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${catPct}%"></div></div>
      <div style="font-size:11px;color:#505a5f;margin-bottom:6px">${catMet} / ${cat.items.length} items met or green</div>
      <div class="dash-stats">
        ${s.Red ? `<span class="stat-chip red">Red: ${s.Red}</span>` : ""}
        ${s.Amber ? `<span class="stat-chip amber">Amber: ${s.Amber}</span>` : ""}
        ${s.Green ? `<span class="stat-chip green">Green: ${s.Green}</span>` : ""}
        ${s.Met ? `<span class="stat-chip met">Met: ${s.Met}</span>` : ""}
        ${s["Not Set"] ? `<span class="stat-chip not-set">Not Set: ${s["Not Set"]}</span>` : ""}
      </div>
    </a>`;
  }).join("");

  return `
  <div style="max-width:900px">
    <h2 style="margin-top:0">Overview</h2>
    ${typeof STANDARDS_META !== "undefined" && STANDARDS_META.lastUpdated ? `<p class="guidance-date">Guidance last updated on GOV.UK: <strong>${escHtml(formatUkDate(STANDARDS_META.lastUpdated))}</strong> &middot; <a class="guidance-link" href="${escAttr(STANDARDS_INDEX_URL)}" target="_blank" rel="noopener">View on GOV.UK &#8599;</a></p>` : ""}
    ${profileNotice()}
    ${state.schoolName ? `<p style="color:#505a5f;font-size:14px">School: <strong>${escHtml(state.schoolName)}</strong>${state.schoolURN ? ` &nbsp;|&nbsp; URN: <strong>${escHtml(state.schoolURN)}</strong>` : ""}</p>` : `<p style="color:#505a5f;font-size:13px"><a href="#" data-view="school-info">Add school information</a></p>`}
    <div style="display:flex;align-items:center;gap:24px;margin:16px 0;padding:16px;background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <div style="flex:1">
        <div style="font-size:13px;color:#505a5f;margin-bottom:6px">Overall completion (Met + Green)</div>
        <div class="progress-bar-wrap" style="height:14px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div style="font-size:28px;font-weight:700;color:var(--dfe-navy)">${pct}%</div>
      <div style="font-size:13px;color:#505a5f">${met} / ${totalItems} items</div>
    </div>
    <div class="dashboard-grid">${cards}</div>
  </div>`;
}

// School Info
function renderSchoolInfo() {
  const f = (id, label, val, ph, wide, type) => `
      <div class="form-field"${wide ? ' style="grid-column:1/-1"' : ""}>
        <label for="${id}">${label}</label>
        <input type="${type || "text"}" id="${id}" value="${escAttr(val || "")}" placeholder="${escAttr(ph)}" />
      </div>`;
  return `
  <div class="info-form" style="max-width:680px">
    <h2 style="margin-top:0">School Information</h2>
    ${profileNotice()}

    <div style="background:#f3f2f1;border-left:4px solid var(--dfe-blue);padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:20px;font-size:13px;color:#505a5f">
      Enter your school's URN or DfE number and select <strong>Look up</strong> to fill in its details from the DfE Get Information About Schools register.
      You can also <a href="index.html">find your school on the home page</a> to fill in both trackers at once.
    </div>

    <div class="lookup-row">
      <div class="form-field" style="flex:1;margin:0;min-width:0">
        <label for="si-lookup">URN or DfE number</label>
        <input type="text" id="si-lookup" value="${escAttr(state.schoolURN)}" placeholder="e.g. 100000 or 352/4000" maxlength="10" autocomplete="off" />
      </div>
      <button class="btn btn-primary" id="btn-lookup-urn" style="white-space:nowrap">
        <span id="lookup-btn-text">&#128269; Look up</span>
      </button>
    </div>

    <div id="lookup-status" role="status" aria-live="polite" style="margin-bottom:12px;font-size:13px"></div>

    <div class="info-grid">
      ${f("si-name", "School / College Name", state.schoolName, "e.g. Anytown High School", true)}
      ${f("si-urn", "URN", state.schoolURN, "e.g. 100000")}
      ${f("si-dfe", "DfE Number (LAESTAB)", state.schoolDfENumber, "e.g. 352/4000")}
      ${f("si-phase", "Phase of Education", state.schoolPhase, "e.g. Secondary")}
      ${f("si-type", "School Type", state.schoolType, "e.g. Academy converter")}
      ${f("si-la", "Local Authority", state.schoolLA, "e.g. Manchester")}
      ${f("si-trust", "Trust", state.schoolTrust, "e.g. Anytown Academy Trust")}
      ${f("si-pupils", "Number of Pupils", state.schoolPupils, "e.g. 850")}
      ${f("si-phone", "Phone", state.schoolPhone, "e.g. 0161 123 4567")}
      ${f("si-address", "Address", state.schoolAddress, "e.g. 1 School Lane, Manchester, M1 1AA", true)}
      ${f("si-website", "School Website", state.schoolWebsite, "e.g. https://www.school.org.uk", true)}
    </div>

    <hr style="border:none;border-top:1px solid #e8e8e8;margin:20px 0">
    <h3 style="margin-top:0;font-size:15px">Assessment Details</h3>

    <div class="info-grid" style="margin-bottom:20px">
      ${f("si-assessor", "Assessor Name", state.assessorName, "e.g. Jane Smith")}
      ${f("si-date", "Assessment Date", state.assessmentDate, "", false, "date")}
    </div>

    <button class="btn btn-primary" id="btn-save-info">&#10003; Save Information</button>
  </div>`;
}

// Summary
function renderSummary() {
  const rows = STANDARDS_DATA.map(cat => {
    const s = categoryRagSummary(cat);
    const core = cat.isCore ? " ★" : "";
    let overall = "Not Set";
    if (s.Red > 0) overall = "Red";
    else if (s.Amber > 0) overall = "Amber";
    else if (s["Not Set"] > 0) overall = "Not Set";
    else if (s.Green > 0) overall = "Green";
    else overall = "Met";
    return `<tr>
      <td><a href="#" data-view="category" data-category="${cat.id}">${escHtml(cat.title)}${core}</a></td>
      <td>${cat.items.length}</td>
      <td>${s.Met}</td>
      <td>${s.Green}</td>
      <td>${s.Amber}</td>
      <td>${s.Red}</td>
      <td>${s["Not Set"]}</td>
      <td><span class="rag-pill ${ragClass(overall)}">${overall}</span></td>
    </tr>`;
  }).join("");

  return `
  <div style="max-width:900px">
    <h2 style="margin-top:0">Summary</h2>
    <div class="card" style="overflow:auto">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Total</th>
            <th>Met</th>
            <th>Green</th>
            <th>Amber</th>
            <th>Red</th>
            <th>Not Set</th>
            <th>Overall</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p style="font-size:12px;color:#505a5f">★ = Core standard (one of the 6 core standards DfE expects schools and colleges to be working towards by ${coreYear()})</p>
  </div>`;
}

// "2026-09-16" -> "16 September 2026" (UK format, no time zone shifting)
function formatUkDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function coreYear() {
  return (typeof STANDARDS_META !== "undefined" && STANDARDS_META.coreDeadlineYear) || 2030;
}

// Wording follows the GOV.UK index page and the "When to meet" text on each core page.
function coreNote(cat) {
  const y = coreYear();
  if (cat.id === "filtering-monitoring") {
    return `Core standard. Schools and colleges have a statutory duty under Keeping children safe in education (KCSIE) to have appropriate filtering and monitoring in place. GOV.UK says you <strong>should already be meeting</strong> each of these standards, not waiting until ${y}.`;
  }
  if (cat.id === "cyber-security") {
    return `Core standard. GOV.UK links these standards to the KCSIE duty to have appropriate cyber security measures, and for most of them says you <strong>should already be meeting</strong> them (or act as soon as possible). They are still one of the 6 core standards to be working towards by ${y}.`;
  }
  return `Core standard. DfE expects schools and colleges to be working towards meeting this by <strong>${y}</strong>. Each standard below also has its own "When to meet" timing, and some should already be met.`;
}

// Category view
function renderCategory(catId) {
  const cat = STANDARDS_DATA.find(c => c.id === catId);
  if (!cat) return "<p>Category not found.</p>";

  const core = cat.isCore ? `<span class="core-badge" style="font-size:12px">CORE ★</span>` : "";
  const s = categoryRagSummary(cat);

  const items = cat.items.map((item, idx) => {
    const rag = state.ratings[item.id] || "Not Set";
    const n = escAttr(state.notes[item.id] || "");
    const r = escAttr(state.recommendations[item.id] || "");
    const o = escAttr(state.ownership[item.id] || "");
    const opts = RAG_VALUES.map(v =>
      `<option value="${v}" ${rag === v ? "selected" : ""}>${v}</option>`
    ).join("");

    return `
    <div class="standard-item" id="item-${item.id}">
      <div class="item-header" data-item="${item.id}">
        <span class="item-number">${idx + 1}.</span>
        <span class="item-title">${escHtml(item.title)}</span>
        <span class="rag-pill ${ragClass(rag)}">${escHtml(rag)}</span>
        <span class="chevron">&#9660;</span>
      </div>
      <div class="item-body" id="body-${item.id}">
        <div class="dfe-description"><strong>DfE guidance:</strong> ${escHtml(item.description)}</div>
        <div class="form-grid">
          <div class="form-field full-width">
            <label>Current Status &amp; Notes</label>
            <textarea data-field="notes" data-id="${item.id}" rows="3">${n}</textarea>
          </div>
          <div class="form-field full-width">
            <label>Recommendations</label>
            <textarea data-field="recommendations" data-id="${item.id}" rows="3">${r}</textarea>
          </div>
          <div class="form-field">
            <label>RAG Rating</label>
            <select class="rag-select" data-field="ratings" data-id="${item.id}">${opts}</select>
          </div>
          <div class="form-field">
            <label>Ownership</label>
            <input type="text" data-field="ownership" data-id="${item.id}" value="${o}" placeholder="e.g. IT Manager" />
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  return `
  <div style="max-width:860px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <h2 style="margin:0">${escHtml(cat.title)}</h2>${core}
    </div>
    <p style="margin:0 0 12px"><a class="guidance-link" href="${escAttr(cat.url || STANDARDS_INDEX_URL)}" target="_blank" rel="noopener">View the official DfE guidance on GOV.UK${cat.govukTitle ? `: ${escHtml(cat.govukTitle)}` : ""} &#8599;</a>${cat.lastUpdated ? `<span class="guidance-date"> &middot; page last updated ${escHtml(formatUkDate(cat.lastUpdated))}</span>` : ""}</p>
    ${cat.isCore ? `<div class="core-note">${coreNote(cat)}</div>` : ""}
    <div class="dash-stats" style="margin-bottom:20px">
      ${s.Red ? `<span class="stat-chip red">Red: ${s.Red}</span>` : ""}
      ${s.Amber ? `<span class="stat-chip amber">Amber: ${s.Amber}</span>` : ""}
      ${s.Green ? `<span class="stat-chip green">Green: ${s.Green}</span>` : ""}
      ${s.Met ? `<span class="stat-chip met">Met: ${s.Met}</span>` : ""}
      ${s["Not Set"] ? `<span class="stat-chip not-set">Not Set: ${s["Not Set"]}</span>` : ""}
    </div>
    <div id="items-list">${items}</div>
  </div>`;
}

// ── Event wiring ───────────────────────────────────────────────────────────
// ── GIAS lookup (shared code in school-lookup.js) ─────────────────────────
let lastLookup = null; // school found by the most recent lookup
async function lookupURN() {
  const input = document.getElementById("si-lookup");
  const statusEl = document.getElementById("lookup-status");
  const btn = document.getElementById("btn-lookup-urn");
  const btnText = document.getElementById("lookup-btn-text");
  const SL = window.SchoolLookup;
  const q = SL.parseQuery(input ? input.value : "");

  if (q.error || q.kind === "name") {
    statusEl.innerHTML = `<span style="color:var(--rag-red)">&#9888; ${escHtml(q.kind === "name"
      ? "Enter a URN (5 to 7 digits) or a DfE number such as 352/4000. To search by name, use the home page."
      : q.error)}</span>`;
    return;
  }

  btnText.textContent = "Looking up…";
  btn.disabled = true;
  statusEl.innerHTML = `<span style="color:#505a5f">Searching the GIAS register…</span>`;

  try {
    const { school: d } = await SL.find(input.value);
    lastLookup = d;
    // Populate the form; nothing is saved until "Save Information"
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
    set("si-name", d.name);
    set("si-urn", d.urn);
    set("si-dfe", d.dfeNumber);
    set("si-phase", d.phase);
    set("si-type", d.type);
    set("si-la", d.la);
    set("si-trust", d.trust);
    set("si-pupils", d.pupils);
    set("si-phone", d.phone);
    set("si-address", d.address);
    set("si-website", d.website);

    const closed = d.isClosed ? ` <strong style="color:var(--rag-red)">This school is closed${d.closeDate ? " (" + escHtml(SL.formatDate(d.closeDate)) + ")" : ""}${d.successors.length ? ". Replaced by URN " + d.successors.map(escHtml).join(", ") : ""}.</strong>` : "";
    statusEl.innerHTML = `<span style="color:var(--rag-green)">&#10003; Found: <strong>${escHtml(d.name)}</strong> (${escHtml([d.phase, d.type].filter(Boolean).join(", "))}).</span>${closed}
      <span style="color:#505a5f"> Check the details, then select <strong>Save Information</strong>.</span>`;
  } catch (err) {
    statusEl.innerHTML = `<span style="color:var(--rag-red)">&#9888; ${escHtml(err.message)}</span>`;
  } finally {
    btnText.textContent = "🔍 Look up";
    btn.disabled = false;
  }
}

function attachViewEvents() {
  const content = document.getElementById("content");

  // Dashboard / summary nav links
  content.querySelectorAll("a[data-view]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      navigate(a.dataset.view, a.dataset.category);
    });
  });

  // URN / DfE number lookup
  const btnLookup = document.getElementById("btn-lookup-urn");
  if (btnLookup) {
    btnLookup.addEventListener("click", () => lookupURN());
    document.getElementById("si-lookup").addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); lookupURN(); }
    });
  }

  // Home page school differs from this tracker's school
  const btnSwitch = document.getElementById("btn-profile-switch");
  if (btnSwitch) {
    btnSwitch.addEventListener("click", () => {
      window.SchoolLookup.applyTo(state, window.SchoolLookup.DFE_FIELDS, profileConflict, true);
      delete state.profileKeptURN;
      profileConflict = null;
      saveStateNow();
      renderView();
      showToast("School details updated.");
    });
    document.getElementById("btn-profile-keep").addEventListener("click", () => {
      state.profileKeptURN = profileConflict.urn;
      profileConflict = null;
      saveStateNow();
      renderView();
    });
  }

  // School info save
  const btnSave = document.getElementById("btn-save-info");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      state.schoolURN      = document.getElementById("si-urn").value.trim();
      state.schoolDfENumber = document.getElementById("si-dfe").value.trim();
      state.schoolTrust    = document.getElementById("si-trust").value.trim();
      state.schoolPupils   = document.getElementById("si-pupils").value.trim();
      state.schoolName     = document.getElementById("si-name").value.trim();
      state.schoolPhase    = document.getElementById("si-phase").value.trim();
      state.schoolType     = document.getElementById("si-type").value.trim();
      state.schoolLA       = document.getElementById("si-la").value.trim();
      state.schoolPhone    = document.getElementById("si-phone").value.trim();
      state.schoolAddress  = document.getElementById("si-address").value.trim();
      state.schoolWebsite  = document.getElementById("si-website").value.trim();
      state.assessorName   = document.getElementById("si-assessor").value.trim();
      state.assessmentDate = document.getElementById("si-date").value;
      // A school just looked up here also becomes the shared school profile,
      // so the home page and the Cyber Essentials tracker know about it.
      if (lastLookup && lastLookup.urn === state.schoolURN) {
        window.SchoolLookup.saveProfile(lastLookup);
        profileConflict = null;
        delete state.profileKeptURN;
      }
      saveState();
      renderView();
      showToast("School information saved.");
    });
  }

  // Item expand/collapse
  content.querySelectorAll(".item-header").forEach(header => {
    header.addEventListener("click", () => {
      const id = header.dataset.item;
      const body = document.getElementById("body-" + id);
      const chevron = header.querySelector(".chevron");
      if (body) {
        body.classList.toggle("open");
        chevron && chevron.classList.toggle("open");
      }
    });
  });

  // Field inputs (textarea, select, input)
  content.querySelectorAll("[data-field][data-id]").forEach(el => {
    const event = (el.tagName === "SELECT") ? "change" : "input";
    el.addEventListener(event, () => {
      const field = el.dataset.field;
      const id = el.dataset.id;
      state[field][id] = el.value;
      saveState();

      // Update RAG pill live
      if (field === "ratings") {
        const header = document.querySelector(`[data-item="${id}"]`);
        if (header) {
          const pill = header.querySelector(".rag-pill");
          if (pill) {
            pill.className = `rag-pill ${ragClass(el.value)}`;
            pill.textContent = el.value;
          }
        }
        // Update sidebar dot live
        buildSidebarNav();
      }
    });
  });
}

// ── Import/Export wiring ───────────────────────────────────────────────────
document.getElementById("btn-export").addEventListener("click", () => {
  exportToExcel(state);
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  importFromExcel(file, imported => {
    state = { ...state, ...imported };
    saveState();
    renderView();
    showToast("Data imported successfully.");
  });
  e.target.value = "";
});

// ── Mobile menu ────────────────────────────────────────────────────────────
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// ── Helpers ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Safe for attribute values AND element content (including <textarea>):
// escapes every character that can end a value or start markup.
function escAttr(str) {
  return escHtml(str);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ── Init ───────────────────────────────────────────────────────────────────
buildSidebarNav();
renderView();

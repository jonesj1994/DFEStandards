// ── State ──────────────────────────────────────────────────────────────────
const STATE_KEY = "dfe_tracker_v1";

function defaultState() {
  const ratings = {};
  const notes = {};
  const recommendations = {};
  const ownership = {};
  const targetDates = {};
  const dateTypes = {};
  STANDARDS_DATA.forEach(cat => {
    cat.items.forEach(item => {
      ratings[item.id] = "Not Set";
      notes[item.id] = "";
      recommendations[item.id] = "";
      ownership[item.id] = "";
      targetDates[item.id] = "";
      dateTypes[item.id] = "";
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
    ownership,
    // Per standard: a target date ("YYYY-MM-DD") and what it means. dateTypes is
    // "complete" (complete by), "review" (next review) or "" to follow the rating
    // (complete by until the standard is Green, then next review).
    targetDates,
    dateTypes
  };
}

// Ratings. Declared before loadState() runs, because loadState() uses them.
const RAG_VALUES = ["Not Set", "Red", "Amber", "Green"];

// What each rating means. Shown as a key on every standard area page and in
// the Excel export, so everyone rates the same way.
const RAG_INFO = [
  { value: "Not Set", label: "Not yet assessed", meaning: "This standard has not been assessed yet." },
  { value: "Red", label: "Not met", meaning: "No provision is in place, or there are significant gaps." },
  { value: "Amber", label: "Partly met", meaning: "Some provision is in place, or work to meet the standard is planned or in progress." },
  { value: "Green", label: "Met", meaning: "The standard is fully met." }
];

// Older versions had a separate "Met" rating; it is now the same as Green
function normaliseRating(val) {
  return val === "Met" ? "Green" : val;
}

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
    // Ratings: older saves may hold "Met", which is now Green
    const savedRatings = saved.ratings && typeof saved.ratings === "object" ? saved.ratings : {};
    Object.keys(def.ratings).forEach(id => {
      if (!Object.prototype.hasOwnProperty.call(savedRatings, id)) return;
      const v = normaliseRating(savedRatings[id]);
      if (RAG_VALUES.includes(v)) out.ratings[id] = v;
    });
    ["notes", "recommendations", "ownership"].forEach(f => pick(f, v => typeof v === "string"));
    pick("targetDates", v => typeof v === "string" && AssessmentModel.validDate(v) === v);
    pick("dateTypes", v => typeof v === "string" && AssessmentModel.validDateType(v) === v);
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
  if (currentView === "plan") return "Working towards";
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
// (RAG_VALUES, RAG_INFO and normaliseRating are declared near the top of the
// file, before loadState() runs.)

function ragClass(val) {
  if (val === "Red") return "red";
  if (val === "Amber") return "amber";
  if (val === "Green") return "green";
  return "not-set";
}

function ragKey() {
  return `<div class="rag-key" role="note" aria-label="What the ratings mean">
    ${RAG_INFO.map(r => `<div class="rag-key-row"><span class="rag-pill ${ragClass(r.value)}">${escHtml(r.value)}</span><span><strong>${escHtml(r.label)}</strong> – ${escHtml(r.meaning)}</span></div>`).join("")}
  </div>`;
}

function categoryRagSummary(cat) {
  const counts = { Red: 0, Amber: 0, Green: 0, "Not Set": 0 };
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
  return "green";
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
  else if (currentView === "plan") content.innerHTML = renderPlan();
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
  const met = allRatings.filter(r => r === "Green").length;
  const pct = Math.round((met / totalItems) * 100);

  const cards = STANDARDS_DATA.map(cat => {
    const s = categoryRagSummary(cat);
    const catMet = s.Green;
    const catPct = Math.round((catMet / cat.items.length) * 100);
    const core = cat.isCore ? `<span class="core-badge" style="font-size:10px;margin-left:4px">CORE</span>` : "";
    return `
    <a class="dash-card" href="#" data-view="category" data-category="${cat.id}">
      <div class="dash-card-title">${escHtml(cat.title)}${core}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${catPct}%"></div></div>
      <div style="font-size:11px;color:#505a5f;margin-bottom:6px">${catMet} / ${cat.items.length} standards Green (met)</div>
      <div class="dash-stats">
        ${s.Red ? `<span class="stat-chip red">Red: ${s.Red}</span>` : ""}
        ${s.Amber ? `<span class="stat-chip amber">Amber: ${s.Amber}</span>` : ""}
        ${s.Green ? `<span class="stat-chip green">Green: ${s.Green}</span>` : ""}
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
        <div style="font-size:13px;color:#505a5f;margin-bottom:6px">Overall completion (standards rated Green)</div>
        <div class="progress-bar-wrap" style="height:14px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div style="font-size:28px;font-weight:700;color:var(--dfe-navy)">${pct}%</div>
      <div style="font-size:13px;color:#505a5f">${met} / ${totalItems} items</div>
    </div>
    ${dashboardPlan()}
    <div class="dashboard-grid">${cards}</div>
  </div>`;
}

// Dashboard: target dates at a glance, with the next few coming up
function dashboardPlan() {
  const c = planCounts();
  const next = datedItems().filter(x => x.date && x.date.state !== "done")
    .sort((a, b) => a.date.date.localeCompare(b.date.date)).slice(0, 3);
  const chips = dateChips(c);
  return `<div class="card plan-card">
    <div class="card-header"><h3>Working towards</h3><a href="#" data-view="plan" class="guidance-link" style="margin-left:auto">See all dates &#8594;</a></div>
    <div class="card-body">
      ${chips ? `<div class="dash-stats" style="margin-bottom:${next.length ? 10 : 0}px">${chips}</div>` : `<p style="margin:0;font-size:13px;color:#505a5f">No dates set yet. Expand a standard and set a <strong>Complete by</strong> or <strong>Next review</strong> date to track what you are working towards.</p>`}
      ${next.length ? `<ul class="plan-list">${next.map(x => `<li><strong>${escHtml(formatUkDate(x.date.date))}</strong> &middot; ${escHtml(DATE_TYPE_LABELS[x.date.type])}: <a href="#" data-view="category" data-category="${escAttr(x.cat.id)}" data-focus="${escAttr(x.item.id)}">${escHtml(x.item.title)}</a> <span class="date-state ${x.date.state}">${escHtml(DATE_STATE_LABELS[x.date.state])}</span></li>`).join("")}</ul>` : ""}
    </div>
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
    else overall = "Green";
    return `<tr>
      <td><a href="#" data-view="category" data-category="${cat.id}">${escHtml(cat.title)}${core}</a></td>
      <td>${cat.items.length}</td>
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

// ── Target dates ("working towards") ───────────────────────────────────────
const DATE_TYPE_LABELS = { complete: "Complete by", review: "Next review" };
const DATE_STATE_LABELS = { overdue: "Overdue", soon: "Due soon", ok: "On track", done: "Done" };
const DATE_SOON_DAYS = 30;

// Where one standard's date stands (see AssessmentModel.dateStatus), or null
function itemDate(id) {
  return AssessmentModel.dateStatus(state.targetDates[id], state.dateTypes[id], state.ratings[id] || "Not Set", null, DATE_SOON_DAYS);
}

// Short badge for an item header, e.g. "Complete by 12 March 2027 · Overdue"
function dateBadge(id) {
  const d = itemDate(id);
  if (!d) return "";
  const when = d.state === "overdue" ? ` · ${d.type === "review" ? "review " : ""}overdue`
    : d.state === "soon" ? ` · ${d.daysLeft === 0 ? "today" : "in " + d.daysLeft + " day" + (d.daysLeft === 1 ? "" : "s")}`
    : d.state === "done" ? " · done" : "";
  return `<span class="date-badge ${d.state}">${escHtml(DATE_TYPE_LABELS[d.type])} ${escHtml(formatUkDate(d.date))}${when}</span>`;
}

// Every standard with its date, for the dashboard and the Working towards view
function datedItems() {
  const out = [];
  STANDARDS_DATA.forEach(cat => cat.items.forEach(item => {
    out.push({ cat, item, rating: state.ratings[item.id] || "Not Set", date: itemDate(item.id) });
  }));
  return out;
}

function planCounts() {
  const all = datedItems();
  const c = { overdue: 0, soon: 0, ok: 0, done: 0, undated: 0, reviews: 0 };
  all.forEach(x => {
    if (x.date) c[x.date.state]++;
    else if (x.rating === "Red" || x.rating === "Amber") c.undated++;
  });
  return c;
}

function dateChips(c) {
  return `${c.overdue ? `<span class="stat-chip red">Overdue: ${c.overdue}</span>` : ""}
    ${c.soon ? `<span class="stat-chip amber">Due in ${DATE_SOON_DAYS} days: ${c.soon}</span>` : ""}
    ${c.ok ? `<span class="stat-chip green">On track: ${c.ok}</span>` : ""}
    ${c.done ? `<span class="stat-chip met">Done: ${c.done}</span>` : ""}
    ${c.undated ? `<span class="stat-chip not-set">Red/Amber with no date: ${c.undated}</span>` : ""}`.trim();
}

// Working towards: every dated standard in date order, grouped by month
function renderPlan() {
  const all = datedItems();
  const dated = all.filter(x => x.date && x.date.state !== "done")
    .sort((a, b) => a.date.date.localeCompare(b.date.date));
  const done = all.filter(x => x.date && x.date.state === "done");
  const undated = all.filter(x => !x.date && (x.rating === "Red" || x.rating === "Amber"));
  const c = planCounts();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const link = x => `<a href="#" data-view="category" data-category="${escAttr(x.cat.id)}" data-focus="${escAttr(x.item.id)}">${escHtml(x.item.title)}</a>`;
  const area = x => `<span class="plan-area">${escHtml(x.cat.title)}${x.cat.isCore ? " ★" : ""}</span>`;

  let rows = "", lastMonth = "";
  dated.forEach(x => {
    const ym = x.date.date.slice(0, 7);
    const label = x.date.state === "overdue" ? "Overdue" : months[parseInt(ym.slice(5), 10) - 1] + " " + ym.slice(0, 4);
    if (label !== lastMonth) {
      rows += `<tr class="plan-month"><th colspan="5" scope="colgroup">${escHtml(label)}</th></tr>`;
      lastMonth = label;
    }
    rows += `<tr>
      <td class="nowrap">${escHtml(formatUkDate(x.date.date))}<div class="plan-type">${escHtml(DATE_TYPE_LABELS[x.date.type])}</div></td>
      <td>${area(x)}${link(x)}</td>
      <td><span class="rag-pill ${ragClass(x.rating)}">${escHtml(x.rating)}</span></td>
      <td>${escHtml(state.ownership[x.item.id] || "")}</td>
      <td><span class="date-state ${x.date.state}">${escHtml(DATE_STATE_LABELS[x.date.state])}</span></td>
    </tr>`;
  });

  const simpleList = list => `<ul class="plan-list">${list.map(x => `<li>${area(x)}${link(x)} <span class="rag-pill ${ragClass(x.rating)}">${escHtml(x.rating)}</span>${x.date ? ` <span class="plan-type">completed; target was ${escHtml(formatUkDate(x.date.date))}</span>` : ""}</li>`).join("")}</ul>`;

  return `
  <div style="max-width:900px">
    <h2 style="margin-top:0">Working towards</h2>
    <p style="color:#505a5f;font-size:14px;margin-top:0">Give each standard a <strong>Complete by</strong> date while you work towards it, and a <strong>Next review</strong> date once it is met. Set dates on each standard area's page. Standards marked ★ are core standards, which DfE expects schools and colleges to be working towards by ${coreYear()}.</p>
    <div class="dash-stats" style="margin-bottom:16px">${dateChips(c) || '<span class="stat-chip not-set">No dates set yet</span>'}</div>
    ${dated.length ? `<div class="card" style="overflow:auto">
      <table class="summary-table plan-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Standard</th><th scope="col">Rating</th><th scope="col">Owner</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` : `<div class="card"><div class="card-body">No upcoming dates. Open a standard area, expand a standard and set a date.</div></div>`}
    ${undated.length ? `<div class="card"><div class="card-header"><h3>Rated Red or Amber with no date (${undated.length})</h3></div><div class="card-body">${simpleList(undated)}</div></div>` : ""}
    ${done.length ? `<div class="card"><div class="card-header"><h3>Completed (${done.length})</h3></div><div class="card-body"><p style="margin-top:0;font-size:13px;color:#505a5f">Now rated Green. Change the date to <strong>Next review</strong> to schedule a review.</p>${simpleList(done)}</div></div>` : ""}
  </div>`;
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
        <span class="date-slot">${dateBadge(item.id)}</span>
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
          <div class="form-field">
            <label for="dt-${item.id}">Date type</label>
            <select id="dt-${item.id}" data-field="dateTypes" data-id="${item.id}">
              ${["complete", "review"].map(t => `<option value="${t}"${AssessmentModel.effectiveDateType(state.dateTypes[item.id], rag) === t ? " selected" : ""}>${DATE_TYPE_LABELS[t]}</option>`).join("")}
            </select>
          </div>
          <div class="form-field">
            <label for="td-${item.id}">Date</label>
            <input type="date" id="td-${item.id}" data-field="targetDates" data-id="${item.id}" value="${escAttr(state.targetDates[item.id] || "")}" />
          </div>
          <p class="date-help full-width">Use <strong>Complete by</strong> for when you aim to meet this standard. Once it is Green, switch to <strong>Next review</strong> and set when it should next be checked.</p>
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
      ${s["Not Set"] ? `<span class="stat-chip not-set">Not Set: ${s["Not Set"]}</span>` : ""}
    </div>
    ${ragKey()}
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
      const focus = a.dataset.focus;
      navigate(a.dataset.view, a.dataset.category);
      // Links to one standard open it and scroll to it
      if (focus) {
        const body = document.getElementById("body-" + focus);
        const header = document.querySelector(`.item-header[data-item="${CSS.escape(focus)}"]`);
        if (body && header) {
          body.classList.add("open");
          const ch = header.querySelector(".chevron");
          if (ch) ch.classList.add("open");
          header.scrollIntoView({ block: "start" });
        }
      }
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
      // Only real dates and known date types are kept
      if (field === "targetDates") {
        state.targetDates[id] = AssessmentModel.validDate(el.value);
        // Fix the date type as shown, so a later rating change never changes
        // what an existing date means
        const sel = document.getElementById("dt-" + id);
        if (state.targetDates[id] && !state.dateTypes[id] && sel) state.dateTypes[id] = AssessmentModel.validDateType(sel.value);
      }
      else if (field === "dateTypes") state[field][id] = AssessmentModel.validDateType(el.value);
      else state[field][id] = el.value;
      saveState();

      // Update the date badge live (a rating change can change the date type)
      if (field === "ratings" || field === "targetDates" || field === "dateTypes") {
        const slot = document.querySelector(`[data-item="${CSS.escape(id)}"] .date-slot`);
        if (slot) slot.innerHTML = dateBadge(id);
        // No date or type chosen yet: suggest the type that suits the rating
        const sel = document.getElementById("dt-" + id);
        if (sel && field === "ratings" && !state.dateTypes[id]) sel.value = AssessmentModel.effectiveDateType("", state.ratings[id]);
      }

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
// Governors' report: save first so the report has the latest answers
document.getElementById("btn-report").addEventListener("click", () => {
  saveStateNow();
  location.href = "report.html?f=dfe";
});

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

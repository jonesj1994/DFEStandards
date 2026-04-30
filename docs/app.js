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
    assessorName: "",
    assessmentDate: "",
    ratings,
    notes,
    recommendations,
    ownership
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    const def = defaultState();
    // Merge so new items get defaults
    return {
      ...def,
      ...saved,
      ratings: { ...def.ratings, ...(saved.ratings || {}) },
      notes: { ...def.notes, ...(saved.notes || {}) },
      recommendations: { ...def.recommendations, ...(saved.recommendations || {}) },
      ownership: { ...def.ownership, ...(saved.ownership || {}) }
    };
  } catch (e) {
    return defaultState();
  }
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
const RAG_VALUES = ["Not Set", "Red", "Amber", "Green", "Met"];

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
  const allRatings = Object.values(state.ratings);
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
  return `
  <div class="info-form">
    <h2 style="margin-top:0">School Information</h2>
    <div class="form-field">
      <label for="si-name">School / College Name</label>
      <input type="text" id="si-name" value="${escAttr(state.schoolName)}" placeholder="e.g. Anytown High School" />
    </div>
    <div class="form-field">
      <label for="si-urn">URN</label>
      <input type="text" id="si-urn" value="${escAttr(state.schoolURN)}" placeholder="e.g. 123456" />
    </div>
    <div class="form-field">
      <label for="si-assessor">Assessor Name</label>
      <input type="text" id="si-assessor" value="${escAttr(state.assessorName)}" placeholder="e.g. Jane Smith" />
    </div>
    <div class="form-field">
      <label for="si-date">Assessment Date</label>
      <input type="date" id="si-date" value="${escAttr(state.assessmentDate)}" />
    </div>
    <button class="btn btn-primary" id="btn-save-info">Save Information</button>
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
    <p style="font-size:12px;color:#505a5f">★ = Core standard (target 2030)</p>
  </div>`;
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
        <span class="rag-pill ${ragClass(rag)}">${rag}</span>
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
function attachViewEvents() {
  const content = document.getElementById("content");

  // Dashboard / summary nav links
  content.querySelectorAll("a[data-view]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      navigate(a.dataset.view, a.dataset.category);
    });
  });

  // School info save
  const btnSave = document.getElementById("btn-save-info");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      state.schoolName = document.getElementById("si-name").value.trim();
      state.schoolURN = document.getElementById("si-urn").value.trim();
      state.assessorName = document.getElementById("si-assessor").value.trim();
      state.assessmentDate = document.getElementById("si-date").value;
      saveState();
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return String(str).replace(/"/g, "&quot;");
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

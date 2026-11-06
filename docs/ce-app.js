// Cyber Essentials tracker. Self-contained: own state key, views and Excel export.
const CE_STATE_KEY = "ce_tracker_v1";
const CE_STATUSES = ["Not Set", "Not Met", "Partially Met", "Met", "N/A"];
const CE_ORG_FIELDS = [
  ["orgName", "School / College / Trust name", "text", "e.g. Anytown High School"],
  ["orgURN", "URN", "text", "e.g. 123456"],
  ["orgDfENumber", "DfE number (LAESTAB)", "text", "e.g. 352/4000"],
  ["orgTrust", "Trust", "text", "e.g. Anytown Academy Trust"],
  ["orgPupils", "Number of pupils", "text", "e.g. 850"],
  ["scopeDescription", "Scope description", "textarea", "e.g. Whole organisation, including all staff devices and Microsoft 365"],
  ["certLevel", "Certification level sought", "select", ["", "Cyber Essentials", "Cyber Essentials Plus"]],
  ["certBody", "Certification Body", "text", "e.g. name of your assessor"],
  ["certNumber", "Certificate number", "text", ""],
  ["certDate", "Certification date", "date", ""],
  ["renewalDate", "Renewal due", "date", ""],
  ["assessorName", "Completed by", "text", "e.g. Jane Smith"],
  ["assessmentDate", "Date of this review", "date", ""]
];

function ceAllItems() { return CE_DATA.flatMap(c => c.items); }

function ceDefaultState() {
  const s = { org: {}, status: {}, evidence: {}, actions: {}, owner: {} };
  CE_ORG_FIELDS.forEach(([k]) => (s.org[k] = ""));
  ceAllItems().forEach(i => { s.status[i.id] = "Not Set"; s.evidence[i.id] = ""; s.actions[i.id] = ""; s.owner[i.id] = ""; });
  // Use the school chosen on the home page if there is one; otherwise reuse
  // school details already entered in the DfE tracker
  const profile = window.SchoolLookup && window.SchoolLookup.loadProfile();
  if (profile) {
    window.SchoolLookup.applyTo(s.org, window.SchoolLookup.CE_FIELDS, profile, false);
  } else {
    try {
      const dfe = JSON.parse(localStorage.getItem("dfe_tracker_v1") || "{}");
      s.org.orgName = dfe.schoolName || "";
      s.org.orgURN = dfe.schoolURN || "";
      s.org.orgDfENumber = dfe.schoolDfENumber || "";
      s.org.orgTrust = dfe.schoolTrust || "";
      s.org.orgPupils = dfe.schoolPupils || "";
    } catch (e) { /* ignore */ }
  }
  return s;
}

function ceLoad() {
  const def = ceDefaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(CE_STATE_KEY) || "null");
    if (!saved || typeof saved !== "object") return def;
    // Copy in only known fields, valid statuses and plain text, so tampered or
    // out-of-date storage can't inject anything odd
    const has = (o, k) => o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
    const isText = v => typeof v === "string" || typeof v === "number";
    const out = ceDefaultState();
    Object.keys(out.org).forEach(k => { if (has(saved.org, k) && isText(saved.org[k])) out.org[k] = String(saved.org[k]); });
    if (has(saved.org, "profileKeptURN") && isText(saved.org.profileKeptURN)) out.org.profileKeptURN = String(saved.org.profileKeptURN);
    ["status", "evidence", "actions", "owner"].forEach(field => {
      Object.keys(out[field]).forEach(id => {
        if (!has(saved[field], id)) return;
        const v = saved[field][id];
        if (field === "status" ? CE_STATUSES.includes(v) : typeof v === "string") out[field][id] = v;
      });
    });
    return out;
  } catch (e) { return def; }
}

let ce = ceLoad();

// ── Shared school profile (chosen on the home page) ────────────────────────
// Fill empty organisation fields from it; never overwrite what the user has
// entered. If this tracker holds a different school, offer to switch instead.
let ceProfileConflict = null;
(function ceSyncFromProfile() {
  const SL = window.SchoolLookup;
  const profile = SL && SL.loadProfile();
  if (!profile) return;
  if (SL.differs(ce.org.orgURN, ce.org.orgName, profile)) {
    if (ce.org.profileKeptURN !== profile.urn) ceProfileConflict = profile;
    return;
  }
  // Save if anything was filled in, including on a first visit (when the
  // defaults were already filled from the profile)
  let fresh = false;
  try { fresh = !localStorage.getItem(CE_STATE_KEY); } catch (e) { /* ignore */ }
  if (SL.applyTo(ce.org, SL.CE_FIELDS, profile, false) || fresh) {
    try { localStorage.setItem(CE_STATE_KEY, JSON.stringify(ce)); } catch (e) { /* storage unavailable */ }
  }
})();

function ceProfileNotice() {
  if (!ceProfileConflict) return "";
  const p = ceProfileConflict, o = ce.org;
  return `<div class="profile-notice" role="status">
    The school chosen on the home page is <strong>${esc(p.name)}</strong> (URN ${esc(p.urn)}), but this tracker holds
    <strong>${esc(o.orgName || "another organisation")}</strong>${o.orgURN ? ` (URN ${esc(o.orgURN)})` : ""}.
    This tracker keeps one assessment, so switching changes the organisation details only. Your statuses, evidence and actions stay as they are.
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" id="btn-profile-switch">Switch to ${esc(p.name)}</button>
      <button class="btn btn-secondary btn-sm" id="btn-profile-keep">Keep ${esc(o.orgName || "current details")}</button>
    </div>
  </div>`;
}
let ceTimer = null;
function ceSaveNow() {
  clearTimeout(ceTimer);
  try { localStorage.setItem(CE_STATE_KEY, JSON.stringify(ce)); } catch (e) { /* storage unavailable */ }
}
function ceSave() {
  clearTimeout(ceTimer);
  ceTimer = setTimeout(() => {
    try { localStorage.setItem(CE_STATE_KEY, JSON.stringify(ce)); } catch (e) { /* storage unavailable */ }
    const ind = document.getElementById("save-indicator");
    if (ind) { ind.classList.add("saved"); setTimeout(() => ind.classList.remove("saved"), 2000); }
  }, 400);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function statusClass(v) {
  return { "Not Met": "red", "Partially Met": "amber", "Met": "green", "N/A": "met" }[v] || "not-set";
}
function catCounts(cat) {
  const c = { "Not Set": 0, "Not Met": 0, "Partially Met": 0, "Met": 0, "N/A": 0 };
  cat.items.forEach(i => c[ce.status[i.id] || "Not Set"]++);
  return c;
}
function catOverall(cat) {
  const c = catCounts(cat);
  if (c["Not Met"]) return "Not Met";
  if (c["Partially Met"]) return "Partially Met";
  if (c["Not Set"]) return "Not Set";
  return "Met";
}
function chips(c) {
  return Object.entries(c).filter(([, n]) => n)
    .map(([k, n]) => `<span class="stat-chip ${statusClass(k)}">${k}: ${n}</span>`).join("");
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
// Assessed controls exclude the "recommended" section
function assessedCats() { return CE_DATA.filter(c => c.id !== "recommended"); }

// ── Routing ────────────────────────────────────────────────────────────────
let ceView = "dashboard";
let ceCat = null;

function ceNavigate(view, cat) {
  ceView = view; ceCat = cat || null;
  ceRender();
  window.scrollTo(0, 0);
  document.getElementById("sidebar").classList.remove("open");
}

function ceRender() {
  const content = document.getElementById("content");
  const views = { dashboard: ceDashboard, org: ceOrgView, summary: ceSummary, category: () => ceCategory(ceCat) };
  content.innerHTML = views[ceView]();
  const cat = CE_DATA.find(c => c.id === ceCat);
  document.getElementById("topbar-title").textContent =
    { dashboard: "Cyber Essentials", org: "Organisation & Certification", summary: "Summary" }[ceView] || (cat ? cat.title : "");
  ceSidebar();
  ceBind();
}

function ceSidebar() {
  const nav = document.getElementById("sidebar-nav");
  nav.querySelectorAll("li[data-cat-nav]").forEach(el => el.remove());
  CE_DATA.forEach(cat => {
    const li = document.createElement("li");
    li.dataset.catNav = cat.id;
    li.innerHTML = `<a href="#" data-view="category" data-category="${cat.id}"><span class="rag-dot ${statusClass(catOverall(cat))}"></span>${esc(cat.title)}</a>`;
    nav.appendChild(li);
  });
  nav.querySelectorAll("a[data-view]").forEach(a => {
    const active = a.dataset.view === ceView && (ceView !== "category" || a.dataset.category === ceCat);
    a.classList.toggle("active", active);
  });
}

// ── Views ──────────────────────────────────────────────────────────────────
function ceDashboard() {
  const items = assessedCats().flatMap(c => c.items);
  const met = items.filter(i => ["Met", "N/A"].includes(ce.status[i.id])).length;
  const pct = Math.round((met / items.length) * 100);
  const ready = met === items.length;
  const o = ce.org;

  const cards = CE_DATA.map(cat => {
    const c = catCounts(cat);
    const done = c.Met + c["N/A"];
    return `<a class="dash-card" href="#" data-view="category" data-category="${cat.id}">
      <div class="dash-card-title">${esc(cat.title)}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${Math.round(done / cat.items.length * 100)}%"></div></div>
      <div style="font-size:11px;color:#505a5f;margin-bottom:6px">${done} / ${cat.items.length} met or not applicable</div>
      <div class="dash-stats">${chips(c)}</div>
    </a>`;
  }).join("");

  return `<div style="max-width:900px">
    <h2 style="margin-top:0">Cyber Essentials readiness</h2>
    <p style="color:#505a5f;font-size:13px;margin-top:0">Based on the NCSC's ${esc(CE_VERSION)}.
      <a class="guidance-link" href="${CE_SOURCE_URL}" target="_blank" rel="noopener">Read the requirements &#8599;</a></p>
    ${ceProfileNotice()}
    ${o.orgName ? `<p style="font-size:14px;color:#505a5f">Organisation: <strong>${esc(o.orgName)}</strong>${o.orgURN ? ` &nbsp;|&nbsp; URN: <strong>${esc(o.orgURN)}</strong>` : ""}${o.renewalDate ? ` &nbsp;|&nbsp; Renewal due: <strong>${esc(o.renewalDate)}</strong>` : ""}</p>`
      : `<p style="font-size:13px"><a href="#" data-view="org">Add organisation and certification details</a></p>`}
    <div class="card" style="display:flex;align-items:center;gap:24px;padding:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-size:13px;color:#505a5f;margin-bottom:6px">Assessed requirements met (scope + five controls)</div>
        <div class="progress-bar-wrap" style="height:14px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div style="font-size:28px;font-weight:700;color:var(--dfe-navy)">${pct}%</div>
      <div style="font-size:13px;color:#505a5f">${met} / ${items.length}</div>
    </div>
    <div class="core-note" style="${ready ? "background:#e3f5ec;border-color:var(--rag-green)" : ""}">
      ${ready ? "Every assessed requirement is marked Met or N/A. You look ready to apply for certification."
        : "Cyber Essentials is pass or fail: every requirement must be met for every device and service in scope."}
    </div>
    <div class="dashboard-grid">${cards}</div>
  </div>`;
}

function ceOrgView() {
  const fields = CE_ORG_FIELDS.map(([k, label, type, extra]) => {
    const v = ce.org[k] || "";
    let input;
    if (type === "textarea") input = `<textarea data-org="${k}" rows="3" placeholder="${esc(extra)}">${esc(v)}</textarea>`;
    else if (type === "select") input = `<select data-org="${k}">${extra.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${o || "Select…"}</option>`).join("")}</select>`;
    else input = `<input type="${type}" data-org="${k}" value="${esc(v)}" placeholder="${esc(extra)}" />`;
    const wide = type === "textarea" || k === "orgName";
    return `<div class="form-field${wide ? " full-width" : ""}"><label>${label}</label>${input}</div>`;
  }).join("");
  return `<div style="max-width:680px">
    <h2 style="margin-top:0">Organisation &amp; Certification</h2>
    ${ceProfileNotice()}
    <p style="font-size:13px;color:#505a5f">Changes save automatically. School details are filled in from the school you choose on the <a href="index.html">home page</a>, or from the DfE tracker. Anything you type here is kept.</p>
    <div class="form-grid">${fields}</div>
  </div>`;
}

function ceSummary() {
  const rows = CE_DATA.map(cat => {
    const c = catCounts(cat), overall = catOverall(cat);
    return `<tr><td><a href="#" data-view="category" data-category="${cat.id}">${esc(cat.title)}</a></td>
      <td>${cat.items.length}</td><td>${c.Met}</td><td>${c["Partially Met"]}</td><td>${c["Not Met"]}</td><td>${c["N/A"]}</td><td>${c["Not Set"]}</td>
      <td><span class="rag-pill ${statusClass(overall)}">${overall}</span></td></tr>`;
  }).join("");
  const open = ceAllItems().filter(i => ["Not Met", "Partially Met"].includes(ce.status[i.id]));
  const actions = open.length ? open.map(i => `<tr><td>${esc(i.title)}</td>
      <td><span class="rag-pill ${statusClass(ce.status[i.id])}">${ce.status[i.id]}</span></td>
      <td>${esc(ce.actions[i.id]) || "<em style='color:#888'>No action recorded</em>"}</td><td>${esc(ce.owner[i.id])}</td></tr>`).join("")
    : `<tr><td colspan="4" style="color:#505a5f">No outstanding actions.</td></tr>`;
  return `<div style="max-width:960px">
    <h2 style="margin-top:0">Summary</h2>
    <div class="card" style="overflow:auto"><table class="summary-table">
      <thead><tr><th>Control</th><th>Total</th><th>Met</th><th>Partial</th><th>Not Met</th><th>N/A</th><th>Not Set</th><th>Overall</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <h3>Outstanding actions</h3>
    <div class="card" style="overflow:auto"><table class="summary-table">
      <thead><tr><th>Requirement</th><th>Status</th><th>Action needed</th><th>Owner</th></tr></thead>
      <tbody>${actions}</tbody></table></div>
  </div>`;
}

function ceCategory(id) {
  const cat = CE_DATA.find(c => c.id === id);
  if (!cat) return "<p>Not found.</p>";
  const items = cat.items.map((item, idx) => {
    const st = ce.status[item.id] || "Not Set";
    const opts = CE_STATUSES.map(v => `<option ${v === st ? "selected" : ""}>${v}</option>`).join("");
    return `<div class="standard-item">
      <div class="item-header" data-item="${item.id}">
        <span class="item-number">${idx + 1}.</span>
        <span class="item-title">${esc(item.title)}</span>
        <span class="rag-pill ${statusClass(st)}">${esc(st)}</span>
        <span class="chevron">&#9660;</span>
      </div>
      <div class="item-body" id="body-${item.id}">
        <div class="dfe-description"><strong>Requirement:</strong> ${esc(item.requirement)}</div>
        ${item.schoolNote ? `<div class="core-note"><strong>For schools:</strong> ${esc(item.schoolNote)}</div>` : ""}
        <div class="form-grid">
          <div class="form-field full-width"><label>Evidence / current position</label>
            <textarea data-field="evidence" data-id="${item.id}" rows="3">${esc(ce.evidence[item.id])}</textarea></div>
          <div class="form-field full-width"><label>Action needed</label>
            <textarea data-field="actions" data-id="${item.id}" rows="2">${esc(ce.actions[item.id])}</textarea></div>
          <div class="form-field"><label>Status</label>
            <select data-field="status" data-id="${item.id}">${opts}</select></div>
          <div class="form-field"><label>Owner</label>
            <input type="text" data-field="owner" data-id="${item.id}" value="${esc(ce.owner[item.id])}" placeholder="e.g. Network Manager" /></div>
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div style="max-width:860px">
    <h2 style="margin:0 0 6px">${esc(cat.title)}</h2>
    <p style="font-size:13px;color:#505a5f;margin:0 0 4px"><strong>Applies to:</strong> ${esc(cat.appliesTo)}</p>
    <p style="font-size:13px;color:#505a5f;margin:0 0 12px"><strong>Aim:</strong> ${esc(cat.aim)}</p>
    <div class="dash-stats" style="margin-bottom:16px">${chips(catCounts(cat))}</div>
    ${items}
  </div>`;
}

// ── Events ─────────────────────────────────────────────────────────────────
function ceBind() {
  const content = document.getElementById("content");
  content.querySelectorAll("a[data-view]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); ceNavigate(a.dataset.view, a.dataset.category);
  }));
  content.querySelectorAll(".item-header").forEach(h => h.addEventListener("click", () => {
    document.getElementById("body-" + h.dataset.item).classList.toggle("open");
    h.querySelector(".chevron").classList.toggle("open");
  }));
  content.querySelectorAll("[data-field][data-id]").forEach(el => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      ce[el.dataset.field][el.dataset.id] = el.value;
      ceSave();
      if (el.dataset.field === "status") {
        const pill = content.querySelector(`[data-item="${el.dataset.id}"] .rag-pill`);
        pill.className = `rag-pill ${statusClass(el.value)}`;
        pill.textContent = el.value;
        ceSidebar();
      }
    });
  });
  const sw = document.getElementById("btn-profile-switch");
  if (sw) {
    sw.addEventListener("click", () => {
      window.SchoolLookup.applyTo(ce.org, window.SchoolLookup.CE_FIELDS, ceProfileConflict, true);
      delete ce.org.profileKeptURN;
      ceProfileConflict = null;
      ceSaveNow(); ceRender(); toast("Organisation details updated.");
    });
    document.getElementById("btn-profile-keep").addEventListener("click", () => {
      ce.org.profileKeptURN = ceProfileConflict.urn;
      ceProfileConflict = null;
      ceSaveNow(); ceRender();
    });
  }
  content.querySelectorAll("[data-org]").forEach(el => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      ce.org[el.dataset.org] = el.value; ceSave();
    });
  });
}

// ── Excel export / import ──────────────────────────────────────────────────
const CE_SHEET_HEADER = ["#", "Requirement", "NCSC requirement text", "Status", "Evidence / current position", "Action needed", "Owner"];
const ceSheetName = cat => cat.title.replace(/[\/\\*?\[\]:()]/g, "").substring(0, 31).trim();

function ceExport() {
  const wb = XLSX.utils.book_new();
  const summary = [["Control", "Total", "Met", "Partially Met", "Not Met", "N/A", "Not Set", "Overall"]];
  CE_DATA.forEach(cat => {
    const c = catCounts(cat);
    summary.push([cat.title, cat.items.length, c.Met, c["Partially Met"], c["Not Met"], c["N/A"], c["Not Set"], catOverall(cat)]);
  });
  const wsS = XLSX.utils.aoa_to_sheet(summary);
  wsS["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsS, "Summary");

  const info = [["Cyber Essentials Readiness Tracker"], ["Based on", "NCSC Cyber Essentials " + CE_VERSION], []]
    .concat(CE_ORG_FIELDS.map(([k, label]) => [label, ce.org[k] || ""]));
  const wsI = XLSX.utils.aoa_to_sheet(info);
  wsI["!cols"] = [{ wch: 32 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsI, "Info");

  CE_DATA.forEach(cat => {
    const rows = [[cat.title], ["Applies to: " + cat.appliesTo], CE_SHEET_HEADER];
    cat.items.forEach((i, n) => rows.push([n + 1, i.title, i.requirement, ce.status[i.id], ce.evidence[i.id], ce.actions[i.id], ce.owner[i.id]]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 45 }, { wch: 60 }, { wch: 14 }, { wch: 40 }, { wch: 35 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, ceSheetName(cat));
  });

  const name = ce.org.orgName ? "_" + ce.org.orgName.replace(/[^a-zA-Z0-9]/g, "_") : "";
  const file = `Cyber_Essentials_Readiness${name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  // Hidden "_assessment" sheet for the trust overview (see assessment-model.js)
  try {
    if (window.AssessmentModel) AssessmentModel.writeSnapshotSheet(XLSX, wb, AssessmentModel.fromTrackerState("cyber-essentials", ce));
  } catch (e) { console.warn("Assessment sheet not added:", e); }
  XLSX.writeFile(wb, file);
  toast("Exported: " + file);
}

// Newer exports carry a hidden "_assessment" sheet with the whole assessment
// (see assessment-model.js), so they are restored exactly from that. Older
// exports, or a damaged hidden sheet, are read from the visible sheets. A DfE
// standards export is refused. Nothing is changed unless the whole file reads.
function ceImport(file) {
  try {
    AssessmentModel.checkImportFile(file);
  } catch (err) {
    toast("Import failed: " + err.message);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), AssessmentModel.SAFE_XLSX_READ);
      // Hidden sheet first. This throws for a DfE standards file.
      const hidden = window.AssessmentModel ? AssessmentModel.readTrackerFile(XLSX, wb, "cyber-essentials") : null;
      let next, found, notes = [];
      if (hidden && hidden.state) {
        // Keep settings that are not part of the assessment (e.g. profileKeptURN)
        next = { ...hidden.state, org: { ...ce.org, ...hidden.state.org } };
        found = ceAllItems().length;
        notes = hidden.problems;
      } else {
        const v = ceReadVisibleSheets(wb);
        if (!v.found) {
          if (ceLooksLikeDfE(wb)) throw new Error("this file is a DfE digital and technology standards export, not Cyber Essentials readiness. Open it in the DfE standards tracker instead.");
          throw new Error("no Cyber Essentials sheets found in this file");
        }
        next = v.state;
        found = v.found;
        notes = hidden ? hidden.problems : [];
      }
      ce = next;
      ceSave(); ceRender();
      toast(`Imported ${found} requirements.` + (notes.length ? " Note: " + notes.join("; ") + "." : ""));
    } catch (err) { toast("Import failed: " + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// A DfE standards tracker export without the hidden sheet (older files)
function ceLooksLikeDfE(wb) {
  const a1 = wb.Sheets.Info && wb.Sheets.Info.A1 ? String(wb.Sheets.Info.A1.v || "") : "";
  return /digital (&|and) technology standards/i.test(a1);
}

// Read an export's visible sheets into a copy of the current state, so a file
// that fails part-way leaves the tracker as it was. Returns { state, found }.
function ceReadVisibleSheets(wb) {
  const s = {
    org: { ...ce.org }, status: { ...ce.status }, evidence: { ...ce.evidence },
    actions: { ...ce.actions }, owner: { ...ce.owner }
  };
  if (wb.Sheets.Info) {
    XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1 }).forEach(r => {
      const f = CE_ORG_FIELDS.find(([, label]) => label === r[0]);
      if (f) s.org[f[0]] = r[1] != null ? AssessmentModel.limitText(r[1]) : "";
    });
  }
  let found = 0;
  CE_DATA.forEach(cat => {
    const ws = wb.Sheets[ceSheetName(cat)];
    if (!ws) return;
    XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(3).forEach(r => {
      const item = cat.items.find(i => i.title === r[1]) || cat.items[Number(r[0]) - 1];
      if (!item) return;
      found++;
      s.status[item.id] = CE_STATUSES.includes(r[3]) ? r[3] : "Not Set";
      const text = v => (v != null ? AssessmentModel.limitText(v) : "");
      s.evidence[item.id] = text(r[4]);
      s.actions[item.id] = text(r[5]);
      s.owner[item.id] = text(r[6]);
    });
  });
  return { state: s, found };
}

// ── Init ───────────────────────────────────────────────────────────────────
document.getElementById("btn-export").addEventListener("click", ceExport);
// Governors' report: save first so the report has the latest answers
document.getElementById("btn-report").addEventListener("click", () => {
  ceSaveNow();
  location.href = "report.html?f=ce";
});
document.getElementById("btn-import").addEventListener("click", () => document.getElementById("file-input").click());
document.getElementById("file-input").addEventListener("change", e => {
  if (e.target.files[0]) ceImport(e.target.files[0]);
  e.target.value = "";
});
document.getElementById("menu-toggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("sidebar-nav").addEventListener("click", e => {
  const a = e.target.closest("a[data-view]");
  if (!a) return;
  e.preventDefault();
  ceNavigate(a.dataset.view, a.dataset.category);
});
ceRender();

// Home page: school finder and selected-school card.
// Moved out of index.html so the page can use a strict Content Security Policy.

// Always rebuild the GIAS link from the URN, never trust a stored URL
function giasHref(s) {
  const urn = String((s && s.urn) || "").replace(/\D/g, "");
  return urn ? "https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/" + encodeURIComponent(urn) : "";
}

const SL = window.SchoolLookup;
const KEYS = { dfe: "dfe_tracker_v1", ce: "ce_tracker_v1" };
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function readTracker(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
}
function writeTracker(key, s) {
  try { localStorage.setItem(key, JSON.stringify(s)); return true; } catch (e) { return false; }
}

// ── Tracker cards: saved progress and which school each holds ──────────
function progress(key, field, done) {
  const s = readTracker(key);
  if (!s || !s[field]) return "";
  // Recommended (rec-*) Cyber Essentials items are not assessed
  const v = Object.entries(s[field]).filter(([k]) => !k.startsWith("rec-")).map(([, x]) => x);
  const n = v.filter(x => done.includes(x)).length;
  const started = v.filter(x => x !== "Not Set").length;
  return started ? `In progress: ${n} of ${v.length} met` : "";
}

// Each tracker's current school, in a common shape
function trackerSchools() {
  const d = readTracker(KEYS.dfe), c = readTracker(KEYS.ce);
  const org = (c && c.org) || {};
  return {
    dfe: { label: "DfE tracker", exists: !!d, name: (d && d.schoolName) || "", urn: (d && d.schoolURN) || "" },
    ce: { label: "Cyber Essentials tracker", exists: !!c, name: org.orgName || "", urn: org.orgURN || "" }
  };
}

function renderTrackerCards() {
  $("progress-dfe").textContent = progress(KEYS.dfe, "ratings", ["Green", "Met"]); // "Met" = older saves, now Green
  $("progress-ce").textContent = progress(KEYS.ce, "status", ["Met", "N/A"]);
  try {
    const tv = JSON.parse(localStorage.getItem("trust_view_settings_v1") || "{}");
    $("progress-trust").textContent = tv.trustName ? "Trust: " + tv.trustName : "";
  } catch (e) { /* ignore */ }
  renderRegisterCard();
  const t = trackerSchools();
  ["dfe", "ce"].forEach(k => {
    $("school-" + k).innerHTML = t[k].name
      ? `School: <strong>${esc(t[k].name)}</strong>${t[k].urn ? " (URN " + esc(t[k].urn) + ")" : ""}` : "";
  });
}

// ── Register tiles added by each register ─────────────────────────────────
// A register's own home script (loaded in its REGISTER SLOT at the bottom of
// index.html, after this file) calls HomeTiles.add(fn). fn receives helpers:
//   esc(text)  - escape text for HTML
//   $(id)      - document.getElementById
//   schoolLine(name, urn) - the "School: … (URN …)" HTML used on every tile
// and fills in its own tile, e.g. its progress line. Errors in one tile never
// stop the rest of the home page.
window.HomeTiles = {
  add(fn) {
    try {
      fn({ esc, $, schoolLine: (name, urn) => name ? `School: <strong>${esc(name)}</strong>${urn ? " (URN " + esc(urn) + ")" : ""}` : "" });
    } catch (e) {
      console.warn("Home tile failed:", e);
    }
  }
};

// Software register tile: "12 items · 2 need attention", worked out with the
// same rules as the register page (register-data.js)
function renderRegisterCard() {
  const RM = window.RegisterModel;
  if (!RM) return;
  const r = RM.loadState();
  if (!r.items.length) {
    $("progress-register").textContent = "";
    $("school-register").innerHTML = "";
    return;
  }
  const s = RM.summarise(r);
  $("progress-register").textContent = `${s.total} item${s.total === 1 ? "" : "s"} · ` +
    (s.attention ? `${s.attention} need${s.attention === 1 ? "s" : ""} attention` : "nothing needs attention");
  $("school-register").innerHTML = r.school.name
    ? `School: <strong>${esc(r.school.name)}</strong>${r.school.urn ? " (URN " + esc(r.school.urn) + ")" : ""}` : "";
}

// ── Search ──────────────────────────────────────────────────────────────
let shown = null;     // school currently shown in the card
let busy = false;

function setStatus(text, kind) {
  const el = $("finder-status");
  el.className = "finder-status" + (kind ? " " + kind : "");
  el.textContent = text || "";
  $("finder-input").setAttribute("aria-invalid", kind === "error" ? "true" : "false");
}

function setBusy(on) {
  busy = on;
  $("finder-btn").disabled = on;
  $("finder-btn").textContent = on ? "Searching…" : "Search";
}

async function runSearch(query) {
  if (busy) return;
  $("finder-results").innerHTML = "";
  const parsed = SL.parseQuery(query);
  if (parsed.error) { setStatus(parsed.error, "error"); return; }
  setBusy(true);
  setStatus("Searching the Get Information About Schools register…", "loading");
  try {
    const res = await SL.find(query);
    if (res.results) {
      setStatus(`${res.results.length === 20 ? "Showing the first 20" : res.results.length} matching open school${res.results.length === 1 ? "" : "s"}. Choose yours:`, "ok");
      $("finder-results").innerHTML = res.results.map(r =>
        `<li><button type="button" data-urn="${esc(r.urn)}">${esc(r.name)}
          <small>${esc([r.town, r.postcode].filter(Boolean).join(", "))} · URN ${esc(r.urn)}${r.dfeNumber ? " · DfE " + esc(r.dfeNumber) : ""}</small></button></li>`).join("");
    } else {
      setStatus("");
      showSchool(res.school);
    }
  } catch (e) {
    setStatus(e.message || "Something went wrong. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

async function openByURN(urn) {
  $("finder-results").innerHTML = "";
  setBusy(true);
  setStatus("Loading school details…", "loading");
  try {
    const s = await SL.byURN(urn);
    if (!s) throw new Error("No school found for URN " + urn + ".");
    setStatus("");
    showSchool(s);
    $("finder-input").value = urn;
  } catch (e) { setStatus(e.message, "error"); }
  finally { setBusy(false); }
}

// ── Result card ─────────────────────────────────────────────────────────
function showSchool(s, opts) {
  shown = s;
  const profile = SL.loadProfile();
  const isSelected = profile && profile.urn === s.urn;
  const statusTag = s.isClosed ? `<span class="tag closed">Closed${s.closeDate ? " " + esc(SL.formatDate(s.closeDate)) : ""}</span>`
    : s.status === "Open" ? `<span class="tag open">Open</span>`
    : `<span class="tag other">${esc(s.status || "Status unknown")}</span>`;

  const closedNote = s.isClosed ? `<div class="closed-note">
      <strong>This school has closed.</strong> If it became an academy or merged, the new school has a different URN and DfE number.
      ${s.successors.length ? `<br>${s.successors.map(u => `<button type="button" class="btn btn-secondary btn-sm" data-successor="${esc(u)}">Show the school that replaced it (URN ${esc(u)})</button>`).join(" ")}` : ""}
    </div>` : "";

  const pupils = s.pupils ? `${Number(s.pupils).toLocaleString("en-GB")}${s.capacity ? " (capacity " + Number(s.capacity).toLocaleString("en-GB") + ")" : ""}${s.censusDate ? ", census " + SL.formatDate(s.censusDate) : ""}` : "";
  const rows = [
    ["URN", s.urn],
    ["DfE number", s.dfeNumber || "Not available"],
    ["Type", s.type],
    ["Phase", s.phase + (s.ageRange ? " (ages " + s.ageRange + ")" : "")],
    ["Status", s.status + (s.isClosed && s.closeDate ? ", closed " + SL.formatDate(s.closeDate) : "")],
    ["Local authority", s.la + (s.laCode ? " (" + s.laCode + ")" : "")],
    ["Trust", s.trust],
    ["Address", s.address],
    ["Pupils", pupils],
    ["Phone", s.phone]
  ].filter(([, v]) => v && String(v).trim());

  const web = SL.websiteHref(s.website);
  const sync = trackerSync(s);

  $("school-card").innerHTML = `
    <p class="eyebrow">${isSelected ? "Your selected school" : "Search result"}</p>
    <h3>${esc(s.name)}</h3>
    ${statusTag}
    ${closedNote}
    <dl class="school-details">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <p class="school-links">
      <a href="${esc(giasHref(s))}" target="_blank" rel="noopener">View on Get Information About Schools<span class="visually-hidden"> (opens in a new tab)</span></a>
      ${web ? `<a href="${esc(web)}" target="_blank" rel="noopener noreferrer">School website<span class="visually-hidden"> (opens in a new tab)</span></a>` : ""}
    </p>
    <div class="school-actions">
      ${sync.allMatch && isSelected ? "" : `<button type="button" class="btn btn-primary" id="btn-use">Use this school in both trackers</button>`}
      <button type="button" class="btn btn-secondary" id="btn-clear">Clear</button>
    </div>
    <ul class="sync-list" id="sync-list">${sync.lines.map(l => `<li>${l}</li>`).join("")}</ul>
    <div id="warn"></div>`;

  $("btn-clear").addEventListener("click", clearSelection);
  const use = $("btn-use");
  if (use) use.addEventListener("click", () => useSchool(false));
  $("school-card").querySelectorAll("[data-successor]").forEach(b =>
    b.addEventListener("click", () => openByURN(b.dataset.successor)));
  // Move focus to the result so screen reader users hear it
  if (!opts || !opts.noFocus) { const h = $("school-card").querySelector("h3"); h.setAttribute("tabindex", "-1"); h.focus(); }
}

// How each tracker relates to the school shown
function trackerSync(s) {
  const t = trackerSchools();
  const lines = [];
  let allMatch = true;
  const conflicts = [];
  ["dfe", "ce"].forEach(k => {
    const x = t[k];
    if (!x.name && !x.urn) {
      allMatch = false;
      lines.push(`${x.label}: no school yet`);
    } else if (SL.differs(x.urn, x.name, s)) {
      allMatch = false;
      conflicts.push(k);
      lines.push(`${x.label}: holds <strong>${esc(x.name || "another school")}</strong>${x.urn ? " (URN " + esc(x.urn) + ")" : ""}`);
    } else {
      lines.push(`${x.label}: &#10003; uses this school`);
    }
  });
  return { lines, allMatch, conflicts, trackers: t };
}

// ── Use this school ─────────────────────────────────────────────────────
function useSchool(confirmed) {
  const s = shown;
  if (!s) return;
  const sync = trackerSync(s);
  if (sync.conflicts.length && !confirmed) {
    const items = sync.conflicts.map(k => {
      const x = sync.trackers[k];
      return `<li>The <strong>${esc(x.label)}</strong> holds <strong>${esc(x.name || "another school")}</strong>${x.urn ? " (URN " + esc(x.urn) + ")" : ""}.</li>`;
    }).join("");
    $("warn").innerHTML = `<div class="warn-box" role="alert">
      <p><strong>Another school is already in use</strong></p>
      <ul>${items}</ul>
      <p>Each tracker keeps one assessment in this browser. If you continue, the school details in that tracker will change to <strong>${esc(s.name)}</strong>. Its ratings, notes and actions will stay as they are, so they will then show under the new school.</p>
      <p>To keep the other school's assessment, open the tracker and use <strong>Export Excel</strong> first.</p>
      <div class="school-actions">
        <button type="button" class="btn btn-danger" id="btn-confirm">Yes, switch to ${esc(s.name)}</button>
        <button type="button" class="btn btn-secondary" id="btn-cancel">Cancel</button>
      </div></div>`;
    $("btn-confirm").addEventListener("click", () => useSchool(true));
    $("btn-cancel").addEventListener("click", () => { $("warn").innerHTML = ""; });
    $("btn-confirm").focus();
    return;
  }

  const profile = SL.saveProfile(s);
  // Update trackers that already have saved data. A tracker with no saved data
  // yet fills itself from the profile when it is first opened.
  const d = readTracker(KEYS.dfe);
  if (d) {
    SL.applyTo(d, SL.DFE_FIELDS, profile, sync.conflicts.includes("dfe"));
    writeTracker(KEYS.dfe, d);
  }
  const c = readTracker(KEYS.ce);
  if (c) {
    c.org = c.org || {};
    SL.applyTo(c.org, SL.CE_FIELDS, profile, sync.conflicts.includes("ce"));
    writeTracker(KEYS.ce, c);
  }
  renderTrackerCards();
  showSchool(s, { noFocus: true });
  setStatus(`${s.name} will be used in both trackers.`, "ok");
}

function clearSelection() {
  SL.clearProfile();
  shown = null;
  $("school-card").innerHTML = "";
  $("finder-results").innerHTML = "";
  $("finder-input").value = "";
  setStatus("Selection cleared. The trackers keep any school details they already have.", "ok");
  $("finder-input").focus();
}

// ── Wiring ──────────────────────────────────────────────────────────────
$("finder-form").addEventListener("submit", e => { e.preventDefault(); runSearch($("finder-input").value); });
$("finder-results").addEventListener("click", e => {
  const b = e.target.closest("button[data-urn]");
  if (b) openByURN(b.dataset.urn);
});

renderTrackerCards();
const saved = SL.loadProfile();
if (saved) { showSchool(saved, { noFocus: true }); $("finder-input").value = saved.urn; }

SL.meta().then(m => {
  if (m && m.sourceDate) {
    $("finder-source").innerHTML = `School data from <a href="https://get-information-schools.service.gov.uk/" target="_blank" rel="noopener">Get Information About Schools</a>, last updated ${esc(SL.formatDate(m.sourceDate))}. Includes open schools and schools closed in the last 10 years.`;
  }
});

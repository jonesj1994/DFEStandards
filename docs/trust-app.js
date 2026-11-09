// Trust overview: combines many schools' tracker exports into one trust-wide view.
// Read-only: it never writes into the trackers' own saved data.
(function () {
  "use strict";
  const AM = window.AssessmentModel;
  const TS = window.TrustSources;
  const SL = window.SchoolLookup;
  const DFE = AM.framework("dfe");
  const CE = AM.framework("cyber-essentials");
  const FW = [DFE, CE];
  const SETTINGS_KEY = "trust_view_settings_v1";
  const STALE_DEFAULT = 12;

  // Where snapshots are kept. To use shared online storage later, register
  // another source in trust-sources.js and change this line (see TRUST-DATA.md).
  const source = TS.register(TS.createBrowserCache());

  // ── State ────────────────────────────────────────────────────────────────
  const app = {
    view: "overview",
    schoolKey: null,          // drill-down school
    viewing: {},              // framework -> record key shown in the drill-down (older versions)
    trust: null,              // { uid, name, schools: [...] } from GIAS
    trustLoading: null,       // { uid, name, loaded, total } while a trust's schools load
    trustError: "",
    records: [],              // from the source
    lastImport: [],           // results of the most recent import
    sort: { key: "name", dir: 1 },
    filters: { phase: "", worst: "", unassessed: false, outside: true, text: "" },
    staleMonths: STALE_DEFAULT,
    trustSearch: { text: "", results: null, error: "" }
  };

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (s.staleMonths > 0) app.staleMonths = s.staleMonths;
      return s;
    } catch (e) { return {}; }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        trustUid: app.trust ? app.trust.uid : "", trustName: app.trust ? app.trust.name : "", staleMonths: app.staleMonths
      }));
    } catch (e) { /* storage unavailable: settings last until reload */ }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function ukDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${parseInt(m[3], 10)} ${MONTHS[+m[2] - 1]} ${m[1]}` : (iso || "");
  }
  // Is the Cyber Essentials tracker released? (features.js)
  const ceLive = () => !window.Features || window.Features.isLive("ce");

  // Target date of an outstanding DfE standard (Complete by / Next review)
  const TARGET_TYPE = { complete: "Complete by", review: "Next review" };
  const TARGET_STATE = { overdue: "Overdue", soon: "Due soon", ok: "On track", done: "Done" };
  function targetCell(a) {
    const d = AM.dateStatus(a.date, a.dateType, a.status);
    if (!d) return '<em class="muted">None</em>';
    const flag = d.state === "overdue" ? ' <strong style="color:var(--rag-red)">overdue</strong>' : d.state === "soon" ? ' <strong style="color:#a85300">soon</strong>' : "";
    return `<span style="white-space:nowrap">${esc(ukDate(d.date))}</span>${flag}`;
  }
  function targetExport(a) {
    const d = AM.dateStatus(a.date, a.dateType, a.status);
    return d ? [d.date, `${TARGET_TYPE[d.type]}: ${TARGET_STATE[d.state]}`] : ["", ""];
  }
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 3200);
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const normName = s => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
  const urnOf = s => { const d = String(s || "").replace(/\D/g, ""); return d ? String(parseInt(d, 10)) : ""; };
  const dfeNoOf = s => String(s || "").replace(/\D/g, "");

  // The date an assessment "counts" from: its assessment date, else its export date
  function assessedOn(snap) { return (snap.assessmentDate || snap.exportedAt || "").slice(0, 10); }
  function monthsAgo(iso) {
    const d = AM.parseDate(iso);
    if (!d) return Infinity;
    const n = new Date();
    return (n.getFullYear() - d.getUTCFullYear()) * 12 + (n.getMonth() - d.getUTCMonth()) - (n.getDate() < d.getUTCDate() ? 1 : 0);
  }
  // Newest first: export time, then assessment date, then import time. The
  // record key breaks any tie, so the order never depends on import order.
  function newer(a, b) {
    const k = r => [r.snapshot.exportedAt || "", r.snapshot.assessmentDate || "", r.provenance.importedAt || "", r.key || ""];
    const ka = k(a), kb = k(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i] ? -1 : 1;
    return 0;
  }

  const ABBR = { Red: "R", Amber: "A", Green: "G", Met: "M", "Not Set": "·", "Not Met": "NM", "Partially Met": "PM", "N/A": "NA" };
  // One scale for "worst status" across both frameworks
  const WORST = [
    { sev: 4, id: "red", label: "Red / Not Met", cls: "red" },
    { sev: 3, id: "amber", label: "Amber / Partially Met", cls: "amber" },
    { sev: 2, id: "not-set", label: "Not Set", cls: "not-set" },
    { sev: 1, id: "good", label: "Green / Met", cls: "green" },
    { sev: 0, id: "good", label: "Green / Met", cls: "green" }
  ];
  const gridCats = f => f.categories().filter(c => !f.assessed || f.assessed(c));

  // ── GIAS names for imported schools ──────────────────────────────────────
  // Schools that are not in the selected trust (or every school, when no trust
  // is selected) are named from the GIAS register when their URN is known, so a
  // row's name never depends on which file was imported first. Until a lookup
  // finishes, or when GIAS has no record, the newest file's name is used.
  const giasByUrn = new Map();   // urn -> GIAS record, or null if GIAS has none
  async function lookupImportedNames() {
    if (!SL || !SL.byURN) return;
    const urns = Array.from(new Set(app.records.map(r => urnOf(r.snapshot.school.urn)).filter(u => u && !giasByUrn.has(u))));
    if (!urns.length) return;
    let changed = false;
    await Promise.all(urns.map(async u => {
      try {
        const rec = await SL.byURN(u);
        giasByUrn.set(u, rec || null);
        if (rec) changed = true;
      } catch (e) { /* offline: keep the file's name and try again next time */ }
    }));
    if (changed) { refreshSchools(); renderKeepFocus(); }
  }

  // ── Building the school list ─────────────────────────────────────────────
  // Rows are the selected trust's open academies (from GIAS) plus any school in
  // the imported files that is not one of them (flagged as outside the trust).
  function buildSchools() {
    const rows = new Map();
    const byUrn = new Map(), byDfe = new Map(), byName = new Map();
    if (app.trust) {
      app.trust.schools.forEach(s => {
        const key = "urn:" + s.urn;
        const row = {
          key, urn: s.urn, dfeNumber: s.dfeNumber, name: s.name, phase: s.phase, pupils: s.pupils,
          type: s.type, la: s.la, trust: app.trust.name, inTrust: true, gias: s, records: { dfe: [], "cyber-essentials": [] }
        };
        rows.set(key, row);
        byUrn.set(s.urn, row);
        if (s.laestab || s.dfeNumber) byDfe.set(dfeNoOf(s.laestab || s.dfeNumber), row);
        byName.set(normName(s.name), row);
      });
    }
    // Newest first, so a row's details come from its newest file whatever the
    // order the files were imported in
    app.records.slice().sort(newer).forEach(rec => {
      const sc = rec.snapshot.school;
      let row = byUrn.get(urnOf(sc.urn)) || (sc.dfeNumber && byDfe.get(dfeNoOf(sc.dfeNumber))) || (!sc.urn && byName.get(normName(sc.name)));
      if (!row) {
        const key = AM.schoolKey(sc);
        row = rows.get(key);
        if (!row) {
          const g = giasByUrn.get(urnOf(sc.urn));
          row = {
            key, urn: urnOf(sc.urn), dfeNumber: sc.dfeNumber, name: (g && g.name) || sc.name || "(no school name)", phase: sc.phase,
            pupils: sc.pupils, type: sc.type, la: sc.la, trust: sc.trust, inTrust: !app.trust, outside: !!app.trust,
            gias: null, records: { dfe: [], "cyber-essentials": [] }
          };
          rows.set(key, row);
          if (row.urn) byUrn.set(row.urn, row);
        }
      }
      row.records[rec.snapshot.framework].push(rec);
      // Fill gaps from the files (no trust selected, or GIAS has no value)
      ["phase", "pupils", "dfeNumber", "trust", "type", "la"].forEach(k => { if (!row[k] && sc[k]) row[k] = sc[k]; });
    });
    rows.forEach(row => {
      row.current = {};
      row.summary = {};
      FW.forEach(f => {
        const list = row.records[f.id].sort(newer);
        row.current[f.id] = list[0] || null;
        row.summary[f.id] = list[0] ? AM.summarise(list[0].snapshot) : null;
      });
      const sums = FW.map(f => row.summary[f.id]).filter(Boolean);
      row.assessed = sums.length > 0;
      row.worst = sums.length ? Math.max(...sums.map(s => s.worstSeverity)) : -1;
      row.dates = {};
      row.stale = false;
      FW.forEach(f => {
        const r = row.current[f.id];
        row.dates[f.id] = r ? assessedOn(r.snapshot) : "";
        if (r && monthsAgo(row.dates[f.id]) >= app.staleMonths) row.stale = true;
      });
    });
    return Array.from(rows.values());
  }

  let schools = [];
  function refreshSchools() { schools = buildSchools(); }
  const inScope = () => schools.filter(s => !s.outside);

  // ── Trust-wide summary ───────────────────────────────────────────────────
  function trustSummary() {
    const list = inScope();
    const dfe = list.filter(s => s.summary.dfe).map(s => ({ s, sum: s.summary.dfe }));
    const ce = list.filter(s => s.summary["cyber-essentials"]).map(s => ({ s, sum: s.summary["cyber-essentials"] }));
    const coreItems = dfe.reduce((n, x) => n + x.sum.core.items, 0);
    const coreDone = dfe.reduce((n, x) => n + x.sum.core.done, 0);
    const renewals = ce.map(x => ({ s: x.s, c: x.sum.certification })).filter(x => x.c.state === "due" || x.c.state === "overdue")
      .sort((a, b) => a.c.daysLeft - b.c.daysLeft);

    // Weakest categories: share of assessed schools whose category is red or amber
    const weak = [];
    FW.forEach(f => {
      const sums = (f === DFE ? dfe : ce);
      if (!sums.length) return;
      gridCats(f).forEach(cat => {
        let red = 0, amber = 0, done = 0, total = 0;
        sums.forEach(x => {
          const c = x.sum.categories.find(c => c.id === cat.id);
          if (c.severity === 4) red++; else if (c.severity === 3) amber++;
          done += c.done; total += c.total;
        });
        weak.push({ f, cat, red, amber, n: sums.length, score: (red * 2 + amber) / sums.length, donePct: pct(done, total) });
      });
    });
    weak.sort((a, b) => b.score - a.score || a.donePct - b.donePct);

    return {
      total: list.length,
      dfe, ce,
      coreAll: dfe.filter(x => x.sum.core.categoriesMet === x.sum.core.categories).length,
      corePct: pct(coreDone, coreItems), coreItems, coreDone,
      fmMet: dfe.filter(x => x.sum.filtering && x.sum.filtering.metNow).length,
      ceReady: ce.filter(x => x.sum.ready).length,
      ceAvg: ce.length ? Math.round(ce.reduce((n, x) => n + x.sum.totals.pct, 0) / ce.length) : 0,
      renewals,
      weak: weak.filter(w => w.score > 0).slice(0, 5),
      both: list.filter(s => s.summary.dfe && s.summary["cyber-essentials"]).length,
      none: list.filter(s => !s.assessed).length
    };
  }

  // ── Routing ──────────────────────────────────────────────────────────────
  function navigate(view, key) {
    app.view = view;
    if (view === "school") { app.schoolKey = key; app.viewing = {}; }
    render();
    window.scrollTo(0, 0);
    document.getElementById("sidebar").classList.remove("open");
    const c = document.getElementById("content");
    c.focus({ preventScroll: true });
  }

  let rendering = false;
  function render() {
    // Replacing the page can blur a changed input, which fires its change
    // handler and asks to render again mid-update. Ignore that nested call.
    if (rendering) return;
    rendering = true;
    try { renderNow(); } finally { rendering = false; }
  }
  // Re-render without losing the user's place (used when data arrives in the
  // background: trust schools loading, GIAS names found)
  function renderKeepFocus() {
    const el = document.activeElement;
    const id = el && el.id && document.getElementById("content").contains(el) ? el.id : "";
    const sel = id && typeof el.selectionStart === "number" ? [el.selectionStart, el.selectionEnd] : null;
    render();
    if (!id) return;
    const again = document.getElementById(id);
    if (again) {
      again.focus({ preventScroll: true });
      if (sel) try { again.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text input */ }
    }
  }
  let softTimer = null;
  function renderSoon() {
    if (softTimer) return;
    softTimer = setTimeout(() => { softTimer = null; renderKeepFocus(); }, 150);
  }

  function renderNow() {
    const views = { overview: viewOverview, import: viewImport, trust: viewTrust, about: viewAbout, school: viewSchool };
    const titles = { overview: "Trust overview", import: "Import school files", trust: "Choose trust", about: "About this data", school: "School detail" };
    document.getElementById("content").innerHTML = (views[app.view] || viewOverview)();
    document.getElementById("topbar-title").textContent = titles[app.view] || "";
    document.title = (titles[app.view] || "Trust overview") + (app.trust ? " – " + app.trust.name : "") + " | Trust Overview";
    document.querySelectorAll("#sidebar-nav a[data-view]").forEach(a => {
      const on = a.dataset.view === app.view;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    bind();
  }

  function loadingLine() {
    const l = app.trustLoading;
    if (!l) return "";
    const n = app.trust && app.trust.uid === l.uid ? app.trust.schools.length : 0;
    return `<p class="small privacy-note" role="status" style="margin-top:0">
      Loading ${l.name ? esc(l.name) : "the trust"}'s schools from the GIAS register${l.total ? ` (${pct(l.loaded, l.total)}%, ${plural(n, "school")} so far)` : ""}…
      You can carry on using the page. Schools outside the trust are worked out once loading finishes.</p>`;
  }

  function trustLine() {
    if (app.trustLoading && !(app.trust && app.trust.uid === app.trustLoading.uid)) {
      return `<p class="small muted" style="margin-top:0">Trust: <strong style="color:#0b0c0c">${esc(app.trustLoading.name || "GIAS group UID " + app.trustLoading.uid)}</strong>.</p>${loadingLine()}`;
    }
    if (app.trust) {
      return `<p class="small muted" style="margin-top:0">Trust: <strong style="color:#0b0c0c">${esc(app.trust.name)}</strong> (GIAS group UID ${esc(app.trust.uid)}),
        ${app.trustLoading ? "" : plural(app.trust.schools.length, "open academy", "open academies") + "."} <a href="#" data-view="trust">Change trust</a></p>${loadingLine()}`;
    }
    if (app.trustError) {
      return `<div class="warn-note" role="alert">${esc(app.trustError)} <a href="#" data-view="trust">Choose a trust</a>. Until then, the view shows every school in the imported files.</div>`;
    }
    return `<p class="small muted" style="margin-top:0">No trust selected, so the view shows every school in the imported files. <a href="#" data-view="trust">Choose a trust</a> to see which academies have not sent an assessment yet.</p>`;
  }

  // ── Overview ─────────────────────────────────────────────────────────────
  function viewOverview() {
    if (!schools.length) {
      return `<div class="narrow">
        <h2 style="margin-top:0">Trust overview</h2>
        ${trustLine()}
        ${privacyNote()}
        <div class="card" style="padding:16px">
          <p style="margin-top:0">Nothing to show yet. To build the overview:</p>
          <ol style="line-height:1.7;margin-bottom:0">
            <li>Ask each school to open the <a href="dfe.html">DfE standards</a>${ceLive() ? ' and <a href="ce.html">Cyber Essentials</a> trackers' : " tracker"} and select <strong>Export Excel</strong>.</li>
            <li><a href="#" data-view="trust">Choose your trust</a> (optional, but it shows which academies are missing).</li>
            <li><a href="#" data-view="import">Import the files</a> here. You can add them all at once.</li>
          </ol>
        </div>
      </div>`;
    }
    const t = trustSummary();
    return `<div class="page">
      <h2 style="margin-top:0">Trust overview</h2>
      ${trustLine()}
      ${summaryCards(t)}
      <h2 id="grid-heading" style="font-size:18px">Schools</h2>
      ${filtersHtml()}
      ${gridHtml()}
    </div>`;
  }

  function card(title, body) { return `<section class="card trust-card" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${body}</section>`; }
  function bar(p, color) { return `<div class="progress-bar-wrap" role="img" aria-label="${p}%"><div class="progress-bar-fill" style="width:${p}%${color ? ";background:" + color : ""}"></div></div>`; }

  function summaryCards(t) {
    const N = t.total;
    const dfeN = t.dfe.length, ceN = t.ce.length;
    const year = (typeof STANDARDS_META !== "undefined" && STANDARDS_META.coreDeadlineYear) || 2030;
    const cards = [];
    cards.push(card(`Core standards (by ${year})`, dfeN
      ? `<div class="big">${t.coreAll} <small>of ${dfeN} assessed ${dfeN === 1 ? "school meets" : "schools meet"} all 6</small></div>
         ${bar(t.corePct)}
         <div class="small muted">${t.coreDone} of ${t.coreItems} core standards rated Green across the trust (${t.corePct}%).</div>`
      : `<div class="small muted">No DfE standards assessments imported yet.</div>`));
    cards.push(card("Filtering and monitoring met now", dfeN
      ? `<div class="big">${t.fmMet} <small>of ${dfeN} assessed</small></div>
         ${bar(pct(t.fmMet, dfeN), t.fmMet === dfeN ? "" : "var(--rag-amber)")}
         <div class="small muted">Every filtering and monitoring standard rated Green. Schools should already meet this (KCSIE).${N > dfeN ? ` ${plural(N - dfeN, "school")} not assessed.` : ""}</div>`
      : `<div class="small muted">No DfE standards assessments imported yet.</div>`));
    cards.push(card("Cyber Essentials readiness", ceN
      ? `<div class="big">${t.ceReady} <small>of ${ceN} assessed ready</small></div>
         ${bar(t.ceAvg)}
         <div class="small muted">Average ${t.ceAvg}% of requirements Met or N/A. Ready means every assessed requirement is Met or N/A.${N > ceN ? ` ${plural(N - ceN, "school")} not assessed.` : ""}</div>`
      : `<div class="small muted">No Cyber Essentials assessments imported yet.</div>`));
    cards.push(card("Certificate renewals (next 90 days)", ceN
      ? `<div class="big">${t.renewals.length} <small>${t.renewals.filter(r => r.c.state === "overdue").length} overdue</small></div>
         ${t.renewals.length ? `<ul>${t.renewals.slice(0, 6).map(r => `<li><a href="#" data-school="${esc(r.s.key)}">${esc(r.s.name)}</a>: ${r.c.state === "overdue" ? `<strong style="color:var(--rag-red)">overdue since ${esc(ukDate(r.c.renewalDue))}</strong>` : `due ${esc(ukDate(r.c.renewalDue))} (${plural(r.c.daysLeft, "day")})`}${r.c.estimated ? " <span class=\"tag\">estimated</span>" : ""}</li>`).join("")}${t.renewals.length > 6 ? `<li>and ${t.renewals.length - 6} more</li>` : ""}</ul>`
          : `<div class="small muted">No renewals due in the next 90 days.</div>`}`
      : `<div class="small muted">No Cyber Essentials assessments imported yet.</div>`));
    cards.push(card("Weakest areas", t.weak.length
      ? t.weak.map(w => `<div class="weak-row"><span>${esc(w.cat.title)}${w.cat.isCore ? " ★" : ""} <span class="tag">${w.f === DFE ? "DfE" : "CE"}</span></span>
          <span class="small muted">${w.red} red, ${w.amber} amber of ${w.n}</span>
          <div class="weak-bar" aria-hidden="true"><span class="r" style="width:${pct(w.red, w.n)}%"></span><span class="a" style="width:${pct(w.amber, w.n)}%"></span></div></div>`).join("")
      : `<div class="small muted">${dfeN || ceN ? "No area is rated red or amber." : "No assessments imported yet."}</div>`));
    cards.push(card("Assessment coverage", `<div class="big">${N - t.none} <small>of ${N} schools assessed</small></div>
      ${bar(pct(N - t.none, N))}
      <div class="small muted">DfE standards: ${dfeN} of ${N}. Cyber Essentials: ${ceN} of ${N}. Both: ${t.both}.${app.trust ? "" : " Choose a trust to include academies that have not sent a file."}</div>`));
    return `<div class="trust-cards">${cards.join("")}</div>`;
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  function filtersHtml() {
    const phases = Array.from(new Set(schools.map(s => s.phase).filter(Boolean))).sort();
    const f = app.filters;
    return `<div class="card filters" role="search" aria-label="Filter schools">
      <div class="form-field"><label for="f-text">School name</label><input id="f-text" type="search" value="${esc(f.text)}" placeholder="Filter by name" /></div>
      <div class="form-field"><label for="f-phase">Phase</label><select id="f-phase"><option value="">All phases</option>${phases.map(p => `<option ${p === f.phase ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></div>
      <div class="form-field"><label for="f-worst">Worst status</label><select id="f-worst">
        ${[["", "Any"], ["red", "Red / Not Met"], ["amber", "Amber / Partially Met"], ["not-set", "Not Set"], ["good", "All Green / Met"], ["none", "Not assessed"]]
          .map(([v, l]) => `<option value="${v}" ${v === f.worst ? "selected" : ""}>${l}</option>`).join("")}
      </select></div>
      <div class="form-field"><label for="f-stale">Out of date after (months)</label><input id="f-stale" type="number" min="1" max="60" value="${app.staleMonths}" /></div>
      <label class="check"><input type="checkbox" id="f-unassessed" ${f.unassessed ? "checked" : ""} /> Only schools missing an assessment</label>
      ${app.trust ? `<label class="check"><input type="checkbox" id="f-outside" ${f.outside ? "checked" : ""} /> Show schools outside the trust</label>` : ""}
    </div>`;
  }

  function filtered() {
    const f = app.filters;
    const text = f.text.trim().toLowerCase();
    return schools.filter(s => {
      if (s.outside && !f.outside) return false;
      if (text && !s.name.toLowerCase().includes(text) && !String(s.urn).includes(text)) return false;
      if (f.phase && s.phase !== f.phase) return false;
      if (f.unassessed && s.current.dfe && s.current["cyber-essentials"]) return false;
      if (f.worst) {
        if (f.worst === "none") { if (s.assessed) return false; }
        else {
          if (!s.assessed) return false;
          const w = WORST.find(x => x.sev === s.worst);
          if (!w || w.id !== f.worst) return false;
        }
      }
      return true;
    });
  }

  function sortValue(s, key) {
    if (key === "name") return s.name.toLowerCase();
    if (key === "urn") return Number(s.urn) || 0;
    if (key === "phase") return (s.phase || "~").toLowerCase();
    if (key === "pupils") return Number(s.pupils) || 0;
    if (key === "worst") return s.worst;
    if (key === "date:dfe") return s.dates.dfe || "";
    if (key === "date:cyber-essentials") return s.dates["cyber-essentials"] || "";
    const m = /^cat:([^:]+):(.+)$/.exec(key);
    if (m) {
      const sum = s.summary[m[1]];
      const c = sum && sum.categories.find(c => c.id === m[2]);
      return c ? c.severity : -1;
    }
    return 0;
  }
  function sorted(list) {
    const { key, dir } = app.sort;
    return list.slice().sort((a, b) => {
      // Outside-trust schools always after the trust's own
      if (!!a.outside !== !!b.outside) return a.outside ? 1 : -1;
      const va = sortValue(a, key), vb = sortValue(b, key);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.name.localeCompare(b.name, "en-GB");
    });
  }

  function th(label, key, extra, cls) {
    const on = app.sort.key === key;
    const aria = on ? ` aria-sort="${app.sort.dir === 1 ? "ascending" : "descending"}"` : "";
    return `<th scope="col"${aria}${cls ? ` class="${cls}"` : ""}><button type="button" data-sort="${esc(key)}" title="Sort by ${esc(extra || label)}">${esc(label)}</button></th>`;
  }

  function gridHtml() {
    const list = sorted(filtered());
    const dfeCats = gridCats(DFE), ceCats = gridCats(CE);
    const head1 = `<tr class="group"><th class="sticky" scope="col" colspan="1"><span class="visually-hidden">School</span></th><th colspan="3"></th>
      <th colspan="${dfeCats.length + 1}">DfE digital and technology standards</th><th class="ce" colspan="${ceCats.length + 1}">Cyber Essentials</th><th></th></tr>`;
    const head2 = `<tr>
      ${th("School", "name", "school name", "sticky")}
      ${th("URN", "urn", "URN")}${th("Phase", "phase")}${th("Pupils", "pupils", "number of pupils")}
      ${th("Assessed", "date:dfe", "DfE assessment date")}
      ${dfeCats.map(c => th(c.title + (c.isCore ? " ★" : ""), "cat:dfe:" + c.id, c.title + (c.isCore ? " (core standard)" : ""), "cat")).join("")}
      ${th("Assessed", "date:cyber-essentials", "Cyber Essentials assessment date")}
      ${ceCats.map(c => th(c.title, "cat:cyber-essentials:" + c.id, c.title, "cat")).join("")}
      ${th("Worst", "worst", "worst status")}
    </tr>`;
    const rows = list.map(s => {
      const cls = [!s.assessed ? "no-assessment" : "", s.stale ? "stale" : "", s.outside ? "outside" : ""].filter(Boolean).join(" ");
      const tags = [
        s.outside ? `<span class="tag warn">Outside trust</span>` : "",
        !s.assessed ? `<span class="tag bad">Not assessed</span>` : "",
        s.stale ? `<span class="tag warn">Out of date</span>` : ""
      ].join("");
      const cells = f => {
        const sum = s.summary[f.id];
        const r = s.current[f.id];
        const d = s.dates[f.id];
        const stale = r && monthsAgo(d) >= app.staleMonths;
        const date = `<td class="date${!r ? " missing" : stale ? " stale" : ""}">${r ? esc(ukDate(d)) || "Unknown" : "None"}${r && s.records[f.id].length > 1 ? ` <span class="tag" title="${s.records[f.id].length - 1} older export(s)">+${s.records[f.id].length - 1}</span>` : ""}</td>`;
        return date + gridCats(f).map(cat => {
          if (!sum) return `<td class="c none" aria-label="${esc(cat.title)}: not assessed">–</td>`;
          const c = sum.categories.find(c => c.id === cat.id);
          return `<td class="c ${c.cls}" title="${esc(cat.title)}: ${esc(c.overall)} (${c.done} of ${c.total} done)" aria-label="${esc(cat.title)}: ${esc(c.overall)}">${ABBR[c.overall]}</td>`;
        }).join("");
      };
      const w = WORST.find(x => x.sev === s.worst);
      return `<tr class="${cls}">
        <th scope="row" class="sticky"><button type="button" class="school-btn" data-school="${esc(s.key)}">${esc(s.name)}</button>${tags.trim() ? `<div class="row-tags">${tags}</div>` : ""}</th>
        <td>${esc(s.urn)}</td><td>${esc(s.phase)}</td><td>${esc(s.pupils)}</td>
        ${cells(DFE)}${cells(CE)}
        <td>${w ? `<span class="rag-pill ${w.cls}">${esc(w.label)}</span>` : `<span class="rag-pill not-set">Not assessed</span>`}</td>
      </tr>`;
    }).join("");
    return `<p class="small muted" id="grid-count" role="status">${plural(list.length, "school")} shown${list.length !== schools.length ? ` of ${schools.length}` : ""}. Select a column heading to sort, or a school for detail.</p>
      <div class="grid-wrap" tabindex="0" role="region" aria-labelledby="grid-heading">
        <table class="trust-grid">
          <caption class="visually-hidden">Overall status of each school in each standard area. ★ marks a DfE core standard.</caption>
          <thead>${head1}${head2}</thead>
          <tbody>${rows || `<tr><td colspan="${7 + dfeCats.length + ceCats.length}">No schools match these filters.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="legend" aria-label="Key">
        <span><span class="sw" style="background:var(--rag-red)"></span>R / NM: Red or Not Met</span>
        <span><span class="sw" style="background:var(--rag-amber)"></span>A / PM: Amber or Partially Met</span>
        <span><span class="sw" style="background:var(--rag-green)"></span>G / M: Green (DfE) or Met (CE)</span>
        <span><span class="sw" style="background:#505a5f"></span>M: Met (DfE)</span>
        <span><span class="sw" style="background:#b1b4b6"></span>·: Not Set</span>
        <span>–: not assessed</span>
        <span>★ core standard</span>
        <span>Category colours use the same rules as each tracker's Summary.</span>
      </div>`;
  }

  // ── Import ───────────────────────────────────────────────────────────────
  function privacyNote() {
    return `<div class="privacy-note"><strong>Your data stays on this device.</strong> Files are read in this browser and are not uploaded anywhere.
      Imported assessments are kept in this browser's storage${source.persistent ? "" : " until you close or reload the page (this browser is not allowing storage)"}
      until you select <strong>Clear imported data</strong>. Use a trust device and account, and clear the data on shared computers.</div>`;
  }

  function viewImport() {
    const res = app.lastImport;
    const results = res.length ? `<h3>Latest import</h3><div class="card"><ul class="result-list">${res.map(r => {
      if (!r.ok) return `<li><span class="fname">${esc(r.fileName)}</span> <span class="tag bad">Not imported</span><ul><li>${esc(r.error)}</li></ul></li>`;
      const s = r.record.snapshot;
      const notes = (r.flags || []).concat(r.record.provenance.warnings || []);
      return `<li><span class="fname">${esc(r.fileName)}</span> <span class="tag ok">Imported</span>${(r.tags || []).join("")}<br>
        <strong>${esc(s.school.name || "(no name)")}</strong>${s.school.urn ? ` · URN ${esc(s.school.urn)}` : ""} · ${esc(AM.framework(s.framework).shortLabel)}
        · exported ${esc(ukDate(s.exportedAt)) || "on an unknown date"}${s.assessmentDate ? ` · assessed ${esc(ukDate(s.assessmentDate))}` : ""}
        ${notes.length ? `<ul>${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</li>`;
    }).join("")}</ul></div>` : "";

    const all = app.records.slice().sort((a, b) => (a.snapshot.school.name || "").localeCompare(b.snapshot.school.name || "", "en-GB") || a.snapshot.framework.localeCompare(b.snapshot.framework) || newer(a, b));
    const currentKeys = new Set(schools.flatMap(s => FW.map(f => s.current[f.id] && s.current[f.id].key)).filter(Boolean));
    const table = all.length ? `<h3>All imported assessments (${all.length})</h3>
      <div class="card table-wrap"><table class="summary-table">
        <thead><tr><th>School</th><th>Framework</th><th>Exported</th><th>Read from</th><th>File</th><th>Status</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
        <tbody>${all.map(r => `<tr>
          <td>${esc(r.snapshot.school.name)}${r.snapshot.school.urn ? `<br><span class="small muted">URN ${esc(r.snapshot.school.urn)}</span>` : ""}</td>
          <td>${esc(AM.framework(r.snapshot.framework).shortLabel)}</td>
          <td>${esc(ukDate(r.snapshot.exportedAt)) || "Unknown"}</td>
          <td>${esc(r.provenance.parsedFrom)}</td>
          <td style="overflow-wrap:anywhere;min-width:140px">${esc(r.provenance.fileName)}</td>
          <td>${currentKeys.has(r.key) ? `<span class="tag ok">Newest</span>` : `<span class="tag">Older version</span>`}</td>
          <td><button type="button" class="btn btn-secondary btn-sm" data-remove="${esc(r.key)}" aria-label="Remove ${esc(r.provenance.fileName)}">Remove</button></td>
        </tr>`).join("")}</tbody></table></div>` : "";

    return `<div class="narrow">
      <h2 style="margin-top:0">Import school files</h2>
      ${trustLine()}
      ${privacyNote()}
      <div class="dropzone" id="dropzone">
        <p><strong>Drag and drop tracker exports here</strong>, or choose them from your computer.</p>
        <p class="small muted">Excel files (.xlsx) exported from the DfE standards tracker or the Cyber Essentials tracker. You can choose many files at once.
          If a school sends more than one export, the newest is used and older ones are kept as previous versions.</p>
        <label class="btn btn-primary" for="file-input" tabindex="-1" style="cursor:pointer">&#8593; Choose files</label>
        <input type="file" id="file-input" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple class="visually-hidden" />
      </div>
      <div id="import-status" role="status" aria-live="polite" class="small"></div>
      ${results}
      ${table}
    </div>`;
  }

  async function importFiles(fileList) {
    const MAX_FILES = 200; // two exports per school for even the largest trust
    let files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length > MAX_FILES) {
      toast(`Only the first ${MAX_FILES} files were read. Import the rest in another batch.`);
      files = files.slice(0, MAX_FILES);
    }
    const status = document.getElementById("import-status");
    if (status) status.textContent = `Reading ${plural(files.length, "file")}…`;
    const results = [];
    for (const file of files) results.push(await TS.parseFile(file));

    const before = new Set(app.records.map(r => r.key));
    for (const r of results) if (r.ok) await source.saveSnapshot(r.record);
    app.records = await source.listSnapshots(null);
    refreshSchools();
    lookupImportedNames();

    // Flag duplicates and schools outside the selected trust
    results.forEach(r => {
      if (!r.ok) return;
      r.flags = []; r.tags = [];
      const snap = r.record.snapshot;
      const row = schools.find(s => s.records[snap.framework].some(x => x.key === r.record.key));
      if (!row) return;
      const fwName = AM.framework(snap.framework).shortLabel;
      if (before.has(r.record.key)) r.flags.push("This export had already been imported, so it was replaced.");
      const sameBatch = results.filter(x => x.ok && x !== r && x.record.key === r.record.key);
      if (sameBatch.length) r.flags.push("The same export was chosen more than once.");
      const list = row.records[snap.framework];
      if (list.length > 1) {
        if (row.current[snap.framework].key === r.record.key) {
          r.tags.push(`<span class="tag">Newest</span>`);
          r.flags.push(`Newest of ${list.length} ${fwName} exports for this school. Older ones are kept as previous versions.`);
        } else {
          r.tags.push(`<span class="tag warn">Older version</span>`);
          r.flags.push(`A newer ${fwName} export (${ukDate(row.current[snap.framework].snapshot.exportedAt)}) is already in use for this school. This one is kept as a previous version.`);
        }
      }
      if (row.outside) {
        r.tags.push(`<span class="tag warn">Outside trust</span>`);
        r.flags.push(`This school is not one of ${app.trust.name}'s open academies${snap.school.trust ? ` (the file says its trust is ${snap.school.trust})` : ""}.`);
      } else if (row.gias) {
        r.flags.push(`Matched to ${row.gias.name} (URN ${row.gias.urn}) in the GIAS register.`);
      }
      if (!snap.school.urn) r.flags.push("The file has no URN, so it was matched by school name. Ask the school to add its URN in the tracker.");
      if (snap.frameworkVersion && snap.frameworkVersion !== AM.framework(snap.framework).version()) {
        r.flags.push(`Exported against an earlier version of the ${fwName} (${snap.frameworkVersion}). Standards added since then show as Not Set.`);
      }
    });
    app.lastImport = results;
    const ok = results.filter(r => r.ok).length;
    render();
    const s2 = document.getElementById("import-status");
    const msg = `Imported ${ok} of ${plural(results.length, "file")}.${ok < results.length ? " See below for the files that could not be read." : ""}`;
    if (s2) s2.textContent = msg;
    toast(msg);
  }

  // ── Choose trust ─────────────────────────────────────────────────────────
  function viewTrust() {
    const ts = app.trustSearch;
    const fromFiles = Array.from(new Set(app.records.map(r => r.snapshot.school.trust).filter(Boolean))).slice(0, 5);
    const results = ts.error ? `<p class="small" style="color:var(--rag-red)">${esc(ts.error)}</p>`
      : ts.results ? (ts.results.length ? `<ul class="trust-results">${ts.results.map(t => `<li><button type="button" class="btn btn-secondary" data-trust="${esc(t.uid)}">${esc(t.name)} <span class="small muted">UID ${esc(t.uid)} · ${plural(t.urns.length, "school")}</span></button></li>`).join("")}</ul>`
        : `<p class="small">No trust found. Try fewer words, or the trust's GIAS group UID.</p>`) : "";
    const current = app.trust ? `<h3>${esc(app.trust.name)}</h3>
      ${loadingLine()}
      <p class="small muted">GIAS group UID ${esc(app.trust.uid)} · ${plural(app.trust.schools.length, "open academy", "open academies")}${app.trustLoading ? " so far" : ""}.
        <button type="button" class="btn btn-secondary btn-sm" id="btn-trust-clear">Stop using this trust</button></p>
      <div class="card table-wrap"><table class="summary-table">
        <thead><tr><th>School</th><th>URN</th><th>DfE number</th><th>Phase</th><th>Pupils</th></tr></thead>
        <tbody>${app.trust.schools.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.urn)}</td><td>${esc(s.dfeNumber)}</td><td>${esc(s.phase)}</td><td>${esc(s.pupils)}</td></tr>`).join("")}</tbody>
      </table></div>` : "";
    return `<div class="narrow">
      <h2 style="margin-top:0">Choose trust</h2>
      <p class="small muted">Search the DfE's Get Information About Schools (GIAS) register by trust name or group UID. The overview then lists every open academy in the trust,
        so you can see which have not sent an assessment. You can also skip this and work from the imported files alone.</p>
      ${app.trustError ? `<div class="warn-note" role="alert">${esc(app.trustError)}</div>` : ""}
      ${app.trust ? "" : loadingLine()}
      <form id="trust-form" class="lookup-row" style="flex-wrap:wrap">
        <div class="form-field" style="flex:1;margin:0;min-width:200px">
          <label for="trust-q">Trust name or GIAS group UID</label>
          <input id="trust-q" type="search" value="${esc(ts.text)}" placeholder="e.g. Anytown Academy Trust or 4005" autocomplete="off" />
        </div>
        <button class="btn btn-primary" type="submit">&#128269; Search</button>
      </form>
      ${fromFiles.length && !app.trust ? `<p class="small">Trusts named in the imported files: ${fromFiles.map(n => `<button type="button" class="btn btn-secondary btn-sm" data-trust-name="${esc(n)}">${esc(n)}</button>`).join(" ")}</p>` : ""}
      <div id="trust-status" role="status" aria-live="polite">${results}</div>
      ${current}
    </div>`;
  }

  async function searchTrust(text) {
    app.trustSearch = { text, results: null, error: "" };
    if (!SL || !SL.searchTrusts) { app.trustSearch.error = "Trust search is not available on this copy of the site. You can still import files."; render(); return; }
    try { app.trustSearch.results = await SL.searchTrusts(text, 20); }
    catch (e) { app.trustSearch.error = e.message; }
    render();
    const first = document.querySelector("[data-trust]");
    if (first) first.focus();
  }

  // Select a trust by GIAS group UID. The overview is shown straight away and
  // fills in as the trust's schools load, so a large trust does not block the
  // page. opts.quiet: no toast or navigation (start-up). opts.fromLink: the
  // UID came from a trust.html?trust= link.
  let trustToken = 0;
  async function selectTrust(uid, opts) {
    opts = opts || {};
    uid = String(uid == null ? "" : uid).trim();
    const token = ++trustToken;
    const settings = loadSettings();
    app.trustError = "";
    app.trustLoading = { uid, name: opts.name || (settings.trustUid === uid ? settings.trustName : "") || "", loaded: 0, total: 0 };
    if (app.trust && app.trust.uid !== uid) app.trust = null;
    refreshSchools();
    if (!opts.quiet) navigate("overview"); else renderSoon();
    const keepOpen = s => !s.isClosed;
    try {
      if (!/^\d+$/.test(uid)) throw new SL.LookupError("not a GIAS group UID", "notfound");
      const t = await SL.trustSchools(uid, partial => {
        if (token !== trustToken) return;
        app.trust = { uid: partial.uid, name: partial.name, schools: partial.schools.filter(keepOpen) };
        app.trustLoading = { uid, name: partial.name, loaded: partial.loaded, total: partial.total };
        refreshSchools();
        renderSoon();
      });
      if (token !== trustToken) return;
      app.trust = { uid: t.uid, name: t.name, schools: t.schools.filter(keepOpen) };
      app.trustLoading = null;
      saveSettings();
      setTrustInUrl(t.uid);
      refreshSchools();
      renderKeepFocus();
      if (!opts.quiet) toast(`Using ${t.name}.`);
    } catch (e) {
      if (token !== trustToken) return;
      app.trust = null;
      app.trustLoading = null;
      if (e.code === "notfound") {
        app.trustError = opts.fromLink
          ? `The link you followed is for GIAS group UID "${uid}", but no open trust with that UID is in the GIAS register. The link may be mistyped, or the trust may have closed or merged.`
          : `No trust found with GIAS group UID ${uid}.`;
      } else {
        app.trustError = `The trust's school list could not be loaded (${e.message}). Check your internet connection and try again.`;
      }
      refreshSchools();
      renderKeepFocus();
    }
  }

  // Keep trust.html?trust=<UID> in step with the selected trust, so the address
  // can be bookmarked or shared. Other parts of the address are kept.
  function setTrustInUrl(uid) {
    try {
      const u = new URL(window.location.href);
      if (uid) u.searchParams.set("trust", uid); else u.searchParams.delete("trust");
      if (u.href !== window.location.href) history.replaceState(history.state, "", u.href);
    } catch (e) { /* very old browser: the address just isn't updated */ }
  }

  // ── School drill-down ────────────────────────────────────────────────────
  function viewSchool() {
    const s = schools.find(x => x.key === app.schoolKey);
    if (!s) return `<p>School not found. <a href="#" data-view="overview">Back to the overview</a></p>`;
    const sections = FW.map(f => schoolSection(s, f)).join("");
    return `<div class="page" style="max-width:1000px">
      <p style="margin-top:0"><a href="#" data-view="overview">&#8592; Back to the trust overview</a></p>
      <h2 style="margin:0 0 6px">${esc(s.name)}</h2>
      <div class="school-head">
        ${s.urn ? `<span>URN <strong>${esc(s.urn)}</strong></span>` : ""}
        ${s.dfeNumber ? `<span>DfE number <strong>${esc(s.dfeNumber)}</strong></span>` : ""}
        ${s.phase ? `<span>Phase <strong>${esc(s.phase)}</strong></span>` : ""}
        ${s.pupils ? `<span>Pupils <strong>${esc(s.pupils)}</strong></span>` : ""}
        ${s.trust ? `<span>Trust <strong>${esc(s.trust)}</strong></span>` : ""}
        ${s.outside ? `<span class="tag warn">Outside ${esc(app.trust.name)}</span>` : ""}
      </div>
      <p class="small muted">This is a read-only view of the imported files. To change an assessment, the school updates its tracker and sends a new export.</p>
      ${sections}
    </div>`;
  }

  function schoolSection(s, f) {
    const list = s.records[f.id];
    if (!list.length) {
      return `<section class="card" style="padding:16px"><h3 style="margin-top:0">${esc(f.label)}</h3><p class="small muted" style="margin:0">No ${esc(f.shortLabel)} export imported for this school yet.</p></section>`;
    }
    const rec = list.find(r => r.key === app.viewing[f.id]) || list[0];
    const isNewest = rec === list[0];
    const snap = rec.snapshot;
    const sum = AM.summarise(snap);
    const statusCols = f.id === "dfe" ? ["Met", "Green", "Amber", "Red", "Not Set"] : ["Met", "Partially Met", "Not Met", "N/A", "Not Set"];
    const rows = sum.categories.map(c => `<tr><td>${esc(c.title)}${c.isCore ? " ★" : ""}${c.assessed ? "" : ' <span class="tag">not assessed</span>'}</td><td>${c.total}</td>
      ${statusCols.map(k => `<td>${c.counts[k]}</td>`).join("")}<td><span class="rag-pill ${c.cls}">${esc(c.overall)}</span></td></tr>`).join("");
    const actions = sum.outstanding.sort((a, b) => b.severity - a.severity);
    const notesLabel = f.id === "dfe" ? "Notes" : "Evidence";
    const actionLabel = f.id === "dfe" ? "Recommendations" : "Action needed";
    const cert = sum.certification;
    const older = list.length > 1 ? `<details class="older" ${isNewest ? "" : "open"}><summary>${plural(list.length - 1, "other export")} for this school</summary>
      <ul>${list.map(r => `<li>${esc(ukDate(r.snapshot.exportedAt)) || "Unknown date"} · ${esc(r.provenance.fileName)}${r === list[0] ? " (newest)" : ""}
        ${r === rec ? " <strong>(showing)</strong>" : ` <button type="button" class="btn btn-secondary btn-sm" data-view-version="${esc(f.id)}" data-key="${esc(r.key)}">View</button>`}</li>`).join("")}</ul></details>` : "";
    return `<section class="card" style="padding:16px" aria-labelledby="h-${f.id}">
      <h3 id="h-${f.id}" style="margin-top:0">${esc(f.label)} ${isNewest ? "" : '<span class="tag warn">Older version</span>'}</h3>
      <p class="small muted" style="margin-top:0">
        ${snap.assessor ? `Completed by <strong>${esc(snap.assessor)}</strong> · ` : ""}
        Assessed ${esc(ukDate(snap.assessmentDate)) || "(no date given)"} · exported ${esc(ukDate(snap.exportedAt)) || "(unknown)"}
        · from ${esc(rec.provenance.fileName)} (${esc(rec.provenance.parsedFrom)})
        ${snap.frameworkVersion ? ` · ${f.id === "dfe" ? "GOV.UK guidance of " + esc(ukDate(snap.frameworkVersion)) : "NCSC " + esc(snap.frameworkVersion)}` : ""}</p>
      ${older}
      <p class="small"><strong>${sum.totals.done} of ${sum.totals.items}</strong> ${f.id === "dfe" ? "standards rated Green" : "assessed requirements Met or N/A"} (${sum.totals.pct}%).
        ${f.id === "dfe" ? `Core standards: ${sum.core.categoriesMet} of ${sum.core.categories} areas fully Green. Filtering and monitoring: <span class="rag-pill ${sum.filtering.cls}">${esc(sum.filtering.overall)}</span>`
          : `${sum.ready ? '<span class="tag ok">Ready to apply</span>' : '<span class="tag warn">Not ready yet</span>'}
             ${cert.level ? ` · Seeking ${esc(cert.level)}` : ""}${cert.renewalDue ? ` · Renewal ${cert.state === "overdue" ? `<strong style="color:var(--rag-red)">overdue since ${esc(ukDate(cert.renewalDue))}</strong>` : `due ${esc(ukDate(cert.renewalDue))}`}${cert.estimated ? " (estimated from certification date)" : ""}` : ""}`}
      </p>
      <div class="table-wrap"><table class="summary-table cat-summary">
        <thead><tr><th>${f.id === "dfe" ? "Standard" : "Control"}</th><th>Total</th>${statusCols.map(k => `<th>${esc(k)}</th>`).join("")}<th>Overall</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <h4>Outstanding actions (${actions.length})</h4>
      ${actions.length ? `<div class="table-wrap"><table class="summary-table">
        <thead><tr><th>Area</th><th>${f.id === "dfe" ? "Standard" : "Requirement"}</th><th>Status</th><th>${notesLabel}</th><th>${actionLabel}</th><th>Owner</th>${f.id === "dfe" ? "<th>Target</th>" : ""}</tr></thead>
        <tbody>${actions.map(a => `<tr><td>${esc(a.categoryTitle)}${a.isCore ? " ★" : ""}</td><td class="wrap">${esc(a.itemTitle)}</td>
          <td><span class="rag-pill ${f.cls(a.status)}">${esc(a.status)}</span></td>
          <td class="wrap">${esc(a.notes) || '<em class="muted">None</em>'}</td><td class="wrap">${esc(a.actions) || '<em class="muted">None recorded</em>'}</td><td>${esc(a.owner)}</td>${f.id === "dfe" ? `<td>${targetCell(a)}</td>` : ""}</tr>`).join("")}</tbody>
      </table></div>` : `<p class="small muted">Nothing rated ${f.open.join(" or ")}.</p>`}
    </section>`;
  }

  // ── About ────────────────────────────────────────────────────────────────
  function viewAbout() {
    return `<div class="narrow">
      <h2 style="margin-top:0">About this data</h2>
      ${privacyNote()}
      <div class="card" style="padding:16px;font-size:14px;line-height:1.6">
        <p style="margin-top:0"><strong>Where it comes from.</strong> Each school completes the trackers and exports them to Excel. You import those files here.
          Newer exports include a hidden sheet with the full assessment, so they import exactly. Older exports are read from their visible sheets,
          matching each row by the standard's wording (including earlier wording) and then by row number.</p>
        <p><strong>How colours are worked out.</strong> A category is Red (or Not Met) if any item is, then Amber (or Partially Met), then Not Set, then Green, then Met.
          These are the same rules as each tracker's Summary sheet. Cyber Essentials "Recommended" items are guidance only and are left out.</p>
        <p><strong>Duplicates.</strong> For each school and framework the newest export is used. Older exports are kept and can be viewed on the school's page.</p>
        <p><strong>Trust and school details.</strong> From the DfE's Get Information About Schools register, refreshed weekly
          (Open Government Licence v3.0).</p>
        <p style="margin-bottom:0"><strong>Storage.</strong> ${source.persistent ? "Imported assessments are saved in this browser (IndexedDB) so they are still here after a reload." : "This browser is not allowing storage, so imported assessments last until the page is closed or reloaded."}
          Nothing is sent to a server. Select <strong>Clear imported data</strong> to remove them.</p>
      </div>
    </div>`;
  }

  // ── Trust Excel export ───────────────────────────────────────────────────
  function exportTrust() {
    if (!schools.length) { toast("Nothing to export yet. Import some school files first."); return; }
    const t = trustSummary();
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10);
    const dfeCats = gridCats(DFE), ceCats = gridCats(CE);

    const sum = [
      ["Trust overview: DfE digital and technology standards and Cyber Essentials"],
      ["Trust", app.trust ? app.trust.name : "(no trust selected: all imported schools)"],
      ["GIAS group UID", app.trust ? app.trust.uid : ""],
      ["Produced on", today],
      [],
      ["Measure", "Value", "Out of", "Notes"],
      ["Schools", t.total, "", app.trust ? "Open academies in the trust (GIAS)" : "Schools in the imported files"],
      ["Schools with any assessment", t.total - t.none, t.total, ""],
      ["DfE standards assessed", t.dfe.length, t.total, ""],
      ["Cyber Essentials assessed", t.ce.length, t.total, ""],
      ["Schools meeting all 6 core standards", t.coreAll, t.dfe.length, "Every core area Green"],
      ["Core standards rated Green (all schools)", t.coreDone, t.coreItems, t.corePct + "%"],
      ["Filtering and monitoring met now", t.fmMet, t.dfe.length, "Every filtering and monitoring standard Green"],
      ["Cyber Essentials ready", t.ceReady, t.ce.length, "Average " + t.ceAvg + "% of requirements Met or N/A"],
      ["Certificate renewals due within 90 days or overdue", t.renewals.length, t.ce.length, ""],
      [],
      ["Weakest areas", "Framework", "Schools red / not met", "Schools amber / partially met", "Schools assessed"]
    ];
    t.weak.forEach(w => sum.push([w.cat.title + (w.cat.isCore ? " ★" : ""), w.f.shortLabel, w.red, w.amber, w.n]));
    sum.push([], ["Renewals", "Renewal due", "Days left", "Estimated?"]);
    t.renewals.forEach(r => sum.push([r.s.name, r.c.renewalDue, r.c.daysLeft, r.c.estimated ? "Yes, from certification date" : "No"]));
    const wsS = XLSX.utils.aoa_to_sheet(sum);
    wsS["!cols"] = [{ wch: 48 }, { wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsS, "Trust summary");

    const head = ["School", "URN", "DfE number", "Phase", "Pupils", "In trust", "DfE assessed", "DfE exported"]
      .concat(dfeCats.map(c => c.title + (c.isCore ? " ★" : "")), ["CE assessed", "CE exported"], ceCats.map(c => "CE: " + c.title), ["Worst status", "Out of date"]);
    const grid = [head];
    sorted(schools).forEach(s => {
      const w = WORST.find(x => x.sev === s.worst);
      const cat = (f, c) => { const sm = s.summary[f.id]; return sm ? sm.categories.find(x => x.id === c.id).overall : "Not assessed"; };
      const exp = f => (s.current[f.id] ? (s.current[f.id].snapshot.exportedAt || "").slice(0, 10) : "");
      grid.push([s.name, s.urn, s.dfeNumber, s.phase, s.pupils, s.outside ? "No" : app.trust ? "Yes" : "", s.dates.dfe, exp(DFE)]
        .concat(dfeCats.map(c => cat(DFE, c)), [s.dates["cyber-essentials"], exp(CE)], ceCats.map(c => cat(CE, c)),
          [w ? w.label : "Not assessed", s.stale ? "Yes" : ""]));
    });
    const wsG = XLSX.utils.aoa_to_sheet(grid);
    wsG["!cols"] = head.map((h, i) => ({ wch: i === 0 ? 40 : Math.min(Math.max(h.length, 10), 26) }));
    XLSX.utils.book_append_sheet(wb, wsG, "Grid");

    const act = [["School", "URN", "Framework", "Area", "Core", "Standard / requirement", "Status", "Notes / evidence", "Recommendations / action needed", "Owner", "Target date", "Target status", "Exported"]];
    sorted(schools).forEach(s => FW.forEach(f => {
      const sm = s.summary[f.id];
      if (!sm) return;
      sm.outstanding.slice().sort((a, b) => b.severity - a.severity).forEach(a => act.push([
        s.name, s.urn, f.shortLabel, a.categoryTitle, a.isCore ? "Yes" : "", a.itemTitle, a.status, a.notes, a.actions, a.owner,
        ...targetExport(a),
        (s.current[f.id].snapshot.exportedAt || "").slice(0, 10)
      ]));
    }));
    const wsA = XLSX.utils.aoa_to_sheet(act);
    wsA["!cols"] = [{ wch: 34 }, { wch: 8 }, { wch: 16 }, { wch: 24 }, { wch: 6 }, { wch: 60 }, { wch: 14 }, { wch: 40 }, { wch: 40 }, { wch: 18 }, { wch: 11 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Outstanding actions");

    const files = [["School", "URN", "Framework", "Exported", "Assessed", "Read from", "File", "Used"]];
    app.records.slice().sort(newer).forEach(r => {
      const row = schools.find(s => s.records[r.snapshot.framework].includes(r));
      files.push([r.snapshot.school.name, r.snapshot.school.urn, AM.framework(r.snapshot.framework).shortLabel,
        (r.snapshot.exportedAt || "").slice(0, 10), r.snapshot.assessmentDate, r.provenance.parsedFrom, r.provenance.fileName,
        row && row.current[r.snapshot.framework] === r ? "Newest" : "Older version"]);
    });
    const wsF = XLSX.utils.aoa_to_sheet(files);
    wsF["!cols"] = [{ wch: 34 }, { wch: 8 }, { wch: 16 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 50 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsF, "Imported files");

    const name = app.trust ? "_" + app.trust.name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") : "";
    const file = `Trust_Overview${name}_${today}.xlsx`;
    XLSX.writeFile(wb, file);
    toast("Exported: " + file);
  }

  // ── Events ───────────────────────────────────────────────────────────────
  function bind() {
    const c = document.getElementById("content");
    c.querySelectorAll("a[data-view]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); navigate(a.dataset.view); }));
    c.querySelectorAll("[data-school]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); navigate("school", b.dataset.school); }));
    c.querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.sort;
      // Status columns start worst first; text columns A to Z
      if (app.sort.key === k) app.sort.dir = -app.sort.dir;
      else app.sort = { key: k, dir: /^(cat:|worst|pupils|date:)/.test(k) ? -1 : 1 };
      rerenderGrid(k);
    }));
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    on("f-text", "input", e => { app.filters.text = e.target.value; rerenderGrid(null, "f-text"); });
    on("f-phase", "change", e => { app.filters.phase = e.target.value; rerenderGrid(null, "f-phase"); });
    on("f-worst", "change", e => { app.filters.worst = e.target.value; rerenderGrid(null, "f-worst"); });
    on("f-unassessed", "change", e => { app.filters.unassessed = e.target.checked; rerenderGrid(null, "f-unassessed"); });
    on("f-outside", "change", e => { app.filters.outside = e.target.checked; rerenderGrid(null, "f-outside"); });
    on("f-stale", "change", e => {
      const v = parseInt(e.target.value, 10);
      if (v >= 1 && v <= 60) { app.staleMonths = v; saveSettings(); refreshSchools(); rerenderGrid(null, "f-stale"); }
    });

    // Import
    const input = document.getElementById("file-input");
    if (input) {
      input.addEventListener("change", e => { importFiles(e.target.files); e.target.value = ""; });
      const label = c.querySelector('label[for="file-input"]');
      // The label looks like a button, so make it act like one from the keyboard
      label.setAttribute("role", "button");
      label.tabIndex = 0;
      label.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      const dz = document.getElementById("dropzone");
      ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
      ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
      dz.addEventListener("drop", e => importFiles(e.dataTransfer.files));
    }
    c.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", async () => {
      await source.deleteSnapshot(b.dataset.remove);
      app.records = await source.listSnapshots(null);
      app.lastImport = [];
      refreshSchools(); render(); toast("Removed.");
    }));

    // Trust
    on("trust-form", "submit", e => { e.preventDefault(); searchTrust(document.getElementById("trust-q").value); });
    c.querySelectorAll("[data-trust]").forEach(b => b.addEventListener("click", () => {
      const hit = (app.trustSearch.results || []).find(t => t.uid === b.dataset.trust);
      selectTrust(b.dataset.trust, { name: hit ? hit.name : "" });
    }));
    c.querySelectorAll("[data-trust-name]").forEach(b => b.addEventListener("click", () => searchTrust(b.dataset.trustName)));
    on("btn-trust-clear", "click", () => {
      trustToken++; // stop any trust that is still loading
      app.trust = null; app.trustLoading = null; app.trustError = "";
      saveSettings(); setTrustInUrl(""); refreshSchools(); render();
      toast("Trust cleared. Showing all imported schools.");
    });

    // Drill-down versions
    c.querySelectorAll("[data-view-version]").forEach(b => b.addEventListener("click", () => {
      app.viewing[b.dataset.viewVersion] = b.dataset.key;
      render();
      const h = document.getElementById("h-" + b.dataset.viewVersion);
      if (h) h.scrollIntoView();
    }));
  }

  // Re-render the overview but keep keyboard focus where it was
  function rerenderGrid(sortKey, focusId) {
    render();
    const el = sortKey ? document.querySelector(`[data-sort="${CSS.escape(sortKey)}"]`) : focusId ? document.getElementById(focusId) : null;
    if (el) {
      el.focus();
      if (focusId === "f-text") { const v = el.value; el.setSelectionRange(v.length, v.length); }
    }
  }

  document.getElementById("sidebar-nav").addEventListener("click", e => {
    const a = e.target.closest("a[data-view]");
    if (!a) return;
    e.preventDefault();
    navigate(a.dataset.view);
  });
  document.getElementById("menu-toggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  document.getElementById("btn-export").addEventListener("click", exportTrust);
  document.getElementById("btn-clear").addEventListener("click", async () => {
    if (!app.records.length) { toast("There is no imported data to clear."); return; }
    if (!window.confirm(`Remove all ${plural(app.records.length, "imported assessment")} from this browser? The original files are not affected.`)) return;
    await source.clear();
    app.records = []; app.lastImport = [];
    refreshSchools(); render();
    toast("Imported data cleared from this browser.");
  });

  // ── Start ────────────────────────────────────────────────────────────────
  // A trust.html?trust=<GIAS group UID> link selects that trust, replacing any
  // trust chosen before (imported files are kept). Otherwise the saved trust is
  // used. The page is shown straight away and the trust's schools fill in.
  (async function init() {
    const settings = loadSettings();
    let linked = null;
    try { linked = new URL(window.location.href).searchParams.get("trust"); } catch (e) { /* ignore */ }
    if (linked != null) linked = linked.trim();
    await source.ready();
    try { app.records = await source.listSnapshots(null); } catch (e) { app.records = []; }
    refreshSchools();
    const uid = linked || settings.trustUid;
    if (!app.records.length && !uid) app.view = "import";
    render();
    lookupImportedNames();
    if (linked != null && !linked) {
      app.trustError = `The link you followed has no trust UID in it.`;
      render();
    } else if (uid && SL && SL.trustSchools) {
      selectTrust(uid, { quiet: true, fromLink: !!linked });
    }
  })();

  // For tests and future sources
  window.TrustApp = { app, source, selectTrust, refresh: async () => { app.records = await source.listSnapshots(null); refreshSchools(); render(); } };
})();

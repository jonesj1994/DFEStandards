// Trust report: a high-level, print-ready overview of every school in the
// trust, for the trust board. Opened from the Trust Overview, which hands over
// the school list (trust-handoff.js); each school's newest assessment is read
// from the trust store, which re-checks every record. Everything shown is escaped.
(function () {
  "use strict";

  const AM = window.AssessmentModel;
  const DFE = AM.framework("dfe");
  const CE = AM.framework("cyber-essentials");
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const YEAR = (typeof STANDARDS_META !== "undefined" && STANDARDS_META.coreDeadlineYear) || 2030;

  const OPTIONS_KEY = "trust_report_options_v1";
  const DEFAULT_OPTIONS = { meeting: "", date: "", author: "", comment: "", detail: true };
  const TEXT_LIMITS = { meeting: 120, date: 10, author: 120, comment: 4000 };

  // Short column headings for the areas-by-school table
  const SHORT_CAT = {
    "broadband": "Broadband", "cloud-solution": "Cloud", "cyber-security": "Cyber security",
    "digital-accessibility": "Accessibility", "digital-leadership": "Leadership", "filtering-monitoring": "Filtering",
    "laptops-desktops-tablets": "Devices", "network-cabling": "Cabling", "network-switching": "Switching",
    "servers-storage": "Servers", "it-support": "IT support", "wireless-network": "Wireless"
  };
  const WORD = { Green: "Met", Amber: "Partly met", Red: "Not met", "Not Set": "Not assessed" };
  const LETTER = { Green: "G", Amber: "A", Red: "R", "Not Set": "–" };

  function fmtDate(iso) {
    const d = AM.parseDate(iso);
    return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  }
  function shortDate(iso) {
    const d = AM.parseDate(iso);
    return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
  }
  function todayIso() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  function monthsAgo(iso) {
    const d = AM.parseDate(iso);
    if (!d) return 0;
    const n = new Date();
    return (n.getFullYear() - d.getUTCFullYear()) * 12 + (n.getMonth() - d.getUTCMonth());
  }
  // "Out of date after" from the Trust Overview's settings (1 to 60 months)
  function staleMonths() {
    try {
      const s = JSON.parse(localStorage.getItem("trust_view_settings_v1") || "{}");
      const m = s && Number(s.staleMonths);
      return m >= 1 && m <= 60 ? Math.round(m) : 12;
    } catch (e) { return 12; }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  function loadOptions() {
    const out = { ...DEFAULT_OPTIONS };
    try {
      const o = JSON.parse(localStorage.getItem(OPTIONS_KEY) || "null");
      if (!o || typeof o !== "object") return out;
      Object.keys(TEXT_LIMITS).forEach(k => { if (typeof o[k] === "string") out[k] = o[k].slice(0, TEXT_LIMITS[k]); });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date)) out.date = "";
      if (typeof o.detail === "boolean") out.detail = o.detail;
    } catch (e) { /* use defaults */ }
    return out;
  }
  function saveOptions() {
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts)); } catch (e) { /* lasts until the page closes */ }
  }

  // ── Model: one row per school ──────────────────────────────────────────────
  // Cyber Essentials is left out while its tracker is "Coming soon" (features.js)
  const CE_ON = !window.Features || window.Features.isLive("ce");

  function schoolRow(s, recs) {
    const get = fw => {
      const r = recs.get(s.keys[fw]);
      return r && r.snapshot.framework === fw ? r.snapshot : null;
    };
    const dfe = get("dfe"), ce = get("cyber-essentials");
    const row = { name: s.name || (dfe && dfe.school.name) || (ce && ce.school.name) || "(no school name)", urn: s.urn, phase: s.phase, dfe, ce };
    if (dfe) {
      const sum = AM.summarise(dfe);
      row.sum = sum;
      row.assessed = (dfe.assessmentDate || dfe.exportedAt || "").slice(0, 10);
      row.notSet = sum.totals.counts["Not Set"] || 0;
      let overdue = 0, soon = 0, have = 0, total = 0;
      STANDARDS_DATA.forEach(c => c.items.forEach(i => {
        const d = dfe.items[i.id];
        const dt = d && AM.dateStatus(d.date, d.dateType, d.status);
        if (dt && dt.state === "overdue") overdue++;
        if (dt && dt.state === "soon") soon++;
        const ev = d && AM.evidenceStatus(i.id, d.evidence);
        if (ev) { have += ev.done; total += ev.total; }
      }));
      Object.assign(row, { overdue, soon, evHave: have, evTotal: total, evPct: pct(have, total) });
    }
    if (ce && CE_ON) row.ceSum = AM.summarise(ce);
    return row;
  }

  function attention(row, stale) {
    const why = [];
    if (!row.dfe) { why.push("No DfE standards assessment"); return why; }
    if (row.sum.filtering && !row.sum.filtering.metNow) why.push("Filtering and monitoring not met");
    if (row.overdue) why.push(plural(row.overdue, "target date", "target dates") + " passed");
    const red = row.sum.totals.counts.Red || 0;
    if (red) why.push(plural(red, "standard") + " rated Red");
    if (row.notSet) why.push(plural(row.notSet, "standard") + " not assessed");
    if (row.assessed && monthsAgo(row.assessed) >= stale) why.push(`Assessment over ${plural(stale, "month")} old`);
    if (row.ceSum) {
      const c = row.ceSum.certification;
      if (c.state === "overdue") why.push("Cyber Essentials certificate expired");
      else if (c.state === "due") why.push("Cyber Essentials renewal due " + shortDate(c.renewalDue));
    }
    return why;
  }

  // ── Page 1: the overview ───────────────────────────────────────────────────
  const tile = (big, label, cls, sub) => `<div class="ov-tile ${cls ? "ov-" + esc(cls) : ""}"><div class="ov-big">${esc(big)}</div><div class="ov-label">${esc(label)}</div>${sub ? `<div class="ov-sub">${esc(sub)}</div>` : ""}</div>`;
  const dfeBar = counts => {
    const total = DFE.statuses.reduce((n, v) => n + (counts[v] || 0), 0);
    return total ? `<div class="bar" aria-hidden="true">${["Green", "Amber", "Red", "Not Set"].filter(v => counts[v]).map(v =>
      `<span class="seg ${DFE.cls(v)}" style="width:${(counts[v] / total * 100).toFixed(2)}%"></span>`).join("")}</div>` : "";
  };
  const pill = v => `<span class="pill ${DFE.cls(v)}">${esc(WORD[v] || v)}</span>`;

  function overview(trust, rows, opts, stale) {
    const N = rows.length;
    const dfe = rows.filter(r => r.dfe);
    const ce = rows.filter(r => r.ceSum);
    const meta = [
      opts.meeting && `Presented to <strong>${esc(opts.meeting)}</strong>`,
      opts.date && `<strong>${esc(fmtDate(opts.date))}</strong>`,
      opts.author && `Prepared by <strong>${esc(opts.author)}</strong>`
    ].filter(Boolean).join(" &middot; ");

    // Key figures
    const avg = dfe.length ? Math.round(dfe.reduce((n, r) => n + r.sum.totals.pct, 0) / dfe.length) : 0;
    const coreAll = dfe.filter(r => r.sum.core.categoriesMet === r.sum.core.categories).length;
    const coreCats = dfe.length ? dfe[0].sum.core.categories : 6;
    const fmMet = dfe.filter(r => r.sum.filtering && r.sum.filtering.metNow).length;
    const overdue = dfe.reduce((n, r) => n + r.overdue, 0);
    const overdueSchools = dfe.filter(r => r.overdue).length;
    const tiles = [
      tile(`${dfe.length} of ${N}`, "schools assessed", dfe.length === N ? "green" : "amber", N > dfe.length ? `${plural(N - dfe.length, "school")} still to send an assessment` : "every school has an assessment"),
      tile(`${avg}%`, "average of standards met", "", dfe.length ? `across ${plural(dfe.length, "assessed school")}` : ""),
      tile(`${coreAll} of ${dfe.length}`, `schools meeting all ${coreCats} core areas`, dfe.length && coreAll === dfe.length ? "green" : "", `DfE expects these by ${YEAR}`),
      tile(`${fmMet} of ${dfe.length}`, "schools meeting filtering and monitoring", dfe.length && fmMet === dfe.length ? "green" : "red", "a safeguarding duty under KCSIE, expected now"),
      tile(overdue ? `${overdue} overdue` : "None overdue", "target dates", overdue ? "red" : "green", overdue ? `in ${plural(overdueSchools, "school")}` : "")
    ];
    if (ce.length) {
      const ready = ce.filter(r => r.ceSum.ready).length;
      const renew = ce.filter(r => ["due", "overdue"].includes(r.ceSum.certification.state)).length;
      tiles.push(tile(`${ready} of ${ce.length}`, "ready for Cyber Essentials", ready === ce.length ? "green" : "amber",
        renew ? `${plural(renew, "certificate")} due for renewal or expired` : `${plural(ce.length, "school")} assessed`));
    }

    // One line per school
    const lines = rows.map(r => {
      if (!r.dfe) return `<li class="ov-row tr-row">
        <span class="ov-name">${esc(r.name)}</span>
        <span class="ov-muted tr-span">No assessment yet</span>
        <span class="ov-end"><span class="pill not-set">None</span></span>
      </li>`;
      const fm = r.sum.filtering;
      return `<li class="ov-row tr-row">
        <span class="ov-name">${esc(r.name)}</span>
        <span class="ov-bar">${dfeBar(r.sum.totals.counts)}</span>
        <span class="ov-count">${r.sum.totals.pct}%</span>
        <span class="ov-count tr-core" title="Core areas fully met">${r.sum.core.categoriesMet}/${r.sum.core.categories}</span>
        <span class="ov-end">${fm ? pill(fm.overall) : ""}</span>
      </li>`;
    }).join("");

    // Weakest areas: share of assessed schools rating the area Red or Amber
    const weak = [];
    if (dfe.length) {
      STANDARDS_DATA.forEach(cat => {
        let red = 0, amber = 0, done = 0, total = 0;
        dfe.forEach(r => {
          const c = r.sum.categories.find(x => x.id === cat.id);
          if (!c || !c.assessed) return;
          if (c.overall === "Red") red++; else if (c.overall === "Amber") amber++;
          done += c.done; total += c.total;
        });
        if (red || amber) weak.push({ cat, red, amber, score: (red * 2 + amber) / dfe.length, met: pct(done, total) });
      });
      weak.sort((a, b) => b.score - a.score || a.met - b.met);
    }
    const weakHtml = weak.length
      ? `<ul class="tr-weak">${weak.slice(0, 5).map(w => `<li>
          <span class="ov-item">${esc(w.cat.title)}${w.cat.isCore ? ' <span class="core">Core</span>' : ""}</span>
          <span class="ov-meta">${w.red ? `${w.red} Red` : ""}${w.red && w.amber ? ", " : ""}${w.amber ? `${w.amber} Amber` : ""} of ${dfe.length} &middot; ${w.met}% of its standards met trust-wide</span>
          <span class="tr-wbar" aria-hidden="true"><span class="r" style="width:${pct(w.red, dfe.length)}%"></span><span class="a" style="width:${pct(w.amber, dfe.length)}%"></span></span>
        </li>`).join("")}</ul>`
      : `<p class="ov-good">${dfe.length ? "No area is rated Red or Amber in any school." : "No assessments yet."}</p>`;

    // Schools needing attention: most reasons first
    const att = rows.map(r => ({ r, why: attention(r, stale) })).filter(x => x.why.length)
      .sort((a, b) => b.why.length - a.why.length || a.r.name.localeCompare(b.r.name, "en-GB"));
    const attHtml = att.length
      ? `<ul class="ov-list tr-att">${att.slice(0, 5).map(x => `<li><span class="ov-item">${esc(x.r.name)}</span>
          <span class="ov-meta">${esc(x.why.join("; "))}</span></li>`).join("")}</ul>
        ${att.length > 5 ? `<p class="ov-more">and ${att.length - 5} more in the results by school</p>` : ""}`
      : '<p class="ov-good">No school needs particular attention.</p>';

    const comment = opts.comment.trim();
    const shortComment = comment.length > 220 ? comment.slice(0, 220).replace(/\s+\S*$/, "") + "… (full text later in this report)" : comment;

    return `<section class="overview" aria-labelledby="ov-title">
      <header class="ov-head">
        <div class="ov-brand"><img src="favicon.svg" alt="" width="22" height="22" /> Report to the trust board</div>
        <h1 id="ov-title">Digital and technology standards</h1>
        <p class="ov-school">${esc(trust || "Our schools")} &middot; ${esc(plural(N, "school"))}</p>
        ${meta ? `<p class="ov-metaline">${meta}</p>` : ""}
      </header>

      <div class="tr-tiles">${tiles.join("")}</div>

      <div class="ov-progress">
        <div class="ov-progress-head">
          <h2>Our schools</h2>
          <span class="ov-total">${avg}% average</span>
        </div>
        <div class="ov-row tr-row tr-head" aria-hidden="true"><span>School</span><span>Results</span><span class="ov-count">Met</span><span class="ov-count">Core</span><span class="ov-end">Filtering</span></div>
        <ul class="ov-rows">${lines}</ul>
        <p class="ov-legend">${["Green", "Amber", "Red"].map(v => `<span><i class="dot ${DFE.cls(v)}"></i>${esc(WORD[v])}</span>`).join("")}<span><i class="dot"></i>Not assessed</span>
          <span class="ov-legend-note">Core: of ${coreCats} core areas fully met &middot; Filtering: filtering and monitoring</span></p>
      </div>

      <div class="ov-bottom">
        <div class="ov-box"><h3>Weakest areas across the trust</h3>${weakHtml}</div>
        <div class="ov-box"><h3>Schools needing attention</h3>${attHtml}</div>
      </div>
      ${comment ? `<div class="ov-box ov-comment"><h3>Commentary</h3><p class="text">${esc(shortComment)}</p></div>` : ""}
    </section>`;
  }

  // ── Page 2: results by school ──────────────────────────────────────────────
  function bySchool(rows, opts, stale) {
    const dfe = rows.filter(r => r.dfe);
    const ce = rows.filter(r => r.ceSum);
    const cats = STANDARDS_DATA;
    const grid = dfe.length ? `<div class="table-wrap"><table class="data-table tr-grid">
        <thead><tr><th scope="col">School</th>${cats.map(c => `<th scope="col" title="${esc(c.title)}"><span class="tr-vert">${esc(SHORT_CAT[c.id] || c.title)}${c.isCore ? '<span class="tr-star" aria-label="core"> &#9733;</span>' : ""}</span></th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr><th scope="row">${esc(r.name)}</th>${cats.map(cat => {
          if (!r.dfe) return '<td class="tr-cell"><span class="tr-sq none" title="No assessment">&middot;</span></td>';
          const c = r.sum.categories.find(x => x.id === cat.id);
          const v = c ? c.overall : "Not Set";
          return `<td class="tr-cell"><span class="tr-sq ${DFE.cls(v)}" title="${esc(cat.title)}: ${esc(WORD[v])}">${esc(LETTER[v])}</span></td>`;
        }).join("")}</tr>`).join("")}</tbody>
      </table></div>
      <p class="muted">Each square is the area's overall rating: its lowest-rated standard. G Green (met), A Amber (partly met), R Red (not met), &ndash; not assessed. &#9733; core standard area, expected by ${YEAR}.</p>` : "";

    const table = `<div class="table-wrap"><table class="data-table tr-table">
        <thead><tr><th scope="col">School</th><th scope="col">Assessed</th><th scope="col">Met</th><th scope="col">Core areas</th><th scope="col">Filtering</th><th scope="col">Target dates</th><th scope="col">Evidence</th>${ce.length ? '<th scope="col">Cyber Essentials</th>' : ""}</tr></thead>
        <tbody>${rows.map(r => {
          const cecell = !ce.length ? "" : `<td>${r.ceSum ? `${r.ceSum.totals.pct}%${r.ceSum.ready ? " ready" : ""}${r.ceSum.certification.state === "overdue" ? '<div class="date-note overdue">Certificate expired</div>' : r.ceSum.certification.state === "due" ? `<div class="date-note soon">Renew by ${esc(shortDate(r.ceSum.certification.renewalDue))}</div>` : ""}` : '<span class="missing">None</span>'}</td>`;
          if (!r.dfe) return `<tr><td>${esc(r.name)}${r.phase ? `<span class="area">${esc(r.phase)}</span>` : ""}</td><td colspan="6"><span class="missing">No DfE standards assessment yet</span></td>${cecell}</tr>`;
          const fm = r.sum.filtering;
          const old = r.assessed && monthsAgo(r.assessed) >= stale;
          return `<tr>
            <td>${esc(r.name)}${r.phase ? `<span class="area">${esc(r.phase)}</span>` : ""}</td>
            <td class="nowrap">${esc(shortDate(r.assessed)) || '<span class="missing">Unknown</span>'}${old ? '<div class="date-note overdue">Out of date</div>' : ""}</td>
            <td class="num">${r.sum.totals.done} of ${r.sum.totals.items}<div class="muted">${r.sum.totals.pct}%${r.notSet ? `, ${r.notSet} not assessed` : ""}</div></td>
            <td class="num">${r.sum.core.categoriesMet} of ${r.sum.core.categories}</td>
            <td>${fm ? pill(fm.overall) : ""}</td>
            <td>${r.overdue ? `<span class="date-note overdue">${esc(plural(r.overdue, "overdue"))}</span>` : ""}${r.soon ? `<div class="date-note soon">${r.soon} within 30 days</div>` : ""}${!r.overdue && !r.soon ? '<span class="muted">On track</span>' : ""}</td>
            <td class="num">${r.evTotal ? `${r.evPct}%` : "–"}</td>
            ${cecell}
          </tr>`;
        }).join("")}</tbody>
      </table></div>`;

    const comment = opts.comment.trim();
    return `<section class="section page-break" aria-labelledby="h-areas">
        <h2 id="h-areas">1. Standard areas by school</h2>
        ${grid || '<p class="muted">No DfE standards assessments yet.</p>'}
      </section>
      <section class="section" aria-labelledby="h-schools">
        <h2 id="h-schools">2. Results by school</h2>
        <p class="intro">From each school's newest assessment in the Trust Overview. Evidence is the share of the evidence checklist ticked across all the standards.</p>
        ${table}
      </section>
      ${comment.length > 220 ? `<section class="section keep-together" aria-labelledby="h-comment"><h2 id="h-comment">3. Commentary</h2><div class="commentary"><p class="text">${esc(comment)}</p></div></section>` : ""}`;
  }

  function about(rows, opts) {
    const dates = rows.filter(r => r.assessed).map(r => r.assessed).sort();
    const facts = [
      ["Schools", String(rows.length)],
      ["Assessments dated", dates.length ? (dates[0] === dates[dates.length - 1] ? fmtDate(dates[0]) : `${fmtDate(dates[0])} to ${fmtDate(dates[dates.length - 1])}`) : ""],
      ["Presented to", opts.meeting], ["Meeting date", fmtDate(opts.date)], ["Report prepared by", opts.author],
      ["Report produced", fmtDate(todayIso())],
      ["Standards version", STANDARDS_META.lastUpdated ? `GOV.UK guidance last updated ${fmtDate(STANDARDS_META.lastUpdated)}` : ""]
    ].filter(r => r[1]);
    return `<section class="section about keep-together" aria-labelledby="h-about">
      <h2 id="h-about">About this report</h2>
      <div class="rounded-box"><table class="meta-table"><tbody>${facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
      <p class="muted">Made from each school's own self-assessment against the DfE's <em>Meeting digital and technology standards in schools and colleges</em> (${esc(STANDARDS_INDEX_URL)}), using the School Compliance Toolkit. It is not an official DfE assessment. Each school's full governors' report can be made from the Trust Overview.</p>
    </section>`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  let opts = loadOptions();
  let data = null;   // { trust, rows } once loaded

  function render() {
    const root = $("report");
    if (!data) { root.innerHTML = '<p class="empty">Loading the trust\'s schools&hellip;</p>'; return; }
    if (!data.rows.length) {
      document.title = "Trust report";
      root.innerHTML = `<div class="empty">
        <h1>No schools to report on</h1>
        <p>Open the Trust Overview, import your schools' files, then select <strong>Trust report</strong> again.</p>
        <p><a href="trust.html">Open the Trust Overview</a></p>
      </div>`;
      return;
    }
    document.title = `${data.trust || "Trust"} - Digital and technology standards trust report`;
    const stale = staleMonths();
    const parts = [overview(data.trust, data.rows, opts, stale)];
    if (opts.detail) parts.push(bySchool(data.rows, opts, stale));
    else if (opts.comment.trim().length > 220) parts.push(`<section class="section keep-together"><h2>Commentary</h2><div class="commentary"><p class="text">${esc(opts.comment.trim())}</p></div></section>`);
    parts.push(about(data.rows, opts));
    root.innerHTML = parts.join("");
  }

  function bindOptions() {
    const fields = { meeting: "opt-meeting", date: "opt-date", author: "opt-author", comment: "opt-comment" };
    Object.entries(fields).forEach(([k, id]) => {
      const el = $(id);
      el.value = opts[k];
      el.addEventListener("input", () => {
        opts[k] = el.value.slice(0, TEXT_LIMITS[k]);
        if (k === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) opts.date = "";
        saveOptions();
        render();
      });
    });
    const d = $("opt-detail");
    d.checked = opts.detail;
    d.addEventListener("change", () => { opts.detail = d.checked; saveOptions(); render(); });
  }

  async function load() {
    const payload = TrustHandoff.load();
    let rows = [];
    if (payload) {
      const recs = await TrustHandoff.records(payload);
      rows = payload.schools.map(s => schoolRow(s, recs));
    }
    data = { trust: payload ? payload.trust : "", rows };
    render();
  }

  $("btn-print").addEventListener("click", () => window.print());
  bindOptions();
  render();
  load();
})();

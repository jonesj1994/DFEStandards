// Governors' report: a print-ready summary of one tracker's saved answers.
// Open as report.html?f=dfe (DfE standards) or report.html?f=ce (Cyber Essentials).
// Reads the tracker's saved state through AssessmentModel.fromTrackerState, which
// keeps only known items, valid statuses and plain text. Everything shown is escaped.
(function () {
  "use strict";

  const AM = window.AssessmentModel;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const FW = new URLSearchParams(location.search).get("f") === "ce" ? "cyber-essentials" : "dfe";
  const IS_DFE = FW === "dfe";
  const F = AM.framework(FW);
  const STATE_KEY = IS_DFE ? "dfe_tracker_v1" : "ce_tracker_v1";
  const TRACKER_PAGE = IS_DFE ? "dfe.html" : "ce.html";
  const OPTIONS_KEY = "report_options_v1";

  const TITLE = IS_DFE ? "Digital and technology standards" : "Cyber Essentials readiness";

  // What each status means, in the words governors will see
  const LABELS = IS_DFE
    ? { Red: "Red: not met", Amber: "Amber: partly met", Green: "Green: met", "Not Set": "Not assessed" }
    : { "Not Met": "Not met", "Partially Met": "Partly met", Met: "Met", "N/A": "Not applicable", "Not Set": "Not assessed" };
  const KEY = IS_DFE
    ? [
      ["Green", "The standard is fully met."],
      ["Amber", "Some provision is in place, or work to meet the standard is planned or in progress."],
      ["Red", "No provision is in place, or there are significant gaps."],
      ["Not Set", "Not yet assessed."]
    ]
    : [
      ["Met", "The requirement is met and there is evidence for it."],
      ["Partially Met", "Some of the requirement is in place; more work is needed before certification."],
      ["Not Met", "The requirement is not in place."],
      ["N/A", "The requirement does not apply to this school's setup."],
      ["Not Set", "Not yet assessed."]
    ];
  // Order statuses are shown in: best first
  const ORDER = IS_DFE ? ["Green", "Amber", "Red", "Not Set"] : ["Met", "N/A", "Partially Met", "Not Met", "Not Set"];

  const pill = v => `<span class="pill ${F.cls(v)}">${esc(LABELS[v] || v)}</span>`;

  function fmtDate(iso) {
    const d = AM.parseDate(iso);
    return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  }
  function todayIso() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;

  // ── Saved tracker state and report settings ────────────────────────────────
  function loadTracker() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && typeof s === "object" ? s : null;
    } catch (e) { return null; }
  }

  const DEFAULT_OPTIONS = { meeting: "", date: "", author: "", comment: "", detail: true, green: true };
  const TEXT_LIMITS = { meeting: 120, date: 10, author: 120, comment: 4000 };

  function loadOptions() {
    const out = { ...DEFAULT_OPTIONS };
    try {
      const all = JSON.parse(localStorage.getItem(OPTIONS_KEY) || "null");
      const o = all && typeof all === "object" && Object.prototype.hasOwnProperty.call(all, FW) ? all[FW] : null;
      if (!o || typeof o !== "object") return out;
      Object.keys(TEXT_LIMITS).forEach(k => { if (typeof o[k] === "string") out[k] = o[k].slice(0, TEXT_LIMITS[k]); });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date)) out.date = "";
      ["detail", "green"].forEach(k => { if (typeof o[k] === "boolean") out[k] = o[k]; });
    } catch (e) { /* use defaults */ }
    return out;
  }

  function saveOptions(opts) {
    try {
      let all = JSON.parse(localStorage.getItem(OPTIONS_KEY) || "null");
      if (!all || typeof all !== "object" || Array.isArray(all)) all = {};
      const clean = {};
      if (Object.prototype.hasOwnProperty.call(all, "dfe")) clean.dfe = all.dfe;
      if (Object.prototype.hasOwnProperty.call(all, "cyber-essentials")) clean["cyber-essentials"] = all["cyber-essentials"];
      clean[FW] = opts;
      localStorage.setItem(OPTIONS_KEY, JSON.stringify(clean));
    } catch (e) { /* storage unavailable: settings last until the page closes */ }
  }

  // ── Report sections ────────────────────────────────────────────────────────
  function detailsTable(snap, opts) {
    const s = snap.school;
    const rows = [
      ["School", s.name || "Not entered"],
      ["URN", s.urn],
      ["DfE number", s.dfeNumber],
      ["Trust", s.trust],
      ["Presented to", opts.meeting],
      ["Meeting date", fmtDate(opts.date)],
      ["Report prepared by", opts.author || snap.assessor],
      ["Assessment completed by", snap.assessor],
      ["Assessment date", fmtDate(snap.assessmentDate) || snap.assessmentDate],
      ["Report produced", fmtDate(todayIso())],
      [IS_DFE ? "Standards version" : "Requirements version",
        IS_DFE ? (STANDARDS_META.lastUpdated ? `GOV.UK guidance last updated ${fmtDate(STANDARDS_META.lastUpdated)}` : "") : CE_VERSION]
    ].filter(r => r[1]);
    return `<table class="meta-table"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`;
  }

  function countChips(counts) {
    return `<ul class="chips">${ORDER.filter(v => counts[v]).map(v =>
      `<li>${pill(v)} <strong>${counts[v]}</strong></li>`).join("")}</ul>`;
  }

  function summarySection(snap, sum, opts) {
    const t = sum.totals;
    const notSet = t.counts["Not Set"] || 0;
    const open = F.open.reduce((n, v) => n + (t.counts[v] || 0), 0);
    const cards = [];
    let bullets = [];

    if (IS_DFE) {
      const core = sum.core, fm = sum.filtering;
      const y = STANDARDS_META.coreDeadlineYear || 2030;
      cards.push(statCard(`${t.done} of ${t.items}`, "standards met", `${t.pct}%`));
      cards.push(statCard(`${core.categoriesMet} of ${core.categories}`, "core standard areas fully met", `${core.pct}% of core standards`));
      const word = { Green: "Met", Amber: "Partly met", Red: "Not met", "Not Set": "Not assessed" };
      if (fm) cards.push(statCard(word[fm.overall], "filtering and monitoring (core)", `${fm.done} of ${fm.total} standards met`, fm.cls));
      bullets.push(`DfE expects schools and colleges to be working towards meeting the ${core.categories} core standards by ${y}. Some standards, including filtering and monitoring, should already be met.`);
      if (fm && !fm.metNow) {
        bullets.push("Filtering and monitoring is not yet fully met. Schools have a statutory duty under Keeping children safe in education (KCSIE) to have appropriate filtering and monitoring in place, so governors may want to prioritise this.");
      }
      const cyber = sum.categories.find(c => c.id === "cyber-security");
      if (cyber && !F.done.includes(cyber.overall)) {
        bullets.push("The cyber security core standard is not yet fully met. GOV.UK links these standards to the KCSIE duty to have appropriate cyber security measures.");
      }
    } else {
      const cert = sum.certification;
      cards.push(statCard(`${t.done} of ${t.items}`, "requirements met or not applicable", `${t.pct}%`));
      cards.push(sum.ready
        ? statCard("Ready", "to apply for certification", "every requirement is met", "green")
        : statCard("Not yet ready", "to apply for certification", plural(open + notSet, "requirement") + " still to do", "amber"));
      cards.push(certCard(cert));
      bullets.push("Cyber Essentials is the government-backed certification for protection against common cyber attacks. Certification lasts 12 months.");
    }

    if (open) bullets.push(`${plural(open, IS_DFE ? "standard is" : "requirement is", IS_DFE ? "standards are" : "requirements are")} not yet fully met. These are listed under Priority actions.`);
    if (IS_DFE) {
      const overdue = datedItems(snap).filter(x => x.dt.state === "overdue").length;
      if (overdue) bullets.push(`<strong>${plural(overdue, "target date has", "target dates have")} passed.</strong> These are listed under Working towards.`);
    }
    if (notSet) bullets.push(`<strong>${plural(notSet, IS_DFE ? "standard has" : "requirement has", IS_DFE ? "standards have" : "requirements have")} not been assessed yet</strong>, so this report is incomplete.`);

    return `<section class="section keep-together" aria-labelledby="h-summary">
      <h2 id="h-summary">${num()}. Summary</h2>
      ${countChips(t.counts)}
      <ul class="bullets">${bullets.map(b => `<li>${b}</li>`).join("")}</ul>
      ${opts.comment.trim() ? `<div class="commentary"><h3>Commentary</h3><p class="text">${esc(opts.comment.trim())}</p></div>` : ""}
    </section>`;
  }

  // ── Page 1: At a glance ────────────────────────────────────────────────────
  // A one-page overview for governors, styled like the "Your progress"
  // picture on the home page. Always printed on its own page.
  function overviewPage(snap, sum, opts) {
    const t = sum.totals;
    const meta = [
      opts.meeting && `Presented to <strong>${esc(opts.meeting)}</strong>`,
      opts.date && `<strong>${esc(fmtDate(opts.date))}</strong>`,
      (opts.author || snap.assessor) && `Prepared by <strong>${esc(opts.author || snap.assessor)}</strong>`
    ].filter(Boolean).join(" &middot; ");

    // Progress card: one row per area, a bar of its results, and a tick or
    // the area's overall rating
    const rows = sum.categories.map(c => {
      const done = c.assessed && F.done.includes(c.overall);
      const end = !c.assessed ? '<span class="ov-muted">guidance only</span>'
        : done ? '<span class="ov-tick" title="Fully met" aria-label="Fully met">&#10003;</span>'
        : shortPill(c.overall);
      return `<li class="ov-row">
        <span class="ov-name">${esc(c.title)}${c.isCore ? ' <span class="core">Core</span>' : ""}</span>
        <span class="ov-bar">${bar(c.counts, c.total)}</span>
        <span class="ov-count">${c.done}/${c.total}</span>
        <span class="ov-end">${end}</span>
      </li>`;
    }).join("");

    // Key figures
    const tiles = [];
    const tile = (big, label, cls, sub) => `<div class="ov-tile ${cls ? "ov-" + esc(cls) : ""}"><div class="ov-big">${esc(big)}</div><div class="ov-label">${esc(label)}</div>${sub ? `<div class="ov-sub">${esc(sub)}</div>` : ""}</div>`;
    if (IS_DFE) {
      const core = sum.core, fm = sum.filtering;
      const word = { Green: "Met", Amber: "Partly met", Red: "Not met", "Not Set": "Not assessed" };
      tiles.push(tile(`${core.categoriesMet} of ${core.categories}`, "core standard areas fully met", core.categoriesMet === core.categories ? "green" : "", `DfE expects these by ${STANDARDS_META.coreDeadlineYear || 2030}`));
      if (fm) tiles.push(tile(word[fm.overall], "filtering and monitoring", fm.cls, "a safeguarding duty under KCSIE"));
      const d = datedItems(snap).filter(x => x.dt.state !== "done");
      const over = d.filter(x => x.dt.state === "overdue").length, soon = d.filter(x => x.dt.state === "soon").length;
      tiles.push(d.length
        ? tile(over ? `${over} overdue` : soon ? `${soon} due soon` : "On track", "target and review dates", over ? "red" : soon ? "amber" : "green",
          `${plural(d.length, "date")} set${over && soon ? `, ${soon} due within 30 days` : ""}`)
        : tile("None set", "target and review dates", "", "add dates in the tracker"));
    } else {
      const cert = sum.certification;
      const open = F.open.reduce((n, v) => n + (t.counts[v] || 0), 0) + (t.counts["Not Set"] || 0);
      tiles.push(sum.ready ? tile("Ready", "to apply for certification", "green") : tile("Not yet ready", "to apply for certification", "amber", plural(open, "requirement") + " still to do"));
      if (!cert || cert.state === "none") tiles.push(tile("None recorded", "Cyber Essentials certificate", ""));
      else if (cert.state === "overdue") tiles.push(tile("Expired", cert.level || "Cyber Essentials", "red", `renewal was due ${fmtDate(cert.renewalDue)}`));
      else if (cert.state === "due") tiles.push(tile("Renew soon", cert.level || "Cyber Essentials", "amber", `due ${fmtDate(cert.renewalDue)}`));
      else tiles.push(tile("Certified", cert.level || "Cyber Essentials", "green", `renewal due ${fmtDate(cert.renewalDue)}`));
    }
    const notSet = t.counts["Not Set"] || 0;

    // Top priorities and what's coming up
    const top = priorityItems(sum).slice(0, 3);
    const prio = top.length
      ? `<ol class="ov-list">${top.map(o => {
          const dt = IS_DFE ? AM.dateStatus(o.date, o.dateType, o.status) : null;
          return `<li>${shortPill(o.status)} <span class="ov-item">${esc(o.itemTitle)}</span>
            <span class="ov-meta">${esc(o.categoryTitle)}${o.owner.trim() ? " &middot; " + esc(o.owner.trim()) : ""}${dt ? " &middot; " + esc(DATE_TYPE[dt.type]) + " " + esc(fmtDate(dt.date)) : ""}</span></li>`;
        }).join("")}</ol>${priorityItems(sum).length > 3 ? `<p class="ov-more">and ${priorityItems(sum).length - 3} more under Priority actions</p>` : ""}`
      : `<p class="ov-good">Nothing is rated ${IS_DFE ? "Red or Amber" : "Not met or Partly met"}.</p>`;
    let upcoming = "";
    if (IS_DFE) {
      const next = datedItems(snap).filter(x => x.dt.state !== "done").slice(0, 3);
      upcoming = `<div class="ov-box">
        <h3>Coming up</h3>
        ${next.length ? `<ul class="ov-list ov-dates">${next.map(x => `<li><span class="ov-date ${esc(x.dt.state)}">${esc(fmtDate(x.dt.date))}</span>
          <span class="ov-item">${esc(x.item.title)}</span>
          <span class="ov-meta">${esc(DATE_TYPE[x.dt.type])}${x.dt.state === "overdue" ? " &middot; overdue" : x.dt.state === "soon" ? " &middot; within 30 days" : ""}</span></li>`).join("")}</ul>`
          : '<p class="ov-muted">No target or review dates set yet.</p>'}
      </div>`;
    }

    return `<section class="overview" aria-labelledby="ov-title">
      <header class="ov-head">
        <div class="ov-brand"><img src="favicon.svg" alt="" width="22" height="22" /> Report to governors</div>
        <h1 id="ov-title">${esc(TITLE)}</h1>
        <p class="ov-school">${esc(snap.school.name || "School name not entered")}</p>
        ${meta ? `<p class="ov-metaline">${meta}</p>` : ""}
      </header>

      <div class="ov-grid">
        <div class="ov-progress">
          <div class="ov-progress-head">
            <h2>Your progress</h2>
            <span class="ov-total">${t.done} of ${t.items} ${IS_DFE ? "met" : "met or N/A"}</span>
          </div>
          <div class="ov-pct" aria-hidden="true"><span style="width:${t.pct}%"></span></div>
          <ul class="ov-rows">${rows}</ul>
          <p class="ov-legend">${ORDER.filter(v => v !== "Not Set").map(v => `<span><i class="dot ${F.cls(v)}"></i>${esc(SHORT[v] || v)}</span>`).join("")}<span class="ov-legend-note">Full results follow on the next pages</span></p>
          ${notSet ? `<p class="ov-warn">${plural(notSet, IS_DFE ? "standard is" : "requirement is", IS_DFE ? "standards are" : "requirements are")} not assessed yet, so this picture is incomplete.</p>` : ""}
        </div>
        <div class="ov-tiles">${tiles.join("")}
          ${opts.comment.trim() ? `<div class="ov-box ov-comment"><h3>Commentary</h3><p class="text">${esc(shortComment(opts.comment.trim()))}</p></div>` : ""}
        </div>
      </div>

      <div class="ov-bottom${upcoming ? "" : " ov-single"}">
        <div class="ov-box">
          <h3>Top priorities</h3>
          ${prio}
        </div>
        ${upcoming}
      </div>


    </section>`;
  }

  // Shorter status words for the overview page, where space is tight
  const SHORT = IS_DFE
    ? { Red: "Not met", Amber: "Partly met", Green: "Met", "Not Set": "Not assessed" }
    : { "Not Met": "Not met", "Partially Met": "Partly met", Met: "Met", "N/A": "N/A", "Not Set": "Not assessed" };
  const shortPill = v => `<span class="pill ${F.cls(v)}">${esc(SHORT[v] || v)}</span>`;

  // Page 1 has room for a short commentary; the full text is in the Summary
  const COMMENT_MAX = 260;
  function shortComment(t) {
    if (t.length <= COMMENT_MAX) return t;
    const cut = t.slice(0, COMMENT_MAX).replace(/\s+\S*$/, "");
    return cut + "\u2026 (the full commentary is in the Summary)";
  }

  function statCard(big, label, sub, cls) {
    return `<div class="stat ${cls ? "stat-" + esc(cls) : ""}"><div class="stat-big">${esc(big)}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ""}</div>`;
  }

  function certCard(cert) {
    if (!cert || cert.state === "none") return statCard("None recorded", "Cyber Essentials certificate", "");
    const level = cert.level || "Cyber Essentials";
    const due = fmtDate(cert.renewalDue) + (cert.estimated ? " (estimated)" : "");
    if (cert.state === "overdue") return statCard("Expired", level, `renewal was due ${due}`, "red");
    if (cert.state === "due") return statCard("Renewal due soon", level, `due ${due} (${plural(cert.daysLeft, "day")})`, "amber");
    return statCard("Certified", level, `renewal due ${due}`, "green");
  }

  function bar(counts, total) {
    if (!total) return "";
    return `<div class="bar" aria-hidden="true">${ORDER.filter(v => counts[v]).map(v =>
      `<span class="seg ${F.cls(v)}" style="width:${(counts[v] / total * 100).toFixed(2)}%"></span>`).join("")}</div>`;
  }

  function areasSection(sum) {
    const rows = sum.categories.map(c => `<tr>
        <td>${esc(c.title)}${c.isCore ? ' <span class="core">Core</span>' : ""}${c.assessed ? "" : ' <span class="muted">(guidance only)</span>'}</td>
        <td>${c.assessed ? pill(c.overall) : '<span class="muted">Not assessed</span>'}</td>
        <td class="num">${c.done} of ${c.total}</td>
        <td class="bar-cell">${bar(c.counts, c.total)}</td>
      </tr>`).join("");
    return `<section class="section keep-together" aria-labelledby="h-areas">
      <h2 id="h-areas">${num()}. Results by ${IS_DFE ? "standard area" : "control area"}</h2>
      <p class="intro">${IS_DFE ? "Each area takes its lowest rating, so an area is only Green when every standard in it is Green." : "Each area takes its lowest result, so an area is only Met when every requirement in it is met or not applicable."}</p>
      <div class="table-wrap"><table class="data-table areas">
        <thead><tr><th scope="col">${IS_DFE ? "Standard area" : "Control area"}</th><th scope="col">Overall</th><th scope="col">${IS_DFE ? "Met" : "Met or N/A"}</th><th scope="col">Progress</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  }

  // Outstanding items in priority order: worst rating first, then core
  // standards, then area order
  function priorityItems(sum) {
    const assessed = new Set(sum.categories.filter(c => c.assessed).map(c => c.id));
    const catOrder = new Map(sum.categories.map((c, i) => [c.id, i]));
    return sum.outstanding.filter(o => assessed.has(o.categoryId)).sort((a, b) =>
      (b.severity - a.severity) || (Number(b.isCore) - Number(a.isCore)) || (catOrder.get(a.categoryId) - catOrder.get(b.categoryId)));
  }

  function actionsSection(sum) {
    const items = priorityItems(sum);
    let body;
    if (!items.length) {
      body = `<p class="good">There are no ${IS_DFE ? "standards rated Red or Amber" : "requirements marked Not met or Partly met"}.</p>`;
    } else {
      body = `<div class="table-wrap"><table class="data-table actions">
        <thead><tr><th scope="col">${IS_DFE ? "Standard" : "Requirement"}</th><th scope="col">Rating</th><th scope="col">${IS_DFE ? "Recommendation" : "Action needed"}</th><th scope="col">Owner</th>${IS_DFE ? '<th scope="col">Target</th>' : ""}</tr></thead>
        <tbody>${items.map(o => `<tr>
          <td><span class="area">${esc(o.categoryTitle)}${o.isCore ? " (core)" : ""}</span>${esc(o.itemTitle)}
            ${o.notes.trim() ? `<div class="sub"><span class="sub-label">Current position:</span> <span class="text">${esc(o.notes.trim())}</span></div>` : ""}</td>
          <td>${pill(o.status)}</td>
          <td class="text">${o.actions.trim() ? esc(o.actions.trim()) : '<span class="missing">None recorded</span>'}</td>
          <td class="text">${o.owner.trim() ? esc(o.owner.trim()) : '<span class="missing">Not assigned</span>'}</td>
          ${IS_DFE ? `<td>${dateCell(AM.dateStatus(o.date, o.dateType, o.status))}</td>` : ""}
        </tr>`).join("")}</tbody>
      </table></div>`;
    }
    return `<section class="section" aria-labelledby="h-actions">
      <h2 id="h-actions">${num()}. Priority actions</h2>
      <p class="intro">${IS_DFE ? "Standards rated Red, then Amber, with core standards first." : "Requirements not met, then partly met."}</p>
      ${body}
    </section>`;
  }

  function detailSection(snap, sum, opts) {
    const cats = (IS_DFE ? STANDARDS_DATA : CE_DATA);
    const blocks = cats.map(cat => {
      const c = sum.categories.find(x => x.id === cat.id);
      const shown = cat.items.filter(i => opts.green || !F.done.includes(snap.items[i.id].status));
      const hidden = cat.items.length - shown.length;
      const list = shown.map(i => {
        const d = snap.items[i.id];
        const fields = [
          [IS_DFE ? "Current position" : "Evidence", d.notes],
          [IS_DFE ? "Recommendation" : "Action needed", d.actions],
          ["Owner", d.owner]
        ].filter(([, v]) => v.trim());
        const dt = IS_DFE ? itemDate(d) : null;
        if (dt) fields.push([DATE_TYPE[dt.type], fmtDate(dt.date) + (dt.state === "overdue" ? " (overdue)" : "")]);
        return `<li class="item">
          <div class="item-head"><span class="item-title">${esc(i.title)}</span>${pill(d.status)}</div>
          ${fields.map(([k, v]) => `<div class="sub"><span class="sub-label">${esc(k)}:</span> <span class="text">${esc(v.trim())}</span></div>`).join("")}
        </li>`;
      }).join("");
      return `<div class="area-block">
        <h3>${esc(cat.title)}${c.isCore ? ' <span class="core">Core</span>' : ""} ${c.assessed ? pill(c.overall) : '<span class="muted">(guidance only, not assessed)</span>'}</h3>
        ${list ? `<ul class="items">${list}</ul>` : ""}
        ${hidden ? `<p class="muted">${plural(hidden, IS_DFE ? "standard" : "requirement")} met and not listed.</p>` : ""}
      </div>`;
    }).join("");
    return `<section class="section page-break" aria-labelledby="h-detail">
      <h2 id="h-detail">${num()}. Full results</h2>
      ${blocks}
    </section>`;
  }

  function aboutSection(snap, opts) {
    const n = num();
    const sources = IS_DFE
      ? [["Meeting digital and technology standards in schools and colleges (GOV.UK)", STANDARDS_INDEX_URL]]
      : [["Cyber Essentials requirements (NCSC): " + CE_VERSION, CE_SOURCE_URL], ["Cyber Essentials overview (NCSC)", CE_OVERVIEW_URL]];
    return `<section class="section about keep-together" aria-labelledby="h-about">
      <h2 id="h-about">${n}. About this report</h2>
      <h3>Report details</h3>
      <div class="rounded-box">${detailsTable(snap, opts)}</div>
      <h3>Rating key</h3>
      <div class="rounded-box"><table class="key-table"><tbody>${KEY.map(([v, m]) => `<tr><td>${pill(v)}</td><td>${esc(m)}</td></tr>`).join("")}</tbody></table></div>
      <h3>Sources</h3>
      <ul class="sources">${sources.map(([t, u]) => `<li>${esc(t)}<br /><span class="url">${esc(u)}</span></li>`).join("")}</ul>
      <p class="muted">This is the school's own self-assessment, made with the School Compliance Toolkit. It is not an official DfE or NCSC assessment${IS_DFE ? "" : " or certification"}.</p>
    </section>`;
  }

  // Section numbers, in the order sections are built
  let sectionNo = 0;
  const num = () => ++sectionNo;

  // ── Target dates (DfE only) ────────────────────────────────────────────────
  const DATE_TYPE = { complete: "Complete by", review: "Next review" };
  const DATE_STATE = { overdue: "Overdue", soon: "Due within 30 days", ok: "On track", done: "Done" };
  const itemDate = d => AM.dateStatus(d.date, d.dateType, d.status);
  const dateCell = dt => dt
    ? `<span class="nowrap">${esc(fmtDate(dt.date))}</span><div class="date-note ${esc(dt.state)}">${esc(DATE_TYPE[dt.type])}${dt.state === "overdue" || dt.state === "soon" ? " · " + esc(DATE_STATE[dt.state]) : ""}</div>`
    : '<span class="missing">No date</span>';

  function datedItems(snap) {
    const out = [];
    STANDARDS_DATA.forEach(cat => cat.items.forEach(item => {
      const d = snap.items[item.id];
      const dt = d && itemDate(d);
      if (dt) out.push({ cat, item, d, dt });
    }));
    return out.sort((a, b) => a.dt.date.localeCompare(b.dt.date));
  }

  function planSection(snap) {
    const all = datedItems(snap).filter(x => x.dt.state !== "done");
    const open = Object.values(snap.items).filter(d => d.status === "Red" || d.status === "Amber");
    const noDate = open.filter(d => !itemDate(d)).length;
    const count = st => all.filter(x => x.dt.state === st).length;
    const body = all.length
      ? `<div class="table-wrap"><table class="data-table plan">
          <thead><tr><th scope="col">Date</th><th scope="col">Standard</th><th scope="col">Rating</th><th scope="col">Owner</th></tr></thead>
          <tbody>${all.map(x => `<tr>
            <td>${dateCell(x.dt)}</td>
            <td><span class="area">${esc(x.cat.title)}${x.cat.isCore ? " (core)" : ""}</span>${esc(x.item.title)}</td>
            <td>${pill(x.d.status)}</td>
            <td class="text">${x.d.owner.trim() ? esc(x.d.owner.trim()) : '<span class="missing">Not assigned</span>'}</td>
          </tr>`).join("")}</tbody>
        </table></div>`
      : `<p class="muted">No target or review dates have been set in the tracker.</p>`;
    const facts = [];
    if (count("overdue")) facts.push(`<strong>${plural(count("overdue"), "date has", "dates have")} passed</strong> without the standard being met or reviewed.`);
    if (count("soon")) facts.push(`${plural(count("soon"), "date falls", "dates fall")} in the next 30 days.`);
    if (noDate) facts.push(`${plural(noDate, "standard rated Red or Amber has", "standards rated Red or Amber have")} no target date yet.`);
    return `<section class="section keep-together" aria-labelledby="h-plan">
      <h2 id="h-plan">${num()}. Working towards</h2>
      <p class="intro">Target dates set by the school: <strong>Complete by</strong> for standards still being worked on, and <strong>Next review</strong> for standards already met. Earliest first.</p>
      ${facts.length ? `<ul class="bullets plan-facts">${facts.map(f => `<li>${f}</li>`).join("")}</ul>` : ""}
      ${body}
    </section>`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  let opts = loadOptions();

  function render() {
    const root = $("report");
    const state = loadTracker();
    if (!state) {
      document.title = `${TITLE}: governors' report`;
      root.innerHTML = `<div class="empty">
        <h1>No assessment to report on yet</h1>
        <p>There is no ${esc(F.shortLabel)} assessment saved in this browser. Complete the tracker (or import your Excel file into it), then create the report again.</p>
        <p><a href="${TRACKER_PAGE}">Open the ${esc(F.shortLabel)} tracker</a></p>
      </div>`;
      return;
    }
    const snap = AM.fromTrackerState(FW, state);
    const sum = AM.summarise(snap);
    const school = snap.school.name || "School";
    // Used as the suggested file name when saving as PDF
    document.title = `${school} - ${TITLE} governors' report`;

    sectionNo = 0;
    const parts = [
      overviewPage(snap, sum, opts),
      summarySection(snap, sum, opts),
      areasSection(sum),
      actionsSection(sum)
    ];
    if (IS_DFE) parts.push(planSection(snap));
    if (opts.detail) parts.push(detailSection(snap, sum, opts));
    parts.push(aboutSection(snap, opts));
    root.innerHTML = parts.join("");
  }

  // ── Settings panel ─────────────────────────────────────────────────────────
  function bindOptions() {
    const fields = { meeting: "opt-meeting", date: "opt-date", author: "opt-author", comment: "opt-comment" };
    Object.entries(fields).forEach(([k, id]) => {
      const el = $(id);
      el.value = opts[k];
      el.addEventListener("input", () => {
        opts[k] = el.value.slice(0, TEXT_LIMITS[k]);
        if (k === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) opts.date = "";
        saveOptions(opts);
        render();
      });
    });
    [["detail", "opt-detail"], ["green", "opt-green"]].forEach(([k, id]) => {
      const el = $(id);
      el.checked = opts[k];
      el.addEventListener("change", () => {
        opts[k] = el.checked;
        $("opt-green").disabled = !opts.detail;
        saveOptions(opts);
        render();
      });
    });
    $("opt-green").disabled = !opts.detail;
    $("opt-author").placeholder = "Defaults to the person who completed the assessment";
  }

  $("back-link").href = TRACKER_PAGE;
  $("back-link").textContent = "← Back to the " + F.shortLabel + " tracker";
  $("btn-print").addEventListener("click", () => window.print());
  bindOptions();
  render();
})();

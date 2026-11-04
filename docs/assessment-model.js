// Normalised assessment model shared by the trackers and the trust view.
//
// One "snapshot" is one school's assessment against one framework at one point
// in time. The trackers build a snapshot from their saved state when they export
// to Excel (it goes into a hidden "_assessment" sheet), and the trust view reads
// snapshots back from those files, or from any other source (see trust-sources.js).
//
// Snapshot shape (schemaVersion 1):
// {
//   schemaVersion: 1,
//   framework: "dfe" | "cyber-essentials",
//   frameworkVersion: "2026-09-16"          // DfE: GOV.UK "last updated" date
//                   | "v3.3",               // CE: NCSC requirements version
//   school: { urn, dfeNumber, name, trust, type, phase, la, pupils },
//   assessor: "Jane Smith",
//   assessmentDate: "2026-10-01",           // as entered in the tracker (may be "")
//   exportedAt: "2026-11-04T21:00:00.000Z", // when the snapshot was made
//   items: { "<itemId>": { status, notes, actions, owner } },
//   certification: {                        // Cyber Essentials only
//     level, body, number, certifiedOn, renewalDue, scope
//   }
// }
// Field meanings per framework:
//   DfE  status = RAG rating, notes = "Current Status & Notes",
//        actions = "Recommendations", owner = "Ownership"
//   CE   status = Status, notes = "Evidence / current position",
//        actions = "Action needed", owner = "Owner"
//
// This file needs data.js (STANDARDS_DATA) and/or ce-data.js (CE_DATA) loaded
// first for the framework it is asked about. It has no other dependencies.
(function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const SNAPSHOT_SHEET = "_assessment";
  const SNAPSHOT_MARKER = "school-tracker-snapshot";
  const CELL_CHUNK = 30000; // Excel cells hold at most 32,767 characters

  // ── Framework definitions ─────────────────────────────────────────────────
  // "severity" orders statuses from worst (4) to best (0), so the trust view can
  // compare DfE and Cyber Essentials results on one scale.
  const FRAMEWORKS = {
    dfe: {
      id: "dfe",
      label: "DfE digital and technology standards",
      shortLabel: "DfE standards",
      statuses: ["Not Set", "Red", "Amber", "Green", "Met"],
      done: ["Green", "Met"],
      open: ["Red", "Amber"],
      severity: { Red: 4, Amber: 3, "Not Set": 2, Green: 1, Met: 0 },
      categories: () => (typeof STANDARDS_DATA !== "undefined" ? STANDARDS_DATA : []),
      version: () => (typeof STANDARDS_META !== "undefined" && STANDARDS_META.lastUpdated) || "",
      // Same rule as the DfE tracker's Summary sheet
      overall(c) {
        if (c.Red) return "Red";
        if (c.Amber) return "Amber";
        if (c["Not Set"]) return "Not Set";
        if (c.Green) return "Green";
        return "Met";
      },
      // Same CSS classes as the DfE tracker
      cls(v) { return { Red: "red", Amber: "amber", Green: "green", Met: "met" }[v] || "not-set"; }
    },
    "cyber-essentials": {
      id: "cyber-essentials",
      label: "Cyber Essentials readiness",
      shortLabel: "Cyber Essentials",
      statuses: ["Not Set", "Not Met", "Partially Met", "Met", "N/A"],
      done: ["Met", "N/A"],
      open: ["Not Met", "Partially Met"],
      severity: { "Not Met": 4, "Partially Met": 3, "Not Set": 2, Met: 0, "N/A": 0 },
      categories: () => (typeof CE_DATA !== "undefined" ? CE_DATA : []),
      version: () => {
        const v = typeof CE_VERSION !== "undefined" ? CE_VERSION : "";
        const m = /v(\d+(?:\.\d+)*)/i.exec(v);
        return m ? "v" + m[1] : v;
      },
      // Same rule as the Cyber Essentials tracker's Summary sheet
      overall(c) {
        if (c["Not Met"]) return "Not Met";
        if (c["Partially Met"]) return "Partially Met";
        if (c["Not Set"]) return "Not Set";
        return "Met";
      },
      cls(v) { return { "Not Met": "red", "Partially Met": "amber", Met: "green", "N/A": "met" }[v] || "not-set"; },
      // The "recommended" section is guidance only and is not assessed
      assessed: cat => cat.id !== "recommended"
    }
  };

  function framework(id) {
    const f = FRAMEWORKS[id];
    if (!f) throw new Error("Unknown framework: " + id);
    return f;
  }

  const str = v => (v == null ? "" : String(v).trim());

  // ── Building snapshots ────────────────────────────────────────────────────
  function emptySnapshot(frameworkId) {
    return {
      schemaVersion: SCHEMA_VERSION,
      framework: frameworkId,
      frameworkVersion: framework(frameworkId).version(),
      school: { urn: "", dfeNumber: "", name: "", trust: "", type: "", phase: "", la: "", pupils: "" },
      assessor: "",
      assessmentDate: "",
      exportedAt: new Date().toISOString(),
      items: {}
    };
  }

  // Build a snapshot from a tracker's saved state (the object kept in
  // localStorage "dfe_tracker_v1" or "ce_tracker_v1"). Read-only: the state is
  // not changed.
  function fromTrackerState(frameworkId, state) {
    const f = framework(frameworkId);
    const s = state || {};
    const snap = emptySnapshot(frameworkId);
    const items = f.categories().flatMap(c => c.items);

    if (frameworkId === "dfe") {
      Object.assign(snap.school, {
        urn: str(s.schoolURN), dfeNumber: str(s.schoolDfENumber), name: str(s.schoolName),
        trust: str(s.schoolTrust), type: str(s.schoolType), phase: str(s.schoolPhase),
        la: str(s.schoolLA), pupils: str(s.schoolPupils)
      });
      snap.assessor = str(s.assessorName);
      snap.assessmentDate = str(s.assessmentDate);
      const r = s.ratings || {}, n = s.notes || {}, a = s.recommendations || {}, o = s.ownership || {};
      items.forEach(i => {
        snap.items[i.id] = { status: validStatus(f, r[i.id]), notes: str(n[i.id]), actions: str(a[i.id]), owner: str(o[i.id]) };
      });
    } else {
      const org = s.org || {};
      Object.assign(snap.school, {
        urn: str(org.orgURN), dfeNumber: str(org.orgDfENumber), name: str(org.orgName),
        trust: str(org.orgTrust), pupils: str(org.orgPupils)
      });
      snap.assessor = str(org.assessorName);
      snap.assessmentDate = str(org.assessmentDate);
      snap.certification = {
        level: str(org.certLevel), body: str(org.certBody), number: str(org.certNumber),
        certifiedOn: str(org.certDate), renewalDue: str(org.renewalDate), scope: str(org.scopeDescription)
      };
      const st = s.status || {}, ev = s.evidence || {}, ac = s.actions || {}, ow = s.owner || {};
      items.forEach(i => {
        snap.items[i.id] = { status: validStatus(f, st[i.id]), notes: str(ev[i.id]), actions: str(ac[i.id]), owner: str(ow[i.id]) };
      });
    }
    return snap;
  }

  function validStatus(f, v) {
    v = str(v);
    return f.statuses.includes(v) ? v : "Not Set";
  }

  // Check and tidy a snapshot from any source. Returns { snapshot, problems }.
  // A snapshot with problems is still returned where it can be used.
  function validate(raw) {
    const problems = [];
    if (!raw || typeof raw !== "object") return { snapshot: null, problems: ["not a snapshot object"] };
    if (!FRAMEWORKS[raw.framework]) return { snapshot: null, problems: ["unknown framework " + JSON.stringify(raw.framework)] };
    if (raw.schemaVersion > SCHEMA_VERSION) problems.push(`made by a newer version of the tracker (schema ${raw.schemaVersion}); some details may be missing`);
    const f = framework(raw.framework);
    const snap = emptySnapshot(raw.framework);
    snap.frameworkVersion = str(raw.frameworkVersion);
    Object.keys(snap.school).forEach(k => { snap.school[k] = str(raw.school && raw.school[k]); });
    snap.assessor = str(raw.assessor);
    snap.assessmentDate = str(raw.assessmentDate);
    snap.exportedAt = str(raw.exportedAt);
    const known = new Set(f.categories().flatMap(c => c.items.map(i => i.id)));
    let unknown = 0;
    Object.entries(raw.items || {}).forEach(([id, v]) => {
      if (!known.has(id)) { unknown++; return; }
      v = v || {};
      snap.items[id] = { status: validStatus(f, v.status), notes: str(v.notes), actions: str(v.actions), owner: str(v.owner) };
    });
    if (unknown) problems.push(`${unknown} item(s) are no longer in the current ${f.shortLabel} and were ignored`);
    if (raw.framework === "cyber-essentials") {
      const c = raw.certification || {};
      snap.certification = {
        level: str(c.level), body: str(c.body), number: str(c.number),
        certifiedOn: str(c.certifiedOn), renewalDue: str(c.renewalDue), scope: str(c.scope)
      };
    }
    if (!snap.school.urn && !snap.school.name) problems.push("no school name or URN in this file");
    return { snapshot: snap, problems };
  }

  // A stable key for "this school", used to group snapshots
  function schoolKey(school) {
    const urn = str(school && school.urn).replace(/\D/g, "");
    if (urn) return "urn:" + String(parseInt(urn, 10));
    return "name:" + str(school && school.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  // A key for one snapshot, so re-importing the same export replaces it
  function snapshotKey(snap) {
    return [snap.framework, schoolKey(snap.school), snap.exportedAt || snap.assessmentDate || ""].join("|");
  }

  // ── Summaries ─────────────────────────────────────────────────────────────
  function countsFor(f) {
    const c = {};
    f.statuses.forEach(s => (c[s] = 0));
    return c;
  }

  function parseDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(iso));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function isoDate(d) { return d ? d.toISOString().slice(0, 10) : ""; }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function today() { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }

  // Summarise one snapshot. "now" (a Date) is optional, for testing.
  function summarise(snap, now) {
    const f = framework(snap.framework);
    const out = { framework: f.id, categories: [], outstanding: [], totals: null, worstSeverity: 0 };
    const all = countsFor(f);
    f.categories().forEach(cat => {
      const c = countsFor(f);
      cat.items.forEach(item => {
        const v = (snap.items[item.id] && snap.items[item.id].status) || "Not Set";
        c[v]++;
        const isAssessed = !f.assessed || f.assessed(cat);
        if (isAssessed) all[v]++;
        if (f.open.includes(v)) {
          const d = snap.items[item.id];
          out.outstanding.push({
            categoryId: cat.id, categoryTitle: cat.title, isCore: !!cat.isCore,
            itemId: item.id, itemTitle: item.title, status: v,
            notes: d.notes, actions: d.actions, owner: d.owner, severity: f.severity[v]
          });
        }
      });
      const overall = f.overall(c);
      const done = f.done.reduce((n, s) => n + c[s], 0);
      const assessed = !f.assessed || f.assessed(cat);
      out.categories.push({
        id: cat.id, title: cat.title, isCore: !!cat.isCore, assessed,
        total: cat.items.length, counts: c, overall, cls: f.cls(overall),
        severity: f.severity[overall], done, pct: cat.items.length ? Math.round(done / cat.items.length * 100) : 0
      });
      if (assessed) out.worstSeverity = Math.max(out.worstSeverity, f.severity[overall]);
    });
    const totalItems = Object.values(all).reduce((a, b) => a + b, 0);
    const doneItems = f.done.reduce((n, s) => n + all[s], 0);
    out.totals = { items: totalItems, done: doneItems, pct: totalItems ? Math.round(doneItems / totalItems * 100) : 0, counts: all };

    if (f.id === "dfe") {
      const core = out.categories.filter(c => c.isCore);
      const coreItems = core.reduce((n, c) => n + c.total, 0);
      const coreDone = core.reduce((n, c) => n + c.done, 0);
      out.core = {
        categories: core.length,
        categoriesMet: core.filter(c => f.done.includes(c.overall)).length,
        items: coreItems, done: coreDone, pct: coreItems ? Math.round(coreDone / coreItems * 100) : 0
      };
      const fm = out.categories.find(c => c.id === "filtering-monitoring");
      out.filtering = fm ? { overall: fm.overall, cls: fm.cls, metNow: f.done.includes(fm.overall), done: fm.done, total: fm.total } : null;
    } else {
      out.ready = out.totals.items > 0 && out.totals.done === out.totals.items;
      out.certification = certificationStatus(snap.certification, now);
    }
    return out;
  }

  // Certificate renewal: a Cyber Essentials certificate lasts 12 months. Use the
  // renewal date if given, otherwise estimate it from the certification date.
  function certificationStatus(cert, now) {
    cert = cert || {};
    const t = now ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : today();
    let due = parseDate(cert.renewalDue), estimated = false;
    if (!due && parseDate(cert.certifiedOn)) {
      const c = parseDate(cert.certifiedOn);
      due = new Date(Date.UTC(c.getUTCFullYear() + 1, c.getUTCMonth(), c.getUTCDate()));
      estimated = true;
    }
    if (!due) return { level: cert.level || "", renewalDue: "", estimated: false, daysLeft: null, state: "none" };
    const daysLeft = daysBetween(t, due);
    return {
      level: cert.level || "", number: cert.number || "", body: cert.body || "",
      certifiedOn: cert.certifiedOn || "", renewalDue: isoDate(due), estimated, daysLeft,
      state: daysLeft < 0 ? "overdue" : daysLeft <= 90 ? "due" : "ok"
    };
  }

  // ── Hidden "_assessment" sheet ────────────────────────────────────────────
  // Row 1: [marker, schemaVersion, number of chunks]; rows 2+: one JSON chunk each.
  function writeSnapshotSheet(XLSX, wb, snap) {
    const json = JSON.stringify(snap);
    const rows = [[SNAPSHOT_MARKER, SCHEMA_VERSION, 0]];
    for (let i = 0; i < json.length; i += CELL_CHUNK) rows.push([json.slice(i, i + CELL_CHUNK)]);
    rows[0][2] = rows.length - 1;
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, SNAPSHOT_SHEET);
    // Hide it so school staff only see the normal sheets
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Sheets = wb.Workbook.Sheets || [];
    const idx = wb.SheetNames.indexOf(SNAPSHOT_SHEET);
    while (wb.Workbook.Sheets.length <= idx) wb.Workbook.Sheets.push({});
    wb.Workbook.Sheets[idx].Hidden = 1;
    return wb;
  }

  // Returns the raw snapshot object, or null if the workbook has no usable sheet.
  // Throws if the sheet is present but damaged, so the caller can fall back.
  function readSnapshotSheet(XLSX, wb) {
    const ws = wb.Sheets && wb.Sheets[SNAPSHOT_SHEET];
    if (!ws) return null;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    if (!rows.length || rows[0][0] !== SNAPSHOT_MARKER) throw new Error("the hidden assessment sheet is not in the expected format");
    const n = Number(rows[0][2]) || rows.length - 1;
    const json = rows.slice(1, 1 + n).map(r => String(r[0] == null ? "" : r[0])).join("");
    return JSON.parse(json);
  }

  window.AssessmentModel = {
    SCHEMA_VERSION, SNAPSHOT_SHEET, FRAMEWORKS, framework,
    emptySnapshot, fromTrackerState, validate, schoolKey, snapshotKey,
    summarise, certificationStatus, writeSnapshotSheet, readSnapshotSheet, parseDate
  };
})();

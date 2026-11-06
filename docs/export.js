// Excel export / import using SheetJS

function exportToExcel(state) {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──────────────────────────────────────────────────────
  const summaryRows = [
    ["Standard", "Total Recs", "Green (met)", "Amber", "Red", "Not Set", "Overall Status"]
  ];

  STANDARDS_DATA.forEach(cat => {
    const counts = { Red: 0, Amber: 0, Green: 0, "Not Set": 0 };
    cat.items.forEach(item => {
      const r = normaliseRating(state.ratings[item.id] || "Not Set");
      counts[r] = (counts[r] || 0) + 1;
    });
    let overall = "Not Set";
    if (counts.Red > 0) overall = "Red";
    else if (counts.Amber > 0) overall = "Amber";
    else if (counts["Not Set"] > 0) overall = "Not Set";
    else overall = "Green";
    summaryRows.push([
      cat.title,
      cat.items.length,
      counts.Green,
      counts.Amber,
      counts.Red,
      counts["Not Set"],
      overall
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Rating key ─────────────────────────────────────────────────────────
  const keyRows = [["RAG Rating", "Means", "Description"]].concat(RAG_INFO.map(r => [r.value, r.label, r.meaning]));
  const wsKey = XLSX.utils.aoa_to_sheet(keyRows);
  wsKey["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsKey, "Rating key");

  // ── Info sheet ─────────────────────────────────────────────────────────
  const infoRows = [
    ["DfE Digital & Technology Standards Assessment"],
    [],
    ["School / College", state.schoolName || ""],
    ["URN", state.schoolURN || ""],
    ["DfE Number (LAESTAB)", state.schoolDfENumber || ""],
    ["Phase of Education", state.schoolPhase || ""],
    ["School Type", state.schoolType || ""],
    ["Local Authority", state.schoolLA || ""],
    ["Trust", state.schoolTrust || ""],
    ["Number of Pupils", state.schoolPupils || ""],
    ["Address", state.schoolAddress || ""],
    ["Phone", state.schoolPhone || ""],
    ["Website", state.schoolWebsite || ""],
    [],
    ["Assessor", state.assessorName || ""],
    ["Assessment Date", state.assessmentDate || ""]
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Info");

  // ── Per-category sheets ────────────────────────────────────────────────
  STANDARDS_DATA.forEach(cat => {
    const rows = [
      [cat.title + (cat.isCore ? " ★ (Core)" : "")],
      [],
      ["#", "Standard", "Current Status & Notes", "Recommendations", "RAG Rating", "Ownership", "Date type", "Date"]
    ];

    cat.items.forEach((item, idx) => {
      const d = exportDate(state, item.id);
      rows.push([
        idx + 1,
        item.title,
        state.notes[item.id] || "",
        state.recommendations[item.id] || "",
        normaliseRating(state.ratings[item.id] || "Not Set"),
        state.ownership[item.id] || "",
        d ? DATE_TYPE_LABELS[d.type] : "",
        d ? d.date : ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 50 },
      { wch: 40 },
      { wch: 40 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 }
    ];

    // Sheet name: max 31 chars, strip invalid chars
    const sheetName = cat.title.replace(/[\/\\*?\[\]:]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // ── Working towards: every dated standard in date order ────────────────
  const planRows = [["Date", "Date type", "Status", "Standard area", "Core", "Standard", "RAG Rating", "Ownership"]];
  STANDARDS_DATA.flatMap(cat => cat.items.map(item => ({ cat, item, d: exportDate(state, item.id) })))
    .filter(x => x.d)
    .sort((a, b) => a.d.date.localeCompare(b.d.date))
    .forEach(({ cat, item, d }) => planRows.push([
      d.date, DATE_TYPE_LABELS[d.type], DATE_STATE_LABELS[d.state], cat.title, cat.isCore ? "Yes" : "",
      item.title, normaliseRating(state.ratings[item.id] || "Not Set"), state.ownership[item.id] || ""
    ]));
  if (planRows.length === 1) planRows.push(["No dates set yet"]);
  const wsPlan = XLSX.utils.aoa_to_sheet(planRows);
  wsPlan["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 6 }, { wch: 60 }, { wch: 12 }, { wch: 20 }];
  // Straight after Summary, so it is easy to find
  XLSX.utils.book_append_sheet(wb, wsPlan, "Working towards");
  wb.SheetNames.splice(wb.SheetNames.indexOf("Working towards"), 1);
  wb.SheetNames.splice(1, 0, "Working towards");

  // ── Save ───────────────────────────────────────────────────────────────
  const school = state.schoolName ? "_" + state.schoolName.replace(/[^a-zA-Z0-9]/g, "_") : "";
  const date = new Date().toISOString().slice(0, 10);
  const filename = `DfE_Standards_Assessment${school}_${date}.xlsx`;

  // Hidden "_assessment" sheet with the full assessment as JSON, so the trust
  // overview can import this file exactly (see assessment-model.js). Never let
  // it stop the export.
  try {
    if (window.AssessmentModel) AssessmentModel.writeSnapshotSheet(XLSX, wb, AssessmentModel.fromTrackerState("dfe", state));
  } catch (e) { console.warn("Assessment sheet not added:", e); }

  XLSX.writeFile(wb, filename);
  showToast("Exported: " + filename);
}

// A standard's date as exported, or null (see AssessmentModel.dateStatus)
function exportDate(state, id) {
  const t = state.targetDates || {}, ty = state.dateTypes || {};
  return AssessmentModel.dateStatus(t[id], ty[id], normaliseRating(state.ratings[id] || "Not Set"), null, DATE_SOON_DAYS);
}

// A date cell from Excel: "2027-03-12" as typed or exported, "12/03/2027" (UK
// order) or an Excel date serial number if someone edited the cell in Excel
function importDate(v) {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return AssessmentModel.validDate(d.toISOString().slice(0, 10));
  }
  const t = String(v == null ? "" : v).trim();
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (uk) return AssessmentModel.validDate(`${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`);
  return AssessmentModel.validDate(t);
}

function importDateType(v) {
  const t = String(v == null ? "" : v).trim().toLowerCase();
  if (t === "complete by") return "complete";
  if (t === "next review") return "review";
  return "";
}

// ── Import ─────────────────────────────────────────────────────────────────
// Newer exports carry a hidden "_assessment" sheet with the whole assessment as
// JSON (see assessment-model.js), so they are restored exactly from that.
// Older exports, or a file whose hidden sheet is damaged, are read from the
// visible sheets instead. A Cyber Essentials export is refused.
function importFromExcel(file, callback) {
  try {
    AssessmentModel.checkImportFile(file);
  } catch (err) {
    showToast("Import failed: " + err.message);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, AssessmentModel.SAFE_XLSX_READ);

      // Hidden sheet first. This throws for a Cyber Essentials file.
      const hidden = window.AssessmentModel ? AssessmentModel.readTrackerFile(XLSX, wb, "dfe") : null;

      // The visible sheets are always read: they hold the address, phone and
      // website (not in the hidden sheet), and everything else for older files.
      const visible = readVisibleSheets(wb);

      let imported, notes = [];
      if (hidden && hidden.state) {
        imported = {
          ...hidden.state,
          schoolAddress: visible.imported.schoolAddress,
          schoolPhone: visible.imported.schoolPhone,
          schoolWebsite: visible.imported.schoolWebsite
        };
        notes = hidden.problems;
      } else {
        if (!visible.matched) {
          if (looksLikeCyberEssentials(wb)) {
            throw new Error("this file is a Cyber Essentials readiness export, not DfE digital and technology standards. Open it in the Cyber Essentials tracker instead.");
          }
          throw new Error("no DfE standards sheets were found in this file. Choose an Excel file exported from this tracker.");
        }
        imported = visible.imported;
        notes = hidden ? hidden.problems : [];
      }

      callback(imported);
      if (notes.length) showToast("Data imported. Note: " + notes.join("; ") + ".");
    } catch (err) {
      showToast("Import failed: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// A Cyber Essentials tracker export without the hidden sheet (older files)
function looksLikeCyberEssentials(wb) {
  const ws = wb.Sheets["Info"];
  if (!ws) return false;
  const a1 = ws["A1"] && String(ws["A1"].v || "");
  return /cyber essentials/i.test(a1);
}

// Read an export's visible sheets (the only option for files made before the
// hidden sheet was added). Returns { imported, matched } where matched is the
// number of standards found.
function readVisibleSheets(wb) {
  const imported = {
    schoolName: "",
    schoolURN: "",
    schoolDfENumber: "",
    schoolTrust: "",
    schoolPupils: "",
    schoolPhase: "",
    schoolType: "",
    schoolLA: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolWebsite: "",
    assessorName: "",
    assessmentDate: "",
    ratings: {},
    notes: {},
    recommendations: {},
    ownership: {},
    targetDates: {},
    dateTypes: {}
  };
  // Start every current standard as blank, so standards missing from an older
  // file show as Not Set rather than keeping values from before the import
  STANDARDS_DATA.forEach(cat => cat.items.forEach(item => {
    imported.ratings[item.id] = "Not Set";
    imported.notes[item.id] = "";
    imported.recommendations[item.id] = "";
    imported.ownership[item.id] = "";
    imported.targetDates[item.id] = "";
    imported.dateTypes[item.id] = "";
  }));

  // Try Info sheet
  if (wb.SheetNames.includes("Info")) {
    const ws = wb.Sheets["Info"];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    rows.forEach(row => {
      if (!row[0]) return;
      const key = String(row[0]).toLowerCase();
      const val = row[1] ? AssessmentModel.limitText(row[1]).trim() : "";
      // Specific labels first, so "Number of Pupils" or "School Type" are not
      // mistaken for the school name
      if (key.startsWith("dfe number") || key.includes("laestab")) imported.schoolDfENumber = val;
      else if (key === "trust") imported.schoolTrust = val;
      else if (key.includes("pupils")) imported.schoolPupils = val;
      else if (key.includes("type")) imported.schoolType = val;
      else if (key.includes("school") || key.includes("college")) imported.schoolName = val;
      else if (key === "urn") imported.schoolURN = val;
      else if (key.includes("phase")) imported.schoolPhase = val;
      else if (key.includes("local authority")) imported.schoolLA = val;
      else if (key.includes("address")) imported.schoolAddress = val;
      else if (key.includes("phone")) imported.schoolPhone = val;
      else if (key.includes("website")) imported.schoolWebsite = val;
      else if (key.includes("assessor")) imported.assessorName = val;
      else if (key.includes("date")) imported.assessmentDate = val;
    });
  }

  let matched = 0;
  // Per-category sheets: match by sheet name to category title
  STANDARDS_DATA.forEach(cat => {
    const sheetName = cat.title.replace(/[\/\\*?\[\]:]/g, "").substring(0, 31);
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    // Data rows start at index 3 (0=title, 1=blank, 2=headers, 3+=data)
    const dataRows = rows.slice(3);
    // Match each row to a standard by its title (column B), including titles used
    // in older versions of the app, so older exports still import correctly after
    // GOV.UK adds, removes or reorders standards. Rows whose title matches no
    // current standard (e.g. a standard GOV.UK has removed) are skipped.
    const norm = s => String(s || "").toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
    // A Map, so titles like "constructor" or "__proto__" can't match by accident
    const byTitle = new Map();
    cat.items.forEach(item => {
      [item.title, ...(item.previousTitles || [])].forEach(t => { byTitle.set(norm(t), item); });
    });
    const text = v => (v ? AssessmentModel.limitText(v) : "");
    dataRows.forEach((row, idx) => {
      const title = norm(row[1]);
      // Fall back to position only when the row has no title at all.
      const item = title ? byTitle.get(title) : cat.items[idx];
      if (!item) return;
      matched++;
      imported.notes[item.id] = text(row[2]);
      imported.recommendations[item.id] = text(row[3]);
      const rag = normaliseRating(row[4] ? String(row[4]).trim() : "Not Set");
      imported.ratings[item.id] = RAG_VALUES.includes(rag) ? rag : "Not Set";
      imported.ownership[item.id] = text(row[5]);
      // Columns G and H (only in exports that have target dates)
      imported.targetDates[item.id] = importDate(row[7]);
      imported.dateTypes[item.id] = imported.targetDates[item.id] ? importDateType(row[6]) : "";
    });
  });
  return { imported, matched };
}

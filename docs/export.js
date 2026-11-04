// Excel export / import using SheetJS

function exportToExcel(state) {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──────────────────────────────────────────────────────
  const summaryRows = [
    ["Standard", "Total Recs", "Met", "Green", "Amber", "Red", "Not Set", "Overall Status"]
  ];

  STANDARDS_DATA.forEach(cat => {
    const counts = { Red: 0, Amber: 0, Green: 0, Met: 0, "Not Set": 0 };
    cat.items.forEach(item => {
      const r = state.ratings[item.id] || "Not Set";
      counts[r] = (counts[r] || 0) + 1;
    });
    let overall = "Not Set";
    if (counts.Red > 0) overall = "Red";
    else if (counts.Amber > 0) overall = "Amber";
    else if (counts["Not Set"] > 0) overall = "Not Set";
    else if (counts.Green > 0) overall = "Green";
    else overall = "Met";
    summaryRows.push([
      cat.title,
      cat.items.length,
      counts.Met,
      counts.Green,
      counts.Amber,
      counts.Red,
      counts["Not Set"],
      overall
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

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
      ["#", "Standard", "Current Status & Notes", "Recommendations", "RAG Rating", "Ownership"]
    ];

    cat.items.forEach((item, idx) => {
      rows.push([
        idx + 1,
        item.title,
        state.notes[item.id] || "",
        state.recommendations[item.id] || "",
        state.ratings[item.id] || "Not Set",
        state.ownership[item.id] || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 50 },
      { wch: 40 },
      { wch: 40 },
      { wch: 12 },
      { wch: 20 }
    ];

    // Sheet name: max 31 chars, strip invalid chars
    const sheetName = cat.title.replace(/[\/\\*?\[\]:]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

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

// ── Import ─────────────────────────────────────────────────────────────────
function importFromExcel(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });

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
        ownership: {}
      };

      // Try Info sheet
      if (wb.SheetNames.includes("Info")) {
        const ws = wb.Sheets["Info"];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        rows.forEach(row => {
          if (!row[0]) return;
          const key = String(row[0]).toLowerCase();
          const val = row[1] ? String(row[1]) : "";
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
        const byTitle = {};
        cat.items.forEach(item => {
          [item.title, ...(item.previousTitles || [])].forEach(t => { byTitle[norm(t)] = item; });
        });
        dataRows.forEach((row, idx) => {
          const title = norm(row[1]);
          // Fall back to position only when the row has no title at all.
          const item = title ? byTitle[title] : cat.items[idx];
          if (!item) return;
          imported.notes[item.id] = row[2] ? String(row[2]) : "";
          imported.recommendations[item.id] = row[3] ? String(row[3]) : "";
          const rag = row[4] ? String(row[4]) : "Not Set";
          imported.ratings[item.id] = ["Red","Amber","Green","Met","Not Set"].includes(rag) ? rag : "Not Set";
          imported.ownership[item.id] = row[5] ? String(row[5]) : "";
        });
      });

      callback(imported);
    } catch (err) {
      showToast("Import failed: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

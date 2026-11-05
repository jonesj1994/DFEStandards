// Data sources for the trust view. See TRUST-DATA.md for the interface.
//
// A "source" is anything that can list and save assessment snapshots (see
// assessment-model.js). The trust view only talks to sources through this
// interface, so file import can later be swapped for shared online storage
// (for example a SharePoint list through Microsoft Graph) without changing it.
//
//   {
//     id: "browser",                 // unique id
//     label: "This browser",         // shown to the user
//     persistent: true,              // does data survive a page reload?
//     listSnapshots(filter)  -> Promise<Record[]>   filter: { urns?: string[] } or null
//     saveSnapshot(record)   -> Promise<Record>
//     deleteSnapshot(key)    -> Promise<void>
//     clear()                -> Promise<void>       (optional)
//   }
//   Record = { key, snapshot, provenance }
//     key        AssessmentModel.snapshotKey(snapshot)
//     snapshot   a validated snapshot
//     provenance { fileName, importedAt, parsedFrom: "hidden sheet" | "visible sheets",
//                  exportedAtSource, warnings: [] }
//
// Needs SheetJS (XLSX), assessment-model.js, data.js and ce-data.js.
(function () {
  "use strict";
  const AM = window.AssessmentModel;

  // ── Registry ──────────────────────────────────────────────────────────────
  const sources = new Map();
  function register(source) { sources.set(source.id, source); return source; }
  function get(id) { return sources.get(id); }
  function list() { return Array.from(sources.values()); }

  // ── Browser cache (IndexedDB, with an in-memory fallback) ─────────────────
  // IndexedDB can be unavailable (private windows, blocked site data). Every
  // call is wrapped so the page still works, but then data lasts only until reload.
  function createBrowserCache(dbName) {
    dbName = dbName || "trust_view_v1";
    const STORE = "snapshots";
    const memory = new Map();
    let dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(resolve => {
        try {
          if (!window.indexedDB) return resolve(null);
          const req = indexedDB.open(dbName, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
        } catch (e) { resolve(null); }
      }).then(db => { source.persistent = !!db; return db; });
      return dbPromise;
    }

    // Run fn(store) in a transaction. fn may return { __req: IDBRequest } to get
    // that request's result once the transaction completes. With no database,
    // fn(null) is called and should use the in-memory map instead.
    const unwrap = r => (r && r.__req ? r.__req.result : r);
    function tx(mode, fn) {
      return open().then(db => {
        if (!db) return unwrap(fn(null));
        return new Promise((resolve, reject) => {
          try {
            const t = db.transaction(STORE, mode);
            const result = fn(t.objectStore(STORE));
            t.oncomplete = () => resolve(unwrap(result));
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
          } catch (e) { reject(e); }
        });
      }).catch(() => unwrap(fn(null)));
    }

    function cleanRecord(r) {
      if (!r || typeof r !== "object" || typeof r.key !== "string") return null;
      const v = AM.validate(r.snapshot);
      if (!v.snapshot) return null;
      const p = r.provenance && typeof r.provenance === "object" ? r.provenance : {};
      const s = x => (typeof x === "string" ? AM.limitText(x) : "");
      return {
        key: AM.snapshotKey(v.snapshot),
        snapshot: v.snapshot,
        provenance: {
          fileName: s(p.fileName), importedAt: s(p.importedAt), parsedFrom: s(p.parsedFrom),
          exportedAtSource: s(p.exportedAtSource),
          warnings: Array.isArray(p.warnings) ? p.warnings.filter(w => typeof w === "string").map(AM.limitText) : []
        }
      };
    }

    const source = {
      id: "browser",
      label: "This browser",
      persistent: false,
      ready: () => open().then(() => source.persistent),
      listSnapshots(filter) {
        return tx("readonly", store => {
          if (!store) return { __req: { result: Array.from(memory.values()) } };
          return { __req: store.getAll() };
        }).then(rows => {
          // Re-check every stored record: browser storage can be edited, and an
          // invalid record must never stop the trust page from loading
          rows = (rows || []).map(cleanRecord).filter(Boolean);
          if (filter && filter.urns) {
            const want = new Set(filter.urns.map(String));
            rows = rows.filter(r => want.has(String(r.snapshot.school.urn)));
          }
          return rows;
        });
      },
      saveSnapshot(record) {
        memory.set(record.key, record);
        return tx("readwrite", store => { if (store) store.put(record); return record; });
      },
      deleteSnapshot(key) {
        memory.delete(key);
        return tx("readwrite", store => { if (store) store.delete(key); });
      },
      clear() {
        memory.clear();
        return tx("readwrite", store => { if (store) store.clear(); });
      }
    };
    return source;
  }

  // ── Future online sources ─────────────────────────────────────────────────
  // A shared source would implement the same four methods. For example, a
  // SharePoint list read and written through Microsoft Graph (sign-in with
  // MSAL.js, delegated Sites.ReadWrite.All or a narrower Sites.Selected grant):
  //
  // function createSharePointSource({ siteId, listId, getToken }) {
  //   const base = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`;
  //   const call = async (url, opts = {}) => {
  //     const token = await getToken();          // never store tokens in code or localStorage
  //     const res = await fetch(url, { ...opts, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opts.headers || {}) } });
  //     if (!res.ok) throw new Error("SharePoint returned " + res.status);
  //     return res.status === 204 ? null : res.json();
  //   };
  //   return {
  //     id: "sharepoint", label: "Trust SharePoint", persistent: true,
  //     async listSnapshots(filter) {
  //       // Each list item has columns Key, URN, Framework, ExportedAt and SnapshotJson
  //       const data = await call(base + "?expand=fields&$top=999");
  //       return data.value.map(i => ({ key: i.fields.Key, snapshot: AM.validate(JSON.parse(i.fields.SnapshotJson)).snapshot,
  //                                     provenance: { fileName: "SharePoint", importedAt: i.lastModifiedDateTime, parsedFrom: "online", warnings: [] } }))
  //                        .filter(r => !filter || !filter.urns || filter.urns.includes(r.snapshot.school.urn));
  //     },
  //     async saveSnapshot(record) {
  //       await call(base, { method: "POST", body: JSON.stringify({ fields: { Key: record.key, URN: record.snapshot.school.urn,
  //         Framework: record.snapshot.framework, ExportedAt: record.snapshot.exportedAt, SnapshotJson: JSON.stringify(record.snapshot) } }) });
  //       return record;
  //     },
  //     async deleteSnapshot(key) { /* look up the item by Key, then DELETE base + "/" + itemId */ }
  //   };
  // }
  // TrustSources.register(createSharePointSource({ ... }));
  //
  // A hosted REST API would look the same: GET /snapshots?trust=..., POST /snapshots.

  // ── File import: tracker .xlsx exports -> snapshots ───────────────────────
  const norm = s => String(s == null ? "" : s).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const cell = v => (v == null ? "" : String(v).trim());
  // Same sheet-name rules as each tracker's export
  const dfeSheetName = t => t.replace(/[\/\\*?\[\]:]/g, "").substring(0, 31);
  const ceSheetName = t => t.replace(/[\/\\*?\[\]:()]/g, "").substring(0, 31).trim();

  // Excel may turn a typed date into a serial number; turn it back into yyyy-mm-dd
  function dateCell(v) {
    if (typeof v === "number" && window.XLSX && XLSX.SSF) {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
    const s = cell(v);
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); // 01/10/2026
    if (uk) return `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
    return s;
  }

  function rowsOf(wb, name) {
    const ws = wb.Sheets[name];
    return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) : null;
  }

  // Which tracker made this workbook?
  function detectFramework(wb) {
    const info = rowsOf(wb, "Info");
    const head = info && info[0] ? norm(info[0][0]) : "";
    if (head.includes("cyber essentials")) return "cyber-essentials";
    if (head.includes("digital") && head.includes("technology")) return "dfe";
    const names = new Set(wb.SheetNames);
    const score = (cats, fn) => cats.filter(c => names.has(fn(c.title))).length;
    const d = score(AM.framework("dfe").categories(), dfeSheetName);
    const c = score(AM.framework("cyber-essentials").categories(), ceSheetName);
    if (!d && !c) return null;
    return d >= c ? "dfe" : "cyber-essentials";
  }

  // Find a category's sheet by its expected name, or by its title in cell A1
  function findCategorySheet(wb, cat, nameFn) {
    const exact = nameFn(cat.title);
    if (wb.Sheets[exact]) return exact;
    const t = norm(cat.title);
    return wb.SheetNames.find(n => {
      const r = rowsOf(wb, n);
      return r && r[0] && norm(r[0][0]).replace(/ ★ \(core\)$/, "") === t;
    }) || null;
  }

  // Match data rows to items: by title (current or previous), then by row number
  // for rows whose title matches nothing, as long as that item is still free.
  function matchRows(cat, dataRows, warnings) {
    const byTitle = new Map();
    cat.items.forEach(item => [item.title, ...(item.previousTitles || [])].forEach(t => byTitle.set(norm(t), item)));
    const out = new Map(); // item.id -> row
    const unmatched = [];
    dataRows.forEach(row => {
      if (row.every(v => cell(v) === "")) return;
      const item = byTitle.get(norm(row[1]));
      if (item && !out.has(item.id)) out.set(item.id, row);
      else unmatched.push(row);
    });
    let byNumber = 0, skipped = 0;
    unmatched.forEach(row => {
      const n = parseInt(row[0], 10);
      const item = n >= 1 ? cat.items[n - 1] : null;
      if (item && !out.has(item.id)) { out.set(item.id, row); byNumber++; }
      else skipped++;
    });
    if (byNumber) warnings.push(`${cat.title}: ${byNumber} row(s) matched by row number because the standard's wording has changed`);
    if (skipped) warnings.push(`${cat.title}: ${skipped} row(s) could not be matched to a current standard and were skipped`);
    return out;
  }

  // Read the "Info" sheet (label, value) into the snapshot. Labels differ a
  // little between tracker versions, so match on key words.
  function readInfo(wb, frameworkId, snap) {
    const rows = rowsOf(wb, "Info") || [];
    const s = snap.school;
    const cert = snap.certification || {};
    rows.forEach(r => {
      const k = norm(r[0]);
      const v = cell(r[1]);
      if (!k || r.length < 2) return;
      if (k === "urn") s.urn = v;
      else if (k.startsWith("dfe number") || k.includes("laestab")) s.dfeNumber = v;
      else if (k === "trust") s.trust = v;
      else if (k.includes("pupils")) s.pupils = v;
      else if (frameworkId === "dfe") {
        if (k.includes("type")) s.type = v;
        else if (k.includes("school") || k.includes("college")) s.name = v;
        else if (k.includes("phase")) s.phase = v;
        else if (k.includes("local authority")) s.la = v;
        else if (k.includes("assessor")) snap.assessor = v;
        else if (k.includes("date")) snap.assessmentDate = dateCell(r[1]);
      } else {
        if (k.startsWith("school / college") || k.includes("name")) s.name = v;
        else if (k.includes("scope")) cert.scope = v;
        else if (k.includes("level")) cert.level = v;
        else if (k.includes("certification body")) cert.body = v;
        else if (k.includes("certificate number")) cert.number = v;
        else if (k.includes("certification date")) cert.certifiedOn = dateCell(r[1]);
        else if (k.includes("renewal")) cert.renewalDue = dateCell(r[1]);
        else if (k.includes("completed by")) snap.assessor = v;
        else if (k.includes("date of this review")) snap.assessmentDate = dateCell(r[1]);
      }
    });
  }

  // When was a file without the hidden sheet exported? The trackers put the
  // date in the file name; otherwise use the workbook's own dates or the file's.
  function guessExportDate(wb, fileName, lastModified) {
    const m = /(\d{4}-\d{2}-\d{2})(?=\D*\.xlsx$)/i.exec(fileName || "");
    if (m) return { at: m[1] + "T00:00:00.000Z", source: "file name" };
    const p = wb.Props || {};
    const d = p.ModifiedDate || p.CreatedDate;
    if (d && !isNaN(new Date(d))) return { at: new Date(d).toISOString(), source: "workbook properties" };
    if (lastModified) return { at: new Date(lastModified).toISOString(), source: "file date" };
    return { at: "", source: "unknown" };
  }

  function parseVisibleSheets(wb, frameworkId, fileName, lastModified) {
    const f = AM.framework(frameworkId);
    const warnings = [];
    const snap = AM.emptySnapshot(frameworkId);
    snap.frameworkVersion = ""; // unknown for older files
    if (frameworkId === "cyber-essentials") snap.certification = { level: "", body: "", number: "", certifiedOn: "", renewalDue: "", scope: "" };
    readInfo(wb, frameworkId, snap);
    const nameFn = frameworkId === "dfe" ? dfeSheetName : ceSheetName;
    // DfE sheets: title, blank, header, data. CE sheets: title, applies-to, header, data.
    let found = 0, missing = [];
    f.categories().forEach(cat => {
      const sheet = findCategorySheet(wb, cat, nameFn);
      if (!sheet) { missing.push(cat.title); return; }
      const rows = rowsOf(wb, sheet);
      const headerAt = rows.findIndex(r => cell(r[0]) === "#");
      const matched = matchRows(cat, rows.slice(headerAt >= 0 ? headerAt + 1 : 3), warnings);
      matched.forEach((row, id) => {
        found++;
        let status = frameworkId === "dfe" ? cell(row[4]) : cell(row[3]);
        // Older ratings that have been renamed (e.g. DfE "Met" is now "Green")
        if (f.aliases && Object.prototype.hasOwnProperty.call(f.aliases, status)) status = f.aliases[status];
        snap.items[id] = frameworkId === "dfe"
          ? { status: f.statuses.includes(status) ? status : "Not Set", notes: cell(row[2]), actions: cell(row[3]), owner: cell(row[5]) }
          : { status: f.statuses.includes(status) ? status : "Not Set", notes: cell(row[4]), actions: cell(row[5]), owner: cell(row[6]) };
      });
    });
    if (!found) throw new Error(`no ${f.shortLabel} rows could be read from this file`);
    if (missing.length) warnings.push(`sheet(s) missing, so treated as not set: ${missing.join(", ")}`);
    const exp = guessExportDate(wb, fileName, lastModified);
    snap.exportedAt = exp.at;
    return { snapshot: snap, warnings, exportedAtSource: exp.source };
  }

  // Parse one workbook into a Record. Prefers the hidden "_assessment" sheet and
  // falls back to the visible sheets, so older exports still import.
  function parseWorkbook(wb, fileName, lastModified) {
    let raw = null, problem = null;
    try { raw = AM.readSnapshotSheet(XLSX, wb); } catch (e) { problem = "hidden assessment sheet unreadable (" + e.message + "), so the visible sheets were used"; }
    if (raw) {
      const v = AM.validate(raw);
      if (v.snapshot) {
        return {
          key: AM.snapshotKey(v.snapshot), snapshot: v.snapshot,
          provenance: { fileName, importedAt: new Date().toISOString(), parsedFrom: "hidden sheet", exportedAtSource: "tracker", warnings: v.problems }
        };
      }
      problem = "hidden assessment sheet invalid (" + v.problems.join("; ") + "), so the visible sheets were used";
    }
    const fw = detectFramework(wb);
    if (!fw) throw new Error("this does not look like a DfE standards or Cyber Essentials tracker export");
    const p = parseVisibleSheets(wb, fw, fileName, lastModified);
    const v = AM.validate(p.snapshot);
    v.snapshot.frameworkVersion = "";
    const warnings = [].concat(problem ? [problem] : [], ["older export without the hidden assessment sheet: read from the visible sheets"], p.warnings,
      v.problems.filter(x => !/no longer in the current/.test(x)),
      p.exportedAtSource !== "file name" ? [`export date taken from the ${p.exportedAtSource}`] : []);
    return {
      key: AM.snapshotKey(v.snapshot), snapshot: v.snapshot,
      provenance: { fileName, importedAt: new Date().toISOString(), parsedFrom: "visible sheets", exportedAtSource: p.exportedAtSource, warnings }
    };
  }

  // Parse a File (from a file input or drag and drop). Resolves to
  // { fileName, ok, record?, error? }; never rejects.
  function parseFile(file) {
    return new Promise(resolve => {
      try { AM.checkImportFile(file); } catch (err) { return resolve({ fileName: file.name, ok: false, error: err.message }); }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), AM.SAFE_XLSX_READ);
          resolve({ fileName: file.name, ok: true, record: parseWorkbook(wb, file.name, file.lastModified) });
        } catch (err) {
          resolve({ fileName: file.name, ok: false, error: err.message || String(err) });
        }
      };
      reader.onerror = () => resolve({ fileName: file.name, ok: false, error: "the file could not be read" });
      reader.readAsArrayBuffer(file);
    });
  }

  window.TrustSources = { register, get, list, createBrowserCache, parseFile, parseWorkbook, detectFramework };
})();

// Link between the trust overview and the DfE standards tracker, so a trust can
// open any school's assessment in the tracker, edit it, and jump back.
//
// - trust.html calls TrustLink.openInTracker(row): it loads the school's newest
//   imported DfE assessment (or a fresh one with the school's details) into the
//   tracker's saved data, marked with a trustSession, and opens dfe.html.
// - dfe.html, while a trustSession is set, copies every saved change back into
//   the trust overview's store (TrustLink.syncFromTracker), as that school's
//   newest assessment. The imported original stays as an older version.
// - Before replacing a tracker assessment that isn't linked to the trust, the
//   user is asked whether to add it to the trust overview first.
//
// Needs assessment-model.js and trust-sources.js.
(function () {
  "use strict";
  const AM = window.AssessmentModel;
  const TS = window.TrustSources;
  const DFE_KEY = "dfe_tracker_v1";
  const RETURN_KEY = "trust_return_school";   // sessionStorage: school to show on return

  let store = null;
  const getStore = () => store || (store = TS.createBrowserCache());

  function readTracker() {
    try {
      const s = JSON.parse(localStorage.getItem(DFE_KEY) || "null");
      return s && typeof s === "object" && !Array.isArray(s) ? s : null;
    } catch (e) { return null; }
  }

  // Validate a stored trust session; null if it isn't one
  function cleanSession(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const str = (x, n) => (typeof x === "string" ? x.slice(0, n) : "");
    const key = str(v.key, 300);
    if (!key) return null;
    return {
      key,
      urn: str(v.urn, 20).replace(/[^0-9]/g, ""),
      name: str(v.name, 200),
      recordKey: str(v.recordKey, 400)
    };
  }

  // Does the tracker hold real work (not just an empty, untouched assessment)?
  function hasWork(s) {
    if (!s) return false;
    if (String(s.schoolName || "").trim()) return true;
    const vals = o => (o && typeof o === "object" ? Object.values(o) : []);
    if (vals(s.ratings).some(v => v && v !== "Not Set")) return true;
    return ["notes", "recommendations", "ownership"].some(f => vals(s[f]).some(v => String(v || "").trim()));
  }

  function recordFor(snapshot, fileName) {
    return {
      key: AM.snapshotKey(snapshot),
      snapshot,
      provenance: { fileName, importedAt: new Date().toISOString(), parsedFrom: "DfE tracker", exportedAtSource: "tracker", warnings: [] }
    };
  }

  // A small modal with a choice of buttons. Built with DOM methods (no HTML
  // strings), so names shown in it can't inject anything. Resolves the value
  // of the button pressed, or "cancel".
  function chooseDialog(title, lines, buttons) {
    return new Promise(resolve => {
      const d = document.createElement("dialog");
      d.className = "tl-dialog";
      d.setAttribute("aria-labelledby", "tl-dialog-title");
      const h = document.createElement("h2");
      h.id = "tl-dialog-title";
      h.textContent = title;
      d.appendChild(h);
      lines.forEach(t => { const p = document.createElement("p"); p.textContent = t; d.appendChild(p); });
      const row = document.createElement("div");
      row.className = "tl-dialog-buttons";
      const done = v => { d.close(); d.remove(); resolve(v); };
      buttons.forEach(([label, value, cls]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn " + (cls || "btn-secondary");
        b.textContent = label;
        b.addEventListener("click", () => done(value));
        row.appendChild(b);
      });
      d.appendChild(row);
      d.addEventListener("cancel", e => { e.preventDefault(); done("cancel"); });
      document.body.appendChild(d);
      d.showModal();
      const first = row.querySelector("button");
      if (first) first.focus();
    });
  }

  // ── Trust overview side ───────────────────────────────────────────────────
  // row: a school row from the trust overview (key, urn, name, dfeNumber, phase,
  // type, la, trust, pupils, current.dfe = newest imported record or null).
  // Resolves false if the user cancelled; otherwise navigates to dfe.html.
  async function openInTracker(row) {
    const cur = readTracker();
    const session = cur && cleanSession(cur.trustSession);
    let people = [];
    if (session) {
      // Already linked: its changes are in the trust overview. Keep the People
      // list, which is usually the trust's own staff.
      people = Array.isArray(cur.people) ? cur.people : [];
    } else if (hasWork(cur)) {
      const name = String(cur.schoolName || "").trim() || "a school";
      const choice = await chooseDialog("The DfE tracker already has an assessment", [
        `The DfE standards tracker in this browser holds an assessment for ${name} that isn't in the trust overview.`,
        `Opening ${row.name || "this school"} will replace it. Add it to the trust overview first to keep it.`
      ], [["Add it to the trust overview, then continue", "add", "btn-primary"], ["Replace it", "replace", "btn-danger"], ["Cancel", "cancel"]]);
      if (choice === "cancel") return false;
      if (choice === "add") {
        await getStore().saveSnapshot(recordFor(AM.fromTrackerState("dfe", cur), "DfE tracker in this browser"));
      }
    }

    const rec = row.current && row.current.dfe;
    let state;
    if (rec) {
      state = AM.toTrackerState("dfe", rec.snapshot).state;
    } else {
      const s = v => (v == null ? "" : String(v));
      state = {
        schoolName: s(row.name), schoolURN: s(row.urn), schoolDfENumber: s(row.dfeNumber), schoolPhase: s(row.phase),
        schoolType: s(row.type), schoolLA: s(row.la), schoolTrust: s(row.trust), schoolPupils: s(row.pupils)
      };
    }
    state.people = people;
    state.trustSession = { key: String(row.key), urn: String(row.urn || ""), name: String(row.name || ""), recordKey: "" };
    try { localStorage.setItem(DFE_KEY, JSON.stringify(state)); } catch (e) { return false; }
    location.href = "dfe.html";
    return true;
  }

  // On return from the tracker: the school to show, read once
  function takeReturnSchool() {
    try {
      const k = sessionStorage.getItem(RETURN_KEY);
      sessionStorage.removeItem(RETURN_KEY);
      return typeof k === "string" && k ? k.slice(0, 300) : null;
    } catch (e) { return null; }
  }

  // ── Tracker side ──────────────────────────────────────────────────────────
  // Copy the tracker's assessment into the trust overview as the school's
  // newest record, replacing the one this session saved last time. Resolves
  // the new record's key (or null if there is no trust session).
  async function syncFromTracker(state) {
    const session = cleanSession(state && state.trustSession);
    if (!session) return null;
    const rec = recordFor(AM.fromTrackerState("dfe", state), "Edited in the DfE tracker");
    const src = getStore();
    await src.saveSnapshot(rec);
    if (session.recordKey && session.recordKey !== rec.key) {
      try { await src.deleteSnapshot(session.recordKey); } catch (e) { /* already gone */ }
    }
    return rec.key;
  }

  function setReturnSchool(key) {
    try { sessionStorage.setItem(RETURN_KEY, String(key).slice(0, 300)); } catch (e) { /* ignore */ }
  }

  window.TrustLink = { openInTracker, syncFromTracker, cleanSession, takeReturnSchool, setReturnSchool, chooseDialog };
})();

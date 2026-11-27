// Hands a list of the trust's schools from the Trust Overview to the report
// pages (trust-report.html, and report.html?from=trust for the schools' own
// governors' reports). Only the list goes in sessionStorage: names, URNs and the
// keys of each school's newest assessment. The reports read the assessments
// themselves from the trust store (IndexedDB), which re-checks every record.
// Everything read back is checked again here, as browser storage can be edited.
(function () {
  "use strict";
  const KEY = "trust_report_v1";
  const MAX_SCHOOLS = 1000;
  const text = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n) : "");

  function clean(p) {
    if (!p || typeof p !== "object" || !Array.isArray(p.schools)) return null;
    const schools = p.schools.slice(0, MAX_SCHOOLS).filter(s => s && typeof s === "object").map(s => ({
      name: text(s.name, 200),
      urn: text(s.urn, 20),
      phase: text(s.phase, 80),
      keys: {
        dfe: text(s.keys && s.keys.dfe, 300),
        "cyber-essentials": text(s.keys && s.keys["cyber-essentials"], 300)
      }
    }));
    return {
      trust: text(p.trust, 200),
      fw: p.fw === "cyber-essentials" ? "cyber-essentials" : "dfe",
      returnTo: text(p.returnTo, 300),
      schools
    };
  }

  function save(payload) {
    const c = clean(payload);
    if (!c) return false;
    try { sessionStorage.setItem(KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
  }

  function load() {
    try { return clean(JSON.parse(sessionStorage.getItem(KEY) || "null")); } catch (e) { return null; }
  }

  // The records named in the list, by key. Resolves a Map of key -> record.
  async function records(payload) {
    const want = new Set();
    payload.schools.forEach(s => Object.values(s.keys).forEach(k => { if (k) want.add(k); }));
    const map = new Map();
    if (!want.size || !window.TrustSources) return map;
    let rows = [];
    try { rows = await TrustSources.createBrowserCache().listSnapshots(null); } catch (e) { rows = []; }
    rows.forEach(r => { if (want.has(r.key)) map.set(r.key, r); });
    return map;
  }

  window.TrustHandoff = { KEY, save, load, records };
})();

// Shared school lookup and school profile, used by the home page and both trackers.
//
// Data: docs/schools/, built weekly from the DfE's Get Information About Schools
// (GIAS) extract by scripts/build_school_data.py (see .github/workflows).
//   schools/urn/NN.json      records keyed by URN, sharded by the URN's last 2 digits
//   schools/laestab/LLL.json local authority code -> { establishment number: [URN, ...] }
//   schools/names.json       open schools, for search by name (loaded only when needed)
//   schools/trusts.json      trusts: [UID, name, [open URNs]] (loaded only when needed)
//   schools/meta.json        build date and source file
// Only this site's own data files are used: no third-party service is
// contacted (the pages' security policy allows connections to this site only).
(function () {
  "use strict";

  const PROFILE_KEY = "school_profile_v1";
  const DATA = "schools/";
  const SHARDS = 100;
  const GIAS_PAGE = "https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/";

  const cache = new Map();
  function getJSON(url) {
    if (!cache.has(url)) {
      const p = fetch(url).then(res => {
        if (!res.ok) { const e = new Error("HTTP " + res.status); e.status = res.status; throw e; }
        return res.json();
      });
      p.catch(() => cache.delete(url)); // let a failed request be retried
      cache.set(url, p);
    }
    return cache.get(url);
  }

  class LookupError extends Error {
    constructor(message, code) { super(message); this.code = code; }
  }

  // ── Input parsing ─────────────────────────────────────────────────────────
  // URN: 5–7 digits. DfE number (LAESTAB): 3-digit LA code + 4-digit establishment
  // number, written 3524000, 352/4000 or 352-4000. A bare 7-digit number could be
  // either, so it is tried as a DfE number first, then as a URN.
  function parseQuery(input) {
    const q = String(input || "").trim();
    if (!q) return { error: "Enter a URN or DfE number." };
    let m = q.match(/^(\d{3})\s*[\/\-]\s*(\d{4})$/);
    if (m) return { kind: "laestab", la: m[1], en: m[2] };
    const digits = q.replace(/\s+/g, "");
    if (/^\d{7}$/.test(digits)) return { kind: "either", la: digits.slice(0, 3), en: digits.slice(3), urn: digits };
    if (/^\d{5,6}$/.test(digits)) return { kind: "urn", urn: digits };
    if (/^[\d\s\/\-]+$/.test(q)) {
      return { error: "That number is not the right length. A URN has 5 to 7 digits (for example 100000). A DfE number has 7 digits, for example 352/4000 or 3524000." };
    }
    if (q.replace(/[^A-Za-z]/g, "").length >= 3) return { kind: "name", text: q };
    return { error: "Enter a URN (for example 100000), a DfE number (for example 352/4000) or at least 3 letters of the school's name." };
  }

  // ── Record normalising ────────────────────────────────────────────────────
  function normalise(urn, r) {
    const addressParts = [r.a1, r.a2, r.a3, r.tw, r.co, r.pc].filter(Boolean);
    const laestab = r.lac && r.en ? r.lac + r.en : "";
    return {
      urn: String(urn),
      name: r.n || "",
      laestab,
      dfeNumber: laestab ? r.lac + "/" + r.en : "",
      laCode: r.lac || "",
      la: r.la || "",
      type: r.t || "",
      typeGroup: r.tg || "",
      phase: r.ph || "",
      status: r.s || "",
      isClosed: r.s === "Closed",
      openDate: r.od || "",
      closeDate: r.cd || "",
      ageRange: r.al != null && r.ah != null ? r.al + "–" + r.ah : "",
      gender: r.g || "",
      pupils: r.np != null ? String(r.np) : "",
      capacity: r.cap != null ? String(r.cap) : "",
      censusDate: r.cen || "",
      trust: r.tr || "",
      trustCode: r.trc || "",
      ukprn: r.uk || "",
      addressParts,
      address: addressParts.join(", "),
      postcode: r.pc || "",
      phone: r.tel || "",
      website: r.w || "",
      region: r.rg || "",
      successors: (r.suc || []).map(String),
      giasUrl: GIAS_PAGE + encodeURIComponent(urn),
      source: "gias"
    };
  }

  // ── Lookups ───────────────────────────────────────────────────────────────
  async function byURN(urn) {
    urn = String(parseInt(urn, 10));
    let shard;
    try {
      shard = await getJSON(DATA + "urn/" + String(urn % SHARDS).padStart(2, "0") + ".json");
    } catch (e) {
      throw new LookupError("The school data could not be loaded. Check your internet connection and try again.", "network");
    }
    return shard[urn] ? normalise(urn, shard[urn]) : null;
  }

  async function byLAESTAB(la, en) {
    let idx;
    try { idx = await getJSON(DATA + "laestab/" + la + ".json"); }
    catch (e) {
      if (e.status === 404) return null; // no such local authority code
      throw new LookupError("The school data could not be loaded. Check your internet connection and try again.", "network");
    }
    const urns = idx[en];
    return urns && urns.length ? byURN(urns[0]) : null; // open school listed first
  }

  // Returns { school } or { results } (name search). Throws LookupError.
  async function find(input) {
    const q = parseQuery(input);
    if (q.error) throw new LookupError(q.error, "invalid");
    let school = null;
    if (q.kind === "laestab") school = await byLAESTAB(q.la, q.en);
    else if (q.kind === "urn") school = await byURN(q.urn);
    else if (q.kind === "either") school = (await byLAESTAB(q.la, q.en)) || (await byURN(q.urn));
    else if (q.kind === "name") {
      const results = await searchNames(q.text);
      if (!results.length) throw new LookupError(`No open school found with a name matching "${q.text}".`, "notfound");
      return { results };
    }
    if (!school) {
      const what = q.kind === "urn" ? "URN " + q.urn
        : q.kind === "laestab" ? "DfE number " + q.la + "/" + q.en
        : q.urn + " as a URN or DfE number";
      throw new LookupError(`No school found for ${what}. Check the number and try again. Schools that closed more than 10 years ago are not included.`, "notfound");
    }
    return { school };
  }

  async function searchNames(text, limit) {
    let names;
    try { names = await getJSON(DATA + "names.json"); }
    catch (e) { throw new LookupError("Search by name is not available right now. Try the URN or DfE number instead.", "network"); }
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const [urn, name, town, postcode, laestab] of names) {
      const hay = (name + " " + town + " " + postcode).toLowerCase();
      if (words.every(w => hay.includes(w))) {
        out.push({ urn: String(urn), name, town, postcode, dfeNumber: laestab ? laestab.slice(0, 3) + "/" + laestab.slice(3) : "" });
        if (out.length >= (limit || 20)) break;
      }
    }
    return out;
  }

  // ── Trusts ───────────────────────────────────────────────────────────────
  // Search by trust name (all words must match) or by group UID (exact).
  // Returns [{ uid, name, urns: [String] }].
  async function searchTrusts(text, limit) {
    let trusts;
    try { trusts = await getJSON(DATA + "trusts.json"); }
    catch (e) { throw new LookupError("Trust search is not available right now. Please try again later.", "network"); }
    const q = String(text || "").trim();
    if (!q) return [];
    const toObj = ([uid, name, urns]) => ({ uid: String(uid), name, urns: urns.map(String) });
    if (/^\d+$/.test(q)) {
      const hit = trusts.find(t => String(t[0]) === q);
      return hit ? [toObj(hit)] : [];
    }
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const t of trusts) {
      const name = t[1].toLowerCase();
      if (words.every(w => name.includes(w))) {
        out.push(toObj(t));
        if (out.length >= (limit || 20)) break;
      }
    }
    return out;
  }

  // Full school records for a trust (by UID), in name order. Throws if unknown.
  // The URNs are grouped by shard so each shard file is requested once, all in
  // parallel (and reused from the cache if already loaded). A large trust can
  // need dozens of shards, so onProgress(partial) is called as each one
  // arrives, with partial = { uid, name, urns, schools (so far, name order),
  // loaded, total } (shard counts), letting the page show schools as they come in.
  async function trustSchools(uid, onProgress) {
    const [trust] = await searchTrusts(String(uid));
    if (!trust) throw new LookupError(`No trust found with UID ${uid}.`, "notfound");
    const byShard = new Map();
    trust.urns.forEach(u => {
      const urn = String(parseInt(u, 10));
      const k = String(urn % SHARDS).padStart(2, "0");
      if (!byShard.has(k)) byShard.set(k, []);
      byShard.get(k).push(urn);
    });
    const schools = [];
    const byName = (a, b) => a.name.localeCompare(b.name, "en-GB");
    let loaded = 0;
    await Promise.all(Array.from(byShard, async ([k, urns]) => {
      let found;
      try {
        const shard = await getJSON(DATA + "urn/" + k + ".json");
        found = urns.map(u => (shard[u] ? normalise(u, shard[u]) : null));
      } catch (e) {
        // Local data unavailable: look each school up one by one (archived service)
        found = await Promise.all(urns.map(u => byURN(u).catch(() => null)));
      }
      found.forEach(s => { if (s) schools.push(s); });
      loaded++;
      if (onProgress) {
        try { onProgress({ ...trust, schools: schools.slice().sort(byName), loaded, total: byShard.size }); }
        catch (e) { /* a display problem must not stop the load */ }
      }
    }));
    schools.sort(byName);
    return { ...trust, schools };
  }

  function meta() { return getJSON(DATA + "meta.json").catch(() => null); }

  // ── Shared profile ────────────────────────────────────────────────────────
  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      return p && p.urn ? p : null;
    } catch (e) { return null; }
  }
  function saveProfile(school) {
    const p = { ...school, selectedAt: new Date().toISOString() };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
    return p;
  }
  function clearProfile() {
    try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* ignore */ }
  }

  // Map of each tracker's field name -> profile field name
  const DFE_FIELDS = {
    schoolName: "name", schoolURN: "urn", schoolDfENumber: "dfeNumber", schoolPhase: "phase",
    schoolType: "type", schoolLA: "la", schoolTrust: "trust", schoolPupils: "pupils",
    schoolAddress: "address", schoolPhone: "phone", schoolWebsite: "website"
  };
  const CE_FIELDS = {
    orgName: "name", orgURN: "urn", orgDfENumber: "dfeNumber", orgTrust: "trust", orgPupils: "pupils"
  };

  // Copy profile values into target. With overwrite=false only empty fields
  // are filled; with overwrite=true the school fields are replaced. Returns the number of fields changed.
  function applyTo(target, map, profile, overwrite) {
    let changed = 0;
    Object.entries(map).forEach(([k, pk]) => {
      const v = profile[pk] == null ? "" : String(profile[pk]);
      // Replacing: set every field, including blanks, so nothing from the old
      // school is left behind. Filling: only set empty fields.
      const write = overwrite ? target[k] !== v : !!v && !String(target[k] || "").trim();
      if (write) { target[k] = v; changed++; }
    });
    return changed;
  }

  // Does a tracker hold a different school from the profile?
  function differs(trackerURN, trackerName, profile) {
    const u = String(trackerURN || "").trim();
    if (u) return u !== String(profile.urn);
    const n = String(trackerName || "").trim().toLowerCase();
    return !!n && n !== String(profile.name || "").toLowerCase();
  }

  // Safe link for GIAS website values, which often have no scheme
  function websiteHref(w) {
    w = String(w || "").trim();
    if (!w) return "";
    if (!/^https?:\/\//i.test(w)) w = "https://" + w;
    try { const u = new URL(w); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch (e) { return ""; }
  }

  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
  }

  window.SchoolLookup = {
    PROFILE_KEY, DFE_FIELDS, CE_FIELDS, LookupError,
    parseQuery, find, byURN, byLAESTAB, searchNames, searchTrusts, trustSchools, meta,
    loadProfile, saveProfile, clearProfile, applyTo, differs, websiteHref, formatDate
  };
})();

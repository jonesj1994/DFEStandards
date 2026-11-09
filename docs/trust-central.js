// Trust central team and central answers, set on the trust overview's
// "Trust central" page and used across all the trust's schools.
//
//   people   the trust's central staff [{ id, name, role }]. Added to a school's
//            People list (marked central) when the trust opens it in the tracker.
//   answers  { "<DfE standard id>": { rating, notes, recommendations, owner,
//            date, dateType } } for standards handled centrally.
//
// applyToState() fills a DfE tracker state from the central answers, ONLY where
// the school has nothing yet: a rating that is Not Set, or an empty note,
// recommendation, owner or date. It never overwrites a school's own answers.
//
// Stored in this browser (localStorage "trust_central_v1"), validated on load.
// Needs data.js (STANDARDS_DATA) and assessment-model.js.
(function () {
  "use strict";
  const KEY = "trust_central_v1";
  const MAX_PEOPLE = 100;
  const MAX_NAME = 100;
  const MAX_TEXT = 20000;
  const RATINGS = ["Not Set", "Red", "Amber", "Green"];
  const AM = window.AssessmentModel;
  const hasOwn = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);

  function itemIds() {
    const ids = new Set();
    (typeof STANDARDS_DATA !== "undefined" ? STANDARDS_DATA : []).forEach(c => c.items.forEach(i => ids.add(i.id)));
    return ids;
  }

  const clip = (v, n) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
  const text = v => (typeof v === "string" ? v.slice(0, MAX_TEXT) : "");
  const label = p => (p.role ? `${p.name} (${p.role})` : p.name);
  const newId = () => "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  function cleanPeople(list) {
    const out = [], seen = new Set(), ids = new Set();
    if (!Array.isArray(list)) return out;
    for (const p of list) {
      if (out.length >= MAX_PEOPLE) break;
      if (!p || typeof p !== "object") continue;
      const name = clip(p.name, MAX_NAME), role = clip(p.role, MAX_NAME);
      if (!name) continue;
      let id = typeof p.id === "string" && /^c[a-z0-9]{1,20}$/.test(p.id) ? p.id : newId();
      while (ids.has(id)) id = newId();
      const person = { id, name, role };
      const k = label(person).toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); ids.add(id);
      out.push(person);
    }
    return out;
  }

  function cleanAnswer(a) {
    if (!a || typeof a !== "object") return null;
    const out = {
      rating: RATINGS.includes(a.rating) ? a.rating : "Not Set",
      notes: text(a.notes),
      recommendations: text(a.recommendations),
      owner: clip(a.owner, 2 * MAX_NAME + 3),
      date: AM ? AM.validDate(a.date) : "",
      dateType: AM ? AM.validDateType(a.dateType) : ""
    };
    if (!out.date) out.dateType = "";
    return out;
  }

  function load() {
    const out = { people: [], answers: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
      out.people = cleanPeople(raw.people);
      const ids = itemIds();
      if (raw.answers && typeof raw.answers === "object") {
        Object.keys(raw.answers).forEach(id => {
          if (!ids.has(id) || !hasOwn(raw.answers, id)) return;
          const a = cleanAnswer(raw.answers[id]);
          if (a) out.answers[id] = a;
        });
      }
    } catch (e) { /* use empty */ }
    return out;
  }

  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify({ people: cleanPeople(c.people), answers: c.answers })); return true; }
    catch (e) { return false; }
  }

  function answerCount(c) { return Object.keys((c || load()).answers).length; }

  // Add the central team to a tracker People list (marked central), without
  // duplicating anyone already there. Returns the new list.
  function mergePeople(list, c) {
    const out = Array.isArray(list) ? list.filter(p => p && typeof p === "object") : [];
    const have = new Set(out.map(p => label({ name: String(p.name || ""), role: String(p.role || "") }).toLowerCase()));
    (c || load()).people.forEach(p => {
      if (have.has(label(p).toLowerCase())) {
        const ex = out.find(x => label({ name: String(x.name || ""), role: String(x.role || "") }).toLowerCase() === label(p).toLowerCase());
        if (ex) ex.central = true;
        return;
      }
      out.push({ id: "p" + p.id.slice(1), name: p.name, role: p.role, central: true });
      have.add(label(p).toLowerCase());
    });
    return out;
  }

  // Fill a DfE tracker state from the central answers, only where it is empty.
  // Returns the number of fields filled.
  function applyToState(state, c) {
    c = c || load();
    let n = 0;
    ["ratings", "notes", "recommendations", "ownership", "targetDates", "dateTypes"].forEach(f => {
      if (!state[f] || typeof state[f] !== "object") state[f] = {};
    });
    Object.keys(c.answers).forEach(id => {
      const a = c.answers[id];
      const blank = v => !String(v == null ? "" : v).trim();
      if (a.rating !== "Not Set" && (!state.ratings[id] || state.ratings[id] === "Not Set")) { state.ratings[id] = a.rating; n++; }
      if (a.notes.trim() && blank(state.notes[id])) { state.notes[id] = a.notes; n++; }
      if (a.recommendations.trim() && blank(state.recommendations[id])) { state.recommendations[id] = a.recommendations; n++; }
      if (a.owner && blank(state.ownership[id])) { state.ownership[id] = a.owner; n++; }
      if (a.date && blank(state.targetDates[id])) { state.targetDates[id] = a.date; state.dateTypes[id] = a.dateType || ""; n++; }
    });
    if (c.people.length) state.people = mergePeople(state.people, c);
    return n;
  }

  window.TrustCentral = { KEY, load, save, cleanPeople, cleanAnswer, label, newId, answerCount, mergePeople, applyToState, RATINGS };
})();

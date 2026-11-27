// Generates the fictional demo data in docs/samples (an individual school and
// a 6-school trust) and exports it through the site's own code, so the files
// import exactly like real exports. Every name, URN (99999x) and detail is
// made up and marked TEST DATA.
//
// Usage, from the repo root:
//   (cd docs && python3 -m http.server 8765) &
//   node scripts/demo/make_demo_data.js http://localhost:8765/ /path/to/output
// then zip <output>/trust into docs/samples/Example_Learning_Trust_TEST_DATA.zip
// and copy <output>/school/*.xlsx into docs/samples/. Needs Playwright.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const BASE = process.argv[2], OUT = process.argv[3];
const DOCS = path.join(__dirname, "..", "..", "docs") + "/";
const load = (file, name) => { eval(fs.readFileSync(DOCS + file, "utf8").replace(new RegExp("^const " + name, "m"), "global." + name)); };
load("data.js", "STANDARDS_DATA"); load("dfe-howto.js", "HOWTO");
eval(fs.readFileSync(DOCS + "ce-data.js", "utf8").replace(/^const /gm, "global."));
const demo = require("./oakfield-answers.js");

// Seeded random numbers, so the data is the same every run
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const TODAY = new Date(Date.UTC(2026, 10, 27));
const iso = d => d.toISOString().slice(0, 10);
const addDays = n => iso(new Date(TODAY.getTime() + n * 86400000));
const label = p => (p.role ? `${p.name} (${p.role})` : p.name);
const RAG = { G: "Green", A: "Amber", R: "Red" };

const CENTRAL = [
  { name: "Sam Lee", role: "Trust IT Director" },
  { name: "Priya Shah", role: "Trust Data Protection Officer" }
];

// Who usually owns each area: keys into a school's staff list
const AREA_OWNER = {
  "broadband": ["bm"], "cloud-solution": ["it"], "cyber-security": ["it", "bm"], "digital-accessibility": ["senco"],
  "digital-leadership": ["head", "deputy"], "filtering-monitoring": ["dsl"], "laptops-desktops-tablets": ["it"],
  "network-cabling": ["central-it"], "network-switching": ["central-it"], "servers-storage": ["central-it", "it"],
  "it-support": ["bm"], "wireless-network": ["central-it"]
};

function dfeState(sch, inTrust) {
  const r = rng(sch.seed);
  const staff = sch.staff;
  const people = [
    ...Object.values(staff).map(p => ({ name: p.name, role: p.role })),
    ...(inTrust ? CENTRAL : [])
  ];
  const ownerFor = (catId, i) => {
    const keys = AREA_OWNER[catId] || ["bm"];
    const pick = k => k === "central-it" ? (inTrust ? label(CENTRAL[0]) : label(staff.it)) : label(staff[k] || staff.bm);
    const owners = [pick(keys[i % keys.length])];
    // Filtering is shared by the DSL and IT; some cyber standards by two people
    if (catId === "filtering-monitoring") owners.push(inTrust && i % 2 === 0 ? label(CENTRAL[0]) : label(staff.it));
    if (catId === "cyber-security" && i === 6) owners.push(label(staff.head));
    if (inTrust && catId === "cloud-solution" && i === 1) owners.push(label(CENTRAL[1]));
    return [...new Set(owners)].join("; ");
  };
  const s = {
    schoolName: sch.name, schoolURN: sch.urn, schoolDfENumber: sch.dfe, schoolPhase: sch.phase, schoolType: sch.type,
    schoolLA: "Exampleshire", schoolTrust: inTrust ? "Example Learning Trust (TEST DATA)" : "", schoolPupils: String(sch.pupils),
    schoolAddress: sch.address, schoolPhone: sch.phone, schoolWebsite: "https://www.example.org.uk",
    assessorName: label(staff.bm), assessmentDate: addDays(-Math.floor(r() * 50) - 5),
    ratings: {}, notes: {}, recommendations: {}, ownership: {}, targetDates: {}, dateTypes: {}, evidenceChecks: {}, ratingSource: {},
    people
  };
  STANDARDS_DATA.forEach(cat => cat.items.forEach((item, i) => {
    const id = item.id, h = HOWTO[id], d = demo.items[id];
    let x = r();
    // Safeguarding is usually stronger; the less-assessed schools leave gaps
    const m = cat.id === "filtering-monitoring" ? Math.min(0.95, sch.maturity + 0.2) : sch.maturity;
    let rating;
    if (r() < sch.notSet) rating = "Not Set";
    else rating = x < m ? "Green" : x < m + (1 - m) * 0.6 ? "Amber" : "Red";
    if (sch.noRed && rating === "Red") rating = "Amber";   // the model school has nothing Red
    if (sch.force && sch.force[id]) rating = sch.force[id];
    s.ratings[id] = rating;
    if (rating === "Not Set") return;
    const ex = h.examples.find(e => /quick win/i.test(e.label)) || h.examples[h.examples.length - 1];
    const model = sch.phase === "Secondary" ? h.examples[1] : h.examples[0];
    const demoRating = d ? RAG[d[0]] : "";
    if (rating === "Green") {
      s.notes[id] = demoRating === "Green" ? d[1] : "In place. " + model.text;
      s.recommendations[id] = demoRating === "Green" ? d[2] : "";
    } else {
      s.notes[id] = demoRating && demoRating !== "Green" ? (rating === "Red" && demoRating === "Amber" ? "Not in place yet. " : "") + d[1]
        : rating === "Amber" ? "Partly in place: some arrangements exist but they are not complete or not written down." : "Not in place yet.";
      s.recommendations[id] = demoRating && demoRating !== "Green" && d[2] ? d[2] : ex.text;
    }
    s.ownership[id] = ownerFor(cat.id, i);
    // Dates: Next review for Green, Complete by for the rest (some overdue)
    if (rating === "Green") { s.dateTypes[id] = "review"; s.targetDates[id] = addDays(150 + Math.floor(r() * 220)); }
    else { s.dateTypes[id] = "complete"; s.targetDates[id] = addDays(Math.floor(r() * 300) - (r() < sch.overdue ? 120 : 10)); }
    // Evidence ticks match the rating
    const ev = h.evidence.map(e => e.id);
    if (rating === "Green") s.evidenceChecks[id] = ev.slice();
    else if (rating === "Amber") s.evidenceChecks[id] = ev.slice(0, Math.max(1, Math.min(ev.length - 1, Math.round(ev.length * (0.3 + r() * 0.4)))));
    if (s.evidenceChecks[id] && r() < 0.5) s.ratingSource[id] = "evidence";
  }));
  return s;
}

function ceState(sch) {
  const r = rng(sch.seed + 7);
  const s = { org: {
    orgName: sch.name, orgURN: sch.urn, orgDfENumber: sch.dfe, orgTrust: sch.trust ? "Example Learning Trust (TEST DATA)" : "", orgPupils: String(sch.pupils),
    scopeDescription: "Whole organisation: all staff and pupil devices, the school network and Microsoft 365.",
    certLevel: sch.ce.level || "", certBody: sch.ce.body || "", certNumber: sch.ce.number || "",
    certDate: sch.ce.certDate || "", renewalDate: sch.ce.renewal || "",
    assessorName: label(sch.staff.bm), assessmentDate: addDays(-20)
  }, status: {}, evidence: {}, actions: {}, owner: {} };
  CE_DATA.forEach(cat => cat.items.forEach(item => {
    const x = r(), m = sch.ce.maturity;
    const st = cat.id === "recommended" ? (x < 0.5 ? "Met" : "Not Set")
      : sch.ce.allMet ? (r() < 0.1 ? "N/A" : "Met")
      : x < m ? (r() < 0.1 ? "N/A" : "Met") : x < m + (1 - m) * 0.6 ? "Partially Met" : "Not Met";
    s.status[item.id] = st;
    if (st === "Met") s.evidence[item.id] = "In place and checked by IT support during the last review.";
    if (st === "Partially Met") { s.evidence[item.id] = "Partly in place: not yet on every device or account."; s.actions[item.id] = "Finish rolling this out and record the evidence."; }
    if (st === "Not Met") s.actions[item.id] = "Not in place yet: agree a plan with IT support.";
    if (st !== "Not Set") s.owner[item.id] = label(sch.trust && /fw|sum|mp/.test(item.id) ? CENTRAL[0] : sch.staff.it);
  }));
  return s;
}

const staff = (head, bm, dsl, senco, it, deputy) => ({
  head: { name: head, role: "Headteacher" }, bm: { name: bm, role: "School Business Manager" },
  dsl: { name: dsl, role: "Designated Safeguarding Lead" }, senco: { name: senco, role: "SENCO" },
  it: { name: it, role: "IT Technician" }, deputy: { name: deputy, role: "Deputy Headteacher" }
});

const TRUST = [
  { name: "Ashgrove Demo Primary School (TEST DATA)", urn: "999990", dfe: "999/2001", phase: "Primary", type: "Academy converter", pupils: 210,
    address: "1 Ashgrove Road, Exampletown, EX1 1AA", phone: "01234 500001", seed: 11, maturity: 0.9, notSet: 0, overdue: 0.1, noRed: true,
    staff: staff("Helen Ward", "Tom Price", "Rachel Hughes", "Aisha Khan", "Ben Carter", "Mark Ellis"),
    ce: { maturity: 0.95, allMet: true, level: "Cyber Essentials", body: "Example Certification Body", number: "CE-TEST-0001", certDate: "2026-03-10", renewal: "2027-03-10" } },
  { name: "Beechwood Demo Primary School (TEST DATA)", urn: "999991", dfe: "999/2002", phase: "Primary", type: "Academy converter", pupils: 420,
    address: "2 Beechwood Lane, Exampletown, EX1 1AB", phone: "01234 500002", seed: 22, maturity: 0.6, notSet: 0, overdue: 0.25,
    staff: staff("Gareth Owen", "Lisa Moore", "Kate Bennett", "Sunita Patel", "Dan Wright", "Emma Hall"),
    ce: { maturity: 0.6, level: "Cyber Essentials" } },
  { name: "Cedar Park Demo Academy (TEST DATA)", urn: "999992", dfe: "999/4001", phase: "Secondary", type: "Academy converter", pupils: 1150,
    address: "3 Cedar Park Avenue, Exampletown, EX1 1AC", phone: "01234 500003", seed: 33, maturity: 0.55, notSet: 0, overdue: 0.3,
    staff: staff("Dr Paul Fisher", "Angela Reid", "Joanne Clarke", "Michael Brown", "Chris Taylor", "Nadia Ahmed"),
    ce: { maturity: 0.8, level: "Cyber Essentials Plus", body: "Example Certification Body", number: "CEP-TEST-0002", certDate: "2025-12-15", renewal: "2026-12-15" } },
  { name: "Danesfield Demo Infant School (TEST DATA)", urn: "999993", dfe: "999/2003", phase: "Primary", type: "Academy sponsor led", pupils: 180,
    address: "4 Danesfield Close, Exampletown, EX1 1AD", phone: "01234 500004", seed: 44, maturity: 0.35, notSet: 0.05, overdue: 0.4,
    staff: staff("Claire Morgan", "Steve Collins", "Claire Morgan", "Fiona Grant", "External IT support", "Jenny Lowe"),
    force: { "filtering-2": "Red" } },
  { name: "Elmhurst Demo Junior School (TEST DATA)", urn: "999994", dfe: "999/2004", phase: "Primary", type: "Academy converter", pupils: 240,
    address: "5 Elmhurst Street, Exampletown, EX1 1AE", phone: "01234 500005", seed: 55, maturity: 0.25, notSet: 0.45, overdue: 0.2,
    staff: staff("Ian Shaw", "Mandy Fox", "Lucy Webb", "Omar Hassan", "Gary Mills", "Sophie Turner") },
  { name: "Fernbrook Demo Primary School (TEST DATA)", urn: "999995", dfe: "999/2005", phase: "Primary", type: "Free school", pupils: 315,
    address: "6 Fernbrook Way, Exampletown, EX1 1AF", phone: "01234 500006", seed: 66, maturity: 0.72, notSet: 0, overdue: 0.5,
    staff: staff("Natalie Green", "Robert King", "Hannah Scott", "Priyanka Desai", "Luke Adams", "Owen Jones"),
    force: { "filtering-4": "Amber", "cyber-1": "Red" } }
].map(s => Object.assign(s, { trust: true }));

(async () => {
  fs.mkdirSync(OUT + "/trust", { recursive: true });
  fs.mkdirSync(OUT + "/school", { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(BASE + "dfe.html");
  const writeDfe = async (state, dir) => {
    const res = await p.evaluate(st => { const { wb, filename } = buildDfeWorkbook(st); return { filename, b64: XLSX.write(wb, { bookType: "xlsx", type: "base64" }) }; }, state);
    fs.writeFileSync(path.join(dir, res.filename.replace(/_\d{4}-\d{2}-\d{2}\.xlsx$/, ".xlsx")), Buffer.from(res.b64, "base64"));
    return res.filename;
  };
  const writeCe = async (state, dir) => {
    await p.goto(BASE + "ce.html");
    await p.evaluate(st => localStorage.setItem("ce_tracker_v1", JSON.stringify(st)), state);
    await p.reload();
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#btn-export")]);
    const name = dl.suggestedFilename().replace(/_\d{4}-\d{2}-\d{2}\.xlsx$/, ".xlsx");
    await dl.saveAs(path.join(dir, name));
    await p.goto(BASE + "dfe.html");
    return name;
  };
  for (const sch of TRUST) {
    console.log("trust:", await writeDfe(dfeState(sch, true), OUT + "/trust"));
    if (sch.ce) console.log("trust CE:", await writeCe(ceState(sch), OUT + "/trust"));
  }
  // Individual school: Oakfield, from the existing demo answers, with the newer features
  const oak = { name: "Oakfield Demo Primary School (TEST DATA)", urn: "999999", dfe: "999/9999", phase: "Primary", type: "Academy converter", pupils: 420,
    staff: staff("Sam Patel", "Alex Taylor", "Chris Morgan", "Taylor Brooks", "Riley Evans", "Jordan Lee"),
    ce: { maturity: 0.7, level: "Cyber Essentials", body: "Example Certification Body", number: "CE-TEST-0099", certDate: "2025-12-01", renewal: "" }, seed: 99 };
  const PEOPLE = {
    "Business Manager": ["Alex Taylor", "School Business Manager"], "Headteacher": ["Sam Patel", "Headteacher"],
    "Deputy Headteacher": ["Jordan Lee", "Deputy Headteacher"], "DSL": ["Chris Morgan", "Designated Safeguarding Lead"],
    "DSL / IT Lead": ["Chris Morgan", "Designated Safeguarding Lead"], "IT Lead": ["Jordan Lee", "Deputy Headteacher"],
    "IT Support (Example IT Ltd)": ["Riley Evans", "Example IT Ltd"], "Data Protection Officer": ["Morgan Hughes", "Data Protection Officer"],
    "SENCO": ["Taylor Brooks", "SENCO"], "Office Manager": ["Casey Wright", "Office Manager"], "Site Manager": ["Jamie Collins", "Site Manager"]
  };
  const os = Object.assign({}, demo.school, { schoolName: oak.name, assessorName: "Alex Taylor (School Business Manager)",
    ratings: {}, notes: {}, recommendations: {}, ownership: {}, targetDates: {}, dateTypes: {}, evidenceChecks: {}, ratingSource: {} });
  const seen = new Set(); os.people = [];
  Object.values(PEOPLE).forEach(([n, ro]) => { if (!seen.has(n + ro)) { seen.add(n + ro); os.people.push({ name: n, role: ro }); } });
  const r = rng(99);
  Object.entries(demo.items).forEach(([id, d]) => {
    const rating = RAG[d[0]];
    os.ratings[id] = rating; os.notes[id] = d[1]; os.recommendations[id] = d[2];
    const pp = PEOPLE[d[3]]; let owner = pp ? `${pp[0]} (${pp[1]})` : d[3];
    if (id.startsWith("filtering-")) owner += "; Riley Evans (Example IT Ltd)";       // DSL and IT share filtering
    if (id === "cyber-7") owner += "; Sam Patel (Headteacher)";
    os.ownership[id] = owner;
    os.dateTypes[id] = d[4] === "r" ? "review" : "complete"; os.targetDates[id] = d[5];
    const ev = HOWTO[id].evidence.map(e => e.id);
    if (rating === "Green") os.evidenceChecks[id] = ev.slice();
    else if (rating === "Amber") os.evidenceChecks[id] = ev.slice(0, Math.max(1, ev.length - 1));
    if (os.evidenceChecks[id] && r() < 0.5) os.ratingSource[id] = "evidence";
  });
  console.log("school:", await writeDfe(os, OUT + "/school"));
  console.log("school CE:", await writeCe(ceState(Object.assign(oak, { trust: false })), OUT + "/school"));
  console.log("errors:", errs);
  await b.close();
})();

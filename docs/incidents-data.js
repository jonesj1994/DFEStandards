// Cyber incident and breach log: field definitions, sources and checks.
//
// Shared by incidents.html (incidents-app.js) and the home page tile
// (incidents-home.js), so everything here is plain data and pure functions
// with no page code. See docs/INCIDENT-LOG.md for the reasoning behind each
// field and rule.
//
// Load order: assessment-model.js (optional, for limitText), then this file.
//
// DATA MINIMISATION: this log records what happened and who was told. It must
// never become a second copy of the breached data, so fields ask for the TYPES
// and NUMBER of people affected, never names, passwords or the data itself.
(function () {
  "use strict";

  const STATE_KEY = "incident_log_v1";
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 2000;                 // far more than any school will log
  const MAX_ACTIONS = 30;                 // follow-up actions per incident
  const MAX_TEXT = 20000;                 // characters per text field (same as the trackers)
  const HOUR = 3600 * 1000;

  // ── Thresholds for the checks (see INCIDENT-LOG.md) ───────────────────────
  const THRESHOLDS = Object.freeze({
    icoDeadlineHours: 72,                 // UK GDPR Article 33(1): "not later than 72 hours after having become aware"
    icoWarnHours: 24,                     // Red when the ICO deadline is this close (or has passed)
    assessWithinHours: 24,                // Red when a possible personal data breach is still unassessed after this
    openWarnDays: 30                      // Amber when an incident has been open this long
  });

  // ── Sources ───────────────────────────────────────────────────────────────
  const GOVUK = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/";
  const CYBER = GOVUK + "cyber-security-core-standard";
  const LEAD = GOVUK + "digital-leadership-and-governance-core-standard";
  const LEG = "https://www.legislation.gov.uk/eur/2016/679/article/";
  const SOURCES = {
    "dfe-report": { short: "DfE cyber security: Report cyber attacks", url: CYBER, tracker: "dfe", item: "cyber-7" },
    "dfe-risk": { short: "DfE cyber security: Conduct a cyber risk assessment annually and review every term", url: CYBER, tracker: "dfe", item: "cyber-1" },
    "dfe-awareness": { short: "DfE cyber security: Create and implement a cyber awareness plan for students and staff", url: CYBER, tracker: "dfe", item: "cyber-2" },
    "dfe-backup": { short: "DfE cyber security: Develop and implement a plan to back up your data", url: CYBER, tracker: "dfe", item: "cyber-6" },
    "dfe-continuity": { short: "DfE digital leadership: Include digital technology within disaster recovery and business continuity plans", url: LEAD, tracker: "dfe", item: "leadership-3" },
    "dp-breach": { short: "DfE Data protection in schools: Managing breaches of data", url: "https://www.gov.uk/guidance/data-protection-in-schools/managing-breaches-of-data" },
    "gdpr-4": { short: "UK GDPR Article 4(12) (definition of a personal data breach)", url: LEG + "4" },
    "gdpr-33": { short: "UK GDPR Article 33 (notifying the ICO, and recording every breach)", url: LEG + "33" },
    "gdpr-34": { short: "UK GDPR Article 34 (telling the people affected)", url: LEG + "34" },
    "ncsc-response": { short: "NCSC Incident management: cyber incident response processes", url: "https://www.ncsc.gov.uk/collection/incident-management/cyber-incident-response-processes" },
    "rpa-rules": { short: "RPA membership rules for academy trusts (September 2026), Section 14 Cyber", url: "https://assets.publishing.service.gov.uk/media/6a7c63be783bd442d7805caa/rpa-membership-rules-academy-september-2026.pdf" },
    "rpa-claim": { short: "DfE: Make a claim through the Risk Protection Arrangement (RPA)", url: "https://www.gov.uk/guidance/make-a-claim-through-the-risk-protection-arrangement-rpa" }
  };

  // ── Option lists ──────────────────────────────────────────────────────────
  const TYPES = [
    "Phishing or suspicious email", "Malware or ransomware", "Account compromise",
    "Unauthorised access to systems or data", "Personal data sent to the wrong person",
    "Lost or stolen device or paperwork", "Denial of service", "Website defacement",
    "Physical security incident", "Supplier or third-party incident", "Other"
  ];
  // Types that are cyber incidents or attacks for the DfE "Report cyber attacks" checks
  const CYBER_TYPES = [
    "Phishing or suspicious email", "Malware or ransomware", "Account compromise",
    "Unauthorised access to systems or data", "Denial of service", "Website defacement",
    "Supplier or third-party incident"
  ];
  const OUTCOME_NEAR_MISS = "Attempt stopped (near miss, no breach or damage)";
  const OUTCOME_BREACHED = "Security breached or damage caused";
  const OUTCOME_UNKNOWN = "Not known yet";
  const OUTCOMES = [OUTCOME_NEAR_MISS, OUTCOME_BREACHED, OUTCOME_UNKNOWN];
  const STATUSES = ["Open", "Contained", "Resolved", "Closed"];
  const OPEN_STATUSES = ["Open", "Contained"];
  const PDB = ["Yes", "No", "Under assessment"];
  const PEOPLE = ["Pupils", "Staff", "Parents and carers", "Governors, trustees or volunteers", "Other people"];
  const DATA_TYPES = [
    "Names and contact details", "Dates of birth or ID numbers", "Sign-in details",
    "Attendance, assessment or education records", "Financial or bank details",
    "Special category (health, SEND, ethnicity, religion, biometrics)",
    "Safeguarding or child protection information", "Criminal offence information",
    "Photos or video", "Other"
  ];
  const RISK_NONE = "Unlikely to result in a risk to people";
  const RISK_SOME = "A risk to people (not high)";
  const RISK_HIGH = "High risk to people";
  const RISK = [RISK_NONE, RISK_SOME, RISK_HIGH];
  const ICO = ["Submitted", "Not required", "Not submitted yet"];
  const INFORMED = ["Informed", "Not required", "Not informed yet"];
  const REPORT = ["Reported", "Not needed", "Not reported yet"];
  const PLAN_USED = ["Yes", "No", "No plan in place"];
  const BACKUP_USED = ["Yes", "No", "Not needed"];
  const RA_UPDATED = ["Yes", "Not yet", "Not needed"];
  const TRAINING = ["Yes, planned", "Yes, done", "Not needed"];
  // School-level setting: which cover applies (decides the RPA check)
  const COVER_RPA = "RPA (DfE Risk Protection Arrangement)";
  const COVER = [COVER_RPA, "Commercial cyber insurance", "None", "Not sure"];

  const isCyber = e => CYBER_TYPES.includes(e.type);
  // DfE: report incidents "where any security breaches may have taken place"
  const mayBeBreached = e => isCyber(e) && (e.outcome === OUTCOME_BREACHED || e.outcome === OUTCOME_UNKNOWN);
  const pdbYes = e => e.pdb === "Yes";
  const pdbMaybe = e => e.pdb === "Yes" || e.pdb === "Under assessment";

  // ── Fields ────────────────────────────────────────────────────────────────
  // type: text | textarea | select | date | datetime | checks | actions
  // basis: "required" = a standard or the law asks for this; "good" = good practice.
  // showIf: the field only applies when this returns true (it is hidden otherwise).
  // pii: true = the form warns if the text looks like a name list, email address or password.
  const GROUPS = [
    {
      id: "basics", title: "The incident",
      intro: "When it was found and what kind of incident it is. Use roles, not names.",
      fields: [
        { key: "ref", label: "Reference", type: "text", basis: "required", refs: ["dfe-report", "gdpr-33"],
          help: "Filled in for you. Use it in emails and reports instead of anyone's name." },
        { key: "title", label: "Short title", type: "text", basis: "required", refs: ["dfe-report"], pii: true,
          help: "A few words, e.g. \"Phishing email to the office\" or \"Report sent to the wrong parent\". No names.", placeholder: "e.g. Phishing email to the office" },
        { key: "discoveredAt", label: "Date and time discovered", type: "datetime", basis: "required", refs: ["gdpr-33", "dfe-report"],
          help: "When the school first knew something had happened. The ICO 72-hour clock is worked out from this (or from the date below, if later)." },
        { key: "occurredAt", label: "Date and time it happened (if known)", type: "datetime", basis: "good", refs: ["ncsc-response"],
          help: "Leave blank if you don't know yet." },
        { key: "reportedBy", label: "Reported by (role)", type: "text", basis: "good", refs: ["dfe-report"], pii: true,
          help: "A role is enough, e.g. \"Class teacher\", \"Office manager\" or \"IT support\"." },
        { key: "lead", label: "Who is leading the response (role)", type: "text", basis: "required", refs: ["dfe-report"], pii: true,
          help: "The DfE standard says the SLT digital lead appoints someone to handle formal reporting, e.g. \"SLT digital lead\"." },
        { key: "type", label: "Type of incident", type: "select", options: TYPES, basis: "required", refs: ["dfe-report", "dfe-risk"],
          help: "Pick the closest. Recording the type helps you spot themes for the annual cyber risk assessment." },
        { key: "outcome", label: "Was security breached or damage caused?", type: "select", options: OUTCOMES, basis: "required", refs: ["dfe-report"],
          help: "Near misses are logged too. Attacks where security \"may have\" been breached must be reported to external bodies.",
          showIf: e => isCyber(e) || !e.type, showIfText: "Cyber incidents and attacks" },
        { key: "systems", label: "Systems and services affected", type: "textarea", basis: "required", refs: ["dfe-report", "ncsc-response"],
          help: "Use the names from your software and hardware registers where you can, e.g. \"Microsoft 365 email; office PC 12\"." },
        { key: "description", label: "What happened", type: "textarea", basis: "required", refs: ["gdpr-33", "ncsc-response"], pii: true,
          help: "Describe the facts in general terms. Do not paste the email, the leaked data, passwords or anyone's name." }
      ]
    },
    {
      id: "personal", title: "Personal data",
      intro: "Work through this with your data protection officer (DPO). Record types and approximate numbers only, never names or the data itself.",
      fields: [
        { key: "pdb", label: "Is it a personal data breach?", type: "select", options: PDB, basis: "required", refs: ["gdpr-4", "gdpr-33", "dp-breach"],
          help: "A breach of security leading to personal data being lost, destroyed, changed, disclosed or accessed without permission. Decide quickly: the ICO clock is already running." },
        { key: "awareAt", label: "Date and time you became aware it was a personal data breach", type: "datetime", basis: "good", refs: ["gdpr-33"],
          help: "Only if this was later than the discovery time above. The 72 hours start from when you became aware.",
          showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "people", label: "Whose data was affected", type: "checks", options: PEOPLE, basis: "required", refs: ["gdpr-33"],
          help: "Tick the groups of people. Do not list who they are.", showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "peopleCount", label: "Approximate number of people affected", type: "text", basis: "required", refs: ["gdpr-33"],
          help: "A number or range, e.g. \"About 30\" or \"One class (28)\". Never names.", showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "dataTypes", label: "Types of data involved", type: "checks", options: DATA_TYPES, basis: "required", refs: ["gdpr-33", "dp-breach"],
          help: "Special category and safeguarding information usually means a higher risk.", showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "recordsCount", label: "Approximate number of records", type: "text", basis: "good", refs: ["gdpr-33"],
          help: "e.g. \"One spreadsheet with 30 rows\". Article 33(3)(a) asks for this where possible.", showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "risk", label: "Risk to the people affected", type: "select", options: RISK, basis: "required", refs: ["gdpr-33", "gdpr-34", "dp-breach"],
          help: "Risk means the risk to the people, not to the school. Any risk means telling the ICO; a high risk means telling the people too.",
          showIf: pdbYes, showIfText: "When it is a personal data breach" },
        { key: "riskReason", label: "Why you decided this, and the likely consequences", type: "textarea", basis: "required", refs: ["gdpr-33", "dp-breach"], pii: true,
          help: "Your reasoning, e.g. \"Sent to one parent who deleted it and confirmed in writing\". This is the record UK GDPR Article 33(5) asks for.",
          showIf: pdbYes, showIfText: "When it is a personal data breach" }
      ]
    },
    {
      id: "ico", title: "ICO and the people affected",
      intro: "Report to the ICO within 72 hours of becoming aware, unless the breach is unlikely to result in a risk to people. Record every breach, including ones you do not report.",
      fields: [
        { key: "ico", label: "ICO notification", type: "select", options: ICO, basis: "required", refs: ["gdpr-33", "dp-breach"],
          help: "You can report in phases if you don't have all the details yet.", showIf: pdbMaybe, showIfText: "When it is, or may be, a personal data breach" },
        { key: "icoAt", label: "Date and time submitted to the ICO", type: "datetime", basis: "required", refs: ["gdpr-33"],
          help: "", showIf: e => e.ico === "Submitted", showIfText: "When submitted" },
        { key: "icoRef", label: "ICO reference", type: "text", basis: "good", refs: ["gdpr-33"],
          help: "The case reference the ICO gives you.", showIf: e => e.ico === "Submitted", showIfText: "When submitted" },
        { key: "icoReason", label: "Reason for not reporting to the ICO, or for reporting after 72 hours", type: "textarea", basis: "required", refs: ["gdpr-33"],
          help: "Article 33(5): record the facts, effects and action taken for every breach. Article 33(1): a late report must give reasons for the delay.",
          showIf: e => pdbMaybe(e) && e.ico !== "Not submitted yet", showIfText: "When it is, or may be, a personal data breach" },
        { key: "informed", label: "People affected told?", type: "select", options: INFORMED, basis: "required", refs: ["gdpr-34", "dp-breach"],
          help: "Required without undue delay when the risk is high, so they can protect themselves.", showIf: pdbYes, showIfText: "When it is a personal data breach" },
        { key: "informedAt", label: "Date they were told", type: "date", basis: "required", refs: ["gdpr-34"],
          help: "", showIf: e => pdbYes(e) && e.informed === "Informed", showIfText: "When they were told" },
        { key: "informedReason", label: "Reason for not telling them", type: "textarea", basis: "required", refs: ["gdpr-34"],
          help: "e.g. the data was encrypted, or later action means the high risk is no longer likely (Article 34(3)). Agree this with your DPO.",
          showIf: e => pdbYes(e) && e.informed === "Not required", showIfText: "When telling them is not required" }
      ]
    },
    {
      id: "reporting", title: "Who else was told",
      intro: "The DfE standard lists who to report cyber attacks to. See \"Who to tell\" for contact details.",
      fields: [
        { key: "dpoAt", label: "Data protection officer (DPO) consulted", type: "date", basis: "required", refs: ["dfe-report", "dp-breach"],
          help: "The DPO establishes whether a data breach has occurred and liaises with the ICO." },
        { key: "dslAt", label: "Designated safeguarding lead consulted", type: "date", basis: "good", refs: ["dfe-report"],
          help: "To review whether there are any safeguarding issues." },
        { key: "governors", label: "Governors or trustees", type: "select", options: REPORT, basis: "required", refs: ["dfe-report"],
          help: "The DfE standard says to report the potential incident or attack to the governing body or trustees." },
        { key: "governorsAt", label: "Date governors or trustees were told", type: "date", basis: "good", refs: ["dfe-report"],
          help: "", showIf: e => e.governors === "Reported", showIfText: "When reported" },
        { key: "trust", label: "Trust or local authority", type: "select", options: REPORT, basis: "good", refs: ["dfe-report"],
          help: "Any IT leads in your wider organisation, and Part 6 of the academy trust handbook if you are in a trust." },
        { key: "reportFraud", label: "Report Fraud (formerly Action Fraud)", type: "select", options: REPORT, basis: "required", refs: ["dfe-report"],
          help: "DfE: report cyber incidents where security may have been breached. 0300 123 2040.", showIf: e => isCyber(e) || !e.type, showIfText: "Cyber incidents and attacks" },
        { key: "reportFraudAt", label: "Date reported to Report Fraud", type: "date", basis: "good", refs: ["dfe-report"],
          help: "", showIf: e => e.reportFraud === "Reported", showIfText: "When reported" },
        { key: "reportFraudRef", label: "Report Fraud reference", type: "text", basis: "good", refs: ["dfe-report"],
          help: "The crime reference number.", showIf: e => e.reportFraud === "Reported", showIfText: "When reported" },
        { key: "dfe", label: "DfE sector cyber team", type: "select", options: REPORT, basis: "required", refs: ["dfe-report"],
          help: "Email Sector.Incidentreporting@education.gov.uk.", showIf: e => isCyber(e) || !e.type, showIfText: "Cyber incidents and attacks" },
        { key: "dfeAt", label: "Date the DfE was told", type: "date", basis: "good", refs: ["dfe-report"],
          help: "", showIf: e => e.dfe === "Reported", showIfText: "When reported" },
        { key: "rpa", label: "RPA or cyber insurer", type: "select", options: REPORT, basis: "required", refs: ["dfe-report", "rpa-rules", "rpa-claim"],
          help: "RPA members: call cyber emergency assistance on 0800 368 6378 before spending money on the response.", showIf: e => isCyber(e) || !e.type, showIfText: "Cyber incidents and attacks" },
        { key: "rpaAt", label: "Date the RPA or insurer was told", type: "date", basis: "good", refs: ["rpa-rules"],
          help: "", showIf: e => e.rpa === "Reported", showIfText: "When reported" },
        { key: "rpaRef", label: "RPA or insurer claim reference", type: "text", basis: "good", refs: ["rpa-rules"],
          help: "", showIf: e => e.rpa === "Reported", showIfText: "When reported" },
        { key: "ncsc", label: "National Cyber Security Centre (NCSC)", type: "select", options: REPORT, basis: "good", refs: ["dfe-report"],
          help: "DfE: if the attack causes long-term closure, closes more than one school, or causes serious financial damage.", showIf: e => isCyber(e) || !e.type, showIfText: "Cyber incidents and attacks" },
        { key: "ncscAt", label: "Date reported to the NCSC", type: "date", basis: "good", refs: ["dfe-report"],
          help: "", showIf: e => e.ncsc === "Reported", showIfText: "When reported" },
        { key: "police", label: "Police (other than Report Fraud)", type: "select", options: REPORT, basis: "good", refs: ["dfe-report", "rpa-rules"],
          help: "e.g. a stolen device or a crime in progress. RPA members must tell the police immediately about theft or suspected fraud." },
        { key: "policeRef", label: "Police reference", type: "text", basis: "good", refs: ["dfe-report"],
          help: "", showIf: e => e.police === "Reported", showIfText: "When reported" },
        { key: "notifyReasons", label: "Reasons for any \"Not needed\" decision above", type: "textarea", basis: "required", refs: ["dfe-report", "gdpr-33"],
          help: "Say who decided and why, e.g. \"Near miss, nothing to report, agreed by SLT digital lead\"." }
      ]
    },
    {
      id: "response", title: "Response and recovery",
      intro: "What was done to contain the incident and get back to normal.",
      fields: [
        { key: "planUsed", label: "Cyber response plan followed?", type: "select", options: PLAN_USED, basis: "required", refs: ["dfe-report", "dfe-continuity", "rpa-rules"],
          help: "The plan is part of your business continuity plan, and a condition of RPA cyber cover." },
        { key: "containment", label: "Containment actions", type: "textarea", basis: "required", refs: ["dfe-report", "gdpr-33", "ncsc-response"],
          help: "e.g. \"Password reset and sessions signed out; email recalled; device remotely wiped\"." },
        { key: "recovery", label: "Recovery actions", type: "textarea", basis: "required", refs: ["dfe-continuity", "gdpr-33"],
          help: "How systems and data were restored." },
        { key: "backupUsed", label: "Restored from backup?", type: "select", options: BACKUP_USED, basis: "good", refs: ["dfe-backup"],
          help: "Record which backup in your backup register, and whether the restore worked as expected." },
        { key: "status", label: "Status", type: "select", options: STATUSES, basis: "required", refs: ["ncsc-response"],
          help: "Open: still happening. Contained: stopped from spreading. Resolved: back to normal. Closed: reviewed and lessons recorded." },
        { key: "closedOn", label: "Date closed", type: "date", basis: "good", refs: ["ncsc-response"],
          help: "Filled in when you set the status to Closed.", showIf: e => e.status === "Closed" || e.status === "Resolved", showIfText: "When resolved or closed" }
      ]
    },
    {
      id: "lessons", title: "Lessons learned",
      intro: "Review every incident and near miss, even when there was no risk to people.",
      fields: [
        { key: "rootCause", label: "Root cause", type: "textarea", basis: "required", refs: ["dp-breach", "ncsc-response"],
          help: "How and why it happened, e.g. \"Email address auto-completed to the wrong parent\"." },
        { key: "lessons", label: "Lessons learned", type: "textarea", basis: "required", refs: ["dp-breach", "ncsc-response"],
          help: "Lessons from the incident itself and from how you responded." },
        { key: "actions", label: "Follow-up actions", type: "actions", basis: "required", refs: ["dp-breach", "ncsc-response"],
          help: "Each action with an owner (role) and a due date. Tick when done." },
        { key: "riskAssessment", label: "Cyber risk assessment reviewed?", type: "select", options: RA_UPDATED, basis: "required", refs: ["dfe-risk"],
          help: "The DfE standard says to repeat the risk assessment after an incident or attack." },
        { key: "training", label: "Staff training or awareness follow-up?", type: "select", options: TRAINING, basis: "good", refs: ["dfe-awareness"],
          help: "Training should be more frequent where there is a known cyber risk." },
        { key: "notes", label: "Notes", type: "textarea", basis: "good", refs: [], pii: true,
          help: "Anything else, e.g. where the full investigation file is kept. No names, passwords or copies of data." }
      ]
    }
  ];

  const FIELDS = GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title }, f)));
  // Map with no prototype, filled only from our own field list
  const FIELD_BY_KEY = Object.create(null);
  FIELDS.forEach(f => { FIELD_BY_KEY[f.key] = f; });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasOwn = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
  function limitText(v) {
    if (typeof window !== "undefined" && window.AssessmentModel) return window.AssessmentModel.limitText(v);
    const t = v == null ? "" : String(v);
    return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t;
  }
  const p2 = x => String(x).padStart(2, "0");
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DT_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
  function realDate(y, m, d) {
    const x = new Date(Date.UTC(y, m - 1, d));
    return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
  }
  function validDate(v) {
    const m = ISO_RE.exec(typeof v === "string" ? v.trim() : "");
    return m && realDate(+m[1], +m[2], +m[3]) ? m[0] : "";
  }
  // Date and time in the school's local time, stored as "YYYY-MM-DDTHH:MM"
  function validDateTime(v) {
    const m = DT_RE.exec(typeof v === "string" ? v.trim() : "");
    if (!m || !realDate(+m[1], +m[2], +m[3]) || +m[4] > 23 || +m[5] > 59) return "";
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  }
  // Milliseconds for a stored date-time (local time), or NaN
  function dtMs(dt) {
    const m = DT_RE.exec(dt || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN;
  }
  function msToDateTime(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
  function isoToday(now) {
    const n = now == null ? new Date() : new Date(now);
    return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`;
  }
  function formatDate(iso) {
    const m = ISO_RE.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }
  function formatDateTime(dt) {
    const m = DT_RE.exec(dt || "");
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "";
  }
  // "31 hours", "2 days 4 hours", "45 minutes"
  function formatSpan(ms) {
    const mins = Math.max(0, Math.floor(ms / 60000));
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
    const d = Math.floor(hours / 24), h = hours % 24;
    return `${d} days` + (h ? ` ${h} hour${h === 1 ? "" : "s"}` : "");
  }
  // Start of the academic year (1 September) containing "now", as an ISO date
  function academicYearStart(now) {
    const n = now == null ? new Date() : new Date(now);
    const y = n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1;
    return `${y}-09-01`;
  }
  function academicYearLabel(now) {
    const y = +academicYearStart(now).slice(0, 4);
    return `${y} to ${y + 1}`;
  }
  function newId() {
    const a = new Uint8Array(8);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
    return "inc-" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  // Next reference for the given year: INC-2026-001, INC-2026-002 …
  function nextRef(items, now) {
    const year = new Date(now == null ? Date.now() : now).getFullYear();
    const re = new RegExp("^INC-" + year + "-(\\d+)$");
    let max = 0;
    (items || []).forEach(e => { const m = re.exec(String(e.ref || "")); if (m) max = Math.max(max, +m[1]); });
    return `INC-${year}-${String(max + 1).padStart(3, "0")}`;
  }

  // ── Entries ───────────────────────────────────────────────────────────────
  function blankEntry() {
    const e = { id: newId() };
    FIELDS.forEach(f => { e[f.key] = f.type === "checks" || f.type === "actions" ? [] : ""; });
    e.status = "Open";
    return e;
  }

  // One follow-up action: { what, owner, due, done }
  function sanitiseAction(raw) {
    const a = { what: "", owner: "", due: "", done: false };
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return a;
    if (hasOwn(raw, "what") && (typeof raw.what === "string" || typeof raw.what === "number")) a.what = limitText(raw.what).slice(0, 2000);
    if (hasOwn(raw, "owner") && (typeof raw.owner === "string" || typeof raw.owner === "number")) a.owner = limitText(raw.owner).slice(0, 300);
    if (hasOwn(raw, "due")) a.due = validDate(raw.due);
    if (hasOwn(raw, "done")) a.done = raw.done === true || raw.done === "Yes" || raw.done === "yes";
    return a;
  }

  // Copy one entry field by field, keeping only known fields with valid
  // values. Never spread stored or imported objects directly.
  function sanitiseEntry(raw) {
    const e = blankEntry();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
    if (hasOwn(raw, "id") && typeof raw.id === "string" && ID_RE.test(raw.id)) e.id = raw.id;
    FIELDS.forEach(f => {
      if (!hasOwn(raw, f.key)) return;
      const v = raw[f.key];
      if (f.type === "checks") {
        const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/\s*[;\n]\s*/) : [];
        e[f.key] = f.options.filter(o => list.some(x => typeof x === "string" && x.trim().toLowerCase() === o.toLowerCase()));
      } else if (f.type === "actions") {
        e[f.key] = Array.isArray(v) ? v.slice(0, MAX_ACTIONS).map(sanitiseAction).filter(a => a.what || a.owner || a.due) : [];
      } else if (f.type === "select") {
        const s = typeof v === "string" ? v.trim() : "";
        e[f.key] = f.options.find(o => o.toLowerCase() === s.toLowerCase()) || "";
      } else if (f.type === "date") {
        e[f.key] = validDate(v);
      } else if (f.type === "datetime") {
        e[f.key] = validDateTime(v);
      } else if (typeof v === "string" || typeof v === "number") {
        e[f.key] = f.key === "ref" || f.key === "title" ? limitText(v).slice(0, 300) : limitText(v);
      }
    });
    if (!hasOwn(raw, "status")) e.status = "Open";
    return e;
  }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, school: { name: "", urn: "", keptURN: "", cover: "" }, items: [] };
  }

  // Validate a whole log (from storage or an imported file).
  function sanitiseState(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return s;
    if (hasOwn(raw, "school") && raw.school && typeof raw.school === "object") {
      ["name", "urn", "keptURN"].forEach(k => {
        if (!hasOwn(raw.school, k)) return;
        const v = raw.school[k];
        if (typeof v === "string" || typeof v === "number") s.school[k] = limitText(v).slice(0, 300);
      });
      if (hasOwn(raw.school, "cover") && typeof raw.school.cover === "string") {
        s.school.cover = COVER.find(o => o.toLowerCase() === raw.school.cover.trim().toLowerCase()) || "";
      }
    }
    const items = hasOwn(raw, "items") && Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS) : [];
    const seen = new Set();
    items.forEach(r => {
      const e = sanitiseEntry(r);
      if (seen.has(e.id)) e.id = newId();      // ids must be unique
      seen.add(e.id);
      s.items.push(e);
    });
    return s;
  }

  // Read the saved log. Returns an empty log if there is none or it cannot be read.
  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      return sanitiseState(raw);
    } catch (e) {
      return emptyState();
    }
  }

  // ── The ICO 72-hour clock ─────────────────────────────────────────────────
  // Returns null when no ICO deadline applies, otherwise
  // { state: "due" | "submitted" | "late", deadline (ms), left (ms, negative when passed), maybe }
  //   due:       ICO report needed (or may be needed) and not yet submitted
  //   submitted: submitted within 72 hours
  //   late:      submitted after 72 hours
  // "maybe" is true while the breach is still under assessment.
  function icoClock(e, now) {
    if (!pdbMaybe(e) || e.ico === "Not required") return null;
    if (pdbYes(e) && e.risk === RISK_NONE) return null;
    // The clock starts at discovery, or later if the school only became aware
    // it was a personal data breach later
    const found = dtMs(e.discoveredAt), aware = dtMs(e.awareAt);
    const start = isFinite(found) && isFinite(aware) ? Math.max(found, aware) : isFinite(found) ? found : aware;
    if (!isFinite(start)) return null;
    const deadline = start + THRESHOLDS.icoDeadlineHours * HOUR;
    const t = now == null ? Date.now() : now;
    if (e.ico === "Submitted") {
      const at = dtMs(e.icoAt);
      return { state: isFinite(at) && at > deadline ? "late" : "submitted", deadline, left: deadline - t, maybe: false };
    }
    return { state: "due", deadline, left: deadline - t, maybe: e.pdb === "Under assessment" };
  }

  function icoText(c) {
    if (!c) return "";
    if (c.state === "submitted") return "Reported to the ICO";
    if (c.state === "late") return "Reported to the ICO after 72 hours";
    const pre = c.maybe ? "If reportable, ICO deadline" : "ICO deadline";
    return c.left >= 0 ? `${pre} in ${formatSpan(c.left)}` : `${pre} passed ${formatSpan(-c.left)} ago`;
  }

  // ── Checks ────────────────────────────────────────────────────────────────
  // Returns { rag: "Red" | "Amber" | "Green", reasons: [...], ico }.
  // Each reason: { level: "Red" | "Amber", code, text }.
  // now: milliseconds (optional, for testing). ctx: { cover } from the school details.
  function evaluate(e, now, ctx) {
    const t = now == null ? Date.now() : now;
    const today = isoToday(t);
    const cover = (ctx && ctx.cover) || "";
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });
    const closed = e.status === "Resolved" || e.status === "Closed";
    const found = dtMs(e.discoveredAt);
    const reasonsGiven = !!String(e.notifyReasons || "").trim();
    const decided = k => e[k] === "Reported" || (e[k] === "Not needed" && reasonsGiven);

    if (!isFinite(found)) {
      red("no-discovery", "No date and time of discovery recorded. It is needed to work out the ICO 72-hour deadline.");
    }
    if (!e.type) amber("no-type", "Type of incident not recorded.");

    // Personal data: decide quickly whether it is a breach
    if (!e.pdb || e.pdb === "Under assessment") {
      const age = isFinite(found) ? t - found : 0;
      const what = e.pdb ? "is still under assessment" : "has not been recorded";
      if (isFinite(found) && age > THRESHOLDS.assessWithinHours * HOUR) {
        red("pdb-unassessed", `Whether this is a personal data breach ${what}, more than ${THRESHOLDS.assessWithinHours} hours after discovery. Decide with your DPO now: the ICO 72-hour clock is running.`);
      } else if (!closed) {
        amber("pdb-unassessed", `Decide with your DPO whether this is a personal data breach (within ${THRESHOLDS.assessWithinHours} hours of discovery).`);
      }
    }

    // ICO 72 hours (UK GDPR Article 33(1))
    const ico = icoClock(e, t);
    if (ico && ico.state === "due") {
      const text = icoText(ico) + ` (${formatDateTime(msToDateTime(ico.deadline))}).` +
        (ico.maybe ? " Finish the assessment and report to the ICO in time if it is a breach that risks people's rights." : " Report to the ICO without undue delay.");
      if (ico.left <= THRESHOLDS.icoWarnHours * HOUR) red("ico-deadline", text);
      else amber("ico-deadline", text);
    }
    if (ico && ico.state === "late" && !String(e.icoReason || "").trim()) {
      amber("ico-late", "Reported to the ICO after 72 hours with no reason for the delay recorded (UK GDPR Article 33(1)).");
    }
    if (pdbYes(e)) {
      if (e.ico === "Not required" && (e.risk === RISK_SOME || e.risk === RISK_HIGH)) {
        red("ico-mismatch", `ICO marked as not required, but the risk is recorded as "${e.risk}". Report to the ICO unless the breach is unlikely to result in a risk to people.`);
      }
      if (!e.risk) amber("risk-unassessed", "Risk to the people affected not recorded.");
      if (e.risk === RISK_HIGH && e.informed !== "Informed" && !(e.informed === "Not required" && String(e.informedReason || "").trim())) {
        red("not-informed", "High risk to the people affected, but they have not been told and no reason is recorded (UK GDPR Article 34).");
      }
      if (!String(e.riskReason || "").trim()) {
        amber("no-reasoning", "No reasoning recorded for the risk decision (the Article 33(5) record).");
      }
    }
    if (pdbMaybe(e) && e.ico === "Not required" && !String(e.icoReason || "").trim()) {
      amber("ico-no-reason", "ICO marked as not required with no reason recorded. Record the reasons for every breach you don't report (Article 33(5)).");
    }
    if (pdbMaybe(e) && !e.dpoAt) {
      amber("no-dpo", "Data protection officer not recorded as consulted on a personal data breach.");
    }

    // Cyber attacks: external reporting (DfE "Report cyber attacks")
    if (isCyber(e) && !e.outcome && !closed) {
      amber("no-outcome", "Not recorded whether security was breached or damage caused.");
    }
    if (mayBeBreached(e)) {
      if (!decided("reportFraud") && !decided("ncsc")) {
        red("not-reported", "A cyber incident where security may have been breached, with no report to Report Fraud or the NCSC and no reason recorded.");
      }
      if (cover === COVER_RPA && !decided("rpa")) {
        red("rpa-not-told", "RPA member: the RPA has not been told. Call cyber emergency assistance on 0800 368 6378 as soon as reasonably practicable, and before spending money on the response.");
      } else if (cover !== COVER_RPA && cover !== "None" && !decided("rpa")) {
        amber("rpa-not-told", "Your RPA or cyber insurer has not been told (or no reason recorded). Check your cover in School details.");
      }
      if (!decided("dfe")) {
        amber("dfe-not-told", "The DfE sector cyber team (Sector.Incidentreporting@education.gov.uk) has not been told, and no reason is recorded.");
      }
    }
    if ((mayBeBreached(e) || pdbYes(e)) && !decided("governors")) {
      amber("governors", "Governors or trustees not told about the incident (or no reason recorded).");
    }
    const unreasoned = ["governors", "trust", "reportFraud", "dfe", "rpa", "ncsc", "police"].filter(k => e[k] === "Not needed");
    if (unreasoned.length && !reasonsGiven) {
      amber("notify-no-reason", `"Not needed" chosen for ${unreasoned.map(k => FIELD_BY_KEY[k].label).join(", ")} with no reason recorded.`);
    }

    // Response and lessons
    if (!closed && isFinite(found) && t - found > THRESHOLDS.openWarnDays * 24 * HOUR) {
      amber("open-long", `Open for ${Math.floor((t - found) / (24 * HOUR))} days (more than ${THRESHOLDS.openWarnDays}).`);
    }
    if (closed && !String(e.lessons || "").trim()) {
      amber("no-lessons", `${e.status} with no lessons learned recorded.`);
    }
    if (closed && (mayBeBreached(e) || pdbYes(e)) && e.riskAssessment !== "Yes" && e.riskAssessment !== "Not needed") {
      amber("ra-not-updated", `${e.status} without the cyber risk assessment being reviewed.`);
    }
    const overdue = (e.actions || []).filter(a => !a.done && a.due && a.due < today);
    if (overdue.length) {
      amber("actions-overdue", `${overdue.length} follow-up action${overdue.length === 1 ? " is" : "s are"} overdue (earliest due ${formatDate(overdue.map(a => a.due).sort()[0])}).`);
    }

    const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : "Green";
    return { rag, reasons, ico };
  }

  // Counts for the dashboard and home tile
  function summarise(state, now) {
    const t = now == null ? Date.now() : now;
    const yearStart = academicYearStart(t);
    const today = isoToday(t);
    const ctx = { cover: state.school && state.school.cover };
    const out = { total: 0, thisYear: 0, open: 0, Red: 0, Amber: 0, Green: 0, icoDue: 0, icoOverdue: 0, overdueActions: 0 };
    (state.items || []).forEach(e => {
      const r = evaluate(e, t, ctx);
      out.total++;
      out[r.rag]++;
      if (OPEN_STATUSES.includes(e.status) || !e.status) out.open++;
      if (e.discoveredAt && e.discoveredAt.slice(0, 10) >= yearStart) out.thisYear++;
      if (r.ico && r.ico.state === "due") { out.icoDue++; if (r.ico.left < 0) out.icoOverdue++; }
      out.overdueActions += (e.actions || []).filter(a => !a.done && a.due && a.due < today).length;
    });
    return out;
  }

  // The plain-English rules, for the page and the export
  const RULES = {
    Red: [
      "No date and time of discovery recorded.",
      `Not yet decided whether it is a personal data breach (blank or "Under assessment") more than ${THRESHOLDS.assessWithinHours} hours after discovery.`,
      `ICO report needed (or possibly needed) and not submitted, with the ${THRESHOLDS.icoDeadlineHours}-hour deadline passed or less than ${THRESHOLDS.icoWarnHours} hours away.`,
      "ICO marked \"Not required\" although the risk to people is recorded as a risk or a high risk.",
      "High risk to the people affected, but they have not been told and no reason is recorded.",
      "A cyber incident where security was or may have been breached, with no report to Report Fraud or the NCSC and no reason recorded.",
      "RPA members: a cyber incident where security was or may have been breached, and the RPA has not been told (and no reason recorded)."
    ],
    Amber: [
      `ICO report needed (or possibly needed) and not submitted, with more than ${THRESHOLDS.icoWarnHours} hours left. A live countdown is shown.`,
      `Personal data breach decision still to make, within ${THRESHOLDS.assessWithinHours} hours of discovery.`,
      "Reported to the ICO after 72 hours with no reason for the delay; or ICO \"Not required\" with no reason recorded (the Article 33(5) record).",
      "A personal data breach with no risk level or no reasoning recorded.",
      "Data protection officer not recorded as consulted on a personal data breach.",
      "A cyber incident where security may have been breached and the DfE sector cyber team, or (if you have insurance rather than the RPA) your insurer, not told.",
      "Governors or trustees not told about a breach or a possible breach.",
      "\"Not needed\" chosen for any external report with no reason recorded.",
      "Type of incident, or whether security was breached, not recorded.",
      `Open or contained for more than ${THRESHOLDS.openWarnDays} days.`,
      "Resolved or closed without lessons learned, or without the cyber risk assessment reviewed after a breach.",
      "Follow-up actions overdue."
    ],
    Green: ["None of the above."]
  };

  window.IncidentModel = {
    STATE_KEY, SCHEMA_VERSION, MAX_ITEMS, MAX_ACTIONS, THRESHOLDS, SOURCES, GROUPS, FIELDS, FIELD_BY_KEY, RULES,
    TYPES, CYBER_TYPES, OUTCOMES, STATUSES, OPEN_STATUSES, PDB, RISK, COVER, COVER_RPA,
    isCyber, mayBeBreached, blankEntry, sanitiseEntry, sanitiseAction, sanitiseState, emptyState, loadState,
    evaluate, summarise, icoClock, icoText, nextRef,
    validDate, validDateTime, dtMs, msToDateTime, isoToday, formatDate, formatDateTime, formatSpan,
    academicYearStart, academicYearLabel, newId
  };
})();

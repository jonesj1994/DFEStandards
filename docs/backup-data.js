// Backup and disaster recovery register: field definitions, sources and checks.
//
// Shared by backup.html (backup-app.js) and the home page tile (backup-home.js),
// so everything here is plain data and pure functions with no page code.
// See docs/BACKUP-REGISTER.md for the reasoning behind each field and rule.
//
// Load order: ce-data.js (optional, for the current Cyber Essentials PDF link),
// assessment-model.js (optional, for limitText), then this file.
//
// The register has three parts, all saved together under one key:
//   items - one row per protected system or data set (the backup register)
//   log   - one row per restore test, DR exercise or real recovery
//   plan  - disaster recovery plan details and key contacts
(function () {
  "use strict";

  const STATE_KEY = "backup_register_v1";
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 500;                  // far more systems than any school will have
  const MAX_LOG = 2000;                   // log entries kept
  const MAX_CONTACTS = 50;
  const MAX_TEXT = 20000;                 // characters per text field (same as the trackers)
  const MAX_HOURS = 100000;               // a sane upper limit for "hours" fields

  // ── Thresholds for the checks (see BACKUP-REGISTER.md) ────────────────────
  const THRESHOLDS = Object.freeze({
    restoreTestWarnMonths: 4,             // Amber: DfE asks for backups to be tested termly (3 terms a year)
    restoreTestMaxMonths: 12,             // Red for critical/high systems: no restore test in a year
    successCheckWarnDays: 31,             // Amber: nobody has confirmed a successful backup for a month
    reviewMonths: 12,                     // Backup plan, DR plan and each row reviewed every year
    drTestMonths: 12                      // DR plan "tested annually (at a minimum)"
  });

  // ── Sources ───────────────────────────────────────────────────────────────
  const GOVUK = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/";
  const CE_URL = typeof CE_SOURCE_URL !== "undefined" ? CE_SOURCE_URL
    : "https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf";
  const CE_NAME = "Cyber Essentials " + ((typeof CE_VERSION !== "undefined" && (/v\d+(?:\.\d+)*/i.exec(CE_VERSION) || [])[0]) || "v3.3");

  // Each source: short label for the "Why:" line, the URL, and (for the field
  // guide) the tracker item it supports.
  const SOURCES = {
    "dfe-backup": {
      short: "DfE cyber security: Develop and implement a plan to back up your data and review this every year",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-6"
    },
    "dfe-continuity": {
      short: "DfE digital leadership: Include digital technology within disaster recovery and business continuity plans",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-3"
    },
    "dfe-registers": {
      short: "DfE digital leadership: Keep registers relating to hardware and systems up to date",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-2"
    },
    "dfe-cloud-backup": {
      short: "DfE cloud solutions: Make sure that appropriate data backup provision is in place",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-5"
    },
    "dfe-servers-resilient": {
      short: "DfE servers and storage: should continue to work if any single component or service fails",
      url: GOVUK + "servers-and-storage", tracker: "dfe", item: "servers-1"
    },
    "dfe-servers-secure": {
      short: "DfE servers and storage: must be secure and follow data protection legislation",
      url: GOVUK + "servers-and-storage", tracker: "dfe", item: "servers-2"
    },
    "dfe-incident": {
      short: "DfE cyber security: Report cyber incidents and attacks",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe"
    },
    "ce-rec-1": {
      short: CE_NAME + ": an appropriate backup solution is in place (recommended, not assessed)",
      url: CE_URL, tracker: "ce", item: "rec-1"
    },
    "ncsc-offline": {
      short: "NCSC blog: Offline backups in an online world",
      url: "https://www.ncsc.gov.uk/blog-post/offline-backups-in-an-online-world"
    },
    "ncsc-cloud-backups": {
      short: "NCSC: Principles for ransomware-resistant cloud backups",
      url: "https://www.ncsc.gov.uk/guidance/principles-for-ransomware-resistant-cloud-backups"
    },
    "rpa-cyber": {
      short: "DfE Risk Protection Arrangement (RPA) membership rules, Cyber section: conditions of cover",
      url: "https://www.gov.uk/guidance/make-a-claim-through-the-risk-protection-arrangement-rpa"
    }
  };

  // ── Option lists ──────────────────────────────────────────────────────────
  const CATEGORIES = [
    "MIS", "Email", "Files and documents", "Finance and HR", "Safeguarding", "Website",
    "Learning platform and pupil work", "Servers and system images", "Network and telephony settings", "Other"
  ];
  const HOSTING = [
    "On-site server or storage", "Cloud service (SaaS)", "Hosted by the supplier",
    "Hosted by the trust or local authority", "Mixed (on-site and cloud)"
  ];
  const CLOUD_HOSTING = ["Cloud service (SaaS)", "Hosted by the supplier", "Mixed (on-site and cloud)"];
  const PRIORITIES = ["Critical", "High", "Normal"];
  const SUPPLIER_DEFAULT = "Only the supplier's standard retention (no extra backup)";
  const BACKED_UP = ["Yes", SUPPLIER_DEFAULT, "No", "Not sure", "Not needed (no school data)"];
  const RUN_BY = ["School staff", "IT support provider", "The system's supplier", "Trust or local authority", "Not sure"];
  const FREQUENCIES = ["Continuous or hourly", "Several times a day", "Daily", "Weekly", "Monthly", "Less often than monthly", "Not sure"];
  const FREQ_HOURS = { "Continuous or hourly": 1, "Several times a day": 8, "Daily": 24, "Weekly": 168, "Monthly": 744, "Less often than monthly": 2000 };
  const COPIES = ["1", "2", "3 or more", "Not sure"];
  const LOCATIONS = [
    "On-site", "Off-site (another building or data centre)", "Cloud backup service",
    "Offline or air-gapped", "Immutable (cannot be changed or deleted)"
  ];
  const YES_NO = ["Yes", "No", "Not sure"];
  const ENCRYPTED = ["Yes", "No", "Not sure"];
  const MEDIA = [
    "No physical backup media leaves the site",
    "Yes: encrypted and kept in a secure location",
    "Yes: not encrypted, or not kept securely"
  ];
  const MEDIA_BAD = "Yes: not encrypted, or not kept securely";
  const MONITORING = [
    "Automatic alerts, checked every working day", "Reports checked weekly", "Checked by hand now and then",
    "Not monitored", "Not sure"
  ];
  const RESULTS = ["Success", "Partial", "Failed"];
  // Recovery time and recovery point: plain-English choices, each with hours
  const RTO_OPTIONS = [
    ["Up to 1 hour", 1], ["Up to 4 hours", 4], ["Up to 1 day", 24], ["Up to 3 days", 72],
    ["Up to 1 week", 168], ["Up to 2 weeks", 336], ["More than 2 weeks", null]
  ];
  const RPO_OPTIONS = [
    ["Up to 1 hour of work", 1], ["Up to half a day of work", 8], ["Up to 1 day of work", 24],
    ["Up to 1 week of work", 168], ["Up to 1 month of work", 744], ["More than 1 month", null]
  ];
  const STATUSES = ["In use", "Retired"];
  const LOG_TYPES = ["Restore test", "DR exercise", "Real recovery"];
  const ACTION_STATUS = ["None needed", "Open", "Done"];
  const CONTACT_ROLES = [
    "IT support provider", "Internet service provider", "Insurer or RPA", "Action Fraud or Report Fraud",
    "NCSC", "MIS supplier", "Data protection officer", "Trust or local authority", "Disaster recovery lead", "Other"
  ];

  const important = e => e.priority !== "Normal";           // Critical, High, or not yet set
  const isCloud = e => CLOUD_HOSTING.includes(e.hosting);
  const backedUp = e => e.backedUp === "Yes";
  const hoursFor = (opts, label) => { const o = opts.find(x => x[0] === label); return o ? o[1] : undefined; };

  // ── Backup register fields ────────────────────────────────────────────────
  // type: text | textarea | select | date | checks | hours | software
  // basis: "required" = a standard (DfE, or RPA cover conditions) asks for this
  // information; "good" = good practice (for example NCSC advice).
  // showIf: the field only applies when this returns true (it is hidden otherwise).
  const GROUPS = [
    {
      id: "what", title: "What is protected",
      intro: "One row for each system or set of data. Record its priority so you know what to recover first.",
      fields: [
        { key: "name", label: "System or data", type: "text", basis: "required", refs: ["dfe-backup", "dfe-registers"],
          help: "What staff call it, e.g. \"MIS\", \"Staff shared drive\", \"Microsoft 365 email\".", placeholder: "e.g. MIS" },
        { key: "category", label: "Category", type: "select", options: CATEGORIES, basis: "good", refs: [],
          help: "Used to filter and total the register." },
        { key: "softwareName", label: "Name in the software register", type: "software", basis: "good", refs: ["dfe-registers"],
          help: "If this system is in your software register, use the same name so the two registers match." },
        { key: "hosting", label: "Where the live data is", type: "select", options: HOSTING, basis: "required", refs: ["dfe-cloud-backup", "dfe-backup"],
          help: "Cloud suppliers keep backups for a limited time, sometimes as little as 30 days." },
        { key: "dataOwner", label: "Data owner", type: "text", basis: "required", refs: ["dfe-backup"],
          help: "The member of staff who decides what is kept and how quickly it is needed back, e.g. School Business Manager, DSL. A role is enough." },
        { key: "priority", label: "Recovery priority", type: "select", options: PRIORITIES, basis: "required", refs: ["dfe-backup", "dfe-continuity"],
          help: "Critical: the school cannot open or keep children safe without it. Leadership decides the order of recovery." },
        { key: "rto", label: "How long can we be without it? (recovery time objective)", type: "select", options: RTO_OPTIONS.map(o => o[0]), basis: "required", refs: ["dfe-backup", "dfe-servers-resilient"],
          help: "The longest the school can manage without this system before it must be working again." },
        { key: "rpo", label: "How much recent work could we afford to lose? (recovery point objective)", type: "select", options: RPO_OPTIONS.map(o => o[0]), basis: "required", refs: ["dfe-backup", "dfe-cloud-backup"],
          help: "If we restore from the last backup, how much newer work could be lost and re-entered? This sets how often to back up." }
      ]
    },
    {
      id: "how", title: "How it is backed up",
      intro: "What is covered, by whom, how often, how long copies are kept, and where they are.",
      fields: [
        { key: "backedUp", label: "Is it backed up?", type: "select", options: BACKED_UP, basis: "required", refs: ["dfe-backup", "dfe-cloud-backup"],
          help: "Choose \"supplier's standard retention\" if you rely only on the cloud provider's own recycle bin or retention." },
        { key: "coverage", label: "What is covered", type: "text", basis: "required", refs: ["dfe-backup"],
          help: "e.g. \"Database and documents\", \"All mailboxes including shared\", \"Whole server image\"." },
        { key: "method", label: "Backup method or product", type: "text", basis: "good", refs: ["dfe-backup"],
          help: "How it is backed up, e.g. \"Supplier's hosted backup\", \"Third-party Microsoft 365 backup\", \"NAS plus cloud copy\"." },
        { key: "runBy", label: "Who runs the backup", type: "select", options: RUN_BY, basis: "required", refs: ["dfe-backup"],
          help: "The DfE expects IT support to action the backup plan." },
        { key: "frequency", label: "How often", type: "select", options: FREQUENCIES, basis: "required", refs: ["dfe-backup", "dfe-cloud-backup"],
          help: "Should be at least as often as the recovery point above." },
        { key: "retention", label: "How long backups are kept", type: "text", basis: "required", refs: ["dfe-backup", "dfe-cloud-backup"],
          help: "e.g. \"30 daily, 12 monthly\". Should match your data retention policy: ask your DPO." },
        { key: "supplierRetention", label: "Supplier's own retention", type: "text", basis: "required", refs: ["dfe-cloud-backup"],
          help: "Ask the supplier how long they keep deleted data and backups, and where they hold them.",
          showIf: e => isCloud(e), showIfText: "Cloud and supplier-hosted systems" },
        { key: "copies", label: "Number of backup copies", type: "select", options: COPIES, basis: "required", refs: ["dfe-backup", "dfe-cloud-backup", "rpa-cyber"],
          help: "The DfE asks for at least 3 copies of important data, on at least 2 separate devices, with at least 1 off-site. RPA members must meet this for cyber cover." },
        { key: "locations", label: "Where the copies are", type: "checks", options: LOCATIONS, basis: "required", refs: ["dfe-backup", "rpa-cyber", "ncsc-offline", "ncsc-cloud-backups"],
          help: "Tick every place a copy is kept. Immutable copies cannot be changed or deleted once made, even by an administrator." },
        { key: "offlineCopy", label: "At least one copy offline or off the network?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-backup", "ncsc-offline", "ce-rec-1"],
          help: "A copy that ransomware on your network could not reach or delete, e.g. a disconnected drive or an immutable cloud copy with separate log-ins." },
        { key: "physicalMedia", label: "Physical backup media taken off-site?", type: "select", options: MEDIA, basis: "required", refs: ["dfe-backup"],
          help: "Discs or tapes taken off-site must be encrypted and stored securely, and must never be taken to anyone's home." }
      ]
    },
    {
      id: "security", title: "Security",
      intro: "Never record encryption keys, passwords or recovery codes in this register. Record only where they are kept.",
      fields: [
        { key: "encrypted", label: "Backups encrypted?", type: "select", options: ENCRYPTED, basis: "required", refs: ["dfe-servers-secure", "dfe-backup"],
          help: "Backups of personal data should be encrypted, both when stored and when sent off-site." },
        { key: "keyLocation", label: "Where the encryption keys and backup log-ins are held", type: "text", basis: "good", refs: ["ncsc-offline", "dfe-continuity"],
          help: "The location only, e.g. \"Sealed envelope in the head's safe\" or \"IT provider's password vault\". Never the key or password itself.",
          showIf: e => e.encrypted !== "No", showIfText: "Unless backups are not encrypted" },
        { key: "separateAccess", label: "Backup accounts kept separate, with MFA?", type: "select", options: YES_NO, basis: "good", refs: ["ncsc-offline", "ncsc-cloud-backups"],
          help: "Attackers try to delete backups first. Backup admin accounts should not be normal network accounts, and should use multi-factor authentication." }
      ]
    },
    {
      id: "monitor", title: "Monitoring and testing",
      intro: "Backups are only useful if they work. The DfE asks for backups to be tested and logged every term. Log each test in the restore test log.",
      fields: [
        { key: "monitoring", label: "How backup success is checked", type: "select", options: MONITORING, basis: "required", refs: ["dfe-backup", "dfe-servers-resilient"],
          help: "Someone should know the same day if a backup fails." },
        { key: "monitoredBy", label: "Who checks it", type: "text", basis: "required", refs: ["dfe-backup"],
          help: "A role or organisation, e.g. \"IT support provider's service desk\"." },
        { key: "lastSuccessCheck", label: "Last successful backup checked on", type: "date", basis: "good", refs: ["dfe-backup"],
          help: "The last time someone confirmed a backup had completed." },
        { key: "lastRestoreTest", label: "Last restore test (if not in the log)", type: "date", basis: "required", refs: ["dfe-backup"],
          help: "Leave blank if you use the restore test log below: the newest log entry for this system is used." },
        { key: "lastRestoreResult", label: "Result of that test", type: "select", options: RESULTS, basis: "required", refs: ["dfe-backup"],
          help: "", showIf: e => !!e.lastRestoreTest, showIfText: "When a test date is entered" },
        { key: "lastRestoreHours", label: "Time it took to restore (hours)", type: "hours", basis: "required", refs: ["dfe-backup"],
          help: "Compared with how long you can be without it. e.g. 1.5 for an hour and a half.",
          showIf: e => !!e.lastRestoreTest, showIfText: "When a test date is entered" }
      ]
    },
    {
      id: "plan", title: "Disaster recovery and review",
      intro: "",
      fields: [
        { key: "inDrPlan", label: "Included in the disaster recovery or business continuity plan?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-continuity"],
          help: "Include suppliers such as your MIS and cloud services in the plan." },
        { key: "status", label: "Status", type: "select", options: STATUSES, basis: "good", refs: ["dfe-registers"],
          help: "Mark a system \"Retired\" when it is no longer used, and keep the record." },
        { key: "lastReviewed", label: "Last reviewed", type: "date", basis: "required", refs: ["dfe-backup"],
          help: "Review every year, or when there is a major change to the system or data." },
        { key: "notes", label: "Notes", type: "textarea", basis: "good", refs: [],
          help: "Anything else, e.g. recovery steps, actions agreed or where evidence is kept. No passwords." }
      ]
    }
  ];

  // ── Restore test and DR log fields ────────────────────────────────────────
  const LOG_GROUPS = [
    {
      id: "event", title: "What happened",
      intro: "Log every restore test, disaster recovery exercise and real recovery. This is your evidence that backups work.",
      fields: [
        { key: "date", label: "Date", type: "date", basis: "required", refs: ["dfe-backup"], help: "" },
        { key: "type", label: "Type", type: "select", options: LOG_TYPES, basis: "required", refs: ["dfe-backup", "dfe-continuity"],
          help: "Restore test: a test restore of some data. DR exercise: a practice of the disaster recovery plan. Real recovery: data was actually lost." },
        { key: "systems", label: "Systems involved", type: "systems", basis: "required", refs: ["dfe-backup"],
          help: "Tick the systems from your backup register. Their last restore test updates automatically." },
        { key: "whatRestored", label: "What was restored", type: "text", basis: "required", refs: ["dfe-backup"],
          help: "e.g. \"One staff folder to a test location\", \"Whole MIS database to a test server\"." },
        { key: "result", label: "Result", type: "select", options: RESULTS, basis: "required", refs: ["dfe-backup"],
          help: "Partial: some data could not be restored, or it needed a workaround." },
        { key: "hours", label: "Time taken (hours)", type: "hours", basis: "required", refs: ["dfe-backup"],
          help: "Compared with how long each system can be down (its recovery time)." },
        { key: "testedBy", label: "Tested by", type: "text", basis: "good", refs: ["dfe-backup"],
          help: "A role or organisation, e.g. \"IT technician\", \"IT support provider\"." }
      ]
    },
    {
      id: "followup", title: "Issues and actions",
      intro: "",
      fields: [
        { key: "issues", label: "Issues found", type: "textarea", basis: "required", refs: ["dfe-backup", "dfe-continuity"],
          help: "Anything that went wrong or took longer than expected." },
        { key: "actions", label: "Actions agreed", type: "textarea", basis: "required", refs: ["dfe-continuity"],
          help: "What will be changed, by whom and by when." },
        { key: "actionStatus", label: "Actions status", type: "select", options: ACTION_STATUS, basis: "good", refs: ["dfe-continuity"],
          help: "Mark actions \"Done\" once completed." }
      ]
    }
  ];

  // ── DR plan details (one per register) ────────────────────────────────────
  const PLAN_FIELDS = [
    { key: "drLead", label: "Who owns the backup and DR plans", type: "text", basis: "required", refs: ["dfe-backup", "dfe-continuity"],
      help: "The senior leadership team (SLT) digital lead owns the backup plan. A role is enough." },
    { key: "planLocation", label: "Where the disaster recovery plan is kept", type: "text", basis: "required", refs: ["dfe-continuity"],
      help: "e.g. \"Secure shared folder 'DR plan' in the cloud, and printed copy in the main office safe\"." },
    { key: "hardCopy", label: "Printed copy kept?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-continuity"],
      help: "The DfE asks for printed copies in case systems are unavailable during an incident." },
    { key: "summaryShared", label: "Summary with key contacts shared with all staff?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-continuity"],
      help: "A short summary of what to do and who to call, shared securely." },
    { key: "backupPlanReviewed", label: "Backup plan last reviewed", type: "date", basis: "required", refs: ["dfe-backup"],
      help: "The backup plan must be reviewed every year, or when systems change." },
    { key: "drPlanReviewed", label: "Disaster recovery plan last reviewed", type: "date", basis: "required", refs: ["dfe-continuity"],
      help: "Review and update every year, or when something significant changes." },
    { key: "drPlanTested", label: "Disaster recovery plan last tested", type: "date", basis: "required", refs: ["dfe-continuity", "dfe-backup"],
      help: "Test at least once a year, e.g. by simulating data loss. A DR exercise in the log also counts." },
    { key: "offlineLocation", label: "Where the offline backup copy is kept", type: "text", basis: "required", refs: ["dfe-backup", "ncsc-offline"],
      help: "e.g. \"Immutable cloud copy with the IT provider\" or \"Encrypted drive in the fire safe\". Never at anyone's home." },
    { key: "keysLocation", label: "Where recovery keys and log-ins are kept", type: "text", basis: "good", refs: ["dfe-continuity", "ncsc-offline"],
      help: "The location only, e.g. \"Sealed envelope in the safe\". Never write the keys, passwords or recovery codes here." },
    { key: "planNotes", label: "Notes", type: "textarea", basis: "good", refs: [],
      help: "e.g. what counts as a disaster for your school, or links to the plan." }
  ];
  const CONTACT_FIELDS = [
    { key: "role", label: "Role", type: "select", options: CONTACT_ROLES },
    { key: "organisation", label: "Organisation", type: "text" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "notes", label: "Notes", type: "text" }
  ];

  const index = list => { const m = new Map(); list.forEach(f => m.set(f.key, f)); return m; };
  const FIELDS = GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title }, f)));
  const LOG_FIELDS = LOG_GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title }, f)));
  const FIELD_BY_KEY = index(FIELDS);
  const LOG_FIELD_BY_KEY = index(LOG_FIELDS);
  const PLAN_FIELD_BY_KEY = index(PLAN_FIELDS);

  // ── Starter list for "Quick add": common school systems by name only ─────
  // No products, retention periods or priorities: the school fills those in.
  const STARTERS = [
    ["MIS (management information system)", "MIS"],
    ["Email (Microsoft 365 or Google Workspace)", "Email"],
    ["Staff and pupil files (OneDrive, SharePoint or Google Drive)", "Files and documents"],
    ["File server and shared drives", "Files and documents"],
    ["Finance system", "Finance and HR"],
    ["HR and payroll", "Finance and HR"],
    ["Safeguarding records system", "Safeguarding"],
    ["School website", "Website"],
    ["Learning platform and pupil work", "Learning platform and pupil work"],
    ["Servers and virtual machines", "Servers and system images"],
    ["Firewall and network settings", "Network and telephony settings"],
    ["Phone system settings", "Network and telephony settings"]
  ].map(([name, category]) => ({ name, category }));

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasOwn = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
  function limitText(v) {
    if (typeof window !== "undefined" && window.AssessmentModel) return window.AssessmentModel.limitText(v);
    const t = v == null ? "" : String(v);
    return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t;
  }
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function validDate(v) {
    const m = ISO_RE.exec(typeof v === "string" ? v.trim() : "");
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[0] : "";
  }
  function isoToday(now) {
    const n = now || new Date();
    const p = x => String(x).padStart(2, "0");
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  }
  function addDays(iso, days) {
    const m = ISO_RE.exec(iso);
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days)).toISOString().slice(0, 10);
  }
  function addMonths(iso, months) {
    const m = ISO_RE.exec(iso);
    const y = +m[1], mo = +m[2] - 1 + months, day = +m[3];
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mo, Math.min(day, last))).toISOString().slice(0, 10);
  }
  function formatDate(iso) {
    const m = ISO_RE.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }
  // "12 Oct 2026", for the home tile
  function formatDateLong(iso) {
    const m = ISO_RE.exec(iso || "");
    if (!m) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${+m[3]} ${months[+m[2] - 1]} ${m[1]}`;
  }
  // Hours: a non-negative number, kept as a short string ("" if not valid)
  function validHours(v) {
    if (v == null || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".").trim());
    if (!isFinite(n) || n < 0 || n > MAX_HOURS) return "";
    return String(Math.round(n * 100) / 100);
  }
  function formatHours(h) {
    if (h === "" || h == null) return "";
    const n = Number(h);
    if (n < 1) return `${Math.round(n * 60)} min`;
    return `${n} hour${n === 1 ? "" : "s"}`;
  }
  // Phone numbers: digits, spaces and + ( ) - only
  function validPhone(v) {
    return typeof v === "string" || typeof v === "number" ? String(v).replace(/[^0-9+()\- ]/g, "").trim().slice(0, 30) : "";
  }
  function newId(prefix) {
    const a = new Uint8Array(8);
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
    return (prefix || "bk") + "-" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  // Clean one value for its field definition. Never trusts the input type.
  function cleanValue(f, v) {
    if (f.type === "checks") {
      const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/\s*[;\n]\s*|\s*,\s*(?=[A-Z])/) : [];
      return f.options.filter(o => list.some(x => typeof x === "string" && x.trim().toLowerCase() === o.toLowerCase()));
    }
    if (f.type === "select") {
      const s = typeof v === "string" ? v.trim() : "";
      return f.options.find(o => o.toLowerCase() === s.toLowerCase()) || "";
    }
    if (f.type === "date") return validDate(v);
    if (f.type === "hours") return validHours(v);
    if (f.type === "phone") return validPhone(v);
    if (f.type === "systems") {
      return Array.isArray(v) ? v.filter(x => typeof x === "string" && ID_RE.test(x)).slice(0, MAX_ITEMS) : [];
    }
    if (typeof v === "string" || typeof v === "number") {
      const t = limitText(v);
      return f.type === "textarea" ? t : t.slice(0, 2000);
    }
    return "";
  }
  const blankValue = f => (f.type === "checks" || f.type === "systems" ? [] : "");

  // ── Backup rows ───────────────────────────────────────────────────────────
  function blankEntry() {
    const e = { id: newId("bk") };
    FIELDS.forEach(f => { e[f.key] = blankValue(f); });
    e.status = "In use";
    return e;
  }
  // Copy one row field by field, keeping only known fields with valid values.
  // Never spread stored or imported objects directly.
  function sanitiseEntry(raw) {
    const e = blankEntry();
    if (!raw || typeof raw !== "object") return e;
    if (hasOwn(raw, "id") && typeof raw.id === "string" && ID_RE.test(raw.id)) e.id = raw.id;
    FIELDS.forEach(f => { if (hasOwn(raw, f.key)) e[f.key] = cleanValue(f, raw[f.key]); });
    if (!e.status) e.status = "In use";
    return e;
  }

  // ── Log entries ───────────────────────────────────────────────────────────
  function blankLog() {
    const e = { id: newId("log") };
    LOG_FIELDS.forEach(f => { e[f.key] = blankValue(f); });
    return e;
  }
  function sanitiseLog(raw) {
    const e = blankLog();
    if (!raw || typeof raw !== "object") return e;
    if (hasOwn(raw, "id") && typeof raw.id === "string" && ID_RE.test(raw.id)) e.id = raw.id;
    LOG_FIELDS.forEach(f => { if (hasOwn(raw, f.key)) e[f.key] = cleanValue(f, raw[f.key]); });
    return e;
  }

  // ── DR plan and contacts ──────────────────────────────────────────────────
  function blankPlan() {
    const p = { contacts: [] };
    PLAN_FIELDS.forEach(f => { p[f.key] = blankValue(f); });
    return p;
  }
  function blankContact() {
    const c = { id: newId("ct") };
    CONTACT_FIELDS.forEach(f => { c[f.key] = ""; });
    return c;
  }
  function sanitiseContact(raw) {
    const c = blankContact();
    if (!raw || typeof raw !== "object") return c;
    if (hasOwn(raw, "id") && typeof raw.id === "string" && ID_RE.test(raw.id)) c.id = raw.id;
    CONTACT_FIELDS.forEach(f => {
      if (!hasOwn(raw, f.key)) return;
      c[f.key] = f.type === "text" ? cleanValue(f, raw[f.key]).slice(0, 300) : cleanValue(f, raw[f.key]);
    });
    return c;
  }
  function sanitisePlan(raw) {
    const p = blankPlan();
    if (!raw || typeof raw !== "object") return p;
    PLAN_FIELDS.forEach(f => { if (hasOwn(raw, f.key)) p[f.key] = cleanValue(f, raw[f.key]); });
    const list = hasOwn(raw, "contacts") && Array.isArray(raw.contacts) ? raw.contacts.slice(0, MAX_CONTACTS) : [];
    const seen = new Set();
    list.forEach(r => {
      const c = sanitiseContact(r);
      if (seen.has(c.id)) c.id = newId("ct");
      seen.add(c.id);
      p.contacts.push(c);
    });
    return p;
  }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, school: { name: "", urn: "", keptURN: "" }, items: [], log: [], plan: blankPlan() };
  }

  // Validate a whole register (from storage or an imported file).
  function sanitiseState(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== "object") return s;
    if (hasOwn(raw, "school") && raw.school && typeof raw.school === "object") {
      ["name", "urn", "keptURN"].forEach(k => {
        if (!hasOwn(raw.school, k)) return;
        const v = raw.school[k];
        if (typeof v === "string" || typeof v === "number") s.school[k] = limitText(v).slice(0, 300);
      });
    }
    const seen = new Set();
    const items = hasOwn(raw, "items") && Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS) : [];
    items.forEach(r => {
      const e = sanitiseEntry(r);
      if (seen.has(e.id)) e.id = newId("bk");
      seen.add(e.id);
      s.items.push(e);
    });
    const ids = new Set(s.items.map(e => e.id));
    const logs = hasOwn(raw, "log") && Array.isArray(raw.log) ? raw.log.slice(0, MAX_LOG) : [];
    const seenLog = new Set();
    logs.forEach(r => {
      const e = sanitiseLog(r);
      if (seenLog.has(e.id) || ids.has(e.id)) e.id = newId("log");
      seenLog.add(e.id);
      // Only links to systems that exist in this register
      e.systems = e.systems.filter((x, i, a) => ids.has(x) && a.indexOf(x) === i);
      s.log.push(e);
    });
    if (hasOwn(raw, "plan")) s.plan = sanitisePlan(raw.plan);
    return s;
  }

  // Read the saved register. Returns an empty register if there is none or it
  // cannot be read.
  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      return sanitiseState(raw);
    } catch (e) {
      return emptyState();
    }
  }

  // ── Last restore test for a system ────────────────────────────────────────
  // The newest of the date typed on the row and any log entry that includes
  // the system. A log entry wins a tie, as it holds more detail.
  function lastRestore(e, log) {
    let best = e.lastRestoreTest
      ? { date: e.lastRestoreTest, result: e.lastRestoreResult, hours: e.lastRestoreHours, source: "row", logId: "" } : null;
    (log || []).forEach(x => {
      if (!x.date || !Array.isArray(x.systems) || !x.systems.includes(e.id)) return;
      if (!best || x.date >= best.date) best = { date: x.date, result: x.result, hours: x.hours, source: "log", logId: x.id, type: x.type };
    });
    return best;
  }
  const rtoHours = e => hoursFor(RTO_OPTIONS, e.rto);
  const rpoHours = e => hoursFor(RPO_OPTIONS, e.rpo);

  // ── Checks for one backup row ─────────────────────────────────────────────
  // Returns { rag: "Red" | "Amber" | "Green" | "Retired", reasons: [...] }.
  // Each reason: { level, code, text }. "today" is an ISO date (for testing).
  function evaluate(e, today, log) {
    const t = today || isoToday();
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });
    if (e.status === "Retired") return { rag: "Retired", reasons };
    if (e.backedUp === "Not needed (no school data)") {
      if (!e.lastReviewed || e.lastReviewed < addMonths(t, -THRESHOLDS.reviewMonths)) {
        amber("review-overdue", "Recorded as holding no school data. Confirm this at least once a year.");
      }
      return { rag: reasons.length ? "Amber" : "Green", reasons };
    }
    const imp = important(e);
    const pri = e.priority || "Not set";
    const sev = (code, text) => (imp ? red : amber)(code, text);

    // Is it backed up at all?
    if (e.backedUp === "No") sev("no-backup", `Not backed up (priority: ${pri}).`);
    else if (!e.backedUp || e.backedUp === "Not sure") sev("no-backup", `Not known whether it is backed up (priority: ${pri}).`);
    else if (e.backedUp === SUPPLIER_DEFAULT) {
      sev("supplier-only", "Relies only on the supplier's standard retention. Cloud providers may keep data for as little as 30 days, so check this is enough or add a backup.");
    }
    const hasBackup = backedUp(e);

    if (hasBackup) {
      // Offline or off-network copy
      if (e.offlineCopy !== "Yes") {
        sev("no-offline", e.offlineCopy === "No"
          ? "No offline or off-network copy. Ransomware can encrypt or delete backups it can reach."
          : "Not confirmed that a copy is kept offline or off the network.");
      }
      // Monitoring
      if (e.monitoring === "Not monitored") red("not-monitored", "Backup success is not monitored, so a failing backup could go unnoticed.");
      else if ((!e.monitoring || e.monitoring === "Not sure") && !String(e.monitoredBy || "").trim()) {
        red("not-monitored", "Nobody is recorded as checking that backups succeed.");
      }
      if (e.monitoring !== "Not monitored") {
        if (!e.lastSuccessCheck) amber("success-check", "No date recorded for the last check that a backup completed.");
        else if (e.lastSuccessCheck < addDays(t, -THRESHOLDS.successCheckWarnDays)) {
          amber("success-check", `Last successful backup check was on ${formatDate(e.lastSuccessCheck)}, more than ${THRESHOLDS.successCheckWarnDays} days ago.`);
        }
      }
      // Physical media
      if (e.physicalMedia === MEDIA_BAD) {
        red("media-insecure", "Physical backup media taken off-site is not encrypted or not stored securely. It must never be taken to anyone's home.");
      }
    }

    // Restore testing (skipped only when the row says it is not backed up)
    if (e.backedUp !== "No") {
      const lr = lastRestore(e, log);
      const yearAgo = addMonths(t, -THRESHOLDS.restoreTestMaxMonths);
      const termAgo = addMonths(t, -THRESHOLDS.restoreTestWarnMonths);
      if (!lr) sev("restore-test", "No restore test recorded.");
      else {
        if (lr.result === "Failed") red("restore-failed", `The last restore test, on ${formatDate(lr.date)}, failed.`);
        else if (lr.result === "Partial") amber("restore-partial", `The last restore test, on ${formatDate(lr.date)}, only partly worked.`);
        if (lr.date < yearAgo) sev("restore-test", `Last restore test was on ${formatDate(lr.date)}, more than ${THRESHOLDS.restoreTestMaxMonths} months ago.`);
        else if (lr.date < termAgo) amber("restore-test", `Last restore test was on ${formatDate(lr.date)}, more than ${THRESHOLDS.restoreTestWarnMonths} months ago. The DfE asks for termly tests.`);
        const rto = rtoHours(e);
        if (lr.hours !== "" && lr.hours != null && typeof rto === "number" && Number(lr.hours) > rto) {
          amber("rto-exceeded", `The last restore took ${formatHours(lr.hours)}, longer than the recovery time of ${e.rto.toLowerCase()}.`);
        }
      }
    }

    // Recovery objectives
    if (!e.rto || !e.rpo) amber("no-objectives", `${!e.rto && !e.rpo ? "No recovery time or recovery point" : !e.rto ? "No recovery time (how long we can be without it)" : "No recovery point (how much work we could lose)"} set.`);
    const rpo = rpoHours(e), fq = FREQ_HOURS[e.frequency];
    if (hasBackup && typeof rpo === "number" && typeof fq === "number" && fq > rpo) {
      amber("frequency", `Backed up ${e.frequency.toLowerCase()}, which could lose more work than the recovery point allows (${e.rpo.toLowerCase()}).`);
    }
    if (hasBackup && !e.frequency) amber("frequency", "How often it is backed up is not recorded.");

    // Copies and immutability for important data
    if (hasBackup && imp) {
      const locs = e.locations || [];
      const offsite = locs.some(l => l !== "On-site");
      if (e.copies === "1" || e.copies === "2") red("copies", `Only ${e.copies} backup cop${e.copies === "1" ? "y" : "ies"}. The DfE (and the RPA, as a condition of cyber cover) asks for at least 3 copies of important data, on 2 separate devices, 1 off-site.`);
      else if (!e.copies || e.copies === "Not sure") amber("copies", "Number of backup copies not recorded. The DfE asks for at least 3 copies of important data.");
      if (locs.length && !offsite) red("no-offsite", "All copies are on-site. At least one copy of important data must be off-site (DfE standard and RPA condition of cyber cover).");
      else if (!locs.length) amber("no-offsite", "Where the backup copies are kept is not recorded.");
      if (!locs.includes("Immutable (cannot be changed or deleted)")) amber("not-immutable", "No immutable copy recorded. The DfE asks for backups that cannot be changed once created.");
    }

    // Encryption
    if (hasBackup && e.encrypted !== "Yes") amber("not-encrypted", e.encrypted === "No" ? "Backups are not encrypted." : "Not confirmed that backups are encrypted.");

    // Ownership, priority, DR plan, review
    if (!String(e.dataOwner || "").trim()) amber("no-owner", "No data owner named.");
    if (!e.priority) amber("no-priority", "No recovery priority set (it is checked as critical or high until it is).");
    if (e.inDrPlan !== "Yes") amber("not-in-plan", "Not confirmed as included in the disaster recovery or business continuity plan.");
    if (!e.lastReviewed) amber("review-overdue", "No review date recorded.");
    else if (e.lastReviewed < addMonths(t, -THRESHOLDS.reviewMonths)) amber("review-overdue", `Last reviewed on ${formatDate(e.lastReviewed)}, more than ${THRESHOLDS.reviewMonths} months ago.`);

    // Red reasons first, so the most urgent are read first
    reasons.sort((a, b) => (a.level === b.level ? 0 : a.level === "Red" ? -1 : 1));
    const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : "Green";
    return { rag, reasons };
  }

  // ── Checks for the DR plan as a whole ─────────────────────────────────────
  // The newest DR exercise or real recovery in the log counts as a DR test.
  function lastDrTest(state) {
    let d = (state.plan && state.plan.drPlanTested) || "";
    (state.log || []).forEach(x => { if (x.date && (x.type === "DR exercise" || x.type === "Real recovery") && x.date > d) d = x.date; });
    return d;
  }
  function evaluatePlan(state, today) {
    const t = today || isoToday();
    const p = state.plan || blankPlan();
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });
    const cutoff = addMonths(t, -THRESHOLDS.reviewMonths);
    if (!p.backupPlanReviewed) red("plan-review", "No date recorded for the last review of the backup plan. It must be reviewed every year.");
    else if (p.backupPlanReviewed < cutoff) red("plan-review", `The backup plan was last reviewed on ${formatDate(p.backupPlanReviewed)}, more than ${THRESHOLDS.reviewMonths} months ago.`);
    if (!p.drPlanReviewed) red("dr-review", "No date recorded for the last review of the disaster recovery plan. It must be reviewed every year.");
    else if (p.drPlanReviewed < cutoff) red("dr-review", `The disaster recovery plan was last reviewed on ${formatDate(p.drPlanReviewed)}, more than ${THRESHOLDS.reviewMonths} months ago.`);
    const tested = lastDrTest(state);
    if (!tested) amber("dr-test", "No test of the disaster recovery plan recorded. Test it at least once a year.");
    else if (tested < addMonths(t, -THRESHOLDS.drTestMonths)) amber("dr-test", `The disaster recovery plan was last tested on ${formatDate(tested)}, more than ${THRESHOLDS.drTestMonths} months ago.`);
    if (!String(p.drLead || "").trim()) amber("plan-detail", "Nobody is named as owning the backup and DR plans.");
    if (!String(p.planLocation || "").trim()) amber("plan-detail", "Where the disaster recovery plan is kept is not recorded.");
    if (p.hardCopy !== "Yes") amber("plan-detail", "No printed copy of the plan confirmed.");
    if (p.summaryShared !== "Yes") amber("plan-detail", "No summary with key contacts confirmed as shared with staff.");
    if (!String(p.offlineLocation || "").trim()) amber("plan-detail", "Where the offline backup copy is kept is not recorded.");
    const roles = new Set((p.contacts || []).filter(c => c.phone || c.organisation).map(c => c.role));
    const missing = ["IT support provider", "Internet service provider", "Insurer or RPA"].filter(r => !roles.has(r));
    if (missing.length) amber("contacts", `Key contacts missing: ${missing.join(", ")}.`);
    const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : "Green";
    return { rag, reasons };
  }

  // Log entries with failed or partial results whose actions are not done
  function logNeedsAttention(x) {
    if (x.actionStatus === "Open") return true;
    return (x.result === "Failed" || x.result === "Partial") && x.actionStatus !== "Done" && x.actionStatus !== "None needed";
  }

  // Counts for the dashboard and home tile
  function summarise(state, today) {
    const t = today || isoToday();
    const out = { total: 0, active: 0, Red: 0, Amber: 0, Green: 0, Retired: 0, attention: 0, lastTest: "", openActions: 0, plan: null };
    (state.items || []).forEach(e => {
      const r = evaluate(e, t, state.log);
      out.total++;
      out[r.rag]++;
      if (r.rag !== "Retired") out.active++;
      if (r.rag === "Red" || r.rag === "Amber") out.attention++;
    });
    (state.log || []).forEach(x => {
      if (x.date && x.date <= t && x.date > out.lastTest) out.lastTest = x.date;
      if (logNeedsAttention(x)) out.openActions++;
    });
    (state.items || []).forEach(e => { if (e.status !== "Retired" && e.lastRestoreTest && e.lastRestoreTest <= t && e.lastRestoreTest > out.lastTest) out.lastTest = e.lastRestoreTest; });
    out.plan = evaluatePlan(state, t);
    return out;
  }

  // The plain-English rules, for the page and the export
  const RULES = {
    Red: [
      "A critical or high priority system (or one with no priority set) that is not backed up, or where nobody knows.",
      "A critical or high priority cloud system that relies only on the supplier's standard retention.",
      "A critical or high priority system with no offline or off-network copy confirmed.",
      `A critical or high priority system with no restore test, or none in the last ${THRESHOLDS.restoreTestMaxMonths} months.`,
      "The last restore test failed.",
      "Backup success is not monitored, or nobody is named as checking it.",
      "Critical or high priority data with only 1 or 2 backup copies, or with every copy on-site (the DfE 3-2-1 rule, which is also an RPA condition of cyber cover).",
      "Physical backup media taken off-site that is not encrypted or not stored securely.",
      `DR plan: the backup plan or disaster recovery plan has not been reviewed in the last ${THRESHOLDS.reviewMonths} months.`
    ],
    Amber: [
      "Any of the Red backup, offline copy or restore test problems for a normal priority system.",
      `Last restore test more than ${THRESHOLDS.restoreTestWarnMonths} months ago (the DfE asks for termly tests), or it only partly worked.`,
      "The last restore took longer than the recovery time (how long we can be without it).",
      "No recovery time or recovery point set, or backups are less frequent than the recovery point needs.",
      "Critical or high priority data where the number of copies or their locations is not recorded, or with no immutable copy.",
      "Backups not confirmed as encrypted.",
      `No check of backup success recorded in the last ${THRESHOLDS.successCheckWarnDays} days.`,
      "No data owner named, no priority set, or not in the disaster recovery plan.",
      `Not reviewed in the last ${THRESHOLDS.reviewMonths} months.`,
      `DR plan: not tested in the last ${THRESHOLDS.drTestMonths} months, plan location, printed copy, staff summary, offline copy location or owner not recorded, or key contacts missing (IT support, internet provider, insurer or RPA).`
    ],
    Green: ["None of the above."],
    Retired: ["No longer in use: kept for the record and not checked."]
  };

  window.BackupModel = {
    STATE_KEY, SCHEMA_VERSION, MAX_ITEMS, MAX_LOG, MAX_CONTACTS, THRESHOLDS, SOURCES, RULES,
    GROUPS, FIELDS, FIELD_BY_KEY, LOG_GROUPS, LOG_FIELDS, LOG_FIELD_BY_KEY, PLAN_FIELDS, PLAN_FIELD_BY_KEY, CONTACT_FIELDS,
    CATEGORIES, HOSTING, PRIORITIES, STATUSES, LOG_TYPES, RESULTS, CONTACT_ROLES, STARTERS, RTO_OPTIONS, RPO_OPTIONS,
    SUPPLIER_DEFAULT, important, isCloud, cleanValue,
    blankEntry, sanitiseEntry, blankLog, sanitiseLog, blankPlan, sanitisePlan, blankContact, sanitiseContact,
    emptyState, sanitiseState, loadState,
    lastRestore, rtoHours, rpoHours, evaluate, evaluatePlan, lastDrTest, logNeedsAttention, summarise,
    validDate, validHours, validPhone, isoToday, addDays, addMonths, formatDate, formatDateLong, formatHours, newId
  };
})();

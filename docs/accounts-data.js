// User accounts and access privileges register: field definitions, sources
// and compliance rules.
//
// Shared by accounts.html (accounts-app.js) and the home page tile
// (accounts-home.js), so everything here is plain data and pure functions
// with no page code. See docs/ACCOUNTS-REGISTER.md for the reasoning behind
// each field and rule.
//
// THIS REGISTER MUST NEVER HOLD PASSWORDS, PINS, RECOVERY CODES, MFA SECRETS
// OR ANY OTHER CREDENTIAL. No field asks for one, imported columns that look
// like credentials are dropped, and text that looks like one is flagged Red.
//
// Load order: ce-data.js (optional, for the current Cyber Essentials PDF link),
// assessment-model.js (optional, for limitText), then this file.
(function () {
  "use strict";

  const STATE_KEY = "accounts_register_v1";
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 5000;                 // staff, admin, service and supplier accounts
  const MAX_TEXT = 20000;                 // characters per text field (same as the trackers)

  // ── Thresholds for the compliance checks (see ACCOUNTS-REGISTER.md) ──────
  // "Every term": schools in England have three terms a year, so a review
  // more than 4 months old has missed a term.
  const THRESHOLDS = Object.freeze({
    accessReviewMonths: 4,                // Amber: last access review more than 4 months ago
    leaverWarnDays: 14,                   // Amber: end or leave date within 14 days
    closedRecordMonths: 12                // Listed for a retention check: disabled or deleted over 12 months ago
  });

  // ── Sources ───────────────────────────────────────────────────────────────
  const GOVUK = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/";
  const DPMAN = "https://www.gov.uk/guidance/data-protection-in-schools/";
  const CE_URL = typeof CE_SOURCE_URL !== "undefined" ? CE_SOURCE_URL
    : "https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf";
  const CE_NAME = "Cyber Essentials " + ((typeof CE_VERSION !== "undefined" && (/v\d+(?:\.\d+)*/i.exec(CE_VERSION) || [])[0]) || "v3.3");
  const NCSC_MFA = "https://www.ncsc.gov.uk/collection/mfa-for-your-corporate-online-services/recommended-types-of-mfa";

  const SOURCES = {
    "dfe-accounts": {
      short: "DfE cyber security: Control and secure user accounts and access privileges",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-4"
    },
    "dfe-cloud-dp": {
      short: "DfE cloud solutions: Cloud solutions must follow data protection legislation",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-2"
    },
    "dfe-cloud-idam": {
      short: "DfE cloud solutions: Cloud solutions should use ID and access management tools",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-3"
    },
    "dfe-filtering-roles": {
      short: "DfE filtering and monitoring: Identify and assign roles and responsibilities",
      url: GOVUK + "filtering-and-monitoring-core-standard", tracker: "dfe", item: "filtering-1"
    },
    "dfe-support": {
      short: "DfE IT support: Make sure IT support actively maintains and improves your digital technology",
      url: GOVUK + "it-support", tracker: "dfe", item: "support-2"
    },
    "dfe-registers": {
      short: "DfE digital leadership: Keep registers relating to hardware and systems up to date",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-2"
    },
    "ce-scope-7": { short: CE_NAME + ": accounts used by third parties and MSPs are in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-7" },
    "ce-sc-1": { short: CE_NAME + ": unnecessary user accounts are removed or disabled (secure configuration)", url: CE_URL, tracker: "ce", item: "sc-1" },
    "ce-uac-1": { short: CE_NAME + ": a process to create and approve accounts (user access control)", url: CE_URL, tracker: "ce", item: "uac-1" },
    "ce-uac-2": { short: CE_NAME + ": unique credentials (user access control)", url: CE_URL, tracker: "ce", item: "uac-2" },
    "ce-uac-3": { short: CE_NAME + ": accounts are removed or disabled when no longer needed (user access control)", url: CE_URL, tracker: "ce", item: "uac-3" },
    "ce-uac-4": { short: CE_NAME + ": MFA, always for cloud services (user access control)", url: CE_URL, tracker: "ce", item: "uac-4" },
    "ce-uac-5": { short: CE_NAME + ": separate accounts for admin work only (user access control)", url: CE_URL, tracker: "ce", item: "uac-5" },
    "ce-uac-6": { short: CE_NAME + ": special access privileges removed when no longer needed (user access control)", url: CE_URL, tracker: "ce", item: "uac-6" },
    "ncsc-mfa": { short: "NCSC: Recommended types of MFA", url: NCSC_MFA },
    "dp-policies": {
      short: "DfE Data protection in schools: Data protection policies and procedures",
      url: DPMAN + "data-protection-policies-and-procedures"
    },
    "dp-records": {
      short: "DfE Data protection in schools: Record keeping and management",
      url: DPMAN + "record-keeping-and-management"
    },
    "gdpr-5": { short: "UK GDPR Article 5 (data minimisation and storage limitation)", url: "https://www.legislation.gov.uk/eur/2016/679/article/5" }
  };

  // ── Option lists ──────────────────────────────────────────────────────────
  const TYPE_STAFF = "Staff";
  const TYPE_ADMIN = "IT admin account";
  const TYPE_EMERGENCY = "Emergency admin (SLT)";
  const TYPE_SERVICE = "Service account";
  const TYPE_SHARED = "Shared account";
  const TYPE_SUPPLIER = "Supplier or MSP";
  const TYPES = [
    TYPE_STAFF, TYPE_ADMIN, TYPE_EMERGENCY, TYPE_SERVICE, TYPE_SHARED, TYPE_SUPPLIER,
    "Governor or trustee", "Volunteer or supply", "Pupil with extra access"
  ];
  const PRIV_STANDARD = "Standard user";
  const PRIVILEGES = [
    PRIV_STANDARD,
    "Elevated (some admin rights)",
    "Global or domain admin",
    "System owner (full control of one system)"
  ];
  const STATUSES = ["Active", "Suspended", "Disabled", "Deleted"];
  const INACTIVE = ["Suspended", "Disabled", "Deleted"];
  const YES_NO = ["Yes", "No", "Not sure"];
  const MFA = ["Yes", "No", "Not available on this system", "Not sure"];
  const MFA_SMS = "Text message or phone call";
  const MFA_METHODS = [
    "Security key or passkey (FIDO2)",
    "Authenticator app (push or code)",
    "Hardware code generator",
    MFA_SMS,
    "Other"
  ];
  const UNIQUE = ["Yes, one named person", "No, shared by several people", "Not sure"];
  const UNIQUE_YES = UNIQUE[0];
  const UNIQUE_NO = UNIQUE[1];
  const ACCESS_MODES = ["Switched on only when needed", "Always on", "Not sure"];
  const REVIEW_OUTCOMES = ["No change needed", "Access changed", "Disabled or removed", "Follow-up needed"];

  const isInactive = e => INACTIVE.includes(e.status);
  const isSupplier = e => e.accountType === TYPE_SUPPLIER;
  const isServiceOrShared = e => e.accountType === TYPE_SERVICE || e.accountType === TYPE_SHARED;
  // An admin account: the type says so, or it has more than standard rights
  const isAdmin = e => e.accountType === TYPE_ADMIN || e.accountType === TYPE_EMERGENCY ||
    (!!e.privilege && e.privilege !== PRIV_STANDARD);
  // Separate-account questions apply to admin accounts a person signs in to
  const personAdmin = e => isAdmin(e) && e.accountType !== TYPE_SERVICE;

  // ── Fields ────────────────────────────────────────────────────────────────
  // type: text | textarea | select | date | systems
  // basis: "required" = a standard (DfE, Cyber Essentials or data protection
  // law) asks for this information; "good" = good practice.
  // showIf: the field only applies when this returns true (it is hidden otherwise).
  const GROUPS = [
    {
      id: "holder", title: "Account and holder",
      intro: "Which account this is and who it belongs to. Record the minimum: no dates of birth, home addresses or personal phone numbers.",
      fields: [
        { key: "accountName", label: "Account name or ID", type: "text", basis: "required", refs: ["ce-uac-1", "ce-uac-2"],
          help: "The sign-in name, e.g. \"j.smith@school.org.uk\" or \"adm-jsmith\". Never record the password.", placeholder: "e.g. adm-jsmith" },
        { key: "accountType", label: "Account type", type: "select", options: TYPES, basis: "required", refs: ["dfe-accounts", "ce-scope-7"],
          help: "Supplier and MSP accounts are in Cyber Essentials scope even though someone else uses them. Only add pupil accounts that have extra access." },
        { key: "holderName", label: "Holder name", type: "text", basis: "required", refs: ["ce-uac-2", "dfe-accounts"],
          help: "The person who uses the account. For service and shared accounts, leave blank and fill in the owner below." },
        { key: "holderRole", label: "Holder's role", type: "text", basis: "required", refs: ["dfe-accounts", "dfe-filtering-roles"],
          help: "Job title or role, e.g. \"Network manager\" or \"DSL\". Access should match the role." },
        { key: "purpose", label: "What the account is for", type: "text", basis: "required", refs: ["ce-uac-1", "ce-uac-2"],
          help: "e.g. \"Scan-to-email from the office copier\" or \"Exam board portal shared by the exams team\".",
          showIf: isServiceOrShared, showIfText: "Service and shared accounts" },
        { key: "owner", label: "Responsible member of staff", type: "text", basis: "required", refs: ["ce-uac-1", "dfe-accounts"],
          help: "Who is accountable for this account and decides whether it is still needed.",
          showIf: e => isServiceOrShared(e) || isSupplier(e), showIfText: "Service, shared and supplier accounts" }
      ]
    },
    {
      id: "access", title: "Systems and privileges",
      intro: "What the account can get into, and with what level of rights.",
      fields: [
        { key: "systems", label: "Systems covered", type: "systems", basis: "required", refs: ["dfe-accounts", "dfe-cloud-idam"],
          help: "e.g. \"Microsoft 365, Arbor, Smoothwall\". Names from your Software Register are suggested as you type." },
        { key: "privilege", label: "Privilege level", type: "select", options: PRIVILEGES, basis: "required", refs: ["dfe-accounts", "ce-uac-6", "dfe-cloud-idam"],
          help: "Anything above \"Standard user\" counts as an admin account in the checks." },
        { key: "cloudAccess", label: "Used for cloud services or remote access?", type: "select", options: YES_NO, basis: "required", refs: ["ce-uac-4", "dfe-accounts"],
          help: "e.g. Microsoft 365, Google Workspace, a cloud MIS, or remote access to school systems. These always need MFA." }
      ]
    },
    {
      id: "security", title: "Security",
      intro: "Multi-factor authentication (MFA), separate admin accounts and unique sign-ins. Never record passwords, PINs, recovery codes or MFA secrets.",
      fields: [
        { key: "mfa", label: "MFA switched on?", type: "select", options: MFA, basis: "required", refs: ["ce-uac-4", "dfe-accounts"],
          help: "Choose \"Yes\" if sign-in goes through single sign-on that enforces MFA." },
        { key: "mfaMethod", label: "MFA method", type: "select", options: MFA_METHODS, basis: "good", refs: ["ncsc-mfa", "dfe-accounts"],
          help: "The NCSC recommends security keys or passkeys first. Text messages are allowed for staff but are the weakest option.",
          showIf: e => e.mfa === "Yes", showIfText: "When MFA is on" },
        { key: "separateAdmin", label: "Separate from the person's everyday account?", type: "select", options: YES_NO, basis: "required", refs: ["ce-uac-5", "dfe-accounts"],
          help: "Admin work must be done from a dedicated account, not the account the person uses for email and day-to-day work.",
          showIf: personAdmin, showIfText: "Admin accounts used by a person" },
        { key: "adminOnlyUse", label: "Used only for admin tasks (no email or web browsing)?", type: "select", options: YES_NO, basis: "required", refs: ["ce-uac-5", "dfe-accounts"],
          help: "Cyber Essentials: no emailing, web browsing or other standard user activities from an admin account.",
          showIf: personAdmin, showIfText: "Admin accounts used by a person" },
        { key: "unique", label: "Used by one named person only?", type: "select", options: UNIQUE, basis: "required", refs: ["ce-uac-2", "dfe-accounts"],
          help: "Cyber Essentials requires unique credentials. A shared account needs a recorded reason." },
        { key: "sharedReason", label: "Why it is shared, and how use is tracked", type: "textarea", basis: "required", refs: ["ce-uac-2", "dfe-filtering-roles"],
          help: "e.g. \"Exam board allows one login per centre; use is logged in the exams office diary\". Users must still be identifiable for filtering and monitoring.",
          showIf: e => e.unique === UNIQUE_NO || e.accountType === TYPE_SHARED, showIfText: "Shared accounts" }
      ]
    },
    {
      id: "approval", title: "Approval and dates",
      intro: "Accounts should be created only when needed, approved, and disabled as soon as they are no longer needed.",
      fields: [
        { key: "approvedBy", label: "Approved by", type: "text", basis: "required", refs: ["ce-uac-1", "dfe-accounts"],
          help: "Who approved the account. For admin rights, the DfE standard asks for a member of SLT or a trustee." },
        { key: "approvalDate", label: "Approval date", type: "date", basis: "required", refs: ["ce-uac-1", "dfe-accounts"], help: "" },
        { key: "startDate", label: "Start date", type: "date", basis: "good", refs: ["dfe-accounts"],
          help: "When the account was created or the person started." },
        { key: "endDate", label: "End or leave date", type: "date", basis: "required", refs: ["ce-uac-3", "dfe-accounts"],
          help: "When the person leaves or the access should end. An active account past this date is Red." },
        { key: "disabledDate", label: "Date disabled or deleted", type: "date", basis: "required", refs: ["ce-uac-3", "ce-sc-1"],
          help: "Evidence that the account was closed promptly.", showIf: isInactive, showIfText: "Suspended, disabled or deleted accounts" }
      ]
    },
    {
      id: "supplier", title: "Third-party access",
      intro: "Accounts used by a supplier, contractor or managed service provider (MSP) are still your accounts.",
      showIf: isSupplier,
      fields: [
        { key: "supplierName", label: "Supplier name", type: "text", basis: "required", refs: ["ce-scope-7", "dfe-support"],
          help: "e.g. your IT support company or MIS supplier.", showIf: isSupplier, showIfText: "Supplier or MSP accounts" },
        { key: "contractRef", label: "Contract or terms reference", type: "text", basis: "required", refs: ["dfe-accounts", "dfe-cloud-dp"],
          help: "The contract or terms that cover this access. The DfE standard asks for your IT support contract to be GDPR compliant.",
          showIf: isSupplier, showIfText: "Supplier or MSP accounts" },
        { key: "accessMode", label: "How access is controlled", type: "select", options: ACCESS_MODES, basis: "required", refs: ["dfe-accounts", "ce-scope-7"],
          help: "The DfE standard asks for remote access to be switched off when not needed and switched on only by authorised school staff.",
          showIf: isSupplier, showIfText: "Supplier or MSP accounts" },
        { key: "controlsConfirmed", label: "Supplier has confirmed it meets the Cyber Essentials controls?", type: "select", options: YES_NO, basis: "required", refs: ["ce-scope-7"],
          help: "For managed services you must be able to confirm the technical controls are met. Ask for this in writing.",
          showIf: isSupplier, showIfText: "Supplier or MSP accounts" }
      ]
    },
    {
      id: "review", title: "Reviews",
      intro: "Review every account with your business manager or finance team every term.",
      fields: [
        { key: "lastReview", label: "Last access review", type: "date", basis: "required", refs: ["dfe-accounts", "ce-uac-3", "ce-uac-6"],
          help: "The DfE standard asks for a review every term. Use the Termly review page to record reviews quickly." },
        { key: "reviewedBy", label: "Reviewed by", type: "text", basis: "good", refs: ["dfe-accounts"], help: "" },
        { key: "reviewOutcome", label: "Review outcome", type: "select", options: REVIEW_OUTCOMES, basis: "good", refs: ["dfe-accounts", "ce-uac-6"], help: "" },
        { key: "nextReview", label: "Next review due", type: "date", basis: "good", refs: ["dfe-accounts"], help: "" },
        { key: "status", label: "Account status", type: "select", options: STATUSES, basis: "required", refs: ["ce-uac-3", "ce-sc-1"],
          help: "Suspended, disabled and deleted accounts are kept for the record and not checked." },
        { key: "notes", label: "Notes", type: "textarea", basis: "good", refs: [],
          help: "Changes made, actions agreed or links to evidence. Never record passwords, PINs or recovery codes." }
      ]
    }
  ];

  const FIELDS = GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title }, f)));
  const FIELD_BY_KEY = new Map(FIELDS.map(f => [f.key, f]));
  const TEXT_KEYS = FIELDS.filter(f => f.type === "text" || f.type === "textarea" || f.type === "systems").map(f => f.key);

  // ── Quick add: common account roles only ──────────────────────────────────
  // No names, account IDs or dates: the school fills those in.
  const STARTERS = [
    ["Headteacher", TYPE_STAFF, PRIV_STANDARD],
    ["School business manager", TYPE_STAFF, PRIV_STANDARD],
    ["Office administrator", TYPE_STAFF, PRIV_STANDARD],
    ["Designated safeguarding lead (DSL)", TYPE_STAFF, PRIV_STANDARD],
    ["Data manager or MIS administrator", TYPE_STAFF, "Elevated (some admin rights)"],
    ["Exams officer", TYPE_STAFF, PRIV_STANDARD],
    ["Teacher", TYPE_STAFF, PRIV_STANDARD],
    ["Teaching assistant", TYPE_STAFF, PRIV_STANDARD],
    ["Network manager or technician (everyday account)", TYPE_STAFF, PRIV_STANDARD],
    ["Network manager or technician (admin account)", TYPE_ADMIN, "Global or domain admin"],
    ["SLT emergency admin account", TYPE_EMERGENCY, "Global or domain admin"],
    ["IT support provider (MSP) admin", TYPE_SUPPLIER, "Global or domain admin"],
    ["MIS supplier support access", TYPE_SUPPLIER, "Elevated (some admin rights)"],
    ["Filtering and monitoring provider access", TYPE_SUPPLIER, "Elevated (some admin rights)"],
    ["Copier or scanner service account", TYPE_SERVICE, PRIV_STANDARD],
    ["Governor or trustee", "Governor or trustee", PRIV_STANDARD],
    ["Supply teacher", "Volunteer or supply", PRIV_STANDARD],
    ["Volunteer", "Volunteer or supply", PRIV_STANDARD]
  ].map(([role, accountType, privilege]) => ({ role, accountType, privilege }));

  // ── Credential detection ──────────────────────────────────────────────────
  // Column headers (and stray object keys) that look like they hold a
  // credential. Matched against a normalised header: lower case, words only.
  const CREDENTIAL_HEADER_RE = /\b(pass ?words?|passwd|pwd|pass ?codes?|pass ?phrases?|pins?|pin codes?|pin numbers?|secrets?|recovery (codes?|keys?)|backup codes?|one time (codes?|passwords?)|otp|totp|mfa (secrets?|seeds?|codes?)|seeds?|api keys?|private keys?|access keys?|tokens?|credentials?|security answers?|memorable (words?|information))\b/;
  function normHeader(h) {
    return String(h == null ? "" : h).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function looksLikeCredentialHeader(h) {
    const n = normHeader(h);
    return !!n && CREDENTIAL_HEADER_RE.test(n);
  }
  // Text that looks like someone typed a credential, e.g. "password: Summer24"
  // or "PIN=1234". Only ":" and "=" count, so "password reset on 3 May" is fine.
  const CREDENTIAL_TEXT_RE = /\b(passwords?|passwd|pwd|passcodes?|pass codes?|pins?|pin codes?|recovery codes?|backup codes?|secrets?|mfa codes?|otp)\s*[:=]\s*\S/i;
  function looksLikeCredentialText(v) {
    return CREDENTIAL_TEXT_RE.test(String(v == null ? "" : v));
  }

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
  function newId() {
    const a = new Uint8Array(8);
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
    return "acc-" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const displayName = e => String(e.accountName || "").trim() || String(e.holderName || "").trim() ||
    String(e.holderRole || "").trim() || "Untitled account";

  // ── Entries ───────────────────────────────────────────────────────────────
  function blankEntry() {
    const e = { id: newId() };
    FIELDS.forEach(f => { e[f.key] = ""; });
    e.status = "Active";
    return e;
  }

  // Copy one entry field by field, keeping only known fields with valid
  // values. Never spread stored or imported objects directly.
  function sanitiseEntry(raw) {
    const e = blankEntry();
    if (!raw || typeof raw !== "object") return e;
    if (hasOwn(raw, "id") && typeof raw.id === "string" && ID_RE.test(raw.id)) e.id = raw.id;
    FIELDS.forEach(f => {
      if (!hasOwn(raw, f.key)) return;
      const v = raw[f.key];
      if (f.type === "select") {
        const s = typeof v === "string" ? v.trim().toLowerCase() : "";
        e[f.key] = f.options.find(o => o.toLowerCase() === s) || "";
      } else if (f.type === "date") {
        e[f.key] = validDate(v);
      } else if (typeof v === "string" || typeof v === "number") {
        e[f.key] = limitText(v);
      }
    });
    if (!e.status) e.status = "Active";
    return e;
  }

  // Keys on an imported object that look like credentials (for a warning;
  // sanitiseEntry drops them anyway because they are not known fields)
  function credentialKeys(raw) {
    if (!raw || typeof raw !== "object") return [];
    return Object.keys(raw).filter(k => looksLikeCredentialHeader(k)).slice(0, 20);
  }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, school: { name: "", urn: "", keptURN: "" }, reviewer: "", items: [] };
  }

  // Validate a whole register (from storage or an imported file).
  // Returns the state plus how many credential-looking fields were dropped.
  function sanitiseStateWithReport(raw) {
    const s = emptyState();
    let dropped = 0;
    if (!raw || typeof raw !== "object") return { state: s, dropped };
    if (hasOwn(raw, "school") && raw.school && typeof raw.school === "object") {
      ["name", "urn", "keptURN"].forEach(k => {
        if (!hasOwn(raw.school, k)) return;
        const v = raw.school[k];
        if (typeof v === "string" || typeof v === "number") s.school[k] = limitText(v).slice(0, 300);
      });
    }
    if (hasOwn(raw, "reviewer") && typeof raw.reviewer === "string") s.reviewer = limitText(raw.reviewer).slice(0, 300);
    const items = hasOwn(raw, "items") && Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS) : [];
    const seen = new Set();
    items.forEach(r => {
      dropped += credentialKeys(r).length;
      const e = sanitiseEntry(r);
      if (seen.has(e.id)) e.id = newId();      // ids must be unique
      seen.add(e.id);
      s.items.push(e);
    });
    return { state: s, dropped };
  }
  function sanitiseState(raw) { return sanitiseStateWithReport(raw).state; }

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

  // ── Compliance checks ─────────────────────────────────────────────────────
  // Returns { rag: "Red" | "Amber" | "Green" | "Inactive", reasons: [...] }.
  // Each reason: { level: "Red" | "Amber", code, text }.
  // "today" is an ISO date (optional, for testing).
  function evaluate(e, today) {
    const t = today || isoToday();
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });

    // Any text field that looks like a credential is Red, even on an
    // inactive account: the register must never hold one.
    const credField = TEXT_KEYS.find(k => looksLikeCredentialText(e[k]));
    if (credField) {
      red("credential", `"${FIELD_BY_KEY.get(credField).label}" looks like it contains a password, PIN or code. Delete it: this register must never hold credentials.`);
    }
    if (isInactive(e)) {
      return { rag: reasons.length ? "Red" : "Inactive", reasons };
    }

    const admin = isAdmin(e);
    const cloud = e.cloudAccess === "Yes";
    const supplier = isSupplier(e);
    const mfaOn = e.mfa === "Yes";

    // Red: leavers
    if (e.endDate && e.endDate < t) {
      red("leaver-active", `Still active, but the end or leave date (${formatDate(e.endDate)}) has passed. Disable it now.`);
    }
    // Red: MFA
    if (admin && !mfaOn && !(e.mfa === "Not available on this system" && !cloud)) {
      red("admin-no-mfa", e.mfa
        ? `Admin account without MFA (recorded as "${e.mfa}"). The DfE standard requires MFA on all IT administrative accounts.`
        : "Admin account with MFA not confirmed. The DfE standard requires MFA on all IT administrative accounts.");
    } else if (cloud && !mfaOn) {
      red("cloud-no-mfa", e.mfa
        ? `Used for cloud services or remote access without MFA (recorded as "${e.mfa}"). Cyber Essentials requires MFA for all cloud services.`
        : "Used for cloud services or remote access with MFA not confirmed. Cyber Essentials requires MFA for all cloud services.");
    }
    // Red: admin account not separate, or shared
    if (personAdmin(e) && (e.separateAdmin === "No" || e.adminOnlyUse === "No")) {
      red("admin-not-separate", e.separateAdmin === "No"
        ? "Admin rights on the person's everyday account. Admin work must be done from a separate account."
        : "Admin account also used for email, web browsing or everyday work. It must be used for admin tasks only.");
    }
    if (admin && (e.unique === UNIQUE_NO || e.accountType === TYPE_SHARED)) {
      red("shared-admin", "Shared admin account. Each administrator needs their own admin account so actions can be traced.");
    }
    // Red: supplier access nobody approved
    if (supplier && !String(e.approvedBy || "").trim()) {
      red("supplier-no-approval", "Supplier or MSP access with no approval recorded.");
    }

    // Amber: MFA gaps that are not Red
    if (!reasons.some(r => r.code === "admin-no-mfa" || r.code === "cloud-no-mfa")) {
      if (admin && e.mfa === "Not available on this system") {
        amber("mfa-unavailable", "Admin account on a system without MFA. Use a long, unique password and limit where it can sign in from.");
      } else if (!e.mfa || e.mfa === "Not sure") {
        amber("mfa-unknown", "MFA not confirmed. Cyber Essentials asks for MFA wherever it is available.");
      } else if (e.mfa === "No") {
        amber("mfa-off", "MFA is off. Cyber Essentials asks for MFA wherever it is available.");
      }
      if (!admin && !e.cloudAccess) amber("cloud-unknown", "Not recorded whether it is used for cloud services or remote access (if it is, MFA is required).");
    }
    if (mfaOn && e.mfaMethod === MFA_SMS) {
      amber("mfa-sms", "MFA by text message or phone call only. Allowed for staff, but the NCSC says it is the weakest method; move to an authenticator app or security key.");
    }
    // Amber: admin separation not confirmed
    if (personAdmin(e) && !reasons.some(r => r.code === "admin-not-separate") &&
        (e.separateAdmin !== "Yes" || e.adminOnlyUse !== "Yes")) {
      amber("admin-separation-unknown", "Not confirmed that this admin account is separate and used only for admin tasks.");
    }
    // Amber: shared (non-admin) accounts and unknown uniqueness
    if (!admin) {
      if (e.unique === UNIQUE_NO || e.accountType === TYPE_SHARED) {
        amber("shared", String(e.sharedReason || "").trim()
          ? "Shared account. Cyber Essentials requires unique credentials: keep the reason under review."
          : "Shared account with no reason recorded. Cyber Essentials requires unique credentials.");
      } else if (!e.unique || e.unique === "Not sure") {
        amber("unique-unknown", "Not confirmed that only one named person uses this account.");
      }
    }
    // Amber: leaving soon
    if (e.endDate && e.endDate >= t && e.endDate <= addDays(t, THRESHOLDS.leaverWarnDays)) {
      amber("leaving-soon", `End or leave date is ${formatDate(e.endDate)}, within ${THRESHOLDS.leaverWarnDays} days. Plan to disable it on the day.`);
    }
    // Amber: approval and ownership
    if (!supplier && !String(e.approvedBy || "").trim()) {
      amber("no-approver", "No approver recorded. Accounts should be created through an approval process.");
    }
    if (isServiceOrShared(e) && !String(e.owner || "").trim()) {
      amber("no-owner", "No responsible member of staff named for this service or shared account.");
    }
    if (!e.privilege) amber("privilege-unknown", "Privilege level not recorded.");
    // Amber: supplier access
    if (supplier) {
      if (e.accessMode === "Always on") {
        amber("supplier-always-on", "Supplier access is always on. Switch it on only when needed, by authorised school staff.");
      } else if (!e.accessMode || e.accessMode === "Not sure") {
        amber("supplier-always-on", "Not recorded how supplier access is controlled.");
      }
      if (e.controlsConfirmed !== "Yes") {
        amber("supplier-controls", "Supplier has not confirmed in writing that it meets the Cyber Essentials controls.");
      }
    }
    // Amber: review overdue
    const reviewCutoff = addMonths(t, -THRESHOLDS.accessReviewMonths);
    if (e.nextReview && e.nextReview < t) {
      amber("review-overdue", `Access review was due on ${formatDate(e.nextReview)}.`);
    } else if (e.lastReview && e.lastReview < reviewCutoff) {
      amber("review-overdue", `Last access review on ${formatDate(e.lastReview)}, more than ${THRESHOLDS.accessReviewMonths} months ago (once a term).`);
    } else if (!e.lastReview && !e.nextReview) {
      amber("review-overdue", "No access review recorded. Review every account every term.");
    }

    const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : "Green";
    return { rag, reasons };
  }

  // Needs a review this term: active and last reviewed over the threshold ago
  // (or never), or the next review date has passed
  function reviewDue(e, today) {
    const t = today || isoToday();
    if (isInactive(e)) return false;
    if (e.nextReview && e.nextReview < t) return true;
    return !e.lastReview || e.lastReview < addMonths(t, -THRESHOLDS.accessReviewMonths);
  }

  // Closed accounts old enough to check against the retention schedule
  function retentionDue(e, today) {
    const t = today || isoToday();
    return isInactive(e) && !!e.disabledDate && e.disabledDate < addMonths(t, -THRESHOLDS.closedRecordMonths);
  }

  // Counts for the dashboard and home tile
  function summarise(state, today) {
    const out = { total: 0, active: 0, Red: 0, Amber: 0, Green: 0, Inactive: 0, attention: 0, admin: 0, leavers: 0 };
    const t = today || isoToday();
    (state.items || []).forEach(e => {
      const r = evaluate(e, t);
      out.total++;
      out[r.rag]++;
      if (!isInactive(e)) {
        out.active++;
        if (isAdmin(e)) out.admin++;
        if (e.endDate && e.endDate < t) out.leavers++;
      }
      if (r.rag === "Red" || r.rag === "Amber") out.attention++;
    });
    return out;
  }

  // The plain-English rules, for the page and the export
  const RULES = {
    Red: [
      "Any text field looks like it contains a password, PIN or code (checked on every account, active or not).",
      "Active, but the end or leave date has passed.",
      "An admin account (IT admin, emergency admin, or any privilege above standard user) without MFA. On a system with no MFA available that is not a cloud service, this is Amber instead.",
      "Used for cloud services or remote access without MFA (including \"Not available\").",
      "An admin account that is not separate from the person's everyday account, or is also used for email or web browsing.",
      "A shared admin account.",
      "Supplier or MSP access with no approver recorded."
    ],
    Amber: [
      "MFA not confirmed, or off, where it is not already Red; or an admin account on a system with no MFA available.",
      "Not recorded whether a non-admin account is used for cloud services or remote access.",
      "MFA by text message or phone call only (allowed, but the weakest method).",
      "Admin account not confirmed as separate and used only for admin tasks.",
      "A shared non-admin account, or not confirmed that one named person uses it.",
      `End or leave date within ${THRESHOLDS.leaverWarnDays} days.`,
      "No approver recorded.",
      "A service or shared account with no responsible member of staff.",
      "Privilege level not recorded.",
      "Supplier access always on, or not recorded how it is controlled; or the supplier has not confirmed the Cyber Essentials controls.",
      `No access review this term: the next review date has passed, the last review was more than ${THRESHOLDS.accessReviewMonths} months ago, or no review is recorded.`
    ],
    Green: ["None of the above."],
    Inactive: ["Suspended, disabled or deleted: kept for the record and not checked (except for credentials)."]
  };

  window.AccountsModel = {
    STATE_KEY, SCHEMA_VERSION, MAX_ITEMS, THRESHOLDS, SOURCES, GROUPS, FIELDS, FIELD_BY_KEY, RULES,
    TYPES, PRIVILEGES, STATUSES, INACTIVE, STARTERS, MFA_SMS, UNIQUE_YES, UNIQUE_NO, REVIEW_OUTCOMES,
    TYPE_SUPPLIER, TYPE_SERVICE, TYPE_SHARED,
    isAdmin, isInactive, isSupplier, isServiceOrShared, displayName,
    looksLikeCredentialHeader, looksLikeCredentialText, credentialKeys, normHeader,
    blankEntry, sanitiseEntry, sanitiseState, sanitiseStateWithReport, emptyState, loadState,
    evaluate, reviewDue, retentionDue, summarise, validDate, isoToday, addDays, addMonths, formatDate, newId
  };
})();

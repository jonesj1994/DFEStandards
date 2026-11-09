// Software register: field definitions, sources and compliance rules.
//
// Shared by register.html (register-app.js) and the home page tile (home.js),
// so everything here is plain data and pure functions with no page code.
// See docs/SOFTWARE-REGISTER.md for the reasoning behind each field and rule.
//
// Load order: ce-data.js (optional, for the current Cyber Essentials PDF link),
// assessment-model.js (optional, for limitText), then this file.
(function () {
  "use strict";

  const STATE_KEY = "software_register_v1";
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 2000;                 // far more than any school will have
  const MAX_TEXT = 20000;                 // characters per text field (same as the trackers)

  // ── Thresholds for the compliance checks (see SOFTWARE-REGISTER.md) ──────
  const THRESHOLDS = Object.freeze({
    supportEndWarnMonths: 6,              // Amber: vendor support ends within 6 months
    renewalWarnDays: 60,                  // Amber: licence renewal due within 60 days
    reviewOverdueMonths: 12               // Amber: last reviewed more than 12 months ago
  });

  // ── Sources ───────────────────────────────────────────────────────────────
  const GOVUK = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/";
  const DPMAN = "https://www.gov.uk/guidance/data-protection-in-schools/";
  const CE_URL = typeof CE_SOURCE_URL !== "undefined" ? CE_SOURCE_URL
    : "https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf";
  // Follows ce-data.js when the Cyber Essentials version changes
  const CE_NAME = "Cyber Essentials " + ((typeof CE_VERSION !== "undefined" && (/v\d+(?:\.\d+)*/i.exec(CE_VERSION) || [])[0]) || "v3.3");

  // Each source: short label for the "Why:" line, the standard it comes from,
  // the URL, and (for the field guide) the tracker item it supports.
  const SOURCES = {
    "dfe-licence": {
      short: "DfE cyber security: License digital technology and keep it up to date",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-5"
    },
    "dfe-accounts": {
      short: "DfE cyber security: Control and secure user accounts and access privileges",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-4"
    },
    "dfe-malware": {
      short: "DfE cyber security: Secure digital technology and data with anti-malware and a firewall",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-3"
    },
    "dfe-backup": {
      short: "DfE cyber security: Develop and implement a plan to back up your data",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-6"
    },
    "dfe-risk": {
      short: "DfE cyber security: Conduct a cyber risk assessment annually and review every term",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-1"
    },
    "dfe-registers": {
      short: "DfE digital leadership: Keep registers relating to hardware and systems up to date",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-2"
    },
    "dfe-continuity": {
      short: "DfE digital leadership: Include digital technology within disaster recovery and business continuity plans",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-3"
    },
    "dfe-cloud-dp": {
      short: "DfE cloud solutions: Cloud solutions must follow data protection legislation",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-2"
    },
    "dfe-cloud-idam": {
      short: "DfE cloud solutions: Cloud solutions should use ID and access management tools",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-3"
    },
    "dfe-cloud-backup": {
      short: "DfE cloud solutions: Make sure that appropriate data backup provision is in place",
      url: GOVUK + "cloud-solutions", tracker: "dfe", item: "cloud-5"
    },
    "dfe-accessibility": {
      short: "DfE digital accessibility: Hardware and software should support the use of accessibility features",
      url: GOVUK + "digital-accessibility", tracker: "dfe", item: "accessibility-2"
    },
    "dfe-devices": {
      short: "DfE laptops, desktops and tablets: Devices should be safe and secure",
      url: GOVUK + "laptops-desktops-and-tablets", tracker: "dfe", item: "devices-2"
    },
    "ce-scope-3": { short: CE_NAME + ": cloud services are always in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-3" },
    "ce-scope-7": { short: CE_NAME + ": accounts used by third parties and MSPs are in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-7" },
    "ce-sum-1": { short: CE_NAME + ": software is licensed and supported (security update management)", url: CE_URL, tracker: "ce", item: "sum-1" },
    "ce-sum-2": { short: CE_NAME + ": unsupported software is removed (security update management)", url: CE_URL, tracker: "ce", item: "sum-2" },
    "ce-sum-3": { short: CE_NAME + ": automatic updates where possible (security update management)", url: CE_URL, tracker: "ce", item: "sum-3" },
    "ce-sum-4": { short: CE_NAME + ": critical and high-risk updates within 14 days (security update management)", url: CE_URL, tracker: "ce", item: "sum-4" },
    "ce-sc-3": { short: CE_NAME + ": unnecessary software is removed (secure configuration)", url: CE_URL, tracker: "ce", item: "sc-3" },
    "ce-uac-3": { short: CE_NAME + ": accounts are removed when no longer needed (user access control)", url: CE_URL, tracker: "ce", item: "uac-3" },
    "ce-uac-4": { short: CE_NAME + ": MFA, always for cloud services (user access control)", url: CE_URL, tracker: "ce", item: "uac-4" },
    "ce-uac-5": { short: CE_NAME + ": separate accounts for admin work (user access control)", url: CE_URL, tracker: "ce", item: "uac-5" },
    "ce-mp-1": { short: CE_NAME + ": malware protection on every device (malware protection)", url: CE_URL, tracker: "ce", item: "mp-1" },
    "ce-mp-3": { short: CE_NAME + ": application allow listing (malware protection)", url: CE_URL, tracker: "ce", item: "mp-3" },
    "dp-edtech": {
      short: "DfE Data protection in schools: Procuring educational technology (EdTech)",
      url: DPMAN + "procuring-educational-technology-edtech"
    },
    "dp-policies": {
      short: "DfE Data protection in schools: Data protection policies and procedures",
      url: DPMAN + "data-protection-policies-and-procedures"
    },
    "dp-records": {
      short: "DfE Data protection in schools: Record keeping and management",
      url: DPMAN + "record-keeping-and-management"
    },
    "gdpr-28": { short: "UK GDPR Article 28 (processors)", url: "https://www.legislation.gov.uk/eur/2016/679/article/28" },
    "gdpr-35": { short: "UK GDPR Article 35 (data protection impact assessment)", url: "https://www.legislation.gov.uk/eur/2016/679/article/35" }
  };

  // ── Option lists ──────────────────────────────────────────────────────────
  const CATEGORIES = [
    "MIS", "Safeguarding", "Filtering and monitoring", "Learning platform", "Curriculum and classroom",
    "Productivity and email", "Communication", "Finance and HR", "Operating system", "Browser",
    "Security", "Backup", "Device management", "Other"
  ];
  const TYPES = [
    "Installed software", "SaaS (cloud service)", "IaaS (cloud infrastructure)", "PaaS (cloud platform)",
    "Mobile app", "Browser extension"
  ];
  const CLOUD_TYPES = ["SaaS (cloud service)", "IaaS (cloud infrastructure)", "PaaS (cloud platform)"];
  const ON_DEVICE_TYPES = ["Installed software", "Mobile app", "Browser extension"];
  const STATUSES = ["Requested", "Approved", "In use", "Being retired", "Removed"];
  const USER_GROUPS = ["Staff", "Pupils", "Parents and carers", "Governors and trustees", "IT support only"];
  const YES_NO = ["Yes", "No", "Not sure"];
  const SUPPORTED_ROLLING = "Yes, rolling (supplier keeps the cloud service up to date)";
  const SUPPORTED = ["Yes", SUPPORTED_ROLLING, "No", "Not sure"];
  const LICENCE_STATUS = ["Licensed", "Free or open-source licence", "Unlicensed", "Not sure"];
  const LICENCE_MODEL = ["Subscription", "Perpetual", "Per user", "Per device", "Site or organisation", "Included with another product", "Free", "Open source", "Other"];
  const AUTO_UPDATES = ["Yes", "Supplier updates it (cloud service)", "No", "Not possible", "Not sure"];
  const MFA = ["Yes", "Only for some users", "No", "Not available from the supplier", "Not sure"];
  const SSO = ["Yes", "No", "Not available"];
  const DPIA = ["Done", "In progress", "Not done", "Not needed (DPO has recorded why)"];
  const DPA = ["Yes", "No", "Not sure", "Not applicable (supplier does not process our data)"];
  const LOCATIONS = ["UK", "EU or EEA", "USA", "Other or several countries", "Not sure"];
  const BACKUP = ["Yes, we or our IT support back it up", "Yes, the supplier's backup is confirmed and enough", "No", "Not sure", "Not needed (holds no school data)"];
  const MALWARE = ["Anti-malware software", "Application allow listing", "Both", "Not sure"];
  const ACCESSIBILITY = ["Yes", "Partly", "No", "Not checked"];

  const isCloud = e => CLOUD_TYPES.includes(e.type);
  const onDevice = e => ON_DEVICE_TYPES.includes(e.type);
  const personal = e => e.personalData === "Yes";

  // ── Fields ────────────────────────────────────────────────────────────────
  // type: text | textarea | select | date | url | checks
  // basis: "required" = a standard (DfE, Cyber Essentials or data protection
  // law) asks for this information; "good" = good practice.
  // showIf: the field only applies when this returns true (it is hidden otherwise).
  const GROUPS = [
    {
      id: "identity", title: "Identity",
      intro: "What the software is, who uses it and who is responsible for it.",
      fields: [
        { key: "name", label: "Name", type: "text", basis: "required", refs: ["dfe-registers"],
          help: "The name staff know it by, e.g. \"Microsoft 365\" or \"CPOMS\".", placeholder: "e.g. CPOMS" },
        { key: "vendor", label: "Vendor or supplier", type: "text", basis: "required", refs: ["dfe-registers", "dfe-licence"],
          help: "Who makes it, and who you buy it from if different (for example a reseller)." },
        { key: "product", label: "Product, edition or version", type: "text", basis: "good", refs: ["ce-sum-1"],
          help: "Edition or version where it matters for support, e.g. \"Windows 11 Education 24H2\"." },
        { key: "category", label: "Category", type: "select", options: CATEGORIES, basis: "good", refs: ["dfe-registers"],
          help: "What it is for. Used to filter and total the register." },
        { key: "type", label: "Type", type: "select", options: TYPES, basis: "required", refs: ["ce-scope-3", "dfe-cloud-dp"],
          help: "How it is delivered. Cloud services (SaaS, IaaS, PaaS) are always in Cyber Essentials scope and need MFA." },
        { key: "usedOn", label: "Where it is used", type: "text", basis: "good", refs: ["dfe-registers"],
          help: "Devices or sites, e.g. \"All staff laptops\", \"ICT suite\", \"Main site and annexe\"." },
        { key: "userGroups", label: "Who uses it", type: "checks", options: USER_GROUPS, basis: "good", refs: ["dp-edtech"],
          help: "Tick everyone who signs in or whose use you need to plan for." },
        { key: "businessOwner", label: "Business owner", type: "text", basis: "required", refs: ["dfe-registers", "dfe-licence"],
          help: "The member of staff who decides whether the school needs it and looks after the contract, e.g. School Business Manager." },
        { key: "technicalOwner", label: "Technical owner", type: "text", basis: "required", refs: ["dfe-registers", "dfe-licence"],
          help: "Who looks after it technically: the network manager, a technician or your IT support provider." },
        { key: "link", label: "Product or supplier web page", type: "url", basis: "good", refs: [],
          help: "Optional. Must start with https:// or http://.", placeholder: "https://" }
      ]
    },
    {
      id: "licensing", title: "Licensing",
      intro: "All software must be licensed. Licence dates feed the contracts register and budget planning.",
      fields: [
        { key: "licenceStatus", label: "Licence status", type: "select", options: LICENCE_STATUS, basis: "required", refs: ["dfe-licence", "ce-sum-1"],
          help: "\"Unlicensed\" software must be licensed or removed." },
        { key: "licenceModel", label: "Licence type", type: "select", options: LICENCE_MODEL, basis: "good", refs: ["dfe-registers"],
          help: "How it is licensed." },
        { key: "licenceQty", label: "Number of licences", type: "text", basis: "good", refs: ["dfe-registers"],
          help: "e.g. \"120 staff\", \"Site licence\"." },
        { key: "licenceRef", label: "Licence or contract reference", type: "text", basis: "good", refs: ["dfe-registers"],
          help: "Order number, agreement number or tenant name. Never record licence keys or passwords here." },
        { key: "licenceStart", label: "Licence start date", type: "date", basis: "good", refs: ["dfe-registers"], help: "" },
        { key: "renewalDate", label: "Renewal or expiry date", type: "date", basis: "required", refs: ["dfe-licence", "dfe-registers"],
          help: "When the licence or subscription ends or renews. Leave blank for perpetual licences." },
        { key: "cost", label: "Annual cost", type: "text", basis: "good", refs: ["dfe-registers"],
          help: "e.g. \"£1,200 a year\". Helps budget for renewals." },
        { key: "procurement", label: "Contract or procurement route", type: "text", basis: "good", refs: ["dfe-registers"],
          help: "e.g. direct, via the trust, a DfE-approved framework, or included with broadband." }
      ]
    },
    {
      id: "support", title: "Support and updates",
      intro: "Software must stay supported by the vendor and be kept up to date.",
      fields: [
        { key: "supportEnd", label: "Vendor support end date", type: "date", basis: "required", refs: ["ce-sum-1", "dfe-licence"],
          help: "The date the vendor stops providing security fixes. Cyber Essentials says the vendor must provide this date." },
        { key: "supported", label: "Currently supported by the vendor?", type: "select", options: SUPPORTED, basis: "required", refs: ["ce-sum-1", "ce-sum-2", "dfe-licence"],
          help: "Choose \"rolling\" only for a cloud service the supplier keeps up to date with no published end date." },
        { key: "autoUpdates", label: "Automatic updates on?", type: "select", options: AUTO_UPDATES, basis: "required", refs: ["ce-sum-3"],
          help: "Cyber Essentials asks for automatic updates wherever possible." },
        { key: "updateOwner", label: "Who updates it", type: "text", basis: "required", refs: ["ce-sum-4", "dfe-licence"],
          help: "Who makes sure updates are installed, e.g. \"IT support via Intune\"." },
        { key: "patch14", label: "Critical and high-risk fixes applied within 14 days?", type: "select", options: YES_NO, basis: "required", refs: ["ce-sum-4", "dfe-licence"],
          help: "Fixes the vendor rates critical or high risk (or CVSS 7 or more, or unrated) must be installed within 14 days of release." },
        { key: "lastUpdateCheck", label: "Updates last checked", type: "date", basis: "good", refs: ["ce-sum-4"], help: "" }
      ]
    },
    {
      id: "access", title: "Access",
      intro: "How people sign in, and who else can get in.",
      fields: [
        { key: "sso", label: "Single sign-on", type: "select", options: SSO, basis: "good", refs: ["dfe-cloud-idam", "dfe-accounts"],
          help: "Does sign-in go through your central identity system (e.g. Microsoft or Google)?" },
        { key: "mfa", label: "Multi-factor authentication (MFA) on?", type: "select", options: MFA, basis: "required", refs: ["ce-uac-4", "dfe-accounts"],
          help: "Required for every cloud service. Choose \"Yes\" if sign-in goes through single sign-on that enforces MFA.",
          showIf: e => !onDevice(e) || !e.type, showIfText: "Cloud services and anything else people sign in to" },
        { key: "adminAccounts", label: "Separate admin accounts used?", type: "select", options: ["Yes", "No", "Not applicable"], basis: "required", refs: ["ce-uac-5", "dfe-accounts"],
          help: "Admin work must be done from a separate account that is not used for email or browsing." },
        { key: "thirdPartyAccess", label: "Supplier, MSP or other third-party access?", type: "select", options: YES_NO, basis: "required", refs: ["ce-scope-7", "dfe-accounts"],
          help: "Accounts used by a supplier or your IT support provider are still in scope." },
        { key: "thirdPartyWho", label: "Who has third-party access", type: "text", basis: "required", refs: ["ce-scope-7"],
          help: "e.g. \"Supplier support desk, on request only\".", showIf: e => e.thirdPartyAccess === "Yes", showIfText: "When third-party access is Yes" },
        { key: "lastAccessReview", label: "Accounts last reviewed", type: "date", basis: "required", refs: ["dfe-accounts", "ce-uac-3"],
          help: "The DfE standard asks for accounts to be reviewed every term, removing those no longer needed." }
      ]
    },
    {
      id: "data", title: "Data protection",
      intro: "Work through these with your data protection officer (DPO).",
      fields: [
        { key: "personalData", label: "Holds or processes personal data?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-cloud-dp", "dp-policies"],
          help: "Names, email addresses, photos, assessment data and log-ins all count." },
        { key: "childrenData", label: "Includes children's data?", type: "select", options: YES_NO, basis: "required", refs: ["dp-policies", "dp-edtech"],
          help: "Children are vulnerable data subjects, so a DPIA should be considered.", showIf: personal, showIfText: "When it holds personal data" },
        { key: "specialCategory", label: "Includes special category data?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-cloud-dp", "dp-edtech", "gdpr-35"],
          help: "e.g. health, SEND, ethnicity, religion, biometrics. Safeguarding records usually include it.", showIf: personal, showIfText: "When it holds personal data" },
        { key: "dpia", label: "DPIA (data protection impact assessment)", type: "select", options: DPIA, basis: "required", refs: ["dfe-cloud-dp", "dp-edtech", "gdpr-35"],
          help: "Your DPO decides whether one is needed. Record the outcome either way.", showIf: personal, showIfText: "When it holds personal data" },
        { key: "dpiaDate", label: "DPIA date", type: "date", basis: "required", refs: ["dp-policies"],
          help: "A DPIA is not a one-off: review it when the software or how you use it changes.", showIf: e => personal(e) && e.dpia === "Done", showIfText: "When a DPIA is done" },
        { key: "dpa", label: "Data processing agreement in place?", type: "select", options: DPA, basis: "required", refs: ["dfe-cloud-dp", "gdpr-28", "dp-edtech"],
          help: "A contract or terms setting out how the supplier handles your data (UK GDPR Article 28).", showIf: personal, showIfText: "When it holds personal data" },
        { key: "dataLocation", label: "Where the data is stored", type: "select", options: LOCATIONS, basis: "required", refs: ["dfe-cloud-dp", "dp-edtech"],
          help: "Data should be stored in the UK or EU unless any international transfer has been confirmed as UK GDPR compliant.",
          showIf: e => personal(e) && !onDevice(e), showIfText: "Cloud services holding personal data" },
        { key: "transferChecked", label: "International transfer confirmed as UK GDPR compliant?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-cloud-dp"],
          help: "Ask the supplier and your DPO.", showIf: e => personal(e) && !onDevice(e) && ["USA", "Other or several countries"].includes(e.dataLocation),
          showIfText: "When data is stored outside the UK and EU" },
        { key: "privacyNotice", label: "Covered by your privacy notice?", type: "select", options: YES_NO, basis: "required", refs: ["dp-policies", "dp-edtech"],
          help: "Update privacy notices when you start using software that changes how you use personal data.", showIf: personal, showIfText: "When it holds personal data" },
        { key: "retention", label: "Retention period", type: "text", basis: "required", refs: ["dp-records", "dp-edtech"],
          help: "How long data is kept, and how it is deleted or returned at the end of the contract.", showIf: personal, showIfText: "When it holds personal data" },
        { key: "inIAR", label: "Listed in your information asset register?", type: "select", options: YES_NO, basis: "good", refs: ["dfe-registers"],
          help: "The information asset register is owned by your DPO.", showIf: personal, showIfText: "When it holds personal data" }
      ]
    },
    {
      id: "continuity", title: "Backup and continuity",
      intro: "Make sure you could recover the data, and carry on if the service is lost.",
      fields: [
        { key: "backup", label: "Data backed up?", type: "select", options: BACKUP, basis: "required", refs: ["dfe-backup", "dfe-cloud-backup"],
          help: "Cloud suppliers may keep backups for as little as 30 days, so check this is enough." },
        { key: "backupBy", label: "Backed up by, and how", type: "text", basis: "good", refs: ["dfe-backup"],
          help: "e.g. \"IT support, third-party Microsoft 365 backup, 1 year retention\".", showIf: e => /^Yes/.test(e.backup || ""), showIfText: "When it is backed up" },
        { key: "inContinuityPlan", label: "In the disaster recovery or business continuity plan?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-continuity"],
          help: "Include suppliers such as your MIS and cloud services in the plan." },
        { key: "exitPlan", label: "Exit or data export plan?", type: "select", options: YES_NO, basis: "good", refs: ["dp-edtech"],
          help: "How you would get your data back and have it deleted if you stop using it." }
      ]
    },
    {
      id: "malware", title: "Malware and allow listing",
      intro: "Only approved software should be installed, and devices it runs on need malware protection.",
      fields: [
        { key: "approvedApp", label: "On your approved apps list?", type: "select", options: YES_NO, basis: "required", refs: ["dfe-registers", "ce-mp-3", "dfe-malware"],
          help: "The DfE contracts register includes \"a list of your school or college's approved apps\"." },
        { key: "malwareCover", label: "Malware protection on the devices it runs on", type: "select", options: MALWARE, basis: "required", refs: ["ce-mp-1", "dfe-malware"],
          help: "Windows and macOS: anti-malware software. iPads and Chromebooks: usually allow listing through the managed app store.",
          showIf: e => onDevice(e) || !e.type, showIfText: "Installed software, mobile apps and browser extensions" }
      ]
    },
    {
      id: "accessibility", title: "Accessibility",
      intro: "",
      fields: [
        { key: "accessibility", label: "Supports accessibility features?", type: "select", options: ACCESSIBILITY, basis: "good", refs: ["dfe-accessibility"],
          help: "e.g. text-to-speech, captions, zoom, translation, and works with assistive technology." },
        { key: "accessibilityUrl", label: "Accessibility statement", type: "url", basis: "good", refs: ["dfe-accessibility"],
          help: "Link to the supplier's accessibility statement, if they have one.", placeholder: "https://" }
      ]
    },
    {
      id: "lifecycle", title: "Lifecycle",
      intro: "",
      fields: [
        { key: "status", label: "Status", type: "select", options: STATUSES, basis: "required", refs: ["ce-sum-2", "ce-sc-3"],
          help: "Mark software \"Removed\" once it has gone from every device, and keep the record." },
        { key: "dateApproved", label: "Date approved", type: "date", basis: "good", refs: ["dfe-registers"], help: "" },
        { key: "lastReviewed", label: "Last reviewed", type: "date", basis: "required", refs: ["dfe-registers", "dfe-licence"],
          help: "Registers should be updated whenever something changes and reviewed at least yearly." },
        { key: "nextReview", label: "Next review due", type: "date", basis: "good", refs: ["dfe-registers"], help: "" },
        { key: "notes", label: "Notes", type: "textarea", basis: "good", refs: [], help: "Anything else, e.g. actions agreed or links to evidence." }
      ]
    }
  ];

  const FIELDS = GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title }, f)));
  const FIELD_BY_KEY = {};
  FIELDS.forEach(f => { FIELD_BY_KEY[f.key] = f; });

  // ── Starter catalogue for "Quick add" ────────────────────────────────────
  // Common UK school software, grouped into sections (and sub-groups) so a
  // school can open a heading such as Safeguarding and tick what it uses.
  // Each entry is [name, vendor, category, type]. Vendor is only filled in
  // where the supplier is clear; type only where it is obvious. No versions,
  // support dates or prices: the school fills those in from its own records.
  // Listing a product here is not a recommendation.
  const SAAS = "SaaS (cloud service)", INSTALLED = "Installed software", APP = "Mobile app";
  const STARTER_SECTIONS = [
    { id: "safeguarding", title: "Safeguarding and online safety", groups: [
      { title: "Online monitoring", items: [
        ["Senso", "Senso", "Filtering and monitoring", ""],
        ["Securus", "Securus Software", "Filtering and monitoring", ""],
        ["Smoothwall Monitor", "Smoothwall", "Filtering and monitoring", ""],
        ["Impero", "Impero Software", "Filtering and monitoring", ""],
        ["NetSupport DNA", "NetSupport", "Filtering and monitoring", ""],
        ["Lightspeed Alert", "Lightspeed Systems", "Filtering and monitoring", ""],
        ["Linewize Monitor", "Linewize", "Filtering and monitoring", ""],
        ["eSafe", "eSafe Global", "Filtering and monitoring", ""]
      ] },
      { title: "Web filtering", items: [
        ["Smoothwall Filter", "Smoothwall", "Filtering and monitoring", ""],
        ["Netsweeper", "Netsweeper", "Filtering and monitoring", ""],
        ["Securly Filter", "Securly", "Filtering and monitoring", ""],
        ["Lightspeed Filter", "Lightspeed Systems", "Filtering and monitoring", ""],
        ["Linewize Filter", "Linewize", "Filtering and monitoring", ""],
        ["SurfProtect", "Exa Networks", "Filtering and monitoring", ""],
        ["WebScreen", "LGfL", "Filtering and monitoring", ""],
        ["RM SafetyNet", "RM", "Filtering and monitoring", ""]
      ] },
      { title: "Safeguarding records", items: [
        ["CPOMS", "CPOMS Systems", "Safeguarding", SAAS],
        ["MyConcern", "The Safeguarding Company", "Safeguarding", SAAS]
      ] }
    ] },
    { id: "mis", title: "MIS and school data", groups: [
      { title: "Management information systems", items: [
        ["Arbor", "Arbor Education", "MIS", SAAS],
        ["SIMS", "Education Software Solutions", "MIS", ""],
        ["Bromcom", "Bromcom", "MIS", SAAS],
        ["iSAMS", "iSAMS", "MIS", SAAS],
        ["ScholarPack", "", "MIS", SAAS],
        ["Pupil Asset", "Juniper Education", "MIS", SAAS]
      ] },
      { title: "Data sharing with other apps", items: [
        ["Wonde", "Wonde", "MIS", SAAS],
        ["Groupcall Xporter", "Groupcall", "MIS", SAAS]
      ] },
      { title: "Assessment and tracking", items: [
        ["FFT Aspire", "FFT Education", "MIS", SAAS],
        ["GL Assessment", "GL Assessment", "Curriculum and classroom", SAAS],
        ["Target Tracker", "Juniper Education", "MIS", SAAS]
      ] }
    ] },
    { id: "productivity", title: "Email, productivity and staff communication", groups: [
      { title: "", items: [
        ["Microsoft 365", "Microsoft", "Productivity and email", SAAS],
        ["Google Workspace for Education", "Google", "Productivity and email", SAAS],
        ["Microsoft Teams", "Microsoft", "Communication", SAAS],
        ["Adobe Creative Cloud", "Adobe", "Productivity and email", SAAS],
        ["Canva for Education", "Canva", "Productivity and email", SAAS]
      ] }
    ] },
    { id: "parents", title: "Parent communication and payments", groups: [
      { title: "", items: [
        ["ParentPay", "ParentPay", "Finance and HR", SAAS],
        ["ParentMail", "", "Communication", SAAS],
        ["Schoolcomms", "", "Communication", SAAS],
        ["sQuid", "sQuid", "Finance and HR", SAAS],
        ["Weduc", "", "Communication", SAAS],
        ["ClassDojo", "ClassDojo", "Communication", SAAS]
      ] }
    ] },
    { id: "learning", title: "Learning platforms and homework", groups: [
      { title: "", items: [
        ["Google Classroom", "Google", "Learning platform", SAAS],
        ["Satchel One", "Satchel", "Learning platform", SAAS],
        ["Seesaw", "Seesaw Learning", "Learning platform", SAAS],
        ["Tapestry", "The Foundation Stage Forum", "Learning platform", SAAS],
        ["Evidence Me", "2Simple", "Learning platform", SAAS]
      ] }
    ] },
    { id: "curriculum", title: "Curriculum and classroom apps", groups: [
      { title: "Maths", items: [
        ["Times Tables Rock Stars", "Maths Circle", "Curriculum and classroom", SAAS],
        ["Numbots", "Maths Circle", "Curriculum and classroom", SAAS],
        ["Sparx Maths", "Sparx", "Curriculum and classroom", SAAS],
        ["MyMaths", "Oxford University Press", "Curriculum and classroom", SAAS],
        ["Mathletics", "3P Learning", "Curriculum and classroom", SAAS],
        ["DoodleMaths", "", "Curriculum and classroom", SAAS]
      ] },
      { title: "Reading, writing and languages", items: [
        ["Accelerated Reader", "Renaissance Learning", "Curriculum and classroom", SAAS],
        ["Bug Club", "Pearson", "Curriculum and classroom", SAAS],
        ["Lexia", "Lexia Learning", "Curriculum and classroom", SAAS],
        ["Spelling Shed", "Education Shed", "Curriculum and classroom", SAAS]
      ] },
      { title: "General", items: [
        ["Purple Mash", "2Simple", "Curriculum and classroom", SAAS],
        ["Kerboodle", "Oxford University Press", "Curriculum and classroom", SAAS],
        ["Seneca", "Seneca Learning", "Curriculum and classroom", SAAS],
        ["CENTURY", "CENTURY Tech", "Curriculum and classroom", SAAS],
        ["Kahoot!", "Kahoot!", "Curriculum and classroom", SAAS],
        ["Scratch", "MIT", "Curriculum and classroom", ""],
        ["Unifrog", "Unifrog", "Curriculum and classroom", SAAS]
      ] }
    ] },
    { id: "send", title: "SEND and accessibility", groups: [
      { title: "", items: [
        ["Provision Map", "Edukey", "Curriculum and classroom", SAAS],
        ["Read&Write", "Texthelp", "Curriculum and classroom", ""],
        ["Clicker", "Crick Software", "Curriculum and classroom", ""],
        ["Widgit Online", "Widgit", "Curriculum and classroom", SAAS]
      ] }
    ] },
    { id: "office", title: "Finance, HR and school office", groups: [
      { title: "Finance and HR", items: [
        ["Sage", "Sage", "Finance and HR", ""],
        ["Xero", "Xero", "Finance and HR", SAAS],
        ["PS Financials", "", "Finance and HR", ""],
        ["IRIS Financials", "IRIS Software Group", "Finance and HR", ""]
      ] },
      { title: "Visitors and trips", items: [
        ["InVentry", "InVentry", "Other", ""],
        ["Sign In App", "Sign In App", "Other", SAAS],
        ["EVOLVE", "Eduspot", "Other", SAAS]
      ] }
    ] },
    { id: "security", title: "Security and backup", groups: [
      { title: "Anti-malware", items: [
        ["Microsoft Defender", "Microsoft", "Security", ""],
        ["Sophos Intercept X", "Sophos", "Security", ""],
        ["ESET", "ESET", "Security", ""],
        ["Bitdefender", "Bitdefender", "Security", ""]
      ] },
      { title: "Firewalls", items: [
        ["Sophos Firewall", "Sophos", "Security", ""],
        ["FortiGate", "Fortinet", "Security", ""],
        ["WatchGuard Firebox", "WatchGuard", "Security", ""]
      ] },
      { title: "Backup", items: [
        ["Veeam", "Veeam", "Backup", ""],
        ["Redstor", "Redstor", "Backup", SAAS]
      ] }
    ] },
    { id: "devices", title: "Device and classroom management", groups: [
      { title: "Device management", items: [
        ["Microsoft Intune", "Microsoft", "Device management", SAAS],
        ["Google Admin console", "Google", "Device management", SAAS],
        ["Apple School Manager", "Apple", "Device management", SAAS],
        ["Jamf School", "Jamf", "Device management", SAAS],
        ["Mosyle", "Mosyle", "Device management", SAAS]
      ] },
      { title: "Classroom management", items: [
        ["NetSupport School", "NetSupport", "Device management", INSTALLED],
        ["LanSchool", "Lenovo", "Device management", ""],
        ["Apple Classroom", "Apple", "Device management", APP]
      ] }
    ] },
    { id: "os", title: "Operating systems and browsers", groups: [
      { title: "Operating systems", items: [
        ["Windows 11", "Microsoft", "Operating system", INSTALLED],
        ["Windows 10", "Microsoft", "Operating system", INSTALLED],
        ["Windows Server", "Microsoft", "Operating system", INSTALLED],
        ["ChromeOS", "Google", "Operating system", INSTALLED],
        ["macOS", "Apple", "Operating system", INSTALLED],
        ["iPadOS", "Apple", "Operating system", INSTALLED]
      ] },
      { title: "Browsers", items: [
        ["Google Chrome", "Google", "Browser", INSTALLED],
        ["Microsoft Edge", "Microsoft", "Browser", INSTALLED],
        ["Safari", "Apple", "Browser", INSTALLED],
        ["Mozilla Firefox", "Mozilla", "Browser", INSTALLED]
      ] }
    ] }
  ];

  // Flat list (index = position), each entry with its section and group
  const STARTERS = [];
  STARTER_SECTIONS.forEach(sec => sec.groups.forEach(g => g.items.forEach(([name, vendor, category, type]) => {
    STARTERS.push({ name, vendor, category, type, section: sec.id, sectionTitle: sec.title, group: g.title });
  })));

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
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
    return d.toISOString().slice(0, 10);
  }
  function addMonths(iso, months) {
    const m = ISO_RE.exec(iso);
    const y = +m[1], mo = +m[2] - 1 + months, day = +m[3];
    // Clamp to the last day of the target month (31 Aug + 6 months = 28/29 Feb)
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mo, Math.min(day, last))).toISOString().slice(0, 10);
  }
  function formatDate(iso) {
    const m = ISO_RE.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }
  function newId() {
    const a = new Uint8Array(8);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
    return "sw-" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  // ── Entries ───────────────────────────────────────────────────────────────
  function blankEntry() {
    const e = { id: newId() };
    FIELDS.forEach(f => { e[f.key] = f.type === "checks" ? [] : ""; });
    e.status = "In use";
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
      if (f.type === "checks") {
        const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/\s*[,;]\s*/) : [];
        e[f.key] = f.options.filter(o => list.some(x => typeof x === "string" && x.trim().toLowerCase() === o.toLowerCase()));
      } else if (f.type === "select") {
        const s = typeof v === "string" ? v.trim() : "";
        e[f.key] = f.options.find(o => o.toLowerCase() === s.toLowerCase()) || "";
      } else if (f.type === "date") {
        e[f.key] = validDate(v);
      } else if (typeof v === "string" || typeof v === "number") {
        e[f.key] = limitText(v);
      }
    });
    if (!e.status) e.status = "In use";
    return e;
  }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, school: { name: "", urn: "", keptURN: "" }, items: [] };
  }

  // Validate a whole register (from storage or an imported file).
  function sanitiseState(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== "object") return s;
    if (hasOwn(raw, "school") && raw.school && typeof raw.school === "object") {
      ["name", "urn", "keptURN"].forEach(k => {
        const v = raw.school[k];
        if (typeof v === "string" || typeof v === "number") s.school[k] = limitText(v).slice(0, 300);
      });
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
  // Returns { rag: "Red" | "Amber" | "Green" | "Removed", reasons: [...] }.
  // Each reason: { level: "Red" | "Amber", code, text }.
  // "today" is an ISO date (optional, for testing).
  function evaluate(e, today) {
    const t = today || isoToday();
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });
    if (e.status === "Removed") return { rag: "Removed", reasons };
    const cloud = isCloud(e);

    // Red: support
    const rolling = e.supported === SUPPORTED_ROLLING;
    if (e.supportEnd && e.supportEnd < t) {
      red("unsupported", `Vendor support ended on ${formatDate(e.supportEnd)}. Unsupported software must be removed or upgraded.`);
    } else if (e.supported === "No") {
      red("unsupported", "Marked as no longer supported by the vendor. Unsupported software must be removed or upgraded.");
    }
    if (!e.supportEnd && !rolling) {
      red("no-support-date", "No vendor support end date recorded. Cyber Essentials says the vendor must provide this date.");
    }
    // Red: MFA for cloud services
    if (cloud && e.mfa !== "Yes") {
      red("cloud-no-mfa", e.mfa
        ? `Cloud service without MFA for everyone (recorded as "${e.mfa}"). Cyber Essentials requires MFA for all cloud services.`
        : "Cloud service with MFA not confirmed. Cyber Essentials requires MFA for all cloud services.");
    }
    // Red: personal data without a DPIA or data processing agreement
    if (e.personalData === "Yes") {
      if (!["Done", "Not needed (DPO has recorded why)"].includes(e.dpia)) {
        red("no-dpia", "Holds personal data but no DPIA is recorded (or your DPO's decision that one is not needed).");
      }
      if (!["Yes", "Not applicable (supplier does not process our data)"].includes(e.dpa)) {
        red("no-dpa", "Holds personal data but no data processing agreement with the supplier is recorded.");
      }
    }
    // Red: licensing
    if (e.licenceStatus === "Unlicensed") {
      red("unlicensed", "Recorded as unlicensed. License it or remove it from devices.");
    }
    // Red: no automatic updates and nobody responsible for updating
    if (!["Yes", "Supplier updates it (cloud service)"].includes(e.autoUpdates) && !String(e.updateOwner || "").trim()) {
      red("no-updates", "Automatic updates are not confirmed on and nobody is named to update it.");
    }

    // Amber: support ends soon
    if (e.supportEnd && e.supportEnd >= t && e.supportEnd <= addMonths(t, THRESHOLDS.supportEndWarnMonths)) {
      amber("support-ending", `Vendor support ends on ${formatDate(e.supportEnd)}, within ${THRESHOLDS.supportEndWarnMonths} months. Plan an upgrade or replacement.`);
    }
    // Amber: renewal due
    if (e.renewalDate) {
      if (e.renewalDate < t) {
        amber("renewal-passed", `Renewal date ${formatDate(e.renewalDate)} has passed. Check it was renewed and update the date.`);
      } else if (e.renewalDate <= addDays(t, THRESHOLDS.renewalWarnDays)) {
        amber("renewal-due", `Licence renewal due on ${formatDate(e.renewalDate)}, within ${THRESHOLDS.renewalWarnDays} days.`);
      }
    }
    if (!e.licenceStatus || e.licenceStatus === "Not sure") {
      amber("licence-unknown", "Licence status not confirmed.");
    }
    // Amber: review overdue
    const reviewCutoff = addMonths(t, -THRESHOLDS.reviewOverdueMonths);
    if (e.nextReview && e.nextReview < t) {
      amber("review-overdue", `Review was due on ${formatDate(e.nextReview)}.`);
    } else if (e.lastReviewed && e.lastReviewed < reviewCutoff) {
      amber("review-overdue", `Last reviewed on ${formatDate(e.lastReviewed)}, more than ${THRESHOLDS.reviewOverdueMonths} months ago.`);
    } else if (!e.lastReviewed && !e.nextReview) {
      amber("review-overdue", "No review date recorded.");
    }
    // Amber: backup unknown for a cloud service holding school data
    if (cloud && (!e.backup || e.backup === "Not sure")) {
      amber("backup-unknown", "Backup arrangements for this cloud service are not known. Suppliers may keep backups for as little as 30 days.");
    } else if (cloud && e.backup === "No") {
      amber("backup-unknown", "This cloud service's data is not backed up.");
    }
    // Amber: data location for cloud services holding personal data
    if (e.personalData === "Yes" && !onDevice(e)) {
      if (!e.dataLocation || e.dataLocation === "Not sure") {
        amber("location-unknown", "Where the data is stored is not known.");
      } else if (["USA", "Other or several countries"].includes(e.dataLocation) && e.transferChecked !== "Yes") {
        amber("transfer-unchecked", "Data is stored outside the UK and EU and the transfer has not been confirmed as UK GDPR compliant.");
      }
    }
    // Amber: owners
    if (!String(e.businessOwner || "").trim()) amber("no-owner", "No business owner named.");
    if (!String(e.technicalOwner || "").trim()) amber("no-owner", "No technical owner named.");

    const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : "Green";
    return { rag, reasons };
  }

  // Counts for the dashboard and home tile
  function summarise(state, today) {
    const out = { total: 0, active: 0, Red: 0, Amber: 0, Green: 0, Removed: 0, attention: 0 };
    (state.items || []).forEach(e => {
      const r = evaluate(e, today);
      out.total++;
      out[r.rag]++;
      if (r.rag !== "Removed") out.active++;
      if (r.rag === "Red" || r.rag === "Amber") out.attention++;
    });
    return out;
  }

  // The plain-English rules, for the page and the export
  const RULES = {
    Red: [
      "In use but unsupported: marked as not supported, or past the vendor support end date.",
      "No vendor support end date recorded (unless it is a cloud service with rolling support).",
      "A cloud service (SaaS, IaaS or PaaS) without MFA for everyone.",
      "Holds personal data but has no DPIA (or recorded decision that one is not needed), or no data processing agreement.",
      "Recorded as unlicensed.",
      "Automatic updates not confirmed on, and nobody named to update it."
    ],
    Amber: [
      `Vendor support ends within ${THRESHOLDS.supportEndWarnMonths} months.`,
      `Licence renewal due within ${THRESHOLDS.renewalWarnDays} days, or the renewal date has passed.`,
      "Licence status not confirmed.",
      `Review overdue: the next review date has passed, the last review was more than ${THRESHOLDS.reviewOverdueMonths} months ago, or no review date is recorded.`,
      "A cloud service whose backup is unknown or not in place.",
      "A cloud service holding personal data where the storage location is unknown, or outside the UK and EU with the transfer not confirmed.",
      "No business owner or no technical owner named."
    ],
    Green: ["None of the above."],
    Removed: ["No longer in use: kept for the record and not checked."]
  };

  window.RegisterModel = {
    STATE_KEY, SCHEMA_VERSION, MAX_ITEMS, THRESHOLDS, SOURCES, GROUPS, FIELDS, FIELD_BY_KEY, RULES,
    CATEGORIES, TYPES, CLOUD_TYPES, STATUSES, STARTERS, STARTER_SECTIONS, SUPPORTED_ROLLING,
    isCloud, onDevice, blankEntry, sanitiseEntry, sanitiseState, emptyState, loadState,
    evaluate, summarise, validDate, isoToday, addDays, addMonths, formatDate, newId
  };
})();

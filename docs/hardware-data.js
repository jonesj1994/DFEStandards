// Hardware and asset register: field definitions, sources and compliance rules.
//
// Shared by hardware.html (hardware-app.js) and the home page tile
// (hardware-home.js), so everything here is plain data and pure functions with
// no page code. See docs/HARDWARE-REGISTER.md for the reasoning behind each
// field and rule.
//
// Load order: ce-data.js (optional, for the current Cyber Essentials PDF link),
// assessment-model.js (optional, for limitText), then this file.
(function () {
  "use strict";

  const STATE_KEY = "hardware_register_v1";
  const SCHEMA_VERSION = 1;
  const MAX_ITEMS = 5000;                 // a large secondary school has a few thousand devices
  const MAX_TEXT = 20000;                 // characters per text field (same as the trackers)

  // ── Thresholds for the compliance checks (see HARDWARE-REGISTER.md) ──────
  const THRESHOLDS = Object.freeze({
    supportEndWarnMonths: 6,              // Amber: OS or firmware support ends within 6 months
    warrantyWarnDays: 60,                 // Amber: warranty ends within 60 days
    leaseWarnDays: 60,                    // Amber: lease ends within 60 days
    auditOverdueMonths: 12,               // Amber: asset not checked for more than 12 months
    patchWindowDays: 14,                  // Cyber Essentials: critical and high-risk fixes within 14 days
    termlyCheckMonths: 4,                 // "termly": firewall firmware check, whole-register review
    newPurchaseMonths: 12                 // DfE minimum support and warranty checks apply to devices bought in the last 12 months
  });

  // DfE "Laptops, desktops and tablets" minimum requirements (devices-3), in
  // years, for devices being bought. Switches: network switching standard.
  const MIN_SUPPORT_YEARS = Object.freeze({ Laptop: 5, Desktop: 5, Chromebook: 5, Tablet: 3, Switch: 5 });
  const MIN_WARRANTY_YEARS = Object.freeze({ Laptop: 3, Desktop: 3, Chromebook: 3, Tablet: 2, Switch: 5 });

  // ── Sources ───────────────────────────────────────────────────────────────
  const GOVUK = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/";
  const CE_URL = typeof CE_SOURCE_URL !== "undefined" ? CE_SOURCE_URL
    : "https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf";
  // Follows ce-data.js when the Cyber Essentials version changes
  const CE_NAME = "Cyber Essentials " + ((typeof CE_VERSION !== "undefined" && (/v\d+(?:\.\d+)*/i.exec(CE_VERSION) || [])[0]) || "v3.3");
  const NCSC_DEV = "https://www.ncsc.gov.uk/collection/device-security-guidance/";

  // Each source: short label for the "Why:" line, the URL, and (for the field
  // guide) the tracker item it supports.
  const SOURCES = {
    "dfe-registers": {
      short: "DfE digital leadership: Keep registers relating to hardware and systems up to date",
      url: GOVUK + "digital-leadership-and-governance-core-standard", tracker: "dfe", item: "leadership-2"
    },
    "dfe-template": {
      short: "DfE Plan technology for your school: Digital technology asset register (template)",
      url: "https://plan-technology-for-your-school.education.gov.uk/digital-technology-asset-register"
    },
    "dfe-devices-secure": {
      short: "DfE laptops, desktops and tablets: Devices should be safe and secure",
      url: GOVUK + "laptops-desktops-and-tablets", tracker: "dfe", item: "devices-2"
    },
    "dfe-devices-min": {
      short: "DfE laptops, desktops and tablets: Devices should meet or exceed the minimum requirements",
      url: GOVUK + "laptops-desktops-and-tablets", tracker: "dfe", item: "devices-3"
    },
    "dfe-devices-dispose": {
      short: "DfE laptops, desktops and tablets: Make sure devices are energy efficient, and they are bought and disposed of sustainably",
      url: GOVUK + "laptops-desktops-and-tablets", tracker: "dfe", item: "devices-4"
    },
    "dfe-licence": {
      short: "DfE cyber security: License digital technology and keep it up to date",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-5"
    },
    "dfe-firewall": {
      short: "DfE cyber security: Secure digital technology and data with anti-malware and a firewall",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-3"
    },
    "dfe-accounts": {
      short: "DfE cyber security: Control and secure user accounts and access privileges",
      url: GOVUK + "cyber-security-core-standard", tracker: "dfe", item: "cyber-4"
    },
    "dfe-switch-manage": {
      short: "DfE network switching: Have a platform that can centrally manage the network switching infrastructure",
      url: GOVUK + "network-switching-core-standard", tracker: "dfe", item: "switching-2"
    },
    "dfe-switch-security": {
      short: "DfE network switching: The network switches should have security features to protect users and data",
      url: GOVUK + "network-switching-core-standard", tracker: "dfe", item: "switching-3"
    },
    "dfe-switch-ups": {
      short: "DfE network switching: Core network switches should be connected to at least one UPS",
      url: GOVUK + "network-switching-core-standard", tracker: "dfe", item: "switching-4"
    },
    "dfe-wireless-manage": {
      short: "DfE wireless network: Have a solution that can centrally manage the wireless network",
      url: GOVUK + "wireless-network-core-standard", tracker: "dfe", item: "wireless-3"
    },
    "dfe-wireless-security": {
      short: "DfE wireless network: Install security features to stop unauthorised access",
      url: GOVUK + "wireless-network-core-standard", tracker: "dfe", item: "wireless-4"
    },
    "dfe-servers": {
      short: "DfE servers and storage: All servers and related storage platforms should continue to work if any single component or service fails",
      url: GOVUK + "servers-and-storage", tracker: "dfe", item: "servers-1"
    },
    "dfe-servers-energy": {
      short: "DfE servers and storage: Servers should be energy-efficient",
      url: GOVUK + "servers-and-storage", tracker: "dfe", item: "servers-3"
    },
    "ce-scope-2": { short: CE_NAME + ": end-user devices and networking equipment are in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-2" },
    "ce-scope-4": { short: CE_NAME + ": BYOD that accesses school data or services is in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-4" },
    "ce-scope-5": { short: CE_NAME + ": devices loaned to pupils are in scope; pupils' own devices are not (scope)", url: CE_URL, tracker: "ce", item: "scope-5" },
    "ce-scope-6": { short: CE_NAME + ": home and remote working devices are in scope (scope)", url: CE_URL, tracker: "ce", item: "scope-6" },
    "ce-fw-1": { short: CE_NAME + ": every device is protected by a correctly configured firewall (firewalls)", url: CE_URL, tracker: "ce", item: "fw-1" },
    "ce-fw-2": { short: CE_NAME + ": default administrative passwords are changed (firewalls)", url: CE_URL, tracker: "ce", item: "fw-2" },
    "ce-fw-3": { short: CE_NAME + ": the firewall's admin interface is not open to the internet (firewalls)", url: CE_URL, tracker: "ce", item: "fw-3" },
    "ce-fw-7": { short: CE_NAME + ": software firewall on devices used on untrusted networks (firewalls)", url: CE_URL, tracker: "ce", item: "fw-7" },
    "ce-sc-2": { short: CE_NAME + ": default or guessable passwords are changed (secure configuration)", url: CE_URL, tracker: "ce", item: "sc-2" },
    "ce-sc-6": { short: CE_NAME + ": a password, PIN or biometric is needed to unlock devices (secure configuration)", url: CE_URL, tracker: "ce", item: "sc-6" },
    "ce-sum-1": { short: CE_NAME + ": software, including operating systems and firmware, is licensed and supported (security update management)", url: CE_URL, tracker: "ce", item: "sum-1" },
    "ce-sum-2": { short: CE_NAME + ": unsupported software is removed or segregated (security update management)", url: CE_URL, tracker: "ce", item: "sum-2" },
    "ce-sum-3": { short: CE_NAME + ": automatic updates where possible (security update management)", url: CE_URL, tracker: "ce", item: "sum-3" },
    "ce-sum-4": { short: CE_NAME + ": critical and high-risk updates within 14 days (security update management)", url: CE_URL, tracker: "ce", item: "sum-4" },
    "ce-mp-1": { short: CE_NAME + ": malware protection on every device (malware protection)", url: CE_URL, tracker: "ce", item: "mp-1" },
    "ncsc-sanitisation": {
      short: "NCSC: Secure sanitisation of storage media",
      url: "https://www.ncsc.gov.uk/guidance/secure-sanitisation-storage-media"
    },
    "ncsc-erasing": { short: "NCSC device security guidance: Erasing devices", url: NCSC_DEV + "managing-deployed-devices/erasing-devices" },
    "ncsc-obsolete": { short: "NCSC device security guidance: Obsolete products", url: NCSC_DEV + "managing-deployed-devices/obsolete-products" },
    "govuk-waste": {
      short: "GOV.UK: Dispose of business or commercial waste (waste transfer notes)",
      url: "https://www.gov.uk/dispose-business-commercial-waste"
    },
    "govuk-weee": {
      short: "GOV.UK: Regulations: Waste Electrical and Electronic Equipment (WEEE)",
      url: "https://www.gov.uk/guidance/regulations-waste-electrical-and-electronic-equipment"
    },
    "gdpr-32": { short: "UK GDPR Article 32 (security of processing, including encryption)", url: "https://www.legislation.gov.uk/eur/2016/679/article/32" },
    "gdpr-33": { short: "UK GDPR Article 33 (reporting a personal data breach within 72 hours)", url: "https://www.legislation.gov.uk/eur/2016/679/article/33" }
  };

  // ── Device types and the groups they belong to ────────────────────────────
  const TYPES = [
    "Laptop", "Desktop", "Chromebook", "Tablet", "Mobile phone", "Thin client",
    "Server", "Network storage (NAS or SAN)",
    "Firewall", "Router", "Switch", "Wireless access point", "Wireless controller",
    "Printer or copier", "Interactive panel or whiteboard", "Projector or display", "Desk phone (VoIP)",
    "CCTV, door entry or other networked device", "UPS (uninterruptible power supply)", "Other"
  ];
  const END_USER = ["Laptop", "Desktop", "Chromebook", "Tablet", "Mobile phone", "Thin client"];
  const PORTABLE = ["Laptop", "Chromebook", "Tablet", "Mobile phone"];
  const SERVERS = ["Server", "Network storage (NAS or SAN)"];
  const NETWORK = ["Firewall", "Router", "Switch", "Wireless access point", "Wireless controller"];
  const BOUNDARY = ["Firewall", "Router"];
  // Devices Cyber Essentials expects anti-malware software or allow listing on
  const MALWARE_TYPES = END_USER.concat(["Server"]);

  // ── Option lists ──────────────────────────────────────────────────────────
  // Values match the DfE asset register template where it has one.
  const CONDITIONS = ["New", "Refurbished", "Used", "Donated"];
  const OWN_SCHOOL = "Owned by the school";
  const OWN_LEASED = "Leased";
  const OWN_LOANED = "Loaned or provided by another organisation";
  const BYOD_STAFF = "Personal device of staff, a governor, trustee or volunteer (BYOD)";
  const BYOD_PUPIL = "Personal device of a pupil (BYOD)";
  const OWNERSHIP = [OWN_SCHOOL, OWN_LEASED, OWN_LOANED, BYOD_STAFF, BYOD_PUPIL];
  const ASSIGN_PUPIL = "Loaned to a pupil";
  const ASSIGNMENT = [
    "Shared or in a fixed place (classroom, office, network)", "Assigned to a member of staff", ASSIGN_PUPIL,
    "Assigned to a governor, trustee or volunteer", "Not assigned (spare)"
  ];
  const YES_NO = ["Yes", "No", "Not sure"];
  const SUPPORTED = ["Yes", "No", "Not sure"];
  const AUTO_UPDATES = ["Yes", "No", "Not possible on this device", "Not sure"];
  const OS_GRADE = ["Yes", "No (a home edition)", "Not sure"];
  const ENCRYPTION = ["Yes", "No", "Not possible on this device", "Not sure"];
  const MANAGED = ["Yes", "No", "Not sure"];
  const MALWARE = ["Anti-malware software", "Application allow listing (managed app store)", "Both", "None", "Not sure"];
  const FIREWALL = ["Software firewall on", "No software firewall (only used on the school network)", "No firewall", "Not sure"];
  const SCREEN_LOCK = ["Yes", "No", "Not sure"];
  const PW_CHANGED = "Yes, changed or admin access turned off";
  const PW_NONE = "No default password (set up at installation)";
  const DEFAULT_PW = [PW_CHANGED, PW_NONE, "No, still the default", "Not sure"];
  const ADMIN_SAFE = ["Not reachable from the internet", "Reachable from the internet, protected by MFA or an IP allow list"];
  const ADMIN_UNSAFE = "Reachable from the internet with only a password";
  const ADMIN_INTERFACE = ADMIN_SAFE.concat([ADMIN_UNSAFE, "Not sure"]);
  const UPS = ["Yes", "No", "Not needed", "Not sure"];
  const WIFI = ["Wi-Fi 7", "Wi-Fi 6E", "Wi-Fi 6 (802.11ax)", "802.11ac Wave 2", "Older than 802.11ac Wave 2", "Not known"];
  const ENERGY = ["ENERGY STAR or equivalent", "No energy label", "Not known"];
  const AUTO_POWER = ["Yes", "No", "Not possible", "Not sure"];

  const ST_IN_USE = "In use";
  const ST_SPARE = "Spare or in storage";
  const ST_REPAIR = "In repair";
  const ST_BROKEN = "Broken";
  const ST_RETIRED = "Retired, waiting for disposal";
  const ST_LOST = "Lost or stolen";
  const ST_DISPOSED = "Disposed of";
  const STATUSES = [ST_IN_USE, ST_SPARE, ST_REPAIR, ST_BROKEN, ST_RETIRED, ST_LOST, ST_DISPOSED];
  const STORED = [ST_SPARE, ST_REPAIR, ST_BROKEN];

  const LOST_ACTIONS = [
    "Remotely locked or wiped", "Reported to the data protection officer", "Passwords and sign-ins on it reset",
    "Reported to the police", "Reported to the insurer or RPA", "Removed from device management and other systems"
  ];
  const LOST_DPO = "Reported to the data protection officer";
  const DISPOSAL_METHODS = [
    "Collected by a WEEE recycler or IT disposal company", "Returned to the leasing company or supplier",
    "Sold or donated after data was wiped", "Returned to the manufacturer (warranty or trade-in)",
    "Taken to a recycling centre by the school", "Other"
  ];
  const SAN_CERT = "Certificate of data destruction held";
  const SAN_OK = [SAN_CERT, "Wiped or factory reset by IT support, and recorded", "Storage removed and destroyed", "Device held no data"];
  const SANITISATION = SAN_OK.concat(["Not done", "Not sure"]);
  const WEEE_OK = ["Waste transfer note or WEEE certificate held", "Handled by the leasing company or supplier, confirmation held"];
  const WEEE = WEEE_OK.concat(["No", "Not sure"]);

  const isType = list => e => list.includes(e.type);
  const endUser = isType(END_USER);
  const portable = isType(PORTABLE);
  const server = isType(SERVERS);
  const network = isType(NETWORK);
  const boundary = isType(BOUNDARY);
  const noType = e => !e.type;
  const isByod = e => e.ownership === BYOD_STAFF || e.ownership === BYOD_PUPIL;
  const pupilByod = e => e.ownership === BYOD_PUPIL;
  // Anything with a login or admin page that isn't a computer: network kit,
  // servers, printers, panels, phones, CCTV and so on.
  const hasAdminLogin = e => !endUser(e) || noType(e);

  // ── Fields ────────────────────────────────────────────────────────────────
  // type: text | textarea | select | date | checks
  // basis: "required" = a standard (DfE, Cyber Essentials, UK GDPR or waste
  // law) asks for this information; "good" = good practice.
  // showIf: the field only applies when this returns true (hidden otherwise).
  // aliases: other column headings accepted on import (the DfE template's).
  const GROUPS = [
    {
      id: "identity", title: "Identity",
      intro: "What the device is, so it can be found, checked and insured.",
      fields: [
        { key: "assetTag", label: "Asset number", type: "text", basis: "required", refs: ["dfe-registers", "dfe-devices-secure"],
          help: "The number on the school's asset label or tag, e.g. \"LAP-0042\".", aliases: ["Asset tag", "Asset ID"] },
        { key: "type", label: "Device type", type: "select", options: TYPES, basis: "required", refs: ["dfe-registers", "ce-scope-2"],
          help: "Decides which other questions and checks apply.", aliases: ["Asset type", "Type"] },
        { key: "make", label: "Make", type: "text", basis: "required", refs: ["dfe-template"],
          help: "The manufacturer, e.g. Dell, Apple, Aruba.", aliases: ["Make of asset", "Manufacturer"] },
        { key: "model", label: "Model", type: "text", basis: "required", refs: ["dfe-registers", "dfe-template"],
          help: "Including the variant, e.g. \"Latitude 3540\" or \"iPad (10th generation)\". The support end date depends on it.", aliases: ["Model of asset"] },
        { key: "serialNumber", label: "Serial number", type: "text", basis: "required", refs: ["dfe-registers"],
          help: "Usually on the underside of the device or in its settings.", aliases: ["Serial", "Serial no"] },
        { key: "condition", label: "Condition when it arrived", type: "select", options: CONDITIONS, basis: "good", refs: ["dfe-template"],
          help: "New, refurbished, used or donated.", aliases: ["Condition of asset"] }
      ]
    },
    {
      id: "location", title: "Location and users",
      intro: "Where the device is and who has it. Devices loaned to pupils and staff's own devices still count for Cyber Essentials.",
      fields: [
        { key: "site", label: "Site or building", type: "text", basis: "required", refs: ["dfe-registers"],
          help: "e.g. \"Main building\" or \"Junior site\".", aliases: ["Location: Building", "Building", "Site"] },
        { key: "room", label: "Room", type: "text", basis: "required", refs: ["dfe-registers"],
          help: "e.g. \"ICT suite 2\", \"Server room\", \"Trolley 3\".", aliases: ["Location: Room", "Location"] },
        { key: "assignment", label: "How it is used", type: "select", options: ASSIGNMENT, basis: "required", refs: ["dfe-registers", "ce-scope-5"],
          help: "Devices the school owns and loans to pupils are in Cyber Essentials scope." },
        { key: "assignedTo", label: "Assigned to", type: "text", basis: "required", refs: ["dfe-registers"],
          help: "The person, class or team who has it, e.g. \"Year 5\" or \"Ms Patel\". For pupils, use an initial or MIS number rather than a full name.",
          aliases: ["Who is the asset assigned to?", "Assigned user", "User"] },
        { key: "ownership", label: "Ownership", type: "select", options: OWNERSHIP, basis: "required", refs: ["dfe-template", "ce-scope-4", "ce-scope-5"],
          help: "Staff, governors' and volunteers' own devices that access school data are in Cyber Essentials scope; pupils' own devices are not." }
      ]
    },
    {
      id: "software", title: "Operating system, firmware and updates",
      intro: "Devices must run supported operating systems and firmware, with security updates installed promptly.",
      fields: [
        { key: "os", label: "Operating system or firmware", type: "text", basis: "required", refs: ["dfe-template", "ce-sum-1"],
          help: "e.g. \"Windows 11 Education\", \"iPadOS\", \"ChromeOS\", or the firmware name for network equipment and printers.", aliases: ["Operating system", "OS", "Firmware"] },
        { key: "osVersion", label: "Version", type: "text", basis: "required", refs: ["ce-sum-1", "dfe-licence"],
          help: "e.g. \"24H2\", \"18.1\", \"16.04.0010\". Support usually depends on the version." },
        { key: "supportEnd", label: "Support end date", type: "date", basis: "required", refs: ["dfe-licence", "ce-sum-1", "dfe-template"],
          help: "When the operating system or firmware stops getting security updates, or the device itself stops being supported, whichever is sooner. For Chromebooks, the Auto Update Expiration date.",
          aliases: ["When does the asset expire or become unsupported?", "End of support", "Support end"] },
        { key: "supported", label: "Currently supported?", type: "select", options: SUPPORTED, basis: "required", refs: ["ce-sum-1", "ce-sum-2", "ncsc-obsolete"],
          help: "Is the manufacturer still releasing security updates for this version?" },
        { key: "osGrade", label: "Enterprise or education edition?", type: "select", options: OS_GRADE, basis: "required", refs: ["dfe-devices-min", "dfe-devices-secure"],
          help: "DfE minimum requirement: \"designed for professional rather than home use\", e.g. Windows Education or Pro, not Home.",
          showIf: e => endUser(e) || noType(e), showIfText: "Laptops, desktops, Chromebooks, tablets, phones and thin clients" },
        { key: "autoUpdates", label: "Automatic updates on?", type: "select", options: AUTO_UPDATES, basis: "required", refs: ["ce-sum-3", "dfe-switch-security"],
          help: "Cyber Essentials asks for automatic updates wherever possible, including firmware." },
        { key: "lastPatched", label: "Updates last applied or checked", type: "date", basis: "required", refs: ["ce-sum-4", "dfe-licence", "dfe-firewall"],
          help: "Critical and high-risk fixes must be installed within 14 days. Firewall firmware should be checked every term." }
      ]
    },
    {
      id: "security", title: "Security",
      intro: "How the device is protected. Questions that don't apply to this type of device are hidden.",
      fields: [
        { key: "encrypted", label: "Storage encrypted?", type: "select", options: ENCRYPTION, basis: "required", refs: ["gdpr-32", "dfe-devices-secure", "ncsc-sanitisation"],
          help: "e.g. BitLocker or FileVault. iPads, iPhones and Chromebooks are encrypted when a passcode or sign-in is set.",
          showIf: e => endUser(e) || server(e) || noType(e), showIfText: "Computers, tablets, phones and servers" },
        { key: "managed", label: "Centrally managed?", type: "select", options: MANAGED, basis: "required", refs: ["dfe-devices-secure", "dfe-switch-manage", "dfe-wireless-manage"],
          help: "Enrolled in device management (e.g. Intune, Google Admin, Jamf) so it can be locked or wiped, or for network equipment, in a central management platform.",
          showIf: e => !pupilByod(e) && (endUser(e) || network(e) || noType(e)), showIfText: "Computers, tablets, phones and network equipment" },
        { key: "malware", label: "Malware protection", type: "select", options: MALWARE, basis: "required", refs: ["ce-mp-1", "dfe-firewall"],
          help: "Windows and macOS: anti-malware software. iPads, phones and Chromebooks: usually allow listing through the managed app store.",
          showIf: e => !pupilByod(e) && (isType(MALWARE_TYPES)(e) || noType(e)), showIfText: "Computers, tablets, phones and servers" },
        { key: "firewall", label: "Software firewall", type: "select", options: FIREWALL, basis: "required", refs: ["ce-fw-1", "ce-fw-7", "dfe-firewall"],
          help: "Required on devices used away from the school network, such as at home or on public wifi.",
          showIf: e => !pupilByod(e) && (["Laptop", "Desktop", "Chromebook", "Server"].includes(e.type) || noType(e)), showIfText: "Laptops, desktops, Chromebooks and servers" },
        { key: "screenLock", label: "Password, PIN or biometric to unlock?", type: "select", options: SCREEN_LOCK, basis: "required", refs: ["ce-sc-6", "dfe-accounts"],
          help: "A credential must be needed to unlock the device, with protection against repeated guessing.",
          showIf: e => !pupilByod(e) && (endUser(e) || noType(e)), showIfText: "Computers, tablets, phones and thin clients" },
        { key: "defaultPassword", label: "Default admin password changed?", type: "select", options: DEFAULT_PW, basis: "required", refs: ["ce-fw-2", "ce-sc-2", "dfe-firewall", "dfe-switch-security"],
          help: "Network equipment, printers and other devices often ship with a default admin password that must be changed.",
          showIf: hasAdminLogin, showIfText: "Servers, network equipment, printers and other networked devices" },
        { key: "adminInterface", label: "Admin page reachable from the internet?", type: "select", options: ADMIN_INTERFACE, basis: "required", refs: ["ce-fw-3", "dfe-firewall"],
          help: "The firewall's admin page must not be open to the internet unless there is a documented need and it is protected by MFA or an IP allow list.",
          showIf: e => boundary(e) || noType(e), showIfText: "Firewalls and routers" },
        { key: "ups", label: "Connected to a UPS?", type: "select", options: UPS, basis: "good", refs: ["dfe-switch-ups", "dfe-servers"],
          help: "Core switches should have at least one UPS; servers need a UPS with safe automatic shutdown and at least 30 minutes' run time.",
          showIf: e => server(e) || ["Firewall", "Router", "Switch", "Wireless controller"].includes(e.type), showIfText: "Servers, firewalls, routers, switches and wireless controllers" },
        { key: "wifi", label: "Wi-Fi standard supported", type: "select", options: WIFI, basis: "good", refs: ["dfe-devices-min"],
          help: "DfE minimum for portable devices: 802.11ac Wave 2; Wi-Fi 6 recommended.",
          showIf: e => portable(e), showIfText: "Laptops, Chromebooks, tablets and phones" }
      ]
    },
    {
      id: "purchase", title: "Purchase, warranty and lease",
      intro: "For budgeting, insurance and planning replacements.",
      fields: [
        { key: "purchaseDate", label: "Purchase date", type: "date", basis: "required", refs: ["dfe-registers", "dfe-template"],
          help: "When it was bought or donated.", aliases: ["Date purchased", "Date bought"] },
        { key: "madeDate", label: "Date made or first used", type: "date", basis: "required", refs: ["dfe-registers"],
          help: "Only if it was second-hand, refurbished or donated: the DfE asks for how old it is, which \"may be different to how long you have owned it\"." },
        { key: "purchaseCost", label: "Purchase price", type: "text", basis: "good", refs: ["dfe-template"],
          help: "e.g. \"£549\". For leased devices, write \"Leased\".", aliases: ["Purchase price (£)", "Purchase price", "Cost"] },
        { key: "supplier", label: "Supplier", type: "text", basis: "good", refs: ["dfe-template"],
          help: "Who you bought it from, or who donated it.", aliases: ["Supplier of the asset"] },
        { key: "orderRef", label: "Order or invoice reference", type: "text", basis: "good", refs: ["dfe-template"],
          help: "Helps with warranty and insurance claims." },
        { key: "warrantyEnd", label: "Warranty end date", type: "date", basis: "required", refs: ["dfe-devices-min", "dfe-servers", "dfe-switch-manage"],
          help: "DfE minimum when buying: 3 years for laptops and desktops, 2 years for tablets, 5 years for switches." },
        { key: "leaseEnd", label: "Lease end date", type: "date", basis: "good", refs: ["dfe-template"],
          help: "Record the lease itself in your contracts register.", showIf: e => e.ownership === OWN_LEASED || e.ownership === OWN_LOANED,
          showIfText: "Leased or loaned devices" }
      ]
    },
    {
      id: "lifecycle", title: "Lifecycle and checks",
      intro: "",
      fields: [
        { key: "status", label: "Status", type: "select", options: STATUSES, basis: "required", refs: ["dfe-registers", "ce-sum-2"],
          help: "Keep disposed of, lost and stolen devices in the register as a record.", aliases: ["Asset status"] },
        { key: "lastAudited", label: "Last checked", type: "date", basis: "required", refs: ["dfe-template"],
          help: "When someone last saw the device and checked these details.", aliases: ["Date of last check or replacement", "Last audited"] },
        { key: "checkedBy", label: "Checked by", type: "text", basis: "good", refs: ["dfe-template"],
          help: "", aliases: ["Person responsible for the last check or replacement"] },
        { key: "replacementDate", label: "Next review or replacement due", type: "date", basis: "required", refs: ["dfe-registers", "dfe-template"],
          help: "When to consider replacing or upgrading it. Usually no later than the support end date.",
          aliases: ["Date of next check or replacement", "Planned replacement date"] },
        { key: "energy", label: "Energy rating", type: "select", options: ENERGY, basis: "good", refs: ["dfe-devices-dispose", "dfe-servers-energy"],
          help: "Check for a low energy certification such as ENERGY STAR when buying." },
        { key: "autoPowerOff", label: "Switches off automatically out of hours?", type: "select", options: AUTO_POWER, basis: "good", refs: ["dfe-devices-dispose"],
          help: "", showIf: e => e.type === "Desktop" || e.type === "Interactive panel or whiteboard" || e.type === "Projector or display" || e.type === "Printer or copier" || e.type === "Thin client",
          showIfText: "Desktops, thin clients, panels, displays and printers" },
        { key: "updatedBy", label: "Entry last updated by", type: "text", basis: "good", refs: ["dfe-template"],
          help: "", aliases: ["Person completing this entry"] },
        { key: "notes", label: "Notes", type: "textarea", basis: "good", refs: [],
          help: "Anything else, e.g. damage, repairs, or links to evidence. Never record passwords here.", aliases: ["Additional comments", "Comments"] }
      ]
    },
    {
      id: "lost", title: "Lost or stolen",
      intro: "A lost device may hold personal data. Your data protection officer decides whether it must be reported to the ICO, within 72 hours.",
      showIf: e => e.status === ST_LOST,
      fields: [
        { key: "lostDate", label: "Date lost or stolen", type: "date", basis: "required", refs: ["gdpr-33"], help: "When it was noticed missing.",
          showIf: e => e.status === ST_LOST, showIfText: "Lost or stolen devices" },
        { key: "lostActions", label: "Actions taken", type: "checks", options: LOST_ACTIONS, basis: "required", refs: ["ncsc-erasing", "dfe-devices-secure", "gdpr-33"],
          help: "Tick everything that has been done.", showIf: e => e.status === ST_LOST, showIfText: "Lost or stolen devices" }
      ]
    },
    {
      id: "disposal", title: "Disposal",
      intro: "Wipe or destroy all data first, then dispose of the device under the WEEE rules and keep the certificates.",
      showIf: e => e.status === ST_DISPOSED || e.status === ST_RETIRED,
      fields: [
        { key: "disposalDate", label: "Date disposed of", type: "date", basis: "required", refs: ["dfe-registers"],
          help: "", showIf: e => e.status === ST_DISPOSED, showIfText: "Disposed of devices" },
        { key: "disposalMethod", label: "How it was disposed of", type: "select", options: DISPOSAL_METHODS, basis: "required", refs: ["dfe-devices-dispose", "govuk-weee"],
          help: "", showIf: e => e.status === ST_DISPOSED || e.status === ST_RETIRED, showIfText: "Retired and disposed of devices" },
        { key: "sanitisation", label: "Data wiped or destroyed", type: "select", options: SANITISATION, basis: "required", refs: ["dfe-devices-dispose", "ncsc-sanitisation"],
          help: "For encrypted devices, a factory reset that deletes the encryption keys is usually enough. Otherwise use an approved wiping tool or destroy the storage.",
          showIf: e => e.status === ST_DISPOSED || e.status === ST_RETIRED, showIfText: "Retired and disposed of devices" },
        { key: "certificateRef", label: "Data destruction certificate reference", type: "text", basis: "required", refs: ["dfe-devices-dispose"],
          help: "The certificate or job number from the disposal company.", showIf: e => e.status === ST_DISPOSED && e.sanitisation === SAN_CERT, showIfText: "When a certificate is held" },
        { key: "weee", label: "WEEE or waste transfer paperwork", type: "select", options: WEEE, basis: "required", refs: ["dfe-devices-dispose", "govuk-waste", "govuk-weee"],
          help: "Keep the waste transfer note (or the company's certificate) for at least 2 years.",
          showIf: e => e.status === ST_DISPOSED, showIfText: "Disposed of devices" },
        { key: "disposedBy", label: "Disposed of by", type: "text", basis: "good", refs: ["dfe-template"],
          help: "The member of staff and the company.", showIf: e => e.status === ST_DISPOSED || e.status === ST_RETIRED,
          showIfText: "Retired and disposed of devices", aliases: ["Who decommissioned/ disposed of this asset and when?"] }
      ]
    }
  ];

  const FIELDS = GROUPS.flatMap(g => g.fields.map(f => Object.assign({ group: g.id, groupTitle: g.title, aliases: [] }, f)));
  // A Map, not a plain object, so untrusted keys can never reach the prototype
  const FIELD_BY_KEY = new Map(FIELDS.map(f => [f.key, f]));

  // ── Quick add: device categories only ─────────────────────────────────────
  // No makes, models, dates or prices: the school fills those in.
  const QUICK_TYPES = [
    "Laptop", "Desktop", "Chromebook", "Tablet", "Mobile phone", "Server", "Firewall", "Router", "Switch",
    "Wireless access point", "Printer or copier", "Interactive panel or whiteboard", "Projector or display",
    "Desk phone (VoIP)", "UPS (uninterruptible power supply)"
  ];
  const QUICK_MAX = 500;                  // per type, per go

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
  // Whole years and months between two ISO dates, e.g. "4 years 2 months"
  function ageText(fromIso, toIso) {
    const a = ISO_RE.exec(fromIso || ""), b = ISO_RE.exec(toIso || "");
    if (!a || !b || fromIso > toIso) return "";
    let months = (+b[1] - +a[1]) * 12 + (+b[2] - +a[2]) - (+b[3] < +a[3] ? 1 : 0);
    const y = Math.floor(months / 12), m = months % 12;
    if (!y && !m) return "under a month";
    return [y ? `${y} year${y === 1 ? "" : "s"}` : "", m ? `${m} month${m === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ");
  }
  function newId() {
    const a = new Uint8Array(8);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); });
    return "hw-" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

  // Match free text from an import to a device type (DfE template wording,
  // e.g. "Desktop PC", "Firewall - on premise", "Multi functional printer").
  const TYPE_PATTERNS = [
    [/chromebook/i, "Chromebook"], [/laptop|notebook|macbook/i, "Laptop"],
    [/thin client/i, "Thin client"], [/desk ?phone|voip|ip phone/i, "Desk phone (VoIP)"],
    [/tablet|ipad/i, "Tablet"], [/mobile|smartphone|iphone|\bphone\b/i, "Mobile phone"],
    [/\b(nas|san)\b|network attached storage|storage area network/i, "Network storage (NAS or SAN)"],
    [/server/i, "Server"], [/firewall/i, "Firewall"], [/wireless controller/i, "Wireless controller"],
    [/access point|\bwap\b|\bap\b/i, "Wireless access point"], [/\bcad\b|\bcnc\b/i, "Other"], [/router/i, "Router"],
    [/switch/i, "Switch"], [/printer|copier|\bmfd\b/i, "Printer or copier"],
    [/interactive|whiteboard|touch ?screen/i, "Interactive panel or whiteboard"],
    [/projector|display|signage|monitor|screen/i, "Projector or display"],
    [/\bups\b|uninterrupt/i, "UPS (uninterruptible power supply)"],
    [/cctv|camera|door|access control|nvr|visitor/i, "CCTV, door entry or other networked device"],
    [/desktop|\bpc\b|tower|all-in-one|imac|mac mini/i, "Desktop"]
  ];
  function matchType(v) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) return "";
    const exact = TYPES.find(t => t.toLowerCase() === s.toLowerCase());
    if (exact) return exact;
    for (const [re, t] of TYPE_PATTERNS) if (re.test(s)) return t;
    return "Other";
  }
  // DfE template "Asset status" values
  const STATUS_WORDS = [
    [/^active|^in use/i, ST_IN_USE], [/repair/i, ST_REPAIR], [/broken/i, ST_BROKEN],
    [/disposed of$|^disposed/i, ST_DISPOSED], [/decommis|to be disposed|due to be disposed|retired/i, ST_RETIRED],
    [/lost|stolen/i, ST_LOST], [/spare|storage|stock/i, ST_SPARE]
  ];
  function matchStatus(v) {
    const s = typeof v === "string" ? v.trim() : "";
    const exact = STATUSES.find(t => t.toLowerCase() === s.toLowerCase());
    if (exact) return exact;
    for (const [re, t] of STATUS_WORDS) if (re.test(s)) return t;
    return "";
  }

  // ── Entries ───────────────────────────────────────────────────────────────
  function blankEntry() {
    const e = { id: newId() };
    FIELDS.forEach(f => { e[f.key] = f.type === "checks" ? [] : ""; });
    e.status = ST_IN_USE;
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
        if (f.key === "type") e.type = s ? matchType(s) : "";
        else if (f.key === "status") e.status = matchStatus(s);
        else e[f.key] = f.options.find(o => o.toLowerCase() === s.toLowerCase()) || "";
      } else if (f.type === "date") {
        e[f.key] = validDate(v);
      } else if (typeof v === "string" || typeof v === "number") {
        e[f.key] = limitText(v);
      }
    });
    if (!e.status) e.status = ST_IN_USE;
    return e;
  }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, school: { name: "", urn: "", keptURN: "", lastRegisterReview: "" }, items: [] };
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
      if (hasOwn(raw.school, "lastRegisterReview")) s.school.lastRegisterReview = validDate(raw.school.lastRegisterReview);
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

  // Cyber Essentials scope, worked out from the type and ownership
  function ceScope(e) {
    if (e.ownership === BYOD_PUPIL) return "Out of scope (a pupil's own device)";
    if (e.type === "UPS (uninterruptible power supply)") return "Usually out of scope unless it has a network connection";
    if (e.ownership === BYOD_STAFF) return "In scope if it accesses school data or services";
    if (e.assignment === ASSIGN_PUPIL) return "In scope (school-owned, loaned to a pupil)";
    if (!e.type || !e.ownership) return "Not worked out yet: choose the device type and ownership";
    return "In scope";
  }

  // ── Compliance checks ─────────────────────────────────────────────────────
  // Returns { rag: "Red" | "Amber" | "Green" | "Closed", reasons: [...] }.
  // Each reason: { level: "Red" | "Amber", code, text }.
  // "Closed" = disposed of or lost, with nothing outstanding: kept for the record.
  // "today" is an ISO date (optional, for testing).
  function evaluate(e, today) {
    const t = today || isoToday();
    const reasons = [];
    const red = (code, text) => reasons.push({ level: "Red", code, text });
    const amber = (code, text) => reasons.push({ level: "Amber", code, text });
    const done = closed => {
      const rag = reasons.some(r => r.level === "Red") ? "Red" : reasons.length ? "Amber" : closed ? "Closed" : "Green";
      return { rag, reasons };
    };
    const trimmed = k => String(e[k] || "").trim();

    // Disposed of: only the disposal record is checked
    if (e.status === ST_DISPOSED) {
      if (!SAN_OK.includes(e.sanitisation)) {
        red("disposal-no-wipe", e.sanitisation === "Not done"
          ? "Disposed of without wiping or destroying the data. Find out where it went and get a data destruction certificate, or tell your data protection officer."
          : "Disposed of with no record that the data was wiped or destroyed. Get the certificate from the disposal company or record how it was wiped.");
      }
      if (!WEEE_OK.includes(e.weee)) amber("disposal-no-weee", "No WEEE or waste transfer paperwork recorded. WEEE regulations are a legal requirement: keep the paperwork for 2 years.");
      if (!e.disposalDate) amber("disposal-no-date", "No disposal date recorded.");
      return done(true);
    }
    // Lost or stolen: only the response is checked
    if (e.status === ST_LOST) {
      if (!e.lostActions.length) {
        red("lost-no-action", "Lost or stolen with no action recorded. Lock or wipe it remotely, reset passwords and sign-ins on it, and tell your data protection officer.");
      } else if (!e.lostActions.includes(LOST_DPO)) {
        amber("lost-no-dpo", "Not recorded as reported to the data protection officer, who decides whether it is a personal data breach that must be reported to the ICO within 72 hours.");
      }
      if (!e.lostDate) amber("lost-no-date", "No date recorded for when it was lost or stolen.");
      return done(true);
    }

    const live = e.status === ST_IN_USE;
    const stored = STORED.includes(e.status);
    const retired = e.status === ST_RETIRED;
    const pByod = pupilByod(e);

    if (retired) {
      amber("awaiting-disposal", "Waiting for disposal. Wipe or destroy its data, dispose of it under the WEEE rules and update its status.");
    }

    // Red: support (Cyber Essentials sum-1, sum-2; DfE cyber-5)
    if ((live || stored) && !pByod) {
      const ended = e.supportEnd && e.supportEnd < t;
      if (ended || e.supported === "No") {
        const why = ended ? `Support ended on ${formatDate(e.supportEnd)}.` : "Marked as no longer supported.";
        if (live) red("unsupported", `${why} Unsupported devices must be upgraded, replaced, or cut off from the internet.`);
        else amber("unsupported-stored", `${why} Do not put it back into use: upgrade it or dispose of it.`);
      }
      if (!e.supportEnd) {
        if (live) red("no-support-date", "No support end date recorded. Cyber Essentials says the manufacturer must provide the date updates stop, and the DfE asks for it in the asset register.");
        else amber("no-support-date", "No support end date recorded. Find it before putting the device back into use.");
      }
    }

    if (live && !pByod) {
      const byod = isByod(e);
      // Red: portable school devices not encrypted (UK GDPR Article 32)
      if (portable(e) && !byod && e.encrypted !== "Yes") {
        red("not-encrypted", e.encrypted === "No" || e.encrypted === "Not possible on this device"
          ? `A ${e.type.toLowerCase()} that is not encrypted. If it is lost or stolen, the data on it can be read.`
          : `Encryption is not confirmed on this ${e.type.toLowerCase()}. Portable devices can be lost or stolen, so check it is encrypted.`);
      } else if ((endUser(e) || server(e)) && !byod && (!e.encrypted || e.encrypted === "Not sure")) {
        amber("encryption-unknown", "Encryption is not confirmed.");
      }
      // Red: default admin passwords (Cyber Essentials fw-2, sc-2)
      if (hasAdminLogin(e) && e.type) {
        if (e.defaultPassword === "No, still the default") {
          red("default-password", "Still has its default admin password. Change it to a strong, unique password or turn off admin access.");
        } else if (![PW_CHANGED, PW_NONE].includes(e.defaultPassword)) {
          if (network(e) || server(e)) red("default-password", "Not confirmed that the default admin password has been changed. Network equipment and servers must not use default passwords.");
          else amber("default-password", "Not confirmed that the default admin password has been changed.");
        }
      }
      // Red: firewall admin page open to the internet (fw-3)
      if (boundary(e)) {
        if (e.adminInterface === ADMIN_UNSAFE) red("admin-exposed", "Admin page can be reached from the internet with only a password. Block it, or protect it with MFA or an IP allow list.");
        else if (!ADMIN_SAFE.includes(e.adminInterface)) amber("admin-unknown", "Not confirmed whether the admin page can be reached from the internet.");
      }
      // Malware protection (mp-1)
      if (isType(MALWARE_TYPES)(e)) {
        if (e.malware === "None") red("no-malware", "No malware protection. Every device needs anti-malware software or application allow listing.");
        else if (!e.malware || e.malware === "Not sure") amber("malware-unknown", "Malware protection is not confirmed.");
      }
      // Screen lock (sc-6)
      if (endUser(e)) {
        if (e.screenLock === "No") red("no-screen-lock", "Can be used without a password, PIN or biometric.");
        else if (!e.screenLock || e.screenLock === "Not sure") amber("screen-lock-unknown", "Not confirmed that a password, PIN or biometric is needed to unlock it.");
      }
      // Software firewall on laptops (fw-1, fw-7)
      if (["Laptop", "Chromebook"].includes(e.type)) {
        if (e.firewall === "No firewall" || e.firewall === "No software firewall (only used on the school network)") {
          if (e.assignment === ASSIGN_PUPIL || byod) red("no-firewall", "No software firewall on a device used away from school. A software firewall is required on devices used on networks the school doesn't control.");
          else amber("no-firewall", "No software firewall. Laptops are easily taken off site, so turn on the built-in firewall.");
        } else if (!e.firewall || e.firewall === "Not sure") amber("firewall-unknown", "Software firewall not confirmed.");
      } else if (["Desktop", "Server"].includes(e.type) && e.firewall === "No firewall") {
        amber("no-firewall", "No firewall recorded. Turn on the built-in software firewall or confirm the network firewall protects it.");
      }
      // Updates (sum-3, sum-4)
      const patchCut = addDays(t, -THRESHOLDS.patchWindowDays);
      if (!e.autoUpdates || e.autoUpdates === "Not sure") {
        amber("updates-unknown", "Not confirmed whether automatic updates are on.");
      } else if (e.autoUpdates !== "Yes" && (!e.lastPatched || e.lastPatched < patchCut)) {
        amber("updates-overdue", `Updates are not automatic and were not recorded as applied or checked in the last ${THRESHOLDS.patchWindowDays} days.`);
      }
      // Termly firewall firmware check (DfE cyber-3)
      if (boundary(e) && (!e.lastPatched || e.lastPatched < addMonths(t, -THRESHOLDS.termlyCheckMonths))) {
        amber("firmware-check", "Firmware not recorded as checked this term. The DfE asks for boundary firewall firmware to be checked termly.");
      }
      // Support ends soon
      if (e.supportEnd && e.supportEnd >= t && e.supportEnd <= addMonths(t, THRESHOLDS.supportEndWarnMonths)) {
        amber("support-ending", `Support ends on ${formatDate(e.supportEnd)}, within ${THRESHOLDS.supportEndWarnMonths} months. Plan an upgrade or replacement.`);
      }
      // Home editions (DfE devices-3)
      if (endUser(e) && e.osGrade === "No (a home edition)") {
        amber("home-edition", "Uses a home edition operating system. The DfE says devices should be replaced or upgraded now if they don't have an enterprise or education-grade operating system.");
      }
      // Device management
      if (!byod && (endUser(e) || network(e)) && e.managed !== "Yes") {
        amber("not-managed", e.managed === "No" ? "Not centrally managed." : "Central management is not confirmed.");
      }
    }

    // DfE minimum support and warranty for recent purchases (devices-3, switching-2)
    if ((live || stored) && e.purchaseDate && e.purchaseDate >= addMonths(t, -THRESHOLDS.newPurchaseMonths) && e.condition !== "Donated") {
      const minS = MIN_SUPPORT_YEARS[e.type], minW = MIN_WARRANTY_YEARS[e.type];
      if (minS && e.supportEnd && e.supportEnd < addMonths(e.purchaseDate, minS * 12)) {
        amber("short-support", `Bought on ${formatDate(e.purchaseDate)} with less than the DfE minimum of ${minS} years' support.`);
      }
      if (minW && e.warrantyEnd && e.warrantyEnd < addMonths(e.purchaseDate, minW * 12)) {
        amber("short-warranty", `Bought on ${formatDate(e.purchaseDate)} with less than the DfE minimum ${minW}-year warranty.`);
      }
    }

    if (live || stored) {
      // Warranty and lease
      if (e.warrantyEnd && e.warrantyEnd >= t && e.warrantyEnd <= addDays(t, THRESHOLDS.warrantyWarnDays)) {
        amber("warranty-ending", `Warranty ends on ${formatDate(e.warrantyEnd)}, within ${THRESHOLDS.warrantyWarnDays} days.`);
      }
      if ((e.ownership === OWN_LEASED || e.ownership === OWN_LOANED) && e.leaseEnd) {
        if (e.leaseEnd < t) amber("lease-ended", `Lease ended on ${formatDate(e.leaseEnd)}. Return or renew it, and update the register.`);
        else if (e.leaseEnd <= addDays(t, THRESHOLDS.leaseWarnDays)) amber("lease-ending", `Lease ends on ${formatDate(e.leaseEnd)}, within ${THRESHOLDS.leaseWarnDays} days.`);
      }
      // Review and replacement
      if (e.replacementDate && e.replacementDate < t) {
        amber("replacement-due", `Review or replacement was due on ${formatDate(e.replacementDate)}.`);
      }
      // Identity, location and checks
      if (!trimmed("assetTag") && !trimmed("serialNumber")) amber("no-identity", "No asset number or serial number recorded.");
      if (!trimmed("site") && !trimmed("room") && !trimmed("assignedTo")) amber("no-location", "No location or assigned person recorded.");
      if (!e.lastAudited) amber("audit-overdue", "Never recorded as checked.");
      else if (e.lastAudited < addMonths(t, -THRESHOLDS.auditOverdueMonths)) {
        amber("audit-overdue", `Last checked on ${formatDate(e.lastAudited)}, more than ${THRESHOLDS.auditOverdueMonths} months ago.`);
      }
    }
    return done(false);
  }

  // Counts for the dashboard and home tile
  function summarise(state, today) {
    const out = { total: 0, active: 0, Red: 0, Amber: 0, Green: 0, Closed: 0, attention: 0 };
    (state.items || []).forEach(e => {
      const r = evaluate(e, today);
      out.total++;
      out[r.rag]++;
      if (e.status !== ST_DISPOSED && e.status !== ST_LOST) out.active++;
      if (r.rag === "Red" || r.rag === "Amber") out.attention++;
    });
    return out;
  }

  // Whole-register review: DfE asks for it every term
  function registerReviewDue(state, today) {
    const t = today || isoToday();
    const d = state.school && state.school.lastRegisterReview;
    return !d || d < addMonths(t, -THRESHOLDS.termlyCheckMonths);
  }

  // The plain-English rules, for the page and the export
  const RULES = {
    Red: [
      "In use but unsupported: past its support end date, or marked as not supported.",
      "In use with no support end date recorded.",
      "A school-owned laptop, Chromebook, tablet or phone that is not confirmed as encrypted.",
      "Network equipment or a server whose default admin password is not confirmed as changed (any other device marked as still using its default password).",
      "A firewall or router whose admin page can be reached from the internet with only a password.",
      "A computer, tablet, phone or server with no malware protection.",
      "A computer, tablet or phone that can be unlocked without a password, PIN or biometric.",
      "A laptop or Chromebook loaned to a pupil, or a personal device, with no software firewall.",
      "Disposed of without a record that the data was wiped or destroyed.",
      "Lost or stolen with no action recorded."
    ],
    Amber: [
      `Support ends within ${THRESHOLDS.supportEndWarnMonths} months.`,
      `Warranty ends within ${THRESHOLDS.warrantyWarnDays} days, or a lease ends within ${THRESHOLDS.leaseWarnDays} days or has ended.`,
      `Not checked for more than ${THRESHOLDS.auditOverdueMonths} months, never checked, or the review or replacement date has passed.`,
      "No location or assigned person, or no asset number or serial number.",
      `Automatic updates not confirmed, or not automatic and not applied in the last ${THRESHOLDS.patchWindowDays} days.`,
      `A firewall or router whose firmware has not been checked in the last ${THRESHOLDS.termlyCheckMonths} months (termly).`,
      "Encryption, malware protection, screen lock, software firewall, central management or the firewall admin page not confirmed.",
      "A home edition operating system on a computer or tablet.",
      "Bought in the last 12 months with less than the DfE minimum support or warranty.",
      "A spare, broken or in-repair device that is unsupported or has no support end date.",
      "Retired and waiting for disposal.",
      "Disposed of without WEEE or waste paperwork or a disposal date; lost or stolen without telling the data protection officer or without a date."
    ],
    Green: ["None of the above."],
    Closed: ["Disposed of, or lost or stolen, with everything recorded: kept for the record."]
  };

  window.HardwareModel = {
    STATE_KEY, SCHEMA_VERSION, MAX_ITEMS, THRESHOLDS, SOURCES, GROUPS, FIELDS, FIELD_BY_KEY, RULES,
    TYPES, STATUSES, OWNERSHIP, QUICK_TYPES, QUICK_MAX, MIN_SUPPORT_YEARS, MIN_WARRANTY_YEARS,
    ST_IN_USE, ST_DISPOSED, ST_LOST, ST_RETIRED,
    blankEntry, sanitiseEntry, sanitiseState, emptyState, loadState, matchType, matchStatus,
    evaluate, summarise, registerReviewDue, ceScope, validDate, isoToday, addDays, addMonths, formatDate, ageText, newId
  };
})();

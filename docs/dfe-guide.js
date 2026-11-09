// How-to guidance for each DfE standard area, shown on the tracker's Start here
// page and in the "How to fill in this area" box on each area page.
// This is practical advice on gathering evidence. It is not DfE wording: the
// standards themselves (and what they require) are in data.js, word for word
// from GOV.UK, and each area page links to the official guidance.
const AREA_GUIDE = {
  "broadband": {
    who: "Business manager, your broadband provider and IT support.",
    evidence: [
      "Broadband contract: connection type (full fibre or not), speed, end date",
      "Details of any backup connection and what it covers",
      "Firewall and web filtering supplied with the connection"
    ],
    tip: "Contract end dates are a good Complete by date: that's usually when you can move to full fibre or add a backup line."
  },
  "cloud-solution": {
    who: "IT support, business manager and your data protection officer (DPO).",
    evidence: [
      "Which systems are cloud-based (email, files, MIS, learning platforms) and which are still on site",
      "Data protection impact assessments (DPIAs) and data processing agreements for cloud services",
      "How staff and pupils sign in (single sign-on, multi-factor authentication)",
      "How cloud data is backed up"
    ],
    tip: "List your cloud services first, for example in a software register. It makes the other standards in this area quicker to check."
  },
  "cyber-security": {
    who: "IT support, business manager, headteacher and your DPO.",
    evidence: [
      "Your cyber risk assessment and when it was last reviewed",
      "Staff cyber training records (for example NCSC training) and pupil online-safety lessons",
      "Anti-malware and firewall in place on every device",
      "Joiners and leavers process for accounts; who has admin rights; MFA",
      "Software licences and update status",
      "Backup plan and the date of the last restore test",
      "Who you would report a cyber incident to"
    ],
    tip: "If you are working towards Cyber Essentials, much of the same evidence counts for these standards. Registers of user accounts, backups and cyber incidents also help."
  },
  "digital-accessibility": {
    who: "SENCO, IT support and whoever runs the website and communications.",
    evidence: [
      "Accessibility plan and digital strategy: is digital accessibility included?",
      "Accessibility features turned on and used (for example dictation, immersive reader, magnification)",
      "Website accessibility checks and how letters and newsletters are sent"
    ],
    tip: "Ask the SENCO which pupils use accessibility features. It quickly shows whether they work on your devices."
  },
  "digital-leadership": {
    who: "Headteacher, senior leadership team and governors.",
    evidence: [
      "Named SLT member (and governor) responsible for digital technology",
      "Hardware and systems registers and when they were last updated",
      "Business continuity and disaster recovery plans that include IT",
      "Digital technology strategy and its last review date"
    ],
    tip: "Keep your hardware and software registers somewhere everyone can find them, with the date they were last updated."
  },
  "filtering-monitoring": {
    who: "Designated safeguarding lead (DSL), IT support and the safeguarding governor.",
    evidence: [
      "Who is responsible for filtering and for monitoring (usually set out in the safeguarding policy)",
      "Your most recent annual filtering and monitoring review and who signed it off",
      "Filtering provider and how staff ask for sites to be blocked or unblocked",
      "How monitoring alerts reach the DSL and are recorded"
    ],
    tip: "This is linked to the KCSIE safeguarding duty, so it should already be met. Involve the DSL when rating it."
  },
  "laptops-desktops-tablets": {
    who: "IT support, business manager and the digital lead.",
    evidence: [
      "Device list with ages and specifications (the Hardware register)",
      "Device management, encryption and passwords",
      "Devices that fall below the DfE minimum specification or are out of support",
      "How devices are bought and disposed of (energy ratings, recycling, data wiping)"
    ],
    tip: "Devices out of support make good Complete by dates in your replacement plan."
  },
  "network-cabling": {
    who: "IT support, site manager and your cabling installer.",
    evidence: [
      "Cable type in each building (for example Cat 5e or Cat 6A) and the fibre links between buildings",
      "Installation and test certificates for recent work"
    ],
    tip: "Recabling is usually done during building works or refurbishment, so a longer Complete by date is fine. Note the plan in Recommendations."
  },
  "network-switching": {
    who: "IT support.",
    evidence: [
      "Switch models, ages and whether they are managed centrally",
      "Security settings (VLANs, port security, firmware updates)",
      "Whether core switches have a UPS (battery backup)"
    ],
    tip: "Ask IT support for a short network summary. It usually answers all four standards."
  },
  "servers-storage": {
    who: "IT support and the site manager.",
    evidence: [
      "Any on-site servers: what they do, their age and whether they have redundancy",
      "Security, encryption and updates",
      "Power settings and energy use",
      "Where they are kept: locked room, temperature, power protection"
    ],
    tip: "If you plan to move to the cloud instead of replacing a server, say so in Recommendations."
  },
  "it-support": {
    who: "Business manager, the digital lead and your IT support provider.",
    evidence: [
      "IT support contract or job description and service levels",
      "Records of response times or tickets",
      "When IT support was last reviewed",
      "Staff training and guidance on using technology"
    ],
    tip: "A termly meeting with IT support to go through this tracker is good evidence for several of these standards."
  },
  "wireless-network": {
    who: "IT support.",
    evidence: [
      "Wireless standard of your access points (for example Wi-Fi 6) and their age",
      "Coverage: any areas with weak or no signal",
      "Central management of the access points",
      "Wireless security (separate staff, pupil and guest networks)"
    ],
    tip: "A wireless survey shows coverage gaps. Walk the site with a phone or laptop if you don't have one."
  }
};

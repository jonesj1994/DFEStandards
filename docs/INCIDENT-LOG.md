# Cyber incident and breach log: what it records and why

The incident log (`incidents.html`) records cyber incidents, attacks, near misses and personal data breaches, what was done about them, and who was told and when. This document lists each field, the requirement it supports (quoting the source), and the rules behind the Red/Amber/Green checks and the ICO 72-hour countdown.

Sources were read on 5 November 2026:

| Short name | Source |
|---|---|
| **DfE cyber security** | [Cyber security: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard) (GOV.UK, last updated 16 September 2026; text held in `data.js`). Mainly *Report cyber attacks* (`cyber-7`), with *Conduct a cyber risk assessment annually and review every term* (`cyber-1`), *Create and implement a cyber awareness plan for students and staff* (`cyber-2`) and *Develop and implement a plan to back up your data* (`cyber-6`). |
| **DfE digital leadership** | [Digital leadership and governance: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-leadership-and-governance-core-standard), *Include digital technology within disaster recovery and business continuity plans* (`leadership-3`) |
| **DfE breaches** | DfE *Data protection in schools*: [Managing breaches of data](https://www.gov.uk/guidance/data-protection-in-schools/managing-breaches-of-data) (updated 14 October 2026) |
| **UK GDPR** | [Article 4(12)](https://www.legislation.gov.uk/eur/2016/679/article/4), [Article 33](https://www.legislation.gov.uk/eur/2016/679/article/33) and [Article 34](https://www.legislation.gov.uk/eur/2016/679/article/34), legislation.gov.uk (latest revised version, including the 30 September 2026 amendments) |
| **NCSC** | [Incident management: cyber incident response processes](https://www.ncsc.gov.uk/collection/incident-management/cyber-incident-response-processes) and [Incident management](https://www.ncsc.gov.uk/collection/incident-management) |
| **RPA rules** | [RPA membership rules for academy trusts, September 2026](https://assets.publishing.service.gov.uk/media/6a7c63be783bd442d7805caa/rpa-membership-rules-academy-september-2026.pdf), Section 14 Cyber and the Claims Guidelines. The [rules for local authority maintained schools](https://assets.publishing.service.gov.uk/media/6a478a34732d8e7ce5f53c09/RPA_Memership_Rules_LAMS.pdf) (2026 to 2027) have the same Section 14 conditions and helpline. |
| **RPA claims** | DfE: [Make a claim through the Risk Protection Arrangement (RPA)](https://www.gov.uk/guidance/make-a-claim-through-the-risk-protection-arrangement-rpa) (updated 1 September 2026) |

"**Required**" below means a standard, the law or the RPA rules ask for this information (or the check it enables). "**Good practice**" means it is useful, or the guidance suggests it, but nothing requires it to be recorded.

## Why an incident log at all

- **DfE cyber security**, *Report cyber attacks*: "Any incidents, attacks or near misses should be recorded in an internal incident report or system." As soon as IT support and the SLT digital lead are alerted they should "action their cyber incident response plan … contain the risk and make sure systems are safe and secure … capture information on the risk … investigate the risk and decide on the next course of action … report the potential incident or attack to the governing body or trustees".
- **UK GDPR Article 33(5)**: "The controller shall document any personal data breaches, comprising the facts relating to the personal data breach, its effects and the remedial action taken. That documentation shall enable the [Commissioner] to verify compliance with this Article." This applies to **every** personal data breach, not just the ones reported.
- **DfE breaches**: "It is good practice to record and investigate every personal data breach, however small. Recording every incident allows your data protection officer to spot any trends." And: "You should always make sure you document all lessons and actions you've taken."
- **DfE cyber security**, *risk assessment*: the SLT digital lead should "capture how many cyber incidents or attacks have already occurred and what they are so that you can understand common themes and know where you need to improve". The dashboard's "this academic year by type" table is for this.
- **NCSC**: "Keeping careful track of the whole response is very important in cases which may later be reviewed by regulators or courts." "Throughout the response, all tasks and findings should be tracked."

### What counts as an incident

- **DfE cyber security**: "A cyber incident or attack will often be an intentional and unauthorised attempt to access, change or damage data and digital technology. They could be made by a person, group, or organisation outside or inside the school or college."
- **RPA rules**, Section 14 definitions: "Cyber Incident: Any actual or suspected unauthorised access to any computer, other computing and electronic equipment … that processes, stores, transmits, retrieves or receives data."
- **UK GDPR Article 4(12)**: "'personal data breach' means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data transmitted, stored or otherwise processed".
- **DfE breaches**: "Data breaches can be deliberate or accidental. A breach is about more than just losing personal data."

So the log covers cyber incidents (with or without personal data), personal data breaches with no cyber element (for example an email to the wrong parent or a lost paper file), and near misses.

## Data minimisation

A breach log must not become a second copy of the breached data. UK GDPR Article 33(3)(a) asks for "the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned", not the people or records themselves. The log therefore:

- asks for **types** of people (pupils, staff, parents and carers …) and data (contact details, special category, safeguarding …) as tick boxes, and **approximate numbers** as free text;
- asks for **roles**, not names, for who reported the incident, who is leading the response and who owns each action;
- shows a "Keep this log free of personal data" notice on the dashboard and the form: no names of pupils, staff or parents; no passwords, sign-in details or security codes; no copies of leaked data, phishing emails or screenshots containing personal data (say where the investigation file is kept instead);
- shows a gentle prompt under free-text fields when the text looks like an email address, a phone number or "password: …" (nothing is blocked or sent anywhere);
- reminds users that everything stays in **this browser** on this device, and asks them to confirm before exporting that the Excel file is sensitive and should be stored in a restricted location, not sent by unencrypted email. The export's Info sheet repeats this.

## Fields

Fields are grouped as on the form. Some appear only when they apply (the "Applies to" column).

### The incident

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Reference (filled in as `INC-YYYY-NNN`) | Required | All | DfE *Report cyber attacks*: record incidents "in an internal incident report or system". A reference lets staff refer to an incident without naming anyone. |
| Short title | Required | All | As above. |
| Date and time discovered | Required | All | UK GDPR Article 33(1): the 72 hours run from "having become aware". This is the start of the ICO clock unless the field below is later. |
| Date and time it happened (if known) | Good practice | All | NCSC: post-incident review should establish what happened; RPA investigation services include "identification of when the incident occurred". |
| Reported by (role) | Good practice | All | DfE: "Everyone is responsible for and should report a cyber incident or attack to their IT support and senior leadership (SLT) digital lead." |
| Who is leading the response (role) | Required | All | DfE: "Any formal reporting to external bodies (such as Report Fraud) will need to be done by someone appointed by the SLT digital lead". |
| Type of incident | Required | All | DfE risk assessment: capture "how many cyber incidents or attacks have already occurred and what they are". Types: phishing or suspicious email, malware or ransomware, account compromise, unauthorised access, personal data sent to the wrong person, lost or stolen device or paperwork, denial of service, website defacement, physical security incident, supplier or third-party incident, other. The first four plus denial of service, defacement and supplier incidents count as **cyber** types for the reporting checks. |
| Was security breached or damage caused? (near miss / breached / not known yet) | Required | Cyber types | DfE: "Incidents or attacks where any security breaches may have taken place, or other damage was caused, should be reported to an external body." Near misses are recorded but need not be reported externally. |
| Systems and services affected | Required | All | DfE: "capture information on the risk". The help text asks for names from the software and hardware registers. |
| What happened | Required | All | UK GDPR Article 33(5): "the facts relating to the personal data breach"; Article 33(3)(a): "describe the nature of the personal data breach". |

### Personal data

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Is it a personal data breach? (yes / no / under assessment) | Required | All | DfE: the DPO "will establish whether a data breach has occurred". UK GDPR Article 4(12) definition. DfE breaches: staff must be "able to recognise when a personal data breach has taken place". |
| Date and time you became aware it was a personal data breach | Good practice | Yes or under assessment | UK GDPR Article 33(1): "after having become aware of it". Only needed when awareness came later than discovery; the clock uses the later of the two. |
| Whose data was affected (pupils, staff, parents and carers, governors/trustees/volunteers, other) | Required | Yes or under assessment | Article 33(3)(a): "the categories … of data subjects concerned". |
| Approximate number of people affected | Required | Yes or under assessment | Article 33(3)(a): "approximate number of data subjects concerned". |
| Types of data involved | Required | Yes or under assessment | Article 33(3)(a): "the categories … of personal data records concerned". Special category and safeguarding information raise the risk. |
| Approximate number of records | Good practice | Yes or under assessment | Article 33(3)(a): "approximate number of personal data records concerned", "where possible". |
| Risk to the people affected (unlikely / a risk / high risk) | Required | Yes | Article 33(1): notify "unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons"; Article 34(1): tell the people affected when it "is likely to result in a high risk". DfE breaches: "Risk, in terms of a personal data breach, means the risk to the people who are affected." |
| Why you decided this, and the likely consequences | Required | Yes | Article 33(5) ("its effects") and 33(3)(c) ("describe the likely consequences"). DfE breaches: "It is important to make sure that you accurately record all details of the breach." |

### ICO and the people affected

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| ICO notification (submitted / not required / not submitted yet) | Required | Yes or under assessment | Article 33(1). DfE breaches: "If you decide that there is a risk to data subjects: notify the Information Commissioner's Office within 72 hours of becoming aware of it". |
| Date and time submitted, ICO reference | Required / Good practice | When submitted | Shows the report was made in time. Article 33(4) allows information "in phases without undue further delay". |
| Reason for not reporting, or for reporting after 72 hours | Required | Yes or under assessment, once a decision is made | Article 33(5) (record of every breach, so the decision can be checked) and Article 33(1): "Where the notification … is not made within 72 hours, it shall be accompanied by reasons for the delay." |
| People affected told? (informed / not required / not yet), date | Required | Yes | Article 34(1): "the controller shall communicate the personal data breach to the data subject without undue delay". DfE breaches: "inform data subjects, so they can take steps to protect themselves". |
| Reason for not telling them | Required | When "not required" | Article 34(3): not required if the data was made "unintelligible to any person who is not authorised to access it, such as encryption", if "subsequent measures … ensure that the high risk … is no longer likely to materialise", or if it "would involve disproportionate effort" (then "a public communication or similar measure"). |

### Who else was told

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Data protection officer consulted (date) | Required | All | DfE: involve the "DPO, who will establish whether a data breach has occurred". DfE breaches: the DPO should "support you throughout the process" and "where necessary, liaise with the Information Commissioner's Office". |
| Designated safeguarding lead consulted (date) | Good practice | All | DfE: involve the "designated safeguarding lead, who will review whether there are any safeguarding issues and related actions". |
| Governors or trustees (reported / not needed / not yet), date | Required | All | DfE: "report the potential incident or attack to the governing body or trustees"; "governors and trustees, who will need to be informed on the risk and the actions the school or college are taking to resolve it". |
| Trust or local authority | Good practice | All | DfE: work with "any IT leads in your broader organisation"; "You must act in accordance with … the academy trust handbook part 6, if you are part of a trust". |
| Report Fraud (formerly Action Fraud), date, reference | Required | Cyber types | DfE: report to "Report Fraud on 0300 123 2040, or the Report Fraud website". (The DfE renamed Action Fraud to Report Fraud in the standard on 12 February 2026.) |
| DfE sector cyber team, date | Required | Cyber types | DfE: report to "the DfE sector cyber team at Sector.Incidentreporting@education.gov.uk". |
| RPA or cyber insurer, date, reference | Required | Cyber types | DfE: report to "your RPA or cyber insurance provider". RPA rules Section 14: "Emergency Assistance 0800 368 6378 … RPAresponse@CyberClan.com"; Claims Guidelines: "as soon as reasonably practicable notify the Third Party Administrator of such occurrence". |
| NCSC, date | Good practice | Cyber types | DfE: "You may also need to report it to … the NCSC website if the incident or attack causes long-term school closure, the closure of more than one school, or serious financial damage". |
| Police (other than Report Fraud), reference | Good practice | All | DfE: "Police investigations may find out if any compromised data has been published or sold and identify the perpetrator." RPA Claims Guidelines: "immediately … notify the police in respect of Damage caused by theft, attempted theft, malicious persons or suspected acts of fraud or dishonesty". |
| Reasons for any "Not needed" decision | Required | All | The decision not to report is part of the Article 33(5) record, and the DfE check depends on whether reporting was needed. |

### Response and recovery

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Cyber response plan followed? | Required | All | DfE: "action their cyber incident response plan which is a part of their business continuity and disaster recovery plans". RPA Section 14 condition 4: "All Members must have a Cyber Response Plan in place." |
| Containment actions | Required | All | DfE: "contain the risk and make sure systems are safe and secure". Article 33(3)(d): "the measures taken or proposed to be taken … to mitigate its possible adverse effects". |
| Recovery actions | Required | All | Article 33(5): "the remedial action taken". DfE digital leadership: plans so the school can "continue to operate … even during emergencies". |
| Restored from backup? | Good practice | All | DfE backup standard (`cyber-6`); RPA condition 1: "You should have at least 3 backup copies of important data, on at least 2 separate devices, at least 1 must be off-site." |
| Status (open / contained / resolved / closed) | Required | All | NCSC: "all tasks and findings should be tracked". |
| Date closed | Good practice | Resolved or closed | Filled in automatically when the status is set to Resolved or Closed. |

### Lessons learned

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Root cause | Required | All | DfE breaches: "After every personal data breach or near miss, you should review: what happened, how it happened, why it happened, what actions you can take to prevent it happening again. Do this even if you have determined there are no risks." |
| Lessons learned | Required | All | As above, and NCSC: "A post incident review should cover: Lessons from the incident itself … Lessons from the response". |
| Follow-up actions (what, owner role, due date, done) | Required | All | DfE breaches: "document all lessons and actions you've taken". NCSC: "Tracking, documenting, assigning and correlating all findings, tasks and communications". |
| Cyber risk assessment reviewed? | Required | All | DfE risk assessment: repeat it "every year or in the event of: … an incident or attack impacting the school or college". |
| Staff training or awareness follow-up? | Good practice | All | DfE awareness plan: "Cyber training should be given at least annually, or more regularly if there is a known cyber risk", including "how to report a cyber incident or attack" and "how to report a personal data breach". |
| Notes | Good practice | All | Where the full investigation file is kept, and so on. |

### School details

| Field | Notes |
|---|---|
| School name and URN | From the school chosen on the home page (`SchoolLookup.loadProfile()`), as in the other registers. |
| Cyber cover (RPA / commercial cyber insurance / none / not sure) | Decides whether the "RPA not told" check is Red (RPA) or Amber (insurance, not sure or not recorded). Both academies and local authority maintained schools can be RPA members. |

## Checks (Red, Amber, Green)

Each incident is checked against the current date and time. Any Red reason makes it Red; otherwise any Amber reason makes it Amber; otherwise it is Green. Closed incidents are still checked, because an unreported breach or missing lessons still matter after closing.

Thresholds are constants in `incidents-data.js` (`THRESHOLDS`):

| Constant | Value | Source |
|---|---|---|
| `icoDeadlineHours` | 72 | UK GDPR Article 33(1) |
| `icoWarnHours` | 24 | This tool: Red when the deadline is this close |
| `assessWithinHours` | 24 | This tool: a third of the 72 hours to decide whether it is a breach |
| `openWarnDays` | 30 | This tool (from the brief) |

### The ICO deadline and countdown

- The clock starts at the **later** of "date and time discovered" and "date and time you became aware it was a personal data breach". Article 33(1) runs from "having become aware"; most schools become aware at discovery, so discovery is the default.
- The deadline is start + 72 hours, in local time. Evenings, weekends and holidays count.
- A deadline applies when the incident **is** a personal data breach (unless the risk is recorded as "unlikely to result in a risk") or is **under assessment**, and the ICO notification is not "Not required". While under assessment it reads "If reportable, ICO deadline in …".
- It shows as "ICO deadline in 31 hours" or "ICO deadline passed 5 hours ago" (in hours for the first four days, then days and hours), on the dashboard's **ICO deadlines** panel (sorted by deadline), in the list and on the form. It refreshes every 30 seconds without reloading the page, and the incident turns Red when it crosses the 24-hour line.
- Once submitted it reads "Reported to the ICO", or "Reported to the ICO after 72 hours" when the submission time is after the deadline.

### Red

1. No date and time of discovery recorded (the clock cannot be worked out).
2. Not yet decided whether it is a personal data breach (blank or "Under assessment") more than 24 hours after discovery.
3. ICO report needed, or possibly needed, and not submitted, with the deadline passed or less than 24 hours away.
4. ICO marked "Not required" although the risk is recorded as a risk or a high risk (Article 33(1)).
5. High risk to people, but they have not been told and no Article 34(3) reason is recorded.
6. A cyber incident where security was or may have been breached ("breached" or "not known yet"), with no report to Report Fraud **or** the NCSC and no reason recorded.
7. RPA members only: the same kind of incident and the RPA has not been told (and no reason recorded).

### Amber

1. ICO report needed or possibly needed with more than 24 hours left (the live countdown).
2. Breach decision still to make, within 24 hours of discovery.
3. Reported to the ICO after 72 hours with no reason for the delay, or ICO "Not required" with no reason recorded (Article 33(5)).
4. A personal data breach with no risk level, or no reasoning recorded.
5. DPO not recorded as consulted on a breach or possible breach.
6. A cyber incident where security may have been breached and the DfE sector cyber team not told; or, for schools with insurance, not sure or no cover recorded, the insurer not told.
7. Governors or trustees not told about a cyber breach or a personal data breach.
8. "Not needed" chosen for any external report with no reason recorded.
9. Type of incident, or (for cyber types) whether security was breached, not recorded.
10. Open or contained for more than 30 days.
11. Resolved or closed without lessons learned, or after a breach without the cyber risk assessment reviewed.
12. Follow-up actions overdue (not done and past their due date).

Changes from the brief: Red 6 accepts a report to the NCSC as well as Report Fraud, as the brief asked, although the DfE lists Report Fraud as the main route and the NCSC only for serious incidents. "Not known yet" counts as a possible breach because the DfE says to report where "any security breaches **may** have taken place". Amber 4, 6, 7, 9 and 11 were added because the sources ask for the information and leaving it blank should not look Green.

## Who to tell

The **Who to tell** page lists, for each body, when to tell them and how, with only `https` links: the ICO's [report a breach](https://ico.org.uk/for-organisations/report-a-breach/) page and helpline 0303 123 1113 (from DfE breaches); [Report Fraud](https://www.reportfraud.police.uk/) and 0300 123 2040; GOV.UK's [Where to report a cyber incident](https://www.gov.uk/report-cyber) signposting service; the DfE sector cyber team email (shown as text, not a `mailto:` link); RPA cyber emergency assistance (0800 368 6378, RPAresponse@CyberClan.com) and the GOV.UK [RPA claims page](https://www.gov.uk/guidance/make-a-claim-through-the-risk-protection-arrangement-rpa); the [NCSC reporting service](https://report.ncsc.gov.uk/); police (999 or 101); governors or trustees; the trust or local authority; and Jisc for further education. It also explains the 72-hour rule with the Article 33(1) text.

## Saving, export and import

- Saved in the browser under `localStorage` key `incident_log_v1` (schema version 1). It is loaded field by field: unknown fields are dropped, option fields keep only listed values, dates must be real `YYYY-MM-DD` dates and times real `YYYY-MM-DDTHH:MM` times, text is capped at 20,000 characters (titles and references at 300), ids must be simple strings, each incident holds up to 30 follow-up actions and the log up to 2,000 incidents. Lookups use arrays or prototype-free maps, never plain objects keyed by file text. Corrupt or cleared storage starts an empty log.
- **Excel export** asks the user to confirm they will store the file securely, then writes: *Info* (handling note, school, URN, cover, export time, counts), *Log* (one row per incident, one column per field, plus ICO deadline, Check and Reasons), *Actions* (one row per follow-up action), *Needs attention*, *Field guide* (every field, the requirement, source links and the check rules) and a hidden *_incident_log* sheet holding the whole log as JSON in 30,000-character chunks (row 1: marker `incident-log-snapshot`, schema version, number of chunks), the same pattern as the software register.
- **Excel import** uses `AssessmentModel.checkImportFile` (`.xlsx` only, 10 MB limit) and `AssessmentModel.SAFE_XLSX_READ`. It reads the hidden sheet first, then falls back to the visible *Log* and *Actions* sheets (matching columns by label, and converting Excel date numbers and dd/mm/yyyy dates). DfE and Cyber Essentials tracker exports, software register exports and other registers' exports are refused with a message saying what the file is. The user chooses **Merge** (incidents with the same ID or reference are updated; others are added) or **Replace**.

## Not confirmed from the sources

- **ICO pages.** The ICO website refused automated requests (HTTP 403), so its breach guidance is not quoted and the [report a breach](https://ico.org.uk/for-organisations/report-a-breach/) link was not checked. UK GDPR text from legislation.gov.uk and the DfE breach guidance cover the same rules, and the helpline number comes from the DfE page.
- **The regulator's name.** Since 30 September 2026 the legislation.gov.uk text of Articles 33 and 34 says "the Commission" rather than "the Commissioner" (S.I. 2026/386), reflecting the ICO becoming the Information Commission. The DfE pages updated in October 2026 still say "Information Commissioner's Office (ICO)", so the log keeps "ICO". Check the reporting page address if the ICO's website moves.
- **Report Fraud website.** The Report Fraud site also refused automated requests, so its address, its business reporting route and whether it has a 24/7 line for live attacks were not checked. The phone number and the name come from the DfE standard. GOV.UK's [report-cyber](https://www.gov.uk/report-cyber) page loaded, but its guided questions did not.
- **NCSC definition of a cyber incident.** The NCSC glossary entries did not load, so the NCSC definition is not quoted; the DfE and RPA definitions above are used instead. The NCSC [reporting page](https://report.ncsc.gov.uk/) loaded but showed only its heading.
- **When to tell the ICO: DfE wording.** The DfE cyber standard says report to the ICO "within 72 hours, where a high-risk data breach has or may have occurred". UK GDPR Article 33(1) and the DfE's own breach guidance use the lower test of **any** risk ("unless … unlikely to result in a risk"). The log follows the law.
- **RPA timing.** The RPA cyber section gives the emergency helpline but no deadline. "As soon as reasonably practicable" comes from the general Claims Guidelines. The advice to call before spending money is our reading of the Section 14 exclusion for "costs and expenses incurred before the written acceptance of a claim by the Third Party Administrator". RPA cyber cover is "claims made", so the claim must be notified in the membership year.
- **Thresholds.** The 24-hour decision window, the 24-hour Red warning and the 30-day "open too long" check are this tool's choices; no source sets them.
- **Incident types** are this tool's list; no source prescribes one.

## Next steps

- **Backup register link.** When the backup and disaster recovery register is built, let "Restored from backup?" pick the backup used from that register and record whether the restore test matched, and show recent incidents next to restore tests.
- **Software and hardware register links.** Let "Systems and services affected" pick items from the software and hardware registers, so a register item can show its incident history.
- **Trust overview.** Read the hidden `_incident_log` sheet in `trust.html` to show, across academies, open incidents, ICO deadlines and unreported cyber attacks. Only counts and references should cross to the trust view, keeping data minimisation.
- **DfE tracker evidence.** Show the incident counts on the DfE tracker's `cyber-7` (Report cyber attacks) and `cyber-1` (risk assessment) items.
- **Cyber Essentials.** Incidents caused by unsupported software, missing MFA or missing updates could link to the matching Cyber Essentials control.

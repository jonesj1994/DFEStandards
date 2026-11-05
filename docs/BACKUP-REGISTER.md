# Backup and disaster recovery register: what it tracks and why

The backup and disaster recovery (DR) register (`backup.html`) records each system and set of data a school relies on, how it is backed up, and when restores were last tested. It also keeps a log of restore tests and DR exercises, and the main details of the disaster recovery plan. This document lists each field, the requirement it supports (quoting the source), and the rules behind the Red/Amber/Green checks.

Sources were read on 5 November 2026:

| Short name | Source |
|---|---|
| **DfE backup** | DfE cyber security standards, [*Develop and implement a plan to back up your data and review this every year*](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard) (GOV.UK, last updated 16 September 2026; DfE tracker item `cyber-6`) |
| **DfE continuity** | DfE digital leadership and governance standards, [*Include digital technology within disaster recovery and business continuity plans*](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-leadership-and-governance-core-standard) (`leadership-3`) |
| **DfE registers** | DfE digital leadership and governance standards, *Keep registers relating to hardware and systems up to date* (`leadership-2`) |
| **DfE cloud backup** | DfE cloud solutions standards, [*Make sure that appropriate data backup provision is in place*](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cloud-solutions) (`cloud-5`) |
| **DfE servers** | DfE servers and storage standards, [*All servers and related storage platforms should continue to work if any single component or service fails*](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/servers-and-storage) (`servers-1`) and *Servers and related storage platforms must be secure and follow data protection legislation* (`servers-2`) |
| **RPA** | DfE Risk Protection Arrangement membership rules: *Academy Trusts, September 2026* and *Local Authority Maintained Schools, July 2026*, section "Cyber", "Conditions". Linked from [Make a claim through the RPA](https://www.gov.uk/guidance/make-a-claim-through-the-risk-protection-arrangement-rpa) (GOV.UK, last updated 1 September 2026) |
| **NCSC offline** | NCSC blog, [*Offline backups in an online world*](https://www.ncsc.gov.uk/blog-post/offline-backups-in-an-online-world) (published 13 August 2019, page updated 28 July 2026) |
| **NCSC cloud backups** | NCSC, [*Principles for ransomware-resistant cloud backups*](https://www.ncsc.gov.uk/guidance/principles-for-ransomware-resistant-cloud-backups) (22 November 2024) |
| **Cyber Essentials** | NCSC [*Cyber Essentials: Requirements for IT Infrastructure v3.3*](https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf), recommended item `rec-1` in the Cyber Essentials tracker (`ce-data.js`) |

"**Required**" below means a standard, or the RPA conditions of cover, asks for this information (or the check it enables). "**Good practice**" means it is useful, or is suggested by the guidance, but no standard requires it to be recorded.

## Why a backup register at all

- **DfE backup**, *Analyse where you are now*: "The SLT digital lead should ask IT support: what data is currently being backed up, how often, how old it is and how it is being backed up, including data stored on all your cloud services – this information should be stored in your information asset register … what information is not being backed up; how often they test data that has been restored to check the backups are successful; how long a restoration will take and when the last test restoration was completed; how many copies are being kept and where they are located; how your backups may be affected in the event of an incident or attack". Each of those questions is a field in this register.
- **DfE backup**: the backup plan should be "kept up to date", "tested termly to make sure it works, or more often if there is a significant service change", and "reviewed on an annual basis, or when there is a major change to the systems or data". IT support should "test and log your backups termly or if there is a significant change, this should include the ability to recover and restore from backups". The restore test log is that record.
- **DfE continuity**: "Your disaster recovery plan is a living document … It should be tested annually (at a minimum)". "Both plans need to be reviewed and updated annually or when a significant change occurs."
- **RPA** (academy and LA maintained rules, Cyber section): "Members must comply with the following conditions for cover to apply. In the event of a claim the Member will be required to evidence compliance with all of the conditions below: 1. All Members must meet the Department for Education's Cyber security standard relating to backups. The standard states: 'You should have at least 3 backup copies of important data, on at least 2 separate devices, at least 1 must be off-site.'"
- **Cyber Essentials** `rec-1`: "Backing up your data is not a technical requirement of Cyber Essentials. However, we highly recommend implementing an appropriate backup solution."

The register is the backup and DR part of the school's records. It does not replace the information asset register, which the DfE says should also hold backup details, or the DR plan itself. It records where the plan is.

## Part 1: Backup register

One row per protected system or set of data. Some fields appear only when they apply (the "Applies to" column).

### What is protected

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| System or data | Required | All | DfE backup: identify "what data you backup, including what critical data and systems are needed to function as a school or college in a disaster situation". |
| Category (MIS, email, files and documents, finance and HR, safeguarding, website, learning platform and pupil work, servers and system images, network and telephony settings, other) | Good practice | All | For filtering and totals. DfE backup lists the impact of losing "student work", "critical systems that support safeguarding", and finance. |
| Name in the software register | Good practice | All | DfE registers: keep registers of the systems you use. Offers the names from the software register (same browser) so the two registers match. |
| Where the live data is (on-site, cloud service, hosted by the supplier, trust or LA, mixed) | Required | All | DfE cloud backup: "Cloud providers will only hold backup data for a limited period. This could be for as little as 30 days with some providers." DfE backup: "cloud services will only backup your data for a limited time period". Decides whether the supplier's retention is asked for. |
| Data owner | Required | All | DfE backup: the SLT digital lead "will identify risks and priorities by speaking to: the business professionals or the finance team; the designated safeguarding lead; the data protection officer". A role is enough. |
| Recovery priority (critical, high, normal) | Required | All | DfE backup: "The SLT need to prioritise which data areas would need to be recovered first in the event of a cyber incident or attack." DfE continuity: "a definition of what a disaster for digital technology means to your school or college, defined by how long you can function when the disaster takes place". |
| How long can we be without it? (recovery time objective, RTO) | Required | All | DfE backup: identify "how long you can go without specific systems and data and how up to date they need to be to find out the priority of recovery". DfE servers: "Your senior leadership team will need to decide the maximum downtime it is willing to accept." Plain-English choices from "up to 1 hour" to "more than 2 weeks". |
| How much recent work could we afford to lose? (recovery point objective, RPO) | Required | All | As above ("how up to date they need to be"). DfE cloud backup: "how long you could be without the data before it becomes an issue" and "balancing cost against need, frequent backups are more expensive so consider the cost against the age of the data you recover from a backup". |

### How it is backed up

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Is it backed up? (yes; only the supplier's standard retention; no; not sure; not needed) | Required | All | DfE backup: "what information is not being backed up". DfE cloud backup: "Third party solutions and plug-ins are available for cloud solutions that do not meet your data backup needs." |
| What is covered | Required | All | DfE backup: "what data is currently being backed up". |
| Backup method or product | Good practice | All | DfE backup: "how it is being backed up"; "choose backup methods you will use based on your school or college's budget". |
| Who runs the backup (school staff, IT support provider, the system's supplier, trust or LA) | Required | All | DfE backup: "IT support will action the backup plan and will communicate this with any IT leads in your broader organisation (if applicable), such as a multi-academy trust or a local authority school". |
| How often | Required | All | DfE backup: "how often". DfE cloud backup asks the provider "how frequently are backups made?" |
| How long backups are kept | Required | All | DfE backup: "how long you will keep data for – this should align with statutory duties and retention policies so that you only backup what you need". |
| Supplier's own retention | Required | Cloud and supplier-hosted | DfE cloud backup: ask the provider "what data do they backup? where is it held (for UK GDPR compliance)? how long is the data held for? how frequently are backups made?" |
| Number of backup copies (1, 2, 3 or more) | Required | All | DfE backup: "have at least 3 backup copies of important data, on at least 2 separate devices – at least one of these copies must be off-site". DfE cloud backup: "for critical data use the 3-2-1 rule". RPA: this is condition 1 of cyber cover. |
| Where the copies are (on-site; off-site; cloud backup service; offline or air-gapped; immutable) | Required | All | DfE backup: "If all copies were held in the same physical location, they would all be at risk"; "make sure that backups are immutable, this means that they cannot be changed once they have been created". NCSC cloud backups: "Blocking any deletion or alteration requests for a backup once it is created." |
| At least one copy offline or off the network? | Required | All | DfE backup: the backup location must not be "impacted by the same incident or attack". NCSC offline: "With at least one backup offline at any given time, an incident cannot affect all of your backups simultaneously." Cyber Essentials `rec-1`: "If you back up your information to a USB stick or an external hard drive, disconnect it from your computer when a backup isn't being done." |
| Physical backup media taken off-site? | Required | All | DfE backup: "You should not take any physical backups offsite unless they are encrypted and stored in a secure location. Regardless of whether they are encrypted, backups should never be taken to anyone's home." |

### Security

The page says, in this section and on the dashboard: **never record passwords, encryption keys or recovery codes in this register. Record only where they are kept.**

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Backups encrypted? | Required | All | DfE servers (`servers-2`): for personal and special category data "you might need extra security measures … such as encryption". DfE backup: off-site physical backups must be encrypted. |
| Where the encryption keys and backup log-ins are held (location only) | Good practice | Unless backups are not encrypted | Without the keys the backup cannot be restored. NCSC offline: "Cloud backup clients should not have valid credentials while your cloud storage is not in use." The help text asks for a location only, for example "sealed envelope in the head's safe". |
| Backup accounts kept separate, with MFA? | Good practice | All | NCSC cloud backups: "Forbidding destructive requests from customer accounts"; NCSC offline: backups should be logically separated so one compromise cannot reach them all. |

### Monitoring and testing

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| How backup success is checked (automatic alerts checked daily, weekly reports, by hand, not monitored) | Required | All | DfE backup: the SLT digital lead will "work with IT support to make sure backups are being done correctly". DfE servers: "asked your IT support to monitor performance and alert you if a component or service fails". NCSC cloud backups: "system owners should monitor and test the state of their backups regularly." |
| Who checks it | Required | All | As above. |
| Last successful backup checked on | Good practice | All | As above. The 31-day threshold is this register's choice, not a source requirement. |
| Last restore test, result, time taken (hours) | Required | Result and time once a date is entered | DfE backup: "how often they test data that has been restored to check the backups are successful; how long a restoration will take and when the last test restoration was completed". **The newest restore log entry for the system is used if it is newer**, so schools can keep everything in the log. |

### Disaster recovery and review

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Included in the DR or business continuity plan? | Required | All | DfE continuity: involve "any outsourced services or suppliers (for example, management information systems, broadband or cloud services) to understand their protocols and include them in plans". DfE backup: "Your backup plan should feed into your business continuity plan and disaster recovery plan." |
| Status (in use, retired) | Good practice | All | DfE registers: keep registers up to date. Retired rows are kept but not checked. |
| Last reviewed | Required | All | DfE backup: "reviewed on an annual basis, or when there is a major change to the systems or data". |
| Notes | Good practice | All | Free text. The help text says no passwords. |

## Part 2: Restore test and DR log

One row per event. The DfE asks IT support to "test and log your backups termly" and to "have a policy on how frequently restorations should take place to test the backup and how this will be reported on to evidence success".

| Field | Basis | Requirement it supports |
|---|---|---|
| Date | Required | DfE backup ("when the last test restoration was completed"). |
| Type (restore test, DR exercise, real recovery) | Required | DfE backup (termly restore tests); DfE continuity: test the DR plan "for example, simulating data loss or hardware failure". A DR exercise or real recovery also counts as the DR plan's last test. |
| Systems involved (ticked from the backup register) | Required | Links each test to the systems it proves. Their "last restore test" updates automatically. |
| What was restored | Required | DfE backup: test "the ability to recover and restore from backups". |
| Result (success, partial, failed) | Required | DfE backup: "check the backups are successful". |
| Time taken (hours), shown against each system's recovery time | Required | DfE backup: "how long a restoration will take". |
| Tested by | Good practice | Evidence of who did the test. |
| Issues found, actions agreed, actions status (none needed, open, done) | Required | DfE continuity: test the plan "to identify gaps within it". |

## Part 3: Disaster recovery plan details

One set per register. The register records **where** the plan is, not the plan itself.

| Field | Basis | Requirement it supports |
|---|---|---|
| Who owns the backup and DR plans | Required | DfE backup: "The senior leadership team (SLT) digital lead will own the backup plan". DfE continuity: the SLT digital lead "will be responsible for this standard". |
| Where the DR plan is kept | Required | DfE continuity: the plans should be "kept online in a secure, shared folder location in the cloud, with remote access granted to those in your disaster recovery team". |
| Printed copy kept? | Required | DfE continuity: "printed out to retain hard copies in case of an emergency, such as a cyber incident". |
| Summary with key contacts shared with all staff? | Required | DfE continuity: "create a summary document with top-level details (such as key contacts for when a disaster occurs) to be shared securely with all staff". |
| Backup plan last reviewed | Required | DfE backup: "review this every year" (standard title) and "reviewed on an annual basis". |
| DR plan last reviewed | Required | DfE continuity: "Both plans need to be reviewed and updated annually or when a significant change occurs." |
| DR plan last tested | Required | DfE continuity: "It should be tested annually (at a minimum)". The newest DR exercise or real recovery in the log also counts. |
| Where the offline backup copy is kept | Required | DfE backup ("how many copies are being kept and where they are located"); NCSC offline. Help text: never at anyone's home. |
| Where recovery keys and log-ins are kept (location only) | Good practice | Needed to recover; the help text forbids recording the keys themselves. |
| Notes | Good practice | e.g. what counts as a disaster for the school. |
| Key contacts: role, organisation, work phone, notes | Required | DfE continuity: the DR plan should include "details of your disaster recovery team and key contacts, including: who they are; what they are responsible for; their contact details". "Add the usual roles" adds rows for the DR lead, IT support provider, internet service provider, insurer or RPA, MIS supplier, DPO, Action Fraud or Report Fraud, and NCSC, **with the numbers left blank** for the school to fill in from its contracts and the official pages. Phone numbers keep only digits, spaces and `+ ( ) -`. The page asks for work contacts only. |

For reference (not built into the page, because numbers change): on 5 November 2026 the GOV.UK RPA claims page listed "Cyber emergency assistance: RPAresponse@CyberClan.com, 0800 368 6378".

## Compliance checks (Red, Amber, Green)

Thresholds are constants at the top of `backup-data.js` (`THRESHOLDS`) and are shown on the page and in the export.

"**Important**" means critical or high priority, **or no priority set yet**. A row with no priority is checked as important until someone decides, so it cannot dodge Red by being left blank.

### Each backup row

**Red** (any one makes the row Red):

1. Important and not backed up, or nobody knows. (DfE backup: "You must backup your data now.")
2. Important and relying only on the supplier's standard retention. (DfE cloud backup: "as little as 30 days with some providers".)
3. Important and no offline or off-network copy confirmed. (DfE backup and NCSC offline, above.)
4. Important and only 1 or 2 backup copies, or every copy on-site. (DfE 3-2-1 rule; RPA condition 1 of cyber cover.)
5. Important and no restore test, or none in the last **12 months**. (DfE backup: tested termly.)
6. The last restore test failed.
7. Backup success not monitored, or nobody named as checking it.
8. Physical backup media taken off-site that is not encrypted or not stored securely. (DfE backup.)

**Amber**:

1. Rules 1 to 3 and 5 for a **normal** priority row.
2. Last restore test more than **4 months** ago. The DfE asks for termly testing, and a school year has three terms. The suggested starting point was 6 months; 4 matches "termly" more closely.
3. The last restore only partly worked.
4. The last restore took longer than the recovery time.
5. No recovery time or recovery point set, or backups less frequent than the recovery point allows (for example weekly backups with "up to 1 day of work").
6. Important data where the number of copies or their locations is not recorded, or with no immutable copy (DfE backup: "make sure that backups are immutable").
7. Backups not confirmed as encrypted.
8. No check of backup success recorded in the last **31 days**.
9. No data owner, no priority, or not confirmed as in the DR plan.
10. Not reviewed in the last **12 months**.
11. Some text looks like a password or key, for example "password: …" or "recovery key = …". The register must hold only **where** secrets are kept, so this warns the school to move it.

**Green**: none of the above. **Retired**: kept for the record and not checked. A row marked "Not needed (no school data)" is only asked to be confirmed once a year.

### The DR plan

**Red**: the backup plan, or the DR plan, has not been reviewed in the last **12 months** (or has no review date).

**Amber**: text in the plan or contacts that looks like a password or key; the DR plan has not been tested in the last 12 months (a DR exercise or real recovery in the log counts); no owner, plan location, printed copy, staff summary or offline copy location recorded; key contacts missing for the IT support provider, internet service provider, or insurer or RPA.

The dashboard shows the plan's result alongside the systems. The home tile counts the plan as one item needing attention if it is Red or Amber.

### Restore log entries

An entry "needs follow-up" when its actions are marked open, or when the result was partial or failed and the actions are not marked done or "none needed".

## Evidence for the trackers

- **DfE tracker**: `cyber-6` (backup plan), `leadership-3` (DR and business continuity plans) and `cloud-5` (cloud backup provision). Export the register and refer to it as evidence.
- **Cyber Essentials tracker**: `rec-1` (recommended, not assessed).
- **RPA members**: the backup condition must be evidenced at claim time. The "Number of backup copies" and "Where the copies are" fields, with the restore log, are that evidence.

## Saving, export and import

- Saved in the browser under `backup_register_v1`, together with the school name and URN (filled in from the school chosen on the home page).
- **Export** writes an Excel file with the sheets *Info*, *Backups*, *Restore log*, *DR plan*, *Needs attention* and *Field guide*, plus a hidden `_backup_register` sheet holding the exact register as JSON (split into 30,000-character cells).
- **Import** reads the hidden sheet first. If it is missing or damaged, it reads the visible *Backups*, *Restore log* and *DR plan* sheets; log entries are linked back to systems by name. It offers **merge** (by ID, then by name) or **replace**. Files over 10 MB, non-`.xlsx` files, tracker exports and other registers' exports (software, hardware, accounts, incidents) are refused with a message saying what the file is and which page opens it.
- **CSV import** adds a basic list (System or data, Category, Data owner, Priority).
- Everything read from storage or a file is validated field by field: only known fields, only listed options for choices, real dates, hours as numbers, phone numbers as digits, text capped at 20,000 characters, and log links only to systems that exist.

## Not confirmed from the sources

- **RPA "offline backups".** The current RPA rules (academy, September 2026; LA maintained, July 2026) make the DfE 3-2-1 rule the backup condition of cyber cover. They do **not** say "offline", although they link to the NCSC's *Offline backups in an online world*. `ce-data.js` currently says "the RPA requires offline backups for academies"; that wording looks out of date (see suggestions). This register cites the RPA only for copies and off-site location, and cites the DfE and NCSC for the offline copy.
- **The other RPA cyber conditions** (NCSC staff training each year, Police CyberAlarm registration, a cyber response plan) are not backup matters and are not tracked here.
- **Thresholds that are this register's choice**: 31 days for checking backup success, and the hour values behind the plain-English RTO and RPO choices. No source gives these.
- **NCSC pages**: the *Exercise in a Box* URL returned 404 and is not linked. The NCSC small business guide's backup page now redirects to the *Small organisations guide* landing page, and its backup text could not be read, so it is not cited. The current Action Fraud / Report Fraud number was not checked, so no number is shown for it.
- **The DfE information asset register template** is mentioned by the DfE as the place to store backup details. This register does not try to replace it.

## Next steps

- Link from the **software register**: its "Data backed up?" field could link to the matching row here (same name) instead of holding a separate yes/no.
- Link from the **incident log**: a real recovery here could reference the incident, and an incident could show the systems' last restore tests and recovery times.
- A trust view of the backup register across academies.

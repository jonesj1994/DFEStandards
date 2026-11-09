# Software register: what it tracks and why

The software register (`register.html`) records every piece of software and every cloud service a school uses, with the details that the DfE digital and technology standards, Cyber Essentials and data protection law ask schools to keep. This document lists each field, the requirement it supports (quoting the source), and the rules behind the Red/Amber/Green checks.

Sources were read on 5 November 2026:

| Short name | Source |
|---|---|
| **DfE cyber security** | [Cyber security: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard) (GOV.UK, last updated 16 September 2026) |
| **DfE digital leadership** | [Digital leadership and governance: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-leadership-and-governance-core-standard) |
| **DfE cloud solutions** | [Cloud solutions](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cloud-solutions) |
| **DfE digital accessibility** | [Digital accessibility](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-accessibility) |
| **DfE devices** | [Laptops, desktops and tablets](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/laptops-desktops-and-tablets) |
| **Cyber Essentials** | NCSC [Cyber Essentials: Requirements for IT Infrastructure v3.3](https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf) (effective 27 April 2026). Item ids (`sum-1` and so on) match the Cyber Essentials tracker (`ce-data.js`). |
| **DfE EdTech** | DfE *Data protection in schools*: [Procuring educational technology (EdTech)](https://www.gov.uk/guidance/data-protection-in-schools/procuring-educational-technology-edtech) (updated 9 July 2026) |
| **DfE DP policies** | DfE *Data protection in schools*: [Data protection policies and procedures](https://www.gov.uk/guidance/data-protection-in-schools/data-protection-policies-and-procedures) (updated 17 June 2026) |
| **DfE records** | DfE *Data protection in schools*: [Record keeping and management](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management) |
| **UK GDPR** | [Article 28 (processors)](https://www.legislation.gov.uk/eur/2016/679/article/28) and [Article 35 (DPIA)](https://www.legislation.gov.uk/eur/2016/679/article/35), legislation.gov.uk |

"**Required**" below means a standard or the law asks for this information (or the check it enables). "**Good practice**" means it is useful, or is suggested by the guidance, but no standard requires it to be recorded.

## Why a software register at all

- **DfE digital leadership**, *Keep registers relating to hardware and systems up to date*: schools "should include digital technology within their: contracts register, asset register, information asset register". The contracts register "includes, but is not limited to: licences; subscriptions; contracts related to your broadband, IT support and technology provider; a list of your school or college's approved apps". "You should already be updating your registers every time something changes."
- **DfE cyber security**, *License digital technology and keep it up to date*: "All digital technology must be licensed. Digital technology includes software programmes, operating systems and applications running on devices and servers, or online cloud services." And: "At the end of every term, IT support and the business professionals or the finance team should review the contracts register and inform the SLT when digital technology: has become unsupported; is due to become unsupported".
- **Cyber Essentials** `sum-1`: "All software on in-scope devices must be licensed and supported. … The vendor must provide the future date when they will stop providing these." `scope-3`: "If your organisation's data or services are hosted on cloud services, these services must be in scope. Cloud services cannot be excluded from scope."

The register covers the software and cloud-service part of those registers. It does not replace the hardware asset register (see [Next steps](#next-steps)).

## Fields

Fields are grouped as on the entry form. Some appear only when they apply (the "Applies to" column); for example data location is only asked for cloud services that hold personal data.

### Identity

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Name | Required | All | DfE digital leadership: registers so you "understand what digital data, equipment and systems you have". |
| Vendor or supplier | Required | All | DfE digital leadership (contracts register); DfE cyber security asks IT support to work with "third-party cloud suppliers to check that they are also meeting these standards by performing supplier assessments". |
| Product, edition or version | Good practice | All | Cyber Essentials `sum-1`: support is per product version, so the version decides the support end date. |
| Category | Good practice | All | For filtering and totals. Categories: MIS, Safeguarding, Filtering and monitoring, Learning platform, Curriculum and classroom, Productivity and email, Communication, Finance and HR, Operating system, Browser, Security, Device management, Other. |
| Type | Required | All | Installed software, SaaS, IaaS, PaaS, mobile app or browser extension. Cyber Essentials `scope-3`: "Cloud services cannot be excluded from scope", and `uac-4`: "Authentication to cloud services must always use MFA". The type decides which other fields and checks apply. |
| Where it is used | Good practice | All | DfE digital leadership: understand what systems you have and where. |
| Who uses it (staff, pupils, parents and carers, governors and trustees, IT support only) | Good practice | All | DfE EdTech: tools "collect and use personal data about pupils, parents and staff"; who uses it shapes the DPIA and privacy notice. |
| Business owner | Required | All | DfE digital leadership: "Commercial and procurement information should be updated by the business or finance team, and IT support should update technical information." DfE cyber security: the finance team "will give information on when licences are due to expire from the contracts register". |
| Technical owner | Required | All | As above: IT support keeps the technical information up to date. |
| Product or supplier web page | Good practice | All | Convenience link (only `http`/`https` links are shown as links). |

### Licensing

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Licence status (licensed, free or open-source licence, unlicensed, not sure) | Required | All | DfE cyber security: "All software needs to be licensed and eligible for security updates. You should remove unlicensed software or take steps to license it." "If you are using open-source software or operating systems, you must abide by their licensing terms." Cyber Essentials `sum-1`: "licensed … software is software that you have a legal right to use". |
| Licence type | Good practice | All | DfE digital leadership (contracts register: licences, subscriptions). |
| Number of licences | Good practice | All | DfE digital leadership: "keep track of buying and licensing so that schools or colleges can get better value for money". |
| Licence or contract reference | Good practice | All | Contracts register. The form says never to record licence keys or passwords. |
| Licence start date | Good practice | All | Contracts register. |
| Renewal or expiry date | Required | All except perpetual licences | DfE cyber security: IT support must check that "licence expiry dates are recorded in the contracts register by the business professionals or the finance team" and that the finance team "have been informed about licence end dates so that they can budget for any renewal costs". |
| Annual cost | Good practice | All | DfE digital leadership: the contracts register "can also capture the value of the contracts which helps to monitor spend and make savings where possible". |
| Contract or procurement route | Good practice | All | Contracts register; DfE cyber security asks for supplier checks "when procuring new contracts". |

### Support and updates

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Vendor support end date | Required | All (not needed for rolling-support cloud services) | Cyber Essentials `sum-1`: "The vendor must provide the future date when they will stop providing these [vulnerability fixes]." DfE cyber security: "digital technology end-of-support dates are captured in the asset register" and "The end of support dates for each device's operating system should be recorded in the asset register". |
| Currently supported by the vendor? | Required | All | Cyber Essentials `sum-2`: "Software must be removed from devices when it becomes unsupported". DfE cyber security: tell SLT each term when technology "has become unsupported". |
| Automatic updates on? | Required | All | Cyber Essentials `sum-3`: "All software on in-scope devices must have automatic updates enabled where possible." |
| Who updates it | Required | All | DfE cyber security: "make sure security updates are applied on time". Needed when updates are not automatic. |
| Critical and high-risk fixes applied within 14 days? | Required | All | Cyber Essentials `sum-4`: "Software must be updated, including vulnerability fixes, within 14 days of release, where: the update fixes vulnerabilities described by the vendor as 'critical' or 'high risk'; … a CVSS v3 base score of 7 or above; or there are no details …". DfE cyber security: "IT support must complete vulnerability fixes for operating systems, applications and firmware within 14 days of the fix being released." |
| Updates last checked | Good practice | All | Evidence for `sum-4`. |

### Access

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Single sign-on | Good practice | All | DfE cloud solutions, *ID and access management*: "use a central ID and access management tool" and "make sure this is the only way staff and students can log on". DfE cyber security: "consider using a single sign-on solution". |
| MFA on? | Required | Cloud services, and anything else people sign in to (hidden for installed software, apps and extensions) | Cyber Essentials `uac-4`: "Implement MFA, where available. Authentication to cloud services must always use MFA." DfE cyber security: "MFA must be enabled for all: staff accounts with access to cloud services or remote access to on-site systems; IT administrative accounts". |
| Separate admin accounts used? | Required | All | Cyber Essentials `uac-5`: "Use separate accounts to perform administrative activities only". DfE cyber security: "make sure that global or administrative accounts are not used for routine business". |
| Supplier, MSP or other third-party access? / Who | Required | All / when Yes | Cyber Essentials `scope-7`: "All accounts that your organisation owns are in scope, even when those accounts are used by a third party, such as a supplier, contractor or Managed Service Provider (MSP)." |
| Accounts last reviewed | Required | All | DfE cyber security: "review accounts with your business professionals or the finance team every term … suspending or deleting accounts which are no longer in use". Cyber Essentials `uac-3`: "Remove or disable user accounts when they're no longer required". |

### Data protection

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Holds or processes personal data? | Required | All | DfE cloud solutions: "Check whether the data you want to store and process in the cloud is personal and or sensitive personal data." |
| Includes children's data? | Required | Holds personal data | DfE DP policies: "You should consider and document carrying out a DPIA of personal data collected: about vulnerable data subjects, including: children (because of their age)". |
| Includes special category data? | Required | Holds personal data | DfE EdTech: "If the processing involves special category data, then extra protection is needed as it presents a higher risk". UK GDPR Article 35(3)(b): a DPIA is required for "processing on a large scale of special categories of data". |
| DPIA (done, in progress, not done, not needed with DPO's recorded reason) | Required | Holds personal data | DfE cloud solutions: "Your DPO should carry out data protection impact assessments (DPIA) for any cloud solutions that store personal and or sensitive personal data". DfE EdTech: "You must complete a DPIA when the processing of personal data is likely to result in a high risk to the rights and freedoms of individuals." UK GDPR Article 35(1). |
| DPIA date | Required | DPIA done | DfE DP policies: "A DPIA is not a one-off exercise. You need to keep it under regular review". |
| Data processing agreement in place? | Required | Holds personal data | UK GDPR Article 28(3): "Processing by a processor shall be governed by a contract or other legal act …". DfE cloud solutions: "data processing carried out by third parties is covered by an appropriate contract" and "there is a data sharing agreement with your cloud solution provider". DfE EdTech: "Make sure responsibilities are clearly assigned in a contract or data processing agreement." |
| Where the data is stored | Required | Cloud services holding personal data | DfE cloud solutions: "Data should be stored and processed in the UK or EU, unless you have confirmed that any international transfer of your data complies with UK GDPR." DfE EdTech: "Consider where and how data is stored, including any international transfers". |
| International transfer confirmed as UK GDPR compliant? | Required | Data stored outside the UK and EU | As above. |
| Covered by your privacy notice? | Required | Holds personal data | DfE EdTech: "If there are any changes to how personal data is processed, update your privacy notices and inform parents." DfE DP policies: privacy notices reviewed "whenever you make a significant change to how you process personal data". |
| Retention period | Required | Holds personal data | DfE records: "you should only keep data for as long as you need it". DfE EdTech: "Clarify how long data will be kept … Discover how it will be deleted or returned at the end of the contract". |
| Listed in your information asset register? | Good practice | Holds personal data | DfE digital leadership: the information asset register "is a log of the digital data that is held on staff and students and is owned by the data protection officer". |

### Backup and continuity

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Data backed up? | Required | All | DfE cloud solutions, *backup*: "Cloud providers will only hold backup data for a limited period. This could be for as little as 30 days with some providers." "identify the data backup provision you need for each solution". DfE cyber security, *backup plan*: "cloud services will only backup your data for a limited time period), so you need to have a backup plan". |
| Backed up by, and how | Good practice | When backed up | As above. |
| In the disaster recovery or business continuity plan? | Required | All | DfE digital leadership, *disaster recovery and business continuity*: involve "any outsourced services or suppliers (for example, management information systems, broadband or cloud services) to understand their protocols and include them in plans". |
| Exit or data export plan? | Good practice | All | DfE EdTech: "You should plan for how personal data will be managed at the end of the contract" and "Ask the supplier about data portability". |

### Malware and allow listing

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| On your approved apps list? | Required | All | DfE digital leadership: the contracts register includes "a list of your school or college's approved apps". Cyber Essentials `mp-3` (if allow listing is used): "maintain a current list of approved applications". DfE cyber security: "check the security of all applications downloaded or installed onto a network". |
| Malware protection on the devices it runs on | Required | Installed software, mobile apps, browser extensions | Cyber Essentials `mp-1`: "For each device, you must use at least one of: anti-malware software … or application allow listing". DfE cyber security: "install anti-malware software (this must include anti-virus) on all devices". |

### Accessibility

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Supports accessibility features? | Good practice | All | DfE digital accessibility: "Hardware and software used by students and staff should have these features available" (text-to-speech and dictation, caption settings, zoom, translation). The standard asks SLT to make sure software "are accessible or have accessibility features included", but does not ask for a record per product. |
| Accessibility statement | Good practice | All | DfE digital accessibility: "Ask them about their products and services accessibility statements." |

### Lifecycle

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Status (requested, approved, in use, being retired, removed) | Required | All | Cyber Essentials `sum-2` (remove unsupported software) and `sc-3`: "Regularly remove or disable unnecessary software". Keeping removed items shows when they went. |
| Date approved | Good practice | All | Approved apps list. |
| Last reviewed | Required | All | DfE digital leadership: update registers "every time something changes", and "the SLT digital lead should review these registers ahead of your next financial planning cycle". DfE cyber security: review the contracts register "at the end of every term". |
| Next review due | Good practice | All | As above. |
| Notes | Good practice | All | Actions and links to evidence. |

## Compliance checks (Red, Amber, Green)

Each item is checked against today's date. Any Red reason makes the item Red; otherwise any Amber reason makes it Amber; otherwise it is Green. Items with status **Removed** are kept for the record and not checked. Blank answers count as "not recorded", so a newly added item starts Red until its details are filled in: the point is to show what is missing.

Thresholds are constants in `register-data.js` (`THRESHOLDS`):

| Constant | Value |
|---|---|
| `supportEndWarnMonths` | 6 |
| `renewalWarnDays` | 60 |
| `reviewOverdueMonths` | 12 |

**Red**

1. Unsupported: the support end date has passed, or "Currently supported" is No. (Cyber Essentials `sum-1`, `sum-2`.)
2. No vendor support end date recorded, unless "Currently supported" is *Yes, rolling (supplier keeps the cloud service up to date)*. (Cyber Essentials `sum-1`.)
3. A cloud service (SaaS, IaaS, PaaS) where MFA is anything other than Yes, including blank, "Only for some users" and "Not available from the supplier". (Cyber Essentials `uac-4`.)
4. Holds personal data with no DPIA (or a recorded DPO decision that one is not needed), or no data processing agreement (or "not applicable" because the supplier does not process the data). (DfE cloud solutions; UK GDPR Articles 28 and 35.)
5. Licence status is Unlicensed. (DfE cyber security; Cyber Essentials `sum-1`.)
6. Automatic updates not confirmed on (anything other than Yes or "Supplier updates it") and nobody named in "Who updates it". (Cyber Essentials `sum-3`, `sum-4`.)

**Amber**

1. Vendor support ends within 6 months.
2. Licence renewal due within 60 days, or the renewal date has passed (check it was renewed).
3. Licence status blank or "Not sure".
4. Review overdue: the next review date has passed, the last review was more than 12 months ago, or neither date is recorded.
5. A cloud service whose backup is blank, "Not sure" or "No".
6. A cloud service holding personal data where the storage location is blank or "Not sure", or is outside the UK and EU without the transfer confirmed as compliant.
7. No business owner, or no technical owner.

Amber rules 3 and 6 were added to the brief's list because the sources ask for the information (licence status; data location) and leaving it blank should not look Green.

## Evidence for the trackers

| Tracker item | How the register helps |
|---|---|
| DfE cyber security, *License digital technology and keep it up to date* (`cyber-5`) | Licence status, renewal dates, support end dates, automatic updates and 14-day fixes for every item, with a termly "needs attention" list for SLT. |
| DfE digital leadership, *Keep registers relating to hardware and systems up to date* (`leadership-2`) | The software and cloud-service part of the contracts register (licences, subscriptions, approved apps, cost) and pointers into the information asset register. Hardware is not covered. |
| Cyber Essentials Security update management `sum-1` to `sum-4` | Licensed and supported (`sum-1`), unsupported items flagged for removal (`sum-2`), automatic updates (`sum-3`), 14-day fixes (`sum-4`). |
| Cyber Essentials User access control `uac-4` | MFA recorded for every cloud service; any gap is Red. |
| Cyber Essentials Scope `scope-3` | Every cloud service is listed with its type, so none is left out of scope. |

## Saving, export and import

- Saved in the browser under `localStorage` key `software_register_v1` (schema version 1). It is loaded field by field: unknown fields are dropped, option fields keep only listed values, dates must be real `YYYY-MM-DD` dates, text is capped at 20,000 characters, ids must be simple strings, and the register holds up to 2,000 items.
- **Excel export** sheets: *Info* (school, URN, export date, counts), *Register* (one row per item, one column per field, plus Check and Reasons), *Needs attention*, *Field guide* (every field, what it means, the requirement and source links, and the check rules), and a hidden *_software_register* sheet holding the whole register as JSON in 30,000-character chunks (row 1: marker `software-register-snapshot`, schema version, number of chunks), following the `_assessment` pattern in `assessment-model.js`.
- **Excel import** uses `AssessmentModel.checkImportFile` (`.xlsx` only, 10 MB limit) and `AssessmentModel.SAFE_XLSX_READ`. It reads the hidden sheet first, then falls back to the visible Register sheet (matching columns by label, and converting Excel date numbers and dd/mm/yyyy dates). DfE and Cyber Essentials tracker exports are refused with a message saying which tracker to use. The user chooses **Merge** (items with the same ID, or the same name and vendor, are updated; others are added) or **Replace**.
- **CSV import** (Quick add page): columns Name, Vendor, Category; items already in the register with the same name and vendor are skipped; an unknown category becomes Other.

## Not confirmed from the sources

- **ICO guidance** (for example "When do we need to do a DPIA?" and the controller–processor contract guidance) could not be fetched from this environment (the ICO site refused automated requests), so it is not quoted. The DfE manual and UK GDPR text above cover the same points.
- **Rolling support for cloud services.** Cyber Essentials requires a vendor support end date for software, but SaaS suppliers rarely publish one because they update the service themselves. The register treats "Yes, rolling (supplier keeps the cloud service up to date)" as meeting the end-date check. This is an interpretation; check it with your Certification Body.
- **MFA for pupil accounts.** Cyber Essentials says "Authentication to cloud services must always use MFA", while the DfE standard requires MFA for staff and admin accounts. The register marks a cloud service Red unless MFA is "Yes"; "Only for some users" (for example staff but not pupils) is Red so the gap is visible. Ask your Certification Body how pupil accounts are treated in your scope.
- **Starter list.** Quick add offers about 100 common UK school products in collapsible sections (for example Safeguarding and online safety, with Online monitoring, Web filtering and Safeguarding records underneath), with a search box. Each is added with its name, category, and vendor and type where these are clear. It does not give versions, support dates or prices, which the school must fill in from its own records. The list is `STARTER_SECTIONS` in `register-data.js`; listing a product is not a recommendation.
- **Categories and types** are this tool's choices; no standard prescribes a list.

## Next steps

- A **hardware register** built the same way, covering the DfE asset register fields ("asset numbers, serial numbers, who it is assigned to … when it is due for review … date it was securely disposed of") and operating system end-of-support dates.
- Bring **register summaries into the trust overview**, using the hidden sheet so a trust can see unsupported software, cloud services without MFA and missing DPIAs across academies.
- Link register items to the information asset register when one is added.

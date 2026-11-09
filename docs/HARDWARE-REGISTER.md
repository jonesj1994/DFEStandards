# Hardware and asset register: what it tracks and why

The hardware and asset register (`hardware.html`) records every device and piece of network equipment a school has, with the details that the DfE digital and technology standards, Cyber Essentials, UK GDPR and waste law ask schools to keep. This document lists each field, the requirement it supports (quoting the source), and the rules behind the Red/Amber/Green checks.

Sources were read on 5 November 2026:

| Short name | Source |
|---|---|
| **DfE digital leadership** | [Digital leadership and governance: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/digital-leadership-and-governance-core-standard), *Keep registers relating to hardware and systems up to date* (`leadership-2`) |
| **DfE asset register template** | DfE *Plan technology for your school*: [Digital technology asset register](https://plan-technology-for-your-school.education.gov.uk/digital-technology-asset-register) and its XLSX template (last updated 10 January 2025) |
| **DfE devices** | [Laptops, desktops and tablets](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/laptops-desktops-and-tablets): *safe and secure* (`devices-2`), *minimum requirements* (`devices-3`), *energy efficient … bought and disposed of sustainably* (`devices-4`) |
| **DfE cyber security** | [Cyber security: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard) (updated 16 September 2026): *anti-malware and a firewall* (`cyber-3`), *user accounts* (`cyber-4`), *License digital technology and keep it up to date* (`cyber-5`) |
| **DfE switching** | [Network switching: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/network-switching-core-standard) (`switching-2` to `switching-4`) |
| **DfE wireless** | [Wireless network: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/wireless-network-core-standard) (`wireless-3`, `wireless-4`) |
| **DfE servers** | [Servers and storage](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/servers-and-storage) (`servers-1`, `servers-3`) |
| **Cyber Essentials** | NCSC [Cyber Essentials: Requirements for IT Infrastructure v3.3](https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf). Item ids (`sum-1` and so on) match the Cyber Essentials tracker (`ce-data.js`). |
| **NCSC sanitisation** | [Secure sanitisation of storage media](https://www.ncsc.gov.uk/guidance/secure-sanitisation-storage-media) (reviewed 5 February 2025) |
| **NCSC devices** | Device security guidance: [Erasing devices](https://www.ncsc.gov.uk/collection/device-security-guidance/managing-deployed-devices/erasing-devices) and [Obsolete products](https://www.ncsc.gov.uk/collection/device-security-guidance/managing-deployed-devices/obsolete-products) (reviewed 13 May 2025) |
| **GOV.UK waste** | [Dispose of business or commercial waste](https://www.gov.uk/dispose-business-commercial-waste) and [Regulations: WEEE](https://www.gov.uk/guidance/regulations-waste-electrical-and-electronic-equipment) |
| **UK GDPR** | [Article 32](https://www.legislation.gov.uk/eur/2016/679/article/32) (security, including encryption) and [Article 33](https://www.legislation.gov.uk/eur/2016/679/article/33) (breach reporting) |

"**Required**" below means a standard or the law asks for this information (or for the check it enables). "**Good practice**" means it is useful or suggested, but no standard requires it to be recorded.

## Why a hardware register at all

- **DfE digital leadership**: "An asset register is a log of all the physical digital technology and tools that are within the school or college and should detail: what equipment you have; asset numbers; serial numbers; who it is assigned to; where it is within the school or college; when it was purchased; how old it is – this may be different to how long you have owned it, as it may be second-hand equipment; when it is due for review so that you can consider a replacement or upgrade; date it was securely disposed of." "The SLT digital lead owns this register." "You should already be updating your registers every time something changes."
- **DfE asset register template**: "Your SLT digital lead should make sure the digital technology asset register is being reviewed by the person responsible for your IT equipment every term". It should include "laptops, desktops and tablets; interactive whiteboards; servers and routers; hardware firewall; 3D printers; phones; network cabling" but "should not cover software or fixed assets". It is also needed for "making an insurance cover claim, such as risk protection arrangement (RPA)".
- **DfE cyber security** (`cyber-5`): "The end of support dates for each device's operating system should be recorded in the asset register and your mobile device management system, if you have one." IT support must check that "digital technology end-of-support dates are captured in the asset register".
- **DfE devices** (`devices-2`): devices should be configured "with labels or tags to keep track of them when you buy them and add them in an asset register", and central management includes "recording up-to-date information about the device in the asset register".
- **Cyber Essentials** `scope-2`: "Devices includes all types of hosts, networking equipment, servers, networks, and end user devices such as desktop computers, laptops, thin clients, tablets and smartphones". "Software includes operating systems … network software and firewall and router firmware", so `sum-1` to `sum-4` apply to firmware too.

## Fields

Fields are grouped as on the entry form. Some appear only when they apply (the "Applies to" column). Column names from the DfE template are accepted on import (shown in brackets).

### Identity

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Asset number (*Asset number*) | Required | All | DfE digital leadership: "asset numbers". DfE devices: "labels or tags to keep track of them". |
| Device type (*Asset type*) | Required | All | DfE digital leadership: "what equipment you have". Cyber Essentials `scope-2`. Decides which questions and checks apply. |
| Make (*Make of asset*) | Required | All | DfE template column. |
| Model (*Model of asset*) | Required | All | DfE template: "make sure you are also recording the variant". The support end date depends on the model. |
| Serial number | Required | All | DfE digital leadership: "serial numbers". |
| Condition when it arrived (*Condition of asset*) | Good practice | All | DfE template: new, used, donated or refurbished. Donated devices are exempt from the "bought with less than the minimum support" check. |

### Location and users

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Site or building (*Location: Building*) and Room (*Location: Room*) | Required | All | DfE digital leadership: "where it is within the school or college". |
| How it is used (shared, staff, loaned to a pupil, governor or volunteer, spare) | Required | All | Cyber Essentials `scope-5`: "All end user devices your organisation owns that are loaned to a third party must be included in the assessment scope." |
| Assigned to (*Who is the asset assigned to?*) | Required | All | DfE digital leadership: "who it is assigned to". The help text suggests initials or an MIS number for pupils, to keep personal data to a minimum. |
| Ownership (school-owned, leased, loaned by another organisation, staff BYOD, pupil BYOD) | Required | All | DfE template: owned, leased or loaned. Cyber Essentials `scope-4`: "User-owned devices which access organisational data or services are in scope"; `scope-5`: "employee, volunteer and trustee BYOD are in scope; student BYOD is out of scope". The page shows the Cyber Essentials scope worked out from this. |

### Operating system, firmware and updates

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Operating system or firmware (*Operating system*) | Required | All | DfE template; Cyber Essentials `sum-1` (software includes firmware). |
| Version | Required | All | Support is per version: Cyber Essentials `sum-1`: "a vendor has committed to support by providing regular vulnerability fixes. The vendor must provide the future date when they will stop providing these." |
| Support end date (*When does the asset expire or become unsupported?*) | Required | All | DfE cyber security: "The end of support dates for each device's operating system should be recorded in the asset register". Cyber Essentials `sum-1`. |
| Currently supported? | Required | All | Cyber Essentials `sum-2`: "Software must be removed from devices when it becomes unsupported, or removed from scope by using a defined sub-set that prevents all traffic to or from the internet." DfE switching-2: "Equipment that is no longer able to receive firmware and security updates should be replaced." NCSC obsolete products: "The only fully effective way to mitigate this risk is to stop using the obsolete product." |
| Enterprise or education edition? | Required | End-user devices | DfE devices-3 minimum requirement: "Enterprise or education-grade operating systems, which means they are designed for professional rather than home use." "Laptops, desktops and tablets should be replaced or upgraded now if they do not meet the operating system requirements of this standard." |
| Automatic updates on? | Required | All | Cyber Essentials `sum-3`: "All software on in-scope devices must have automatic updates enabled where possible." DfE switching-3: "The delivery of software updates should be set to automatically update as soon as they are available". |
| Updates last applied or checked | Required | All | Cyber Essentials `sum-4` and DfE cyber security: "IT support must complete vulnerability fixes for operating systems, applications and firmware within 14 days of the fix being released." DfE `cyber-3`: "keep boundary firewall firmware up to date, and on supported versions – this should be checked termly". |

### Security

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Storage encrypted? | Required | Computers, tablets, phones, servers | UK GDPR Article 32: "implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including inter alia as appropriate: (a) the pseudonymisation and encryption of personal data". DfE devices-2 asks for a DPIA covering "the risk … of taking school or college owned devices offsite". NCSC sanitisation: with encryption, a factory reset "deletes the encryption keys, making the data unreadable". See *Not confirmed* below. |
| Centrally managed? | Required | End-user devices and network equipment | DfE devices-2: "Devices should be centrally managed by IT support" and "Mobile and portable devices should have mobile device management … locking or wiping them". DfE switching-2 and wireless-3: a central management platform. |
| Malware protection | Required | Computers, tablets, phones, servers | Cyber Essentials `mp-1`: "For each device, you must use at least one of: anti-malware software (for Windows or macOS devices, including servers, desktops and laptops) or application allow listing (for all in-scope devices)." DfE `cyber-3`: "install anti-malware software (this must include anti-virus) on all devices". |
| Software firewall | Required | Laptops, desktops, Chromebooks, servers | Cyber Essentials `fw-1`: "If your organisation doesn't control the network to which a device connects, you must configure a software firewall on the device." `fw-7`. DfE `cyber-3`: "enable a software firewall for digital technology that is used outside of the school or college". |
| Password, PIN or biometric to unlock? | Required | End-user devices | Cyber Essentials `sc-6`: "a credential such as a biometric, password or PIN must be in place before a user can gain access". |
| Default admin password changed? | Required | Servers, network equipment, printers, other networked devices | Cyber Essentials `fw-2`: "Change default administrative passwords to a strong and unique password … or disable remote administrative access entirely"; `sc-2`. DfE `cyber-3`: "change the default administrator password". DfE switching-3 and wireless-4: admin accounts "must be secure and fully documented". |
| Admin page reachable from the internet? | Required | Firewalls and routers | Cyber Essentials `fw-3`: "Prevent access to the administrative interface … from the internet, unless there is a clear and documented business need, and the interface is protected by either multi-factor authentication, or an IP allow list". DfE `cyber-3` says the same. |
| Connected to a UPS? | Good practice | Servers, firewalls, routers, switches, wireless controllers | DfE switching-4: "The critical core switches should be connected to at least one UPS." DfE servers-1: "a UPS with automatic, safe shutdown of servers and a minimum of 30 minutes run-time". |
| Wi-Fi standard supported | Good practice | Portable devices | DfE devices-3: "Devices should support the wifi standard 802.11ac Wave 2. But it's recommended that devices meet wifi 6". |

### Purchase, warranty and lease

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Purchase date | Required | All | DfE digital leadership: "when it was purchased". |
| Date made or first used | Required | All (only needed for second-hand devices) | DfE digital leadership: "how old it is – this may be different to how long you have owned it". The page shows the age worked out from this, or from the purchase date. |
| Purchase price (*Purchase price (£)*), Supplier (*Supplier of the asset*), Order or invoice reference | Good practice | All | DfE template; insurance and RPA claims. |
| Warranty end date | Required | All | DfE devices-3: "3 years for laptops and desktops, 2 years for tablets". DfE switching-2: "providing 5 years of cover as a minimum". DfE servers-1: "valid manufacturer warranties and support agreements". |
| Lease end date | Good practice | Leased or loaned | DfE template: "if leased, when the lease will end". |

### Lifecycle and checks

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Status (*Asset status*): in use, spare, in repair, broken, retired waiting for disposal, lost or stolen, disposed of | Required | All | DfE template: "active, being repaired, decommissioned, disposed of, due to be disposed of, or has broken". Cyber Essentials `sum-2`. |
| Last checked (*Date of last check or replacement*), Checked by | Required / Good practice | All | DfE template columns; termly review. |
| Next review or replacement due (*Date of next check or replacement*) | Required | All | DfE digital leadership: "when it is due for review so that you can consider a replacement or upgrade". |
| Energy rating | Good practice | All | DfE devices-4: "they are rated with a low energy certification, such as Energy Star". DfE servers-3. |
| Switches off automatically out of hours? | Good practice | Desktops, thin clients, panels, displays, printers | DfE devices-4: "automatically power off when they do not need to be used out of hours". |
| Entry last updated by (*Person completing this entry*), Notes (*Additional comments*) | Good practice | All | DfE template. |

### Lost or stolen (shown only for that status)

| Field | Basis | Requirement it supports |
|---|---|---|
| Date lost or stolen | Required | UK GDPR Article 33: notify "without undue delay and, where feasible, not later than 72 hours after having become aware of it". |
| Actions taken (remote lock or wipe, DPO told, passwords reset, police, insurer or RPA, removed from management) | Required | NCSC erasing devices: "If you've lost your device or it has been stolen, then there may be options to remotely erase your device … part of your organisation's Mobile Device Management services". DfE devices-2: MDM for "locking or wiping them". |

### Disposal (shown for retired and disposed of)

| Field | Basis | Requirement it supports |
|---|---|---|
| Date disposed of | Required | DfE digital leadership: "date it was securely disposed of". |
| How it was disposed of | Required | DfE devices-4: "Waste Electrical and Electronic Equipment (WEEE) regulations and data protection requirements are met". |
| Data wiped or destroyed | Required | DfE devices-4: "action is taken to prevent security incidents by removing or destroying any data on the devices". NCSC sanitisation (the DfE links to it). |
| Data destruction certificate reference | Required | DfE devices-4: "they have certificates for WEEE, disposal and destruction of data". |
| WEEE or waste transfer paperwork | Required | DfE devices-4 (above), and "The WEEE regulations are a legal requirement." GOV.UK waste: "complete a waste transfer note for each load of waste that leaves your premises", "check if your waste carrier is registered", "Keep a paper or electronic copy for 2 years." |
| Disposed of by (*Who decommissioned/ disposed of this asset and when?*) | Good practice | DfE template. |

### School level

| Field | Requirement it supports |
|---|---|
| Whole register last reviewed | DfE template: reviewed "every term"; DfE digital leadership: the SLT digital lead should review registers "ahead of your next financial planning cycle". The dashboard shows a reminder if it is more than 4 months old. |

## Compliance checks (Red, Amber, Green)

Each asset is checked against today's date. Any Red reason makes it Red; otherwise any Amber reason makes it Amber; otherwise it is Green. **Closed** means disposed of, or lost or stolen, with everything recorded: it is kept for the record. Blank answers count as "not recorded", so a newly added device starts Red until its details are filled in: the point is to show what is missing.

Thresholds are constants in `hardware-data.js` (`THRESHOLDS`):

| Constant | Value |
|---|---|
| `supportEndWarnMonths` | 6 |
| `warrantyWarnDays` | 60 |
| `leaseWarnDays` | 60 |
| `auditOverdueMonths` | 12 |
| `patchWindowDays` | 14 |
| `termlyCheckMonths` | 4 (firewall firmware check and whole-register review) |
| `newPurchaseMonths` | 12 (DfE minimum support and warranty checked for devices bought in the last 12 months) |

Minimum years at purchase (`MIN_SUPPORT_YEARS`, `MIN_WARRANTY_YEARS`): laptops, desktops and Chromebooks 5 years' support and a 3-year warranty, tablets 3 and 2 (DfE devices-3); switches 5 and 5 (DfE switching-2).

**Red** (in use, unless stated)

1. Unsupported: past its support end date, or marked as not supported. (Cyber Essentials `sum-1`, `sum-2`; DfE `cyber-5`.)
2. No support end date recorded. (Cyber Essentials `sum-1`; DfE `cyber-5`.)
3. A school-owned laptop, Chromebook, tablet or phone where encryption is anything other than Yes. (UK GDPR Article 32; see below.)
4. Network equipment or a server where the default admin password is not confirmed as changed; any other device marked as still using its default password. (Cyber Essentials `fw-2`, `sc-2`.)
5. A firewall or router whose admin page can be reached from the internet with only a password. (`fw-3`.)
6. A computer, tablet, phone or server with no malware protection. (`mp-1`.)
7. A computer, tablet or phone that can be unlocked without a password, PIN or biometric. (`sc-6`.)
8. A laptop or Chromebook loaned to a pupil, or a staff BYOD laptop, with no software firewall. (`fw-1`, `fw-7`.)
9. Disposed of without a record that the data was wiped or destroyed. (DfE devices-4.)
10. Lost or stolen with no action recorded. (NCSC; UK GDPR Article 33.)

**Amber**

1. Support ends within 6 months.
2. Warranty ends within 60 days; a lease ends within 60 days or has ended.
3. Not checked for more than 12 months, never checked, or the review or replacement date has passed.
4. No location or assigned person; no asset number or serial number.
5. Automatic updates not confirmed; or not automatic and no update recorded in the last 14 days.
6. A firewall or router whose firmware has not been checked in the last 4 months (termly).
7. Encryption (desktops, servers), malware protection, screen lock, software firewall, central management or the firewall's admin page not confirmed; a staff laptop with no software firewall; not centrally managed.
8. A home edition operating system.
9. Bought in the last 12 months with less than the DfE minimum support or warranty.
10. A spare, broken or in-repair device that is unsupported or has no support end date (it must not go back into use).
11. Retired and waiting for disposal.
12. Disposed of without WEEE or waste paperwork, or without a date; lost or stolen without telling the data protection officer, or without a date.

**Exceptions.** Pupils' own devices are out of Cyber Essentials scope, so only the location and check rules apply to them. Staff BYOD is in scope for support, updates, malware, screen lock and firewall, but is not checked for encryption or school device management.

## Evidence for the trackers

| Tracker item | How the register helps |
|---|---|
| DfE `leadership-2` *Keep registers relating to hardware and systems up to date* | Every column the standard and the DfE template list, plus a termly review date. |
| DfE `cyber-5` *License digital technology and keep it up to date* | Operating system and firmware support end dates for every device, with "support ending" and "unsupported" lists for the termly report to SLT. |
| DfE `devices-2`, `devices-3`, `devices-4` | Encryption, management, malware and firewall; enterprise editions, support and warranty at purchase; energy and disposal records. |
| DfE `cyber-3` | Default passwords, admin page exposure, termly firewall firmware checks. |
| Cyber Essentials Scope `scope-2`, `scope-4`, `scope-5` | Every device listed with ownership and use, and the scope worked out. |
| Cyber Essentials `fw-1` to `fw-7`, `sc-2`, `sc-6`, `sum-1` to `sum-4`, `mp-1` | One question per control on each device. |

## Saving, export and import

- Saved in the browser under `localStorage` key `hardware_register_v1` (schema version 1). It is loaded field by field: unknown fields are dropped, option fields keep only listed values (device types and statuses are matched from the DfE template's wording), dates must be real `YYYY-MM-DD` dates, text is capped at 20,000 characters, ids must be simple strings, and the register holds up to 5,000 assets. Field lookups use a `Map`, so imported column names can never reach an object prototype.
- **Excel export** sheets: *Info* (school, URN, export date, last review, counts), *Register* (one row per asset, one column per field, plus Age, Cyber Essentials scope, Check and Reasons), *Needs attention*, *Field guide* (every field, the requirement, source links and the check rules), and a hidden *_hardware_register* sheet with the whole register as JSON in 30,000-character chunks (row 1: marker `hardware-register-snapshot`, schema version, number of chunks).
- **Excel import** uses `AssessmentModel.checkImportFile` (`.xlsx` only, 10 MB limit) and `AssessmentModel.SAFE_XLSX_READ`. It reads the hidden sheet first, then the visible Register sheet, then a filled-in **DfE asset register template** (sheet *Digital technology assets*; its example rows are skipped). DfE and Cyber Essentials tracker exports, the software register and other registers are refused with a message saying what the file is. The user chooses **Merge** (assets with the same ID, the same serial number, or with no serial the same asset number, are updated) or **Replace**.
- **CSV import** (Quick add page): any of the field names or DfE template column names as headings; devices already in the register are skipped.
- **Starter list.** Quick add offers about 100 common UK school devices in collapsible sections (Laptops; Desktops and all-in-ones; Tablets; Chromebooks; Interactive displays and classroom AV; Network equipment; Servers and storage; Printers and copiers; Phones and other devices), each with sub-groups (for example Network equipment has Switches, Wireless access points, and Firewalls and routers), a search box and a quantity for each item ticked. Each unit is added as a separate asset, with the optional site and room. Products are listed by make and model *family* only (for example "Dell Latitude", "Apple iPad Air"), never a generation or exact model number, because those go out of date. Every section ends with **Something else**, which adds devices by type only, as the old Quick add did. The list is `STARTER_SECTIONS` in `hardware-data.js`; listing a product is not a recommendation.
- **Typical details.** Quick add fills in only what follows from the make and model family: **Device type**, **Make**, **Model** (the family, for the school to complete) and, where it is unambiguous for the family, **Operating system or firmware** (for example iPadOS, macOS, ChromeOS, FortiOS, DSM). Nothing specific to the school or the unit is ever filled in: asset number, serial number, location (other than the optional Quick add boxes), assigned person, version, support end date, warranty, purchase and lease details, security answers, energy rating, and the lost and disposal records stay blank, so the checks still flag them. A note is added to the entry asking the school to check the details. On the edit page, **Fill in typical details** appears when the make and model match a product in the list (the model can be the full model, such as "Latitude 5440"), and fills only empty fields. No "what it's used for" field was added: the device type already says what a device is for.

## Not confirmed from the sources

- **Encryption.** Neither the DfE standards nor Cyber Essentials require device encryption. The Red rule for unencrypted portable devices rests on UK GDPR Article 32 (encryption "as appropriate"), the DfE's DPIA on taking devices off site, and the NCSC's sanitisation guidance. This is a judgement for portable devices that may hold personal data; schools can discuss it with their DPO.
- **ICO guidance** on breach reporting and encryption was not fetched; UK GDPR Article 33 is quoted instead.
- **WEEE for schools.** The GOV.UK WEEE regulations page is written for producers and distributors. The duties quoted for schools (waste transfer notes, registered carriers, keeping notes for 2 years) come from *Dispose of business or commercial waste*. Some electrical waste may be hazardous waste with extra rules; this register does not check that.
- **Thresholds** (6 months, 60 days, 12 months) are this tool's choices, matching the software register. The 4-month "termly" period is an approximation of a school term.
- **Minimum support and warranty** (DfE devices-3) apply "when repurposing, upgrading or buying new devices", so they are only checked for devices bought in the last 12 months.
- **Cabling** is listed in the DfE template and the standards ask for test reports and a 20-year warranty (`cabling-2`), but cabling is not a device, so it is best recorded as an "Other" asset with notes and the warranty end date.
- **Device types** are this tool's list; the DfE template's dropdown values are matched to them on import.

## Next steps

- Link to the **software register**: the dashboard lists every operating system and firmware version in use with its earliest support end date, so these can be added to the software register as "Operating system" entries. A later change could offer a button that adds missing ones.
- Bring **register summaries into the trust overview**, using the hidden sheet, so a trust can see unsupported devices, unencrypted laptops and missing disposal records across academies.

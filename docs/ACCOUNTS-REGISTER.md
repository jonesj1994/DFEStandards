# User accounts register: what it tracks and why

The user accounts and access privileges register (`accounts.html`) records the accounts a school controls (staff, IT admin, emergency admin, service, shared, supplier and MSP, governor, volunteer and supply accounts, and pupil accounts with extra access) with the details the DfE digital and technology standards, Cyber Essentials and data protection law ask schools to manage. This document lists each field, the requirement it supports (quoting the source), and the rules behind the Red/Amber/Green checks.

> **The register never holds passwords, PINs, recovery codes, MFA secrets or any other credential.** No field asks for one. On import, any column whose header looks like a credential (password, PIN, secret, token, recovery or backup code, OTP, API or private key, and similar) is dropped and a warning is shown. Text in any field that looks like a credential (for example `password: …` or `PIN=…`) makes the account Red until it is removed, and the termly review page refuses to save change notes that look like one.

Sources were read on 5 November 2026:

| Short name | Source |
|---|---|
| **DfE cyber security** | [Cyber security: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-core-standard), *Control and secure user accounts and access privileges* (GOV.UK, last updated 16 September 2026; the same text is held in `data.js`, item `cyber-4`) |
| **DfE cloud solutions** | [Cloud solutions](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cloud-solutions): *Cloud solutions must follow data protection legislation* (`cloud-2`) and *Cloud solutions should use ID and access management tools* (`cloud-3`) |
| **DfE filtering and monitoring** | [Filtering and monitoring: core standard](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/filtering-and-monitoring-core-standard) (`filtering-1`, `filtering-4`) |
| **DfE IT support** | [IT support](https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/it-support) (`support-2`) |
| **Cyber Essentials** | NCSC [Cyber Essentials: Requirements for IT Infrastructure v3.3](https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf) (effective 27 April 2026). Item ids (`uac-1` and so on) match the Cyber Essentials tracker (`ce-data.js`). |
| **NCSC MFA** | NCSC [Recommended types of MFA](https://www.ncsc.gov.uk/collection/mfa-for-your-corporate-online-services/recommended-types-of-mfa) (reviewed 26 September 2024) |
| **DfE DP policies** | DfE *Data protection in schools*: [Data protection policies and procedures](https://www.gov.uk/guidance/data-protection-in-schools/data-protection-policies-and-procedures) (updated 17 June 2026) |
| **DfE records** | DfE *Data protection in schools*: [Record keeping and management](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management) |
| **UK GDPR** | [Article 5](https://www.legislation.gov.uk/eur/2016/679/article/5) (data minimisation, storage limitation), legislation.gov.uk |

"**Required**" below means a standard or the law asks for this information (or the check it enables). "**Good practice**" means it is useful, or is suggested by the guidance, but no standard requires it to be recorded.

## Why an accounts register at all

- **DfE cyber security**, *Account management*: "IT support need to control user accounts and access privileges by: creating accounts only when required; limiting access privileges to only what the user needs for their role; disabling accounts as soon as someone leaves their role; creating and managing a process with human resources and your business professionals or the finance team to deal with joiners, leavers and those moving roles." IT support will also "review accounts with your business professionals or the finance team every term to identify changes that might have been missed – this should include changing access levels and rights, and suspending or deleting accounts which are no longer in use".
- **Cyber Essentials** User access control aim: "Ensure that user accounts are assigned to authorised individuals only, and provide access to only those applications, computers and networks that the user needs to carry out their role."
- **DfE cloud solutions** (`cloud-2`): "there is a user account creation, approval and removal process that is part of your school's joining and leaving protocols, and it complies with data protection legislation".

Neither standard says "keep a register of accounts" in so many words. The register is the record that shows the account process exists, that termly reviews happen, and that leavers, admin accounts and supplier access are under control.

## Fields

Fields are grouped as on the entry form. Some appear only when they apply (the "Applies to" column).

### Account and holder

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Account name or ID | Required | All | Cyber Essentials `uac-1`: "Have in place a process to create and approve user accounts"; `uac-2`: "Authenticate users with unique credentials before granting access to applications or devices." The sign-in name only, never the password. |
| Account type (staff, IT admin account, emergency admin (SLT), service, shared, supplier or MSP, governor or trustee, volunteer or supply, pupil with extra access) | Required | All | DfE cyber security: "students, staff and third parties only have access to the things they need"; "make sure SLT have access to a dedicated administrative account – this will only be needed in an emergency where IT support is unavailable". Cyber Essentials `scope-7`: "All accounts that your organisation owns are in scope, even when those accounts are used by a third party, such as a supplier, contractor or Managed Service Provider (MSP)." |
| Holder name | Required | All (blank for service and shared accounts) | Cyber Essentials `uac-2` (unique credentials, so each account maps to a person). DfE filtering and monitoring (`filtering-4`): "users are identifiable to the school or college, so concerns can be traced back to an individual". |
| Holder's role | Required | All | DfE cyber security: "limiting access privileges to only what the user needs for their role". DfE cloud solutions (`cloud-3`): "create roles that make sure all types of users have the right levels of access to the right systems". DfE filtering and monitoring (`filtering-1`): "the roles and responsibilities of staff and third parties". |
| What the account is for | Required | Service and shared accounts | DfE cyber security: "creating accounts only when required". Cyber Essentials `uac-1`. |
| Responsible member of staff | Required | Service, shared and supplier accounts | Cyber Essentials `uac-1` (approval process) and `uac-3` (someone has to decide when it is "no longer required"). |

### Systems and privileges

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Systems covered | Required | All | DfE cyber security: "make sure that accounts are set up so that students and staff only have access to the data and systems they need". Names from the Software Register (`software_register_v1`) are offered as suggestions. |
| Privilege level (standard user, elevated, global or domain admin, system owner) | Required | All | DfE cyber security: "limiting access privileges to only what the user needs for their role". Cyber Essentials `uac-6`: "Remove or disable special access privileges when no longer required (when a member of staff changes role, for example)." Anything above standard user is treated as an admin account. |
| Used for cloud services or remote access? | Required | All | DfE cyber security: "MFA must be enabled for all: staff accounts with access to cloud services or remote access to on-site systems; IT administrative accounts". Cyber Essentials `uac-4`: "Authentication to cloud services must always use MFA." |

### Security

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| MFA switched on? (yes, no, not available on this system, not sure) | Required | All | Cyber Essentials `uac-4`: "Implement MFA, where available. Authentication to cloud services must always use MFA." DfE cyber security (MFA list above), and "make sure that enhanced security, such as MFA, is always used where staff are handling confidential, personal or sensitive personal data". "Where MFA is not available, a more complex password should be used". |
| MFA method (security key or passkey, authenticator app, hardware code generator, text message or phone call, other) | Good practice | MFA on | NCSC MFA puts FIDO2 first, and says of message-based methods (email, SMS and call): "Message-based methods are only likely to be appropriate when no other strengthening method is possible." The DfE standard allows "a text message which will send a code to a mobile device, this is for staff only". Cyber Essentials `uac-4`: "FIDO2 authenticators (passkeys) are regarded as MFA." |
| Separate from the person's everyday account? | Required | Admin accounts used by a person | Cyber Essentials `uac-5`: "Use separate accounts to perform administrative activities only". DfE cyber security: "make sure that global or administrative accounts are not used for routine business and that instead, dedicated accounts (not used for day-to-day email and work) have enhanced privileges". |
| Used only for admin tasks (no email or web browsing)? | Required | Admin accounts used by a person | Cyber Essentials `uac-5`: "(no emailing, web browsing or other standard user activities that may expose administrative privileges to avoidable risks)". |
| Used by one named person only? | Required | All | Cyber Essentials `uac-2` (unique credentials). DfE cyber security: passwords "must be unique to the user". |
| Why it is shared, and how use is tracked | Required | Shared accounts | As above; and DfE filtering and monitoring: users identifiable "including guest accounts where possible". |

### Approval and dates

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Approved by | Required | All | Cyber Essentials `uac-1`. DfE cyber security: "agree a process for handling administrative accounts so that a member of SLT or a trustee approves any changes to access levels or privileges before IT support can action the change". |
| Approval date | Required | All | As above. |
| Start date | Good practice | All | DfE cyber security: a process for "joiners, leavers and those moving roles". |
| End or leave date | Required | All | Cyber Essentials `uac-3`: "Remove or disable user accounts when they're no longer required (for example, when a user leaves the organisation or after a defined period of account inactivity)." DfE cyber security: "disabling accounts as soon as someone leaves their role". |
| Date disabled or deleted | Required | Suspended, disabled or deleted | Evidence for `uac-3` and Cyber Essentials `sc-1`: "Regularly remove and disable unnecessary user accounts (such as guest accounts and administrative accounts that won't be used)." Filled in automatically when the status changes. |

### Third-party access

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Supplier name | Required | Supplier or MSP | Cyber Essentials `scope-7` (above). DfE IT support (`support-2`): "If any of your IT support is provided by third parties, your internal IT support should coordinate their activity." |
| Contract or terms reference | Required | Supplier or MSP | DfE cyber security: "If you have external IT support that will carry out the activities within this standard, make sure that your contract with them is compliant with General Data Protection Regulation (GDPR)." DfE cloud solutions: "data processing carried out by third parties is covered by an appropriate contract". |
| How access is controlled (switched on only when needed, always on) | Required | Supplier or MSP | DfE cyber security: "make sure that remote access is disabled when not required, and enabled only by a member of authorised school or college staff". |
| Supplier has confirmed it meets the Cyber Essentials controls? | Required | Supplier or MSP | Cyber Essentials `scope-7`: "If you're using externally managed services (such as remote administration), you must be able to confirm that the Cyber Essentials technical controls are being met." |

### Reviews

| Field | Basis | Applies to | Requirement it supports |
|---|---|---|---|
| Last access review | Required | All | DfE cyber security: "review accounts … every term". Cyber Essentials `uac-3`, `uac-6`. |
| Reviewed by | Good practice | All | DfE cyber security: the review is done "with your business professionals or the finance team". |
| Review outcome (no change, access changed, disabled or removed, follow-up needed) | Good practice | All | DfE cyber security: the review "should include changing access levels and rights, and suspending or deleting accounts". |
| Next review due | Good practice | All | Set to four months ahead when an account is marked reviewed. |
| Account status (active, suspended, disabled, deleted) | Required | All | DfE cyber security: "suspending or deleting accounts which are no longer in use". Cyber Essentials `uac-3`, `sc-1`. Closed accounts are kept for the record. |
| Notes | Good practice | All | Changes made and links to evidence. The termly review adds a dated line here for each change recorded. |

## Compliance checks (Red, Amber, Green)

Each account is checked against today's date. Any Red reason makes it Red; otherwise any Amber reason makes it Amber; otherwise it is Green. Suspended, disabled and deleted accounts are kept for the record and shown as **Inactive**, except that the credential check still applies to them.

An account counts as an **admin account** if its type is IT admin account or Emergency admin (SLT), or its privilege level is anything above Standard user.

Thresholds are constants in `accounts-data.js` (`THRESHOLDS`):

| Constant | Value | Why |
|---|---|---|
| `accessReviewMonths` | 4 | "Every term" (DfE). Schools in England have three terms a year, so a review more than four months old has missed a term. This is an assumption: the standard does not give a number of months. |
| `leaverWarnDays` | 14 | Flags leavers two weeks ahead so the account can be disabled on the day. This tool's choice. |
| `closedRecordMonths` | 12 | Closed accounts older than this are listed on the Leavers check for a retention decision. This tool's choice; the school's retention schedule decides. |

**Red**

1. Any text field looks like it contains a password, PIN or code (`password: …`, `PIN=…` and similar; only `:` or `=` after the word counts, so "password reset on 3 May" is fine).
2. Active, but the end or leave date has passed. (Cyber Essentials `uac-3`; DfE "disabling accounts as soon as someone leaves".)
3. An admin account without MFA (anything other than Yes). Exception: an admin account on a system with no MFA available that is not used for cloud services or remote access is Amber instead, because Cyber Essentials asks for MFA "where available" and the DfE standard says "Where MFA is not available, a more complex password should be used". (DfE: MFA "must be enabled for all … IT administrative accounts".)
4. Used for cloud services or remote access without MFA, including "Not available". (Cyber Essentials `uac-4`: "must always use MFA".)
5. An admin account that is not separate from the person's everyday account, or is also used for email or web browsing. (Cyber Essentials `uac-5`; DfE.)
6. A shared admin account. (Cyber Essentials `uac-2` and `uac-5`.)
7. Supplier or MSP access with no approver recorded. (Cyber Essentials `uac-1`, `scope-7`; DfE SLT or trustee approval for admin access.)

**Amber**

1. MFA not confirmed or off where that is not already Red, or an admin account on a system with no MFA available.
2. Not recorded whether a non-admin account is used for cloud services or remote access.
3. MFA by text message or phone call only. (Allowed by the DfE for staff, but the NCSC says message-based MFA is "only likely to be appropriate when no other strengthening method is possible".)
4. An admin account not confirmed as separate and used only for admin tasks.
5. A shared non-admin account (with or without a reason: Cyber Essentials requires unique credentials, so it stays visible), or not confirmed that one named person uses it.
6. End or leave date within 14 days.
7. No approver recorded.
8. A service or shared account with no responsible member of staff.
9. Privilege level not recorded.
10. Supplier access always on, or not recorded how it is controlled; or the supplier has not confirmed the Cyber Essentials controls.
11. No access review this term: the next review date has passed, the last review was more than four months ago, or no review is recorded.

Amber rules 1, 2, 4, 6, 9 and the supplier-controls part of 10 were added to the brief's list so that missing information does not look Green, and so leavers can be planned for.

## Termly access review and leavers check

- **Termly access review** lists active accounts due for review (admin and supplier accounts first, then oldest review first). Enter who is reviewing, then for each account choose **No change**, **Access changed** (a short description of the change is required and added to the notes with the date) or **Disable** (marks the account Disabled with today's date after a confirmation). Marking an account sets the last review to today, records the reviewer and outcome, and sets the next review four months ahead. A progress bar shows how many active accounts have been reviewed this term.
- **Leavers check** lists active accounts past their end date (with a Disable button), accounts leaving in the next 14 days, supply, volunteer and supplier accounts with no end date, and closed accounts old enough to check against the retention schedule. Disabling here only updates the register: the page reminds staff to disable the account in each system too.

## Data protection: the minimum to keep

The register holds staff names, roles and sign-in names, which are personal data, so it is itself covered by data protection law.

- **Keep the minimum.** UK GDPR Article 5(1)(c): personal data shall be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed". The register asks only for what is needed to manage access: sign-in name, holder name and role, systems, privilege, security settings, approval, dates and reviews. It does not ask for dates of birth, home addresses, personal phone numbers or HR details, and the form says so.
- **Keep it only as long as needed.** DfE records: "The Data Protection Act 2018 and UK GDPR says you should only keep data for as long as you need it. You should check each year what data you hold and if you still need to keep it." UK GDPR Article 5(1)(e) (storage limitation). The Leavers check lists accounts closed more than 12 months ago so the school can decide, with its data protection officer and its retention schedule, when to delete the rows. The DfE schedule has no entry for account registers; the nearest is personnel files ("6 years from termination of employment"), which is longer than an access record usually needs. This tool does not set a retention period.
- **Control who can see it.** DfE DP policies, record of processing activities: record "who has access to it and how that's controlled". The register is saved only in the browser that created it; the Excel export says it holds staff personal data and should be stored securely.
- **Never store credentials.** As above. DfE cyber security also asks that passwords are "protected from unauthorised access", which a spreadsheet of passwords would break.

## Evidence for the trackers

| Tracker item | How the register helps |
|---|---|
| DfE cyber security, *Control and secure user accounts and access privileges* (`cyber-4`) | Approval for every account, MFA on cloud and admin accounts, separate admin accounts, SLT emergency admin account, leavers disabled, supplier remote access controlled, and termly reviews with outcomes. |
| DfE cloud solutions (`cloud-2`, `cloud-3`) | Evidence of the "user account creation, approval and removal process" and of roles with the right levels of access. |
| Cyber Essentials User access control `uac-1` to `uac-6` | Approval (`uac-1`), unique accounts (`uac-2`), leavers removed (`uac-3`), MFA (`uac-4`), separate admin accounts (`uac-5`), privileges removed at review (`uac-6`). |
| Cyber Essentials Secure configuration `sc-1` and Scope `scope-7` | Unused accounts disabled with dates; supplier and MSP accounts listed with confirmation of controls. |

## Saving, export and import

- Saved in the browser under `localStorage` key `accounts_register_v1` (schema version 1). It is loaded field by field: unknown fields (including any credential-looking key) are dropped, option fields keep only listed values, dates must be real `YYYY-MM-DD` dates, text is capped at 20,000 characters, ids must be simple strings, and the register holds up to 5,000 accounts. Field definitions are looked up through a `Map`, not a plain object keyed by untrusted strings. Corrupt or missing storage starts an empty register.
- **Excel export** sheets: *Info* (school, URN, export date, counts, and notes that the file holds personal data and must never hold credentials), *Register* (one row per account, one column per field, plus Check and Reasons), *Needs attention*, *Field guide* (every field, what it means, the requirement and source links, and the check rules), and a hidden *_accounts_register* sheet holding the whole register as JSON in 30,000-character chunks (row 1: marker `accounts-register-snapshot`, schema version, number of chunks), following the `_assessment` pattern in `assessment-model.js`.
- **Excel import** uses `AssessmentModel.checkImportFile` (`.xlsx` only, 10 MB limit) and `AssessmentModel.SAFE_XLSX_READ`. It reads the hidden sheet first, then falls back to the visible Register sheet, matching columns by label and converting Excel date numbers and dd/mm/yyyy dates. Credential-looking columns are dropped with a warning. DfE and Cyber Essentials tracker exports, and Software Register and Hardware Register exports (by their hidden `_software_register` and `_hardware_register` sheets; the backup and incident registers are expected to use `_backup_register` and `_incident_log`) are refused with a message saying what the file is. The user chooses **Merge** (accounts with the same ID or account name are updated; others are added) or **Replace**.
- **CSV import** (Quick add page): recognises Account (or Username, Email, UPN, UserPrincipalName), Name (or Display name), Role (or Job title), Type, Privilege and Systems; accounts already in the register with the same account name are skipped; credential-looking columns are dropped with a warning.

## Not confirmed from the sources

- **"Every term" as four months.** The DfE standard says "every term" but gives no number of months. Four months is this tool's reading of three terms a year.
- **Pupil accounts.** The DfE standard covers pupils' access ("students and staff only have access to the data and systems they need"), but listing every pupil account here would add a lot of children's personal data for little benefit. The register is aimed at staff, admin, service and third-party accounts, and pupil accounts with extra access. Pupil account hygiene is better shown from the MIS-linked provisioning the DfE standard suggests.
- **SMS MFA for admin accounts.** The DfE standard allows text messages for staff; the NCSC prefers other methods. The register makes SMS Amber for every account, not Red, including admin accounts. Your Certification Body may take a stricter view for admin accounts.
- **Admin accounts on systems without MFA.** Treated as Amber (not Red) when the system is not a cloud service and is not used for remote access, following "where available". Confirm with your Certification Body.
- **Emergency (SLT) admin accounts.** The DfE standard asks for one but does not say whether it should be shared, how its credentials are held, or whether it needs MFA. The register treats it as an admin account (MFA required, must not be shared) and tells staff to keep its credentials in the sealed emergency process agreed with SLT, not in the register.
- **Retention period.** No DfE or ICO period was found for account or access records. The 12-month listing is a prompt to decide, not a rule.
- **ICO guidance** could not be fetched from this environment (the ICO site refuses automated requests), so it is not quoted. The NCSC "MFA for your corporate online services" collection was fetched and quoted.
- **Credential detection** is a safety net, not a guarantee: it catches headers and `word: value` patterns, not a password typed on its own.

## Next steps

- **Link with the Software Register.** Systems names are already suggested from it. A next step would be a view in the Software Register showing, for each system, how many active and admin accounts the accounts register lists, and flagging systems whose MFA setting in the Software Register disagrees with the accounts that use them.
- **Trust overview.** Read the hidden `_accounts_register` sheet in `trust.html` to show, per academy: leavers still active, admin accounts without MFA, supplier access always on, and the percentage of accounts reviewed this term. Only counts would be needed, not names, which keeps staff personal data out of the trust view.
- A shared helper for register import and export (hidden sheet read and write, `importDate`, CSV parser) to save each register repeating it. This would mean changing shared files, so it is left for the parent session to decide.

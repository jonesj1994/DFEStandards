# How to meet the DfE digital and technology standards
## A practical guide for schools (draft for review)

_Prepared 2026-11-17 for the School Compliance Toolkit. It isn't in the product yet._

This guide takes each of the **50 DfE digital and technology standards** and explains, in plain English, what it means and how a school can meet it. It's written for school business managers, headteachers and office staff without much IT knowledge.

**How it was written:**
- Every requirement, deadline and technical figure under "What GOV.UK asks for" and "When to meet it" comes from the GOV.UK guidance text held in the toolkit. That text is word for word from GOV.UK, last updated 2026-09-16.
- Everything else is practical advice, not DfE wording: the examples, evidence to keep, who can help and watch out for.
- No products or brands are recommended. Only public bodies and schemes that the guidance itself names are mentioned.

**Each standard has these sections:** In plain English · What GOV.UK asks for · When to meet it · Examples of how schools meet it (a small primary, a larger school or trust, a quick win) · Evidence to keep · Who can help · Watch out for.

Items flagged for checking are listed in [Notes for review](#notes-for-review) at the end.

## Contents
1. [Broadband](#broadband) (core): 3 standards
2. [Cloud Solution](#cloud-solution): 5 standards
3. [Cyber Security](#cyber-security) (core): 7 standards
4. [Digital Accessibility](#digital-accessibility): 3 standards
5. [Digital Leadership](#digital-leadership) (core): 4 standards
6. [Filtering and Monitoring](#filtering-and-monitoring) (core): 4 standards
7. [Laptops, Desktops, Tablets](#laptops-desktops-tablets): 4 standards
8. [Network Cabling](#network-cabling): 3 standards
9. [Network Switching](#network-switching) (core): 4 standards
10. [Servers and Storage](#servers-and-storage): 4 standards
11. [IT Support](#it-support): 5 standards
12. [Wireless Network](#wireless-network) (core): 4 standards
13. [Notes for review](#notes-for-review)

---

## Broadband

These core standards cover your school's internet connection: how fast it is, what happens if it fails, and how it keeps pupils safe online.

### Broadband: Schools and colleges should use a full fibre connection for their broadband service
`broadband-1` · Core standard: Yes

**In plain English:** Your internet should come into the building over a fibre cable all the way, not over old copper telephone lines. It should be fast enough for the whole school to use online tools at the same time.

**What GOV.UK asks for:**
- Broadband provided over a full fibre connection, sometimes called a leased line or FTTP (fibre to the premises). Copper connections do not meet the standard.
- Primary schools: at least 100Mbps download and at least 30Mbps upload.
- Secondary schools, all-through schools and FE colleges: a connection with the capacity to deliver 1Gbps download and upload.
- Ask your supplier or IT support to check what full fibre services and speeds are available to you.

**When to meet it:** As soon as you can, usually at the end of your current contract or as soon as full fibre is available; new or extended non-fibre contracts should let you switch to fibre when it becomes available.

**Examples of how schools meet it:**
- *Small primary:* Asks its supplier whether FTTP is available, then switches to a fibre package of at least 100/30Mbps when the contract ends.
- *Larger school or trust:* Buys leased lines for all its secondaries in one procurement, each with 1Gbps capacity both ways.
- *Quick win:* Find your broadband contract and note the end date, connection type and speeds.
- *If full fibre isn't available yet:* Make sure any renewal lets you move to fibre early once it arrives.

**Evidence to keep:**
- Current broadband contract showing connection type (FTTP or leased line) and speeds.
- Written availability check from your supplier, if fibre isn't yet available.
- A note of the contract end date and your plan to upgrade.

**Who can help:** Your broadband supplier, IT support, and your trust or local authority procurement lead.

**Watch out for:** "Fibre broadband" adverts often mean fibre to the street cabinet with copper the rest of the way. That is not full fibre. Ask specifically for FTTP or a leased line. Also, a fast line can still feel slow if your internal cabling, switches or Wi-Fi are old.

### Broadband: Schools and colleges should have a backup broadband connection to ensure resilience and maintain continuity of service
`broadband-2` · Core standard: Yes

**In plain English:** If your main internet line goes down, a second connection should take over automatically so lessons, the MIS (management information system) and phones keep working.

**What GOV.UK asks for:**
- A combination of measures to avoid a single point of failure (one thing that, if it breaks, takes everything down).
- More than one broadband connection, of different service types, for example a leased line plus FTTP, or FTTP plus low Earth orbit satellite.
- More than one router, set up to switch over to the backup automatically when needed.
- Redundant (backup) power options for core active network equipment, such as the main switches and routers.

**When to meet it:** Alongside a new connection being installed, or as soon as possible afterwards.

**Examples of how schools meet it:**
- *Small primary:* Adds a lower-cost second connection of a different type to the main fibre line, with a second router set to take over automatically. A small UPS (a battery unit that keeps equipment running during a power cut) protects the router and main switch.
- *Larger school or trust:* Has a leased line as the main service and FTTP as backup, with two routers configured for automatic failover, and UPS units on core network equipment.
- *Quick win:* Ask your broadband provider for a written quote and options for a backup connection.
- *If you have a managed IT provider:* Ask them to unplug the main line during a holiday and show you that the backup takes over.

**Evidence to keep:**
- Contracts for both connections, showing they are different types.
- A simple network diagram showing both routers and the failover.
- A record of a failover test (date, result).

**Who can help:** Your broadband provider, IT support or managed service provider.

**Watch out for:** Two lines of the same type, from the same provider, on the same cable route can fail together. The standard asks for different service types. A backup line without automatic failover means someone has to fix things by hand during an outage.

### Broadband: Schools and colleges should have appropriate IT security and safeguarding systems in place, under both child and data protection legislation
`broadband-3` · Core standard: Yes

**In plain English:** Your internet must have a content filter that blocks harmful material, and a firewall (a barrier that controls what traffic can enter and leave your network) to protect your systems.

**What GOV.UK asks for:**
- A content filtering system that meets the online safety section of Keeping children safe in education (KCSIE), paragraphs 123 to 135.
- A firewall as part of your internet and network system. This can be an on-site device managed by the school, or an "edge" service run by your supplier or IT support.
- Further guidance is named: KCSIE, the UK Safer Internet Centre, the UK Council for Internet Safety (UKCIS), an online safety self-review tool for schools, and NCSC "Stay safe online" tips.

**When to meet it:** You should already be meeting this as part of your statutory safeguarding duties under KCSIE.

**Examples of how schools meet it:**
- *Small primary:* Uses the filtering and managed firewall included in its broadband package. The DSL (designated safeguarding lead) and IT support check together once a year that the filter blocks the right categories and that the DSL receives alerts.
- *Larger school or trust:* Has a central firewall and filtering service, with different filtering levels for pupils and staff, and reports reviewed weekly by the DSL team.
- *Quick win:* Ask your supplier for a one-page summary of what your filter blocks, who gets alerts, and who manages the firewall.

**Evidence to keep:**
- Filtering and firewall service details from your supplier or IT support.
- A record of the annual filtering review signed by the DSL.
- Online safety policy referencing filtering arrangements.

**Who can help:** DSL, IT support, broadband supplier, and governors with safeguarding responsibility.

**Watch out for:** Filtering alone is not enough; KCSIE also expects monitoring and a whole-school approach. Check that filtering works on every device, including Wi-Fi and staff laptops, not just classroom PCs.

---

## Cloud Solution

These standards help schools move services such as email, files and the MIS from servers on site to secure online (cloud) services, and use them safely.

### Cloud Solution: Use cloud solutions as an alternative to locally-hosted systems, including servers
`cloud-1` · Core standard: No

**In plain English:** Where it makes sense, use online services instead of running your own servers in school. Many schools keep a few local systems and move the rest to the cloud.

**What GOV.UK asks for:**
- Before moving, understand the software, devices and data you use, what data you'll need to import and export, and what free cloud services you could use.
- Assess where servers can be replaced, including files, documents and shared folders. Some systems, such as door access control, building management or cashless catering, may still need local servers.
- Follow the cyber security, broadband, network switching, cabling and wireless standards.
- Make sure data is portable: encrypted transfer, export in open or common formats (for example .CSV), secure documented APIs (ways for systems to share data automatically), and a timely data handover if you end a contract.
- Train users so they are confident using the new tools.

**When to meet it:** As soon as possible to realise the benefits.

**Examples of how schools meet it:**
- *Small primary:* Moves the shared staff drive to the cloud storage that comes with its education email service, then retires an old file server.
- *Larger school or trust:* Writes a three-year plan listing every server and what it does, moving each system to the cloud as its server reaches end of life.
- *Quick win:* Ask IT support for a list of every server in school, what runs on it and when its warranty ends.

**Evidence to keep:**
- An inventory of systems and data, marked "cloud", "local" or "to move".
- Contract wording on data export and exit arrangements.
- Records of staff training.

**Who can help:** IT support, DPO (data protection officer), and the suppliers of each system.

**Watch out for:** Moving files to the cloud without tidying permissions first can expose sensitive folders to everyone. Check your broadband and Wi-Fi can cope before switching off local servers.

### Cloud Solution: Cloud solutions must follow data protection legislation
`cloud-2` · Core standard: No

**In plain English:** Any online service that holds personal data about pupils, staff or families must handle it legally, and you must be able to show you checked.

**What GOV.UK asks for:**
- Responsible bodies must get assurance from cloud and IT support providers that data is handled legally.
- Your DPO should carry out a DPIA (data protection impact assessment, a structured check of the risks to people's data) for any cloud service storing personal or special category data.
- Follow the NCSC cloud security principles: a proper contract for third-party processing, a user account joiners-and-leavers process, a data sharing agreement with the provider, and clearly documented data breach roles.
- The agreement should require the provider to tell you promptly about a breach.
- Store and process data in the UK or EU, unless you have confirmed any international transfer complies with UK GDPR (see ICO guidance on restricted transfers).

**When to meet it:** You should already be meeting this under data protection legislation.

**Examples of how schools meet it:**
- *Small primary:* Before signing up to a new reading app, the business manager sends the supplier's privacy information to the DPO, who completes a short DPIA and records where the data is stored.
- *Larger school or trust:* Keeps a central register of all cloud services, each with its contract, DPIA, data location and breach contact.
- *Quick win:* List the online services staff use with pupil data and tick off which have a DPIA.

**Evidence to keep:**
- DPIAs for each relevant service.
- Contracts or data processing and sharing agreements.
- Joiners-and-leavers process and breach response roles.

**Who can help:** DPO, IT support, and the cloud provider.

**Watch out for:** Free apps signed up for by individual teachers are often missed. They still need checking. "Hosted in the cloud" does not tell you the country; ask where.

### Cloud Solution: Cloud solutions should use ID and access management tools
`cloud-3` · Core standard: No

**In plain English:** Each person should have one school account that signs them in to all your online systems, managed centrally so access is given and removed in one place.

**What GOV.UK asks for:**
- Use a central ID and access management tool (one system that controls who can sign in to what), so each user has one managed account.
- Use it to secure all current and future cloud systems, including curriculum tools, and test it so it is the only way staff and pupils log on.
- Have agreed, documented processes for adding and removing users.
- Create roles so each type of user has the right access to the right systems.
- Give IT support separate, secure access to cloud services that does not depend on the ID system.
- DfE's Get help buying for schools service can help you buy ID management tools.

**When to meet it:** As soon as you can.

**Examples of how schools meet it:**
- *Small primary:* Connects its learning platforms to the school's education email accounts so staff and pupils use "sign in with school account" everywhere.
- *Larger school or trust:* Automatically creates and removes accounts from MIS data, with groups for teachers, support staff, office staff and each year group.
- *Quick win:* List every system staff log in to and mark which use the school account and which use a separate password.

**Evidence to keep:**
- List of systems connected to the ID tool.
- Written joiners-and-leavers process.
- Role and group descriptions.
- Note of IT support's separate emergency access.

**Who can help:** IT support, DPO, and Get help buying for schools.

**Watch out for:** Leaving old separate logins in place alongside single sign-on; the standard says it should be the only way to log on. Don't forget the emergency access route for IT support.

### Cloud Solution: Cloud solutions should work on a range of devices and be available when needed
`cloud-4` · Core standard: No

**In plain English:** Online systems should work on the devices your staff and pupils actually use, and be reliable enough that an outage won't stop the school running.

**What GOV.UK asks for:**
- Before signing up, understand how and when users will need access.
- Check the supplier's published availability targets meet your needs, and trial before you buy.
- Understand what availability figures mean: 99% is about 7 hours of downtime a month, 99.9% about 45 minutes, and 99.99% about 5 minutes.
- Make data easy to access in a way that meets users' needs, with easy but secure access from a range of devices.

**When to meet it:** For both existing and new cloud solutions.

**Examples of how schools meet it:**
- *Small primary:* Trials a new assessment tool for half a term on classroom laptops, tablets and staff phones before buying.
- *Larger school or trust:* Includes a minimum availability figure and device requirements in every tender, and checks suppliers' service reports each term.
- *Quick win:* Look up the availability target in the contract for your MIS and check what it means in hours per month.

**Evidence to keep:**
- Contracts or service level agreements (SLAs) showing availability targets.
- Notes from trials.
- A record of outages and how they affected the school.

**Who can help:** IT support and the cloud supplier.

**Watch out for:** 99% sounds high but allows about 7 hours down each month, possibly during the school day. Secure access from personal devices should still use MFA (a second check, such as a code on your phone, when you sign in) where your cyber security arrangements require it.

### Cloud Solution: Make sure that appropriate data backup provision is in place
`cloud-5` · Core standard: No

**In plain English:** Don't assume the cloud provider keeps your data forever. Know what they back up and for how long, and add your own backup where the data matters.

**What GOV.UK asks for:**
- With your DPO and IT support, find out what the provider backs up, where it is held, how long for, and how often.
- Decide the backup you need for each system, based on sensitivity, importance, the impact of losing it, and how long you could manage without it, balanced against cost.
- For critical data, use the 3-2-1 rule: at least 3 copies, on 2 devices, with 1 off site.
- Consider third-party backup tools where the provider's own backup isn't enough.
- Providers may only keep backups for a limited period, as little as 30 days with some.

**When to meet it:** You should already be meeting this; it is also needed for data protection compliance.

**Examples of how schools meet it:**
- *Small primary:* Adds a cloud backup service for staff email and shared files, because the provider only keeps deleted items for a short period.
- *Larger school or trust:* Keeps a table listing each system, how critical it is, the provider's backup period and any extra backup, reviewed yearly with the DPO.
- *Quick win:* Ask IT support how long a deleted file can be recovered from your cloud storage, and test restoring one.

**Evidence to keep:**
- Provider backup details for each service.
- A record of your backup decisions per system.
- Test restore records.

**Who can help:** DPO, IT support, and cloud providers.

**Watch out for:** Accidental or deliberate deletion by users is the most common cause of cloud data loss. Sync is not backup: a deleted file is deleted everywhere.

---

## Cyber Security

These standards cover how your school protects its devices, accounts and data from cyber attacks, and what to do if one happens.

### Cyber Security: Conduct a cyber risk assessment annually and review every term
`cyber-1` · Core standard: Yes

**In plain English:** Once a year, work out what could go wrong with your IT and data, how likely it is and how bad it would be. Then check it again every term and have a plan ready for a serious attack.

**What GOV.UK asks for:**
- The SLT digital lead (the senior leader responsible for technology) is accountable; IT support does the work, with the DPO, site staff, finance, the head and governors involved.
- Review IT assets, complete a record of processing activities (ROPA, a list of what personal data each system holds) with the DPO, and check access, passwords and email security.
- IT support keeps network documentation up to date (diagrams, changes, settings, IP addressing) and agrees what logging is needed.
- Put cyber risks in the risk register and a regularly tested business continuity plan, keep copies in more than one place (for example, cloud and paper), and report risks to governors.
- Have a cyber response plan. This is a condition of cover if you are in the RPA.

**When to meet it:** As soon as possible, then yearly, after significant changes or an incident, and revisited every term; outsourced IT must meet it no later than your next renewal.

**Examples of how schools meet it:**
- *Small primary:* The business manager and IT provider fill in a simple risk template each autumn and add the top risks to the risk register. Termly SLT meetings include a 10-minute check.
- *Larger school or trust:* One trust cyber risk register, with a section per school, is reviewed termly and reported to the audit and risk committee.
- *If you have a managed IT provider:* Ask in writing how they meet this standard, how an attack on them would be stopped from reaching you, and whether they hold Cyber Essentials or Cyber Essentials Plus.
- *Quick win:* Keep a printed copy of your cyber response plan in the school safe.

**Evidence to keep:**
- Dated risk assessment and termly review notes.
- Risk register entries and governor minutes.
- Network diagram, ROPA and cyber response plan.

**Who can help:** SLT digital lead, IT support, DPO, site manager, finance lead, governors.

**Watch out for:** Treating this as an IT-only task. Leaders, the DPO, site staff and governors all have a part.

---

### Cyber Security: Create and implement a cyber awareness plan for students and staff
`cyber-2` · Core standard: Yes

**In plain English:** Everyone who uses your IT should know the rules and how to spot and report a cyber threat. That means an acceptable use policy and regular training.

**What GOV.UK asks for:**
- An acceptable use policy (AUP, the rules for using school IT), written with IT support, the DSL and the DPO, and approved by governors. Everyone with access to the network or data must be made aware of it and sign up to it, including guests and supply teachers using the wifi.
- Cyber training at least once a year for students, staff, at least one governor or trustee, and anyone else with a login (such as supply or agency staff).
- Training should be age-appropriate and cover phishing (fake messages that trick you into giving away details), passwords, online safety, social engineering, device security, USB risks, MFA, and how to report incidents and data breaches.
- If you are in the RPA, you must evidence that relevant users have done the free NCSC training, every year.
- Consider raising cyber awareness with families where devices or work go home.

**When to meet it:** You should already have an AUP; if not, update it towards the end of the academic year and share it at the start of the new year. If no cyber training in the last 12 months, plan it as soon as possible.

**Examples of how schools meet it:**
- *Small primary:* Staff do the free NCSC training on an INSET day and certificates are saved. Pupils learn about passwords in computing lessons.
- *Larger school or trust:* AUPs are signed electronically each September, with extra data protection training for office staff.
- *Quick win:* Add a one-page AUP and sign-in sheet to your supply teacher and visitor welcome pack.

**Evidence to keep:**
- Current AUPs (staff, student, visitor) with governor approval date.
- Signed AUP records.
- Training attendance and certificates, including for at least one governor.

**Who can help:** SLT digital lead, IT support, DSL, DPO, governors.

**Watch out for:** Forgetting supply staff, agency workers and governors. If you are in the RPA, missing NCSC training records could affect your cover.

---

### Cyber Security: Secure digital technology and data with anti-malware and a firewall
`cyber-3` · Core standard: Yes

**In plain English:** Every device needs up-to-date security software, and your internet connection needs a properly set-up firewall (a gatekeeper that blocks unwanted traffic in and out of your network).

**What GOV.UK asks for:**
- A correctly configured boundary or software firewall, including denial of service protection. Firmware updated and checked termly, default admin password changed, admin access protected by MFA where available, and alerts switched on.
- Block inbound unauthenticated connections by default. Keep firewall rules to an absolute minimum, each documented and risk assessed. Review any allowed inbound traffic at least termly, signed off by the SLT digital lead.
- Centrally managed, monitored anti-malware (including anti-virus) on all devices, reviewed termly. It must scan web pages, files and email attachments, alert IT support and block malicious websites.
- USB storage blocked by default unless there is a specific need (for example, an exam board requirement), with scanning before use.
- Check and approve all applications, keep an approved list on your contracts register, lock browser settings, and set up email to reduce spoofing (fake emails pretending to be from you).

**When to meet it:** It should already be in place.

**Examples of how schools meet it:**
- *Small primary:* The firewall comes with the broadband. The business manager asks the provider to confirm in writing how it meets each technical requirement.
- *Larger school or trust:* IT support produce a termly firewall rules report that the SLT digital lead signs off, alongside an anti-malware console summary.
- *Quick win:* Ask IT support to confirm that USB storage is blocked by default and list any exceptions.

**Evidence to keep:**
- Termly signed firewall rule review.
- Anti-malware console report showing all devices protected and up to date.
- Approved applications list.
- Broadband provider's firewall statement.

**Who can help:** IT support, broadband provider, SLT digital lead, DSL.

**Watch out for:** Assuming the broadband firewall is "done". You still need the termly review and sign-off, and laptops used at home need a software firewall too.

---

### Cyber Security: Control and secure user accounts and access privileges
`cyber-4` · Core standard: Yes

**In plain English:** Each person should have their own login, with access only to what their job needs. Staff accounts should be protected by MFA (a second check, such as a code on your phone, when you sign in).

**What GOV.UK asks for:**
- Unique credentials for devices, the network and services. Password strength enforced by the system (the NCSC suggests machine-generated passwords or three random words). Guessing limited, for example no more than 10 guesses in 5 minutes, or locking after no more than 10 failed attempts.
- At least a 6-character password or PIN for physical access to network switches and boot-up settings, and an agreed emergency access process.
- MFA must be on for all staff accounts with access to cloud services or remote access to on-site systems, and for all IT admin accounts.
- Create accounts only when needed, limit access to the role, disable accounts as soon as someone leaves, and agree a joiners, movers and leavers process with HR and finance. Review accounts termly.
- Admin accounts separate from everyday ones, changes approved by SLT or a trustee, and SLT given an emergency admin account.

**When to meet it:** You should already meet it; if not, as soon as possible through a structured rollout plan.

**Examples of how schools meet it:**
- *Small primary:* MFA is on for all staff cloud accounts using a phone app. Younger pupils log in with simple PINs.
- *Larger school or trust:* User accounts are created and removed automatically from the MIS (management information system). The business manager and IT support review the leavers list each term.
- *Quick win:* Ask IT support for a list of all accounts with admin rights and check each one is still needed.

**Evidence to keep:**
- MFA coverage report for staff and admin accounts.
- Joiners, movers and leavers procedure and termly account review record.
- Password policy settings.
- Sealed record of the emergency admin process.

**Who can help:** IT support, HR, business manager, DPO.

**Watch out for:** IT staff using their admin account for daily email. Also, a leaver's account left active for weeks.

---

### Cyber Security: License digital technology and keep it up to date
`cyber-5` · Core standard: Yes

**In plain English:** All software must be properly licensed and still getting security updates. Important security fixes must be installed quickly.

**What GOV.UK asks for:**
- All software licensed and eligible for security updates; remove or license anything unlicensed, and follow licence terms for open-source software.
- Record licence expiry dates in the contracts register and end-of-support dates in the asset register. Each term, IT support and finance tell SLT what has become, or is due to become, unsupported.
- Vulnerability fixes (patches, updates, settings changes, supplier scripts) for operating systems, applications and firmware must be applied within 14 days when the supplier rates them critical or high, the CVSS v3.1 score is 7.0 or above, or no rating is given.
- Isolate devices where high-risk patches are not available.
- Apply DfE-issued security update instructions within 5 working days of notification.

**When to meet it:** You should already meet it, and check new technology (including cloud services) meets it when buying.

**Examples of how schools meet it:**
- *Small primary:* IT support set laptops and tablets to install updates automatically overnight, and send a termly list of devices nearing end of support.
- *Larger school or trust:* A patch management tool reports monthly on patch compliance across all schools against the 14-day target.
- *Quick win:* Ask IT support which devices run an operating system that is out of support, and add replacement costs to next year's budget.

**Evidence to keep:**
- Asset register with end-of-support dates.
- Contracts register with licence expiry dates.
- Patch compliance reports.
- Termly unsupported-technology report to SLT.

**Who can help:** IT support, business manager or finance team, DPO.

**Watch out for:** Forgetting firmware on items like switches, printers and interactive displays. They need patching too.

---

### Cyber Security: Develop and implement a plan to back up your data and review this every year
`cyber-6` · Core standard: Yes

**In plain English:** Keep safe extra copies of your important data, in more than one place, so you can get it back after an attack, fire or mistake. Test that it works.

**What GOV.UK asks for:**
- At least 3 backup copies of important data, on at least 2 separate devices, with at least one off-site (cloud can count). This level of backup is currently a condition of RPA cover.
- Backups must be immutable (cannot be changed once made), to protect against ransomware.
- Test and log backups termly, or after a significant change, including restoring data. Review the plan every year or after a major change.
- SLT decide which data and systems are restored first, with input from finance, the DSL and the DPO. Include cloud services, as these only keep data for a limited time.
- Physical backups only go off-site if encrypted and stored securely, and never to anyone's home.

**When to meet it:** You must back up your data now; develop a backup plan as soon as possible if you do not have one.

**Examples of how schools meet it:**
- *Small primary:* An on-site backup device plus a cloud backup service that keeps copies that cannot be deleted. Restoring one test folder is done each term and recorded.
- *Larger school or trust:* A trust-wide backup service covers the MIS, safeguarding system and staff cloud storage, with a termly restore test reported to the trust IT lead.
- *Quick win:* Ask IT support: "When did we last restore something from backup, and how long did it take?"

**Evidence to keep:**
- Written backup plan with recovery priorities.
- Termly backup test and restore log.
- Information asset register showing what is backed up.
- Backup service contract.

**Who can help:** IT support, SLT digital lead, DPO, DSL, finance lead.

**Watch out for:** Assuming cloud email and file storage are backed up by the supplier. Also, a USB drive taken home "for safety".

---

### Cyber Security: Report cyber attacks
`cyber-7` · Core standard: Yes

**In plain English:** Everyone must know to report anything suspicious straight away, and the school must know who to tell outside the school if an attack happens.

**What GOV.UK asks for:**
- Anyone can report to IT support and the SLT digital lead. Students and staff should know how and feel safe doing so.
- On a report: use the cyber incident response plan, contain the risk, notify those involved, investigate, and tell governors. Record all incidents and near misses.
- A person appointed by the SLT digital lead reports incidents to your RPA or cyber insurer, Report Fraud (0300 123 2040 or website) and the DfE sector cyber team (Sector.Incidentreporting@education.gov.uk).
- You may also need to report to the NCSC (long-term closure, more than one school closed, or serious financial damage) and the ICO within 72 hours where a high-risk data breach has or may have occurred.
- Trusts must also follow part 6 of the academy trust handbook.

**When to meet it:** You should already meet it; if not, as soon as possible.

**Examples of how schools meet it:**
- *Small primary:* A laminated "Something wrong with IT?" card in the staffroom lists who to call, including out-of-hours numbers and the external contacts above.
- *Larger school or trust:* An incident log on the IT helpdesk records every incident and near miss, and is summarised termly for governors.
- *Quick win:* Agree and write down who will make external reports, with a deputy.

**Evidence to keep:**
- Incident and near-miss log.
- Cyber incident response plan with contact list.
- Copies of external reports made.

**Who can help:** SLT digital lead, IT support, DPO, DSL, RPA or insurer.

**Watch out for:** Delaying while you investigate. The ICO deadline is 72 hours, and contacting your insurer early may affect your cover.

---

---

## Digital Accessibility

These standards are about making sure everyone in your school community, including people with disabilities, special educational needs or English as an additional language, can use your technology and understand your communications.

### Digital Accessibility: Include digital accessibility in relevant strategies and policies
`accessibility-1` · Core standard: No

**In plain English:** When you next review key policies, write in how you will meet people's accessibility needs when they use technology, and make sure staff know how to use the accessibility features you already have.

**What GOV.UK asks for:**
- Include accessible digital technology in wider policies and strategies, for example your digital technology strategy, curriculum policy and SEND policy.
- Work with students, staff and parents to find out their digital accessibility needs.
- SLT decides which policies to review and how accessibility will be added.
- At the next review, cover: the community's accessibility needs, how you will meet them (existing features or new tools), and how all communications and content, including your website, will be accessible.
- Make sure everyone knows how to use accessibility features.

**When to meet it:** Address it actively and include it in your next policy and strategy review.

**Examples of how schools meet it:**
- *Small primary:* The headteacher and SENCo add a short "Digital accessibility" section to the SEND policy, listing the built-in features pupils use (such as read-aloud and on-screen magnifier) and who to ask for help.
- *Larger school or trust:* The trust adds an accessibility paragraph to its digital strategy template, so every school covers it at the same review point.
- *Quick win:* Add a question on accessibility needs to your next parent survey or new-starter form.
- *If you have a managed IT provider:* Ask them for a list of accessibility features already available on your devices.

**Evidence to keep:**
- Updated policies showing the accessibility section and review date.
- Survey results or notes from conversations with students, staff and parents.
- SLT or governor minutes agreeing which policies will be reviewed.

**Who can help:** SLT digital lead, SENCo, curriculum leads, IT support, governors.

**Watch out for:** Writing a policy that only talks about pupils with an EHCP (education, health and care plan). Accessibility needs also apply to staff, parents and carers, and to many people without a formal diagnosis.

### Digital Accessibility: Hardware and software should support the use of accessibility features
`accessibility-2` · Core standard: No

**In plain English:** The devices and software you buy should have accessibility features such as read-aloud, captions and zoom, and these should be switched on and supported, not blocked.

**What GOV.UK asks for:**
- Hardware and software should have features such as text-to-speech and dictation, caption settings, zoom and adjustment settings, and translation and language tools, with support for people who use them.
- New and existing technology should be accessible, give equity of access, and work with assistive technology (specialist tools such as screen readers) and audio-visual equipment.
- Accessibility features should stay safe and secure, and should not be blocked by generic security policies.
- Consider accessibility needs when using IT in exams, and train staff when required.
- Ask suppliers about their products' accessibility statements.

**When to meet it:** If your current hardware and software lack these features, make sure they are included when you buy new equipment or services.

**Examples of how schools meet it:**
- *Small primary:* IT support checks that dictation and read-aloud work on pupil laptops and are not disabled by the device settings.
- *Larger school or trust:* The trust adds "accessibility features and accessibility statement" as a scoring line in every technology purchase.
- *Quick win:* Ask the exams officer and SENCo to test that a pupil's usual assistive software works on the exam laptops before the next mock exams.

**Evidence to keep:**
- Supplier accessibility statements for your main systems.
- Purchasing checklists or quotes showing accessibility was considered.
- Records of staff training on accessibility features.

**Who can help:** IT support, SENCo, exams officer, business manager (for purchasing), suppliers.

**Watch out for:** Security or filtering settings that quietly block tools like dictation or translation. Check with the DSL and IT support before switching features off.

### Digital Accessibility: Communications should be accessible to all
`accessibility-3` · Core standard: No

**In plain English:** Your website, letters, emails, texts and social media posts should be easy for everyone to read and use, and staff should be trained to write them that way.

**What GOV.UK asks for:**
- Websites should be accessible for everyone; consider accessibility when commissioning or building one.
- Consider alternative formats for all communications, including email attachments, text messages and social media.
- Build understanding of accessibility across the school.
- Train staff to write and access content in an accessible format.
- Staff should know who to contact for help, such as the SENCo, IT support or SLT digital lead.

**When to meet it:** Once training is complete, communications and content should be accessible; include accessible communications when you review strategies and policies.

**Examples of how schools meet it:**
- *Small primary:* The office sends newsletters as plain email text, not just a scanned PDF, so parents can use read-aloud or translation tools.
- *Larger school or trust:* The trust gives website editors a short checklist: use headings, add descriptions to images (alt text), avoid text inside pictures, and caption videos.
- *Quick win:* Run the built-in accessibility checker in your word processor on your next parent letter and fix what it finds.

**Evidence to keep:**
- Staff training records on accessible writing.
- An accessible communications checklist or style guide.
- Website specification or contract showing accessibility was required.

**Who can help:** SLT digital lead, SENCo, office staff, IT support, website provider.

**Watch out for:** Sending important information only as images or scanned documents. Screen readers and translation tools cannot read them.

---

## Digital Leadership

This is a core standard area: it sets out who leads on technology, what records you keep, how you plan for disasters and how you write a technology plan.

### Digital Leadership: Assign a senior leadership team (SLT) member to be responsible for digital technology
`leadership-1` · Core standard: Yes

**In plain English:** The headteacher should name one senior leader as the "SLT digital lead", who takes overall responsibility for how the school uses and plans technology.

**What GOV.UK asks for:**
- The headteacher or principal appoints an SLT digital lead. They do not need to be an expert.
- The lead is accountable for delivering the digital technology strategy, encouraging use of technology, reviewing how well IT support works, and identifying training needs.
- The lead links technical staff, SLT, curriculum leads, the DPO, the DSL, business and finance staff, and the trust IT director if there is one.
- Governors or trustees should consider assigning a digital link governor.

**When to meet it:** Assign the SLT digital lead before you create your digital technology strategy.

**Examples of how schools meet it:**
- *Small primary:* The deputy head takes the role, with the business manager handling contracts and budgets alongside them.
- *Larger school or trust:* Each school names an SLT digital lead who meets the trust IT director each term.
- *Quick win:* Add "SLT digital lead" to the staff responsibilities list and job description, and tell IT support who it is.
- *For governors:* Ask at the next full governing board meeting for a volunteer to be the digital link governor.

**Evidence to keep:**
- Updated job description or SLT responsibilities list.
- Governor minutes recording the appointment and any digital link governor.
- Meeting notes between the digital lead and IT support.

**Who can help:** Headteacher, governors, business manager, IT support.

**Watch out for:** Giving the role to the IT technician or business manager because they "know the tech". GOV.UK expects an SLT member, usually someone with teaching experience, focused on teaching and learning needs.

### Digital Leadership: Keep registers relating to hardware and systems up to date
`leadership-2` · Core standard: Yes

**In plain English:** Keep three up-to-date lists: your technology contracts, your physical equipment, and the personal data your systems hold.

**What GOV.UK asks for:**
- Include digital technology in your contracts register, asset register and information asset register (IAR).
- Contracts register: licences, subscriptions, broadband, IT support and technology contracts, and your list of approved apps. It must be kept up to date.
- Asset register: what equipment you have, asset and serial numbers, who has it, where it is, purchase date, age, review date and secure disposal date. The SLT digital lead owns it.
- IAR: a log of data held on staff and students, owned by the DPO, with a process for IT support and the DPO to share updates.
- DfE templates are available for all three registers.

**When to meet it:** Update registers every time something changes; the SLT digital lead should review them before your next financial planning cycle and before writing your strategy.

**Examples of how schools meet it:**
- *Small primary:* The business manager uses the DfE contracts register template and adds renewal dates to the office calendar.
- *Larger school or trust:* IT support labels every device with an asset number and updates a shared asset spreadsheet whenever a device is issued, moved or disposed of.
- *Quick win:* Download the DfE asset register template and record every laptop in one trolley.

**Evidence to keep:**
- The three registers, with "last updated" dates.
- Secure disposal certificates for old equipment.
- Notes of the annual review by the SLT digital lead.

**Who can help:** Business manager or finance team, IT support, DPO, SLT digital lead.

**Watch out for:** Forgetting free apps and websites that staff signed up to themselves. They still hold pupil data and belong on the approved apps list and the IAR.

### Digital Leadership: Include digital technology within disaster recovery and business continuity plans
`leadership-3` · Core standard: Yes

**In plain English:** Your emergency plans must cover what happens if technology fails, for example a cyber attack or broadband outage, and must be tested.

**What GOV.UK asks for:**
- Include technology in existing business continuity and disaster recovery plans, or have a separate digital plan. Review both annually or after a significant change.
- Create a summary document with key contacts, shared securely with all staff.
- Keep printed copies, and an online copy in a secure cloud folder with remote access for the disaster recovery team.
- The disaster recovery plan defines what a "disaster" means (by how long you can function), lists the team and contacts, and is tested at least annually, for example by simulating data loss.
- The business continuity plan assesses technology risks, ways to reduce them and recovery actions.

**When to meet it:** You should already be meeting this standard or working towards it, as insurers may ask for these documents.

**Examples of how schools meet it:**
- *Small primary:* The business manager adds a "loss of IT" page to the existing plan: who to call, paper registers, and contacting parents without the MIS (management information system, the main pupil database).
- *Larger school or trust:* The trust runs a yearly tabletop exercise (a talk-through of a pretend incident) on a ransomware attack, then updates the plan.
- *Quick win:* Print the key contacts list and keep it in the office safe and at the head's home.
- *If you are in the RPA:* Check what the Risk Protection Arrangement asks you to have in place for cyber cover.

**Evidence to keep:**
- Current plans with review dates and governor sign-off.
- Printed copy locations and the staff summary document.
- Notes from the annual test and the actions that followed.

**Who can help:** SLT digital lead, IT support, DPO, DSL, governors, MIS and broadband suppliers.

**Watch out for:** Keeping the only copy of the plan on the school server. In a cyber attack, you may not be able to open it.

### Digital Leadership: Have a digital technology strategy that is reviewed every year
`leadership-4` · Core standard: Yes

**In plain English:** Write a plan, covering at least two years, for how technology will support your school development plan, and review it every year.

**What GOV.UK asks for:**
- Complete the first three leadership standards first.
- Gather information on contracts and assets, current and committed spend, risks (including disaster recovery and business continuity), technology students have outside school, and training needs.
- Develop a longer-term vision that supports the development plan, is sustainable and minimises environmental impact.
- Create a strategy of at least 2 years, review it at least annually, and share a top-level summary with key stakeholders.
- Governors or trustees support and challenge the strategy.

**When to meet it:** After meeting the previous 3 standards, complete it before your next budget cycle.

**Examples of how schools meet it:**
- *Small primary:* A four-page document: our vision, what we have now, what we will replace and when, training planned, and costs per year.
- *Larger school or trust:* A trust-wide strategy with a device replacement timeline, with each school adding its own priorities.
- *Quick win:* Ask subject leaders one question: "What technology stops you teaching the way you want to?" Use the answers as a starting point.

**Evidence to keep:**
- The strategy document with dates and the next review date.
- The top-level summary shared with stakeholders.
- Governor minutes showing review and challenge.

**Who can help:** SLT digital lead, business manager, IT support, subject leaders, DSL, DPO, SENCo, governors.

**Watch out for:** Writing a shopping list of equipment instead of a plan led by teaching and learning needs. Each item should link back to the school development plan.

---

## Filtering and Monitoring

These standards cover how your school stops users reaching harmful content online and spots worrying activity, as part of your safeguarding duties under Keeping children safe in education (KCSIE).

### Filtering and Monitoring: Identify and assign roles and responsibilities to manage your filtering and monitoring systems
`filtering-1` · Core standard: Yes

**In plain English:** Make it clear who is responsible for your web filtering (blocking harmful websites) and monitoring (watching for worrying activity), from governors to IT support.

**What GOV.UK asks for:**
- Governing bodies and proprietors have overall strategic responsibility. They should name a member of SLT and a governor responsible for making sure the standards are met, and set out roles for staff and third parties such as IT support.
- SLT are responsible for scoping needs (including generative AI use), buying systems, documenting what is blocked or allowed and why, governance, reviewing effectiveness and overseeing reports. They make sure staff understand their role, are trained, follow policy and act on concerns.
- The DSL (designated safeguarding lead) leads on safeguarding and online safety as in KCSIE: checking reports, responding to concerns, and assuring governors the systems work and are reviewed.
- IT support maintain the systems, provide reports and complete actions, and help SLT and the DSL with buying, risks, reviews and checks.
- It must be clear who is responsible and possible to make prompt changes.

**When to meet it:** You should already be meeting this standard.

**Examples of how schools meet it:**
- *Small primary:* The headteacher is the SLT lead, the safeguarding governor is the named governor, and the DSL meets the IT support provider each half-term to look at filtering reports.
- *Larger school or trust:* A one-page roles table, approved by the trust board, names the SLT lead and governor in each school, the DSL and the trust IT team.
- *Quick win:* Write down who in your school can request an urgent block or unblock today, and how.

**Evidence to keep:**
- Governor minutes naming the SLT lead and governor.
- Roles and responsibilities document.
- Record of decisions on what is blocked or allowed and why.

**Who can help:** DSL, headteacher, safeguarding governor, IT support or filtering provider.

**Watch out for:** Leaving it all to IT support. Safeguarding decisions and reports belong with the DSL, with SLT and governors overseeing.

---

### Filtering and Monitoring: Review your filtering and monitoring provision at least annually
`filtering-2` · Core standard: Yes

**In plain English:** At least once a year, check that your filtering and monitoring still fit your pupils, your technology and your risks. Regularly test that they work, and keep records.

**What GOV.UK asks for:**
- Review at least once every academic year, led by SLT, the DSL and IT support, involving the responsible governor. Record the results and actions, available to anyone entitled to inspect them.
- Also review when a safeguarding risk is identified, working practice changes (such as remote access or BYOD, bring your own device), new technology or generative AI tools arrive, major updates happen, or the network set-up changes.
- The review considers pupils' risk profile (age, SEND, EAL), what is blocked or allowed, technology and AI use, limitations, outside influences such as county lines, incidents, and curriculum needs (such as RSHE and PSHE).
- Carry out and log checks (when, who, what, actions) across school-owned devices, all sites, and student, staff and guest accounts. Check new devices before handing them out.
- Testing tools, such as SWGfL's, can check that, as a minimum, illegal child abuse material, unlawful terrorist content and adult content are blocked.

**When to meet it:** You should already be meeting this standard.

**Examples of how schools meet it:**
- *Small primary:* Each summer term the head, DSL, IT provider and safeguarding governor complete a review template. The DSL runs the SWGfL test each half-term and records it.
- *Larger school or trust:* The trust uses a common review template. Each school's checks are logged in a shared spreadsheet that the trust safeguarding lead looks at termly.
- *Quick win:* Run a filtering test on a pupil laptop and a staff laptop today and record the result.

**Evidence to keep:**
- Annual review record and action plan.
- Check log (date, who, what was tested, actions).
- Approvals for temporary filtering exceptions.

**Who can help:** DSL, SLT lead, responsible governor, IT support, filtering provider.

**Watch out for:** Only checking the main site's wired network. Checks should cover laptops taken home, other sites and guest wifi.

---

### Filtering and Monitoring: Filtering systems should block harmful and inappropriate content without unreasonably impacting teaching and learning
`filtering-3` · Core standard: Yes

**In plain English:** Your filter must block illegal and harmful content for everyone, while still letting staff teach and pupils learn how to manage risk themselves.

**What GOV.UK asks for:**
- The IWF and CTIRU blocklists (lists of illegal websites) must be implemented and must not be able to be disabled, overridden or altered by anyone, including administrators. Your provider should be an IWF member, signed up to CTIRU, and update the lists regularly.
- No blanket profile for all users. As a minimum, have separate student and staff profiles.
- Filtering should be active and up to date on all school-managed devices (including off-site), BYOD devices and guests. Unmanaged devices should be on a separate virtual network. Temporary exceptions must be approved and documented by the responsible SLT member, with the DSL assessing safeguarding risks.
- Check that your provider covers all internet connections, blocks ways around the filter (such as VPNs and proxies), handles other languages and misspellings, and alerts on blocked content of concern. Logs should show device name or ID, IP address, the individual where possible, time and date, and the search term or content.
- Lock safe search into the browser and stop users installing other browsers or plugins. Carry out a DPIA (data protection impact assessment).

**When to meet it:** You should already be meeting this standard.

**Examples of how schools meet it:**
- *Small primary:* Filtering comes with the broadband. The business manager asks the provider to confirm IWF membership, CTIRU sign-up and staff and pupil profiles in writing.
- *Larger school or trust:* Different filtering profiles for each key stage, staff and guests, with a simple form for teachers to request unblocks that the DSL approves.
- *Quick win:* Remind staff to tell IT support before teaching topics that may trigger unusual filter alerts.

**Evidence to keep:**
- Provider statement on IWF, CTIRU and the technical requirements.
- Filtering profiles list.
- Exception approvals and DPIA.

**Who can help:** Filtering or broadband provider, IT support, DSL, DPO.

**Watch out for:** Mobile apps can bypass web filtering. Ask your provider, and use technical monitoring on those devices.

---

### Filtering and Monitoring: Have effective monitoring strategies that meet the safeguarding needs of your school or college
`filtering-4` · Core standard: Yes

**In plain English:** Have a plan for noticing worrying online activity, through staff supervision and, where needed, technical tools, so concerns reach the DSL quickly.

**What GOV.UK asks for:**
- All staff should do some in-person monitoring when pupils are on devices. Schools may add technical monitoring to reduce risks found in the review. The DSL is responsible for any safeguarding matters identified.
- As a minimum, your monitoring plan should include weekly reports highlighting incidents, and immediate reports for high-risk incidents.
- Everyone using the network should know filtering and monitoring is in place. Technical systems should tell users the device is monitored (for example, a message at login).
- Have a documented process for recording incidents, actions and outcomes. Data should be in a format staff understand, and users identifiable, including guests where possible.
- IT support doing device monitoring should check it works on- and off-site, report on activity, have safeguarding training and report concerns to the DSL. Reflect monitoring in your AUP and privacy notices, and carry out a DPIA if you use technical monitoring.

**When to meet it:** You should already be meeting this standard.

**Examples of how schools meet it:**
- *Small primary:* Pupils use devices only in supervised lessons with screens visible. The DSL receives the filtering provider's weekly report and an email alert for anything high-risk.
- *Larger school or trust:* A technical monitoring service sends alerts to the DSL team. Incidents and actions are logged in the school's safeguarding recording system.
- *Quick win:* Check that the weekly report actually reaches the DSL, not just IT.

**Evidence to keep:**
- Written monitoring plan.
- Weekly reports and record of high-risk alerts.
- Incident log with actions and outcomes.
- AUP wording and DPIA.

**Who can help:** DSL, IT support, monitoring provider, DPO.

**Watch out for:** Thinking monitoring blocks anything. It does not, so staff supervision still matters. Your monitoring should alert you to behaviours linked to the four areas of online risk in KCSIE (content, contact, conduct and commerce).

---

## Laptops, Desktops, Tablets

These standards cover choosing, securing, specifying and disposing of the computers and tablets that staff and pupils use every day.

### Laptops, Desktops, Tablets: Devices should meet educational needs and support the digital technology strategy
`devices-1` · Core standard: No

**In plain English:** Before buying or reshuffling devices, work out what pupils and staff actually need them for, so that every purchase supports your school's digital technology strategy (your written plan for how technology will support teaching and running the school).

**What GOV.UK asks for:**
- The senior leadership team (SLT) follows a 3-step process: (1) have a digital technology strategy, (2) identify the device needs of students and staff, (3) assess the security and technical requirements of the devices.
- The SLT digital lead looks at who uses devices, where they are kept and what they are used for, to identify the number and type of devices, any physical requirements, the level of technical support and training needed.
- The SLT digital lead works with IT support to decide whether to buy new devices or repurpose (reuse for a different purpose) existing ones.

**When to meet it:** When the SLT review the use of laptops, desktops and tablets, or buy new devices.

**Examples of how schools meet it:**
- *Small primary:* The headteacher and IT support spend an hour listing every device, which class uses it and for what. They find Key Stage 1 mainly uses tablets for phonics apps, so they move older laptops to Year 6 and buy no new tablets this year.
- *Larger school or trust:* The trust digital lead runs a short survey of departments, then agrees a standard set of device types (for example, staff laptop, pupil laptop, art and design workstation) linked to the trust's digital strategy.
- *Quick win:* Ask IT support for a list of all devices with their age and location, and highlight any that sit unused in cupboards.

**Evidence to keep:**
- Your digital technology strategy, with the section on devices.
- A device needs assessment (who, where, what for, how many).
- Minutes of the SLT meeting where device decisions were agreed.

**Who can help:** SLT digital lead, IT support, school business manager, heads of department.

**Watch out for:** Buying devices because a deal is available, rather than because of an identified need. Forgetting training and support costs, which are part of the need.

### Laptops, Desktops, Tablets: Devices should be safe and secure
`devices-2` · Core standard: No

**In plain English:** Every school device must be set up and managed so that it protects the children using it, the school's data and the network. IT support should control all devices centrally rather than leaving them to individuals.

**What GOV.UK asks for:**
- IT support and the designated safeguarding lead (DSL) check all devices meet Keeping children safe in education (KCSIE) requirements for information security, access management, and filtering and monitoring. New devices must be compatible with existing filtering, monitoring and security systems.
- Devices are configured securely: a firewall (a barrier that blocks unwanted network traffic) on the network or device; VLANs (virtual local area networks, which separate different types of devices and users on the network); managed anti-virus and anti-malware; enterprise or education-grade operating systems with up-to-date security patches (fixes); asset labels and an asset register; and accessibility features not blocked by security settings.
- Devices are centrally managed, and mobile and portable devices have mobile device management (MDM: software that lets IT support lock, wipe or control a device remotely).
- The data protection officer (DPO) supports a data protection impact assessment (DPIA: a written check of the risks to personal data) for existing and new devices, devices taken offsite and any bring your own device approach.

**When to meet it:** Now, for all laptops, desktops and tablets currently used.

**Examples of how schools meet it:**
- *Small primary:* Staff laptops and class tablets are enrolled in a device management service run by IT support, so a lost tablet can be locked and wiped the same day.
- *Larger school or trust:* IT support tests each new device type with the filtering and monitoring systems before rollout, and the DPO updates one trust-wide DPIA.
- *Quick win:* Ask IT support: "Is every device in the asset register enrolled in central management and receiving updates?" Follow up any gaps.

**Evidence to keep:**
- The asset register showing each device and its tag number.
- A report from the device management tool showing devices enrolled and up to date.
- The DPIA for devices, and notes of filtering and monitoring reviews with the DSL.

**Who can help:** IT support, DSL, DPO, SLT digital lead; the National Cyber Security Centre (NCSC) has guidance on using devices securely.

**Watch out for:** Devices that cannot be filtered or monitored, or security settings that block accessibility features pupils rely on.

### Laptops, Desktops, Tablets: Devices should meet or exceed the minimum requirements
`devices-3` · Core standard: No

**In plain English:** GOV.UK sets out a minimum specification for school devices. Check your current devices against it once a year, and make sure anything you buy meets it.

**What GOV.UK asks for:**
- Operating system: enterprise or education-grade (designed for professional rather than home use).
- Support and security updates when repurposing, upgrading or buying: 3 years for tablets; 5 years for laptops and desktops.
- Warranty: 3 years for laptops and desktops; 2 years for tablets.
- Wi-Fi for portable devices: must support 802.11ac Wave 2; Wi-Fi 6 (802.11ax) is recommended. Tablet screen size: 9.7 inches.
- Devices reviewed once a year against any changes to these minimums.

**When to meet it:** Replace or upgrade now any device that does not meet the operating system requirement; for everything else, check whether devices can be upgraded or repurposed first, and meet the standard when buying new devices.

**Examples of how schools meet it:**
- *Small primary:* IT support checks the 30 classroom laptops and finds 6 running a home-edition operating system. The school upgrades those 6 to an education edition rather than replacing them.
- *Larger school or trust:* The trust writes the minimum requirements into every device quote request, so suppliers must confirm support length, warranty and Wi-Fi standard in writing.
- *Quick win:* Ask IT support for a list of devices showing operating system edition and the date manufacturer security updates end.

**Evidence to keep:**
- An annual device review against the minimum requirements.
- Quotes or order confirmations showing warranty length and support period.
- Records of any devices upgraded or replaced because of the operating system requirement.

**Who can help:** IT support, SLT digital lead, school business manager (purchasing).

**Watch out for:** Cheap consumer devices that come with a home-edition operating system or a short warranty. Assuming a device bought recently still gets updates: check the manufacturer's end-of-support date.

### Laptops, Desktops, Tablets: Make sure devices are energy efficient, and they are bought and disposed of sustainably
`devices-4` · Core standard: No

**In plain English:** Save energy and money by switching devices off when not needed, reusing devices where possible, and getting rid of old devices legally and securely.

**What GOV.UK asks for:**
- Existing devices are switched off when not in use, power off automatically out of hours, and only use the tools needed.
- When buying, check whether existing devices can be repurposed and whether new ones have a low energy certification, such as Energy Star.
- When disposing of devices, meet the Waste Electrical and Electronic Equipment (WEEE) regulations and data protection requirements, get certificates for WEEE, disposal and data destruction, update the IT asset register, and remove or destroy all data.

**When to meet it:** WEEE regulations are a legal requirement; consider energy efficiency the next time you buy devices and review how existing devices are used.

**Examples of how schools meet it:**
- *Small primary:* IT support sets all classroom computers to shut down automatically at 6pm. Old laptops are collected by a registered recycling company that provides a data destruction certificate.
- *Larger school or trust:* The trust has one disposal contract for all schools. Each collection comes with a list of serial numbers, which IT support matches against the asset register before marking items as disposed.
- *Quick win:* Walk round after school one evening and count devices and screens left on. Share the result with staff.

**Evidence to keep:**
- WEEE, disposal and data destruction certificates for each collection.
- The asset register showing disposed items.
- A screenshot or note of power settings applied to devices.

**Who can help:** IT support, school business manager, SLT digital lead. See the NCSC guide to secure sanitisation of storage media.

**Watch out for:** Giving old devices to staff, parents or charities without first securely wiping them and recording it. Putting devices in general waste, which breaks WEEE rules.

---

## Network Cabling

These standards cover the physical cables in walls, ceilings and between buildings that carry data around your school network.

### Network Cabling: Copper cabling should be Category 6A (Cat 6A)
`cabling-1` · Core standard: No

**In plain English:** When you put in new copper network cables (the ones that plug into wall sockets and Wi-Fi points), they should be Category 6A, which carries more data than older types and gives room to grow.

**What GOV.UK asks for:**
- Cabling complies with British Standards 6701, 50173 and 50174 (covering specification, installation, operation and maintenance).
- U/FTP Cat 6A (cable where each twisted pair of wires has its own foil shield) is recommended as a minimum, installed to the manufacturer's guidelines.
- The installed cable length (the "permanent link" from the wall socket to the cabinet) is no more than 90m, with no splices (joins) or intermediate patch panels (connection boards) part-way along, and the minimum bend radius (how tightly a cable may be bent) is not exceeded.
- New installations meet the fire rating in the latest BS 6701, currently stated as Euroclass Cca s1b.d2.a2.
- Containment (trays and trunking holding the cables) fully supports cables and keeps them apart from other cables and interference. Patch leads are the same type and standard, from the same manufacturer, as the installed cable.

**When to meet it:** When replacing underperforming cabling, in new building projects, or when you upgrade your wireless network.

**Examples of how schools meet it:**
- *Small primary:* When adding Wi-Fi points to a new classroom block, the school asks for Cat 6A U/FTP to each point and gets the installer to confirm compliance with the British Standards in the quote.
- *Larger school or trust:* The trust includes the cabling requirements, fire rating and 90m limit in its building project specifications, so contractors price for them from the start.
- *Quick win:* Ask IT support what category of cabling you have now and where it is worst.

**Evidence to keep:**
- Installer quote and specification stating Cat 6A U/FTP, the British Standards and the cable and patch lead manufacturer.

**Who can help:** IT support, a network cabling installer, your building project manager.

**Watch out for:** Mixing cheaper patch leads from another brand with the installed cable. You do not have to rip out working older cabling now; this applies when replacing or upgrading.

### Network Cabling: Optical fibre cabling should be a minimum 16 core multi-mode OM4
`cabling-4` · Core standard: No

**In plain English:** The cables that link your main server room to other network cabinets and other buildings should be optical fibre (cables that carry data as light, over longer distances) of at least the OM4 grade, with 16 cores (strands of fibre).

**What GOV.UK asks for:**
- All connections between buildings use OM4 multi-mode optical fibre, minimum 16 core.
- Cabling complies as a minimum with British Standards 6701, 50173 and 50174.
- No splices or intermediate patch panels in the cable runs, and the minimum bend radius is not exceeded.
- Where possible, fibre links between buildings run in underground ducts (protective pipes).
- For critical systems, consider redundant links (a second fibre link on a different route, so one cut cable does not take a building offline).

**When to meet it:** When replacing underperforming cabling and in new building projects.

**Examples of how schools meet it:**
- *Small primary:* The school's single building has one cabinet, so this mainly applies when a new classroom block or modular building is added: specify OM4 fibre back to the main cabinet in an underground duct.
- *Larger school or trust:* A secondary with several blocks asks for a second fibre route to the science block, which hosts key systems, so a single cable cut does not cut off the block.
- *Quick win:* Ask IT support for a simple site map showing which buildings are linked by fibre, copper or wireless.

**Evidence to keep:**
- A site map of fibre links and routes.
- Installer specification stating OM4, 16 core and the British Standards.
- Test results from the installer.

**Who can help:** IT support, a network cabling installer, estates or premises manager.

**Watch out for:** Fibre run overground or clipped to walls between buildings, where it is easily damaged. Linking a new building with a wireless bridge or copper cable instead of fibre.

### Network Cabling: New cabling should be installed and tested in line with the manufacturer's guidance, warranty terms and conditions
`cabling-2` · Core standard: No

**In plain English:** New cabling should be fitted by an installer approved by the cable manufacturer, fully tested, and covered by a long manufacturer warranty, so faults are caught and fixed at no cost.

**What GOV.UK asks for:**
- New cabling complies with British Standards 6701, 50173 and 50174.
- Cables are installed by manufacturer-approved installation partners with the relevant network infrastructure accreditations.
- The installer provides a detailed test report showing successful results for every installed cable, using the test limits in British Standards 50173.
- A minimum 20-year manufacturer's performance warranty covers the complete cabling system.

**When to meet it:** When replacing underperforming cabling, and in new building projects.

**Examples of how schools meet it:**
- *Small primary:* When rewiring the ICT suite, the business manager asks three installers for proof they are approved by the cable manufacturer and that they will provide a test report and 20-year warranty.
- *Larger school or trust:* The trust's building contractor must hand over cable test reports and the warranty certificate before the final payment is released.
- *Quick win:* Find out whether you hold test reports and a warranty certificate for your most recent cabling work. If not, ask the installer for copies.

**Evidence to keep:**
- The test report for every cable installed.
- The 20-year manufacturer performance warranty certificate.
- Proof of the installer's manufacturer approval and accreditations.

**Who can help:** IT support, network cabling installer, school business manager, building project manager.

**Watch out for:** Using a general electrician who is not manufacturer-approved, which can mean no warranty. Accepting a sample test report instead of results for every cable.

---

## Network Switching

Network switches are the boxes in your network cabinets that connect computers, Wi-Fi points and other equipment together; these standards cover their speed, management, security and resilience.

### Network Switching: The network switches should provide fast, reliable and secure connections to all users both wired and wireless
`switching-1` · Core standard: Yes

**In plain English:** When you replace switches, they should be fast enough for many people to use the network at once, with faster links where equipment such as Wi-Fi points and servers needs it.

**What GOV.UK asks for:**
- At least 1Gbps (1 gigabit per second) to each desktop device, plus higher-speed "multi-gigabit" ports for servers, media devices and wireless access points.
- Switches that power other devices (Power over Ethernet, or PoE: sending power down the network cable) meet the device manufacturer's power requirements, follow "IEEE 802.3af.at or IEEE 802.3af.bt" (GOV.UK's wording) as the connecting device requires, and have LLDP-MED (a feature that lets phones and other devices tell the switch what they need) enabled.
- Stacked switches (several switches linked to act as one) support 40Gbps links using dedicated stacking ports. Links from hub rooms back to the core server room are at least 2x10Gbps, on different routes where possible.
- Switches have at least 512MB memory, support at least 16,000 MAC addresses (unique device IDs), support spanning tree protocols such as MST or RST (which stop network loops), use non-blocking switch fabric (can run every port at full speed together), and are Energy-Efficient Ethernet compliant to at least 802.3az.

**When to meet it:** When you need to replace a switching solution that is underperforming or unsupported.

**Examples of how schools meet it:**
- *Small primary:* When the old switch in the office cabinet goes out of support, the school asks IT support to quote for a replacement that meets the list above, including enough PoE power for its Wi-Fi points.
- *Larger school or trust:* The trust adds this list to its switching tender and asks bidders to tick off each item.
- *Quick win:* Ask IT support which switches are out of manufacturer support, and when the others will be.

**Evidence to keep:**
- A switch specification or data sheet checked against each requirement.
- A network diagram showing switch links and speeds.

**Who can help:** IT support, network supplier.

**Watch out for:** Fast switches held back by poor cabling (see Network Cabling). Not checking total PoE power when adding new Wi-Fi points or cameras.

### Network Switching: Have a platform that can centrally manage the network switching infrastructure
`switching-2` · Core standard: Yes

**In plain English:** All your switches should be managed from one central tool that shows how they are working and sends alerts if something fails, and they should be under support for at least 5 years.

**What GOV.UK asks for:**
- A central management tool to configure core switches (in the main server room) and edge switches (in classrooms and hub rooms), monitor performance and alert on failure.
- A manufacturer warranty and support (telephone, email and web), including licences, software enhancements and firmware (the software built into the switch) updates, for at least 5 years.
- Equipment that can no longer receive firmware and security updates is replaced.
- An on-site system administrator training package, approved by the manufacturer, suited to the size of the network and covering all security elements.

**When to meet it:** When you need to replace a switching solution that is underperforming or unsupported.

**Examples of how schools meet it:**
- *Small primary:* The managed IT provider uses a cloud management dashboard for the school's few switches and emails the business manager when one goes offline.
- *Larger school or trust:* The trust uses one management platform across all its schools, and its technicians attend manufacturer-approved training as part of the purchase.
- *Quick win:* Ask IT support: "If a switch failed tonight, how would you know?" and "When does our switch support end?"

**Evidence to keep:**
- Warranty and support contract showing at least 5 years of cover.
- A screenshot of the management tool or a sample alert.
- Training records for the system administrator.

**Who can help:** IT support, managed IT provider, network supplier.

**Watch out for:** Support licences that lapse after 1 to 3 years unless renewed, leaving switches without updates. Budget for the full 5 years at purchase.

### Network Switching: The network switches should have security features to protect users and data from unauthorised access
`switching-3` · Core standard: Yes

**In plain English:** Switches should be set up so only approved people and devices can get onto the school network, with staff, pupil and guest traffic kept apart and admin access tightly controlled.

**What GOV.UK asks for:**
- Switches configured for network segregation (separating groups such as staff, pupils and guests), security and quality of service (QoS: giving priority to important traffic such as phone calls), without harming performance.
- Admin accounts that can change configuration are secure and fully documented.
- Software updates are set to install automatically as soon as available, with manual checks as well.
- Network access controls (NAC: checks that a device is allowed before letting it on) and policy management so mobile devices and guests are securely authenticated; traffic protected from interception.
- Central management tools to configure switches, monitor performance and alert on failure.

**When to meet it:** When replacing an underperforming or unsupported solution, or following a scheduled maintenance or configuration review.

**Examples of how schools meet it:**
- *Small primary:* IT support sets up separate networks for staff, pupils, guests and the CCTV system, and keeps a short list of who holds switch admin passwords.
- *Larger school or trust:* The trust uses NAC so a laptop plugged into a classroom socket only gets on the network if it is a known school device.
- *Quick win:* Ask IT support for a list of switch admin accounts and confirm each one belongs to a named current person.

**Evidence to keep:**
- A list of admin accounts and who holds them.
- A network diagram showing segregated networks.
- Update settings or update history from the management tool.

**Who can help:** IT support, network supplier, DPO (for data risk).

**Watch out for:** Shared or default admin passwords left on switches. Former contractors who still have admin access.

### Network Switching: Core network switches should be connected to at least one UPS to reduce the impact of outages
`switching-4` · Core standard: Yes

**In plain English:** Your most important switches should keep running during a power cut or a single fault, using backup power and duplicate parts and connections.

**What GOV.UK asks for:**
- Identify critical switches and connections so that a failure of any single element does not cause a major outage.
- Critical core switches have at least 2 power supplies, 2 management modules (the switch's "brain") and 2 connections to other critical equipment such as routers, servers and other core switches.
- Critical core switches are connected to at least one UPS (uninterruptible power supply: a battery unit that keeps equipment running during a power cut).

**When to meet it:** When replacing an underperforming or unsupported solution, or following a scheduled maintenance or configuration review.

**Examples of how schools meet it:**
- *Small primary:* The main switch, broadband router and firewall in the office cabinet are plugged into one UPS, so a short power cut does not take the school offline.
- *Larger school or trust:* The core switches in the server room have dual power supplies fed from two separate UPS units, and each block links back by two routes.
- *Quick win:* Look in your server cabinet: is there a UPS, and does IT support know when its batteries were last tested or replaced?

**Evidence to keep:**
- A list of critical switches and their duplicate parts and connections.
- UPS details and battery test or replacement dates.
- A network diagram showing dual links.

**Who can help:** IT support, network supplier, premises manager (for power supply).

**Watch out for:** UPS batteries that have quietly worn out. Having two power supplies but plugging both into the same wall socket.

---

## Servers and Storage

These standards apply to any servers and storage you still keep on site: keeping them running, secure, energy efficient and in a safe room.

### Servers and Storage: All servers and related storage platforms should continue to work if any single component or service fails
`servers-1` · Core standard: No

**In plain English:** If one part of a server fails, such as a disk or power supply, the system should keep running while it is fixed.

**What GOV.UK asks for:**
- Review servers and storage regularly with IT support. Senior leaders should decide the maximum downtime they will accept.
- For all servers: monitoring with alerts, quick replacement of failed parts, valid warranties and support, a patching and firmware process, and a replacement plan before end of warranty, support or life.
- For servers with critical data: multiple power supplies, a UPS with automatic safe shutdown and at least 30 minutes run-time, disk mirroring and/or redundancy, regular backups, backup servers and network cards that switch over seamlessly, and support levels matched to how critical the data is.
- Consider keeping spares, such as fans, power supplies and disks.

**When to meet it:** You should already be meeting this; it is also needed for data protection compliance.

**Examples of how schools meet it:**
- *Small primary:* Has moved most things to the cloud, leaving one small server with mirrored disks, a UPS and a warranty that runs until its planned replacement.
- *Larger school or trust:* Runs critical systems on two linked servers so one takes over if the other fails, with monitoring that emails IT support.
- *Quick win:* Ask SLT to agree, in writing, how long each key system can be down before it causes real problems.

**Evidence to keep:**
- Server list with warranty and end-of-life dates.
- SLT-agreed maximum downtime.
- Monitoring alert set-up and UPS test records.

**Who can help:** IT support, SLT, and server suppliers.

**Watch out for:** A UPS with a dead battery gives no protection; test it. Don't let warranties lapse quietly.

### Servers and Storage: Servers and related storage platforms must be secure and follow data protection legislation
`servers-2` · Core standard: No

**In plain English:** On-site servers holding school data must be secure, licensed, kept up to date, and managed in line with data protection law.

**What GOV.UK asks for:**
- IT support must meet the cyber security standards and keep servers secure, licensed, updated and well managed.
- Review systems whenever you make a change, or at least each term.
- Your DPO should carry out a DPIA for servers storing personal or special category data, and extra measures such as encryption or restricted access may be needed.
- Follow the NCSC 10 Steps to Cyber Security. Have a joiners-and-leavers account process and documented data breach roles.
- When buying, choose suppliers that can meet these requirements; Get help buying for schools offers free help.

**When to meet it:** You should already be meeting this to comply with data protection legislation.

**Examples of how schools meet it:**
- *Small primary:* IT support sends a short termly report confirming updates are applied, licences are current and leavers' accounts are removed.
- *Larger school or trust:* The trust holds a termly security review for each school's servers, logged against the NCSC 10 Steps.
- *Quick win:* Ask IT support when your servers were last updated and whether any run software that no longer gets security updates.

**Evidence to keep:**
- Termly review records.
- DPIAs for servers with personal data.
- Licence records and joiners-and-leavers process.

**Who can help:** IT support, DPO, and Get help buying for schools.

**Watch out for:** Old servers kept "just for one thing" often miss updates. Reviews must happen at least each term, not only when something goes wrong.

### Servers and Storage: All servers and related storage platforms should be energy-efficient and set up to reduce power consumption, while still meeting user needs
`servers-3` · Core standard: No

**In plain English:** Servers run all day and night, so buy efficient ones and set them up to use as little power as possible without slowing things down.

**What GOV.UK asks for:**
- Make energy efficiency a stated requirement in every server and storage purchase.
- Set existing equipment for the highest energy efficiency that still meets user needs.
- Use power saving when inactive (if it doesn't harm performance, backups or equipment) and turn off unused features.
- When buying: specify ENERGY STAR or equivalent, require energy-saving set-up, buy for current needs and planned growth but no more, and choose durable, repairable equipment.

**When to meet it:** Review existing servers now, and keep meeting the standard when you buy new ones.

**Examples of how schools meet it:**
- *Small primary:* Replaces two old servers with cloud services, cutting energy use and leaving none or one small server.
- *Larger school or trust:* Adds energy efficiency and right-sizing requirements to its standard server specification for all schools.
- *Quick win:* Ask IT support to check whether power-saving settings are turned on and to switch off any unused services.

**Evidence to keep:**
- Purchase specifications showing energy requirements.
- IT support's note of power settings applied.
- Product details showing ENERGY STAR or equivalent.

**Who can help:** IT support, the school business manager, and suppliers.

**Watch out for:** Buying a far bigger server "to be safe" wastes energy and money; the standard says don't go beyond your needs and growth plans.

### Servers and Storage: All server and related storage platforms should be kept and used in an appropriate physical environment
`servers-4` · Core standard: No

**In plain English:** Servers should live in a locked, dedicated, cool and dry room or cupboard, away from water, clutter and anyone who doesn't need access.

**What GOV.UK asks for:**
- A dedicated, secure, locked room or cupboard not used for anything else, accessed only by people with a genuine need.
- Size (HSE and British Standards): 3.4m deep and 2.2m wide for one 1000mm deep by 800mm wide cabinet; add 0.8m width per extra cabinet, leaving 1.4m to the side wall (BS EN 50174-2).
- Servers in cabinets; no flammable items; a dedicated, isolated uninterruptible power supply; enough cooling or mechanical ventilation.
- No laptops or other battery-powered user devices, no windows, no direct access from a classroom, and no liquids.
- Prevent risks from pipework, water sources above, tanks or boilers, and building dust.

**When to meet it:** You should already be meeting this; it is also needed for data protection compliance.

**Examples of how schools meet it:**
- *Small primary:* Clears paper and old laptops out of the server cupboard, fits a lock, and limits keys to the head and IT support.
- *Larger school or trust:* Includes server room requirements in building projects so new rooms have no windows, no water pipes overhead and proper cooling.
- *Quick win:* Walk into your server room with this list and photograph anything that shouldn't be there.

**Evidence to keep:**
- Dated photos of the room.
- Key or access log.
- Cooling and UPS details, and room dimensions.

**Who can help:** IT support, site manager, and estates or building contractors.

**Watch out for:** Server cupboards often become storerooms or charging spaces for laptop trolleys, which the standard rules out. Check what is above the room, such as toilets or science labs.

---

## IT Support

These standards help you check that your IT support, whether in-house staff, an external company or a mix, keeps technology working, responds well and is reviewed every year.

### IT Support: Make sure IT support helps you meet the digital and technology standards
`support-1` · Core standard: No

**In plain English:** Your IT support should understand the DfE standards and help you work towards them in their day-to-day work and planning.

**What GOV.UK asks for:**
- All schools should be working towards the 6 core standards by 2030: broadband internet, cyber security, digital leadership and governance, filtering and monitoring, network switching and wireless network.
- IT support should have the qualifications and experience to understand the standards.
- The SLT digital lead should assess whether IT support needs professional memberships or certifications, for example ITIL (a recognised framework for running IT services) for individuals or Cyber Essentials for companies.
- The standards should inform your digital strategy and development plan; DfE's free plan technology for your school service can help measure progress.

**When to meet it:** You should already be working towards meeting the standards.

**Examples of how schools meet it:**
- *Small primary:* The business manager asks the IT provider to go through the plan technology for your school results with them each term.
- *Larger school or trust:* The trust adds "progress against DfE standards" as a standing item in its monthly IT meeting.
- *Quick win:* Ask your IT support which of the 6 core standards they think you already meet, and which they think you do not.
- *If you have a managed IT provider:* Ask whether the company holds Cyber Essentials certification.

**Evidence to keep:**
- Progress records from plan technology for your school.
- IT support contract or job description referring to the standards.
- Copies of relevant certifications.

**Who can help:** SLT digital lead, IT support, business manager.

**Watch out for:** Assuming IT support is solely responsible. GOV.UK says meeting the standards is a shared responsibility across the school.

### IT Support: Make sure IT support actively maintains and improves your digital technology in line with your digital strategy
`support-2` · Core standard: No

**In plain English:** IT support should not just fix things when they break. They should look after your systems, keep records, and help plan upgrades that fit your strategy.

**What GOV.UK asks for:**
- Work out your support needs from your asset and contract registers and strategy, including busy times, multiple sites and your most critical systems.
- IT support maintains registers, gives technical information for licences and contracts, supports training and keeps documentation, including system configurations, up to date.
- IT support monitors networks, devices and cloud services; applies security patches (fixes) and firmware updates; makes sure backups are secure and restorable; works with the DSL on filtering and monitoring; and manages user accounts.
- Keep an up-to-date record of all IT support services, who provides them and what they cover. Internal IT support (or the digital lead) coordinates third parties.
- IT support helps plan replacements, advises on budget and evaluates new technology.

**When to meet it:** You should already be meeting this standard or working towards it.

**Examples of how schools meet it:**
- *Small primary:* A one-page table listing each service (devices, MIS, printers, broadband, website), who supports it and their contact number.
- *Larger school or trust:* IT support sends the digital lead a monthly report on patching, backups tested and accounts removed for leavers.
- *Quick win:* Ask IT support when they last tested restoring a file from backup.

**Evidence to keep:**
- Your record of IT support services and providers.
- Patching and backup test reports.
- Leaver account removal records.

**Who can help:** SLT digital lead, IT support, business manager, DSL, external suppliers.

**Watch out for:** Forgetting systems with their own support contracts, such as the MIS or MFDs (multi-functional devices, the photocopier-printers). They still need to be in your support record.

### IT Support: Make sure your IT support is responsive and meets agreed service expectations
`support-3` · Core standard: No

**In plain English:** Agree in writing how quickly IT problems will be dealt with, make sure every request is logged, and use those records to spot problems and plan capacity.

**What GOV.UK asks for:**
- The SLT digital lead and IT support agree and record response and resolution times, how requests are prioritised and how serious issues are escalated. Meet regularly to review.
- Offer clear support channels: several ways to raise requests (phone, email, in person), clear hours with emergency cover, and self-service for common issues. Avoid unofficial channels such as instant messages.
- Record every request: description, date and time, requester (and approver if needed), priority and actions taken. Staff should be able to check status.
- Use the records to monitor demand, report to governors in the yearly review, and plan extra capacity for busy times.

**When to meet it:** You should already be meeting this standard or working towards it.

**Examples of how schools meet it:**
- *Small primary:* The visiting technician uses a shared request log, and staff email one helpdesk address instead of messaging the technician directly.
- *Larger school or trust:* A helpdesk system with priority levels, for example "classroom cannot teach" answered within an hour.
- *Quick win:* Check your IT support contract for the response times it already promises.
- *If you have a managed IT provider:* Ask for a termly report of tickets by type and response time.

**Evidence to keep:**
- Written service expectations (response times, priorities, escalation).
- Helpdesk reports or request log.
- Notes of review meetings with IT support.

**Who can help:** SLT digital lead, IT support or provider, business manager.

**Watch out for:** Requests made in the corridor or by text that never get logged. They make support look less busy than it is and hide recurring problems.

### IT Support: Review your IT support at least once a year
`support-5` · Core standard: No

**In plain English:** Once a year, formally check whether your IT support is good enough, has the right skills and offers value for money, and report the findings to governors.

**What GOV.UK asks for:**
- The SLT digital lead leads a formal review at least once a year.
- Review what support you have, whether your record of support services is up to date, upcoming needs, skills, capacity, training and budget.
- Use support request records and feedback to check performance, busy periods and systems causing many requests.
- Review contracts (including informal arrangements), whether procurement stayed within budget, and value for money, which does not necessarily mean the lowest cost.
- Write up the findings and share them with SLT, the business manager and governors or the trust board.

**When to meet it:** Each year, alongside your wider digital strategy review.

**Examples of how schools meet it:**
- *Small primary:* Each summer term, the digital lead sends a short staff survey on IT support, reviews the request log and writes a one-page report for governors.
- *Larger school or trust:* The trust compares support across schools and uses DfE's get help buying for schools service before re-tendering the contract.
- *Quick win:* Put the review date in the calendar now, a few months before your IT support contract renews.

**Evidence to keep:**
- The written review report.
- Governor or trust board minutes considering it.
- Staff feedback results and contract comparison notes.

**Who can help:** SLT digital lead, business manager, headteacher, IT support, digital link governor, get help buying for schools.

**Watch out for:** Reviewing too close to contract renewal. Leave enough time to act on the findings or compare other suppliers.

### IT Support: Make sure staff get clear guidance and training on using technology
`support-6` · Core standard: No

**In plain English:** Staff need training when they join and refresher training after, plus simple written guides, so they can use technology safely without always calling IT support.

**What GOV.UK asks for:**
- Induction training for new staff and those changing roles, then regular refreshers, covering the MIS, safeguarding and behaviour platforms, parent communication tools, and cyber security awareness training.
- Update training whenever new technology or processes arrive, such as generative AI tools.
- IT support staff also get regular training to keep their skills current.
- IT support writes plain-English guidance (logging in, resetting passwords, common problems, raising requests) in an easy-to-find place, keeps technical documentation for continuity plans, and helps with policies such as data protection, cyber security and acceptable use.

**When to meet it:** You should already have training and guidance in place; review it regularly, for example as part of your annual digital technology review.

**Examples of how schools meet it:**
- *Small primary:* A "first day IT" sheet for new staff covering login, email, MIS and how to report a problem.
- *Larger school or trust:* Short recorded videos on the intranet for common tasks, with IT support adding one whenever the same question comes up repeatedly.
- *Quick win:* Use NCSC's free cyber security training for school staff at your next INSET day.

**Evidence to keep:**
- Training records showing who completed what and when.
- Copies of staff guides with review dates.
- Acceptable use policy and staff sign-off.

**Who can help:** SLT digital lead, IT support, DSL, DPO, school business manager.

**Watch out for:** Forgetting supply, part-time and support staff. They use the same systems and need the same induction.

---

## Wireless Network

These standards cover your Wi-Fi: how up to date it is, how well it reaches every room, how it is managed and how it is kept secure.

### Wireless Network: Use the latest wireless network standards
`wireless-1` · Core standard: Yes

**In plain English:** Your Wi-Fi should let everyone who needs it get online at the same time. When you next upgrade, choose equipment that uses at least Wi-Fi 7, the latest standard.

**What GOV.UK asks for:**
- Work with IT support so the wireless network supports the outcomes and device use you need, including concurrent (simultaneous) logon and use of all devices.
- When you upgrade, use at minimum Wi-Fi 7 (802.11be), the latest standard approved by the Wi-Fi Alliance.
- Review the network interface speeds of the access points (the Wi-Fi units on ceilings or walls), typically 1Gbps, 2.5Gbps and 5Gbps or 10Gbps.
- Configure the wireless network to support network segregation and QoS (prioritising important traffic).

**When to meet it:** When you need to upgrade an underperforming or unsupported solution.

**Examples of how schools meet it:**
- *Small primary:* Wi-Fi works well, so no change is needed now. The business manager notes in the strategy that the next upgrade will be Wi-Fi 7 and starts budgeting.
- *Larger school or trust:* During a Wi-Fi refresh, the trust checks that switch ports and cabling can handle the faster access point speeds before ordering.
- *Quick win:* Ask staff where Wi-Fi is slow or drops out, and pass the list to IT support.

**Evidence to keep:**
- The current Wi-Fi equipment list and its support end dates.
- Upgrade quotes stating Wi-Fi 7 (802.11be).

**Who can help:** IT support, wireless network supplier.

**Watch out for:** New access points that are faster than your cabling or switches can carry. Note that devices only need to support older Wi-Fi standards (see devices-3), so plan the network and devices together.

### Wireless Network: Have a fully functional signal from your wireless network throughout the school or college buildings and externally where required
`wireless-2` · Core standard: Yes

**In plain English:** There should be a strong Wi-Fi signal everywhere devices are used, including busy spaces like halls and any outdoor areas you need.

**What GOV.UK asks for:**
- Wireless access points across the site, which could be up to one per classroom, with higher-specification units in high-capacity areas such as halls.
- Enough access points in each space for its planned number of people, so simultaneous use does not slow the network down.
- The wireless provider designs a solution that fully meets your needs, using wireless heat mapping (a survey showing signal strength across a floor plan) in initial planning.
- Interference from building management systems and other networks is minimised.

**When to meet it:** When you need to upgrade an underperforming or unsupported solution.

**Examples of how schools meet it:**
- *Small primary:* Before an upgrade, the supplier does a heat map survey and finds the hall needs a higher-capacity unit for whole-school assemblies with tablets.
- *Larger school or trust:* The trust asks for a survey of every block, including the sports field where PE staff use tablets, and requires a post-install heat map to prove coverage.
- *Quick win:* Walk round with a phone or laptop and note rooms with weak signal.

**Evidence to keep:**
- Wireless heat map or site survey reports.
- A floor plan showing access point locations.

**Who can help:** IT support, wireless network supplier, premises manager.

**Watch out for:** Planning access points for coverage only, not for how many devices will be used in a room at once. Thick walls and new extensions creating dead spots.

### Wireless Network: Have a solution that can centrally manage the wireless network
`wireless-3` · Core standard: Yes

**In plain English:** All your Wi-Fi access points should be managed from one central tool, so IT support can spot and fix problems quickly and keep security updates flowing.

**What GOV.UK asks for:**
- A central management tool to configure access points, monitor performance and alert on failure, with automatic security updates as soon as available plus manual checks.
- Active signal management and load balancing (spreading users across access points so none is overloaded).
- Manufacturer warranty and support, including licences, software enhancements, and security and firmware updates.
- A manufacturer-approved system administrator training package covering all security elements.
- A scalable solution that can handle future higher bandwidth needs, and a configuration file that can reset the system to the school's original setup.

**When to meet it:** When you need to upgrade an underperforming or unsupported solution.

**Examples of how schools meet it:**
- *Small primary:* The managed IT provider monitors the school's access points from a cloud dashboard and is alerted when one goes offline.
- *Larger school or trust:* The trust manages Wi-Fi for all its schools from one platform and keeps a saved configuration file for each site.
- *Quick win:* Ask IT support whether you have a backup of the Wi-Fi configuration, and where it is stored.

**Evidence to keep:**
- Warranty, support and licence agreements with end dates.
- A screenshot of the management tool or a sample alert.
- Training records and a stored configuration backup.

**Who can help:** IT support, wireless network supplier, managed IT provider.

**Watch out for:** Management licences expiring, which can stop updates or even switch features off. Relying on one person who knows how the system is set up.

### Wireless Network: Install security features to stop unauthorised access
`wireless-4` · Core standard: Yes

**In plain English:** Only approved people and devices should be able to join the school Wi-Fi, guests should be kept separate, and Wi-Fi traffic should be protected from snooping.

**What GOV.UK asks for:**
- A proposal that supports the latest Wi-Fi Alliance specification, and users cannot access the network without proper authorisation and authentication (proving who they are).
- Admin accounts that can change configuration are secure and fully documented.
- Authorised devices and guests are authenticated individually, and traffic is protected from interception without harming performance.
- Measures you may need: VLANs (separate virtual networks), ACLs (access control lists: rules on who can reach what), secure segregated guest access, WPA3 (the latest Wi-Fi security protocol), WIPS (wireless intrusion protection: spotting rogue or fake access points), certificate-based authentication (a digital certificate on the device instead of a shared password), and MFA (a second check, such as a code on your phone) for privileged users and technical staff.

**When to meet it:** When upgrading an underperforming or unsupported solution, or following a scheduled maintenance or configuration review.

**Examples of how schools meet it:**
- *Small primary:* The school replaces one shared Wi-Fi password with individual staff logins and a separate guest network with a daily-changing code.
- *Larger school or trust:* School-owned devices connect using certificates, guests use a separate network, and IT support sign in to the Wi-Fi management tool with MFA.
- *Quick win:* Check whether the staff Wi-Fi password is written on a classroom wall or has been shared with pupils. If so, ask IT support to change it.

**Evidence to keep:**
- A description of Wi-Fi networks (staff, pupil, guest) and how each authenticates.
- A list of admin accounts, showing MFA is on.
- Notes from the latest configuration review.

**Who can help:** IT support, wireless network supplier, DSL (for guest and pupil access), DPO.

**Watch out for:** One shared password for all staff that never changes. Guest Wi-Fi that can reach school systems.

---

## Notes for review

These are the points to settle before this guide goes into the product.

### Points in the GOV.UK text itself
The guide keeps to GOV.UK's meaning. Where GOV.UK's wording looks wrong, this is how the guide handles it.

| Standard | GOV.UK wording | What the guide does |
|---|---|---|
| Broadband: IT security and safeguarding (`broadband-3`) | Says "National Cyber Security Service" | Says NCSC (National Cyber Security Centre) |
| Cloud: alternative to locally-hosted systems (`cloud-1`) | Spreadsheets should export as ".CSV and/or .ODT" (.ODT is a document format; the spreadsheet format would be .ODS) | Mentions .CSV only |
| Filtering: review provision annually (`filtering-2`) | Says "RHSE" | Says RSHE (relationships, sex and health education) |
| Devices: safe and secure (`devices-2`) | Says "virtual area local networks" | Says virtual local area networks (VLANs) |
| Devices: energy efficient and sustainable (`devices-4`) | Names an NCSC guide to sanitising "security media" | Says "storage media". **Check the guide's exact title.** |
| Switching: fast, reliable, secure (`switching-1`) | Says "IEEE 802.3af.at or IEEE 802.3af.bt" (the real standards are 802.3af, 802.3at and 802.3bt) | Quotes GOV.UK and labels it as GOV.UK's wording |
| Cabling: Cat 6A (`cabling-1`) | Fire rating written "Cca s1b.d2.a2" (usually "Cca-s1b,d2,a2"); refers to "British Standards 6701, 50173 and 50174" | Keeps GOV.UK's wording |
| IT support | Standards are numbered 1, 2, 3, 5, 6 (no 4); `support-5` refers to a standard called "reliable and responsive", but `support-3`'s title is "responsive and meets agreed service expectations" | Uses the titles as published |

### Facts to check against current sources
- **KCSIE paragraph references.** `broadband-3` cites KCSIE paragraphs 123–135, and `filtering-4` names the four areas of online risk (content, contact, conduct, commerce). Check both against the current edition of KCSIE.
- **Contact details** (`cyber-7`). The Report Fraud number (0300 123 2040) and the DfE sector cyber team email (Sector.Incidentreporting@education.gov.uk) are copied exactly from GOV.UK. Check they're still current before publishing.
- **ICO 72-hour reporting** (`cyber-7`). GOV.UK says to report "where a high-risk data breach has or may have occurred". The UK GDPR threshold for reporting to the ICO is lower: any breach likely to put people's rights at risk. The guide keeps GOV.UK's wording, but **the DPO should confirm how this is phrased.**
- **Server room dimensions** (`servers-4`). The measurements and BS EN 50174-2 are copied from GOV.UK. They haven't been checked against HSE or British Standards documents.
- **"Isolated uninterruptible supply"** (`servers-4`). This could mean a dedicated circuit, a UPS, or both. The guide keeps GOV.UK's wording.
- **Device support years** (`devices-3`). GOV.UK asks for 3 years of support for tablets and 5 years for laptops and desktops "when repurposing, upgrading or buying". It doesn't say when the count starts (from purchase or from the product's release).
- **NCSC tools** (`cyber-3`, `cyber-6`). GOV.UK describes these without naming them: a free early warning service, an email security check and an incident practice tool. The guide doesn't name them either. One of them may have been retired.
- **RPA** (`leadership-3`, `cyber-2`). The guide says RPA members must show that "relevant users" have done the free NCSC training, as GOV.UK puts it. GOV.UK doesn't define "relevant users". `leadership-3` tells schools to check the RPA's own cyber cover conditions.

### Advice that is ours, not DfE's
The guide marks these as practical suggestions, not requirements. Change any that don't suit your schools.
- Running the filtering test each half-term (`filtering-2`). GOV.UK says frequency depends on the school's context and risks.
- An example response time of "answered within an hour" for a class that can't teach (`support-3`). GOV.UK sets no response times.
- Computers switching off automatically at 6pm (`devices-4`), and a guest Wi-Fi code that changes daily (`wireless-4`).
- Withholding final payment until cable test reports are handed over (`cabling-2`).
- MFA (multi-factor authentication) on personal devices (`cloud-4`), suggested where your cyber security arrangements call for it.
- Free apps that staff sign up to themselves still belong on the approved apps list and the information asset register (`leadership-2`).

### Wording that could confuse readers
- **Wi-Fi standards for devices and networks differ.** Devices should support 802.11ac Wave 2, with Wi-Fi 6 recommended (`devices-3`). The network should use Wi-Fi 7 when it's next upgraded (`wireless-1`). These don't conflict, and `wireless-1` has a note explaining why.
- **"Should" and "must" are kept exactly as GOV.UK uses them.** This matters most in Filtering and Monitoring. For example, the IWF and CTIRU blocklists "must" be in place and can't be turned off, but separate staff and student filtering profiles are a "should".

### Length
Most standards run to 250–350 words. A few of the longest core standards run to about 385, because cutting further would drop requirements.

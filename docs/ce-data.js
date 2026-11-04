// Cyber Essentials: Requirements for IT Infrastructure v3.3 (NCSC, effective 27 April 2026).
// "requirement" text is taken from that document. "schoolNote" is our own
// guidance on applying the requirement in a school or college.
const CE_VERSION = "Requirements for IT Infrastructure v3.3 (effective 27 April 2026)";
const CE_SOURCE_URL = "https://www.ncsc.gov.uk/sites/default/files/2026-08/IT%20Requirements%20v3.3.pdf";
const CE_OVERVIEW_URL = "https://www.ncsc.gov.uk/cyberessentials/overview";

const CE_DATA = [
  {
    id: "scope",
    title: "Scope",
    appliesTo: "The whole IT infrastructure used to carry out your organisation's business, or a well-defined and separately managed sub-set",
    aim: "Clearly define the scope boundary (the business unit managing it, the network boundary and physical location) and agree it with the Certification Body before assessment begins.",
    items: [
      {
        id: "scope-1",
        title: "Scope boundary is defined and agreed with the Certification Body",
        requirement: "You must clearly define the scope boundary, namely: the business unit managing it, the network boundary and physical location. You must agree the scope with the Certification Body before assessment begins. Where parts of an organisation's infrastructure have been excluded from scope, you will need to justify the reason for a partial scope to your assessor.",
        schoolNote: "Whole-organisation scope gives the best protection. For a trust, decide whether you are certifying the whole trust or individual schools."
      },
      {
        id: "scope-2",
        title: "End-user devices are included in scope",
        requirement: "A scope that doesn't include end-user devices isn't acceptable. Devices includes all types of hosts, networking equipment, servers, networks, and end user devices such as desktop computers, laptops, thin clients, tablets and smartphones - whether physical or virtual.",
        schoolNote: "Include staff laptops, classroom and suite PCs, tablets (including shared iPads) and office machines."
      },
      {
        id: "scope-3",
        title: "All cloud services are in scope",
        requirement: "If your organisation's data or services are hosted on cloud services, these services must be in scope. Cloud services cannot be excluded from scope. Where the cloud provider implements a control on your behalf, you must make sure the provider has committed to implementing it via contractual clauses or documents referenced by contract.",
        schoolNote: "Typically Microsoft 365 or Google Workspace, a cloud-hosted MIS, safeguarding and payment systems, and learning platforms. Keep a list of each service and its shared-responsibility evidence."
      },
      {
        id: "scope-4",
        title: "BYOD that accesses organisational data or services is in scope",
        requirement: "User-owned devices which access organisational data or services are in scope. Devices used only for native voice applications, native text applications or multi-factor authentication (MFA) applications are out of scope.",
        schoolNote: "Staff phones or home PCs that open school email, Teams or the MIS are in scope. A phone used only for calls, texts and an authenticator app is not."
      },
      {
        id: "scope-5",
        title: "Devices used by students, volunteers, trustees and third parties are scoped correctly",
        requirement: "All end user devices your organisation owns that are loaned to a third party must be included in the assessment scope. For devices not owned by your organisation: employee, volunteer and trustee BYOD are in scope; student BYOD is out of scope; MSP administrator, third party contractor and customer devices are out of scope.",
        schoolNote: "School-owned laptops loaned to pupils are in scope. Pupils' own devices are out of scope, but you are still responsible for making sure devices using your services are configured correctly. Governors and volunteers using their own devices for school data are in scope."
      },
      {
        id: "scope-6",
        title: "Home and remote working devices are in scope",
        requirement: "All corporate or BYOD home/remote working devices used for your organisation's business are in scope. If your organisation gives the home/remote worker a router, that router is then also in scope. All other routers are out of scope, which means you need to apply Cyber Essentials firewall controls (such as a software firewall) on user devices.",
        schoolNote: ""
      },
      {
        id: "scope-7",
        title: "Accounts used by third parties and managed services are in scope",
        requirement: "All accounts that your organisation owns are in scope, even when those accounts are used by a third party, such as a supplier, contractor or Managed Service Provider (MSP). If you're using externally managed services (such as remote administration), you must be able to confirm that the Cyber Essentials technical controls are being met.",
        schoolNote: "Include your IT support provider's admin accounts and any local authority or trust central IT accounts. Get written confirmation of how they meet each control."
      },
      {
        id: "scope-8",
        title: "Wireless devices are scoped correctly",
        requirement: "Wireless devices (including wireless access points) are in scope if they can communicate with other devices via the internet; out of scope if it's not possible for an attacker to attack directly via the internet; and out of scope if they are part of an ISP router at the home or remote location.",
        schoolNote: ""
      }
    ]
  },
  {
    id: "firewalls",
    title: "Firewalls",
    appliesTo: "Boundary firewalls, desktop computers, laptops, routers, servers, IaaS, PaaS, SaaS",
    aim: "To make sure that only secure and necessary network services can be accessed from the internet.",
    items: [
      {
        id: "fw-1",
        title: "Every device in scope is protected by a correctly configured firewall",
        requirement: "You must protect every device in scope with a correctly configured firewall (or network device with firewall functionality). If your organisation doesn't control the network to which a device connects, you must configure a software firewall on the device.",
        schoolNote: "Your broadband provider or local authority may manage the boundary firewall. Confirm who manages it and get evidence of its configuration."
      },
      {
        id: "fw-2",
        title: "Default administrative passwords are changed",
        requirement: "Change default administrative passwords to a strong and unique password (see password-based authentication), or disable remote administrative access entirely.",
        schoolNote: ""
      },
      {
        id: "fw-3",
        title: "Administrative interface is not accessible from the internet",
        requirement: "Prevent access to the administrative interface (used to manage firewall configuration) from the internet, unless there is a clear and documented business need, and the interface is protected by either multi-factor authentication, or an IP allow list that limits access to a small range of trusted addresses combined with a properly managed password authentication approach.",
        schoolNote: ""
      },
      {
        id: "fw-4",
        title: "Unauthenticated inbound connections are blocked by default",
        requirement: "Block unauthenticated inbound connections by default.",
        schoolNote: ""
      },
      {
        id: "fw-5",
        title: "Inbound firewall rules are approved and documented",
        requirement: "Ensure inbound firewall rules are approved and documented by an authorised person, and include the business need in the documentation.",
        schoolNote: "Common examples are remote access to the MIS server, CCTV, door access or heating controls."
      },
      {
        id: "fw-6",
        title: "Unnecessary firewall rules are removed or disabled",
        requirement: "Remove or disable unnecessary firewall rules, when they are no longer needed.",
        schoolNote: ""
      },
      {
        id: "fw-7",
        title: "Software firewall is used on devices on untrusted networks",
        requirement: "Make sure you use a software firewall on devices which are used on untrusted networks, such as public wifi hotspots. Most desktop and laptop operating systems now come with a software firewall pre-installed; we advise that these are turned on in preference to a third-party firewall application.",
        schoolNote: "Staff laptops taken home or on trips need the built-in firewall switched on."
      }
    ]
  },
  {
    id: "secure-configuration",
    title: "Secure Configuration",
    appliesTo: "Servers, desktop computers, laptops, tablets, mobile phones, thin clients, IaaS, PaaS, SaaS",
    aim: "Ensure that computers and network devices are properly configured to reduce vulnerabilities and provide only the services required to fulfil their role.",
    items: [
      {
        id: "sc-1",
        title: "Unnecessary user accounts are removed or disabled",
        requirement: "Regularly remove and disable unnecessary user accounts (such as guest accounts and administrative accounts that won't be used).",
        schoolNote: ""
      },
      {
        id: "sc-2",
        title: "Default or guessable account passwords are changed",
        requirement: "Regularly change any default or guessable account passwords (see password-based authentication).",
        schoolNote: "Check printers, interactive panels, access points and other devices with built-in admin accounts."
      },
      {
        id: "sc-3",
        title: "Unnecessary software is removed or disabled",
        requirement: "Regularly remove or disable unnecessary software (including applications, system utilities and network services).",
        schoolNote: ""
      },
      {
        id: "sc-4",
        title: "Auto-run is disabled",
        requirement: "Disable any auto-run feature which allows file execution without user authorisation (such as when they are downloaded).",
        schoolNote: ""
      },
      {
        id: "sc-5",
        title: "Users are authenticated before accessing organisational data or services",
        requirement: "Ensure users are authenticated before allowing them access to organisational data or services.",
        schoolNote: "Shared classroom or kiosk logins that open school data need reviewing."
      },
      {
        id: "sc-6",
        title: "Device unlocking credentials are in place",
        requirement: "If a device requires a user's physical presence to access a device's services (such as logging on to a laptop or unlocking a mobile phone), a credential such as a biometric, password or PIN must be in place before a user can gain access to the services.",
        schoolNote: ""
      },
      {
        id: "sc-7",
        title: "Device unlocking is protected against brute-force attacks",
        requirement: "When it's possible to configure, apply one of: throttling the rate of attempts, allowing no more than 10 guesses in 5 minutes; or locking devices after no more than 10 unsuccessful attempts. When the vendor doesn't allow you to configure this, use the vendor's default setting.",
        schoolNote: ""
      },
      {
        id: "sc-8",
        title: "Device unlocking credential quality is technically enforced",
        requirement: "Technical controls must be used to manage the quality of credentials. If credentials are just to unlock a device, use a minimum password or PIN length of at least 6 characters. When the device unlocking credentials are also used for authentication, you must apply the full password requirements described in User Access Control.",
        schoolNote: "Set this through Intune, Google Admin or your MDM so it applies to every school tablet and phone."
      }
    ]
  },
  {
    id: "security-update-management",
    title: "Security Update Management",
    appliesTo: "Servers, desktop computers, laptops, tablets, mobile phones, firewalls, routers, IaaS, PaaS, SaaS",
    aim: "Ensure that devices and software are not vulnerable to known security issues for which fixes are available.",
    items: [
      {
        id: "sum-1",
        title: "All software is licensed and supported",
        requirement: "All software on in-scope devices must be licensed and supported. Licensed and supported software is software that you have a legal right to use and that a vendor has committed to support by providing regular vulnerability fixes. The vendor must provide the future date when they will stop providing these.",
        schoolNote: "Record end-of-support dates in your software register (this also supports the DfE digital leadership standard)."
      },
      {
        id: "sum-2",
        title: "Unsupported software is removed or segregated",
        requirement: "Software must be removed from devices when it becomes unsupported, or removed from scope by using a defined sub-set that prevents all traffic to or from the internet.",
        schoolNote: "Watch for older Windows versions on suite PCs, and for software on science or DT equipment that can't be updated."
      },
      {
        id: "sum-3",
        title: "Automatic updates are enabled where possible",
        requirement: "All software on in-scope devices must have automatic updates enabled where possible.",
        schoolNote: ""
      },
      {
        id: "sum-4",
        title: "Critical and high-risk updates are applied within 14 days",
        requirement: "Software must be updated, including vulnerability fixes, within 14 days of release, where: the update fixes vulnerabilities described by the vendor as 'critical' or 'high risk'; the update addresses vulnerabilities with a CVSS v3 base score of 7 or above; or there are no details of the level of vulnerabilities that the update fixes provided by the vendor. If an update covers any 'critical' or 'high risk' issues then it must be installed within 14 days.",
        schoolNote: "Include firewall and router firmware, access points and mobile devices, not just Windows updates. Applying all updates within 14 days is strongly recommended but not mandatory."
      }
    ]
  },
  {
    id: "user-access-control",
    title: "User Access Control",
    appliesTo: "Servers, desktop computers, laptops, tablets, mobile phones, IaaS, PaaS, SaaS",
    aim: "Ensure that user accounts are assigned to authorised individuals only, and provide access to only those applications, computers and networks that the user needs to carry out their role.",
    items: [
      {
        id: "uac-1",
        title: "There is a process to create and approve user accounts",
        requirement: "Have in place a process to create and approve user accounts.",
        schoolNote: "Link account creation to HR or single central record onboarding for staff, and to admissions for pupils."
      },
      {
        id: "uac-2",
        title: "Users are authenticated with unique credentials",
        requirement: "Authenticate users with unique credentials before granting access to applications or devices.",
        schoolNote: "Avoid shared staff logins such as a generic 'teacher' account."
      },
      {
        id: "uac-3",
        title: "Accounts are removed or disabled when no longer required",
        requirement: "Remove or disable user accounts when they're no longer required (for example, when a user leaves the organisation or after a defined period of account inactivity).",
        schoolNote: "Include leavers, supply staff, students who have left, and old contractor accounts."
      },
      {
        id: "uac-4",
        title: "MFA is implemented, and always used for cloud services",
        requirement: "Implement MFA, where available. Authentication to cloud services must always use MFA. The password element of MFA must be at least 8 characters, with no maximum length restrictions. FIDO2 authenticators (passkeys) are regarded as MFA.",
        schoolNote: "Applies to staff Microsoft 365 or Google Workspace accounts and to cloud MIS logins."
      },
      {
        id: "uac-5",
        title: "Separate accounts are used for administrative activities only",
        requirement: "Use separate accounts to perform administrative activities only (no emailing, web browsing or other standard user activities that may expose administrative privileges to avoidable risks).",
        schoolNote: "The network manager and IT technicians need a separate admin account from their day-to-day account."
      },
      {
        id: "uac-6",
        title: "Special access privileges are removed when no longer required",
        requirement: "Remove or disable special access privileges when no longer required (when a member of staff changes role, for example).",
        schoolNote: ""
      },
      {
        id: "uac-7",
        title: "Passwords are protected against brute-force guessing",
        requirement: "Where authentication uses a password, protect it against brute-force guessing by implementing at least one of: multi-factor authentication; throttling the rate of attempts, allowing no more than 10 guesses in 5 minutes; or locking devices after no more than 10 unsuccessful attempts.",
        schoolNote: ""
      },
      {
        id: "uac-8",
        title: "Password quality is managed with technical controls",
        requirement: "Use technical controls to manage the quality of passwords, including one of: multi-factor authentication; a minimum password length of at least 12 characters, with no maximum length restrictions; or a minimum password length of at least 8 characters, with no maximum length restrictions and automatic blocking of common passwords using a deny list.",
        schoolNote: ""
      },
      {
        id: "uac-9",
        title: "Users are supported to choose unique passwords",
        requirement: "Support users to choose unique passwords by: educating people about avoiding common passwords; encouraging longer passwords made of multiple words (such as three random words); providing usable secure storage for passwords; not enforcing regular password expiry; and not enforcing password complexity requirements.",
        schoolNote: "Can sit within the cyber awareness training required by the DfE cyber security standard."
      },
      {
        id: "uac-10",
        title: "There is a process to change compromised passwords promptly",
        requirement: "Make sure there is an established process in place to change passwords promptly if you know or suspect a password or account has been compromised.",
        schoolNote: ""
      }
    ]
  },
  {
    id: "malware-protection",
    title: "Malware Protection",
    appliesTo: "Servers, desktop computers, laptops, tablets, mobile phones, IaaS, PaaS, SaaS",
    aim: "To restrict execution of known malware and untrusted software, from causing damage or accessing data.",
    items: [
      {
        id: "mp-1",
        title: "A malware protection mechanism is active on every device in scope",
        requirement: "You must make sure that a malware protection mechanism is active on all devices in scope. For each device, you must use at least one of: anti-malware software (for Windows or macOS devices, including servers, desktops and laptops) or application allow listing (for all in-scope devices). The software must be active and kept up to date in accordance with the vendor's instructions.",
        schoolNote: "iPads and Chromebooks usually meet this through application allow listing via the managed app store."
      },
      {
        id: "mp-2",
        title: "Anti-malware software is configured correctly",
        requirement: "If you use anti-malware software it must be configured to: be updated in line with vendor recommendations; prevent malware from running; prevent the execution of malicious code; and prevent connections to malicious websites over the internet.",
        schoolNote: ""
      },
      {
        id: "mp-3",
        title: "Application allow listing is configured correctly",
        requirement: "If you use application allow listing, only approved applications, restricted by code signing, are allowed to execute on devices. You must actively approve such applications before deploying them to devices, and maintain a current list of approved applications. Users must not be able to install any application that is unsigned or has an invalid signature.",
        schoolNote: "Mark as N/A if every device uses anti-malware software instead."
      }
    ]
  },
  {
    id: "recommended",
    title: "Recommended (not assessed)",
    appliesTo: "Good practice the NCSC highlights alongside the five controls",
    aim: "These are not technical requirements of Cyber Essentials, but the NCSC recommends them.",
    items: [
      {
        id: "rec-1",
        title: "An appropriate backup solution is in place",
        requirement: "Backing up your data is not a technical requirement of Cyber Essentials. However, we highly recommend implementing an appropriate backup solution. If you back up your information to a USB stick or an external hard drive, disconnect it from your computer when a backup isn't being done.",
        schoolNote: "The DfE cyber security standard requires a backup plan, and the RPA requires offline backups for academies."
      },
      {
        id: "rec-2",
        title: "Asset management is in place",
        requirement: "Asset management isn't a specific Cyber Essentials control, but effective asset management can help meet all five controls, so it should be considered as a core security function.",
        schoolNote: "Your hardware and software registers for the DfE digital leadership standard can serve this purpose."
      }
    ]
  }
];

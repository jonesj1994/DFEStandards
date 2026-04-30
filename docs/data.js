const STANDARDS_DATA = [
  {
    id: "broadband",
    title: "Broadband",
    isCore: true,
    items: [
      {
        id: "broadband-1",
        title: "Have full fibre broadband connection with appropriate speeds",
        description: "Schools and colleges should have a full fibre broadband connection. The minimum speed requirements are: primary schools - 100 Mbps, secondary schools - 1 Gbps, colleges - 1 Gbps. You should work with your local authority or trust to find the best solution for your setting."
      },
      {
        id: "broadband-2",
        title: "Build resilience into your broadband connection",
        description: "You should have a backup broadband connection in case your primary connection fails. This could be a second fixed-line connection, a 4G/5G mobile connection, or a satellite connection. You should test your backup connection regularly to make sure it works."
      },
      {
        id: "broadband-3",
        title: "Have appropriate safeguarding measures in place",
        description: "You must have appropriate safeguarding measures in place on your broadband connection. This includes filtering and monitoring to protect pupils from harmful online content. You should work with your local authority or trust to make sure your safeguarding measures meet the required standards."
      }
    ]
  },
  {
    id: "cloud-solution",
    title: "Cloud Solution",
    isCore: false,
    items: [
      {
        id: "cloud-1",
        title: "Use cloud solutions as an alternative to locally-hosted systems",
        description: "You should consider using cloud solutions instead of locally-hosted systems where possible. Cloud solutions can offer benefits such as lower upfront costs, easier maintenance, and better accessibility. You should assess the benefits and risks of cloud solutions before making a decision."
      },
      {
        id: "cloud-2",
        title: "Cloud solutions must follow data protection legislation",
        description: "Any cloud solutions you use must comply with data protection legislation, including the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. You should carry out a data protection impact assessment before using any new cloud solution."
      },
      {
        id: "cloud-3",
        title: "Cloud solutions should use ID and access management tools",
        description: "Cloud solutions should use identity and access management (IAM) tools to control who can access your data and systems. This includes using multi-factor authentication (MFA) and role-based access control (RBAC) to ensure that only authorised users can access your systems."
      },
      {
        id: "cloud-4",
        title: "Cloud solutions should work on a range of devices and be available when needed",
        description: "Cloud solutions should be accessible from a range of devices, including laptops, tablets, and smartphones. They should be available when needed, with minimal downtime. You should check the availability and performance of cloud solutions before signing any contracts."
      },
      {
        id: "cloud-5",
        title: "Make sure that appropriate data backup provision is in place",
        description: "You should make sure that appropriate data backup provision is in place for any cloud solutions you use. This includes regular backups of your data, and testing your backups to make sure they can be restored. You should also make sure that your data can be exported from the cloud solution if needed."
      }
    ]
  },
  {
    id: "cyber-security",
    title: "Cyber Security",
    isCore: true,
    items: [
      {
        id: "cyber-1",
        title: "Conduct a cyber risk assessment annually and review every term",
        description: "You should conduct a cyber risk assessment at least once a year and review it every term. The assessment should identify the cyber risks facing your school or college and the controls you have in place to manage those risks. You should use the assessment to prioritise your cyber security improvements."
      },
      {
        id: "cyber-2",
        title: "Create and implement a cyber awareness plan for students and staff",
        description: "You should create and implement a cyber awareness plan for students and staff. This should include training on how to recognise and respond to cyber threats, such as phishing emails and ransomware. You should also make sure that students and staff know how to report cyber incidents."
      },
      {
        id: "cyber-3",
        title: "Secure digital technology and data with anti-malware and a firewall",
        description: "You should secure your digital technology and data with anti-malware software and a firewall. Anti-malware software should be installed on all devices and kept up to date. Your firewall should be configured to block unauthorised access to your network and systems."
      },
      {
        id: "cyber-4",
        title: "Control and secure user accounts and access privileges",
        description: "You should control and secure user accounts and access privileges. This includes using strong passwords, multi-factor authentication (MFA), and role-based access control (RBAC). You should also make sure that user accounts are disabled or deleted when staff leave your school or college."
      },
      {
        id: "cyber-5",
        title: "License digital technology and keep it up to date",
        description: "You should make sure that all digital technology is properly licensed and kept up to date. This includes operating systems, applications, and firmware. You should have a process for applying security patches and updates in a timely manner."
      },
      {
        id: "cyber-6",
        title: "Develop and implement a plan to back up your data and review this every year",
        description: "You should develop and implement a plan to back up your data and review it every year. The plan should include details of what data is backed up, how often, and where it is stored. You should also test your backups regularly to make sure they can be restored."
      }
    ]
  },
  {
    id: "digital-accessibility",
    title: "Digital Accessibility",
    isCore: false,
    items: [
      {
        id: "accessibility-1",
        title: "Include digital accessibility in relevant strategies and policies",
        description: "You should include digital accessibility in your relevant strategies and policies. This includes your digital technology strategy, your equality and diversity policy, and your special educational needs and disability (SEND) policy. You should make sure that your digital technology is accessible to all students and staff, including those with disabilities."
      },
      {
        id: "accessibility-2",
        title: "Hardware and software should support the use of accessibility features",
        description: "The hardware and software you use should support the use of accessibility features. This includes screen readers, magnification software, and alternative input devices. You should test your hardware and software to make sure that accessibility features work correctly."
      },
      {
        id: "accessibility-3",
        title: "Communications should be accessible to all",
        description: "Your communications should be accessible to all students, staff, and parents. This includes making sure that your website, emails, and other communications are accessible to people with disabilities. You should follow the Web Content Accessibility Guidelines (WCAG) 2.1 AA standard for your website and digital communications."
      }
    ]
  },
  {
    id: "digital-leadership",
    title: "Digital Leadership",
    isCore: true,
    items: [
      {
        id: "leadership-1",
        title: "Assign a senior leadership team (SLT) member to be responsible for digital technology",
        description: "You should assign a member of your senior leadership team (SLT) to be responsible for digital technology. This person should have overall responsibility for your digital technology strategy and its implementation. They should also be responsible for ensuring that your digital technology meets the required standards."
      },
      {
        id: "leadership-2",
        title: "Keep registers relating to hardware and systems up to date",
        description: "You should keep registers relating to your hardware and systems up to date. This includes an asset register of all hardware and software, and a network diagram showing how your systems are connected. You should review and update these registers regularly."
      },
      {
        id: "leadership-3",
        title: "Include digital technology within disaster recovery and business continuity plans",
        description: "You should include digital technology within your disaster recovery and business continuity plans. This includes making sure that you have a plan for restoring your digital technology in the event of a major incident, such as a fire, flood, or cyber attack. You should test your plans regularly to make sure they work."
      },
      {
        id: "leadership-4",
        title: "Have a digital technology strategy that is reviewed every year",
        description: "You should have a digital technology strategy that is reviewed every year. The strategy should set out your vision for digital technology and how you plan to achieve it. It should be aligned with your school or college's overall strategy and the DfE's digital and technology standards."
      }
    ]
  },
  {
    id: "filtering-monitoring",
    title: "Filtering and Monitoring",
    isCore: true,
    items: [
      {
        id: "filtering-1",
        title: "Identify and assign roles and responsibilities to manage your filtering and monitoring systems",
        description: "You should identify and assign roles and responsibilities to manage your filtering and monitoring systems. This includes nominating a designated safeguarding lead (DSL) who is responsible for overseeing your filtering and monitoring provision. You should make sure that all staff with responsibilities for filtering and monitoring have the necessary training and support."
      },
      {
        id: "filtering-2",
        title: "Review your filtering and monitoring provision at least once a year",
        description: "You should review your filtering and monitoring provision at least once a year. The review should assess whether your provision is meeting the safeguarding needs of your school or college and whether it is compliant with the relevant legislation and guidance. You should use the review to identify and implement improvements."
      },
      {
        id: "filtering-3",
        title: "Have an active and well-managed filtering system",
        description: "You should have an active and well-managed filtering system that blocks access to harmful online content. Your filtering system should be appropriate for the age and needs of your students and should be regularly reviewed and updated. You should also make sure that your filtering system does not block access to legitimate educational content."
      },
      {
        id: "filtering-4",
        title: "Have effective monitoring strategies that meet the safeguarding needs of your school or college",
        description: "You should have effective monitoring strategies that meet the safeguarding needs of your school or college. This includes monitoring the online activity of students to identify and respond to potential safeguarding concerns. Your monitoring strategies should be proportionate, transparent, and compliant with data protection legislation."
      }
    ]
  },
  {
    id: "laptops-desktops-tablets",
    title: "Laptops, Desktops, Tablets",
    isCore: false,
    items: [
      {
        id: "devices-1",
        title: "Make sure devices meet the needs of your school or college",
        description: "You should make sure that the devices you provide meet the needs of your school or college. This includes making sure that devices are suitable for the educational purposes they are intended for, and that they are accessible to all students and staff. You should consult with teachers and students when selecting devices."
      },
      {
        id: "devices-2",
        title: "Make sure devices are safe and secure",
        description: "You should make sure that all devices are safe and secure. This includes installing anti-malware software and keeping it up to date, enabling device encryption, and using mobile device management (MDM) software to manage and secure devices. You should also make sure that devices are physically secure."
      },
      {
        id: "devices-3",
        title: "Make sure devices meet or exceed the minimum requirements",
        description: "You should make sure that devices meet or exceed the minimum requirements set out in the DfE's digital and technology standards. This includes minimum requirements for processing power, memory, storage, and display resolution. You should review the minimum requirements regularly and update your devices as needed."
      },
      {
        id: "devices-4",
        title: "Make sure devices are energy efficient, and they are bought and disposed of sustainably",
        description: "You should make sure that devices are energy efficient and that they are bought and disposed of sustainably. This includes looking for devices with good energy efficiency ratings and considering the environmental impact of your purchasing decisions. You should also make sure that devices are disposed of responsibly at the end of their life."
      }
    ]
  },
  {
    id: "network-cabling",
    title: "Network Cabling",
    isCore: false,
    items: [
      {
        id: "cabling-1",
        title: "Use the right type and grade of cabling",
        description: "You should use the right type and grade of cabling for your network. For most schools and colleges, this will be Cat6 or Cat6A cabling, which supports speeds of up to 10 Gbps. You should avoid using older cabling standards such as Cat5 or Cat5e, which may not support the speeds required for modern digital technology."
      },
      {
        id: "cabling-2",
        title: "Have cabling professionally installed with proper documentation",
        description: "You should have your cabling professionally installed by a qualified installer. The installer should provide you with documentation of the installation, including a cable schedule, floor plans showing cable routes, and test results for each cable. You should keep this documentation up to date as you make changes to your network."
      },
      {
        id: "cabling-3",
        title: "Plan for future cabling needs",
        description: "You should plan for your future cabling needs. This includes considering how your network may need to grow or change in the future, and making sure that your cabling infrastructure can support those changes. You should also consider the impact of any planned building works on your cabling infrastructure."
      }
    ]
  },
  {
    id: "network-switching",
    title: "Network Switching",
    isCore: true,
    items: [
      {
        id: "switching-1",
        title: "Make sure switches meet performance requirements",
        description: "You should make sure that your network switches meet the performance requirements for your school or college. This includes making sure that switches can handle the volume of network traffic and support the speeds required for modern digital technology. You should review your switching infrastructure regularly and upgrade switches as needed."
      },
      {
        id: "switching-2",
        title: "Have switches that can be centrally managed and monitored",
        description: "You should have network switches that can be centrally managed and monitored. This allows you to configure and monitor your switches from a central location, making it easier to manage your network and respond to problems. You should use a network management system (NMS) to monitor your switches."
      },
      {
        id: "switching-3",
        title: "Secure network switches",
        description: "You should secure your network switches to prevent unauthorised access. This includes changing default passwords, disabling unused ports, and using network access control (NAC) to control which devices can connect to your network. You should also make sure that your switches are kept up to date with the latest firmware."
      },
      {
        id: "switching-4",
        title: "Build resilience into your switching infrastructure",
        description: "You should build resilience into your switching infrastructure to minimise the impact of switch failures. This includes using redundant switches and links, and configuring your network to automatically reroute traffic in the event of a failure. You should test your resilience measures regularly to make sure they work."
      }
    ]
  },
  {
    id: "servers-storage",
    title: "Servers and Storage",
    isCore: false,
    items: [
      {
        id: "servers-1",
        title: "Build redundancy into servers and storage so your systems keep running",
        description: "You should build redundancy into your servers and storage to make sure your systems keep running in the event of a hardware failure. This includes using redundant power supplies, hard drives, and network connections. You should also consider using virtualisation to make it easier to recover from hardware failures."
      },
      {
        id: "servers-2",
        title: "Keep servers and storage secure",
        description: "You should keep your servers and storage secure to prevent unauthorised access. This includes changing default passwords, applying security patches and updates in a timely manner, and using access controls to limit who can access your servers and storage. You should also make sure that your servers and storage are physically secure."
      },
      {
        id: "servers-3",
        title: "Make servers and storage energy efficient",
        description: "You should make your servers and storage as energy efficient as possible. This includes using energy-efficient hardware, consolidating servers using virtualisation, and turning off servers and storage when they are not needed. You should also consider using cloud solutions as an alternative to locally-hosted servers and storage."
      },
      {
        id: "servers-4",
        title: "Make sure servers and storage are kept in a suitable environment",
        description: "You should make sure that your servers and storage are kept in a suitable environment. This includes making sure that the server room or data centre is kept at the right temperature and humidity, has adequate ventilation, and is protected from fire and flooding. You should also make sure that access to the server room or data centre is restricted to authorised personnel."
      }
    ]
  },
  {
    id: "it-support",
    title: "IT Support",
    isCore: false,
    items: [
      {
        id: "support-1",
        title: "Make sure IT support helps you meet the digital and technology standards",
        description: "You should make sure that your IT support helps you meet the DfE's digital and technology standards. This includes making sure that your IT support provider understands the standards and can help you implement them. You should include the standards in any contracts or service level agreements with your IT support provider."
      },
      {
        id: "support-2",
        title: "Establish what IT support you need",
        description: "You should establish what IT support you need to run your school or college effectively. This includes considering the size and complexity of your IT infrastructure, the technical skills of your staff, and the level of support you need to meet the DfE's digital and technology standards. You should document your IT support requirements and review them regularly."
      },
      {
        id: "support-3",
        title: "Set clear expectations with your IT support service",
        description: "You should set clear expectations with your IT support service. This includes agreeing on service level agreements (SLAs) that specify how quickly problems will be resolved, and making sure that your IT support provider understands your priorities. You should review the performance of your IT support service regularly."
      },
      {
        id: "support-4",
        title: "Establish effective logging and management of support requests",
        description: "You should establish effective logging and management of support requests. This includes using a help desk system to log and track support requests, and making sure that all support requests are resolved in a timely manner. You should use data from the help desk system to identify recurring problems and improve your IT infrastructure."
      },
      {
        id: "support-5",
        title: "Review your IT support annually",
        description: "You should review your IT support at least once a year. The review should assess whether your IT support is meeting your needs and helping you meet the DfE's digital and technology standards. You should use the review to identify improvements and update your IT support arrangements as needed."
      }
    ]
  },
  {
    id: "wireless-network",
    title: "Wireless Network",
    isCore: true,
    items: [
      {
        id: "wireless-1",
        title: "Make sure your wireless network meets performance requirements",
        description: "You should make sure that your wireless network meets the performance requirements for your school or college. This includes making sure that your wireless network can handle the volume of devices and traffic, and supports the speeds required for modern digital technology. You should review your wireless network regularly and upgrade it as needed."
      },
      {
        id: "wireless-2",
        title: "Make sure you have full wireless coverage across your school or college site",
        description: "You should make sure that you have full wireless coverage across your school or college site. This includes making sure that all classrooms, common areas, and outdoor spaces have adequate wireless coverage. You should carry out a wireless site survey to identify any areas with poor coverage and address them."
      },
      {
        id: "wireless-3",
        title: "Make sure your wireless network is centrally managed",
        description: "You should make sure that your wireless network is centrally managed. This allows you to configure and monitor your wireless network from a central location, making it easier to manage and troubleshoot. You should use a wireless network management system to monitor the performance and security of your wireless network."
      },
      {
        id: "wireless-4",
        title: "Make sure your wireless network is secure",
        description: "You should make sure that your wireless network is secure. This includes using WPA3 encryption, changing default passwords, and using network access control (NAC) to control which devices can connect to your network. You should also make sure that your wireless network is segmented to separate staff and student traffic."
      }
    ]
  }
];

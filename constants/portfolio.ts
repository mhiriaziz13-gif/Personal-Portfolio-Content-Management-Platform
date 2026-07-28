export type SkillCategory = {
  title: string;
  skills: string[];
};

export type Project = {
  title: string;
  description: string;
  image: string;
  tags: string[];
};

export type Experience = {
  company: string;
  role: string;
  date: string;
  location: string;
  points: string[];
  iconBg: string;
  logo?: string;
  logoAlt?: string;
};

export type ResumeAsset = {
  title: string;
  pdfPath: string;
  docxPath: string;
  available: boolean;
};

export const profile = {
  name: "Ahmed Aziz Mhiri",
  initials: "AAM",
  avatarPath: "/profile/avatar.png",
  location: "Sousse, Tunisia",
  email: "mhiriaziz13@gmail.com",
  linkedIn: "https://linkedin.com/in/ahmed-aziz-mhiri",
  linkedInLabel: "linkedin.com/in/ahmed-aziz-mhiri",
  github: "https://github.com/mhiriaziz13-gif",
  githubLabel: "github.com/mhiriaziz13-gif",
  availability:
    "International full-time availability from October 2027; selected freelance projects available now.",
  mainTitle: "Data-Driven Marketing & Commercial Analytics",
  secondaryLine:
    "Marketing Analytics | Commercial Analytics | Business Intelligence | Process Automation",
  tagline: "Turning Data into Commercial Growth",
  shortProfile:
    "Master's student in Big Data Analytics & E-Commerce at IHEC Carthage with a completed Business Intelligence degree. I combine data analysis, digital marketing, process automation and commercial understanding to support customer journeys, operational reliability and decision-making.",
  about:
    "I work at the intersection of data, business context and automation, turning operational and customer information into clearer decisions, smoother workflows and stronger commercial visibility.",
  aboutFocus: [
    "Marketing and commercial analytics",
    "Auditable automation and reporting",
    "Business intelligence for operational decisions",
  ],
} as const;

export const dynamicTitles = [
  "Marketing Data Analyst",
  "Commercial Data Analyst",
  "Business Intelligence Analyst",
  "Revenue Operations Analyst",
  "CRM & Marketing Automation Specialist",
  "Process Automation Analyst",
  "Data Operations Analyst",
] as const;

export const navLinks = [
  { title: "Home", href: "/" },
  { title: "About", href: "/about" },
  { title: "Expertise", href: "/expertise" },
  { title: "Projects", href: "/projects" },
  { title: "Experience", href: "/experience" },
  { title: "CV", href: "/resume" },
  { title: "Contact", href: "/contact" },
] as const;

export const skillCategories: SkillCategory[] = [
  {
    title: "Data & Business Intelligence",
    skills: [
      "Data Analysis",
      "KPI Analysis",
      "Business Intelligence",
      "Commercial Analytics",
      "Marketing Analytics",
      "Data Visualization",
      "Financial Reporting",
      "Excel",
      "Reporting",
    ],
  },
  {
    title: "Marketing & Customer Growth",
    skills: [
      "Digital Marketing",
      "Customer Insights",
      "Customer Journey",
      "Local SEO",
      "Email Marketing",
      "Paid Social",
      "Social Media Strategy",
      "E-Commerce",
    ],
  },
  {
    title: "Automation & Operations",
    skills: [
      "UiPath",
      "Process Automation",
      "Business Rules Automation",
      "JSON",
      "HTML Reporting",
      "Workflow Automation",
      "Booking Reconciliation",
      "Invoice Control",
      "Auditability",
    ],
  },
  {
    title: "Technical Stack",
    skills: [
      "PostgreSQL",
      "Supabase",
      "Next.js",
      "TypeScript",
      "Vercel",
      "GitHub",
      "Angular",
      "Spring Boot",
      "REST APIs",
      "RAG",
      "Ollama",
      "LLaMA 3.2",
    ],
  },
];

export const projects: Project[] = [
  {
    title: "RPA for Invoice Control & Booking Reconciliation",
    description:
      "UiPath workflow that links invoice data, vouchers, reservations and business rules to create a more structured and auditable control process.",
    image: "/projects/project-1.png",
    tags: [
      "UiPath",
      "JSON",
      "HTML Reporting",
      "Business Rules Automation",
      "Process Automation",
    ],
  },
  {
    title: "Digital Transformation for a Men's Barbershop",
    description:
      "Website, online booking, local SEO, social content and customer communication designed around a smoother digital journey.",
    image: "/projects/project-2.png",
    tags: [
      "Digital Marketing",
      "Local SEO",
      "Online Booking",
      "Email Marketing",
      "Paid Social",
    ],
  },
  {
    title: "VERMEG AI-Ready E-Learning Prototype",
    description:
      "Two-person internship prototype for an AI-ready e-learning experience. My contribution focused on chatbot functionality and selected application services; the prototype was not deployed to production.",
    image: "/projects/project-3.png",
    tags: ["AI Prototype", "Team Project", "Angular", "Spring Boot", "Ollama", "RAG"],
  },
  {
    title: "Library Management Application",
    description:
      "Full-stack library-management application using Angular, Spring Boot, REST APIs and relational databases.",
    image: "/projects/project-1.png",
    tags: ["Angular", "Spring Boot", "REST APIs", "Relational Databases"],
  },
  {
    title: "Hotel KPI & Cost Control Analysis",
    description:
      "Analysis of hotel occupancy, operational costs, revenue-related KPIs, budget variance and financial reporting.",
    image: "/projects/project-2.png",
    tags: [
      "Excel",
      "KPI Analysis",
      "Financial Reporting",
      "Variance Analysis",
      "Business Intelligence",
    ],
  },
];

export const experiences: Experience[] = [
  {
    company: "Sunshine Vacances France",
    role: "Head of IT Services | Process Automation & Business Systems",
    date: "Jul 2025 - Present",
    location: "Sousse, Tunisia",
    iconBg: "#2a0e61",
    logo: "/companies/sunshine-vacances.png",
    logoAlt: "Sunshine Vacances France logo",
    points: [
      "Led business-process improvement initiatives for tourism operations, with a focus on automation, data reliability and auditability.",
      "Designed and expanded a UiPath workflow for invoice validation and reconciliation across invoices, vouchers, reservations and stay-related data.",
      "Automated business rules covering room rates, board types, discounts, supplements and special offers.",
      "Generated structured JSON outputs and HTML reports for review and audit follow-up.",
    ],
  },
  {
    company: "Maison Salina",
    role: "Commercial & Digital Marketing Manager",
    date: "Apr 2025 - Sep 2025",
    location: "Sousse, Tunisia",
    iconBg: "#0f766e",
    logo: "/companies/maison-salina.png",
    logoAlt: "Maison Salina logo",
    points: [
      "Led commercial and digital initiatives for a long-established home-furnishing business.",
      "Supported visibility, customer engagement and commercial growth.",
      "Developed digital marketing initiatives aligned with commercial objectives and brand positioning.",
      "Supported strategic collaborations and online communication.",
    ],
  },
  {
    company: "ChicChac - Men's Barbershop, France",
    role: "Digital Marketing & Automation Consultant",
    date: "Feb 2025 - Jul 2025",
    location: "Noisy-le-Grand, France",
    iconBg: "#1d4ed8",
    logo: "/companies/chicchac.png",
    logoAlt: "ChicChac logo",
    points: [
      "Led a digital transformation project focused on online visibility, booking experience and digital customer communication.",
      "Built a website with online booking and activity monitoring.",
      "Improved local SEO.",
      "Supported Instagram and TikTok content, email marketing, paid social activity and a Planity partnership.",
    ],
  },
  {
    company: "VERMEG for Banking & Insurance Software",
    role: "AI & Full-Stack Development Intern",
    date: "Feb 2025 - May 2025",
    location: "Tunis, Tunisia",
    iconBg: "#6d28d9",
    logo: "/companies/vermeg.png",
    logoAlt: "VERMEG logo",
    points: [
      "Co-developed a demonstrable AI-ready e-learning prototype in a two-person team; focused on chatbot functionality and selected application services.",
      "Applied Angular, Spring Boot, Ollama and RAG concepts and contributed to integration, secure access, event-driven communication, containerisation and observability concepts. Prototype only; not deployed to production.",
    ],
  },
  {
    company: "El Mouradi Hotels",
    role: "Management Controller",
    date: "Jul 2024 - Sep 2024",
    location: "Sousse, Tunisia",
    iconBg: "#0369a1",
    logo: "/companies/el-mouradi.png",
    logoAlt: "El Mouradi Hotels logo",
    points: [
      "Analysed occupancy, operational costs and revenue-related KPIs.",
      "Contributed to budget preparation, variance analysis and financial reporting.",
      "Supported cost-control opportunities and structured performance analyses for management decision-making.",
    ],
  },
  {
    company: "ArabSoft",
    role: "Full-Stack Development Intern",
    date: "Jun 2024 - Aug 2024",
    location: "Tunis, Tunisia",
    iconBg: "#7c2d12",
    logo: "/companies/arab-soft.png",
    logoAlt: "ArabSoft logo",
    points: [
      "Built a full-stack library-management application using Angular, Spring Boot, REST APIs and relational databases.",
      "Implemented core management, search and real-time borrowing-tracking functions.",
    ],
  },
  {
    company: "El Mouradi Hotels",
    role: "Management Control Intern",
    date: "Jun 2023 - Sep 2023",
    location: "Sousse, Tunisia",
    iconBg: "#155e75",
    logo: "/companies/el-mouradi.png",
    logoAlt: "El Mouradi Hotels logo",
    points: [
      "Analysed expenses, operational indicators and budget variances.",
      "Supported financial reporting, KPI monitoring and cost-control initiatives.",
    ],
  },
];

export const resumes: ResumeAsset[] = [
  {
    title: "English Professional CV",
    pdfPath: "/cv/Ahmed_Aziz_Mhiri_CV_English.pdf",
    docxPath: "/cv/Ahmed_Aziz_Mhiri_CV_English.docx",
    available: true,
  },
  {
    title: "French CV",
    pdfPath: "/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf",
    docxPath: "/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx",
    available: true,
  },
  {
    title: "ATS CV",
    pdfPath: "/cv/Ahmed_Aziz_Mhiri_CV_ATS.pdf",
    docxPath: "/cv/Ahmed_Aziz_Mhiri_CV_ATS.docx",
    available: true,
  },
  {
    title: "Canadian CV",
    pdfPath: "/cv/Ahmed_Aziz_Mhiri_CV_Canada.pdf",
    docxPath: "/cv/Ahmed_Aziz_Mhiri_CV_Canada.docx",
    available: true,
  },
];





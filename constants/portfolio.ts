import { publicIdentity } from "@/lib/seo/config";

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

const getProfileLabel = (value: string) => {
  const url = new URL(value);
  return `${url.hostname}${url.pathname}`.replace(/\/$/, "");
};

export const profile = {
  name: publicIdentity.name,
  initials: "AAM",
  avatarPath: "/profile/avatar.png",
  location: "Sousse, Tunisia",
  email: "mhiriaziz13@gmail.com",
  linkedIn: publicIdentity.linkedInUrl,
  linkedInLabel: getProfileLabel(publicIdentity.linkedInUrl),
  github: publicIdentity.githubUrl,
  githubLabel: getProfileLabel(publicIdentity.githubUrl),
  availability:
    "Open to selected freelance projects and building toward international full-time opportunities from 2027.",
  mainTitle: "Marketing & Commercial Analyst",
  secondaryLine:
    "Business Intelligence · Big Data & AI · CRM & Marketing Automation · Digital Transformation",
  tagline:
    "Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.",
  shortProfile:
    "Digital Transformation Project Manager at El Mouradi Hotels and Master's candidate in Big Data Analytics & E-Commerce, combining Marketing & Commercial Analytics, Business Intelligence, automation, AI and engineering to improve decisions, workflows and digital operations.",
  about:
    "I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.\n\n" +
    "At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.\n\n" +
    "My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering, with hands-on experience across tourism, hospitality and digital services. I use AI as an accelerator—not a substitute for judgment: the objective is to frame the right business problem, choose meaningful KPIs, validate data and model outputs, understand the architecture behind the solution and translate analysis into concrete marketing and commercial actions.\n\n" +
    "I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage, covering Big Data, Machine Learning, Deep Learning, Artificial Intelligence, NoSQL databases, cloud/data platforms and applied analytics.\n\n" +
    "My professional focus is Marketing & Commercial Analytics, Business Intelligence, Customer Insights, CRM & Marketing Automation, Big Data & AI and Digital Transformation.",
  aboutFocus: [
    "Marketing & Commercial Analytics",
    "Business Intelligence & Decision Support",
    "Big Data, AI & Digital Transformation",
  ],
} as const;

export const dynamicTitles = [
  "Marketing & Commercial Analyst",
  "Business Intelligence Analyst",
  "Marketing Data Analyst",
  "CRM & Marketing Automation Analyst",
  "Digital Transformation Analyst",
] as const;

export const navLinks = [
  {
    title: "Home",
    href: "/",
    navigationOrder: 0,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Projects",
    href: "/projects",
    navigationOrder: 10,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Experience",
    href: "/experience",
    navigationOrder: 20,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Expertise",
    href: "/expertise",
    navigationOrder: 30,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "About",
    href: "/about",
    navigationOrder: 40,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Contact",
    href: "/contact",
    navigationOrder: 50,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Resume",
    href: "/resume",
    navigationOrder: 60,
    showInNavigation: true,
    showInFooter: true,
    kind: "resume",
  },
  {
    title: "Education",
    href: "/education",
    navigationOrder: 70,
    showInNavigation: false,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Certifications",
    href: "/certifications",
    navigationOrder: 80,
    showInNavigation: false,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Volunteering",
    href: "/about#volunteering",
    navigationOrder: 90,
    showInNavigation: false,
    showInFooter: true,
    kind: "link",
  },
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

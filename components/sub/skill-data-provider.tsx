import type { IconType } from "react-icons";
import {
  FaBullhorn,
  FaChartColumn,
  FaChartLine,
  FaChartPie,
  FaClipboardCheck,
  FaCode,
  FaDatabase,
  FaFileCode,
  FaFileExcel,
  FaFileInvoice,
  FaRoute,
  FaUsers,
} from "react-icons/fa6";
import {
  SiAngular,
  SiApache,
  SiDjango,
  SiDocker,
  SiGithub,
  SiGoogleanalytics,
  SiGooglesearchconsole,
  SiJsonwebtokens,
  SiMailchimp,
  SiMeta,
  SiMongodb,
  SiNextdotjs,
  SiOllama,
  SiPostgresql,
  SiPython,
  SiShopify,
  SiSpringboot,
  SiSupabase,
  SiTypescript,
  SiUipath,
  SiVercel,
} from "react-icons/si";
import {
  TbApi,
  TbAutomation,
  TbBrandBooking,
  TbChartPie,
  TbFileAnalytics,
  TbReportAnalytics,
  TbReportMoney,
  TbRobot,
  TbRoute,
  TbSocial,
} from "react-icons/tb";

type SkillDataProviderProps = {
  name: string;
};

type SkillIcon = {
  icon: IconType;
  color: string;
};

const skillIcons: Record<string, SkillIcon> = {
  // Data & Business Intelligence
  "Data Analysis": {
    icon: TbFileAnalytics,
    color: "#38bdf8",
  },
  "KPI Analysis": {
    icon: FaChartLine,
    color: "#22d3ee",
  },
  "Business Intelligence": {
    icon: FaChartPie,
    color: "#a78bfa",
  },
  "Commercial Analytics": {
    icon: FaChartColumn,
    color: "#60a5fa",
  },
  "Marketing Analytics": {
    icon: SiGoogleanalytics,
    color: "#fbbc04",
  },
  "Data Visualization": {
    icon: TbChartPie,
    color: "#67e8f9",
  },
  "Financial Reporting": {
    icon: TbReportMoney,
    color: "#34d399",
  },
  Excel: {
    icon: FaFileExcel,
    color: "#21a366",
  },
  Reporting: {
    icon: TbReportAnalytics,
    color: "#93c5fd",
  },

  // Marketing & Customer Growth
  "Digital Marketing": {
    icon: FaBullhorn,
    color: "#fb7185",
  },
  "Customer Insights": {
    icon: FaUsers,
    color: "#f0abfc",
  },
  "Customer Journey": {
    icon: TbRoute,
    color: "#2dd4bf",
  },
  "Local SEO": {
    icon: SiGooglesearchconsole,
    color: "#4285f4",
  },
  "Email Marketing": {
    icon: SiMailchimp,
    color: "#ffe01b",
  },
  "CRM & Marketing Automation": {
    icon: TbAutomation,
    color: "#c084fc",
  },
  "Paid Social": {
    icon: SiMeta,
    color: "#0866ff",
  },
  "Social Media Strategy": {
    icon: TbSocial,
    color: "#38bdf8",
  },
  "E-Commerce": {
    icon: SiShopify,
    color: "#95bf47",
  },

  // Automation, AI & Operations
  UiPath: {
    icon: SiUipath,
    color: "#ff6d00",
  },
  "Process Automation": {
    icon: TbAutomation,
    color: "#c084fc",
  },
  "Business Rules Automation": {
    icon: FaClipboardCheck,
    color: "#818cf8",
  },
  "Workflow Automation": {
    icon: FaRoute,
    color: "#22d3ee",
  },
  "Booking Reconciliation": {
    icon: TbBrandBooking,
    color: "#60a5fa",
  },
  "Invoice Control": {
    icon: FaFileInvoice,
    color: "#e879f9",
  },
  Auditability: {
    icon: FaClipboardCheck,
    color: "#34d399",
  },
  RAG: {
    icon: TbRobot,
    color: "#a78bfa",
  },
  Ollama: {
    icon: SiOllama,
    color: "#ffffff",
  },
  JSON: {
    icon: SiJsonwebtokens,
    color: "#ffffff",
  },
  "HTML Reporting": {
    icon: FaFileCode,
    color: "#f97316",
  },

  // Technical Implementation & Integration
  Python: {
    icon: SiPython,
    color: "#3776ab",
  },
  "SQL & Relational Databases": {
    icon: FaDatabase,
    color: "#38bdf8",
  },
  PostgreSQL: {
    icon: SiPostgresql,
    color: "#4169e1",
  },
  MongoDB: {
    icon: SiMongodb,
    color: "#47a248",
  },
  Supabase: {
    icon: SiSupabase,
    color: "#3ecf8e",
  },
  "REST APIs": {
    icon: TbApi,
    color: "#22d3ee",
  },
  Angular: {
    icon: SiAngular,
    color: "#dd0031",
  },
  "Spring Boot": {
    icon: SiSpringboot,
    color: "#6db33f",
  },
  Django: {
    icon: SiDjango,
    color: "#44b78b",
  },
  Apache: {
    icon: SiApache,
    color: "#d22128",
  },
  Docker: {
    icon: SiDocker,
    color: "#2496ed",
  },
  "Next.js": {
    icon: SiNextdotjs,
    color: "#ffffff",
  },
  TypeScript: {
    icon: SiTypescript,
    color: "#3178c6",
  },
  GitHub: {
    icon: SiGithub,
    color: "#ffffff",
  },
  Vercel: {
    icon: SiVercel,
    color: "#ffffff",
  },
};

const fallbackSkill: SkillIcon = {
  icon: FaCode,
  color: "#c4b5fd",
};

export const SkillDataProvider = ({
  name,
}: SkillDataProviderProps) => {
  const skill = skillIcons[name] ?? fallbackSkill;
  const Icon = skill.icon;

  return (
    <div
      className="group flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-lg border border-[#7042f86b] bg-[#08021c]/70 p-4 text-center shadow-[inset_0_0_14px_rgba(191,151,255,0.12)] backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-[#0d0626]/80"
      aria-label={name}
      title={name}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/5 shadow-[0_0_24px_rgba(112,66,248,0.18)]">
        <Icon
          className="h-7 w-7 transition group-hover:scale-110"
          style={{ color: skill.color }}
          aria-hidden="true"
        />
      </span>

      <span className="text-xs font-medium leading-5 text-gray-200 sm:text-sm">
        {name}
      </span>
    </div>
  );
};
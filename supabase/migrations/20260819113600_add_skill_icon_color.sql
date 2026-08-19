alter table public.skills
  add column if not exists icon_color text;

alter table public.skills
  drop constraint if exists skills_icon_color_format_check;

alter table public.skills
  add constraint skills_icon_color_format_check
  check (
  icon_color is null
  or icon_color = ''
  or icon_color ~ '^#[0-9A-Fa-f]{6}$'
);

comment on column public.skills.icon_key is
  'React Icons export key used by the public skill renderer, for example SiPython, FaChartLine or TbRobot.';

comment on column public.skills.icon_color is
  'Optional six-digit hexadecimal color used by the public skill icon renderer.';

-- One-time normalization of existing CMS skill icon metadata.
update public.skills as s
set
  icon_key = v.icon_key,
  icon_color = v.icon_color
from (
  values
    ('Data & Business Intelligence', 'Marketing Analytics', 'SiGoogleanalytics', '#fbbc04'),
    ('Data & Business Intelligence', 'Commercial Analytics', 'FaChartColumn', '#60a5fa'),
    ('Data & Business Intelligence', 'Business Intelligence', 'FaChartPie', '#a78bfa'),
    ('Data & Business Intelligence', 'Data Analysis', 'TbFileAnalytics', '#38bdf8'),
    ('Data & Business Intelligence', 'KPI Analysis', 'FaChartLine', '#22d3ee'),
    ('Data & Business Intelligence', 'Data Visualization', 'TbChartPie', '#67e8f9'),
    ('Data & Business Intelligence', 'Financial Reporting', 'TbReportMoney', '#34d399'),
    ('Data & Business Intelligence', 'Excel', 'FaFileExcel', '#21a366'),
    ('Data & Business Intelligence', 'Reporting', 'TbReportAnalytics', '#93c5fd'),

    ('Marketing & Customer Growth', 'Customer Insights', 'FaUsers', '#f0abfc'),
    ('Marketing & Customer Growth', 'Customer Journey', 'TbRoute', '#2dd4bf'),
    ('Marketing & Customer Growth', 'CRM & Marketing Automation', 'TbAutomation', '#c084fc'),
    ('Marketing & Customer Growth', 'Digital Marketing', 'FaBullhorn', '#fb7185'),
    ('Marketing & Customer Growth', 'E-Commerce', 'SiShopify', '#95bf47'),
    ('Marketing & Customer Growth', 'Local SEO', 'SiGooglesearchconsole', '#4285f4'),
    ('Marketing & Customer Growth', 'Paid Social', 'SiMeta', '#0866ff'),
    ('Marketing & Customer Growth', 'Social Media Strategy', 'TbSocial', '#38bdf8'),

    ('Automation & Operations', 'Process Automation', 'TbAutomation', '#c084fc'),
    ('Automation & Operations', 'UiPath', 'SiUipath', '#ff6d00'),
    ('Automation & Operations', 'Workflow Automation', 'FaRoute', '#22d3ee'),
    ('Automation & Operations', 'Business Rules Automation', 'FaClipboardCheck', '#818cf8'),
    ('Automation & Operations', 'Booking Reconciliation', 'TbBrandBooking', '#60a5fa'),
    ('Automation & Operations', 'Invoice Control', 'FaFileInvoice', '#e879f9'),
    ('Automation & Operations', 'Auditability', 'FaClipboardCheck', '#34d399'),
    ('Automation & Operations', 'JSON', 'SiJsonwebtokens', '#ffffff'),
    ('Automation & Operations', 'HTML Reporting', 'FaFileCode', '#f97316'),

    ('Big Data & AI — Academic & Applied', 'Big Data Analytics', 'TbReportAnalytics', '#38bdf8'),
    ('Big Data & AI — Academic & Applied', 'Machine Learning', 'TbRobot', '#a78bfa'),
    ('Big Data & AI — Academic & Applied', 'Deep Learning', 'FaCode', '#c084fc'),
    ('Big Data & AI — Academic & Applied', 'Artificial Intelligence', 'TbRobot', '#818cf8'),
    ('Big Data & AI — Academic & Applied', 'NoSQL', 'FaDatabase', '#47a248'),
    ('Big Data & AI — Academic & Applied', 'Data Engineering', 'FaDatabase', '#60a5fa'),
    ('Big Data & AI — Academic & Applied', 'Azure / Cloud & Data Platforms', 'FaDatabase', '#0078d4'),
    ('Big Data & AI — Academic & Applied', 'ELK Stack', 'TbFileAnalytics', '#f59e0b'),
    ('Big Data & AI — Academic & Applied', 'RAG', 'TbRobot', '#a78bfa'),
    ('Big Data & AI — Academic & Applied', 'Ollama', 'SiOllama', '#ffffff'),

    ('Technical Stack', 'Python', 'SiPython', '#3776ab'),
    ('Technical Stack', 'SQL & Relational Databases', 'FaDatabase', '#38bdf8'),
    ('Technical Stack', 'PostgreSQL', 'SiPostgresql', '#4169e1'),
    ('Technical Stack', 'MongoDB', 'SiMongodb', '#47a248'),
    ('Technical Stack', 'REST APIs', 'TbApi', '#22d3ee'),
    ('Technical Stack', 'Supabase', 'SiSupabase', '#3ecf8e'),
    ('Technical Stack', 'Angular', 'SiAngular', '#dd0031'),
    ('Technical Stack', 'Spring Boot', 'SiSpringboot', '#6db33f'),
    ('Technical Stack', 'Docker', 'SiDocker', '#2496ed'),
    ('Technical Stack', 'Next.js', 'SiNextdotjs', '#ffffff'),
    ('Technical Stack', 'GitHub', 'SiGithub', '#ffffff'),
    ('Technical Stack', 'TypeScript', 'SiTypescript', '#3178c6'),
    ('Technical Stack', 'Vercel', 'SiVercel', '#ffffff')
) as v(category, name, icon_key, icon_color)
where
  s.category = v.category
  and s.name = v.name;
alter table public.skills
  drop constraint if exists skills_icon_key_format_check;

alter table public.skills
  add constraint skills_icon_key_format_check
  check (
    icon_key is null
    or icon_key = ''
    or icon_key ~ '^(Fa|Si|Tb)[A-Za-z0-9]+$'
  );
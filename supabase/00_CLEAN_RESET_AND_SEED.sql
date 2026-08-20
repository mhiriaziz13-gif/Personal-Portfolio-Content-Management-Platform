-- ============================================================
-- CLEAN RESET + SEED FOR AHMED AZIZ MHIRI PORTFOLIO
-- Use this on a broken/legacy Supabase CMS database.
-- It resets only the public portfolio CMS tables. It does NOT delete auth.users.
-- Execute this whole file once in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

drop policy if exists "Public can read public portfolio storage" on storage.objects;
drop policy if exists "Admins manage portfolio storage" on storage.objects;

drop table if exists public.project_sections cascade;
drop table if exists public.projects cascade;
drop table if exists public.profile cascade;
drop table if exists public.hero cascade;
drop table if exists public.about cascade;
drop table if exists public.skills cascade;
drop table if exists public.experience cascade;
drop table if exists public.education cascade;
drop table if exists public.certifications cascade;
drop table if exists public.resumes cascade;
drop table if exists public.social_links cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.contact_messages cascade;
drop table if exists public.uploads cascade;
drop table if exists public.admin_audit_logs cascade;
drop table if exists public.admin_security_preferences cascade;
drop table if exists public.admin_remembered_devices cascade;
drop table if exists public.admins cascade;

drop function if exists public.is_admin() cascade;
drop function if exists public.set_updated_at() cascade;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create table public.profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  initials text,
  headline text,
  secondary_line text,
  tagline text,
  location text,
  email text,
  linkedin_url text,
  linkedin_label text,
  github_url text,
  github_label text,
  avatar_url text,
  availability text,
  short_bio text,
  about_text text,
  about_focus text[] not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hero (
  id uuid primary key default gen_random_uuid(),
  eyebrow text,
  title text,
  subtitle text,
  tagline text,
  dynamic_titles text[] not null default '{}',
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.about (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  highlights text[] not null default '{}',
  avatar_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  icon_key text,
  description text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type text,
  summary text,
  description text,
  cover_image_url text,
  placeholder_image_url text,
  tags text[] not null default '{}',
  tools text[] not null default '{}',
  github_url text,
  linkedin_url text,
  featured boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  body text,
  bullets text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  location text,
  start_date text,
  end_date text,
  date_label text,
  icon_bg text,
  logo_url text,
  logo_alt text,
  points text[] not null default '{}',
  tools text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  degree text not null,
  start_date text,
  end_date text,
  status text,
  location text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issuer text,
  date text,
  credential_url text,
  credential_id text,
  image_url text,
  description text,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  variant text not null unique,
  pdf_url text,
  docx_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  icon_key text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  source text,
  user_agent_hash text,
  ip_hash text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text,
  mime_type text,
  size_bytes integer,
  original_name text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table public.admin_security_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mfa_required boolean not null default false,
  remember_device_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_remembered_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  user_agent_hash text,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create trigger set_profile_updated_at before update on public.profile for each row execute function public.set_updated_at();
create trigger set_hero_updated_at before update on public.hero for each row execute function public.set_updated_at();
create trigger set_about_updated_at before update on public.about for each row execute function public.set_updated_at();
create trigger set_skills_updated_at before update on public.skills for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_project_sections_updated_at before update on public.project_sections for each row execute function public.set_updated_at();
create trigger set_experience_updated_at before update on public.experience for each row execute function public.set_updated_at();
create trigger set_education_updated_at before update on public.education for each row execute function public.set_updated_at();
create trigger set_certifications_updated_at before update on public.certifications for each row execute function public.set_updated_at();
create trigger set_resumes_updated_at before update on public.resumes for each row execute function public.set_updated_at();
create trigger set_social_links_updated_at before update on public.social_links for each row execute function public.set_updated_at();
create trigger set_admin_security_preferences_updated_at before update on public.admin_security_preferences for each row execute function public.set_updated_at();

create index idx_projects_slug on public.projects(slug);
create index idx_projects_published_sort on public.projects(published, sort_order);
create index idx_project_sections_project_order on public.project_sections(project_id, sort_order);
create index idx_skills_category_order on public.skills(category, sort_order);
create index idx_experience_published_order on public.experience(published, sort_order);
create index idx_resumes_published_order on public.resumes(published, sort_order);
create index idx_social_links_published_order on public.social_links(published, sort_order);
create index idx_certifications_published_sort on public.certifications(published, sort_order);
create index idx_contact_messages_created_at on public.contact_messages(created_at desc);
create index idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);
create index idx_remembered_devices_user_active on public.admin_remembered_devices(user_id, expires_at) where revoked_at is null;

alter table public.admins enable row level security;
alter table public.profile enable row level security;
alter table public.hero enable row level security;
alter table public.about enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_sections enable row level security;
alter table public.experience enable row level security;
alter table public.education enable row level security;
alter table public.certifications enable row level security;
alter table public.resumes enable row level security;
alter table public.social_links enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.uploads enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_security_preferences enable row level security;
alter table public.admin_remembered_devices enable row level security;

create policy "Admins can read admins" on public.admins for select to authenticated using (public.is_admin());
create policy "Admins can manage admins" on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Published profile is readable" on public.profile for select to anon, authenticated using (published = true);
create policy "Published hero is readable" on public.hero for select to anon, authenticated using (published = true);
create policy "Published about is readable" on public.about for select to anon, authenticated using (published = true);
create policy "Published skills are readable" on public.skills for select to anon, authenticated using (published = true);
create policy "Published projects are readable" on public.projects for select to anon, authenticated using (published = true);
create policy "Published project sections are readable" on public.project_sections for select to anon, authenticated using (exists (select 1 from public.projects p where p.id = project_sections.project_id and p.published = true));
create policy "Published experience is readable" on public.experience for select to anon, authenticated using (published = true);
create policy "Published education is readable" on public.education for select to anon, authenticated using (published = true);
create policy "Published certifications are readable" on public.certifications for select to anon, authenticated using (published = true);
create policy "Published resumes are readable" on public.resumes for select to anon, authenticated using (published = true);
create policy "Published social links are readable" on public.social_links for select to anon, authenticated using (published = true);

create policy "Admins manage profile" on public.profile for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage hero" on public.hero for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage about" on public.about for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage skills" on public.skills for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage project sections" on public.project_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage experience" on public.experience for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage education" on public.education for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage certifications" on public.certifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage resumes" on public.resumes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage social links" on public.social_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read contact messages" on public.contact_messages for select to authenticated using (public.is_admin());
create policy "Admins update contact messages" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage uploads" on public.uploads for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read audit logs" on public.admin_audit_logs for select to authenticated using (public.is_admin());
create policy "Admins insert audit logs" on public.admin_audit_logs for insert to authenticated with check (public.is_admin());
create policy "Admins read own security preferences" on public.admin_security_preferences for select to authenticated using (user_id = auth.uid() and public.is_admin());
create policy "Admins manage own security preferences" on public.admin_security_preferences for all to authenticated using (user_id = auth.uid() and public.is_admin()) with check (user_id = auth.uid() and public.is_admin());
create policy "Admins read own remembered devices" on public.admin_remembered_devices for select to authenticated using (user_id = auth.uid() and public.is_admin());
create policy "Admins revoke own remembered devices" on public.admin_remembered_devices for update to authenticated using (user_id = auth.uid() and public.is_admin()) with check (user_id = auth.uid() and public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('project-images', 'project-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('resumes', 'resumes', true, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('uploads', 'uploads', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "Public can read public portfolio storage" on storage.objects for select to anon, authenticated using (bucket_id in ('public-assets', 'project-images', 'resumes'));
create policy "Admins manage portfolio storage" on storage.objects for all to authenticated using (public.is_admin() and bucket_id in ('public-assets', 'project-images', 'resumes', 'uploads')) with check (public.is_admin() and bucket_id in ('public-assets', 'project-images', 'resumes', 'uploads'));

insert into public.profile (full_name, initials, headline, secondary_line, tagline, location, email, linkedin_url, linkedin_label, github_url, github_label, avatar_url, availability, short_bio, about_text, about_focus, published)
values (
  'Ahmed Aziz Mhiri',
  'AAM',
  'Marketing & Commercial Analyst',
  'Business Intelligence · Big Data & AI · CRM & Marketing Automation · Digital Transformation',
  'Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.',
  'Sousse, Tunisia',
  'mhiriaziz13@gmail.com',
  'https://linkedin.com/in/ahmed-aziz-mhiri',
  'linkedin.com/in/ahmed-aziz-mhiri',
  'https://github.com/ahmedazizmhiri',
  'github.com/ahmedazizmhiri',
  '/profile/avatar.png',
  'Open to selected freelance projects and building toward international full-time opportunities from 2027.',
  'Digital Transformation Project Manager at El Mouradi Hotels and Master''s candidate in Big Data Analytics & E-Commerce, combining Marketing & Commercial Analytics, Business Intelligence, automation, AI and engineering to improve decisions, workflows and digital operations.',
  $wave1_profile_about$I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.

At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.

My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering, with hands-on experience across tourism, hospitality and digital services. I use AI as an accelerator—not a substitute for judgment: the objective is to frame the right business problem, choose meaningful KPIs, validate data and model outputs, understand the architecture behind the solution and translate analysis into concrete marketing and commercial actions.

I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage, covering Big Data, Machine Learning, Deep Learning, Artificial Intelligence, NoSQL databases, cloud/data platforms and applied analytics.

My professional focus is Marketing & Commercial Analytics, Business Intelligence, Customer Insights, CRM & Marketing Automation, Big Data & AI and Digital Transformation.$wave1_profile_about$,
  array[
    'Marketing & Commercial Analytics',
    'Business Intelligence & Decision Support',
    'Big Data, AI & Digital Transformation'
  ]::text[],
  true
);

insert into public.hero (eyebrow, title, subtitle, tagline, dynamic_titles, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, published)
values (
  'Marketing & Commercial Analytics · Big Data · AI · Digital Transformation',
  'Ahmed Aziz Mhiri',
  'Business Intelligence · CRM & Marketing Automation · Digital Transformation',
  'Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.',
  array[
    'Marketing & Commercial Analyst',
    'Business Intelligence Analyst',
    'Marketing Data Analyst',
    'CRM & Marketing Automation Analyst',
    'Digital Transformation Analyst'
  ]::text[],
  'Explore Case Studies',
  '/projects',
  'View Resume',
  '/resume',
  true
);

insert into public.about (title, body, highlights, avatar_url, published)
values (
  'I connect business questions, data and technology to create decisions and systems people can use.',
  $wave1_about_body$I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.

At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.

My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering, with hands-on experience across tourism, hospitality and digital services. I use AI as an accelerator—not a substitute for judgment: the objective is to frame the right business problem, choose meaningful KPIs, validate data and model outputs, understand the architecture behind the solution and translate analysis into concrete marketing and commercial actions.

I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage, covering Big Data, Machine Learning, Deep Learning, Artificial Intelligence, NoSQL databases, cloud/data platforms and applied analytics.

My professional focus is Marketing & Commercial Analytics, Business Intelligence, Customer Insights, CRM & Marketing Automation, Big Data & AI and Digital Transformation.$wave1_about_body$,
  array[
    'Marketing & Commercial Analytics',
    'Business Intelligence & Decision Support',
    'Big Data, AI & Digital Transformation'
  ]::text[],
  '/profile/avatar.png',
  true
);

insert into public.skills (name, category, icon_key, sort_order, published) values
('Data Analysis','Data & Business Intelligence','data-analysis',0,true),('KPI Analysis','Data & Business Intelligence','kpi-analysis',1,true),('Business Intelligence','Data & Business Intelligence','business-intelligence',2,true),('Commercial Analytics','Data & Business Intelligence','commercial-analytics',3,true),('Marketing Analytics','Data & Business Intelligence','marketing-analytics',4,true),('Data Visualization','Data & Business Intelligence','data-visualization',5,true),('Financial Reporting','Data & Business Intelligence','financial-reporting',6,true),('Excel','Data & Business Intelligence','excel',7,true),('Reporting','Data & Business Intelligence','reporting',8,true),
('Digital Marketing','Marketing & Customer Growth','digital-marketing',100,true),('Customer Insights','Marketing & Customer Growth','customer-insights',101,true),('Customer Journey','Marketing & Customer Growth','customer-journey',102,true),('Local SEO','Marketing & Customer Growth','local-seo',103,true),('Email Marketing','Marketing & Customer Growth','email-marketing',104,true),('Paid Social','Marketing & Customer Growth','paid-social',105,true),('Social Media Strategy','Marketing & Customer Growth','social-media-strategy',106,true),('E-Commerce','Marketing & Customer Growth','e-commerce',107,true),
('UiPath','Automation & Operations','uipath',200,true),('Process Automation','Automation & Operations','process-automation',201,true),('Business Rules Automation','Automation & Operations','business-rules-automation',202,true),('JSON','Automation & Operations','json',203,true),('HTML Reporting','Automation & Operations','html-reporting',204,true),('Workflow Automation','Automation & Operations','workflow-automation',205,true),('Booking Reconciliation','Automation & Operations','booking-reconciliation',206,true),('Invoice Control','Automation & Operations','invoice-control',207,true),('Auditability','Automation & Operations','auditability',208,true),
('PostgreSQL','Technical Stack','postgresql',300,true),('Supabase','Technical Stack','supabase',301,true),('Next.js','Technical Stack','nextjs',302,true),('TypeScript','Technical Stack','typescript',303,true),('Vercel','Technical Stack','vercel',304,true),('GitHub','Technical Stack','github',305,true),('Angular','Technical Stack','angular',306,true),('Spring Boot','Technical Stack','spring-boot',307,true),('REST APIs','Technical Stack','rest-apis',308,true),('RAG','Technical Stack','rag',309,true),('Ollama','Technical Stack','ollama',310,true),('LLaMA 3.2','Technical Stack','llama-3-2',311,true);

insert into public.projects (slug, title, type, summary, description, cover_image_url, tags, tools, featured, published, sort_order) values
('rpa-invoice-control-booking-reconciliation','RPA for Invoice Control & Booking Reconciliation','Automation / Business Systems','UiPath workflow for invoice control, vouchers, reservations and business-rule automation.','UiPath workflow that links invoice data, vouchers, reservations and business rules to create a more structured and auditable control process.','/projects/project-1.png',array['UiPath','JSON','HTML Reporting','Business Rules Automation','Process Automation'],array['UiPath','JSON','HTML','Process Automation'],true,true,0),
('digital-transformation-mens-barbershop','Digital Transformation for a Men''s Barbershop','Digital Marketing / Customer Journey','Website, online booking, local SEO, social content and customer communication for a smoother digital journey.','Website, online booking, local SEO, social content and customer communication designed around a smoother digital journey.','/projects/project-2.png',array['Digital Marketing','Local SEO','Online Booking','Email Marketing','Paid Social'],array['SEO','Booking','Email Marketing','Social Media'],true,true,1),
('ai-ready-elearning-platform','VERMEG AI-Ready E-Learning Prototype','AI Prototype / Full-Stack / Team Project','Two-person internship prototype for an AI-ready e-learning experience. Ahmed''s contribution focused on chatbot functionality and selected application services; the prototype was not deployed to production.','A demonstrable, two-person internship prototype. Ahmed contributed chatbot functionality and selected application services using Angular, Spring Boot, Ollama and RAG concepts, with supporting work on integration, secure access, event-driven communication, containerisation and observability. Prototype only; not deployed to production.','/projects/project-3.png',array['AI Prototype','Team Project','Angular','Spring Boot','Ollama','RAG'],array['Angular','Spring Boot','Ollama','RAG'],true,true,2),
('library-management-application','Library Management Application','Full-Stack Development','Full-stack library-management application using Angular, Spring Boot, REST APIs and relational databases.','Full-stack library-management application using Angular, Spring Boot, REST APIs and relational databases.','/projects/project-1.png',array['Angular','Spring Boot','REST APIs','Relational Databases'],array['Angular','Spring Boot','REST APIs'],false,true,3),
('hotel-kpi-cost-control-analysis','Hotel KPI & Cost Control Analysis','Business Intelligence / Management Control','Analysis of hotel occupancy, operational costs, revenue-related KPIs, budget variance and financial reporting.','Analysis of hotel occupancy, operational costs, revenue-related KPIs, budget variance and financial reporting.','/projects/project-2.png',array['Excel','KPI Analysis','Financial Reporting','Variance Analysis','Business Intelligence'],array['Excel','Reporting','BI'],false,true,4);

insert into public.experience (company, role, location, start_date, end_date, date_label, logo_url, logo_alt, points, tools, sort_order, published) values
(
  'El Mouradi Hotels',
  'Digital Transformation Project Manager',
  'Sousse, Tunisia',
  'Jul 2026',
  'Present',
  'Jul 2026 - Present',
  '/companies/el-mouradi.png',
  'El Mouradi Hotels logo',
  array[
    'Promoted to a group-level role with responsibility for connectivity and digital transformation projects across Groupe El Mouradi''s hotel and travel operations.',
    'Lead and coordinate digital transformation initiatives, translating operational needs into scalable technology solutions and integration priorities.',
    'Manage connectivity and systems-integration initiatives, coordinating requirements, implementation and follow-up across business and technical stakeholders.'
  ]::text[],
  array[
    'Digital Transformation',
    'Project Management',
    'Systems Integration',
    'Connectivity',
    'Process Automation',
    'Hospitality Technology'
  ]::text[],
  1,
  true
),
(
  'Sunshine Holiday Group / Sunshine Vacances France',
  'Head of IT Services | Process Automation & Business Systems',
  'Sousse, Tunisia',
  'Jul 2025',
  'Jul 2026',
  'Jul 2025 - Jul 2026',
  '/companies/sunshine-vacances.png',
  'Sunshine Vacances France logo',
  array[
    'Worked full-time in a hybrid setup as the sole contributor responsible for IT systems, technical project delivery and process automation at Sunshine Holiday Group headquarters.',
    'Designed and operated an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.',
    'Expanded the control scope from one month for one hotel and one agency in four working days to a full season across all supported hotels and agencies in approximately seven days, while routing uncertain cases for mandatory human review.',
    'Structured hotel rates, discounts, supplements and special offers into controlled business rules and produced validated control and exception reports.'
  ]::text[],
  array[
    'UiPath',
    'Process Automation',
    'Business Rules',
    'JSON',
    'Data Validation',
    'Exception Management'
  ]::text[],
  2,
  true
),
(
  'Maison Salina',
  'Freelance Commercial & Digital Marketing Manager',
  'Sousse, Tunisia',
  'Apr 2025',
  'Sep 2025',
  'Apr 2025 - Sep 2025',
  '/companies/maison-salina.png',
  'Maison Salina logo',
  array[
    'Developed digital marketing initiatives aligned with commercial objectives and brand positioning.',
    'Structured the company’s online presence and customer-facing communication to support visibility and engagement.',
    'Identified and supported partnerships and commercial collaborations designed to create new business opportunities.',
    'Monitored digital actions and commercial priorities to support business development and more consistent brand communication.'
  ]::text[],
  array['Digital Marketing','Content Strategy','Commercial Development','Partnership Development','Performance Monitoring']::text[],
  3,
  true
),
(
  'Chic-Chac',
  'Freelance Digital Transformation & Data-Driven Marketing Consultant',
  'Noisy-le-Grand, France',
  'Feb 2025',
  'Jul 2025',
  'Feb 2025 - Jul 2025',
  '/companies/chicchac.png',
  'Confidential client logo',
  array[
    'Built and managed a tailored website with online booking and activity-monitoring capabilities.',
    'Supported local visibility, customer communication, social content and improvements to booking-related touchpoints.',
    'Facilitated a partnership with Planity to streamline booking operations and improve the customer journey.',
    'Improved recurring digital and operational workflows related to customer acquisition, communication and appointment management.'
  ]::text[],
  array['Website Management','Online Booking','Planity','Local Visibility','Social Media']::text[],
  4,
  true
),
(
  'VERMEG for Banking & Insurance Software',
  'AI & Full-Stack Development Intern',
  'Tunis, Tunisia',
  'Feb 2025',
  'May 2025',
  'Feb 2025 - May 2025',
  '/companies/vermeg.png',
  'VERMEG logo',
  array[
    'Contributed to a two-person internship prototype for a multilingual employee learning and internal knowledge platform.',
    'Developed the chatbot and selected application services rather than the complete platform independently.',
    'Integrated a locally deployed LLaMA 3.2 model through Ollama with retrieval-augmented generation for PDF and CSV knowledge sources.',
    'Contributed to safeguards addressing prompt injection, malicious files and unsafe links.',
    'The result was a collaborative internship prototype and was not presented as a production deployment.'
  ]::text[],
  array['LLaMA 3.2','Ollama','Retrieval-Augmented Generation','PDF and CSV Retrieval','Application Security']::text[],
  5,
  true
),
(
  'El Mouradi Club Kantaoui',
  'Management Controller',
  'Sousse, Tunisia',
  'Jul 2024',
  'Sep 2024',
  'Jul 2024 - Sep 2024',
  '/companies/el-mouradi.png',
  'El Mouradi Hotels logo',
  array[
    'Produced daily management-control reporting across hotel operational departments.',
    'Analysed occupancy, operational costs, revenue-related KPIs and budget variances.',
    'Contributed to annual budget preparation and management reporting.',
    'Supported cost-control analysis across procurement, inventory and hotel operations.'
  ]::text[],
  array['Budgeting','KPI Reporting','Variance Analysis','Cost Control','Hospitality Operations']::text[],
  6,
  true
),
(
  'ArabSoft',
  'Full-Stack Development Intern',
  'Tunis, Tunisia',
  'Jun 2024',
  'Aug 2024',
  'Jun 2024 - Aug 2024',
  '/companies/arab-soft.png',
  'ArabSoft logo',
  array[
    'Designed a responsive Angular interface for a library-management application.',
    'Built a Spring Boot backend and REST APIs connected to relational data.',
    'Implemented creation, update, deletion, search and borrowing-tracking functionality.',
    'Contributed to the full-stack delivery of the application from interface design to backend operations.'
  ]::text[],
  array['Angular','Spring Boot','REST APIs','Relational Databases','CRUD Operations']::text[],
  7,
  true
),
(
  'El Mouradi Hotels',
  'Management Control Intern',
  'Sousse, Tunisia',
  'Jun 2023',
  'Sep 2023',
  'Jun 2023 - Sep 2023',
  '/companies/el-mouradi.png',
  'El Mouradi Hotels logo',
  array[
    'Analysed expenses, operational indicators and budget variances in a five-star hotel environment.',
    'Contributed to KPI and financial reporting for management.',
    'Supported cost-control initiatives and the identification of performance gaps.',
    'Participated in monitoring corrective actions with hotel operational departments.'
  ]::text[],
  array[
    'Expense Analysis',
    'KPI Reporting',
    'Budget Variance Analysis',
    'Cost Control',
    'Hospitality Management Control'
  ]::text[],
  8,
  true
);

insert into public.education (institution, degree, start_date, end_date, status, location, sort_order, published) values
(
  'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
  'Master’s in Big Data Analytics & E-Commerce',
  'Oct 2025',
  'Jun 2027',
  'In progress — expected graduation June 2027 · Big Data Analytics · Machine Learning · Deep Learning · Artificial Intelligence · NoSQL · Microsoft Azure / Cloud Data Platforms · ELK · Data Engineering · Business Analytics · E-Commerce',
  'Carthage, Tunisia',
  0,
  true
),
(
  'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
  'Licence / Bachelor’s degree in Business Intelligence',
  'Jan 2021',
  'Jun 2025',
  'Overall average: 17.11/20 · PFE grade: 19.5/20 · Mention Excellent',
  'Carthage, Tunisia',
  1,
  true
);

insert into public.certifications (name, issuer, date, credential_url, credential_id, image_url, description, tags, sort_order, published) values
('Fundamentals of Digital Marketing','Google','','https://drive.google.com/file/d/10v7Z86IzuUwwvhTYdKfZji24-2-K00JN/view','','','Google Digital Marketing Fundamentals certification covering core concepts in online marketing, SEO, analytics and digital growth.',array['Digital Marketing','SEO','Analytics','Online Marketing'],0,true);

insert into public.resumes (label, variant, pdf_url, docx_url, sort_order, published) values
('English Professional CV','english-professional-cv',null,null,0,true),
('French CV','french-cv',null,null,1,true);

insert into public.social_links (label, url, icon_key, sort_order, published) values
('LinkedIn','https://linkedin.com/in/ahmed-aziz-mhiri','linkedin',0,true),
('GitHub','https://github.com/ahmedazizmhiri','github',1,true),
('Email','mailto:mhiriaziz13@gmail.com','email',2,true);

insert into public.admins (user_id, email)
select id, email from auth.users where email = 'mhiriaziz13@gmail.com'
on conflict do nothing;

select 'profile' as table_name, count(*) from public.profile
union all select 'hero', count(*) from public.hero
union all select 'about', count(*) from public.about
union all select 'skills', count(*) from public.skills
union all select 'projects', count(*) from public.projects
union all select 'experience', count(*) from public.experience
union all select 'education', count(*) from public.education
union all select 'certifications', count(*) from public.certifications
union all select 'resumes', count(*) from public.resumes
union all select 'social_links', count(*) from public.social_links
union all select 'admins', count(*) from public.admins;

-- Idempotent seed for Ahmed Aziz Mhiri's current portfolio.
insert into public.profile (full_name, initials, headline, secondary_line, tagline, location, email, linkedin_url, linkedin_label, github_url, github_label, avatar_url, availability, short_bio, about_text, about_focus, published)
select 'Ahmed Aziz Mhiri', 'AAM', 'Data-Driven Marketing & Commercial Analytics', 'Marketing Analytics | Commercial Analytics | Business Intelligence | Process Automation', 'Turning Data into Commercial Growth', 'Sousse, Tunisia', 'mhiriaziz13@gmail.com', 'https://linkedin.com/in/ahmed-aziz-mhiri', 'linkedin.com/in/ahmed-aziz-mhiri', 'https://github.com/mhiriaziz13-gif', 'github.com/mhiriaziz13-gif', '/profile/avatar.png', 'Available for Europe-based opportunities from October 2027', 'Master''s student in Big Data Analytics & E-Commerce with a Business Intelligence background.', 'I work at the intersection of data, business context and automation, turning operational and customer information into clearer decisions, smoother workflows and stronger commercial visibility.', array['Marketing and commercial analytics','Auditable automation and reporting','Business intelligence for operational decisions'], true
where not exists (select 1 from public.profile);

insert into public.hero (eyebrow, title, subtitle, tagline, dynamic_titles, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, published)
select 'Data-Driven Marketing & Commercial Analytics', 'Ahmed Aziz Mhiri', 'Marketing Analytics | Commercial Analytics | Business Intelligence | Process Automation', 'Turning Data into Commercial Growth', array['Marketing Data Analyst','Commercial Data Analyst','Business Intelligence Analyst','Revenue Operations Analyst','CRM & Marketing Automation Specialist','Process Automation Analyst','Data Operations Analyst'], 'Contact Me', '/#contact', 'View Projects', '/#projects', true
where not exists (select 1 from public.hero);

insert into public.about (title, body, highlights, avatar_url, published)
select 'Data, commercial context and automation in one working view.', 'I work at the intersection of data, business context and automation, turning operational and customer information into clearer decisions, smoother workflows and stronger commercial visibility.', array['Marketing and commercial analytics','Auditable automation and reporting','Business intelligence for operational decisions'], '/profile/avatar.png', true
where not exists (select 1 from public.about);

with skill_seed(name, category, sort_order) as (values
  ('Data Analysis','Data & Business Intelligence',0),('KPI Analysis','Data & Business Intelligence',1),('Business Intelligence','Data & Business Intelligence',2),('Commercial Analytics','Data & Business Intelligence',3),('Marketing Analytics','Data & Business Intelligence',4),('Data Visualization','Data & Business Intelligence',5),('Financial Reporting','Data & Business Intelligence',6),('Excel','Data & Business Intelligence',7),('Reporting','Data & Business Intelligence',8),
  ('Digital Marketing','Marketing & Customer Growth',100),('Customer Insights','Marketing & Customer Growth',101),('Customer Journey','Marketing & Customer Growth',102),('Local SEO','Marketing & Customer Growth',103),('Email Marketing','Marketing & Customer Growth',104),('Paid Social','Marketing & Customer Growth',105),('Social Media Strategy','Marketing & Customer Growth',106),('E-Commerce','Marketing & Customer Growth',107),
  ('UiPath','Automation & Operations',200),('Process Automation','Automation & Operations',201),('Business Rules Automation','Automation & Operations',202),('JSON','Automation & Operations',203),('HTML Reporting','Automation & Operations',204),('Workflow Automation','Automation & Operations',205),('Booking Reconciliation','Automation & Operations',206),('Invoice Control','Automation & Operations',207),('Auditability','Automation & Operations',208),
  ('PostgreSQL','Technical Stack',300),('Supabase','Technical Stack',301),('Next.js','Technical Stack',302),('TypeScript','Technical Stack',303),('Vercel','Technical Stack',304),('GitHub','Technical Stack',305),('Angular','Technical Stack',306),('Spring Boot','Technical Stack',307),('REST APIs','Technical Stack',308),('RAG','Technical Stack',309),('Ollama','Technical Stack',310),('LLaMA 3.2','Technical Stack',311)
)
insert into public.skills (name, category, icon_key, sort_order, published)
select s.name, s.category, s.name, s.sort_order, true from skill_seed s
where not exists (select 1 from public.skills x where x.name = s.name and x.category = s.category);

insert into public.certifications (name, issuer, date, credential_url, description, tags, sort_order, published)
select 'Fundamentals of Digital Marketing', 'Google', '', 'https://drive.google.com/file/d/10v7Z86IzuUwwvhTYdKfZji24-2-K00JN/view', 'Google Digital Marketing Fundamentals certification covering core concepts in online marketing, SEO, analytics and digital growth.', array['Digital Marketing','SEO','Analytics','Online Marketing'], 0, true
where not exists (select 1 from public.certifications where name = 'Fundamentals of Digital Marketing' and issuer = 'Google');

update public.certifications set credential_url = 'https://drive.google.com/file/d/10v7Z86IzuUwwvhTYdKfZji24-2-K00JN/view', updated_at = now()
where name = 'Fundamentals of Digital Marketing' and issuer = 'Google';

with resume_seed(label, variant, pdf_url, docx_url, sort_order) as (values
  ('English Professional CV','english-professional-cv','/cv/Ahmed_Aziz_Mhiri_CV_English.pdf','/cv/Ahmed_Aziz_Mhiri_CV_English.docx',0),
  ('French CV','french-cv','/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf','/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx',1),
  ('ATS CV','ats-cv','/cv/Ahmed_Aziz_Mhiri_CV_ATS.pdf','/cv/Ahmed_Aziz_Mhiri_CV_ATS.docx',2),
  ('Canadian CV','canadian-cv','/cv/Ahmed_Aziz_Mhiri_CV_Canada.pdf','/cv/Ahmed_Aziz_Mhiri_CV_Canada.docx',3)
)
insert into public.resumes (label, variant, pdf_url, docx_url, sort_order, published)
select r.label, r.variant, r.pdf_url, r.docx_url, r.sort_order, true from resume_seed r
where not exists (select 1 from public.resumes x where x.variant = r.variant);

with social_seed(label, url, icon_key, sort_order) as (values
  ('LinkedIn','https://linkedin.com/in/ahmed-aziz-mhiri','linkedin',0),
  ('GitHub','https://github.com/mhiriaziz13-gif','github',1),
  ('Email','mailto:mhiriaziz13@gmail.com','email',2)
)
insert into public.social_links (label, url, icon_key, sort_order, published)
select s.label, s.url, s.icon_key, s.sort_order, true from social_seed s
where not exists (select 1 from public.social_links x where x.label = s.label);

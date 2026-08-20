-- Idempotent seed for Ahmed Aziz Mhiri's current portfolio.
with desired(
  full_name,
  initials,
  headline,
  secondary_line,
  tagline,
  location,
  email,
  linkedin_url,
  linkedin_label,
  github_url,
  github_label,
  avatar_url,
  availability,
  short_bio,
  about_text,
  about_focus,
  published
) as (
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
  )
), updated as (
  update public.profile as profile
  set
    full_name = desired.full_name,
    initials = desired.initials,
    headline = desired.headline,
    secondary_line = desired.secondary_line,
    tagline = desired.tagline,
    location = desired.location,
    email = desired.email,
    linkedin_url = desired.linkedin_url,
    linkedin_label = desired.linkedin_label,
    github_url = desired.github_url,
    github_label = desired.github_label,
    avatar_url = desired.avatar_url,
    availability = desired.availability,
    short_bio = desired.short_bio,
    about_text = desired.about_text,
    about_focus = desired.about_focus,
    updated_at = now()
  from desired
  where profile.published
  returning profile.id
)
insert into public.profile (full_name, initials, headline, secondary_line, tagline, location, email, linkedin_url, linkedin_label, github_url, github_label, avatar_url, availability, short_bio, about_text, about_focus, published)
select desired.* from desired
where not exists (select 1 from updated)
  and not exists (select 1 from public.profile where published);

with desired(
  eyebrow,
  title,
  subtitle,
  tagline,
  dynamic_titles,
  primary_cta_label,
  primary_cta_href,
  secondary_cta_label,
  secondary_cta_href,
  published
) as (
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
  )
), updated as (
  update public.hero as hero
  set
    eyebrow = desired.eyebrow,
    title = desired.title,
    subtitle = desired.subtitle,
    tagline = desired.tagline,
    dynamic_titles = desired.dynamic_titles,
    primary_cta_label = desired.primary_cta_label,
    primary_cta_href = desired.primary_cta_href,
    secondary_cta_label = desired.secondary_cta_label,
    secondary_cta_href = desired.secondary_cta_href,
    updated_at = now()
  from desired
  where hero.published
  returning hero.id
)
insert into public.hero (eyebrow, title, subtitle, tagline, dynamic_titles, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, published)
select desired.* from desired
where not exists (select 1 from updated)
  and not exists (select 1 from public.hero where published);

with desired(title, body, highlights, avatar_url, published) as (
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
  )
), updated as (
  update public.about as about
  set
    title = desired.title,
    body = desired.body,
    highlights = desired.highlights,
    avatar_url = desired.avatar_url,
    updated_at = now()
  from desired
  where about.published
  returning about.id
)
insert into public.about (title, body, highlights, avatar_url, published)
select desired.* from desired
where not exists (select 1 from updated)
  and not exists (select 1 from public.about where published);

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

-- Enforce the same public boundary as the application before canonical EN/FR
-- rows are restored. Italian is public only when a validated asset exists.
update public.resumes
set
  pdf_url = null,
  docx_url = null,
  published = false,
  updated_at = now()
where (
    lower(concat_ws(' ', variant, label, pdf_url, docx_url)) ~ '(ats|canad|master)'
    or coalesce(variant, '') not in (
      'english-professional-cv',
      'french-cv',
      'italian',
      'italian-cv',
      'italian-professional-cv'
    )
    or (
      variant in ('italian', 'italian-cv', 'italian-professional-cv')
      and published
      and pdf_url is null
      and docx_url is null
    )
  )
  and (
    published
    or pdf_url is not null
    or docx_url is not null
  );

with resume_seed(label, variant, pdf_url, docx_url, sort_order, published) as (values
  ('English Professional CV','english-professional-cv',null::text,null::text,0,true),
  ('French CV','french-cv',null::text,null::text,1,true)
)
update public.resumes as resume
set
  label = seed.label,
  pdf_url = case
    when resume.pdf_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.pdf',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf'
    ) then null
    else resume.pdf_url
  end,
  docx_url = case
    when resume.docx_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.docx',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx'
    ) then null
    else resume.docx_url
  end,
  sort_order = seed.sort_order,
  published = seed.published,
  updated_at = now()
from resume_seed as seed
where resume.variant = seed.variant;

with resume_seed(label, variant, pdf_url, docx_url, sort_order, published) as (values
  ('English Professional CV','english-professional-cv',null::text,null::text,0,true),
  ('French CV','french-cv',null::text,null::text,1,true)
)
insert into public.resumes (label, variant, pdf_url, docx_url, sort_order, published)
select seed.label, seed.variant, seed.pdf_url, seed.docx_url, seed.sort_order, seed.published
from resume_seed as seed
where not exists (
  select 1
  from public.resumes as resume
  where resume.variant = seed.variant
);

with social_seed(label, url, icon_key, sort_order) as (values
  ('LinkedIn','https://linkedin.com/in/ahmed-aziz-mhiri','linkedin',0),
  ('GitHub','https://github.com/ahmedazizmhiri','github',1),
  ('Email','mailto:mhiriaziz13@gmail.com','email',2)
)
insert into public.social_links (label, url, icon_key, sort_order, published)
select s.label, s.url, s.icon_key, s.sort_order, true from social_seed s
where not exists (select 1 from public.social_links x where x.label = s.label);

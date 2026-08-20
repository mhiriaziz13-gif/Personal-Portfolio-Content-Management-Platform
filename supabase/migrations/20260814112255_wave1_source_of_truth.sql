-- Wave 1: synchronize public portfolio content with the validated CMS source.
--
-- This migration is deliberately limited to public content records. It does
-- not alter schema, RLS, authentication, Storage architecture, the project
-- workspace, or the legacy public.experiences JSONB model.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('wave1_source_of_truth', 0)
);

do $wave1_preflight$
declare
  v_problem text;
begin
  select pg_catalog.string_agg(required_table, ', ' order by required_table)
  into v_problem
  from pg_catalog.unnest(array[
    'about',
    'education',
    'experience',
    'hero',
    'page_section_items',
    'page_sections',
    'pages',
    'profile',
    'projects',
    'resumes'
  ]::text[]) as required(required_table)
  where pg_catalog.to_regclass(
    pg_catalog.format('public.%I', required_table)
  ) is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: required active tables are missing',
      detail = v_problem;
  end if;

  if (select pg_catalog.count(*) from public.profile where published) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: expected exactly one published profile row';
  end if;

  if (select pg_catalog.count(*) from public.hero where published) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: expected exactly one published hero row';
  end if;

  if (select pg_catalog.count(*) from public.about where published) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: expected exactly one published about row';
  end if;

  if (
    select pg_catalog.count(*)
    from public.experience
    where role = 'Digital Transformation Project Manager'
      and company ilike 'El Mouradi%'
  ) > 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: current El Mouradi role is ambiguous';
  end if;

  if (
    select pg_catalog.count(*)
    from public.experience
    where role = 'Head of IT Services | Process Automation & Business Systems'
      and company ilike '%Sunshine%'
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: Sunshine role is missing or ambiguous';
  end if;

  if (
    select pg_catalog.count(*)
    from public.experience
    where role = 'Management Control Intern'
      and company ilike 'El Mouradi%'
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: 2023 El Mouradi internship is missing or ambiguous';
  end if;

  with required_company(company) as (
    values
      ('Maison Salina'),
      ('Chic-Chac'),
      ('VERMEG for Banking & Insurance Software'),
      ('El Mouradi Club Kantaoui'),
      ('ArabSoft')
  ), company_counts as (
    select required.company, pg_catalog.count(experience.id) as row_count
    from required_company as required
    left join public.experience as experience
      on experience.company = required.company
    group by required.company
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%s=%s', company, row_count),
    ', '
    order by company
  )
  into v_problem
  from company_counts
  where row_count <> 1;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: supporting experience rows are missing or ambiguous',
      detail = v_problem;
  end if;

  if (
    select pg_catalog.count(*)
    from public.education
    where degree ilike '%Big Data Analytics%'
      and degree ilike '%E-Commerce%'
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: Master education row is missing or ambiguous';
  end if;

  if (
    select pg_catalog.count(*)
    from public.education
    where degree ilike '%Business Intelligence%'
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: Business Intelligence education row is missing or ambiguous';
  end if;

  with required_sections(page_key, section_key) as (
    values
      ('home', 'hero'),
      ('home', 'experience'),
      ('home', 'skills'),
      ('home', 'cta'),
      ('about', 'canonical-about'),
      ('experience', 'canonical-experience'),
      ('education', 'canonical-education')
  ), section_counts as (
    select
      required.page_key,
      required.section_key,
      pg_catalog.count(section.id) as row_count
    from required_sections as required
    left join public.pages as page
      on page.page_key = required.page_key
    left join public.page_sections as section
      on section.page_id = page.id
     and section.section_key = required.section_key
    group by required.page_key, required.section_key
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%s/%s=%s', page_key, section_key, row_count),
    ', '
    order by page_key, section_key
  )
  into v_problem
  from section_counts
  where row_count <> 1;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: required page sections are missing or ambiguous',
      detail = v_problem;
  end if;

  if (
    select pg_catalog.count(*)
    from public.page_section_items as item
    join public.page_sections as section on section.id = item.page_section_id
    join public.pages as page on page.id = section.page_id
    where page.page_key = 'education'
      and section.section_key = 'canonical-education'
      and item.display_order = 0
  ) <> 1 or (
    select pg_catalog.count(*)
    from public.page_section_items as item
    join public.page_sections as section on section.id = item.page_section_id
    join public.pages as page on page.id = section.page_id
    where page.page_key = 'education'
      and section.section_key = 'canonical-education'
      and item.display_order = 1
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 preflight failed: canonical education items are missing or ambiguous';
  end if;
end
$wave1_preflight$;

update public.profile
set
  full_name = 'Ahmed Aziz Mhiri',
  initials = 'AAM',
  headline = 'Marketing & Commercial Analyst',
  secondary_line = 'Business Intelligence · Big Data & AI · CRM & Marketing Automation · Digital Transformation',
  tagline = 'Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.',
  location = 'Sousse, Tunisia',
  email = 'mhiriaziz13@gmail.com',
  linkedin_url = 'https://linkedin.com/in/ahmed-aziz-mhiri',
  linkedin_label = 'linkedin.com/in/ahmed-aziz-mhiri',
  github_url = 'https://github.com/ahmedazizmhiri',
  github_label = 'github.com/ahmedazizmhiri',
  avatar_url = '/profile/avatar.png',
  availability = 'Open to selected freelance projects and building toward international full-time opportunities from 2027.',
  short_bio = 'Digital Transformation Project Manager at El Mouradi Hotels and Master''s candidate in Big Data Analytics & E-Commerce, combining Marketing & Commercial Analytics, Business Intelligence, automation, AI and engineering to improve decisions, workflows and digital operations.',
  about_text = $wave1_profile_about$I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.

At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.

My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering, with hands-on experience across tourism, hospitality and digital services. I use AI as an accelerator—not a substitute for judgment: the objective is to frame the right business problem, choose meaningful KPIs, validate data and model outputs, understand the architecture behind the solution and translate analysis into concrete marketing and commercial actions.

I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage, covering Big Data, Machine Learning, Deep Learning, Artificial Intelligence, NoSQL databases, cloud/data platforms and applied analytics.

My professional focus is Marketing & Commercial Analytics, Business Intelligence, Customer Insights, CRM & Marketing Automation, Big Data & AI and Digital Transformation.$wave1_profile_about$,
  about_focus = array[
    'Marketing & Commercial Analytics',
    'Business Intelligence & Decision Support',
    'Big Data, AI & Digital Transformation'
  ]::text[],
  updated_at = pg_catalog.now()
where published
  and (
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
    about_focus
  ) is distinct from (
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
    ]::text[]
  );

update public.hero
set
  eyebrow = 'Marketing & Commercial Analytics · Big Data · AI · Digital Transformation',
  title = 'Ahmed Aziz Mhiri',
  subtitle = 'Business Intelligence · CRM & Marketing Automation · Digital Transformation',
  tagline = 'Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.',
  dynamic_titles = array[
    'Marketing & Commercial Analyst',
    'Business Intelligence Analyst',
    'Marketing Data Analyst',
    'CRM & Marketing Automation Analyst',
    'Digital Transformation Analyst'
  ]::text[],
  primary_cta_label = 'Explore Case Studies',
  primary_cta_href = '/projects',
  secondary_cta_label = 'View Resume',
  secondary_cta_href = '/resume',
  updated_at = pg_catalog.now()
where published
  and (
    eyebrow,
    title,
    subtitle,
    tagline,
    dynamic_titles,
    primary_cta_label,
    primary_cta_href,
    secondary_cta_label,
    secondary_cta_href
  ) is distinct from (
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
    '/resume'
  );

update public.about
set
  title = 'I connect business questions, data and technology to create decisions and systems people can use.',
  body = $wave1_about_body$I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.

At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.

My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering, with hands-on experience across tourism, hospitality and digital services. I use AI as an accelerator—not a substitute for judgment: the objective is to frame the right business problem, choose meaningful KPIs, validate data and model outputs, understand the architecture behind the solution and translate analysis into concrete marketing and commercial actions.

I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage, covering Big Data, Machine Learning, Deep Learning, Artificial Intelligence, NoSQL databases, cloud/data platforms and applied analytics.

My professional focus is Marketing & Commercial Analytics, Business Intelligence, Customer Insights, CRM & Marketing Automation, Big Data & AI and Digital Transformation.$wave1_about_body$,
  highlights = array[
    'Marketing & Commercial Analytics',
    'Business Intelligence & Decision Support',
    'Big Data, AI & Digital Transformation'
  ]::text[],
  avatar_url = '/profile/avatar.png',
  updated_at = pg_catalog.now()
where published
  and (
    title,
    body,
    highlights,
    avatar_url
  ) is distinct from (
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
    '/profile/avatar.png'
  );

-- This role was validated directly in the active CMS before the repository
-- migration existed. Insert it only when a clean historical replay does not
-- already contain the row; the advisory lock and preflight prevent duplicates.
insert into public.experience (
  company,
  role,
  location,
  start_date,
  end_date,
  date_label,
  logo_url,
  logo_alt,
  points,
  tools,
  sort_order,
  published
)
select
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
where not exists (
  select 1
  from public.experience
  where role = 'Digital Transformation Project Manager'
    and company ilike 'El Mouradi%'
);

update public.experience
set
  company = 'El Mouradi Hotels',
  role = 'Digital Transformation Project Manager',
  location = 'Sousse, Tunisia',
  start_date = 'Jul 2026',
  end_date = 'Present',
  date_label = 'Jul 2026 - Present',
  logo_url = '/companies/el-mouradi.png',
  logo_alt = 'El Mouradi Hotels logo',
  points = array[
    'Promoted to a group-level role with responsibility for connectivity and digital transformation projects across Groupe El Mouradi''s hotel and travel operations.',
    'Lead and coordinate digital transformation initiatives, translating operational needs into scalable technology solutions and integration priorities.',
    'Manage connectivity and systems-integration initiatives, coordinating requirements, implementation and follow-up across business and technical stakeholders.'
  ]::text[],
  tools = array[
    'Digital Transformation',
    'Project Management',
    'Systems Integration',
    'Connectivity',
    'Process Automation',
    'Hospitality Technology'
  ]::text[],
  sort_order = 1,
  published = true,
  updated_at = pg_catalog.now()
where role = 'Digital Transformation Project Manager'
  and company ilike 'El Mouradi%'
  and (
    company,
    location,
    start_date,
    end_date,
    date_label,
    logo_url,
    logo_alt,
    points,
    tools,
    sort_order,
    published
  ) is distinct from (
    'El Mouradi Hotels',
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
  );

update public.experience
set
  company = 'Sunshine Holiday Group / Sunshine Vacances France',
  role = 'Head of IT Services | Process Automation & Business Systems',
  location = 'Sousse, Tunisia',
  start_date = 'Jul 2025',
  end_date = 'Jul 2026',
  date_label = 'Jul 2025 - Jul 2026',
  logo_url = '/companies/sunshine-vacances.png',
  logo_alt = 'Sunshine Vacances France logo',
  points = array[
    'Worked full-time in a hybrid setup as the sole contributor responsible for IT systems, technical project delivery and process automation at Sunshine Holiday Group headquarters.',
    'Designed and operated an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.',
    'Expanded the control scope from one month for one hotel and one agency in four working days to a full season across all supported hotels and agencies in approximately seven days, while routing uncertain cases for mandatory human review.',
    'Structured hotel rates, discounts, supplements and special offers into controlled business rules and produced validated control and exception reports.'
  ]::text[],
  tools = array[
    'UiPath',
    'Process Automation',
    'Business Rules',
    'JSON',
    'Data Validation',
    'Exception Management'
  ]::text[],
  sort_order = 2,
  published = true,
  updated_at = pg_catalog.now()
where role = 'Head of IT Services | Process Automation & Business Systems'
  and company ilike '%Sunshine%'
  and (
    company,
    location,
    start_date,
    end_date,
    date_label,
    logo_url,
    logo_alt,
    points,
    tools,
    sort_order,
    published
  ) is distinct from (
    'Sunshine Holiday Group / Sunshine Vacances France',
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
  );

with desired_experience(
  company,
  role,
  location,
  start_date,
  end_date,
  date_label,
  logo_url,
  logo_alt,
  points,
  tools,
  sort_order
) as (
  values
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
      array[
        'Digital Marketing',
        'Content Strategy',
        'Commercial Development',
        'Partnership Development',
        'Performance Monitoring'
      ]::text[],
      3
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
      array[
        'Website Management',
        'Online Booking',
        'Planity',
        'Local Visibility',
        'Social Media'
      ]::text[],
      4
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
      array[
        'LLaMA 3.2',
        'Ollama',
        'Retrieval-Augmented Generation',
        'PDF and CSV Retrieval',
        'Application Security'
      ]::text[],
      5
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
      array[
        'Budgeting',
        'KPI Reporting',
        'Variance Analysis',
        'Cost Control',
        'Hospitality Operations'
      ]::text[],
      6
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
      array[
        'Angular',
        'Spring Boot',
        'REST APIs',
        'Relational Databases',
        'CRUD Operations'
      ]::text[],
      7
    )
)
update public.experience as experience
set
  role = desired.role,
  location = desired.location,
  start_date = desired.start_date,
  end_date = desired.end_date,
  date_label = desired.date_label,
  logo_url = desired.logo_url,
  logo_alt = desired.logo_alt,
  points = desired.points,
  tools = desired.tools,
  sort_order = desired.sort_order,
  published = true,
  updated_at = pg_catalog.now()
from desired_experience as desired
where experience.company = desired.company
  and (
    experience.role,
    experience.location,
    experience.start_date,
    experience.end_date,
    experience.date_label,
    experience.logo_url,
    experience.logo_alt,
    experience.points,
    experience.tools,
    experience.sort_order,
    experience.published
  ) is distinct from (
    desired.role,
    desired.location,
    desired.start_date,
    desired.end_date,
    desired.date_label,
    desired.logo_url,
    desired.logo_alt,
    desired.points,
    desired.tools,
    desired.sort_order,
    true
  );

update public.experience
set
  company = 'El Mouradi Hotels',
  role = 'Management Control Intern',
  location = 'Sousse, Tunisia',
  start_date = 'Jun 2023',
  end_date = 'Sep 2023',
  date_label = 'Jun 2023 - Sep 2023',
  logo_url = '/companies/el-mouradi.png',
  logo_alt = 'El Mouradi Hotels logo',
  points = array[
    'Analysed expenses, operational indicators and budget variances in a five-star hotel environment.',
    'Contributed to KPI and financial reporting for management.',
    'Supported cost-control initiatives and the identification of performance gaps.',
    'Participated in monitoring corrective actions with hotel operational departments.'
  ]::text[],
  tools = array[
    'Expense Analysis',
    'KPI Reporting',
    'Budget Variance Analysis',
    'Cost Control',
    'Hospitality Management Control'
  ]::text[],
  sort_order = 8,
  published = true,
  updated_at = pg_catalog.now()
where role = 'Management Control Intern'
  and company ilike 'El Mouradi%'
  and (
    company,
    location,
    start_date,
    end_date,
    date_label,
    logo_url,
    logo_alt,
    points,
    tools,
    sort_order,
    published
  ) is distinct from (
    'El Mouradi Hotels',
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

update public.education
set
  institution = 'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
  degree = 'Master’s in Big Data Analytics & E-Commerce',
  start_date = 'Oct 2025',
  end_date = 'Jun 2027',
  status = 'In progress — expected graduation June 2027 · Big Data Analytics · Machine Learning · Deep Learning · Artificial Intelligence · NoSQL · Microsoft Azure / Cloud Data Platforms · ELK · Data Engineering · Business Analytics · E-Commerce',
  location = 'Carthage, Tunisia',
  sort_order = 0,
  published = true,
  updated_at = pg_catalog.now()
where degree ilike '%Big Data Analytics%'
  and degree ilike '%E-Commerce%'
  and (
    institution,
    degree,
    start_date,
    end_date,
    status,
    location,
    sort_order,
    published
  ) is distinct from (
    'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
    'Master’s in Big Data Analytics & E-Commerce',
    'Oct 2025',
    'Jun 2027',
    'In progress — expected graduation June 2027 · Big Data Analytics · Machine Learning · Deep Learning · Artificial Intelligence · NoSQL · Microsoft Azure / Cloud Data Platforms · ELK · Data Engineering · Business Analytics · E-Commerce',
    'Carthage, Tunisia',
    0,
    true
  );

update public.education
set
  institution = 'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
  degree = 'Licence / Bachelor’s degree in Business Intelligence',
  start_date = 'Jan 2021',
  end_date = 'Jun 2025',
  status = 'Overall average: 17.11/20 · PFE grade: 19.5/20 · Mention Excellent',
  location = 'Carthage, Tunisia',
  sort_order = 1,
  published = true,
  updated_at = pg_catalog.now()
where degree ilike '%Business Intelligence%'
  and (
    institution,
    degree,
    start_date,
    end_date,
    status,
    location,
    sort_order,
    published
  ) is distinct from (
    'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
    'Licence / Bachelor’s degree in Business Intelligence',
    'Jan 2021',
    'Jun 2025',
    'Overall average: 17.11/20 · PFE grade: 19.5/20 · Mention Excellent',
    'Carthage, Tunisia',
    1,
    true
  );

with desired_pages(
  page_key,
  title,
  seo_title,
  seo_description,
  open_graph_title,
  open_graph_description,
  open_graph_image
) as (
  values
    (
      'home',
      'Home',
      'Ahmed Aziz Mhiri | Marketing & Commercial Analyst',
      'Portfolio of Ahmed Aziz Mhiri, Marketing & Commercial Analyst and Digital Transformation Project Manager combining Business Intelligence, Big Data, AI, CRM automation and engineering for measurable business outcomes.',
      'Ahmed Aziz Mhiri | Marketing & Commercial Analytics',
      'Marketing & Commercial Analytics powered by Business Intelligence, Big Data, AI, automation and engineering.',
      '/opengraph-image'
    ),
    (
      'projects',
      'Projects',
      'Projects | Marketing, Commercial Analytics, AI & Automation',
      'Case studies and projects across commercial analytics, customer journeys, process automation, AI, hospitality, travel and digital product development.',
      'Case Studies & Projects — Ahmed Aziz Mhiri',
      'Evidence of business impact through analytics, automation, AI and digital product delivery.',
      '/opengraph-image'
    ),
    (
      'experience',
      'Experience',
      'Experience | Marketing Analytics, BI & Digital Transformation',
      'Professional experience across group-level digital transformation, connectivity, IT systems, commercial and marketing operations, management control, AI and full-stack development.',
      'Professional Experience — Ahmed Aziz Mhiri',
      'From management control and marketing to IT systems, automation and group-level digital transformation.',
      '/opengraph-image'
    ),
    (
      'expertise',
      'Expertise',
      'Expertise | Marketing Analytics, Big Data, AI & Automation',
      'Explore capabilities across Marketing & Commercial Analytics, Business Intelligence, Big Data, AI, CRM and Marketing Automation, Digital Transformation and engineering.',
      'Marketing Analytics, Big Data, AI & Digital Transformation',
      'Business-first capabilities across analytics, customer insight, Big Data, AI, CRM automation and technical implementation.',
      '/opengraph-image'
    ),
    (
      'about',
      'About',
      'About Ahmed Aziz Mhiri | Marketing, Data & Digital Transformation',
      'Learn how Ahmed Aziz Mhiri combines Marketing & Commercial Analytics, Business Intelligence, Big Data, AI, automation and engineering to turn business problems into decisions and digital solutions.',
      'Ahmed Aziz Mhiri — Business, Data, AI & Digital Transformation',
      'A business-first profile connecting Marketing & Commercial Analytics with Big Data, AI, automation and engineering.',
      '/opengraph-image'
    ),
    (
      'contact',
      'Contact',
      'Contact Ahmed Aziz Mhiri',
      'Contact Ahmed Aziz Mhiri about Marketing & Commercial Analytics, Business Intelligence, Digital Transformation, automation and selected freelance opportunities.',
      'Contact',
      'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.',
      '/opengraph-image'
    ),
    (
      'resume',
      'Resume',
      'Resume | Ahmed Aziz Mhiri',
      'Access current resume versions for Ahmed Aziz Mhiri, Marketing & Commercial Analyst and Digital Transformation Project Manager.',
      'Ahmed Aziz Mhiri Resume',
      'Resume and CV versions.',
      '/opengraph-image'
    ),
    (
      'education',
      'Education',
      'Education | Big Data Analytics & Business Intelligence',
      'Education in Big Data Analytics & E-Commerce and Business Intelligence, including AI, Machine Learning, NoSQL, cloud data platforms and business analytics.',
      'Education',
      'Verified education supporting Ahmed Aziz Mhiri''s work in business intelligence, big data analytics, e-commerce and commercial decision-making.',
      '/opengraph-image'
    ),
    (
      'certifications',
      'Certifications',
      'Certifications',
      'Published professional certifications.',
      'Certifications',
      'Professional certifications earned by Ahmed Aziz Mhiri.',
      '/opengraph-image'
    )
)
update public.pages as page
set
  title = desired.title,
  seo_title = desired.seo_title,
  seo_description = desired.seo_description,
  open_graph_title = desired.open_graph_title,
  open_graph_description = desired.open_graph_description,
  open_graph_image = desired.open_graph_image,
  is_published = true,
  updated_at = pg_catalog.now()
from desired_pages as desired
where page.page_key = desired.page_key
  and (
    page.title,
    page.seo_title,
    page.seo_description,
    page.open_graph_title,
    page.open_graph_description,
    page.open_graph_image,
    page.is_published
  ) is distinct from (
    desired.title,
    desired.seo_title,
    desired.seo_description,
    desired.open_graph_title,
    desired.open_graph_description,
    desired.open_graph_image,
    true
  );

with desired_sections(
  page_key,
  section_key,
  title,
  subtitle,
  description,
  cta_label,
  cta_href,
  secondary_cta_label,
  secondary_cta_href
) as (
  values
    (
      'home',
      'hero',
      'Ahmed Aziz Mhiri',
      'Marketing & Commercial Analytics · Big Data · AI · Digital Transformation',
      'Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.',
      'Explore Case Studies',
      '/projects',
      'View Resume',
      '/resume'
    ),
    (
      'about',
      'canonical-about',
      'I connect business questions, data and technology to create decisions and systems people can use.',
      '',
      $wave1_section_about$I work at the intersection of Marketing & Commercial Analytics, Big Data, AI and Digital Transformation, turning customer, commercial and operational data into clearer decisions, smarter processes and measurable business improvements.

At El Mouradi Hotels, I am responsible for connectivity and digital transformation projects across Groupe El Mouradi's hotel and travel operations. Previously, at Sunshine Holiday Group, I led IT systems and process automation, including an end-to-end UiPath workflow for invoice control, booking reconciliation and hotel commercial-rule validation across 40 hotels and four travel agencies.

My background combines Business Intelligence, Marketing & Commercial Analytics, process automation and full-stack engineering. I use AI as an accelerator—not a substitute for judgment—and I am completing a Master's in Big Data Analytics & E-Commerce at IHEC Carthage.$wave1_section_about$,
      '',
      '',
      '',
      ''
    ),
    (
      'experience',
      'canonical-experience',
      'Professional experience',
      'From management control and marketing to IT systems, automation and group-level digital transformation.',
      '',
      '',
      '',
      '',
      ''
    ),
    (
      'home',
      'experience',
      'Work Experience',
      'From management control and marketing to IT systems, automation and group-level digital transformation.',
      '',
      '',
      '',
      '',
      ''
    ),
    (
      'home',
      'skills',
      'Skills',
      'Marketing & Commercial Analytics supported by Business Intelligence, Big Data, AI, automation and engineering.',
      '',
      '',
      '',
      '',
      ''
    ),
    (
      'home',
      'cta',
      'Let''s turn business data into clearer decisions and better digital operations',
      '',
      'Open to selected freelance projects and building toward international full-time opportunities from 2027.',
      'Start a conversation',
      '/contact',
      'View Resume',
      '/resume'
    )
)
update public.page_sections as section
set
  title = desired.title,
  subtitle = desired.subtitle,
  description = desired.description,
  cta_label = desired.cta_label,
  cta_href = desired.cta_href,
  secondary_cta_label = desired.secondary_cta_label,
  secondary_cta_href = desired.secondary_cta_href,
  updated_at = pg_catalog.now()
from public.pages as page,
     desired_sections as desired
where section.page_id = page.id
  and page.page_key = desired.page_key
  and section.section_key = desired.section_key
  and (
    section.title,
    section.subtitle,
    section.description,
    section.cta_label,
    section.cta_href,
    section.secondary_cta_label,
    section.secondary_cta_href
  ) is distinct from (
    desired.title,
    desired.subtitle,
    desired.description,
    desired.cta_label,
    desired.cta_href,
    desired.secondary_cta_label,
    desired.secondary_cta_href
  );

with desired_education_items(
  display_order,
  title,
  subtitle,
  description
) as (
  values
    (
      0,
      'Master’s in Big Data Analytics & E-Commerce',
      'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
      'In progress — expected graduation June 2027 · Big Data Analytics · Machine Learning · Deep Learning · Artificial Intelligence · NoSQL · Microsoft Azure / Cloud Data Platforms · ELK · Data Engineering · Business Analytics · E-Commerce | Oct 2025 - Jun 2027 | Carthage, Tunisia'
    ),
    (
      1,
      'Licence / Bachelor’s degree in Business Intelligence',
      'Institut des Hautes Études Commerciales de Carthage — IHEC Carthage',
      'Overall average: 17.11/20 · PFE grade: 19.5/20 · Mention Excellent | Jan 2021 - Jun 2025 | Carthage, Tunisia'
    )
)
update public.page_section_items as item
set
  title = desired.title,
  subtitle = desired.subtitle,
  description = desired.description,
  is_visible = true,
  updated_at = pg_catalog.now()
from public.page_sections as section,
     public.pages as page,
     desired_education_items as desired
where item.page_section_id = section.id
  and section.page_id = page.id
  and page.page_key = 'education'
  and section.section_key = 'canonical-education'
  and item.display_order = desired.display_order
  and (
    item.title,
    item.subtitle,
    item.description,
    item.is_visible
  ) is distinct from (
    desired.title,
    desired.subtitle,
    desired.description,
    true
  );

-- The obsolete Master's LLM project was manually removed from the active CMS.
-- Cascading foreign keys keep this stable-slug cleanup internally consistent
-- on a disposable replay where an older migration may have inserted it.
delete from public.projects
where slug = 'master-multi-agent-llm-project'
   or pg_catalog.lower(title) in (
        'master multi-agent llm project',
        'llm interface for multi-agent system management'
      );

-- EN/FR remain approved public variants but their checked-in binaries are
-- stale, so the CMS renders non-broken "Files pending" cards until validated
-- replacements are supplied. Italian is not inserted without a real asset.
-- First neutralize every row that falls outside the public policy, including
-- deceptive approved labels whose asset paths point at private/deprecated CVs.
update public.resumes
set
  pdf_url = null,
  docx_url = null,
  published = false,
  updated_at = pg_catalog.now()
where (
    pg_catalog.lower(pg_catalog.concat_ws(' ', variant, label, pdf_url, docx_url))
      ~ '(ats|canad|master)'
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

update public.resumes
set
  label = case variant
    when 'english-professional-cv' then 'English Professional CV'
    when 'french-cv' then 'French CV'
  end,
  pdf_url = case
    when pdf_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.pdf',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf'
    ) then null
    else pdf_url
  end,
  docx_url = case
    when docx_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.docx',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx'
    ) then null
    else docx_url
  end,
  sort_order = case variant
    when 'english-professional-cv' then 0
    when 'french-cv' then 1
  end,
  published = true,
  updated_at = pg_catalog.now()
where variant in ('english-professional-cv', 'french-cv')
  and (
    not published
    or label is distinct from case variant
      when 'english-professional-cv' then 'English Professional CV'
      when 'french-cv' then 'French CV'
    end
    or sort_order is distinct from case variant
      when 'english-professional-cv' then 0
      when 'french-cv' then 1
    end
    or pdf_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.pdf',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf'
    )
    or docx_url in (
      '/cv/Ahmed_Aziz_Mhiri_CV_English.docx',
      '/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx'
    )
  );

do $wave1_postflight$
begin
  if exists (
    select 1
    from public.profile
    where published
      and (
        availability ~* '(october|oct\.?|summer)[[:space:]]+2027'
        or headline <> 'Marketing & Commercial Analyst'
        or short_bio not ilike '%Digital Transformation Project Manager at El Mouradi Hotels%'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: profile positioning remains stale';
  end if;

  if not exists (
    select 1
    from public.experience
    where published
      and company = 'El Mouradi Hotels'
      and role = 'Digital Transformation Project Manager'
      and start_date = 'Jul 2026'
      and end_date = 'Present'
      and date_label = 'Jul 2026 - Present'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: current El Mouradi role is incorrect';
  end if;

  if exists (
    select 1
    from public.experience
    where published
      and company ilike '%Sunshine%'
      and (
        end_date ilike 'Present'
        or date_label ~* 'present|current'
      )
  ) or not exists (
    select 1
    from public.experience
    where published
      and company = 'Sunshine Holiday Group / Sunshine Vacances France'
      and role = 'Head of IT Services | Process Automation & Business Systems'
      and start_date = 'Jul 2025'
      and end_date = 'Jul 2026'
      and date_label = 'Jul 2025 - Jul 2026'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: Sunshine role is still current or incorrectly dated';
  end if;

  if not exists (
    select 1
    from public.experience
    where published
      and company = 'El Mouradi Hotels'
      and role = 'Management Control Intern'
      and start_date = 'Jun 2023'
      and end_date = 'Sep 2023'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: 2023 El Mouradi internship is incorrect';
  end if;

  if exists (
    select 1
    from (
      values
        ('Maison Salina', 'Freelance Commercial & Digital Marketing Manager', 3),
        ('Chic-Chac', 'Freelance Digital Transformation & Data-Driven Marketing Consultant', 4),
        ('VERMEG for Banking & Insurance Software', 'AI & Full-Stack Development Intern', 5),
        ('El Mouradi Club Kantaoui', 'Management Controller', 6),
        ('ArabSoft', 'Full-Stack Development Intern', 7)
    ) as expected(company, role, sort_order)
    where not exists (
      select 1
      from public.experience
      where published
        and experience.company = expected.company
        and experience.role = expected.role
        and experience.sort_order = expected.sort_order
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: supporting experience order or role wording is incorrect';
  end if;

  if not exists (
    select 1
    from public.education
    where published
      and degree = 'Master’s in Big Data Analytics & E-Commerce'
      and start_date = 'Oct 2025'
      and end_date = 'Jun 2027'
      and status ilike '%expected graduation June 2027%'
  ) or not exists (
    select 1
    from public.education
    where published
      and degree = 'Licence / Bachelor’s degree in Business Intelligence'
      and start_date = 'Jan 2021'
      and end_date = 'Jun 2025'
      and status like '%17.11/20%'
      and status like '%PFE grade: 19.5/20%'
      and status like '%Mention Excellent%'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: education facts are incomplete';
  end if;

  if exists (
    select 1
    from public.page_sections
    where pg_catalog.concat_ws(' ', title, subtitle, description) ~*
      '(october|oct\.?|summer)[[:space:]]+2027|llm interface for multi-agent|master multi-agent'
  ) or exists (
    select 1
    from public.page_section_items
    where pg_catalog.concat_ws(' ', title, subtitle, description) ~*
      '(october|oct\.?|summer)[[:space:]]+2027|llm interface for multi-agent|master multi-agent'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: a page-builder shadow copy remains stale';
  end if;

  if not exists (
    select 1
    from public.page_section_items as item
    join public.page_sections as section on section.id = item.page_section_id
    join public.pages as page on page.id = section.page_id
    where page.page_key = 'education'
      and section.section_key = 'canonical-education'
      and item.display_order = 0
      and item.title = 'Master’s in Big Data Analytics & E-Commerce'
      and item.description like '%expected graduation June 2027%'
      and item.description like '%Oct 2025 - Jun 2027%'
  ) or not exists (
    select 1
    from public.page_section_items as item
    join public.page_sections as section on section.id = item.page_section_id
    join public.pages as page on page.id = section.page_id
    where page.page_key = 'education'
      and section.section_key = 'canonical-education'
      and item.display_order = 1
      and item.description like '%17.11/20%'
      and item.description like '%PFE grade: 19.5/20%'
      and item.description like '%Mention Excellent%'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: canonical education item is incomplete';
  end if;

  if exists (
    select 1
    from public.projects
    where slug = 'master-multi-agent-llm-project'
       or pg_catalog.lower(title) in (
            'master multi-agent llm project',
            'llm interface for multi-agent system management'
          )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: obsolete Master LLM project remains';
  end if;

  if exists (
    select 1
    from public.resumes
    where (
        pg_catalog.lower(pg_catalog.concat_ws(' ', variant, label, pdf_url, docx_url))
          ~ '(ats|canad|master)'
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
      ) and (
        published
        or pdf_url is not null
        or docx_url is not null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: deprecated or private resume is publicly configured';
  end if;

  if (
    select pg_catalog.count(*)
    from public.resumes
    where variant = 'english-professional-cv'
      and published
  ) <> 1 or (
    select pg_catalog.count(*)
    from public.resumes
    where variant = 'french-cv'
      and published
  ) <> 1 or exists (
    select 1
    from public.resumes
    where variant in ('english-professional-cv', 'french-cv')
      and (
        pdf_url in (
          '/cv/Ahmed_Aziz_Mhiri_CV_English.pdf',
          '/cv/Ahmed_Aziz_Mhiri_CV_Francais.pdf'
        )
        or docx_url in (
          '/cv/Ahmed_Aziz_Mhiri_CV_English.docx',
          '/cv/Ahmed_Aziz_Mhiri_CV_Francais.docx'
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 postflight failed: approved EN/FR resume policy is incomplete or stale';
  end if;
end
$wave1_postflight$;

commit;

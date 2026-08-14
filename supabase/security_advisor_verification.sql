-- Read-only post-migration verification through
-- 20260727130027_portfolio_hardening_v1.sql.
-- Run this in the Supabase SQL Editor only after reviewing and applying the
-- intended migrations through the controlled production runbook.
begin;
set transaction read only;

-- Function location, owner, security mode, pinned configuration, and exact body.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  p.proconfig as function_config,
  pg_get_functiondef(p.oid) as definition
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('public', 'set_updated_at'),
  ('public', 'is_admin'),
  ('private', 'is_admin'),
  ('public', 'consume_rate_limit'),
  ('public', 'cleanup_rate_limit_buckets')
)
order by n.nspname, p.proname;

-- Machine-readable hardening summary. Every column should return true after the
-- migration, except behavioral tests that are deliberately listed separately in
-- the remediation report.
select
  to_regprocedure('public.is_admin()') is null as public_is_admin_absent,
  exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'is_admin'
      and pg_get_function_identity_arguments(p.oid) = ''
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = 'postgres'
      and 'search_path=""' = any(coalesce(p.proconfig, array[]::text[]))
  ) as private_is_admin_hardened,
  exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
      and 'search_path=pg_catalog' = any(coalesce(p.proconfig, array[]::text[]))
  ) as set_updated_at_path_pinned,
  not coalesce(
    has_function_privilege('anon', to_regprocedure('private.is_admin()'), 'execute'),
    false
  ) as anon_cannot_execute_private_is_admin,
  coalesce(
    has_function_privilege('authenticated', to_regprocedure('private.is_admin()'), 'execute'),
    false
  ) as authenticated_can_execute_private_is_admin,
  not coalesce(
    has_function_privilege('service_role', to_regprocedure('private.is_admin()'), 'execute'),
    false
  ) as service_role_cannot_execute_private_is_admin,
  not exists (
    select 1
    from pg_policies
    where coalesce(qual, '') ilike '%public.is_admin%'
       or coalesce(with_check, '') ilike '%public.is_admin%'
  ) as no_policy_references_public_is_admin,
  exists (
    select 1
    from pg_policies
    where coalesce(qual, '') ilike '%private.is_admin%'
       or coalesce(with_check, '') ilike '%private.is_admin%'
  ) as policies_reference_private_is_admin,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Public can read portfolio assets',
        'Public can read public portfolio storage'
      )
  ) as broad_storage_listing_policies_absent;

-- Effective function execution privileges. public.is_admin should return no row;
-- private.is_admin should be false/true/false for anon/authenticated/service_role.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where p.proname in (
    'is_admin',
    'set_updated_at',
    'consume_rate_limit',
    'cleanup_rate_limit_buckets'
  )
  and n.nspname in ('public', 'private')
order by n.nspname, p.proname;

-- Raw function ACLs, including grants inherited through PUBLIC.
select
  n.nspname as function_schema,
  p.proname as function_name,
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
cross join lateral aclexplode(
  coalesce(p.proacl, acldefault('f'::"char", p.proowner))
) as acl
where p.proname in (
    'is_admin',
    'set_updated_at',
    'consume_rate_limit',
    'cleanup_rate_limit_buckets'
  )
  and n.nspname in ('public', 'private')
order by n.nspname, p.proname, grantee, acl.privilege_type;

-- The authenticated role needs private-schema USAGE for RLS evaluation; anon does not.
select
  n.nspname as schema_name,
  has_schema_privilege('anon', n.oid, 'usage') as anon_has_usage,
  has_schema_privilege('authenticated', n.oid, 'usage') as authenticated_has_usage,
  has_schema_privilege('service_role', n.oid, 'usage') as service_role_has_usage
from pg_namespace as n
where n.nspname = 'private';

-- Every RLS dependency should now deparse as private.is_admin(), with the original
-- commands, roles, USING clauses, and WITH CHECK clauses otherwise unchanged.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where coalesce(qual, '') ilike '%is_admin%'
   or coalesce(with_check, '') ilike '%is_admin%'
order by schemaname, tablename, policyname;

-- Direct catalog dependencies from policies to the moved helper.
select
  policy_namespace.nspname as policy_schema,
  policy_table.relname as policy_table,
  policy.polname as policy_name,
  function_namespace.nspname as function_schema,
  function_proc.proname as function_name
from pg_depend as dependency
join pg_policy as policy
  on dependency.classid = 'pg_policy'::regclass
 and dependency.objid = policy.oid
join pg_class as policy_table on policy_table.oid = policy.polrelid
join pg_namespace as policy_namespace on policy_namespace.oid = policy_table.relnamespace
join pg_proc as function_proc
  on dependency.refclassid = 'pg_proc'::regclass
 and dependency.refobjid = function_proc.oid
join pg_namespace as function_namespace on function_namespace.oid = function_proc.pronamespace
where function_proc.proname = 'is_admin'
  and function_namespace.nspname = 'private'
order by policy_namespace.nspname, policy_table.relname, policy.polname;

-- Inspect all storage.object policies. The broad public-listing policies and
-- the authenticated admin mutation policy owned by this repository should all
-- be absent because reads use public object URLs and writes are server-mediated.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- Bucket visibility is intentionally unchanged. Known public object URLs continue
-- to work even though anonymous storage.objects enumeration policies are removed.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('portfolio-assets', 'public-assets', 'project-images', 'resumes', 'uploads')
order by id;

-- Trigger bindings should still point to the same public.set_updated_at() object.
-- The expected inventory also exposes pre-existing missing-trigger drift instead
-- of silently omitting missing bindings.
with expected(table_name, trigger_name) as (
  values
    ('profile', 'set_profile_updated_at'),
    ('hero', 'set_hero_updated_at'),
    ('about', 'set_about_updated_at'),
    ('skills', 'set_skills_updated_at'),
    ('projects', 'set_projects_updated_at'),
    ('project_sections', 'set_project_sections_updated_at'),
    ('experience', 'set_experience_updated_at'),
    ('education', 'set_education_updated_at'),
    ('certifications', 'set_certifications_updated_at'),
    ('resumes', 'set_resumes_updated_at'),
    ('social_links', 'set_social_links_updated_at'),
    ('site_settings', 'set_site_settings_updated_at'),
    ('admin_security_preferences', 'set_admin_security_preferences_updated_at'),
    ('contact_messages', 'set_contact_messages_updated_at'),
    ('pages', 'set_pages_updated_at'),
    ('page_sections', 'set_page_sections_updated_at'),
    ('page_section_items', 'set_page_section_items_updated_at'),
    ('project_section_items', 'set_project_section_items_updated_at'),
    ('project_media', 'set_project_media_updated_at'),
    ('volunteering', 'set_volunteering_updated_at')
)
select
  expected.table_name,
  expected.trigger_name,
  trigger_row.oid is not null
    and table_namespace.nspname = 'public'
    and function_namespace.nspname = 'public'
    and function_proc.proname = 'set_updated_at' as correctly_bound
from expected
left join pg_namespace as table_namespace
  on table_namespace.nspname = 'public'
left join pg_class as table_relation
  on table_relation.relnamespace = table_namespace.oid
 and table_relation.relname = expected.table_name
left join pg_trigger as trigger_row
  on trigger_row.tgrelid = table_relation.oid
 and trigger_row.tgname = expected.trigger_name
 and not trigger_row.tgisinternal
left join pg_proc as function_proc on function_proc.oid = trigger_row.tgfoid
left join pg_namespace as function_namespace on function_namespace.oid = function_proc.pronamespace
order by expected.table_name;

-- Full actual binding inventory for diagnosis.
select
  table_namespace.nspname as table_schema,
  table_relation.relname as table_name,
  trigger_row.tgname as trigger_name,
  function_namespace.nspname as function_schema,
  function_proc.proname as function_name
from pg_trigger as trigger_row
join pg_class as table_relation on table_relation.oid = trigger_row.tgrelid
join pg_namespace as table_namespace on table_namespace.oid = table_relation.relnamespace
join pg_proc as function_proc on function_proc.oid = trigger_row.tgfoid
join pg_namespace as function_namespace on function_namespace.oid = function_proc.pronamespace
where not trigger_row.tgisinternal
  and function_namespace.nspname = 'public'
  and function_proc.proname = 'set_updated_at'
order by table_namespace.nspname, table_relation.relname, trigger_row.tgname;

-- Portfolio-hardening machine summary. Every column should be true.
select
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260727130027'
  ) as migration_recorded,
  to_regclass('public.cms_content_revisions') is not null
    as revisions_table_present,
  to_regclass('private.rate_limit_buckets') is not null
    as rate_limit_table_present,
  to_regprocedure(
    'public.consume_rate_limit(text,text,integer,integer)'
  ) is not null as consume_rpc_present,
  to_regprocedure('public.cleanup_rate_limit_buckets()') is not null
    as cleanup_rpc_present,
  not coalesce(
    has_function_privilege(
      'anon',
      to_regprocedure(
        'public.consume_rate_limit(text,text,integer,integer)'
      ),
      'execute'
    ),
    false
  ) as anon_cannot_consume_rate_limit,
  not coalesce(
    has_function_privilege(
      'authenticated',
      to_regprocedure(
        'public.consume_rate_limit(text,text,integer,integer)'
      ),
      'execute'
    ),
    false
  ) as authenticated_cannot_consume_rate_limit,
  coalesce(
    has_function_privilege(
      'service_role',
      to_regprocedure(
        'public.consume_rate_limit(text,text,integer,integer)'
      ),
      'execute'
    ),
    false
  ) as service_role_can_consume_rate_limit,
  not coalesce(
    has_function_privilege(
      'anon',
      to_regprocedure('public.cleanup_rate_limit_buckets()'),
      'execute'
    ),
    false
  ) as anon_cannot_cleanup_rate_limits,
  not coalesce(
    has_function_privilege(
      'authenticated',
      to_regprocedure('public.cleanup_rate_limit_buckets()'),
      'execute'
    ),
    false
  ) as authenticated_cannot_cleanup_rate_limits,
  coalesce(
    has_function_privilege(
      'service_role',
      to_regprocedure('public.cleanup_rate_limit_buckets()'),
      'execute'
    ),
    false
  ) as service_role_can_cleanup_rate_limits,
  not has_table_privilege(
    'authenticated',
    'private.rate_limit_buckets',
    'select'
  ) as authenticated_cannot_read_rate_buckets,
  not has_table_privilege(
    'service_role',
    'private.rate_limit_buckets',
    'select'
  ) as service_role_cannot_bypass_rate_rpc,
  not has_table_privilege(
    'authenticated',
    'storage.objects',
    'insert'
  )
  and not has_table_privilege(
    'authenticated',
    'storage.objects',
    'update'
  )
  and not has_table_privilege(
    'authenticated',
    'storage.objects',
    'delete'
  ) as authenticated_storage_dml_revoked,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Public can read portfolio assets',
        'Public can read public portfolio storage',
        'Admins manage portfolio storage'
      )
  ) as repository_storage_policies_absent,
  not exists (
    select 1
    from (
      values
        ('home', '/'),
        ('about', '/about'),
        ('expertise', '/expertise'),
        ('projects', '/projects'),
        ('experience', '/experience'),
        ('education', '/education'),
        ('certifications', '/certifications'),
        ('resume', '/resume'),
        ('contact', '/contact')
    ) as expected_pages(page_key, slug)
    left join public.pages as page
      on page.page_key = expected_pages.page_key
    where page.id is null
       or page.slug <> expected_pages.slug
       or page.is_published is not true
  ) as canonical_page_registry_published,
  not exists (
    select 1
    from public.profile
    where availability ~* '(october|oct\.?|summer)[[:space:]]+2027'
  )
  and not exists (
    select 1
    from public.page_sections
    where concat_ws(' ', title, subtitle, description) ~*
      '(october|oct\.?|summer)[[:space:]]+2027|llm interface for multi-agent|master multi-agent'
  )
  and not exists (
    select 1
    from public.page_section_items
    where concat_ws(' ', title, subtitle, description) ~*
      '(october|oct\.?|summer)[[:space:]]+2027|llm interface for multi-agent|master multi-agent'
  ) as known_wave1_stale_copy_absent,
  exists (
    select 1
    from public.experience
    where published
      and company = 'El Mouradi Hotels'
      and role = 'Digital Transformation Project Manager'
      and start_date = 'Jul 2026'
      and end_date = 'Present'
  )
  and exists (
    select 1
    from public.experience
    where published
      and company = 'Sunshine Holiday Group / Sunshine Vacances France'
      and role = 'Head of IT Services | Process Automation & Business Systems'
      and start_date = 'Jul 2025'
      and end_date = 'Jul 2026'
  )
  and exists (
    select 1
    from public.experience
    where published
      and company = 'El Mouradi Hotels'
      and role = 'Management Control Intern'
      and start_date = 'Jun 2023'
      and end_date = 'Sep 2023'
  ) as wave1_experience_facts_current,
  exists (
    select 1
    from public.education
    where published
      and degree ilike '%Big Data Analytics%'
      and start_date = 'Oct 2025'
      and end_date = 'Jun 2027'
  )
  and exists (
    select 1
    from public.education
    where published
      and degree ilike '%Business Intelligence%'
      and start_date = 'Jan 2021'
      and end_date = 'Jun 2025'
      and status like '%17.11/20%'
      and status like '%PFE grade: 19.5/20%'
      and status like '%Mention Excellent%'
  ) as wave1_education_facts_current,
  not exists (
    select 1
    from public.projects
    where slug = 'master-multi-agent-llm-project'
       or lower(title) in (
            'master multi-agent llm project',
            'llm interface for multi-agent system management'
          )
  ) as wave1_obsolete_project_absent,
  (
    select count(*)
    from public.resumes
    where variant = 'english-professional-cv'
      and published
  ) = 1
  and (
    select count(*)
    from public.resumes
    where variant = 'french-cv'
      and published
  ) = 1
  and (
    select count(*)
    from public.resumes
    where variant = 'italian-cv'
      and published
  ) = 1
  and (
    select count(*)
    from public.resumes
    where published
  ) = 3
  and not exists (
    select 1
    from public.resumes
    where published
      and (
        pdf_url is null
        or docx_url is null
        or pdf_url not like 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/%?download=%'
        or docx_url not like 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/%?download=%'
      )
  )
  and not exists (
    select 1
    from public.resumes
    where (
        lower(concat_ws(' ', variant, label, pdf_url, docx_url))
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
  )
  and not exists (
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
  ) as wave1_resume_policy_current,
  not exists (
    select 1
    from public.projects
    where slug in (
      'vermeg-ai-ready-e-learning-platform',
      'ai-ready-elearning-platform'
    )
      and (
        title not ilike '%prototype%'
        or summary not ilike '%two-person%'
        or summary not ilike '%chatbot%'
        or summary not ilike '%selected application services%'
        or summary not ilike '%not presented as a production deployment%'
        or description not ilike '%not sole-authored%'
      )
  )
  and not exists (
    select 1
    from public.experience
    where company ilike 'VERMEG%'
      and (
        array_to_string(points, ' ') not ilike '%prototype%'
        or array_to_string(points, ' ') not ilike '%two-person%'
        or array_to_string(points, ' ') not ilike '%chatbot%'
        or array_to_string(points, ' ')
            not ilike '%selected application services%'
        or array_to_string(points, ' ')
            not ilike '%not presented as a production deployment%'
        or array_to_string(points, ' ') not ilike '%not sole-authored%'
      )
  ) as vermeg_prototype_attribution_bounded;

-- Canonical public-page registry. Expect nine published rows with exact slugs.
with expected_pages(page_key, slug) as (
  values
    ('home', '/'),
    ('about', '/about'),
    ('expertise', '/expertise'),
    ('projects', '/projects'),
    ('experience', '/experience'),
    ('education', '/education'),
    ('certifications', '/certifications'),
    ('resume', '/resume'),
    ('contact', '/contact')
)
select
  expected_pages.page_key,
  expected_pages.slug as expected_slug,
  page.slug as actual_slug,
  page.title,
  page.is_published,
  page.updated_at
from expected_pages
left join public.pages as page
  on page.page_key = expected_pages.page_key
order by expected_pages.page_key;

-- Exact contact-delivery columns, nullability, and defaults.
select
  column_name,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contact_messages'
  and column_name in (
    'submission_id',
    'delivery_status',
    'delivery_attempts',
    'last_delivery_attempt_at',
    'next_delivery_attempt_at',
    'delivered_at',
    'delivery_error_code',
    'provider_message_id'
  )
order by ordinal_position;

-- Contact constraints and indexes. submission_id must have a valid, non-partial,
-- one-column unique index. The queue index should be partial.
select
  constraint_row.conname as constraint_name,
  constraint_row.contype as constraint_type,
  constraint_row.convalidated as validated,
  pg_get_constraintdef(constraint_row.oid, true) as definition
from pg_constraint as constraint_row
where constraint_row.conrelid = 'public.contact_messages'::regclass
  and (
    constraint_row.conname like 'contact_messages_delivery_%'
    or (
     constraint_row.conrelid = 'public.contact_messages'::regclass
     and constraint_row.conname = 'contact_messages_submission_id_key'
    )
  )
order by constraint_row.conname;

select
  index_relation.relname as index_name,
  index_row.indisunique,
  index_row.indisvalid,
  pg_get_expr(index_row.indpred, index_row.indrelid) as predicate,
  pg_get_indexdef(index_row.indexrelid) as definition
from pg_index as index_row
join pg_class as index_relation
  on index_relation.oid = index_row.indexrelid
where index_row.indrelid = 'public.contact_messages'::regclass
  and (
    pg_get_indexdef(index_row.indexrelid, 1, true) = 'submission_id'
    or index_relation.relname = 'contact_messages_delivery_queue_idx'
  )
order by index_relation.relname;

-- Confirm the three production-observed full FK index gaps are closed. Every
-- full_index_present value should be true.
with expected_index(table_name, column_name) as (
  values
    ('admin_audit_logs', 'actor_user_id'),
    ('admin_remembered_devices', 'user_id'),
    ('uploads', 'uploaded_by')
)
select
  expected_index.table_name,
  expected_index.column_name,
  exists (
    select 1
    from pg_index as index_row
    where index_row.indrelid = to_regclass(
            format('public.%I', expected_index.table_name)
          )
      and index_row.indisvalid
      and index_row.indpred is null
      and pg_get_indexdef(index_row.indexrelid, 1, true)
          = expected_index.column_name
  ) as full_index_present
from expected_index
order by expected_index.table_name;

-- Revision table columns, RLS state, policies, and append-only service ACL.
select
  column_name,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cms_content_revisions'
order by ordinal_position;

select
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as rls_forced,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_content_revisions'
  ) as no_browser_policies,
  has_table_privilege(
    'service_role',
    'public.cms_content_revisions',
    'select'
  ) as service_role_can_read,
  has_table_privilege(
    'service_role',
    'public.cms_content_revisions',
    'insert'
  ) as service_role_can_append,
  not has_table_privilege(
    'service_role',
    'public.cms_content_revisions',
    'update'
  ) as service_role_cannot_rewrite,
  not has_table_privilege(
    'service_role',
    'public.cms_content_revisions',
    'delete'
  ) as service_role_cannot_delete
from pg_class as relation
where relation.oid = 'public.cms_content_revisions'::regclass;

-- Builder duplicate idempotency state must remain reachable only through the
-- service-role compound RPC. Every boolean should be true.
select
  relation.relrowsecurity as rls_enabled,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_builder_action_requests'
  ) as no_browser_policies,
  not (
    has_table_privilege(
      'anon',
      'public.cms_builder_action_requests',
      'select'
    )
    or has_table_privilege(
      'anon',
      'public.cms_builder_action_requests',
      'insert'
    )
    or has_table_privilege(
      'anon',
      'public.cms_builder_action_requests',
      'update'
    )
    or has_table_privilege(
      'anon',
      'public.cms_builder_action_requests',
      'delete'
    )
  ) as anon_has_no_direct_access,
  not (
    has_table_privilege(
      'authenticated',
      'public.cms_builder_action_requests',
      'select'
    )
    or has_table_privilege(
      'authenticated',
      'public.cms_builder_action_requests',
      'insert'
    )
    or has_table_privilege(
      'authenticated',
      'public.cms_builder_action_requests',
      'update'
    )
    or has_table_privilege(
      'authenticated',
      'public.cms_builder_action_requests',
      'delete'
    )
  ) as authenticated_has_no_direct_access,
  not (
    has_table_privilege(
      'service_role',
      'public.cms_builder_action_requests',
      'select'
    )
    or has_table_privilege(
      'service_role',
      'public.cms_builder_action_requests',
      'insert'
    )
    or has_table_privilege(
      'service_role',
      'public.cms_builder_action_requests',
      'update'
    )
    or has_table_privilege(
      'service_role',
      'public.cms_builder_action_requests',
      'delete'
    )
  ) as service_role_must_use_rpc,
  has_function_privilege(
    'service_role',
    'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
    'execute'
  ) as service_role_can_execute_builder_rpc,
  not has_function_privilege(
    'anon',
    'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
    'execute'
  ) as anon_cannot_execute_builder_rpc,
  not has_function_privilege(
    'authenticated',
    'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
    'execute'
  ) as authenticated_cannot_execute_builder_rpc
from pg_class as relation
where relation.oid = 'public.cms_builder_action_requests'::regclass;

-- Rate-limit storage and RPC shape. Table ACLs should show no rows for
-- PUBLIC/anon/authenticated/service_role; the function ACLs should grant only
-- service_role (besides the owner).
select
  column_name,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'private'
  and table_name = 'rate_limit_buckets'
order by ordinal_position;

select
  namespace.nspname as function_schema,
  function_row.proname as function_name,
  pg_get_function_identity_arguments(function_row.oid) as identity_arguments,
  pg_get_function_result(function_row.oid) as function_result,
  pg_get_userbyid(function_row.proowner) as owner,
  function_row.prosecdef as security_definer,
  function_row.proconfig as function_config,
  has_function_privilege(
    'anon',
    function_row.oid,
    'execute'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    function_row.oid,
    'execute'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    function_row.oid,
    'execute'
  ) as service_role_can_execute
from pg_proc as function_row
join pg_namespace as namespace
  on namespace.oid = function_row.pronamespace
where namespace.nspname = 'public'
  and function_row.proname in (
    'consume_rate_limit',
    'cleanup_rate_limit_buckets'
  )
order by function_row.proname;

select
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_class as relation
cross join lateral aclexplode(
  coalesce(
    relation.relacl,
    acldefault('r'::"char", relation.relowner)
  )
) as acl
where relation.oid = 'private.rate_limit_buckets'::regclass
order by grantee, acl.privilege_type;

-- Remembered-device binding/rotation fields and upload-reconciliation fields.
select
  table_name,
  column_name,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (
      table_name = 'admin_remembered_devices'
      and column_name in (
        'device_context_hash',
        'network_context_hash',
        'last_user_agent_hash',
        'last_network_context_hash',
        'rotated_at',
        'rotation_counter',
        'revocation_reason'
      )
    )
    or (
      table_name = 'uploads'
      and column_name in (
        'sha256',
        'deletion_status',
        'deletion_requested_at',
        'deletion_error_code'
      )
    )
  )
order by table_name, ordinal_position;

select
  table_relation.relname as table_name,
  constraint_row.conname as constraint_name,
  constraint_row.convalidated as validated,
  pg_get_constraintdef(constraint_row.oid, true) as definition
from pg_constraint as constraint_row
join pg_class as table_relation
  on table_relation.oid = constraint_row.conrelid
join pg_namespace as table_namespace
  on table_namespace.oid = table_relation.relnamespace
where table_namespace.nspname = 'public'
  and (
    constraint_row.conname like 'admin_remembered_devices_%_check'
    or constraint_row.conname like 'uploads_%_check'
  )
order by table_relation.relname, constraint_row.conname;

-- Canonical RLS inventory. Public content should show one anon SELECT and one
-- authenticated SELECT policy; no table below should show browser-role writes.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (
    schemaname = 'public'
    and tablename in (
      'about',
      'admin_audit_logs',
      'admin_remembered_devices',
      'admin_security_preferences',
      'admins',
      'certifications',
      'cms_builder_action_requests',
      'cms_content_revisions',
      'contact_messages',
      'education',
      'experience',
      'hero',
      'page_section_items',
      'page_sections',
      'pages',
      'profile',
      'project_media',
      'project_section_items',
      'project_sections',
      'projects',
      'resumes',
      'site_settings',
      'skills',
      'social_links',
      'uploads',
      'volunteering'
    )
  )
  or (
    schemaname = 'storage'
    and tablename = 'objects'
  )
order by schemaname, tablename, policyname;

-- No rows expected: duplicate permissive policies for one explicit role/action.
with expanded_policies as (
  select
    policy.schemaname,
    policy.tablename,
    role_name.role_name,
    action.action,
    policy.policyname
  from pg_policies as policy
  cross join lateral unnest(policy.roles) as role_name(role_name)
  cross join lateral unnest(
    case policy.cmd
      when 'ALL'
        then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
      else array[policy.cmd]::text[]
    end
  ) as action(action)
  where policy.permissive = 'PERMISSIVE'
    and (
      (
        policy.schemaname = 'public'
        and policy.tablename in (
          'about',
          'admin_audit_logs',
          'admin_remembered_devices',
          'admin_security_preferences',
          'admins',
          'certifications',
          'cms_builder_action_requests',
          'cms_content_revisions',
          'contact_messages',
          'education',
          'experience',
          'hero',
          'page_section_items',
          'page_sections',
          'pages',
          'profile',
          'project_media',
          'project_section_items',
          'project_sections',
          'projects',
          'resumes',
          'site_settings',
          'skills',
          'social_links',
          'uploads',
          'volunteering'
        )
      )
      or (
        policy.schemaname = 'storage'
        and policy.tablename = 'objects'
      )
    )
)
select
  schemaname,
  tablename,
  role_name,
  action,
  array_agg(policyname order by policyname) as duplicate_policies
from expanded_policies
group by schemaname, tablename, role_name, action
having count(*) > 1
order by schemaname, tablename, role_name, action;

-- Effective browser-role table privileges. Every DML column should be false.
with target_tables(table_name) as (
  select *
  from unnest(array[
    'about',
    'admin_audit_logs',
    'admin_remembered_devices',
    'admin_security_preferences',
    'admins',
    'certifications',
    'cms_builder_action_requests',
    'cms_content_revisions',
    'contact_messages',
    'education',
    'experience',
    'hero',
    'page_section_items',
    'page_sections',
    'pages',
    'profile',
    'project_media',
    'project_section_items',
    'project_sections',
    'projects',
    'resumes',
    'site_settings',
    'skills',
    'social_links',
    'uploads',
    'volunteering'
  ]::text[])
)
select
  target_tables.table_name,
  has_table_privilege(
    'anon',
    format('public.%I', target_tables.table_name),
    'select'
  ) as anon_can_select,
  has_table_privilege(
    'authenticated',
    format('public.%I', target_tables.table_name),
    'select'
  ) as authenticated_can_select,
  has_table_privilege(
    'anon',
    format('public.%I', target_tables.table_name),
    'insert'
  ) as anon_can_insert,
  has_table_privilege(
    'anon',
    format('public.%I', target_tables.table_name),
    'update'
  ) as anon_can_update,
  has_table_privilege(
    'anon',
    format('public.%I', target_tables.table_name),
    'delete'
  ) as anon_can_delete,
  has_table_privilege(
    'authenticated',
    format('public.%I', target_tables.table_name),
    'insert'
  ) as authenticated_can_insert,
  has_table_privilege(
    'authenticated',
    format('public.%I', target_tables.table_name),
    'update'
  ) as authenticated_can_update,
  has_table_privilege(
    'authenticated',
    format('public.%I', target_tables.table_name),
    'delete'
  ) as authenticated_can_delete
from target_tables
order by target_tables.table_name;

-- This may be null in a direct SQL session. Also verify in Dashboard > API that
-- private is not included in Exposed schemas before applying the migration.
select current_setting('pgrst.db_schemas', true) as postgrest_exposed_schemas;

rollback;

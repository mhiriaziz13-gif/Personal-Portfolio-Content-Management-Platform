-- Fix CMS06 false positives for page-section items without project links.
--
-- The published-page invariant must reject links to unpublished projects,
-- but items with NULL/non-project link_url values are valid and must not be
-- interpreted as missing project slugs.
--
-- This migration patches only the unique affected fragment of
-- public.mutate_cms_content and fails closed if the live definition has drifted.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('fix_cms06_null_project_links', 0)
);

do $cms06_patch$
declare
  v_function_oid oid;
  v_definition text;
  v_occurrences integer;

  v_old_fragment constant text := E'         and item.is_visible\n         and not exists (\n           select 1\n           from public.projects as project\n           where project.slug = project_link.parts[1]';

  v_new_fragment constant text := E'         and item.is_visible\n         and project_link.parts[1] is not null\n         and not exists (\n           select 1\n           from public.projects as project\n           where project.slug = project_link.parts[1]';
begin
  select
    proc.oid,
    pg_catalog.replace(
      pg_catalog.pg_get_functiondef(proc.oid),
      E'\r\n',
      E'\n'
    )
  into
    v_function_oid,
    v_definition
  from pg_catalog.pg_proc as proc
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'mutate_cms_content'
    and pg_catalog.pg_get_function_identity_arguments(proc.oid)
        = 'p_table text, p_operation text, p_record_id uuid, p_expected_updated_at timestamp with time zone, p_values jsonb, p_actor_user_id uuid'
    and proc.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype
    and proc.prosecdef
    and 'search_path=""' = any(
      coalesce(proc.proconfig, array[]::text[])
    );

  if v_function_oid is null then
    raise exception using
      errcode = 'P0001',
      message = 'CMS06 patch preflight failed: mutate_cms_content is missing or has unexpected security metadata';
  end if;

  v_occurrences :=
    (
      pg_catalog.length(v_definition)
      - pg_catalog.length(
          pg_catalog.replace(
            v_definition,
            v_old_fragment,
            ''
          )
        )
    )
    / pg_catalog.length(v_old_fragment);

  if v_occurrences <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'CMS06 patch preflight failed: expected exactly one affected fragment',
      detail = pg_catalog.format(
        'Found %s matching fragments in public.mutate_cms_content',
        v_occurrences
      ),
      hint = 'Inspect the live function definition before applying this migration.';
  end if;

  v_definition := pg_catalog.replace(
    v_definition,
    v_old_fragment,
    v_new_fragment
  );

  execute v_definition;
end
$cms06_patch$;

do $cms06_postflight$
declare
  v_definition text;
begin
  select pg_catalog.replace(
    pg_catalog.pg_get_functiondef(proc.oid),
    E'\r\n',
    E'\n'
  )
  into v_definition
  from pg_catalog.pg_proc as proc
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'mutate_cms_content'
    and pg_catalog.pg_get_function_identity_arguments(proc.oid)
        = 'p_table text, p_operation text, p_record_id uuid, p_expected_updated_at timestamp with time zone, p_values jsonb, p_actor_user_id uuid';

  if v_definition is null then
    raise exception using
      errcode = 'P0001',
      message = 'CMS06 patch postflight failed: mutate_cms_content disappeared';
  end if;

  if pg_catalog.position(
    E'         and item.is_visible\n         and project_link.parts[1] is not null\n         and not exists ('
    in v_definition
  ) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'CMS06 patch postflight failed: NULL project-link guard was not installed';
  end if;

  if pg_catalog.position(
    'cms_published_page_has_unpublished_project_link'
    in v_definition
  ) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'CMS06 patch postflight failed: CMS06 publication invariant was lost';
  end if;
end
$cms06_postflight$;

commit;
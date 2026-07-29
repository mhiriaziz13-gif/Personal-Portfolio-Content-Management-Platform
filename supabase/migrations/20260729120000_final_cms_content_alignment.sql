-- Final CMS schema and public-content alignment.
--
-- This migration is deterministic, additive, transaction-scoped, and limited
-- to the existing portfolio CMS tables. It preserves unknown editorial rows,
-- refuses canonical route or owned-constraint drift, and never changes RLS,
-- grants, Storage, Realtime, or production migration history.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('final_cms_content_alignment', 0)
);

do $final_cms_alignment_preflight$
declare
  v_problem text;
  v_prospective_role_count integer;
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
    'project_media',
    'project_section_items',
    'project_sections',
    'projects',
    'resumes'
  ]::text[]) as required(required_table)
  where pg_catalog.to_regclass(
    pg_catalog.format('public.%I', required_table)
  ) is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: required tables are missing',
      detail = v_problem;
  end if;

  with expected_columns(table_name, column_name, udt_name) as (
    values
      ('about', 'id', 'uuid'),
      ('about', 'title', 'text'),
      ('about', 'body', 'text'),
      ('about', 'published', 'bool'),
      ('about', 'updated_at', 'timestamptz'),
      ('education', 'institution', 'text'),
      ('education', 'degree', 'text'),
      ('education', 'start_date', 'text'),
      ('education', 'end_date', 'text'),
      ('education', 'status', 'text'),
      ('education', 'location', 'text'),
      ('education', 'sort_order', 'int4'),
      ('education', 'published', 'bool'),
      ('experience', 'company', 'text'),
      ('experience', 'role', 'text'),
      ('experience', 'start_date', 'text'),
      ('experience', 'end_date', 'text'),
      ('experience', 'date_label', 'text'),
      ('experience', 'points', '_text'),
      ('experience', 'published', 'bool'),
      ('experience', 'updated_at', 'timestamptz'),
      ('hero', 'id', 'uuid'),
      ('hero', 'title', 'text'),
      ('hero', 'subtitle', 'text'),
      ('hero', 'tagline', 'text'),
      ('hero', 'primary_cta_label', 'text'),
      ('hero', 'primary_cta_href', 'text'),
      ('hero', 'secondary_cta_label', 'text'),
      ('hero', 'secondary_cta_href', 'text'),
      ('hero', 'published', 'bool'),
      ('hero', 'updated_at', 'timestamptz'),
      ('pages', 'id', 'uuid'),
      ('pages', 'page_key', 'text'),
      ('pages', 'title', 'text'),
      ('pages', 'slug', 'text'),
      ('pages', 'seo_title', 'text'),
      ('pages', 'seo_description', 'text'),
      ('pages', 'open_graph_title', 'text'),
      ('pages', 'open_graph_description', 'text'),
      ('pages', 'open_graph_image', 'text'),
      ('pages', 'is_published', 'bool'),
      ('pages', 'updated_at', 'timestamptz'),
      ('page_sections', 'id', 'uuid'),
      ('page_sections', 'page_id', 'uuid'),
      ('page_sections', 'section_type', 'text'),
      ('page_sections', 'layout_variant', 'text'),
      ('page_sections', 'is_visible', 'bool'),
      ('page_sections', 'is_archived', 'bool'),
      ('profile', 'id', 'uuid'),
      ('profile', 'full_name', 'text'),
      ('profile', 'headline', 'text'),
      ('profile', 'email', 'text'),
      ('profile', 'short_bio', 'text'),
      ('profile', 'about_text', 'text'),
      ('profile', 'availability', 'text'),
      ('profile', 'published', 'bool'),
      ('profile', 'updated_at', 'timestamptz'),
      ('project_media', 'project_id', 'uuid'),
      ('project_media', 'media_url', 'text'),
      ('project_media', 'is_visible', 'bool'),
      ('project_section_items', 'project_section_id', 'uuid'),
      ('project_section_items', 'label', 'text'),
      ('project_section_items', 'value', 'text'),
      ('project_section_items', 'description', 'text'),
      ('project_section_items', 'is_visible', 'bool'),
      ('project_sections', 'id', 'uuid'),
      ('project_sections', 'project_id', 'uuid'),
      ('project_sections', 'title', 'text'),
      ('project_sections', 'body', 'text'),
      ('project_sections', 'bullets', '_text'),
      ('project_sections', 'sort_order', 'int4'),
      ('project_sections', 'section_type', 'text'),
      ('project_sections', 'is_visible', 'bool'),
      ('project_sections', 'is_archived', 'bool'),
      ('project_sections', 'updated_at', 'timestamptz'),
      ('projects', 'id', 'uuid'),
      ('projects', 'slug', 'text'),
      ('projects', 'title', 'text'),
      ('projects', 'summary', 'text'),
      ('projects', 'description', 'text'),
      ('projects', 'cover_image_url', 'text'),
      ('projects', 'open_graph_image', 'text'),
      ('projects', 'seo_title', 'text'),
      ('projects', 'seo_description', 'text'),
      ('projects', 'status', 'text'),
      ('projects', 'featured', 'bool'),
      ('projects', 'published', 'bool'),
      ('projects', 'home_featured_order', 'int4'),
      ('projects', 'updated_at', 'timestamptz'),
      ('resumes', 'label', 'text'),
      ('resumes', 'variant', 'text'),
      ('resumes', 'pdf_url', 'text'),
      ('resumes', 'docx_url', 'text'),
      ('resumes', 'sort_order', 'int4'),
      ('resumes', 'published', 'bool')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I.%I expected %s, found %s',
      expected.table_name,
      expected.column_name,
      expected.udt_name,
      coalesce(columns.udt_name, '<missing>')
    ),
    '; '
    order by expected.table_name, expected.column_name
  )
  into v_problem
  from expected_columns as expected
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = expected.table_name
   and columns.column_name = expected.column_name
  where columns.column_name is null
     or columns.udt_name <> expected.udt_name;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: required column drift',
      detail = v_problem;
  end if;

  with additive_columns(table_name, column_name, udt_name) as (
    values
      ('pages', 'navigation_label', 'text'),
      ('pages', 'navigation_order', 'int4'),
      ('pages', 'show_in_navigation', 'bool'),
      ('pages', 'show_in_footer', 'bool'),
      ('project_sections', 'layout_variant', 'text')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I.%I expected %s, found %s',
      expected.table_name,
      expected.column_name,
      expected.udt_name,
      columns.udt_name
    ),
    '; '
    order by expected.table_name, expected.column_name
  )
  into v_problem
  from additive_columns as expected
  join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = expected.table_name
   and columns.column_name = expected.column_name
  where columns.udt_name <> expected.udt_name;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: additive column drift',
      detail = v_problem;
  end if;

  with expected_pages(page_key, slug) as (
    values
      ('home', '/'),
      ('projects', '/projects'),
      ('experience', '/experience'),
      ('expertise', '/expertise'),
      ('about', '/about'),
      ('contact', '/contact'),
      ('resume', '/resume'),
      ('education', '/education'),
      ('certifications', '/certifications')
  ),
  problems as (
    select pg_catalog.format(
      'page_key %L has slug %L; expected %L',
      page.page_key,
      page.slug,
      expected.slug
    ) as problem
    from public.pages as page
    join expected_pages as expected on expected.page_key = page.page_key
    where page.slug <> expected.slug

    union all

    select pg_catalog.format(
      'canonical slug %L belongs to page_key %L; expected %L',
      page.slug,
      page.page_key,
      expected.page_key
    )
    from public.pages as page
    join expected_pages as expected on expected.slug = page.slug
    where page.page_key <> expected.page_key
  )
  select pg_catalog.string_agg(problem, '; ' order by problem)
  into v_problem
  from problems;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: canonical route ownership drift',
      detail = v_problem,
      hint = 'Resolve the conflicting page row in a separately reviewed change; canonical routes are code-owned.';
  end if;

  if exists (
    select 1
    from public.page_sections
    where nullif(pg_catalog.btrim(layout_variant), '') is not null
      and not (
        (
          section_type in ('hero', 'rich_text', 'split_content', 'cta')
          and layout_variant in ('default', 'compact', 'split')
        )
        or (
          section_type in (
            'custom_cards',
            'featured_projects',
            'projects_grid',
            'skills',
            'certifications_grid',
            'media_gallery'
          )
          and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
        )
        or (
          section_type = 'stats'
          and layout_variant in (
            'default',
            'compact',
            'grid-2',
            'grid-3',
            'metrics'
          )
        )
        or (
          section_type = 'experience_list'
          and layout_variant in ('default', 'compact', 'timeline')
        )
        or (
          section_type = 'volunteering'
          and layout_variant in (
            'default',
            'compact',
            'grid-2',
            'timeline'
          )
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: incompatible page block/variant pair';
  end if;

  if exists (
    select 1
    from public.page_sections
    where section_type not in (
      'hero',
      'rich_text',
      'split_content',
      'custom_cards',
      'stats',
      'featured_projects',
      'projects_grid',
      'experience_list',
      'skills',
      'certifications_grid',
      'volunteering',
      'media_gallery',
      'cta'
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: unsupported page block type';
  end if;

  if exists (
    select 1
    from public.project_sections
    where section_type not in ('rich_text', 'media_gallery', 'media')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: unsupported project block type';
  end if;

  select pg_catalog.count(*)::integer
  into v_prospective_role_count
  from public.experience
  where published
    and role ilike '%software%'
    and (
      company ilike '%El Mouradi%'
      or company ilike '%Sunshine%'
    )
    and (
      (
        company ilike '%El Mouradi%'
        and company ilike '%Sunshine%'
      )
      or pg_catalog.concat_ws(
           ' ',
           start_date,
           end_date,
           date_label,
           pg_catalog.array_to_string(points, ' ')
         ) ~* '(future|planned|prospective|upcoming|2027|2028|2029)'
    );

  if v_prospective_role_count > 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: prospective software-role selector is ambiguous',
      detail = pg_catalog.format(
        'selector matched %s published experience rows',
        v_prospective_role_count
      ),
      hint = 'Review the matching rows read-only and issue a separately reviewed migration; do not broaden this selector.';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.pages'::pg_catalog.regclass
      and constraint_row.conname = 'pages_navigation_order_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.pages'::pg_catalog.regclass
      and constraint_row.conname = 'pages_navigation_order_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.pg_get_constraintdef(constraint_row.oid, true),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'checknavigation_order>=0'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: pages_navigation_order_check definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.page_sections'::pg_catalog.regclass
      and constraint_row.conname = 'page_sections_section_type_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.page_sections'::pg_catalog.regclass
      and constraint_row.conname = 'page_sections_section_type_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_constraintdef(constraint_row.oid, true),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'checksection_type=anyarray[''hero'',''rich_text'',''split_content'',''custom_cards'',''stats'',''featured_projects'',''projects_grid'',''experience_list'',''skills'',''certifications_grid'',''volunteering'',''media_gallery'',''cta'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: page_sections_section_type_check definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.page_sections'::pg_catalog.regclass
      and constraint_row.conname = 'page_sections_block_variant_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.page_sections'::pg_catalog.regclass
      and constraint_row.conname = 'page_sections_block_variant_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_constraintdef(constraint_row.oid, true),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'checksection_type=anyarray[''hero'',''rich_text'',''split_content'',''cta'']andlayout_variant=anyarray[''default'',''compact'',''split'']orsection_type=anyarray[''custom_cards'',''featured_projects'',''projects_grid'',''skills'',''certifications_grid'',''media_gallery'']andlayout_variant=anyarray[''default'',''compact'',''grid-2'',''grid-3'']orsection_type=''stats''andlayout_variant=anyarray[''default'',''compact'',''grid-2'',''grid-3'',''metrics'']orsection_type=''experience_list''andlayout_variant=anyarray[''default'',''compact'',''timeline'']orsection_type=''volunteering''andlayout_variant=anyarray[''default'',''compact'',''grid-2'',''timeline'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: page_sections_block_variant_check definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.project_sections'::pg_catalog.regclass
      and constraint_row.conname = 'project_sections_section_type_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.project_sections'::pg_catalog.regclass
      and constraint_row.conname = 'project_sections_section_type_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_constraintdef(constraint_row.oid, true),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'checksection_type=anyarray[''rich_text'',''media_gallery'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: project_sections_section_type_check definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.project_sections'::pg_catalog.regclass
      and constraint_row.conname = 'project_sections_block_variant_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.project_sections'::pg_catalog.regclass
      and constraint_row.conname = 'project_sections_block_variant_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_constraintdef(constraint_row.oid, true),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'checksection_type=''rich_text''andlayout_variant=anyarray[''default'',''compact'',''split'']orsection_type=''media_gallery''andlayout_variant=anyarray[''default'',''compact'',''grid-2'',''grid-3'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: project_sections_block_variant_check definition drift';
  end if;

  if pg_catalog.to_regclass(
       'public.cms_builder_action_requests'
     ) is not null then
    with expected_columns(
      column_name,
      udt_name,
      is_nullable
    ) as (
      values
        ('actor_user_id', 'uuid', 'NO'),
        ('idempotency_key', 'uuid', 'NO'),
        ('request_payload', 'jsonb', 'NO'),
        ('response_payload', 'jsonb', 'YES'),
        ('created_at', 'timestamptz', 'NO'),
        ('completed_at', 'timestamptz', 'YES')
    )
    select pg_catalog.string_agg(
      pg_catalog.format(
        '%I expected %s/%s, found %s/%s',
        expected.column_name,
        expected.udt_name,
        expected.is_nullable,
        coalesce(columns.udt_name, '<missing>'),
        coalesce(columns.is_nullable, '<missing>')
      ),
      '; '
      order by expected.column_name
    )
    into v_problem
    from expected_columns as expected
    left join information_schema.columns as columns
      on columns.table_schema = 'public'
     and columns.table_name = 'cms_builder_action_requests'
     and columns.column_name = expected.column_name
    where columns.column_name is null
       or columns.udt_name <> expected.udt_name
       or columns.is_nullable <> expected.is_nullable;

    if v_problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment preflight failed: builder request table drift',
        detail = v_problem;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid =
            'public.cms_builder_action_requests'::pg_catalog.regclass
        and constraint_row.conname = 'cms_builder_action_requests_pkey'
        and constraint_row.contype = 'p'
        and (
          select pg_catalog.array_agg(
            attribute.attname::text
            order by key_column.ordinality
          )
          from pg_catalog.unnest(constraint_row.conkey)
            with ordinality as key_column(attribute_number, ordinality)
          join pg_catalog.pg_attribute as attribute
            on attribute.attrelid = constraint_row.conrelid
           and attribute.attnum = key_column.attribute_number
        ) = array['actor_user_id', 'idempotency_key']::text[]
    )
    or (
      select pg_catalog.count(*)
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid =
            'public.cms_builder_action_requests'::pg_catalog.regclass
        and constraint_row.contype = 'c'
        and constraint_row.conname in (
          'cms_builder_action_requests_request_payload_check',
          'cms_builder_action_requests_response_payload_check',
          'cms_builder_action_requests_completion_state_check'
        )
    ) <> 3 then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment preflight failed: builder request constraints drift';
    end if;

    if exists (
      select 1
      from pg_catalog.pg_policies as policy
      where policy.schemaname = 'public'
        and policy.tablename = 'cms_builder_action_requests'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment preflight failed: builder request table has unexpected RLS policies';
    end if;
  end if;
end;
$final_cms_alignment_preflight$;

alter table public.pages
  add column if not exists navigation_label text,
  add column if not exists navigation_order integer not null default 0,
  add column if not exists show_in_navigation boolean not null default false,
  add column if not exists show_in_footer boolean not null default false;

alter table public.project_sections
  add column if not exists layout_variant text;

do $project_block_variant_preflight$
begin
  if exists (
    select 1
    from public.project_sections
    where nullif(pg_catalog.btrim(layout_variant), '') is not null
      and not (
        (
          section_type = 'rich_text'
          and layout_variant in ('default', 'compact', 'split')
        )
        or (
          section_type in ('media_gallery', 'media')
          and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment preflight failed: incompatible project block/variant pair';
  end if;
end;
$project_block_variant_preflight$;

update public.pages
set
  navigation_order = coalesce(navigation_order, 0),
  show_in_navigation = coalesce(show_in_navigation, false),
  show_in_footer = coalesce(show_in_footer, false)
where navigation_order is null
   or show_in_navigation is null
   or show_in_footer is null;

alter table public.pages
  alter column navigation_order set default 0,
  alter column navigation_order set not null,
  alter column show_in_navigation set default false,
  alter column show_in_navigation set not null,
  alter column show_in_footer set default false,
  alter column show_in_footer set not null;

update public.page_sections
set
  layout_variant = 'default',
  updated_at = pg_catalog.now()
where nullif(pg_catalog.btrim(layout_variant), '') is null;

alter table public.page_sections
  alter column layout_variant set default 'default',
  alter column layout_variant set not null;

update public.project_sections
set
  section_type = case
    when section_type = 'media' then 'media_gallery'
    else section_type
  end,
  layout_variant = case
    when nullif(pg_catalog.btrim(layout_variant), '') is null then 'default'
    else layout_variant
  end,
  updated_at = pg_catalog.now()
where section_type = 'media'
   or nullif(pg_catalog.btrim(layout_variant), '') is null;

alter table public.project_sections
  alter column layout_variant set default 'default',
  alter column layout_variant set not null;

do $final_cms_alignment_constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.pages'::pg_catalog.regclass
      and conname = 'pages_navigation_order_check'
  ) then
    alter table public.pages
      add constraint pages_navigation_order_check
      check (navigation_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.page_sections'::pg_catalog.regclass
      and conname = 'page_sections_section_type_check'
  ) then
    alter table public.page_sections
      add constraint page_sections_section_type_check
      check (
        section_type in (
          'hero',
          'rich_text',
          'split_content',
          'custom_cards',
          'stats',
          'featured_projects',
          'projects_grid',
          'experience_list',
          'skills',
          'certifications_grid',
          'volunteering',
          'media_gallery',
          'cta'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.page_sections'::pg_catalog.regclass
      and conname = 'page_sections_block_variant_check'
  ) then
    alter table public.page_sections
      add constraint page_sections_block_variant_check
      check (
        (
          section_type in ('hero', 'rich_text', 'split_content', 'cta')
          and layout_variant in ('default', 'compact', 'split')
        )
        or (
          section_type in (
            'custom_cards',
            'featured_projects',
            'projects_grid',
            'skills',
            'certifications_grid',
            'media_gallery'
          )
          and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
        )
        or (
          section_type = 'stats'
          and layout_variant in (
            'default',
            'compact',
            'grid-2',
            'grid-3',
            'metrics'
          )
        )
        or (
          section_type = 'experience_list'
          and layout_variant in ('default', 'compact', 'timeline')
        )
        or (
          section_type = 'volunteering'
          and layout_variant in (
            'default',
            'compact',
            'grid-2',
            'timeline'
          )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.project_sections'::pg_catalog.regclass
      and conname = 'project_sections_section_type_check'
  ) then
    alter table public.project_sections
      add constraint project_sections_section_type_check
      check (section_type in ('rich_text', 'media_gallery'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.project_sections'::pg_catalog.regclass
      and conname = 'project_sections_block_variant_check'
  ) then
    alter table public.project_sections
      add constraint project_sections_block_variant_check
      check (
        (
          section_type = 'rich_text'
          and layout_variant in ('default', 'compact', 'split')
        )
        or (
          section_type = 'media_gallery'
          and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
        )
      );
  end if;
end;
$final_cms_alignment_constraints$;

-- Extend the already-hardened single-row mutation allowlists only after the
-- additive columns exist. The exact anchors come from the immediately
-- preceding hardening migration; unexpected function drift aborts instead of
-- silently weakening the mutation boundary.
do $final_cms_mutation_allowlists$
declare
  v_definition text;
  v_source text;
  v_pages_anchor constant text := $pages_anchor$      'open_graph_title', 'open_graph_description', 'open_graph_image',
      'is_published'$pages_anchor$;
  v_pages_replacement constant text := $pages_replacement$      'open_graph_title', 'open_graph_description', 'open_graph_image',
      'navigation_label', 'navigation_order', 'show_in_navigation',
      'show_in_footer', 'is_published'$pages_replacement$;
  v_project_sections_anchor constant text := $project_sections_anchor$      'project_id', 'section_type', 'title', 'body', 'bullets', 'sort_order',
      'is_visible', 'is_archived'$project_sections_anchor$;
  v_project_sections_replacement constant text := $project_sections_replacement$      'project_id', 'section_type', 'title', 'body', 'bullets', 'sort_order',
      'is_visible', 'is_archived', 'layout_variant'$project_sections_replacement$;
begin
  select
    pg_catalog.pg_get_functiondef(function_row.oid),
    function_row.prosrc
  into v_definition, v_source
  from pg_catalog.pg_proc as function_row
  where function_row.oid = pg_catalog.to_regprocedure(
    'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
  );

  if v_definition is null or v_source is null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: hardened mutate_cms_content() is missing';
  end if;

  if pg_catalog.strpos(v_source, '''navigation_label''') = 0 then
    if pg_catalog.strpos(v_definition, v_pages_anchor) = 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment failed: pages mutation allowlist drift';
    end if;
    v_definition := pg_catalog.replace(
      v_definition,
      v_pages_anchor,
      v_pages_replacement
    );
  elsif pg_catalog.strpos(v_source, '''show_in_footer''') = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: partial pages mutation allowlist';
  end if;

  if pg_catalog.strpos(v_source, v_project_sections_replacement) = 0 then
    if pg_catalog.strpos(v_definition, v_project_sections_anchor) = 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment failed: project section mutation allowlist drift';
    end if;
    v_definition := pg_catalog.replace(
      v_definition,
      v_project_sections_anchor,
      v_project_sections_replacement
    );
  end if;

  execute v_definition;
end;
$final_cms_mutation_allowlists$;

alter function public.mutate_cms_content(
  text,
  text,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
  owner to postgres;

revoke all privileges on function public.mutate_cms_content(
  text,
  text,
  uuid,
  timestamptz,
  jsonb,
  uuid
) from public, anon, authenticated;

grant execute on function public.mutate_cms_content(
  text,
  text,
  uuid,
  timestamptz,
  jsonb,
  uuid
) to service_role;

-- A duplicate can commit even when its HTTP response is interrupted. Keep the
-- caller key, canonical request, and complete RPC response together so a retry
-- replays the first result instead of creating another parent, child set, or
-- revision set. Direct table access is denied; only the service-role RPC below
-- can use this state.
create table if not exists public.cms_builder_action_requests (
  actor_user_id uuid not null
    references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_payload jsonb not null,
  response_payload jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  constraint cms_builder_action_requests_pkey
    primary key (actor_user_id, idempotency_key),
  constraint cms_builder_action_requests_request_payload_check
    check (pg_catalog.jsonb_typeof(request_payload) = 'object'),
  constraint cms_builder_action_requests_response_payload_check
    check (
      response_payload is null
      or pg_catalog.jsonb_typeof(response_payload) = 'object'
    ),
  constraint cms_builder_action_requests_completion_state_check
    check (
      (response_payload is null and completed_at is null)
      or (response_payload is not null and completed_at is not null)
    )
);

alter table public.cms_builder_action_requests enable row level security;

revoke all privileges on table public.cms_builder_action_requests
  from public, anon, authenticated, service_role;

-- Builder duplicate and move actions span a parent and, for duplication, its
-- supporting items. This wrapper reuses the hardened mutation RPC for every
-- row so optimistic locks, aggregate checks, and immutable revisions remain
-- authoritative while PostgreSQL commits or rolls back the whole action.
create or replace function public.mutate_cms_builder_action(
  p_action text,
  p_table text,
  p_record_id uuid,
  p_expected_updated_at timestamptz,
  p_related_record_id uuid,
  p_related_expected_updated_at timestamptz,
  p_direction text,
  p_actor_user_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $mutate_cms_builder_action$
declare
  v_columns text[];
  v_child_columns text[];
  v_order_key text;
  v_parent_key text;
  v_child_table text;
  v_child_parent_key text;
  v_source jsonb;
  v_related jsonb;
  v_values jsonb;
  v_related_values jsonb;
  v_result jsonb;
  v_related_result jsonb;
  v_parent_row jsonb;
  v_child_values jsonb;
  v_child_result jsonb;
  v_child record;
  v_children jsonb := '[]'::pg_catalog.jsonb;
  v_rows jsonb := '[]'::pg_catalog.jsonb;
  v_revision_ids jsonb := '[]'::pg_catalog.jsonb;
  v_request_ids jsonb := '[]'::pg_catalog.jsonb;
  v_source_order integer;
  v_related_order integer;
  v_original_visibility boolean;
  v_idempotency_request jsonb;
  v_existing_idempotency_request jsonb;
  v_existing_idempotency_response jsonb;
  v_response jsonb;
begin
  if p_action is null or p_action not in ('duplicate', 'move') then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_builder_action';
  end if;

  if p_table = 'page_sections' then
    v_columns := array[
      'page_id', 'section_key', 'section_type', 'title', 'subtitle',
      'description', 'cta_label', 'cta_href', 'secondary_cta_label',
      'secondary_cta_href', 'display_order', 'is_visible', 'is_archived',
      'layout_variant'
    ]::text[];
    v_child_columns := array[
      'page_section_id', 'title', 'subtitle', 'description', 'link_label',
      'link_url', 'media_url', 'media_alt', 'display_order', 'is_visible'
    ]::text[];
    v_order_key := 'display_order';
    v_parent_key := 'page_id';
    v_child_table := 'page_section_items';
    v_child_parent_key := 'page_section_id';
  elsif p_table = 'project_sections' then
    v_columns := array[
      'project_id', 'section_type', 'title', 'body', 'bullets', 'sort_order',
      'is_visible', 'is_archived', 'layout_variant'
    ]::text[];
    v_child_columns := array[
      'project_section_id', 'label', 'value', 'description', 'display_order',
      'is_visible'
    ]::text[];
    v_order_key := 'sort_order';
    v_parent_key := 'project_id';
    v_child_table := 'project_section_items';
    v_child_parent_key := 'project_section_id';
  else
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_builder_table';
  end if;

  if p_record_id is null or p_expected_updated_at is null then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_optimistic_lock_required';
  end if;

  if p_action = 'move'
     and (
       p_related_record_id is null
       or p_related_expected_updated_at is null
       or p_related_record_id = p_record_id
       or p_direction is null
       or p_direction not in ('up', 'down')
     ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_move_precondition';
  end if;

  if p_action = 'duplicate'
     and (
       p_related_record_id is not null
       or p_related_expected_updated_at is not null
       or p_direction is not null
       or p_idempotency_key is null
     ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_duplicate_precondition';
  end if;

  if p_action = 'move' and p_idempotency_key is not null then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_move_precondition';
  end if;

  if p_actor_user_id is null
     or not exists (
       select 1
       from public.admins as admin_row
       where admin_row.user_id = p_actor_user_id
     ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_actor';
  end if;

  if p_action = 'duplicate' then
    v_idempotency_request := pg_catalog.jsonb_build_object(
      'action', p_action,
      'table', p_table,
      'recordId', p_record_id,
      'expectedUpdatedAt', p_expected_updated_at
    );

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'cms_builder_duplicate:'
        || p_actor_user_id::text
        || ':'
        || p_idempotency_key::text,
        0
      )
    );

    select
      action_request.request_payload,
      action_request.response_payload
    into
      v_existing_idempotency_request,
      v_existing_idempotency_response
    from public.cms_builder_action_requests as action_request
    where action_request.actor_user_id = p_actor_user_id
      and action_request.idempotency_key = p_idempotency_key
    for update;

    if found then
      if v_existing_idempotency_request
         is distinct from v_idempotency_request then
        raise exception using
          errcode = 'CMS08',
          message = 'cms_idempotency_key_reused';
      end if;

      if v_existing_idempotency_response is null then
        raise exception using
          errcode = 'CMS08',
          message = 'cms_idempotency_response_incomplete';
      end if;

      return v_existing_idempotency_response
        || pg_catalog.jsonb_build_object('replayed', true);
    end if;

    insert into public.cms_builder_action_requests (
      actor_user_id,
      idempotency_key,
      request_payload
    )
    values (
      p_actor_user_id,
      p_idempotency_key,
      v_idempotency_request
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cms_publication_graph_v1', 0)
  );

  if p_table = 'page_sections' then
    perform section.id
    from public.page_sections as section
    where section.id = p_record_id
       or (
         p_action = 'move'
         and section.id = p_related_record_id
       )
    order by section.id
    for update;

    select pg_catalog.to_jsonb(section.*)
    into v_source
    from public.page_sections as section
    where section.id = p_record_id;

    if p_action = 'move' then
      select pg_catalog.to_jsonb(section.*)
      into v_related
      from public.page_sections as section
      where section.id = p_related_record_id;
    end if;
  else
    perform section.id
    from public.project_sections as section
    where section.id = p_record_id
       or (
         p_action = 'move'
         and section.id = p_related_record_id
       )
    order by section.id
    for update;

    select pg_catalog.to_jsonb(section.*)
    into v_source
    from public.project_sections as section
    where section.id = p_record_id;

    if p_action = 'move' then
      select pg_catalog.to_jsonb(section.*)
      into v_related
      from public.project_sections as section
      where section.id = p_related_record_id;
    end if;
  end if;

  if v_source is null then
    raise exception using
      errcode = 'CMS03',
      message = 'cms_content_not_found';
  end if;

  if (v_source ->> 'updated_at')::timestamptz
     is distinct from p_expected_updated_at then
    raise exception using
      errcode = 'CMS02',
      message = 'cms_edit_conflict';
  end if;

  if coalesce((v_source ->> 'is_archived')::boolean, false) then
    raise exception using
      errcode = 'CMS07',
      message = 'cms_archived_builder_source';
  end if;

  select coalesce(
    pg_catalog.jsonb_object_agg(entry.key, entry.value),
    '{}'::pg_catalog.jsonb
  )
  into v_values
  from pg_catalog.jsonb_each(v_source) as entry(key, value)
  where entry.key = any(v_columns);

  if p_action = 'duplicate' then
    v_source_order := coalesce((v_source ->> v_order_key)::integer, 0);
    v_original_visibility := coalesce(
      (v_source ->> 'is_visible')::boolean,
      true
    );
    v_values := pg_catalog.jsonb_set(
      v_values,
      array[v_order_key],
      pg_catalog.to_jsonb(v_source_order + 1)
    );
    v_values := pg_catalog.jsonb_set(
      v_values,
      '{is_visible}',
      'false'::pg_catalog.jsonb
    );
    v_values := pg_catalog.jsonb_set(
      v_values,
      '{is_archived}',
      'false'::pg_catalog.jsonb
    );

    if p_table = 'page_sections' then
      v_values := pg_catalog.jsonb_set(
        v_values,
        '{section_key}',
        pg_catalog.to_jsonb(
          pg_catalog.left(
            coalesce(v_source ->> 'section_key', 'block'),
            86
          )
          || '-copy-'
          || pg_catalog.substr(
            pg_catalog.replace(
              pg_catalog.gen_random_uuid()::text,
              '-',
              ''
            ),
            1,
            8
          )
        )
      );
    end if;

    v_result := public.mutate_cms_content(
      p_table,
      'create',
      null,
      null,
      v_values,
      p_actor_user_id
    );
    v_parent_row := v_result -> 'row';
    v_revision_ids := v_revision_ids
      || pg_catalog.jsonb_build_array(v_result ->> 'revisionId');
    v_request_ids := v_request_ids
      || pg_catalog.jsonb_build_array(v_result ->> 'requestId');

    if p_table = 'page_sections' then
      for v_child in
        select pg_catalog.to_jsonb(item.*) as snapshot
        from public.page_section_items as item
        where item.page_section_id = p_record_id
        order by item.display_order, item.id
      loop
        select coalesce(
          pg_catalog.jsonb_object_agg(entry.key, entry.value),
          '{}'::pg_catalog.jsonb
        )
        into v_child_values
        from pg_catalog.jsonb_each(v_child.snapshot) as entry(key, value)
        where entry.key = any(v_child_columns);

        v_child_values := pg_catalog.jsonb_set(
          v_child_values,
          array[v_child_parent_key],
          pg_catalog.to_jsonb(v_parent_row ->> 'id')
        );
        v_child_result := public.mutate_cms_content(
          v_child_table,
          'create',
          null,
          null,
          v_child_values,
          p_actor_user_id
        );
        v_children := v_children
          || pg_catalog.jsonb_build_array(v_child_result -> 'row');
        v_revision_ids := v_revision_ids
          || pg_catalog.jsonb_build_array(v_child_result ->> 'revisionId');
        v_request_ids := v_request_ids
          || pg_catalog.jsonb_build_array(v_child_result ->> 'requestId');
      end loop;
    else
      for v_child in
        select pg_catalog.to_jsonb(item.*) as snapshot
        from public.project_section_items as item
        where item.project_section_id = p_record_id
        order by item.display_order, item.id
      loop
        select coalesce(
          pg_catalog.jsonb_object_agg(entry.key, entry.value),
          '{}'::pg_catalog.jsonb
        )
        into v_child_values
        from pg_catalog.jsonb_each(v_child.snapshot) as entry(key, value)
        where entry.key = any(v_child_columns);

        v_child_values := pg_catalog.jsonb_set(
          v_child_values,
          array[v_child_parent_key],
          pg_catalog.to_jsonb(v_parent_row ->> 'id')
        );
        v_child_result := public.mutate_cms_content(
          v_child_table,
          'create',
          null,
          null,
          v_child_values,
          p_actor_user_id
        );
        v_children := v_children
          || pg_catalog.jsonb_build_array(v_child_result -> 'row');
        v_revision_ids := v_revision_ids
          || pg_catalog.jsonb_build_array(v_child_result ->> 'revisionId');
        v_request_ids := v_request_ids
          || pg_catalog.jsonb_build_array(v_child_result ->> 'requestId');
      end loop;
    end if;

    if v_original_visibility then
      select coalesce(
        pg_catalog.jsonb_object_agg(entry.key, entry.value),
        '{}'::pg_catalog.jsonb
      )
      into v_values
      from pg_catalog.jsonb_each(v_parent_row) as entry(key, value)
      where entry.key = any(v_columns);

      v_values := pg_catalog.jsonb_set(
        v_values,
        '{is_visible}',
        'true'::pg_catalog.jsonb
      );
      v_result := public.mutate_cms_content(
        p_table,
        'update',
        (v_parent_row ->> 'id')::uuid,
        (v_parent_row ->> 'updated_at')::timestamptz,
        v_values,
        p_actor_user_id
      );
      v_parent_row := v_result -> 'row';
      v_revision_ids := v_revision_ids
        || pg_catalog.jsonb_build_array(v_result ->> 'revisionId');
      v_request_ids := v_request_ids
        || pg_catalog.jsonb_build_array(v_result ->> 'requestId');
    end if;

    v_rows := pg_catalog.jsonb_build_array(v_parent_row);
  else
    if v_related is null then
      raise exception using
        errcode = 'CMS03',
        message = 'cms_content_not_found';
    end if;

    if (v_related ->> 'updated_at')::timestamptz
       is distinct from p_related_expected_updated_at then
      raise exception using
        errcode = 'CMS02',
        message = 'cms_edit_conflict';
    end if;

    if coalesce((v_related ->> 'is_archived')::boolean, false)
       or (v_source ->> v_parent_key)
          is distinct from (v_related ->> v_parent_key) then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_relationship_change_unsupported';
    end if;

    select coalesce(
      pg_catalog.jsonb_object_agg(entry.key, entry.value),
      '{}'::pg_catalog.jsonb
    )
    into v_related_values
    from pg_catalog.jsonb_each(v_related) as entry(key, value)
    where entry.key = any(v_columns);

    v_source_order := coalesce((v_source ->> v_order_key)::integer, 0);
    v_related_order := coalesce((v_related ->> v_order_key)::integer, 0);

    if v_source_order = v_related_order then
      v_values := pg_catalog.jsonb_set(
        v_values,
        array[v_order_key],
        pg_catalog.to_jsonb(
          v_source_order + case when p_direction = 'up' then -1 else 1 end
        )
      );
    else
      v_values := pg_catalog.jsonb_set(
        v_values,
        array[v_order_key],
        pg_catalog.to_jsonb(v_related_order)
      );
      v_related_values := pg_catalog.jsonb_set(
        v_related_values,
        array[v_order_key],
        pg_catalog.to_jsonb(v_source_order)
      );
    end if;

    v_result := public.mutate_cms_content(
      p_table,
      'update',
      p_record_id,
      p_expected_updated_at,
      v_values,
      p_actor_user_id
    );
    v_revision_ids := v_revision_ids
      || pg_catalog.jsonb_build_array(v_result ->> 'revisionId');
    v_request_ids := v_request_ids
      || pg_catalog.jsonb_build_array(v_result ->> 'requestId');

    if v_source_order = v_related_order then
      v_rows := pg_catalog.jsonb_build_array(
        v_result -> 'row',
        v_related
      );
    else
      v_related_result := public.mutate_cms_content(
        p_table,
        'update',
        p_related_record_id,
        p_related_expected_updated_at,
        v_related_values,
        p_actor_user_id
      );
      v_revision_ids := v_revision_ids
        || pg_catalog.jsonb_build_array(v_related_result ->> 'revisionId');
      v_request_ids := v_request_ids
        || pg_catalog.jsonb_build_array(v_related_result ->> 'requestId');
      v_rows := pg_catalog.jsonb_build_array(
        v_result -> 'row',
        v_related_result -> 'row'
      );
    end if;
  end if;

  v_response := pg_catalog.jsonb_build_object(
    'action', p_action,
    'table', p_table,
    'idempotencyKey', case
      when p_action = 'duplicate' then p_idempotency_key
      else null
    end,
    'replayed', false,
    'rows', v_rows,
    'childTable', case
      when p_action = 'duplicate' then v_child_table
      else null
    end,
    'children', v_children,
    'revisionRecorded', pg_catalog.jsonb_array_length(v_revision_ids) > 0,
    'revisionIds', v_revision_ids,
    'requestIds', v_request_ids
  );

  if p_action = 'duplicate' then
    update public.cms_builder_action_requests as action_request
    set response_payload = v_response,
        completed_at = pg_catalog.now()
    where action_request.actor_user_id = p_actor_user_id
      and action_request.idempotency_key = p_idempotency_key;

    if not found then
      raise exception using
        errcode = 'CMS08',
        message = 'cms_idempotency_request_missing';
    end if;
  end if;

  return v_response;
end;
$mutate_cms_builder_action$;

alter function public.mutate_cms_builder_action(
  text,
  text,
  uuid,
  timestamptz,
  uuid,
  timestamptz,
  text,
  uuid,
  uuid
)
  owner to postgres;

revoke all privileges on function public.mutate_cms_builder_action(
  text,
  text,
  uuid,
  timestamptz,
  uuid,
  timestamptz,
  text,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.mutate_cms_builder_action(
  text,
  text,
  uuid,
  timestamptz,
  uuid,
  timestamptz,
  text,
  uuid,
  uuid
) to service_role;

-- These three route rows were absent from the original page registry. Unknown
-- key/slug ownership was rejected by preflight, so this insert never replaces
-- an editorial row.
with canonical_pages(
  page_key,
  title,
  slug,
  seo_title,
  seo_description,
  open_graph_title,
  open_graph_description,
  navigation_label,
  navigation_order,
  show_in_navigation,
  show_in_footer
) as (
  values
    (
      'expertise',
      'Expertise',
      '/expertise',
      'Expertise',
      'How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.',
      'Expertise',
      'How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.',
      'Expertise',
      30,
      true,
      true
    ),
    (
      'education',
      'Education',
      '/education',
      'Education',
      'Verified education supporting Ahmed Aziz Mhiri''s work in business intelligence, big data analytics, e-commerce and commercial decision-making.',
      'Education',
      'Verified education supporting Ahmed Aziz Mhiri''s work in business intelligence, big data analytics, e-commerce and commercial decision-making.',
      'Education',
      70,
      false,
      true
    ),
    (
      'contact',
      'Contact',
      '/contact',
      'Contact Ahmed Aziz Mhiri',
      'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.',
      'Contact Ahmed Aziz Mhiri',
      'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.',
      'Contact',
      50,
      true,
      true
    )
)
insert into public.pages (
  page_key,
  title,
  slug,
  seo_title,
  seo_description,
  open_graph_title,
  open_graph_description,
  open_graph_image,
  is_published,
  navigation_label,
  navigation_order,
  show_in_navigation,
  show_in_footer
)
select
  canonical.page_key,
  canonical.title,
  canonical.slug,
  canonical.seo_title,
  canonical.seo_description,
  canonical.open_graph_title,
  canonical.open_graph_description,
  '/opengraph-image',
  true,
  canonical.navigation_label,
  canonical.navigation_order,
  canonical.show_in_navigation,
  canonical.show_in_footer
from canonical_pages as canonical
where not exists (
  select 1
  from public.pages as page
  where page.page_key = canonical.page_key
     or page.slug = canonical.slug
);

with navigation(
  page_key,
  slug,
  navigation_label,
  navigation_order,
  show_in_navigation,
  show_in_footer
) as (
  values
    ('home', '/', 'Home', 0, true, true),
    ('projects', '/projects', 'Projects', 10, true, true),
    ('experience', '/experience', 'Experience', 20, true, true),
    ('expertise', '/expertise', 'Expertise', 30, true, true),
    ('about', '/about', 'About', 40, true, true),
    ('contact', '/contact', 'Contact', 50, true, true),
    ('resume', '/resume', 'Resume', 60, true, true),
    ('education', '/education', 'Education', 70, false, true),
    ('certifications', '/certifications', 'Certifications', 80, false, true)
)
update public.pages as page
set
  navigation_label = navigation.navigation_label,
  navigation_order = navigation.navigation_order,
  show_in_navigation = navigation.show_in_navigation,
  show_in_footer = navigation.show_in_footer,
  updated_at = pg_catalog.now()
from navigation
where page.page_key = navigation.page_key
  and page.slug = navigation.slug
  and (
    page.navigation_label is distinct from navigation.navigation_label
    or page.navigation_order is distinct from navigation.navigation_order
    or page.show_in_navigation is distinct from navigation.show_in_navigation
    or page.show_in_footer is distinct from navigation.show_in_footer
  );

update public.pages
set
  show_in_navigation = false,
  show_in_footer = false,
  updated_at = pg_catalog.now()
where page_key not in (
    'home',
    'projects',
    'experience',
    'expertise',
    'about',
    'contact',
    'resume',
    'education',
    'certifications'
  )
  and (show_in_navigation or show_in_footer);

-- Published page metadata receives only missing, evidence-safe fallbacks.
update public.pages
set
  seo_title = coalesce(
    nullif(pg_catalog.btrim(seo_title), ''),
    title
  ),
  seo_description = coalesce(
    nullif(pg_catalog.btrim(seo_description), ''),
    case page_key
      when 'home' then 'Ahmed Aziz Mhiri connects marketing and commercial analytics, business intelligence, customer insight and auditable process automation.'
      when 'about' then 'How Ahmed Aziz Mhiri combines marketing and commercial analytics, business intelligence, customer insight and process automation.'
      when 'projects' then 'Public-safe case studies by Ahmed Aziz Mhiri across commercial analytics, business intelligence, marketing transformation and process automation.'
      when 'experience' then 'Ahmed Aziz Mhiri''s professional timeline across analytics, commercial operations, digital marketing, business systems and automation.'
      when 'expertise' then 'How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.'
      when 'education' then 'Verified education supporting Ahmed Aziz Mhiri''s work in business intelligence, big data analytics, e-commerce and commercial decision-making.'
      when 'certifications' then 'Verified professional credentials held by Ahmed Aziz Mhiri across digital marketing, analytics and related disciplines.'
      when 'resume' then 'View Ahmed Aziz Mhiri''s resume formats and supporting education and certification information.'
      when 'contact' then 'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.'
      else title || ' in Ahmed Aziz Mhiri''s portfolio.'
    end
  ),
  open_graph_title = coalesce(
    nullif(pg_catalog.btrim(open_graph_title), ''),
    nullif(pg_catalog.btrim(seo_title), ''),
    title
  ),
  open_graph_description = coalesce(
    nullif(pg_catalog.btrim(open_graph_description), ''),
    nullif(pg_catalog.btrim(seo_description), ''),
    title || ' in Ahmed Aziz Mhiri''s portfolio.'
  ),
  open_graph_image = coalesce(
    nullif(pg_catalog.btrim(open_graph_image), ''),
    '/opengraph-image'
  ),
  updated_at = pg_catalog.now()
where is_published
  and (
    nullif(pg_catalog.btrim(seo_title), '') is null
    or nullif(pg_catalog.btrim(seo_description), '') is null
    or nullif(pg_catalog.btrim(open_graph_title), '') is null
    or nullif(pg_catalog.btrim(open_graph_description), '') is null
    or nullif(pg_catalog.btrim(open_graph_image), '') is null
  );

-- Canonical pages that have no visible, non-archived editorial sections
-- receive the smallest controlled layout needed by the public renderer. Any
-- visible, non-archived section means the owner has already taken control and
-- the page is left untouched.
do $canonical_page_section_seed_preflight$
declare
  v_problem text;
begin
  with expected_seed(page_key, section_key) as (
    values
      ('home', 'canonical-hero'),
      ('home', 'canonical-featured-projects'),
      ('about', 'canonical-about'),
      ('about', 'canonical-volunteering'),
      ('projects', 'canonical-projects'),
      ('experience', 'canonical-experience'),
      ('expertise', 'canonical-expertise'),
      ('education', 'canonical-education'),
      ('certifications', 'canonical-certifications'),
      ('resume', 'canonical-resume'),
      ('contact', 'canonical-contact')
  ),
  empty_pages as (
    select page.id, page.page_key
    from public.pages as page
    where page.page_key in (
      'home',
      'about',
      'projects',
      'experience',
      'expertise',
      'education',
      'certifications',
      'resume',
      'contact'
    )
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
  )
  select pg_catalog.string_agg(
    empty_page.page_key || ':' || expected.section_key,
    ', '
    order by empty_page.page_key, expected.section_key
  )
  into v_problem
  from empty_pages as empty_page
  join expected_seed as expected
    on expected.page_key = empty_page.page_key
  join public.page_sections as conflicting
    on conflicting.page_id = empty_page.id
   and conflicting.section_key = expected.section_key;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: canonical page-section key conflict',
      detail = v_problem;
  end if;

  if pg_catalog.to_regprocedure(
       'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)'
     ) is null
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.mutate_cms_builder_action(text,text,uuid,timestamp with time zone,uuid,timestamp with time zone,text,uuid,uuid)',
       'EXECUTE'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: compound builder RPC privileges are incomplete';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as function_row
    where function_row.oid = pg_catalog.to_regprocedure(
      'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
    )
      and pg_catalog.strpos(
        function_row.prosrc,
        '''navigation_label'''
      ) > 0
      and pg_catalog.strpos(
        function_row.prosrc,
        '''show_in_footer'''
      ) > 0
      and pg_catalog.strpos(
        function_row.prosrc,
        $project_section_allowlist$      'project_id', 'section_type', 'title', 'body', 'bullets', 'sort_order',
      'is_visible', 'is_archived', 'layout_variant'$project_section_allowlist$
      ) > 0
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: CMS mutation allowlists are incomplete';
  end if;

  if exists (
    select 1
    from public.pages as page
    where page.page_key = 'home'
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
      and not exists (
        select 1
        from public.hero as hero_row
        where hero_row.published
          and (
            nullif(pg_catalog.btrim(hero_row.title), '') is not null
            or nullif(pg_catalog.btrim(hero_row.subtitle), '') is not null
            or nullif(pg_catalog.btrim(hero_row.tagline), '') is not null
          )
      )
      and not exists (
        select 1
        from public.profile as profile_row
        where profile_row.published
          and (
            nullif(pg_catalog.btrim(profile_row.headline), '') is not null
            or nullif(pg_catalog.btrim(profile_row.short_bio), '') is not null
          )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: Home seed has no published source copy';
  end if;

  if exists (
    select 1
    from public.pages as page
    where page.page_key = 'about'
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
      and not exists (
        select 1
        from public.about as about_row
        where about_row.published
          and nullif(pg_catalog.btrim(about_row.body), '') is not null
      )
      and not exists (
        select 1
        from public.profile as profile_row
        where profile_row.published
          and nullif(pg_catalog.btrim(profile_row.about_text), '') is not null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: About seed has no published source copy';
  end if;

  if exists (
    select 1
    from public.pages as page
    where page.page_key = 'education'
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
      and not exists (
        select 1
        from public.education as education_row
        where education_row.published
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: Education seed has no published source rows';
  end if;

  if exists (
    select 1
    from public.pages as page
    where page.page_key = 'resume'
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
      and not exists (
        select 1
        from public.resumes as resume_row
        where resume_row.published
          and (
            nullif(pg_catalog.btrim(resume_row.pdf_url), '') ~* '^(https://|/)'
            or nullif(pg_catalog.btrim(resume_row.docx_url), '') ~* '^(https://|/)'
          )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: Resume seed has no public published file';
  end if;

  if exists (
    select 1
    from public.pages as page
    where page.page_key = 'contact'
      and not exists (
        select 1
        from public.page_sections as section
        where section.page_id = page.id
          and section.is_visible
          and not section.is_archived
      )
      and not exists (
        select 1
        from public.profile as profile_row
        where profile_row.published
          and nullif(pg_catalog.btrim(profile_row.email), '') is not null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment failed: Contact seed has no published email';
  end if;
end;
$canonical_page_section_seed_preflight$;

with
empty_pages as (
  select page.id, page.page_key, page.title
  from public.pages as page
  where page.page_key in (
    'home',
    'about',
    'projects',
    'experience',
    'expertise',
    'education',
    'certifications',
    'resume',
    'contact'
  )
    and not exists (
      select 1
      from public.page_sections as section
      where section.page_id = page.id
        and section.is_visible
        and not section.is_archived
    )
),
hero_source as (
  select hero_row.*
  from public.hero as hero_row
  where hero_row.published
    and (
      nullif(pg_catalog.btrim(hero_row.title), '') is not null
      or nullif(pg_catalog.btrim(hero_row.subtitle), '') is not null
      or nullif(pg_catalog.btrim(hero_row.tagline), '') is not null
    )
  order by hero_row.updated_at desc, hero_row.id
  limit 1
),
about_source as (
  select about_row.*
  from public.about as about_row
  where about_row.published
    and nullif(pg_catalog.btrim(about_row.body), '') is not null
  order by about_row.updated_at desc, about_row.id
  limit 1
),
home_profile_source as (
  select profile_row.*
  from public.profile as profile_row
  where profile_row.published
    and (
      nullif(pg_catalog.btrim(profile_row.headline), '') is not null
      or nullif(pg_catalog.btrim(profile_row.short_bio), '') is not null
    )
  order by profile_row.updated_at desc, profile_row.id
  limit 1
),
about_profile_source as (
  select profile_row.*
  from public.profile as profile_row
  where profile_row.published
    and nullif(pg_catalog.btrim(profile_row.about_text), '') is not null
  order by profile_row.updated_at desc, profile_row.id
  limit 1
),
contact_source as (
  select profile_row.*
  from public.profile as profile_row
  where profile_row.published
    and nullif(pg_catalog.btrim(profile_row.email), '') is not null
  order by profile_row.updated_at desc, profile_row.id
  limit 1
),
section_seed(
  page_id,
  section_key,
  section_type,
  title,
  subtitle,
  description,
  cta_label,
  cta_href,
  secondary_cta_label,
  secondary_cta_href,
  display_order,
  layout_variant
) as (
  select
    page.id,
    'canonical-hero',
    'hero',
    coalesce(
      nullif(pg_catalog.btrim(hero_row.title), ''),
      nullif(pg_catalog.btrim(profile_row.headline), ''),
      page.title
    ),
    nullif(pg_catalog.btrim(hero_row.subtitle), ''),
    coalesce(
      nullif(pg_catalog.btrim(profile_row.short_bio), ''),
      nullif(pg_catalog.btrim(hero_row.tagline), '')
    ),
    nullif(pg_catalog.btrim(hero_row.primary_cta_label), ''),
    nullif(pg_catalog.btrim(hero_row.primary_cta_href), ''),
    nullif(pg_catalog.btrim(hero_row.secondary_cta_label), ''),
    nullif(pg_catalog.btrim(hero_row.secondary_cta_href), ''),
    0,
    'default'
  from empty_pages as page
  left join hero_source as hero_row on true
  left join home_profile_source as profile_row on true
  where page.page_key = 'home'

  union all

  select
    page.id,
    'canonical-featured-projects',
    'featured_projects',
    'Selected work',
    null,
    null,
    null,
    null,
    null,
    null,
    10,
    'grid-3'
  from empty_pages as page
  where page.page_key = 'home'

  union all

  select
    page.id,
    'canonical-about',
    'rich_text',
    coalesce(
      nullif(pg_catalog.btrim(about_row.title), ''),
      page.title
    ),
    null,
    coalesce(
      nullif(pg_catalog.btrim(about_row.body), ''),
      nullif(pg_catalog.btrim(profile_row.about_text), '')
    ),
    null,
    null,
    null,
    null,
    0,
    'default'
  from empty_pages as page
  left join about_source as about_row on true
  left join about_profile_source as profile_row on true
  where page.page_key = 'about'

  union all

  select
    page.id,
    'canonical-volunteering',
    'volunteering',
    'Volunteering',
    null,
    null,
    null,
    null,
    null,
    null,
    10,
    'timeline'
  from empty_pages as page
  where page.page_key = 'about'

  union all

  select page.id, 'canonical-projects', 'projects_grid', page.title,
    null, null, null, null, null, null, 0, 'grid-3'
  from empty_pages as page
  where page.page_key = 'projects'

  union all

  select page.id, 'canonical-experience', 'experience_list', page.title,
    null, null, null, null, null, null, 0, 'timeline'
  from empty_pages as page
  where page.page_key = 'experience'

  union all

  select page.id, 'canonical-expertise', 'skills', page.title,
    null, null, null, null, null, null, 0, 'grid-3'
  from empty_pages as page
  where page.page_key = 'expertise'

  union all

  select page.id, 'canonical-education', 'custom_cards', page.title,
    null, null, null, null, null, null, 0, 'grid-2'
  from empty_pages as page
  where page.page_key = 'education'

  union all

  select
    page.id,
    'canonical-certifications',
    'certifications_grid',
    page.title,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    'grid-3'
  from empty_pages as page
  where page.page_key = 'certifications'

  union all

  select page.id, 'canonical-resume', 'custom_cards', page.title,
    null, null, null, null, null, null, 0, 'grid-2'
  from empty_pages as page
  where page.page_key = 'resume'

  union all

  select
    page.id,
    'canonical-contact',
    'cta',
    page.title,
    null,
    'Email ' || coalesce(
      nullif(pg_catalog.btrim(profile_row.full_name), ''),
      'the portfolio owner'
    ) || '.',
    'Send an email',
    'mailto:' || pg_catalog.btrim(profile_row.email),
    null,
    null,
    0,
    'compact'
  from empty_pages as page
  cross join contact_source as profile_row
  where page.page_key = 'contact'
),
inserted_sections as (
  insert into public.page_sections (
    page_id,
    section_key,
    section_type,
    title,
    subtitle,
    description,
    cta_label,
    cta_href,
    secondary_cta_label,
    secondary_cta_href,
    display_order,
    is_visible,
    is_archived,
    layout_variant
  )
  select
    seed.page_id,
    seed.section_key,
    seed.section_type,
    seed.title,
    seed.subtitle,
    seed.description,
    seed.cta_label,
    seed.cta_href,
    seed.secondary_cta_label,
    seed.secondary_cta_href,
    seed.display_order,
    true,
    false,
    seed.layout_variant
  from section_seed as seed
  returning id, page_id, section_key
),
education_items as (
  select
    section.id as page_section_id,
    education_row.degree as title,
    education_row.institution as subtitle,
    nullif(
      pg_catalog.concat_ws(
        ' | ',
        nullif(pg_catalog.btrim(education_row.status), ''),
        nullif(
          pg_catalog.btrim(
            pg_catalog.concat_ws(
              ' - ',
              nullif(pg_catalog.btrim(education_row.start_date), ''),
              nullif(pg_catalog.btrim(education_row.end_date), '')
            )
          ),
          ''
        ),
        nullif(pg_catalog.btrim(education_row.location), '')
      ),
      ''
    ) as description,
    education_row.sort_order as display_order
  from inserted_sections as section
  join public.pages as page on page.id = section.page_id
  join public.education as education_row on education_row.published
  where page.page_key = 'education'
    and section.section_key = 'canonical-education'
),
resume_items as (
  select
    section.id as page_section_id,
    resume_row.label as title,
    resume_row.variant as subtitle,
    case
      when nullif(pg_catalog.btrim(resume_row.pdf_url), '')
           ~* '^(https://|/)'
        then pg_catalog.btrim(resume_row.pdf_url)
      else pg_catalog.btrim(resume_row.docx_url)
    end as link_url,
    resume_row.sort_order as display_order
  from inserted_sections as section
  join public.pages as page on page.id = section.page_id
  join public.resumes as resume_row
    on resume_row.published
   and (
     nullif(pg_catalog.btrim(resume_row.pdf_url), '') ~* '^(https://|/)'
     or nullif(pg_catalog.btrim(resume_row.docx_url), '') ~* '^(https://|/)'
   )
  where page.page_key = 'resume'
    and section.section_key = 'canonical-resume'
)
insert into public.page_section_items (
  page_section_id,
  title,
  subtitle,
  description,
  link_label,
  link_url,
  display_order,
  is_visible
)
select
  education.page_section_id,
  education.title,
  education.subtitle,
  education.description,
  null,
  null,
  education.display_order,
  true
from education_items as education

union all

select
  resume.page_section_id,
  resume.title,
  resume.subtitle,
  null,
  'Open resume',
  resume.link_url,
  resume.display_order,
  true
from resume_items as resume;

-- Published projects use their own cover as the social-image fallback. Existing
-- separate Open Graph images and authored metadata are preserved.
update public.projects
set
  seo_title = coalesce(
    nullif(pg_catalog.btrim(seo_title), ''),
    title
  ),
  seo_description = coalesce(
    nullif(pg_catalog.btrim(seo_description), ''),
    nullif(pg_catalog.btrim(summary), ''),
    nullif(pg_catalog.btrim(description), ''),
    title
  ),
  open_graph_image = coalesce(
    nullif(pg_catalog.btrim(open_graph_image), ''),
    nullif(pg_catalog.btrim(cover_image_url), ''),
    '/opengraph-image'
  ),
  updated_at = pg_catalog.now()
where published
  and status = 'published'
  and (
    nullif(pg_catalog.btrim(seo_title), '') is null
    or nullif(pg_catalog.btrim(seo_description), '') is null
    or nullif(pg_catalog.btrim(open_graph_image), '') is null
  );

-- Approved factual boundaries.
update public.profile
set
  availability = 'International full-time availability from October 2027; selected freelance projects available now.',
  updated_at = pg_catalog.now()
where published
  and availability is distinct from
      'International full-time availability from October 2027; selected freelance projects available now.';

update public.projects
set
  published = false,
  status = 'preparation',
  featured = false,
  home_featured_order = null,
  updated_at = pg_catalog.now()
where (
    slug = 'master-multi-agent-llm-project'
    or pg_catalog.lower(title) = 'master multi-agent llm project'
  )
  and (
    published
    or status <> 'preparation'
    or featured
    or home_featured_order is not null
  );

update public.projects
set
  title = 'VERMEG AI-Ready E-Learning Prototype',
  summary = 'Two-person internship prototype for an AI-ready e-learning experience. Ahmed contributed the chatbot and selected application services; it was not sole-authored and was not presented as a production deployment.',
  description = 'A demonstrable two-person internship prototype. Ahmed contributed the chatbot and selected application services. The system was not sole-authored and was not presented as a production deployment.',
  seo_title = 'VERMEG AI-Ready E-Learning Prototype',
  seo_description = 'Two-person internship prototype with Ahmed''s contribution bounded to the chatbot and selected application services. Not sole-authored and not presented as a production deployment.',
  updated_at = pg_catalog.now()
where slug in (
  'vermeg-ai-ready-e-learning-platform',
  'ai-ready-elearning-platform'
)
  and (
    title is distinct from 'VERMEG AI-Ready E-Learning Prototype'
    or summary is distinct from 'Two-person internship prototype for an AI-ready e-learning experience. Ahmed contributed the chatbot and selected application services; it was not sole-authored and was not presented as a production deployment.'
    or description is distinct from 'A demonstrable two-person internship prototype. Ahmed contributed the chatbot and selected application services. The system was not sole-authored and was not presented as a production deployment.'
    or seo_title is distinct from 'VERMEG AI-Ready E-Learning Prototype'
    or seo_description is distinct from 'Two-person internship prototype with Ahmed''s contribution bounded to the chatbot and selected application services. Not sole-authored and not presented as a production deployment.'
  );

update public.experience
set
  points = array[
    'Contributed the chatbot and selected application services within a two-person internship prototype.',
    'The system was not sole-authored and was not presented as a production deployment.'
  ],
  updated_at = pg_catalog.now()
where company ilike 'VERMEG%'
  and points is distinct from array[
    'Contributed the chatbot and selected application services within a two-person internship prototype.',
    'The system was not sole-authored and was not presented as a production deployment.'
  ];

update public.projects
set
  summary = 'RPA case study covering 40 hotels across Sunline, Suncani, Taurus and Oasis Tours, with mandatory human review before delivery.',
  description = 'Ahmed was the sole contributor. Supported workloads use minimum batches of around 20 records per hotel. A historical comparison is around four working days for one month, one hotel and one agency versus around seven days for one season across the supported hotels and agencies. Human review remains mandatory before delivery.',
  updated_at = pg_catalog.now()
where slug in (
  'sunshine-rpa-commercial-rules-automation',
  'rpa-invoice-control-booking-reconciliation'
)
  and (
    summary is distinct from 'RPA case study covering 40 hotels across Sunline, Suncani, Taurus and Oasis Tours, with mandatory human review before delivery.'
    or description is distinct from 'Ahmed was the sole contributor. Supported workloads use minimum batches of around 20 records per hotel. A historical comparison is around four working days for one month, one hotel and one agency versus around seven days for one season across the supported hotels and agencies. Human review remains mandatory before delivery.'
  );

-- Suppress only a clearly prospective software-role row for either named
-- organisation. Current documented roles are not matched by this predicate.
update public.experience
set
  published = false,
  updated_at = pg_catalog.now()
where published
  and role ilike '%software%'
  and (
    company ilike '%El Mouradi%'
    or company ilike '%Sunshine%'
  )
  and (
    (
      company ilike '%El Mouradi%'
      and company ilike '%Sunshine%'
    )
    or pg_catalog.concat_ws(
         ' ',
         start_date,
         end_date,
         date_label,
         pg_catalog.array_to_string(points, ' ')
       ) ~* '(future|planned|prospective|upcoming|2027|2028|2029)'
  );

-- Seed a small number of meaningful, public-safe case-study blocks. Existing
-- meaningful blocks are preserved; an exact-title empty block is filled, and
-- duplicate exact-title ownership aborts.
do $seed_concise_case_studies$
declare
  seed record;
  v_project_id uuid;
  v_section_id uuid;
  v_section_count integer;
  v_is_meaningful boolean;
begin
  for seed in
    select *
    from (
      values
        (
          'sunshine-rpa-commercial-rules-automation',
          'Overview',
          'This RPA case study covers 40 hotels across Sunline, Suncani, Taurus and Oasis Tours.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'sunshine-rpa-commercial-rules-automation',
          'Role and scope',
          'Ahmed was the sole contributor. Supported workloads use minimum batches of around 20 records per hotel.',
          array[]::text[],
          20,
          'split'
        ),
        (
          'sunshine-rpa-commercial-rules-automation',
          'Approach and evidence',
          'Human review is mandatory before delivery.',
          array[]::text[],
          30,
          'default'
        ),
        (
          'sunshine-rpa-commercial-rules-automation',
          'Outcome and limits',
          'Historical comparison: around four working days for one month, one hotel and one agency versus around seven days for one season across the supported hotels and agencies. This is a process comparison, not a claim of unattended delivery.',
          array[]::text[],
          40,
          'compact'
        ),
        (
          'chic-chac-digital-transformation',
          'Overview',
          'A digital-transformation engagement connecting the customer journey, online booking, local visibility and recurring marketing workflows.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'chic-chac-digital-transformation',
          'Role and scope',
          'The documented work covers a website with online booking and activity monitoring, local SEO, Instagram and TikTok content, email marketing, paid social activity and a Planity partnership.',
          array[]::text[],
          20,
          'split'
        ),
        (
          'chic-chac-digital-transformation',
          'Outcome and limits',
          'The repository documents the delivered channels and customer-journey scope, but it contains no validated quantitative outcome; none is claimed.',
          array[]::text[],
          30,
          'compact'
        ),
        (
          'tunisia-excursion-booking-platform',
          'Overview',
          'A freelance tourism-booking platform with a customer-facing excursion journey and an administrative interface.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'tunisia-excursion-booking-platform',
          'Approach and evidence',
          'The documented scope covers booking management, status management and KPI management using Firebase and an administrative dashboard.',
          array[]::text[],
          20,
          'default'
        ),
        (
          'tunisia-excursion-booking-platform',
          'Outcome and limits',
          'The repository documents platform scope, not a production deployment, client result or quantified outcome.',
          array[]::text[],
          30,
          'compact'
        ),
        (
          'vermeg-ai-ready-e-learning-platform',
          'Overview',
          'A demonstrable AI-ready e-learning prototype developed by a two-person internship team.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'vermeg-ai-ready-e-learning-platform',
          'Role and scope',
          'Ahmed contributed the chatbot and selected application services. The system was not sole-authored.',
          array[]::text[],
          20,
          'split'
        ),
        (
          'vermeg-ai-ready-e-learning-platform',
          'Approach and evidence',
          'The documented scope is limited to the two-person internship prototype and Ahmed''s bounded contribution.',
          array[]::text[],
          30,
          'default'
        ),
        (
          'vermeg-ai-ready-e-learning-platform',
          'Outcome and limits',
          'Prototype only. It was not presented as a production deployment, and no production outcome is claimed.',
          array[]::text[],
          40,
          'compact'
        ),
        (
          'personal-portfolio-platform',
          'Overview',
          'A professional portfolio platform connecting experience, projects, evidence, resume access and cross-platform professional positioning.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'personal-portfolio-platform',
          'Approach and evidence',
          'The documented implementation uses Next.js, Supabase and TypeScript.',
          array[]::text[],
          20,
          'default'
        ),
        (
          'personal-portfolio-platform',
          'Outcome and limits',
          'The repository documents the platform and its content-management scope; no traffic, ranking, hiring or conversion outcome is claimed.',
          array[]::text[],
          30,
          'compact'
        ),
        (
          'university-chatbot-student-services',
          'Overview',
          'A university-hackathon chatbot designed to improve access to student-service information.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'university-chatbot-student-services',
          'Approach and evidence',
          'The documented design considered data protection, NLP and local deployment.',
          array[]::text[],
          20,
          'default'
        ),
        (
          'university-chatbot-student-services',
          'Outcome and limits',
          'The repository identifies a hackathon prototype and design considerations; it does not claim a production deployment or measured service outcome.',
          array[]::text[],
          30,
          'compact'
        ),
        (
          'library-management-full-stack-application',
          'Overview',
          'An internship application built with Angular, Spring Boot, REST APIs and relational databases.',
          array[]::text[],
          10,
          'compact'
        ),
        (
          'library-management-full-stack-application',
          'Approach and evidence',
          'The documented scope includes core management, search, CRUD operations and borrowing tracking.',
          array[]::text[],
          20,
          'default'
        ),
        (
          'library-management-full-stack-application',
          'Outcome and limits',
          'The repository documents the application scope; it does not claim a public production deployment or measured outcome.',
          array[]::text[],
          30,
          'compact'
        )
    ) as section_seed(
      project_slug,
      title,
      body,
      bullets,
      sort_order,
      layout_variant
    )
  loop
    select project.id
    into v_project_id
    from public.projects as project
    where project.slug = seed.project_slug;

    if v_project_id is null then
      continue;
    end if;

    select pg_catalog.count(*)::integer
    into v_section_count
    from public.project_sections as section
    where section.project_id = v_project_id
      and pg_catalog.lower(pg_catalog.btrim(section.title))
          = pg_catalog.lower(seed.title);

    if v_section_count > 1 then
      raise exception using
        errcode = 'P0001',
        message = 'Final CMS alignment failed: duplicate canonical case-study section',
        detail = pg_catalog.format(
          'project=%L section=%L count=%s',
          seed.project_slug,
          seed.title,
          v_section_count
        );
    end if;

    if v_section_count = 0 then
      insert into public.project_sections (
        project_id,
        title,
        body,
        bullets,
        sort_order,
        section_type,
        layout_variant,
        is_visible,
        is_archived
      )
      values (
        v_project_id,
        seed.title,
        seed.body,
        seed.bullets,
        seed.sort_order,
        'rich_text',
        seed.layout_variant,
        true,
        false
      );
      continue;
    end if;

    select
      section.id,
      (
        nullif(pg_catalog.btrim(coalesce(section.body, '')), '') is not null
        or exists (
          select 1
          from pg_catalog.unnest(
            coalesce(section.bullets, array[]::text[])
          ) as bullet(value)
          where nullif(pg_catalog.btrim(bullet.value), '') is not null
        )
        or exists (
          select 1
          from public.project_section_items as item
          where item.project_section_id = section.id
            and item.is_visible
            and (
              nullif(pg_catalog.btrim(coalesce(item.label, '')), '')
                  is not null
              or nullif(pg_catalog.btrim(coalesce(item.value, '')), '')
                  is not null
              or nullif(
                   pg_catalog.btrim(coalesce(item.description, '')),
                   ''
                 ) is not null
            )
        )
        or (
          section.section_type = 'media_gallery'
          and exists (
            select 1
            from public.project_media as media
            where media.project_id = section.project_id
              and media.is_visible
              and nullif(
                    pg_catalog.btrim(coalesce(media.media_url, '')),
                    ''
                  ) is not null
          )
        )
      )
    into v_section_id, v_is_meaningful
    from public.project_sections as section
    where section.project_id = v_project_id
      and pg_catalog.lower(pg_catalog.btrim(section.title))
          = pg_catalog.lower(seed.title);

    if not v_is_meaningful then
      update public.project_sections
      set
        body = seed.body,
        bullets = seed.bullets,
        sort_order = seed.sort_order,
        section_type = 'rich_text',
        layout_variant = seed.layout_variant,
        is_visible = true,
        is_archived = false,
        updated_at = pg_catalog.now()
      where id = v_section_id;
    end if;
  end loop;
end;
$seed_concise_case_studies$;

-- Empty/title-only sections created by the earlier broad template are retained
-- for revision/history safety but removed from publication.
update public.project_sections as section
set
  is_visible = false,
  is_archived = true,
  updated_at = pg_catalog.now()
where (section.is_visible or not section.is_archived)
  and nullif(pg_catalog.btrim(coalesce(section.body, '')), '') is null
  and not exists (
    select 1
    from pg_catalog.unnest(
      coalesce(section.bullets, array[]::text[])
    ) as bullet(value)
    where nullif(pg_catalog.btrim(bullet.value), '') is not null
  )
  and not exists (
    select 1
    from public.project_section_items as item
    where item.project_section_id = section.id
      and item.is_visible
      and (
        nullif(pg_catalog.btrim(coalesce(item.label, '')), '') is not null
        or nullif(pg_catalog.btrim(coalesce(item.value, '')), '') is not null
        or nullif(
             pg_catalog.btrim(coalesce(item.description, '')),
             ''
           ) is not null
      )
  )
  and not (
    section.section_type = 'media_gallery'
    and exists (
      select 1
      from public.project_media as media
      where media.project_id = section.project_id
        and media.is_visible
        and nullif(
              pg_catalog.btrim(coalesce(media.media_url, '')),
              ''
            ) is not null
    )
  );

do $final_cms_alignment_postflight$
declare
  v_problem text;
begin
  with required_columns(table_name, column_name, udt_name, nullable) as (
    values
      ('pages', 'navigation_label', 'text', null::text),
      ('pages', 'navigation_order', 'int4', 'NO'),
      ('pages', 'show_in_navigation', 'bool', 'NO'),
      ('pages', 'show_in_footer', 'bool', 'NO'),
      ('page_sections', 'layout_variant', 'text', 'NO'),
      ('project_sections', 'layout_variant', 'text', 'NO')
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I', expected.table_name, expected.column_name),
    ', '
    order by expected.table_name, expected.column_name
  )
  into v_problem
  from required_columns as expected
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = expected.table_name
   and columns.column_name = expected.column_name
   and columns.udt_name = expected.udt_name
   and (
     expected.nullable is null
     or columns.is_nullable = expected.nullable
   )
  where columns.column_name is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: builder/navigation columns are incomplete',
      detail = v_problem;
  end if;

  if pg_catalog.to_regclass(
       'public.cms_builder_action_requests'
     ) is null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: builder request table is missing';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class as relation
    where relation.oid =
          'public.cms_builder_action_requests'::pg_catalog.regclass
      and not relation.relrowsecurity
  )
  or exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'cms_builder_action_requests'
  )
  or exists (
    select 1
    from (
      values
        ('anon'),
        ('authenticated'),
        ('service_role')
    ) as target_role(role_name)
    cross join (
      values
        ('SELECT'),
        ('INSERT'),
        ('UPDATE'),
        ('DELETE')
    ) as target_privilege(privilege_name)
    where pg_catalog.has_table_privilege(
      target_role.role_name,
      'public.cms_builder_action_requests',
      target_privilege.privilege_name
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: builder request table access is not RPC-only';
  end if;

  with canonical_pages(page_key) as (
    values
      ('home'),
      ('about'),
      ('projects'),
      ('experience'),
      ('expertise'),
      ('education'),
      ('certifications'),
      ('resume'),
      ('contact')
  )
  select pg_catalog.string_agg(
    expected.page_key,
    ', '
    order by expected.page_key
  )
  into v_problem
  from canonical_pages as expected
  join public.pages as page on page.page_key = expected.page_key
  where not exists (
    select 1
    from public.page_sections as section
    where section.page_id = page.id
      and section.is_visible
      and not section.is_archived
  );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: canonical page has no visible, non-archived section',
      detail = v_problem;
  end if;

  if exists (
    select 1
    from public.page_sections as section
    where section.section_key in (
      'canonical-education',
      'canonical-resume'
    )
      and not section.is_archived
      and not exists (
        select 1
        from public.page_section_items as item
        where item.page_section_id = section.id
          and item.is_visible
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: seeded card block has no visible source items';
  end if;

  if exists (
    select 1
    from public.page_sections
    where not (
      (
        section_type in ('hero', 'rich_text', 'split_content', 'cta')
        and layout_variant in ('default', 'compact', 'split')
      )
      or (
        section_type in (
          'custom_cards',
          'featured_projects',
          'projects_grid',
          'skills',
          'certifications_grid',
          'media_gallery'
        )
        and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
      )
      or (
        section_type = 'stats'
        and layout_variant in (
          'default',
          'compact',
          'grid-2',
          'grid-3',
          'metrics'
        )
      )
      or (
        section_type = 'experience_list'
        and layout_variant in ('default', 'compact', 'timeline')
      )
      or (
        section_type = 'volunteering'
        and layout_variant in (
          'default',
          'compact',
          'grid-2',
          'timeline'
        )
      )
    )
  )
  or exists (
    select 1
    from public.project_sections
    where not (
      (
        section_type = 'rich_text'
        and layout_variant in ('default', 'compact', 'split')
      )
      or (
        section_type = 'media_gallery'
        and layout_variant in ('default', 'compact', 'grid-2', 'grid-3')
      )
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: uncontrolled block type or variant remains';
  end if;

  with required_pages(page_key, slug) as (
    values
      ('expertise', '/expertise'),
      ('education', '/education'),
      ('contact', '/contact')
  )
  select pg_catalog.string_agg(
    expected.page_key,
    ', '
    order by expected.page_key
  )
  into v_problem
  from required_pages as expected
  left join public.pages as page
    on page.page_key = expected.page_key
   and page.slug = expected.slug
  where page.id is null
     or page.is_published is not true;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: canonical page rows are incomplete',
      detail = v_problem;
  end if;

  with expected_navigation(
    page_key,
    slug,
    navigation_label,
    navigation_order,
    show_in_navigation,
    show_in_footer
  ) as (
    values
      ('home', '/', 'Home', 0, true, true),
      ('projects', '/projects', 'Projects', 10, true, true),
      ('experience', '/experience', 'Experience', 20, true, true),
      ('expertise', '/expertise', 'Expertise', 30, true, true),
      ('about', '/about', 'About', 40, true, true),
      ('contact', '/contact', 'Contact', 50, true, true),
      ('resume', '/resume', 'Resume', 60, true, true),
      ('education', '/education', 'Education', 70, false, true),
      ('certifications', '/certifications', 'Certifications', 80, false, true)
  )
  select pg_catalog.string_agg(
    expected.page_key,
    ', '
    order by expected.navigation_order
  )
  into v_problem
  from expected_navigation as expected
  left join public.pages as page
    on page.page_key = expected.page_key
   and page.slug = expected.slug
  where page.id is null
     or page.navigation_label is distinct from expected.navigation_label
     or page.navigation_order is distinct from expected.navigation_order
     or page.show_in_navigation is distinct from expected.show_in_navigation
     or page.show_in_footer is distinct from expected.show_in_footer;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: canonical navigation settings are incomplete',
      detail = v_problem;
  end if;

  if exists (
    select 1
    from public.pages
    where show_in_navigation
      and page_key not in (
        'home',
        'projects',
        'experience',
        'expertise',
        'about',
        'contact',
        'resume'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: non-canonical primary navigation row remains';
  end if;

  if exists (
    select 1
    from public.pages
    where is_published
      and (
        nullif(pg_catalog.btrim(seo_title), '') is null
        or nullif(pg_catalog.btrim(seo_description), '') is null
        or nullif(pg_catalog.btrim(open_graph_title), '') is null
        or nullif(pg_catalog.btrim(open_graph_description), '') is null
        or nullif(pg_catalog.btrim(open_graph_image), '') is null
      )
  )
  or exists (
    select 1
    from public.projects
    where published
      and status = 'published'
      and (
        nullif(pg_catalog.btrim(seo_title), '') is null
        or nullif(pg_catalog.btrim(seo_description), '') is null
        or nullif(pg_catalog.btrim(open_graph_image), '') is null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: published SEO/social defaults are incomplete';
  end if;

  if exists (
    select 1
    from public.projects
    where (
      slug = 'master-multi-agent-llm-project'
      or pg_catalog.lower(title) = 'master multi-agent llm project'
    )
      and (
        published
        or status <> 'preparation'
        or featured
        or home_featured_order is not null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: Master project publication boundary is incorrect';
  end if;

  if exists (
    select 1
    from public.profile
    where published
      and availability
          <> 'International full-time availability from October 2027; selected freelance projects available now.'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: availability is not October 2027';
  end if;

  if exists (
    select 1
    from public.projects
    where slug in (
      'vermeg-ai-ready-e-learning-platform',
      'ai-ready-elearning-platform'
    )
      and (
        summary not ilike '%two-person%'
        or summary not ilike '%chatbot%'
        or summary not ilike '%selected application services%'
        or summary not ilike '%not sole-authored%'
        or summary not ilike '%not presented as a production deployment%'
        or description not ilike '%not sole-authored%'
        or description not ilike '%not presented as a production deployment%'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: VERMEG attribution boundary is incomplete';
  end if;

  if exists (
    select 1
    from public.experience
    where published
      and role ilike '%software%'
      and (
        company ilike '%El Mouradi%'
        or company ilike '%Sunshine%'
      )
      and (
        (
          company ilike '%El Mouradi%'
          and company ilike '%Sunshine%'
        )
        or pg_catalog.concat_ws(
             ' ',
             start_date,
             end_date,
             date_label,
             pg_catalog.array_to_string(points, ' ')
           ) ~* '(future|planned|prospective|upcoming|2027|2028|2029)'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: prospective software role is still published';
  end if;

  if exists (
    select 1
    from public.project_sections as section
    join public.projects as project on project.id = section.project_id
    where project.published
      and project.status = 'published'
      and section.is_visible
      and not section.is_archived
      and nullif(pg_catalog.btrim(coalesce(section.body, '')), '') is null
      and not exists (
        select 1
        from pg_catalog.unnest(
          coalesce(section.bullets, array[]::text[])
        ) as bullet(value)
        where nullif(pg_catalog.btrim(bullet.value), '') is not null
      )
      and not exists (
        select 1
        from public.project_section_items as item
        where item.project_section_id = section.id
          and item.is_visible
          and (
            nullif(pg_catalog.btrim(coalesce(item.label, '')), '') is not null
            or nullif(pg_catalog.btrim(coalesce(item.value, '')), '')
                is not null
            or nullif(
                 pg_catalog.btrim(coalesce(item.description, '')),
                 ''
               ) is not null
          )
      )
      and not (
        section.section_type = 'media_gallery'
        and exists (
          select 1
          from public.project_media as media
          where media.project_id = section.project_id
            and media.is_visible
            and nullif(
                  pg_catalog.btrim(coalesce(media.media_url, '')),
                  ''
                ) is not null
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Final CMS alignment postflight failed: a visible title-only project section remains';
  end if;
end;
$final_cms_alignment_postflight$;

commit;

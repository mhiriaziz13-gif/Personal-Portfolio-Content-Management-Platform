begin;

-- ============================================================
-- WAVE 2B — ATOMIC PROJECT WORKSPACE MUTATION
-- ============================================================

create or replace function public.mutate_project_workspace(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_values jsonb,
  p_links jsonb,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_previous public.projects%rowtype;
  v_next public.projects%rowtype;

  v_required_keys text[] := array[
    'title',
    'type',
    'summary',
    'description',
    'cover_image_url',
    'card_image_url',
    'open_graph_image',
    'tags',
    'tools',
    'seo_title',
    'seo_description',
    'project_group',
    'organisation',
    'status',
    'home_featured_order',
    'projects_page_order',
    'featured',
    'published',
    'sort_order',
    'role',
    'start_date',
    'end_date',
    'machine_summary'
  ];

  v_previous_links jsonb;
  v_next_links jsonb;

  v_status text;
  v_published boolean;
  v_featured boolean;
  v_start_date date;
  v_end_date date;

  v_github_url text;
  v_linkedin_url text;
  v_demo_url text;
  v_case_study_url text;

  v_changed_fields text[];
  v_revision_id uuid;
  v_request_id uuid;
begin

  -- ----------------------------------------------------------
  -- Security
  -- ----------------------------------------------------------

  if p_actor_user_id is null
     or not exists (
       select 1
       from public.admins as admin_row
       where admin_row.user_id = p_actor_user_id
     )
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_actor';
  end if;

  if p_project_id is null
     or p_expected_updated_at is null
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_workspace_precondition';
  end if;

  if pg_catalog.jsonb_typeof(p_values) <> 'object'
     or pg_catalog.jsonb_typeof(p_links) <> 'array'
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_workspace_payload';
  end if;

  if not (p_values ?& v_required_keys) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_workspace_fields_missing';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(p_values) as incoming(key_name)
    where not incoming.key_name = any(v_required_keys)
  ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_workspace_forbidden_fields';
  end if;

  if pg_catalog.jsonb_typeof(p_values -> 'tags')
       is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_values -> 'tools')
       is distinct from 'array'
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_workspace_invalid_arrays';
  end if;


  -- ----------------------------------------------------------
  -- Lock project + optimistic concurrency
  -- ----------------------------------------------------------

  select project.*
  into v_previous
  from public.projects as project
  where project.id = p_project_id
  for update;

  if not found then
    raise exception using
      errcode = 'CMS03',
      message = 'cms_content_not_found';
  end if;

  if v_previous.updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = 'CMS02',
      message = 'cms_edit_conflict';
  end if;

  if v_previous.deletion_status <> 'active' then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_project_deletion_in_progress';
  end if;


  -- ----------------------------------------------------------
  -- Parse workflow state
  -- ----------------------------------------------------------

  v_status := p_values ->> 'status';
  v_published := (p_values ->> 'published')::boolean;
  v_featured := (p_values ->> 'featured')::boolean;

  v_start_date :=
    nullif(pg_catalog.btrim(p_values ->> 'start_date'), '')::date;

  v_end_date :=
    nullif(pg_catalog.btrim(p_values ->> 'end_date'), '')::date;

  if v_status not in (
    'draft',
    'preparation',
    'published',
    'archived'
  ) then
    raise exception using
      errcode = 'CMS07',
      message = 'cms_invalid_project_status';
  end if;

  if v_published is distinct from (v_status = 'published') then
    raise exception using
      errcode = 'CMS05',
      message = 'cms_project_publication_state_mismatch';
  end if;

  if v_start_date is not null
     and v_end_date is not null
     and v_end_date < v_start_date
  then
    raise exception using
      errcode = 'CMS07',
      message = 'cms_project_invalid_dates';
  end if;


  -- ----------------------------------------------------------
  -- Validate links
  -- ----------------------------------------------------------

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_links) as item(value)
    where
      pg_catalog.jsonb_typeof(item.value) <> 'object'
      or nullif(
        pg_catalog.btrim(item.value ->> 'link_type'),
        ''
      ) is null
      or (item.value ->> 'link_type')
           !~ '^[a-z0-9_-]{1,40}$'
      or nullif(
        pg_catalog.btrim(item.value ->> 'url'),
        ''
      ) is null
      or (item.value ->> 'url')
           !~* '^https://[^[:space:]]+$'
  ) then
    raise exception using
      errcode = 'CMS07',
      message = 'cms_project_invalid_link';
  end if;


  -- ----------------------------------------------------------
  -- Publishing invariants
  -- ----------------------------------------------------------

  if v_published then

    if nullif(
         pg_catalog.btrim(p_values ->> 'title'),
         ''
       ) is null
       or nullif(
         pg_catalog.btrim(v_previous.slug),
         ''
       ) is null
       or nullif(
         pg_catalog.btrim(p_values ->> 'summary'),
         ''
       ) is null
    then
      raise exception using
        errcode = 'CMS05',
        message = 'cms_project_incomplete';
    end if;


    if not exists (
      select 1
      from public.project_sections as section
      where section.project_id = p_project_id
        and section.is_visible
        and not section.is_archived
    ) then
      raise exception using
        errcode = 'CMS05',
        message = 'cms_project_requires_evidence';
    end if;


    if exists (
      select 1
      from public.project_sections as section
      where section.project_id = p_project_id
        and section.is_visible
        and not section.is_archived
        and not (
          nullif(
            pg_catalog.btrim(section.body),
            ''
          ) is not null

          or exists (
            select 1
            from pg_catalog.unnest(
              coalesce(section.bullets, '{}'::text[])
            ) as bullet(value)
            where nullif(
              pg_catalog.btrim(bullet.value),
              ''
            ) is not null
          )

          or exists (
            select 1
            from public.project_section_items as item
            where
              item.project_section_id = section.id
              and item.is_visible
              and (
                nullif(
                  pg_catalog.btrim(item.value),
                  ''
                ) is not null
                or nullif(
                  pg_catalog.btrim(item.description),
                  ''
                ) is not null
              )
          )

          or (
            section.section_type = 'media_gallery'
            and exists (
              select 1
              from public.project_media as media
              where media.project_id = p_project_id
                and media.is_visible
                and nullif(
                  pg_catalog.btrim(media.media_url),
                  ''
                ) is not null
            )
          )
        )
    ) then
      raise exception using
        errcode = 'CMS05',
        message = 'cms_project_visible_section_empty';
    end if;


    if exists (
      select 1
      from public.projects as other_project
      where other_project.id <> p_project_id
        and other_project.published
        and other_project.status = 'published'
        and other_project.projects_page_order =
          (p_values ->> 'projects_page_order')::integer
    ) then
      raise exception using
        errcode = '23505',
        message = 'cms_projects_page_order_conflict';
    end if;


    if v_featured
       and nullif(
         p_values ->> 'home_featured_order',
         ''
       ) is not null
       and exists (
         select 1
         from public.projects as other_project
         where other_project.id <> p_project_id
           and other_project.published
           and other_project.status = 'published'
           and other_project.featured
           and other_project.home_featured_order =
             (p_values ->> 'home_featured_order')::integer
       )
    then
      raise exception using
        errcode = '23505',
        message = 'cms_home_featured_order_conflict';
    end if;

  else

    -- Preserve the existing protection against silently breaking
    -- links from published CMS pages.

    if exists (
      select 1
      from public.page_section_items as item
      join public.page_sections as section
        on section.id = item.page_section_id
      join public.pages as page
        on page.id = section.page_id
      where page.is_published
        and section.is_visible
        and not section.is_archived
        and item.is_visible
        and pg_catalog.btrim(item.link_url) in (
          '/projects/' || v_previous.slug,
          '/projects/' || v_previous.slug || '/'
        )
    ) then
      raise exception using
        errcode = 'CMS06',
        message = 'cms_project_linked_from_published_page';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Snapshot current normalized links
  -- ----------------------------------------------------------

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'link_type', link.link_type,
        'label', link.label,
        'url', link.url,
        'display_order', link.display_order,
        'is_visible', link.is_visible
      )
      order by link.display_order, link.link_type, link.url
    ),
    '[]'::jsonb
  )
  into v_previous_links
  from public.project_links as link
  where link.project_id = p_project_id;


  -- ----------------------------------------------------------
  -- Derive legacy fixed links for backward compatibility
  -- ----------------------------------------------------------

  select pg_catalog.btrim(item.value ->> 'url')
  into v_github_url
  from pg_catalog.jsonb_array_elements(p_links) as item(value)
  where item.value ->> 'link_type' = 'github'
    and coalesce(
      (item.value ->> 'is_visible')::boolean,
      true
    )
  order by coalesce(
    (item.value ->> 'display_order')::integer,
    0
  )
  limit 1;


  select pg_catalog.btrim(item.value ->> 'url')
  into v_linkedin_url
  from pg_catalog.jsonb_array_elements(p_links) as item(value)
  where item.value ->> 'link_type' = 'linkedin'
    and coalesce(
      (item.value ->> 'is_visible')::boolean,
      true
    )
  order by coalesce(
    (item.value ->> 'display_order')::integer,
    0
  )
  limit 1;


  select pg_catalog.btrim(item.value ->> 'url')
  into v_demo_url
  from pg_catalog.jsonb_array_elements(p_links) as item(value)
  where item.value ->> 'link_type' = 'demo'
    and coalesce(
      (item.value ->> 'is_visible')::boolean,
      true
    )
  order by coalesce(
    (item.value ->> 'display_order')::integer,
    0
  )
  limit 1;


  select pg_catalog.btrim(item.value ->> 'url')
  into v_case_study_url
  from pg_catalog.jsonb_array_elements(p_links) as item(value)
  where item.value ->> 'link_type' = 'case_study'
    and coalesce(
      (item.value ->> 'is_visible')::boolean,
      true
    )
  order by coalesce(
    (item.value ->> 'display_order')::integer,
    0
  )
  limit 1;


  -- ----------------------------------------------------------
  -- Update project
  -- Slug intentionally remains immutable in Wave 2B.
  -- ----------------------------------------------------------

  update public.projects as project
  set
    title =
      pg_catalog.btrim(p_values ->> 'title'),

    type =
      nullif(
        pg_catalog.btrim(p_values ->> 'type'),
        ''
      ),

    summary =
      nullif(
        pg_catalog.btrim(p_values ->> 'summary'),
        ''
      ),

    description =
      nullif(
        pg_catalog.btrim(p_values ->> 'description'),
        ''
      ),

    cover_image_url =
      nullif(
        pg_catalog.btrim(p_values ->> 'cover_image_url'),
        ''
      ),

    card_image_url =
      nullif(
        pg_catalog.btrim(p_values ->> 'card_image_url'),
        ''
      ),

    open_graph_image =
      nullif(
        pg_catalog.btrim(p_values ->> 'open_graph_image'),
        ''
      ),

    tags = coalesce(
      array(
        select pg_catalog.btrim(tag.value)
        from pg_catalog.jsonb_array_elements_text(
          p_values -> 'tags'
        ) as tag(value)
        where nullif(
          pg_catalog.btrim(tag.value),
          ''
        ) is not null
      ),
      '{}'::text[]
    ),

    tools = coalesce(
      array(
        select pg_catalog.btrim(tool.value)
        from pg_catalog.jsonb_array_elements_text(
          p_values -> 'tools'
        ) as tool(value)
        where nullif(
          pg_catalog.btrim(tool.value),
          ''
        ) is not null
      ),
      '{}'::text[]
    ),

    seo_title =
      nullif(
        pg_catalog.btrim(p_values ->> 'seo_title'),
        ''
      ),

    seo_description =
      nullif(
        pg_catalog.btrim(p_values ->> 'seo_description'),
        ''
      ),

    project_group =
      pg_catalog.btrim(p_values ->> 'project_group'),

    organisation =
      nullif(
        pg_catalog.btrim(p_values ->> 'organisation'),
        ''
      ),

    role =
      nullif(
        pg_catalog.btrim(p_values ->> 'role'),
        ''
      ),

    start_date = v_start_date,
    end_date = v_end_date,

    machine_summary =
      nullif(
        pg_catalog.btrim(p_values ->> 'machine_summary'),
        ''
      ),

    status = v_status,
    published = v_published,

    featured =
      case
        when v_status = 'archived' then false
        else v_featured
      end,

    projects_page_order =
      (p_values ->> 'projects_page_order')::integer,

    home_featured_order =
      nullif(
        p_values ->> 'home_featured_order',
        ''
      )::integer,

    sort_order =
      (p_values ->> 'sort_order')::integer,

    published_at =
      case
        when v_published
          then coalesce(
            project.published_at,
            pg_catalog.now()
          )
        else project.published_at
      end,

    archived_at =
      case
        when v_status = 'archived'
          then coalesce(
            project.archived_at,
            pg_catalog.now()
          )
        else null
      end,

    github_url = v_github_url,
    linkedin_url = v_linkedin_url,
    demo_url = v_demo_url,
    case_study_url = v_case_study_url

  where project.id = p_project_id

  returning project.*
  into v_next;


  -- ----------------------------------------------------------
  -- Replace normalized link set atomically
  -- ----------------------------------------------------------

  delete from public.project_links
  where project_id = p_project_id;


  insert into public.project_links (
    project_id,
    link_type,
    label,
    url,
    display_order,
    is_visible
  )
  select
    p_project_id,

    pg_catalog.btrim(
      item.value ->> 'link_type'
    ),

    nullif(
      pg_catalog.btrim(item.value ->> 'label'),
      ''
    ),

    pg_catalog.btrim(
      item.value ->> 'url'
    ),

    coalesce(
      (item.value ->> 'display_order')::integer,
      0
    ),

    coalesce(
      (item.value ->> 'is_visible')::boolean,
      true
    )

  from pg_catalog.jsonb_array_elements(
    p_links
  ) as item(value);


  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'link_type', link.link_type,
        'label', link.label,
        'url', link.url,
        'display_order', link.display_order,
        'is_visible', link.is_visible
      )
      order by link.display_order, link.link_type, link.url
    ),
    '[]'::jsonb
  )
  into v_next_links
  from public.project_links as link
  where link.project_id = p_project_id;


  -- ----------------------------------------------------------
  -- Keep ownership mapping synchronized for primary media.
  -- Storage deletion itself remains Wave 2C/2E.
  -- ----------------------------------------------------------

  delete from public.project_uploads
  where project_id = p_project_id
    and usage in (
      'card',
      'cover',
      'open_graph'
    );


  insert into public.project_uploads (
    project_id,
    upload_id,
    usage,
    ownership
  )

  select
    p_project_id,
    upload.id,
    asset.usage,
    'owned'

  from (
    values
      ('card'::text, v_next.card_image_url),
      ('cover'::text, v_next.cover_image_url),
      ('open_graph'::text, v_next.open_graph_image)
  ) as asset(usage, asset_url)

  join public.uploads as upload
    on upload.public_url = asset.asset_url

  where asset.asset_url is not null
    and upload.deletion_status = 'active'

  on conflict (
    project_id,
    upload_id,
    usage
  ) do nothing;


  -- Recalculate shared/owned state.

  with reference_counts as (
    select
      upload_id,
      count(distinct project_id) as project_count
    from public.project_uploads
    group by upload_id
  )

  update public.project_uploads as relation
  set ownership =
    case
      when reference_counts.project_count > 1
        then 'shared'
      else 'owned'
    end

  from reference_counts

  where reference_counts.upload_id =
    relation.upload_id;


  -- ----------------------------------------------------------
  -- Revision history
  -- ----------------------------------------------------------

  select coalesce(
    pg_catalog.array_agg(
      changed.key_name
      order by changed.key_name
    ),
    '{}'::text[]
  )
  into v_changed_fields

  from (
    select key_row.key_name

    from pg_catalog.unnest(
      v_required_keys
    ) as key_row(key_name)

    where
      pg_catalog.to_jsonb(v_previous)
        -> key_row.key_name
      is distinct from
      pg_catalog.to_jsonb(v_next)
        -> key_row.key_name

    union

    select 'project_links'
    where v_previous_links
      is distinct from
      v_next_links

    union

    select 'published_at'
    where v_previous.published_at
      is distinct from
      v_next.published_at

    union

    select 'archived_at'
    where v_previous.archived_at
      is distinct from
      v_next.archived_at

  ) as changed;


  insert into public.cms_content_revisions (
    actor_user_id,
    table_name,
    record_id,
    operation,
    changed_fields,
    previous_values,
    next_values
  )

  values (
    p_actor_user_id,
    'projects',
    p_project_id::text,
    'update',
    v_changed_fields,

    pg_catalog.jsonb_build_object(
      'project',
      pg_catalog.to_jsonb(v_previous),
      'project_links',
      v_previous_links
    ),

    pg_catalog.jsonb_build_object(
      'project',
      pg_catalog.to_jsonb(v_next),
      'project_links',
      v_next_links
    )
  )

  returning id, request_id
  into v_revision_id, v_request_id;


  return pg_catalog.jsonb_build_object(
    'project',
    pg_catalog.to_jsonb(v_next),
    'links',
    v_next_links,
    'revisionRecorded',
    true,
    'revisionId',
    v_revision_id,
    'requestId',
    v_request_id
  );

end;
$function$;


revoke all
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
from public;


grant execute
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
to service_role;


commit;
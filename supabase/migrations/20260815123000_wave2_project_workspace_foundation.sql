begin;

-- ============================================================
-- WAVE 2A — PROJECT WORKSPACE FOUNDATION
-- Additive / backward-compatible migration.
-- No existing project content is deleted or rewritten.
-- ============================================================


-- ============================================================
-- 1. PROJECT WORKSPACE FIELDS
-- ============================================================

alter table public.projects
  add column if not exists role text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists machine_summary text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists deletion_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_error_code text;


-- Prevent inconsistent project dates.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_dates_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_dates_check
      check (
        start_date is null
        or end_date is null
        or end_date >= start_date
      );
  end if;
end
$$;


-- Machine summaries are intentionally concise.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_machine_summary_length_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_machine_summary_length_check
      check (
        machine_summary is null
        or char_length(machine_summary) <= 2000
      );
  end if;
end
$$;


-- Project deletion lifecycle.
-- "pending" and "failed" will be used later by the staged hard-delete flow.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_deletion_status_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_deletion_status_check
      check (
        deletion_status in ('active', 'pending', 'failed')
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_deletion_error_code_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_deletion_error_code_check
      check (
        deletion_error_code is null
        or deletion_error_code ~ '^[A-Za-z0-9_.:-]{1,80}$'
      );
  end if;
end
$$;


create index if not exists projects_deletion_status_idx
  on public.projects (deletion_status)
  where deletion_status <> 'active';


-- ============================================================
-- 2. NORMALIZED PROJECT LINKS
-- ============================================================

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  link_type text not null,
  label text,
  url text not null,

  display_order integer not null default 0,
  is_visible boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint project_links_type_check
    check (
      link_type ~ '^[a-z0-9_-]{1,40}$'
    ),

  constraint project_links_label_length_check
    check (
      label is null
      or char_length(label) <= 120
    ),

  constraint project_links_url_length_check
    check (
      char_length(url) between 1 and 2048
    ),

  constraint project_links_project_type_url_unique
    unique (project_id, link_type, url)
);


create index if not exists project_links_project_order_idx
  on public.project_links (project_id, display_order, id);


drop trigger if exists project_links_set_updated_at
  on public.project_links;

create trigger project_links_set_updated_at
before update on public.project_links
for each row
execute function public.set_updated_at();


-- ============================================================
-- 3. PROJECT SLUG HISTORY
-- ============================================================

create table if not exists public.project_slug_history (
  id uuid primary key default gen_random_uuid(),

  old_slug text not null unique,

  project_id uuid
    references public.projects(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint project_slug_history_slug_format_check
    check (
      old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
);


create index if not exists project_slug_history_project_idx
  on public.project_slug_history (project_id)
  where project_id is not null;


-- ============================================================
-- 4. PROJECT ↔ MANAGED UPLOAD RELATIONSHIP
-- ============================================================
--
-- We intentionally use a junction table instead of uploads.project_id.
--
-- Why:
-- - one upload can potentially be referenced by more than one project;
-- - shared assets must NEVER be deleted just because one project disappears;
-- - a project can use one upload for several purposes.
--
-- ON DELETE RESTRICT on project_id protects against accidental
-- database-first hard deletion before Storage cleanup.
-- ============================================================

create table if not exists public.project_uploads (
  project_id uuid not null
    references public.projects(id)
    on delete restrict,

  upload_id uuid not null
    references public.uploads(id)
    on delete cascade,

  usage text not null default 'other',

  ownership text not null default 'owned',

  created_at timestamptz not null default now(),

  primary key (project_id, upload_id, usage),

  constraint project_uploads_usage_check
    check (
      usage in (
        'card',
        'cover',
        'open_graph',
        'placeholder',
        'gallery',
        'document',
        'video',
        'other'
      )
    ),

  constraint project_uploads_ownership_check
    check (
      ownership in ('owned', 'shared')
    )
);


create index if not exists project_uploads_upload_idx
  on public.project_uploads (upload_id);


-- ============================================================
-- 5. RLS — PROJECT LINKS
-- ============================================================

alter table public.project_links enable row level security;

revoke all on public.project_links from anon, authenticated;

grant select on public.project_links to anon, authenticated;


drop policy if exists
  "Published project links are readable"
  on public.project_links;

create policy "Published project links are readable"
on public.project_links
for select
to anon
using (
  is_visible
  and exists (
    select 1
    from public.projects as project
    where project.id = project_links.project_id
      and project.published = true
      and project.status = 'published'
      and project.deletion_status = 'active'
  )
);


drop policy if exists
  "Authenticated read project links"
  on public.project_links;

create policy "Authenticated read project links"
on public.project_links
for select
to authenticated
using (
  (
    is_visible
    and exists (
      select 1
      from public.projects as project
      where project.id = project_links.project_id
        and project.published = true
        and project.status = 'published'
        and project.deletion_status = 'active'
    )
  )
  or (select private.is_admin())
);


-- ============================================================
-- 6. RLS — SLUG HISTORY
-- ============================================================

alter table public.project_slug_history enable row level security;

revoke all on public.project_slug_history from anon, authenticated;

grant select on public.project_slug_history to anon, authenticated;


drop policy if exists
  "Published project slug redirects are readable"
  on public.project_slug_history;

create policy "Published project slug redirects are readable"
on public.project_slug_history
for select
to anon
using (
  project_id is not null
  and exists (
    select 1
    from public.projects as project
    where project.id = project_slug_history.project_id
      and project.published = true
      and project.status = 'published'
      and project.deletion_status = 'active'
  )
);


drop policy if exists
  "Authenticated read project slug history"
  on public.project_slug_history;

create policy "Authenticated read project slug history"
on public.project_slug_history
for select
to authenticated
using (
  (
    project_id is not null
    and exists (
      select 1
      from public.projects as project
      where project.id = project_slug_history.project_id
        and project.published = true
        and project.status = 'published'
        and project.deletion_status = 'active'
    )
  )
  or (select private.is_admin())
);


-- ============================================================
-- 7. PROJECT UPLOADS ARE SERVER-ONLY
-- ============================================================

alter table public.project_uploads enable row level security;

revoke all on public.project_uploads from anon, authenticated;


-- ============================================================
-- 8. MIGRATE EXISTING FIXED PROJECT LINKS
-- ============================================================

insert into public.project_links (
  project_id,
  link_type,
  label,
  url,
  display_order,
  is_visible
)
select
  project.id,
  source.link_type,
  source.label,
  btrim(source.url),
  source.display_order,
  true
from public.projects as project
cross join lateral (
  values
    ('github', 'GitHub', project.github_url, 10),
    ('linkedin', 'LinkedIn', project.linkedin_url, 20),
    ('demo', 'Live demo', project.demo_url, 30),
    ('case_study', 'Case study', project.case_study_url, 40)
) as source(link_type, label, url, display_order)
where nullif(btrim(source.url), '') is not null
on conflict (project_id, link_type, url) do nothing;


-- ============================================================
-- 9. DISCOVER EXISTING MANAGED PROJECT UPLOADS
-- ============================================================
--
-- This backfill is intentionally conservative:
-- only URLs that EXACTLY match the uploads registry are linked.
--
-- If the same upload is referenced by multiple projects,
-- ownership becomes "shared".
-- ============================================================

with project_asset_references as (

  select
    project.id as project_id,
    'cover'::text as usage,
    project.cover_image_url as asset_url
  from public.projects as project
  where nullif(btrim(project.cover_image_url), '') is not null

  union all

  select
    project.id,
    'card',
    project.card_image_url
  from public.projects as project
  where nullif(btrim(project.card_image_url), '') is not null

  union all

  select
    project.id,
    'open_graph',
    project.open_graph_image
  from public.projects as project
  where nullif(btrim(project.open_graph_image), '') is not null

  union all

  select
    project.id,
    'placeholder',
    project.placeholder_image_url
  from public.projects as project
  where nullif(btrim(project.placeholder_image_url), '') is not null

  union all

  select
    media.project_id,
    case
      when media.media_type = 'video' then 'video'
      when media.media_type = 'document' then 'document'
      else 'gallery'
    end,
    media.media_url
  from public.project_media as media
  where nullif(btrim(media.media_url), '') is not null
),

matched as (
  select distinct
    reference.project_id,
    upload.id as upload_id,
    reference.usage
  from project_asset_references as reference
  join public.uploads as upload
    on upload.public_url = reference.asset_url
  where upload.deletion_status = 'active'
),

reference_counts as (
  select
    upload_id,
    count(distinct project_id) as project_count
  from matched
  group by upload_id
)

insert into public.project_uploads (
  project_id,
  upload_id,
  usage,
  ownership
)
select
  matched.project_id,
  matched.upload_id,
  matched.usage,
  case
    when reference_counts.project_count > 1 then 'shared'
    else 'owned'
  end
from matched
join reference_counts
  on reference_counts.upload_id = matched.upload_id
on conflict (project_id, upload_id, usage) do nothing;


commit;
begin;

-- ============================================================
-- WAVE 2D-A — PROJECT SLUG HISTORY & SAFE RENAME
-- ============================================================


-- ============================================================
-- 1. CURRENT PROJECT SLUG FORMAT
-- ============================================================

do $$
begin

  if not exists (
    select 1

    from pg_constraint

    where conname =
      'projects_slug_format_check'

      and conrelid =
        'public.projects'::regclass
  ) then

    alter table public.projects

      add constraint
        projects_slug_format_check

      check (
        slug ~
          '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      );

  end if;

end
$$;


-- ============================================================
-- 2. DATABASE-LEVEL SLUG HISTORY GUARD
--
-- Rules:
-- - current slugs use lowercase kebab-case
-- - historical slugs are permanently reserved
-- - changing a slug automatically stores the previous slug
-- - reverting to an already historical slug is intentionally
--   blocked to avoid redirect loops and URL ambiguity
-- ============================================================

create or replace function
  private.manage_project_slug_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin

  -- ----------------------------------------------------------
  -- Validate incoming slug
  -- ----------------------------------------------------------

  if new.slug is null
     or new.slug
          !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then

    raise exception using
      errcode = 'CMS07',
      message =
        'cms_invalid_project_slug';

  end if;


  -- ----------------------------------------------------------
  -- INSERT:
  -- historical slugs may never be reused by a new project
  -- ----------------------------------------------------------

  if tg_op = 'INSERT' then

    if exists (
      select 1

      from public.project_slug_history
        as history

      where history.old_slug =
        new.slug
    ) then

      raise exception using
        errcode = 'CMS08',
        message =
          'cms_project_slug_reserved';

    end if;


    return new;

  end if;


  -- ----------------------------------------------------------
  -- UPDATE:
  -- nothing to do if the slug did not change
  -- ----------------------------------------------------------

  if new.slug is not distinct from
     old.slug
  then

    return new;

  end if;


  -- ----------------------------------------------------------
  -- New slug must not already be historical
  -- ----------------------------------------------------------

  if exists (
    select 1

    from public.project_slug_history
      as history

    where history.old_slug =
      new.slug
  ) then

    raise exception using
      errcode = 'CMS08',
      message =
        'cms_project_slug_reserved';

  end if;


  -- ----------------------------------------------------------
  -- Record previous canonical slug
  -- ----------------------------------------------------------

  insert into
    public.project_slug_history (
      old_slug,
      project_id
    )

  values (
    old.slug,
    old.id
  );


  return new;

end;
$function$;


revoke all
on function
  private.manage_project_slug_history()
from public, anon, authenticated;


drop trigger if exists
  manage_project_slug_history
on public.projects;


create trigger
  manage_project_slug_history

before insert
or update of slug

on public.projects

for each row

execute function
  private.manage_project_slug_history();


-- ============================================================
-- 3. DEDICATED ATOMIC SLUG RENAME RPC
-- ============================================================

create or replace function
  public.rename_project_slug(
    p_project_id uuid,
    p_expected_updated_at timestamptz,
    p_new_slug text,
    p_actor_user_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_previous
    public.projects%rowtype;

  v_next
    public.projects%rowtype;

  v_slug text;

  v_revision_id uuid;
  v_request_id uuid;
begin

  -- ----------------------------------------------------------
  -- Actor authorization
  -- ----------------------------------------------------------

  if p_actor_user_id is null

     or not exists (
       select 1

       from public.admins
         as admin_row

       where admin_row.user_id =
         p_actor_user_id
     )
  then

    raise exception using
      errcode = 'CMS01',
      message =
        'cms_invalid_actor';

  end if;


  if p_project_id is null
     or p_expected_updated_at
          is null
  then

    raise exception using
      errcode = 'CMS01',
      message =
        'cms_invalid_slug_rename_precondition';

  end if;


  -- ----------------------------------------------------------
  -- Normalize + validate requested slug
  -- ----------------------------------------------------------

  v_slug :=
    pg_catalog.btrim(
      p_new_slug
    );


  if v_slug is null
     or v_slug =
        ''
     or pg_catalog.length(
          v_slug
        ) > 200
     or v_slug
          !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then

    raise exception using
      errcode = 'CMS07',
      message =
        'cms_invalid_project_slug';

  end if;


  -- ----------------------------------------------------------
  -- Lock project + optimistic concurrency
  -- ----------------------------------------------------------

  select project.*

  into v_previous

  from public.projects
    as project

  where project.id =
    p_project_id

  for update;


  if not found then

    raise exception using
      errcode = 'CMS03',
      message =
        'cms_content_not_found';

  end if;


  if v_previous.updated_at
       is distinct from
       p_expected_updated_at
  then

    raise exception using
      errcode = 'CMS02',
      message =
        'cms_edit_conflict';

  end if;


  if v_previous.deletion_status
       <> 'active'
  then

    raise exception using
      errcode = 'CMS01',
      message =
        'cms_project_deletion_in_progress';

  end if;


  -- ----------------------------------------------------------
  -- No-op rename
  -- ----------------------------------------------------------

  if v_slug =
     v_previous.slug
  then

    return
      pg_catalog.jsonb_build_object(
        'project',
          pg_catalog.to_jsonb(
            v_previous
          ),

        'previousSlug',
          v_previous.slug,

        'newSlug',
          v_previous.slug,

        'slugChanged',
          false,

        'revisionRecorded',
          false,

        'revisionId',
          null,

        'requestId',
          null
      );

  end if;


  -- ----------------------------------------------------------
  -- Current slug collision
  -- ----------------------------------------------------------

  if exists (
    select 1

    from public.projects
      as other_project

    where other_project.id <>
      p_project_id

      and other_project.slug =
        v_slug
  ) then

    raise exception using
      errcode = 'CMS08',
      message =
        'cms_project_slug_in_use';

  end if;


  -- ----------------------------------------------------------
  -- Historical slug collision
  -- ----------------------------------------------------------

  if exists (
    select 1

    from public.project_slug_history
      as history

    where history.old_slug =
      v_slug
  ) then

    raise exception using
      errcode = 'CMS08',
      message =
        'cms_project_slug_reserved';

  end if;


  -- ----------------------------------------------------------
  -- Update canonical slug
  --
  -- manage_project_slug_history trigger automatically stores
  -- v_previous.slug in project_slug_history.
  -- ----------------------------------------------------------

  update public.projects
    as project

  set
    slug = v_slug

  where project.id =
    p_project_id

  returning project.*

  into v_next;


  -- ----------------------------------------------------------
  -- Revision history
  -- ----------------------------------------------------------

  insert into
    public.cms_content_revisions (
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

    array[
      'slug'
    ]::text[],

    pg_catalog.jsonb_build_object(
      'slug',
      v_previous.slug
    ),

    pg_catalog.jsonb_build_object(
      'slug',
      v_next.slug
    )
  )

  returning
    id,
    request_id

  into
    v_revision_id,
    v_request_id;


  -- ----------------------------------------------------------
  -- Return verified result
  -- ----------------------------------------------------------

  return
    pg_catalog.jsonb_build_object(
      'project',
        pg_catalog.to_jsonb(
          v_next
        ),

      'previousSlug',
        v_previous.slug,

      'newSlug',
        v_next.slug,

      'slugChanged',
        true,

      'revisionRecorded',
        true,

      'revisionId',
        v_revision_id,

      'requestId',
        v_request_id
    );

end;
$function$;


-- ============================================================
-- 4. SERVICE-ROLE-ONLY RPC EXECUTION
-- ============================================================

revoke all
on function
  public.rename_project_slug(
    uuid,
    timestamptz,
    text,
    uuid
  )
from public;


revoke execute
on function
  public.rename_project_slug(
    uuid,
    timestamptz,
    text,
    uuid
  )
from anon;


revoke execute
on function
  public.rename_project_slug(
    uuid,
    timestamptz,
    text,
    uuid
  )
from authenticated;


grant execute
on function
  public.rename_project_slug(
    uuid,
    timestamptz,
    text,
    uuid
  )
to service_role;


commit;
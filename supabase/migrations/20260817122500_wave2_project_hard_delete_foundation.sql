begin;

-- ============================================================
-- WAVE 2E-A — STAGED PROJECT HARD DELETE FOUNDATION
--
-- This migration DOES NOT expose a client deletion path.
--
-- Flow:
--   active
--      ↓ prepare_project_hard_delete()
--   pending
--      ↓ Storage cleanup performed by server API
--      ↓ finalize_project_hard_delete()
--   physically deleted
--
-- If external cleanup fails:
--   pending
--      ↓ mark_project_hard_delete_failed()
--   failed
--
-- Important:
-- - archived + unpublished projects only
-- - typed slug confirmation required
-- - optimistic locking required at preparation
-- - project_uploads is handled before DELETE projects
-- - current slug becomes a permanent tombstone
-- - no SQL writes to storage.objects
-- ============================================================


-- ============================================================
-- 1. PREPARE PROJECT HARD DELETE
-- ============================================================

create or replace function
public.prepare_project_hard_delete(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_confirm_slug text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_project public.projects%rowtype;

  v_requested_at timestamptz;

  v_revision_id uuid;
  v_request_id uuid;

  v_uploads jsonb;
begin

  -- ----------------------------------------------------------
  -- Admin actor
  -- ----------------------------------------------------------

  if p_actor_user_id is null
     or not exists (
       select 1
       from public.admins as admin_row
       where admin_row.user_id =
         p_actor_user_id
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
      message =
        'cms_invalid_project_delete_precondition';
  end if;


  -- ----------------------------------------------------------
  -- Lock project
  -- ----------------------------------------------------------

  select project.*
  into v_project
  from public.projects as project
  where project.id = p_project_id
  for update;


  if not found then
    raise exception using
      errcode = 'CMS03',
      message = 'cms_content_not_found';
  end if;


  -- ----------------------------------------------------------
  -- Typed confirmation
  -- ----------------------------------------------------------

  if p_confirm_slug is null
     or pg_catalog.btrim(
          p_confirm_slug
        ) <> v_project.slug
  then
    raise exception using
      errcode = 'CMS09',
      message =
        'cms_project_delete_slug_confirmation_mismatch';
  end if;


  -- ----------------------------------------------------------
  -- Optimistic lock
  -- ----------------------------------------------------------

  if v_project.updated_at
       is distinct from
       p_expected_updated_at
  then
    raise exception using
      errcode = 'CMS02',
      message = 'cms_edit_conflict';
  end if;


  -- ----------------------------------------------------------
  -- Hard delete is only allowed from archived/unpublished state
  -- ----------------------------------------------------------

  if v_project.status <> 'archived'
     or v_project.published
  then
    raise exception using
      errcode = 'CMS10',
      message =
        'cms_project_must_be_archived_before_hard_delete';
  end if;


  -- ----------------------------------------------------------
  -- Only active/failed projects can start or restart deletion
  -- ----------------------------------------------------------

  if v_project.deletion_status =
     'pending'
  then
    raise exception using
      errcode = 'CMS11',
      message =
        'cms_project_delete_already_pending';
  end if;


  if v_project.deletion_status not in (
    'active',
    'failed'
  )
  then
    raise exception using
      errcode = 'CMS01',
      message =
        'cms_invalid_project_deletion_status';
  end if;


  -- ----------------------------------------------------------
  -- Defensive public-page reference check
  --
  -- Even archived legacy data must not disappear while a
  -- published page still explicitly links to its canonical URL.
  -- ----------------------------------------------------------

  if exists (
    select 1

    from public.page_section_items
      as item

    join public.page_sections
      as section
      on section.id =
        item.page_section_id

    join public.pages
      as page
      on page.id =
        section.page_id

    where item.is_visible
      and section.is_visible
      and not section.is_archived
      and page.is_published

      and item.link_url in (
        '/projects/' ||
          v_project.slug,

        '/projects/' ||
          v_project.slug ||
          '/'
      )
  )
  then
    raise exception using
      errcode = 'CMS06',
      message =
        'cms_project_link_conflict';
  end if;


  -- ----------------------------------------------------------
  -- Build upload inventory BEFORE changing deletion state.
  --
  -- reference_count is calculated from actual junction rows.
  -- We do NOT trust the stored ownership flag as source of truth.
  -- ----------------------------------------------------------

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'uploadId',
          inventory.upload_id,

        'bucket',
          inventory.bucket,

        'path',
          inventory.path,

        'publicUrl',
          inventory.public_url,

        'mimeType',
          inventory.mime_type,

        'deletionStatus',
          inventory.upload_deletion_status,

        'projectReferenceCount',
          inventory.project_reference_count,

        'exclusiveToProject',
          inventory.project_reference_count = 1
      )

      order by
        inventory.upload_id
    ),

    '[]'::jsonb
  )

  into v_uploads

  from (
    select distinct
      upload.id as upload_id,
      upload.bucket,
      upload.path,
      upload.public_url,
      upload.mime_type,

      upload.deletion_status
        as upload_deletion_status,

      (
        select count(
          distinct other_link.project_id
        )

        from public.project_uploads
          as other_link

        where other_link.upload_id =
          upload.id
      ) as project_reference_count

    from public.project_uploads
      as project_link

    join public.uploads
      as upload
      on upload.id =
        project_link.upload_id

    where project_link.project_id =
      p_project_id
  ) as inventory;


  -- ----------------------------------------------------------
  -- Stage deletion
  -- ----------------------------------------------------------

  v_requested_at :=
    pg_catalog.clock_timestamp();


  update public.projects
  set
    deletion_status =
      'pending',

    deletion_requested_at =
      v_requested_at,

    deletion_error_code =
      null

  where id =
    p_project_id

  returning *
  into v_project;


  -- ----------------------------------------------------------
  -- Revision
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
      'deletion_status',
      'deletion_requested_at',
      'deletion_error_code'
    ]::text[],

    pg_catalog.jsonb_build_object(
      'deletion_status',
        'active',

      'deletion_requested_at',
        null,

      'deletion_error_code',
        null
    ),

    pg_catalog.jsonb_build_object(
      'deletion_status',
        'pending',

      'deletion_requested_at',
        v_requested_at,

      'deletion_error_code',
        null
    )
  )

  returning
    id,
    request_id

  into
    v_revision_id,
    v_request_id;


  return
    pg_catalog.jsonb_build_object(
      'project',
        pg_catalog.to_jsonb(
          v_project
        ),

      'phase',
        'pending',

      'uploads',
        v_uploads,

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
-- 2. MARK FAILED
--
-- Called only by the future server-side orchestration if Storage
-- or metadata cleanup cannot complete safely.
-- ============================================================

create or replace function
public.mark_project_hard_delete_failed(
  p_project_id uuid,
  p_error_code text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_project public.projects%rowtype;

  v_error_code text;
begin

  if p_actor_user_id is null
     or not exists (
       select 1
       from public.admins as admin_row
       where admin_row.user_id =
         p_actor_user_id
     )
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_actor';
  end if;


  v_error_code :=
    pg_catalog.btrim(
      coalesce(
        p_error_code,
        ''
      )
    );


  if v_error_code = ''
     or pg_catalog.length(
          v_error_code
        ) > 80
     or v_error_code
          !~ '^[A-Za-z0-9_.:-]+$'
  then
    raise exception using
      errcode = 'CMS07',
      message =
        'cms_invalid_project_delete_error_code';
  end if;


  select project.*
  into v_project

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


  if v_project.deletion_status <>
     'pending'
  then
    raise exception using
      errcode = 'CMS01',
      message =
        'cms_project_delete_not_pending';
  end if;


  update public.projects

  set
    deletion_status =
      'failed',

    deletion_error_code =
      v_error_code

  where id =
    p_project_id

  returning *
  into v_project;


  return
    pg_catalog.jsonb_build_object(
      'project',
        pg_catalog.to_jsonb(
          v_project
        ),

      'phase',
        'failed',

      'errorCode',
        v_error_code
    );

end;
$function$;


-- ============================================================
-- 3. FINALIZE HARD DELETE
--
-- IMPORTANT:
-- The future API calls this only AFTER all Storage decisions
-- have completed.
--
-- Shared uploads remain.
-- Project junction rows are removed first.
-- Remaining project ownership is recalculated.
-- Current canonical slug becomes a permanent tombstone.
-- ============================================================

create or replace function
public.finalize_project_hard_delete(
  p_project_id uuid,
  p_confirm_slug text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_project public.projects%rowtype;

  v_upload_ids uuid[];

  v_revision_id uuid;
  v_request_id uuid;
begin

  -- ----------------------------------------------------------
  -- Admin actor
  -- ----------------------------------------------------------

  if p_actor_user_id is null
     or not exists (
       select 1
       from public.admins as admin_row
       where admin_row.user_id =
         p_actor_user_id
     )
  then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_actor';
  end if;


  -- ----------------------------------------------------------
  -- Lock project
  -- ----------------------------------------------------------

  select project.*
  into v_project

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


  -- ----------------------------------------------------------
  -- Typed confirmation again
  -- ----------------------------------------------------------

  if p_confirm_slug is null
     or pg_catalog.btrim(
          p_confirm_slug
        ) <> v_project.slug
  then
    raise exception using
      errcode = 'CMS09',
      message =
        'cms_project_delete_slug_confirmation_mismatch';
  end if;


  -- ----------------------------------------------------------
  -- Finalization only from pending state
  -- ----------------------------------------------------------

  if v_project.deletion_status <>
     'pending'
  then
    raise exception using
      errcode = 'CMS01',
      message =
        'cms_project_delete_not_pending';
  end if;


  if v_project.status <> 'archived'
     or v_project.published
  then
    raise exception using
      errcode = 'CMS10',
      message =
        'cms_project_must_be_archived_before_hard_delete';
  end if;


  -- ----------------------------------------------------------
  -- Capture upload IDs still linked to this project.
  --
  -- Exclusive uploads may already have disappeared because
  -- deleting upload metadata cascades project_uploads.
  -- Shared/non-deleted uploads may remain.
  -- ----------------------------------------------------------

  select coalesce(
    pg_catalog.array_agg(
      distinct project_upload.upload_id
    ),

    '{}'::uuid[]
  )

  into v_upload_ids

  from public.project_uploads
    as project_upload

  where project_upload.project_id =
    p_project_id;


  -- ----------------------------------------------------------
  -- Permanent tombstone for CURRENT canonical slug.
  --
  -- Historical slugs already exist. After project deletion,
  -- ON DELETE SET NULL converts every history row into a
  -- non-routable but permanently reserved tombstone.
  -- ----------------------------------------------------------

  insert into
    public.project_slug_history (
      old_slug,
      project_id
    )

  values (
    v_project.slug,
    p_project_id
  )

  on conflict (
    old_slug
  )
  do update

  set project_id =
    excluded.project_id;


  -- ----------------------------------------------------------
  -- Revision snapshot BEFORE physical deletion
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

    'delete',

    array[
      'id',
      'slug',
      'title',
      'status',
      'published',
      'deletion_status'
    ]::text[],

    pg_catalog.jsonb_build_object(
      'id',
        v_project.id,

      'slug',
        v_project.slug,

      'title',
        v_project.title,

      'status',
        v_project.status,

      'published',
        v_project.published,

      'deletion_status',
        v_project.deletion_status
    ),

    null
  )

  returning
    id,
    request_id

  into
    v_revision_id,
    v_request_id;


  -- ----------------------------------------------------------
  -- Remove project ↔ upload relations FIRST.
  --
  -- This intentionally satisfies project_uploads ON DELETE
  -- RESTRICT before the project row itself is deleted.
  -- ----------------------------------------------------------

  delete from
    public.project_uploads

  where project_id =
    p_project_id;


  -- ----------------------------------------------------------
  -- Recalculate ownership for uploads that still have projects.
  --
  -- 1 remaining project  -> owned
  -- >1 remaining project -> shared
  -- ----------------------------------------------------------

  update public.project_uploads
    as relation

  set ownership =
    case
      when (
        select count(
          distinct remaining.project_id
        )

        from public.project_uploads
          as remaining

        where remaining.upload_id =
          relation.upload_id
      ) > 1
      then 'shared'

      else 'owned'
    end

  where relation.upload_id =
    any(
      v_upload_ids
    );


  -- ----------------------------------------------------------
  -- Delete project.
  --
  -- Existing FK actions take care of:
  -- - project_links      CASCADE
  -- - project_media      CASCADE
  -- - project_sections   CASCADE
  -- - section items      CASCADE through sections
  -- - slug history       SET NULL
  -- ----------------------------------------------------------

  delete from
    public.projects

  where id =
    p_project_id;


  if not found then
    raise exception using
      errcode = 'CMS03',
      message =
        'cms_content_not_found';
  end if;


  return
    pg_catalog.jsonb_build_object(
      'projectId',
        p_project_id,

      'deletedSlug',
        v_project.slug,

      'phase',
        'deleted',

      'affectedUploadIds',
        pg_catalog.to_jsonb(
          v_upload_ids
        ),

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
-- 4. EXECUTION PERMISSIONS
-- ============================================================

revoke all
on function
public.prepare_project_hard_delete(
  uuid,
  timestamptz,
  text,
  uuid
)
from public;


revoke execute
on function
public.prepare_project_hard_delete(
  uuid,
  timestamptz,
  text,
  uuid
)
from anon, authenticated;


grant execute
on function
public.prepare_project_hard_delete(
  uuid,
  timestamptz,
  text,
  uuid
)
to service_role;


revoke all
on function
public.mark_project_hard_delete_failed(
  uuid,
  text,
  uuid
)
from public;


revoke execute
on function
public.mark_project_hard_delete_failed(
  uuid,
  text,
  uuid
)
from anon, authenticated;


grant execute
on function
public.mark_project_hard_delete_failed(
  uuid,
  text,
  uuid
)
to service_role;


revoke all
on function
public.finalize_project_hard_delete(
  uuid,
  text,
  uuid
)
from public;


revoke execute
on function
public.finalize_project_hard_delete(
  uuid,
  text,
  uuid
)
from anon, authenticated;


grant execute
on function
public.finalize_project_hard_delete(
  uuid,
  text,
  uuid
)
to service_role;


commit;
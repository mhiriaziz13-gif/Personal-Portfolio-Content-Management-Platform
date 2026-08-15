begin;

-- ============================================================
-- WAVE 2C-B — PROJECT MEDIA WORKSPACE
-- ============================================================


-- ------------------------------------------------------------
-- 1. Media → project section relationship
-- ------------------------------------------------------------

alter table public.project_media
  add column project_section_id uuid null;


alter table public.project_media
  add constraint project_media_project_section_id_fkey
  foreign key (project_section_id)
  references public.project_sections(id)
  on delete set null;


alter table public.project_media
  add constraint project_media_media_type_check
  check (
    media_type in (
      'image',
      'video',
      'document'
    )
  );


create index project_media_project_section_order_idx
  on public.project_media (
    project_id,
    project_section_id,
    is_visible,
    display_order
  );


-- ------------------------------------------------------------
-- 2. Protect project ↔ section consistency
-- ------------------------------------------------------------

create or replace function private.enforce_project_media_section_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_section_type text;
  v_definition_id uuid;
  v_supports_media boolean;
begin

  if new.project_section_id is null then
    return new;
  end if;


  select
    section.section_type,
    section.definition_id,
    definition.supports_media

  into
    v_section_type,
    v_definition_id,
    v_supports_media

  from public.project_sections as section

  left join public.project_section_definitions as definition
    on definition.id = section.definition_id

  where section.id = new.project_section_id
    and section.project_id = new.project_id
    and not section.is_archived;


  if not found then
    raise exception using
      errcode = '23514',
      message = 'project_media_section_scope_invalid';
  end if;


  if v_definition_id is not null
     and v_supports_media is not true
  then
    raise exception using
      errcode = '23514',
      message = 'project_media_section_does_not_support_media';
  end if;


  if v_definition_id is null
     and v_section_type <> 'media_gallery'
  then
    raise exception using
      errcode = '23514',
      message = 'custom_project_section_does_not_support_media';
  end if;


  return new;

end;
$function$;


revoke all
on function private.enforce_project_media_section_scope()
from public, anon, authenticated;


create trigger enforce_project_media_section_scope
before insert or update of
  project_id,
  project_section_id
on public.project_media
for each row
execute function private.enforce_project_media_section_scope();


-- ------------------------------------------------------------
-- 3. Enforce correctly scoped evidence on published projects
--
-- Existing Wave 2B publication logic knows project media,
-- but did not yet have project_section_id.
--
-- This trigger makes sure that a media-gallery section cannot
-- borrow media attached to another section.
-- ------------------------------------------------------------

create or replace function private.enforce_published_project_section_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin

  if not (
    new.published
    and new.status = 'published'
  ) then
    return new;
  end if;


  if exists (
    select 1

    from public.project_sections as section

    where section.project_id = new.id
      and section.is_visible
      and not section.is_archived

      and not (
        nullif(
          pg_catalog.btrim(
            section.body
          ),
          ''
        ) is not null


        or exists (
          select 1

          from pg_catalog.unnest(
            coalesce(
              section.bullets,
              '{}'::text[]
            )
          ) as bullet(value)

          where nullif(
            pg_catalog.btrim(
              bullet.value
            ),
            ''
          ) is not null
        )


        or exists (
          select 1

          from public.project_section_items as item

          where item.project_section_id = section.id
            and item.is_visible

            and (
              nullif(
                pg_catalog.btrim(
                  item.value
                ),
                ''
              ) is not null

              or nullif(
                pg_catalog.btrim(
                  item.description
                ),
                ''
              ) is not null
            )
        )


        or (
          section.section_type = 'media_gallery'

          and exists (
            select 1

            from public.project_media as media

            where media.project_id = new.id
              and media.project_section_id = section.id
              and media.is_visible

              and nullif(
                pg_catalog.btrim(
                  media.media_url
                ),
                ''
              ) is not null

              and nullif(
                pg_catalog.btrim(
                  media.alt_text
                ),
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


  return new;

end;
$function$;


revoke all
on function private.enforce_published_project_section_evidence()
from public, anon, authenticated;


create trigger enforce_published_project_section_evidence
before insert or update of
  published,
  status
on public.projects
for each row
execute function private.enforce_published_project_section_evidence();


-- ------------------------------------------------------------
-- 4. Atomic project-media mutation
-- ------------------------------------------------------------

create or replace function public.mutate_project_media(
  p_action text,
  p_project_id uuid,
  p_media_id uuid,
  p_expected_updated_at timestamptz,
  p_values jsonb,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_previous public.project_media%rowtype;
  v_next public.project_media%rowtype;

  v_project_status text;
  v_project_published boolean;
  v_project_deletion_status text;

  v_section_id uuid;
  v_section_type text;
  v_definition_id uuid;
  v_supports_media boolean;

  v_media_url text;
  v_alt_text text;
  v_caption text;
  v_media_type text;
  v_display_order integer;
  v_is_visible boolean;

  v_revision_id uuid;
  v_request_id uuid;

  v_changed_fields text[];

  v_fields text[] := array[
    'project_section_id',
    'media_url',
    'alt_text',
    'caption',
    'media_type',
    'display_order',
    'is_visible'
  ];
begin

  -- ----------------------------------------------------------
  -- Admin authorization
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


  if p_action not in (
    'create',
    'update',
    'delete'
  ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_media_action';
  end if;


  -- ----------------------------------------------------------
  -- Lock project
  -- ----------------------------------------------------------

  select
    project.status,
    project.published,
    project.deletion_status

  into
    v_project_status,
    v_project_published,
    v_project_deletion_status

  from public.projects as project

  where project.id = p_project_id

  for update;


  if not found then
    raise exception using
      errcode = 'CMS03',
      message = 'cms_content_not_found';
  end if;


  if v_project_deletion_status <> 'active' then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_project_deletion_in_progress';
  end if;


  -- ----------------------------------------------------------
  -- Validate CREATE / UPDATE payload
  -- ----------------------------------------------------------

  if p_action <> 'delete' then

    if pg_catalog.jsonb_typeof(p_values) <> 'object'
       or not (
         p_values ?& v_fields
       )
    then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_payload';
    end if;


    if exists (
      select 1

      from pg_catalog.jsonb_object_keys(
        p_values
      ) as incoming(key_name)

      where not (
        incoming.key_name = any(v_fields)
      )
    ) then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_media_forbidden_fields';
    end if;


    v_section_id :=
      nullif(
        pg_catalog.btrim(
          p_values ->> 'project_section_id'
        ),
        ''
      )::uuid;


    v_media_url :=
      pg_catalog.btrim(
        p_values ->> 'media_url'
      );


    v_alt_text :=
      pg_catalog.btrim(
        p_values ->> 'alt_text'
      );


    v_caption :=
      nullif(
        pg_catalog.btrim(
          p_values ->> 'caption'
        ),
        ''
      );


    v_media_type :=
      pg_catalog.btrim(
        p_values ->> 'media_type'
      );


    v_display_order :=
      (
        p_values ->> 'display_order'
      )::integer;


    v_is_visible :=
      (
        p_values ->> 'is_visible'
      )::boolean;


    if v_media_type not in (
      'image',
      'video',
      'document'
    ) then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_type';
    end if;


    if nullif(
         v_media_url,
         ''
       ) is null

       or pg_catalog.length(
         v_media_url
       ) > 2048
    then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_url';
    end if;


    if nullif(
         v_alt_text,
         ''
       ) is null

       or pg_catalog.length(
         v_alt_text
       ) > 500
    then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_alt';
    end if;


    if v_caption is not null
       and pg_catalog.length(
         v_caption
       ) > 2000
    then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_caption';
    end if;


    if v_display_order < -10000
       or v_display_order > 10000
    then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_invalid_media_order';
    end if;


    -- Images may use an internal path or HTTPS URL.

    if v_media_type = 'image' then

      if not (
        (
          pg_catalog.left(
            v_media_url,
            1
          ) = '/'

          and pg_catalog.left(
            v_media_url,
            2
          ) <> '//'

          and v_media_url !~ '[[:space:]]'
        )

        or v_media_url ~* '^https://[^[:space:]]+$'
      )
      then
        raise exception using
          errcode = 'CMS07',
          message = 'cms_invalid_image_url';
      end if;

    else

      -- Video/document are external HTTPS assets in 2C-B.

      if v_media_url !~* '^https://[^[:space:]]+$'
      then
        raise exception using
          errcode = 'CMS07',
          message = 'cms_external_media_requires_https';
      end if;

    end if;


    -- --------------------------------------------------------
    -- Optional section assignment
    -- --------------------------------------------------------

    if v_section_id is not null then

      select
        section.section_type,
        section.definition_id,
        definition.supports_media

      into
        v_section_type,
        v_definition_id,
        v_supports_media

      from public.project_sections as section

      left join public.project_section_definitions as definition
        on definition.id = section.definition_id

      where section.id = v_section_id
        and section.project_id = p_project_id
        and not section.is_archived;


      if not found then
        raise exception using
          errcode = 'CMS07',
          message = 'cms_media_section_invalid';
      end if;


      if v_definition_id is not null
         and v_supports_media is not true
      then
        raise exception using
          errcode = 'CMS07',
          message = 'cms_media_section_not_supported';
      end if;


      if v_definition_id is null
         and v_section_type <> 'media_gallery'
      then
        raise exception using
          errcode = 'CMS07',
          message = 'cms_custom_section_not_media_gallery';
      end if;

    end if;


    -- Refuse uploads currently being deleted.

    if exists (
      select 1

      from public.uploads as upload

      where upload.public_url = v_media_url
        and upload.deletion_status <> 'active'
    ) then
      raise exception using
        errcode = 'CMS07',
        message = 'cms_media_upload_unavailable';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- CREATE
  -- ----------------------------------------------------------

  if p_action = 'create' then

    if p_media_id is not null
       or p_expected_updated_at is not null
    then
      raise exception using
        errcode = 'CMS01',
        message = 'cms_invalid_media_create_precondition';
    end if;


    insert into public.project_media (
      project_id,
      project_section_id,
      media_url,
      alt_text,
      caption,
      media_type,
      display_order,
      is_visible
    )

    values (
      p_project_id,
      v_section_id,
      v_media_url,
      v_alt_text,
      v_caption,
      v_media_type,
      v_display_order,
      v_is_visible
    )

    returning *
    into v_next;


    v_changed_fields := v_fields;

  end if;


  -- ----------------------------------------------------------
  -- UPDATE
  -- ----------------------------------------------------------

  if p_action = 'update' then

    if p_media_id is null
       or p_expected_updated_at is null
    then
      raise exception using
        errcode = 'CMS01',
        message = 'cms_optimistic_lock_required';
    end if;


    select media.*
    into v_previous

    from public.project_media as media

    where media.id = p_media_id
      and media.project_id = p_project_id

    for update;


    if not found then
      raise exception using
        errcode = 'CMS03',
        message = 'cms_content_not_found';
    end if;


    if v_previous.updated_at
       is distinct from p_expected_updated_at
    then
      raise exception using
        errcode = 'CMS02',
        message = 'cms_edit_conflict';
    end if;


    update public.project_media

    set
      project_section_id = v_section_id,
      media_url = v_media_url,
      alt_text = v_alt_text,
      caption = v_caption,
      media_type = v_media_type,
      display_order = v_display_order,
      is_visible = v_is_visible

    where id = p_media_id

    returning *
    into v_next;


    select coalesce(
      pg_catalog.array_agg(
        changed.field_name
        order by changed.field_name
      ),
      '{}'::text[]
    )

    into v_changed_fields

    from (
      select field_name

      from pg_catalog.unnest(
        v_fields
      ) as field_name

      where (
        pg_catalog.to_jsonb(
          v_previous
        ) -> field_name
      ) is distinct from (
        pg_catalog.to_jsonb(
          v_next
        ) -> field_name
      )
    ) as changed;

  end if;


  -- ----------------------------------------------------------
  -- DELETE DATABASE RELATION ONLY
  --
  -- The Storage object is deliberately NOT deleted.
  -- Physical Storage deletion remains Wave 2E.
  -- ----------------------------------------------------------

  if p_action = 'delete' then

    if p_media_id is null
       or p_expected_updated_at is null
    then
      raise exception using
        errcode = 'CMS01',
        message = 'cms_optimistic_lock_required';
    end if;


    select media.*
    into v_previous

    from public.project_media as media

    where media.id = p_media_id
      and media.project_id = p_project_id

    for update;


    if not found then
      raise exception using
        errcode = 'CMS03',
        message = 'cms_content_not_found';
    end if;


    if v_previous.updated_at
       is distinct from p_expected_updated_at
    then
      raise exception using
        errcode = 'CMS02',
        message = 'cms_edit_conflict';
    end if;


    delete from public.project_media
    where id = p_media_id;


    v_changed_fields := v_fields;

  end if;


  -- ----------------------------------------------------------
  -- Published-project completeness
  --
  -- Supporting media can exist on rich-text canonical sections,
  -- but only a media_gallery may rely on media as its sole evidence.
  -- ----------------------------------------------------------

  if v_project_published
     and v_project_status = 'published'
  then

    if exists (
      select 1

      from public.project_sections as section

      where section.project_id = p_project_id
        and section.is_visible
        and not section.is_archived

        and not (
          nullif(
            pg_catalog.btrim(
              section.body
            ),
            ''
          ) is not null


          or exists (
            select 1

            from pg_catalog.unnest(
              coalesce(
                section.bullets,
                '{}'::text[]
              )
            ) as bullet(value)

            where nullif(
              pg_catalog.btrim(
                bullet.value
              ),
              ''
            ) is not null
          )


          or exists (
            select 1

            from public.project_section_items as item

            where item.project_section_id = section.id
              and item.is_visible

              and (
                nullif(
                  pg_catalog.btrim(
                    item.value
                  ),
                  ''
                ) is not null

                or nullif(
                  pg_catalog.btrim(
                    item.description
                  ),
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
                and media.project_section_id = section.id
                and media.is_visible

                and nullif(
                  pg_catalog.btrim(
                    media.media_url
                  ),
                  ''
                ) is not null

                and nullif(
                  pg_catalog.btrim(
                    media.alt_text
                  ),
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

  end if;


  -- ----------------------------------------------------------
  -- Synchronize project_uploads
  -- ----------------------------------------------------------

  delete from public.project_uploads

  where project_id = p_project_id
    and usage in (
      'gallery',
      'document',
      'video'
    );


  insert into public.project_uploads (
    project_id,
    upload_id,
    usage,
    ownership
  )

  select distinct
    p_project_id,

    upload.id,

    case media.media_type

      when 'image'
        then 'gallery'

      when 'document'
        then 'document'

      when 'video'
        then 'video'

      else 'other'

    end,

    'owned'

  from public.project_media as media

  join public.uploads as upload
    on upload.public_url = media.media_url

  where media.project_id = p_project_id
    and upload.deletion_status = 'active'

  on conflict (
    project_id,
    upload_id,
    usage
  )
  do nothing;


  -- Recalculate owned/shared state.

  with reference_counts as (
    select
      upload_id,

      pg_catalog.count(
        distinct project_id
      ) as project_count

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

  where reference_counts.upload_id = relation.upload_id;


  -- ----------------------------------------------------------
  -- Revision history
  -- ----------------------------------------------------------

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

    'project_media',

    case
      when p_action = 'create'
        then v_next.id::text

      else v_previous.id::text
    end,

    p_action,

    v_changed_fields,

    case
      when p_action = 'create'
        then null

      else pg_catalog.to_jsonb(
        v_previous
      )
    end,

    case
      when p_action = 'delete'
        then null

      else pg_catalog.to_jsonb(
        v_next
      )
    end
  )

  returning
    id,
    request_id

  into
    v_revision_id,
    v_request_id;


  return pg_catalog.jsonb_build_object(
    'row',

    case
      when p_action = 'delete'
        then null

      else pg_catalog.to_jsonb(
        v_next
      )
    end,

    'operation',
    p_action,

    'revisionRecorded',
    true,

    'revisionId',
    v_revision_id,

    'requestId',
    v_request_id
  );

end;
$function$;


-- ------------------------------------------------------------
-- 5. Service-role-only RPC
-- ------------------------------------------------------------

revoke all
on function public.mutate_project_media(
  text,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
from public;


revoke execute
on function public.mutate_project_media(
  text,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
from anon;


revoke execute
on function public.mutate_project_media(
  text,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
from authenticated;


grant execute
on function public.mutate_project_media(
  text,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
to service_role;


commit;
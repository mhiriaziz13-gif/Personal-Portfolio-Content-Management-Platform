begin;

-- ============================================================
-- WAVE 2C-B — PUBLISHED PROJECT MEDIA EVIDENCE GUARD
-- ============================================================

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


drop trigger if exists
  enforce_published_project_section_evidence
on public.projects;


create trigger enforce_published_project_section_evidence
before insert or update of
  published,
  status
on public.projects
for each row
execute function private.enforce_published_project_section_evidence();


commit;
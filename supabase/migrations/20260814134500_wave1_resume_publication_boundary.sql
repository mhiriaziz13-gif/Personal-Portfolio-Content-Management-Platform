-- Wave 1 follow-up: record the final reviewed resume publication boundary.
--
-- The application already filters resume rows defensively. This migration
-- applies the same allowlist to the anonymously readable CMS table without
-- changing schema, RLS, Storage, authentication, or any Wave 2 architecture.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('wave1_resume_publication_boundary', 0)
);

do $wave1_resume_boundary_preflight$
declare
  v_missing text;
begin
  if pg_catalog.to_regclass('public.resumes') is null then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 resume preflight failed: public.resumes is missing';
  end if;

  select pg_catalog.string_agg(required_column, ', ' order by required_column)
  into v_missing
  from pg_catalog.unnest(array[
    'docx_url',
    'label',
    'pdf_url',
    'published',
    'sort_order',
    'updated_at',
    'variant'
  ]::text[]) as required(required_column)
  where not exists (
    select 1
    from information_schema.columns as column_row
    where column_row.table_schema = 'public'
      and column_row.table_name = 'resumes'
      and column_row.column_name = required.required_column
  );

  if v_missing is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 resume preflight failed: required columns are missing',
      detail = v_missing;
  end if;
end
$wave1_resume_boundary_preflight$;

-- Remove any public configuration that is private, deprecated, unknown, or an
-- assetless Italian placeholder. Asset paths are part of the policy boundary,
-- so an approved-looking label cannot expose a Master/ATS/Canadian binary.
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

-- EN/FR remain visible as files-pending cards. Preserve future validated URLs
-- and null only the checked-in stale paths removed by this Wave 1 branch.
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

do $wave1_resume_boundary_postflight$
begin
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
      )
      and (
        published
        or pdf_url is not null
        or docx_url is not null
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 resume postflight failed: a non-public row remains configured';
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
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Wave 1 resume postflight failed: EN/FR rows are missing or ambiguous';
  end if;

  if exists (
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
      message = 'Wave 1 resume postflight failed: a deleted stale asset path remains';
  end if;
end
$wave1_resume_boundary_postflight$;

commit;

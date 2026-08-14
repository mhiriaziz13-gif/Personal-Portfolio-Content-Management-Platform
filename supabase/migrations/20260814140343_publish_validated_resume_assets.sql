begin;

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('wave1:publish-validated-resume-assets', 0)
);

-- These objects are provisioned through the Storage API before this migration is
-- applied. Fail closed instead of publishing a CMS link to a missing binary.
do $validated_resume_asset_preflight$
declare
  ambiguous_variant text;
  missing_object text;
begin
  if pg_catalog.to_regclass('public.resumes') is null
     or pg_catalog.to_regclass('public.uploads') is null
     or pg_catalog.to_regclass('storage.buckets') is null
     or pg_catalog.to_regclass('storage.objects') is null then
    raise exception using
      errcode = 'P0001',
      message = 'Validated resume preflight failed: required Resume/Storage tables are missing';
  end if;

  if (
    select pg_catalog.count(*)
    from storage.buckets as bucket
    where bucket.id = 'resumes'
      and bucket.public
  ) <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Validated resume preflight failed: the resumes bucket must exist and be public';
  end if;

  select expected.variant
  into ambiguous_variant
  from (values
    ('english-professional-cv', array['english', 'english-cv', 'english-professional-cv']::text[]),
    ('french-cv', array['french', 'french-cv', 'french-professional-cv', 'francais', 'francais-cv', 'francais-professional-cv']::text[]),
    ('italian-cv', array['italian', 'italian-cv', 'italian-professional-cv', 'italiano', 'italiano-cv', 'italien', 'italien-cv']::text[])
  ) as expected(variant, aliases)
  where (
    select pg_catalog.count(*)
    from public.resumes as resume
    where pg_catalog.lower(pg_catalog.btrim(coalesce(resume.variant, ''))) = any(expected.aliases)
  ) > 1
  limit 1;

  if ambiguous_variant is not null then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format(
        'Validated resume preflight failed: multiple rows resolve to %s',
        ambiguous_variant
      );
  end if;

  select expected.path
  into missing_object
  from (values
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 72030::bigint, 'application/pdf'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 40660::bigint, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', 73679::bigint, 'application/pdf'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', 40926::bigint, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 72958::bigint, 'application/pdf'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 40714::bigint, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) as expected(path, size_bytes, mime_type)
  where (
    select pg_catalog.count(*)
    from storage.objects as object
    where object.bucket_id = 'resumes'
      and object.name = expected.path
      and (object.metadata ->> 'size')::bigint = expected.size_bytes
      and object.metadata ->> 'mimetype' = expected.mime_type
  ) <> 1
  limit 1;

  if missing_object is not null then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format(
        'Validated resume preflight failed: Storage object is missing or has unexpected metadata: %s',
        missing_object
      );
  end if;
end
$validated_resume_asset_preflight$;

with desired_resumes(
  label,
  variant,
  aliases,
  pdf_url,
  docx_url,
  sort_order
) as (values
  (
    'English Professional CV',
    'english-professional-cv',
    array['english', 'english-cv', 'english-professional-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf?download=Ahmed_Aziz_Mhiri_CV_International_EN.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx?download=Ahmed_Aziz_Mhiri_CV_International_EN.docx',
    0
  ),
  (
    'French CV',
    'french-cv',
    array['french', 'french-cv', 'french-professional-cv', 'francais', 'francais-cv', 'francais-professional-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf?download=Ahmed_Aziz_Mhiri_CV_FR.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx?download=Ahmed_Aziz_Mhiri_CV_FR.docx',
    1
  ),
  (
    'Italian CV',
    'italian-cv',
    array['italian', 'italian-cv', 'italian-professional-cv', 'italiano', 'italiano-cv', 'italien', 'italien-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf?download=Ahmed_Aziz_Mhiri_CV_IT.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx?download=Ahmed_Aziz_Mhiri_CV_IT.docx',
    2
  )
)
insert into public.resumes (
  label,
  variant,
  pdf_url,
  docx_url,
  sort_order,
  published
)
select
  desired.label,
  desired.variant,
  desired.pdf_url,
  desired.docx_url,
  desired.sort_order,
  true
from desired_resumes as desired
where not exists (
  select 1
  from public.resumes as resume
  where pg_catalog.lower(pg_catalog.btrim(coalesce(resume.variant, ''))) = any(desired.aliases)
);

with desired_resumes(
  label,
  variant,
  aliases,
  pdf_url,
  docx_url,
  sort_order
) as (values
  (
    'English Professional CV',
    'english-professional-cv',
    array['english', 'english-cv', 'english-professional-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf?download=Ahmed_Aziz_Mhiri_CV_International_EN.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx?download=Ahmed_Aziz_Mhiri_CV_International_EN.docx',
    0
  ),
  (
    'French CV',
    'french-cv',
    array['french', 'french-cv', 'french-professional-cv', 'francais', 'francais-cv', 'francais-professional-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf?download=Ahmed_Aziz_Mhiri_CV_FR.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx?download=Ahmed_Aziz_Mhiri_CV_FR.docx',
    1
  ),
  (
    'Italian CV',
    'italian-cv',
    array['italian', 'italian-cv', 'italian-professional-cv', 'italiano', 'italiano-cv', 'italien', 'italien-cv']::text[],
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf?download=Ahmed_Aziz_Mhiri_CV_IT.pdf',
    'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx?download=Ahmed_Aziz_Mhiri_CV_IT.docx',
    2
  )
)
update public.resumes as resume
set
  label = desired.label,
  variant = desired.variant,
  pdf_url = desired.pdf_url,
  docx_url = desired.docx_url,
  sort_order = desired.sort_order,
  published = true,
  updated_at = pg_catalog.now()
from desired_resumes as desired
where pg_catalog.lower(pg_catalog.btrim(coalesce(resume.variant, ''))) = any(desired.aliases);

-- Everything outside the three validated variants remains non-public. Private
-- and deprecated identities also lose stale asset references defensively.
update public.resumes
set
  published = false,
  pdf_url = case
    when pg_catalog.lower(pg_catalog.concat_ws(' ', variant, label, pdf_url, docx_url)) ~ '(ats|canad|master)'
      then null
    else pdf_url
  end,
  docx_url = case
    when pg_catalog.lower(pg_catalog.concat_ws(' ', variant, label, pdf_url, docx_url)) ~ '(ats|canad|master)'
      then null
    else docx_url
  end,
  sort_order = case
    when pg_catalog.lower(coalesce(variant, '')) ~ 'ats' then 3
    when pg_catalog.lower(coalesce(variant, '')) ~ 'canad' then 4
    when pg_catalog.lower(coalesce(variant, '')) ~ 'master' then 5
    else sort_order
  end,
  updated_at = pg_catalog.now()
where coalesce(variant, '') not in (
  'english-professional-cv',
  'french-cv',
  'italian-cv'
);

with asset_manifest(
  path,
  public_url,
  mime_type,
  size_bytes,
  original_name,
  sha256
) as (values
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 'application/pdf', 72030, 'Ahmed_Aziz_Mhiri_CV_International_EN.pdf', 'b22107d10a0c2d471359a6cdb975c5a866ce07eba6b661102175a2d90a4e601b'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40660, 'Ahmed_Aziz_Mhiri_CV_International_EN.docx', 'f5e42dba5f98632127eb9f1a690c4af89f4e3f417118b0830b4e0b40f1289528'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', 'application/pdf', 73679, 'Ahmed_Aziz_Mhiri_CV_FR.pdf', '0931edd08ef766d3526aec4d79b0079413709957dddef1ee31b1473c38f216bf'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40926, 'Ahmed_Aziz_Mhiri_CV_FR.docx', '532e8f76684996a36ee380b62720108d52ce063b241773b080694cd23e8c86cf'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 'application/pdf', 72958, 'Ahmed_Aziz_Mhiri_CV_IT.pdf', 'b676f91eb719a9993dc176001295a20395b9c62977281ad51fa74c375c7094dc'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40714, 'Ahmed_Aziz_Mhiri_CV_IT.docx', 'edb7d7dbc5643f91d4a3ab19b6ed2fcb94c131686986ff5d8b7e065c48905c1e')
)
update public.uploads as upload
set
  public_url = asset.public_url,
  mime_type = asset.mime_type,
  size_bytes = asset.size_bytes,
  original_name = asset.original_name,
  sha256 = asset.sha256,
  deletion_status = 'active',
  deletion_requested_at = null,
  deletion_error_code = null
from asset_manifest as asset
where upload.bucket = 'resumes'
  and upload.path = asset.path;

with asset_manifest(
  path,
  public_url,
  mime_type,
  size_bytes,
  original_name,
  sha256
) as (values
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 'application/pdf', 72030, 'Ahmed_Aziz_Mhiri_CV_International_EN.pdf', 'b22107d10a0c2d471359a6cdb975c5a866ce07eba6b661102175a2d90a4e601b'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40660, 'Ahmed_Aziz_Mhiri_CV_International_EN.docx', 'f5e42dba5f98632127eb9f1a690c4af89f4e3f417118b0830b4e0b40f1289528'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', 'application/pdf', 73679, 'Ahmed_Aziz_Mhiri_CV_FR.pdf', '0931edd08ef766d3526aec4d79b0079413709957dddef1ee31b1473c38f216bf'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40926, 'Ahmed_Aziz_Mhiri_CV_FR.docx', '532e8f76684996a36ee380b62720108d52ce063b241773b080694cd23e8c86cf'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 'application/pdf', 72958, 'Ahmed_Aziz_Mhiri_CV_IT.pdf', 'b676f91eb719a9993dc176001295a20395b9c62977281ad51fa74c375c7094dc'),
  ('446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 40714, 'Ahmed_Aziz_Mhiri_CV_IT.docx', 'edb7d7dbc5643f91d4a3ab19b6ed2fcb94c131686986ff5d8b7e065c48905c1e')
)
insert into public.uploads (
  bucket,
  path,
  public_url,
  mime_type,
  size_bytes,
  original_name,
  uploaded_by,
  sha256,
  deletion_status
)
select
  'resumes',
  asset.path,
  asset.public_url,
  asset.mime_type,
  asset.size_bytes,
  asset.original_name,
  null,
  asset.sha256,
  'active'
from asset_manifest as asset
where not exists (
  select 1
  from public.uploads as upload
  where upload.bucket = 'resumes'
    and upload.path = asset.path
);

do $validated_resume_asset_postflight$
declare
  invalid_variant text;
  invalid_upload text;
begin
  select expected.variant
  into invalid_variant
  from (values
    (
      'english-professional-cv',
      'English Professional CV',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf?download=Ahmed_Aziz_Mhiri_CV_International_EN.pdf',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx?download=Ahmed_Aziz_Mhiri_CV_International_EN.docx',
      0
    ),
    (
      'french-cv',
      'French CV',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf?download=Ahmed_Aziz_Mhiri_CV_FR.pdf',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx?download=Ahmed_Aziz_Mhiri_CV_FR.docx',
      1
    ),
    (
      'italian-cv',
      'Italian CV',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf?download=Ahmed_Aziz_Mhiri_CV_IT.pdf',
      'https://qflchsmvszbesfnomdeo.supabase.co/storage/v1/object/public/resumes/446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx?download=Ahmed_Aziz_Mhiri_CV_IT.docx',
      2
    )
  ) as expected(variant, label, pdf_url, docx_url, sort_order)
  where (
    select pg_catalog.count(*)
    from public.resumes as resume
    where resume.variant = expected.variant
      and resume.label = expected.label
      and resume.pdf_url = expected.pdf_url
      and resume.docx_url = expected.docx_url
      and resume.sort_order = expected.sort_order
      and resume.published
  ) <> 1
  limit 1;

  if invalid_variant is not null then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format(
        'Validated resume postflight failed: canonical row is missing or ambiguous: %s',
        invalid_variant
      );
  end if;

  if (
    select pg_catalog.count(*)
    from public.resumes
    where published
  ) <> 3 or exists (
    select 1
    from public.resumes
    where published
      and variant not in ('english-professional-cv', 'french-cv', 'italian-cv')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Validated resume postflight failed: only English, French and Italian may be published';
  end if;

  if exists (
    select 1
    from public.resumes
    where published
      and pg_catalog.lower(pg_catalog.concat_ws(' ', variant, label, pdf_url, docx_url)) ~ '(ats|canad|master)'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Validated resume postflight failed: a private or deprecated variant is public';
  end if;

  select expected.path
  into invalid_upload
  from (values
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/e23977d7-a358-425d-a646-8c7abde8234e.pdf', 'b22107d10a0c2d471359a6cdb975c5a866ce07eba6b661102175a2d90a4e601b'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/e659fa2e-7d6b-4d92-92ee-1a8365ebd86b.docx', 'f5e42dba5f98632127eb9f1a690c4af89f4e3f417118b0830b4e0b40f1289528'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/2b28c421-36b4-4714-8ee4-90a24bd68083.pdf', '0931edd08ef766d3526aec4d79b0079413709957dddef1ee31b1473c38f216bf'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/06fc6486-acf2-465e-836c-3ea98e70257e.docx', '532e8f76684996a36ee380b62720108d52ce063b241773b080694cd23e8c86cf'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/5e247278-90ec-4c03-bac2-8d58e51a46d1.pdf', 'b676f91eb719a9993dc176001295a20395b9c62977281ad51fa74c375c7094dc'),
    ('446d31a7-52a0-4c06-b71f-6016804a47c0/aa15bee5-f8b0-494b-bef5-1fa34d399527.docx', 'edb7d7dbc5643f91d4a3ab19b6ed2fcb94c131686986ff5d8b7e065c48905c1e')
  ) as expected(path, sha256)
  where (
    select pg_catalog.count(*)
    from public.uploads as upload
    where upload.bucket = 'resumes'
      and upload.path = expected.path
      and upload.sha256 = expected.sha256
      and upload.deletion_status = 'active'
  ) <> 1
  limit 1;

  if invalid_upload is not null then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format(
        'Validated resume postflight failed: CMS upload metadata is missing or ambiguous: %s',
        invalid_upload
      );
  end if;
end
$validated_resume_asset_postflight$;

commit;

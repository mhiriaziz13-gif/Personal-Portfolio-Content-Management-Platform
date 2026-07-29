-- Portfolio hardening v1.
--
-- This migration is intentionally additive and transaction-scoped. It refuses
-- to continue when the live schema contains unknown policy, function, index, or
-- trigger drift in the objects it owns. It does not reset, reseed, truncate, or
-- delete application data.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Serialize this hardening migration if two operators accidentally start it at
-- the same time.
select pg_advisory_xact_lock(
  pg_catalog.hashtextextended('portfolio_hardening_v1', 0)
);

-- ---------------------------------------------------------------------------
-- Preflight: fail closed before changing production.
-- ---------------------------------------------------------------------------

do $portfolio_hardening_preflight$
declare
  v_problem text;
begin
  select pg_catalog.string_agg(required_table, ', ' order by required_table)
  into v_problem
  from pg_catalog.unnest(array[
    'about',
    'admin_audit_logs',
    'admin_remembered_devices',
    'admin_security_preferences',
    'admins',
    'certifications',
    'contact_messages',
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
    'resumes',
    'site_settings',
    'skills',
    'social_links',
    'uploads',
    'volunteering'
  ]::text[]) as required(required_table)
  where pg_catalog.to_regclass(
    pg_catalog.format('public.%I', required_table)
  ) is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: missing required tables',
      detail = v_problem,
      hint = 'Reconcile the remote migration ledger and schema drift; never run the clean-reset migration on production.';
  end if;

  with required_columns(table_name, column_name) as (
    values
      ('contact_messages', 'id'),
      ('contact_messages', 'status'),
      ('contact_messages', 'created_at'),
      ('contact_messages', 'updated_at'),
      ('contact_messages', 'read_at'),
      ('contact_messages', 'archived_at'),
      ('admin_audit_logs', 'actor_user_id'),
      ('admin_remembered_devices', 'user_id'),
      ('admin_remembered_devices', 'expires_at'),
      ('admin_remembered_devices', 'revoked_at'),
      ('uploads', 'uploaded_by'),
      ('projects', 'published'),
      ('projects', 'status'),
      ('projects', 'featured'),
      ('projects', 'projects_page_order'),
      ('projects', 'home_featured_order'),
      ('project_sections', 'project_id'),
      ('project_sections', 'is_visible'),
      ('project_sections', 'is_archived'),
      ('pages', 'is_published'),
      ('page_sections', 'page_id'),
      ('page_sections', 'section_key'),
      ('page_sections', 'description'),
      ('page_section_items', 'page_section_id'),
      ('project_section_items', 'project_section_id'),
      ('project_media', 'project_id'),
      ('volunteering', 'published'),
      ('volunteering', 'archived')
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I', required_columns.table_name, required_columns.column_name),
    ', '
    order by required_columns.table_name, required_columns.column_name
  )
  into v_problem
  from required_columns
  where not exists (
    select 1
    from information_schema.columns as columns
    where columns.table_schema = 'public'
      and columns.table_name = required_columns.table_name
      and columns.column_name = required_columns.column_name
  );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: missing required columns',
      detail = v_problem;
  end if;

  with expected_pages(page_key, slug) as (
    values
      ('home', '/'),
      ('about', '/about'),
      ('expertise', '/expertise'),
      ('projects', '/projects'),
      ('experience', '/experience'),
      ('education', '/education'),
      ('certifications', '/certifications'),
      ('resume', '/resume'),
      ('contact', '/contact')
  ),
  problems as (
    select pg_catalog.format(
      'page_key %L has slug %L; expected %L',
      page.page_key,
      page.slug,
      expected_pages.slug
    ) as problem
    from public.pages as page
    join expected_pages on expected_pages.page_key = page.page_key
    where page.slug <> expected_pages.slug

    union all

    select pg_catalog.format(
      'canonical slug %L belongs to unexpected page_key %L',
      page.slug,
      page.page_key
    )
    from public.pages as page
    join expected_pages on expected_pages.slug = page.slug
    where page.page_key <> expected_pages.page_key
  )
  select pg_catalog.string_agg(problem, '; ' order by problem)
  into v_problem
  from problems;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: canonical page registry drift',
      detail = v_problem,
      hint = 'Resolve page_key/slug ownership in the CMS; this migration will not overwrite an unknown route mapping.';
  end if;

  -- If this migration was partially applied manually, tolerate only the exact
  -- column types introduced below. The enclosing transaction prevents a normal
  -- migration run from becoming partial.
  with expected_columns(table_name, column_name, udt_name) as (
    values
      ('contact_messages', 'submission_id', 'uuid'),
      ('contact_messages', 'delivery_status', 'text'),
      ('contact_messages', 'delivery_attempts', 'int4'),
      ('contact_messages', 'last_delivery_attempt_at', 'timestamptz'),
      ('contact_messages', 'next_delivery_attempt_at', 'timestamptz'),
      ('contact_messages', 'delivered_at', 'timestamptz'),
      ('contact_messages', 'delivery_error_code', 'text'),
      ('contact_messages', 'provider_message_id', 'text'),
      ('admin_remembered_devices', 'device_context_hash', 'text'),
      ('admin_remembered_devices', 'network_context_hash', 'text'),
      ('admin_remembered_devices', 'last_user_agent_hash', 'text'),
      ('admin_remembered_devices', 'last_network_context_hash', 'text'),
      ('admin_remembered_devices', 'rotated_at', 'timestamptz'),
      ('admin_remembered_devices', 'rotation_counter', 'int4'),
      ('admin_remembered_devices', 'revocation_reason', 'text'),
      ('uploads', 'sha256', 'text'),
      ('uploads', 'deletion_status', 'text'),
      ('uploads', 'deletion_requested_at', 'timestamptz'),
      ('uploads', 'deletion_error_code', 'text')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I.%I expected %s, found %s',
      expected_columns.table_name,
      expected_columns.column_name,
      expected_columns.udt_name,
      columns.udt_name
    ),
    '; '
  )
  into v_problem
  from expected_columns
  join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = expected_columns.table_name
   and columns.column_name = expected_columns.column_name
  where columns.udt_name <> expected_columns.udt_name;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: incompatible additive column drift',
      detail = v_problem;
  end if;

  if pg_catalog.to_regclass('public.cms_content_revisions') is not null then
    with expected_columns(column_name, udt_name) as (
      values
        ('id', 'uuid'),
        ('request_id', 'uuid'),
        ('actor_user_id', 'uuid'),
        ('table_name', 'text'),
        ('record_id', 'text'),
        ('operation', 'text'),
        ('changed_fields', '_text'),
        ('previous_values', 'jsonb'),
        ('next_values', 'jsonb'),
        ('created_at', 'timestamptz')
    )
    select pg_catalog.string_agg(
      pg_catalog.format(
        '%I expected %s, found %s',
        expected_columns.column_name,
        expected_columns.udt_name,
        coalesce(columns.udt_name, '<missing>')
      ),
      '; '
      order by expected_columns.column_name
    )
    into v_problem
    from expected_columns
    left join information_schema.columns as columns
      on columns.table_schema = 'public'
     and columns.table_name = 'cms_content_revisions'
     and columns.column_name = expected_columns.column_name
    where columns.column_name is null
       or columns.udt_name <> expected_columns.udt_name;

    if v_problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'Portfolio hardening preflight failed: cms_content_revisions drift',
        detail = v_problem;
    end if;

    if exists (
      select 1
      from pg_catalog.pg_policies as policy
      where policy.schemaname = 'public'
        and policy.tablename = 'cms_content_revisions'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'Portfolio hardening preflight failed: cms_content_revisions has unexpected RLS policies';
    end if;
  end if;

  if pg_catalog.to_regclass('private.rate_limit_buckets') is not null then
    with expected_columns(column_name, udt_name) as (
      values
        ('scope', 'text'),
        ('key_hash', 'text'),
        ('hit_count', 'int4'),
        ('limit_value', 'int4'),
        ('window_seconds', 'int4'),
        ('window_started_at', 'timestamptz'),
        ('expires_at', 'timestamptz'),
        ('created_at', 'timestamptz'),
        ('updated_at', 'timestamptz')
    )
    select pg_catalog.string_agg(
      pg_catalog.format(
        '%I expected %s, found %s',
        expected_columns.column_name,
        expected_columns.udt_name,
        coalesce(columns.udt_name, '<missing>')
      ),
      '; '
      order by expected_columns.column_name
    )
    into v_problem
    from expected_columns
    left join information_schema.columns as columns
      on columns.table_schema = 'private'
     and columns.table_name = 'rate_limit_buckets'
     and columns.column_name = expected_columns.column_name
    where columns.column_name is null
       or columns.udt_name <> expected_columns.udt_name;

    if v_problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'Portfolio hardening preflight failed: private.rate_limit_buckets drift',
        detail = v_problem;
    end if;
  end if;

  if pg_catalog.to_regprocedure('private.is_admin()') is null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: private.is_admin() is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as proc
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    where namespace.nspname = 'private'
      and proc.proname = 'is_admin'
      and pg_catalog.pg_get_function_identity_arguments(proc.oid) = ''
      and proc.prosecdef
      and 'search_path=""' = any(
        coalesce(proc.proconfig, array[]::text[])
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: private.is_admin() is not pinned and SECURITY DEFINER';
  end if;

  if pg_catalog.to_regprocedure('public.set_updated_at()') is null
     or not exists (
       select 1
       from pg_catalog.pg_proc as proc
       join pg_catalog.pg_namespace as namespace
         on namespace.oid = proc.pronamespace
       where namespace.nspname = 'public'
         and proc.proname = 'set_updated_at'
         and pg_catalog.pg_get_function_identity_arguments(proc.oid) = ''
         and proc.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
         and 'search_path=pg_catalog' = any(
           coalesce(proc.proconfig, array[]::text[])
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: public.set_updated_at() is missing or not pinned';
  end if;

  if pg_catalog.to_regprocedure(
       'public.consume_rate_limit(text,text,integer,integer)'
     ) is not null
     and not exists (
       select 1
       from pg_catalog.pg_proc as proc
       join pg_catalog.pg_namespace as namespace
         on namespace.oid = proc.pronamespace
       where namespace.nspname = 'public'
         and proc.proname = 'consume_rate_limit'
         and pg_catalog.pg_get_function_identity_arguments(proc.oid)
             = 'p_scope text, p_key_hash text, p_limit integer, p_window_seconds integer'
         and proc.prosecdef
         and 'search_path=""' = any(
           coalesce(proc.proconfig, array[]::text[])
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unexpected consume_rate_limit() function drift';
  end if;

  if pg_catalog.to_regprocedure('public.cleanup_rate_limit_buckets()') is not null
     and not exists (
       select 1
       from pg_catalog.pg_proc as proc
       join pg_catalog.pg_namespace as namespace
         on namespace.oid = proc.pronamespace
       where namespace.nspname = 'public'
         and proc.proname = 'cleanup_rate_limit_buckets'
         and pg_catalog.pg_get_function_identity_arguments(proc.oid) = ''
         and proc.prosecdef
         and 'search_path=""' = any(
           coalesce(proc.proconfig, array[]::text[])
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unexpected cleanup_rate_limit_buckets() function drift';
  end if;

  if pg_catalog.to_regprocedure(
       'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
     ) is not null
     and not exists (
       select 1
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
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unexpected mutate_cms_content() function drift';
  end if;

  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I', namespace.nspname, relation.relname),
    ', '
    order by relation.relname
  )
  into v_problem
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = any(array[
      'about',
      'admin_audit_logs',
      'admin_remembered_devices',
      'admin_security_preferences',
      'admins',
      'certifications',
      'contact_messages',
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
      'resumes',
      'site_settings',
      'skills',
      'social_links',
      'uploads',
      'volunteering'
    ]::text[])
    and not relation.relrowsecurity;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: RLS is unexpectedly disabled',
      detail = v_problem;
  end if;

  -- The labels below enumerate every historical and canonical policy name this
  -- repository has used for public CMS content. Unknown names abort the run.
  with content_policy_names(
    table_name,
    label,
    published_policy
  ) as (
    values
      ('about', 'about', 'Published about is readable'),
      ('certifications', 'certifications', 'Published certifications are readable'),
      ('education', 'education', 'Published education is readable'),
      ('experience', 'experience', 'Published experience is readable'),
      ('hero', 'hero', 'Published hero is readable'),
      ('page_section_items', 'page section items', 'Published page section items are readable'),
      ('page_sections', 'page sections', 'Published page sections are readable'),
      ('pages', 'pages', 'Published pages are readable'),
      ('profile', 'profile', 'Published profile is readable'),
      ('project_media', 'project media', 'Published project media are readable'),
      ('project_section_items', 'project section items', 'Published project section items are readable'),
      ('project_sections', 'project sections', 'Published project sections are readable'),
      ('projects', 'projects', 'Published projects are readable'),
      ('resumes', 'resumes', 'Published resumes are readable'),
      ('skills', 'skills', 'Published skills are readable'),
      ('social_links', 'social links', 'Published social links are readable'),
      ('volunteering', 'volunteering', 'Published volunteering is readable')
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I (%s)', policy.schemaname, policy.tablename, policy.policyname),
    '; '
    order by policy.tablename, policy.policyname
  )
  into v_problem
  from pg_catalog.pg_policies as policy
  join content_policy_names as known
    on known.table_name = policy.tablename
  where policy.schemaname = 'public'
    and policy.policyname not in (
      known.published_policy,
      pg_catalog.format('Authenticated read %s', known.label),
      pg_catalog.format('Admins manage %s', known.label),
      pg_catalog.format('Admins insert %s', known.label),
      pg_catalog.format('Admins update %s', known.label),
      pg_catalog.format('Admins delete %s', known.label)
    );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unknown CMS policy drift',
      detail = v_problem,
      hint = 'Review and reconcile the named policies before applying this migration.';
  end if;

  with duplicate_orders(label, order_value, row_count) as (
    select
      'projects_page_order',
      projects_page_order,
      pg_catalog.count(*)::integer
    from public.projects
    where published is true
      and status = 'published'
    group by projects_page_order
    having pg_catalog.count(*) > 1

    union all

    select
      'home_featured_order',
      home_featured_order,
      pg_catalog.count(*)::integer
    from public.projects
    where published is true
      and status = 'published'
      and featured is true
      and home_featured_order is not null
    group by home_featured_order
    having pg_catalog.count(*) > 1
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%s=%s is used by %s published projects',
      label,
      order_value,
      row_count
    ),
    '; '
    order by label, order_value
  )
  into v_problem
  from duplicate_orders;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: duplicate published project order',
      detail = v_problem,
      hint = 'Choose unique CMS order values before applying the migration.';
  end if;

  with allowed_special_policies(table_name, policy_name) as (
    values
      ('admins', 'Admins can read admins'),
      ('admins', 'Admins can manage admins'),
      ('site_settings', 'Public site settings are readable'),
      ('site_settings', 'Authenticated read site settings'),
      ('site_settings', 'Admins manage site settings'),
      ('contact_messages', 'Admins read contact messages'),
      ('contact_messages', 'Admins update contact messages'),
      ('uploads', 'Admins manage uploads'),
      ('admin_audit_logs', 'Admins read audit logs'),
      ('admin_audit_logs', 'Admins insert audit logs'),
      ('admin_security_preferences', 'Admins read own security preferences'),
      ('admin_security_preferences', 'Admins manage own security preferences'),
      ('admin_remembered_devices', 'Admins read own remembered devices'),
      ('admin_remembered_devices', 'Admins revoke own remembered devices')
  )
  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I (%s)', policy.schemaname, policy.tablename, policy.policyname),
    '; '
    order by policy.tablename, policy.policyname
  )
  into v_problem
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename = any(array[
      'admins',
      'site_settings',
      'contact_messages',
      'uploads',
      'admin_audit_logs',
      'admin_security_preferences',
      'admin_remembered_devices'
    ]::text[])
    and not exists (
      select 1
      from allowed_special_policies as allowed
      where allowed.table_name = policy.tablename
        and allowed.policy_name = policy.policyname
    );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unknown protected-table policy drift',
      detail = v_problem;
  end if;

  select pg_catalog.string_agg(policy.policyname, ', ' order by policy.policyname)
  into v_problem
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'storage'
    and policy.tablename = 'objects'
    and policy.cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    and policy.roles::text[] && array['public', 'authenticated']::text[]
    and policy.policyname <> 'Admins manage portfolio storage';

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening preflight failed: unknown authenticated storage write policy drift',
      detail = v_problem;
  end if;
end;
$portfolio_hardening_preflight$;

-- ---------------------------------------------------------------------------
-- Missing full foreign-key indexes confirmed against production.
-- ---------------------------------------------------------------------------

do $portfolio_fk_indexes$
declare
  index_spec record;
begin
  for index_spec in
    select *
    from (
      values
        ('admin_audit_logs', 'actor_user_id', 'admin_audit_logs_actor_user_id_idx'),
        ('admin_remembered_devices', 'user_id', 'admin_remembered_devices_user_id_idx'),
        ('uploads', 'uploaded_by', 'uploads_uploaded_by_idx')
    ) as specs(table_name, column_name, index_name)
  loop
    if exists (
      select 1
      from pg_catalog.pg_index as index_row
      where index_row.indrelid = pg_catalog.to_regclass(
              pg_catalog.format('public.%I', index_spec.table_name)
            )
        and index_row.indisvalid
        and index_row.indpred is null
        and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
            = index_spec.column_name
    ) then
      continue;
    end if;

    if pg_catalog.to_regclass(
         pg_catalog.format('public.%I', index_spec.index_name)
       ) is not null then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'Portfolio hardening aborted: index name %I exists with an incompatible definition',
          index_spec.index_name
        );
    end if;

    execute pg_catalog.format(
      'create index %I on public.%I (%I)',
      index_spec.index_name,
      index_spec.table_name,
      index_spec.column_name
    );
  end loop;
end;
$portfolio_fk_indexes$;

-- Publication order is an application invariant as well as an editor warning.
-- Partial unique indexes avoid constraining drafts while closing concurrent
-- publish races that an application precheck alone cannot prevent.
do $project_publication_order_indexes$
declare
  index_spec record;
  existing_index regclass;
begin
  for index_spec in
    select *
    from (
      values
        (
          'projects_published_page_order_unique',
          'projects_page_order',
          'publishedistrueandstatus=''published'''
        ),
        (
          'projects_published_featured_order_unique',
          'home_featured_order',
          'publishedistrueandstatus=''published''andfeaturedistrueandhome_featured_orderisnotnull'
        )
    ) as specs(index_name, column_name, normalized_predicate)
  loop
    existing_index := pg_catalog.to_regclass(
      pg_catalog.format('public.%I', index_spec.index_name)
    );

    if existing_index is not null then
      if not exists (
        select 1
        from pg_catalog.pg_index as index_row
        where index_row.indexrelid = existing_index
          and index_row.indrelid = 'public.projects'::pg_catalog.regclass
          and index_row.indisvalid
          and index_row.indisunique
          and index_row.indnkeyatts = 1
          and pg_catalog.pg_get_indexdef(
                index_row.indexrelid,
                1,
                true
              ) = index_spec.column_name
          and pg_catalog.lower(
                pg_catalog.regexp_replace(
                  pg_catalog.replace(
                    pg_catalog.pg_get_expr(
                      index_row.indpred,
                      index_row.indrelid,
                      true
                    ),
                    '::text',
                    ''
                  ),
                  '[[:space:]()]',
                  '',
                  'g'
                )
              ) = index_spec.normalized_predicate
      ) then
        raise exception using
          errcode = 'P0001',
          message = pg_catalog.format(
            'Portfolio hardening aborted: index %I exists with an incompatible definition',
            index_spec.index_name
          );
      end if;
      continue;
    end if;

    if index_spec.column_name = 'projects_page_order' then
      create unique index projects_published_page_order_unique
        on public.projects (projects_page_order)
        where published is true and status = 'published';
    else
      create unique index projects_published_featured_order_unique
        on public.projects (home_featured_order)
        where published is true
          and status = 'published'
          and featured is true
          and home_featured_order is not null;
    end if;
  end loop;
end;
$project_publication_order_indexes$;

-- ---------------------------------------------------------------------------
-- Contact-delivery source of truth and submission idempotency.
-- ---------------------------------------------------------------------------

alter table public.contact_messages
  add column if not exists submission_id uuid,
  add column if not exists delivery_status text,
  add column if not exists delivery_attempts integer,
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists next_delivery_attempt_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_error_code text,
  add column if not exists provider_message_id text;

-- Existing messages must never be silently re-enqueued. New messages receive
-- the pending/default state after this one-time backfill.
update public.contact_messages
set
  submission_id = coalesce(submission_id, gen_random_uuid()),
  delivery_status = coalesce(delivery_status, 'not_requested'),
  delivery_attempts = coalesce(delivery_attempts, 0),
  next_delivery_attempt_at = case
    when coalesce(delivery_status, 'not_requested') = 'not_requested'
      then next_delivery_attempt_at
    else coalesce(next_delivery_attempt_at, created_at, pg_catalog.now())
  end
where submission_id is null
   or delivery_status is null
   or delivery_attempts is null
   or (
     delivery_status <> 'not_requested'
     and next_delivery_attempt_at is null
   );

alter table public.contact_messages
  alter column submission_id set default gen_random_uuid(),
  alter column submission_id set not null,
  alter column delivery_status set default 'pending',
  alter column delivery_status set not null,
  alter column delivery_attempts set default 0,
  alter column delivery_attempts set not null,
  alter column next_delivery_attempt_at set default pg_catalog.now();

do $contact_delivery_constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    where index_row.indrelid = 'public.contact_messages'::pg_catalog.regclass
      and index_row.indisunique
      and index_row.indisvalid
      and index_row.indpred is null
      and index_row.indnkeyatts = 1
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = 'submission_id'
  ) then
    if exists (
      select 1
      from pg_catalog.pg_constraint
      where conname = 'contact_messages_submission_id_key'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'Portfolio hardening aborted: contact_messages_submission_id_key has an incompatible definition';
    end if;

    alter table public.contact_messages
      add constraint contact_messages_submission_id_key unique (submission_id);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.contact_messages'::pg_catalog.regclass
      and conname = 'contact_messages_delivery_status_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_delivery_status_check
      check (
        delivery_status in (
          'not_requested',
          'pending',
          'sending',
          'sent',
          'failed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.contact_messages'::pg_catalog.regclass
      and conname = 'contact_messages_delivery_attempts_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_delivery_attempts_check
      check (delivery_attempts >= 0);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.contact_messages'::pg_catalog.regclass
      and conname = 'contact_messages_delivery_error_code_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_delivery_error_code_check
      check (
        delivery_error_code is null
        or delivery_error_code ~ '^[A-Za-z0-9_.:-]{1,120}$'
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.contact_messages'::pg_catalog.regclass
      and conname = 'contact_messages_delivery_provider_id_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_delivery_provider_id_check
      check (
        provider_message_id is null
        or pg_catalog.length(provider_message_id) between 1 and 255
      );
  end if;
end;
$contact_delivery_constraints$;

create index if not exists contact_messages_delivery_queue_idx
  on public.contact_messages (
    next_delivery_attempt_at,
    created_at
  )
  where delivery_status in ('pending', 'failed');

create index if not exists contact_messages_provider_message_id_idx
  on public.contact_messages (provider_message_id)
  where provider_message_id is not null;

-- ---------------------------------------------------------------------------
-- Immutable CMS revisions (application writes through service_role only).
-- ---------------------------------------------------------------------------

create table if not exists public.cms_content_revisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id text not null,
  operation text not null,
  changed_fields text[] not null default '{}',
  previous_values jsonb,
  next_values jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint cms_content_revisions_table_name_check
    check (table_name ~ '^[a-z][a-z0-9_]{0,62}$'),
  constraint cms_content_revisions_record_id_check
    check (pg_catalog.length(record_id) between 1 and 255),
  constraint cms_content_revisions_operation_check
    check (
      operation in (
        'create',
        'update',
        'delete',
        'archive',
        'restore',
        'publish',
        'unpublish'
      )
    ),
  constraint cms_content_revisions_previous_values_check
    check (
      previous_values is null
      or pg_catalog.jsonb_typeof(previous_values) = 'object'
    ),
  constraint cms_content_revisions_next_values_check
    check (
      next_values is null
      or pg_catalog.jsonb_typeof(next_values) = 'object'
    ),
  constraint cms_content_revisions_has_snapshot_check
    check (previous_values is not null or next_values is not null)
);

alter table public.cms_content_revisions enable row level security;

create index if not exists cms_content_revisions_actor_user_id_idx
  on public.cms_content_revisions (actor_user_id);

create index if not exists cms_content_revisions_record_history_idx
  on public.cms_content_revisions (table_name, record_id, created_at desc);

create index if not exists cms_content_revisions_request_id_idx
  on public.cms_content_revisions (request_id);

-- ---------------------------------------------------------------------------
-- Atomic CMS mutation boundary.
--
-- The application performs friendly Zod and completeness checks before this
-- call, but this function is the authoritative write boundary. One PostgreSQL
-- statement serializes the publication graph, applies one allowlisted
-- mutation with compare-and-swap semantics, checks the affected aggregate
-- after the write, and appends a sanitized revision before the statement can
-- commit. Any error rolls the content write and revision back together.
-- ---------------------------------------------------------------------------

create or replace function public.mutate_cms_content(
  p_table text,
  p_operation text,
  p_record_id uuid,
  p_expected_updated_at timestamptz,
  p_values jsonb,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $mutate_cms_content$
declare
  v_columns text[];
  v_snapshot_columns text[];
  v_column_list text;
  v_previous jsonb;
  v_next jsonb;
  v_previous_safe jsonb;
  v_next_safe jsonb;
  v_project jsonb;
  v_changed_fields text[];
  v_project_id uuid;
  v_page_id uuid;
  v_parent_id uuid;
  v_slug text;
  v_record_id text;
  v_revision_id uuid;
  v_request_id uuid;
  v_is_publication_aggregate boolean;
begin
  v_columns := case p_table
    when 'profile' then array[
      'full_name', 'initials', 'headline', 'secondary_line', 'tagline',
      'location', 'email', 'linkedin_url', 'linkedin_label', 'github_url',
      'github_label', 'avatar_url', 'availability', 'short_bio',
      'about_text', 'about_focus', 'published'
    ]::text[]
    when 'hero' then array[
      'eyebrow', 'title', 'subtitle', 'tagline', 'dynamic_titles',
      'primary_cta_label', 'primary_cta_href', 'secondary_cta_label',
      'secondary_cta_href', 'published'
    ]::text[]
    when 'about' then array[
      'title', 'body', 'highlights', 'avatar_url', 'published'
    ]::text[]
    when 'skills' then array[
      'name', 'category', 'icon_key', 'description', 'sort_order',
      'published'
    ]::text[]
    when 'projects' then array[
      'slug', 'title', 'type', 'summary', 'description', 'cover_image_url',
      'card_image_url', 'open_graph_image', 'tags', 'tools', 'github_url',
      'linkedin_url', 'demo_url', 'case_study_url', 'seo_title',
      'seo_description', 'project_group', 'organisation', 'status',
      'home_featured_order', 'projects_page_order', 'featured', 'published',
      'sort_order'
    ]::text[]
    when 'project_sections' then array[
      'project_id', 'section_type', 'title', 'body', 'bullets', 'sort_order',
      'is_visible', 'is_archived'
    ]::text[]
    when 'experience' then array[
      'company', 'role', 'location', 'start_date', 'end_date', 'date_label',
      'logo_url', 'logo_alt', 'points', 'tools', 'sort_order', 'published'
    ]::text[]
    when 'education' then array[
      'institution', 'degree', 'start_date', 'end_date', 'status', 'location',
      'sort_order', 'published'
    ]::text[]
    when 'certifications' then array[
      'name', 'issuer', 'date', 'credential_url', 'credential_id',
      'image_url', 'description', 'tags', 'sort_order', 'published'
    ]::text[]
    when 'resumes' then array[
      'label', 'variant', 'pdf_url', 'docx_url', 'sort_order', 'published'
    ]::text[]
    when 'social_links' then array[
      'label', 'url', 'icon_key', 'sort_order', 'published'
    ]::text[]
    when 'pages' then array[
      'page_key', 'title', 'slug', 'seo_title', 'seo_description',
      'open_graph_title', 'open_graph_description', 'open_graph_image',
      'is_published'
    ]::text[]
    when 'page_sections' then array[
      'page_id', 'section_key', 'section_type', 'title', 'subtitle',
      'description', 'cta_label', 'cta_href', 'secondary_cta_label',
      'secondary_cta_href', 'display_order', 'is_visible', 'is_archived',
      'layout_variant'
    ]::text[]
    when 'page_section_items' then array[
      'page_section_id', 'title', 'subtitle', 'description', 'link_label',
      'link_url', 'media_url', 'media_alt', 'display_order', 'is_visible'
    ]::text[]
    when 'project_section_items' then array[
      'project_section_id', 'label', 'value', 'description', 'display_order',
      'is_visible'
    ]::text[]
    when 'project_media' then array[
      'project_id', 'media_url', 'alt_text', 'caption', 'media_type',
      'display_order', 'is_visible'
    ]::text[]
    when 'volunteering' then array[
      'stable_key', 'role', 'organisation', 'start_date', 'end_date',
      'date_label', 'domain', 'summary', 'description_items', 'focus_areas',
      'logo_url', 'logo_alt', 'certification_id', 'sort_order', 'published',
      'archived'
    ]::text[]
    else null
  end;

  if v_columns is null then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_table';
  end if;

  if p_operation is null
     or p_operation not in ('create', 'update', 'archive', 'delete') then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_operation';
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

  p_values := coalesce(p_values, '{}'::pg_catalog.jsonb);
  if pg_catalog.jsonb_typeof(p_values) <> 'object' then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_values_must_be_an_object';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(p_values) as input_key(key_name)
    where not (input_key.key_name = any(v_columns))
  ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_values_contain_forbidden_fields';
  end if;

  if p_operation = 'create'
     and (
       p_record_id is not null
       or p_expected_updated_at is not null
       or p_values = '{}'::pg_catalog.jsonb
     ) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_invalid_create_precondition';
  end if;

  if p_operation in ('update', 'archive', 'delete')
     and (p_record_id is null or p_expected_updated_at is null) then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_optimistic_lock_required';
  end if;

  if p_operation in ('archive', 'delete')
     and p_values <> '{}'::pg_catalog.jsonb then
    raise exception using
      errcode = 'CMS01',
      message = 'cms_archive_delete_values_forbidden';
  end if;

  if p_operation = 'archive'
     and p_table not in (
       'projects',
       'project_sections',
       'page_sections',
       'volunteering'
     ) then
    raise exception using
      errcode = 'CMS07',
      message = 'cms_archive_not_supported';
  end if;

  v_is_publication_aggregate := p_table in (
    'projects',
    'project_sections',
    'project_section_items',
    'project_media',
    'pages',
    'page_sections',
    'page_section_items'
  );

  if v_is_publication_aggregate then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('cms_publication_graph_v1', 0)
    );
  end if;

  if p_operation <> 'create' then
    execute pg_catalog.format(
      'select pg_catalog.to_jsonb(target.*)
         from public.%I as target
        where target.id = $1
        for update',
      p_table
    )
    using p_record_id
    into v_previous;

    if v_previous is null then
      raise exception using
        errcode = 'CMS03',
        message = 'cms_content_not_found';
    end if;

    if (v_previous ->> 'updated_at')::timestamptz
       is distinct from p_expected_updated_at then
      raise exception using
        errcode = 'CMS02',
        message = 'cms_edit_conflict';
    end if;
  end if;

  if p_operation = 'update' then
    if (
      p_table = 'projects'
      and v_previous ->> 'slug' is distinct from p_values ->> 'slug'
    )
    or (
      p_table = 'project_sections'
      and v_previous ->> 'project_id'
          is distinct from p_values ->> 'project_id'
    )
    or (
      p_table = 'project_section_items'
      and v_previous ->> 'project_section_id'
          is distinct from p_values ->> 'project_section_id'
    )
    or (
      p_table = 'project_media'
      and v_previous ->> 'project_id'
          is distinct from p_values ->> 'project_id'
    )
    or (
      p_table = 'page_sections'
      and v_previous ->> 'page_id'
          is distinct from p_values ->> 'page_id'
    )
    or (
      p_table = 'page_section_items'
      and v_previous ->> 'page_section_id'
          is distinct from p_values ->> 'page_section_id'
    ) then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_relationship_change_unsupported';
    end if;
  end if;

  -- Resolve the affected aggregate before the mutation and lock its parent row.
  -- The global publication-graph lock is always acquired first, so every RPC
  -- follows the same lock order.
  if p_table = 'projects' then
    v_project_id := p_record_id;
  elsif p_table in ('project_sections', 'project_media') then
    v_project_id := coalesce(
      nullif(v_previous ->> 'project_id', '')::uuid,
      nullif(p_values ->> 'project_id', '')::uuid
    );
  elsif p_table = 'project_section_items' then
    v_parent_id := coalesce(
      nullif(v_previous ->> 'project_section_id', '')::uuid,
      nullif(p_values ->> 'project_section_id', '')::uuid
    );
    select section.project_id
    into v_project_id
    from public.project_sections as section
    where section.id = v_parent_id;

    if v_project_id is null then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_parent_not_found';
    end if;
  elsif p_table = 'pages' then
    v_page_id := p_record_id;
  elsif p_table = 'page_sections' then
    v_page_id := coalesce(
      nullif(v_previous ->> 'page_id', '')::uuid,
      nullif(p_values ->> 'page_id', '')::uuid
    );
  elsif p_table = 'page_section_items' then
    v_parent_id := coalesce(
      nullif(v_previous ->> 'page_section_id', '')::uuid,
      nullif(p_values ->> 'page_section_id', '')::uuid
    );
    select section.page_id
    into v_page_id
    from public.page_sections as section
    where section.id = v_parent_id;

    if v_page_id is null then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_parent_not_found';
    end if;
  end if;

  if v_project_id is not null then
    perform 1
    from public.projects as project
    where project.id = v_project_id
    for update;

    if not found then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_parent_not_found';
    end if;
  end if;

  if p_table = 'project_section_items' and v_parent_id is not null then
    perform 1
    from public.project_sections as section
    where section.id = v_parent_id
    for update;
  end if;

  if v_page_id is not null then
    perform 1
    from public.pages as page
    where page.id = v_page_id
    for update;

    if not found then
      raise exception using
        errcode = 'CMS04',
        message = 'cms_parent_not_found';
    end if;
  end if;

  if p_table = 'page_section_items' and v_parent_id is not null then
    perform 1
    from public.page_sections as section
    where section.id = v_parent_id
    for update;
  end if;

  select pg_catalog.string_agg(
    pg_catalog.format('%I', column_name),
    ', '
    order by ordinal_position
  )
  into v_column_list
  from pg_catalog.unnest(v_columns) with ordinality
    as allowed_column(column_name, ordinal_position);

  if p_operation = 'create' then
    execute pg_catalog.format(
      'insert into public.%1$I as target (%2$s)
       select %2$s
         from pg_catalog.jsonb_populate_record(
           null::public.%1$I,
           $1
         ) as input
       returning pg_catalog.to_jsonb(target.*)',
      p_table,
      v_column_list
    )
    using p_values
    into v_next;
  elsif p_operation = 'update' then
    execute pg_catalog.format(
      'update public.%1$I as target
          set (%2$s) = (
            select %2$s
              from pg_catalog.jsonb_populate_record(
                null::public.%1$I,
                $1
              ) as input
          )
        where target.id = $2
        returning pg_catalog.to_jsonb(target.*)',
      p_table,
      v_column_list
    )
    using p_values, p_record_id
    into v_next;
  elsif p_operation = 'archive' then
    if p_table = 'projects' then
      update public.projects as project
      set status = 'archived',
          published = false
      where project.id = p_record_id
      returning pg_catalog.to_jsonb(project.*)
      into v_next;
    elsif p_table = 'project_sections' then
      update public.project_sections as section
      set is_archived = true,
          is_visible = false
      where section.id = p_record_id
      returning pg_catalog.to_jsonb(section.*)
      into v_next;
    elsif p_table = 'page_sections' then
      update public.page_sections as section
      set is_archived = true,
          is_visible = false
      where section.id = p_record_id
      returning pg_catalog.to_jsonb(section.*)
      into v_next;
    elsif p_table = 'volunteering' then
      update public.volunteering as volunteering_row
      set archived = true,
          published = false
      where volunteering_row.id = p_record_id
      returning pg_catalog.to_jsonb(volunteering_row.*)
      into v_next;
    end if;
  else
    execute pg_catalog.format(
      'delete from public.%I as target
        where target.id = $1',
      p_table
    )
    using p_record_id;
    v_next := null;
  end if;

  if p_operation in ('create', 'update', 'archive') and v_next is null then
    raise exception using
      errcode = 'CMS03',
      message = 'cms_content_not_found';
  end if;

  if p_table = 'projects' and p_operation = 'create' then
    v_project_id := (v_next ->> 'id')::uuid;
  elsif p_table = 'pages' and p_operation = 'create' then
    v_page_id := (v_next ->> 'id')::uuid;
  end if;

  -- A changed published project must remain a complete case study after the
  -- mutation. A draft/archived project must not remain publicly linked.
  if v_project_id is not null then
    select pg_catalog.to_jsonb(project.*)
    into v_project
    from public.projects as project
    where project.id = v_project_id;

    v_slug := coalesce(
      v_project ->> 'slug',
      v_previous ->> 'slug'
    );

    if v_project is not null
       and (
         coalesce((v_project ->> 'published')::boolean, false)
         is distinct from (v_project ->> 'status' = 'published')
       ) then
      raise exception using
        errcode = 'CMS05',
        message = 'cms_project_publication_state_mismatch';
    end if;

    if v_project is not null
       and v_project ->> 'status' = 'published'
       and (v_project ->> 'published')::boolean then
      if nullif(pg_catalog.btrim(v_project ->> 'title'), '') is null
         or nullif(pg_catalog.btrim(v_project ->> 'slug'), '') is null
         or nullif(pg_catalog.btrim(v_project ->> 'summary'), '') is null then
        raise exception using
          errcode = 'CMS05',
          message = 'cms_project_incomplete';
      end if;

      if (
        nullif(pg_catalog.btrim(v_project ->> 'github_url'), '') is not null
        and (v_project ->> 'github_url') !~* '^https?://[^[:space:]]+$'
      )
      or (
        nullif(pg_catalog.btrim(v_project ->> 'linkedin_url'), '') is not null
        and (v_project ->> 'linkedin_url') !~* '^https?://[^[:space:]]+$'
      )
      or (
        nullif(pg_catalog.btrim(v_project ->> 'demo_url'), '') is not null
        and (v_project ->> 'demo_url') !~* '^https?://[^[:space:]]+$'
      ) then
        raise exception using
          errcode = 'CMS05',
          message = 'cms_project_invalid_cta';
      end if;

      if not exists (
        select 1
        from public.project_sections as section
        where section.project_id = v_project_id
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
        where section.project_id = v_project_id
          and section.is_visible
          and not section.is_archived
          and not (
            nullif(pg_catalog.btrim(section.body), '') is not null
            or exists (
              select 1
              from pg_catalog.unnest(
                coalesce(section.bullets, '{}'::text[])
              ) as bullet(value)
              where nullif(pg_catalog.btrim(bullet.value), '') is not null
            )
            or exists (
              select 1
              from public.project_section_items as item
              where item.project_section_id = section.id
                and item.is_visible
                and (
                  nullif(pg_catalog.btrim(item.value), '') is not null
                  or nullif(pg_catalog.btrim(item.description), '') is not null
                )
            )
            or (
              section.section_type in ('media', 'media_gallery')
              and exists (
                select 1
                from public.project_media as media
                where media.project_id = v_project_id
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
    end if;

    if v_slug is not null
       and not exists (
         select 1
         from public.projects as project
         where project.slug = v_slug
           and project.published
           and project.status = 'published'
       )
       and exists (
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
             '/projects/' || v_slug,
             '/projects/' || v_slug || '/'
           )
       ) then
      raise exception using
        errcode = 'CMS06',
        message = 'cms_project_linked_from_published_page';
    end if;
  end if;

  -- A changed published page must only expose links to published projects.
  if v_page_id is not null
     and exists (
       select 1
       from public.pages as page
       where page.id = v_page_id
         and page.is_published
     )
     and exists (
       select 1
       from public.page_section_items as item
       join public.page_sections as section
         on section.id = item.page_section_id
       cross join lateral pg_catalog.regexp_match(
         pg_catalog.btrim(item.link_url),
         '^/projects/([^/?#]+)/?$'
       ) as project_link(parts)
       where section.page_id = v_page_id
         and section.is_visible
         and not section.is_archived
         and item.is_visible
         and not exists (
           select 1
           from public.projects as project
           where project.slug = project_link.parts[1]
             and project.published
             and project.status = 'published'
         )
     ) then
    raise exception using
      errcode = 'CMS06',
      message = 'cms_published_page_has_unpublished_project_link';
  end if;

  -- Revision snapshots are built from the same per-table allowlist as the
  -- mutation. Metadata timestamps, unknown legacy fields, secrets, and caller-
  -- supplied revision data cannot enter the immutable history.
  v_snapshot_columns := pg_catalog.array_prepend('id', v_columns);

  if v_previous is not null then
    select coalesce(
      pg_catalog.jsonb_object_agg(entry.key, entry.value),
      '{}'::pg_catalog.jsonb
    )
    into v_previous_safe
    from pg_catalog.jsonb_each(v_previous) as entry(key, value)
    where entry.key = any(v_snapshot_columns);
  end if;

  if v_next is not null then
    select coalesce(
      pg_catalog.jsonb_object_agg(entry.key, entry.value),
      '{}'::pg_catalog.jsonb
    )
    into v_next_safe
    from pg_catalog.jsonb_each(v_next) as entry(key, value)
    where entry.key = any(v_snapshot_columns);
  end if;

  select coalesce(
    pg_catalog.array_agg(snapshot_key order by snapshot_key),
    '{}'::text[]
  )
  into v_changed_fields
  from pg_catalog.unnest(v_snapshot_columns) as key_row(snapshot_key)
  where v_previous_safe -> key_row.snapshot_key
        is distinct from
        v_next_safe -> key_row.snapshot_key;

  v_record_id := coalesce(
    v_next_safe ->> 'id',
    v_previous_safe ->> 'id'
  );

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
    p_table,
    v_record_id,
    p_operation,
    v_changed_fields,
    v_previous_safe,
    v_next_safe
  )
  returning id, request_id
  into v_revision_id, v_request_id;

  return pg_catalog.jsonb_build_object(
    'row', v_next,
    'operation', p_operation,
    'revisionRecorded', true,
    'revisionId', v_revision_id,
    'requestId', v_request_id
  );
end;
$mutate_cms_content$;

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
)
  from public, anon, authenticated;

grant execute on function public.mutate_cms_content(
  text,
  text,
  uuid,
  timestamptz,
  jsonb,
  uuid
)
  to service_role;

-- ---------------------------------------------------------------------------
-- Private durable rate-limit state and atomic service-role-only RPCs.
-- ---------------------------------------------------------------------------

create table if not exists private.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  hit_count integer not null,
  limit_value integer not null,
  window_seconds integer not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (scope, key_hash),
  constraint rate_limit_buckets_scope_check
    check (scope ~ '^[a-z][a-z0-9_.:-]{0,79}$'),
  constraint rate_limit_buckets_key_hash_check
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint rate_limit_buckets_hit_count_check
    check (hit_count >= 1),
  constraint rate_limit_buckets_limit_value_check
    check (limit_value between 1 and 100000),
  constraint rate_limit_buckets_window_seconds_check
    check (window_seconds between 1 and 86400),
  constraint rate_limit_buckets_expiry_check
    check (expires_at > window_started_at)
);

create index if not exists rate_limit_buckets_expires_at_idx
  on private.rate_limit_buckets (expires_at);

revoke all privileges on table private.rate_limit_buckets
  from public, anon, authenticated, service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $consume_rate_limit$
declare
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_hit_count integer;
  v_reset_at timestamptz;
begin
  if p_scope is null
     or p_scope !~ '^[a-z][a-z0-9_.:-]{0,79}$' then
    raise exception using
      errcode = '22023',
      message = 'p_scope must match ^[a-z][a-z0-9_.:-]{0,79}$';
  end if;

  if p_key_hash is null
     or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'p_key_hash must be a lowercase 64-character hex digest';
  end if;

  if p_limit is null or p_limit not between 1 and 100000 then
    raise exception using
      errcode = '22023',
      message = 'p_limit must be between 1 and 100000';
  end if;

  if p_window_seconds is null
     or p_window_seconds not between 1 and 86400 then
    raise exception using
      errcode = '22023',
      message = 'p_window_seconds must be between 1 and 86400';
  end if;

  insert into private.rate_limit_buckets as bucket (
    scope,
    key_hash,
    hit_count,
    limit_value,
    window_seconds,
    window_started_at,
    expires_at,
    created_at,
    updated_at
  )
  values (
    p_scope,
    p_key_hash,
    1,
    p_limit,
    p_window_seconds,
    v_now,
    v_now + pg_catalog.make_interval(secs => p_window_seconds),
    v_now,
    v_now
  )
  on conflict (scope, key_hash) do update
  set
    hit_count = case
      when bucket.expires_at <= v_now
        or bucket.limit_value <> excluded.limit_value
        or bucket.window_seconds <> excluded.window_seconds
        then 1
      else least(
        bucket.hit_count + 1,
        excluded.limit_value + 1
      )
    end,
    limit_value = excluded.limit_value,
    window_seconds = excluded.window_seconds,
    window_started_at = case
      when bucket.expires_at <= v_now
        or bucket.limit_value <> excluded.limit_value
        or bucket.window_seconds <> excluded.window_seconds
        then v_now
      else bucket.window_started_at
    end,
    expires_at = case
      when bucket.expires_at <= v_now
        or bucket.limit_value <> excluded.limit_value
        or bucket.window_seconds <> excluded.window_seconds
        then excluded.expires_at
      else bucket.expires_at
    end,
    updated_at = v_now
  returning bucket.hit_count, bucket.expires_at
  into v_hit_count, v_reset_at;

  return query
  select
    v_hit_count <= p_limit,
    greatest(p_limit - v_hit_count, 0),
    v_reset_at;
end;
$consume_rate_limit$;

create or replace function public.cleanup_rate_limit_buckets()
returns bigint
language plpgsql
security definer
set search_path = ''
as $cleanup_rate_limit_buckets$
declare
  v_deleted bigint;
begin
  delete from private.rate_limit_buckets
  where expires_at <= pg_catalog.statement_timestamp();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$cleanup_rate_limit_buckets$;

alter function public.consume_rate_limit(text, text, integer, integer)
  owner to postgres;
alter function public.cleanup_rate_limit_buckets()
  owner to postgres;

revoke all privileges on function
  public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all privileges on function
  public.cleanup_rate_limit_buckets()
  from public, anon, authenticated;

grant execute on function
  public.consume_rate_limit(text, text, integer, integer)
  to service_role;
grant execute on function
  public.cleanup_rate_limit_buckets()
  to service_role;

-- ---------------------------------------------------------------------------
-- Remembered-device context binding and rotation metadata.
-- Existing rows remain nullable by design; the application must require a fresh
-- MFA challenge before replacing a legacy context-less token.
-- ---------------------------------------------------------------------------

alter table public.admin_remembered_devices
  add column if not exists device_context_hash text,
  add column if not exists network_context_hash text,
  add column if not exists last_user_agent_hash text,
  add column if not exists last_network_context_hash text,
  add column if not exists rotated_at timestamptz,
  add column if not exists rotation_counter integer not null default 0,
  add column if not exists revocation_reason text;

do $remembered_device_constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.admin_remembered_devices'::pg_catalog.regclass
      and conname = 'admin_remembered_devices_context_hashes_check'
  ) then
    alter table public.admin_remembered_devices
      add constraint admin_remembered_devices_context_hashes_check
      check (
        (
          device_context_hash is null
          or device_context_hash ~ '^[0-9a-f]{64}$'
        )
        and (
          network_context_hash is null
          or network_context_hash ~ '^[0-9a-f]{64}$'
        )
        and (
          last_user_agent_hash is null
          or last_user_agent_hash ~ '^[0-9a-f]{64}$'
        )
        and (
          last_network_context_hash is null
          or last_network_context_hash ~ '^[0-9a-f]{64}$'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.admin_remembered_devices'::pg_catalog.regclass
      and conname = 'admin_remembered_devices_rotation_counter_check'
  ) then
    alter table public.admin_remembered_devices
      add constraint admin_remembered_devices_rotation_counter_check
      check (rotation_counter >= 0);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.admin_remembered_devices'::pg_catalog.regclass
      and conname = 'admin_remembered_devices_revocation_reason_check'
  ) then
    alter table public.admin_remembered_devices
      add constraint admin_remembered_devices_revocation_reason_check
      check (
        revocation_reason is null
        or (
          pg_catalog.length(revocation_reason) between 1 and 80
          and revocation_reason ~ '^[A-Za-z0-9_.:-]+$'
        )
      );
  end if;
end;
$remembered_device_constraints$;

create index if not exists admin_remembered_devices_active_expiry_idx
  on public.admin_remembered_devices (expires_at)
  where revoked_at is null;

create index if not exists admin_remembered_devices_active_context_idx
  on public.admin_remembered_devices (user_id, device_context_hash)
  where revoked_at is null and device_context_hash is not null;

-- ---------------------------------------------------------------------------
-- Upload lifecycle metadata for storage reconciliation.
-- No object is deleted and no bucket visibility is changed by this migration.
-- ---------------------------------------------------------------------------

alter table public.uploads
  add column if not exists sha256 text,
  add column if not exists deletion_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_error_code text;

do $upload_lifecycle_constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.uploads'::pg_catalog.regclass
      and conname = 'uploads_sha256_check'
  ) then
    alter table public.uploads
      add constraint uploads_sha256_check
      check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.uploads'::pg_catalog.regclass
      and conname = 'uploads_deletion_status_check'
  ) then
    alter table public.uploads
      add constraint uploads_deletion_status_check
      check (deletion_status in ('active', 'pending', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.uploads'::pg_catalog.regclass
      and conname = 'uploads_deletion_error_code_check'
  ) then
    alter table public.uploads
      add constraint uploads_deletion_error_code_check
      check (
        deletion_error_code is null
        or deletion_error_code ~ '^[A-Za-z0-9_.:-]{1,80}$'
      );
  end if;
end;
$upload_lifecycle_constraints$;

-- Digests can legitimately repeat when an operator reuses one asset, so this is
-- deliberately non-unique.
create index if not exists uploads_sha256_idx
  on public.uploads (sha256)
  where sha256 is not null;

create index if not exists uploads_deletion_queue_idx
  on public.uploads (deletion_requested_at, created_at)
  where deletion_status in ('pending', 'failed');

-- ---------------------------------------------------------------------------
-- Canonical public-page registry and bounded content corrections.
-- Existing editorial titles/descriptions are preserved except for the known
-- availability strings and the explicitly audited VERMEG attribution boundary.
-- ---------------------------------------------------------------------------

insert into public.pages as existing_page (
  page_key,
  title,
  slug,
  seo_title,
  seo_description,
  open_graph_title,
  open_graph_description,
  is_published
)
values
  (
    'home',
    'Data-Driven Marketing & Commercial Analytics',
    '/',
    'Data-Driven Marketing & Commercial Analytics',
    'Ahmed Aziz Mhiri connects marketing and commercial analytics, business intelligence, customer insight and auditable process automation.',
    'Data-Driven Marketing & Commercial Analytics',
    'Ahmed Aziz Mhiri connects marketing and commercial analytics, business intelligence, customer insight and auditable process automation.',
    true
  ),
  (
    'about',
    'About',
    '/about',
    'About Ahmed Aziz Mhiri',
    'How Ahmed Aziz Mhiri combines marketing and commercial analytics, business intelligence, customer insight and process automation.',
    'About Ahmed Aziz Mhiri',
    'How Ahmed Aziz Mhiri combines marketing and commercial analytics, business intelligence, customer insight and process automation.',
    true
  ),
  (
    'expertise',
    'Expertise',
    '/expertise',
    'Expertise',
    'How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.',
    'Expertise',
    'How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.',
    true
  ),
  (
    'projects',
    'Projects',
    '/projects',
    'Projects',
    'Public-safe case studies by Ahmed Aziz Mhiri across commercial analytics, business intelligence, marketing transformation and process automation.',
    'Projects',
    'Public-safe case studies by Ahmed Aziz Mhiri across commercial analytics, business intelligence, marketing transformation and process automation.',
    true
  ),
  (
    'experience',
    'Experience',
    '/experience',
    'Experience',
    'Ahmed Aziz Mhiri''s professional timeline across analytics, commercial operations, digital marketing, business systems and automation.',
    'Experience',
    'Ahmed Aziz Mhiri''s professional timeline across analytics, commercial operations, digital marketing, business systems and automation.',
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
    true
  ),
  (
    'certifications',
    'Certifications',
    '/certifications',
    'Certifications',
    'Verified professional credentials held by Ahmed Aziz Mhiri across digital marketing, analytics and related disciplines.',
    'Certifications',
    'Verified professional credentials held by Ahmed Aziz Mhiri across digital marketing, analytics and related disciplines.',
    true
  ),
  (
    'resume',
    'Resume',
    '/resume',
    'Resume',
    'View Ahmed Aziz Mhiri''s resume formats and supporting education and certification information.',
    'Resume',
    'View Ahmed Aziz Mhiri''s resume formats and supporting education and certification information.',
    true
  ),
  (
    'contact',
    'Contact',
    '/contact',
    'Contact',
    'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.',
    'Contact',
    'Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.',
    true
  )
on conflict (page_key) do update
set
  is_published = true,
  updated_at = pg_catalog.now()
where existing_page.slug = excluded.slug
  and existing_page.is_published is distinct from true;

update public.profile
set availability = case availability
  when 'Available for Europe-based opportunities from Summer 2027'
    then 'Available for Europe-based opportunities from October 2027'
  when 'Based in Tunisia · Open to European opportunities from Summer 2027'
    then 'Based in Tunisia · Open to European opportunities from October 2027'
  when 'Based in Tunisia Â· Open to European opportunities from Summer 2027'
    then 'Based in Tunisia · Open to European opportunities from October 2027'
  else availability
end
where availability in (
  'Available for Europe-based opportunities from Summer 2027',
  'Based in Tunisia · Open to European opportunities from Summer 2027',
  'Based in Tunisia Â· Open to European opportunities from Summer 2027'
);

update public.page_sections as section
set
  description = 'Open to relevant European opportunities from October 2027.',
  updated_at = pg_catalog.now()
from public.pages as page
where page.id = section.page_id
  and page.page_key = 'home'
  and section.section_key = 'cta'
  and section.description
      = 'Open to relevant European opportunities from Summer 2027.';

update public.projects
set
  title = 'VERMEG AI-Ready E-Learning Prototype',
  type = 'AI Prototype · Full-Stack · Team Project',
  summary = 'Two-person internship prototype for an AI-ready e-learning experience. Ahmed contributed the chatbot and selected application services; it was not sole-authored and was not presented as a production deployment.',
  description = 'A demonstrable two-person internship prototype. Ahmed contributed the chatbot and selected application services. The system was not sole-authored and was not presented as a production deployment.',
  tags = array[
    'AI Prototype',
    'Team Project',
    'Angular',
    'Spring Boot',
    'Ollama',
    'RAG'
  ],
  tools = array['Angular', 'Spring Boot', 'Ollama', 'RAG'],
  seo_title = 'VERMEG AI-Ready E-Learning Prototype',
  seo_description = 'Two-person internship prototype with Ahmed''s contribution bounded to the chatbot and selected application services. Not sole-authored and not presented as a production deployment.',
  updated_at = pg_catalog.now()
where slug in (
  'vermeg-ai-ready-e-learning-platform',
  'ai-ready-elearning-platform'
);

update public.experience
set
  points = array[
    'Contributed the chatbot and selected application services within a two-person internship prototype.',
    'The system was not sole-authored and was not presented as a production deployment.'
  ],
  updated_at = pg_catalog.now()
where company ilike 'VERMEG%';

-- ---------------------------------------------------------------------------
-- Canonical RLS: public rows stay readable, authenticated administrators can
-- preview unpublished rows, and all browser-role mutations are removed because
-- this application writes through server-side service_role clients.
-- ---------------------------------------------------------------------------

do $canonical_content_policies$
declare
  policy_spec record;
  old_policy_name text;
begin
  for policy_spec in
    select *
    from (
      values
        (
          'about',
          'about',
          'Published about is readable',
          'published = true'
        ),
        (
          'certifications',
          'certifications',
          'Published certifications are readable',
          'published = true'
        ),
        (
          'education',
          'education',
          'Published education is readable',
          'published = true'
        ),
        (
          'experience',
          'experience',
          'Published experience is readable',
          'published = true'
        ),
        (
          'hero',
          'hero',
          'Published hero is readable',
          'published = true'
        ),
        (
          'page_section_items',
          'page section items',
          'Published page section items are readable',
          $predicate$is_visible
            and exists (
              select 1
              from public.page_sections as section
              join public.pages as page on page.id = section.page_id
              where section.id = page_section_items.page_section_id
                and section.is_visible
                and not section.is_archived
                and page.is_published
            )$predicate$
        ),
        (
          'page_sections',
          'page sections',
          'Published page sections are readable',
          $predicate$is_visible
            and not is_archived
            and exists (
              select 1
              from public.pages as page
              where page.id = page_sections.page_id
                and page.is_published
            )$predicate$
        ),
        (
          'pages',
          'pages',
          'Published pages are readable',
          'is_published = true'
        ),
        (
          'profile',
          'profile',
          'Published profile is readable',
          'published = true'
        ),
        (
          'project_media',
          'project media',
          'Published project media are readable',
          $predicate$is_visible
            and exists (
              select 1
              from public.projects as project
              where project.id = project_media.project_id
                and project.published
                and project.status = 'published'
            )$predicate$
        ),
        (
          'project_section_items',
          'project section items',
          'Published project section items are readable',
          $predicate$is_visible
            and exists (
              select 1
              from public.project_sections as section
              join public.projects as project
                on project.id = section.project_id
              where section.id = project_section_items.project_section_id
                and section.is_visible
                and not section.is_archived
                and project.published
                and project.status = 'published'
            )$predicate$
        ),
        (
          'project_sections',
          'project sections',
          'Published project sections are readable',
          $predicate$is_visible
            and not is_archived
            and exists (
              select 1
              from public.projects as project
              where project.id = project_sections.project_id
                and project.published
                and project.status = 'published'
            )$predicate$
        ),
        (
          'projects',
          'projects',
          'Published projects are readable',
          $predicate$published = true and status = 'published'$predicate$
        ),
        (
          'resumes',
          'resumes',
          'Published resumes are readable',
          'published = true'
        ),
        (
          'skills',
          'skills',
          'Published skills are readable',
          'published = true'
        ),
        (
          'social_links',
          'social links',
          'Published social links are readable',
          'published = true'
        ),
        (
          'volunteering',
          'volunteering',
          'Published volunteering is readable',
          'published = true and archived = false'
        )
    ) as specs(
      table_name,
      label,
      published_policy_name,
      published_predicate
    )
  loop
    foreach old_policy_name in array array[
      policy_spec.published_policy_name,
      pg_catalog.format('Authenticated read %s', policy_spec.label),
      pg_catalog.format('Admins manage %s', policy_spec.label),
      pg_catalog.format('Admins insert %s', policy_spec.label),
      pg_catalog.format('Admins update %s', policy_spec.label),
      pg_catalog.format('Admins delete %s', policy_spec.label)
    ]
    loop
      execute pg_catalog.format(
        'drop policy if exists %I on public.%I',
        old_policy_name,
        policy_spec.table_name
      );
    end loop;

    execute pg_catalog.format(
      'create policy %I on public.%I for select to anon using (%s)',
      policy_spec.published_policy_name,
      policy_spec.table_name,
      policy_spec.published_predicate
    );

    execute pg_catalog.format(
      'create policy %I on public.%I for select to authenticated using ((%s) or (select private.is_admin()))',
      pg_catalog.format('Authenticated read %s', policy_spec.label),
      policy_spec.table_name,
      policy_spec.published_predicate
    );
  end loop;
end;
$canonical_content_policies$;

drop policy if exists "Admins can read admins" on public.admins;
drop policy if exists "Admins can manage admins" on public.admins;
create policy "Admins can read admins"
  on public.admins
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Public site settings are readable"
  on public.site_settings;
drop policy if exists "Authenticated read site settings"
  on public.site_settings;
drop policy if exists "Admins manage site settings"
  on public.site_settings;
create policy "Public site settings are readable"
  on public.site_settings
  for select
  to anon
  using (coalesce(value ->> 'public', 'false') = 'true');
create policy "Authenticated read site settings"
  on public.site_settings
  for select
  to authenticated
  using (
    coalesce(value ->> 'public', 'false') = 'true'
    or (select private.is_admin())
  );

drop policy if exists "Admins read contact messages"
  on public.contact_messages;
drop policy if exists "Admins update contact messages"
  on public.contact_messages;
create policy "Admins read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins manage uploads"
  on public.uploads;

drop policy if exists "Admins read audit logs"
  on public.admin_audit_logs;
drop policy if exists "Admins insert audit logs"
  on public.admin_audit_logs;
create policy "Admins read audit logs"
  on public.admin_audit_logs
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins read own security preferences"
  on public.admin_security_preferences;
drop policy if exists "Admins manage own security preferences"
  on public.admin_security_preferences;
create policy "Admins read own security preferences"
  on public.admin_security_preferences
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_admin())
  );

drop policy if exists "Admins read own remembered devices"
  on public.admin_remembered_devices;
drop policy if exists "Admins revoke own remembered devices"
  on public.admin_remembered_devices;
create policy "Admins read own remembered devices"
  on public.admin_remembered_devices
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_admin())
  );

-- Known public-listing policies remain absent. Public bucket object URLs are a
-- bucket-level behavior and do not require a broad storage.objects SELECT
-- policy. Authenticated storage mutation is server-mediated.
drop policy if exists "Public can read portfolio assets" on storage.objects;
drop policy if exists "Public can read public portfolio storage"
  on storage.objects;
drop policy if exists "Admins manage portfolio storage" on storage.objects;

-- ---------------------------------------------------------------------------
-- Explicit table ACLs. This is required for projects created after Supabase's
-- 2026 change that stopped automatically exposing new public tables.
-- ---------------------------------------------------------------------------

revoke all privileges on table
  public.about,
  public.certifications,
  public.education,
  public.experience,
  public.hero,
  public.page_section_items,
  public.page_sections,
  public.pages,
  public.profile,
  public.project_media,
  public.project_section_items,
  public.project_sections,
  public.projects,
  public.resumes,
  public.skills,
  public.social_links,
  public.volunteering
from public, anon, authenticated, service_role;

grant select on table
  public.about,
  public.certifications,
  public.education,
  public.experience,
  public.hero,
  public.page_section_items,
  public.page_sections,
  public.pages,
  public.profile,
  public.project_media,
  public.project_section_items,
  public.project_sections,
  public.projects,
  public.resumes,
  public.skills,
  public.social_links,
  public.volunteering
to anon, authenticated, service_role;

-- Content mutations are intentionally unavailable as direct table DML, even to
-- service_role. The service-role server uses mutate_cms_content(), whose
-- SECURITY DEFINER transaction owns validation, optimistic locking, aggregate
-- serialization, and revision capture.

revoke all privileges on table
  public.admins,
  public.site_settings,
  public.contact_messages,
  public.uploads,
  public.admin_audit_logs,
  public.admin_security_preferences,
  public.admin_remembered_devices,
  public.cms_content_revisions
from public, anon, authenticated, service_role;

grant select on table
  public.admins,
  public.site_settings,
  public.contact_messages,
  public.admin_audit_logs,
  public.admin_security_preferences,
  public.admin_remembered_devices
to authenticated;

grant select on table public.site_settings
  to anon;

grant select, insert, update, delete on table
  public.admins,
  public.site_settings,
  public.contact_messages,
  public.uploads,
  public.admin_audit_logs,
  public.admin_security_preferences,
  public.admin_remembered_devices
to service_role;

grant select on table public.cms_content_revisions
  to service_role;

revoke insert, update, delete on table storage.objects
  from public, anon, authenticated;
grant select, insert, update, delete on table storage.objects
  to service_role;

-- ---------------------------------------------------------------------------
-- Expected updated_at trigger verification and repair of missing bindings.
-- Existing but incompatible bindings cause a hard failure.
-- ---------------------------------------------------------------------------

do $updated_at_triggers$
declare
  trigger_spec record;
  v_wrong boolean;
begin
  for trigger_spec in
    select *
    from (
      values
        ('about', 'set_about_updated_at'),
        ('admin_security_preferences', 'set_admin_security_preferences_updated_at'),
        ('certifications', 'set_certifications_updated_at'),
        ('contact_messages', 'set_contact_messages_updated_at'),
        ('education', 'set_education_updated_at'),
        ('experience', 'set_experience_updated_at'),
        ('hero', 'set_hero_updated_at'),
        ('page_section_items', 'set_page_section_items_updated_at'),
        ('page_sections', 'set_page_sections_updated_at'),
        ('pages', 'set_pages_updated_at'),
        ('profile', 'set_profile_updated_at'),
        ('project_media', 'set_project_media_updated_at'),
        ('project_section_items', 'set_project_section_items_updated_at'),
        ('project_sections', 'set_project_sections_updated_at'),
        ('projects', 'set_projects_updated_at'),
        ('resumes', 'set_resumes_updated_at'),
        ('site_settings', 'set_site_settings_updated_at'),
        ('skills', 'set_skills_updated_at'),
        ('social_links', 'set_social_links_updated_at'),
        ('volunteering', 'set_volunteering_updated_at')
    ) as specs(table_name, trigger_name)
  loop
    select exists (
      select 1
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = pg_catalog.to_regclass(
              pg_catalog.format('public.%I', trigger_spec.table_name)
            )
        and trigger_row.tgname = trigger_spec.trigger_name
        and (
          trigger_row.tgisinternal
          or trigger_row.tgfoid
             <> pg_catalog.to_regprocedure('public.set_updated_at()')
          or trigger_row.tgtype <> 19
          or trigger_row.tgenabled = 'D'
        )
    )
    into v_wrong;

    if v_wrong then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'Portfolio hardening aborted: trigger %I.%I has an incompatible binding',
          trigger_spec.table_name,
          trigger_spec.trigger_name
        );
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = pg_catalog.to_regclass(
              pg_catalog.format('public.%I', trigger_spec.table_name)
            )
        and trigger_row.tgname = trigger_spec.trigger_name
        and not trigger_row.tgisinternal
    ) then
      execute pg_catalog.format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        trigger_spec.trigger_name,
        trigger_spec.table_name
      );
    end if;
  end loop;
end;
$updated_at_triggers$;

-- ---------------------------------------------------------------------------
-- Postflight: every invariant below must hold or the transaction rolls back.
-- ---------------------------------------------------------------------------

do $portfolio_hardening_postflight$
declare
  v_problem text;
begin
  with required_timestamp_columns(column_name) as (
    values ('updated_at'), ('read_at'), ('archived_at')
  )
  select pg_catalog.string_agg(
    required.column_name,
    ', '
    order by required.column_name
  )
  into v_problem
  from required_timestamp_columns as required
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = 'contact_messages'
   and columns.column_name = required.column_name
   and columns.udt_name = 'timestamptz'
  where columns.column_name is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: contact timestamp compatibility is incomplete',
      detail = v_problem;
  end if;

  if exists (
    select projects_page_order
    from public.projects
    where published is true
      and status = 'published'
    group by projects_page_order
    having pg_catalog.count(*) > 1
  )
  or exists (
    select home_featured_order
    from public.projects
    where published is true
      and status = 'published'
      and featured is true
      and home_featured_order is not null
    group by home_featured_order
    having pg_catalog.count(*) > 1
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: published project order is not unique';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    where index_row.indexrelid = pg_catalog.to_regclass(
            'public.projects_published_page_order_unique'
          )
      and index_row.indisvalid
      and index_row.indisunique
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = 'projects_page_order'
  )
  or not exists (
    select 1
    from pg_catalog.pg_index as index_row
    where index_row.indexrelid = pg_catalog.to_regclass(
            'public.projects_published_featured_order_unique'
          )
      and index_row.indisvalid
      and index_row.indisunique
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = 'home_featured_order'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: publication-order unique indexes are missing';
  end if;

  if exists (
    select 1
    from public.contact_messages
    where submission_id is null
       or delivery_status not in (
         'not_requested',
         'pending',
         'sending',
         'sent',
         'failed'
       )
       or delivery_attempts < 0
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: invalid contact delivery state';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    where index_row.indrelid = 'public.contact_messages'::pg_catalog.regclass
      and index_row.indisunique
      and index_row.indisvalid
      and index_row.indpred is null
      and index_row.indnkeyatts = 1
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = 'submission_id'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: contact submission_id is not uniquely indexed';
  end if;

  with expected_pages(page_key, slug) as (
    values
      ('home', '/'),
      ('about', '/about'),
      ('expertise', '/expertise'),
      ('projects', '/projects'),
      ('experience', '/experience'),
      ('education', '/education'),
      ('certifications', '/certifications'),
      ('resume', '/resume'),
      ('contact', '/contact')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%L expected slug=%L; found slug=%L published=%s',
      expected_pages.page_key,
      expected_pages.slug,
      page.slug,
      page.is_published
    ),
    '; '
    order by expected_pages.page_key
  )
  into v_problem
  from expected_pages
  left join public.pages as page
    on page.page_key = expected_pages.page_key
  where page.id is null
     or page.slug <> expected_pages.slug
     or page.is_published is not true;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: canonical page registry is incomplete',
      detail = v_problem;
  end if;

  if exists (
    select 1
    from public.profile
    where availability in (
      'Available for Europe-based opportunities from Summer 2027',
      'Based in Tunisia · Open to European opportunities from Summer 2027',
      'Based in Tunisia Â· Open to European opportunities from Summer 2027'
    )
  )
  or exists (
    select 1
    from public.page_sections as section
    join public.pages as page on page.id = section.page_id
    where page.page_key = 'home'
      and section.section_key = 'cta'
      and section.description
          = 'Open to relevant European opportunities from Summer 2027.'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: known Summer 2027 CMS copy remains';
  end if;

  if exists (
    select 1
    from public.projects
    where slug in (
      'vermeg-ai-ready-e-learning-platform',
      'ai-ready-elearning-platform'
    )
      and (
        title not ilike '%prototype%'
        or summary not ilike '%two-person internship prototype%'
        or summary not ilike '%chatbot%'
        or summary not ilike '%selected application services%'
        or summary not ilike '%not sole-authored%'
        or summary not ilike '%not presented as a production deployment%'
      )
  )
  or exists (
    select 1
    from public.experience
    where company ilike 'VERMEG%'
      and (
        pg_catalog.array_to_string(points, ' ')
            not ilike '%two-person internship prototype%'
        or pg_catalog.array_to_string(points, ' ') not ilike '%chatbot%'
        or pg_catalog.array_to_string(points, ' ')
            not ilike '%selected application services%'
        or pg_catalog.array_to_string(points, ' ')
            not ilike '%not sole-authored%'
        or pg_catalog.array_to_string(points, ' ')
            not ilike '%not presented as a production deployment%'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: VERMEG prototype attribution is not bounded';
  end if;

  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I', index_spec.table_name, index_spec.column_name),
    ', '
    order by index_spec.table_name
  )
  into v_problem
  from (
    values
      ('admin_audit_logs', 'actor_user_id'),
      ('admin_remembered_devices', 'user_id'),
      ('uploads', 'uploaded_by')
  ) as index_spec(table_name, column_name)
  where not exists (
    select 1
    from pg_catalog.pg_index as index_row
    where index_row.indrelid = pg_catalog.to_regclass(
            pg_catalog.format('public.%I', index_spec.table_name)
          )
      and index_row.indisvalid
      and index_row.indpred is null
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = index_spec.column_name
  );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: missing full foreign-key indexes',
      detail = v_problem;
  end if;

  if pg_catalog.to_regclass('public.cms_content_revisions') is null
     or not exists (
       select 1
       from pg_catalog.pg_class as relation
       where relation.oid = 'public.cms_content_revisions'::pg_catalog.regclass
         and relation.relrowsecurity
     )
     or exists (
       select 1
       from pg_catalog.pg_policies as policy
       where policy.schemaname = 'public'
         and policy.tablename = 'cms_content_revisions'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: revision table RLS is not deny-by-default';
  end if;

  if pg_catalog.to_regprocedure(
       'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
     ) is null
     or not exists (
       select 1
       from pg_catalog.pg_proc as proc
       join pg_catalog.pg_namespace as namespace
         on namespace.oid = proc.pronamespace
       where namespace.nspname = 'public'
         and proc.proname = 'mutate_cms_content'
         and pg_catalog.pg_get_function_identity_arguments(proc.oid)
             = 'p_table text, p_operation text, p_record_id uuid, p_expected_updated_at timestamp with time zone, p_values jsonb, p_actor_user_id uuid'
         and proc.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype
         and proc.prosecdef
         and pg_catalog.pg_get_userbyid(proc.proowner) = 'postgres'
         and 'search_path=""' = any(
           coalesce(proc.proconfig, array[]::text[])
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: atomic CMS mutation RPC is missing or unsafe';
  end if;

  if coalesce(
       pg_catalog.has_function_privilege(
         'anon',
         pg_catalog.to_regprocedure(
           'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
         ),
         'execute'
       ),
       false
     )
     or coalesce(
       pg_catalog.has_function_privilege(
         'authenticated',
         pg_catalog.to_regprocedure(
           'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
         ),
         'execute'
       ),
       false
     )
     or not coalesce(
       pg_catalog.has_function_privilege(
         'service_role',
         pg_catalog.to_regprocedure(
           'public.mutate_cms_content(text,text,uuid,timestamp with time zone,jsonb,uuid)'
         ),
         'execute'
       ),
       false
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: atomic CMS mutation RPC ACL drift';
  end if;

  if pg_catalog.to_regclass('private.rate_limit_buckets') is null
     or pg_catalog.to_regprocedure(
       'public.consume_rate_limit(text,text,integer,integer)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.cleanup_rate_limit_buckets()'
     ) is null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: durable rate-limit objects are missing';
  end if;

  if coalesce(
       pg_catalog.has_function_privilege(
         'anon',
         pg_catalog.to_regprocedure(
           'public.consume_rate_limit(text,text,integer,integer)'
         ),
         'execute'
       ),
       false
     )
     or coalesce(
       pg_catalog.has_function_privilege(
         'authenticated',
         pg_catalog.to_regprocedure(
           'public.consume_rate_limit(text,text,integer,integer)'
         ),
         'execute'
       ),
       false
     )
     or not coalesce(
       pg_catalog.has_function_privilege(
         'service_role',
         pg_catalog.to_regprocedure(
           'public.consume_rate_limit(text,text,integer,integer)'
         ),
         'execute'
       ),
       false
     )
     or coalesce(
       pg_catalog.has_function_privilege(
         'anon',
         pg_catalog.to_regprocedure(
           'public.cleanup_rate_limit_buckets()'
         ),
         'execute'
       ),
       false
     )
     or coalesce(
       pg_catalog.has_function_privilege(
         'authenticated',
         pg_catalog.to_regprocedure(
           'public.cleanup_rate_limit_buckets()'
         ),
         'execute'
       ),
       false
     )
     or not coalesce(
       pg_catalog.has_function_privilege(
         'service_role',
         pg_catalog.to_regprocedure(
           'public.cleanup_rate_limit_buckets()'
         ),
         'execute'
       ),
       false
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: rate-limit RPC ACL drift';
  end if;

  if pg_catalog.has_table_privilege(
       'anon',
       'private.rate_limit_buckets',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'private.rate_limit_buckets',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'service_role',
       'private.rate_limit_buckets',
       'select'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: private rate-limit table is directly accessible';
  end if;

  select pg_catalog.string_agg(
    target.table_name,
    ', '
    order by target.table_name
  )
  into v_problem
  from pg_catalog.unnest(array[
    'about',
    'admin_audit_logs',
    'admin_remembered_devices',
    'admin_security_preferences',
    'admins',
    'certifications',
    'cms_content_revisions',
    'contact_messages',
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
    'resumes',
    'site_settings',
    'skills',
    'social_links',
    'uploads',
    'volunteering'
  ]::text[]) as target(table_name)
  where pg_catalog.has_table_privilege(
          'authenticated',
          pg_catalog.format('public.%I', target.table_name),
          'insert'
        )
     or pg_catalog.has_table_privilege(
          'authenticated',
          pg_catalog.format('public.%I', target.table_name),
          'update'
        )
     or pg_catalog.has_table_privilege(
          'authenticated',
          pg_catalog.format('public.%I', target.table_name),
          'delete'
        )
     or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('public.%I', target.table_name),
          'insert'
        )
     or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('public.%I', target.table_name),
          'update'
        )
     or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('public.%I', target.table_name),
          'delete'
        );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: browser role retains direct table DML',
      detail = v_problem;
  end if;

  select pg_catalog.string_agg(
    target.table_name,
    ', '
    order by target.table_name
  )
  into v_problem
  from pg_catalog.unnest(array[
    'about',
    'certifications',
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
    'resumes',
    'skills',
    'social_links',
    'volunteering'
  ]::text[]) as target(table_name)
  where pg_catalog.has_table_privilege(
          'service_role',
          pg_catalog.format('public.%I', target.table_name),
          'insert'
        )
     or pg_catalog.has_table_privilege(
          'service_role',
          pg_catalog.format('public.%I', target.table_name),
          'update'
        )
     or pg_catalog.has_table_privilege(
          'service_role',
          pg_catalog.format('public.%I', target.table_name),
          'delete'
        );

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: service_role can bypass atomic CMS mutation RPC',
      detail = v_problem;
  end if;

  if pg_catalog.has_table_privilege(
       'authenticated',
       'storage.objects',
       'insert'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'storage.objects',
       'update'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'storage.objects',
       'delete'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'storage.objects',
       'insert'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'storage.objects',
       'update'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'storage.objects',
       'delete'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: browser role retains direct storage DML';
  end if;

  select pg_catalog.string_agg(
    pg_catalog.format('%I.%I (%s)', policy.schemaname, policy.tablename, policy.policyname),
    '; '
    order by policy.schemaname, policy.tablename, policy.policyname
  )
  into v_problem
  from pg_catalog.pg_policies as policy
  where (
    (
        policy.schemaname = 'public'
        and policy.tablename = any(array[
          'about',
          'admin_audit_logs',
          'admin_remembered_devices',
          'admin_security_preferences',
          'admins',
          'certifications',
          'cms_content_revisions',
          'contact_messages',
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
          'resumes',
          'site_settings',
          'skills',
          'social_links',
          'uploads',
          'volunteering'
        ]::text[])
      )
      or (
        policy.schemaname = 'storage'
        and policy.tablename = 'objects'
      )
  )
    and policy.cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    and policy.roles::text[] && array[
      'public',
      'anon',
      'authenticated'
    ]::text[];

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: browser-role write policy remains',
      detail = v_problem;
  end if;

  -- Every public content table must have exactly one anon SELECT policy and one
  -- authenticated SELECT policy after consolidation.
  with content_tables(table_name) as (
    select *
    from pg_catalog.unnest(array[
      'about',
      'certifications',
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
      'resumes',
      'site_settings',
      'skills',
      'social_links',
      'volunteering'
    ]::text[])
  ),
  policy_counts as (
    select
      content_tables.table_name,
      pg_catalog.count(*) filter (
        where policy.cmd = 'SELECT'
          and policy.roles::text[] = array['anon']::text[]
      ) as anon_select_count,
      pg_catalog.count(*) filter (
        where policy.cmd = 'SELECT'
          and policy.roles::text[] = array['authenticated']::text[]
      ) as authenticated_select_count,
      pg_catalog.count(policy.policyname) as total_count
    from content_tables
    left join pg_catalog.pg_policies as policy
      on policy.schemaname = 'public'
     and policy.tablename = content_tables.table_name
    group by content_tables.table_name
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I anon=%s authenticated=%s total=%s',
      table_name,
      anon_select_count,
      authenticated_select_count,
      total_count
    ),
    '; '
    order by table_name
  )
  into v_problem
  from policy_counts
  where anon_select_count <> 1
     or authenticated_select_count <> 1
     or total_count <> 2;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: content policy consolidation is incomplete',
      detail = v_problem;
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename in ('uploads', 'cms_content_revisions')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: server-only table has a direct RLS policy';
  end if;

  if not pg_catalog.has_table_privilege(
       'service_role',
       'public.cms_content_revisions',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'service_role',
       'public.cms_content_revisions',
       'insert'
     )
     or pg_catalog.has_table_privilege(
       'service_role',
       'public.cms_content_revisions',
       'update'
     )
     or pg_catalog.has_table_privilege(
       'service_role',
       'public.cms_content_revisions',
       'delete'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: revision table is not RPC-owned and immutable';
  end if;

  if exists (
    select 1
    from public.uploads
    where (
      sha256 is not null
      and sha256 !~ '^[0-9a-f]{64}$'
    )
       or deletion_status not in ('active', 'pending', 'failed')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Portfolio hardening postflight failed: invalid upload lifecycle state';
  end if;
end;
$portfolio_hardening_postflight$;

commit;

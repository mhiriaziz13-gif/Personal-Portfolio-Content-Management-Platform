-- Contact-message compatibility prerequisite for portfolio hardening v1.
-- This migration is additive and transaction-scoped. It does not modify RLS,
-- grants, Realtime publications, storage policies, or unrelated tables.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('contact_messages_compatibility', 0)
);

do $contact_messages_compatibility_preflight$
declare
  v_problem text;
  v_expected_function_body text := $expected_function_body$
begin
  if new.status = 'new' then
    new.read_at := null;
    new.archived_at := null;
  elsif new.status = 'read' then
    if tg_op = 'INSERT' then
      new.read_at := pg_catalog.now();
    elsif old.status is distinct from new.status then
      new.read_at := pg_catalog.now();
    else
      new.read_at := coalesce(new.read_at, pg_catalog.now());
    end if;
    new.archived_at := null;
  elsif new.status = 'archived' then
    if tg_op = 'INSERT' then
      new.read_at := coalesce(new.read_at, pg_catalog.now());
      new.archived_at := pg_catalog.now();
    else
      new.read_at := coalesce(
        new.read_at,
        old.read_at,
        pg_catalog.now()
      );
      if old.status is distinct from new.status then
        new.archived_at := pg_catalog.now();
      else
        new.archived_at := coalesce(
          new.archived_at,
          pg_catalog.now()
        );
      end if;
    end if;
  else
    raise exception using
      errcode = '23514',
      message = 'Unsupported contact message status';
  end if;

  return new;
end;
$expected_function_body$;
  -- This exact legacy body was created by
  -- 202607130001_dynamic_messages_and_cms_settings.sql. It is the only
  -- pre-existing definition that may be upgraded to the pinned definition.
  v_legacy_function_body text := $legacy_function_body$
begin
  if new.status = 'new' then
    new.read_at = null;
    new.archived_at = null;
  elsif new.status = 'read' then
    if tg_op = 'INSERT' then
      new.read_at = now();
    elsif old.status is distinct from new.status then
      new.read_at = now();
    else
      new.read_at = coalesce(new.read_at, now());
    end if;
    new.archived_at = null;
  elsif new.status = 'archived' then
    if tg_op = 'INSERT' then
      new.read_at = coalesce(new.read_at, now());
      new.archived_at = now();
    else
      new.read_at = coalesce(new.read_at, old.read_at, now());
      if old.status is distinct from new.status then
        new.archived_at = now();
      else
        new.archived_at = coalesce(new.archived_at, now());
      end if;
    end if;
  end if;

  return new;
end;
$legacy_function_body$;
begin
  if pg_catalog.to_regclass('public.contact_messages') is null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: public.contact_messages is missing';
  end if;

  with expected_columns(column_name, udt_name) as (
    values
      ('id', 'uuid'),
      ('status', 'text'),
      ('created_at', 'timestamptz')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I expected %s, found %s',
      expected.column_name,
      expected.udt_name,
      coalesce(columns.udt_name, '<missing>')
    ),
    '; '
    order by expected.column_name
  )
  into v_problem
  from expected_columns as expected
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = 'contact_messages'
   and columns.column_name = expected.column_name
  where columns.column_name is null
     or columns.udt_name <> expected.udt_name;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: required column drift',
      detail = v_problem;
  end if;

  if pg_catalog.to_regprocedure('public.set_updated_at()') is null
     or not exists (
       select 1
       from pg_catalog.pg_proc as proc
       join pg_catalog.pg_namespace as namespace
         on namespace.oid = proc.pronamespace
       where proc.oid = pg_catalog.to_regprocedure('public.set_updated_at()')
         and namespace.nspname = 'public'
         and proc.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
         and not proc.prosecdef
         and 'search_path=pg_catalog' = any(
           coalesce(proc.proconfig, array[]::text[])
         )
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: public.set_updated_at() is missing or not pinned';
  end if;

  with optional_columns(column_name) as (
    values ('updated_at'), ('read_at'), ('archived_at')
  )
  select pg_catalog.string_agg(
    pg_catalog.format(
      '%I expected timestamptz, found %s',
      optional.column_name,
      columns.udt_name
    ),
    '; '
    order by optional.column_name
  )
  into v_problem
  from optional_columns as optional
  join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = 'contact_messages'
   and columns.column_name = optional.column_name
  where columns.udt_name <> 'timestamptz';

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: timestamp column drift',
      detail = v_problem;
  end if;

  select pg_catalog.string_agg(status_value, ', ' order by status_value)
  into v_problem
  from (
    select distinct coalesce(
      pg_catalog.lower(pg_catalog.btrim(status)),
      '<null>'
    ) as status_value
    from public.contact_messages
    where status is null
       or pg_catalog.lower(pg_catalog.btrim(status)) not in (
         'new',
         'read',
         'archived'
       )
  ) as unsupported;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: unsupported contact status values',
      detail = v_problem;
  end if;

  -- Permit only the repository's exact zero-argument current or legacy
  -- definition. Any overload is same-name drift even when the expected
  -- zero-argument function is also present.
  if exists (
    select 1
    from pg_catalog.pg_proc as proc
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    join pg_catalog.pg_language as language
      on language.oid = proc.prolang
    where namespace.nspname = 'public'
      and proc.proname = 'set_contact_message_status_timestamps'
      and not (
        pg_catalog.pg_get_function_identity_arguments(proc.oid) = ''
        and proc.prokind = 'f'
        and language.lanname = 'plpgsql'
        and proc.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
        and not proc.prosecdef
        and (
          (
            'search_path=pg_catalog' = any(
              coalesce(proc.proconfig, array[]::text[])
            )
            and pg_catalog.regexp_replace(
                  pg_catalog.btrim(proc.prosrc),
                  '[[:space:]]+',
                  ' ',
                  'g'
                )
                = pg_catalog.regexp_replace(
                    pg_catalog.btrim(v_expected_function_body),
                    '[[:space:]]+',
                    ' ',
                    'g'
                  )
          )
          or (
            'search_path=public' = any(
              coalesce(proc.proconfig, array[]::text[])
            )
            and pg_catalog.regexp_replace(
                  pg_catalog.btrim(proc.prosrc),
                  '[[:space:]]+',
                  ' ',
                  'g'
                )
                = pg_catalog.regexp_replace(
                    pg_catalog.btrim(v_legacy_function_body),
                    '[[:space:]]+',
                    ' ',
                    'g'
                  )
          )
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: same-name status function signature or definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_message_status_timestamps'
  )
  and not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    join pg_catalog.pg_attribute as status_column
      on status_column.attrelid = trigger_row.tgrelid
     and status_column.attname = 'status'
     and not status_column.attisdropped
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_message_status_timestamps'
      and not trigger_row.tgisinternal
      and trigger_row.tgfoid = pg_catalog.to_regprocedure(
            'public.set_contact_message_status_timestamps()'
          )
      and trigger_row.tgtype = 23
      and trigger_row.tgenabled = 'O'
      and trigger_row.tgnargs = 0
      and trigger_row.tgattr::text = status_column.attnum::text
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: status timestamp trigger definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_messages_updated_at'
  )
  and not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_messages_updated_at'
      and not trigger_row.tgisinternal
      and trigger_row.tgfoid = pg_catalog.to_regprocedure(
            'public.set_updated_at()'
          )
      and trigger_row.tgtype = 19
      and trigger_row.tgenabled = 'O'
      and trigger_row.tgnargs = 0
      and pg_catalog.btrim(trigger_row.tgattr::text) = ''
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: updated_at trigger definition drift';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.contact_messages'::pg_catalog.regclass
      and constraint_row.conname = 'contact_messages_status_check'
  )
  and not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.contact_messages'::pg_catalog.regclass
      and constraint_row.conname = 'contact_messages_status_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_expr(
                  constraint_row.conbin,
                  constraint_row.conrelid,
                  true
                ),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'status=anyarray[''new'',''read'',''archived'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: contact_messages_status_check definition drift';
  end if;

  if pg_catalog.to_regclass(
       'public.idx_contact_messages_status_created_at'
     ) is not null
     and not exists (
       select 1
       from pg_catalog.pg_index as index_row
       join pg_catalog.pg_class as index_relation
         on index_relation.oid = index_row.indexrelid
       join pg_catalog.pg_am as access_method
         on access_method.oid = index_relation.relam
       where index_row.indexrelid = pg_catalog.to_regclass(
               'public.idx_contact_messages_status_created_at'
             )
         and index_row.indrelid =
             'public.contact_messages'::pg_catalog.regclass
         and index_row.indisvalid
         and index_row.indisready
         and not index_row.indisunique
         and index_row.indpred is null
         and index_row.indexprs is null
         and index_row.indnkeyatts = 2
         and index_row.indnatts = 2
         and access_method.amname = 'btree'
         and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
             = 'status'
         and pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, true)
             = 'created_at'
         and index_row.indoption[0] = 0
         and index_row.indoption[1] = 3
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: idx_contact_messages_status_created_at definition drift';
  end if;
end;
$contact_messages_compatibility_preflight$;

alter table public.contact_messages
  add column if not exists updated_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.contact_messages
set status = pg_catalog.lower(pg_catalog.btrim(status))
where status is distinct from pg_catalog.lower(pg_catalog.btrim(status));

update public.contact_messages
set updated_at = coalesce(
  updated_at,
  created_at,
  pg_catalog.now()
)
where updated_at is null;

update public.contact_messages
set
  read_at = case
    when status = 'new' then null
    when status = 'archived' then coalesce(
      read_at,
      archived_at,
      updated_at,
      created_at,
      pg_catalog.now()
    )
    else coalesce(
      read_at,
      updated_at,
      created_at,
      pg_catalog.now()
    )
  end,
  archived_at = case
    when status = 'archived' then coalesce(
      archived_at,
      read_at,
      updated_at,
      created_at,
      pg_catalog.now()
    )
    else null
  end
where (status = 'new' and (read_at is not null or archived_at is not null))
   or (status = 'read' and (read_at is null or archived_at is not null))
   or (status = 'archived' and (read_at is null or archived_at is null));

alter table public.contact_messages
  alter column updated_at set default pg_catalog.now(),
  alter column updated_at set not null,
  alter column status set default 'new',
  alter column status set not null;

do $contact_messages_status_constraint$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.contact_messages'::pg_catalog.regclass
      and constraint_row.conname = 'contact_messages_status_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_status_check
      check (status in ('new', 'read', 'archived'));
  end if;
end;
$contact_messages_status_constraint$;

create or replace function public.set_contact_message_status_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog
as $contact_message_status_function$
begin
  if new.status = 'new' then
    new.read_at := null;
    new.archived_at := null;
  elsif new.status = 'read' then
    if tg_op = 'INSERT' then
      new.read_at := pg_catalog.now();
    elsif old.status is distinct from new.status then
      new.read_at := pg_catalog.now();
    else
      new.read_at := coalesce(new.read_at, pg_catalog.now());
    end if;
    new.archived_at := null;
  elsif new.status = 'archived' then
    if tg_op = 'INSERT' then
      new.read_at := coalesce(new.read_at, pg_catalog.now());
      new.archived_at := pg_catalog.now();
    else
      new.read_at := coalesce(
        new.read_at,
        old.read_at,
        pg_catalog.now()
      );
      if old.status is distinct from new.status then
        new.archived_at := pg_catalog.now();
      else
        new.archived_at := coalesce(
          new.archived_at,
          pg_catalog.now()
        );
      end if;
    end if;
  else
    raise exception using
      errcode = '23514',
      message = 'Unsupported contact message status';
  end if;

  return new;
end;
$contact_message_status_function$;

do $contact_messages_triggers$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_message_status_timestamps'
  ) then
    create trigger set_contact_message_status_timestamps
      before insert or update of status on public.contact_messages
      for each row
      execute function public.set_contact_message_status_timestamps();
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_messages_updated_at'
  ) then
    create trigger set_contact_messages_updated_at
      before update on public.contact_messages
      for each row
      execute function public.set_updated_at();
  end if;
end;
$contact_messages_triggers$;

do $contact_messages_status_index$
begin
  if pg_catalog.to_regclass(
       'public.idx_contact_messages_status_created_at'
     ) is null then
    create index idx_contact_messages_status_created_at
      on public.contact_messages (status, created_at desc);
  end if;
end;
$contact_messages_status_index$;

do $contact_messages_compatibility_postflight$
declare
  v_problem text;
begin
  with expected_columns(column_name) as (
    values ('updated_at'), ('read_at'), ('archived_at')
  )
  select pg_catalog.string_agg(
    expected.column_name,
    ', '
    order by expected.column_name
  )
  into v_problem
  from expected_columns as expected
  left join information_schema.columns as columns
    on columns.table_schema = 'public'
   and columns.table_name = 'contact_messages'
   and columns.column_name = expected.column_name
   and columns.udt_name = 'timestamptz'
  where columns.column_name is null;

  if v_problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: timestamp columns are missing',
      detail = v_problem;
  end if;

  if exists (
    select 1
    from public.contact_messages
    where updated_at is null
       or status not in ('new', 'read', 'archived')
       or (status = 'new' and (read_at is not null or archived_at is not null))
       or (status = 'read' and (read_at is null or archived_at is not null))
       or (status = 'archived' and (read_at is null or archived_at is null))
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: invalid status/timestamp state';
  end if;

  if not exists (
    select 1
    from information_schema.columns as columns
    where columns.table_schema = 'public'
      and columns.table_name = 'contact_messages'
      and columns.column_name = 'updated_at'
      and columns.is_nullable = 'NO'
      and columns.column_default is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: updated_at is not enforced';
  end if;

  if not exists (
    select 1
    from information_schema.columns as columns
    where columns.table_schema = 'public'
      and columns.table_name = 'contact_messages'
      and columns.column_name = 'status'
      and columns.is_nullable = 'NO'
      and columns.column_default is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status is not enforced';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as proc
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    join pg_catalog.pg_language as language
      on language.oid = proc.prolang
    where proc.oid = pg_catalog.to_regprocedure(
            'public.set_contact_message_status_timestamps()'
          )
      and namespace.nspname = 'public'
      and language.lanname = 'plpgsql'
      and proc.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
      and not proc.prosecdef
      and 'search_path=pg_catalog' = any(
        coalesce(proc.proconfig, array[]::text[])
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status timestamp function is missing or unsafe';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    join pg_catalog.pg_attribute as status_column
      on status_column.attrelid = trigger_row.tgrelid
     and status_column.attname = 'status'
     and not status_column.attisdropped
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_message_status_timestamps'
      and not trigger_row.tgisinternal
      and trigger_row.tgfoid = pg_catalog.to_regprocedure(
            'public.set_contact_message_status_timestamps()'
          )
      and trigger_row.tgtype = 23
      and trigger_row.tgenabled = 'O'
      and trigger_row.tgnargs = 0
      and trigger_row.tgattr::text = status_column.attnum::text
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status trigger is missing or incompatible';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_messages_updated_at'
      and not trigger_row.tgisinternal
      and trigger_row.tgfoid = pg_catalog.to_regprocedure(
            'public.set_updated_at()'
          )
      and trigger_row.tgtype = 19
      and trigger_row.tgenabled = 'O'
      and trigger_row.tgnargs = 0
      and pg_catalog.btrim(trigger_row.tgattr::text) = ''
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: updated_at trigger is missing or incompatible';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
          'public.contact_messages'::pg_catalog.regclass
      and constraint_row.conname = 'contact_messages_status_check'
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
      and pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.replace(
                pg_catalog.pg_get_expr(
                  constraint_row.conbin,
                  constraint_row.conrelid,
                  true
                ),
                '::text',
                ''
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) = 'status=anyarray[''new'',''read'',''archived'']'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status constraint is missing or incompatible';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    join pg_catalog.pg_class as index_relation
      on index_relation.oid = index_row.indexrelid
    join pg_catalog.pg_am as access_method
      on access_method.oid = index_relation.relam
    where index_row.indexrelid = pg_catalog.to_regclass(
            'public.idx_contact_messages_status_created_at'
          )
      and index_row.indrelid = 'public.contact_messages'::pg_catalog.regclass
      and index_row.indisvalid
      and index_row.indisready
      and not index_row.indisunique
      and index_row.indpred is null
      and index_row.indexprs is null
      and index_row.indnkeyatts = 2
      and index_row.indnatts = 2
      and access_method.amname = 'btree'
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true)
          = 'status'
      and pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, true)
          = 'created_at'
      and index_row.indoption[0] = 0
      and index_row.indoption[1] = 3
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status/created_at index is missing or incompatible';
  end if;
end;
$contact_messages_compatibility_postflight$;

commit;

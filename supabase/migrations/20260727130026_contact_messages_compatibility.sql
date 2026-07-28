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
      pg_catalog.coalesce(columns.udt_name, '<missing>')
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

  if pg_catalog.to_regprocedure('public.set_updated_at()') is null then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility preflight failed: public.set_updated_at() is missing';
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
    select distinct pg_catalog.coalesce(
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
set updated_at = pg_catalog.coalesce(
  updated_at,
  created_at,
  pg_catalog.now()
)
where updated_at is null;

update public.contact_messages
set
  read_at = case
    when status = 'new' then null
    else pg_catalog.coalesce(
      read_at,
      updated_at,
      created_at,
      pg_catalog.now()
    )
  end,
  archived_at = case
    when status = 'archived' then pg_catalog.coalesce(
      archived_at,
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

alter table public.contact_messages
  drop constraint if exists contact_messages_status_check;

alter table public.contact_messages
  add constraint contact_messages_status_check
  check (status in ('new', 'read', 'archived'));

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
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      new.read_at := pg_catalog.now();
    else
      new.read_at := pg_catalog.coalesce(new.read_at, pg_catalog.now());
    end if;
    new.archived_at := null;
  elsif new.status = 'archived' then
    new.read_at := pg_catalog.coalesce(
      new.read_at,
      case when tg_op = 'UPDATE' then old.read_at else null end,
      pg_catalog.now()
    );
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      new.archived_at := pg_catalog.now();
    else
      new.archived_at := pg_catalog.coalesce(
        new.archived_at,
        pg_catalog.now()
      );
    end if;
  else
    raise exception using
      errcode = '23514',
      message = 'Unsupported contact message status';
  end if;

  return new;
end;
$contact_message_status_function$;

drop trigger if exists set_contact_message_status_timestamps
  on public.contact_messages;
create trigger set_contact_message_status_timestamps
  before insert or update of status on public.contact_messages
  for each row
  execute function public.set_contact_message_status_timestamps();

drop trigger if exists set_contact_messages_updated_at
  on public.contact_messages;
create trigger set_contact_messages_updated_at
  before update on public.contact_messages
  for each row
  execute function public.set_updated_at();

drop index if exists public.idx_contact_messages_status_created_at;
create index idx_contact_messages_status_created_at
  on public.contact_messages (status, created_at desc);

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
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_message_status_timestamps'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled <> 'D'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: status trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.contact_messages'::pg_catalog.regclass
      and trigger_row.tgname = 'set_contact_messages_updated_at'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled <> 'D'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Contact compatibility postflight failed: updated_at trigger is missing';
  end if;
end;
$contact_messages_compatibility_postflight$;

commit;

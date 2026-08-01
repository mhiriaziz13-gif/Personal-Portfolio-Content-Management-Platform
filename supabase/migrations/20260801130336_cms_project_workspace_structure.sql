-- Canonical, project-scoped case-study structure.
-- Existing portfolio copy is retained verbatim; missing rows are empty shells.

create table public.project_section_definitions (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  label text not null,
  description text,
  default_sort_order integer not null unique,
  default_section_type text not null,
  default_layout_variant text not null,
  default_visible boolean not null default false,
  is_required boolean not null default false,
  supports_items boolean not null default false,
  supports_media boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_section_definitions enable row level security;
grant select on public.project_section_definitions to anon, authenticated;
grant insert, update, delete on public.project_section_definitions to authenticated;

create policy "Canonical project section definitions are readable"
  on public.project_section_definitions for select to anon, authenticated
  using (is_active);
create policy "Admins manage project section definitions"
  on public.project_section_definitions for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger set_project_section_definitions_updated_at
  before update on public.project_section_definitions
  for each row execute function public.set_updated_at();

insert into public.project_section_definitions
  (section_key, label, description, default_sort_order, default_section_type,
   default_layout_variant, default_visible, is_required, supports_items, supports_media)
values
  ('overview', 'Overview', 'Summary of the project and its value.', 10, 'rich_text', 'default', true, true, true, true),
  ('business_context', 'Business and operational context', 'Business setting and operating constraints.', 20, 'rich_text', 'default', false, false, true, true),
  ('problem', 'The problem', 'Problem or opportunity addressed.', 30, 'rich_text', 'default', false, false, true, true),
  ('role_scope', 'Role and scope', 'Role, ownership and boundaries.', 40, 'rich_text', 'default', false, false, true, false),
  ('contribution', 'Ahmed''s contribution', 'Specific contribution to the work.', 50, 'rich_text', 'default', false, false, true, true),
  ('approach_evidence', 'Approach and evidence', 'Approach with supporting evidence.', 60, 'rich_text', 'default', false, false, true, true),
  ('approach', 'Approach', 'Method and execution.', 70, 'rich_text', 'default', false, false, true, true),
  ('workflow_architecture', 'Workflow or architecture', 'Workflow or system architecture.', 80, 'rich_text', 'default', false, false, true, true),
  ('tools_technologies', 'Tools and technologies', 'Tools and technologies used.', 90, 'rich_text', 'default', false, false, true, true),
  ('deliverables', 'Deliverables', 'Outputs produced.', 100, 'rich_text', 'default', false, false, true, true),
  ('validation_safeguards', 'Validation and safeguards', 'Checks, controls and safeguards.', 110, 'rich_text', 'default', false, false, true, true),
  ('qualitative_outcome', 'Qualitative outcome', 'Observed qualitative results.', 120, 'rich_text', 'default', false, false, true, true),
  ('outcome_limits', 'Outcome and limits', 'Outcomes and explicit limitations.', 130, 'rich_text', 'default', false, false, true, false),
  ('what_i_learned', 'What I learned', 'Lessons and reflection.', 140, 'rich_text', 'default', false, false, true, false),
  ('related_expertise', 'Related expertise', 'Related capability and domain knowledge.', 150, 'rich_text', 'default', false, false, true, false),
  ('related_experience', 'Related experience', 'Relevant professional experience.', 160, 'rich_text', 'default', false, false, true, false);

alter table public.project_sections
  add column definition_id uuid references public.project_section_definitions(id) on delete restrict;

-- Immutable snapshots make the cleanup auditable and reversible by operators.
create table private.project_sections_snapshot_20260801 as
  select now() as captured_at, section.* from public.project_sections section;
create table private.project_section_items_snapshot_20260801 as
  select now() as captured_at, item.* from public.project_section_items item;
revoke all on private.project_sections_snapshot_20260801 from public, anon, authenticated;
revoke all on private.project_section_items_snapshot_20260801 from public, anon, authenticated;

create table private.project_section_structure_migration_report (
  project_id uuid primary key,
  project_title text not null,
  canonical_definition_count integer not null,
  rows_before integer not null,
  rows_after integer not null default 0,
  rows_added integer not null default 0,
  rows_merged_or_removed integer not null default 0,
  child_items_before integer not null default 0,
  child_items_after integer not null default 0,
  visible_sections integer not null default 0,
  empty_visible_sections integer not null default 0,
  missing_definitions text[] not null default '{}',
  duplicate_definitions text[] not null default '{}',
  duplicate_project_orders integer[] not null default '{}',
  recorded_at timestamptz not null default now()
);
revoke all on private.project_section_structure_migration_report from public, anon, authenticated;

insert into private.project_section_structure_migration_report
  (project_id, project_title, canonical_definition_count, rows_before, child_items_before,
   missing_definitions, duplicate_definitions, duplicate_project_orders)
select p.id, p.title,
  (select count(*) from public.project_section_definitions d where d.is_active),
  count(distinct s.id), count(distinct i.id),
  coalesce((select array_agg(d.section_key order by d.default_sort_order)
    from public.project_section_definitions d where d.is_active and not exists (
      select 1 from public.project_sections sx where sx.project_id=p.id and sx.definition_id=d.id)), '{}'),
  '{}'::text[],
  coalesce((select array_agg(x.sort_order order by x.sort_order) from (
    select sort_order from public.project_sections where project_id=p.id
    group by sort_order having count(*) > 1) x), '{}')
from public.projects p
left join public.project_sections s on s.project_id=p.id
left join public.project_section_items i on i.project_section_id=s.id
where p.status <> 'archived'
group by p.id, p.title;

-- Normalize known historic title spellings and punctuation.
update public.project_sections s set definition_id=d.id
from public.project_section_definitions d
where s.definition_id is null and d.section_key = case
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('overview','project_overview') then 'overview'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('business_context','business_and_operational_context','business_operational_context') then 'business_context'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('problem','the_problem') then 'problem'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('role_scope','role_and_scope') then 'role_scope'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('ahmed_s_contribution','ahmed_contribution','contribution') then 'contribution'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('approach_and_evidence','approach_evidence') then 'approach_evidence'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) = 'approach' then 'approach'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('workflow_or_architecture','workflow_architecture') then 'workflow_architecture'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('tools_and_technologies','tools_technologies') then 'tools_technologies'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) = 'deliverables' then 'deliverables'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('validation_and_safeguards','validation_safeguards') then 'validation_safeguards'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) = 'qualitative_outcome' then 'qualitative_outcome'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('outcome_and_limits','outcome_limits') then 'outcome_limits'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) in ('what_i_learned','what_i_learnt') then 'what_i_learned'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) = 'related_expertise' then 'related_expertise'
  when lower(regexp_replace(trim(s.title), '[^a-z0-9]+', '_', 'g')) = 'related_experience' then 'related_experience'
  else null end;

-- Rank duplicate canonical rows: meaningful visible content wins, then newest row.
create temporary table project_section_dedupe on commit drop as
select id, first_value(id) over (
  partition by project_id, definition_id
  order by (is_visible and not is_archived) desc,
    (nullif(trim(coalesce(body,'')), '') is not null or cardinality(bullets)>0) desc,
    updated_at desc, id
) retained_id
from public.project_sections where definition_id is not null;

update public.project_section_items item set project_section_id=map.retained_id
from project_section_dedupe map where item.project_section_id=map.id and map.id<>map.retained_id;

-- Append otherwise-lost duplicate copy and bullets to the retained row without rewriting it.
with groups as (select distinct retained_id from project_section_dedupe), merged as (
  select groups.retained_id,
    (select string_agg(nullif(trim(s.body), ''), E'\n\n' order by (s.id=groups.retained_id) desc, s.updated_at desc)
      filter (where nullif(trim(s.body), '') is not null)
      from project_section_dedupe map join public.project_sections s on s.id=map.id
      where map.retained_id=groups.retained_id) as body,
    (select coalesce(array_agg(distinct bullet) filter(where trim(bullet)<>''), '{}')
      from project_section_dedupe map join public.project_sections s on s.id=map.id
      cross join lateral unnest(s.bullets) bullet where map.retained_id=groups.retained_id) as bullets,
    (select bool_or(s.is_visible) from project_section_dedupe map
      join public.project_sections s on s.id=map.id where map.retained_id=groups.retained_id) as is_visible
  from groups
)
update public.project_sections kept set body=coalesce(merged.body, kept.body),
  bullets=merged.bullets, is_visible=merged.is_visible, is_archived=false
from merged where kept.id=merged.retained_id;

with removed as (
  delete from public.project_sections s using project_section_dedupe map
  where s.id=map.id and map.id<>map.retained_id returning s.project_id
)
update private.project_section_structure_migration_report report
set rows_merged_or_removed=x.count
from (select project_id,count(*)::integer count from removed group by project_id) x
where report.project_id=x.project_id;

-- Free the canonical order range before assigning stable per-project values.
update public.project_sections set sort_order = 1000000 + row_number
from (select id, row_number() over(partition by project_id order by sort_order,id) row_number
      from public.project_sections) numbered
where project_sections.id=numbered.id;

insert into public.project_sections
  (project_id, definition_id, title, body, bullets, sort_order, section_type,
   layout_variant, is_visible, is_archived)
select p.id,d.id,d.label,'','{}',d.default_sort_order,d.default_section_type,
  d.default_layout_variant,d.default_visible,false
from public.projects p cross join public.project_section_definitions d
where p.status<>'archived' and d.is_active and not exists (
  select 1 from public.project_sections s where s.project_id=p.id and s.definition_id=d.id);

update public.project_sections s set sort_order=d.default_sort_order
from public.project_section_definitions d where s.definition_id=d.id;

-- Custom sections remain supported and follow the canonical block.
with custom_orders as (
  select id, 1000 + row_number() over(partition by project_id order by sort_order,id)*10 new_order
  from public.project_sections where definition_id is null)
update public.project_sections s set sort_order=c.new_order from custom_orders c where s.id=c.id;

alter table public.project_sections
  add constraint project_sections_project_definition_unique unique (project_id, definition_id);
alter table public.project_sections
  add constraint project_sections_project_order_unique unique (project_id, sort_order)
  deferrable initially immediate;

-- Existing child order values may collide only after duplicate parents merge.
with item_orders as (
  select id, (row_number() over(partition by project_section_id order by display_order,id)-1)*10 new_order
  from public.project_section_items)
update public.project_section_items item set display_order=ordered.new_order
from item_orders ordered where item.id=ordered.id;

alter table public.project_section_items
  add constraint project_section_items_parent_order_unique
  unique (project_section_id, display_order) deferrable initially immediate;

create index project_sections_definition_id_idx on public.project_sections(definition_id);

update private.project_section_structure_migration_report report set
  rows_after=x.rows_after,
  rows_added=greatest(x.rows_after-report.rows_before+report.rows_merged_or_removed,0),
  child_items_after=x.child_items,
  visible_sections=x.visible_sections,
  empty_visible_sections=x.empty_visible_sections
from (
  select p.id, count(distinct s.id)::integer rows_after, count(distinct i.id)::integer child_items,
    count(distinct s.id) filter(where s.is_visible)::integer visible_sections,
    count(distinct s.id) filter(where s.is_visible and nullif(trim(coalesce(s.body,'')),'') is null
      and cardinality(s.bullets)=0)::integer empty_visible_sections
  from public.projects p left join public.project_sections s on s.project_id=p.id
  left join public.project_section_items i on i.project_section_id=s.id
  where p.status<>'archived' group by p.id) x where report.project_id=x.id;

update private.project_section_structure_migration_report report set
  missing_definitions=coalesce((select array_agg(d.section_key order by d.default_sort_order)
    from public.project_section_definitions d where d.is_active and not exists (
      select 1 from public.project_sections s where s.project_id=report.project_id and s.definition_id=d.id)), '{}'),
  duplicate_definitions=coalesce((select array_agg(d.section_key order by d.default_sort_order)
    from public.project_section_definitions d where exists (
      select 1 from public.project_sections s where s.project_id=report.project_id and s.definition_id=d.id
      group by s.definition_id having count(*)>1)), '{}'),
  duplicate_project_orders=coalesce((select array_agg(orders.sort_order order by orders.sort_order)
    from (select sort_order from public.project_sections where project_id=report.project_id
      group by sort_order having count(*)>1) orders), '{}');

create or replace function public.ensure_project_section_structure(target_project_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin authorization required' using errcode='42501'; end if;
  if not exists (select 1 from public.projects where id=target_project_id and status<>'archived') then
    raise exception 'active project not found' using errcode='P0002';
  end if;
  update public.project_sections s set sort_order = moved.base_order + moved.new_order * 10
  from (select conflicts.id, row_number() over(order by conflicts.sort_order,conflicts.id) new_order,
          bounds.base_order
        from public.project_sections conflicts cross join lateral (
          select coalesce(max(all_sections.sort_order),1000) + 100 base_order
          from public.project_sections all_sections where all_sections.project_id=target_project_id) bounds
        where conflicts.project_id=target_project_id and conflicts.definition_id is null
          and conflicts.sort_order in (select default_sort_order from public.project_section_definitions where is_active)) moved
  where s.id=moved.id;
  insert into public.project_sections
    (project_id,definition_id,title,body,bullets,sort_order,section_type,layout_variant,is_visible,is_archived)
  select target_project_id,d.id,d.label,'','{}',d.default_sort_order,d.default_section_type,
    d.default_layout_variant,d.default_visible,false
  from public.project_section_definitions d where d.is_active
  on conflict (project_id,definition_id) do nothing;
  select jsonb_build_object(
    'projectId',target_project_id,
    'added',coalesce(jsonb_agg(d.section_key order by d.default_sort_order)
      filter(where s.created_at >= transaction_timestamp()),'[]'::jsonb),
    'retained',coalesce(jsonb_agg(d.section_key order by d.default_sort_order)
      filter(where s.created_at < transaction_timestamp()),'[]'::jsonb),
    'deduplicated','[]'::jsonb)
  into result from public.project_section_definitions d
  join public.project_sections s on s.definition_id=d.id and s.project_id=target_project_id
  where d.is_active;
  return result;
end $$;
revoke execute on function public.ensure_project_section_structure(uuid) from public, anon;
grant execute on function public.ensure_project_section_structure(uuid) to authenticated, service_role;

create or replace function private.provision_project_section_structure()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'archived' then
    insert into public.project_sections
      (project_id,definition_id,title,body,bullets,sort_order,section_type,layout_variant,is_visible,is_archived)
    select new.id,d.id,d.label,'','{}',d.default_sort_order,d.default_section_type,
      d.default_layout_variant,d.default_visible,false
    from public.project_section_definitions d where d.is_active
    on conflict (project_id,definition_id) do nothing;
  end if;
  return new;
end $$;
revoke execute on function private.provision_project_section_structure() from public, anon, authenticated;
create trigger provision_project_section_structure
  after insert or update of status on public.projects for each row
  execute function private.provision_project_section_structure();

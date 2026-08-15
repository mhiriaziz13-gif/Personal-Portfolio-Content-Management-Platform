-- Correct the legacy-title normalization order from the preceding migration.
-- Lowercase first, then replace punctuation, so uppercase titles map correctly.
create table private.project_sections_snapshot_20260801_correction as
  select now() as captured_at, section.* from public.project_sections section;
revoke all on private.project_sections_snapshot_20260801_correction from public, anon, authenticated;

alter table public.project_sections drop constraint project_sections_project_definition_unique;

update public.project_sections s set definition_id=d.id
from public.project_section_definitions d
where s.definition_id is null and d.section_key = case
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('overview','project_overview') then 'overview'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('business_context','business_and_operational_context','business_operational_context') then 'business_context'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('problem','the_problem') then 'problem'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('role_scope','role_and_scope') then 'role_scope'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('ahmed_s_contribution','ahmed_contribution','contribution') then 'contribution'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('approach_and_evidence','approach_evidence') then 'approach_evidence'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') = 'approach' then 'approach'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('workflow_or_architecture','workflow_architecture') then 'workflow_architecture'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('tools_and_technologies','tools_technologies') then 'tools_technologies'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') = 'deliverables' then 'deliverables'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('validation_and_safeguards','validation_safeguards') then 'validation_safeguards'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') = 'qualitative_outcome' then 'qualitative_outcome'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('outcome_and_limits','outcome_limits') then 'outcome_limits'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') in ('what_i_learned','what_i_learnt') then 'what_i_learned'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') = 'related_expertise' then 'related_expertise'
  when regexp_replace(lower(trim(s.title)), '[^a-z0-9]+', '_', 'g') = 'related_experience' then 'related_experience'
  else null end;

create temporary table corrected_project_section_dedupe on commit drop as
select id, project_id, first_value(id) over (
  partition by project_id, definition_id
  order by (is_visible and not is_archived) desc,
    (nullif(trim(coalesce(body,'')), '') is not null or cardinality(bullets)>0) desc,
    created_at asc, id
) retained_id
from public.project_sections where definition_id is not null;

update public.project_section_items item set project_section_id=map.retained_id
from corrected_project_section_dedupe map
where item.project_section_id=map.id and map.id<>map.retained_id;

with groups as (select distinct retained_id from corrected_project_section_dedupe), merged as (
  select groups.retained_id,
    (select string_agg(nullif(trim(s.body), ''), E'\n\n' order by (s.id=groups.retained_id) desc, s.created_at asc)
      filter(where nullif(trim(s.body), '') is not null)
      from corrected_project_section_dedupe map join public.project_sections s on s.id=map.id
      where map.retained_id=groups.retained_id) body,
    (select coalesce(array_agg(distinct bullet) filter(where trim(bullet)<>''), '{}')
      from corrected_project_section_dedupe map join public.project_sections s on s.id=map.id
      cross join lateral unnest(s.bullets) bullet where map.retained_id=groups.retained_id) bullets,
    (select bool_or(s.is_visible) from corrected_project_section_dedupe map
      join public.project_sections s on s.id=map.id where map.retained_id=groups.retained_id) is_visible
  from groups
)
update public.project_sections kept set body=coalesce(merged.body,kept.body),
  bullets=merged.bullets, is_visible=merged.is_visible, is_archived=false
from merged where kept.id=merged.retained_id;

create temporary table corrected_project_section_removals on commit drop as
select project_id, count(*)::integer removed
from corrected_project_section_dedupe where id<>retained_id group by project_id;

delete from public.project_sections s using corrected_project_section_dedupe map
where s.id=map.id and map.id<>map.retained_id;

update public.project_sections s set sort_order=d.default_sort_order
from public.project_section_definitions d where s.definition_id=d.id;

alter table public.project_sections
  add constraint project_sections_project_definition_unique unique (project_id, definition_id);

update private.project_section_structure_migration_report report set
  rows_after=counts.rows_after,
  rows_merged_or_removed=report.rows_merged_or_removed+coalesce(removals.removed,0),
  child_items_after=counts.child_items,
  visible_sections=counts.visible_sections,
  empty_visible_sections=counts.empty_visible_sections
from (
  select p.id, count(distinct s.id)::integer rows_after, count(distinct i.id)::integer child_items,
    count(distinct s.id) filter(where s.is_visible)::integer visible_sections,
    count(distinct s.id) filter(where s.is_visible and nullif(trim(coalesce(s.body,'')),'') is null
      and cardinality(s.bullets)=0)::integer empty_visible_sections
  from public.projects p left join public.project_sections s on s.project_id=p.id
  left join public.project_section_items i on i.project_section_id=s.id
  where p.status<>'archived' group by p.id) counts
left join corrected_project_section_removals removals on removals.project_id=counts.id
where report.project_id=counts.id;

revoke insert, update, delete on public.project_section_definitions from authenticated;
drop policy if exists "Admins manage project section definitions" on public.project_section_definitions;

alter function public.ensure_project_section_structure(uuid) security invoker;
revoke execute on function public.ensure_project_section_structure(uuid) from service_role;

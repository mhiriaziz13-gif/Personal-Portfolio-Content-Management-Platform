begin;

-- ============================================================
-- WAVE 2B — PROJECT WORKSPACE RPC PERMISSION HARDENING
-- ============================================================

revoke execute
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
from public;


revoke execute
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
from anon;


revoke execute
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
from authenticated;


grant execute
on function public.mutate_project_workspace(
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  uuid
)
to service_role;


commit;
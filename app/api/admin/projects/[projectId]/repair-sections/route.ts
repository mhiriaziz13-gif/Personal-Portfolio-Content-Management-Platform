import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAdminAudit } from "@/lib/security/admin-auth";
import { jsonError, jsonOk } from "@/lib/security/http";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const admin = await requireAdminApi(request, { requireMfa: true });
  if (!admin.ok) return admin.response;
  const { projectId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) return jsonError("Invalid project.", 400);
  const result = await admin.supabase.rpc("ensure_project_section_structure", { target_project_id: projectId });
  if (result.error) return jsonError("Section structure could not be repaired.", 500, "repair_failed");
  const report = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data as Record<string, unknown> : {};
  await writeAdminAudit({ actorUserId: admin.user.id, action: "project_section_structure_repaired", entityType: "projects", entityId: projectId, metadata: report, request });
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  return jsonOk(report);
}

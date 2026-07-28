import { z } from "zod";

import type { MessageAction, MessageStatus } from "@/lib/cms-types";
import { deliverContactNotification } from "@/lib/contact-delivery";
import { requireAdminApi, writeAdminAudit } from "@/lib/security/admin-auth";
import { clientIp, jsonError, jsonOk } from "@/lib/security/http";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import {
  messageDeleteSchema,
  messageStatusSchema,
  messageUpdateSchema,
} from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const messageViewSchema = z.enum(["inbox", "archived", "all"]);

const messageFields = "id,name,email,message,source,status,created_at,updated_at,read_at,archived_at,delivery_status,delivery_attempts,last_delivery_attempt_at,next_delivery_attempt_at,delivered_at,delivery_error_code,provider_message_id";
const legacyMessageFields = "id,name,email,message,source,status,created_at";
const migrationColumns =
  /\b(updated_at|read_at|archived_at|delivery_status|delivery_attempts|last_delivery_attempt_at|next_delivery_attempt_at|delivered_at|delivery_error_code|provider_message_id)\b/i;

type SupabaseError = {
  code?: string;
  message?: string;
};

type LegacyMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string | null;
  status: string;
  created_at: string;
};

const isMissingMessageMigration = (error: SupabaseError | null) =>
  Boolean(
    error
      && (error.code === "42703" || error.code === "PGRST204")
      && migrationColumns.test(error.message ?? ""),
  );

const normalizeLegacyMessage = (message: LegacyMessage) => ({
  ...message,
  updated_at: message.created_at,
  read_at: null,
  archived_at: null,
  delivery_status: "not_requested",
  delivery_attempts: 0,
  last_delivery_attempt_at: null,
  next_delivery_attempt_at: null,
  delivered_at: null,
  delivery_error_code: null,
  provider_message_id: null,
});

const logSupabaseError = (operation: string, error: SupabaseError) => {
  console.error("[api/admin/messages] Supabase operation failed", {
    operation,
    code: error.code,
    message: error.message,
  });
};

const logLegacyFallback = (operation: string, error: SupabaseError) => {
  console.warn("[api/admin/messages] Using legacy contact_messages schema", {
    operation,
    code: error.code,
  });
};

const actionStatus = {
  mark_read: "read",
  mark_unread: "new",
  archive: "archived",
  restore_read: "read",
  restore_unread: "new",
} satisfies Record<Exclude<MessageAction, "resend_notification">, MessageStatus>;

const auditAction = {
  mark_read: "contact_message_marked_read",
  mark_unread: "contact_message_marked_unread",
  archive: "contact_message_archived",
  restore_read: "contact_message_restored",
  restore_unread: "contact_message_restored",
  resend_notification: "contact_message_notification_retried",
} satisfies Record<MessageAction, string>;

const updateForAction = (
  action: Exclude<MessageAction, "resend_notification">,
  currentReadAt: string | null,
) => {
  const now = new Date().toISOString();
  const status = messageStatusSchema.parse(actionStatus[action]);

  if (status === "new") {
    return { status, read_at: null, archived_at: null };
  }

  if (status === "read") {
    return {
      status,
      read_at: action === "mark_read" ? now : (currentReadAt ?? now),
      archived_at: null,
    };
  }

  return {
    status,
    read_at: currentReadAt ?? now,
    archived_at: now,
  };
};

export async function GET(request: Request) {
  const admin = await requireAdminApi(request, { requireMfa: true, sameOrigin: false });
  if (!admin.ok) return admin.response;
  if (!isSupabaseAdminConfigured()) {
    return jsonError("CMS server configuration is incomplete.", 500, "server_error");
  }

  const url = new URL(request.url);
  const viewParsed = messageViewSchema.safeParse(url.searchParams.get("view") ?? "inbox");
  if (!viewParsed.success) {
    return jsonError("Invalid message view.", 400, "validation_error");
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("contact_messages")
    .select(messageFields)
    .order("created_at", { ascending: false })
    .limit(500);

  if (viewParsed.data === "inbox") {
    query = query.in("status", ["new", "read"]);
  } else if (viewParsed.data === "archived") {
    query = query.eq("status", "archived");
  }

  const { data, error } = await query;
  if (!error) return jsonOk({ messages: data ?? [] });

  if (!isMissingMessageMigration(error)) {
    logSupabaseError("list", error);
    return jsonError("Could not load messages.", 500, "server_error");
  }

  logLegacyFallback("list", error);
  let legacyQuery = supabase
    .from("contact_messages")
    .select(legacyMessageFields)
    .order("created_at", { ascending: false })
    .limit(500);

  if (viewParsed.data === "inbox") {
    legacyQuery = legacyQuery.in("status", ["new", "read"]);
  } else if (viewParsed.data === "archived") {
    legacyQuery = legacyQuery.eq("status", "archived");
  }

  const legacyResult = await legacyQuery;
  if (legacyResult.error) {
    logSupabaseError("list_legacy", legacyResult.error);
    return jsonError("Could not load messages.", 500, "server_error");
  }

  return jsonOk({
    messages: (legacyResult.data ?? []).map(normalizeLegacyMessage),
    migrationRequired: true,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, { requireMfa: true });
  if (!admin.ok) return admin.response;
  if (!isSupabaseAdminConfigured()) {
    return jsonError("CMS server configuration is incomplete.", 500, "server_error");
  }

  const parsed = messageUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid message update.", 400, "validation_error");
  }

  const limited = await consumeRateLimit({
    scope: parsed.success && parsed.data.action === "resend_notification"
      ? "admin_message_resend"
      : "admin_message_update",
    identifiers: [admin.user.id, clientIp(request)],
    limit: parsed.success && parsed.data.action === "resend_notification" ? 10 : 100,
    windowMs: 10 * 60 * 1_000,
  });
  if (!limited.allowed) return rateLimitResponse(limited);

  const supabase = createSupabaseAdminClient();

  if (parsed.data.action === "resend_notification") {
    const message = await supabase
      .from("contact_messages")
      .select("id,name,email,message")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (message.error) {
      return jsonError("Could not load the message.", 500, "server_error");
    }
    if (!message.data) return jsonError("Message not found.", 404, "not_found");

    await deliverContactNotification(message.data);
    const refreshed = await supabase
      .from("contact_messages")
      .select(messageFields)
      .eq("id", parsed.data.id)
      .single();
    if (refreshed.error) {
      return jsonError("Could not load delivery status.", 500, "server_error");
    }

    await writeAdminAudit({
      actorUserId: admin.user.id,
      action: auditAction.resend_notification,
      entityType: "contact_messages",
      entityId: parsed.data.id,
      request,
    });
    return jsonOk({ message: refreshed.data });
  }

  const existing = await supabase
    .from("contact_messages")
    .select("id, read_at")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (existing.error && !isMissingMessageMigration(existing.error)) {
    logSupabaseError("load_for_update", existing.error);
    return jsonError("Could not load the message.", 500, "server_error");
  }

  const useLegacySchema = isMissingMessageMigration(existing.error);
  let legacyExisting: { id: string } | null = null;

  if (useLegacySchema) {
    logLegacyFallback("load_for_update", existing.error!);
    const legacyResult = await supabase
      .from("contact_messages")
      .select("id")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (legacyResult.error) {
      logSupabaseError("load_for_update_legacy", legacyResult.error);
      return jsonError("Could not load the message.", 500, "server_error");
    }
    legacyExisting = legacyResult.data;
  }

  if (useLegacySchema ? !legacyExisting : !existing.data) {
    return jsonError("Message not found.", 404, "not_found");
  }

  const updateResult = useLegacySchema
    ? await supabase
      .from("contact_messages")
      .update({ status: actionStatus[parsed.data.action] })
      .eq("id", parsed.data.id)
      .select(legacyMessageFields)
      .single()
    : await supabase
      .from("contact_messages")
      .update(updateForAction(parsed.data.action, existing.data!.read_at))
      .eq("id", parsed.data.id)
      .select(messageFields)
      .single();

  if (updateResult.error) {
    logSupabaseError(useLegacySchema ? "update_legacy" : "update", updateResult.error);
    return jsonError("Could not update message.", 500, "server_error");
  }

  await writeAdminAudit({
    actorUserId: admin.user.id,
    action: auditAction[parsed.data.action],
    entityType: "contact_messages",
    entityId: parsed.data.id,
    metadata: parsed.data.action.startsWith("restore_")
      ? { restoredAs: actionStatus[parsed.data.action] }
      : { status: actionStatus[parsed.data.action] },
    request,
  });

  return jsonOk({
    message: useLegacySchema
      ? normalizeLegacyMessage(updateResult.data as LegacyMessage)
      : updateResult.data,
    migrationRequired: useLegacySchema,
  });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi(request, { requireMfa: true });
  if (!admin.ok) return admin.response;
  if (!isSupabaseAdminConfigured()) {
    return jsonError("CMS server configuration is incomplete.", 500, "server_error");
  }

  const parsed = messageDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid message deletion.", 400, "validation_error");
  }

  const limited = await consumeRateLimit({
    scope: "admin_message_delete",
    identifiers: [admin.user.id, clientIp(request)],
    limit: 10,
    windowMs: 60 * 60 * 1_000,
  });
  if (!limited.allowed) return rateLimitResponse(limited);

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("contact_messages")
    .select("id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (existing.error) {
    return jsonError("Could not load the message.", 500, "server_error");
  }
  if (!existing.data) return jsonError("Message not found.", 404, "not_found");
  if (existing.data.status !== "archived") {
    return jsonError(
      "Archive the message before permanently deleting it.",
      409,
      "archive_required",
    );
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", parsed.data.id)
    .eq("status", "archived")
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("delete", error);
    return jsonError("Could not delete message.", 500, "server_error");
  }
  if (!data) {
    return jsonError("Message not found.", 404, "not_found");
  }

  await writeAdminAudit({
    actorUserId: admin.user.id,
    action: "contact_message_deleted",
    entityType: "contact_messages",
    entityId: data.id,
    metadata: { permanentlyDeleted: true },
    request,
  });

  return jsonOk({ deletedId: data.id });
}

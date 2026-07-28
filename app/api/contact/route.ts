import { deliverContactNotification } from "@/lib/contact-delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { hmacSha256Hex } from "@/lib/security/crypto";
import { assertSameOrigin, clientIp, jsonError, jsonOk, userAgent } from "@/lib/security/http";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { verifyCaptcha } from "@/lib/security/captcha";
import { contactSchema } from "@/lib/security/validation";
import { writeAdminAudit } from "@/lib/security/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Please check the contact form fields.", 400);
    }

    if (parsed.data.company) {
      return jsonOk({ message: "Message received." }, 202);
    }

    const ip = clientIp(request);
    const limited = await consumeRateLimit({
      scope: "contact_submit",
      identifiers: [ip, parsed.data.email],
      limit: 5,
      windowMs: 10 * 60 * 1_000,
    });
    if (!limited.allowed) {
      return rateLimitResponse(
        limited,
        "Please wait before sending another message.",
      );
    }

    const captcha = await verifyCaptcha(parsed.data.captchaToken, ip);
    if (!captcha.ok) {
      return jsonError(
        "Human verification could not be completed.",
        403,
        "captcha_failed",
      );
    }

    if (!isSupabaseAdminConfigured()) {
      return jsonError(
        "Message delivery is temporarily unavailable.",
        503,
        "persistence_unavailable",
      );
    }

    const supabase = createSupabaseAdminClient();
    const privacySecret =
      process.env.PRIVACY_HMAC_SECRET?.trim()
      || process.env.RATE_LIMIT_HMAC_SECRET?.trim()
      || "";
    const hash = (value: string | null) =>
      value && privacySecret.length >= 32
        ? hmacSha256Hex(value, privacySecret)
        : null;

    const inserted = await supabase
      .from("contact_messages")
      .insert({
        submission_id: parsed.data.submissionId,
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
        source: "portfolio_contact_form",
        ip_hash: hash(ip),
        user_agent_hash: hash(userAgent(request)),
        delivery_status: "pending",
        delivery_attempts: 0,
      })
      .select("id,name,email,message")
      .single();

    if (inserted.error?.code === "23505") {
      const existing = await supabase
        .from("contact_messages")
        .select("id")
        .eq("submission_id", parsed.data.submissionId)
        .maybeSingle();
      if (!existing.data) {
        return jsonError("Message could not be saved right now.", 500);
      }

      return jsonOk(
        {
          message: "Message received. Thank you.",
          submissionId: parsed.data.submissionId,
        },
        202,
      );
    }

    if (inserted.error || !inserted.data) {
      return jsonError("Message could not be sent right now.", 500);
    }

    await writeAdminAudit({
      action: "contact_message_created",
      entityType: "contact_messages",
      entityId: inserted.data.id,
    });

    await deliverContactNotification(inserted.data);

    const response = jsonOk(
      {
        message: "Message received. Thank you.",
        submissionId: parsed.data.submissionId,
      },
      202,
    );
    response.headers.set("X-RateLimit-Remaining", String(limited.remaining));
    response.headers.set("X-RateLimit-Reset", new Date(limited.resetAt).toISOString());
    return response;
  } catch {
    return jsonError("Message could not be sent right now.", 400);
  }
}

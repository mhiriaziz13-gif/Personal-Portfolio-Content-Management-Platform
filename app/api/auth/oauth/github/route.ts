import { isCsrfTokenValid } from "@/lib/security/csrf";
import {
  clientIp,
  getTrustedRequestOrigin,
  isSameOrigin,
  jsonError,
  jsonOk,
} from "@/lib/security/http";
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { safeAdminRedirect } from "@/lib/security/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Request origin is not allowed.", 403, "origin_not_allowed");
  }
  if (!isCsrfTokenValid(request)) {
    return jsonError("CSRF token is missing or invalid.", 403, "csrf_invalid");
  }

  try {
    const limited = await consumeRateLimit({
      scope: "admin-github-oauth",
      identifiers: [clientIp(request)],
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited);
    }

    const body = await request.json().catch(() => ({})) as {
      next?: unknown;
    };
    const requestedNext = safeAdminRedirect(
      typeof body.next === "string" ? body.next : null,
      "/admin",
    );
    const next =
      requestedNext === "/admin" ||
      requestedNext.startsWith("/admin/")
        ? requestedNext
        : "/admin";
    const origin = getTrustedRequestOrigin(request);
    if (!origin) {
      return jsonError("Request origin is not allowed.", 403, "origin_not_allowed");
    }

    const supabase = await createSupabaseServerClient();
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", next);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: callback.toString() },
    });

    if (error || !data.url) {
      return jsonError(
        error?.code === "validation_failed"
          ? "GitHub login is disabled."
          : "GitHub login could not be started.",
        400,
        error?.code === "validation_failed"
          ? "github_disabled"
          : "github",
      );
    }

    return jsonOk({ redirectTo: data.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return jsonError(
      "GitHub login could not be started.",
      500,
      message.includes("environment variables")
        ? "supabase_config"
        : "github",
    );
  }
}

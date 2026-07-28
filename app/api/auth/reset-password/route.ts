import { NextResponse } from "next/server";

import {
  clearPasswordRecoveryCookie,
  clearRememberDeviceCookie,
  isPasswordRecoveryStateValid,
  passwordRecoveryStateFromRequest,
  revokeAllRememberedDevices,
  writeAdminAudit,
} from "@/lib/security/admin-auth";
import {
  clearCsrfCookie,
  isCsrfTokenValid,
} from "@/lib/security/csrf";
import {
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonHeaders,
} from "@/lib/security/http";
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { resetPasswordSchema } from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!isCsrfTokenValid(request)) {
      return jsonError(
        "CSRF token is missing or invalid.",
        403,
        "csrf_invalid",
      );
    }
    const parsed = resetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Choose a stronger password.", 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return jsonError("Recovery session is missing.", 401);
    }

    const recoveryState = await passwordRecoveryStateFromRequest(request);
    if (!isPasswordRecoveryStateValid(recoveryState, user.email)) {
      return jsonError(
        "Recovery session is missing or expired.",
        403,
        "recovery_required",
      );
    }

    const limited = await consumeRateLimit({
      scope: "admin-password-reset",
      identifiers: [user.id, clientIp(request)],
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });
    if (!limited.allowed) {
      return rateLimitResponse(
        limited,
        "Too many password reset attempts. Please try again later.",
      );
    }

    await revokeAllRememberedDevices(user.id, "password_reset");
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return jsonError("Password could not be updated.", 400);
    }

    await writeAdminAudit({ actorUserId: user.id, action: "password_reset_completed", request });
    await supabase.auth.signOut({ scope: "global" });

    const response = NextResponse.json(
      { ok: true, redirectTo: "/admin/login?reset=success" },
      { headers: jsonHeaders },
    );
    clearRememberDeviceCookie(response);
    clearPasswordRecoveryCookie(response);
    clearCsrfCookie(response);
    return response;
  } catch {
    return jsonError("Password could not be updated.", 400);
  }
}

import { NextResponse } from "next/server";

import {
  createPasswordRecoveryState,
  getAdminMembership,
  getMfaContext,
  isPasswordRecoveryStateValid,
  setPasswordRecoveryCookie,
  writeAdminAudit,
} from "@/lib/security/admin-auth";
import { noStoreHeaders } from "@/lib/security/headers";
import {
  getTrustedRequestOrigin,
  jsonError,
} from "@/lib/security/http";
import { safeRedirect } from "@/lib/security/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const redirectTo = (path: string, origin: string) =>
  NextResponse.redirect(new URL(path, origin), { headers: noStoreHeaders });

const loginError = (origin: string, code: string) =>
  redirectTo(`/admin/login?error=${encodeURIComponent(code)}`, origin);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const trustedOrigin = getTrustedRequestOrigin(request);
  if (!trustedOrigin) {
    return jsonError(
      "Authentication callback target is not allowed.",
      400,
      "origin_not_allowed",
    );
  }
  const providerError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const recoveryState = requestUrl.searchParams.get("recovery_state");
  const next = safeRedirect(requestUrl.searchParams.get("next"), "/admin");
  const isRecoveryDestination =
    new URL(next, trustedOrigin).pathname === "/admin/reset-password";

  if (providerError) {
    return loginError(trustedOrigin, "github_oauth_failed");
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return loginError(trustedOrigin, "supabase_config");
  }

  let verifiedRecoveryOtp = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      await writeAdminAudit({ action: "oauth_callback_exchange_failure", metadata: { code: error.code ?? null }, request });
      return loginError(
        trustedOrigin,
        isRecoveryDestination ? "recovery" : "callback",
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
    });
    if (error) return loginError(trustedOrigin, type === "recovery" ? "recovery" : "callback");
    verifiedRecoveryOtp = type === "recovery";
  } else {
    return loginError(trustedOrigin, "callback");
  }

  if (isRecoveryDestination) {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    const membership = user ? await getAdminMembership(user.id) : null;
    const verifiedRecoveryState =
      recoveryState && user?.email &&
      isPasswordRecoveryStateValid(recoveryState, user.email)
        ? recoveryState
        : verifiedRecoveryOtp && user?.email
          ? createPasswordRecoveryState(user.email)
          : null;

    if (
      error ||
      !user ||
      membership?.status !== "admin" ||
      !verifiedRecoveryState
    ) {
      await supabase.auth.signOut();
      return loginError(trustedOrigin, "recovery");
    }

    const response = redirectTo(next, trustedOrigin);
    setPasswordRecoveryCookie(response, verifiedRecoveryState);
    return response;
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const user = data.user;
  const membership = user ? await getAdminMembership(user.id) : null;

  if (userError || !user || !membership || membership.status !== "admin") {
    await supabase.auth.signOut();
    const reason = membership?.status === "server_error" ? "server" : "unauthorized";
    await writeAdminAudit({ actorUserId: user?.id ?? null, action: "oauth_login_failure", metadata: { reason }, request });
    return loginError(trustedOrigin, reason);
  }

  const mfa = await getMfaContext(supabase, user.id, request);

  if (mfa.mfaRequired && !mfa.mfaSatisfied) {
    await writeAdminAudit({ actorUserId: user.id, action: "mfa_challenge_required", request });
    if (!mfa.verifiedFactors.length) {
      return redirectTo("/admin/security?setup=mfa", trustedOrigin);
    }
    return redirectTo(`/admin/login?mfa=required&next=${encodeURIComponent(next)}`, trustedOrigin);
  }

  await writeAdminAudit({ actorUserId: user.id, action: "oauth_login_success", request });
  return redirectTo(next, trustedOrigin);
}

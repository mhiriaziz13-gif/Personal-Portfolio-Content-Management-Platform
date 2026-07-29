import { NextResponse } from "next/server";

import {
  getTrustedRequestOrigin,
  jsonError,
} from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trustedOrigin = getTrustedRequestOrigin(request);
  if (!trustedOrigin) {
    return jsonError(
      "Authentication confirmation target is not allowed.",
      400,
      "origin_not_allowed",
    );
  }
  const callback = new URL("/auth/callback", trustedOrigin);
  url.searchParams.forEach((value, key) => callback.searchParams.set(key, value));
  if (!callback.searchParams.has("next")) {
    callback.searchParams.set("next", "/admin/reset-password");
  }
  return NextResponse.redirect(callback);
}

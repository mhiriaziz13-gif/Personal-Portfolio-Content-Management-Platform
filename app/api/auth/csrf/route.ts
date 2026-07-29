import { NextResponse } from "next/server";

import {
  createCsrfToken,
  isValidCsrfTokenValue,
  readCsrfCookie,
  setCsrfCookie,
} from "@/lib/security/csrf";
import {
  isSameOrigin,
  jsonError,
  jsonHeaders,
} from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(
      "Request origin is not allowed.",
      403,
      "origin_not_allowed",
    );
  }

  const existing = readCsrfCookie(request);
  const token = isValidCsrfTokenValue(existing)
    ? existing as string
    : createCsrfToken();
  const response = NextResponse.json(
    { ok: true, token },
    { headers: jsonHeaders },
  );
  setCsrfCookie(response, token);
  return response;
}

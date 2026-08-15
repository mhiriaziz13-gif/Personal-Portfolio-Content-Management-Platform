import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isSupabaseConfigured,
  supabaseCookieOptions,
  supabaseEnv,
} from "@/lib/supabase/config";

const hasSupabaseAuthCookie = (request: NextRequest) =>
  request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

const isPrivatePath = (pathname: string) =>
  ["/admin", "/auth", "/api"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const preventCaching = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
};

export async function updateSession(request: NextRequest) {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(
    "x-admin-path",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  let response = NextResponse.next({ request: { headers: forwardedHeaders } });
  const privatePath = isPrivatePath(request.nextUrl.pathname);

  if (!isSupabaseConfigured()) {
    return privatePath ? preventCaching(response) : response;
  }

  // This mirrors the working portfolio: do not call Supabase /auth/v1/user when
  // the request has no Supabase auth cookie. That avoids stale session_not_found
  // checks on login, OAuth start, static routes, and fresh anonymous visits.
  if (!hasSupabaseAuthCookie(request)) {
    return privatePath ? preventCaching(response) : response;
  }

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet = {}) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request: { headers: forwardedHeaders } });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return preventCaching(response);
}

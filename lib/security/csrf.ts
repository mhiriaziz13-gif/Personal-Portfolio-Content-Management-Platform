import { randomBytes, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";

export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_TOKEN_ENDPOINT = "/api/auth/csrf";

const csrfTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export const csrfCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-aam_csrf"
    : "aam_csrf";

export const createCsrfToken = () =>
  randomBytes(32).toString("base64url");

const cookieValue = (request: Request, name: string) => {
  const requestWithCookies = request as Request & {
    cookies?: {
      get?: (cookieName: string) =>
        | { value?: string }
        | string
        | undefined;
    };
  };
  const value = requestWithCookies.cookies?.get?.(name);

  if (typeof value === "string") return value;
  if (value?.value) return value.value;

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }

  return null;
};

export const readCsrfCookie = (request: Request) =>
  cookieValue(request, csrfCookieName());

export const csrfTokenFromRequest = (request: Request) =>
  request.headers.get(CSRF_HEADER_NAME)?.trim() ?? null;

export const isValidCsrfTokenValue = (value: string | null) =>
  Boolean(value && csrfTokenPattern.test(value));

export const isCsrfTokenValid = (request: Request) => {
  const cookieToken = readCsrfCookie(request);
  const headerToken = csrfTokenFromRequest(request);

  if (
    !isValidCsrfTokenValue(cookieToken) ||
    !isValidCsrfTokenValue(headerToken)
  ) {
    return false;
  }

  const cookieBytes = Buffer.from(cookieToken as string);
  const headerBytes = Buffer.from(headerToken as string);
  return (
    cookieBytes.length === headerBytes.length &&
    timingSafeEqual(cookieBytes, headerBytes)
  );
};

export const isMutationRequest = (request: Request) =>
  !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());

export const csrfCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export const setCsrfCookie = (
  response: NextResponse,
  token: string,
) => {
  response.cookies.set(
    csrfCookieName(),
    token,
    csrfCookieOptions,
  );
};

export const clearCsrfCookie = (response: NextResponse) => {
  response.cookies.set(csrfCookieName(), "", {
    ...csrfCookieOptions,
    maxAge: 0,
  });
};

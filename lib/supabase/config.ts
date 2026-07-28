const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readEnv = (key: string) => process.env[key]?.trim() ?? "";

const isLocalHostname = (hostname: string) => {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized) ||
    /^::ffff:(?:127\.|7f[\da-f]{2}:)/.test(normalized)
  );
};

const isAllowedProductionOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !isLocalHostname(url.hostname)
    );
  } catch {
    return false;
  }
};

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "";

export const supabaseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const supabaseEnv = {
  // NEXT_PUBLIC values must use static property access so Next.js can inline
  // them in browser/edge bundles.
  url: supabaseUrl,
  anonKey: supabasePublishableKey,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
};

export const isSupabaseConfigured = () => Boolean(supabaseEnv.url && supabaseEnv.anonKey);

export const isSupabaseAdminConfigured = () =>
  Boolean(supabaseEnv.url && supabaseEnv.serviceRoleKey);

export const getAppUrl = () => {
  const configured = readEnv("APP_URL") || readEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
  return trimTrailingSlash(configured);
};

export const getPublicSiteUrl = () => {
  const configured = readEnv("NEXT_PUBLIC_SITE_URL") || readEnv("APP_URL") || "http://localhost:3000";
  return trimTrailingSlash(configured);
};

export const getAllowedOrigins = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const explicit = readEnv("ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const developmentOrigins = isProduction
    ? []
    : ["http://localhost:3000", "http://127.0.0.1:3000"];
  const previewOrigins = readEnv("VERCEL_ENV") === "preview"
    ? [readEnv("VERCEL_URL"), readEnv("VERCEL_BRANCH_URL")]
      .filter(Boolean)
      .map((hostname) => `https://${hostname.replace(/^https?:\/\//, "")}`)
    : [];

  return Array.from(
    new Set(
      [
        getAppUrl(),
        getPublicSiteUrl(),
        ...previewOrigins,
        ...developmentOrigins,
        ...explicit,
      ]
        .map(trimTrailingSlash)
        .filter((origin) => !isProduction || isAllowedProductionOrigin(origin)),
    ),
  );
};

export const requireAdminMfa = () => readEnv("REQUIRE_ADMIN_MFA").toLowerCase() === "true";

export const adminMfaRememberDays = () => {
  const days = Number(readEnv("ADMIN_MFA_REMEMBER_DAYS") || "14");
  if (!Number.isFinite(days)) return 14;
  return Math.min(30, Math.max(1, Math.trunc(days)));
};

export const adminDeviceHmacSecret = () =>
  readEnv("ADMIN_DEVICE_HMAC_SECRET")
  || readEnv("PRIVACY_HMAC_SECRET")
  || readEnv("RATE_LIMIT_HMAC_SECRET")
  || (process.env.NODE_ENV === "production" ? "" : supabaseEnv.serviceRoleKey);

export const assertSupabasePublicEnv = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase public environment variables are not configured.");
  }
};

export const assertSupabaseAdminEnv = () => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase service role environment variable is not configured.");
  }
};

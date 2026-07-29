export type AnalyticsConsentValue = "unknown" | "granted" | "denied";

type StoredAnalyticsConsent = {
  version: 1;
  analytics: Exclude<AnalyticsConsentValue, "unknown">;
  updatedAt: string;
};

export const ANALYTICS_CONSENT_STORAGE_KEY = "aam_analytics_consent_v1";
export const PRODUCTION_ANALYTICS_HOSTNAME = "ahmedaziz-portfolio.vercel.app";
export const ANALYTICS_EXCLUDED_PATH_PREFIXES = ["/admin", "/auth", "/api"] as const;

export const isPublicAnalyticsPath = (pathname: string) =>
  !ANALYTICS_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const isProductionAnalyticsHostname = (hostname: string) =>
  hostname.toLowerCase() === PRODUCTION_ANALYTICS_HOSTNAME;

export const isProductionAnalyticsLocation = () =>
  typeof window !== "undefined" &&
  isProductionAnalyticsHostname(window.location.hostname);

export const isAnalyticsCollectionAllowed = ({
  enabled,
  consent,
  hostname,
  pathname,
}: {
  enabled: boolean;
  consent: AnalyticsConsentValue;
  hostname: string;
  pathname: string;
}) =>
  enabled &&
  consent === "granted" &&
  isProductionAnalyticsHostname(hostname) &&
  isPublicAnalyticsPath(pathname);

export const isCurrentAnalyticsCollectionAllowed = (
  enabled: boolean,
  consent: AnalyticsConsentValue,
  pathname: string,
) =>
  typeof window !== "undefined" &&
  isAnalyticsCollectionAllowed({
    enabled,
    consent,
    hostname: window.location.hostname,
    pathname,
  });

export const clarityConsentState = (
  analyticsStorage: Exclude<AnalyticsConsentValue, "unknown">,
) => ({
  ad_Storage: "denied" as const,
  analytics_Storage: analyticsStorage,
});

export const readStoredAnalyticsConsent = (): AnalyticsConsentValue => {
  if (typeof window === "undefined") return "unknown";
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return "unknown";
    const stored: unknown = JSON.parse(raw);
    if (
      typeof stored !== "object" ||
      stored === null ||
      !("version" in stored) ||
      stored.version !== 1 ||
      !("analytics" in stored) ||
      (stored.analytics !== "granted" && stored.analytics !== "denied") ||
      !("updatedAt" in stored) ||
      typeof stored.updatedAt !== "string" ||
      Number.isNaN(Date.parse(stored.updatedAt))
    ) {
      return "unknown";
    }
    return stored.analytics;
  } catch {
    return "unknown";
  }
};

export const writeStoredAnalyticsConsent = (
  analytics: Exclude<AnalyticsConsentValue, "unknown">,
) => {
  const value: StoredAnalyticsConsent = {
    version: 1,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
};

export const clearStoredAnalyticsConsent = () => {
  try {
    window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
};

export const isAnalyticsConsentGranted = () =>
  readStoredAnalyticsConsent() === "granted";

const expireCookie = (name: string, domain?: string) => {
  const domainAttribute = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${domainAttribute}`;
};

export const clearAnalyticsCookies = () => {
  if (typeof document === "undefined") return;
  const analyticsCookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(
      (name) =>
        name === "_ga" ||
        name.startsWith("_ga_") ||
        name === "_gid" ||
        name === "_gat" ||
        name.startsWith("_gat_") ||
        name.startsWith("_gac_") ||
        name === "_clck" ||
        name === "_clsk",
    );
  const hostname = window.location.hostname;
  const domainVariants = [undefined, hostname, `.${hostname}`];
  for (const name of new Set(analyticsCookieNames)) {
    for (const domain of domainVariants) expireCookie(name, domain);
  }
};

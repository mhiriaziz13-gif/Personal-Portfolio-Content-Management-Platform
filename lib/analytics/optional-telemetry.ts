import {
  isAnalyticsCollectionAllowed,
  readStoredAnalyticsConsent,
} from "@/lib/analytics/consent";

export const filterOptionalTelemetry = <Event extends { url: string }>(
  event: Event,
): Event | null => {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(event.url, window.location.origin);
    if (
      !isAnalyticsCollectionAllowed({
        enabled: true,
        consent: readStoredAnalyticsConsent(),
        hostname: url.hostname,
        pathname: url.pathname,
      })
    ) {
      return null;
    }

    return {
      ...event,
      url: `${url.origin}${url.pathname}`,
    };
  } catch {
    return null;
  }
};

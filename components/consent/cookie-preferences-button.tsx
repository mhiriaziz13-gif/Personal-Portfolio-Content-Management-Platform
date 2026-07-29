"use client";

import { useAnalyticsConsent } from "@/components/analytics/analytics-consent-provider";

export const CookiePreferencesButton = () => {
  const consent = useAnalyticsConsent();

  if (!consent.isAvailable) return null;

  return (
    <button
      type="button"
      onClick={consent.openPreferences}
      data-analytics-preferences-trigger
      className="min-h-[44px] rounded px-1 transition hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
    >
      Analytics preferences
    </button>
  );
};

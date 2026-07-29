import type { AnalyticsDataLayerItem } from "@/lib/analytics/events";

export {};

type ConsentState = "granted" | "denied";

type ClarityFunction = {
  (...args: unknown[]): void;
  q?: unknown[][];
};

declare global {
  interface Window {
    dataLayer: AnalyticsDataLayerItem[];
    googleTagManagerLoaded?: boolean;
    microsoftClarityInitialized?: boolean;
    clarity?: ClarityFunction;
    gtag?: (
      command: "consent",
      action: "default" | "update",
      parameters: {
        analytics_storage: ConsentState;
        ad_storage: ConsentState;
        ad_user_data: ConsentState;
        ad_personalization: ConsentState;
        functionality_storage?: ConsentState;
        security_storage?: ConsentState;
        wait_for_update?: number;
      },
    ) => void;
  }
}

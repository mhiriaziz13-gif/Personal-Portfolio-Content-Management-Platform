"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";

import { AnalyticsPreferencesDialog } from "@/components/analytics/analytics-preferences-dialog";
import { ClarityLoader } from "@/components/analytics/clarity-loader";
import { GoogleTagManagerLoader } from "@/components/analytics/google-tag-manager-loader";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  type AnalyticsConsentValue,
  clearAnalyticsCookies,
  clarityConsentState,
  clearStoredAnalyticsConsent,
  isProductionAnalyticsLocation,
  isPublicAnalyticsPath,
  readStoredAnalyticsConsent,
  writeStoredAnalyticsConsent,
} from "@/lib/analytics/consent";
import { pushDataLayerEvent } from "@/lib/analytics/events";

type AnalyticsConsentContextValue = {
  consent: AnalyticsConsentValue;
  isAvailable: boolean;
  isPreferencesOpen: boolean;
  acceptAnalytics: () => void;
  rejectAnalytics: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);
const CONSENT_CHANGE_EVENT = "analytics-consent-change";

const subscribeToConsent = (onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CONSENT_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onStoreChange);
  };
};

const updateGoogleConsent = (value: "granted" | "denied") => {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
  window.gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
};

export const AnalyticsConsentProvider = ({
  children,
  analyticsEnabled,
  gtmId,
  clarityProjectId,
}: {
  children: React.ReactNode;
  analyticsEnabled: boolean;
  gtmId?: string;
  clarityProjectId?: string;
}) => {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeToConsent,
    readStoredAnalyticsConsent,
    (): AnalyticsConsentValue => "unknown",
  );
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const previousConsent = useRef<AnalyticsConsentValue>("unknown");
  const isAvailable =
    hydrated &&
    analyticsEnabled &&
    isPublicAnalyticsPath(pathname) &&
    isProductionAnalyticsLocation();

  const effectiveConsent =
    isAvailable && consent === "granted" ? "granted" : "denied";

  useEffect(() => {
    if (!hydrated) return;
    const withdrewConsent =
      previousConsent.current === "granted" && consent !== "granted";
    previousConsent.current = consent;

    updateGoogleConsent(effectiveConsent);
    if (effectiveConsent === "denied") {
      window.clarity?.("consentv2", clarityConsentState("denied"));
      clearAnalyticsCookies();
    }

    const enteredExcludedPath =
      consent === "granted" &&
      analyticsEnabled &&
      isProductionAnalyticsLocation() &&
      !isPublicAnalyticsPath(pathname);
    const optionalCollectorWasLoaded =
      window.googleTagManagerLoaded ||
      window.microsoftClarityInitialized ||
      window.vai ||
      window.sil;
    if (
      optionalCollectorWasLoaded &&
      (withdrewConsent || enteredExcludedPath)
    ) {
      window.setTimeout(() => window.location.reload(), 0);
    }
  }, [
    analyticsEnabled,
    consent,
    effectiveConsent,
    hydrated,
    pathname,
  ]);

  const saveConsent = useCallback(
    (value: "granted" | "denied") => {
      const stored = writeStoredAnalyticsConsent(value);
      if (!stored) {
        clearStoredAnalyticsConsent();
        if (value === "granted") {
          updateGoogleConsent("denied");
          clearAnalyticsCookies();
          setIsPreferencesOpen(false);
          window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
          return;
        }
      }

      updateGoogleConsent(value);
      pushDataLayerEvent({
        event: "analytics_consent_updated",
        analytics_consent: value,
      });
      if (value === "denied") {
        window.clarity?.("consentv2", clarityConsentState("denied"));
        clearAnalyticsCookies();
      }
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
      setIsPreferencesOpen(false);
    },
    [],
  );

  const acceptAnalytics = useCallback(
    () => saveConsent("granted"),
    [saveConsent],
  );
  const rejectAnalytics = useCallback(
    () => saveConsent("denied"),
    [saveConsent],
  );
  const closePreferences = useCallback(
    () => setIsPreferencesOpen(false),
    [],
  );
  const openPreferences = useCallback(() => {
    if (isAvailable) setIsPreferencesOpen(true);
  }, [isAvailable]);

  const contextValue: AnalyticsConsentContextValue = {
    consent,
    isAvailable,
    isPreferencesOpen,
    acceptAnalytics,
    rejectAnalytics,
    openPreferences,
    closePreferences,
  };

  const showBanner =
    hydrated && isAvailable && consent === "unknown";

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      {children}
      <GoogleTagManagerLoader
        enabled={analyticsEnabled}
        containerId={gtmId}
      />
      <PageViewTracker enabled={analyticsEnabled} />
      <ClarityLoader
        enabled={analyticsEnabled}
        projectId={clarityProjectId}
      />

      {showBanner && (
        <section
          aria-label="Analytics consent"
          aria-live="polite"
          hidden={isPreferencesOpen}
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-4xl rounded-2xl border border-white/15 bg-[#0b0920]/95 p-5 text-white shadow-2xl backdrop-blur-xl sm:p-6"
        >
          <h2 className="text-lg font-semibold">Your privacy choices</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            Optional Google Analytics, Microsoft Clarity, Vercel Web Analytics,
            and Speed Insights help measure aggregate visits and improve the
            portfolio. Advertising storage and personalization remain disabled.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={acceptAnalytics} className="min-h-[44px] rounded-lg border border-cyan-200/60 bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#030014] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              Accept analytics
            </button>
            <button type="button" onClick={rejectAnalytics} className="min-h-[44px] rounded-lg border border-cyan-200/60 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              Reject analytics
            </button>
            <button
              type="button"
              onClick={openPreferences}
              data-analytics-preferences-trigger
              className="min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium text-gray-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              Manage preferences
            </button>
          </div>
        </section>
      )}

      {hydrated && isAvailable && isPreferencesOpen && (
        <AnalyticsPreferencesDialog
          consent={consent}
          onAccept={acceptAnalytics}
          onClose={closePreferences}
          onReject={rejectAnalytics}
        />
      )}
    </AnalyticsConsentContext.Provider>
  );
};

export const useAnalyticsConsent = () => {
  const context = useContext(AnalyticsConsentContext);
  if (!context) throw new Error("useAnalyticsConsent must be used within AnalyticsConsentProvider");
  return context;
};

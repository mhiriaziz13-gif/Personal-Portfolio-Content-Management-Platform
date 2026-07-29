"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAnalyticsConsent } from "@/components/analytics/analytics-consent-provider";
import {
  clarityConsentState,
  isCurrentAnalyticsCollectionAllowed,
} from "@/lib/analytics/consent";

const CLARITY_PROJECT_ID = /^[a-z0-9]+$/i;

export const ClarityLoader = ({
  enabled,
  projectId,
}: {
  enabled: boolean;
  projectId?: string;
}) => {
  const pathname = usePathname();
  const { consent } = useAnalyticsConsent();

  useEffect(() => {
    const canCollect =
      Boolean(projectId && CLARITY_PROJECT_ID.test(projectId)) &&
      isCurrentAnalyticsCollectionAllowed(enabled, consent, pathname);
    if (!canCollect) {
      window.clarity?.("consentv2", clarityConsentState("denied"));
      return;
    }
    if (!projectId) return;

    window.clarity =
      window.clarity ||
      function clarity(...args: unknown[]) {
        (window.clarity!.q = window.clarity!.q || []).push(args);
      };

    let cancelled = false;
    void import("@microsoft/clarity").then(({ default: Clarity }) => {
      if (cancelled) return;
      if (!window.microsoftClarityInitialized) {
        Clarity.init(projectId);
        window.microsoftClarityInitialized = true;
      }
      Clarity.consentV2(clarityConsentState("granted"));
    });

    return () => {
      cancelled = true;
    };
  }, [consent, enabled, pathname, projectId]);

  return null;
};

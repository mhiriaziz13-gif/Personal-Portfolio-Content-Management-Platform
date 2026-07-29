"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAnalyticsConsent } from "@/components/analytics/analytics-consent-provider";
import {
  isCurrentAnalyticsCollectionAllowed,
} from "@/lib/analytics/consent";
import {
  isGoogleTagManagerId,
  loadGoogleTagManager,
} from "@/lib/analytics/google-tag-manager";

export const GoogleTagManagerLoader = ({
  enabled,
  containerId,
}: {
  enabled: boolean;
  containerId?: string;
}) => {
  const pathname = usePathname();
  const { consent } = useAnalyticsConsent();

  useEffect(() => {
    if (
      !isGoogleTagManagerId(containerId) ||
      !isCurrentAnalyticsCollectionAllowed(enabled, consent, pathname)
    ) {
      return;
    }

    loadGoogleTagManager(containerId);
  }, [consent, containerId, enabled, pathname]);

  return null;
};

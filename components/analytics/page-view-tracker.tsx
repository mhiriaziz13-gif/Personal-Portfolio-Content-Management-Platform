"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAnalyticsConsent } from "@/components/analytics/analytics-consent-provider";
import {
  isCurrentAnalyticsCollectionAllowed,
} from "@/lib/analytics/consent";
import { pushDataLayerEvent } from "@/lib/analytics/events";
import {
  createVirtualPageView,
  nextVirtualPageView,
} from "@/lib/analytics/page-view";

export const PageViewTracker = ({ enabled }: { enabled: boolean }) => {
  const pathname = usePathname();
  const { consent } = useAnalyticsConsent();
  const lastPageViewPathname = useRef<string | null>(null);

  useEffect(() => {
    if (
      consent !== "granted" ||
      !isCurrentAnalyticsCollectionAllowed(enabled, consent, pathname)
    ) {
      lastPageViewPathname.current = null;
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const candidate = createVirtualPageView({
        pathname,
        origin: window.location.origin,
        title: document.title,
      });
      const next = nextVirtualPageView(
        lastPageViewPathname.current,
        candidate,
      );
      if (!next) return;

      lastPageViewPathname.current = next.nextPathname;
      pushDataLayerEvent(next.event);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [consent, enabled, pathname]);

  return null;
};

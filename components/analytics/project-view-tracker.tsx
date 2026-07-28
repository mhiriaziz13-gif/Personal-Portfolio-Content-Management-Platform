"use client";

import { useEffect, useRef } from "react";

import { useAnalyticsConsent } from "@/components/analytics/analytics-consent-provider";
import { pushAnalyticsEvent } from "@/lib/analytics/events";

export function ProjectViewTracker({
  projectSlug,
  projectTitle,
}: {
  projectSlug: string;
  projectTitle: string;
}) {
  const { consent } = useAnalyticsConsent();
  const lastTrackedProject = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted") {
      lastTrackedProject.current = null;
      return;
    }

    const signature = `${projectSlug}|${projectTitle}`;
    if (lastTrackedProject.current === signature) return;

    const tracked = pushAnalyticsEvent({
      event: "project_view",
      project_slug: projectSlug,
      project_title: projectTitle,
    });
    if (tracked) lastTrackedProject.current = signature;
  }, [consent, projectSlug, projectTitle]);

  return null;
}

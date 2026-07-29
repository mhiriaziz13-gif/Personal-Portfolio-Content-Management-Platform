import { pushDataLayerEvent } from "@/lib/analytics/events";

export const GOOGLE_TAG_MANAGER_SCRIPT_ID = "google-tag-manager";
const GOOGLE_TAG_MANAGER_ID = /^GTM-[A-Z0-9]+$/;

export const isGoogleTagManagerId = (
  value: string | undefined,
): value is string =>
  typeof value === "string" && GOOGLE_TAG_MANAGER_ID.test(value);

export const loadGoogleTagManager = (
  containerId: string,
  loadedAt = Date.now(),
) => {
  if (
    !isGoogleTagManagerId(containerId) ||
    window.googleTagManagerLoaded ||
    document.getElementById(GOOGLE_TAG_MANAGER_SCRIPT_ID)
  ) {
    return false;
  }

  pushDataLayerEvent({
    "gtm.start": loadedAt,
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.id = GOOGLE_TAG_MANAGER_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  document.head.appendChild(script);
  window.googleTagManagerLoaded = true;
  return true;
};

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCTION_ANALYTICS_HOSTNAME,
  clarityConsentState,
  clearAnalyticsCookies,
  isAnalyticsCollectionAllowed,
  isPublicAnalyticsPath,
} from "@/lib/analytics/consent";
import { pushAnalyticsEvent } from "@/lib/analytics/events";
import { loadGoogleTagManager } from "@/lib/analytics/google-tag-manager";
import { filterOptionalTelemetry } from "@/lib/analytics/optional-telemetry";
import {
  createVirtualPageView,
  nextVirtualPageView,
} from "@/lib/analytics/page-view";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics collection gate", () => {
  const context = {
    enabled: true,
    hostname: PRODUCTION_ANALYTICS_HOSTNAME,
    pathname: "/projects",
  };

  it.each(["unknown", "denied"] as const)(
    "keeps optional analytics absent while consent is %s",
    (consent) => {
      expect(isAnalyticsCollectionAllowed({ ...context, consent })).toBe(false);
    },
  );

  it("allows collection only after a grant on a public production path", () => {
    expect(
      isAnalyticsCollectionAllowed({ ...context, consent: "granted" }),
    ).toBe(true);
    expect(
      isAnalyticsCollectionAllowed({
        ...context,
        consent: "granted",
        enabled: false,
      }),
    ).toBe(false);
    expect(
      isAnalyticsCollectionAllowed({
        ...context,
        consent: "granted",
        hostname: "preview.example.test",
      }),
    ).toBe(false);
  });

  it.each([
    "/admin",
    "/admin/login",
    "/auth",
    "/auth/callback",
    "/api",
    "/api/contact",
  ])("excludes the private path %s", (pathname) => {
    expect(isPublicAnalyticsPath(pathname)).toBe(false);
    expect(
      isAnalyticsCollectionAllowed({
        ...context,
        consent: "granted",
        pathname,
      }),
    ).toBe(false);
  });

  it("keeps every Clarity advertising state denied", () => {
    expect(clarityConsentState("granted")).toEqual({
      ad_Storage: "denied",
      analytics_Storage: "granted",
    });
    expect(clarityConsentState("denied")).toEqual({
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
  });
});

describe("Google Tag Manager loading", () => {
  it("inserts one script and one bootstrap event across repeated calls", () => {
    const scripts = new Map<string, Record<string, unknown>>();
    const dataLayer: Array<Record<string, unknown>> = [];
    const documentStub = {
      createElement: vi.fn(() => ({
        id: "",
        async: false,
        src: "",
      })),
      getElementById: vi.fn((id: string) => scripts.get(id) ?? null),
      head: {
        appendChild: vi.fn((script: { id: string }) => {
          scripts.set(script.id, script);
        }),
      },
    };
    vi.stubGlobal("window", {
      dataLayer,
      googleTagManagerLoaded: false,
    });
    vi.stubGlobal("document", documentStub);

    expect(loadGoogleTagManager("GTM-ABC123", 1234)).toBe(true);
    expect(loadGoogleTagManager("GTM-ABC123", 5678)).toBe(false);
    expect(documentStub.head.appendChild).toHaveBeenCalledTimes(1);
    expect(dataLayer).toEqual([
      { event: "gtm.js", "gtm.start": 1234 },
    ]);
    expect(scripts.get("google-tag-manager")).toMatchObject({
      async: true,
      src: "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123",
    });
  });
});

describe("typed application events", () => {
  it("pushes controlled events only with current public consent", () => {
    const dataLayer: Array<Record<string, unknown>> = [];
    const consent = {
      version: 1,
      analytics: "denied",
      updatedAt: "2026-07-29T10:00:00.000Z",
    };
    vi.stubGlobal("window", {
      dataLayer,
      localStorage: {
        getItem: () => JSON.stringify(consent),
      },
      location: {
        hostname: PRODUCTION_ANALYTICS_HOSTNAME,
        pathname: "/projects",
      },
    });
    const event = {
      event: "resume_view_click",
      cta_location: "hero",
    } as const;

    expect(pushAnalyticsEvent(event)).toBe(false);
    consent.analytics = "granted";
    expect(pushAnalyticsEvent(event)).toBe(true);
    expect(dataLayer).toEqual([event]);

    window.location.pathname = "/admin";
    expect(pushAnalyticsEvent(event)).toBe(false);
    expect(dataLayer).toHaveLength(1);
  });
});

describe("virtual page-view contract", () => {
  it("emits one initial event and one event per real pathname change", () => {
    let previousPathname: string | null = null;
    const emitted: string[] = [];

    for (const pathname of ["/", "/", "/about", "/about", "/projects"]) {
      const next = nextVirtualPageView(
        previousPathname,
        createVirtualPageView({
          pathname,
          origin: "https://ahmedaziz-portfolio.vercel.app",
          title: "Portfolio",
        }),
      );
      if (next) {
        emitted.push(next.event.page_path);
        previousPathname = next.nextPathname;
      }
    }

    expect(emitted).toEqual(["/", "/about", "/projects"]);
  });

  it("does not include query strings or fragments in page-view URLs", () => {
    expect(
      createVirtualPageView({
        pathname: "/contact?email=visitor@example.com#message",
        origin: "https://ahmedaziz-portfolio.vercel.app",
        title: "Contact",
      }),
    ).toEqual({
      event: "virtual_page_view",
      page_path: "/contact",
      page_location: "https://ahmedaziz-portfolio.vercel.app/contact",
      page_title: "Contact",
    });
  });
});

describe("Vercel telemetry filter", () => {
  it("rechecks consent and removes query strings before sending", () => {
    const localStorage = {
      getItem: vi.fn(() => JSON.stringify({
        version: 1,
        analytics: "granted",
        updatedAt: "2026-07-29T10:00:00.000Z",
      })),
    };
    vi.stubGlobal("window", {
      localStorage,
      location: {
        hostname: PRODUCTION_ANALYTICS_HOSTNAME,
        origin: `https://${PRODUCTION_ANALYTICS_HOSTNAME}`,
      },
    });

    expect(
      filterOptionalTelemetry({
        type: "pageview",
        url: `https://${PRODUCTION_ANALYTICS_HOSTNAME}/contact?email=visitor@example.com`,
      }),
    ).toEqual({
      type: "pageview",
      url: `https://${PRODUCTION_ANALYTICS_HOSTNAME}/contact`,
    });

    localStorage.getItem.mockReturnValue(JSON.stringify({
      version: 1,
      analytics: "denied",
      updatedAt: "2026-07-29T10:01:00.000Z",
    }));
    expect(
      filterOptionalTelemetry({
        type: "pageview",
        url: `https://${PRODUCTION_ANALYTICS_HOSTNAME}/projects`,
      }),
    ).toBeNull();
  });

  it("drops private-route telemetry even with stored consent", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => JSON.stringify({
          version: 1,
          analytics: "granted",
          updatedAt: "2026-07-29T10:00:00.000Z",
        }),
      },
      location: {
        hostname: PRODUCTION_ANALYTICS_HOSTNAME,
        origin: `https://${PRODUCTION_ANALYTICS_HOSTNAME}`,
      },
    });

    expect(
      filterOptionalTelemetry({
        type: "pageview",
        url: `https://${PRODUCTION_ANALYTICS_HOSTNAME}/admin/login`,
      }),
    ).toBeNull();
  });
});

describe("analytics cookie cleanup", () => {
  it("expires known GA and Clarity cookies without touching essential cookies", () => {
    const writes: string[] = [];
    const documentStub = {};
    Object.defineProperty(documentStub, "cookie", {
      configurable: true,
      get: () =>
        "_ga=one; _ga_PORTFOLIO=two; _gid=three; _gat=four; _gac_ads=five; _clck=six; _clsk=seven; essential_session=keep",
      set: (value: string) => writes.push(value),
    });
    vi.stubGlobal("document", documentStub);
    vi.stubGlobal("window", {
      location: { hostname: PRODUCTION_ANALYTICS_HOSTNAME },
    });

    clearAnalyticsCookies();

    expect(writes).toHaveLength(21);
    expect(writes.every((value) => value.includes("Max-Age=0"))).toBe(true);
    expect(writes.some((value) => value.startsWith("essential_session="))).toBe(
      false,
    );
  });
});

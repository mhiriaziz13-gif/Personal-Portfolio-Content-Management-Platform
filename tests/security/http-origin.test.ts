import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTrustedRequestOrigin,
  isSameOrigin,
} from "../../lib/security/http";

afterEach(() => {
  vi.unstubAllEnvs();
});

const request = (
  target: string,
  headers: Record<string, string>,
) =>
  new Request(target, {
    method: "POST",
    headers,
  });

describe("admin request origin validation", () => {
  it("accepts an exact configured target and exact same origin", () => {
    vi.stubEnv("APP_URL", "https://portfolio.example");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.example");
    const candidate = request(
      "https://portfolio.example/api/admin/content",
      {
        origin: "https://portfolio.example",
        "sec-fetch-site": "same-origin",
      },
    );

    expect(getTrustedRequestOrigin(candidate))
      .toBe("https://portfolio.example");
    expect(isSameOrigin(candidate)).toBe(true);
  });

  it.each([
    {
      target: "https://portfolio.example/api/admin/content",
      origin: "https://evil.example",
      site: "cross-site",
    },
    {
      target: "https://portfolio.example/api/admin/content",
      origin: "https://admin.portfolio.example",
      site: "same-site",
    },
    {
      target: "https://evil.example/api/admin/content",
      origin: "https://evil.example",
      site: "same-origin",
    },
  ])("rejects cross-origin or untrusted targets", ({ target, origin, site }) => {
    vi.stubEnv("APP_URL", "https://portfolio.example");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.example");
    expect(isSameOrigin(request(target, {
      origin,
      "sec-fetch-site": site,
    }))).toBe(false);
  });

  it("allows a configured preview only as its own target, not as a caller", () => {
    vi.stubEnv("APP_URL", "https://portfolio.example");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.example");
    vi.stubEnv("ALLOWED_ORIGINS", "https://preview.example");

    expect(isSameOrigin(request(
      "https://preview.example/api/admin/content",
      {
        origin: "https://preview.example",
        "sec-fetch-site": "same-origin",
      },
    ))).toBe(true);
    expect(isSameOrigin(request(
      "https://portfolio.example/api/admin/content",
      {
        origin: "https://preview.example",
        "sec-fetch-site": "same-origin",
      },
    ))).toBe(false);
  });
});

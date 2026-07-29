import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("contact privacy HMAC configuration", () => {
  it("does not fall back to the rate-limit credential", async () => {
    vi.stubEnv("PRIVACY_HMAC_SECRET", "");
    vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "r".repeat(64));
    const { privacyHmacSecret } = await import("@/lib/security/privacy");

    expect(privacyHmacSecret()).toBe("");
  });

  it("requires 32 non-whitespace UTF-8 bytes", async () => {
    vi.stubEnv("PRIVACY_HMAC_SECRET", `${"p".repeat(31)} \t\n`);
    const { privacyHmacSecret } = await import("@/lib/security/privacy");

    expect(privacyHmacSecret()).toBe("");
  });

  it("counts meaningful UTF-8 bytes rather than JavaScript characters", async () => {
    const secret = "🔐".repeat(8);
    vi.stubEnv("PRIVACY_HMAC_SECRET", secret);
    const { privacyHmacSecret } = await import("@/lib/security/privacy");

    expect(privacyHmacSecret()).toBe(secret);
  });
});

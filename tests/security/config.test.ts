import { afterEach, describe, expect, it, vi } from "vitest";

import { adminMfaRememberDays } from "../../lib/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("remembered-device lifetime", () => {
  it("defaults to 14 days", () => {
    vi.stubEnv("ADMIN_MFA_REMEMBER_DAYS", "");
    expect(adminMfaRememberDays()).toBe(14);
  });

  it("clamps configured values to a safe range", () => {
    vi.stubEnv("ADMIN_MFA_REMEMBER_DAYS", "0");
    expect(adminMfaRememberDays()).toBe(1);

    vi.stubEnv("ADMIN_MFA_REMEMBER_DAYS", "365");
    expect(adminMfaRememberDays()).toBe(30);

    vi.stubEnv("ADMIN_MFA_REMEMBER_DAYS", "14.9");
    expect(adminMfaRememberDays()).toBe(14);
  });
});

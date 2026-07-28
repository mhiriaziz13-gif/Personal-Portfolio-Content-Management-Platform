import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizeDeviceUserAgent } from "../../lib/security/admin-auth";

describe("remembered-device context", () => {
  it("normalizes browser patch versions to one coarse device context", () => {
    const chrome123 =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36";
    const chrome126 =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 Chrome/126.0.6478.127 Safari/537.36";

    expect(normalizeDeviceUserAgent(chrome123))
      .toBe("chrome:windows:desktop");
    expect(normalizeDeviceUserAgent(chrome126))
      .toBe(normalizeDeviceUserAgent(chrome123));
  });

  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
      "edge:windows:desktop",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      "safari:ios:mobile",
    ],
    [
      "Mozilla/5.0 (Android 15; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0",
      "firefox:android:mobile",
    ],
  ])("distinguishes coarse browser/platform/form-factor context", (ua, expected) => {
    expect(normalizeDeviceUserAgent(ua)).toBe(expected);
  });

  it("keeps user, token, revocation, and expiry checks in the database lookup", () => {
    const implementation = readFileSync(
      resolve(process.cwd(), "lib/security/admin-auth.ts"),
      "utf8",
    );
    const validationStart = implementation.indexOf(
      "export const validateRememberedDeviceToken",
    );
    const validationEnd = implementation.indexOf(
      "export const validateRememberedDeviceFromRequest",
      validationStart,
    );
    const validation = implementation.slice(
      validationStart,
      validationEnd,
    );

    expect(validation).toContain('.eq("user_id", userId)');
    expect(validation).toContain('.eq("token_hash", sha256Hex(token))');
    expect(validation).toContain('.is("revoked_at", null)');
    expect(validation).toContain('"expires_at"');
    expect(validation).toContain(".gt(");
  });

  it("revokes legacy or mismatched device context and treats network drift as risk", () => {
    const implementation = readFileSync(
      resolve(process.cwd(), "lib/security/admin-auth.ts"),
      "utf8",
    );

    expect(implementation).toContain('"legacy_context_missing"');
    expect(implementation).toContain('"context_mismatch"');
    expect(implementation).toContain(
      '"remembered_device_network_changed"',
    );
    expect(implementation).toContain(
      "last_network_context_hash: context.networkHash",
    );
  });

  it("records token rotation and revokes the replaced token", () => {
    const implementation = readFileSync(
      resolve(process.cwd(), "lib/security/admin-auth.ts"),
      "utf8",
    );

    expect(implementation).toContain("rotated_at: existingDevice ? now : null");
    expect(implementation).toContain(
      "(existingDevice?.rotation_counter ?? -1) + 1",
    );
    expect(implementation).toContain('"rotated"');
    expect(implementation).toContain('"rotation_failed"');
  });
});

import { describe, expect, it } from "vitest";

import {
  isSafeInternalPath,
  safeRedirect,
} from "../../lib/security/redirects";

describe("safe internal redirects", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/security?setup=mfa", "/admin/security?setup=mfa"],
    ["/admin/a%20b#devices", "/admin/a%20b#devices"],
  ])("accepts %s", (value, expected) => {
    expect(isSafeInternalPath(value)).toBe(true);
    expect(safeRedirect(value, "/fallback")).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/%255cevil.example",
    "/%25255cevil.example",
    "/%2f%2fevil.example",
    "/%252f%252fevil.example",
    "/admin%0d%0aLocation:%20https://evil.example",
    "\\evil.example",
    "admin",
    "%",
  ])("rejects authority-changing or malformed input %s", (value) => {
    expect(isSafeInternalPath(value)).toBe(false);
    expect(safeRedirect(value, "/fallback")).toBe("/fallback");
  });
});

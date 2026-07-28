import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CSRF_HEADER_NAME,
  createCsrfToken,
  csrfCookieName,
  isCsrfTokenValid,
  isValidCsrfTokenValue,
} from "../../lib/security/csrf";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CSRF synchronizer tokens", () => {
  it("requires the same well-formed token in the HttpOnly cookie and header", () => {
    const token = createCsrfToken();
    const request = new Request("http://localhost:3000/api/admin/content", {
      method: "POST",
      headers: {
        cookie: `${csrfCookieName()}=${token}`,
        [CSRF_HEADER_NAME]: token,
      },
    });

    expect(isValidCsrfTokenValue(token)).toBe(true);
    expect(isCsrfTokenValid(request)).toBe(true);
  });

  it("rejects missing, malformed, and mismatched values", () => {
    const token = createCsrfToken();
    const other = createCsrfToken();

    expect(isCsrfTokenValid(new Request("http://localhost:3000"))).toBe(false);
    expect(isCsrfTokenValid(new Request("http://localhost:3000", {
      method: "POST",
      headers: {
        cookie: `${csrfCookieName()}=${token}`,
        [CSRF_HEADER_NAME]: other,
      },
    }))).toBe(false);
    expect(isValidCsrfTokenValue("not-a-token")).toBe(false);
  });

  it("uses a __Host cookie name in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(csrfCookieName()).toBe("__Host-aam_csrf");
  });
});

import "server-only";

type CaptchaVerification = {
  ok: boolean;
  code: string;
};

type HCaptchaResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export const verifyCaptcha = async (
  token: string,
  remoteIp?: string | null,
): Promise<CaptchaVerification> => {
  if (
    process.env.NODE_ENV === "test"
    && process.env.CAPTCHA_TEST_BYPASS_TOKEN
    && token === process.env.CAPTCHA_TEST_BYPASS_TOKEN
  ) {
    return { ok: true, code: "test_bypass" };
  }

  const provider =
    process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.trim().toLowerCase() ?? "";
  const secret =
    process.env.HCAPTCHA_SECRET_KEY?.trim()
    || process.env.CAPTCHA_SECRET_KEY?.trim()
    || "";

  if (provider !== "hcaptcha" || !secret) {
    return { ok: false, code: "captcha_not_configured" };
  }

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false, code: "captcha_provider_error" };

    const result = await response.json() as HCaptchaResponse;
    return result.success
      ? { ok: true, code: "verified" }
      : {
        ok: false,
        code: result["error-codes"]?.[0]?.slice(0, 80) || "captcha_rejected",
      };
  } catch {
    return { ok: false, code: "captcha_provider_unavailable" };
  }
};

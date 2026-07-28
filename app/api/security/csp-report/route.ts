import { clientIp } from "@/lib/security/http";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { noStoreHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

const safeLocation = (value: unknown) => {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 1_024);
  } catch {
    return value.split(/[?#]/, 1)[0].slice(0, 1_024);
  }
};

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 16 * 1_024) {
    return new Response(null, { status: 413, headers: noStoreHeaders });
  }

  const limited = await consumeRateLimit({
    scope: "csp_report",
    identifiers: [clientIp(request)],
    limit: 60,
    windowMs: 60 * 60 * 1_000,
  });
  if (!limited.allowed) {
    return new Response(null, { status: 204, headers: noStoreHeaders });
  }

  const body = await request.json().catch(() => null) as
    | Record<string, unknown>
    | null;
  const report = (
    body?.["csp-report"]
    && typeof body["csp-report"] === "object"
  )
    ? body["csp-report"] as Record<string, unknown>
    : body;

  if (report) {
    console.warn("[csp-report]", {
      violatedDirective:
        typeof report["violated-directive"] === "string"
          ? report["violated-directive"].slice(0, 160)
          : null,
      effectiveDirective:
        typeof report["effective-directive"] === "string"
          ? report["effective-directive"].slice(0, 160)
          : null,
      document: safeLocation(report["document-uri"]),
      blocked: safeLocation(report["blocked-uri"]),
    });
  }

  return new Response(null, { status: 204, headers: noStoreHeaders });
}

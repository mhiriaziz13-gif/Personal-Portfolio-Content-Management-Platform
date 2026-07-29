import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib", "types"];
const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(join(root, directory))) {
    const path = join(directory, entry);
    if (statSync(join(root, path)).isDirectory()) walk(path);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry)) files.push(path);
  }
};
sourceRoots.forEach(walk);
const source = files.map((file) => `\n/* ${relative(root, join(root, file))} */\n${readFileSync(join(root, file), "utf8")}`).join("");
const read = (path) => readFileSync(join(root, path), "utf8");
const layout = read("app/layout.tsx");
const bootstrap = read("components/analytics/consent-bootstrap.tsx");
const provider = read("components/analytics/analytics-consent-provider.tsx");
const clarity = read("components/analytics/clarity-loader.tsx");
const consent = read("lib/analytics/consent.ts");
const deferred = read("components/main/deferred-analytics.tsx");
const optionalTelemetry = read("lib/analytics/optional-telemetry.ts");
const dialog = read("components/analytics/analytics-preferences-dialog.tsx");
const events = read("lib/analytics/events.ts");
const gtmLoader = read("components/analytics/google-tag-manager-loader.tsx");
const gtmRuntime = read("lib/analytics/google-tag-manager.ts");
const pageView = read("components/analytics/page-view-tracker.tsx");
const pageViewContract = read("lib/analytics/page-view.ts");
const contactForm = read("components/main/contact-form.tsx");
const contactRoute = read("app/api/contact/route.ts");
const privacy = read("lib/security/privacy.ts");
const logout = read("app/api/auth/logout/route.ts");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(!/gtag\/js\?id=|gtag\s*\(\s*["']config["']/.test(source), "Direct GA4 loading/configuration found.");
check((source.match(/googletagmanager\.com\/gtm\.js/g) || []).length === 1, "Expected exactly one GTM loader.");
check(!/GTM-K7HDCQLJ|G-W7WJF6YR9X|xmuct2445j/.test(source), "A production analytics ID is hard-coded in source.");
check(layout.includes("<ConsentBootstrap") && layout.includes("<AnalyticsConsentProvider"), "Consent bootstrap/provider missing from root layout.");
check(layout.indexOf("<ConsentBootstrap") < layout.indexOf("<AnalyticsConsentProvider"), "Consent bootstrap must precede the provider/GTM loader.");
check(
  layout.indexOf("<DeferredAnalytics") > layout.indexOf("<AnalyticsConsentProvider")
    && layout.indexOf("<DeferredAnalytics") < layout.indexOf("</AnalyticsConsentProvider>"),
  "Vercel telemetry must be rendered inside the consent provider.",
);
check(bootstrap.includes("'consent','default'") && bootstrap.includes("analytics_storage:analyticsStorage"), "Default analytics consent is missing.");
check(
  bootstrap.includes("window.location.pathname")
    && bootstrap.includes("admin|auth|api"),
  "Stored consent is not denied by default on private paths.",
);
check(provider.includes('"consent", "update"') && provider.includes("analytics_consent_updated"), "Consent update paths are missing.");
for (const field of ["ad_storage", "ad_user_data", "ad_personalization"]) {
  check(bootstrap.includes(`${field}:'denied'`) && provider.includes(`${field}: "denied"`), `${field} must remain denied.`);
}
check(clarity.includes('"consentv2"') && consent.includes("analytics_Storage"), "Clarity Consent V2 is missing.");
check(!/\.consent\s*\(/.test(clarity), "Deprecated Clarity Consent V1 call found.");
check(source.includes('["/admin", "/auth", "/api"]'), "Private analytics path exclusions are missing.");
check(
  gtmLoader.includes("useAnalyticsConsent")
    && gtmLoader.includes("isCurrentAnalyticsCollectionAllowed")
    && gtmRuntime.includes("window.googleTagManagerLoaded")
    && gtmRuntime.includes("document.getElementById"),
  "GTM is not guarded by consent or one-time loading.",
);
check(
  pageView.includes("nextVirtualPageView")
    && pageView.includes("pushDataLayerEvent")
    && !pageView.includes("useSearchParams")
    && !pageView.includes("window.location.href")
    && pageViewContract.includes("pathname.split"),
  "Virtual page views are not deduplicated or URL-minimized.",
);
check(
  deferred.includes("useAnalyticsConsent")
    && deferred.includes("beforeSend={filterOptionalTelemetry}")
    && optionalTelemetry.includes("readStoredAnalyticsConsent")
    && optionalTelemetry.includes("url.pathname"),
  "Vercel Analytics and Speed Insights are not consent-gated.",
);
check(
  consent.includes('name.startsWith("_ga_")')
    && consent.includes('name === "_clck"')
    && consent.includes('name === "_clsk"'),
  "Known GA and Clarity cookie cleanup is incomplete.",
);
check(
  dialog.includes('role="dialog"')
    && dialog.includes('aria-modal="true"')
    && dialog.includes('event.key === "Escape"')
    && dialog.includes('event.key !== "Tab"')
    && dialog.includes('document.body.style.overflow = "hidden"')
    && dialog.includes("previousFocus.focus()"),
  "Analytics preferences dialog lifecycle is incomplete.",
);
check(!/^\s*(?:email|message|name|token|user_id)\??\s*:/m.test(events), "Banned PII field found in analytics event definitions.");
check(
  events.includes("export type AnalyticsDataLayerEvent")
    && events.includes("VirtualPageViewEvent")
    && events.includes("GoogleTagManagerStartEvent"),
  "Typed Data Layer contract is missing.",
);
check((contactForm.match(/event:\s*"contact_submit_success"/g) || []).length === 1, "Expected one contact success event emission.");
check(!/event:\s*"contact_submit"/.test(contactForm), "Legacy duplicate contact_submit event found.");
check(
  contactRoute.includes("privacyHmacSecret()")
    && !contactRoute.includes("RATE_LIMIT_HMAC_SECRET")
    && privacy.includes("PRIVACY_HMAC_SECRET")
    && privacy.includes("Buffer.byteLength")
    && privacy.includes("replace(/\\s/gu"),
  "Contact privacy hashes do not enforce the independent UTF-8 privacy secret.",
);
check(/export\s+async\s+function\s+POST/.test(logout) && !/export\s+async\s+function\s+GET/.test(logout), "Logout must remain POST-only.");

if (failures.length) {
  console.error("Analytics consent verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Analytics consent static verification passed.");
console.log("Browser validation with Tag Assistant is still required.");

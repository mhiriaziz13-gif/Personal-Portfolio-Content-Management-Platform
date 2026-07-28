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
const events = read("lib/analytics/events.ts");
const contactForm = read("components/main/contact-form.tsx");
const logout = read("app/api/auth/logout/route.ts");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(!/gtag\/js\?id=|gtag\s*\(\s*["']config["']/.test(source), "Direct GA4 loading/configuration found.");
check((source.match(/googletagmanager\.com\/gtm\.js/g) || []).length === 1, "Expected exactly one GTM loader.");
check(!/GTM-K7HDCQLJ|G-W7WJF6YR9X|xmuct2445j/.test(source), "A production analytics ID is hard-coded in source.");
check(layout.includes("<ConsentBootstrap") && layout.includes("<AnalyticsConsentProvider"), "Consent bootstrap/provider missing from root layout.");
check(layout.indexOf("<ConsentBootstrap") < layout.indexOf("<AnalyticsConsentProvider"), "Consent bootstrap must precede the provider/GTM loader.");
check(bootstrap.includes("'consent','default'") && bootstrap.includes("analytics_storage:analyticsStorage"), "Default analytics consent is missing.");
check(provider.includes('"consent", "update"') && provider.includes("analytics_consent_updated"), "Consent update paths are missing.");
for (const field of ["ad_storage", "ad_user_data", "ad_personalization"]) {
  check(bootstrap.includes(`${field}:'denied'`) && provider.includes(`${field}: "denied"`), `${field} must remain denied.`);
}
check(clarity.includes('"consentv2"') && clarity.includes("analytics_Storage"), "Clarity Consent V2 is missing.");
check(!/\.consent\s*\(/.test(clarity), "Deprecated Clarity Consent V1 call found.");
check(source.includes('["/admin", "/auth", "/api"]'), "Private analytics path exclusions are missing.");
check(!/^\s*(?:email|message|name|token|user_id)\??\s*:/m.test(events), "Banned PII field found in analytics event definitions.");
check((contactForm.match(/event:\s*"contact_submit_success"/g) || []).length === 1, "Expected one contact success event emission.");
check(!/event:\s*"contact_submit"/.test(contactForm), "Legacy duplicate contact_submit event found.");
check(/export\s+async\s+function\s+POST/.test(logout) && !/export\s+async\s+function\s+GET/.test(logout), "Logout must remain POST-only.");

if (failures.length) {
  console.error("Analytics consent verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Analytics consent static verification passed.");
console.log("Browser validation with Tag Assistant is still required.");

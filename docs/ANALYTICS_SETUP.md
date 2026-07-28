# Analytics Setup

Analytics run only when `VERCEL_ENV === "production"` and the current route is public. `/admin` and `/auth` are always excluded.

- Vercel Web Analytics via `@vercel/analytics/next`
- Vercel Speed Insights via `@vercel/speed-insights/next`
- Google Analytics and custom events via Google Tag Manager
- Microsoft Clarity via `@microsoft/clarity`

Set `NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_CLARITY_PROJECT_ID` in the Vercel Production environment. There are no hardcoded fallback IDs: a missing variable disables its integration. Preview, Development, localhost and cloned/unknown hostnames do not collect analytics even when variables exist.

GA4 must be configured inside GTM. Do not add a direct `gtag.js` script to the application. Clarity remains managed by its NPM package and must not be duplicated in GTM.

Google Analytics and Clarity are gated by the visitor's analytics consent. Vercel Web Analytics and Speed Insights remain separate, production-public-route telemetry. Custom events must use the typed `pushAnalyticsEvent()` helper from `lib/analytics/events.ts`; never send visitor-entered text to the Data Layer.

## GTM event mapping

Configure the published GTM container with Custom Event triggers and GA4 Event tags using this mapping:

The Data Layer name is the application contract; the GA4 name is configured in
GTM and may use a recommended event where one fits.

| Data Layer event | GA4 event | Runtime status |
| --- | --- | --- |
| `virtual_page_view` | `page_view` | Emitted on consented public navigation |
| `project_view` | `view_item` | Emitted once on a project detail page |
| `project_explore_click` | `select_content` | Emitted by project discovery links |
| `resume_view_click` | `resume_view` | Emitted by links to the resume page |
| `resume_download` | `cv_download` | Emitted by PDF/DOCX download links |
| `contact_submit_success` | `generate_lead` | Emitted only after a real API success |
| `contact_submit_error` | `contact_submit_error` | Emitted for fixed API/network categories |
| `profile_link_click` | `profile_link_click` | Emitted by public profile links |
| `email_contact_click` | `email_contact_click` | Emitted by public email links |
| `contact_cta_click` | `contact_cta_click` | Emitted by contact calls to action |
| `project_cta_click` | `project_cta_click` | Emitted by project LinkedIn/context links |
| `project_repository_click` | `project_repository_click` | Emitted by project repository links |
| `project_demo_click` | `project_demo_click` | Reserved; not currently emitted |
| `outbound_linkedin_click` | `outbound_linkedin_click` | Reserved; not currently emitted |
| `outbound_github_click` | `outbound_github_click` | Reserved; not currently emitted |
| `contact_fallback_mailto` | `contact_fallback_mailto` | Reserved; not currently emitted |

Disable the Google tag's automatic page view (`send_page_view: false`) so that
`virtual_page_view` is the single source of GA4 `page_view` events. Forward only
the controlled parameters declared by the `AnalyticsEvent` type. Do not create
a second lead tag from a generic `contact_submit` event; the application emits
only `contact_submit_success` for a successful contact conversion. Do not
configure Clarity in GTM.

After deployment, enable Web Analytics and Speed Insights in the Vercel project dashboard. The Content Security Policy permits Google Tag Manager, Google Analytics and Vercel vitals endpoints.

Consent is stored under `aam_analytics_consent_v1` as versioned JSON containing only the analytics choice and update timestamp. The consent bootstrap runs before the interactive GTM loader. See `docs/analytics/gtm-production-configuration.md` for the external container contract and `docs/analytics/consent-manual-test-plan.md` for browser acceptance.

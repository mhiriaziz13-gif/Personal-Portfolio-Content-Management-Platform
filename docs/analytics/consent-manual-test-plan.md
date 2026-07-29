# Analytics consent manual test plan

Use production plus GTM Tag Assistant. Browser validation is required; the static verifier is not a substitute.

## Scenario A — Fresh visitor, no choice

1. Open Incognito.
2. Clear cookies and local storage.
3. Open production homepage.
4. Verify consent banner appears.
5. Verify local storage contains no granted choice.
6. Verify Tag Assistant: `analytics_storage = denied`.
7. Verify no GA cookies.
8. Verify no Clarity cookies.
9. Verify no custom GA4 `page_view` event.
10. Verify no analytics on admin/auth.

## Scenario B — Accept

1. Click Accept analytics.
2. Verify stored value is granted.
3. Verify Tag Assistant receives consent update.
4. Verify `analytics_storage = granted`.
5. Verify all advertising states remain denied.
6. Verify one current-page `virtual_page_view`.
7. Verify one GA4 `page_view`.
8. Verify `_ga` cookies may appear.
9. Verify Clarity initializes once.
10. Verify Consent V2 granted.
11. Verify `_clck`/`_clsk` may appear.
12. Navigate to About.
13. Verify exactly one new page_view.
14. Navigate to Projects.
15. Verify exactly one new page_view.

## Scenario C — Returning accepted visitor

1. Reload.
2. Verify banner does not appear.
3. Verify initial default analytics state is granted before GTM.
4. Verify exactly one page_view.
5. Verify no duplicate GTM script.

## Scenario D — Reject

1. Start fresh.
2. Click Reject analytics.
3. Verify stored value is denied.
4. Verify `analytics_storage` remains denied.
5. Verify no GA cookies.
6. Verify no Clarity cookies.
7. Navigate through the site.
8. Verify no GA4 custom events.

## Scenario E — Revoke after acceptance

1. Accept analytics.
2. Confirm cookies exist.
3. Open footer Analytics preferences.
4. Reject analytics.
5. Verify consent update to denied.
6. Verify first-party GA and Clarity cookies are removed.
7. Verify the page reloads once and GTM, Clarity, Vercel Analytics and Speed
   Insights remain absent afterward.
8. Verify future events do not fire.
9. Verify auth/security cookies remain.

## Scenario F — Events

After consent:

- project detail: one Data Layer `project_view`, mapped to one GA4 `view_item`;
- project click: one `project_explore_click`, mapped to one `select_content`;
- CV download: one `resume_download`, mapped to one `cv_download`;
- successful contact: one `contact_submit_success`, mapped to one
  `generate_lead`;
- error: one `contact_submit_error`;
- LinkedIn click: one `profile_link_click`;
- Contact CTA: one `contact_cta_click`.

## Scenario G — Private routes

Test `/admin/login`, `/admin`, `/auth/callback`, and `/admin/forgot-password`.

Verify no custom page view, no Clarity, no event collection, no consent banner over authentication flows, and working authentication.

## Scenario H — Preview

Verify no GTM network request, GA request, Clarity request or production analytics cookies.

## Expected Tag Assistant consent states

Before choice: analytics denied; ad storage, ad user data and ad personalization denied; functionality and security granted.

After accept: analytics granted; every advertising state denied.

After reject: analytics and every advertising state denied.

For a returning accepted visitor, the initial analytics state must be granted before the Google Tag executes.

## GA4 acceptance

Realtime/DebugView should show one page view per public route, `view_item` for a
project detail, `select_content` for project exploration, `cv_download` for CV
files, and `generate_lead` only after real API success. It must show no PII,
admin/auth URL, duplicate event or duplicate page view. The owner may mark
`generate_lead` and `cv_download` as key events only after verification.

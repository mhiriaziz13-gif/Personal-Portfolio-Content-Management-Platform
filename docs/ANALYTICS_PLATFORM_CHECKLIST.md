# Analytics platform checklist

Application code intentionally does not publish GTM, GA4, Clarity, Vercel, or
Search Console settings. Complete these items manually after deploying the
reviewed branch.

## Production application

- [ ] Set `NEXT_PUBLIC_GTM_ID` to the production web container ID.
- [ ] Set `NEXT_PUBLIC_CLARITY_PROJECT_ID` to the production Clarity project ID.
- [ ] Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` only in the Production
  environment; never commit the token.
- [ ] Enable Vercel Web Analytics and Speed Insights for the production project.
- [ ] Confirm all four optional services are absent before consent and on
  `/admin`, `/auth`, and `/api`; Vercel telemetry follows the same consent.

## Google Tag Manager and GA4

- [ ] Install GTM only through `NEXT_PUBLIC_GTM_ID`; do not add `gtag.js`, a GTM
  noscript iframe, Clarity, or another consent tool.
- [ ] Create one Google tag for the production GA4 web stream. Set
  `send_page_view` to `false` and trigger it only when hostname equals
  `ahmedaziz-portfolio.vercel.app` and Page Path does not match
  `^/(admin|auth|api)(/|$)`.
- [ ] In the GA4 web stream, disable automatic browser-history page views.
  Do not add a GTM History Change page-view trigger.
- [ ] Create Data Layer variables for `page_path`, `page_location`, and
  `page_title`. Map custom event `virtual_page_view` to GA4 event `page_view`
  with those three parameters.
- [ ] Require built-in `analytics_storage` consent on the Google tag and every
  GA4 event tag. Do not create advertising tags; `ad_storage`, `ad_user_data`,
  and `ad_personalization` must remain denied.
- [ ] Map only the controlled events and parameters documented in
  `docs/ANALYTICS_SETUP.md`. Never forward `analytics_consent_updated`, URL
  query strings, form values, names, email addresses, messages, IP addresses,
  user agents, or Supabase/auth identifiers.
- [ ] In Tag Assistant, verify no Google request before acceptance, one GTM
  script after acceptance, one current-page `virtual_page_view`, one more per
  pathname change, and no event after rejection.
- [ ] Mark `generate_lead` and `cv_download` as GA4 key events only after their
  production mappings have been validated without duplicates.

## Microsoft Clarity

- [ ] Install the project only through `NEXT_PUBLIC_CLARITY_PROJECT_ID`; confirm
  there is no second installation in GTM.
- [ ] In Clarity **Settings → Setup**, require consent / turn off cookies by
  default. Keep input and sensitive-content masking enabled.
- [ ] Verify Consent API V2 receives `ad_Storage: denied` at all times and
  `analytics_Storage: granted` only after acceptance.
- [ ] Accept, confirm a single initialization, then reject. Confirm the reload
  completes, `_clck` and `_clsk` are gone, and no new Clarity request occurs.

## Search Console

- [ ] Add or retain the exact production HTTPS property
  `https://ahmedaziz-portfolio.vercel.app/` (or verify the future canonical
  domain before changing the application URL).
- [ ] Confirm the rendered verification meta value comes from
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- [ ] Submit `https://ahmedaziz-portfolio.vercel.app/sitemap.xml`.
- [ ] Inspect the canonical Home, Projects, Experience, Expertise, About, and
  Contact URLs. Request indexing only after canonical, robots, and structured
  data checks pass.
- [ ] Review Pages, Sitemaps, Enhancements, and Core Web Vitals after release;
  do not treat indexing or ranking as an immediate deployment guarantee.

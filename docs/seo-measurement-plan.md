# SEO measurement plan

Monthly reporting should cover organic sessions, engaged organic sessions, branded and non-branded impressions, clicks, CTR, cautiously interpreted average position, indexed pages, project landing-page traffic, CV view/download actions, contact conversions, referring domains, broken links and identifiable AI-referral traffic.

The canonical application event names are `project_view`,
`project_explore_click`, `resume_view_click`, `resume_download`,
`contact_submit_success`, `contact_submit_error`, `profile_link_click`,
`email_contact_click`, `contact_cta_click`, `project_cta_click`, and
`project_repository_click`, plus the consented `virtual_page_view`. Reserved
typed names that are not currently emitted are documented in
`docs/ANALYTICS_SETUP.md`. Never send names, emails, messages, CAPTCHA tokens,
Supabase IDs, auth state or private CMS information. Baseline and
consent/privacy review are required before enabling additional client events.

Implementation status: the events above are emitted only on the exact production
hostname, on public routes, after analytics consent. `contact_submit_success`
requires a real accepted API response and is the only lead-conversion event for
that submission. GTM publication, GA4 mapping, Tag Assistant validation, and
dashboard reporting remain manual release actions, so no report should claim
provider-side collection or conversion results until those checks are complete.

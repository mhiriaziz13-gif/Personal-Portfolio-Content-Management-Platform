# QA Checklist

## Automated

- [ ] `npm ci`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test:coverage`
- [ ] `npm run test:integration` against an explicitly mutation-enabled
  non-production Supabase project
- [ ] `npm run test:e2e`
- [ ] `npm run audit:seo`
- [ ] `npm run audit:security`
- [ ] `npm run audit:lighthouse`

## Public QA

- [ ] `/` renders hero, about, skills, projects, experience, CV preview and contact.
- [ ] `/about` renders About with avatar.
- [ ] `/projects` renders project cards.
- [ ] `/projects/[slug]` renders project detail.
- [ ] `/experience` renders timeline and company logos.
- [ ] `/resume` renders PDF/DOCX links and disables missing files.
- [ ] `/contact` submits to `/api/contact`.
- [ ] Public site works without Supabase env by using fallback content.
- [ ] No old-owner names, domains, thumbnails or broken image paths are visible.

## CMS QA

- [ ] `/admin/login` loads.
- [ ] `/admin` is protected server-side.
- [ ] Admin can edit profile JSON and save.
- [ ] Admin can edit hero JSON and save.
- [ ] Admin can edit about JSON and save.
- [ ] Admin can add/edit/delete skill.
- [ ] Admin can add/edit/delete project.
- [ ] Admin can add/edit/delete experience.
- [ ] Admin can add/edit/delete resume.
- [ ] Admin can upload image.
- [ ] Admin can upload CV.
- [ ] Admin can view contact messages.
- [ ] An accepted contact message is durably persisted before its immediate
  notification-delivery attempt.
- [ ] A failed contact notification remains visible and can be retried manually
  from the admin CMS without duplicating the persisted message.
- [ ] `next_delivery_attempt_at` is treated as reconciliation/future-automation
  state; no background worker or automatic retry scheduler is present.
- [ ] Admin can logout.
- [ ] A second tab with a stale `updated_at` receives a 409 conflict.
- [ ] Each successful create/update/archive/delete has an atomic revision row.
- [ ] Concurrent child edits cannot remove the last meaningful published-project
  evidence.

## Auth QA

- [ ] Email/password login works.
- [ ] Wrong password is rejected generically.
- [ ] Non-admin user is rejected and signed out.
- [ ] GitHub login works when provider is configured.
- [ ] Non-admin GitHub user is rejected.
- [ ] MFA enrollment works.
- [ ] TOTP verification works.
- [ ] Wrong TOTP is rejected.
- [ ] Remember device works for the configured duration (10 days by default).
- [ ] Revoke remembered device works.
- [ ] Forgot password sends recovery.
- [ ] Reset password works.
- [ ] Remembered devices are revoked after password reset.
- [ ] Safe redirects work.
- [ ] Open redirects are blocked.

## Security QA

- [ ] Service role key is not exposed to the browser.
- [ ] RLS is enabled on all tables.
- [ ] Public users cannot read unpublished content.
- [ ] Public users cannot read admin tables.
- [ ] Public users cannot update CMS tables.
- [ ] Uploads reject unsupported files.
- [ ] SVG uploads are rejected.
- [ ] Contact rate limits work.
- [ ] Auth rate limits work.
- [ ] No secrets appear in logs.
- [ ] TOTP-only login is not available.
- [ ] GitHub does not auto-create admin access.
- [ ] Old domains are not hardcoded.

## Isolated authenticated browser lifecycle

Never point lifecycle automation at the production Supabase project. Configure
a separate project with the hardening migration, an allowlisted AAL2
administrator, and a Playwright storage-state file, then set:

```text
PLAYWRIGHT_BASE_URL=https://trusted-test-deployment.example
E2E_TEST_SUPABASE_URL=
E2E_TEST_SUPABASE_ANON_KEY=
E2E_TEST_SUPABASE_SERVICE_ROLE_KEY=
E2E_ADMIN_STORAGE_STATE=C:\path\to\aal2-admin-state.json
PRODUCTION_SUPABASE_PROJECT_REF=
ALLOW_E2E_DATABASE_MUTATIONS=true
```

The authenticated suite requires an explicit production reference and refuses
to run when the test URL resolves to it. It otherwise remains skipped until all
isolation inputs are present. It covers the admin
dashboard accessibility smoke test, create/update/stale-CAS/archive/restore/
delete and revision history, plus upload pending-grace/reconciled deletion.

## CMS and Analytics Refinement

- [ ] Admin dashboard contains no raw JSON editor.
- [ ] Prefilled Profile, Hero and About forms load.
- [ ] Skills, Projects, Experience, Education, Certifications, Resumes and Social Links support CRUD.
- [ ] Google certificate opens the supplied Drive credential URL.
- [ ] GitHub callback rejects users absent from `public.admins`.
- [ ] Recovery email reaches `/admin/reset-password` and remembered devices are revoked.
- [ ] TOTP enrollment, verification, required-login challenge and revocation work.
- [ ] LinkedIn icon is visible in the footer.
- [ ] Vercel Analytics, Speed Insights and one GA tag appear in production.

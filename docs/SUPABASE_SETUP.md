# Supabase Setup

> **Existing production projects:** do not follow the bootstrap migration steps
> below and do not apply all pending repository migrations. As of 2026-07-14, the
> live migration ledger and repository history are not aligned, and the pending
> `202607100001_clean_reset_and_seed.sql` file is destructive. Reconcile each
> version against live schema first, then apply only individually reviewed files.
> The legacy bootstrap SQL also recreates the function/Storage findings addressed
> by `20260714093312_security_advisor_hardening.sql`, which was applied and verified
> on the production project on 2026-07-14. Do not apply it again. See
> `security-scan-remediation-2026-07.md` for the release gate and verification.

## 1. Database bootstrap and production hardening

`supabase/schema.sql` and
`supabase/migrations/202607080001_cms_auth_security.sql` are historical bootstrap
artifacts. They do not represent the current hardened schema and must not be used
to initialize or repair production.

For the existing project, use the single-file, production-drift-aware process in
`SUPABASE_PORTFOLIO_HARDENING_V1_RUNBOOK.md`. The prepared migration is
`supabase/migrations/20260727130027_portfolio_hardening_v1.sql`; it has not been
applied to production by this repository change.

For a genuinely new/disposable project, first derive and review a current
baseline from the intended schema. Do not treat the historical clean reset as a
current baseline, and never copy production data or credentials into a disposable
environment.

## 2. Auth URL Configuration

Set the Supabase Auth Site URL to the production app URL:

```text
https://your-production-domain.vercel.app
```

Add these Redirect URLs, replacing the production domain:

```text
https://your-production-domain.vercel.app/auth/callback
https://your-production-domain.vercel.app/auth/callback/
https://your-production-domain.vercel.app/auth/callback?next=/admin
https://your-production-domain.vercel.app/auth/callback?next=/admin/reset-password
https://your-production-domain.vercel.app/admin/login
https://your-production-domain.vercel.app/admin/login/
https://your-production-domain.vercel.app/admin/reset-password
https://your-production-domain.vercel.app/admin/reset-password/
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback/
http://localhost:3000/auth/callback?next=/admin
http://localhost:3000/auth/callback?next=/admin/reset-password
http://localhost:3000/admin/login
http://localhost:3000/admin/login/
http://localhost:3000/admin/reset-password
http://localhost:3000/admin/reset-password/
```

## 3. Email Provider

Enable email/password sign-in in Supabase Auth.

For password recovery, the email template should include:

```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

## 4. CAPTCHA Protection

In the production project, open **Authentication > Bot and Abuse Protection**
and configure:

- Provider: **hCaptcha**
- Secret key: the private secret from the matching hCaptcha site
- CAPTCHA protection: enabled

The app renders the public widget on `/admin/login`,
`/admin/forgot-password`, and `/contact`. Auth tokens go to Supabase Auth;
contact tokens are verified server-side by `/api/contact`.

Set these public build variables locally and in Vercel:

```text
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-public-hcaptcha-site-key
HCAPTCHA_SECRET_KEY=your-private-hcaptcha-secret
```

Never add the hCaptcha secret to a `NEXT_PUBLIC_*` variable. Store it in
Supabase Auth and as a server-only Vercel/local environment variable for the
contact API. Add only required production, trusted preview, or development
hostnames to the hCaptcha site.

## 5. GitHub OAuth

Create a GitHub OAuth App.

GitHub OAuth App callback URL:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

In Supabase Auth Providers, enable GitHub and paste:

- Client ID
- Client Secret

The portfolio starts GitHub OAuth at `/api/auth/oauth/github` and returns through `/auth/callback?next=/admin`.

Important: GitHub login does not create admin access. If GitHub creates a separate `auth.users` row, manually add that user id to `public.admins`.

## 6. TOTP MFA

In Supabase Auth, enable TOTP MFA if it is not enabled by default.

Admin MFA enrollment is handled from:

```text
/admin/security
```

Google Authenticator can scan the QR code returned by Supabase MFA enrollment.

## 7. Storage Buckets

The migration creates these buckets:

- `public-assets`
- `project-images`
- `resumes`
- `uploads`

The admin upload route validates MIME type, extension, file size and magic bytes. SVG uploads are rejected.

## 8. Manual Admin Creation

1. Create or sign in with Ahmed's admin email through Supabase Auth.
2. Find the user in `auth.users`.
3. Insert the user id into `public.admins`:

```sql
insert into public.admins (user_id, email)
select id, email
from auth.users
where email = 'mhiriaziz13@gmail.com'
on conflict do nothing;
```

## 9. Initial CMS Content

The public site works with fallback content if CMS rows do not exist yet.

To seed CMS content, use the admin dashboard after the admin user is configured:

```text
/admin
```

Recommended first rows:

- one `profile` row
- one `hero` row
- one `about` row
- skills grouped by category
- projects and project sections
- experience entries
- resumes
- social links

Do not insert fake clients, fake metrics or old-owner content.

## 2026 CMS/Auth Refinement

For a new or disposable database created from a separately reviewed current
baseline, use the admin dashboard to create initial content. The historical
`202607090001_fix_cms_auth_certifications.sql` and standalone seed are retained
for provenance, not as an apply sequence.

Do not replay that migration against the existing production project
the production project. Its live migration ledger does not align with the legacy
repository sequence, and the production schema was verified separately on
2026-07-14. Detailed provider, recovery and MFA steps are in
`docs/AUTH_FIX_GITHUB_MFA_RESET.md`.

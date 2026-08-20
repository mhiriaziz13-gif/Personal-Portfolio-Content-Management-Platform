# Vercel Setup

## Required Environment Variables

Add these in Vercel Project Settings, for Production and any trusted Preview environment:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
HCAPTCHA_SECRET_KEY=
RATE_LIMIT_HMAC_SECRET=
PRIVACY_HMAC_SECRET=
ADMIN_DEVICE_HMAC_SECRET=
RESEND_API_KEY=
CONTACT_NOTIFICATION_TO=
CONTACT_NOTIFICATION_FROM=
NEXT_PUBLIC_SITE_URL=https://your-production-domain.vercel.app
APP_URL=https://your-production-domain.vercel.app
ALLOWED_ORIGINS=https://your-production-domain.vercel.app
REQUIRE_ADMIN_MFA=true
ADMIN_MFA_REMEMBER_DAYS=10
```

Optional:

```text
NEXT_PUBLIC_GITHUB_USERNAME=ahmedazizmhiri
GITHUB_TOKEN=
```

## Secret Handling

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe.
- `NEXT_PUBLIC_CAPTCHA_PROVIDER` and `NEXT_PUBLIC_CAPTCHA_SITE_KEY` are browser-visible widget configuration.
- `SUPABASE_SERVICE_ROLE_KEY`, `HCAPTCHA_SECRET_KEY`, the HMAC secrets, and
  `RESEND_API_KEY` are server-only.
- Generate the three HMAC secrets independently with at least 32 non-whitespace
  UTF-8 bytes of randomly generated material each. `ADMIN_DEVICE_HMAC_SECRET`
  has no fallback and must not reuse an application secret or Supabase key.
- Never expose the service role key as `NEXT_PUBLIC_*`.
- Configure the same hCaptcha secret in Supabase Auth for login/recovery and as
  Vercel's server-only `HCAPTCHA_SECRET_KEY` for `/api/contact`.
- Do not paste secrets into source files.

## Contact Notification Delivery

After `/api/contact` durably persists an accepted message, the request makes one
immediate notification-delivery attempt. A failed attempt remains visible and
can be retried manually from the admin CMS. `next_delivery_attempt_at` supports
reconciliation and possible future queue automation; the current deployment has
no background worker or automatic retry scheduler.

## Production Domain

Set both values to the deployed Vercel production URL:

```text
APP_URL=https://your-production-domain.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-production-domain.vercel.app
```

`ALLOWED_ORIGINS` must contain only explicitly trusted deployed HTTPS origins in production. Localhost and `127.0.0.1` are added automatically outside production and are filtered from the production allowlist.

## Preview Deployments

Preview deployments have different hostnames. Add preview origins only if you intend to test admin/auth there. Otherwise, keep admin auth production-only.

## hCaptcha

This application uses hCaptcha on the email/password login, password-recovery,
and public contact forms. Set the two public variables and the server-only
`HCAPTCHA_SECRET_KEY` for every environment where those forms must work, then
redeploy because `NEXT_PUBLIC_*` values and the CSP are fixed at build time.

In hCaptcha, allow the production hostname. Add trusted Vercel preview hostnames only when preview authentication is required. For local testing, use hCaptcha's documented test site key; its matching secret must be configured in a non-production Supabase project.

In the production Supabase project, open **Authentication > Bot and Abuse
Protection**, select **hCaptcha**, enter the hCaptcha secret, enable CAPTCHA
protection, and save. Store that secret separately as the server-only Vercel
`HCAPTCHA_SECRET_KEY` for contact verification; never put it in the repository
or a `NEXT_PUBLIC_*` variable.

GitHub OAuth, MFA verification, password updates after recovery, and logout do not use the CAPTCHA token.

## GitHub Auto Deploy

Connect the GitHub repository to Vercel and keep auto-deploy enabled for the production branch.

After changing environment variables:

1. Save variables.
2. Redeploy from Vercel.
3. Confirm `/`, `/admin/login`, `/admin/forgot-password`, `/auth/callback` and `/api/contact` load.
4. Confirm hCaptcha loads on the two password-based entry forms and `/contact`,
   but is not loaded during the initial above-the-fold homepage render.

For a controlled first-time bootstrap only, `REQUIRE_ADMIN_MFA` may temporarily
be `false` while the owner enrolls and verifies TOTP at `/admin/security`.
Production acceptance is not complete until `REQUIRE_ADMIN_MFA=true` is saved
and the production deployment is redeployed and retested.

## Old Domain Removal

Remove any old portfolio domain from:

- Vercel Domains
- Supabase Auth Site URL
- Supabase Redirect URLs
- GitHub OAuth app callback settings if relevant

## Security Notes

The app adds CSP, HSTS, frame protection, referrer policy, permissions policy, content-type protection and a legacy cross-domain policy opt-out through `next.config.js`.

The CSP allows inline scripts/styles because Next.js and the current animation stack require framework-managed inline runtime/style behavior. Keep this documented if tightening CSP later.

## 2026 CMS/Auth Refinement

The current remote Supabase project already contains the reviewed security migrations. Do not run an apply-all migration command: the local and remote migration ledgers contain historical differences. Reconcile migration history deliberately before any future schema change. Detailed provider, recovery and MFA steps are in `docs/AUTH_FIX_GITHUB_MFA_RESET.md`.

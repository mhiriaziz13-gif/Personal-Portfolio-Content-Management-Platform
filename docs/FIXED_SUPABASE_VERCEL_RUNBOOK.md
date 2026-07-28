# Fixed Supabase / Vercel Runbook

This project revision fixes three broken flows:

1. CMS/front-end Supabase connection
2. GitHub OAuth login
3. Forgot/reset password callback handling
4. TOTP MFA setup/verify callback handling

## 1. Install and run locally

```powershell
cd "C:\Users\Client\Desktop\Portfolio"
npm config set registry https://registry.npmjs.org/
npm install
npm run type-check
npm run lint
npm run build
npm run dev
```

## 2. Vercel environment variables

Production values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_OR_SECRET_KEY

NEXT_PUBLIC_SITE_URL=https://ahmedaziz-portfolio.vercel.app
APP_URL=https://ahmedaziz-portfolio.vercel.app
ALLOWED_ORIGINS=https://ahmedaziz-portfolio.vercel.app,http://localhost:3000,http://127.0.0.1:3000

REQUIRE_ADMIN_MFA=false
ADMIN_MFA_REMEMBER_DAYS=10

NEXT_PUBLIC_GITHUB_USERNAME=mhiriaziz13-gif
GITHUB_TOKEN=
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
HCAPTCHA_SECRET_KEY=
RATE_LIMIT_HMAC_SECRET=
PRIVACY_HMAC_SECRET=
ADMIN_DEVICE_HMAC_SECRET=
RESEND_API_KEY=
CONTACT_NOTIFICATION_TO=
CONTACT_NOTIFICATION_FROM=
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W7WJF6YR9X
```

Keep `REQUIRE_ADMIN_MFA=false` until `/admin/security` enrollment works.

Generate `RATE_LIMIT_HMAC_SECRET`, `PRIVACY_HMAC_SECRET`, and
`ADMIN_DEVICE_HMAC_SECRET` as three independent values of at least 32 random
bytes each. The admin secret has no fallback and must not reuse a Supabase key
or any other application credential.

The CAPTCHA site key is public. Store the matching secret in Supabase
**Authentication > Bot and Abuse Protection** for auth and in Vercel as the
server-only `HCAPTCHA_SECRET_KEY` for contact-form verification. Never expose it
through `NEXT_PUBLIC_*` or commit it. Redeploy after changing CAPTCHA values.

An accepted contact message is durably persisted before the request makes one
immediate notification-delivery attempt. A failed attempt remains visible and
must currently be retried manually from the admin CMS.
`next_delivery_attempt_at` supports reconciliation and possible future queue
automation; no background worker or automatic retry scheduler is deployed.

## 3. Supabase SQL

The earlier instruction to run `supabase/00_CLEAN_RESET_AND_SEED.sql` is retired.
That file drops and recreates portfolio tables. It must never be run against the
existing production project, even though it does not delete `auth.users`.

Production migration history and the repository's historical sequence diverge.
Do not run `supabase db push`, `supabase migration up`, CI auto-migrations, or any
apply-all workflow. Use the exact single-file process, backup gates, verification,
and non-destructive rollback in:

```text
docs/SUPABASE_PORTFOLIO_HARDENING_V1_RUNBOOK.md
```

The clean-reset file is retained only as a historical/disposable artifact; it is
not a current bootstrap or recovery method.

## 4. Supabase URL configuration

Supabase → Authentication → URL Configuration:

Site URL:

```text
https://ahmedaziz-portfolio.vercel.app
```

Redirect URLs:

```text
https://ahmedaziz-portfolio.vercel.app/auth/callback
https://ahmedaziz-portfolio.vercel.app/auth/callback/
https://ahmedaziz-portfolio.vercel.app/auth/callback?next=/admin
https://ahmedaziz-portfolio.vercel.app/auth/callback?next=/admin/reset-password
https://ahmedaziz-portfolio.vercel.app/admin/login
https://ahmedaziz-portfolio.vercel.app/admin/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback/
http://localhost:3000/auth/callback?next=/admin
http://localhost:3000/auth/callback?next=/admin/reset-password
http://localhost:3000/admin/login
http://localhost:3000/admin/reset-password
```

## 5. Password reset

The code now sends reset emails with:

```text
APP_URL/auth/callback?next=/admin/reset-password
```

Supabase Email Template → Reset Password must keep:

```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

Do not hardcode `/admin/reset-password` directly in the email template.

## 6. GitHub OAuth

GitHub Developer Settings → OAuth Apps:

Homepage URL:

```text
https://ahmedaziz-portfolio.vercel.app
```

Authorization callback URL:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Supabase → Authentication → Providers → GitHub:

- Enable GitHub
- Paste GitHub Client ID
- Paste GitHub Client Secret

The Login form now includes the Supabase JS client call:

```ts
supabase.auth.signInWithOAuth({
  provider: "github",
  options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
})
```

After the first GitHub login, check Supabase Auth Users. If GitHub creates a different `auth.users.id`, add that user ID to `public.admins`.

## 7. MFA / 2FA

Supabase → Authentication → Multi-Factor Authentication:

- TOTP must be enabled.

Workflow:

1. Keep `REQUIRE_ADMIN_MFA=false`.
2. Login with email/password.
3. Open `/admin/security`.
4. Click `Enroll authenticator`.
5. Scan QR code in Google Authenticator.
6. Enter the 6-digit code.
7. Click `Require MFA` only after successful verification.
8. Test logout/login again.
9. After enrollment succeeds, set `REQUIRE_ADMIN_MFA=true`, redeploy, and repeat
   the logout/login test. This is a mandatory production cutover step; keep
   `false` only during the controlled bootstrap window.

## 8. Redeploy

After environment variables change:

```text
Vercel → Deployments → Redeploy
```

Prefer a clean redeploy without old build cache if Vercel offers that option.

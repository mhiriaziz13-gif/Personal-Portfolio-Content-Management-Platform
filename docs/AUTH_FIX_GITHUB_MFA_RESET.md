# GitHub, Password Reset and MFA

## GitHub OAuth

1. Create a GitHub OAuth App.
2. Set its callback URL to `https://PROJECT_REF.supabase.co/auth/v1/callback`.
3. Enable GitHub in Supabase **Authentication > Providers** and paste the Client ID and Client Secret.
4. Add these Supabase redirect URLs for local and production:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/admin`
   - `http://localhost:3000/auth/callback?next=/admin/reset-password`
   - `https://ahmedaziz-portfolio.vercel.app/auth/callback`
   - `https://ahmedaziz-portfolio.vercel.app/auth/callback?next=/admin`
   - `https://ahmedaziz-portfolio.vercel.app/auth/callback?next=/admin/reset-password`
5. Add the exact GitHub-created Supabase Auth user UUID to `public.admins`. No admin is created automatically.

The app exchanges the OAuth code server-side, verifies `public.admins`, enforces the user's MFA preference and rejects unauthorized users.

## Password reset

Set the Supabase Site URL to the production URL and include all callback URLs above. Keep the recovery email link as:

```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

The app requests recovery with `/auth/callback?next=/admin/reset-password`, validates a strong password, revokes remembered devices, signs out globally and returns to login.

## CAPTCHA for password entry points

The application uses hCaptcha. Before deployment, the owner must confirm that
the production Supabase project selects hCaptcha and stores the matching
provider secret in Supabase Auth. Vercel must provide:

```text
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-public-hcaptcha-site-key
```

The private hCaptcha secret belongs only in hCaptcha and **Supabase Authentication > Bot and Abuse Protection**. It must not be stored in the repository, sent to the browser, or added as a `NEXT_PUBLIC_*` variable.

The login and forgot-password forms reset their one-time widget token after every request. Supabase verifies that token during password sign-in or recovery-email creation. GitHub OAuth, the OAuth callback, MFA, remembered devices, the recovered-session password update, and logout remain unchanged and do not receive a CAPTCHA token.

Allow the production hostname in the hCaptcha site configuration. Add a trusted Vercel preview hostname only when preview authentication is intended. Use hCaptcha's documented test keys with a non-production Supabase project for local automated testing.

## TOTP and remembered devices

Keep `REQUIRE_ADMIN_MFA=false` only during controlled initial setup. Sign in,
open `/admin/security`, enroll Google Authenticator, scan the QR code and verify
a six-digit code. Then enable the per-admin MFA requirement, set
`REQUIRE_ADMIN_MFA=true`, redeploy, and repeat the login test. The global switch
is mandatory before production acceptance.

Remembered devices last `ADMIN_MFA_REMEMBER_DAYS` (10 days by default, configurable from 1–30 days). The raw random token exists only in an HttpOnly SameSite cookie; Supabase stores its hash. Password reset and security controls revoke devices.

Generate `ADMIN_DEVICE_HMAC_SECRET` independently with at least 32 random bytes.
It must not reuse the privacy, rate-limit, Supabase, OAuth, or other application
secrets and has no fallback in the application.

## Troubleshooting the three common production errors

### `requested path is invalid` after a password-reset email

In Supabase **Authentication > URL Configuration**:

- Site URL: `https://ahmedaziz-portfolio.vercel.app`
- Redirect URLs:
  - `https://ahmedaziz-portfolio.vercel.app/auth/callback`
  - `https://ahmedaziz-portfolio.vercel.app/auth/callback**`
  - `http://localhost:3000/auth/callback**`

In Vercel Production variables, both `APP_URL` and `NEXT_PUBLIC_SITE_URL` must be `https://ahmedaziz-portfolio.vercel.app`. Redeploy after changing them. The application now builds reset redirects from the real request origin, so an accidentally stale `APP_URL` cannot send production recovery emails to localhost.

### `Could not enroll authenticator`

The application now clears stale unverified TOTP factors before creating a new enrollment. In Supabase Auth MFA settings, make sure TOTP enrollment and TOTP verification are enabled. Sign out, sign in with the first factor, then open `/admin/security?setup=mfa` and enroll again.

### `Unsupported provider: provider is not enabled`

In Supabase **Authentication > Sign In / Providers > GitHub**, enable GitHub and save the GitHub Client ID and Client Secret. The GitHub OAuth App callback must be:

`https://<production-project-ref>.supabase.co/auth/v1/callback`

Its homepage URL should be `https://ahmedaziz-portfolio.vercel.app`. The GitHub-created Supabase Auth user must also be present in `public.admins`.
## Required recovery email template

In Supabase **Authentication > Email Templates > Reset password**, use this link:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Add these redirect URLs in **Authentication > URL Configuration**:

- `https://ahmedaziz-portfolio.vercel.app/auth/confirm`
- `http://localhost:3000/auth/confirm`

The `/auth/confirm` route verifies the recovery token server-side, creates the cookie session and redirects to `/admin/reset-password`. Request a new email after saving this template; existing messages keep their old link.

The recovery callback accepts both Supabase's default PKCE code response and the custom `token_hash` template. This keeps existing/default recovery templates compatible.

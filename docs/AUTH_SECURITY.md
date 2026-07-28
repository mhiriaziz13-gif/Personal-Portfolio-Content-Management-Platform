# Auth Security

## Email And Password Login

Admin login is available at:

```text
/admin/login
```

The login route:

- validates same-origin requests
- rate limits by IP and email/IP
- signs in with Supabase email/password
- checks explicit admin membership in `public.admins`
- signs out non-admin users immediately
- returns generic errors
- enforces MFA when configured

## GitHub OAuth

The login page includes Continue with GitHub.

Flow:

1. `/api/auth/oauth/github` starts Supabase GitHub OAuth.
2. Supabase returns to `/auth/callback?next=/admin`.
3. The callback exchanges the code for a session.
4. The callback verifies `public.admins`.
5. Non-admin users are signed out.
6. MFA is enforced if required.

GitHub login never grants admin access by itself.

## Admin Verification

Admin access requires:

- valid Supabase Auth session
- `auth.users.id` present in `public.admins`

The service role key is used only on server-side routes/helpers.

## MFA / TOTP

MFA uses Supabase Auth MFA TOTP APIs:

- `enroll`
- `challengeAndVerify`
- `listFactors`
- `getAuthenticatorAssuranceLevel`
- `unenroll`

TOTP is a second factor after password or OAuth login. It is not a password replacement and is not used as TOTP-only login.

If `REQUIRE_ADMIN_MFA=true`, database preferences cannot weaken the requirement.

## Remember Device

Remember device is available during TOTP verification.

Rules implemented:

- random token generated server-side
- only SHA-256 token hash stored in `admin_remembered_devices`
- raw token stored only in an HttpOnly cookie
- Secure cookie in production
- SameSite=Lax
- default expiry controlled by `ADMIN_MFA_REMEMBER_DAYS`, default 14 days (configurable from 1–30 days)
- remembered devices skip only MFA, never password/OAuth login
- admin can revoke devices from `/admin/security`
- password reset revokes remembered devices

## Forgot And Reset Password

Forgot password:

- route `/admin/forgot-password`
- always returns a generic success message
- does not reveal whether the email exists or is admin
- sends Supabase recovery email with `/auth/callback?next=/admin/reset-password`

Reset password:

- route `/admin/reset-password`
- requires a valid Supabase recovery session
- validates password strength
- updates password through Supabase Auth
- revokes remembered devices
- signs out globally when possible
- redirects to login

## Safe Redirects

All `next` parameters pass through `safeRedirect()`.

Allowed:

- relative internal paths starting with `/`

Blocked:

- external URLs
- protocol URLs
- protocol-relative `//host` URLs

## Audit Logs

The app logs security-sensitive events best-effort to `admin_audit_logs`, without passwords, TOTP codes, raw remember tokens, recovery links or sensitive request bodies.

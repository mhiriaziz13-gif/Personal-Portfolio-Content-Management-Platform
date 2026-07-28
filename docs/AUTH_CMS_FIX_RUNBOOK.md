# Auth and CMS repair runbook

This runbook covers the external configuration required by the repaired admin login, CMS, GitHub OAuth, and password-recovery flows. Never put the service-role key in browser code or in a `NEXT_PUBLIC_*` variable.

## 1. Vercel environment variables

Configure these variables for Production, Preview, and Development as appropriate:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_OR_SECRET_KEY

NEXT_PUBLIC_SITE_URL=https://ahmedaziz-portfolio.vercel.app
APP_URL=https://ahmedaziz-portfolio.vercel.app
ALLOWED_ORIGINS=https://ahmedaziz-portfolio.vercel.app,http://localhost:3000,http://127.0.0.1:3000

REQUIRE_ADMIN_MFA=true
ADMIN_MFA_REMEMBER_DAYS=14

NEXT_PUBLIC_GITHUB_USERNAME=mhiriaziz13-gif
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W7WJF6YR9X
```

Redeploy the Vercel project after changing environment variables. A controlled
bootstrap may temporarily use `REQUIRE_ADMIN_MFA=false` until the full MFA
enrollment and recovery flow has been verified. Set it back to `true`, redeploy,
and retest before production acceptance.

## 2. Supabase URL configuration

In **Supabase → Authentication → URL Configuration**, set:

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

Add the equivalent callback URLs for any Vercel preview domain that will be used for authentication.

## 3. GitHub OAuth

In **Supabase → Authentication → Providers → GitHub**:

```text
Enabled: ON
Client ID: from the GitHub OAuth App
Client Secret: from the GitHub OAuth App
```

In the GitHub OAuth App:

```text
Homepage URL:
https://ahmedaziz-portfolio.vercel.app

Authorization callback URL:
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

The GitHub callback goes to Supabase first, not directly to the portfolio. Supabase then redirects to `/auth/callback`. A GitHub identity can create a separate row in `auth.users`; it is not made an administrator automatically. Add that exact user ID to `public.admins`.

## 4. Password-recovery email

Keep the Supabase password-recovery email template link dynamic:

```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

Do not hardcode a portfolio reset URL in the template. The application supplies the current request origin and `/auth/callback?next=/admin/reset-password` to Supabase.

## 5. Admin and CMS SQL checks

Verify current administrators:

```sql
select
  a.user_id,
  u.email,
  a.created_at
from public.admins a
join auth.users u on u.id = a.user_id;
```

Add Ahmed's email/password auth user:

```sql
insert into public.admins (user_id, email)
select id, email
from auth.users
where email = 'mhiriaziz13@gmail.com'
on conflict do nothing;
```

Verify that core CMS data still exists:

```sql
select 'profile' as table_name, count(*) from public.profile
union all select 'hero', count(*) from public.hero
union all select 'about', count(*) from public.about
union all select 'skills', count(*) from public.skills
union all select 'projects', count(*) from public.projects
union all select 'experience', count(*) from public.experience
union all select 'education', count(*) from public.education
union all select 'certifications', count(*) from public.certifications
union all select 'resumes', count(*) from public.resumes
union all select 'social_links', count(*) from public.social_links
union all select 'admins', count(*) from public.admins;
```

If GitHub creates a different `auth.users` row, locate it and add that ID too:

```sql
select id, email, raw_app_meta_data, created_at
from auth.users
where email = 'mhiriaziz13@gmail.com'
order by created_at;

insert into public.admins (user_id, email)
select id, email
from auth.users
where id = 'GITHUB_AUTH_USER_UUID'
on conflict do nothing;
```

## 6. Verification checklist

Run locally:

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run dev
```

Then verify:

1. Email/password login opens `/admin`.
2. Editing one profile or hero value saves, survives refresh, and does not request MFA while `REQUIRE_ADMIN_MFA=false`.
3. Forgot password sends an email; the email returns through `/auth/callback` to `/admin/reset-password`; updating the password returns to `/admin/login?reset=success`.
4. Continue with GitHub opens GitHub/Supabase and returns through `/auth/callback`.
5. An authorized GitHub user reaches `/admin`; a non-admin is signed out and sees the unauthorized-account message.
6. In local development only, `/api/admin/whoami` reports the session user, admin membership, and MFA flag. It returns 404 in production.

After deployment, repeat login, one CMS save, forgot/reset password, and GitHub OAuth against the production URL.

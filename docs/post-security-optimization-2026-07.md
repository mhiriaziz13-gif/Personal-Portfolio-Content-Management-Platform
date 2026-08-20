# Post-security optimization report — 2026-07-14

## Scope and status

- Repository: `ahmedazizmhiri/3D-Portfolio`, branch `main`.
- Supabase project: `qflchsmvszbesfnomdeo` (`https://qflchsmvszbesfnomdeo.supabase.co`).
- Validation target: a local Next.js 16.2.9 production build served at `http://localhost:3300` with Chrome 148 and Lighthouse 13.4.0.
- No commit, push, Vercel deployment, or Supabase migration application was performed, as required by the task.
- No destructive SQL or production data mutation was executed.

## Exact files

### Modified tracked files

- `.env.example`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/login/route.ts`
- `app/globals.css`
- `app/layout.tsx`
- `components/admin/login-form.tsx`
- `components/admin/password-forms.tsx`
- `components/canvas/earth-canvas.tsx`
- `components/main/about.tsx`
- `components/main/certifications-section.tsx`
- `components/main/contact.tsx`
- `components/main/education-section.tsx`
- `components/main/experience.tsx`
- `components/main/footer.tsx`
- `components/main/hero.tsx`
- `components/main/navbar.tsx`
- `components/main/projects.tsx`
- `components/main/resume-section.tsx`
- `components/main/skills.tsx`
- `components/main/star-background.tsx`
- `components/sub/avatar-card.tsx`
- `components/sub/dynamic-title.tsx`
- `components/sub/hero-content.tsx`
- `components/sub/project-card.tsx`
- `components/sub/skill-data-provider.tsx`
- `components/sub/skill-text.tsx`
- `docs/AUTH_FIX_GITHUB_MFA_RESET.md`
- `docs/FIXED_SUPABASE_VERCEL_RUNBOOK.md`
- `docs/SUPABASE_SETUP.md`
- `docs/VERCEL_SETUP.md`
- `lib/security/validation.ts`
- `next.config.js`
- `scripts/security/verify-production-security.mjs`
- `tailwind.config.ts`

### New files

- `components/main/contact-form.tsx`
- `components/main/deferred-analytics.tsx`
- `components/main/deferred-background-video.tsx`
- `components/main/deferred-contact-form.tsx`
- `components/main/deferred-earth-canvas.tsx`
- `components/main/deferred-star-background.tsx`
- `components/main/image-fallback-controller.tsx`
- `components/main/mobile-navigation.tsx`
- `components/security/captcha-widget.tsx`
- `components/sub/avatar-artwork.tsx`
- `components/sub/certification-artwork.tsx`
- `components/sub/experience-marker.tsx`
- `components/sub/project-artwork.tsx`
- `supabase/migrations/20260714113949_rls_performance_optimization.sql`
- `docs/post-security-optimization-2026-07.md`

## CAPTCHA integration

### Provider and environment

- Implemented provider: Cloudflare Turnstile, based on the repository's existing provider intent. The Supabase dashboard's selected provider is not exposed by the available project tooling, so confirming that the live `qfl` project is also configured for Turnstile remains a release gate.
- Added public configuration only:
  - `NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile`
  - `NEXT_PUBLIC_CAPTCHA_SITE_KEY=`
- No CAPTCHA provider secret, Supabase service-role key, token, or other server secret was added to source, documentation, or browser bundles.
- The provider secret remains a Cloudflare/Supabase dashboard setting and must never be a `NEXT_PUBLIC_*` value.

### Protected operations

- Admin email/password login passes the bounded `captchaToken` to Supabase `signInWithPassword` options.
- Forgot-password passes the bounded `captchaToken` to Supabase `resetPasswordForEmail` together with the existing safe `redirectTo` value.
- Password recovery keeps the generic account-existence response.
- GitHub OAuth was not given a CAPTCHA and its route/callback/PKCE architecture was not redesigned.
- MFA, remembered devices, logout, CMS, uploads, messages, settings, Realtime, callback, and the public contact form were not coupled to Supabase Auth CAPTCHA.

### Widget lifecycle and isolation

- The reusable widget uses the official `https://challenges.cloudflare.com/turnstile/v0/api.js` script with explicit rendering.
- It retains the widget ID, clears tokens on error/expiry, resets after every actual password/recovery attempt, removes the widget on unmount, and avoids duplicate Strict Mode rendering.
- Login/recovery fail closed if the configured provider is unavailable, the site key is missing, initialization fails, the token expires, or no token exists.
- Token values are never logged.
- Accessible live status, dark theme, and flexible sizing are implemented.
- Browser verification with Cloudflare's public test key found the challenge iframe on `/admin/login` and `/admin/forgot-password` and kept the GitHub OAuth control separate.
- The widget implementation is an auth-route-only chunk of 3,483 uncompressed bytes. It is absent from the homepage client manifest and the homepage critical network trace.

### CSP

- When `NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile`, only `https://challenges.cloudflare.com` is appended to `script-src`, `frame-src`, and `connect-src`.
- hCaptcha origins are not added when Turnstile is selected.
- Production does not contain `unsafe-eval` or `wasm-unsafe-eval`; development retains Next.js's existing development-only `unsafe-eval` requirement.
- `object-src 'none'`, `base-uri`, `frame-ancestors`, `form-action`, nonces, and the remaining allowlists remain restricted.

## WebAssembly and Three.js corrections

### WebAssembly CSP root cause

`@react-three/drei`'s default `useGLTF` path registered the Meshopt decoder, whose embedded WebAssembly was invoked even though `/planet/scene.gltf` uses neither Meshopt nor Draco compression. The retained model does not require that decoder.

The Earth loader now uses Three's `GLTFLoader` directly through `useLoader`, so the Meshopt decoder implementation/embedded binary is not bundled or invoked. Consequently, production CSP did not need to add `wasm-unsafe-eval`, and `unsafe-eval` was not restored. Scrolling to Contact loaded `scene.gltf` and `scene.bin` with no WebAssembly CSP exception.

### NaN geometry root cause

The starfield allocated `Float32Array(5000)` and exposed it as a position attribute with item size 3. Because 5,000 is not divisible by 3, the final vertex was incomplete and Three calculated a NaN bounding-sphere radius.

The implementation now allocates `starCount * 3`, validates/sanitizes every coordinate with `Number.isFinite`, and emits a bounded development-only diagnostic. Independent decoding of all float accessors in `scene.bin` found no non-finite values. Final browser runs produced no `BufferGeometry` NaN error or exception loop.

The only residual Three console notice is the dependency-level `THREE.Clock` deprecation warning. It is not a runtime failure, CSP issue, or geometry error.

## Performance implementation

- Three.js, React Three Fiber, GLTF loading, model binary, textures, and star rendering are outside the initial route. Earth loads only near Contact; the star canvas loads after interaction or the long defer window.
- Render loops pause while offscreen or when the page is hidden. Earth caps DPR, uses the lower-power renderer preference, disposes cloned resources, and clears the GLTF suspense cache on unmount.
- `/videos/blackhole.webm` and `/videos/skills-bg.webm` have no `src` until activation, use `preload="none"`, and pause offscreen/hidden. Reduced-motion and save-data users retain the static fallback.
- Google Analytics, Vercel Analytics, and Speed Insights defer until interaction or 12 seconds after load. None appears in the 2.5-second critical trace.
- The hero is server-rendered with no entrance-opacity gate. `/hero-bg.svg` is preloaded and receives high fetch priority; final mobile Lighthouse identifies the immediately visible hero text as LCP.
- Framer Motion was removed from the initial homepage path. It remains only inside the already-deferred Earth/star chunks.
- Static homepage sections and repeated skill/project/experience/certification content are Server Components. The navbar and Contact keep only small interactive client leaves.
- The rotating hero role is CSS-driven with reduced-motion handling instead of a JavaScript timer.
- Below-fold sections use `content-visibility: auto`; the contact form and Earth are activated near the viewport.
- Image error handling is consolidated into one delegated controller instead of hydrating a stateful component for every image.
- Responsive image sizes were tightened for the avatar, project/certification artwork, logos, and hero. A normal 1.25-DPR browser selected the 384px avatar candidate; Lighthouse's higher-DPR mobile emulation correctly selected 640px with only a 25.8 KiB transfer.
- Route prefetch was disabled for the static navigation/hero links that were causing unnecessary initial RSC requests.
- Heading hierarchy, link names, contrast, form labels, keyboard focus styles, and reduced-motion behavior were corrected.

## Lighthouse results

These are six fresh, sequential runs against the same warmed local production build after closing audit-only headless browser sessions. The occasional Windows Lighthouse CLI `EPERM` happened only while deleting its temporary Chrome profile after a valid JSON report had already been written; each included report was parsed and validated.

### Mobile

| Run | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Speed Index | Transfer | Main thread | Unused JS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 95 | 100 | 100 | 100 | 1.110s | 2.838s | 16ms | 0 | 1.287s | 319,508 B | 655ms | 47,900 B |
| 2 | 95 | 100 | 100 | 100 | 1.110s | 2.843s | 16ms | 0 | 1.317s | 319,510 B | 679ms | 47,900 B |
| 3 | 94 | 100 | 100 | 100 | 1.110s | 3.027s | 86ms | 0 | 1.589s | 319,508 B | 1,089ms | 47,900 B |
| **Median** | **95** | **100** | **100** | **100** | **1.110s** | **2.843s** | **16ms** | **0** | **1.317s** | **319,508 B (312.0 KiB)** | **679ms** | **47,900 B** |

The third LCP sample was 27ms over 3.0s, but the required median is 2.843s and passes the stated target. The median, not the best single run, is used for the conclusion.

### Desktop

| Run | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Speed Index | Transfer | Main thread | Unused JS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 100 | 100 | 100 | 0.350s | 0.701s | 0ms | 0 | 0.541s | 307,828 B | 190ms | 47,900 B |
| 2 | 100 | 100 | 100 | 100 | 0.340s | 0.705s | 0ms | 0 | 0.516s | 307,826 B | 202ms | 47,900 B |
| 3 | 100 | 100 | 100 | 100 | 0.340s | 0.716s | 0ms | 0 | 0.592s | 307,828 B | 265ms | 47,900 B |
| **Median** | **100** | **100** | **100** | **100** | **0.340s** | **0.705s** | **0ms** | **0** | **0.541s** | **307,828 B (300.6 KiB)** | **202ms** | **47,900 B** |

### Baseline comparison

| Metric | Baseline | Final median |
|---|---:|---:|
| Mobile performance | 35 | 95 |
| Mobile LCP | 17.7s | 2.843s |
| Mobile TBT | 28,980ms | 16ms |
| Mobile main thread | ~41.1s | 679ms |
| Mobile Speed Index | 11.9s | 1.317s |
| Mobile accessibility | 95 | 100 |
| Mobile best practices | 92 | 100 |
| Desktop performance | 42 | 100 |
| Desktop LCP | 3.2s | 0.705s |
| Desktop TBT | 26,980ms | 0ms |
| Desktop main thread | ~33.7s | 202ms |
| Desktop Speed Index | 6.5s | 0.541s |
| Initial payload | ~4.54–4.59 MiB | 312.0 KiB mobile median |
| Mobile unused JS | ~196 KiB | 46.8 KiB |
| CLS | 0 | 0 |
| SEO | 100 | 100 |

Initial transfer is down by approximately 93%. The final Lighthouse waterfall has 15 critical requests and contains the document, one CSS file, framework/app JavaScript, the high-priority hero SVG, the responsive avatar, and the icon. It contains no video, model, model binary, large texture, Three implementation, CAPTCHA, GTM/GA, Vercel analytics, or RSC-prefetch request.

## Bundle analyzer summary

- Homepage total first-load uncompressed JavaScript: 553,833 bytes (540.9 KiB) across 10 chunks.
- Homepage layout/page client-entry JavaScript: 96,915 bytes (94.6 KiB) across three entry chunks; the page-specific entry beyond the two shared layout entries is 18,655 bytes (18.2 KiB).
- `/contact`: 537,668 first-load uncompressed bytes across 10 chunks.
- `/admin/login`: 791,122 first-load uncompressed bytes across 12 chunks. Supabase/auth/CAPTCHA code stays on the auth route rather than entering the homepage.
- Three/WebGL core: 893,394 uncompressed bytes (872.5 KiB), dynamically loaded only after the star/Earth activation boundary.
- GLTF loader/Earth feature chunk: 70,787 bytes (69.1 KiB), deferred with Contact.
- Star implementation chunk: 7,602 bytes (7.4 KiB), deferred.
- CAPTCHA chunk: 3,483 bytes (3.4 KiB), auth-only.
- Contact form chunk: 3,733 bytes (3.6 KiB), loaded near Contact.
- Admin modules do not appear in the homepage client manifest. CAPTCHA, Three, and GLTF implementation chunks do not appear in the initial homepage network requests.
- Public browser source maps remain disabled; the Lighthouse source-map diagnostic is accepted rather than exposing production source.

## Supabase RLS performance migration

New migration: `supabase/migrations/20260714113949_rls_performance_optimization.sql`.

The single 21,875-byte transaction:

- uses lock/statement timeouts;
- verifies the exact helper definition, grants, role inheritance, RLS state, table set, and current policy definitions before changing anything;
- wraps `auth.uid()` and the stable admin helper in scalar `select` expressions where semantically equivalent;
- removes only redundant permissive SELECT policies;
- replaces broad admin `FOR ALL` content policies with combined authenticated SELECT and separate admin INSERT/UPDATE/DELETE policies;
- preserves the parent-project publication condition for `project_sections`;
- aborts in postflight if duplicate permissive policies remain for an affected explicit role/action;
- changes no table, row, grant, Auth user, Storage object, Realtime setting, or service-role bypass behavior.

No `DROP TABLE`, `TRUNCATE`, row `DELETE`, data `UPDATE`, data `INSERT`, schema reset, or destructive operation exists in the migration.

### Preserved access matrix

| Actor | Public published content | Unpublished CMS content | CMS mutations | Admin security preferences/devices | Admin table |
|---|---|---|---|---|---|
| Anonymous | Read | Denied | Denied | Denied | Denied |
| Authenticated non-admin | Read | Denied | Denied | Only existing explicitly permitted own-data semantics; no admin escalation | Denied |
| Authenticated admin | Read | Read | Insert/update/delete | Existing own-user plus admin-helper constraints preserved | Existing secured admin behavior preserved |
| Service role | Existing PostgreSQL `BYPASSRLS` behavior unchanged | Unchanged | Unchanged | Unchanged | Unchanged |

The current public rows are all published and `project_sections` is empty, so unpublished-row behavior could not be exercised against production data without creating/mutating rows. It was instead verified algebraically: old and new authenticated SELECT are both `published OR is_admin`; anonymous SELECT remains `published`; mutations remain admin-only; ownership remains `own user_id AND is_admin`.

### Advisor state and migration ledger

- Live `qfl` baseline: 4 `auth_rls_initplan` WARN findings and 13 `multiple_permissive_policies` WARN findings.
- After state: not claimed, because the task explicitly prohibited applying the migration. The migration is designed to reduce those two WARN categories to 0/0 if its drift preflight succeeds; this must be confirmed with a new advisor export after an authorized application.
- Informational unused-index findings are outside this migration's requested scope.
- The remote/local migration ledgers are divergent. Remote `qfl` reported `202606270001`, `202607040001`, and `20260714093312`; the local folder contains `202607080001`, `202607090001`, `202607100001`, `202607130001`, `20260714093312`, and the new `20260714113949`. Do not run `supabase db push` until this ledger is reconciled.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
- https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations

## Verification results

- `npm run type-check`: pass.
- `npm run lint`: pass.
- `npm run build`: pass; all static and dynamic application routes completed production generation.
- `npm test`: not run because the repository defines no test script.
- `npm run security:verify` against the local production server: 65 passed, 3 warnings, 0 failures. The warnings are expected for loopback HTTP redirect testing and the existing 404 responses for `/robots.txt` and `/sitemap.xml`.
- `git diff --check`: pass; only Git's existing LF-to-CRLF working-tree notices were printed.
- Final Lighthouse accessibility: 100 on all six runs. This covers the integrated axe checks used by Lighthouse.
- Final browser checks: homepage, mobile menu, CSS title rotation, responsive image path, Contact activation, contact form controls, Earth canvas/model, login Turnstile, and forgot-password Turnstile passed.
- Final browser console: no hydration exception, WebAssembly CSP error, NaN geometry error, or repeated exception loop. Local-only residual notices are Vercel Analytics/Speed Insights 404 messages after their deferred activation and the Three dependency's `THREE.Clock` deprecation warning.
- The initial 2.5-second resource timeline contains no `scene.gltf`, `scene.bin`, model texture, video, CAPTCHA, GA/GTM, or Vercel analytics request.
- Logout source verification: `/api/auth/logout` exports POST only; the dashboard uses `<form action="/api/auth/logout" method="POST">`; there is no logout GET handler or logout `Link`.

## Regression and release limitations

- No real admin credentials, MFA factor, remembered-device token, OAuth provider round trip, password-reset email, CMS mutation, upload, Media Library mutation, message mutation, Settings mutation, Realtime counter mutation, or service-role request was executed. Static contracts, build output, local routes, browser behavior, and security invariants were verified without changing production state. Credentialed end-to-end regression remains a release gate.
- CAPTCHA provider and secret configuration must be confirmed in the live `qfl` Supabase dashboard. Configure the public provider/site-key variables for the intended Vercel Production, Preview, and Development environments and allow the production, preview, and localhost hostnames in Cloudflare before deployment.
- The final Lighthouse suite is a local production-build result, not a Vercel preview result, because deployment was explicitly prohibited. After an authorized preview deployment, repeat three fresh mobile and three fresh desktop runs and compare medians.
- Reconcile the Supabase migration ledger before applying the new migration. Apply through a controlled, reviewed path, run anonymous/non-admin/admin/service-role tests, then rerun Performance Advisor before claiming the live warnings are resolved.
- Vercel's analytics endpoints naturally return 404 on the local Next server; verify them on the preview/production deployment.
- One of three mobile LCP samples was 3.027s; the median passes at 2.843s. Continue monitoring real-user LCP after deployment.
- Missing public production source maps remain intentionally accepted to avoid exposing source solely for a non-scored diagnostic.

## Security-preservation confirmations

- GitHub OAuth and its callback architecture were not redesigned.
- The protected admin/MFA/remembered-device/admin-authorization flow remains in place after password authentication.
- Logout remains explicit-action, POST-only.
- Production CSP did not regain `unsafe-eval` and did not need `wasm-unsafe-eval`.
- No destructive SQL or production data mutation was executed.
- No commit, push, deployment, Vercel environment mutation, Supabase Auth setting mutation, or migration application was performed.

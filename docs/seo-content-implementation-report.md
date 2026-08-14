# SEO and content implementation report

## 1. Executive summary

This local, uncommitted release adds a maintainable organic-discovery foundation without changing Supabase production data, RLS, auth, hCaptcha, OAuth, MFA, logout, CSP or Vercel settings. It adds canonical metadata, production/preview index controls, discovery files, structured data, dedicated core routes, deeper project structure, crawlable navigation and a production-safe audit script. It does not promise crawling, indexing, rankings, backlinks, traffic or AI citations.

## 2–5. Audit, brand, intent and information architecture

The baseline audit is in `docs/seo-content-audit.md`; brand strategy is in `docs/personal-brand-strategy.md`; route intent is in `docs/seo-topic-and-entity-map.md`. Before: homepage-anchor-led content plus About, Projects, Experience, Resume and Contact. After: dedicated About, Expertise, Projects/detail, Experience, Education, Certifications, Resume and Contact routes, all reachable through canonical navigation/footer links.

## 6–9. Routes, files and content

Added routes: `/expertise`, `/education`, `/certifications`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/humans.txt`, `/manifest.webmanifest`, `/opengraph-image`, and a real 404. Modified routes: `/`, `/about`, `/projects`, `/projects/[slug]`, `/experience`, `/resume`, `/contact`, and `/admin/*` metadata through its layout.

Added implementation files: `app/admin/layout.tsx`, the three dedicated page files, discovery metadata/route files, `app/not-found.tsx`, `app/opengraph-image.tsx`, `components/seo/*`, `lib/seo/*`, and `scripts/seo/audit.mjs`. Modified implementation files: `config/index.ts`, `constants/portfolio.ts`, `data/fallback-portfolio.ts`, `components/main/footer.tsx`, the seven public page files, the dynamic project page, and `package.json`. Added documentation files are those listed by `git status` under `docs/seo-*`, plus the brand, AI search, insights, international, off-site, profile, backlink, outreach, content-information and submission documents.

Content changes establish the exact “Ahmed Aziz Mhiri” spelling, the approved positioning and tagline, dedicated-page summaries, business-problem expertise groups, honest case-study sections, descriptive related links and explicit confidentiality/measurement caveats. The vague fallback Business Intelligence institution is no longer presented as a verified institution.

## 10–16. Metadata, canonicals, discovery and social data

`lib/seo` provides typed metadata, URL and schema helpers. Canonicals always use `https://ahmedaziz-portfolio.vercel.app` unless a validated trusted production URL is configured; arbitrary request hosts and Vercel preview domains cannot become canonicals. Every indexable route has a unique title, description, canonical, Open Graph and Twitter card. Project pages generate metadata from published content.

Production robots allow public content and disallow `/api/`; admin/auth HTML remains crawlable so its metadata and X-Robots-Tag noindex can be read. Non-production disallows all and emits noindex metadata and headers. The sitemap includes only core public routes and published CMS projects. `llms.txt` uses the same published source, includes no operational links or identifiers, and explicitly states its experimental limitations. The structured-data graph uses Person, WebSite, CreativeWork and BreadcrumbList with stable canonical IDs and visible, verified fields. The generated 1200×630 social image uses approved identity, tagline and brand colors.

## 17–22. Links, navigation, projects, CMS, AI and off-site work

Desktop/mobile navigation now share canonical dedicated-page URLs; footer secondary navigation covers every core route. Project pages include breadcrumbs, related projects, expertise/experience links and a contact CTA. Fallback projects contain summary, problem, role/approach, deliverables/safeguards and outcome/lesson sections with project-specific public-safe wording.

No database migration or production-data write was made. Existing `projects.metadata` and `site_settings` were audited, but a CMS SEO editor was not added because public mapping/validation and live data compatibility require a separately reviewed change. Current publishing filters remain unchanged. AI-search work is documented in `docs/ai-search-discoverability.md`; ethical off-site work is documented in the playbook, opportunity list, profile copy and unsent outreach templates.

## 23–25. Analytics, international SEO and performance

The privacy-safe event taxonomy is documented; no personal/contact/auth data is sent and existing deferred analytics remains intact. English remains the sole locale; no hreflang, partial French pages or doorway pages were created. Server Components remain the default, primary text is present in HTML, and deferred video/Three.js/analytics/hCaptcha behavior was not changed.

## 26–29. Security and test results

Security preservation: logout is still POST-only through the existing form/route; no GET logout, Link logout, automatic sign-out or auth rewrite was added. Supabase clients, RLS, OAuth, MFA, remembered devices, recovery, hCaptcha, uploads, messages, settings, security headers and CSP were not changed.

Results:

- `npm run type-check`: pass.
- `npm run lint`: pass.
- `npm run build`: pass after rerunning outside the sandbox because the first Windows worker spawn returned `EPERM`.
- `SECURITY_TARGET_URL=http://localhost:3000 npm run security:verify`: 68 passed, 0 failed, 1 expected loopback warning (HTTP-to-HTTPS redirect check skipped).
- `npm run seo:audit -- http://localhost:3001`: 0 failures, 0 warnings.
- Route status check: core/discovery routes 200; auth callback 307; known missing route 404.
- Browser automation: the `agent-browser` CLI is not installed; rendered-source, HTTP and Lighthouse headless-Chrome checks were used instead.
- Lighthouse: six second-pass runs are reported below.

## 30–33. Manual work, missing facts, risks and release order

Manual work remains for Google Rich Results Test, Schema.org validator, Search Console and Bing verification/submission, LinkedIn/social-card previews, production crawl, interactive browser console/Network checks and authenticated CMS write regression. Facts still needed are in `docs/content-information-required.md`.

Risks: production CMS copy can differ from fallbacks; CMS project sections may remain thinner until reviewed; live social assets and verification tokens depend on deployment environment; dedicated pages intentionally avoid unsupported detail. No indexing, ranking, backlink or AI-citation outcome is guaranteed.

Recommended release order: review facts and diff; update and validate live CMS education in staging; set public verification environment values; deploy preview and confirm noindex; run interactive browser/auth/CMS checks; validate schema/social previews; deploy production; smoke-test discovery endpoints; submit sitemap manually; monitor indexing, errors and conversions monthly.

## Mandatory second-pass corrections

The real working-tree review found discrepancies from the first-pass report. Five dedicated routes used `sr-only` H1 elements; three new route files were compressed into one line; production robots blocked admin/auth pages that relied on noindex; `app/auth/layout.tsx` was absent; X-Robots-Tag was absent; configured CMS queries could restore fallback rows after successful empty results or failures; fallback case-study text was generic and would not appear when CMS project rows existed; the CMS hero rendered “Ahmed Mhiri”; and the first report said Lighthouse was unavailable even though it could be run through an approved temporary `npx` package.

Corrections made:

- Added formatted, route-specific visible introductions with exactly one visible H1 for About, Expertise, Projects, Experience, Education, Certifications, Resume and Contact.
- Added breadcrumbs, proof links and route-specific CTAs without converting Server Components to Client Components.
- Added `app/auth/layout.tsx` with noindex/nofollow/nocache, preserving the equivalent admin layout.
- Production robots now disallow only `/api/`; admin/auth HTML remains crawlable so metadata and headers can communicate noindex.
- Added `X-Robots-Tag: noindex, nofollow, noarchive` for admin, auth, API and raw PDF/DOCX CV paths. Non-production deployments receive the header globally.
- Preserved production canonicals in preview behavior and documented Vercel Deployment Protection as a complementary control.
- Recorded the owner-confirmed IHEC Carthage Master's and completed Business Intelligence degree with an overall average of 17.11/20, a PFE grade of 19.5/20 and Mention Excellent.
- Added the confirmed career priorities: Italy, Spain, Croatia, Serbia and Hungary first, broader Western and Eastern Europe second, without location pages or residence/work-authorization claims.
- Enforced the exact public identity “Ahmed Aziz Mhiri” at the public CMS mapping layer without modifying the CMS row.
- Added individually written, project-specific context, problem, contribution, approach, workflow, tools, deliverables, safeguards, qualitative outcome, lessons, expertise, experience and FAQ content for all five published projects. A project must first exist in the published CMS result before this verified detail renders.
- Added `docs/cms-content-publication-map.md` and a read-only `npm run content:audit` command using only anonymous public access.

## Final robots and publishing policy

Production robots allows public pages and disallows `/api/`. Admin and auth HTML is excluded from indexing through both route metadata and X-Robots-Tag, not through robots blocking. API responses and raw CV documents carry X-Robots-Tag. Sitemap and llms.txt contain no admin, auth, API, raw CV, preview or anchor URLs.

When Supabase is not configured, documented local fallback mode uses repository content. When Supabase is configured, successful empty published results remain empty. Query failures return an empty public-content structure, log one bounded server warning without credentials, preserve static core routes and omit uncertain projects from sitemap and llms.txt. No service-role/admin query or production write is used. The read-only audit found five published project rows and zero `project_sections`; the verified repository case-study layer therefore supplies depth only for a recognized published project. Current CMS education rows still require a manual owner update and were not modified here.

## Actual analytics status

The documented events (`project_detail_view`, `resume_page_view`, `cv_download`, outbound profile clicks, `contact_form_success`, and `project_contact_cta`) are not implemented. They remain deferred because a coherent provider/consent review would otherwise require added client hydration or a broader tracking utility. Existing deferred Google/Vercel analytics behavior is preserved, and no personal, contact, CAPTCHA, authentication or Supabase identifier is sent by new code.

## Final second-pass verification

- `npm run type-check`: pass.
- `npm run lint`: pass.
- `npm run build`: pass; 21 static pages generated and dynamic operational/project routes compiled.
- `SECURITY_TARGET_URL=http://localhost:3000 npm run security:verify`: 68 passed, 0 failed, 1 loopback warning because HTTP-to-HTTPS redirect validation is not applicable to localhost.
- `npm run seo:audit -- http://localhost:3000`: 0 failures, 0 warnings.
- Historical run result: production CMS education still needed synchronization at that time. Wave 1 later synchronized the 17.11/20 overall average, 19.5/20 PFE grade and Mention Excellent.
- Rendered source inspection: every required public route has one visible H1, no hidden H1, production canonical metadata and JSON-LD. Homepage H1 is now exactly “Ahmed Aziz Mhiri”.
- Header checks: admin login, forgot password, auth callback, API contact, CV PDF and CV DOCX all return `X-Robots-Tag: noindex, nofollow, noarchive`.
- Robots output: public allow plus `/api/` disallow; canonical sitemap reference.
- Sitemap and llms checks: canonical production URLs only; no operational, raw CV, preview or unpublished-project URLs.
- Logout search: the existing admin POST form remains the only logout UI; no GET route, Link logout or automatic sign-out behavior was added.

Lighthouse 13.4.0 was run three times per form factor against the same local production build. Each run produced a valid JSON report; Lighthouse then returned Windows `EPERM` while cleaning its temporary Chrome profile. The cleanup error did not affect the collected results.

| Form factor | Performance median | Accessibility median | Best Practices median | SEO median | LCP median | CLS median | TBT median |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile | 94 | 100 | 100 | 100 | 3.1 s | 0 | 20 ms |
| Desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms |

Browser automation through `agent-browser` remains unavailable because the CLI is not installed. HTTP/rendered-source checks and Lighthouse's headless Chrome runs were completed; manual interactive Chrome console, Network, auth/CMS write flows, Google Rich Results, Schema.org validator, Search Console, Bing, share previews and post-deployment production crawl remain release checks.

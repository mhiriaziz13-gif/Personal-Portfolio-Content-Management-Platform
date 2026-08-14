# SEO and content audit

## Baseline

Branch at audit: `release/security-performance-20260714`; working tree was clean. Public routes were `/`, `/about`, `/projects`, `/projects/[slug]`, `/experience`, `/resume`, and `/contact`. Missing dedicated routes: expertise, education and certifications. Operational routes comprise `/admin/*`, `/auth/*`, and `/api/*`; these must remain excluded from discovery and noindex where HTML exists.

The baseline had one global metadata object but no `metadataBase`, canonical architecture, route-specific metadata, robots, sitemap, manifest route, llms.txt, JSON-LD, breadcrumbs or 404 page. Navigation relied heavily on homepage anchors. Project detail pages had one H1 and CMS sections but no dynamic metadata, structured data, related work or contact path. CMS public reads filtered `published=true` and fell back safely to repository data; `projects.metadata` and `site_settings` existed but were not mapped into public SEO configuration.

## Route audit

| Route group | Indexability | Baseline issue | Implemented status |
|---|---|---|---|
| `/` | indexable in production | global-only metadata; anchor-led IA | canonical metadata, Person/WebSite JSON-LD, dedicated-page links |
| `/about` | indexable | thin duplicate section, no unique metadata | unique metadata and deeper links; further owner-supplied detail desirable |
| `/expertise` | indexable | absent | added with business-problem grouping |
| `/projects` | indexable | no unique metadata | unique metadata and crawlable detail links |
| `/projects/[slug]` | published only | no dynamic metadata; structurally thin | dynamic metadata, case-study sections, breadcrumbs, CreativeWork, related links |
| `/experience` | indexable | no unique metadata or case-study links | unique metadata; project association still needs explicit owner mapping |
| `/education` | indexable | absent; vague fallback institution | added with owner-confirmed IHEC Carthage education; live CMS update still required |
| `/certifications` | indexable | absent | added with verified fields only |
| `/resume` | indexable | no unique metadata | unique metadata; raw documents remain assets |
| `/contact` | indexable | no unique metadata | unique metadata; secure form preserved |
| `/admin/*` | noindex | no segment-level robots metadata | admin layout noindex/nofollow/nocache |
| `/auth/*`, `/api/*` | non-indexable operational endpoints | excluded only implicitly | excluded from robots and sitemap |

## Content and link findings

- No duplicate public route intent was intentionally introduced. Baseline homepage copy is summarized while dedicated pages provide additional context.
- Important cards already used real anchors, but main navigation pointed to anchors. It now points to canonical routes; footer navigation covers all core pages.
- No intentionally orphaned public page remains. The audit script checks sitemap pages and internal references.
- The first pass still contained inaccurate fallback education. Wave 1 records the owner-confirmed IHEC Carthage Master's and completed Business Intelligence degree with an overall average of 17.11/20, a PFE grade of 19.5/20 and Mention Excellent.
- Project images use descriptive alt text; decorative hero imagery has empty alt. Existing company logos are visual context only and are not used as structured-data endorsements.
- CMS/fallback divergence remains possible because production data was not modified. Repository fallbacks are truthful, but live CMS copy should be reviewed after deployment.
- Analytics and performance features are deferred. Event taxonomy is documented; implementation was not allowed to send personal/contact data.
- No insights system exists. A roadmap is provided; no empty or unverified public insights pages were created.

## Risks and confirmation needs

See `docs/content-information-required.md`. Live CMS data, social previews, production crawlability, search dashboards, structured-data validators and the production build must be checked during release. Rankings, crawling, indexing, backlinks and AI citations cannot be guaranteed.

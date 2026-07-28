# Ahmed Aziz Mhiri — Data-Driven Marketing & Commercial Analytics

[![Live Portfolio](https://img.shields.io/badge/Live%20Portfolio-Visit-000000?style=for-the-badge&logo=vercel)](https://ahmedaziz-portfolio.vercel.app/?utm_source=github&utm_medium=referral&utm_campaign=portfolio_growth_2026&utm_content=repository_badge)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-CMS%20%26%20Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

A production-grade 3D personal portfolio for **Ahmed Aziz Mhiri**, positioned at the intersection of **data-driven marketing, commercial analytics, business intelligence, customer insight and process automation**.

> **Turning Data into Commercial Growth**

The platform combines a high-impact public portfolio, a Supabase-backed CMS, secure administration, structured project case studies, modern search-engine infrastructure and a performance-conscious 3D experience.

## Live links

- **Portfolio:** [View the live portfolio](https://ahmedaziz-portfolio.vercel.app/?utm_source=github&utm_medium=referral&utm_campaign=portfolio_growth_2026&utm_content=repository_readme)
- **LinkedIn:** [linkedin.com/in/ahmed-aziz-mhiri](https://linkedin.com/in/ahmed-aziz-mhiri)
- **GitHub:** [github.com/mhiriaziz13-gif](https://github.com/mhiriaziz13-gif)
- **Sitemap:** [sitemap.xml](https://ahmedaziz-portfolio.vercel.app/sitemap.xml)
- **AI-readable summary:** [llms.txt](https://ahmedaziz-portfolio.vercel.app/llms.txt)

## Professional positioning

This portfolio presents a business-oriented analytics profile rather than a pure software-engineering or machine-learning profile.

Core areas:

- Marketing and commercial analytics
- Business intelligence and KPI reporting
- Customer and operational insight
- Revenue and performance analysis
- Process automation and auditability
- Digital growth and customer journeys
- Hospitality and tourism business systems

Target role families include Marketing Data Analyst, Commercial Data Analyst, Business Intelligence Analyst, Revenue Operations Analyst, Customer Insights Analyst, CRM & Marketing Automation Specialist, Business Analyst and Process Automation Analyst.

## Selected case studies

The site currently presents five public-safe, evidence-led case studies:

1. **RPA for Invoice Control & Booking Reconciliation**  
   UiPath-based reconciliation across invoices, vouchers, reservations, stay data and commercial rules, with structured JSON outputs, HTML reporting and exception review.

2. **Digital Transformation for a Men's Barbershop**  
   Website, online booking, local SEO, customer communication, social content, email marketing and paid-social support.

3. **AI-Ready E-Learning Platform**  
   Secure multilingual learning-platform contribution using Angular, Spring Boot, REST APIs, microservices, Ollama, local LLaMA 3.2 and RAG over PDF/CSV knowledge sources.

4. **Library Management Application**  
   Full-stack management application using Angular, Spring Boot, REST APIs and a relational database.

5. **Hotel KPI & Cost Control Analysis**  
   Occupancy, operational-cost, revenue-related KPI, budget-variance and financial-reporting analysis for management decision support.

No confidential customer, reservation, hotel-contract, invoice or financial data is published.

## Main capabilities

### Public portfolio

- Responsive 3D interface
- Server-rendered public content
- Dedicated About, Expertise, Projects, Experience, Education, Certifications, Resume and Contact pages
- Dynamic project detail pages
- Crawlable navigation, breadcrumbs and related-content links
- Multiple downloadable CV variants
- Accessible semantic content layered over deferred visual effects

### CMS and content governance

- Supabase-backed content management
- Published/unpublished content controls
- CMS-authoritative production rendering
- Repository fallback content for documented local-development mode only
- Project sections and metadata support
- Profile, hero, skills, projects, experience, education, certifications, resumes and social-link management
- Media and upload workflows
- Public-safe content rules for confidential business projects

### Authentication and administration

- Supabase email/password authentication
- GitHub OAuth
- TOTP multi-factor authentication
- Remembered-device flow
- Password recovery
- hCaptcha bot protection
- Admin authorization and protected CMS routes
- POST-only logout flow
- Supabase Row Level Security

### SEO, AEO and AI discovery

- Typed route-level metadata
- Canonical URL architecture
- Open Graph and Twitter metadata
- Dynamic project metadata
- JSON-LD for Person, WebSite, CreativeWork and BreadcrumbList entities
- Production/preview indexing controls
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `humans.txt`
- Web app manifest
- Search-engine verification support
- Local SEO and content audit scripts

`llms.txt` is provided as a supplementary machine-readable summary. It does not guarantee indexing, rankings or citations by AI systems.

### Performance and observability

- Next.js App Router and Server Components
- Incremental revalidation for public CMS content
- Deferred analytics
- Deferred Three.js and background media
- Vercel Analytics and Speed Insights
- Google Analytics support
- Microsoft Clarity support
- Production security verification
- Automated SEO and content-structure audits

## Technology stack

### Application

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- React Three Fiber
- Drei
- Three.js

### Platform and data

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase SSR
- Vercel

### Security and validation

- hCaptcha
- TOTP MFA
- Row Level Security
- Zod
- Origin and method validation
- Security headers and Content Security Policy

### Analytics

- Vercel Analytics
- Vercel Speed Insights
- Google Analytics
- Microsoft Clarity

## Public routes

| Route | Purpose |
|---|---|
| `/` | Portfolio overview |
| `/about` | Professional profile and positioning |
| `/expertise` | Business capabilities, tools and related work |
| `/projects` | Published project portfolio |
| `/projects/[slug]` | Detailed project case study |
| `/experience` | Professional experience timeline |
| `/education` | Academic background |
| `/certifications` | Verified credentials |
| `/resume` | CV variants and downloads |
| `/contact` | Contact form and professional links |
| `/robots.txt` | Search-crawler directives |
| `/sitemap.xml` | Canonical public URL discovery |
| `/llms.txt` | Concise AI-readable site summary |
| `/humans.txt` | Human-readable project attribution |
| `/manifest.webmanifest` | Web application metadata |

Operational routes under `/admin`, `/auth` and `/api` are excluded from public discovery and protected through the appropriate authentication, authorization, noindex and response-header controls.

## Local development

### Prerequisites

- Node.js compatible with Next.js 16
- npm
- A Supabase project for CMS/auth functionality
- hCaptcha site configuration for protected authentication flows

### Installation

```bash
git clone https://github.com/mhiriaziz13-gif/Personal-Portfolio.git
cd Personal-Portfolio
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Use `.env.example` as the source of truth. Never commit production secrets.

```env
# Public Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only Supabase secret
SUPABASE_SERVICE_ROLE_KEY=

# Public hCaptcha widget configuration
NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
NEXT_PUBLIC_CAPTCHA_SITE_KEY=

# Server-only CAPTCHA, privacy, device, limiter and notification secrets
HCAPTCHA_SECRET_KEY=
RATE_LIMIT_HMAC_SECRET=
PRIVACY_HMAC_SECRET=
ADMIN_DEVICE_HMAC_SECRET=
RESEND_API_KEY=
CONTACT_NOTIFICATION_TO=
CONTACT_NOTIFICATION_FROM=

# Canonical application URLs
NEXT_PUBLIC_SITE_URL=https://ahmedaziz-portfolio.vercel.app
APP_URL=https://ahmedaziz-portfolio.vercel.app
ALLOWED_ORIGINS=https://ahmedaziz-portfolio.vercel.app

# Admin MFA policy
REQUIRE_ADMIN_MFA=true
ADMIN_MFA_REMEMBER_DAYS=14

# Public integrations
NEXT_PUBLIC_GITHUB_USERNAME=mhiriaziz13-gif
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
```

Important security rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser code.
- The hCaptcha secret belongs in Supabase Auth and the server-only
  `HCAPTCHA_SECRET_KEY` used by `/api/contact`, never a `NEXT_PUBLIC_*`
  variable.
- Preview deployments must remain non-indexable.
- Production canonical URLs must never be generated from an untrusted request host.

## Available commands

```bash
npm run dev
npm run type-check
npm run lint
npm run test
npm run test:coverage
npm run test:integration
npm run build
npm run start
npm run test:e2e
npm run audit:security
npm run audit:seo
npm run audit:lighthouse
npm run content:audit
```

### Command purpose

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run type-check` | Run TypeScript validation without emitting files |
| `npm run lint` | Run ESLint across the repository |
| `npm run test` | Run the deterministic Vitest suite |
| `npm run test:coverage` | Run Vitest with enforced coverage thresholds |
| `npm run test:integration` | Run credential-gated RLS checks against an isolated Supabase project |
| `npm run build` | Create a production Next.js build |
| `npm run start` | Start the production server locally |
| `npm run test:e2e` | Run public Chromium/mobile accessibility and browser flows; authenticated lifecycle tests require the isolated variables documented in `docs/QA_CHECKLIST.md` |
| `npm run audit:security` | Validate runtime security invariants; set `SECURITY_TARGET_URL` |
| `npm run audit:seo` | Audit metadata, canonicals, links, discovery files and indexability against the local production server |
| `npm run audit:lighthouse` | Run performance, accessibility, best-practices and SEO budgets; set `LIGHTHOUSE_URL` |
| `npm run content:audit` | Compare public CMS structure with repository content expectations |

## Search and discovery endpoints

After deployment, verify:

```text
https://your-domain.example/robots.txt
https://your-domain.example/sitemap.xml
https://your-domain.example/llms.txt
https://your-domain.example/humans.txt
https://your-domain.example/manifest.webmanifest
```

The production portfolio currently uses:

```text
https://ahmedaziz-portfolio.vercel.app
```

## Content publication model

The production site follows these rules:

1. When Supabase is configured, published CMS rows are authoritative.
2. A successful empty CMS result remains empty.
3. Unpublished content is never restored from repository fallback data.
4. On uncertain CMS failures, dynamic discovery output fails closed.
5. Repository fallback content is intended for documented local-development mode.
6. Public case-study content must remain factual, non-confidential and free of invented results.

## Security principles

This repository does not use `robots.txt` as a security mechanism.

Security depends on:

- Authentication
- Authorization
- Supabase RLS
- Strict HTTP methods
- Input validation
- CAPTCHA
- MFA
- Origin checks
- Protected server-side operations
- Appropriate `401`, `403` and `405` responses

The logout route remains POST-only and must not be linked or prefetched as a normal GET navigation route.

## Project structure

```text
app/                 Next.js routes, layouts, metadata and route handlers
components/          Public UI, admin UI, security and SEO components
config/              Site-wide configuration
constants/           Verified repository fallback content
lib/                 CMS, Supabase, authentication, validation and SEO utilities
public/              Public images, CV assets and static resources
scripts/security/    Production security verification
scripts/seo/         Technical SEO audit tooling
scripts/content/     Public CMS/content comparison tooling
docs/                SEO, content, branding, security and release documentation
supabase/             Database migrations and Supabase project assets
```

## Deployment

The application is designed for Vercel.

Before a production release:

1. Configure the required Vercel environment variables.
2. Configure Supabase authentication providers and redirect URLs.
3. Configure hCaptcha in Supabase Auth.
4. Validate Preview deployments remain `noindex`.
5. Run type-check, lint, build, security, SEO and content audits.
6. Test email/password login, GitHub OAuth, MFA, password recovery, CMS writes, uploads and POST-only logout.
7. Validate structured data and social previews.
8. Submit the production sitemap through Google Search Console and Bing Webmaster Tools.

## Documentation

The `docs/` directory contains the maintained implementation and operating guidance, including:

- SEO and content audit
- Personal-brand strategy
- Search-intent and entity map
- AI-search discoverability guidance
- CMS content publication map
- Off-site SEO and earned-backlink playbook
- Search-engine submission runbook
- SEO measurement plan
- International SEO roadmap
- Content information still requiring verification

## Accuracy and privacy

This portfolio intentionally avoids unsupported metrics, fake testimonials, fabricated outcomes and confidential operational data.

Public content must not expose:

- Customer identities
- Reservation references
- Hotel contracts
- Invoice values
- Confidential commercial conditions
- Private financial figures
- Authentication or administrative data

## Author

**Ahmed Aziz Mhiri**  
Data-Driven Marketing · Commercial Analytics · Business Intelligence · Process Automation

- [Portfolio](https://ahmedaziz-portfolio.vercel.app)
- [LinkedIn](https://linkedin.com/in/ahmed-aziz-mhiri)
- [GitHub](https://github.com/mhiriaziz13-gif)

## License

This project is licensed under the MIT License.

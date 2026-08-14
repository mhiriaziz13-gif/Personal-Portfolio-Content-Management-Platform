# CMS content publication map

The public Supabase client uses anonymous access and RLS-filtered published rows. When Supabase is configured, CMS publication state is authoritative: a successful empty result remains empty, and a query failure returns no uncertain dynamic content. Repository fallback content is used only when Supabase is not configured for local development.

| Content | Route | Component | Table and relevant columns | Fallback source | CMS precedence | Recommended public value | Manual CMS update |
|---|---|---|---|---|---|---|---|
| Profile | all | Navbar, Hero, About, Contact, Footer | `profile`: identity, headline, location, social URLs, bios, `published` | `constants/portfolio.ts` | CMS when configured | Exact name, positioning, Sousse, availability, consistent profiles | Yes: verify education-aware bio |
| Hero | `/` | Hero | `hero`: eyebrow, title, subtitle, tagline, CTAs, dynamic titles, `published` | `data/fallback-portfolio.ts` | CMS | Approved positioning and canonical-route CTAs | Yes |
| About | `/`, `/about` | About | `about`: title, body, highlights, avatar, `published` | fallback portfolio | CMS | Concise intersection of analytics, business and automation | Yes |
| Skills | `/`, `/expertise` | Skills and expertise cards | `skills`: name, category, description, order, `published` | skill categories | CMS | Four verified business-problem groups | Review |
| Projects | `/projects`, detail | Projects, project page | `projects`: slug, title, type, summary, image, tags, tools, `published`, metadata | five fallback projects | CMS controls publication | Five verified projects with stable slugs | Yes: verify titles/slugs/summaries |
| Project sections | detail | project page | `project_sections`: project ID, title, body, bullets, order; readable only when parent is published | verified repository case-study layer plus fallback sections | CMS sections appear as additional detail; parent publication is authoritative | Public-safe project-specific detail | Yes |
| Experience | `/`, `/experience` | Experience | `experience`: company, role, dates, location, points, tools, `published` | verified constants | CMS | Preserve exact roles/dates and public-safe scope | Review links manually |
| Education | `/`, `/education`, `/resume` | EducationSection | `education`: institution, degree, dates, status, location, `published` | fallback portfolio | CMS | IHEC Master's Oct 2025–Jun 2027; BI degree Jan 2021–Jun 2025; overall 17.11/20; PFE 19.5/20; Mention Excellent | Yes: replace legacy rows |
| Certifications | `/`, `/certifications`, `/resume` | CertificationsSection | `certifications`: name, issuer, date, credential URL/ID, description, tags, `published` | fallback portfolio | CMS | Verified Google credential; no invented date or ID | Review |
| Resumes | `/resume` | ResumeSection | `resumes`: label, variant, PDF/DOCX URL, order, `published`; public loader, mapper, and component enforce the shared allowlist | empty resilient fallback | CMS, subject to the code-level publication boundary | English and French; Italian only after validated files exist. Master stays private; ATS and Canadian stay deprecated/non-public. | Yes: validated replacement binaries are pending |
| Social links | layout/contact | Navbar, Footer, Contact | `social_links`: label, URL, icon, order, `published` | profile constants | CMS rows are mapped; profile fields still supply core UI links | Consistent LinkedIn and GitHub URLs | Review |
| Site settings | admin/settings; future SEO | existing settings UI/API | `site_settings`: key, JSON value, public flag, updated time | none | Existing settings architecture; not yet mapped into public SEO | Add validated SEO keys only in a separately reviewed CMS change | No current public update |

`npm run content:audit` performs a read-only structural comparison using only the public URL and anon key. It never queries admin/private tables, requests unpublished rows, writes data or prints credentials.

## Resume publication boundary

The public resume allowlist is English, French, and Italian. A CMS `published` flag is necessary but is not sufficient: the public loader and mapper reject every unrecognized variant, and the rendering layer applies the same policy again. Master, ATS, and Canadian descriptors or asset paths are rejected even if a row is mistakenly marked published.

As of the Wave 1 repository audit, validated replacement English and French binaries are pending and the validated Italian binaries are missing. Existing ATS and Canadian variants are deprecated, not public options. Do not fabricate an Italian file, substitute a deprecated file, or publish the private Master CV while the approved assets are pending.

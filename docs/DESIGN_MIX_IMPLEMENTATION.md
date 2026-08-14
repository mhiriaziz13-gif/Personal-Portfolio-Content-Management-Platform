# Design Mix Implementation

## Technical Base

The public portfolio uses `space-portfolio` as the technical base. The app keeps Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber, Drei, and the space background direction.

## Section Sources

- About: based on the `space-portfolio` glass, gradient, motion and space visual language.
- Skills: based on the `space-portfolio` skills section structure, with text-based glass skill pills to avoid broken logos.
- Projects: based on the `space-portfolio` project card direction, with Ahmed's project names, descriptions and tags.
- Work Experience: visually adapted from `reactjs18-3d-portfolio` using a vertical timeline, animated dark cards, dates and company initials.
- Contact: visually adapted from `reactjs18-3d-portfolio` using a dark animated contact form and Earth canvas.

## Ahmed Branding

All public portfolio content has been rewritten for Ahmed Aziz Mhiri:

- Positioning: Marketing & Commercial Analyst.
- Tagline: Turning customer, commercial and operational data into clearer decisions, smarter processes and measurable digital outcomes.
- Profile axis: Marketing & Commercial Analytics, Business Intelligence, Big Data & AI, CRM & Marketing Automation and Digital Transformation.
- Contact: Sousse, Tunisia, `mhiriaziz13@gmail.com`, and LinkedIn profile.
- Projects, skills and experience now reflect Ahmed's analytics, digital marketing, automation and BI background.

## Dynamic Title

The rotating role line is implemented in `components/sub/dynamic-title.tsx` and used by `components/sub/hero-content.tsx`. It respects reduced-motion preferences by rendering a stable title when reduced motion is enabled.

## Avatar

No local avatar image was available. The About section uses a safe initials-based avatar placeholder in `components/sub/avatar-card.tsx`, configured from `profile.initials` in `constants/portfolio.ts`.

## CV Files

Resume publication is controlled by the CMS and the shared public-variant policy. Only validated English, French and Italian variants may appear. English and French replacement files are pending, so their CMS cards remain visible with disabled downloads. Italian remains absent until a validated asset is supplied. Master is private; ATS and Canadian variants are deprecated and must not be restored to `public/cv`.

## Test Results

- `npm install`: passed. npm reported 8 audit vulnerabilities from the template dependency set.
- `npm run type-check`: passed.
- `npm run build`: passed. The sandboxed build hit a Windows worker `spawn EPERM`, then passed when run with normal worker spawning permission.
- `npm run lint`: passed.

## Remaining Placeholders

- Validated English, French and Italian CV PDF/DOCX files are not present yet.
- About uses an initials avatar placeholder until Ahmed provides a real local avatar image.
- Project images are neutral visual placeholders from the base template and are labeled as placeholders in the UI.

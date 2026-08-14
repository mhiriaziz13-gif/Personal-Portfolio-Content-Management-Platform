# Public CV asset policy

Only validated English, French, and Italian CV variants may be published by the portfolio. The Master CV is private and must never be placed in the public download flow. ATS and Canadian variants are deprecated and must not be linked or published.

## Current asset status

- English: validated PDF and DOCX are stored in the public Supabase `resumes` bucket and referenced by the CMS.
- French: validated PDF and DOCX are stored in the public Supabase `resumes` bucket and referenced by the CMS.
- Italian: validated PDF and DOCX are stored in the public Supabase `resumes` bucket and referenced by the CMS.
- Master: private; no public asset is expected.
- ATS and Canadian: deprecated legacy assets and CMS URLs must not be restored.

The binaries intentionally do not live in `public/cv`: the CMS upload lifecycle and Supabase Storage remain the source of truth. Any replacement must use a new Storage path, retain upload metadata and be validated before the corresponding CMS URL changes.

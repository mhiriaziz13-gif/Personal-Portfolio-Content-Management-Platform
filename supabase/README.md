# Supabase setup for this project

> **Production safety blocker (reconfirmed 2026-07-27):** the live migration ledger is behind
> this repository. Do not run `supabase db push`, `supabase migration up`, CI/branch
> auto-migrations, or any command that applies every pending file. The pending
> `202607100001_clean_reset_and_seed.sql` migration drops and reseeds CMS tables.
> Reconcile migration history against live schema first. The reviewed July 2026
> Security Advisor hardening was applied and verified as remote version
> `20260714093312_security_advisor_hardening`; do not apply it again. See
> `docs/security-scan-remediation-2026-07.md`. The additive
> `20260727130027_portfolio_hardening_v1.sql` migration is locally prepared but
> not applied to production. Follow
> `docs/SUPABASE_PORTFOLIO_HARDENING_V1_RUNBOOK.md` for its single-file rollout.

`00_CLEAN_RESET_AND_SEED.sql`, `202607100001_clean_reset_and_seed.sql`,
`schema.sql`, and the standalone seed are retained as historical artifacts. They
recreate pre-hardening definitions and are not a supported bootstrap, repair, or
rollback path.

For a genuinely disposable project, derive and review a current baseline first.
Configure Auth users, redirect URLs, providers, and initial content only after
that baseline is verified. Existing production content should be managed through
the authenticated dashboard, not by replaying seed SQL.

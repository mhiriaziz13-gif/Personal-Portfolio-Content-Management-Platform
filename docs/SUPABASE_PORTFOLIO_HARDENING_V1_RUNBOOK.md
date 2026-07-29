# Supabase portfolio hardening v1 runbook

## Status and non-negotiable safety rule

Apply these exact reviewed migrations, one at a time, in this order:

1. `supabase/migrations/20260727130026_contact_messages_compatibility.sql`
2. `supabase/migrations/20260727130027_portfolio_hardening_v1.sql`
3. `supabase/migrations/20260729120000_final_cms_content_alignment.sql`

Verification:

`supabase/security_advisor_verification.sql`

These migrations have **not** been applied to production by this repository change.
Production migration history diverges from the local historical sequence. Never
run `supabase db push`, `supabase migration up`, a branch auto-migration, or any
other apply-all-pending workflow against the existing project. In particular,
`202607100001_clean_reset_and_seed.sql` drops and rebuilds portfolio tables and
must never run against production.

Apply only the three exact reviewed files above in a controlled window. Each file
is transactional, takes a migration-scoped advisory lock, and rolls back fully on
a preflight, DDL, content-alignment, or postflight failure. Stop immediately if
any file fails; do not continue to the next migration or edit around a guard.

## What the migrations change

`20260727130026_contact_messages_compatibility.sql`:

- safely adds and backfills `updated_at`, `read_at`, and `archived_at`;
- enforces only `new`, `read`, and `archived` message states;
- installs the pinned status-timestamp function, exact triggers, constraint, and
  status/creation index;
- aborts on an unknown same-name function, trigger, constraint, or index and does
  not change RLS, grants, Realtime, or Storage.

`20260727130027_portfolio_hardening_v1.sql` is additive except for intentional
privilege and policy tightening:

- adds the three production-confirmed missing full foreign-key indexes:
  `admin_audit_logs.actor_user_id`,
  `admin_remembered_devices.user_id`, and `uploads.uploaded_by`;
- adds contact `submission_id` idempotency and durable delivery state;
- creates append-only `public.cms_content_revisions`;
- creates private durable rate-limit buckets and two atomic, service-role-only
  RPCs;
- adds remembered-device context-binding and token-rotation metadata;
- adds non-destructive upload digest/deletion-reconciliation metadata;
- inserts any missing canonical page-registry rows for the nine real public
  routes, publishes only exact key/slug matches, and aborts on ambiguous route
  ownership;
- corrects only the known Summer 2027 profile/home-CTA strings to October 2027;
- bounds the known VERMEG project and experience copy to a two-person internship
  prototype, Ahmed's specific contribution, non-sole-authorship, and the fact
  that it was not presented as a production deployment;
- verifies or creates the expected `updated_at` triggers without replacing an
  incompatible live trigger;
- consolidates public content reads to one anonymous and one authenticated
  policy per table;
- revokes direct anonymous/authenticated CMS and Storage DML because application
  mutations are server-mediated;
- adds explicit table and function grants.

`20260729120000_final_cms_content_alignment.sql`:

- adds CMS-controlled navigation labels/order/footer visibility while canonical
  routes remain code-owned;
- constrains page/project blocks and variants to the application registry;
- makes compound block duplication retry-safe with a caller idempotency key,
  an RPC-only request record, and atomic result replay;
- fills only missing published SEO/social fields and uses project covers before
  the global Open Graph fallback;
- inserts only missing `expertise`, `education`, and `contact` registry rows
  after rejecting conflicting key/slug ownership;
- hides and archives empty/title-only project sections, adds concise
  repository-evidenced case-study sections, preserves October 2027 availability,
  keeps the Master project unpublished/in preparation, and enforces the approved
  RPA and VERMEG attribution boundaries.

The hardening sequence deliberately does **not** add `admin_login_audit`,
`contact_messages.replied_by`, or actor foreign keys to `volunteering`; those
objects were not present in the verified production shape. It does not remove
rows, Storage objects, buckets, or existing columns.

Supabase now requires explicit grants for newly created API tables, so the ACL
statements are part of the intended schema rather than optional decoration. See
the [Supabase 2026 grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Application and environment prerequisites

Before scheduling the database window, confirm the candidate application build:

1. All CMS, settings, contact-management, audit, remembered-device, and Storage
   mutations use a server-only Supabase client with the service-role key.
2. No service-role key or limiter secret is referenced by client components or
   any `NEXT_PUBLIC_*` variable.
3. The contact endpoint uses `submission_id` to deduplicate inbound retries,
   uses the durable message ID as the stable provider idempotency key, and
   handles the state machine:
   `pending/failed -> sending -> sent/failed`.
4. Delivery failures store a short sanitized code, never provider responses,
   message content, credentials, or stack traces.
5. The synchronous delivery path increments `delivery_attempts`, records
   attempt times, and claims work atomically so concurrent requests cannot send
   the same message. It runs immediately only after durable message persistence.
   Failed notifications remain visible and are retried manually from the admin
   inbox. `next_delivery_attempt_at` supports reconciliation and possible future
   queue automation; no background worker or automatic retry scheduler is
   deployed.
6. CMS mutations append sanitized `previous_values`/`next_values` revisions.
   Revision snapshots
   must omit tokens, credentials, raw IP addresses, private headers, and other
   secrets.
7. Legacy remembered-device rows with a null `device_context_hash` require a
   fresh MFA challenge. Successful use rotates the token and increments
   `rotation_counter`; context mismatch revokes the token.
8. Upload deletion is a two-phase reconciliation workflow. The first request
   changes active metadata to `pending` and does not touch Storage. While pending
   or failed, the upload is unavailable to new CMS saves. After a minimum
   five-minute grace period, an explicit reconciliation request claims the row
   and checks every CMS asset field again. A referenced object is restored to
   `active`; only an unreferenced object is removed from Storage and then from
   metadata. Failed checks/removals remain visible and retryable in Media
   Library. The migration itself never deletes an object.

Create a high-entropy server-only `RATE_LIMIT_HMAC_SECRET` independently in each
environment. Use at least 32 random bytes and store it only in the deployment
platform's encrypted environment settings. The server must HMAC the normalized
limiter identity with SHA-256 and pass only the lowercase 64-character digest to:

```sql
public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
```

Never send a raw IP address, email address, session token, or user agent to the
RPC. Secret rotation changes derived keys and therefore starts fresh buckets;
rotate intentionally, not during an incident investigation.

Configure `PRIVACY_HMAC_SECRET` as the only secret used for persisted contact
`ip_hash`/`user_agent_hash` values. It must contain at least 32 non-whitespace
UTF-8 bytes and must never fall back to `RATE_LIMIT_HMAC_SECRET`, a Supabase key,
or another credential. This separation prevents contact privacy digests from
being linked to limiter keys.

Configure a third independent `ADMIN_DEVICE_HMAC_SECRET` for remembered-device
context binding, password-recovery state signing, and admin audit hashes. It
must also contain at least 32 non-whitespace UTF-8 bytes, has no fallback, and
must never reuse either other HMAC secret, a Supabase key, or any other
application credential. Rotating that secret invalidates existing context
hashes; plan a fresh administrator MFA challenge and token reissue as part of
any rotation.

Configure contact delivery only in trusted server environments:

```text
RESEND_API_KEY
CONTACT_NOTIFICATION_TO
CONTACT_NOTIFICATION_FROM
```

Verify the provider sender/domain and recipient before unpausing delivery.
Never put any of these values in `NEXT_PUBLIC_*`, logs, revision snapshots, or
database error fields.

Schedule `public.cleanup_rate_limit_buckets()` from a trusted server/cron using
the service-role key. It accepts no arguments and deletes only expired limiter
buckets. Browser roles cannot execute either RPC or read the private table.

## Storage publication decision

Bucket visibility is unchanged by the migration.

- A resume is placed in the public `resumes` bucket only when the product owner
  has approved it for unrestricted public download and the corresponding CMS
  record is published.
- Draft, unpublished, personalized, or otherwise sensitive documents belong in
  the private `uploads` bucket and must be served with a short-lived signed URL
  from an authorized server route.
- Public bucket URLs are public to anyone who has the URL. Do not put secrets or
  confidential filenames in a public bucket.
- Upload, overwrite, move, and delete operations remain server-mediated even for
  a public bucket.

This follows Supabase's distinction between
[public and private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals):
public retrieval does not make mutation public. The service key must never be
exposed to a browser.

## Preflight checklist

### 1. Freeze and identify the release

- Record the application commit, migration SHA-256, operator, UTC start time, and
  target project reference.
- Pause CMS edits and any separately configured background jobs during the
  database window.
- Confirm there is no second migration or maintenance session running.

### 2. Confirm recoverability

- In **Database > Backups**, verify a successful backup or PITR point immediately
  before the window.
- Export an encrypted logical backup when the project plan/process requires it.
- Separately inventory/backup important Storage objects: database backups contain
  Storage metadata, not the underlying objects.

See [Supabase database backups](https://supabase.com/docs/guides/platform/backups).
Do not start the migration if the recovery point or Storage recovery procedure is
unclear.

### 3. Capture live policy, ACL, and bucket evidence

Save the complete results of these read-only queries with the release record:

```sql
select *
from pg_policies
where (schemaname = 'public')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
order by table_schema, table_name, grantee, privilege_type;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;
```

Also save row counts for contact messages, uploads, remembered devices, audit
logs, and every CMS table. The counts are comparison evidence, not a reason to
update or delete rows.

Preview the exact conservative selector used to suppress the possible future
El Mouradi/Sunshine software role:

```sql
select
  id,
  company,
  role,
  start_date,
  end_date,
  date_label,
  published
from public.experience
where published
  and role ilike '%software%'
  and (
    company ilike '%El Mouradi%'
    or company ilike '%Sunshine%'
  )
  and (
    (
      company ilike '%El Mouradi%'
      and company ilike '%Sunshine%'
    )
    or concat_ws(
         ' ',
         start_date,
         end_date,
         date_label,
         array_to_string(points, ' ')
       ) ~* '(future|planned|prospective|upcoming|2027|2028|2029)'
  )
order by company, role, id;
```

Expected: zero rows when the prospective entry is absent/already unpublished, or
one row that is unambiguously the prospective entry. Stop if more than one row is
returned or if the result includes a verified current role; do not broaden or
edit the migration predicate during the production window.

### 4. Reconfirm migration drift

Run only the read-only command:

```powershell
supabase migration list --linked
```

Archive its output. Do not "fix" older discrepancies during this release. The
hardening migration's preflight targets the verified live schema, not an assumed
application of every historical file.

## Controlled apply

Use an approved mechanism that executes **only the three files listed at the top
of this runbook, in that exact order**. Because the repository's older local
history is not aligned with production, generic CLI push/up commands are not an
approved mechanism for this release.

One controlled option is:

1. Open the production SQL editor during the maintenance window.
2. Paste `20260727130026_contact_messages_compatibility.sql` without edits,
   confirm its first statement is `begin;` and its last is `commit;`, execute it
   once, and save the complete output.
3. Only after step 2 succeeds, repeat for
   `20260727130027_portfolio_hardening_v1.sql`.
4. Only after step 3 succeeds, repeat for
   `20260729120000_final_cms_content_alignment.sql`.
5. Save each file's SHA-256 and complete output, including notices or exception
   detail, with the release record.

If any preflight, statement, or postflight raises an exception, stop without
running the next file. Do not delete a guard, rename a policy, or retry with an
edited migration. Capture the live object named by the exception, reconcile it in
review, and issue a new migration if needed.

Applying through the SQL editor does not update migration history. First run the
verification file; ledger-only checks for the three manually executed versions
may still be false, but every schema/data invariant must pass. If all invariants
are correct and all three exact migration outputs/hashes are
archived, an authorized operator may reconcile **only these three versions**:

```powershell
supabase migration repair 20260727130026 --status applied --linked
supabase migration repair 20260727130027 --status applied --linked
supabase migration repair 20260729120000 --status applied --linked
```

`migration repair` changes the ledger only; it does not execute SQL. Run each
command separately and stop on an error. Never use it
to claim an unverified schema state. See the
[Supabase CLI migration reference](https://supabase.com/docs/reference/cli/v0/supabase-migration).

Run `supabase migration list --linked` again and save the result.

## Post-apply database verification

Run the complete read-only file:

`supabase/security_advisor_verification.sql`

It starts a read-only transaction and rolls it back. Review every result set:

- all machine-summary booleans are true;
- the limiter functions are owned by `postgres`, are `SECURITY DEFINER`, have
  `search_path=""`, and are executable only by `service_role`;
- `private.rate_limit_buckets` has no direct browser or service-role table access;
- contact `updated_at`, `read_at`, and `archived_at`, the exact status/update
  triggers, delivery columns/defaults/checks, and unique `submission_id` are
  present;
- all nine canonical page keys have their exact slug and are published, with no
  known Summer 2027 profile/home-CTA string remaining;
- `site_settings` has one anon public-value SELECT policy and one authenticated
  public-or-admin SELECT policy, with no overlapping write policy;
- page navigation columns and block/variant compatibility constraints are
  present; navigation order is Home, Projects, Experience, Expertise, About,
  Contact, then the Resume CTA, with Education and Certifications footer-only;
- published pages/projects have non-empty SEO/social defaults, and project cover
  images are the first Open Graph fallback;
- no visible published project section is title-only; the Master project is
  unpublished/in preparation; the RPA section text contains only the approved
  40-hotel, four-agency, batch, timing, human-review, and sole-contributor facts;
- VERMEG project and experience copy states the team-prototype,
  bounded-contribution, non-sole-authorship, and production-presentation
  boundary;
- all three production-observed FK indexes report `full_index_present = true`;
- the revision table has RLS, no policies, and append-only service-role ACLs;
- no duplicate permissive policy query returns a row;
- every anonymous/authenticated DML privilege is false;
- all expected `updated_at` triggers are correctly bound;
- repository-owned broad Storage listing/mutation policies are absent;
- `private` is not in PostgREST exposed schemas.

Then refresh Supabase Database/Security Advisors. Triage every warning; do not
dismiss a new warning merely because the SQL verification passed.

Leaked-password protection is a Dashboard/Auth setting and cannot be enabled by
this migration. In **Authentication > Security / Password settings**, enable and
verify it with the project owner's approved password policy, then test recovery,
email/password login, OAuth, and MFA.

## Transactional smoke tests

Use test data only. These examples roll back their writes.

### Contact defaults

```sql
begin;
set local role service_role;

insert into public.contact_messages (name, email, message, source)
values ('Migration smoke test', 'migration-smoke@example.invalid', 'rollback', 'runbook')
returning
  submission_id,
  delivery_status,
  delivery_attempts,
  next_delivery_attempt_at;

rollback;
```

Expected: a non-null submission ID, `pending`, zero attempts, and a non-null next
attempt timestamp.

### Atomic limiter

```sql
begin;
set local role service_role;

select *
from public.consume_rate_limit(
  'runbook.smoke',
  repeat('a', 64),
  2,
  60
);

select *
from public.consume_rate_limit(
  'runbook.smoke',
  repeat('a', 64),
  2,
  60
);

select *
from public.consume_rate_limit(
  'runbook.smoke',
  repeat('a', 64),
  2,
  60
);

rollback;
```

Expected `allowed`: true, true, false. Expected `remaining`: 1, 0, 0. All three
rows should return the same `reset_at`.

## Application regression matrix

Deploy the candidate app promptly after the database verification and test:

- anonymous published reads on every public page;
- unpublished rows remain absent for anonymous users;
- admin preview can read unpublished CMS rows;
- all CMS create/update/delete actions through server APIs;
- settings read/update;
- contact submission returns once, creates one `submission_id`, and one provider
  delivery is recorded even when the same request is retried;
- a failed delivery records a safe code and can be retried explicitly from the
  admin inbox without duplicating the persisted message;
- concurrent limiter calls enforce the shared database limit across instances;
- CMS change creates an append-only sanitized revision;
- MFA enrollment/challenge, context-bound remembered-device reuse, rotation, and
  mismatch revocation;
- public published resume URL;
- private unpublished/sensitive document via short-lived signed URL;
- upload list/upload/delete reconciliation through server APIs;
- anonymous/authenticated direct table and Storage mutation attempts fail;
- server-mediated contact-message refresh works for an authorized administrator
  on load, focus, visibility change, and the bounded polling interval.

Resume normal traffic only after focused tests pass. Monitor delivery backlog,
limiter RPC failures/latency, auth failures, revision insert failures, upload
reconciliation, and application 4xx/5xx rates.

## Non-destructive rollback and recovery

### If a migration itself fails

Each file is one PostgreSQL transaction. A preflight, DDL, content-alignment, or
postflight exception rolls back that file. Save the error, do not run the next
file, and leave the live schema alone. A previously committed earlier file
remains applied and should not be manually reversed during diagnosis. Do not run
the clean reset and do not mark the failed migration applied.

### If the new application fails after a successful migration

Roll back the application deployment first. The additive columns, indexes, tables,
and service-only RPCs are compatible with the previous server-mediated app and
should normally remain in place.

If contact delivery must be paused while the old app is active, change only new
row defaults; retain all persisted delivery state:

```sql
begin;

alter table public.contact_messages
  alter column delivery_status set default 'not_requested',
  alter column next_delivery_attempt_at drop default;

commit;
```

Pause new contact submissions and do not initiate manual notification retries
before that change. Do not rewrite existing `pending`, `sending`, `failed`, or
`sent` rows. After the fix, restore the reviewed defaults and resume from
persisted state.

If an unexpected legacy browser mutation depended on a removed grant/policy,
restore only the exact preflight ACL/policy snapshot for the affected table as a
separately reviewed emergency change. Never paste the broad historical
`Admins manage ... FOR ALL` or Storage policies as a generic rollback. The safer
long-term fix is to route that mutation through the authorized server API.

Do not drop `cms_content_revisions`, rate-limit buckets, delivery columns,
remembered-device fields, or upload lifecycle fields during an incident: they may
contain the evidence/state needed for recovery. Do not delete limiter buckets to
make a rate-limit issue disappear; pause the caller or revoke RPC execution while
investigating.

Do not mark versions `20260727130026`, `20260727130027`, or `20260729120000`
reverted unless that version's definitions have actually been reverted to an
approved state. A ledger edit is not a schema rollback.

### Full reversal

A full reversal is a separate destructive maintenance change, not an emergency
snippet. It requires:

- a verified database and Storage recovery point;
- an export of contact delivery, revision, limiter, remembered-device, and upload
  lifecycle state;
- restoration of the exact captured policy/ACL definitions;
- proof that no deployed code reads or writes the new objects;
- explicit approval for every column/table/function/index removal;
- a new reviewed migration and the complete regression matrix.

At no point is `00_CLEAN_RESET_AND_SEED.sql`,
`202607100001_clean_reset_and_seed.sql`, `supabase db reset`, or an apply-all
command a production rollback.

## Release record

Archive:

- project reference, operator, UTC start/end, application commit, and migration
  hash;
- backup/PITR and Storage recovery evidence;
- preflight policies, ACLs, buckets, counts, and migration-list output;
- migration output;
- both verification runs and final migration-list output;
- Security Advisor/Auth-setting evidence;
- smoke/regression results;
- any rollback, paused contact delivery, or residual-risk decision.

import { globSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationDirectory = join(root, "supabase/migrations");
const contactMigrationName =
  "20260727130026_contact_messages_compatibility.sql";
const hardeningMigrationName =
  "20260727130027_portfolio_hardening_v1.sql";
const alignmentMigrationName =
  "20260729120000_final_cms_content_alignment.sql";
const wave1MigrationName =
  "20260814112255_wave1_source_of_truth.sql";
const resumeAssetsMigrationName =
  "20260814140343_publish_validated_resume_assets.sql";
const requiredMigrationNames = [
  contactMigrationName,
  hardeningMigrationName,
  alignmentMigrationName,
  wave1MigrationName,
  resumeAssetsMigrationName,
] as const;

const migrationFiles = globSync(join(migrationDirectory, "*.sql")).sort();
const readMigration = (name: string) =>
  readFileSync(join(migrationDirectory, name), "utf8");
const contactSql = readMigration(contactMigrationName);
const hardeningSql = readMigration(hardeningMigrationName);
const alignmentSql = readMigration(alignmentMigrationName);
const wave1Sql = readMigration(wave1MigrationName);
const resumeAssetsSql = readMigration(resumeAssetsMigrationName);
const reviewedSql = `${contactSql}\n${hardeningSql}\n${alignmentSql}\n${wave1Sql}\n${resumeAssetsSql}`;

const stripFunctionBodies = (sql: string) =>
  sql.replace(
    /create\s+(?:or\s+replace\s+)?function\b[\s\S]*?\$([A-Za-z0-9_]*)\$[\s\S]*?\$\1\$\s*;/gi,
    "create function omitted_for_top_level_safety_scan;",
  );
const stripComments = (sql: string) =>
  sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
const executableSql = stripComments(stripFunctionBodies(reviewedSql));

const workflow = readFileSync(
  join(root, ".github/workflows/quality.yml"),
  "utf8",
);
const packageJson = readFileSync(join(root, "package.json"), "utf8");
const runbook = readFileSync(
  join(root, "docs/SUPABASE_PORTFOLIO_HARDENING_V1_RUNBOOK.md"),
  "utf8",
);

describe("portfolio migration order and compatibility contract", () => {
  it("keeps exactly one copy of each reviewed migration in required order", () => {
    const names = migrationFiles.map((file) => basename(file));

    for (const required of requiredMigrationNames) {
      expect(names.filter((name) => name === required)).toHaveLength(1);
    }

    expect(
      names.filter((name) =>
        /(?:contact_messages_compatibility|portfolio_hardening_v1|final_cms_content_alignment|wave1_source_of_truth|publish_validated_resume_assets)\.sql$/.test(
          name,
        )),
    ).toEqual(requiredMigrationNames);
  });

  it("rejects invalid pg_catalog qualification of SQL syntax constructs", () => {
    expect(reviewedSql).not.toMatch(/\bpg_catalog\.coalesce\s*\(/i);
  });

  it("keeps the contact compatibility migration transactional and scoped", () => {
    expect(contactSql).toMatch(/\bbegin\s*;/i);
    expect(contactSql.trimEnd()).toMatch(/\bcommit\s*;$/i);
    expect(contactSql).toMatch(
      /add column if not exists updated_at timestamptz/i,
    );
    expect(contactSql).toMatch(/add column if not exists read_at timestamptz/i);
    expect(contactSql).toMatch(
      /add column if not exists archived_at timestamptz/i,
    );
    expect(contactSql).toMatch(
      /execute function public\.set_updated_at\(\)/i,
    );
    expect(stripComments(contactSql)).not.toMatch(
      /\b(?:grant|revoke|policy|publication)\b/i,
    );
  });

  it("fails closed on incompatible owned contact objects", () => {
    expect(contactSql).toMatch(
      /same-name status function signature or definition drift/i,
    );
    expect(contactSql).toMatch(
      /proc\.proname = 'set_contact_message_status_timestamps'[\s\S]*?and not \([\s\S]*?pg_catalog\.pg_get_function_identity_arguments\(proc\.oid\) = ''/i,
    );
    expect(contactSql).not.toMatch(
      /to_regprocedure\(\s*'public\.set_contact_message_status_timestamps\(\)'\s*\)\s+is null\s+and exists/i,
    );
    expect(contactSql).toMatch(/status timestamp trigger definition drift/i);
    expect(contactSql).toMatch(/updated_at trigger definition drift/i);
    expect(contactSql).toMatch(
      /contact_messages_status_check definition drift/i,
    );
    expect(contactSql).toMatch(
      /idx_contact_messages_status_created_at definition drift/i,
    );
    expect(contactSql).not.toMatch(/\bdrop\s+trigger\b/i);
    expect(contactSql).not.toMatch(/\bdrop\s+constraint\b/i);
    expect(contactSql).not.toMatch(/\bdrop\s+index\b/i);
  });

  it("validates contact index ordering through catalog option bits", () => {
    const preflight = contactSql.match(
      /do \$contact_messages_compatibility_preflight\$[\s\S]*?\$contact_messages_compatibility_preflight\$;/i,
    )?.[0] ?? "";
    const postflight = contactSql.match(
      /do \$contact_messages_compatibility_postflight\$[\s\S]*?\$contact_messages_compatibility_postflight\$;/i,
    )?.[0] ?? "";

    for (const check of [preflight, postflight]) {
      expect(check).toMatch(
        /pg_catalog\.pg_get_indexdef\(index_row\.indexrelid,\s*2,\s*true\)\s*=\s*'created_at'/i,
      );
      expect(check).not.toMatch(
        /pg_catalog\.pg_get_indexdef\(index_row\.indexrelid,\s*2,\s*true\)[\s\S]{0,80}\bdesc\b/i,
      );
      expect(check).toMatch(/index_row\.indoption\[0\]\s*=\s*0/i);
      expect(check).toMatch(/index_row\.indoption\[1\]\s*=\s*3/i);
    }

    expect(contactSql).toMatch(
      /create index idx_contact_messages_status_created_at\s+on public\.contact_messages \(status,\s*created_at desc\);/i,
    );
  });

  it("requires all contact timestamps before and after hardening", () => {
    const preflight = hardeningSql.match(
      /do \$portfolio_hardening_preflight\$[\s\S]*?\$portfolio_hardening_preflight\$;/i,
    )?.[0] ?? "";
    const postflight = hardeningSql.match(
      /do \$portfolio_hardening_postflight\$[\s\S]*?\$portfolio_hardening_postflight\$;/i,
    )?.[0] ?? "";

    for (const column of ["updated_at", "read_at", "archived_at"]) {
      expect(preflight).toContain(`('contact_messages', '${column}')`);
      expect(postflight).toContain(`('${column}')`);
    }
  });

  it("resolves the production advisor findings without widening writes", () => {
    expect(hardeningSql).toMatch(
      /create policy "Public site settings are readable"[\s\S]*?to anon[\s\S]*?value ->> 'public'/i,
    );
    expect(hardeningSql).toMatch(
      /create policy "Authenticated read site settings"[\s\S]*?to authenticated[\s\S]*?\(select private\.is_admin\(\)\)/i,
    );

    for (const indexName of [
      "admin_audit_logs_actor_user_id_idx",
      "admin_remembered_devices_user_id_idx",
      "uploads_uploaded_by_idx",
    ]) {
      expect(hardeningSql).toContain(indexName);
    }

    const withoutInitPlanPatterns = hardeningSql.replace(
      /\(\s*select\s+auth\.uid\(\)\s*\)/gi,
      "",
    );
    expect(withoutInitPlanPatterns).not.toMatch(/\bauth\.uid\(\)/i);
    expect(hardeningSql).not.toMatch(
      /create policy[\s\S]{0,250}\bfor (?:all|insert|update|delete)\b[\s\S]{0,250}\bto (?:anon|authenticated)\b/i,
    );
  });

  it("preserves Supabase-managed storage ACLs and denies browser writes through RLS", () => {
    expect(hardeningSql).not.toMatch(
      /\b(?:grant|revoke)[\s\S]{0,180}\bon\s+table\s+storage\.objects\b/i,
    );
    expect(hardeningSql).toMatch(
      /relation\.oid\s*=\s*'storage\.objects'::pg_catalog\.regclass[\s\S]{0,120}relation\.relrowsecurity/i,
    );
    expect(hardeningSql).toMatch(
      /policy\.schemaname\s*=\s*'storage'[\s\S]{0,120}policy\.tablename\s*=\s*'objects'[\s\S]{0,260}policy\.cmd\s+in\s*\('ALL',\s*'INSERT',\s*'UPDATE',\s*'DELETE'\)[\s\S]{0,180}'public'[\s\S]{0,80}'anon'[\s\S]{0,80}'authenticated'/i,
    );
  });

  it("adds only controlled navigation and builder schema", () => {
    expect(alignmentSql).toMatch(/add column if not exists navigation_label text/i);
    expect(alignmentSql).toMatch(
      /add column if not exists navigation_order integer not null default 0/i,
    );
    expect(alignmentSql).toMatch(
      /add column if not exists show_in_navigation boolean not null default false/i,
    );
    expect(alignmentSql).toMatch(
      /add column if not exists show_in_footer boolean not null default false/i,
    );
    expect(alignmentSql).toMatch(
      /alter table public\.project_sections[\s\S]*?add column if not exists layout_variant text/i,
    );
    expect(alignmentSql).toContain("page_sections_block_variant_check");
    expect(alignmentSql).toContain("project_sections_block_variant_check");
    expect(alignmentSql).toContain("'split_content'");
    expect(alignmentSql).toContain("'metrics'");
    expect(alignmentSql).toContain("'timeline'");
  });

  it("keeps builder duplicate and move actions atomic and revision-backed", () => {
    expect(alignmentSql).toMatch(
      /function public\.mutate_cms_builder_action\([\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    );
    expect(alignmentSql).toMatch(
      /pg_advisory_xact_lock[\s\S]*?for update[\s\S]*?public\.mutate_cms_content\(/i,
    );
    expect(alignmentSql).toMatch(
      /from public\.page_section_items[\s\S]*?public\.mutate_cms_content\(/i,
    );
    expect(alignmentSql).toMatch(
      /from public\.project_section_items[\s\S]*?public\.mutate_cms_content\(/i,
    );
    expect(alignmentSql).toContain("'revisionIds', v_revision_ids");
    expect(alignmentSql).toContain("'requestIds', v_request_ids");
    expect(alignmentSql).toMatch(
      /create table if not exists public\.cms_builder_action_requests[\s\S]*?primary key \(actor_user_id, idempotency_key\)/i,
    );
    expect(alignmentSql).toMatch(
      /alter table public\.cms_builder_action_requests enable row level security[\s\S]*?revoke all privileges on table public\.cms_builder_action_requests[\s\S]*?from public, anon, authenticated, service_role/i,
    );
    expect(alignmentSql).toMatch(
      /p_action = 'duplicate'[\s\S]*?p_idempotency_key is null[\s\S]*?pg_advisory_xact_lock[\s\S]*?from public\.cms_builder_action_requests[\s\S]*?for update[\s\S]*?return v_existing_idempotency_response/i,
    );
    expect(alignmentSql).toMatch(
      /insert into public\.cms_builder_action_requests[\s\S]*?public\.mutate_cms_content\([\s\S]*?update public\.cms_builder_action_requests[\s\S]*?response_payload = v_response/i,
    );
    expect(alignmentSql).toContain("'replayed', false");
    expect(alignmentSql).toContain("'replayed', true");
    expect(alignmentSql).toMatch(
      /revoke all privileges on function public\.mutate_cms_builder_action[\s\S]*?from public, anon, authenticated/i,
    );
    expect(alignmentSql).toMatch(
      /grant execute on function public\.mutate_cms_builder_action[\s\S]*?to service_role/i,
    );
    expect(alignmentSql).toContain(
      "'navigation_label', 'navigation_order', 'show_in_navigation'",
    );
    expect(alignmentSql).toContain(
      "'is_visible', 'is_archived', 'layout_variant'",
    );
  });

  it("seeds controlled canonical blocks only when no visible, non-archived section exists", () => {
    const seedPreflight =
      alignmentSql.match(
        /do \$canonical_page_section_seed_preflight\$[\s\S]*?\$canonical_page_section_seed_preflight\$;/i,
      )?.[0] ?? "";
    const seedEligibility =
      alignmentSql.match(
        /with\s+empty_pages as \([\s\S]*?\n\),\s*hero_source as \(/i,
      )?.[0] ?? "";
    const visibleSectionPredicate =
      /where section\.page_id = page\.id\s+and section\.is_visible\s+and not section\.is_archived/i;

    expect(seedEligibility).toMatch(visibleSectionPredicate);
    expect(
      seedPreflight.match(/from public\.page_sections as section/gi),
    ).toHaveLength(5);
    expect(
      seedPreflight.match(
        /where section\.page_id = page\.id\s+and section\.is_visible\s+and not section\.is_archived/gi,
      ),
    ).toHaveLength(5);
    for (const seedKey of [
      "canonical-hero",
      "canonical-featured-projects",
      "canonical-about",
      "canonical-volunteering",
      "canonical-projects",
      "canonical-experience",
      "canonical-expertise",
      "canonical-education",
      "canonical-certifications",
      "canonical-resume",
      "canonical-contact",
    ]) {
      expect(alignmentSql).toContain(seedKey);
    }
    for (const blockType of [
      "featured_projects",
      "projects_grid",
      "experience_list",
      "skills",
      "custom_cards",
      "certifications_grid",
      "volunteering",
      "cta",
    ]) {
      expect(alignmentSql).toContain(`'${blockType}'`);
    }
    expect(alignmentSql).toMatch(
      /education_items as \([\s\S]*?join public\.education/i,
    );
    expect(alignmentSql).toMatch(
      /'canonical-resume',\s*'rich_text',\s*page\.title,\s*null,\s*'Download the resume in PDF or DOCX format\.',[\s\S]*?0,\s*'compact'/i,
    );
    expect(alignmentSql).not.toMatch(/\bresume_items\b/i);
    expect(alignmentSql).not.toContain("'Open resume'");
    expect(alignmentSql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from)\s+public\.resumes\b/i,
    );
    expect(alignmentSql).toMatch(
      /'mailto:' \|\| pg_catalog\.btrim\(profile_row\.email\)/i,
    );
  });

  it("postflight rejects canonical pages without a visible, non-archived section", () => {
    const postflight =
      alignmentSql.match(
        /do \$final_cms_alignment_postflight\$[\s\S]*?\$final_cms_alignment_postflight\$;/i,
      )?.[0] ?? "";

    expect(postflight).toMatch(
      /from canonical_pages as expected[\s\S]*?from public\.page_sections as section[\s\S]*?where section\.page_id = page\.id\s+and section\.is_visible\s+and not section\.is_archived/i,
    );
    expect(postflight).toContain(
      "canonical page has no visible, non-archived section",
    );
  });

  it("aligns only approved canonical content boundaries", () => {
    expect(alignmentSql).toMatch(
      /\('home', '\/', 'Home', 0, true, true\)[\s\S]*?\('projects', '\/projects', 'Projects', 10, true, true\)[\s\S]*?\('experience', '\/experience', 'Experience', 20, true, true\)[\s\S]*?\('expertise', '\/expertise', 'Expertise', 30, true, true\)[\s\S]*?\('about', '\/about', 'About', 40, true, true\)[\s\S]*?\('contact', '\/contact', 'Contact', 50, true, true\)/i,
    );
    expect(alignmentSql).toContain(
      "('resume', '/resume', 'Resume', 60, true, true)",
    );
    expect(alignmentSql).toContain(
      "('education', '/education', 'Education', 70, false, true)",
    );
    expect(alignmentSql).toContain(
      "('certifications', '/certifications', 'Certifications', 80, false, true)",
    );
    expect(alignmentSql).toMatch(
      /open_graph_image = coalesce\([\s\S]*?cover_image_url/i,
    );
    for (const sql of [hardeningSql, alignmentSql]) {
      expect(sql).toContain("two-person internship prototype");
      expect(sql).toContain("chatbot");
      expect(sql).toContain("selected application services");
      expect(sql).toContain("not sole-authored");
      expect(sql).toContain("not presented as a production deployment");
    }
    expect(reviewedSql).not.toMatch(/\bnot deployed to production\b/i);
    expect(reviewedSql).not.toMatch(
      /integration, secure access, event-driven communication, containerisation and observability/i,
    );
  });

  it("codifies the Wave 1 source-of-truth facts without touching legacy experiences", () => {
    expect(wave1Sql).toMatch(/\bbegin\s*;/i);
    expect(wave1Sql.trimEnd()).toMatch(/\bcommit\s*;$/i);
    expect(wave1Sql).toContain(
      "Open to selected freelance projects and building toward international full-time opportunities from 2027.",
    );
    expect(wave1Sql).toMatch(
      /role = 'Digital Transformation Project Manager'[\s\S]*?start_date = 'Jul 2026'[\s\S]*?end_date = 'Present'/i,
    );
    expect(wave1Sql).toMatch(
      /insert into public\.experience[\s\S]*?'Digital Transformation Project Manager'[\s\S]*?where not exists/i,
    );
    expect(wave1Sql).toMatch(
      /company = 'Sunshine Holiday Group \/ Sunshine Vacances France'[\s\S]*?start_date = 'Jul 2025'[\s\S]*?end_date = 'Jul 2026'/i,
    );
    expect(wave1Sql).toMatch(
      /role = 'Management Control Intern'[\s\S]*?start_date = 'Jun 2023'[\s\S]*?end_date = 'Sep 2023'/i,
    );
    for (const fact of [
      "Jun 2027",
      "17.11/20",
      "19.5/20",
      "Mention Excellent",
      "Freelance Commercial & Digital Marketing Manager",
      "Freelance Digital Transformation & Data-Driven Marketing Consultant",
      "El Mouradi Club Kantaoui",
    ]) {
      expect(wave1Sql).toContain(fact);
    }
    expect(wave1Sql).toMatch(
      /delete from public\.projects[\s\S]*?where slug = 'master-multi-agent-llm-project'[\s\S]*?;/i,
    );
    expect(wave1Sql).toMatch(
      /update public\.resumes[\s\S]*?pdf_url = null[\s\S]*?docx_url = null[\s\S]*?published = false[\s\S]*?\(ats\|canad\|master\)/i,
    );
    expect(wave1Sql).toMatch(
      /concat_ws\(' ', variant, label, pdf_url, docx_url\)[\s\S]*?coalesce\(variant, ''\) not in/i,
    );
    expect(wave1Sql).toMatch(
      /variant = 'english-professional-cv'[\s\S]*?\) <> 1 or \([\s\S]*?variant = 'french-cv'[\s\S]*?\) <> 1/i,
    );
    expect(wave1Sql).toMatch(
      /item\.display_order = 0[\s\S]*?\) <> 1 or \([\s\S]*?item\.display_order = 1[\s\S]*?\) <> 1/i,
    );
    expect(stripComments(wave1Sql)).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from)\s+public\.experiences\b/i,
    );
  });

  it("publishes only the six validated EN/FR/IT resume assets", () => {
    expect(resumeAssetsSql).toMatch(/\bbegin\s*;/i);
    expect(resumeAssetsSql.trimEnd()).toMatch(/\bcommit\s*;$/i);
    expect(resumeAssetsSql).toContain("storage.objects");
    expect(resumeAssetsSql).toContain("storage.buckets");
    expect(resumeAssetsSql).toContain("the resumes bucket must exist and be public");
    expect(resumeAssetsSql).toContain("Storage object is missing or has unexpected metadata");
    expect(resumeAssetsSql).toContain("English Professional CV");
    expect(resumeAssetsSql).toContain("French CV");
    expect(resumeAssetsSql).toContain("Italian CV");
    expect(resumeAssetsSql).toMatch(
      /where published[\s\S]*?\) <> 3 or exists[\s\S]*?variant not in \('english-professional-cv', 'french-cv', 'italian-cv'\)/i,
    );
    expect(resumeAssetsSql).toMatch(
      /lower\(pg_catalog\.concat_ws\(' ', variant, label, pdf_url, docx_url\)\)[\s\S]*?\(ats\|canad\|master\)/i,
    );
    for (const digest of [
      "b22107d10a0c2d471359a6cdb975c5a866ce07eba6b661102175a2d90a4e601b",
      "f5e42dba5f98632127eb9f1a690c4af89f4e3f417118b0830b4e0b40f1289528",
      "0931edd08ef766d3526aec4d79b0079413709957dddef1ee31b1473c38f216bf",
      "532e8f76684996a36ee380b62720108d52ce063b241773b080694cd23e8c86cf",
      "b676f91eb719a9993dc176001295a20395b9c62977281ad51fa74c375c7094dc",
      "edb7d7dbc5643f91d4a3ab19b6ed2fcb94c131686986ff5d8b7e065c48905c1e",
    ]) {
      expect(resumeAssetsSql).toContain(digest);
    }
    expect(resumeAssetsSql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from)\s+public\.experiences\b/i,
    );
  });

  it("contains every approved RPA fact and no fabricated percentage", () => {
    for (const fact of [
      "40 hotels",
      "Sunline",
      "Suncani",
      "Taurus",
      "Oasis Tours",
      "around 20 records per hotel",
      "around four working days",
      "around seven days",
      "Human review",
      "sole contributor",
    ]) {
      expect(alignmentSql).toContain(fact);
    }
    expect(alignmentSql).not.toMatch(/\b\d+(?:\.\d+)?%\b/);
  });

  it("keeps the foundational three-file runbook order", () => {
    const positions = [
      contactMigrationName,
      hardeningMigrationName,
      alignmentMigrationName,
    ].map((name) => runbook.indexOf(name));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
  });
});

describe("portfolio hardening destructive-operation safeguards", () => {
  it("allows only the stable-slug Wave 1 project cleanup", () => {
    const approvedWave1Cleanup =
      /\bdelete\s+from\s+public\.projects\s+where\s+slug\s*=\s*'master-multi-agent-llm-project'\s+or\s+pg_catalog\.lower\(title\)\s+in\s*\(\s*'master multi-agent llm project'\s*,\s*'llm interface for multi-agent system management'\s*\)\s*;/i;
    expect(wave1Sql.match(/\bdelete\s+from\s+public\./gi)).toHaveLength(1);
    expect(wave1Sql).toMatch(approvedWave1Cleanup);

    const withoutApprovedWave1Cleanup = executableSql.replace(
      approvedWave1Cleanup,
      "approved Wave 1 stable-slug cleanup;",
    );
    expect(executableSql).not.toMatch(/\bdrop\s+table\b/i);
    expect(executableSql).not.toMatch(/\btruncate\b/i);
    expect(withoutApprovedWave1Cleanup).not.toMatch(
      /\bdelete\s+from\s+(?:public|auth|storage)\./i,
    );
  });

  it("keeps CMS delete support inside the reviewed atomic mutation function", () => {
    expect(hardeningSql).toMatch(/function\s+public\.mutate_cms_content/i);
    expect(hardeningSql).toMatch(/delete\s+from\s+public\.%I/i);
    expect(executableSql).not.toMatch(/delete\s+from\s+public\.%I/i);
  });

  it("contains the durable security and delivery primitives", () => {
    expect(hardeningSql).toMatch(/private\.rate_limit_buckets/i);
    expect(hardeningSql).toMatch(/consume_rate_limit/i);
    expect(hardeningSql).toMatch(
      /on\s+conflict\s*\(\s*scope\s*,\s*key_hash\s*\)/i,
    );
    expect(hardeningSql).toMatch(/cms_content_revisions/i);
    expect(hardeningSql).toMatch(/submission_id/i);
    expect(hardeningSql).toMatch(/delivery_status/i);
  });

  it("never wires destructive or apply-all database commands into automation", () => {
    const automation = `${workflow}\n${packageJson}`;
    expect(automation).not.toMatch(
      /(?:clean_reset|00_CLEAN_RESET|supabase\s+db\s+reset)/i,
    );
    expect(automation).not.toMatch(
      /supabase\s+(?:db\s+push|migration\s+up)/i,
    );
  });
});

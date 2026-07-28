import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";

import { describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrations = globSync(
  join(root, "supabase/migrations/*portfolio_hardening_v1.sql"),
);
const sql = migrations.length === 1
  ? readFileSync(migrations[0], "utf8")
  : "";
const topLevelSql = sql.replace(
  /create\s+(?:or\s+replace\s+)?function\b[\s\S]*?\$([A-Za-z0-9_]*)\$[\s\S]*?\$\1\$\s*;/gi,
  "create function omitted_for_top_level_safety_scan;",
);
const executableSql = topLevelSql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const workflow = readFileSync(
  join(root, ".github/workflows/quality.yml"),
  "utf8",
);
const packageJson = readFileSync(join(root, "package.json"), "utf8");

describe("portfolio hardening migration contract", () => {
  it("has exactly one scoped migration", () => {
    expect(migrations).toHaveLength(1);
  });

  it("does not contain destructive data-reset statements", () => {
    expect(executableSql).not.toMatch(/\bdrop\s+table\b/i);
    expect(executableSql).not.toMatch(/\btruncate\b/i);
    expect(executableSql).not.toMatch(
      /\bdelete\s+from\s+(?:public|auth|storage)\./i,
    );
  });

  it("keeps CMS delete support inside the reviewed atomic mutation function", () => {
    expect(sql).toMatch(/function\s+public\.mutate_cms_content/i);
    expect(sql).toMatch(/delete\s+from\s+public\.%I/i);
    expect(executableSql).not.toMatch(/delete\s+from\s+public\.%I/i);
  });

  it("contains the durable security and delivery primitives", () => {
    expect(sql).toMatch(/private\.rate_limit_buckets/i);
    expect(sql).toMatch(/consume_rate_limit/i);
    expect(sql).toMatch(/on\s+conflict\s*\(\s*scope\s*,\s*key_hash\s*\)/i);
    expect(sql).toMatch(/cms_content_revisions/i);
    expect(sql).toMatch(/submission_id/i);
    expect(sql).toMatch(/delivery_status/i);
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

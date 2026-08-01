import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sql = readFileSync(join(root, "supabase/migrations/20260801130336_cms_project_workspace_structure.sql"), "utf8");

describe("canonical project section migration", () => {
  it("seeds all sixteen definitions with stable ten-step orders", () => {
    const keys = ["overview","business_context","problem","role_scope","contribution","approach_evidence","approach","workflow_architecture","tools_technologies","deliverables","validation_safeguards","qualitative_outcome","outcome_limits","what_i_learned","related_expertise","related_experience"];
    keys.forEach((key, index) => expect(sql).toContain(`('${key}',`));
    keys.forEach((key, index) => expect(sql).toMatch(new RegExp(`\\('${key}',[^\\n]+, ${(index + 1) * 10},`)));
  });

  it("enforces definition and order uniqueness only inside each parent", () => {
    expect(sql).toMatch(/unique \(project_id, definition_id\)/i);
    expect(sql).toMatch(/unique \(project_id, sort_order\)[\s\S]*?deferrable/i);
    expect(sql).toMatch(/unique \(project_section_id, display_order\)[\s\S]*?deferrable/i);
    expect(sql).not.toMatch(/unique\s*\(sort_order\)/i);
    expect(sql).not.toMatch(/unique\s*\(display_order\)/i);
  });

  it("backs up, deduplicates, rehomes children, and provisions idempotently", () => {
    expect(sql).toContain("project_sections_snapshot_20260801");
    expect(sql).toContain("project_section_items_snapshot_20260801");
    expect(sql).toMatch(/update public\.project_section_items item set project_section_id=map\.retained_id/i);
    expect(sql).toMatch(/on conflict \(project_id,definition_id\) do nothing/i);
    expect(sql).not.toMatch(/insert into public\.project_section_items[\s\S]*?select/i);
  });

  it("keeps repair admin-only and preserves archived projects", () => {
    expect(sql).toMatch(/if not \(select private\.is_admin\(\)\)/i);
    expect(sql).toMatch(/revoke execute on function public\.ensure_project_section_structure\(uuid\) from public, anon/i);
    expect(sql).toMatch(/where p\.status<>'archived'/i);
    expect(sql).not.toMatch(/delete from public\.projects/i);
  });
});

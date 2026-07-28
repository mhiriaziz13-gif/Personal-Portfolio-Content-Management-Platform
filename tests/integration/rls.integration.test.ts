import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { canRunRlsIntegrationTests } from "./supabase-test-guard";

const url = process.env.TEST_SUPABASE_URL ?? "";
const anonKey = process.env.TEST_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? "";
const aal1Token = process.env.TEST_SUPABASE_AAL1_ACCESS_TOKEN ?? "";
const publishedProjectId = process.env.TEST_PUBLISHED_PROJECT_ID ?? "";
const isolated = canRunRlsIntegrationTests(process.env);

describe.skipIf(!isolated)("isolated Supabase RLS", () => {
  it("denies direct anonymous CMS writes", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const slug = `rls-test-${crypto.randomUUID()}`;
    const result = await anon.from("projects").insert({
      slug,
      title: "RLS isolation test",
      summary: "This row must never be accepted through the anonymous Data API.",
      status: "draft",
      published: false,
    }).select("id").maybeSingle();

    if (result.data?.id) {
      const service = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await service.from("projects").delete().eq("id", result.data.id);
    }

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it.skipIf(!aal1Token || !publishedProjectId)(
    "denies direct AAL1 authenticated CMS writes without changing the row",
    async () => {
    const aal1 = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${aal1Token}` } },
    });
    const before = await aal1
      .from("projects")
      .select("id,title")
      .eq("id", publishedProjectId)
      .single();
    expect(before.error).toBeNull();

    const result = await aal1.from("projects").update({
      title: "AAL1 must not mutate CMS data",
    }).eq("id", publishedProjectId).select("id");

    expect(result.data ?? []).toHaveLength(0);
    expect(result.error).toBeTruthy();

    const after = await aal1
      .from("projects")
      .select("id,title")
      .eq("id", publishedProjectId)
      .single();
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
  });
});

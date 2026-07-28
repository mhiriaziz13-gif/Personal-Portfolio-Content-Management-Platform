import { describe, expect, it } from "vitest";

import {
  canRunRlsIntegrationTests,
  projectRefFromSupabaseUrl,
} from "./supabase-test-guard";

const TEST_PROJECT_REF = "abcdefghijklmnopqrst";
const PRODUCTION_PROJECT_REF = "zyxwvutsrqponmlkjihg";

const isolatedEnvironment = {
  ALLOW_TEST_DATABASE_MUTATIONS: "true",
  TEST_SUPABASE_URL: `https://${TEST_PROJECT_REF}.supabase.co`,
  TEST_SUPABASE_ANON_KEY: "test-anon-key",
  TEST_SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_PROJECT_REF,
};

describe("Supabase integration-test production guard", () => {
  it("allows an explicitly configured, distinct hosted test project", () => {
    expect(canRunRlsIntegrationTests(isolatedEnvironment)).toBe(true);
  });

  it.each([undefined, "", "false", "TRUE"])(
    "fails closed when the mutation opt-in is %j",
    (allowMutations) => {
      expect(canRunRlsIntegrationTests({
        ...isolatedEnvironment,
        ALLOW_TEST_DATABASE_MUTATIONS: allowMutations,
      })).toBe(false);
    },
  );

  it.each([undefined, "", " "])(
    "fails closed when the production project reference is %j",
    (productionProjectRef) => {
      expect(canRunRlsIntegrationTests({
        ...isolatedEnvironment,
        PRODUCTION_SUPABASE_PROJECT_REF: productionProjectRef,
      })).toBe(false);
    },
  );

  it("fails closed when the test and production project references match", () => {
    expect(canRunRlsIntegrationTests({
      ...isolatedEnvironment,
      PRODUCTION_SUPABASE_PROJECT_REF: TEST_PROJECT_REF,
    })).toBe(false);
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    `http://${TEST_PROJECT_REF}.supabase.co`,
    "https://short-ref.supabase.co",
    `https://${TEST_PROJECT_REF}.supabase.co.example.com`,
    `https://${TEST_PROJECT_REF}.supabase.co/rest/v1`,
    `https://${TEST_PROJECT_REF}.supabase.co?target=production`,
  ])("rejects malformed or non-project Supabase URL %j", (testUrl) => {
    expect(projectRefFromSupabaseUrl(testUrl)).toBe("");
    expect(canRunRlsIntegrationTests({
      ...isolatedEnvironment,
      TEST_SUPABASE_URL: testUrl,
    })).toBe(false);
  });

  it.each([undefined, "", " "])(
    "fails closed when the test service-role credential is %j",
    (serviceRoleKey) => {
      expect(canRunRlsIntegrationTests({
        ...isolatedEnvironment,
        TEST_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      })).toBe(false);
    },
  );

  it("does not fall back to production application variables", () => {
    expect(canRunRlsIntegrationTests({
      ALLOW_TEST_DATABASE_MUTATIONS: "true",
      PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_PROJECT_REF,
      NEXT_PUBLIC_SUPABASE_URL:
        `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "production-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "production-service-role-key",
    })).toBe(false);
  });

  it("does not derive the production reference from the application URL", () => {
    expect(canRunRlsIntegrationTests({
      ...isolatedEnvironment,
      PRODUCTION_SUPABASE_PROJECT_REF: undefined,
      NEXT_PUBLIC_SUPABASE_URL:
        `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
    })).toBe(false);
  });

  it("does not use the application's service-role credential for cleanup", () => {
    expect(canRunRlsIntegrationTests({
      ...isolatedEnvironment,
      TEST_SUPABASE_SERVICE_ROLE_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: "production-service-role-key",
    })).toBe(false);
  });
});

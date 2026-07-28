type IntegrationTestEnvironment = Readonly<
  Record<string, string | undefined>
>;

const SUPABASE_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const SUPABASE_HOST_PATTERN = /^([a-z0-9]{20})\.supabase\.co$/;

const normalizeProjectRef = (value: string | undefined) => {
  const projectRef = value?.trim().toLowerCase() ?? "";
  return SUPABASE_PROJECT_REF_PATTERN.test(projectRef) ? projectRef : "";
};

export const projectRefFromSupabaseUrl = (value: string | undefined) => {
  try {
    const parsed = new URL(value?.trim() ?? "");
    if (
      parsed.protocol !== "https:"
      || parsed.username
      || parsed.password
      || parsed.port
      || (parsed.pathname !== "" && parsed.pathname !== "/")
      || parsed.search
      || parsed.hash
    ) {
      return "";
    }

    return SUPABASE_HOST_PATTERN.exec(parsed.hostname)?.[1] ?? "";
  } catch {
    return "";
  }
};

export const canRunRlsIntegrationTests = (
  environment: IntegrationTestEnvironment,
) => {
  if (environment.ALLOW_TEST_DATABASE_MUTATIONS !== "true") {
    return false;
  }

  const testProjectRef = projectRefFromSupabaseUrl(
    environment.TEST_SUPABASE_URL,
  );
  const productionProjectRef = normalizeProjectRef(
    environment.PRODUCTION_SUPABASE_PROJECT_REF,
  );

  return Boolean(
    testProjectRef
    && productionProjectRef
    && testProjectRef !== productionProjectRef
    && environment.TEST_SUPABASE_ANON_KEY?.trim()
    && environment.TEST_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
};

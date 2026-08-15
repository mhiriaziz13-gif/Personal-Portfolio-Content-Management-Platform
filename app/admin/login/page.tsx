export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/admin/login-form";
import { safeAdminRedirect } from "@/lib/security/redirects";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = safeAdminRedirect(readParam(params.next), "/admin");
  const initialMfaRequired = readParam(params.mfa) === "required";
  const initialError = readParam(params.error);
  const resetSuccess = readParam(params.reset) === "success";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen px-6 py-28"
    >
      <LoginForm nextPath={nextPath} initialMfaRequired={initialMfaRequired} initialError={initialError} resetSuccess={resetSuccess} />
    </main>
  );
}

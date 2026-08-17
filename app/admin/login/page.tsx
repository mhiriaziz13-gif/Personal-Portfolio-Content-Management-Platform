export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getAuthenticatedAdmin } from "@/lib/security/admin-auth";
import { safeRedirect } from "@/lib/security/redirects";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = safeRedirect(readParam(params.next), "/admin");
  const requestedMfa = readParam(params.mfa) === "required";
  const initialError = readParam(params.error);
  const resetSuccess = readParam(params.reset) === "success";

  let admin: Awaited<ReturnType<typeof getAuthenticatedAdmin>> = null;

  if (requestedMfa) {
    try {
      admin = await getAuthenticatedAdmin();
    } catch {
      admin = null;
    }
  }

  if (requestedMfa && admin) {
    if (!admin.mfaRequired || admin.mfaSatisfied) {
      redirect(nextPath);
    }

    if (admin.verifiedFactors.length === 0) {
      redirect("/admin/security?setup=mfa");
    }
  }

  const initialMfaRequired = Boolean(
    requestedMfa &&
      admin &&
      admin.mfaRequired &&
      !admin.mfaSatisfied,
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen px-6 py-28"
    >
      <LoginForm
        nextPath={nextPath}
        initialMfaRequired={initialMfaRequired}
        initialError={initialError}
        resetSuccess={resetSuccess}
      />
    </main>
  );
}

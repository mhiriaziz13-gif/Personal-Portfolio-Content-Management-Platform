export const dynamic = "force-dynamic";

import { SecurityPanel } from "@/components/admin/security-panel";
import { requireAdminPage } from "@/lib/security/admin-auth";

export default async function AdminSecurityPage() {
  await requireAdminPage({ next: "/admin/security", requireMfa: false, allowMfaSetup: true });

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <SecurityPanel />
    </main>
  );
}

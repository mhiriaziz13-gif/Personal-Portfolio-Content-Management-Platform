export const dynamic = "force-dynamic";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminContentSnapshot } from "@/lib/cms";
import { requireAdminPage } from "@/lib/security/admin-auth";

export default async function AdminPage() {
  const admin = await requireAdminPage({ next: "/admin", requireMfa: true });
  const content = await getAdminContentSnapshot();

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <AdminDashboard
        content={content}
        email={admin.user.email ?? undefined}
      />
    </main>
  );
}

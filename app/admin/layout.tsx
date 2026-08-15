import type { Metadata } from "next";
import { headers } from "next/headers";
import type { PropsWithChildren } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/security/admin-auth";
import { safeAdminRedirect } from "@/lib/security/redirects";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const publicAdminRoutes = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export default async function AdminLayout({ children }: PropsWithChildren) {
  const requestHeaders = await headers();
  const rawPath = requestHeaders.get("x-admin-path") ?? "/admin";
  const path = safeAdminRedirect(rawPath, "/admin");
  const pathname = path.split(/[?#]/, 1)[0] ?? "/admin";

  if (publicAdminRoutes.has(pathname)) {
    return <div data-clarity-mask="true">{children}</div>;
  }

  const admin = await requireAdminPage({ next: path, requireMfa: true });
  return (
    <AdminShell email={admin.user.email ?? undefined}>
      {children}
    </AdminShell>
  );
}

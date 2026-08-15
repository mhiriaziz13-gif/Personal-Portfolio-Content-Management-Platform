import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import { ProjectWorkspace } from "@/components/admin/projects/project-workspace";

import { getProjectWorkspaceData } from "@/lib/projects/project-workspace-data";

import { requireAdminPage } from "@/lib/security/admin-auth";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectWorkspacePage({
  params,
}: PageProps) {
  const { projectId } =
    await params;

  await requireAdminPage({
    next:
      `/admin/projects/${projectId}`,

    requireMfa: true,
  });

  const data =
    await getProjectWorkspaceData(
      projectId,
    );

  if (!data) {
    notFound();
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen px-6 py-24"
    >
      <section className="relative z-[20] mx-auto w-full max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 hover:bg-white/10"
        >
          ← Back to CMS
        </Link>

        <ProjectWorkspace
          initialProject={
            data.project
          }
          initialLinks={
            data.links
          }
          initialSections={
            data.sections
          }
          sectionDefinitions={
            data.sectionDefinitions
          }
          sectionCount={
            data.sectionCount
          }
          mediaCount={
            data.mediaCount
          }
        />
      </section>
    </main>
  );
}
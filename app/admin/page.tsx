import Link from "next/link";
import { redirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const legacyView = first(params.view) ?? first(params.module);
  const projectId = first(params.projectId) ?? first(params.project_id);
  const sectionId = first(params.sectionId) ?? first(params.section_id);
  const contentRoutes: Record<string, string> = { profile:"profile",hero:"hero",about:"about",experience:"experience",skills:"skills",education:"education",certifications:"certifications",resumes:"resumes" };
  if (legacyView === "projects" || legacyView === "project_builder") redirect(projectId ? `/admin/projects/${projectId}` : "/admin/projects");
  if (legacyView === "project_sections" && projectId) redirect(sectionId ? `/admin/projects/${projectId}/sections/${sectionId}` : `/admin/projects/${projectId}/sections`);
  if (legacyView === "project_media" && projectId) redirect(`/admin/projects/${projectId}/media`);
  if (legacyView && contentRoutes[legacyView]) redirect(`/admin/content/${contentRoutes[legacyView]}`);
  if (legacyView === "contact_messages") redirect("/admin/messages");
  if (legacyView === "uploads") redirect("/admin/media");
  if (legacyView === "settings") redirect("/admin/settings");
  return <section className="rounded-xl border border-white/10 bg-[#100b24]/90 p-6"><h1 className="text-3xl font-bold text-white">Portfolio Dashboard</h1><p className="mt-2 text-gray-400">Choose a CMS workspace. Each destination is deep-linkable and preserved in browser history.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/admin/projects" className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5"><span className="font-semibold text-white">Projects</span><span className="mt-1 block text-sm text-gray-300">Main records, canonical sections, media and publication review.</span></Link><Link href="/admin/content/profile" className="rounded-lg border border-purple-300/20 bg-purple-300/10 p-5"><span className="font-semibold text-white">Portfolio content</span><span className="mt-1 block text-sm text-gray-300">Profile, pages, career, skills and supporting content.</span></Link></div></section>;
}

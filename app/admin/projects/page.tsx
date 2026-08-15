import Link from "next/link";
import { getAdminProjectWorkspace } from "@/lib/admin-project-workspace";

export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
  const { projects } = await getAdminProjectWorkspace();
  return <section className="rounded-xl border border-white/10 bg-[#100b24]/90 p-5"><div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Projects</h1><p className="mt-2 text-sm text-gray-400">Select a project to open its complete workspace.</p></div><Link href="/admin/projects/new" className="button-primary rounded-lg px-4 py-2">New project</Link></div><div className="mt-6 grid gap-3">{projects.map((project)=><Link key={project.id} href={`/admin/projects/${project.id}`} className="rounded-lg border border-white/10 bg-white/5 p-4 hover:border-cyan-300/30"><span className="font-semibold text-white">{project.title}</span><span className="ml-3 rounded-full bg-white/10 px-2 py-1 text-xs">{project.status}</span><p className="mt-1 text-sm text-gray-400">{project.summary || "No summary"}</p></Link>)}</div></section>;
}

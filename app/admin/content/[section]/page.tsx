import { notFound } from "next/navigation";
import { AdminDashboard, type View } from "@/components/admin/admin-dashboard";
import { getAdminContentSnapshot } from "@/lib/cms";
import type { CmsTableName } from "@/lib/cms-types";

export const dynamic = "force-dynamic";
const sections = new Set<CmsTableName>(["profile","hero","about","experience","skills","education","certifications","resumes"]);
export default async function ContentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section as CmsTableName)) notFound();
  return <AdminDashboard content={await getAdminContentSnapshot()} initialView={section as View} />;
}

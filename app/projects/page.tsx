export const revalidate = 60;
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsPageSections } from "@/components/main/cms-page-sections";
import { Projects } from "@/components/main/projects";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { resolveCmsPageRoute } from "@/lib/cms-page-routing";
import { createCmsPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "projects");
}

export default async function ProjectsPage() {
  const content = await getPortfolioContent();
  const route = resolveCmsPageRoute(content, "projects");

  if (route.mode === "not-found") notFound();

  if (route.mode === "cms") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen pt-24"
      >
        <div className="relative z-20 mx-auto max-w-7xl px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Projects", href: "/projects" },
            ]}
          />
        </div>
        <CmsPageSections content={content} pageKey="projects" />
      </main>
    );
  }

  const page = content.pages.find((item) => item.pageKey === "projects");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <div className="relative z-20 mx-auto max-w-7xl px-6"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Projects", href: "/projects" }]} /></div>
      <PageIntro eyebrow="Selected evidence" title={page?.title || "Projects"} description={page?.seoDescription || "Published projects and case studies."} links={[{ href: "/expertise", label: "See supporting expertise" }, { href: "/experience", label: "Review related experience" }, { href: "/contact", label: "Discuss an opportunity" }]} />
      <Projects projects={[...content.projects].sort((a,b) => (a.projectsPageOrder ?? 0) - (b.projectsPageOrder ?? 0))} cardLocation="projects_page" />
    </main>
  );
}

export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsPageSections } from "@/components/main/cms-page-sections";
import { EducationSection } from "@/components/main/education-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { resolveCmsPageRoute } from "@/lib/cms-page-routing";
import { createCmsPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "education");
}

export default async function EducationPage() {
  const content = await getPortfolioContent();
  const route = resolveCmsPageRoute(content, "education");

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
              { name: "Education", href: "/education" },
            ]}
          />
        </div>
        <CmsPageSections content={content} pageKey="education" />
      </main>
    );
  }

  const page = content.pages.find((item) => item.pageKey === "education");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Education", href: "/education" },
          ]}
        />
      </div>
      <PageIntro
        eyebrow="Academic foundation"
        title={
          page?.title ||
          "Business Intelligence, Big Data Analytics and E-Commerce education"
        }
        description={
          page?.seoDescription ||
          "Ahmed's completed Business Intelligence degree established the data and decision-support foundation for his work. His current Master's adds a Big Data Analytics and E-Commerce direction without replacing the practical commercial and operational context of his portfolio."
        }
        links={[
          { href: "/expertise", label: "See applied expertise" },
          { href: "/projects", label: "View project evidence" },
          { href: "/certifications", label: "Review credentials" },
        ]}
      />
      <EducationSection education={content.education} />
    </main>
  );
}

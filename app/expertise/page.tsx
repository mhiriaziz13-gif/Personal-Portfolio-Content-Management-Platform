export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CmsPageSections } from "@/components/main/cms-page-sections";
import { Skills } from "@/components/main/skills";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { resolveCmsPageRoute } from "@/lib/cms-page-routing";
import { getProjectsForExpertise } from "@/lib/expertise-projects";
import { createCmsPageMetadata } from "@/lib/seo/metadata";

const explanations: Record<string, string> = {
  "Data & Business Intelligence":
    "Turns operational, financial and commercial data into KPI views, variance analysis and decision-ready reporting.",
  "Marketing & Customer Growth":
    "Connects customer journeys, digital visibility and campaign activity with commercial questions and measurable evidence.",
  "Automation & Operations":
    "Translates business rules into reviewable workflows, structured outputs and exception handling.",
  "Technical Stack":
    "Uses web, database and AI tooling to build maintainable interfaces, integrations and data-supported workflows.",
};

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "expertise");
}

export default async function ExpertisePage() {
  const content = await getPortfolioContent();
  const route = resolveCmsPageRoute(content, "expertise");

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
              { name: "Expertise", href: "/expertise" },
            ]}
          />
        </div>
        <CmsPageSections content={content} pageKey="expertise" />
      </main>
    );
  }

  const page = content.pages.find((item) => item.pageKey === "expertise");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Expertise", href: "/expertise" },
          ]}
        />
      </div>
      <PageIntro
        eyebrow="Capabilities in context"
        title={page?.title || "Analytics, marketing and automation expertise"}
        description={
          page?.seoDescription ||
          "Ahmed groups tools around the business decisions and workflows they support. The emphasis is on useful deliverables, validation and auditability—not unsupported proficiency scores or expert labels."
        }
        links={[
          { href: "/projects", label: "View case studies" },
          { href: "/experience", label: "Review experience" },
          { href: "/contact", label: "Discuss a role" },
        ]}
      />
      {content.skillCategories.length > 0 && (
        <div className="relative z-20 mx-auto grid max-w-7xl gap-5 px-6 md:grid-cols-2">
          {content.skillCategories.map((category) => {
            const relatedProjects = getProjectsForExpertise(
              category,
              content.projects,
            );

            return (
              <section
                key={category.title}
                className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6"
              >
                <h2 className="text-2xl font-bold text-white">
                  {category.title}
                </h2>
                <p className="mt-3 leading-7 text-gray-300">
                  {explanations[category.title] ||
                    "Skills used to support practical business and technical deliverables."}
                </p>
                <p className="mt-3 text-sm text-gray-300">
                  <strong className="text-white">Deliverables:</strong>{" "}
                  analysis, reports, workflows, interfaces or integrations
                  appropriate to the problem.
                </p>
                <p className="mt-3 text-sm text-cyan-100">
                  Tools and methods: {category.skills.join(", ")}
                </p>
                {relatedProjects.length > 0 && (
                  <div className="mt-5 flex flex-col items-start gap-3">
                    {relatedProjects.map((project) => (
                      <Link
                        key={project.slug}
                        href={`/projects/${project.slug}`}
                        className="button-secondary group inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
                      >
                        See the {project.title} case study
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Skills skillCategories={content.skillCategories} />
    </main>
  );
}
export const revalidate = 60;
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CertificationsSection } from "@/components/main/certifications-section";
import { CmsPageSections } from "@/components/main/cms-page-sections";
import { EducationSection } from "@/components/main/education-section";
import { ResumeSection } from "@/components/main/resume-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { resolveCmsPageRoute } from "@/lib/cms-page-routing";
import { createCmsPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "resume");
}

export default async function ResumePage() {
  const content = await getPortfolioContent();
  const route = resolveCmsPageRoute(content, "resume");

  if (route.mode === "not-found") notFound();

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Resume", href: "/resume" },
          ]}
        />
      </div>
      {route.mode === "cms" ? (
        <CmsPageSections content={content} pageKey="resume" />
      ) : (
        <PageIntro
          eyebrow="CV and supporting evidence"
          title="Resume options for Ahmed Aziz Mhiri"
          description="Access current resume versions for Ahmed Aziz Mhiri, Marketing & Commercial Analyst and Digital Transformation Project Manager."
          links={[
            { href: "/projects", label: "Review project evidence" },
            { href: "/experience", label: "See the full timeline" },
            {
              href: "/contact",
              label: "Contact Ahmed",
              analyticsEvent: {
                event: "contact_cta_click",
                cta_location: "resume_page",
                cta_label: "resume_contact",
              },
            },
          ]}
        />
      )}
      <ResumeSection resumes={content.resumes} />
      <EducationSection education={content.education} />
      <CertificationsSection certifications={content.certifications} />
    </main>
  );
}

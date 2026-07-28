export const revalidate = 60;

import type { Metadata } from "next";

import { About } from "@/components/main/about";
import { CertificationsSection } from "@/components/main/certifications-section";
import { Contact } from "@/components/main/contact";
import { EducationSection } from "@/components/main/education-section";
import { Experience } from "@/components/main/experience";
import { Hero } from "@/components/main/hero";
import { Projects } from "@/components/main/projects";
import { ResumeSection } from "@/components/main/resume-section";
import { Skills } from "@/components/main/skills";
import { getPortfolioContent } from "@/lib/cms";
import { JsonLd } from "@/components/seo/json-ld";
import { personSchema, websiteSchema } from "@/lib/seo/schema";
import { CmsPageSections } from "@/components/main/cms-page-sections";
import { createCmsPageMetadata } from "@/lib/seo/metadata";
import { profilePageSchema } from "@/lib/seo/schema";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "home");
}

export default async function Home() {
  const content = await getPortfolioContent();

  return (
    <main id="main-content" tabIndex={-1} className="h-full w-full">
      <JsonLd
        data={[
          websiteSchema(),
          personSchema(content.profile),
          profilePageSchema(content.profile),
        ]}
      />
      {content.pages.find((page) => page.pageKey === "home")?.sections.length ? (
        <CmsPageSections content={content} pageKey="home" />
      ) : (
        <>
          <Hero profile={content.profile} hero={content.hero} />
          <About profile={content.profile} about={content.about} />
          <Skills skillCategories={content.skillCategories} />
          <Projects projects={content.projects.filter((project) => project.featured).slice(0, 3)} cardLocation="homepage" />
          <Experience experience={content.experience} />
          <EducationSection preview education={content.education} />
          <CertificationsSection preview certifications={content.certifications} />
          <ResumeSection preview resumes={content.resumes} />
          <Contact profile={content.profile} />
        </>
      )}
    </main>
  );
}

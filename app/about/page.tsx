export const revalidate = 60;
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { About } from "@/components/main/about";
import { CmsPageSections } from "@/components/main/cms-page-sections";
import { VolunteeringSection } from "@/components/main/volunteering-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { resolveCmsPageRoute } from "@/lib/cms-page-routing";
import { createCmsPageMetadata } from "@/lib/seo/metadata";
import { profilePageSchema } from "@/lib/seo/schema";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "about");
}

export default async function AboutPage() {
  const content = await getPortfolioContent();
  const route = resolveCmsPageRoute(content, "about");

  if (route.mode === "not-found") notFound();

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <JsonLd data={profilePageSchema(content.profile)} />
      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "About", href: "/about" },
          ]}
        />
      </div>
      {route.mode === "cms" ? (
        <CmsPageSections content={content} pageKey="about" />
      ) : (
        <>
          <PageIntro
            eyebrow="Professional profile"
            title={content.about.title}
            description={content.profile.shortProfile}
            links={[
              { href: "/expertise", label: "Explore expertise" },
              { href: "/projects", label: "View case studies" },
              { href: "/resume", label: "View resume" },
            ]}
          />
          <About profile={content.profile} about={content.about} />
          <VolunteeringSection entries={content.volunteering} />
        </>
      )}
    </main>
  );
}

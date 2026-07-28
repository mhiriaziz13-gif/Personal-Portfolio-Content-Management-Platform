export const revalidate = 60;
import type { Metadata } from "next";
import { About } from "@/components/main/about";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { createCmsPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "about");
}

export default async function AboutPage() {
  const content = await getPortfolioContent();
  const page = content.pages.find((item) => item.pageKey === "about");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <div className="relative z-20 mx-auto max-w-7xl px-6"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About", href: "/about" }]} /></div>
      <PageIntro eyebrow="Professional profile" title={page?.title || content.about.title} description={page?.seoDescription || content.profile.shortProfile} links={[{ href: "/expertise", label: "Explore expertise" }, { href: "/projects", label: "View case studies" }, { href: "/resume", label: "View resume" }]} />
      <About profile={content.profile} about={content.about} />
    </main>
  );
}

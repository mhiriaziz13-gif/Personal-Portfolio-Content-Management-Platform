export const revalidate = 60;

import type { Metadata } from "next";

import { CertificationsSection } from "@/components/main/certifications-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageIntro } from "@/components/seo/page-intro";
import { getPortfolioContent } from "@/lib/cms";
import { createCmsPageMetadata } from "@/lib/seo/metadata";
import { credentialSchema } from "@/lib/seo/schema";

export async function generateMetadata(): Promise<Metadata> {
  return createCmsPageMetadata(await getPortfolioContent(), "certifications");
}

export default async function CertificationsPage() {
  const content = await getPortfolioContent();
  const page = content.pages.find((item) => item.pageKey === "certifications");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-24">
      <JsonLd
        data={content.certifications.map((certification, index) =>
          credentialSchema(certification, index),
        )}
      />
      <div className="relative z-20 mx-auto max-w-7xl px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Certifications", href: "/certifications" },
          ]}
        />
      </div>
      <PageIntro
        eyebrow="Verified learning"
        title={page?.title || "Professional certifications"}
        description={
          page?.seoDescription ||
          "This page lists only credentials available through the published CMS. Dates and credential IDs are omitted when they have not been confirmed."
        }
        links={[
          { href: "/education", label: "View education" },
          { href: "/expertise", label: "Explore expertise" },
          { href: "/resume", label: "Open resume options" },
        ]}
      />
      <CertificationsSection certifications={content.certifications} />
    </main>
  );
}

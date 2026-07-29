import type { Metadata } from "next";

import type { PortfolioContent } from "@/lib/cms-types";
import { isProductionDeployment, siteSeo } from "@/lib/seo/config";
import { absoluteUrl, resolveMediaUrl } from "@/lib/seo/urls";

export const publicPageDefinitions = [
  {
    pageKey: "home",
    path: "/",
    title: "Data-Driven Marketing & Commercial Analytics",
    description:
      "Ahmed Aziz Mhiri connects marketing and commercial analytics, business intelligence, customer insight and auditable process automation.",
  },
  {
    pageKey: "about",
    path: "/about",
    title: "About",
    description:
      "How Ahmed Aziz Mhiri combines marketing and commercial analytics, business intelligence, customer insight and process automation.",
  },
  {
    pageKey: "expertise",
    path: "/expertise",
    title: "Expertise",
    description:
      "How Ahmed Aziz Mhiri applies business intelligence, marketing analytics, customer insight and process automation to commercial and operational questions.",
  },
  {
    pageKey: "projects",
    path: "/projects",
    title: "Projects",
    description:
      "Public-safe case studies by Ahmed Aziz Mhiri across commercial analytics, business intelligence, marketing transformation and process automation.",
  },
  {
    pageKey: "experience",
    path: "/experience",
    title: "Experience",
    description:
      "Ahmed Aziz Mhiri's professional timeline across analytics, commercial operations, digital marketing, business systems and automation.",
  },
  {
    pageKey: "education",
    path: "/education",
    title: "Education",
    description:
      "Verified education supporting Ahmed Aziz Mhiri's work in business intelligence, big data analytics, e-commerce and commercial decision-making.",
  },
  {
    pageKey: "certifications",
    path: "/certifications",
    title: "Certifications",
    description:
      "Verified professional credentials held by Ahmed Aziz Mhiri across digital marketing, analytics and related disciplines.",
  },
  {
    pageKey: "resume",
    path: "/resume",
    title: "Resume",
    description:
      "View Ahmed Aziz Mhiri's resume formats and supporting education and certification information.",
  },
  {
    pageKey: "contact",
    path: "/contact",
    title: "Contact",
    description:
      "Contact Ahmed Aziz Mhiri about marketing analytics, commercial analytics, business intelligence and process automation opportunities.",
  },
] as const;

export type PublicPageKey = (typeof publicPageDefinitions)[number]["pageKey"];

type PageMetadata = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  openGraphTitle?: string;
  openGraphDescription?: string;
};

export const createPageMetadata = ({
  title,
  description,
  path,
  image = siteSeo.socialImage,
  noindex = false,
  openGraphTitle = title,
  openGraphDescription = description,
}: PageMetadata): Metadata => {
  const canonical = absoluteUrl(path);
  const shouldIndex = isProductionDeployment && !noindex;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: shouldIndex, follow: shouldIndex, nocache: !shouldIndex },
    openGraph: { title: openGraphTitle, description: openGraphDescription, url: canonical, siteName: siteSeo.siteName, locale: siteSeo.locale, type: "website", images: [{ url: resolveMediaUrl(image), width: 1200, height: 630, alt: `${openGraphTitle} — Ahmed Aziz Mhiri` }] },
    twitter: { card: "summary_large_image", title, description, images: [resolveMediaUrl(image)] },
  };
};

export const getPublicPageDefinition = (pageKey: PublicPageKey) =>
  publicPageDefinitions.find((definition) => definition.pageKey === pageKey)!;

export const getPublishedPublicPages = (content: PortfolioContent) => {
  if (
    content.delivery.source !== "cms" ||
    content.delivery.pages !== "ok"
  ) {
    return [];
  }

  const pagesByKey = new Map(
    content.pages
      .filter((page) => page.isPublished)
      .map((page) => [page.pageKey, page]),
  );

  return publicPageDefinitions.flatMap((definition) => {
    const page = pagesByKey.get(definition.pageKey);
    return page ? [{ definition, page }] : [];
  });
};

export const createCmsPageMetadata = (
  content: PortfolioContent,
  pageKey: PublicPageKey,
) => {
  const definition = getPublicPageDefinition(pageKey);
  const page = content.pages.find(
    (candidate) =>
      candidate.pageKey === pageKey &&
      candidate.isPublished,
  );
  const pageRegistryUnavailable =
    content.delivery.source === "fallback" || content.delivery.pages === "failed";

  return createPageMetadata({
    title: page?.seoTitle || definition.title,
    description: page?.seoDescription || definition.description,
    path: definition.path,
    image: page?.openGraphImage || siteSeo.socialImage,
    openGraphTitle: page?.openGraphTitle || page?.seoTitle || definition.title,
    openGraphDescription:
      page?.openGraphDescription ||
      page?.seoDescription ||
      definition.description,
    noindex: !page && !pageRegistryUnavailable,
  });
};

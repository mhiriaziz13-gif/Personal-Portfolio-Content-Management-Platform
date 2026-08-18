import type { Metadata } from "next";

import type { PortfolioContent } from "@/lib/cms-types";
import {
  isProductionDeployment,
  publicIdentity,
  siteSeo,
} from "@/lib/seo/config";
import { absoluteUrl, resolveMediaUrl } from "@/lib/seo/urls";

export const publicPageDefinitions = [
  {
    pageKey: "home",
    path: "/",
    title: "Marketing & Commercial Analyst",
    description:
      "Portfolio of Ahmed Aziz Mhiri, Marketing & Commercial Analyst and Digital Transformation Project Manager combining Business Intelligence, Big Data, AI, CRM automation and engineering for measurable business outcomes.",
  },
  {
    pageKey: "about",
    path: "/about",
    title: "About Ahmed Aziz Mhiri",
    description:
      "Learn how Ahmed Aziz Mhiri combines Marketing & Commercial Analytics, Business Intelligence, Big Data, AI, automation and engineering to turn business problems into decisions and digital solutions.",
  },
  {
    pageKey: "expertise",
    path: "/expertise",
    title: "Marketing Analytics, Big Data, AI & Digital Transformation",
    description:
      "Explore capabilities across Marketing & Commercial Analytics, Business Intelligence, Big Data, AI, CRM and Marketing Automation, Digital Transformation and engineering.",
  },
  {
    pageKey: "projects",
    path: "/projects",
    title: "Projects | Marketing, Commercial Analytics, AI & Automation",
    description:
      "Case studies and projects across commercial analytics, customer journeys, process automation, AI, hospitality, travel and digital product development.",
  },
  {
    pageKey: "experience",
    path: "/experience",
    title: "Experience | Marketing Analytics, BI & Digital Transformation",
    description:
      "Professional experience across group-level digital transformation, connectivity, IT systems, commercial and marketing operations, management control, AI and full-stack development.",
  },
  {
    pageKey: "education",
    path: "/education",
    title: "Education | Big Data Analytics & Business Intelligence",
    description:
      "Education in Big Data Analytics & E-Commerce and Business Intelligence, including AI, Machine Learning, NoSQL, cloud data platforms and business analytics.",
  },
  {
    pageKey: "certifications",
    path: "/certifications",
    title: "Certifications",
    description: "Published professional certifications.",
  },
  {
    pageKey: "resume",
    path: "/resume",
    title: "Resume",
    description:
      "Access current resume versions for Ahmed Aziz Mhiri, Marketing & Commercial Analyst and Digital Transformation Project Manager.",
  },
  {
    pageKey: "contact",
    path: "/contact",
    title: "Contact Ahmed Aziz Mhiri",
    description:
      "Contact Ahmed Aziz Mhiri about Marketing & Commercial Analytics, Business Intelligence, Digital Transformation, automation and selected freelance opportunities.",
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
const createMetadataTitle = (title: string): Metadata["title"] =>
  title.includes(publicIdentity.name)
    ? { absolute: title }
    : title;
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
    title: createMetadataTitle(title),
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

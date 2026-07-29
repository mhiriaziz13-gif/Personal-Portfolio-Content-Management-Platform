import type { MetadataRoute } from "next";

import type { PortfolioContent } from "@/lib/cms-types";
import { getPublishedPublicPages } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/urls";

const getPageEntries = (content: PortfolioContent | null) =>
  content ? getPublishedPublicPages(content) : [];

const hasConfirmedDelivery = (
  content: PortfolioContent | null,
  group: "profile" | "projects",
) => content?.delivery.source === "cms" && content.delivery[group] === "ok";

export const createSitemapEntries = (
  content: PortfolioContent | null,
): MetadataRoute.Sitemap => {
  const pages: MetadataRoute.Sitemap = getPageEntries(content).map(
    ({ definition, page }) => ({
      url: absoluteUrl(definition.path),
      ...(page.updatedAt ? { lastModified: page.updatedAt } : {}),
    }),
  );
  const projects: MetadataRoute.Sitemap = (
    hasConfirmedDelivery(content, "projects") ? content?.projects ?? [] : []
  )
    .filter(
      (project) =>
        project.status === "published" &&
        Boolean(project.slug) &&
        Boolean(project.description),
    )
    .map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      ...(project.updatedAt ? { lastModified: project.updatedAt } : {}),
    }));

  return [...pages, ...projects];
};

export const createLlmsText = (content: PortfolioContent | null) => {
  const pages = getPageEntries(content)
    .filter(({ definition }) => definition.pageKey !== "home")
    .map(({ definition, page }) => {
      const title = cleanText(page.title);
      const description = cleanText(page.seoDescription);
      return `- [${title}](${absoluteUrl(definition.path)}): ${description}`;
    })
    .join("\n");
  const projects = (
    hasConfirmedDelivery(content, "projects") ? content?.projects ?? [] : []
  )
    .filter(
      (project) =>
        project.status === "published" &&
        Boolean(project.slug) &&
        Boolean(project.description.trim()),
    )
    .map(
      (project) =>
        `- [${cleanText(project.title)}](${absoluteUrl(`/projects/${project.slug}`)}): ${cleanText(project.description)}`,
    )
    .join("\n");
  const profile =
    hasConfirmedDelivery(content, "profile") && content?.profile.name
      ? content.profile
      : null;
  const profiles = profile
    ? [
        ["LinkedIn", profile.linkedIn],
        ["GitHub", profile.github],
      ]
        .filter((entry) => entry[1])
        .map(([label, url]) => `- [${label}](${url})`)
        .join("\n")
    : "";
  const hasPublishedEntries = Boolean(
    pages || projects || profiles || profile,
  );

  return [
    `# ${cleanText(profile?.name || "Portfolio")}`,
    ...(profile?.mainTitle
      ? ["", `> ${cleanText(profile.mainTitle)}`]
      : []),
    ...(profile?.location || profile?.availability
      ? [
          "",
          [profile.location, profile.availability]
            .filter(Boolean)
            .map(cleanText)
            .join(". "),
        ]
      : []),
    ...(pages ? ["", "## Primary pages", "", pages] : []),
    ...(projects ? ["", "## Selected projects", "", projects] : []),
    ...(profiles ? ["", "## Professional profiles", "", profiles] : []),
    "",
    "## Content notes",
    "",
    ...(!hasPublishedEntries
      ? [
          "The CMS publication state is unavailable, so no page, project or profile entries are listed.",
          "",
        ]
      : []),
    "Project descriptions are public-safe and may omit confidential operational data. This file is a supplementary, experimental discovery aid; it does not guarantee crawling, ranking or use by AI systems.",
    "",
  ].join("\n");
};

const cleanText = (value: string) =>
  value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();

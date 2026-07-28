import type { MetadataRoute } from "next";

import { getPortfolioContent } from "@/lib/cms";
import { publicPageDefinitions } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/urls";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getPortfolioContent();
  const publishedPages = new Map(
    content.pages.map((page) => [page.pageKey, page]),
  );

  const pages: MetadataRoute.Sitemap = publicPageDefinitions.flatMap(
    (definition) => {
      const page = publishedPages.get(definition.pageKey);
      if (!page) return [];
      return [
        {
          url: absoluteUrl(definition.path),
          ...(page.updatedAt ? { lastModified: page.updatedAt } : {}),
        },
      ];
    },
  );

  const projects: MetadataRoute.Sitemap = content.projects
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
}

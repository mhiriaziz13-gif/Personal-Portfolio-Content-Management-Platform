import { describe, expect, it } from "vitest";

import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import {
  createCmsPageMetadata,
  publicPageDefinitions,
} from "@/lib/seo/metadata";

describe("public metadata", () => {
  it("keeps route titles, descriptions and canonical paths unique", () => {
    expect(new Set(publicPageDefinitions.map((page) => page.title)).size).toBe(
      publicPageDefinitions.length,
    );
    expect(
      new Set(publicPageDefinitions.map((page) => page.description)).size,
    ).toBe(publicPageDefinitions.length);
    expect(new Set(publicPageDefinitions.map((page) => page.path)).size).toBe(
      publicPageDefinitions.length,
    );
  });

  it("uses published CMS metadata and social fields when present", () => {
    const content = {
      ...fallbackPortfolioContent,
      delivery: {
        ...fallbackPortfolioContent.delivery,
        source: "cms" as const,
        pages: "ok" as const,
      },
      pages: [
        {
          id: "page-about",
          pageKey: "about",
          title: "About Ahmed",
          slug: "about",
          seoTitle: "CMS About Title",
          seoDescription: "CMS About Description",
          openGraphTitle: "CMS Social Title",
          openGraphDescription: "CMS Social Description",
          openGraphImage: "/cms-about.png",
          navigationLabel: "About",
          navigationOrder: 40,
          showInNavigation: true,
          showInFooter: true,
          isPublished: true,
          updatedAt: "2026-07-27T10:00:00.000Z",
          sections: [],
        },
      ],
    };

    const metadata = createCmsPageMetadata(content, "about");

    expect(metadata.title).toBe("CMS About Title");
    expect(metadata.description).toBe("CMS About Description");
    expect(metadata.alternates).toEqual({
      canonical: "https://ahmedaziz-portfolio.vercel.app/about",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "CMS Social Title",
      description: "CMS Social Description",
      url: "https://ahmedaziz-portfolio.vercel.app/about",
    });
  });

  it("keeps the emergency fallback availability factual and current", () => {
    expect(fallbackPortfolioContent.profile.availability).toBe(
      "Open to selected freelance projects and building toward international full-time opportunities from 2027.",
    );
    expect(fallbackPortfolioContent.profile.availability).not.toMatch(
      /(?:October|Oct\.?)\s+2027|Summer\s+2027/i,
    );
  });
});

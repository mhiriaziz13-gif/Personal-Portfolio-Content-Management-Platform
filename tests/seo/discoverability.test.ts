import { describe, expect, it } from "vitest";

import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type {
  PageContent,
  PortfolioContent,
  ProjectContent,
} from "@/lib/cms-types";
import {
  createLlmsText,
  createSitemapEntries,
} from "@/lib/seo/discoverability";

const aboutPage: PageContent = {
  id: "about-page",
  pageKey: "about",
  title: "About Ahmed",
  slug: "about",
  seoTitle: "About Ahmed",
  seoDescription: "Published profile page.",
  openGraphTitle: "About Ahmed",
  openGraphDescription: "Published profile page.",
  openGraphImage: "/opengraph-image",
  navigationLabel: "About",
  navigationOrder: 40,
  showInNavigation: true,
  showInFooter: true,
  isPublished: true,
  updatedAt: "2026-07-29T00:00:00.000Z",
  sections: [],
};

const publishedProject: ProjectContent = {
  id: "published-project",
  slug: "published-case-study",
  title: "Published case study",
  description: "Visible, evidence-based project summary.",
  image: "/projects/project-1.png",
  tags: ["Analytics"],
  tools: ["Excel"],
  status: "published",
  media: [],
  createdAt: "2026-07-28T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const cmsContent: PortfolioContent = {
  ...fallbackPortfolioContent,
  pages: [aboutPage],
  projects: [
    publishedProject,
    {
      ...publishedProject,
      id: "draft-project",
      slug: "draft-case-study",
      title: "Draft case study",
      status: "draft",
    },
  ],
  delivery: {
    ...fallbackPortfolioContent.delivery,
    source: "cms",
    profile: "ok",
    pages: "ok",
    projects: "ok",
  },
};

describe("published discoverability surfaces", () => {
  it("uses canonical registered pages and published projects only", () => {
    const urls = createSitemapEntries(cmsContent).map((entry) => entry.url);

    expect(urls).toEqual([
      "https://ahmedaziz-portfolio.vercel.app/about",
      "https://ahmedaziz-portfolio.vercel.app/projects/published-case-study",
    ]);
    expect(urls.join(" ")).not.toContain("draft-case-study");
  });

  it("fails closed when publication state is unavailable", () => {
    expect(createSitemapEntries(null)).toEqual([]);

    const llms = createLlmsText(null);
    expect(llms).not.toContain("https://");
    expect(llms).toContain("publication state is unavailable");
  });

  it("omits only delivery groups whose publication state is unconfirmed", () => {
    const content = {
      ...cmsContent,
      delivery: {
        ...cmsContent.delivery,
        pages: "failed" as const,
      },
    };
    const urls = createSitemapEntries(content).map((entry) => entry.url);

    expect(urls).toEqual([
      "https://ahmedaziz-portfolio.vercel.app/projects/published-case-study",
    ]);
    expect(createLlmsText(content)).not.toContain("Published profile page.");
  });

  it("keeps llms.txt supplementary and excludes unpublished content", () => {
    const llms = createLlmsText(cmsContent);

    expect(llms).toContain("[About Ahmed]");
    expect(llms).toContain("Published case study");
    expect(llms).not.toContain("Draft case study");
    expect(llms).toContain("supplementary, experimental discovery aid");
    expect(llms).toContain(
      "Open to selected freelance projects and building toward international full-time opportunities from 2027.",
    );
    expect(llms).not.toMatch(
      /(?:October|Oct\.?)\s+2027|Summer\s+2027/i,
    );
  });
  it("excludes published projects without meaningful public metadata", () => {
    const incompleteProjects: ProjectContent[] = [
      {
        ...publishedProject,
        id: "blank-slug-project",
        slug: "   ",
        title: "Blank slug project",
      },
      {
        ...publishedProject,
        id: "blank-description-project",
        slug: "blank-description-project",
        title: "Blank description project",
        description: "   ",
      },
    ];

    const content: PortfolioContent = {
      ...cmsContent,
      projects: [...cmsContent.projects, ...incompleteProjects],
    };

    const sitemap = createSitemapEntries(content)
      .map((entry) => entry.url)
      .join(" ");

    const llms = createLlmsText(content);

    expect(sitemap).not.toContain("blank-description-project");
    expect(sitemap).not.toContain("blank-slug-project");

    expect(llms).not.toContain("Blank description project");
    expect(llms).not.toContain("Blank slug project");
  });
});

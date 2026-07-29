import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CmsPageSections } from "@/components/main/cms-page-sections";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type {
  PageContent,
  PageSectionContent,
} from "@/lib/cms-types";

vi.mock("@/components/main/hero", () => ({
  Hero: () =>
    createElement(
      "section",
      { "data-mock-block": "hero" },
      createElement("h1", null, "CMS hero"),
    ),
}));
vi.mock("@/components/main/projects", () => ({
  Projects: () =>
    createElement("section", { "data-mock-block": "projects" }),
}));
vi.mock("@/components/main/experience", () => ({
  Experience: () =>
    createElement("section", { "data-mock-block": "experience" }),
}));
vi.mock("@/components/main/skills", () => ({
  Skills: () => createElement("section", { "data-mock-block": "skills" }),
}));
vi.mock("@/components/main/certifications-section", () => ({
  CertificationsSection: () =>
    createElement("section", { "data-mock-block": "certifications" }),
}));
vi.mock("@/components/main/volunteering-section", () => ({
  VolunteeringSection: () =>
    createElement("section", { "data-mock-block": "volunteering" }),
}));

const section = (
  values: Partial<PageSectionContent>,
): PageSectionContent => ({
  id: "section",
  pageKey: "about",
  sectionType: "rich_text",
  title: "",
  subtitle: "",
  description: "",
  ctaLabel: "",
  ctaHref: "",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
  displayOrder: 0,
  layoutVariant: "default",
  items: [],
  updatedAt: "2026-07-29T00:00:00.000Z",
  ...values,
});

const page = (sections: PageSectionContent[]): PageContent => ({
  id: "page",
  pageKey: "about",
  title: "About",
  slug: "/about",
  seoTitle: "About",
  seoDescription: "About the portfolio owner.",
  openGraphTitle: "About",
  openGraphDescription: "About the portfolio owner.",
  openGraphImage: "/opengraph-image",
  navigationLabel: "About",
  navigationOrder: 40,
  showInNavigation: true,
  showInFooter: true,
  isPublished: true,
  updatedAt: "2026-07-29T00:00:00.000Z",
  sections,
});

describe("public controlled block rendering", () => {
  it("turns multiline rich text into separate readable paragraphs", () => {
    const markup = renderToStaticMarkup(
      createElement(CmsPageSections, {
        content: {
          ...fallbackPortfolioContent,
          pages: [
            page([
              section({
                title: "Readable context",
                description: "First concise paragraph.\nSecond concise paragraph.",
                layoutVariant: "compact",
              }),
            ]),
          ],
        },
        pageKey: "about",
      }),
    );

    expect(markup).toContain('data-layout-variant="compact"');
    expect(markup).toContain('<h1 class="sr-only">About</h1>');
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain("<p>First concise paragraph.</p>");
    expect(markup).toContain("<p>Second concise paragraph.</p>");
  });

  it("uses the hero H1 without adding a duplicate route heading", () => {
    const markup = renderToStaticMarkup(
      createElement(CmsPageSections, {
        content: {
          ...fallbackPortfolioContent,
          pages: [
            page([
              section({
                sectionType: "hero",
                title: "Controlled hero",
                description: "Meaningful hero introduction.",
              }),
            ]),
          ],
        },
        pageKey: "about",
      }),
    );

    expect(markup).toContain('data-mock-block="hero"');
    expect(markup).not.toContain('class="sr-only"');
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });

  it("omits title-only sections and cards but retains the route H1", () => {
    const markup = renderToStaticMarkup(
      createElement(CmsPageSections, {
        content: {
          ...fallbackPortfolioContent,
          pages: [
            page([
              section({ title: "Empty rich text" }),
              section({
                id: "cards",
                sectionType: "custom_cards",
                title: "Empty cards",
                items: [
                  {
                    id: "title-only",
                    pageSectionId: "cards",
                    title: "No supporting content",
                    subtitle: "",
                    description: "",
                    linkLabel: "",
                    linkUrl: "",
                    mediaUrl: "",
                    mediaAlt: "",
                    displayOrder: 0,
                  },
                ],
              }),
            ]),
          ],
        },
        pageKey: "about",
      }),
    );

    expect(markup).toBe('<h1 class="sr-only">About</h1>');
  });
});

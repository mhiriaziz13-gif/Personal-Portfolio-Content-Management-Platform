import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ResumePage from "@/app/resume/page";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import type { PageContent, PortfolioContent } from "@/lib/cms-types";

const mocks = vi.hoisted(() => ({
  getPortfolioContent: vi.fn<() => Promise<PortfolioContent>>(),
  notFound: vi.fn(() => {
    throw new Error("Unexpected notFound");
  }),
}));

vi.mock("@/lib/cms", () => ({
  getPortfolioContent: mocks.getPortfolioContent,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/components/analytics/tracked-link", () => ({
  TrackedLink: ({
    analyticsEvent,
    children,
    className,
    download,
    href,
  }: {
    analyticsEvent: AnalyticsEvent | AnalyticsEvent[];
    children: ReactNode;
    className?: string;
    download?: boolean;
    href: string;
  }) => {
    const event = Array.isArray(analyticsEvent)
      ? analyticsEvent[0]
      : analyticsEvent;

    return createElement(
      "a",
      {
        className,
        download,
        href,
        "data-event": event.event,
        "data-cv-variant":
          event.event === "resume_download" ? event.cv_variant : undefined,
        "data-file-format":
          event.event === "resume_download" ? event.file_format : undefined,
        "data-cta-location":
          "cta_location" in event ? event.cta_location : undefined,
      },
      children,
    );
  },
}));

const publishedResumePage: PageContent = {
  id: "page-resume",
  pageKey: "resume",
  title: "Resume",
  slug: "/resume",
  seoTitle: "Resume",
  seoDescription: "Published resume page.",
  openGraphTitle: "Resume",
  openGraphDescription: "Published resume page.",
  openGraphImage: "/opengraph-image",
  navigationLabel: "Resume",
  navigationOrder: 90,
  showInNavigation: true,
  showInFooter: true,
  isPublished: true,
  updatedAt: "2026-07-29T00:00:00.000Z",
  sections: [
    {
      id: "resume-introduction",
      pageKey: "resume",
      sectionType: "rich_text",
      title: "Resume introduction",
      subtitle: "",
      description: "Choose the format that fits the application.",
      ctaLabel: "",
      ctaHref: "",
      secondaryCtaLabel: "",
      secondaryCtaHref: "",
      displayOrder: 0,
      layoutVariant: "compact",
      items: [],
      updatedAt: "2026-07-29T00:00:00.000Z",
    },
  ],
};

const cmsContent: PortfolioContent = {
  ...fallbackPortfolioContent,
  resumes: [
    {
      title: "English Professional CV",
      variant: "english",
      pdfPath: "/cv/english.pdf",
      docxPath: "/cv/english.docx",
      available: true,
      sortOrder: 2,
    },
    {
      title: "French CV",
      variant: "french",
      pdfPath: "/cv/french.pdf",
      docxPath: "/cv/french.docx",
      available: true,
      sortOrder: 1,
    },
  ],
  education: [
    {
      institution: "CMS University",
      degree: "CMS Education Entry",
      startDate: "2024",
      endDate: "2026",
      status: "Published",
      location: "Tunis",
      sortOrder: 1,
    },
  ],
  certifications: [
    {
      name: "CMS Certification Entry",
      issuer: "CMS Academy",
      date: "2026",
      tags: ["Analytics"],
      sortOrder: 1,
    },
  ],
  pages: [publishedResumePage],
  delivery: {
    ...fallbackPortfolioContent.delivery,
    source: "cms",
    pages: "ok",
  },
};

const expectTrackedDownload = (
  markup: string,
  href: string,
  cvVariant: "english" | "french",
  fileFormat: "pdf" | "docx",
) => {
  const link = markup
    .match(/<a\b[^>]*>/g)
    ?.find((candidate) => candidate.includes(`href="${href}"`));

  expect(link).toBeDefined();
  expect(link).toContain('data-event="resume_download"');
  expect(link).toContain(`data-cv-variant="${cvVariant}"`);
  expect(link).toContain(`data-file-format="${fileFormat}"`);
  expect(link).toContain('data-cta-location="resume_page"');
};

describe("published CMS Resume page", () => {
  it("keeps specialized downloads, education, and certifications after CMS content", async () => {
    mocks.getPortfolioContent.mockResolvedValue(cmsContent);

    const markup = renderToStaticMarkup(await ResumePage());

    expect(markup).toContain("Resume introduction");
    for (const resumeTitle of ["English Professional CV", "French CV"]) {
      expect(markup).toContain(resumeTitle);
      expect(markup.indexOf("Resume introduction")).toBeLessThan(
        markup.indexOf(resumeTitle),
      );
    }
    expect(markup.indexOf("French CV")).toBeLessThan(
      markup.indexOf("English Professional CV"),
    );
    expect(markup.match(/>Download PDF<\/a>/g)).toHaveLength(2);
    expect(markup.match(/>Download DOCX<\/a>/g)).toHaveLength(2);

    expectTrackedDownload(markup, "/cv/english.pdf", "english", "pdf");
    expectTrackedDownload(markup, "/cv/english.docx", "english", "docx");
    expectTrackedDownload(markup, "/cv/french.pdf", "french", "pdf");
    expectTrackedDownload(markup, "/cv/french.docx", "french", "docx");

    expect(markup.match(/>CV &amp; Resume<\/h2>/g)).toHaveLength(1);
    expect(markup.match(/>Education<\/h2>/g)).toHaveLength(1);
    expect(markup.match(/>Certifications<\/h2>/g)).toHaveLength(1);
    expect(markup.indexOf("CV &amp; Resume")).toBeLessThan(
      markup.indexOf(">Education</h2>"),
    );
    expect(markup.indexOf(">Education</h2>")).toBeLessThan(
      markup.indexOf(">Certifications</h2>"),
    );
    expect(markup).toContain("CMS Education Entry");
    expect(markup).toContain("CMS Certification Entry");
    expect(markup).not.toContain("Open resume");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});

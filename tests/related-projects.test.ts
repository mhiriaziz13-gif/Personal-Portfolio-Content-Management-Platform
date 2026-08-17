import { describe, expect, it } from "vitest";

import type { ProjectContent } from "@/lib/cms-types";
import {
  getRelatedProjects,
  scoreProjectRelation,
} from "@/lib/related-projects";

const makeProject = ({
  slug,
  title,
  tags = [],
  tools = [],
  type = "",
  sortOrder = 0,
  projectsPageOrder,
}: {
  slug: string;
  title: string;
  tags?: string[];
  tools?: string[];
  type?: string;
  sortOrder?: number;
  projectsPageOrder?: number;
}): ProjectContent => ({
  id: slug,
  slug,
  title,
  description: `${title} description`,
  image: "/projects/project-1.png",
  tags,
  tools,
  type,
  sortOrder,
  projectsPageOrder,
  media: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("related project recommendations", () => {
  it("does not recommend projects with no meaningful relationship", () => {
    const current = makeProject({
      slug: "automation",
      title: "Automation",
      tags: [
        "Process Automation",
        "Tourism Operations",
      ],
      tools: ["UiPath"],
    });

    const unrelated = makeProject({
      slug: "portfolio",
      title: "Portfolio",
      tags: [
        "Professional Branding",
        "Content Management System",
      ],
      tools: [
        "Next.js",
        "TypeScript",
      ],
    });

    expect(
      getRelatedProjects(
        current,
        [current, unrelated],
      ),
    ).toEqual([]);
  });

  it("recognizes meaningful domain overlap even when labels are not exact", () => {
    const sunshine = makeProject({
      slug: "sunshine",
      title: "Sunshine Automation",
      tags: [
        "Tourism Operations",
        "Booking Reconciliation",
      ],
      tools: ["UiPath"],
    });

    const tuniculture = makeProject({
      slug: "tuniculture",
      title: "TuniCulture",
      tags: [
        "Digital Tourism",
        "Excursion Booking",
      ],
      tools: ["Firebase"],
    });

    expect(
      getRelatedProjects(
        sunshine,
        [sunshine, tuniculture],
      ).map((project) => project.slug),
    ).toEqual([
      "tuniculture",
    ]);
  });

  it("ranks a shared business topic above a tool-only relationship", () => {
    const current = makeProject({
      slug: "customer-platform",
      title: "Customer Platform",
      tags: ["Customer Journey"],
      tools: ["Angular"],
    });

    const businessMatch = makeProject({
      slug: "business-match",
      title: "Business Match",
      tags: ["Customer Journey"],
      projectsPageOrder: 2,
    });

    const toolMatch = makeProject({
      slug: "tool-match",
      title: "Tool Match",
      tools: ["Angular"],
      projectsPageOrder: 1,
    });

    expect(
      getRelatedProjects(
        current,
        [
          current,
          toolMatch,
          businessMatch,
        ],
      ).map((project) => project.slug),
    ).toEqual([
      "business-match",
      "tool-match",
    ]);

    expect(
      scoreProjectRelation(
        current,
        businessMatch,
      ),
    ).toBeGreaterThan(
      scoreProjectRelation(
        current,
        toolMatch,
      ),
    );
  });

  it("uses project display order as a deterministic tie-breaker", () => {
    const current = makeProject({
      slug: "current",
      title: "Current",
      tools: ["Angular"],
    });

    const second = makeProject({
      slug: "second",
      title: "Second",
      tools: ["Angular"],
      projectsPageOrder: 2,
    });

    const first = makeProject({
      slug: "first",
      title: "First",
      tools: ["Angular"],
      projectsPageOrder: 1,
    });

    expect(
      getRelatedProjects(
        current,
        [
          current,
          second,
          first,
        ],
      ).map((project) => project.slug),
    ).toEqual([
      "first",
      "second",
    ]);
  });

  it("never returns more than three recommendations", () => {
    const current = makeProject({
      slug: "current",
      title: "Current",
      tools: ["Angular"],
    });

    const candidates = [
      1,
      2,
      3,
      4,
    ].map((order) =>
      makeProject({
        slug: `candidate-${order}`,
        title: `Candidate ${order}`,
        tools: ["Angular"],
        projectsPageOrder: order,
      }),
    );

    expect(
      getRelatedProjects(
        current,
        [
          current,
          ...candidates,
        ],
      ).map((project) => project.slug),
    ).toEqual([
      "candidate-1",
      "candidate-2",
      "candidate-3",
    ]);
  });
});
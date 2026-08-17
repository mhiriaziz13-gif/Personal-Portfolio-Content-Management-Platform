import { describe, expect, it } from "vitest";

import type { ProjectContent } from "@/lib/cms-types";
import { getRelatedProjects } from "@/lib/related-projects";

const project = (
  slug: string,
  input: Partial<ProjectContent> = {},
): ProjectContent => ({
  id: slug,
  slug,
  title: slug,
  description: `${slug} description`,
  image: "/projects/project-placeholder-1.png",
  tags: [],
  tools: [],
   featured: false,
  status: "published",
  group: "",
  sortOrder: 0,
  sections: [],
  media: [],
  createdAt: "",
  updatedAt: "",
  ...input,
});

describe("related project selection", () => {
  it("excludes the current project and unrelated projects while ranking stronger evidence first", () => {
    const current = project("current", {
      tags: ["Commercial Analytics", "CRM"],
      tools: ["Power BI"],
      type: "Analytics",
    });
    const sharedEvidence = project("shared-evidence", {
      tags: ["CRM"],
      tools: ["Power BI"],
      type: "Automation",
      sortOrder: 20,
    });
    const typeOnly = project("type-only", {
      type: "Analytics",
      sortOrder: 0,
    });
    const unrelated = project("unrelated", {
      type: "Marketing",
      sortOrder: 1,
    });

    expect(
      getRelatedProjects(current, [
        current,
        typeOnly,
        unrelated,
        sharedEvidence,
      ]).map((candidate) => candidate.slug),
    ).toEqual([
      "shared-evidence",
      "type-only",
    ]);
  });

  it("matches case-insensitively, prioritizes tags over tools, breaks ties by order, and caps at three", () => {
    const current = project("current", {
      tags: ["BI"],
      tools: ["SQL"],
    });
    const candidates = [
      project("fourth", { tags: ["bi"], sortOrder: 4 }),
      project("second", { tools: ["sql"], sortOrder: 2 }),
      project("first", { tags: ["BI"], sortOrder: 1 }),
      project("third", { tools: ["SQL"], sortOrder: 3 }),
    ];

    expect(
      getRelatedProjects(current, candidates).map(
        (candidate) => candidate.slug,
      ),
    ).toEqual([
      "first",
      "fourth",
      "second",
    ]);
  });
});

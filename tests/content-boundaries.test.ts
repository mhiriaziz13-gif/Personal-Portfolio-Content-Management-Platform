import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { experiences, projects, resumes } from "@/constants/portfolio";
import type { ProjectContent } from "@/lib/cms-types";
import { projectSchema } from "@/lib/seo/schema";

const boundaryCopyIsExplicit = (value: string) =>
  /prototype/i.test(value)
  && /(two-person|two person|team)/i.test(value)
  && /chatbot/i.test(value)
  && /selected (application )?services/i.test(value)
  && /not presented as a production deployment/i.test(value)
  && /(not sole-authored|not presented .*sole-authored system)/i.test(value);

describe("public content boundaries", () => {
  it("keeps the VERMEG project and experience bounded to a team prototype", () => {
    const project = projects.find((item) => /VERMEG/i.test(item.title));
    const experience = experiences.find((item) => /^VERMEG/i.test(item.company));

    expect(project).toBeDefined();
    expect(experience).toBeDefined();
    expect(boundaryCopyIsExplicit(
      `${project?.title} ${project?.description}`,
    )).toBe(true);
    expect(boundaryCopyIsExplicit(
      `${experience?.role} ${experience?.points.join(" ")}`,
    )).toBe(true);
  });

  it("uses contributor attribution for the VERMEG team prototype schema", () => {
    const staticProject = projects.find((item) => /VERMEG/i.test(item.title));
    expect(staticProject).toBeDefined();

    const schema = projectSchema({
      ...staticProject!,
      id: "vermeg-project",
      slug: "vermeg-ai-ready-e-learning-platform",
      media: [],
      createdAt: "",
      updatedAt: "",
    } satisfies ProjectContent);

    expect(schema).toHaveProperty("contributor");
    expect(schema).not.toHaveProperty("creator");
    expect(schema).not.toHaveProperty("author");
  });

  it("keeps every advertised resume asset at a real public path", () => {
    for (const resume of resumes.filter((item) => item.available)) {
      for (const publicPath of [resume.pdfPath, resume.docxPath]) {
        const filePath = path.join(
          process.cwd(),
          "public",
          publicPath.replace(/^[/\\]+/, ""),
        );
        expect(existsSync(filePath), publicPath).toBe(true);

        const signature = readFileSync(filePath).subarray(0, 4).toString("ascii");
        expect(
          signature.startsWith("%PDF") || signature.startsWith("PK"),
          publicPath,
        ).toBe(true);
      }
    }
  });
});

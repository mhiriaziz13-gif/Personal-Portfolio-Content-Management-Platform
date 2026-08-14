import { describe, expect, it } from "vitest";

import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { ProjectContent } from "@/lib/cms-types";
import {
  PUBLIC_RESUME_VARIANTS,
  isPublicResume,
  resolvePublicResumeVariant,
} from "@/lib/resume-policy";
import { projectSchema } from "@/lib/seo/schema";

const vermegProject: ProjectContent = {
  id: "vermeg-project",
  slug: "vermeg-ai-ready-e-learning-platform",
  title: "VERMEG AI-Ready E-Learning Prototype",
  description:
    "Two-person internship prototype focused on chatbot functionality and selected application services. It was not presented as a production deployment or as a sole-authored system.",
  image: "/projects/project-3.png",
  tags: ["AI Prototype"],
  tools: ["Angular"],
  status: "published",
  media: [],
  createdAt: "",
  updatedAt: "",
};

describe("public content boundaries", () => {
  it("uses contributor attribution for the VERMEG team prototype schema", () => {
    const schema = projectSchema(vermegProject);

    expect(schema).toHaveProperty("contributor");
    expect(schema).not.toHaveProperty("creator");
    expect(schema).not.toHaveProperty("author");
  });

  it("keeps the emergency fallback current without replaying CMS records", () => {
    const serialized = JSON.stringify(fallbackPortfolioContent);

    expect(fallbackPortfolioContent.profile.availability).toBe(
      "Open to selected freelance projects and building toward international full-time opportunities from 2027.",
    );
    expect(fallbackPortfolioContent.profile.shortProfile).toContain(
      "Digital Transformation Project Manager at El Mouradi Hotels",
    );
    expect(fallbackPortfolioContent.profile.about).toContain(
      "Previously, at Sunshine Holiday Group",
    );
    expect(serialized).not.toMatch(
      /(?:October|Oct\.?)\s+2027|Summer\s+2027/i,
    );
    expect(serialized).not.toMatch(
      /master-multi-agent-llm-project|Master Multi-Agent LLM Project/i,
    );
    for (const records of [
      fallbackPortfolioContent.projects,
      fallbackPortfolioContent.experience,
      fallbackPortfolioContent.education,
      fallbackPortfolioContent.resumes,
    ]) {
      expect(records).toEqual([]);
    }
  });

  it("allows only unambiguous EN/FR/IT resume variants", () => {
    expect(PUBLIC_RESUME_VARIANTS).toEqual([
      "english",
      "french",
      "italian",
    ]);
    expect(resolvePublicResumeVariant({ variant: "english-cv" })).toBe(
      "english",
    );
    expect(resolvePublicResumeVariant({ label: "CV français" })).toBe(
      "french",
    );
    expect(resolvePublicResumeVariant({ title: "Italian CV" })).toBe(
      "italian",
    );
    expect(isPublicResume({ variant: "italian-cv" })).toBe(false);
    expect(
      isPublicResume({ variant: "italian-cv", pdfPath: "/cv/italian.pdf" }),
    ).toBe(true);
    for (const resume of [
      { variant: "ats-cv", label: "English CV" },
      { variant: "canadian-cv" },
      { variant: "master-cv" },
      { variant: "english-cv", pdfPath: "/cv/candidate_ATS.pdf" },
      { variant: "resume" },
    ]) {
      expect(resolvePublicResumeVariant(resume)).toBeNull();
    }
  });
});

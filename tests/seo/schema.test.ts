import { describe, expect, it } from "vitest";

import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { ProjectContent } from "@/lib/cms-types";
import {
  personSchema,
  profilePageSchema,
  projectSchema,
  websiteSchema,
} from "@/lib/seo/schema";

const project = (
  slug: string,
  title: string,
): ProjectContent => ({
  id: slug,
  slug,
  title,
  description: "Visible project summary.",
  image: "/projects/project-1.png",
  tags: ["Analytics"],
  tools: ["Excel"],
  status: "published",
  media: [],
  createdAt: "",
  updatedAt: "2026-07-29T00:00:00.000Z",
});

describe("public structured data", () => {
  it("connects global Person and WebSite entities", () => {
    const person = personSchema(fallbackPortfolioContent.profile);
    const website = websiteSchema();

    expect(person["@id"]).toBe(
      "https://ahmedaziz-portfolio.vercel.app/#person",
    );
    expect(website.publisher).toEqual({ "@id": person["@id"] });
  });

  it("identifies About—not Home—as the ProfilePage", () => {
    const profilePage = profilePageSchema(fallbackPortfolioContent.profile);

    expect(profilePage.url).toBe(
      "https://ahmedaziz-portfolio.vercel.app/about",
    );
    expect(profilePage.mainEntity).toEqual({
      "@id": "https://ahmedaziz-portfolio.vercel.app/#person",
    });
  });

  it("keeps the VERMEG prototype attribution contribution-only", () => {
    const schema = projectSchema(
      project(
        "ai-ready-elearning-platform",
        "VERMEG AI-Ready E-Learning Prototype",
      ),
    );

    expect(schema).toHaveProperty("contributor");
    expect(schema).not.toHaveProperty("creator");
    expect(schema).not.toHaveProperty("author");
    expect(schema.description).toBe("Visible project summary.");
  });
});

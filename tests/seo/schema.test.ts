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
  tags: string[] = ["Analytics"],
): ProjectContent => ({
  id: slug,
  slug,
  title,
  description: "Visible project summary.",
  image: "/projects/project-1.png",
  tags,
  tools: ["Excel"],
  status: "published",
  media: [],
  createdAt: "",
  updatedAt: "2026-07-29T00:00:00.000Z",
});
  it("uses contribution-only attribution for projects tagged as Team Project", () => {
    const schema = projectSchema(
      project(
        "university-chatbot-student-services",
        "University Chatbot for Student Services — IHEC Hackathon",
        ["Chatbot Development", "Team Project"],
      ),
    );

    expect(schema).toHaveProperty("contributor");
    expect(schema).not.toHaveProperty("creator");
    expect(schema).not.toHaveProperty("author");
  });

  it("normalizes Team Project tags before evaluating attribution", () => {
    const schema = projectSchema(
      project(
        "normalized-team-project",
        "Normalized Team Project",
        ["  TEAM PROJECT  "],
      ),
    );

    expect(schema).toHaveProperty("contributor");
    expect(schema).not.toHaveProperty("creator");
    expect(schema).not.toHaveProperty("author");
  });

  it("keeps creator and author attribution for individual projects", () => {
    const schema = projectSchema(
      project(
        "chic-chac-digital-transformation",
        "Chic-Chac Digital Transformation",
        ["Digital Transformation"],
      ),
    );

    expect(schema).toHaveProperty("creator");
    expect(schema).toHaveProperty("author");
    expect(schema).not.toHaveProperty("contributor");
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
  it("keeps Person expertise factual and profile-driven", () => {
    const profile = fallbackPortfolioContent.profile;
    const person = personSchema(profile);

    expect(person).not.toHaveProperty("jobTitle");
    expect(person).not.toHaveProperty("alumniOf");

    expect(person.knowsAbout).toEqual(
      profile.aboutFocus,
    );

    expect(person.sameAs).toEqual([
      profile.linkedIn,
      profile.github,
    ]);
  });
});

import { describe, expect, it } from "vitest";

import type { SkillCategory } from "@/constants/portfolio";
import type { ProjectContent } from "@/lib/cms-types";
import { getProjectsForExpertise } from "@/lib/expertise-projects";

const makeProject = ({
  slug,
  title,
  tags = [],
  tools = [],
  type = "",
  projectsPageOrder,
}: {
  slug: string;
  title: string;
  tags?: string[];
  tools?: string[];
  type?: string;
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
  projectsPageOrder,
  media: [],
  createdAt:
    "2026-01-01T00:00:00.000Z",
  updatedAt:
    "2026-01-01T00:00:00.000Z",
});

describe("expertise project recommendations", () => {
  it("matches expertise skills against project evidence case-insensitively", () => {
    const category: SkillCategory = {
      title:
        "Marketing & Customer Growth",
      skills: [
        "Customer Journey",
        "Local SEO",
      ],
    };

    const chicChac = makeProject({
      slug: "chic-chac",
      title: "Chic-Chac",
      tags: [
        "customer journey",
        "LOCAL SEO",
      ],
      projectsPageOrder: 1,
    });

    expect(
      getProjectsForExpertise(
        category,
        [chicChac],
      ).map(
        (project) =>
          project.slug,
      ),
    ).toEqual([
      "chic-chac",
    ]);
  });

  it("excludes projects without supporting expertise evidence", () => {
    const category: SkillCategory = {
      title:
        "Automation & Operations",
      skills: [
        "Process Automation",
        "UiPath",
      ],
    };

    const unrelated = makeProject({
      slug: "unrelated",
      title: "Unrelated",
      tags: [
        "Professional Branding",
      ],
      tools: [
        "Next.js",
      ],
    });

    expect(
      getProjectsForExpertise(
        category,
        [unrelated],
      ),
    ).toEqual([]);
  });

  it("ranks projects by matching evidence then by project display order", () => {
    const category: SkillCategory = {
      title:
        "Automation & Operations",
      skills: [
        "Process Automation",
        "UiPath",
        "RAG",
        "Ollama",
        "Booking Reconciliation",
      ],
    };

    const sunshine = makeProject({
      slug: "sunshine",
      title: "Sunshine",
      tags: [
        "Process Automation",
        "Booking Reconciliation",
      ],
      tools: [
        "UiPath",
      ],
      projectsPageOrder: 1,
    });

    const skillHub = makeProject({
      slug: "skillhub",
      title: "SkillHub",
      tools: [
        "RAG",
        "Ollama",
      ],
      projectsPageOrder: 3,
    });

    const chatbot = makeProject({
      slug: "chatbot",
      title: "Chatbot",
      tools: [
        "RAG",
        "Ollama",
      ],
      projectsPageOrder: 6,
    });

    expect(
      getProjectsForExpertise(
        category,
        [
          chatbot,
          skillHub,
          sunshine,
        ],
      ).map(
        (project) =>
          project.slug,
      ),
    ).toEqual([
      "sunshine",
      "skillhub",
      "chatbot",
    ]);
  });

  it("caps recommendations at three projects", () => {
    const category: SkillCategory = {
      title:
        "Technical Stack",
      skills: [
        "Angular",
      ],
    };

    const projects = [
      1,
      2,
      3,
      4,
    ].map(
      (order) =>
        makeProject({
          slug:
            `project-${order}`,
          title:
            `Project ${order}`,
          tools: [
            "Angular",
          ],
          projectsPageOrder:
            order,
        }),
    );

    expect(
      getProjectsForExpertise(
        category,
        projects,
      ).map(
        (project) =>
          project.slug,
      ),
    ).toEqual([
      "project-1",
      "project-2",
      "project-3",
    ]);
  });
  it("discovers a completely new future project from adjacent business metadata", () => {
    const category: SkillCategory = {
      title:
        "Data & Business Intelligence",
      skills: [
        "Commercial Analytics",
        "KPI Analysis",
        "Business Intelligence",
      ],
    };

    const futureProject = makeProject({
      slug:
        "future-revenue-intelligence-dashboard",
      title:
        "Revenue Intelligence Dashboard",
      type:
        "Business Analytics · Revenue Intelligence",
      tags: [
        "Revenue Analytics",
        "KPI Dashboard",
        "Commercial Performance",
      ],
      tools: [
        "SQL",
      ],
      projectsPageOrder: 9,
    });

    expect(
      getProjectsForExpertise(
        category,
        [futureProject],
      ).map(
        (project) =>
          project.slug,
      ),
    ).toEqual([
      "future-revenue-intelligence-dashboard",
    ]);
  });

  it("does not recommend a project from generic noisy vocabulary alone", () => {
    const category: SkillCategory = {
      title:
        "Automation & Operations",
      skills: [
        "Platform Management",
        "Process Automation",
      ],
    };

    const genericProject = makeProject({
      slug:
        "generic-platform-project",
      title:
        "Generic Platform Project",
      type:
        "Platform Development",
      tags: [
        "Project Management",
      ],
    });

    expect(
      getProjectsForExpertise(
        category,
        [genericProject],
      ),
    ).toEqual([]);
  });

  it("normalizes punctuation and ecommerce spelling consistently", () => {
    const category: SkillCategory = {
      title:
        "E-commerce Analytics",
      skills: [
        "Customer Analytics",
      ],
    };

    const project = makeProject({
      slug:
        "commerce-project",
      title:
        "Commerce Project",
      tags: [
        "Ecommerce Analytics",
      ],
    });

    expect(
      getProjectsForExpertise(
        category,
        [project],
      ).map(
        (candidate) =>
          candidate.slug,
      ),
    ).toEqual([
      "commerce-project",
    ]);
  });
});
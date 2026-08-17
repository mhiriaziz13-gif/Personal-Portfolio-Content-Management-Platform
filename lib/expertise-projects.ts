import type { SkillCategory } from "@/constants/portfolio";
import type { ProjectContent } from "@/lib/cms-types";

const RELATED_PROJECT_LIMIT = 3;

const normalizeTerm = (value: string) =>
  value.trim().toLowerCase();

const projectOrder = (project: ProjectContent) =>
  project.projectsPageOrder ??
  project.sortOrder ??
  Number.MAX_SAFE_INTEGER;

export const getProjectsForExpertise = (
  category: SkillCategory,
  projects: ProjectContent[],
) => {
  const expertiseTerms = new Set(
    category.skills.map(normalizeTerm),
  );

  expertiseTerms.add(
    normalizeTerm(category.title),
  );

  return projects
    .map((project) => {
      const projectTerms = [
        ...project.tags,
        ...(project.tools ?? []),
        project.type ?? "",
      ].map(normalizeTerm);

      const score = projectTerms.filter(
        (term) =>
          expertiseTerms.has(term),
      ).length;

      return {
        project,
        score,
      };
    })
    .filter(
      ({ score }) =>
        score > 0,
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        projectOrder(left.project) -
          projectOrder(right.project) ||
        left.project.title.localeCompare(
          right.project.title,
        ),
    )
    .slice(
      0,
      RELATED_PROJECT_LIMIT,
    )
    .map(
      ({ project }) =>
        project,
    );
};
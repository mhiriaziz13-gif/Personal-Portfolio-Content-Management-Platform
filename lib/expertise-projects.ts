import type { SkillCategory } from "@/constants/portfolio";
import type { ProjectContent } from "@/lib/cms-types";
import {
  countSharedRecommendationDomainTokens,
  countSharedRecommendationValues,
  splitRecommendationTypeSegments,
} from "@/lib/recommendation-signals";
import { getSkillName } from "@/lib/skills";
const RELATED_PROJECT_LIMIT = 3;

const EXACT_TAG_WEIGHT = 6;
const EXACT_TYPE_SEGMENT_WEIGHT = 4;
const EXACT_TOOL_WEIGHT = 3;
const DOMAIN_TOKEN_WEIGHT = 1;

const MIN_EXPERTISE_SCORE = 2;
const MIN_DOMAIN_TOKEN_MATCHES_WITHOUT_STRONG_SIGNAL = 2;

const expertiseTerms = (
  category: SkillCategory,
) => [
  category.title,
  ...category.skills.map(getSkillName),
];

const projectDomainValues = (
  project: ProjectContent,
) => [
  project.type ?? "",
  ...project.tags,
];

export const scoreProjectForExpertise = (
  category: SkillCategory,
  project: ProjectContent,
) => {
  const terms = expertiseTerms(category);

  const sharedTags =
    countSharedRecommendationValues(
      terms,
      project.tags,
    );

  const sharedTools =
    countSharedRecommendationValues(
      terms,
      project.tools ?? [],
    );

  const sharedTypeSegments =
    countSharedRecommendationValues(
      terms,
      splitRecommendationTypeSegments(
        project.type ?? "",
      ),
    );

  const sharedDomainTokens =
    countSharedRecommendationDomainTokens(
      terms,
      projectDomainValues(project),
    );

  const hasStrongSignal =
    sharedTags > 0 ||
    sharedTools > 0 ||
    sharedTypeSegments > 0;

  const score =
    sharedTags * EXACT_TAG_WEIGHT +
    sharedTypeSegments * EXACT_TYPE_SEGMENT_WEIGHT +
    sharedTools * EXACT_TOOL_WEIGHT +
    sharedDomainTokens * DOMAIN_TOKEN_WEIGHT;

  return {
    score,
    qualifies:
      score >= MIN_EXPERTISE_SCORE &&
      (
        hasStrongSignal ||
        sharedDomainTokens >=
          MIN_DOMAIN_TOKEN_MATCHES_WITHOUT_STRONG_SIGNAL
      ),
  };
};

const projectOrder = (project: ProjectContent) =>
  project.projectsPageOrder ??
  project.sortOrder ??
  Number.MAX_SAFE_INTEGER;

export const getProjectsForExpertise = (
  category: SkillCategory,
  projects: ProjectContent[],
) =>
  projects
    .map((project) => ({
      project,
      ...scoreProjectForExpertise(
        category,
        project,
      ),
    }))
    .filter(
      ({ qualifies }) =>
        qualifies,
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
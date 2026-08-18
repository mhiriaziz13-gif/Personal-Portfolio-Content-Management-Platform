import type { ProjectContent } from "@/lib/cms-types";
import {
  countSharedRecommendationDomainTokens,
  countSharedRecommendationValues,
  splitRecommendationTypeSegments,
} from "@/lib/recommendation-signals";

const RELATED_PROJECT_LIMIT = 3;
const MIN_RELATED_SCORE = 2;

const EXACT_TAG_WEIGHT = 6;
const EXACT_TYPE_SEGMENT_WEIGHT = 4;
const EXACT_TOOL_WEIGHT = 2;
const DOMAIN_TOKEN_WEIGHT = 1;

const typeSegments = (project: ProjectContent) =>
  splitRecommendationTypeSegments(
    project.type ?? "",
  );

const countSharedDomainTokens = (
  current: ProjectContent,
  candidate: ProjectContent,
) =>
  countSharedRecommendationDomainTokens(
    [
      current.type ?? "",
      ...current.tags,
    ],
    [
      candidate.type ?? "",
      ...candidate.tags,
    ],
  );

export const scoreProjectRelation = (
  current: ProjectContent,
  candidate: ProjectContent,
) => {
  const sharedTags = countSharedRecommendationValues(
    current.tags,
    candidate.tags,
  );

  const sharedTools = countSharedRecommendationValues(
    current.tools ?? [],
    candidate.tools ?? [],
  );

  const sharedTypeSegments = countSharedRecommendationValues(
    typeSegments(current),
    typeSegments(candidate),
  );

  const sharedDomainTokens =
    countSharedDomainTokens(
      current,
      candidate,
    );

  return (
    sharedTags * EXACT_TAG_WEIGHT +
    sharedTypeSegments *
      EXACT_TYPE_SEGMENT_WEIGHT +
    sharedTools * EXACT_TOOL_WEIGHT +
    sharedDomainTokens * DOMAIN_TOKEN_WEIGHT
  );
};

const projectOrder = (project: ProjectContent) =>
  project.projectsPageOrder ??
  project.sortOrder ??
  Number.MAX_SAFE_INTEGER;

export const getRelatedProjects = (
  current: ProjectContent,
  projects: ProjectContent[],
) =>
  projects
    .filter(
      (candidate) =>
        candidate.slug !== current.slug,
    )
    .map((candidate) => ({
      candidate,
      score: scoreProjectRelation(
        current,
        candidate,
      ),
    }))
    .filter(
      ({ score }) =>
        score >= MIN_RELATED_SCORE,
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        projectOrder(left.candidate) -
          projectOrder(right.candidate) ||
        left.candidate.title.localeCompare(
          right.candidate.title,
        ),
    )
    .slice(0, RELATED_PROJECT_LIMIT)
    .map(({ candidate }) => candidate);
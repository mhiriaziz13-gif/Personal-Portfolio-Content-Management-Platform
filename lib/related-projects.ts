import type { ProjectContent } from "@/lib/cms-types";

const RELATED_PROJECT_LIMIT = 3;
const MIN_RELATED_SCORE = 2;

const EXACT_TAG_WEIGHT = 6;
const EXACT_TYPE_SEGMENT_WEIGHT = 4;
const EXACT_TOOL_WEIGHT = 2;
const DOMAIN_TOKEN_WEIGHT = 1;

const DOMAIN_TOKEN_STOP_WORDS = new Set([
  "application",
  "client",
  "data",
  "development",
  "freelance",
  "full",
  "independent",
  "internship",
  "management",
  "platform",
  "professional",
  "project",
  "projects",
  "prototype",
  "services",
  "stack",
  "system",
  "systems",
  "team",
  "university",
]);

const normalizeValue = (value: string) =>
  value.trim().toLowerCase();

const normalizedValues = (values: string[]) =>
  new Set(
    values
      .map(normalizeValue)
      .filter(Boolean),
  );

const countSharedValues = (
  left: string[],
  right: string[],
) => {
  const leftValues = normalizedValues(left);
  const rightValues = normalizedValues(right);

  let shared = 0;

  for (const value of rightValues) {
    if (leftValues.has(value)) {
      shared += 1;
    }
  }

  return shared;
};

const typeSegments = (project: ProjectContent) =>
  project.type
    ? project.type
        .split("·")
        .map(normalizeValue)
        .filter(Boolean)
    : [];

const domainTokens = (project: ProjectContent) => {
  const values = [
    project.type ?? "",
    ...project.tags,
  ];

  const tokens = values.flatMap((value) =>
    normalizeValue(value).split(/[^a-z0-9]+/),
  );

  return new Set(
    tokens.filter(
      (token) =>
        token.length >= 4 &&
        !DOMAIN_TOKEN_STOP_WORDS.has(token),
    ),
  );
};

const countSharedDomainTokens = (
  current: ProjectContent,
  candidate: ProjectContent,
) => {
  const currentTokens = domainTokens(current);
  const candidateTokens = domainTokens(candidate);

  let shared = 0;

  for (const token of candidateTokens) {
    if (currentTokens.has(token)) {
      shared += 1;
    }
  }

  return shared;
};

export const scoreProjectRelation = (
  current: ProjectContent,
  candidate: ProjectContent,
) => {
  const sharedTags = countSharedValues(
    current.tags,
    candidate.tags,
  );

  const sharedTools = countSharedValues(
    current.tools ?? [],
    candidate.tools ?? [],
  );

  const sharedTypeSegments = countSharedValues(
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
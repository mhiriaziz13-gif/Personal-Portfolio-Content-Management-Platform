import type { ProjectContent } from "@/lib/cms-types";

export const getRelatedProjects = (
  current: ProjectContent,
  projects: ProjectContent[],
) => {
  const currentTerms = new Set(
    [...current.tags, ...(current.tools ?? [])].map((term) =>
      term.toLowerCase(),
    ),
  );

  return projects
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => {
      const candidateTerms = [
        ...candidate.tags,
        ...(candidate.tools ?? []),
      ].map((term) => term.toLowerCase());
      const sharedTerms = candidateTerms.filter((term) =>
        currentTerms.has(term),
      ).length;
      const sameType = Boolean(
        current.type && candidate.type === current.type,
      );
      return { candidate, score: sharedTerms * 2 + Number(sameType) };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.candidate.sortOrder ?? 0) -
          (right.candidate.sortOrder ?? 0),
    )
    .slice(0, 3)
    .map(({ candidate }) => candidate);
};

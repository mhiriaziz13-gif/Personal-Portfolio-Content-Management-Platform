export type ProjectSectionLike = {
  body?: unknown;
  bullets?: unknown;
  items?: unknown;
  media?: unknown;
  is_visible?: unknown;
  is_archived?: unknown;
  isVisible?: unknown;
};

export type ProjectLike = {
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  description?: unknown;
  seo_title?: unknown;
  seo_description?: unknown;
  open_graph_image?: unknown;
  cover_image_url?: unknown;
  status?: unknown;
  published?: unknown;
  github_url?: unknown;
  linkedin_url?: unknown;
  demo_url?: unknown;
};

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasNonEmptyList = (value: unknown) =>
  Array.isArray(value)
  && value.some(hasText);

const hasMeaningfulItems = (value: unknown) =>
  Array.isArray(value)
  && value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return hasText(record.value) || hasText(record.description);
  });

const hasMeaningfulMedia = (value: unknown) =>
  Array.isArray(value)
  && value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return hasText(record.mediaUrl)
      || hasText(record.media_url)
      || hasText(record.src)
      || hasText(record.url);
  });

const hasValidOptionalUrl = (value: unknown) => {
  if (!hasText(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const hasMeaningfulProjectSection = (section: ProjectSectionLike) =>
  hasText(section.body)
  || hasNonEmptyList(section.bullets)
  || hasMeaningfulItems(section.items)
  || hasMeaningfulMedia(section.media);

export const isVisibleProjectSection = (section: ProjectSectionLike) =>
  section.is_archived !== true
  && section.is_visible !== false
  && section.isVisible !== false;

export type ProjectCompleteness = {
  publishable: boolean;
  blockingIssues: string[];
  warnings: string[];
};

export const getProjectCompleteness = (
  project: ProjectLike,
  sections: ProjectSectionLike[] = [],
): ProjectCompleteness => {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const visibleSections = sections.filter(isVisibleProjectSection);

  if (!hasText(project.title)) blockingIssues.push("Add a project title.");
  if (!hasText(project.slug)) blockingIssues.push("Add a project slug.");
  if (!hasText(project.summary)) blockingIssues.push("Add a project summary.");
  if (!hasText(project.status)) blockingIssues.push("Choose a project status.");
  if (
    (project.published === true && project.status !== "published")
    || (project.status === "published" && project.published !== true)
  ) {
    blockingIssues.push(
      "Use both status=published and published=true for a published project.",
    );
  }
  if (visibleSections.some((section) => !hasMeaningfulProjectSection(section))) {
    blockingIssues.push(
      "Hide, archive, or add content to every visible case-study section.",
    );
  }
  if (!visibleSections.some(hasMeaningfulProjectSection)) {
    blockingIssues.push(
      "Add at least one meaningful visible case-study section as evidence.",
    );
  }
  if (
    !hasValidOptionalUrl(project.github_url)
    || !hasValidOptionalUrl(project.linkedin_url)
    || !hasValidOptionalUrl(project.demo_url)
  ) {
    blockingIssues.push("Fix invalid project CTA URLs.");
  }

  if (!hasText(project.seo_title)) warnings.push("Add a project SEO title.");
  if (!hasText(project.seo_description)) {
    warnings.push("Add a project SEO description.");
  }
  if (!hasText(project.open_graph_image)) {
    warnings.push("Add a project social preview image.");
  }
  if (!hasText(project.cover_image_url)) {
    warnings.push("Add a project cover image.");
  }

  return {
    publishable: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
};

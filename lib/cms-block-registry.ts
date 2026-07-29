/**
 * The single source of truth for blocks offered by the CMS and rendered on the
 * public site. Keep this module framework-free so it is safe to share between
 * Server Components, client-side admin forms, validation, and tests.
 */
export const cmsLayoutVariants = [
  "default",
  "compact",
  "split",
  "grid-2",
  "grid-3",
  "timeline",
  "metrics",
] as const;

export type CmsLayoutVariant = (typeof cmsLayoutVariants)[number];

export const cmsBlockTypes = [
  "hero",
  "rich_text",
  "split_content",
  "custom_cards",
  "stats",
  "featured_projects",
  "projects_grid",
  "experience_list",
  "skills",
  "certifications_grid",
  "volunteering",
  "media_gallery",
  "cta",
] as const;

export type CmsBlockType = (typeof cmsBlockTypes)[number];

export type CmsBlockDefinition = {
  label: string;
  description: string;
  example: string;
  variants: readonly CmsLayoutVariant[];
  usesItems: boolean;
};

export const cmsBlockRegistry: Record<CmsBlockType, CmsBlockDefinition> = {
  hero: {
    label: "Hero",
    description:
      "A concise page introduction with an optional subtitle and up to two calls to action.",
    example:
      "Title: Commercial analytics with operational context. Description: Two or three short profile lines.",
    variants: ["default", "compact", "split"],
    usesItems: false,
  },
  rich_text: {
    label: "Rich text",
    description:
      "Short readable paragraphs with optional supporting cards. Blank lines create separate paragraphs.",
    example:
      "Use two short paragraphs for context, then add cards only when they make the information easier to scan.",
    variants: ["default", "compact", "split"],
    usesItems: true,
  },
  split_content: {
    label: "Split content",
    description:
      "Two complementary content areas, such as context beside an image or a short list of facts.",
    example:
      "Left: what the work covered. Right: one image or two concise supporting points.",
    variants: ["default", "compact", "split"],
    usesItems: true,
  },
  custom_cards: {
    label: "Custom cards",
    description:
      "A controlled set of linked or unlinked cards with optional media.",
    example:
      "One card per service or focus area, each with a short title and one-sentence description.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: true,
  },
  stats: {
    label: "Stats",
    description:
      "A small set of verified facts. Only use numbers that can be supported by portfolio evidence.",
    example:
      "Label: Supported hotels. Value: 40. Description: Scope of the validated RPA workflow.",
    variants: ["default", "compact", "grid-2", "grid-3", "metrics"],
    usesItems: true,
  },
  featured_projects: {
    label: "Featured projects",
    description:
      "Published projects marked as featured, ordered by their homepage position.",
    example:
      "Use on Home to show the strongest two or three published case studies.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: false,
  },
  projects_grid: {
    label: "Projects grid",
    description:
      "All published projects in their CMS-controlled project-page order.",
    example:
      "Use on Projects with a short introduction and the default or three-column layout.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: false,
  },
  experience_list: {
    label: "Experience list",
    description:
      "Published work experience shown as a readable list or timeline.",
    example:
      "Use the timeline variant on Experience and compact when embedding a preview elsewhere.",
    variants: ["default", "compact", "timeline"],
    usesItems: false,
  },
  skills: {
    label: "Skills",
    description:
      "Published skills grouped by their owner-friendly category names.",
    example:
      "Use on Expertise; keep category names concise and avoid duplicate skills.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: false,
  },
  certifications_grid: {
    label: "Certifications grid",
    description:
      "Published certifications selected from the Certifications collection.",
    example:
      "Use a compact preview on About or the full grid on Certifications.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: false,
  },
  volunteering: {
    label: "Volunteering",
    description:
      "Published volunteer roles with optional linked certification details.",
    example:
      "Show the role, organisation, dates, a concise scope statement, and verified focus areas.",
    variants: ["default", "compact", "grid-2", "timeline"],
    usesItems: false,
  },
  media_gallery: {
    label: "Media gallery",
    description:
      "Accessible images with useful alt text and optional captions or links.",
    example:
      "Add one item per screenshot; describe what the screenshot demonstrates, not its filename.",
    variants: ["default", "compact", "grid-2", "grid-3"],
    usesItems: true,
  },
  cta: {
    label: "Call to action",
    description:
      "A short closing prompt with one primary and an optional secondary action.",
    example:
      "Title: Discuss an analytics need. Primary action: Contact. Secondary action: View resume.",
    variants: ["default", "compact", "split"],
    usesItems: false,
  },
};

export const cmsBlockOptions = cmsBlockTypes.map((value) => ({
  value,
  label: cmsBlockRegistry[value].label,
}));

export const isCmsBlockType = (value: unknown): value is CmsBlockType =>
  typeof value === "string" &&
  (cmsBlockTypes as readonly string[]).includes(value);

export const isCmsLayoutVariant = (
  value: unknown,
): value is CmsLayoutVariant =>
  typeof value === "string" &&
  (cmsLayoutVariants as readonly string[]).includes(value);

export const variantsForBlock = (
  blockType: CmsBlockType,
): readonly CmsLayoutVariant[] => cmsBlockRegistry[blockType].variants;

export const normalizeCmsBlockType = (value: unknown): CmsBlockType =>
  isCmsBlockType(value) ? value : "rich_text";

export const normalizeCmsLayoutVariant = (
  blockType: CmsBlockType,
  value: unknown,
): CmsLayoutVariant => {
  const candidate = isCmsLayoutVariant(value) ? value : "default";
  return variantsForBlock(blockType).includes(candidate)
    ? candidate
    : "default";
};

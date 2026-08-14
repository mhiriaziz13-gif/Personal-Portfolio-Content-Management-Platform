export const PUBLIC_RESUME_VARIANTS = [
  "english",
  "french",
  "italian",
] as const;

export type PublicResumeVariant = (typeof PUBLIC_RESUME_VARIANTS)[number];

type ResumeDescriptor = {
  variant?: unknown;
  title?: unknown;
  label?: unknown;
  pdfPath?: unknown;
  docxPath?: unknown;
  pdf_url?: unknown;
  docx_url?: unknown;
};

const variantAliases: Record<PublicResumeVariant, readonly string[]> = {
  english: ["english", "english-cv", "english-professional-cv"],
  french: [
    "french",
    "french-cv",
    "french-professional-cv",
    "francais",
    "francais-cv",
    "francais-professional-cv",
  ],
  italian: [
    "italian",
    "italian-cv",
    "italian-professional-cv",
    "italiano",
    "italiano-cv",
    "italien",
    "italien-cv",
  ],
};

const languageTokens: Record<PublicResumeVariant, readonly string[]> = {
  english: ["english", "anglais"],
  french: ["french", "francais"],
  italian: ["italian", "italiano", "italien"],
};

const nonPublicMarkers = new Set([
  "ats",
  "canada",
  "canadian",
  "canadien",
  "canadienne",
  "master",
  "masters",
  "mastere",
]);

const tokenize = (value: unknown) =>
  typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
    : [];

const normalizeIdentifier = (value: unknown) => tokenize(value).join("-");

export const resolvePublicResumeVariant = (
  resume: ResumeDescriptor,
): PublicResumeVariant | null => {
  const identityTokens = [
    ...tokenize(resume.variant),
    ...tokenize(resume.title),
    ...tokenize(resume.label),
  ];
  const assetTokens = [
    ...tokenize(resume.pdfPath),
    ...tokenize(resume.docxPath),
    ...tokenize(resume.pdf_url),
    ...tokenize(resume.docx_url),
  ];

  if (
    [...identityTokens, ...assetTokens].some((token) =>
      nonPublicMarkers.has(token),
    )
  ) {
    return null;
  }

  const variantIdentifier = normalizeIdentifier(resume.variant);
  const matches = variantIdentifier
    ? PUBLIC_RESUME_VARIANTS.filter((variant) =>
        variantAliases[variant].includes(variantIdentifier),
      )
    : PUBLIC_RESUME_VARIANTS.filter((variant) =>
        languageTokens[variant].some((token) =>
          identityTokens.includes(token),
        ),
      );

  return matches.length === 1 ? matches[0] : null;
};

const hasResumeAsset = (resume: ResumeDescriptor) =>
  [resume.pdfPath, resume.docxPath, resume.pdf_url, resume.docx_url].some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

export const isPublicResume = (resume: ResumeDescriptor) => {
  const variant = resolvePublicResumeVariant(resume);
  return variant !== null && (variant !== "italian" || hasResumeAsset(resume));
};

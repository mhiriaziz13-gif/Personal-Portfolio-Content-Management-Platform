const DOMAIN_TOKEN_STOP_WORDS = new Set([
  "and",
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
  "service",
  "services",
  "solution",
  "solutions",
  "stack",
  "system",
  "systems",
  "team",
  "university",
]);

const MEANINGFUL_SHORT_DOMAIN_TOKENS = new Set([
  "ai",
  "bi",
  "crm",
  "kpi",
  "rag",
  "seo",
]);

const canonicalDomainToken = (token: string) => {
  switch (token) {
    case "analysis":
    case "analytics":
    case "analytical":
    case "analyse":
    case "analyze":
      return "analytic";

    case "automate":
    case "automated":
    case "automating":
    case "automation":
      return "automation";

    case "report":
    case "reports":
    case "reporting":
      return "report";

    case "customer":
    case "customers":
      return "customer";

    case "dashboard":
    case "dashboards":
      return "dashboard";

    default:
      return token;
  }
};

export const normalizeRecommendationTerm = (
  value: string,
) =>
  value
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[‐-‒–—−]/g,
      "-",
    )
    .replace(
      /&/g,
      " and ",
    )
    .toLowerCase()
    .replace(
      /\be[\s-]?commerce\b/g,
      "ecommerce",
    )
    .replace(
      /[^a-z0-9+#.]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );

export const normalizedRecommendationValues = (
  values: string[],
) =>
  new Set(
    values
      .map(
        normalizeRecommendationTerm,
      )
      .filter(Boolean),
  );

export const countSharedRecommendationValues = (
  left: string[],
  right: string[],
) => {
  const leftValues =
    normalizedRecommendationValues(left);

  const rightValues =
    normalizedRecommendationValues(right);

  let shared = 0;

  for (const value of rightValues) {
    if (leftValues.has(value)) {
      shared += 1;
    }
  }

  return shared;
};

export const splitRecommendationTypeSegments = (
  value: string,
) =>
  value
    .split(
      /[·|/]+/,
    )
    .map(
      normalizeRecommendationTerm,
    )
    .filter(Boolean);

export const recommendationDomainTokens = (
  values: string[],
) => {
  const tokens = values.flatMap(
    (value) =>
      normalizeRecommendationTerm(
        value,
      ).split(/\s+/),
  );

  return new Set(
    tokens
      .map(
        canonicalDomainToken,
      )
      .filter(
        (token) =>
          Boolean(token) &&
          !DOMAIN_TOKEN_STOP_WORDS.has(
            token,
          ) &&
          (
            token.length >= 4 ||
            MEANINGFUL_SHORT_DOMAIN_TOKENS.has(
              token,
            )
          ),
      ),
  );
};

export const countSharedRecommendationDomainTokens = (
  left: string[],
  right: string[],
) => {
  const leftTokens =
    recommendationDomainTokens(left);

  const rightTokens =
    recommendationDomainTokens(right);

  let shared = 0;

  for (const token of rightTokens) {
    if (leftTokens.has(token)) {
      shared += 1;
    }
  }

  return shared;
};
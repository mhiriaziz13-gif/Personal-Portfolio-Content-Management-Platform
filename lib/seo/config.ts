const FALLBACK_SITE_URL = "https://ahmedaziz-portfolio.vercel.app";
const FALLBACK_GITHUB_URL = "https://github.com/mhiriaziz13-gif";
const FALLBACK_LINKEDIN_URL = "https://linkedin.com/in/ahmed-aziz-mhiri";

const normalizeSiteUrl = (value: string | undefined) => {
  try {
    const url = new URL(value || FALLBACK_SITE_URL);
    if (
      url.protocol !== "https:" ||
      (url.hostname.endsWith(".vercel.app") &&
        url.hostname !== "ahmedaziz-portfolio.vercel.app")
    ) {
      return FALLBACK_SITE_URL;
    }
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
};

const normalizeProfileUrl = (
  value: string | undefined,
  fallback: string,
) => {
  try {
    const url = new URL(value?.trim() || fallback);
    return url.protocol === "https:"
      ? url.toString().replace(/\/$/, "")
      : fallback;
  } catch {
    return fallback;
  }
};

const githubUsername = process.env.NEXT_PUBLIC_GITHUB_USERNAME?.trim();
const configuredGithubUrl =
  process.env.NEXT_PUBLIC_GITHUB_PROFILE_URL ||
  (githubUsername ? `https://github.com/${githubUsername}` : undefined);

export const publicIdentity = {
  name: "Ahmed Aziz Mhiri",
  githubUrl: normalizeProfileUrl(configuredGithubUrl, FALLBACK_GITHUB_URL),
  linkedInUrl: normalizeProfileUrl(
    process.env.NEXT_PUBLIC_LINKEDIN_PROFILE_URL,
    FALLBACK_LINKEDIN_URL,
  ),
} as const;

export const siteSeo = {
  name: publicIdentity.name,
  siteName: `${publicIdentity.name} — Marketing & Commercial Analytics`,
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  locale: "en_US",
  titleTemplate: `%s | ${publicIdentity.name}`,
  description: `Portfolio of ${publicIdentity.name}, Marketing & Commercial Analyst and Digital Transformation Project Manager combining Business Intelligence, Big Data, AI, CRM automation and engineering for measurable business outcomes.`,
  creator: publicIdentity.name,
  socialImage: "/opengraph-image",
  sameAs: [publicIdentity.linkedInUrl, publicIdentity.githubUrl],
} as const;

export const isProductionDeployment = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

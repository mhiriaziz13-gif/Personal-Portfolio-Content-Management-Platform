import type { PageContent, PortfolioContent } from "@/lib/cms-types";

export type CmsPageRouteResolution =
  | {
      mode: "cms";
      page: PageContent;
    }
  | {
      mode: "legacy-fallback" | "not-found";
      page: null;
    };

type PageRegistrySnapshot = Pick<PortfolioContent, "delivery" | "pages">;

/**
 * Resolves a code-owned route against the CMS publication registry.
 *
 * A failed registry read may use the repository fallback so a transient CMS
 * outage does not take the portfolio offline. A successful read is
 * authoritative: missing or unpublished rows fail closed, while published
 * rows render only their controlled Page Builder sections.
 */
export const resolveCmsPageRoute = (
  content: PageRegistrySnapshot,
  pageKey: string,
): CmsPageRouteResolution => {
  if (content.delivery.pages === "failed") {
    return { mode: "legacy-fallback", page: null };
  }

  const page =
    content.pages.find(
      (candidate) =>
        candidate.pageKey === pageKey && candidate.isPublished,
    ) ?? null;

  return page
    ? { mode: "cms", page }
    : { mode: "not-found", page: null };
};

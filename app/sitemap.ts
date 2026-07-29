import type { MetadataRoute } from "next";

import { getPortfolioContent } from "@/lib/cms";
import { createSitemapEntries } from "@/lib/seo/discoverability";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return createSitemapEntries(await getPortfolioContent());
  } catch {
    console.warn(
      "Sitemap CMS read failed; omitting unconfirmed publication entries.",
    );
    return createSitemapEntries(null);
  }
}

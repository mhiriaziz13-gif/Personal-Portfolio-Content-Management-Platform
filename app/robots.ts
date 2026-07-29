import type { MetadataRoute } from "next";
import { isProductionDeployment } from "@/lib/seo/config";
import { absoluteUrl } from "@/lib/seo/urls";

export default function robots(): MetadataRoute.Robots {
  return isProductionDeployment
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/auth/"] }, sitemap: absoluteUrl("/sitemap.xml"), host: absoluteUrl("/") }
    : { rules: { userAgent: "*", disallow: "/" } };
}

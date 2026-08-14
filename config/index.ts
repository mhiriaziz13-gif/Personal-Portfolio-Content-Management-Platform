import type { Metadata } from "next";
import {
  isProductionDeployment,
  publicIdentity,
  siteSeo,
} from "@/lib/seo/config";
import { absoluteUrl } from "@/lib/seo/urls";

const bingSiteVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const verification: Metadata["verification"] = {
  ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
  ...(bingSiteVerification
    ? { other: { "msvalidate.01": bingSiteVerification } }
    : {}),
};

export const siteConfig: Metadata = {
  metadataBase: new URL(siteSeo.url),
  title: { default: siteSeo.siteName, template: siteSeo.titleTemplate },
  description: siteSeo.description,
  keywords: [
    "Ahmed Aziz Mhiri",
    "Marketing & Commercial Analytics",
    "Marketing & Commercial Analyst",
    "Business Intelligence",
    "Big Data Analytics",
    "Artificial Intelligence",
    "Digital Transformation",
    "Digital Transformation Project Manager",
    "CRM & Marketing Automation",
    "Customer Insights",
    "Process Automation",
  ],
  authors: {
    name: publicIdentity.name,
    url: publicIdentity.linkedInUrl,
  },
  creator: publicIdentity.name,
  publisher: publicIdentity.name,
  alternates: { canonical: absoluteUrl("/") },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  robots: {
    index: isProductionDeployment,
    follow: isProductionDeployment,
    nocache: !isProductionDeployment,
  },
  ...(googleSiteVerification || bingSiteVerification
    ? { verification }
    : {}),
  openGraph: {
    title: `${publicIdentity.name} | Marketing & Commercial Analytics`,
    description:
      "Marketing & Commercial Analytics powered by Business Intelligence, Big Data, AI, automation and engineering.",
    type: "website",
    url: absoluteUrl("/"),
    siteName: siteSeo.siteName,
    locale: siteSeo.locale,
    images: [
      {
        url: absoluteUrl(siteSeo.socialImage),
        width: 1200,
        height: 630,
        alt: siteSeo.siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteSeo.siteName,
    description: siteSeo.description,
    images: [absoluteUrl(siteSeo.socialImage)],
  },
} as const;

import { getPortfolioContent } from "@/lib/cms";
import {
  publicPageDefinitions,
  type PublicPageKey,
} from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 60;

const publicPagesByKey = new Map(
  publicPageDefinitions.map((definition) => [definition.pageKey, definition]),
);

export async function GET() {
  const content = await getPortfolioContent();
  const pages = content.pages
    .flatMap((page) => {
      const definition = publicPagesByKey.get(page.pageKey as PublicPageKey);
      if (!definition || definition.pageKey === "home") return [];
      return [
        `- [${page.title || definition.title}](${absoluteUrl(definition.path)}): ${
          page.seoDescription || definition.description
        }`,
      ];
    })
    .join("\n");
  const projects = content.projects
    .filter(
      (project) =>
        project.status === "published" &&
        project.description.trim(),
    )
    .map(
      (project) =>
        `- [${project.title}](${absoluteUrl(`/projects/${project.slug}`)}): ${project.description}`,
    )
    .join("\n");
  const profiles = [
    ["LinkedIn", content.profile.linkedIn],
    ["GitHub", content.profile.github],
  ]
    .filter((entry) => entry[1])
    .map(([label, url]) => `- [${label}](${url})`)
    .join("\n");

  const body = [
    "# Ahmed Aziz Mhiri",
    "",
    "> Data-Driven Marketing, Commercial Analytics and Business Intelligence portfolio focused on analytics, customer insight, process automation and digital growth.",
    "",
    "Ahmed Aziz Mhiri is based in Sousse, Tunisia. International full-time availability begins in October 2027; selected freelance projects are available now.",
    ...(pages ? ["", "## Primary pages", "", pages] : []),
    ...(projects ? ["", "## Selected projects", "", projects] : []),
    ...(profiles ? ["", "## Professional profiles", "", profiles] : []),
    "",
    "## Content notes",
    "",
    "Project descriptions are public-safe and may omit confidential operational data. This file is a supplementary, experimental discovery aid; it does not guarantee crawling, ranking or use by AI systems.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

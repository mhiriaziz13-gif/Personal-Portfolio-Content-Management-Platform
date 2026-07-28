export const revalidate = 60;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectViewTracker } from "@/components/analytics/project-view-tracker";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProjectSocialLinks } from "@/components/sub/project-social-links";
import { getPortfolioContent, getProjectBySlug } from "@/lib/cms";
import { hasMeaningfulProjectSection } from "@/lib/content-completeness";
import type {
  ProjectMediaContent,
  ProjectSectionContent,
} from "@/lib/cms-types";
import { getRelatedProjects } from "@/lib/related-projects";
import { createPageMetadata } from "@/lib/seo/metadata";
import { projectSchema } from "@/lib/seo/schema";
import { isHttpsUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return createPageMetadata({
      title: "Project not found",
      description: "This project is not available.",
      path: `/projects/${slug}`,
      noindex: true,
    });
  }

  return createPageMetadata({
    title: project.seoTitle || project.title,
    description: (project.seoDescription || project.description).slice(0, 160),
    path: `/projects/${project.slug}`,
    image: project.openGraphImage || project.image,
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const content = await getPortfolioContent();
  const related = getRelatedProjects(project, content.projects);
  const sections = (project.sections ?? []).filter(
    hasMeaningfulProjectSection,
  );
  const attachedMediaIds = new Set(
    sections.flatMap((section) => section.media.map((media) => media.id)),
  );
  const unattachedMedia = project.media.filter(
    (media) => !attachedMediaIds.has(media.id),
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen px-6 py-28"
    >
      <article className="relative z-[20] mx-auto flex w-full max-w-5xl flex-col gap-8">
        <JsonLd data={projectSchema(project)} />
        <ProjectViewTracker
          projectSlug={project.slug}
          projectTitle={project.title}
        />
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Projects", href: "/projects" },
            {
              name: project.title,
              href: `/projects/${project.slug}`,
            },
          ]}
        />
        <Link
          href="/projects"
          className="button-secondary inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          <span aria-hidden="true">←</span> Back to projects
        </Link>

        <header>
          <p className="Welcome-text mb-4 text-sm">Project</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300">
            {project.description}
          </p>
          <ProjectSocialLinks
            githubUrl={project.githubUrl}
            linkedinUrl={project.linkedinUrl}
            projectTitle={project.title}
            className="mt-5"
          />
        </header>

        <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-[#2A0E61] bg-[#08021c]/70 shadow-lg shadow-[#2A0E61]/20">
          <Image
            src={project.image}
            alt={`Cover image for ${project.title}`}
            fill
            sizes="(min-width: 1024px) 960px, 100vw"
            className="object-cover opacity-90"
            unoptimized={isHttpsUrl(project.image)}
            data-image-fallback="swap"
            data-fallback-src="/projects/project-1.png"
          />
        </div>

        {project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Project topics">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {sections.length > 0 && (
          <div className="grid gap-5">
            {sections.map((section) => (
              <CaseStudySection
                key={section.id ?? `${project.slug}-${section.title}`}
                section={section}
              />
            ))}
          </div>
        )}

        {unattachedMedia.length > 0 && (
          <section
            data-project-section
            className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6 shadow-xl shadow-[#2A0E61]/20 backdrop-blur-md"
          >
            <h2 className="text-2xl font-bold text-white">Project media</h2>
            <ProjectMediaGallery media={unattachedMedia} />
          </section>
        )}

        {related.length > 0 && (
          <section className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6">
            <h2 className="text-2xl font-bold text-white">Related work</h2>
            <div className="mt-4 flex flex-col gap-3">
              {related.map((item) => (
                <TrackedLink
                  key={item.slug}
                  href={`/projects/${item.slug}`}
                  analyticsEvent={{
                    event: "project_explore_click",
                    project_slug: item.slug,
                    project_title: item.title,
                    cta_location: "related_projects",
                  }}
                  className="action-link w-fit"
                >
                  View the {item.title} case study
                </TrackedLink>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/expertise"
                className="button-secondary rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Explore relevant expertise
              </Link>
              <Link
                href="/experience"
                className="button-secondary rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Review professional experience
              </Link>
              <TrackedLink
                href="/contact"
                analyticsEvent={{
                  event: "contact_cta_click",
                  cta_location: "project_page",
                  cta_label: "project_contact",
                }}
                className="button-primary rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              >
                Discuss a related opportunity
              </TrackedLink>
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

function CaseStudySection({
  section,
}: {
  section: ProjectSectionContent;
}) {
  return (
    <section
      data-project-section
      className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6 shadow-xl shadow-[#2A0E61]/20 backdrop-blur-md"
    >
      {section.title && (
        <h2 className="text-2xl font-bold text-white">{section.title}</h2>
      )}
      {section.body && (
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-300">
          {section.body}
        </p>
      )}
      {section.bullets.length > 0 && (
        <ul className="mt-4 ml-4 list-disc space-y-2 text-sm leading-6 text-gray-300">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {section.items.length > 0 && (
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          {section.items.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-white/10 bg-black/10 p-4"
            >
              {item.label && (
                <dt className="text-sm font-semibold text-cyan-100">
                  {item.label}
                </dt>
              )}
              {(item.value || item.description) && (
                <dd className="mt-2 text-sm leading-6 text-gray-300">
                  {item.value || item.description}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
      {section.media.length > 0 && (
        <ProjectMediaGallery media={section.media} />
      )}
    </section>
  );
}

function ProjectMediaGallery({ media }: { media: ProjectMediaContent[] }) {
  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      {media.map((item) => (
        <figure
          key={item.id}
          className="overflow-hidden rounded-lg border border-white/10 bg-[#08021c]/70"
        >
          {item.mediaType === "image" ? (
            <div className="relative aspect-video">
              <Image
                src={item.mediaUrl}
                alt={item.altText}
                fill
                sizes="(min-width: 768px) 460px, 100vw"
                className="object-cover"
                unoptimized={isHttpsUrl(item.mediaUrl)}
                data-image-fallback="swap"
                data-fallback-src="/projects/project-1.png"
              />
            </div>
          ) : item.mediaType === "video" ? (
            <video
              controls
              preload="metadata"
              aria-label={item.altText}
              className="aspect-video w-full"
            >
              <source src={item.mediaUrl} />
            </video>
          ) : (
            <Link
              href={item.mediaUrl}
              className="action-link m-5 inline-block"
              target="_blank"
              rel="noreferrer noopener"
            >
              {item.caption || item.altText}
            </Link>
          )}
          {item.caption && item.mediaType !== "document" && (
            <figcaption className="p-4 text-sm text-gray-300">
              {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

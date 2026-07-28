import { TrackedLink } from "@/components/analytics/tracked-link";
import { ProjectArtwork } from "@/components/sub/project-artwork";
import { ProjectSocialLinks } from "@/components/sub/project-social-links";

type ProjectCardProps = {
  src: string;
  title: string;
  description: string;
  tags: string[];
  href?: string;
  projectSlug?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  cardLocation: "homepage" | "projects_page" | "related_projects";
};

export const ProjectCard = ({
  src,
  title,
  description,
  tags,
  href,
  projectSlug,
  githubUrl,
  linkedinUrl,
  cardLocation,
}: ProjectCardProps) => {
  return (
    <article className="group relative overflow-hidden rounded-lg border border-[#2A0E61] bg-[#08021c]/70 shadow-lg shadow-[#2A0E61]/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:shadow-xl hover:shadow-cyan-500/10 focus-within:border-cyan-300 focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-cyan-300">
      {href && (
        <TrackedLink
          href={href}
          analyticsEvent={{
            event: "project_explore_click",
            project_slug: projectSlug || href.split("/").pop() || "unknown",
            project_title: title,
            cta_location: cardLocation,
          }}
          aria-label={`View project: ${title}`}
          className="absolute inset-0 z-10 rounded-lg focus:outline-none"
        />
      )}

      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-[#030014]">
        <ProjectArtwork src={src} title={title} />
      </div>

      <ProjectSocialLinks
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        projectTitle={title}
        className="relative min-h-14 justify-center border-b border-white/10 bg-[#08021c]/90 px-4 py-3"
      />

      <div className="relative flex h-full flex-col gap-4 p-5">
        <h3 className="text-xl font-semibold leading-tight text-white">
          {title}
        </h3>
        <p className="text-sm leading-7 text-gray-300">{description}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={`${title}-${tag}`}
              className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
            >
              {tag}
            </span>
          ))}
        </div>
        {href && (
          <span className="button-secondary mt-2 inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition group-hover:border-cyan-300/80 group-hover:text-white" aria-hidden="true">
            View details <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
        )}
      </div>
    </article>
  );
};

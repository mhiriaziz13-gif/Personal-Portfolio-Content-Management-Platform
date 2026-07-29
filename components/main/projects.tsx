import { ProjectCard } from "@/components/sub/project-card";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { CmsLayoutVariant } from "@/lib/cms-block-registry";
import type { ProjectContent } from "@/lib/cms-types";

export const Projects = ({
  projects = fallbackPortfolioContent.projects,
  cardLocation,
  title = "Projects",
  subtitle = "Selected work",
  variant = "default",
}: {
  projects?: ProjectContent[];
  cardLocation: "homepage" | "projects_page";
  title?: string;
  subtitle?: string;
  variant?: CmsLayoutVariant;
}) => {
  const visibleProjects = projects.filter(
    (project) => project.slug && project.title && project.description,
  );
  if (visibleProjects.length === 0) return null;
  const gridClass =
    variant === "grid-2"
      ? "md:grid-cols-2"
      : variant === "grid-3"
        ? "md:grid-cols-2 xl:grid-cols-3"
        : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <section
      id="projects"
      data-layout-variant={variant}
      className={`render-deferred mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 ${
        variant === "compact" ? "py-14" : "py-24"
      }`}
    >
      {subtitle && <p className="Welcome-text mb-4 text-sm">{subtitle}</p>}
      {title && (
        <h2
          className={`text-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 ${
            variant === "compact"
              ? "pb-8 text-3xl"
              : "pb-14 text-[40px]"
          }`}
        >
          {title}
        </h2>
      )}
      <div className={`grid h-full w-full gap-8 ${gridClass}`}>
        {visibleProjects.map((project) => (
          <ProjectCard
            key={project.slug || project.title}
            src={project.image}
            title={project.title}
            description={project.description}
            tags={project.tags}
            projectSlug={project.slug}
            githubUrl={project.githubUrl}
            linkedinUrl={project.linkedinUrl}
            cardLocation={cardLocation}
            href={project.slug ? `/projects/${project.slug}` : undefined}
          />
        ))}
      </div>
    </section>
  );
};

import { FaGithub, FaLinkedin } from "react-icons/fa";
import { TrackedLink } from "@/components/analytics/tracked-link";

type ProjectSocialLinksProps = {
  githubUrl?: string;
  linkedinUrl?: string;
  projectTitle: string;
  className?: string;
};

export const ProjectSocialLinks = ({
  githubUrl,
  linkedinUrl,
  projectTitle,
  className = "",
}: ProjectSocialLinksProps) => {
  if (!githubUrl && !linkedinUrl) return null;

  return (
    <div className={`z-20 flex items-center gap-3 ${className}`}>
      {githubUrl && (
        <TrackedLink
          href={githubUrl}
          analyticsEvent={{ event: "project_repository_click", project_title: projectTitle, cta_location: className.includes("border-b") ? "project_card" : "project_page" }}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${projectTitle} on GitHub`}
          title="View on GitHub"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-gray-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <FaGithub aria-hidden="true" />
        </TrackedLink>
      )}
      {linkedinUrl && (
        <TrackedLink
          href={linkedinUrl}
          analyticsEvent={{ event: "project_cta_click", project_title: projectTitle, cta_location: className.includes("border-b") ? "project_card" : "project_page" }}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${projectTitle} on LinkedIn`}
          title="View on LinkedIn"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-gray-300 transition hover:text-[#0A66C2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <FaLinkedin aria-hidden="true" />
        </TrackedLink>
      )}
    </div>
  );
};

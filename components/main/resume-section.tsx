import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { ResumeContent } from "@/lib/cms-types";

type ResumeSectionProps = {
  preview?: boolean;
  resumes?: ResumeContent[];
};

type CvVariant = "english" | "french" | "canadian" | "ats";

const resolveCvVariant = (resume: ResumeContent): CvVariant | null => {
  const value = `${resume.variant} ${resume.title}`.toLowerCase();
  if (value.includes("english")) return "english";
  if (value.includes("french") || value.includes("francais")) return "french";
  if (value.includes("canada")) return "canadian";
  if (value.includes("ats")) return "ats";
  return null;
};

const DownloadAction = ({
  href,
  label,
  available,
  variant,
  fileFormat,
  ctaLocation,
}: {
  href: string;
  label: string;
  available: boolean;
  variant: CvVariant | null;
  fileFormat: "pdf" | "docx";
  ctaLocation: "homepage" | "resume_page";
}) => {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300";

  if (!available || !href) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border border-white/10 bg-white/5 text-gray-500`}
      >
        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
    );
  }

  const content = (
    <>
      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
      {label}
    </>
  );

  if (!variant) {
    return (
      <Link href={href} download className={`${className} button-primary text-white`}>
        {content}
      </Link>
    );
  }

  return (
    <TrackedLink
      href={href}
      download
      analyticsEvent={{
        event: "resume_download",
        cv_variant: variant,
        file_format: fileFormat,
        cta_location: ctaLocation,
      }}
      className={`${className} button-primary text-white`}
    >
      {content}
    </TrackedLink>
  );
};

const ResumeCard = ({ resume, ctaLocation }: { resume: ResumeContent; ctaLocation: "homepage" | "resume_page" }) => (
  <article className="rounded-lg border border-white/10 bg-[#08021c]/75 p-5 shadow-lg shadow-[#2A0E61]/20 backdrop-blur-md">
    <div className="flex items-start justify-between gap-4">
      <h3 className="text-lg font-semibold text-white">{resume.title}</h3>
      {!resume.available && (
        <span className="rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-1 text-xs text-purple-100">
          Files pending
        </span>
      )}
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <DownloadAction
        href={resume.pdfPath}
        label="Download PDF"
        available={resume.available}
        variant={resolveCvVariant(resume)}
        fileFormat="pdf"
        ctaLocation={ctaLocation}
      />
      <DownloadAction
        href={resume.docxPath}
        label="Download DOCX"
        available={resume.available}
        variant={resolveCvVariant(resume)}
        fileFormat="docx"
        ctaLocation={ctaLocation}
      />
    </div>
  </article>
);

export const ResumeSection = ({
  preview = false,
  resumes = fallbackPortfolioContent.resumes,
}: ResumeSectionProps) => {
  const visibleResumes = [...resumes]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .slice(0, preview ? 3 : undefined);

  if (visibleResumes.length === 0) return null;

  return (
    <section
      id={preview ? "cv-preview" : "resume"}
      className="render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col px-6 py-24"
    >
      <p className="Welcome-text text-sm uppercase">CV</p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            CV & Resume
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            Choose the version that fits the application context. Each card
            includes direct PDF and DOCX downloads.
          </p>
        </div>
        {preview && (
          <TrackedLink
            href="/resume"
            aria-label="View CV"
            analyticsEvent={{
              event: "resume_view_click",
              cta_location: "homepage",
            }}
            className="button-primary inline-flex w-fit items-center justify-center gap-2 rounded-lg px-5 py-3 text-white transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            View CV
          </TrackedLink>
        )}
      </div>
      <div
        className={
          preview
            ? "mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            : "mt-10 grid gap-5 md:grid-cols-2"
        }
      >
        {visibleResumes.map((resume) => (
          <ResumeCard key={resume.variant} resume={resume} ctaLocation={preview ? "homepage" : "resume_page"} />
        ))}
      </div>
    </section>
  );
};

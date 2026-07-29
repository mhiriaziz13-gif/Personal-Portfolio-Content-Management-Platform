import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  IdentificationIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";

import { CertificationArtwork } from "@/components/sub/certification-artwork";
import type { CmsLayoutVariant } from "@/lib/cms-block-registry";
import type { CertificationContent } from "@/lib/cms-types";

type CertificationsSectionProps = {
  certifications: CertificationContent[];
  preview?: boolean;
  variant?: CmsLayoutVariant;
};

const CertificationCard = ({
  certification,
  preview,
}: {
  certification: CertificationContent;
  preview: boolean;
}) => {
  const tags = [...new Set(certification.tags)];
  const visibleTags = preview ? tags.slice(0, 3) : tags;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#08021c]/80 shadow-xl shadow-[#2A0E61]/20 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25">
      <CertificationArtwork certification={certification} />

      <div className="flex flex-1 flex-col p-6">
        <div>
          <h3 className="text-xl font-bold text-white">
            {certification.name}
          </h3>
          {certification.issuer.trim() && (
            <p className="mt-2 font-semibold text-cyan-100">
              {certification.issuer}
            </p>
          )}
        </div>

        {(certification.date.trim() || certification.credentialId?.trim()) && (
          <dl className="mt-4 space-y-2 text-sm text-gray-300">
            {certification.date.trim() && (
              <div className="flex items-start gap-2">
                <CalendarDaysIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-purple-200"
                  aria-hidden="true"
                />
                <dt className="sr-only">Date</dt>
                <dd>{certification.date}</dd>
              </div>
            )}
            {certification.credentialId?.trim() && (
              <div className="flex items-start gap-2">
                <IdentificationIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                  aria-hidden="true"
                />
                <dt className="shrink-0 text-gray-400">Credential ID</dt>
                <dd className="break-all font-mono text-xs text-gray-200">
                  {certification.credentialId}
                </dd>
              </div>
            )}
          </dl>
        )}

        {certification.description?.trim() && (
          <p
            className={`mt-4 text-sm leading-6 text-gray-300 ${preview ? "line-clamp-3" : ""}`}
          >
            {certification.description}
          </p>
        )}

        {visibleTags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {certification.credentialUrl?.trim() && (
          <Link
            href={certification.credentialUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="button-primary mt-6 inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            View Credential
            <ArrowTopRightOnSquareIcon
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </article>
  );
};

export const CertificationsSection = ({
  certifications,
  preview = false,
  variant = "default",
}: CertificationsSectionProps) => {
  const visibleCertifications = [...certifications]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .slice(0, preview ? 3 : undefined);

  if (visibleCertifications.length === 0) return null;

  return (
    <section
      id="certifications"
      data-layout-variant={variant}
      className={`render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col px-6 ${
        preview || variant === "compact" ? "py-16" : "py-24"
      }`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="Welcome-text text-sm uppercase">Verified learning</p>
          <h2 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Certifications
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            Professional credentials across analytics, marketing, technology,
            and digital growth.
          </p>
        </div>

        {preview && (
          <Link
            href="/resume#certifications"
            className="button-secondary inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            View all certifications
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div
        className={`mt-10 grid gap-6 ${
          variant === "grid-2"
            ? "md:grid-cols-2"
            : "md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {visibleCertifications.map((certification) => (
          <CertificationCard
            key={`${certification.sortOrder}-${certification.issuer}-${certification.name}`}
            certification={certification}
            preview={preview}
          />
        ))}
      </div>
    </section>
  );
};

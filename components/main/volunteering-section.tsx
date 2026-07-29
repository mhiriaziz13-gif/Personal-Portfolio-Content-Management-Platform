import Image from "next/image";

import type { CmsLayoutVariant } from "@/lib/cms-block-registry";
import type { VolunteeringContent } from "@/lib/cms-types";

export function VolunteeringSection({
  entries,
  title = "Volunteering",
  subtitle,
  variant = "default",
}: {
  entries: VolunteeringContent[];
  title?: string;
  subtitle?: string;
  variant?: CmsLayoutVariant;
}) {
  if (!entries.length) return null;
  return (
    <section
      id="volunteering"
      data-layout-variant={variant}
      className={`relative z-20 mx-auto w-full max-w-7xl px-6 ${
        variant === "compact" ? "py-14" : "py-24"
      }`}
    >
      {subtitle && <p className="Welcome-text text-sm">{subtitle}</p>}
      {title && <h2 className="mt-3 text-4xl font-bold text-white">{title}</h2>}
      <div
        className={`mt-10 grid gap-6 ${
          variant === "grid-2" ? "lg:grid-cols-2" : ""
        }`}
      >
        {entries.map((entry) => (
          <article key={`${entry.organisation}-${entry.role}`} className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6">
            <div className="flex items-start gap-4">
              {entry.logoUrl && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                  <Image
                    src={entry.logoUrl}
                    alt={entry.logoAlt || `${entry.organisation} logo`}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                  />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{entry.role}</h3>
                <p className="mt-1 font-semibold text-cyan-100">
                  {entry.organisation}{entry.domain ? ` · ${entry.domain}` : ""}
                </p>
                <p className="mt-2 text-sm text-gray-400">{entry.date}</p>
              </div>
            </div>
            <p className="mt-4 leading-7 text-gray-300">{entry.summary}</p>
            <ul className="mt-4 ml-5 list-disc space-y-2 text-sm leading-6 text-gray-300">
              {entry.descriptionItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {entry.focusAreas.map((area) => <span key={area} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">{area}</span>)}
            </div>
            {entry.certification && (
              <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Related certification</p>
                <p className="mt-1 font-semibold text-white">{entry.certification.name}</p>
                <p className="mt-1 text-sm text-gray-400">
                  {[entry.certification.issuer, entry.certification.date].filter(Boolean).join(" · ")}
                </p>
                {entry.certification.credentialUrl && (
                  <a href={entry.certification.credentialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-cyan-100 hover:text-white">
                    View credential
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

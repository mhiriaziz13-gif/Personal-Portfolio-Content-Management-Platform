import {
  AcademicCapIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";

import type { EducationContent } from "@/lib/cms-types";

type EducationSectionProps = {
  education: EducationContent[];
  preview?: boolean;
};

const getDateRange = ({ startDate, endDate }: EducationContent) => {
  const dates = [startDate.trim(), endDate.trim()].filter(Boolean);
  return dates.join(" to ");
};

const EducationCard = ({ education }: { education: EducationContent }) => {
  const dateRange = getDateRange(education);
const statusItems = education.status
  .split("·")
  .map((item) => item.trim())
  .filter(Boolean);
  return (
    <article className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6 shadow-xl shadow-[#2A0E61]/20 backdrop-blur-md transition duration-300 hover:border-cyan-300/25">
<div>
  <h3 className="text-xl font-bold text-white">{education.degree}</h3>
  <p className="mt-2 text-base font-semibold text-cyan-100">
    {education.institution}
  </p>
</div>

{statusItems.length > 0 && (
  <ul
    className="mt-5 flex flex-wrap gap-2"
    aria-label={`${education.degree} academic details`}
  >
    {statusItems.map((item) => (
      <li
        key={item}
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-purple-300/25 bg-purple-300/10 px-3 py-1.5 text-xs font-semibold leading-5 text-purple-100"
      >
        <CheckBadgeIcon
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)}
      {(dateRange || education.location.trim()) && (
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-gray-300">
          {dateRange && (
            <span className="inline-flex items-center gap-2">
              <CalendarDaysIcon
                className="h-4 w-4 text-purple-200"
                aria-hidden="true"
              />
              {dateRange}
            </span>
          )}
          {education.location.trim() && (
            <span className="inline-flex items-center gap-2">
              <MapPinIcon
                className="h-4 w-4 text-cyan-200"
                aria-hidden="true"
              />
              {education.location}
            </span>
          )}
        </div>
      )}
    </article>
  );
};

export const EducationSection = ({
  education,
  preview = false,
}: EducationSectionProps) => {
  const visibleEducation = [...education]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .slice(0, preview ? 2 : undefined);

  if (visibleEducation.length === 0) return null;

  return (
    <section
      id="education"
      className={`render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col px-6 ${preview ? "py-16" : "py-24"}`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="Welcome-text text-sm uppercase">Learning journey</p>
          <h2 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Education
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            Academic foundations and continued study supporting data-driven
            business decisions.
          </p>
        </div>

        {preview && (
          <Link
            href="/resume#education"
            className="button-secondary inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            View full education
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <ol className="relative mt-10 ml-5 border-l border-purple-300/30">
        {visibleEducation.map((item) => (
          <li
            key={`${item.sortOrder}-${item.institution}-${item.degree}-${item.startDate}`}
            className="relative pb-7 pl-9 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute -left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-purple-300/35 bg-[#100b24] text-purple-100 shadow-[0_0_24px_rgba(112,66,248,0.4)]"
            >
              <AcademicCapIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <EducationCard education={item} />
          </li>
        ))}
      </ol>
    </section>
  );
};

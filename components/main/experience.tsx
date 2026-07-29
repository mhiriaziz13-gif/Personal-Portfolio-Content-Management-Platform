import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/solid";

import { ExperienceMarker } from "@/components/sub/experience-marker";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { CmsLayoutVariant } from "@/lib/cms-block-registry";
import type { ExperienceContent } from "@/lib/cms-types";

const ExperienceCard = ({
  experience,
  index,
}: {
  experience: ExperienceContent;
  index: number;
}) => {
  return (
    <article className="relative grid gap-5 md:grid-cols-[1fr_6rem_1fr]">
      <div className="hidden md:block">
        {index % 2 === 0 && <TimelinePanel experience={experience} />}
      </div>

      <div className="pointer-events-none absolute left-12 top-0 h-full w-px bg-gradient-to-b from-purple-400/0 via-purple-400/50 to-cyan-300/0 md:relative md:left-auto md:top-auto md:mx-auto md:w-px">
        <ExperienceMarker experience={experience} />
      </div>

      <div className="pl-32 md:pl-0">
        {index % 2 === 0 ? (
          <div className="md:hidden">
            <TimelinePanel experience={experience} />
          </div>
        ) : (
          <TimelinePanel experience={experience} />
        )}
      </div>
    </article>
  );
};

const TimelinePanel = ({ experience }: { experience: ExperienceContent }) => {
  return (
    <div className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6 text-left shadow-xl shadow-[#2A0E61]/20 backdrop-blur-md">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">{experience.role}</h3>
        <p className="mt-1 text-base font-semibold text-cyan-100">
          {experience.company}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="inline-flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 text-purple-200" />
            {experience.date}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-cyan-200" />
            {experience.location}
          </span>
        </div>
      </div>

      <ul className="ml-4 list-disc space-y-2 text-sm leading-6 text-gray-300">
        {experience.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
};

export const Experience = ({
  experience = fallbackPortfolioContent.experience,
  title = "Work Experience",
  subtitle = "What I have worked on",
  variant = "timeline",
}: {
  experience?: ExperienceContent[];
  title?: string;
  subtitle?: string;
  variant?: CmsLayoutVariant;
}) => {
  const visibleExperience = experience.filter(
    (item) => item.company && item.role,
  );
  if (visibleExperience.length === 0) return null;

  return (
    <section
      id="experience"
      data-layout-variant={variant}
      className={`render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col px-6 ${
        variant === "compact" ? "py-14" : "py-24"
      }`}
    >
      {subtitle && <p className="Welcome-text text-sm uppercase">{subtitle}</p>}
      {title && (
        <h2 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          {title}
        </h2>
      )}

      <div
        className={`flex flex-col ${
          variant === "compact" ? "mt-10 gap-6" : "mt-16 gap-10"
        }`}
      >
        {visibleExperience.map((item, index) => (
          <ExperienceCard
            key={`${item.company}-${item.date}`}
            experience={item}
            index={index}
          />
        ))}
      </div>
    </section>
  );
};

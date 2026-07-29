import Image from "next/image";

import type { ExperienceContent } from "@/lib/cms-types";

const getInitials = (company: string) =>
  company
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export const ExperienceMarker = ({
  experience,
}: {
  experience: ExperienceContent;
}) => {
  const showLogo = Boolean(experience.logo);

  return (
    <div
      className="absolute left-1/2 top-0 flex h-24 w-24 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border border-white/25 text-base font-bold text-white shadow-[0_0_42px_rgba(112,66,248,0.5)]"
      style={{
        backgroundColor: showLogo ? "rgba(255,255,255,0.99)" : experience.iconBg,
      }}
      data-image-fallback-container
      data-fallback-background={experience.iconBg}
      aria-hidden="true"
    >
      {showLogo && experience.logo ? (
        <>
          <Image
            src={experience.logo}
            alt={`${experience.company} logo`}
            fill
            sizes="96px"
            className="object-contain p-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.22)]"
            data-image-fallback="hide"
          />
          <span className="hidden" data-image-fallback-content>
            {getInitials(experience.company)}
          </span>
        </>
      ) : (
        getInitials(experience.company)
      )}
    </div>
  );
};

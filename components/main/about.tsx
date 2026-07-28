import { SparklesIcon } from "@heroicons/react/24/solid";

import { AvatarCard } from "@/components/sub/avatar-card";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { AboutContentData, ProfileContent } from "@/lib/cms-types";

type AboutProps = {
  profile?: ProfileContent;
  about?: AboutContentData;
};

export const About = ({ profile = fallbackPortfolioContent.profile, about = fallbackPortfolioContent.about }: AboutProps) => {
  const avatarProfile = { ...profile, avatarPath: about.avatarUrl || profile.avatarPath };
  if (!about.title && !about.body && about.highlights.length === 0) return null;

  return (
    <section
      id="about"
      className="render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6 py-24 lg:flex-row lg:px-12"
    >
      <div className="w-full lg:w-[42%]">
        <AvatarCard profile={avatarProfile} />
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-[58%]">
        <div className="Welcome-box border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9]">
          <SparklesIcon className="mr-[10px] h-5 w-5 text-[#b49bff]" />
          <p className="Welcome-text text-[13px]">About Ahmed</p>
        </div>

        <h2 className="text-3xl font-semibold text-white sm:text-4xl">
          {about.title}
        </h2>

        <p className="max-w-3xl text-base leading-8 text-gray-300 sm:text-lg">
          {about.body}
        </p>

        <ul className="grid gap-3 text-sm leading-6 text-gray-300 md:grid-cols-3">
          {about.highlights.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3 text-sm text-gray-300">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2">
            {profile.location}
          </span>
          <span className="rounded-full border border-purple-300/30 bg-purple-300/10 px-4 py-2">
            {profile.availability}
          </span>
        </div>
      </div>
    </section>
  );
};

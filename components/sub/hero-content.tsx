import {
  ArrowDownTrayIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { FaGithub } from "react-icons/fa6";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { DynamicTitle } from "@/components/sub/dynamic-title";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import type { HeroContentData, ProfileContent } from "@/lib/cms-types";

type HeroContentProps = {
  profile?: ProfileContent;
  hero?: HeroContentData;
};

export const HeroContent = ({ profile = fallbackPortfolioContent.profile, hero = fallbackPortfolioContent.hero }: HeroContentProps) => {
  return (
    <section
      id="home"
      className="relative z-[20] flex min-h-screen w-full flex-col items-center justify-center gap-10 px-6 pt-28 text-center lg:flex-row lg:px-20 lg:text-left"
    >
      <div className="flex h-full w-full max-w-3xl flex-col justify-center gap-5">
        <div className="Welcome-box mx-auto border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9] lg:mx-0">
          <SparklesIcon className="mr-[10px] h-5 w-5 text-[#b49bff]" />
          <p className="Welcome-text text-[13px]">{hero.eyebrow}</p>
        </div>

        <div className="mt-4 flex flex-col gap-5 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
          <h1>{hero.title}</h1>
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-cyan-400 to-sky-300">
            {hero.tagline}
          </p>
        </div>

        <p className="max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
          {profile.shortProfile}
        </p>

        <div className="min-h-[4.5rem] rounded-2xl border border-white/10 bg-[#08021c]/60 px-5 py-4 text-base text-gray-300 backdrop-blur-md sm:text-lg">
          <span>Open to roles such as </span>
          <span className="font-semibold text-white">
            <DynamicTitle titles={hero.dynamicTitles} />
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <TrackedLink
            href={hero.primaryCtaHref}
            analyticsEvent={getHeroCtaEvent(
              hero.primaryCtaHref,
              hero.primaryCtaLabel,
            )}
            className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-7 py-4 text-center text-base font-bold text-white sm:w-fit sm:self-center lg:self-start"
          >
            {hero.primaryCtaHref.startsWith("/projects") ? (
              <BriefcaseIcon className="h-5 w-5" />
            ) : hero.primaryCtaHref.startsWith("/resume") ? (
              <ArrowDownTrayIcon className="h-5 w-5" />
            ) : (
              <EnvelopeIcon className="h-5 w-5" />
            )}
            {hero.primaryCtaLabel}
          </TrackedLink>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <TrackedLink
              href={hero.secondaryCtaHref}
              analyticsEvent={getHeroCtaEvent(
                hero.secondaryCtaHref,
                hero.secondaryCtaLabel,
              )}
              className="button-secondary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-center"
            >
              <BriefcaseIcon className="h-5 w-5" />
              {hero.secondaryCtaLabel}
            </TrackedLink>
            <TrackedLink
              href="/resume"
              aria-label="View CV"
              analyticsEvent={{
                event: "resume_view_click",
                cta_location: "hero",
              }}
              className="button-secondary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-center"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              View CV
            </TrackedLink>
            <TrackedLink
              href={profile.github}
              aria-label="GitHub profile"
              analyticsEvent={{
                event: "profile_link_click",
                platform: "github",
                link_location: "hero",
              }}
              target="_blank"
              rel="noreferrer noopener"
              className="button-secondary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-center"
            >
              <FaGithub className="h-5 w-5" />
              GitHub
            </TrackedLink>
          </div>
        </div>
      </div>

      <div
        className="flex h-full w-full max-w-xl items-center justify-center"
        aria-hidden="true"
      >
        <Image
          src="/hero-bg.svg"
          alt="Futuristic space-themed developer workspace illustration"
          height={650}
          width={650}
          preload
          fetchPriority="high"
          sizes="(min-width: 1024px) 576px, (min-width: 640px) 560px, calc(100vw - 48px)"
          draggable={false}
          className="h-auto w-full max-w-[650px] select-none"
        />
      </div>
    </section>
  );
};

const getHeroCtaEvent = (
  href: string,
  label: string,
): AnalyticsEvent => {
  if (href.startsWith("/projects")) {
    return { event: "project_explore_click", cta_location: "hero" };
  }
  if (href.startsWith("/resume")) {
    return { event: "resume_view_click", cta_location: "hero" };
  }
  return {
    event: "contact_cta_click",
    cta_location: "hero",
    cta_label: label,
  };
};

import {
  ArrowDownTrayIcon,
  BriefcaseIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";

import { TrackedLink } from "@/components/analytics/tracked-link";
import type { HeroVariant } from "@/components/main/hero";
import { DynamicTitle } from "@/components/sub/dynamic-title";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { HeroContentData, ProfileContent } from "@/lib/cms-types";
import { cn } from "@/lib/utils";

type HeroContentProps = {
  profile?: ProfileContent;
  hero?: HeroContentData;
  variant?: HeroVariant;
};

export const HeroContent = ({
  profile = fallbackPortfolioContent.profile,
  hero = fallbackPortfolioContent.hero,
  variant = "default",
}: HeroContentProps) => {
  const compact = variant === "compact";

  return (
    <section
      id="home"
      className={cn(
        "relative z-[20] w-full items-center justify-center gap-10 px-6 text-center lg:px-20",
        compact
          ? "mx-auto flex min-h-[72vh] max-w-5xl flex-col pb-16 pt-28"
          : variant === "split"
            ? "grid min-h-screen pt-28 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:text-left"
            : "flex min-h-screen flex-col pt-28 lg:flex-row lg:text-left",
      )}
    >
      <div
        className={cn(
          "flex h-full w-full max-w-3xl flex-col justify-center gap-5",
          compact ? "items-center" : "",
        )}
      >
        <div
          className={cn(
            "Welcome-box mx-auto border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9]",
            compact ? "" : "lg:mx-0",
          )}
        >
          <SparklesIcon
            className="mr-[10px] h-5 w-5 text-[#b49bff]"
            aria-hidden="true"
          />
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

        <div className="flex flex-col gap-4">
          <div
            className={cn(
              "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center",
              compact ? "" : "lg:justify-start",
            )}
          >
            <TrackedLink
              href="/projects"
              analyticsEvent={{
                event: "project_explore_click",
                cta_location: "hero",
              }}
              className={cn(
                "button-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-7 py-4 text-center text-base font-bold text-white sm:w-fit sm:self-center",
                compact ? "" : "lg:self-start",
              )}
            >
              <BriefcaseIcon className="h-5 w-5" aria-hidden="true" />
              View selected work
            </TrackedLink>
            <TrackedLink
              href="/resume"
              analyticsEvent={{
                event: "resume_view_click",
                cta_location: "hero",
              }}
              className="button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-center font-semibold"
            >
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
              View resume
            </TrackedLink>
          </div>

          {(profile.github || profile.linkedIn) ? (
            <nav
              aria-label="Professional profiles"
              className={cn(
                "flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-400",
                compact ? "" : "lg:justify-start",
              )}
            >
              {profile.github ? (
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 transition hover:text-cyan-100"
                >
                  <FaGithub className="h-4 w-4" aria-hidden="true" />
                  GitHub
                </TrackedLink>
              ) : null}
              {profile.linkedIn ? (
                <TrackedLink
                  href={profile.linkedIn}
                  aria-label="LinkedIn profile"
                  analyticsEvent={{
                    event: "profile_link_click",
                    platform: "linkedin",
                    link_location: "hero",
                  }}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 transition hover:text-cyan-100"
                >
                  <FaLinkedinIn className="h-4 w-4" aria-hidden="true" />
                  LinkedIn
                </TrackedLink>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div
          className="flex h-full w-full max-w-xl items-center justify-center"
          aria-hidden="true"
        >
          <Image
            src="/hero-bg.svg"
            alt=""
            height={650}
            width={650}
            preload
            fetchPriority="high"
            sizes="(min-width: 1024px) 576px, (min-width: 640px) 560px, calc(100vw - 48px)"
            draggable={false}
            className="h-auto w-full max-w-[650px] select-none"
          />
        </div>
      ) : null}
    </section>
  );
};

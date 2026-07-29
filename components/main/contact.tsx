import {
  ArrowDownTrayIcon,
  EnvelopeIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import { FaGithub } from "react-icons/fa6";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { DeferredContactForm } from "@/components/main/deferred-contact-form";
import { DeferredEarthCanvas } from "@/components/main/deferred-earth-canvas";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { ProfileContent } from "@/lib/cms-types";

export const Contact = ({ profile = fallbackPortfolioContent.profile }: { profile?: ProfileContent }) => {
  return (
    <section
      id="contact"
      className="render-deferred relative z-[20] mx-auto flex w-full max-w-7xl flex-col-reverse gap-10 overflow-hidden px-6 py-24 xl:flex-row"
    >
      <div className="flex-[0.85] rounded-lg border border-white/10 bg-[#100b24]/90 p-6 shadow-xl shadow-[#2A0E61]/25 backdrop-blur-md sm:p-8">
        <p className="Welcome-text text-sm uppercase">Contact</p>
        <h2 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          Let&apos;s connect
        </h2>
        <p className="mt-4 text-base leading-7 text-gray-300">
          {profile.availability}.
        </p>
        <p className="mt-3 text-sm leading-7 text-gray-400">
          For marketing analytics, commercial analytics, business intelligence,
          automation or data operations conversations, reach out by email,
          LinkedIn, GitHub or the form below.
        </p>

        <DeferredContactForm recipient={profile.email} />

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <TrackedLink
            href={`mailto:${profile.email}`}
            analyticsEvent={{ event: "email_contact_click", link_location: "contact" }}
            className="button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold"
          >
            <EnvelopeIcon className="h-4 w-4" />
            {profile.email}
          </TrackedLink>
          <TrackedLink
            href={profile.linkedIn}
            analyticsEvent={{ event: "profile_link_click", platform: "linkedin", link_location: "contact" }}
            aria-label="LinkedIn profile"
            target="_blank"
            rel="noreferrer noopener"
            className="button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold"
          >
            <LinkIcon className="h-4 w-4" />
            LinkedIn
          </TrackedLink>
          <TrackedLink
            href={profile.github}
            analyticsEvent={{ event: "profile_link_click", platform: "github", link_location: "contact" }}
            aria-label="GitHub profile"
            target="_blank"
            rel="noreferrer noopener"
            className="button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold"
          >
            <FaGithub className="h-4 w-4" />
            GitHub
          </TrackedLink>
          <TrackedLink
            href="/resume"
            aria-label="View CV"
            analyticsEvent={{
              event: "resume_view_click",
              cta_location: "contact_section",
            }}
            className="button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            View CV
          </TrackedLink>
        </div>
      </div>

      <div
        className="h-[360px] md:h-[560px] xl:h-auto xl:flex-1"
        aria-hidden="true"
      >
        <DeferredEarthCanvas />
      </div>
    </section>
  );
};

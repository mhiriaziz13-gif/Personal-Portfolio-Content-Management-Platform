import { EnvelopeIcon, MapPinIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { CookiePreferencesButton } from "@/components/consent/cookie-preferences-button";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { NavLink, ProfileContent } from "@/lib/cms-types";
import { getFooterNavigationLinks } from "@/lib/navigation";

export const Footer = ({
  profile = fallbackPortfolioContent.profile,
  navLinks = fallbackPortfolioContent.navLinks,
}: {
  profile?: ProfileContent;
  navLinks?: NavLink[];
}) => {
  const footerLinks = getFooterNavigationLinks(navLinks);

  return (
    <footer className="relative z-[20] w-full bg-transparent px-6 py-10 text-gray-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">{profile.name}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
            {profile.mainTitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm md:items-end">
          <span className="inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-cyan-200" />
            {profile.location}
          </span>
          <TrackedLink
            href={`mailto:${profile.email}`}
            analyticsEvent={[
              { event: "email_contact_click", link_location: "footer" },
              { event: "contact_cta_click", cta_location: "footer", cta_label: "footer_email_contact" },
            ]}
            className="inline-flex min-h-11 items-center gap-2 rounded-md transition hover:text-cyan-100"
          >
            <EnvelopeIcon className="h-4 w-4 text-purple-200" />
            {profile.email}
          </TrackedLink>
          <TrackedLink
            href={profile.github}
            analyticsEvent={{ event: "profile_link_click", platform: "github", link_location: "footer" }}
            aria-label={`${profile.githubLabel} — GitHub profile`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-2 rounded-md transition hover:text-cyan-100"
          >
            <FaGithub className="h-4 w-4 text-gray-200" />
            {profile.githubLabel}
          </TrackedLink>
          <TrackedLink
            href={profile.linkedIn}
            analyticsEvent={{ event: "profile_link_click", platform: "linkedin", link_location: "footer" }}
            aria-label={`${profile.linkedInLabel} — LinkedIn profile`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-2 rounded-md transition hover:text-cyan-100"
          >
            <FaLinkedinIn className="h-4 w-4 text-[#0A66C2]" />
            {profile.linkedInLabel}
          </TrackedLink>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-sm text-gray-400">
        &copy; {profile.name} {new Date().getFullYear()}. All rights reserved.
      </p>
      <nav aria-label="Footer navigation" className="mx-auto mt-6 flex max-w-7xl flex-wrap gap-x-5 gap-y-3 text-sm text-gray-400">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 items-center hover:text-cyan-100"
          >
            {link.title}
          </Link>
        ))}
        <CookiePreferencesButton />
      </nav>
      <p className="mx-auto mt-5 max-w-7xl text-xs leading-6 text-gray-400">
        With your choice, Google Tag Manager manages GA4 aggregate traffic and event measurement, Microsoft Clarity supports UX heatmaps and session behavior, and Vercel Web Analytics and Speed Insights provide aggregate traffic and performance measurement. These optional services remain off until analytics consent. Advertising personalization stays disabled, sensitive forms are masked, and contact-form content is never sent to analytics. Use Analytics preferences above to change your choice.
      </p>
    </footer>
  );
};

import Link from "next/link";

import { TrackedLink } from "@/components/analytics/tracked-link";
import type { AnalyticsEvent } from "@/lib/analytics/events";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  links?: { href: string; label: string; analyticsEvent?: AnalyticsEvent }[];
};

export function PageIntro({ eyebrow, title, description, links = [] }: PageIntroProps) {
  return (
    <header className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-8 pt-8">
      <p className="Welcome-text text-sm uppercase">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-4xl font-bold text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300 sm:text-lg">{description}</p>
      {links.length > 0 && (
        <nav aria-label="Related pages" className="mt-6 flex flex-wrap gap-3">
          {links.map((link) =>
            link.analyticsEvent ? (
              <TrackedLink key={link.href} href={link.href} analyticsEvent={link.analyticsEvent} className="button-secondary inline-flex min-h-11 items-center rounded-lg px-4 py-2.5 text-sm font-semibold">
                {link.label}
              </TrackedLink>
            ) : (
              <Link key={link.href} href={link.href} className="button-secondary inline-flex min-h-11 items-center rounded-lg px-4 py-2.5 text-sm font-semibold">
                {link.label}
              </Link>
            ),
          )}
        </nav>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNavigation } from "@/components/main/mobile-navigation";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { NavLink, ProfileContent } from "@/lib/cms-types";
import {
  getPrimaryNavigationLinks,
  getResumeNavigationLink,
} from "@/lib/navigation";

export const Navbar = ({ profile = fallbackPortfolioContent.profile, navLinks = fallbackPortfolioContent.navLinks }: { profile?: ProfileContent; navLinks?: NavLink[] }) => {
  const pathname = usePathname();
  const primaryLinks = getPrimaryNavigationLinks(navLinks);
  const resumeLink = getResumeNavigationLink(navLinks);

  return (
    <header className="fixed top-0 z-50 h-[65px] w-full bg-[#030014]/55 px-4 shadow-lg shadow-[#2A0E61]/40 backdrop-blur-md sm:px-10">
      <nav
        className="mx-auto flex h-full w-full max-w-7xl items-center justify-between"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          prefetch={false}
          aria-label={`${profile.name} home`}
          className="flex min-h-11 items-center gap-3 rounded-lg"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7042f88b] bg-[#08021c] text-sm font-bold text-white shadow-[0_0_24px_rgba(112,66,248,0.35)]">
            {profile.initials}
          </span>
          <span className="hidden font-semibold text-gray-200 md:inline">
            {profile.name}
          </span>
        </Link>

        <div className="hidden h-full flex-row items-center gap-3 lg:flex">
          <div className="flex items-center gap-1 rounded-full border border-[rgba(112,66,248,0.38)] bg-[rgba(3,0,20,0.5)] px-3 py-2 text-sm text-gray-200">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  isActivePath(pathname, link.href)
                    ? "bg-white/10 text-cyan-100"
                    : ""
                }`}
              >
                {link.title}
              </Link>
            ))}
          </div>
          {resumeLink ? (
            <Link
              href={resumeLink.href}
              prefetch={false}
              aria-current={
                isActivePath(pathname, resumeLink.href) ? "page" : undefined
              }
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-bold text-white"
            >
              {resumeLink.title}
            </Link>
          ) : null}
        </div>

        <MobileNavigation navLinks={navLinks} pathname={pathname} />
      </nav>
    </header>
  );
};

const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

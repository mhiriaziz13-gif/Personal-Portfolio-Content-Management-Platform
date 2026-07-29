import {
  dynamicTitles,
  navLinks,
  profile,
} from "@/constants/portfolio";
import type { PortfolioContent } from "@/lib/cms-types";

/**
 * Repository fallback content is intentionally small. It keeps the public shell
 * useful during configuration incidents without replaying projects or other
 * records that may have been unpublished in the CMS.
 */
export const primaryNavigation = navLinks.map((link) => ({ ...link }));

const fallbackProfile: PortfolioContent["profile"] = {
  ...profile,
  availability:
    "International full-time availability from October 2027; selected freelance projects available now.",
  aboutFocus: [...profile.aboutFocus],
};

export const fallbackPortfolioContent: PortfolioContent = {
  profile: fallbackProfile,
  hero: {
    eyebrow: fallbackProfile.mainTitle,
    title: fallbackProfile.name,
    subtitle: fallbackProfile.secondaryLine,
    tagline: fallbackProfile.tagline,
    dynamicTitles: [...dynamicTitles],
    primaryCtaLabel: "Contact Me",
    primaryCtaHref: "/contact",
    secondaryCtaLabel: "View Projects",
    secondaryCtaHref: "/projects",
  },
  about: {
    title: "Data, commercial context and automation in one working view.",
    body: fallbackProfile.about,
    highlights: [...fallbackProfile.aboutFocus],
    avatarUrl: fallbackProfile.avatarPath,
  },
  skillCategories: [],
  projects: [],
  projectSections: [],
  experience: [],
  education: [],
  certifications: [],
  resumes: [],
  socialLinks: [],
  pages: [],
  volunteering: [],
  navLinks: primaryNavigation,
  delivery: {
    source: "fallback",
    profile: "failed",
    pages: "failed",
    presentation: "failed",
    projects: "failed",
    career: "failed",
    secondary: "failed",
  },
};

import Image from "next/image";
import Link from "next/link";

import { CertificationsSection } from "@/components/main/certifications-section";
import { Experience } from "@/components/main/experience";
import { Hero } from "@/components/main/hero";
import { Projects } from "@/components/main/projects";
import { Skills } from "@/components/main/skills";
import { VolunteeringSection } from "@/components/main/volunteering-section";
import {
  cmsBlockRegistry,
  normalizeCmsLayoutVariant,
  type CmsLayoutVariant,
} from "@/lib/cms-block-registry";
import type {
  PageSectionContent,
  PageSectionItemContent,
  PortfolioContent,
} from "@/lib/cms-types";

export function CmsPageSections({
  content,
  pageKey,
}: {
  content: PortfolioContent;
  pageKey: string;
}) {
  const page = content.pages.find((item) => item.pageKey === pageKey);
  if (!page?.sections.length) return null;
  const hasHero = page.sections.some(
    (section) => section.sectionType === "hero",
  );

  return (
    <>
      {!hasHero && (
        <h1 className="sr-only">
          {page.title || page.navigationLabel || pageKey}
        </h1>
      )}
      {page.sections.map((section) => (
        <CmsSection key={section.id} section={section} content={content} />
      ))}
    </>
  );
}

function CmsSection({
  section,
  content,
}: {
  section: PageSectionContent;
  content: PortfolioContent;
}) {
  const variant = normalizeCmsLayoutVariant(
    section.sectionType,
    section.layoutVariant,
  );
  const definition = cmsBlockRegistry[section.sectionType];

  switch (section.sectionType) {
    case "hero":
      return (
        <Hero
          variant={variant as "default" | "compact" | "split"}
          profile={{
            ...content.profile,
            shortProfile:
              section.description || content.profile.shortProfile,
          }}
          hero={{
            ...content.hero,
            title: section.title || content.hero.title,
            tagline: section.subtitle || content.hero.tagline,
            primaryCtaLabel:
              section.ctaLabel || content.hero.primaryCtaLabel,
            primaryCtaHref:
              section.ctaHref || content.hero.primaryCtaHref,
            secondaryCtaLabel:
              section.secondaryCtaLabel ||
              content.hero.secondaryCtaLabel,
            secondaryCtaHref:
              section.secondaryCtaHref ||
              content.hero.secondaryCtaHref,
          }}
        />
      );
    case "featured_projects":
      return (
        <Projects
          title={section.title}
          subtitle={section.subtitle}
          projects={content.projects
  .filter((project) => project.featured)
  .sort(
    (left, right) =>
      (left.homeFeaturedOrder ?? 999) -
      (right.homeFeaturedOrder ?? 999),
  )}
          cardLocation="homepage"
          variant={variant}
        />
      );
    case "projects_grid":
      return (
        <Projects
          title={section.title}
          subtitle={section.subtitle}
          projects={content.projects}
          cardLocation="projects_page"
          variant={variant}
        />
      );
    case "experience_list":
      return (
        <Experience
          title={section.title}
          subtitle={section.subtitle}
          experience={content.experience}
          variant={variant}
        />
      );
    case "certifications_grid":
      return (
        <CertificationsSection
          certifications={content.certifications}
          variant={variant}
        />
      );
    case "volunteering":
      return (
        <VolunteeringSection
          title={section.title}
          subtitle={section.subtitle}
          entries={content.volunteering}
          variant={variant}
        />
      );
    case "skills":
      return (
        <Skills
          skillCategories={content.skillCategories}
          projects={content.projects}
          showRelatedProjects={
            section.pageKey === "expertise"
          }
          variant={variant}
        />
      );
    case "stats":
      return <StatsSection section={section} variant={variant} />;
    case "media_gallery":
    case "custom_cards":
      return (
        <ContentCardsSection
          section={section}
          variant={variant}
          isGallery={section.sectionType === "media_gallery"}
        />
      );
    case "rich_text":
      return <RichTextSection section={section} variant={variant} />;
    case "split_content":
      return <SplitContentSection section={section} variant={variant} />;
    case "cta":
      return <CallToActionSection section={section} variant={variant} />;
    default:
      // The discriminated registry keeps this branch unreachable at compile
      // time; the guard protects partially migrated CMS rows at runtime.
      void definition;
      return null;
  }
}

function RichTextSection({
  section,
  variant,
}: {
  section: PageSectionContent;
  variant: CmsLayoutVariant;
}) {
  const items = meaningfulItems(section.items);
  if (!section.description && items.length === 0) return null;
  const split = variant === "split" && section.description && items.length > 0;

  return (
    <section
      data-cms-block="rich_text"
      data-layout-variant={variant}
      className={`relative z-20 mx-auto max-w-5xl px-6 ${
        variant === "compact" ? "py-12" : "py-20"
      }`}
    >
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.subtitle && (
        <p className="mt-3 text-cyan-100">{section.subtitle}</p>
      )}
      <div
        className={
          split ? "mt-8 grid items-start gap-8 md:grid-cols-2" : undefined
        }
      >
        {section.description && (
          <RichParagraphs
            text={section.description}
            className={split ? "" : "mt-6"}
          />
        )}
        {items.length > 0 && (
          <div
            className={`grid gap-5 ${
              split ? "" : "mt-8 md:grid-cols-2"
            }`}
          >
            {items.map((item) => (
              <ContentCard key={item.id} item={item} compact={variant === "compact"} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SplitContentSection({
  section,
  variant,
}: {
  section: PageSectionContent;
  variant: CmsLayoutVariant;
}) {
  const items = meaningfulItems(section.items);
  if (!section.description && items.length === 0) return null;

  return (
    <section
      data-cms-block="split_content"
      data-layout-variant={variant}
      className={`relative z-20 mx-auto max-w-6xl px-6 ${
        variant === "compact" ? "py-12" : "py-20"
      }`}
    >
      {(section.title || section.subtitle) && (
        <header className="max-w-3xl">
          {section.title && (
            <h2 className="text-3xl font-bold text-white">{section.title}</h2>
          )}
          {section.subtitle && (
            <p className="mt-3 text-cyan-100">{section.subtitle}</p>
          )}
        </header>
      )}
      <div
        className={`mt-8 grid items-start gap-8 ${
          variant === "default" ? "lg:grid-cols-[1.1fr_0.9fr]" : "md:grid-cols-2"
        }`}
      >
        {section.description && <RichParagraphs text={section.description} />}
        {items.length > 0 && (
          <div className="grid gap-5">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                compact={variant === "compact"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RichParagraphs({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\r?\n(?:\s*\r?\n)?/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  return (
    <div className={`max-w-3xl space-y-4 leading-8 text-gray-300 ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
      ))}
    </div>
  );
}

function StatsSection({
  section,
  variant,
}: {
  section: PageSectionContent;
  variant: CmsLayoutVariant;
}) {
  const items = section.items.filter((item) => item.title && item.description);
  if (items.length === 0) return null;
  const gridClass =
    variant === "grid-2"
      ? "sm:grid-cols-2"
      : variant === "grid-3" || variant === "metrics"
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <section
      data-cms-block="stats"
      data-layout-variant={variant}
      className={`relative z-20 mx-auto max-w-7xl px-6 ${
        variant === "compact" ? "py-10" : "py-16"
      }`}
    >
      {section.title && (
        <h2 className="text-center text-3xl font-bold text-white">
          {section.title}
        </h2>
      )}
      <dl className={`mt-8 grid gap-5 ${gridClass}`}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border border-white/10 bg-[#100b24]/90 ${
              variant === "compact" ? "p-4" : "p-6"
            } ${variant === "metrics" ? "text-left" : "text-center"}`}
          >
            <dt className="text-sm text-gray-300">{item.title}</dt>
            <dd className="mt-2 text-3xl font-bold text-cyan-100">
              {item.description}
            </dd>
            {item.subtitle && (
              <p className="mt-2 text-sm text-gray-400">{item.subtitle}</p>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

function ContentCardsSection({
  section,
  variant,
  isGallery,
}: {
  section: PageSectionContent;
  variant: CmsLayoutVariant;
  isGallery: boolean;
}) {
  const items = meaningfulItems(section.items);
  if (items.length === 0) return null;
  const columns =
    variant === "grid-2"
      ? "md:grid-cols-2"
      : variant === "grid-3"
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      data-cms-block={isGallery ? "media_gallery" : "custom_cards"}
      data-layout-variant={variant}
      className={`relative z-20 mx-auto max-w-7xl px-6 ${
        variant === "compact" ? "py-12" : "py-20"
      }`}
    >
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.subtitle && (
        <p className="mt-3 text-cyan-100">{section.subtitle}</p>
      )}
      <div className={`mt-8 grid gap-5 ${columns}`}>
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            compact={variant === "compact"}
          />
        ))}
      </div>
    </section>
  );
}

function ContentCard({
  item,
  compact = false,
}: {
  item: PageSectionItemContent;
  compact?: boolean;
}) {
  const content = (
    <>
      {item.mediaUrl && item.mediaAlt && (
        <div className="relative aspect-video overflow-hidden border-b border-white/10">
          <Image
            src={item.mediaUrl}
            alt={item.mediaAlt}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className={compact ? "p-4" : "p-5"}>
        {item.title && (
          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
        )}
        {item.subtitle && (
          <p className="mt-2 text-sm font-semibold text-cyan-100">
            {item.subtitle}
          </p>
        )}
        {item.description && (
          <RichParagraphs text={item.description} className="mt-3 text-sm leading-7" />
        )}
        {item.linkUrl && item.linkLabel && (
          <span className="action-link mt-5 inline-block">
            {item.linkLabel}
          </span>
        )}
      </div>
    </>
  );

  const className =
    "overflow-hidden rounded-lg border border-white/10 bg-[#100b24]/90";

  return item.linkUrl && item.linkLabel ? (
    <Link href={item.linkUrl} className={className}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

function CallToActionSection({
  section,
  variant,
}: {
  section: PageSectionContent;
  variant: CmsLayoutVariant;
}) {
  const hasPrimary = Boolean(section.ctaHref && section.ctaLabel);
  const hasSecondary = Boolean(
    section.secondaryCtaHref && section.secondaryCtaLabel,
  );
  if (!section.description && !hasPrimary && !hasSecondary) return null;

  return (
    <section
      data-cms-block="cta"
      data-layout-variant={variant}
      className={`relative z-20 mx-auto max-w-5xl px-6 ${
        variant === "compact" ? "py-12" : "py-20"
      } ${variant === "split" ? "md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:text-left" : "text-center"}`}
    >
      <div>
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.description && (
        <p className={`mt-4 max-w-2xl text-gray-300 ${variant === "split" ? "" : "mx-auto"}`}>
          {section.description}
        </p>
      )}
      </div>
      <div className={`mt-7 flex flex-wrap gap-3 ${variant === "split" ? "md:mt-0 md:justify-end" : "justify-center"}`}>
        {hasPrimary && (
          <Link
            className="button-primary rounded-lg px-5 py-3 font-semibold text-white"
            href={section.ctaHref}
          >
            {section.ctaLabel}
          </Link>
        )}
        {hasSecondary && (
          <Link
            className="button-secondary rounded-lg px-5 py-3"
            href={section.secondaryCtaHref}
          >
            {section.secondaryCtaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

const meaningfulItems = (items: PageSectionItemContent[]) =>
  items.filter(
    (item) =>
      item.description ||
      item.subtitle ||
      (item.mediaUrl && item.mediaAlt) ||
      (item.linkUrl && item.linkLabel),
  );

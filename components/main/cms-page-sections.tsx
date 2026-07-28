import Image from "next/image";
import Link from "next/link";

import { CertificationsSection } from "@/components/main/certifications-section";
import { Experience } from "@/components/main/experience";
import { Hero } from "@/components/main/hero";
import { Projects } from "@/components/main/projects";
import { Skills } from "@/components/main/skills";
import { VolunteeringSection } from "@/components/main/volunteering-section";
import type {
  PageSectionContent,
  PageSectionItemContent,
  PortfolioContent,
} from "@/lib/cms-types";
import { isHttpsUrl } from "@/lib/utils";

export function CmsPageSections({
  content,
  pageKey,
}: {
  content: PortfolioContent;
  pageKey: string;
}) {
  const page = content.pages.find((item) => item.pageKey === pageKey);
  if (!page?.sections.length) return null;

  return page.sections.map((section) => (
    <CmsSection key={section.id} section={section} content={content} />
  ));
}

function CmsSection({
  section,
  content,
}: {
  section: PageSectionContent;
  content: PortfolioContent;
}) {
  switch (section.sectionType) {
    case "hero":
      return (
        <Hero
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
            )
            .slice(0, 3)}
          cardLocation="homepage"
        />
      );
    case "projects_grid":
      return (
        <Projects
          title={section.title}
          subtitle={section.subtitle}
          projects={content.projects}
          cardLocation="projects_page"
        />
      );
    case "experience_list":
      return (
        <Experience
          title={section.title}
          subtitle={section.subtitle}
          experience={content.experience}
        />
      );
    case "certifications_grid":
      return (
        <CertificationsSection certifications={content.certifications} />
      );
    case "volunteering":
      return (
        <VolunteeringSection
          title={section.title}
          subtitle={section.subtitle}
          entries={content.volunteering}
        />
      );
    case "skills":
      return <Skills skillCategories={content.skillCategories} />;
    case "stats":
      return <StatsSection section={section} />;
    case "media_gallery":
    case "custom_cards":
      return <ContentCardsSection section={section} />;
    case "rich_text":
      return <RichTextSection section={section} />;
    case "cta":
      return <CallToActionSection section={section} />;
    default:
      return null;
  }
}

function RichTextSection({ section }: { section: PageSectionContent }) {
  const items = meaningfulItems(section.items);
  if (!section.description && items.length === 0) return null;

  return (
    <section className="relative z-20 mx-auto max-w-5xl px-6 py-20">
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.subtitle && (
        <p className="mt-3 text-cyan-100">{section.subtitle}</p>
      )}
      {section.description && (
        <div className="mt-6 whitespace-pre-line leading-8 text-gray-300">
          {section.description}
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function StatsSection({ section }: { section: PageSectionContent }) {
  const items = section.items.filter((item) => item.title && item.description);
  if (items.length === 0) return null;

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-6 py-16">
      {section.title && (
        <h2 className="text-center text-3xl font-bold text-white">
          {section.title}
        </h2>
      )}
      <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-white/10 bg-[#100b24]/90 p-6 text-center"
          >
            <dt className="text-sm text-gray-300">{item.title}</dt>
            <dd className="mt-2 text-3xl font-bold text-cyan-100">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ContentCardsSection({ section }: { section: PageSectionContent }) {
  const items = meaningfulItems(section.items);
  if (items.length === 0) return null;

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-6 py-20">
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.subtitle && (
        <p className="mt-3 text-cyan-100">{section.subtitle}</p>
      )}
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ContentCard({ item }: { item: PageSectionItemContent }) {
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
            unoptimized={isHttpsUrl(item.mediaUrl)}
          />
        </div>
      )}
      <div className="p-5">
        {item.title && (
          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
        )}
        {item.subtitle && (
          <p className="mt-2 text-sm font-semibold text-cyan-100">
            {item.subtitle}
          </p>
        )}
        {item.description && (
          <p className="mt-3 text-sm leading-7 text-gray-300">
            {item.description}
          </p>
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

function CallToActionSection({ section }: { section: PageSectionContent }) {
  const hasPrimary = Boolean(section.ctaHref && section.ctaLabel);
  const hasSecondary = Boolean(
    section.secondaryCtaHref && section.secondaryCtaLabel,
  );
  if (!section.description && !hasPrimary && !hasSecondary) return null;

  return (
    <section className="relative z-20 mx-auto max-w-5xl px-6 py-20 text-center">
      {section.title && (
        <h2 className="text-3xl font-bold text-white">{section.title}</h2>
      )}
      {section.description && (
        <p className="mx-auto mt-4 max-w-2xl text-gray-300">
          {section.description}
        </p>
      )}
      <div className="mt-7 flex justify-center gap-3">
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

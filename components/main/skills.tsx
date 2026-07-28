import { DeferredBackgroundVideo } from "@/components/main/deferred-background-video";
import { SkillDataProvider } from "@/components/sub/skill-data-provider";
import { SkillText } from "@/components/sub/skill-text";
import { fallbackPortfolioContent } from "@/data/fallback-portfolio";
import type { SkillCategory } from "@/constants/portfolio";

export const Skills = ({ skillCategories = fallbackPortfolioContent.skillCategories }: { skillCategories?: SkillCategory[] }) => {
  const visibleCategories = skillCategories.filter(
    (category) => category.title && category.skills.length > 0,
  );
  if (visibleCategories.length === 0) return null;

  return (
    <section
      id="skills"
      className="render-deferred relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6 py-24"
    >
      <SkillText />

      <div className="relative z-[20] mx-auto grid w-full max-w-6xl gap-6">
        {visibleCategories.map((category) => (
          <div
            key={category.title}
            className="rounded-lg border border-white/10 bg-[#030014]/55 p-5 shadow-lg shadow-[#2A0E61]/20 backdrop-blur-sm"
          >
            <h3 className="mb-4 text-center text-lg font-semibold text-white md:text-left">
              {category.title}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {category.skills.map((skill) => (
                <SkillDataProvider
                  key={`${category.title}-${skill}`}
                  name={skill}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 -z-10 opacity-30" aria-hidden="true">
        <DeferredBackgroundVideo
          src="/videos/skills-bg.webm"
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  );
};

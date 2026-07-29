import type { CSSProperties } from "react";

import { fallbackPortfolioContent } from "@/data/fallback-portfolio";

export const DynamicTitle = ({ titles = fallbackPortfolioContent.hero.dynamicTitles }: { titles?: readonly string[] }) => {
  const safeTitles = titles.length ? [...titles] : fallbackPortfolioContent.hero.dynamicTitles;
  const style = {
    "--rotating-title-count": safeTitles.length,
  } as CSSProperties;

  return (
    <span
      className="rotating-title-window min-w-full sm:min-w-[29rem]"
    >
      <span className="sr-only">{safeTitles[0]}</span>
      <span
        className="rotating-title-reduced-motion-fallback"
        aria-hidden="true"
      >
        {safeTitles[0]}
      </span>
      <span className="rotating-title-track" style={style} aria-hidden="true">
        {[...safeTitles, ...safeTitles].map((title, index) => (
          <span className="rotating-title-item" key={`${index}-${title}`}>
            {title}
          </span>
        ))}
      </span>
    </span>
  );
};

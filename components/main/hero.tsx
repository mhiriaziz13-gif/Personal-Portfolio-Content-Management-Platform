import { HeroContent } from "@/components/sub/hero-content";
import { DeferredBackgroundVideo } from "@/components/main/deferred-background-video";
import type { HeroContentData, ProfileContent } from "@/lib/cms-types";

export type HeroVariant = "default" | "compact" | "split";

export const Hero = ({
  profile,
  hero,
  variant = "default",
}: {
  profile?: ProfileContent;
  hero?: HeroContentData;
  variant?: HeroVariant;
}) => {
  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden ${
        variant === "compact" ? "min-h-[72vh]" : "min-h-screen"
      }`}
    >
      <DeferredBackgroundVideo
        src="/videos/blackhole.webm"
        deferAfterLoadMs={12000}
        rootMargin="0px"
        className="absolute left-0 top-[-260px] -z-20 h-full w-full rotate-180 object-cover opacity-80"
      />

      <HeroContent profile={profile} hero={hero} variant={variant} />
    </div>
  );
};

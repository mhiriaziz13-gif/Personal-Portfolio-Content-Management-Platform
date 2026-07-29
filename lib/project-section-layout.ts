import type { CmsLayoutVariant } from "@/lib/cms-block-registry";

export type ProjectSectionType = "rich_text" | "media_gallery";

type ProjectSectionLayout = {
  sectionClassName: string;
  contentClassName: string;
  itemGridClassName: string;
  itemClassName: string;
  mediaGridClassName: string;
  mediaFigureClassName: string;
  splitContent: boolean;
};

const richTextLayouts: Record<
  "default" | "compact" | "split",
  ProjectSectionLayout
> = {
  default: {
    sectionClassName: "py-8",
    contentClassName: "max-w-3xl",
    itemGridClassName: "md:grid-cols-2",
    itemClassName: "rounded-md border border-white/10 bg-black/10 p-4",
    mediaGridClassName: "max-w-4xl",
    mediaFigureClassName: "",
    splitContent: false,
  },
  compact: {
    sectionClassName: "py-6",
    contentClassName: "max-w-2xl",
    itemGridClassName: "max-w-3xl sm:grid-cols-2",
    itemClassName: "border-l-2 border-cyan-300/40 py-1 pl-4",
    mediaGridClassName: "max-w-3xl gap-3",
    mediaFigureClassName: "text-sm",
    splitContent: false,
  },
  split: {
    sectionClassName: "py-8 lg:py-10",
    contentClassName: "max-w-none",
    itemGridClassName: "grid-cols-1",
    itemClassName: "rounded-md border border-white/10 bg-black/10 p-4",
    mediaGridClassName: "grid-cols-1",
    mediaFigureClassName: "",
    splitContent: true,
  },
};

const mediaLayouts: Record<
  "default" | "compact" | "grid-2" | "grid-3",
  ProjectSectionLayout
> = {
  default: {
    sectionClassName: "py-8",
    contentClassName: "max-w-3xl",
    itemGridClassName: "md:grid-cols-2",
    itemClassName: "rounded-md border border-white/10 bg-black/10 p-4",
    mediaGridClassName: "max-w-4xl grid-cols-1",
    mediaFigureClassName: "",
    splitContent: false,
  },
  compact: {
    sectionClassName: "py-6",
    contentClassName: "max-w-2xl",
    itemGridClassName: "max-w-3xl sm:grid-cols-2",
    itemClassName: "border-l-2 border-cyan-300/40 py-1 pl-4",
    mediaGridClassName: "max-w-3xl grid-cols-1 gap-3",
    mediaFigureClassName: "text-sm",
    splitContent: false,
  },
  "grid-2": {
    sectionClassName: "py-8",
    contentClassName: "max-w-3xl",
    itemGridClassName: "md:grid-cols-2",
    itemClassName: "rounded-md border border-white/10 bg-black/10 p-4",
    mediaGridClassName: "md:grid-cols-2",
    mediaFigureClassName: "",
    splitContent: false,
  },
  "grid-3": {
    sectionClassName: "py-8",
    contentClassName: "max-w-3xl",
    itemGridClassName: "md:grid-cols-2 xl:grid-cols-3",
    itemClassName: "rounded-md border border-white/10 bg-black/10 p-4",
    mediaGridClassName: "sm:grid-cols-2 xl:grid-cols-3",
    mediaFigureClassName: "",
    splitContent: false,
  },
};

export const getProjectSectionLayout = (
  sectionType: ProjectSectionType,
  variant: CmsLayoutVariant | undefined,
): ProjectSectionLayout => {
  if (sectionType === "media_gallery") {
    return mediaLayouts[
      variant === "compact" ||
      variant === "grid-2" ||
      variant === "grid-3"
        ? variant
        : "default"
    ];
  }

  return richTextLayouts[
    variant === "compact" || variant === "split" ? variant : "default"
  ];
};

import { describe, expect, it } from "vitest";

import { getProjectSectionLayout } from "@/lib/project-section-layout";

describe("project section layouts", () => {
  it("implements every controlled rich-text variant", () => {
    const variants = ["default", "compact", "split"] as const;
    const layouts = variants.map((variant) =>
      getProjectSectionLayout("rich_text", variant),
    );

    expect(new Set(layouts.map((layout) => layout.sectionClassName)).size).toBe(
      variants.length,
    );
    expect(layouts.at(-1)?.splitContent).toBe(true);
  });

  it("implements every controlled media-gallery variant", () => {
    const variants = ["default", "compact", "grid-2", "grid-3"] as const;
    const layouts = variants.map((variant) =>
      getProjectSectionLayout("media_gallery", variant),
    );

    expect(new Set(layouts.map((layout) => layout.mediaGridClassName)).size).toBe(
      variants.length,
    );
  });

  it("falls back safely when given a variant for another block family", () => {
    expect(getProjectSectionLayout("rich_text", "grid-3")).toEqual(
      getProjectSectionLayout("rich_text", "default"),
    );
    expect(getProjectSectionLayout("media_gallery", "timeline")).toEqual(
      getProjectSectionLayout("media_gallery", "default"),
    );
  });
});

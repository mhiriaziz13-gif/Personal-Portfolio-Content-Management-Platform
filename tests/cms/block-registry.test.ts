import { describe, expect, it } from "vitest";

import {
  cmsBlockRegistry,
  cmsBlockTypes,
  cmsLayoutVariants,
  normalizeCmsBlockType,
  normalizeCmsLayoutVariant,
} from "@/lib/cms-block-registry";
import { validateCmsRow } from "@/lib/security/validation";

describe("controlled CMS block registry", () => {
  it("is the exact supported block and variant allow-list", () => {
    expect(cmsBlockTypes).toEqual([
      "hero",
      "rich_text",
      "split_content",
      "custom_cards",
      "stats",
      "featured_projects",
      "projects_grid",
      "experience_list",
      "skills",
      "certifications_grid",
      "volunteering",
      "media_gallery",
      "cta",
    ]);
    expect(cmsLayoutVariants).toEqual([
      "default",
      "compact",
      "split",
      "grid-2",
      "grid-3",
      "timeline",
      "metrics",
    ]);
    expect(Object.keys(cmsBlockRegistry)).toEqual(cmsBlockTypes);

    for (const definition of Object.values(cmsBlockRegistry)) {
      expect(definition.description.trim()).not.toBe("");
      expect(definition.example.trim()).not.toBe("");
      expect(definition.variants).toContain("default");
      expect(
        definition.variants.every((variant) =>
          cmsLayoutVariants.includes(variant),
        ),
      ).toBe(true);
    }
  });

  it("falls back safely for unknown blocks and incompatible variants", () => {
    expect(normalizeCmsBlockType("raw_html")).toBe("rich_text");
    expect(normalizeCmsLayoutVariant("stats", "metrics")).toBe("metrics");
    expect(normalizeCmsLayoutVariant("stats", "timeline")).toBe("default");
    expect(normalizeCmsLayoutVariant("hero", "grid-3")).toBe("default");
  });

  it("uses the same allow-list at the admin mutation boundary", () => {
    const validPageBlock = validateCmsRow("page_sections", {
      page_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
      section_key: "evidence",
      section_type: "split_content",
      layout_variant: "split",
      title: "Evidence",
      description: "Short context.",
      display_order: 10,
      is_visible: true,
      is_archived: false,
    });
    expect(validPageBlock.success).toBe(true);

    expect(
      validateCmsRow("page_sections", {
        page_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
        section_key: "unsafe",
        section_type: "raw_html",
        layout_variant: "default",
      }).success,
    ).toBe(false);
    expect(
      validateCmsRow("page_sections", {
        page_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
        section_key: "unsafe-layout",
        section_type: "rich_text",
        layout_variant: "free-form-layout",
      }).success,
    ).toBe(false);
    expect(
      validateCmsRow("page_sections", {
        page_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
        section_key: "wrong-combination",
        section_type: "hero",
        layout_variant: "timeline",
      }).success,
    ).toBe(false);
  });

  it("keeps project sections controlled and navigation settings typed", () => {
    expect(
      validateCmsRow("project_sections", {
        project_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
        section_type: "media_gallery",
        layout_variant: "grid-2",
        title: "Evidence",
        sort_order: 20,
        is_visible: true,
        is_archived: false,
      }).success,
    ).toBe(true);
    expect(
      validateCmsRow("project_sections", {
        project_id: "0d2e84ea-3b4e-4d19-969f-27269be950b9",
        section_type: "media",
        layout_variant: "default",
        title: "Legacy media",
      }).success,
    ).toBe(false);

    expect(
      validateCmsRow("pages", {
        page_key: "expertise",
        title: "Expertise",
        slug: "/expertise",
        navigation_label: "Expertise",
        navigation_order: 30,
        show_in_navigation: true,
        show_in_footer: true,
        is_published: true,
      }).success,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  getProjectCompleteness,
  hasMeaningfulProjectSection,
} from "@/lib/content-completeness";

describe("project completeness", () => {
  it("rejects visible title-only section skeletons", () => {
    const result = getProjectCompleteness(
      {
        slug: "commercial-analytics",
        title: "Commercial analytics",
        summary: "A measurable commercial analytics engagement.",
        cover_image_url: "/cover.webp",
        status: "published",
        published: true,
      },
      [{ body: "", bullets: [], items: [], is_visible: true }],
    );

    expect(result.publishable).toBe(false);
    expect(result.blockingIssues.join(" ")).toContain("every visible");
  });

  it("accepts body, list-item, or media content", () => {
    expect(hasMeaningfulProjectSection({ body: "Result" })).toBe(true);
    expect(
      hasMeaningfulProjectSection({
        items: [{ label: "Revenue", value: "+12%" }],
      }),
    ).toBe(true);
    expect(
      hasMeaningfulProjectSection({ media: [{ mediaUrl: "/result.webp" }] }),
    ).toBe(true);
    expect(
      hasMeaningfulProjectSection({
        items: [{
          id: "item-id",
          project_section_id: "section-id",
          label: "Label only",
        }],
      }),
    ).toBe(false);
  });

  it("ignores hidden or archived skeletons but requires public evidence", () => {
    const result = getProjectCompleteness(
      {
        slug: "draft",
        title: "Draft",
        summary: "Draft summary",
        status: "draft",
      },
      [
        { body: "", is_visible: false },
        { body: "", is_archived: true },
      ],
    );

    expect(result.publishable).toBe(false);
    expect(result.blockingIssues.join(" ")).toContain("evidence");
  });

  it("reports metadata as warnings without preventing draft saves", () => {
    const result = getProjectCompleteness({
      slug: "draft",
      title: "Draft",
      summary: "Draft summary",
      status: "draft",
    }, [{ body: "Draft evidence", is_visible: true }]);

    expect(result.publishable).toBe(true);
    expect(result.warnings).toHaveLength(4);
  });

  it("blocks inconsistent publication state and invalid CTA URLs", () => {
    const result = getProjectCompleteness({
      slug: "bad-links",
      title: "Bad links",
      summary: "Summary",
      status: "published",
      published: false,
      demo_url: "javascript:alert(1)",
    }, [{ body: "Evidence", is_visible: true }]);

    expect(result.publishable).toBe(false);
    expect(result.blockingIssues.join(" ")).toContain("published=true");
    expect(result.blockingIssues.join(" ")).toContain("CTA URLs");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  PageBuilder,
  ProjectBuilder,
} from "@/components/admin/content-builder";

const callbacks = {
  status: "",
  onEdit: vi.fn(),
  onAdd: vi.fn(),
  onDuplicate: vi.fn(),
  onMove: vi.fn(),
  onHide: vi.fn(),
  onArchive: vi.fn(),
};

describe("owner-facing CMS builders", () => {
  it("shows grouped page settings and controlled ordered-block actions", () => {
    const pageId = "0d2e84ea-3b4e-4d19-969f-27269be950b9";
    const markup = renderToStaticMarkup(
      createElement(PageBuilder, {
        ...callbacks,
        records: {
          pages: [
            {
              id: pageId,
              page_key: "projects",
              title: "Projects",
              slug: "/projects",
              seo_title: "Analytics projects",
              seo_description: "Evidence-based analytics and automation work.",
              navigation_label: "Projects",
              navigation_order: 10,
              show_in_navigation: true,
              show_in_footer: true,
              is_published: true,
            },
          ],
          page_sections: [
            {
              id: "1d2e84ea-3b4e-4d19-969f-27269be950b9",
              page_id: pageId,
              section_key: "selected-work",
              section_type: "featured_projects",
              layout_variant: "grid-3",
              title: "Selected work",
              display_order: 10,
              is_visible: true,
              is_archived: false,
            },
            {
              id: "4d2e84ea-3b4e-4d19-969f-27269be950b9",
              page_id: pageId,
              section_key: "services",
              section_type: "custom_cards",
              layout_variant: "grid-2",
              title: "Services",
              display_order: 20,
              is_visible: true,
              is_archived: false,
            },
          ],
          page_section_items: [
            {
              id: "5d2e84ea-3b4e-4d19-969f-27269be950b9",
              page_section_id: "4d2e84ea-3b4e-4d19-969f-27269be950b9",
              title: "Commercial analytics",
              description: "Decision-ready analysis.",
              display_order: 0,
              is_visible: true,
            },
          ],
        },
      }),
    );

    expect(markup).toContain("Page Builder");
    expect(markup).toContain("SEO &amp; social preview");
    expect(markup).toContain("Navigation");
    expect(markup).toContain("Featured projects");
    expect(markup).toContain("grid-3");
    expect(markup).toContain("Add block");
    expect(markup).toContain("Duplicate");
    expect(markup).toContain("Move up");
    expect(markup).toContain("Move down");
    expect(markup).toContain("Hide");
    expect(markup).toContain("Archive");
    expect(markup).toContain("Supporting cards, facts &amp; media");
    expect(markup).toContain("Commercial analytics");
    expect(markup).toContain("Add supporting item");
    expect(markup).toContain("Remove");
  });

  it("selects projects by title and exposes a publication checklist", () => {
    const projectId = "2d2e84ea-3b4e-4d19-969f-27269be950b9";
    const markup = renderToStaticMarkup(
      createElement(ProjectBuilder, {
        ...callbacks,
        records: {
          projects: [
            {
              id: projectId,
              title: "RPA workflow",
              slug: "rpa-workflow",
              type: "Process automation",
              summary: "Validated workflow scope.",
              description: "Validated workflow scope and review boundary.",
              cover_image_url: "/projects/project-1.png",
              tags: ["RPA"],
              tools: ["UiPath"],
              status: "preparation",
              published: false,
              projects_page_order: 10,
            },
          ],
          project_sections: [
            {
              id: "3d2e84ea-3b4e-4d19-969f-27269be950b9",
              project_id: projectId,
              section_type: "rich_text",
              layout_variant: "compact",
              title: "Overview",
              body: "A concise evidence-based overview.",
              bullets: [],
              sort_order: 0,
              is_visible: true,
              is_archived: false,
            },
          ],
          project_section_items: [],
          project_media: [],
        },
      }),
    );

    expect(markup).toContain("Project Hub");
    expect(markup).toContain("RPA workflow");
    expect(markup).toContain("Publication checklist");
    expect(markup).toContain("Open Project Workspace");
    expect(markup).toContain("Overview");
    expect(markup).toContain("compact");
    expect(markup).toContain("Read-only summary");
    expect(markup).toContain("Facts &amp; supporting evidence");
    expect(markup).toContain("Read-only in Project Hub");
    expect(markup).toContain("Project media");
    expect(markup).toContain(
      "Media management is centralized in the Project Workspace.",
    );
  });
});

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  projectWorkspaceValuesSchema,
} from "@/lib/projects/project-workspace-validation";

const makeValues = (
  overrides:
    Record<
      string,
      unknown
    > = {},
) => ({
  title:
    "Revenue Intelligence",

  type:
    "Business Analytics",

  summary:
    "Commercial analytics project.",

  description:
    "",

  cover_image_url:
    "",

  card_image_url:
    "",

  open_graph_image:
    "",

  tags: [
    "Revenue Analytics",
  ],

  tools: [],

  seo_title:
    "",

  seo_description:
    "",

  project_group:
    "Additional Projects",

  organisation:
    "",

  status:
    "draft",

  home_featured_order:
    null,

  projects_page_order:
    10,

  featured:
    false,

  published:
    false,

  sort_order:
    10,

  role:
    "",

  start_date:
    null,

  end_date:
    null,

  machine_summary:
    "",

  ...overrides,
});

describe(
  "project workspace recommendation readiness",
  () => {
    it(
      "allows drafts without type or tags",
      () => {
        const result =
          projectWorkspaceValuesSchema
            .safeParse(
              makeValues({
                status:
                  "draft",

                published:
                  false,

                type: "",

                tags: [],
              }),
            );

        expect(
          result.success,
        ).toBe(true);
      },
    );

    it(
      "allows preparation projects without type or tags",
      () => {
        const result =
          projectWorkspaceValuesSchema
            .safeParse(
              makeValues({
                status:
                  "preparation",

                published:
                  false,

                type: "",

                tags: [],
              }),
            );

        expect(
          result.success,
        ).toBe(true);
      },
    );

    it(
      "rejects publication without a project type",
      () => {
        const result =
          projectWorkspaceValuesSchema
            .safeParse(
              makeValues({
                status:
                  "published",

                published:
                  true,

                type: "",
              }),
            );

        expect(
          result.success,
        ).toBe(false);

        if (result.success) {
          return;
        }

        expect(
          result.error.issues.some(
            (issue) =>
              issue.path[0] ===
                "type" &&
              issue.message ===
                "Add a project type before publishing.",
          ),
        ).toBe(true);
      },
    );

    it(
      "rejects publication without at least one domain tag",
      () => {
        const result =
          projectWorkspaceValuesSchema
            .safeParse(
              makeValues({
                status:
                  "published",

                published:
                  true,

                tags: [],
              }),
            );

        expect(
          result.success,
        ).toBe(false);

        if (result.success) {
          return;
        }

        expect(
          result.error.issues.some(
            (issue) =>
              issue.path[0] ===
                "tags" &&
              issue.message ===
                "Add at least one domain tag before publishing.",
          ),
        ).toBe(true);
      },
    );

    it(
      "keeps tools optional for published projects",
      () => {
        const result =
          projectWorkspaceValuesSchema
            .safeParse(
              makeValues({
                status:
                  "published",

                published:
                  true,

                type:
                  "Business Analytics",

                tags: [
                  "Revenue Analytics",
                ],

                tools: [],
              }),
            );

        expect(
          result.success,
        ).toBe(true);
      },
    );
  },
);
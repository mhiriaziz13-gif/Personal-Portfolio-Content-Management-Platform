import { z } from "zod";

import {
  assetUrlSchema,
  externalUrlSchema,
} from "@/lib/security/validation";

const optionalText = (max = 5000) =>
  z.preprocess(
    (value) => value ?? "",
    z.string().trim().max(max),
  );

const assetField = z.preprocess(
  (value) => value ?? "",
  assetUrlSchema,
);

const nullableDate = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? null
      : value,
  z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Use YYYY-MM-DD.",
    )
    .nullable(),
);

const nullableInteger = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? null
      : value,
  z
    .number()
    .int()
    .min(-10000)
    .max(10000)
    .nullable(),
);

const order = z
  .number()
  .int()
  .min(-10000)
  .max(10000);

const stringList = z
  .array(
    z.string().trim().min(1).max(300),
  )
  .max(100);

export const projectWorkspaceLinkSchema = z
  .object({
    link_type: z
      .string()
      .trim()
      .regex(/^[a-z0-9_-]{1,40}$/),

    label: optionalText(120),

    url: z.preprocess(
      (value) => value ?? "",
      externalUrlSchema.refine(
        (value) => Boolean(value),
        "URL is required.",
      ),
    ),

    display_order: order,

    is_visible: z.boolean(),
  })
  .strict();

export const projectWorkspaceValuesSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(500),

    type: optionalText(500),

    summary: optionalText(5000),

    description: optionalText(20000),

    cover_image_url: assetField,

    card_image_url: assetField,

    open_graph_image: assetField,

    tags: stringList,

    tools: stringList,

    seo_title: optionalText(500),

    seo_description: optionalText(5000),

    project_group: z
      .string()
      .trim()
      .min(1)
      .max(500),

    organisation: optionalText(500),

    status: z.enum([
      "draft",
      "preparation",
      "published",
      "archived",
    ]),

    home_featured_order: nullableInteger,

    projects_page_order: order,

    featured: z.boolean(),

    published: z.boolean(),

    sort_order: order,

    role: optionalText(500),

    start_date: nullableDate,

    end_date: nullableDate,

    machine_summary: optionalText(2000),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.start_date &&
      value.end_date &&
      value.end_date < value.start_date
    ) {
      context.addIssue({
        code: "custom",
        path: ["end_date"],
        message:
          "End date cannot precede start date.",
      });
    }

    if (
      value.published !==
      (value.status === "published")
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Published status and public visibility must match.",
      });
    }

    if (
      value.status === "archived" &&
      value.featured
    ) {
      context.addIssue({
        code: "custom",
        path: ["featured"],
        message:
          "Archived projects cannot remain featured.",
      });
    }
  });

export const projectWorkspaceMutationSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true }),

    values: projectWorkspaceValuesSchema,

    links: z
      .array(projectWorkspaceLinkSchema)
      .max(30),
  })
  .strict();

export const projectWorkspaceProjectIdSchema =
  z.string().uuid();
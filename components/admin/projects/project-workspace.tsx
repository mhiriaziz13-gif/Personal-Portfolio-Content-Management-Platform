"use client";

import Link from "next/link";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import {
  FiExternalLink,
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

import {
  adminApiError,
  adminFetch,
  readJsonObject,
} from "@/components/admin/admin-api";

import {
  type CmsField,
  CmsFieldInput,
  imageMimeTypes,
} from "@/components/admin/cms-field-input";

import { ProjectCaseStudyEditor } from "@/components/admin/projects/project-case-study-editor";

import type {
  ProjectWorkspaceLink,
  ProjectWorkspaceProject,
  ProjectWorkspaceSection,
  ProjectWorkspaceSectionDefinition,
  ProjectWorkspaceStatus,
} from "@/lib/projects/project-workspace-types";

type WorkspaceTab =
  | "overview"
  | "links"
  | "case_study"
  | "seo"
  | "publishing";

type Draft = {
  title: string;
  type: string;
  summary: string;
  description: string;

  cover_image_url: string;
  card_image_url: string;
  open_graph_image: string;

  tags: string[];
  tools: string[];

  seo_title: string;
  seo_description: string;

  project_group: string;
  organisation: string;

  status: ProjectWorkspaceStatus;

  home_featured_order:
    | number
    | null;

  projects_page_order: number;

  featured: boolean;
  published: boolean;

  sort_order: number;

  role: string;

  start_date: string;
  end_date: string;

  machine_summary: string;
};

const imageAccept =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const projectGroups = [
  "Featured Projects",
  "Professional Projects",
  "Additional Projects",
  "Technical Foundations",
  "Preparation",
  "Archived",
] as const;

const linkTypes = [
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["demo", "Live demo"],
  ["case_study", "Case study"],
  ["external", "External"],
] as const;

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2.5 text-white outline-none transition focus:border-cyan-300/60";

const textareaClass =
  `${inputClass} min-h-32 resize-y`;

const cardClass =
  "rounded-xl border border-white/10 bg-white/5 p-5";

const toDraft = (
  project:
    ProjectWorkspaceProject,
): Draft => ({
  title:
    project.title ?? "",

  type:
    project.type ?? "",

  summary:
    project.summary ?? "",

  description:
    project.description ?? "",

  cover_image_url:
    project.cover_image_url ??
    "",

  card_image_url:
    project.card_image_url ??
    "",

  open_graph_image:
    project.open_graph_image ??
    "",

  tags:
    Array.isArray(project.tags)
      ? project.tags
      : [],

  tools:
    Array.isArray(project.tools)
      ? project.tools
      : [],

  seo_title:
    project.seo_title ?? "",

  seo_description:
    project.seo_description ??
    "",

  project_group:
    project.project_group ||
    "Additional Projects",

  organisation:
    project.organisation ?? "",

  status:
    project.status,

  home_featured_order:
    project.home_featured_order,

  projects_page_order:
    project.projects_page_order ??
    0,

  featured:
    Boolean(project.featured),

  published:
    Boolean(project.published),

  sort_order:
    project.sort_order ?? 0,

  role:
    project.role ?? "",

  start_date:
    project.start_date ?? "",

  end_date:
    project.end_date ?? "",

  machine_summary:
    project.machine_summary ?? "",
});

const normalizeLinks = (
  links:
    ProjectWorkspaceLink[],
) =>
  [...links]
    .sort(
      (left, right) =>
        left.display_order -
        right.display_order,
    )
    .map((link) => ({
      ...link,

      label:
        link.label ?? "",

      is_visible:
        link.is_visible !== false,
    }));

const comparable = (
  draft: Draft,
  links:
    ProjectWorkspaceLink[],
) =>
  JSON.stringify({
    draft,

    links:
      normalizeLinks(links).map(
        ({
          link_type,
          label,
          url,
          display_order,
          is_visible,
        }) => ({
          link_type,
          label,
          url,
          display_order,
          is_visible,
        }),
      ),
  });

const coverField: CmsField = {
  key:
    "cover_image_url",

  label:
    "Cover image",

  kind:
    "asset-image",

  bucket:
    "project-images",

  accept:
    imageAccept,

  allowedMimeTypes:
    imageMimeTypes,
};

const cardImageField: CmsField = {
  key:
    "card_image_url",

  label:
    "Project card image",

  kind:
    "asset-image",

  bucket:
    "project-images",

  accept:
    imageAccept,

  allowedMimeTypes:
    imageMimeTypes,
};

const ogImageField: CmsField = {
  key:
    "open_graph_image",

  label:
    "Open Graph image",

  kind:
    "asset-image",

  bucket:
    "project-images",

  accept:
    imageAccept,

  allowedMimeTypes:
    imageMimeTypes,
};

const tagsField: CmsField = {
  key: "tags",
  label: "Tags",
  kind: "list",
};

const toolsField: CmsField = {
  key: "tools",
  label: "Tools / technologies",
  kind: "list",
};

export function ProjectWorkspace({
  initialProject,
  initialLinks,
  initialSections,
  sectionDefinitions,
  sectionCount,
  mediaCount,
}: {
  initialProject:
    ProjectWorkspaceProject;

  initialLinks:
    ProjectWorkspaceLink[];

  initialSections:
    ProjectWorkspaceSection[];

  sectionDefinitions:
    ProjectWorkspaceSectionDefinition[];

  sectionCount: number;

  mediaCount: number;
}) {
  const [project, setProject] =
    useState(initialProject);

  const [draft, setDraft] =
    useState<Draft>(
      () =>
        toDraft(
          initialProject,
        ),
    );

  const [links, setLinks] =
    useState<
      ProjectWorkspaceLink[]
    >(
      () =>
        normalizeLinks(
          initialLinks,
        ),
    );

  const [baseline, setBaseline] =
    useState(
      () =>
        comparable(
          toDraft(
            initialProject,
          ),
          initialLinks,
        ),
    );

  const [tab, setTab] =
    useState<WorkspaceTab>(
      "overview",
    );

  const [status, setStatus] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const dirty = useMemo(
    () =>
      comparable(
        draft,
        links,
      ) !== baseline,
    [
      baseline,
      draft,
      links,
    ],
  );

  const setField = <
    Key extends keyof Draft,
  >(
    key: Key,
    value: Draft[Key],
  ) => {
    setDraft(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const setWorkflowState = (
    value:
      ProjectWorkspaceStatus,
  ) => {
    setDraft(
      (current) => ({
        ...current,

        status: value,

        published:
          value ===
          "published",

        featured:
          value ===
          "archived"
            ? false
            : current.featured,

        project_group:
          value ===
          "archived"
            ? "Archived"
            : current.project_group,
      }),
    );
  };

  const updateLink = (
    index: number,
    changes:
      Partial<ProjectWorkspaceLink>,
  ) => {
    setLinks(
      (current) =>
        current.map(
          (link, linkIndex) =>
            linkIndex === index
              ? {
                  ...link,
                  ...changes,
                }
              : link,
        ),
    );
  };

  const addLink = () => {
    setLinks(
      (current) => [
        ...current,

        {
          link_type:
            "external",

          label:
            "External link",

          url: "",

          display_order:
            current.length
              ? Math.max(
                  ...current.map(
                    (link) =>
                      link.display_order,
                  ),
                ) + 10
              : 10,

          is_visible:
            true,
        },
      ],
    );
  };

  const removeLink = (
    index: number,
  ) => {
    setLinks(
      (current) =>
        current.filter(
          (_, linkIndex) =>
            linkIndex !== index,
        ),
    );
  };

  const save = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      saving ||
      !dirty
    ) {
      return;
    }

    setSaving(true);
    setStatus(
      "Saving project workspace...",
    );

    try {
      const response =
        await adminFetch(
          `/api/admin/projects/${project.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                expectedUpdatedAt:
                  project.updated_at,

                values: {
                  ...draft,

                  start_date:
                    draft.start_date ||
                    null,

                  end_date:
                    draft.end_date ||
                    null,
                },

                links:
                  links.map(
                    ({
                      link_type,
                      label,
                      url,
                      display_order,
                      is_visible,
                    }) => ({
                      link_type,
                      label:
                        label ??
                        "",
                      url,
                      display_order,
                      is_visible,
                    }),
                  ),
              }),
          },
        );

      const data =
        await readJsonObject(
          response,
        );

      const savedProject =
        data.project &&
        typeof data.project ===
          "object" &&
        !Array.isArray(
          data.project,
        )
          ? data.project as
              unknown as
              ProjectWorkspaceProject
          : null;

      const savedLinks =
        Array.isArray(
          data.links,
        )
          ? data.links as
              ProjectWorkspaceLink[]
          : null;

      if (
        !response.ok ||
        data.ok !== true ||
        !savedProject ||
        !savedLinks
      ) {
        setStatus(
          adminApiError(data),
        );

        return;
      }

      const nextDraft =
        toDraft(
          savedProject,
        );

      const nextLinks =
        normalizeLinks(
          savedLinks,
        );

      setProject(
        savedProject,
      );

      setDraft(
        nextDraft,
      );

      setLinks(
        nextLinks,
      );

      setBaseline(
        comparable(
          nextDraft,
          nextLinks,
        ),
      );

      setStatus(
        "Project workspace saved.",
      );
    } catch {
      setStatus(
        "The project workspace could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs:
    Array<{
      id: WorkspaceTab;
      label: string;
    }> = [
      {
        id: "overview",
        label: "Overview",
      },

      {
        id: "links",
        label: "Links",
      },
      {
        id: "case_study",
        label: `Case Study (${sectionCount})`,
     },
      {
        id: "seo",
        label: "SEO & AI",
      },

      {
        id: "publishing",
        label: "Publishing",
      },
    ];

  return (
    <form
      onSubmit={save}
      className="mt-6"
    >
      <header className="rounded-xl border border-white/10 bg-[#100b24]/90 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              Project Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              {draft.title ||
                "Untitled project"}
            </h1>

            <p className="mt-2 break-all font-mono text-xs text-gray-500">
              /projects/
              {project.slug}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/5 px-3 py-1 text-gray-300">
                {
                  draft.status
                }
              </span>

              <span className="rounded-full bg-white/5 px-3 py-1 text-gray-300">
                {
                  sectionCount
                }{" "}
                sections
              </span>

              <span className="rounded-full bg-white/5 px-3 py-1 text-gray-300">
                {
                  mediaCount
                }{" "}
                media
              </span>

              {dirty && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {project.published &&
              project.status ===
                "published" && (
                <Link
                  href={`/projects/${project.slug}`}
                  target="_blank"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-100 hover:bg-white/10"
                >
                  <FiExternalLink
                    aria-hidden="true"
                  />

                  Preview
                </Link>
              )}

            <button
              type="submit"
              disabled={
                saving ||
                !dirty
              }
              className="button-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSave
                aria-hidden="true"
              />

              {saving
                ? "Saving..."
                : "Save"}
            </button>
          </div>
        </div>

        <nav
          aria-label="Project workspace"
          className="mt-6 flex gap-2 overflow-x-auto border-t border-white/10 pt-4"
        >
          {tabs.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setTab(
                    item.id,
                  )
                }
                className={`min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab ===
                  item.id
                    ? "bg-cyan-300/15 text-cyan-100"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {
                  item.label
                }
              </button>
            ),
          )}
        </nav>
      </header>

      {tab ===
        "overview" && (
        <div className="mt-5 grid gap-5">
          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Project identity
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Title
                </span>

                <input
                  required
                  value={
                    draft.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "title",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Slug
                </span>

                <input
                  readOnly
                  value={
                    project.slug
                  }
                  className={`${inputClass} cursor-not-allowed opacity-60`}
                />

                <span className="text-xs text-gray-500">
                  Slug
                  renaming is
                  intentionally
                  protected until
                  the redirect
                  system is added.
                </span>
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Type
                </span>

                <input
                  value={
                    draft.type
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "type",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Organisation /
                  client
                </span>

                <input
                  value={
                    draft.organisation
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "organisation",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Your role
                </span>

                <input
                  value={
                    draft.role
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "role",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Project group
                </span>

                <select
                  value={
                    draft.project_group
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "project_group",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  {projectGroups.map(
                    (group) => (
                      <option
                        key={
                          group
                        }
                        value={
                          group
                        }
                      >
                        {
                          group
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Start date
                </span>

                <input
                  type="date"
                  value={
                    draft.start_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "start_date",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  End date
                </span>

                <input
                  type="date"
                  value={
                    draft.end_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "end_date",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Recruiter-facing content
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Short summary
                </span>

                <textarea
                  value={
                    draft.summary
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "summary",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    textareaClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Full description
                </span>

                <textarea
                  value={
                    draft.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "description",
                      event
                        .target
                        .value,
                    )
                  }
                  className={`${textareaClass} min-h-44`}
                />
              </label>

              <CmsFieldInput
                field={
                  tagsField
                }
                value={
                  draft.tags
                }
                request={
                  adminFetch
                }
                onChange={(
                  value,
                ) =>
                  setField(
                    "tags",
                    Array.isArray(
                      value,
                    )
                      ? value.map(
                          String,
                        )
                      : [],
                  )
                }
              />

              <CmsFieldInput
                field={
                  toolsField
                }
                value={
                  draft.tools
                }
                request={
                  adminFetch
                }
                onChange={(
                  value,
                ) =>
                  setField(
                    "tools",
                    Array.isArray(
                      value,
                    )
                      ? value.map(
                          String,
                        )
                      : [],
                  )
                }
              />
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Primary media
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              These assets control
              the project page,
              project card and
              social preview.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <CmsFieldInput
                field={
                  coverField
                }
                value={
                  draft.cover_image_url
                }
                request={
                  adminFetch
                }
                onChange={(
                  value,
                ) =>
                  setField(
                    "cover_image_url",
                    typeof value ===
                      "string"
                      ? value
                      : "",
                  )
                }
              />

              <CmsFieldInput
                field={
                  cardImageField
                }
                value={
                  draft.card_image_url
                }
                request={
                  adminFetch
                }
                onChange={(
                  value,
                ) =>
                  setField(
                    "card_image_url",
                    typeof value ===
                      "string"
                      ? value
                      : "",
                  )
                }
              />
            </div>
          </section>
        </div>
      )}

      {tab === "links" && (
        <section
          className={`mt-5 ${cardClass}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Project links
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                GitHub, LinkedIn,
                live demos, case
                studies and future
                external resources.
              </p>
            </div>

            <button
              type="button"
              onClick={addLink}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/15"
            >
              <FiPlus
                aria-hidden="true"
              />
              Add link
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {links.map(
              (
                link,
                index,
              ) => (
                <article
                  key={`${link.id ?? "new"}-${index}`}
                  className="grid gap-4 rounded-lg border border-white/10 bg-black/10 p-4 lg:grid-cols-[10rem_1fr_1.5fr_7rem_auto]"
                >
                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Type
                    </span>

                    <select
                      value={
                        link.link_type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateLink(
                          index,
                          {
                            link_type:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      {linkTypes.map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {
                              label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Label
                    </span>

                    <input
                      value={
                        link.label ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateLink(
                          index,
                          {
                            label:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      HTTPS URL
                    </span>

                    <input
                      type="url"
                      required
                      value={
                        link.url
                      }
                      onChange={(
                        event,
                      ) =>
                        updateLink(
                          index,
                          {
                            url:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Order
                    </span>

                    <input
                      type="number"
                      value={
                        link.display_order
                      }
                      onChange={(
                        event,
                      ) =>
                        updateLink(
                          index,
                          {
                            display_order:
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <div className="flex items-end gap-2">
                    <label className="flex min-h-11 items-center gap-2 px-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={
                          link.is_visible
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLink(
                            index,
                            {
                              is_visible:
                                event
                                  .target
                                  .checked,
                            },
                          )
                        }
                      />
                      Visible
                    </label>

                    <button
                      type="button"
                      aria-label={`Remove ${link.label || link.link_type}`}
                      onClick={() =>
                        removeLink(
                          index,
                        )
                      }
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <FiTrash2
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </article>
              ),
            )}

            {links.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
                No links yet.
              </p>
            )}
          </div>
        </section>
      )}
      {tab ===
  "case_study" && (
  <ProjectCaseStudyEditor
    projectId={
      project.id
    }
    initialSections={
      initialSections
    }
    sectionDefinitions={
      sectionDefinitions
    }
  />
)}
      {tab === "seo" && (
        <div className="mt-5 grid gap-5">
          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Search metadata
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  SEO title
                </span>

                <input
                  value={
                    draft.seo_title
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "seo_title",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  SEO description
                </span>

                <textarea
                  value={
                    draft.seo_description
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "seo_description",
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    textareaClass
                  }
                />
              </label>

              <CmsFieldInput
                field={
                  ogImageField
                }
                value={
                  draft.open_graph_image
                }
                request={
                  adminFetch
                }
                onChange={(
                  value,
                ) =>
                  setField(
                    "open_graph_image",
                    typeof value ===
                      "string"
                      ? value
                      : "",
                  )
                }
              />
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              AI-readable summary
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              Keep this factual
              and concise. It will
              later feed structured
              data and AI discovery
              surfaces.
            </p>

            <textarea
              value={
                draft.machine_summary
              }
              onChange={(
                event,
              ) =>
                setField(
                  "machine_summary",
                  event
                    .target
                    .value,
                )
              }
              maxLength={
                2000
              }
              className={`mt-5 ${textareaClass}`}
            />

            <p className="mt-2 text-right text-xs text-gray-500">
              {
                draft
                  .machine_summary
                  .length
              }
              /2000
            </p>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-white">
              Preview
            </h2>

            <p className="mt-4 text-lg font-medium text-cyan-100">
              {draft.seo_title ||
                draft.title}
            </p>

            <p className="mt-1 text-sm text-emerald-200">
              ahmedaziz-portfolio.vercel.app/projects/
              {project.slug}
            </p>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              {draft.seo_description ||
                draft.summary ||
                "No search description yet."}
            </p>
          </section>
        </div>
      )}

      {tab ===
        "publishing" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Publication state
            </h2>

            <label className="mt-5 grid gap-2 text-sm text-gray-300">
              <span>
                State
              </span>

              <select
                value={
                  draft.status
                }
                onChange={(
                  event,
                ) =>
                  setWorkflowState(
                    event
                      .target
                      .value as
                      ProjectWorkspaceStatus,
                  )
                }
                className={
                  inputClass
                }
              >
                <option value="draft">
                  Draft
                </option>

                <option value="preparation">
                  Preparation
                </option>

                <option value="published">
                  Published
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>
            </label>

            <div className="mt-5 rounded-lg border border-white/10 bg-black/10 p-4 text-sm text-gray-300">
              <p>
                Public flag:{" "}
                <strong className="text-white">
                  {draft.published
                    ? "ON"
                    : "OFF"}
                </strong>
              </p>

              <p className="mt-2">
                Published at:{" "}
                {project.published_at ||
                  "Never"}
              </p>

              <p className="mt-2">
                Archived at:{" "}
                {project.archived_at ||
                  "No"}
              </p>

              <p className="mt-2">
                Deletion lifecycle:{" "}
                {project.deletion_status}
              </p>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold text-white">
              Placement
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="flex min-h-11 items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={
                    draft.featured
                  }
                  disabled={
                    draft.status ===
                    "archived"
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "featured",
                      event
                        .target
                        .checked,
                    )
                  }
                />

                Featured project
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Projects page
                  order
                </span>

                <input
                  type="number"
                  value={
                    draft.projects_page_order
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "projects_page_order",
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Homepage
                  featured order
                </span>

                <input
                  type="number"
                  value={
                    draft.home_featured_order ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "home_featured_order",
                      event
                        .target
                        .value ===
                        ""
                        ? null
                        : Number(
                            event
                              .target
                              .value,
                          ),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Internal sort
                  order
                </span>

                <input
                  type="number"
                  value={
                    draft.sort_order
                  }
                  onChange={(
                    event,
                  ) =>
                    setField(
                      "sort_order",
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>
            </div>
          </section>
        </div>
      )}

      <section className="mt-5 rounded-xl border border-purple-300/15 bg-purple-300/5 p-5">
        <h2 className="font-semibold text-white">
          Case Study & Media
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-300">
          This project currently
          contains {sectionCount}{" "}
          case-study sections and{" "}
          {mediaCount} media items.
          They remain managed by
          the existing Project
          Builder during Wave 2B.
          Wave 2C will move these
          tools directly into this
          workspace.
        </p>

        <Link
          href="/admin"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-100 hover:bg-white/10"
        >
          Open current Project
          Builder
        </Link>
      </section>

      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#100b24]/95 p-4 shadow-2xl backdrop-blur">
        <p
          aria-live="polite"
          className="text-sm text-cyan-100"
        >
          {status ||
            (dirty
              ? "Unsaved changes."
              : "All changes saved.")}
        </p>

        <button
          type="submit"
          disabled={
            saving ||
            !dirty
          }
          className="button-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSave
            aria-hidden="true"
          />

          {saving
            ? "Saving..."
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}
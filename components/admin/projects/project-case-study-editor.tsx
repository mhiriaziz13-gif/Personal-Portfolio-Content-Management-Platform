"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

import {
  adminApiError,
  adminFetch,
  readJsonObject,
} from "@/components/admin/admin-api";

import type {
  ProjectWorkspaceSection,
  ProjectWorkspaceSectionDefinition,
  ProjectWorkspaceSectionItem,
  ProjectWorkspaceSectionType,
} from "@/lib/projects/project-workspace-types";

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2.5 text-white outline-none transition focus:border-cyan-300/60";

const textareaClass =
  `${inputClass} min-h-32 resize-y`;

const cardClass =
  "rounded-xl border border-white/10 bg-white/5 p-5";

type SectionDraft = {
  title: string;

  body: string;

  bullets: string[];

  sort_order: number;

  section_type:
    ProjectWorkspaceSectionType;

  layout_variant: string;

  is_visible: boolean;

  is_archived: boolean;
};

const layoutsFor = (
  sectionType:
    ProjectWorkspaceSectionType,
) =>
  sectionType ===
  "media_gallery"
    ? [
        "default",
        "compact",
        "grid-2",
        "grid-3",
      ]
    : [
        "default",
        "compact",
        "split",
      ];

const toSectionDraft = (
  section:
    ProjectWorkspaceSection,
): SectionDraft => ({
  title:
    section.title ??
    "",

  body:
    section.body ??
    "",

  bullets:
    Array.isArray(
      section.bullets,
    )
      ? section.bullets
      : [],

  sort_order:
    section.sort_order ??
    0,

  section_type:
    section.section_type,

  layout_variant:
    section.layout_variant ||
    "default",

  is_visible:
    section.is_visible,

  is_archived:
    section.is_archived,
});

type ItemDraft = {
  label: string;
  value: string;
  description: string;

  display_order: number;

  is_visible: boolean;
};

const toItemDraft = (
  item:
    ProjectWorkspaceSectionItem,
): ItemDraft => ({
  label:
    item.label ?? "",

  value:
    item.value ?? "",

  description:
    item.description ??
    "",

  display_order:
    item.display_order ??
    0,

  is_visible:
    item.is_visible,
});

export function ProjectCaseStudyEditor({
  projectId,
  initialSections,
  sectionDefinitions,
}: {
  projectId: string;

  initialSections:
    ProjectWorkspaceSection[];

  sectionDefinitions:
    ProjectWorkspaceSectionDefinition[];
}) {
  const initialSection =
    initialSections[0] ??
    null;

  const [
    sections,
    setSections,
  ] = useState(
    initialSections,
  );

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    initialSection?.id ??
      "",
  );

  const [
    draft,
    setDraft,
  ] =
    useState<SectionDraft | null>(
      initialSection
        ? toSectionDraft(
            initialSection,
          )
        : null,
    );

  const [
    sectionStatus,
    setSectionStatus,
  ] = useState("");

  const [
    sectionSaving,
    setSectionSaving,
  ] = useState(false);

  const [
    newItem,
    setNewItem,
  ] =
    useState<ItemDraft>({
      label: "",
      value: "",
      description: "",
      display_order: 10,
      is_visible: true,
    });

  const [
    itemStatus,
    setItemStatus,
  ] = useState("");

  const [
    addingItem,
    setAddingItem,
  ] = useState(false);

  const selected =
    useMemo(
      () =>
        sections.find(
          (section) =>
            section.id ===
            selectedId,
        ) ?? null,
      [
        sections,
        selectedId,
      ],
    );

  const selectSection = (
    section:
      ProjectWorkspaceSection,
  ) => {
    setSelectedId(
      section.id,
    );

    setDraft(
      toSectionDraft(
        section,
      ),
    );

    setSectionStatus(
      "",
    );

    setItemStatus(
      "",
    );

    const nextOrder =
      section.items.length
        ? Math.max(
            ...section.items.map(
              (item) =>
                item.display_order,
            ),
          ) + 10
        : 10;

    setNewItem({
      label: "",
      value: "",
      description: "",
      display_order:
        nextOrder,
      is_visible: true,
    });
  };

  const updateSelectedSection = (
    updated:
      ProjectWorkspaceSection,
  ) => {
    setSections(
      (current) =>
        current.map(
          (section) =>
            section.id ===
            updated.id
              ? updated
              : section,
        ),
    );
  };

  const saveSection =
    async () => {
      if (
        !selected ||
        !draft ||
        sectionSaving
      ) {
        return;
      }

      setSectionSaving(
        true,
      );

      setSectionStatus(
        "Saving case-study section...",
      );

      try {
        const response =
          await adminFetch(
            "/api/admin/content",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  table:
                    "project_sections",

                  expectedUpdatedAt:
                    selected.updated_at,

                  values: {
                    id:
                      selected.id,

                    project_id:
                      projectId,

                    section_type:
                      draft.section_type,

                    layout_variant:
                      draft.layout_variant,

                    title:
                      draft.title,

                    body:
                      draft.body,

                    bullets:
                      draft.bullets,

                    sort_order:
                      draft.sort_order,

                    is_visible:
                      draft.is_visible,

                    is_archived:
                      draft.is_archived,
                  },
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        const savedRow =
          data.row &&
          typeof data.row ===
            "object" &&
          !Array.isArray(
            data.row,
          )
            ? data.row as
                unknown as
                Omit<
                  ProjectWorkspaceSection,
                  | "definition"
                  | "items"
                >
            : null;

        if (
          !response.ok ||
          data.ok !== true ||
          !savedRow
        ) {
          setSectionStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        const updated: ProjectWorkspaceSection =
          {
            ...selected,
            ...savedRow,

            definition:
              selected.definition,

            items:
              selected.items,
          };

        updateSelectedSection(
          updated,
        );

        setDraft(
          toSectionDraft(
            updated,
          ),
        );

        setSectionStatus(
          "Case-study section saved.",
        );
      } catch {
        setSectionStatus(
          "The case-study section could not be saved.",
        );
      } finally {
        setSectionSaving(
          false,
        );
      }
    };

  const updateItemInSection = (
    item:
      ProjectWorkspaceSectionItem,
  ) => {
    if (!selected) {
      return;
    }

    const exists =
      selected.items.some(
        (current) =>
          current.id ===
          item.id,
      );

    const items =
      exists
        ? selected.items.map(
            (current) =>
              current.id ===
              item.id
                ? item
                : current,
          )
        : [
            ...selected.items,
            item,
          ];

    items.sort(
      (left, right) =>
        left.display_order -
        right.display_order,
    );

    updateSelectedSection({
      ...selected,
      items,
    });
  };

  const removeItemFromSection = (
    itemId: string,
  ) => {
    if (!selected) {
      return;
    }

    updateSelectedSection({
      ...selected,

      items:
        selected.items.filter(
          (item) =>
            item.id !==
            itemId,
        ),
    });
  };

  const addItem =
    async () => {
      if (
        !selected ||
        addingItem
      ) {
        return;
      }

      if (
        !newItem.label.trim() &&
        !newItem.value.trim() &&
        !newItem.description.trim()
      ) {
        setItemStatus(
          "Enter at least one item value before adding it.",
        );

        return;
      }

      setAddingItem(
        true,
      );

      setItemStatus(
        "Adding supporting item...",
      );

      try {
        const response =
          await adminFetch(
            "/api/admin/content",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  table:
                    "project_section_items",

                  values: {
                    project_section_id:
                      selected.id,

                    label:
                      newItem.label,

                    value:
                      newItem.value,

                    description:
                      newItem.description,

                    display_order:
                      newItem.display_order,

                    is_visible:
                      newItem.is_visible,
                  },
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        const savedItem =
          data.row &&
          typeof data.row ===
            "object" &&
          !Array.isArray(
            data.row,
          )
            ? data.row as
                unknown as
                ProjectWorkspaceSectionItem
            : null;

        if (
          !response.ok ||
          data.ok !== true ||
          !savedItem
        ) {
          setItemStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        updateItemInSection(
          savedItem,
        );

        setNewItem({
          label: "",
          value: "",
          description: "",

          display_order:
            savedItem.display_order +
            10,

          is_visible:
            true,
        });

        setItemStatus(
          "Supporting item added.",
        );
      } catch {
        setItemStatus(
          "The supporting item could not be added.",
        );
      } finally {
        setAddingItem(
          false,
        );
      }
    };

  if (
    sections.length === 0
  ) {
    return (
      <section
        className={`mt-5 ${cardClass}`}
      >
        <h2 className="text-xl font-semibold text-white">
          Case Study
        </h2>

        <p className="mt-3 text-sm text-gray-400">
          No project
          sections are
          available for
          this project.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <aside
        className={
          cardClass
        }
      >
        <h2 className="text-lg font-semibold text-white">
          Case Study
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          Select a
          canonical section
          to edit its
          recruiter-facing
          content.
        </p>

        <div className="mt-5 grid gap-2">
          {sections.map(
            (section) => {
              const definition =
                section.definition;

              return (
                <button
                  key={
                    section.id
                  }
                  type="button"
                  onClick={() =>
                    selectSection(
                      section,
                    )
                  }
                  className={`rounded-lg border p-3 text-left transition ${
                    selectedId ===
                    section.id
                      ? "border-cyan-300/40 bg-cyan-300/10"
                      : "border-white/10 bg-black/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {
                        section.title
                      }
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                        section.is_visible &&
                        !section.is_archived
                          ? "bg-emerald-500/15 text-emerald-100"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {section.is_archived
                        ? "Archived"
                        : section.is_visible
                          ? "Visible"
                          : "Hidden"}
                    </span>
                  </div>

                  {definition && (
                    <p className="mt-1 font-mono text-[0.65rem] text-gray-500">
                      {
                        definition.section_key
                      }
                    </p>
                  )}
                </button>
              );
            },
          )}
        </div>

        {sectionDefinitions.length >
          0 && (
          <p className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
            {
              sectionDefinitions.length
            }{" "}
            canonical
            section
            definitions
            available.
          </p>
        )}
      </aside>

      {selected &&
        draft && (
        <div className="grid min-w-0 gap-5">
          <section
            className={
              cardClass
            }
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Case Study
                  Section
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {
                    selected.title
                  }
                </h2>

                {selected
                  .definition
                  ?.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                    {
                      selected
                        .definition
                        .description
                    }
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {selected
                    .definition
                    ?.is_required && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-100">
                      Required
                    </span>
                  )}

                  {selected
                    .definition
                    ?.supports_items && (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300">
                      Supports
                      items
                    </span>
                  )}

                  {selected
                    .definition
                    ?.supports_media && (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300">
                      Supports
                      media
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void saveSection()
                }
                disabled={
                  sectionSaving
                }
                className="button-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                <FiSave
                  aria-hidden="true"
                />

                {sectionSaving
                  ? "Saving..."
                  : "Save section"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Section
                  title
                </span>

                <input
                  value={
                    draft.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        current,
                      ) =>
                        current
                          ? {
                              ...current,
                              title:
                                event
                                  .target
                                  .value,
                            }
                          : current,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Section
                  type
                </span>

                <select
                  value={
                    draft.section_type
                  }
                  onChange={(
                    event,
                  ) => {
                    const sectionType =
                      event
                        .target
                        .value as
                        ProjectWorkspaceSectionType;

                    setDraft(
                      (
                        current,
                      ) => {
                        if (
                          !current
                        ) {
                          return current;
                        }

                        const layouts =
                          layoutsFor(
                            sectionType,
                          );

                        return {
                          ...current,

                          section_type:
                            sectionType,

                          layout_variant:
                            layouts.includes(
                              current.layout_variant,
                            )
                              ? current.layout_variant
                              : "default",
                        };
                      },
                    );
                  }}
                  className={
                    inputClass
                  }
                >
                  <option value="rich_text">
                    Rich text
                  </option>

                  <option value="media_gallery">
                    Media gallery
                  </option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Layout
                </span>

                <select
                  value={
                    draft.layout_variant
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        current,
                      ) =>
                        current
                          ? {
                              ...current,
                              layout_variant:
                                event
                                  .target
                                  .value,
                            }
                          : current,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  {layoutsFor(
                    draft.section_type,
                  ).map(
                    (
                      layout,
                    ) => (
                      <option
                        key={
                          layout
                        }
                        value={
                          layout
                        }
                      >
                        {
                          layout
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                <span>
                  Display
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
                    setDraft(
                      (
                        current,
                      ) =>
                        current
                          ? {
                              ...current,
                              sort_order:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            }
                          : current,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-sm text-gray-300">
              <span>
                Section
                content
              </span>

              <textarea
                value={
                  draft.body
                }
                onChange={(
                  event,
                ) =>
                  setDraft(
                    (
                      current,
                    ) =>
                      current
                        ? {
                            ...current,
                            body:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
                className={`${textareaClass} min-h-52`}
              />
            </label>

            <label className="mt-4 grid gap-2 text-sm text-gray-300">
              <span>
                Bullet
                points
              </span>

              <textarea
                value={draft.bullets.join(
                  "\n",
                )}
                onChange={(
                  event,
                ) =>
                  setDraft(
                    (
                      current,
                    ) =>
                      current
                        ? {
                            ...current,
                            bullets:
                              event
                                .target
                                .value
                                .split(
                                  "\n",
                                )
                                .map(
                                  (
                                    item,
                                  ) =>
                                    item.trim(),
                                )
                                .filter(
                                  Boolean,
                                ),
                          }
                        : current,
                  )
                }
                className={
                  textareaClass
                }
                placeholder="One bullet per line"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-6">
              <label className="flex items-center gap-3 text-sm text-gray-300">
  <input
    type="checkbox"
    checked={
      draft.is_visible &&
      !draft.is_archived
    }
    disabled={
      draft.is_archived
    }
    onChange={(
      event,
    ) =>
      setDraft(
        (
          current,
        ) =>
          current
            ? {
                ...current,
                is_visible:
                  event
                    .target
                    .checked,
              }
            : current,
      )
    }
    className="h-5 w-5 accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
  />

  Visible
</label>

              <label className="flex items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={
                    draft.is_archived
                  }
                  onChange={(
  event,
) =>
  setDraft(
    (
      current,
    ) => {
      if (!current) {
        return current;
      }

      const archived =
        event.target.checked;

      return {
        ...current,

        is_archived:
          archived,

        is_visible:
          archived
            ? false
            : current.is_visible,
      };
    },
  )
}
disabled={
  selected.definition
    ?.is_required === true
}
                  className="h-5 w-5 accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                />

                Archived
              </label>
            </div>

            <p
              className="mt-4 min-h-5 text-sm text-cyan-100"
              aria-live="polite"
            >
              {
                sectionStatus
              }
            </p>
          </section>

          {selected
            .definition
            ?.supports_items && (
            <section
              className={
                cardClass
              }
            >
              <h3 className="text-xl font-semibold text-white">
                Supporting
                facts,
                metrics and
                evidence
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Add
                structured
                evidence
                displayed
                inside this
                section.
              </p>

              <div className="mt-5 grid gap-4">
                {selected.items.map(
                  (
                    item,
                  ) => (
                    <CaseStudyItemEditor
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      onSaved={
                        updateItemInSection
                      }
                      onDeleted={
                        removeItemFromSection
                      }
                    />
                  ),
                )}

                {selected.items
                  .length ===
                  0 && (
                  <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-gray-500">
                    No
                    supporting
                    items yet.
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                <h4 className="font-semibold text-white">
                  Add
                  supporting
                  item
                </h4>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Label
                    </span>

                    <input
                      value={
                        newItem.label
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewItem(
                          (
                            current,
                          ) => ({
                            ...current,
                            label:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                      placeholder="e.g. Result"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Value
                    </span>

                    <input
                      value={
                        newItem.value
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewItem(
                          (
                            current,
                          ) => ({
                            ...current,
                            value:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                      placeholder="e.g. 40 hotels"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
                    <span>
                      Supporting
                      description
                    </span>

                    <textarea
                      value={
                        newItem.description
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewItem(
                          (
                            current,
                          ) => ({
                            ...current,
                            description:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className={
                        textareaClass
                      }
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-gray-300">
                    <span>
                      Display
                      order
                    </span>

                    <input
                      type="number"
                      value={
                        newItem.display_order
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewItem(
                          (
                            current,
                          ) => ({
                            ...current,
                            display_order:
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                          }),
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label className="flex items-center gap-3 self-end pb-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={
                        newItem.is_visible
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewItem(
                          (
                            current,
                          ) => ({
                            ...current,
                            is_visible:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                      className="h-5 w-5 accent-cyan-400"
                    />

                    Visible
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void addItem()
                  }
                  disabled={
                    addingItem
                  }
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
                >
                  <FiPlus
                    aria-hidden="true"
                  />

                  {addingItem
                    ? "Adding..."
                    : "Add item"}
                </button>

                <p
                  className="mt-3 min-h-5 text-sm text-cyan-100"
                  aria-live="polite"
                >
                  {
                    itemStatus
                  }
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CaseStudyItemEditor({
  item,
  onSaved,
  onDeleted,
}: {
  item:
    ProjectWorkspaceSectionItem;

  onSaved: (
    item:
      ProjectWorkspaceSectionItem,
  ) => void;

  onDeleted: (
    itemId: string,
  ) => void;
}) {
  const [
    draft,
    setDraft,
  ] = useState(
    () =>
      toItemDraft(
        item,
      ),
  );

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const save =
    async () => {
      if (saving) {
        return;
      }

      setSaving(true);

      setStatus(
        "Saving item...",
      );

      try {
        const response =
          await adminFetch(
            "/api/admin/content",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  table:
                    "project_section_items",

                  expectedUpdatedAt:
                    item.updated_at,

                  values: {
                    id:
                      item.id,

                    project_section_id:
                      item.project_section_id,

                    label:
                      draft.label,

                    value:
                      draft.value,

                    description:
                      draft.description,

                    display_order:
                      draft.display_order,

                    is_visible:
                      draft.is_visible,
                  },
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        const savedItem =
          data.row &&
          typeof data.row ===
            "object" &&
          !Array.isArray(
            data.row,
          )
            ? data.row as
                unknown as
                ProjectWorkspaceSectionItem
            : null;

        if (
          !response.ok ||
          data.ok !== true ||
          !savedItem
        ) {
          setStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        onSaved(
          savedItem,
        );

        setDraft(
          toItemDraft(
            savedItem,
          ),
        );

        setStatus(
          "Item saved.",
        );
      } catch {
        setStatus(
          "The item could not be saved.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const remove =
    async () => {
      if (
        deleting
      ) {
        return;
      }

      setDeleting(
        true,
      );

      setStatus(
        "Deleting item...",
      );

      try {
        const response =
          await adminFetch(
            "/api/admin/content",
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  table:
                    "project_section_items",

                  id:
                    item.id,

                  expectedUpdatedAt:
                    item.updated_at,
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        if (
          !response.ok ||
          data.ok !== true
        ) {
          setStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        onDeleted(
          item.id,
        );
      } catch {
        setStatus(
          "The item could not be deleted.",
        );
      } finally {
        setDeleting(
          false,
        );
      }
    };

  return (
    <article className="rounded-lg border border-white/10 bg-black/10 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-gray-300">
          <span>
            Label
          </span>

          <input
            value={
              draft.label
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,
                  label:
                    event
                      .target
                      .value,
                }),
              )
            }
            className={
              inputClass
            }
          />
        </label>

        <label className="grid gap-2 text-sm text-gray-300">
          <span>
            Value
          </span>

          <input
            value={
              draft.value
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,
                  value:
                    event
                      .target
                      .value,
                }),
              )
            }
            className={
              inputClass
            }
          />
        </label>

        <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
          <span>
            Description
          </span>

          <textarea
            value={
              draft.description
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,
                  description:
                    event
                      .target
                      .value,
                }),
              )
            }
            className={
              textareaClass
            }
          />
        </label>

        <label className="grid gap-2 text-sm text-gray-300">
          <span>
            Display
            order
          </span>

          <input
            type="number"
            value={
              draft.display_order
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,
                  display_order:
                    Number(
                      event
                        .target
                        .value,
                    ),
                }),
              )
            }
            className={
              inputClass
            }
          />
        </label>

        <label className="flex items-center gap-3 self-end pb-3 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={
              draft.is_visible
            }
            onChange={(
              event,
            ) =>
              setDraft(
                (
                  current,
                ) => ({
                  ...current,
                  is_visible:
                    event
                      .target
                      .checked,
                }),
              )
            }
            className="h-5 w-5 accent-cyan-400"
          />

          Visible
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void save()
          }
          disabled={
            saving ||
            deleting
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
        >
          <FiSave
            aria-hidden="true"
          />

          {saving
            ? "Saving..."
            : "Save item"}
        </button>

        <button
          type="button"
          onClick={() =>
            void remove()
          }
          disabled={
            saving ||
            deleting
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-60"
        >
          <FiTrash2
            aria-hidden="true"
          />

          {deleting
            ? "Deleting..."
            : "Delete item"}
        </button>
      </div>

      <p
        className="mt-3 min-h-5 text-xs text-cyan-100"
        aria-live="polite"
      >
        {status}
      </p>
    </article>
  );
}
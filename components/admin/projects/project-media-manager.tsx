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

import {
  type CmsField,
  CmsFieldInput,
  imageMimeTypes,
} from "@/components/admin/cms-field-input";

import type {
  ProjectWorkspaceMedia,
  ProjectWorkspaceMediaType,
  ProjectWorkspaceSection,
} from "@/lib/projects/project-workspace-types";

type MediaDraft = {
  project_section_id:
    | string
    | null;

  media_url: string;

  alt_text: string;

  caption: string;

  media_type:
    ProjectWorkspaceMediaType;

  display_order: number;

  is_visible: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2.5 text-white outline-none transition focus:border-cyan-300/60";

const textareaClass =
  `${inputClass} min-h-28 resize-y`;

const imageField: CmsField = {
  key: "media_url",

  label: "Image asset",

  kind: "asset-image",

  bucket:
    "project-images",

  accept:
    ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",

  allowedMimeTypes:
    imageMimeTypes,
};

const toDraft = (
  item:
    ProjectWorkspaceMedia,
): MediaDraft => ({
  project_section_id:
    item.project_section_id,

  media_url:
    item.media_url,

  alt_text:
    item.alt_text,

  caption:
    item.caption ?? "",

  media_type:
    item.media_type,

  display_order:
    item.display_order,

  is_visible:
    item.is_visible,
});

const blankDraft = (
  displayOrder: number,
): MediaDraft => ({
  project_section_id:
    null,

  media_url: "",

  alt_text: "",

  caption: "",

  media_type:
    "image",

  display_order:
    displayOrder,

  is_visible:
    true,
});

const sortMedia = (
  items:
    ProjectWorkspaceMedia[],
) =>
  [...items].sort(
    (
      left,
      right,
    ) =>
      left.display_order -
        right.display_order ||
      left.id.localeCompare(
        right.id,
      ),
  );

const sectionSupportsMedia = (
  section:
    ProjectWorkspaceSection,
) =>
  !section.is_archived &&
  (
    section.definition
      ?.supports_media ===
      true ||
    (
      !section.definition &&
      section.section_type ===
        "media_gallery"
    )
  );

export function ProjectMediaManager({
  projectId,
  initialMedia,
  sections,
  onCountChange,
}: {
  projectId: string;

  initialMedia:
    ProjectWorkspaceMedia[];

  sections:
    ProjectWorkspaceSection[];

  onCountChange?: (
    count: number,
  ) => void;
}) {
  const [
    media,
    setMedia,
  ] = useState(
    () =>
      sortMedia(
        initialMedia,
      ),
  );

  const initialOrder =
    media.length > 0
      ? Math.max(
          ...media.map(
            (item) =>
              item.display_order,
          ),
        ) + 10
      : 10;

  const [
    createDraft,
    setCreateDraft,
  ] = useState<MediaDraft>(
    () =>
      blankDraft(
        initialOrder,
      ),
  );

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    createStatus,
    setCreateStatus,
  ] = useState("");

  const eligibleSections =
    useMemo(
      () =>
        sections.filter(
          sectionSupportsMedia,
        ),
      [sections],
    );

  const createMedia =
    async () => {
      if (creating) {
        return;
      }

      setCreating(true);

      setCreateStatus(
        "Adding project media...",
      );

      try {
        const response =
          await adminFetch(
            `/api/admin/projects/${projectId}/media`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  values:
                    createDraft,
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        const saved =
          data.row &&
          typeof data.row ===
            "object" &&
          !Array.isArray(
            data.row,
          )
            ? data.row as
                unknown as
                ProjectWorkspaceMedia
            : null;

        if (
          !response.ok ||
          data.ok !== true ||
          !saved
        ) {
          setCreateStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        const next =
          sortMedia([
            ...media,
            saved,
          ]);

        setMedia(next);

        onCountChange?.(
          next.length,
        );

        setCreateDraft(
          blankDraft(
            saved.display_order +
              10,
          ),
        );

        setCreateStatus(
          "Media added.",
        );
      } catch {
        setCreateStatus(
          "The media item could not be added.",
        );
      } finally {
        setCreating(
          false,
        );
      }
    };

  const replaceMedia = (
    saved:
      ProjectWorkspaceMedia,
  ) => {
    setMedia(
      (current) =>
        sortMedia(
          current.map(
            (item) =>
              item.id ===
              saved.id
                ? saved
                : item,
          ),
        ),
    );
  };

  const removeMedia = (
    id: string,
  ) => {
    setMedia(
      (current) => {
        const next =
          current.filter(
            (item) =>
              item.id !== id,
          );

        onCountChange?.(
          next.length,
        );

        return next;
      },
    );
  };

  return (
    <div className="mt-5 grid gap-5">
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Media Manager
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Images can be uploaded
            through the existing
            secure Media Library.
            Videos and documents use
            external HTTPS URLs in
            this wave.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
          <h3 className="font-semibold text-white">
            Add media
          </h3>

          <MediaFields
            draft={
              createDraft
            }
            sections={
              eligibleSections
            }
            onChange={
              setCreateDraft
            }
          />

          <button
            type="button"
            onClick={() =>
              void createMedia()
            }
            disabled={
              creating
            }
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
          >
            <FiPlus
              aria-hidden="true"
            />

            {creating
              ? "Adding..."
              : "Add media"}
          </button>

          <p
            aria-live="polite"
            className="mt-3 min-h-5 text-sm text-cyan-100"
          >
            {
              createStatus
            }
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Project media
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            {media.length}{" "}
            media item
            {media.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="mt-5 grid gap-5">
          {media.map(
            (item) => (
              <MediaEditor
                key={
                  item.id
                }
                projectId={
                  projectId
                }
                item={
                  item
                }
                sections={
                  eligibleSections
                }
                onSaved={
                  replaceMedia
                }
                onDeleted={
                  removeMedia
                }
              />
            ),
          )}

          {media.length ===
            0 && (
            <p className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
              No project media
              yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MediaEditor({
  projectId,
  item,
  sections,
  onSaved,
  onDeleted,
}: {
  projectId: string;

  item:
    ProjectWorkspaceMedia;

  sections:
    ProjectWorkspaceSection[];

  onSaved: (
    item:
      ProjectWorkspaceMedia,
  ) => void;

  onDeleted: (
    id: string,
  ) => void;
}) {
  const [
    draft,
    setDraft,
  ] = useState<MediaDraft>(
    () =>
      toDraft(item),
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

  const dirty =
    JSON.stringify(
      draft,
    ) !==
    JSON.stringify(
      toDraft(item),
    );

  const save =
    async () => {
      if (
        saving ||
        deleting ||
        !dirty
      ) {
        return;
      }

      setSaving(true);

      setStatus(
        "Saving media...",
      );

      try {
        const response =
          await adminFetch(
            `/api/admin/projects/${projectId}/media`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  id:
                    item.id,

                  expectedUpdatedAt:
                    item.updated_at,

                  values:
                    draft,
                }),
            },
          );

        const data =
          await readJsonObject(
            response,
          );

        const saved =
          data.row &&
          typeof data.row ===
            "object" &&
          !Array.isArray(
            data.row,
          )
            ? data.row as
                unknown as
                ProjectWorkspaceMedia
            : null;

        if (
          !response.ok ||
          data.ok !== true ||
          !saved
        ) {
          setStatus(
            adminApiError(
              data,
            ),
          );

          return;
        }

        setDraft(
          toDraft(
            saved,
          ),
        );

        onSaved(
          saved,
        );

        setStatus(
          "Media saved.",
        );
      } catch {
        setStatus(
          "The media item could not be saved.",
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
        saving ||
        deleting
      ) {
        return;
      }

      if (
        !window.confirm(
          "Remove this media record from the project? The underlying uploaded file will NOT be deleted.",
        )
      ) {
        return;
      }

      setDeleting(true);

      setStatus(
        "Removing media...",
      );

      try {
        const response =
          await adminFetch(
            `/api/admin/projects/${projectId}/media`,
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
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
          "The media item could not be removed.",
        );
      } finally {
        setDeleting(
          false,
        );
      }
    };

  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-5">
      <MediaFields
        draft={
          draft
        }
        sections={
          sections
        }
        onChange={
          setDraft
        }
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void save()
          }
          disabled={
            saving ||
            deleting ||
            !dirty
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-50"
        >
          <FiSave
            aria-hidden="true"
          />

          {saving
            ? "Saving..."
            : "Save media"}
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
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-50"
        >
          <FiTrash2
            aria-hidden="true"
          />

          {deleting
            ? "Removing..."
            : "Remove media"}
        </button>

        {dirty && (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
            Unsaved
          </span>
        )}
      </div>

      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-sm text-cyan-100"
      >
        {status}
      </p>
    </article>
  );
}

function MediaFields({
  draft,
  sections,
  onChange,
}: {
  draft:
    MediaDraft;

  sections:
    ProjectWorkspaceSection[];

  onChange: (
    draft:
      MediaDraft,
  ) => void;
}) {
  const setField = <
    Key extends
      keyof MediaDraft,
  >(
    key: Key,
    value:
      MediaDraft[Key],
  ) => {
    onChange({
      ...draft,
      [key]: value,
    });
  };

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm text-gray-300">
        <span>
          Media type
        </span>

        <select
          value={
            draft.media_type
          }
          onChange={(
            event,
          ) => {
            const next =
              event.target
                .value as
                ProjectWorkspaceMediaType;

            onChange({
              ...draft,

              media_type:
                next,

              media_url:
                next ===
                draft.media_type
                  ? draft.media_url
                  : "",
            });
          }}
          className={
            inputClass
          }
        >
          <option value="image">
            Image
          </option>

          <option value="video">
            Video
          </option>

          <option value="document">
            Document
          </option>
        </select>
      </label>

      <label className="grid gap-2 text-sm text-gray-300">
        <span>
          Case Study section
        </span>

        <select
          value={
            draft.project_section_id ??
            ""
          }
          onChange={(
            event,
          ) =>
            setField(
              "project_section_id",
              event.target
                .value ||
                null,
            )
          }
          className={
            inputClass
          }
        >
          <option value="">
            Project-level /
            unattached
          </option>

          {sections.map(
            (section) => (
              <option
                key={
                  section.id
                }
                value={
                  section.id
                }
              >
                {
                  section.title
                }
              </option>
            ),
          )}
        </select>
      </label>

      {draft.media_type ===
      "image" ? (
        <CmsFieldInput
          field={
            imageField
          }
          value={
            draft.media_url
          }
          request={
            adminFetch
          }
          onChange={(
            value,
          ) =>
            setField(
              "media_url",
              typeof value ===
                "string"
                ? value
                : "",
            )
          }
        />
      ) : (
        <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
          <span>
            External HTTPS URL
          </span>

          <input
            type="url"
            value={
              draft.media_url
            }
            onChange={(
              event,
            ) =>
              setField(
                "media_url",
                event.target
                  .value,
              )
            }
            placeholder="https://..."
            className={
              inputClass
            }
          />

          <span className="text-xs text-gray-500">
            Secure upload for
            video/document is
            intentionally not
            enabled in Wave
            2C-B.
          </span>
        </label>
      )}

      <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
        <span>
          Accessible label /
          alt text
        </span>

        <input
          value={
            draft.alt_text
          }
          onChange={(
            event,
          ) =>
            setField(
              "alt_text",
              event.target
                .value,
            )
          }
          maxLength={
            500
          }
          className={
            inputClass
          }
        />
      </label>

      <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
        <span>
          Caption
        </span>

        <textarea
          value={
            draft.caption
          }
          onChange={(
            event,
          ) =>
            setField(
              "caption",
              event.target
                .value,
            )
          }
          maxLength={
            2000
          }
          className={
            textareaClass
          }
        />
      </label>

      <label className="grid gap-2 text-sm text-gray-300">
        <span>
          Display order
        </span>

        <input
          type="number"
          value={
            draft.display_order
          }
          onChange={(
            event,
          ) =>
            setField(
              "display_order",
              Number(
                event.target
                  .value,
              ),
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
            setField(
              "is_visible",
              event.target
                .checked,
            )
          }
          className="h-5 w-5 accent-cyan-400"
        />

        Visible
      </label>
    </div>
  );
}
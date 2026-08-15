"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  cmsBlockRegistry,
  normalizeCmsBlockType,
  normalizeCmsLayoutVariant,
} from "@/lib/cms-block-registry";
import { getProjectCompleteness } from "@/lib/content-completeness";

type Row = Record<string, unknown>;

export type BuilderTable =
  | "pages"
  | "page_sections"
  | "page_section_items"
  | "projects"
  | "project_sections"
  | "project_section_items"
  | "project_media";

type BuilderCallbacks = {
  records: Record<string, Row[]>;
  status: string;
  onEdit: (table: BuilderTable, id: string) => void;
  onAdd: (table: BuilderTable, defaults: Row) => void;
  onDuplicate: (table: BuilderTable, id: string) => void;
  onMove: (
    table: BuilderTable,
    id: string,
    direction: "up" | "down",
  ) => void;
  onHide: (table: BuilderTable, id: string) => void;
  onArchive: (table: BuilderTable, id: string) => void;
};

const rowId = (row: Row) => String(row.id ?? "");
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

function BuilderSelect({
  label,
  rows,
  value,
  onChange,
  getLabel,
}: {
  label: string;
  rows: Row[];
  value: string;
  onChange: (value: string) => void;
  getLabel: (row: Row) => string;
}) {
  return (
    <label className="grid gap-2 text-sm text-gray-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-white/10 bg-[#151030] px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
      >
        {rows.map((row) => (
          <option key={rowId(row)} value={rowId(row)}>
            {getLabel(row)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PublicationChecklist({
  blockers,
  warnings,
}: {
  blockers: string[];
  warnings: string[];
}) {
  return (
    <section
      aria-labelledby="builder-publication-checklist"
      className={`rounded-lg border p-4 ${
        blockers.length
          ? "border-amber-300/20 bg-amber-500/10"
          : "border-emerald-300/20 bg-emerald-500/10"
      }`}
    >
      <h3
        id="builder-publication-checklist"
        className="font-semibold text-white"
      >
        Publication checklist
      </h3>
      <p className="mt-1 text-sm text-gray-300">
        {blockers.length
          ? "Resolve the blockers before publishing."
          : "No publication blockers detected."}
      </p>
      {blockers.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100">
          {blockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Warnings
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
            {warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function OrderedBlockActions({
  table,
  id,
  index,
  count,
  visible,
  callbacks,
}: {
  table: "page_sections" | "project_sections";
  id: string;
  index: number;
  count: number;
  visible: boolean;
  callbacks: Pick<
    BuilderCallbacks,
    "onEdit" | "onDuplicate" | "onMove" | "onHide" | "onArchive"
  >;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass}
        onClick={() => callbacks.onEdit(table, id)}
      >
        Edit
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => callbacks.onDuplicate(table, id)}
      >
        Duplicate
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={index === 0}
        onClick={() => callbacks.onMove(table, id, "up")}
      >
        Move up
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={index === count - 1}
        onClick={() => callbacks.onMove(table, id, "down")}
      >
        Move down
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={!visible}
        onClick={() => callbacks.onHide(table, id)}
      >
        {visible ? "Hide" : "Hidden"}
      </button>
      <button
        type="button"
        className={`${buttonClass} border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/20`}
        onClick={() => callbacks.onArchive(table, id)}
      >
        Archive
      </button>
    </div>
  );
}

function SupportingItemActions({
  table,
  id,
  visible,
  callbacks,
}: {
  table:
    | "page_section_items"
    | "project_section_items"
    | "project_media";
  id: string;
  visible: boolean;
  callbacks: Pick<BuilderCallbacks, "onEdit" | "onHide" | "onArchive">;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass}
        onClick={() => callbacks.onEdit(table, id)}
      >
        Edit
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={!visible}
        onClick={() => callbacks.onHide(table, id)}
      >
        {visible ? "Hide" : "Hidden"}
      </button>
      <button
        type="button"
        className={`${buttonClass} border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/20`}
        onClick={() => callbacks.onArchive(table, id)}
      >
        Remove
      </button>
    </div>
  );
}

export function PageBuilder(callbacks: BuilderCallbacks) {
  const pages = useMemo(
    () =>
      [...(callbacks.records.pages ?? [])].sort(
        (left, right) =>
          number(left.navigation_order) - number(right.navigation_order) ||
          text(left.title).localeCompare(text(right.title)),
      ),
    [callbacks.records.pages],
  );
  const [selectedId, setSelectedId] = useState(() => rowId(pages[0] ?? {}));
  const activeSelectedId = pages.some(
    (page) => rowId(page) === selectedId,
  )
    ? selectedId
    : rowId(pages[0] ?? {});

  const page = pages.find(
    (candidate) => rowId(candidate) === activeSelectedId,
  );
  const blocks = [...(callbacks.records.page_sections ?? [])]
    .filter(
      (section) =>
        String(section.page_id ?? "") === activeSelectedId &&
        section.is_archived !== true,
    )
    .sort(
      (left, right) =>
        number(left.display_order) - number(right.display_order),
    );
  const visibleBlocks = blocks.filter((block) => block.is_visible !== false);
  const blockers = [
    !text(page?.title) ? "Add a public page title." : "",
    page?.is_published === true && visibleBlocks.length === 0
      ? "Add at least one visible block to this published page."
      : "",
  ].filter(Boolean);
  const warnings = [
    !text(page?.seo_title) ? "Add a concise SEO title." : "",
    !text(page?.seo_description) ? "Add a useful search description." : "",
    !text(page?.open_graph_image)
      ? "Add a social preview image or confirm the global fallback."
      : "",
    page?.show_in_navigation === true && !text(page?.navigation_label)
      ? "Add a short navigation label."
      : "",
    page?.is_published !== true ? "This page is currently unpublished." : "",
  ].filter(Boolean);

  if (!page) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white">Page Builder</h2>
        <p className="mt-3 text-sm text-gray-400">
          No canonical pages are available. Apply the approved migrations before
          editing page layouts.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Page Builder</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Choose a page by name, review its settings, then arrange controlled
            content blocks. Canonical routes and stable keys remain protected.
          </p>
        </div>
        <BuilderSelect
          label="Page"
          rows={pages}
          value={activeSelectedId}
          onChange={setSelectedId}
          getLabel={(row) => text(row.title) || text(row.page_key)}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-white">Page settings</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Title</dt>
              <dd className="text-gray-200">{text(page.title) || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Canonical path</dt>
              <dd className="font-mono text-gray-200">
                {text(page.slug) || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Publication</dt>
              <dd className="text-gray-200">
                {page.is_published === true ? "Published" : "Draft"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-white">SEO & social preview</h3>
          <p className="mt-3 text-sm font-medium text-cyan-100">
            {text(page.seo_title) || "SEO title not set"}
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
            {text(page.seo_description) || "Search description not set."}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {text(page.open_graph_image)
              ? "Custom social image selected"
              : "Using the global social fallback"}
          </p>
        </section>
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-white">Navigation</h3>
          <dl className="mt-3 space-y-2 text-sm text-gray-300">
            <div className="flex justify-between gap-4">
              <dt>Label</dt>
              <dd>{text(page.navigation_label) || text(page.title)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Order</dt>
              <dd>{number(page.navigation_order)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Primary navigation</dt>
              <dd>{page.show_in_navigation === true ? "Shown" : "Hidden"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Footer</dt>
              <dd>{page.show_in_footer === true ? "Shown" : "Hidden"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={() => callbacks.onEdit("pages", activeSelectedId)}
        >
          Edit page settings
        </button>
        <button
          type="button"
          className="button-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
          onClick={() =>
            callbacks.onAdd("page_sections", {
              page_id: activeSelectedId,
              section_key: `block-${Date.now().toString(36)}`,
              section_type: "rich_text",
              layout_variant: "default",
              display_order: (blocks.at(-1)
                ? number(blocks.at(-1)?.display_order) + 10
                : 0),
              is_visible: true,
              is_archived: false,
            })
          }
        >
          Add block
        </button>
        <Link
          href={text(page.slug) || "/"}
          target="_blank"
          className={buttonClass}
        >
          Preview published page
        </Link>
      </div>

      <div className="mt-6">
        <PublicationChecklist blockers={blockers} warnings={warnings} />
      </div>

      <section className="mt-8" aria-labelledby="ordered-page-blocks">
        <h3 id="ordered-page-blocks" className="text-xl font-semibold text-white">
          Ordered blocks
        </h3>
        <div className="mt-4 grid gap-4">
          {blocks.map((block, index) => {
            const blockType = normalizeCmsBlockType(block.section_type);
            const definition = cmsBlockRegistry[blockType];
            const variant = normalizeCmsLayoutVariant(
              blockType,
              block.layout_variant,
            );
            const items = [...(callbacks.records.page_section_items ?? [])]
              .filter(
                (item) =>
                  String(item.page_section_id ?? "") === rowId(block),
              )
              .sort(
                (left, right) =>
                  number(left.display_order) - number(right.display_order),
              );
            return (
              <article
                key={rowId(block)}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-white">
                        {text(block.title) || definition.label}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {definition.label} · {variant}
                      </span>
                      {block.is_visible === false && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-100">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                      {definition.description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Example: {definition.example}
                    </p>
                  </div>
                  <OrderedBlockActions
                    table="page_sections"
                    id={rowId(block)}
                    index={index}
                    count={blocks.length}
                    visible={block.is_visible !== false}
                    callbacks={callbacks}
                  />
                </div>
                {definition.usesItems && (
                  <section
                    aria-label={`${text(block.title) || definition.label} supporting items`}
                    className="mt-4 border-t border-white/10 pt-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h5 className="font-medium text-white">
                          Supporting cards, facts & media
                        </h5>
                        <p className="mt-1 text-xs text-gray-500">
                          Manage the repeatable content used by this block.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() =>
                          callbacks.onAdd("page_section_items", {
                            page_section_id: rowId(block),
                            display_order: items.at(-1)
                              ? number(items.at(-1)?.display_order) + 10
                              : 0,
                            is_visible: true,
                          })
                        }
                      >
                        Add supporting item
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {items.map((item, itemIndex) => (
                        <div
                          key={rowId(item)}
                          className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/10 p-3 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-100">
                              {text(item.title)
                                || text(item.subtitle)
                                || text(item.media_alt)
                                || text(item.link_label)
                                || `Supporting item ${itemIndex + 1}`}
                            </p>
                            {text(item.description) && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                {text(item.description)}
                              </p>
                            )}
                          </div>
                          <SupportingItemActions
                            table="page_section_items"
                            id={rowId(item)}
                            visible={item.is_visible !== false}
                            callbacks={callbacks}
                          />
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No supporting items yet.
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </article>
            );
          })}
          {blocks.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
              No blocks yet. Add the first controlled block.
            </p>
          )}
        </div>
      </section>
      <p className="mt-5 text-sm text-cyan-100" aria-live="polite">
        {callbacks.status}
      </p>
    </div>
  );
}

export function ProjectBuilder(callbacks: BuilderCallbacks) {
  const projects = useMemo(
    () =>
      [...(callbacks.records.projects ?? [])].sort(
        (left, right) =>
          number(left.projects_page_order) -
            number(right.projects_page_order) ||
          text(left.title).localeCompare(text(right.title)),
      ),
    [callbacks.records.projects],
  );
  const [selectedId, setSelectedId] = useState(
    () => rowId(projects[0] ?? {}),
  );
  const activeSelectedId = projects.some(
    (project) => rowId(project) === selectedId,
  )
    ? selectedId
    : rowId(projects[0] ?? {});

  const project = projects.find(
    (candidate) => rowId(candidate) === activeSelectedId,
  );
  const sections = [...(callbacks.records.project_sections ?? [])]
    .filter(
      (section) =>
        String(section.project_id ?? "") === activeSelectedId &&
        section.is_archived !== true,
    )
    .sort(
      (left, right) => number(left.sort_order) - number(right.sort_order),
    );
  const projectSections = sections.map((section) => ({
    ...section,
    items: (callbacks.records.project_section_items ?? []).filter(
      (item) =>
        String(item.project_section_id ?? "") === rowId(section) &&
        item.is_visible !== false,
    ),
    media: (callbacks.records.project_media ?? []).filter(
      (item) =>
        String(item.project_id ?? "") === activeSelectedId &&
        item.is_visible !== false,
    ),
  }));
  const media = [...(callbacks.records.project_media ?? [])]
    .filter(
      (item) => String(item.project_id ?? "") === activeSelectedId,
    )
    .sort(
      (left, right) =>
        number(left.display_order) - number(right.display_order),
    );
  const checklist = project
    ? getProjectCompleteness(project, projectSections)
    : { blockingIssues: [], warnings: [], publishable: false };

  if (!project) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white">Project Builder</h2>
        <p className="mt-3 text-sm text-gray-400">
          No projects are available yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Builder</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Edit one project by name, then arrange concise evidence-based
            sections and accessible media.
          </p>
        </div>
        <BuilderSelect
          label="Project"
          rows={projects}
          value={activeSelectedId}
          onChange={setSelectedId}
          getLabel={(row) => text(row.title) || text(row.slug)}
        />
      </div>

      <section className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
              {text(project.type) || "Project"}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {text(project.title)}
            </h3>
            {text(project.summary) && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                {text(project.summary)}
              </p>
            )}
            <p className="mt-3 text-sm text-gray-300">
              Status: {text(project.status) || "draft"} ·{" "}
              {project.published === true ? "Published flag on" : "Unpublished"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
  href={`/admin/projects/${activeSelectedId}`}
  className="button-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
>
  Open Project Workspace
</Link>

<button
  type="button"
  className={buttonClass}
  onClick={() =>
    callbacks.onEdit(
      "projects",
      activeSelectedId,
    )
  }
>
  Advanced raw edit
</button>
            <button
              type="button"
              className="button-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
              onClick={() =>
                callbacks.onAdd("project_sections", {
                  project_id: activeSelectedId,
                  section_type: "rich_text",
                  layout_variant: "default",
                  title: "Overview",
                  sort_order: sections.at(-1)
                    ? number(sections.at(-1)?.sort_order) + 10
                    : 0,
                  is_visible: true,
                  is_archived: false,
                })
              }
            >
              Add section
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                callbacks.onAdd("project_media", {
                  project_id: activeSelectedId,
                  media_type: "image",
                  display_order: 0,
                  is_visible: true,
                })
              }
            >
              Add media
            </button>
            {project.published === true &&
            text(project.status) === "published" &&
            text(project.slug) ? (
              <Link
                href={`/projects/${text(project.slug)}`}
                target="_blank"
                className={buttonClass}
              >
                Preview published project
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center text-xs text-gray-500">
                Public preview becomes available after publication.
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5">
        <PublicationChecklist
          blockers={checklist.blockingIssues}
          warnings={checklist.warnings}
        />
      </div>

      <section className="mt-8" aria-labelledby="ordered-project-sections">
        <h3
          id="ordered-project-sections"
          className="text-xl font-semibold text-white"
        >
          Ordered sections
        </h3>
        <div className="mt-4 grid gap-4">
          {sections.map((section, index) => {
            const blockType =
              text(section.section_type) === "media_gallery"
                ? "media_gallery"
                : "rich_text";
            const definition = cmsBlockRegistry[blockType];
            const hasContent =
              Boolean(text(section.body)) ||
              (Array.isArray(section.bullets) && section.bullets.length > 0) ||
              projectSections[index]?.items.length > 0 ||
              (blockType === "media_gallery" &&
                projectSections[index]?.media.length > 0);
            const facts = [...(callbacks.records.project_section_items ?? [])]
              .filter(
                (item) =>
                  String(item.project_section_id ?? "") === rowId(section),
              )
              .sort(
                (left, right) =>
                  number(left.display_order) - number(right.display_order),
              );

            return (
              <article
                key={rowId(section)}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-white">
                        {text(section.title) || definition.label}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {definition.label} ·{" "}
                        {normalizeCmsLayoutVariant(
                          blockType,
                          section.layout_variant,
                        )}
                      </span>
                      {!hasContent && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-100">
                          Title only — hidden publicly
                        </span>
                      )}
                      {section.is_visible === false && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-100">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                      {definition.description}
                    </p>
                  </div>
                  <OrderedBlockActions
                    table="project_sections"
                    id={rowId(section)}
                    index={index}
                    count={sections.length}
                    visible={section.is_visible !== false}
                    callbacks={callbacks}
                  />
                </div>
                <section
                  aria-label={`${text(section.title) || definition.label} facts`}
                  className="mt-4 border-t border-white/10 pt-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="font-medium text-white">
                        Facts & supporting evidence
                      </h5>
                      <p className="mt-1 text-xs text-gray-500">
                        Add concise label-and-value facts or supporting notes.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() =>
                        callbacks.onAdd("project_section_items", {
                          project_section_id: rowId(section),
                          display_order: facts.at(-1)
                            ? number(facts.at(-1)?.display_order) + 10
                            : 0,
                          is_visible: true,
                        })
                      }
                    >
                      Add fact
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {facts.map((fact, factIndex) => (
                      <div
                        key={rowId(fact)}
                        className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/10 p-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-100">
                            {text(fact.label)
                              || text(fact.value)
                              || `Fact ${factIndex + 1}`}
                          </p>
                          {(text(fact.value) || text(fact.description)) && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {[text(fact.value), text(fact.description)]
                                .filter(Boolean)
                                .join(" — ")}
                            </p>
                          )}
                        </div>
                        <SupportingItemActions
                          table="project_section_items"
                          id={rowId(fact)}
                          visible={fact.is_visible !== false}
                          callbacks={callbacks}
                        />
                      </div>
                    ))}
                    {facts.length === 0 && (
                      <p className="text-sm text-gray-500">
                        No facts attached to this section yet.
                      </p>
                    )}
                  </div>
                </section>
              </article>
            );
          })}
          {sections.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
              No meaningful sections yet. Add Overview or another concise
              evidence-based section.
            </p>
          )}
        </div>
      </section>
      <section className="mt-8" aria-labelledby="project-media-library">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              id="project-media-library"
              className="text-xl font-semibold text-white"
            >
              Project media
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Screenshots and documents available to media-gallery sections.
            </p>
          </div>
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              callbacks.onAdd("project_media", {
                project_id: activeSelectedId,
                media_type: "image",
                display_order: media.at(-1)
                  ? number(media.at(-1)?.display_order) + 10
                  : 0,
                is_visible: true,
              })
            }
          >
            Add project media
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {media.map((item, mediaIndex) => (
            <article
              key={rowId(item)}
              className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <h4 className="truncate text-sm font-medium text-gray-100">
                  {text(item.alt_text)
                    || text(item.caption)
                    || `Project media ${mediaIndex + 1}`}
                </h4>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {text(item.media_type) || "image"}
                  {text(item.media_url) ? ` — ${text(item.media_url)}` : ""}
                </p>
              </div>
              <SupportingItemActions
                table="project_media"
                id={rowId(item)}
                visible={item.is_visible !== false}
                callbacks={callbacks}
              />
            </article>
          ))}
          {media.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
              No project media yet.
            </p>
          )}
        </div>
      </section>
      <p className="mt-5 text-sm text-cyan-100" aria-live="polite">
        {callbacks.status}
      </p>
    </div>
  );
}

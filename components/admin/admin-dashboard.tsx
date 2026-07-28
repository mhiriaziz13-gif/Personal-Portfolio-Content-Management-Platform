"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiEdit2, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import type {
  AdminContentSnapshot,
  CmsTableName,
  ContactMessage,
  MessageAction,
} from "@/lib/cms-types";

import {
  adminApiError,
  adminFetch,
  type AdminRequest,
  isRecord,
  parseContactMessages,
  parseUploads,
  readJsonObject,
} from "./admin-api";
import { getProjectCompleteness } from "@/lib/content-completeness";
import {
  type CmsField,
  CmsFieldInput,
  docxMimeTypes,
  imageMimeTypes,
  pdfMimeTypes,
} from "./cms-field-input";
import { ContactMessagesPanel } from "./contact-messages-panel";
import { MediaLibrary } from "./media-library";
import { RevisionHistory } from "./revision-history";
import { SettingsPanel } from "./settings-panel";

type Row = Record<string, unknown>;
type EditableTable = Exclude<CmsTableName, "site_settings" | "contact_messages" | "uploads">;
type Section = {
  table: EditableTable;
  label: string;
  description: string;
  fields: CmsField[];
  singleton?: boolean;
};
type View = "overview" | EditableTable | "contact_messages" | "uploads" | "settings";

const primarySectionTables: EditableTable[] = [
  "profile", "hero", "about", "projects", "project_sections", "experience",
  "volunteering", "certifications", "skills", "education", "resumes",
  "social_links",
];

const navigationGroups: { label: string; tables: EditableTable[] }[] = [
  { label: "Main content", tables: ["profile", "hero", "about"] },
  { label: "Career & portfolio", tables: ["projects", "project_sections", "experience", "volunteering", "certifications"] },
  { label: "Details", tables: ["skills", "education", "resumes", "social_links"] },
];

const imageAccept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const pdfAccept = ".pdf,application/pdf";
const docxAccept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const skillCategories = [
  "Data & Business Intelligence",
  "Marketing & Customer Growth",
  "Automation & Operations",
  "Technical Stack",
] as const;

const sections: Section[] = [
  {
    table: "profile",
    label: "Personal info",
    singleton: true,
    description: "Identity, positioning and public contact details.",
    fields: [
      { key: "full_name", label: "Full name", required: true },
      { key: "headline", label: "Headline" },
      { key: "tagline", label: "Tagline" },
      { key: "secondary_line", label: "Secondary line" },
      { key: "location", label: "Location" },
      { key: "email", label: "Email", kind: "email" },
      { key: "linkedin_url", label: "LinkedIn URL", kind: "external-url" },
      { key: "github_url", label: "GitHub URL", kind: "external-url" },
      {
        key: "avatar_url",
        label: "Avatar",
        kind: "asset-image",
        bucket: "public-assets",
        accept: imageAccept,
        allowedMimeTypes: imageMimeTypes,
      },
      { key: "availability", label: "Availability" },
      { key: "short_bio", label: "Short bio", kind: "textarea" },
      { key: "about_text", label: "About text", kind: "textarea" },
      { key: "about_focus", label: "Focus points", kind: "list" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "hero",
    label: "Home intro",
    singleton: true,
    description: "Homepage copy and calls to action.",
    fields: [
      { key: "eyebrow", label: "Eyebrow" },
      { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" },
      { key: "tagline", label: "Tagline" },
      { key: "dynamic_titles", label: "Dynamic titles", kind: "list" },
      { key: "primary_cta_label", label: "Primary CTA label" },
      { key: "primary_cta_href", label: "Primary CTA link" },
      { key: "secondary_cta_label", label: "Secondary CTA label" },
      { key: "secondary_cta_href", label: "Secondary CTA link" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "about",
    label: "About page",
    singleton: true,
    description: "About page introduction and highlights.",
    fields: [
      { key: "title", label: "Title" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "highlights", label: "Highlights", kind: "list" },
      {
        key: "avatar_url",
        label: "Avatar",
        kind: "asset-image",
        bucket: "public-assets",
        accept: imageAccept,
        allowedMimeTypes: imageMimeTypes,
      },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "skills",
    label: "Skills",
    description: "Skills grouped by recruiter-friendly categories.",
    fields: [
      { key: "name", label: "Skill", required: true },
      { key: "category", label: "Category", kind: "select", options: skillCategories, required: true },
      { key: "icon_key", label: "Icon key" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "projects",
    label: "Projects",
    description: "Project cards and detail metadata.",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "slug", label: "Slug", required: true },
      { key: "type", label: "Type" },
      { key: "status", label: "Status", kind: "select", options: ["draft", "preparation", "published", "archived"], required: true },
      { key: "project_group", label: "Project group", kind: "select", options: ["Featured Projects", "Professional Projects", "Additional Projects", "Technical Foundations", "Preparation", "Archived"] },
      { key: "summary", label: "Summary", kind: "textarea" },
      { key: "description", label: "Description", kind: "textarea" },
      {
        key: "cover_image_url",
        label: "Cover image",
        kind: "asset-image",
        bucket: "project-images",
        accept: imageAccept,
        allowedMimeTypes: imageMimeTypes,
      },
      { key: "tags", label: "Tags", kind: "list" },
      { key: "tools", label: "Tools", kind: "list" },
      { key: "github_url", label: "GitHub URL", kind: "external-url" },
      { key: "linkedin_url", label: "LinkedIn URL", kind: "external-url" },
      { key: "demo_url", label: "Demo URL", kind: "external-url" },
      { key: "seo_title", label: "SEO title" },
      { key: "seo_description", label: "SEO description", kind: "textarea" },
      { key: "open_graph_image", label: "Open Graph image", kind: "asset-image", bucket: "project-images", accept: imageAccept, allowedMimeTypes: imageMimeTypes },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "projects_page_order", label: "Projects page order", kind: "number" },
      { key: "home_featured_order", label: "Home featured order", kind: "number" },
      { key: "featured", label: "Featured", kind: "checkbox" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "project_sections",
    label: "Project page content",
    description: "Text blocks displayed on each project page. Choose the project by name.",
    fields: [
      { key: "project_id", label: "Project", kind: "select", required: true },
      {
        key: "section_type",
        label: "Section type",
        kind: "select",
        options: ["rich_text", "media_gallery", "media"],
        required: true,
      },
      { key: "title", label: "Title", required: true },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "bullets", label: "Bullets", kind: "list" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "is_visible", label: "Visible", kind: "checkbox" },
      { key: "is_archived", label: "Archived", kind: "checkbox" },
    ],
  },
  {
    table: "project_section_items", label: "Project Section Items", description: "Ordered labels, metrics and supporting details inside case-study sections.",
    fields: [
      { key: "project_section_id", label: "Project section ID", required: true }, { key: "label", label: "Label" },
      { key: "value", label: "Value" }, { key: "description", label: "Description", kind: "textarea" },
      { key: "display_order", label: "Display order", kind: "number" }, { key: "is_visible", label: "Visible", kind: "checkbox" },
    ],
  },
  {
    table: "project_media", label: "Project Media", description: "Screenshots and demonstrations attached to project pages.",
    fields: [
      { key: "project_id", label: "Project", kind: "select", required: true },
      { key: "media_url", label: "Media", kind: "asset-image", bucket: "project-images", accept: imageAccept, allowedMimeTypes: imageMimeTypes, required: true },
      { key: "alt_text", label: "Accessible alt text", required: true }, { key: "caption", label: "Caption", kind: "textarea" },
      { key: "media_type", label: "Media type", kind: "select", options: ["image","video","document"] },
      { key: "display_order", label: "Display order", kind: "number" }, { key: "is_visible", label: "Visible", kind: "checkbox" },
    ],
  },
  {
    table: "experience",
    label: "Work experience",
    description: "Career timeline, company logos and achievements.",
    fields: [
      { key: "company", label: "Company", required: true },
      { key: "role", label: "Role", required: true },
      { key: "location", label: "Location" },
      { key: "start_date", label: "Start date" },
      { key: "end_date", label: "End date" },
      {
        key: "logo_url",
        label: "Company logo",
        kind: "asset-image",
        bucket: "public-assets",
        accept: imageAccept,
        allowedMimeTypes: imageMimeTypes,
      },
      { key: "points", label: "Achievements", kind: "list" },
      { key: "tools", label: "Tools", kind: "list" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "education",
    label: "Education",
    description: "Education and training records.",
    fields: [
      { key: "institution", label: "Institution", required: true },
      { key: "degree", label: "Degree", required: true },
      { key: "start_date", label: "Start date" },
      { key: "end_date", label: "End date" },
      { key: "status", label: "Status" },
      { key: "location", label: "Location" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "certifications",
    label: "Certifications",
    description: "Credentials displayed on the CV page.",
    fields: [
      { key: "name", label: "Certification name", required: true },
      { key: "issuer", label: "Issuer" },
      { key: "date", label: "Date" },
      { key: "credential_url", label: "Credential URL", kind: "external-url" },
      { key: "credential_id", label: "Credential ID" },
      {
        key: "image_url",
        label: "Certification image",
        kind: "asset-image",
        bucket: "public-assets",
        accept: imageAccept,
        allowedMimeTypes: imageMimeTypes,
      },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "tags", label: "Skills and tags", kind: "list" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "resumes",
    label: "CV downloads",
    description: "PDF and DOCX variants available for download.",
    fields: [
      { key: "label", label: "Label", required: true },
      { key: "variant", label: "Variant", required: true },
      {
        key: "pdf_url",
        label: "PDF file",
        kind: "asset-document",
        bucket: "resumes",
        accept: pdfAccept,
        allowedMimeTypes: pdfMimeTypes,
      },
      {
        key: "docx_url",
        label: "DOCX file",
        kind: "asset-document",
        bucket: "resumes",
        accept: docxAccept,
        allowedMimeTypes: docxMimeTypes,
      },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "social_links",
    label: "Social links",
    description: "LinkedIn, GitHub, email and future profiles.",
    fields: [
      { key: "label", label: "Label", required: true },
      { key: "url", label: "URL", kind: "external-url", required: true },
      { key: "icon_key", label: "Icon key" },
      { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "pages", label: "Page settings", description: "Page titles, publication and search/social preview information.",
    fields: [
      { key: "page_key", label: "Stable page key", required: true }, { key: "title", label: "Title", required: true },
      { key: "slug", label: "Path", required: true }, { key: "seo_title", label: "SEO title" },
      { key: "seo_description", label: "SEO description", kind: "textarea" }, { key: "open_graph_title", label: "Open Graph title" },
      { key: "open_graph_description", label: "Open Graph description", kind: "textarea" },
      { key: "open_graph_image", label: "Open Graph image", kind: "asset-image", bucket: "public-assets", accept: imageAccept, allowedMimeTypes: imageMimeTypes },
      { key: "is_published", label: "Published", kind: "checkbox" },
    ],
  },
  {
    table: "page_sections", label: "Page layout", description: "Control the visible sections and text on each page.",
    fields: [
      { key: "page_id", label: "Page", kind: "select", required: true }, { key: "section_key", label: "Stable section key", required: true },
      { key: "section_type", label: "Section type", kind: "select", options: ["hero","rich_text","featured_projects","projects_grid","experience_list","certifications_grid","volunteering","skills","cta","stats","media_gallery","custom_cards"], required: true },
      { key: "title", label: "Title" }, { key: "subtitle", label: "Subtitle" }, { key: "description", label: "Description", kind: "textarea" },
      { key: "cta_label", label: "CTA label" }, { key: "cta_href", label: "CTA destination" },
      { key: "secondary_cta_label", label: "Secondary CTA label" }, { key: "secondary_cta_href", label: "Secondary CTA destination" },
      { key: "layout_variant", label: "Layout variant" }, { key: "display_order", label: "Display order", kind: "number" },
      { key: "is_visible", label: "Visible", kind: "checkbox" }, { key: "is_archived", label: "Archived", kind: "checkbox" },
    ],
  },
  {
    table: "volunteering", label: "Volunteering", description: "Volunteer roles, organisation logos and related certifications.",
    fields: [
      { key: "role", label: "Role", required: true },
      { key: "organisation", label: "Organisation", required: true }, { key: "start_date", label: "Start date" },
      { key: "end_date", label: "End date" }, { key: "date_label", label: "Date label" }, { key: "domain", label: "Domain" },
      { key: "logo_url", label: "Organisation logo", kind: "asset-image", bucket: "public-assets", accept: imageAccept, allowedMimeTypes: imageMimeTypes },
      { key: "logo_alt", label: "Logo description" },
      { key: "certification_id", label: "Related certification", kind: "select" },
      { key: "summary", label: "Summary", kind: "textarea" }, { key: "description_items", label: "Details", kind: "list" },
      { key: "focus_areas", label: "Focus areas", kind: "list" }, { key: "sort_order", label: "Sort order", kind: "number" },
      { key: "published", label: "Published", kind: "checkbox" }, { key: "archived", label: "Archived", kind: "checkbox" },
    ],
  },
  {
    table: "page_section_items", label: "Section Cards & Media", description: "Repeatable cards, stats, links and media for flexible page sections.",
    fields: [
      { key: "page_section_id", label: "Page section ID", required: true }, { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" }, { key: "description", label: "Description", kind: "textarea" },
      { key: "link_label", label: "Link label" }, { key: "link_url", label: "Link destination" },
      { key: "media_url", label: "Media", kind: "asset-image", bucket: "public-assets", accept: imageAccept, allowedMimeTypes: imageMimeTypes },
      { key: "media_alt", label: "Media alt text" }, { key: "display_order", label: "Display order", kind: "number" },
      { key: "is_visible", label: "Visible", kind: "checkbox" },
    ],
  },
];

const emptyRow = (section: Section): Row => {
  const row = Object.fromEntries(section.fields.map((field) => [
    field.key,
    field.kind === "checkbox"
      ? false
      : field.kind === "number"
        ? 0
        : field.kind === "list"
          ? []
          : "",
  ]));

  if (section.table === "projects") row.status = "draft";
  if (section.table === "project_sections") row.section_type = "rich_text";
  return row;
};

const rowsFor = (snapshot: AdminContentSnapshot, table: CmsTableName): Row[] =>
  (Array.isArray(snapshot[table]) ? snapshot[table] : []).filter(isRecord);

const sortAndDedupeMessages = (messages: ContactMessage[]) => {
  const byId = new Map(messages.map((message) => [message.id, message]));
  return [...byId.values()].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
};

const actionSuccessMessage: Record<MessageAction, string> = {
  mark_read: "Message marked as read.",
  mark_unread: "Message marked as unread.",
  archive: "Message archived.",
  restore_read: "Message restored to the Inbox as read.",
  restore_unread: "Message restored to the Inbox as unread.",
  resend_notification: "Notification delivery retried.",
};

const inputCardTitle = (row: Row, index: number) => String(
  row.full_name
  ?? row.title
  ?? row.name
  ?? row.company
  ?? row.institution
  ?? row.label
  ?? `Entry ${index + 1}`,
);

const archivableTables = new Set<EditableTable>([
  "projects",
  "project_sections",
  "page_sections",
  "volunteering",
]);

const projectSectionsFor = (
  project: Row,
  records: Record<string, Row[]>,
) => {
  const projectId = String(project.id ?? "");
  return (records.project_sections ?? [])
    .filter((section) => String(section.project_id ?? "") === projectId)
    .map((section) => ({
      ...section,
      items: (records.project_section_items ?? []).filter(
        (item) =>
          String(item.project_section_id ?? "")
          === String(section.id ?? "")
          && item.is_visible !== false,
      ),
      media:
        section.section_type === "media"
        || section.section_type === "media_gallery"
          ? (records.project_media ?? []).filter(
            (item) =>
              String(item.project_id ?? "") === projectId
              && item.is_visible !== false,
          )
          : [],
    }));
};

const orderConfiguration: Partial<Record<
  EditableTable,
  { orderKey: string; parentKeys: string[] }
>> = {
  projects: { orderKey: "projects_page_order", parentKeys: [] },
  project_sections: { orderKey: "sort_order", parentKeys: ["project_id"] },
  project_section_items: {
    orderKey: "display_order",
    parentKeys: ["project_section_id"],
  },
  project_media: { orderKey: "display_order", parentKeys: ["project_id"] },
  page_sections: { orderKey: "display_order", parentKeys: ["page_id"] },
  page_section_items: {
    orderKey: "display_order",
    parentKeys: ["page_section_id"],
  },
};

const duplicateOrderIssue = (
  table: EditableTable,
  row: Row,
  rows: Row[],
) => {
  const configuration = orderConfiguration[table];
  if (!configuration) return null;
  const order = row[configuration.orderKey];
  if (typeof order !== "number" || !Number.isFinite(order)) return null;

  const duplicate = rows.some((candidate) =>
    candidate !== row
    && (
      typeof row.id !== "string"
      || typeof candidate.id !== "string"
      || candidate.id !== row.id
    )
    && candidate[configuration.orderKey] === order
    && configuration.parentKeys.every(
      (key) => candidate[key] === row[key],
    ));

  return duplicate
    ? `Duplicate ${configuration.orderKey.replaceAll("_", " ")}.`
    : null;
};

const linkedProjectIssue = (
  table: EditableTable,
  row: Row,
  projects: Row[],
) => {
  if (table !== "page_section_items" || typeof row.link_url !== "string") {
    return null;
  }
  const match = /^\/projects\/([^/?#]+)\/?$/.exec(row.link_url.trim());
  if (!match) return null;
  const linked = projects.find((project) => project.slug === match[1]);

  return linked?.published === true && linked.status === "published"
    ? null
    : "Linked project is missing or unpublished.";
};

const recordIssues = (
  table: EditableTable,
  row: Row,
  records: Record<string, Row[]>,
) => [
  duplicateOrderIssue(table, row, records[table] ?? []),
  linkedProjectIssue(table, row, records.projects ?? []),
].filter((issue): issue is string => Boolean(issue));

export const AdminDashboard = ({
  content,
  email,
}: {
  content: AdminContentSnapshot;
  email?: string;
}) => {
  const [view, setView] = useState<View>("overview");
  const [records, setRecords] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(sections.map((section) => [section.table, rowsFor(content, section.table)])),
  );
  const [messages, setMessages] = useState<ContactMessage[]>(() =>
    sortAndDedupeMessages(parseContactMessages(content.contact_messages)),
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Row>({});
  const [contentStatus, setContentStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const messageRefreshIdRef = useRef(0);
  const initialUploads = useMemo(() => parseUploads(content.uploads), [content.uploads]);

  const request = useCallback<AdminRequest>(
    (url, init = {}) => adminFetch(url, init),
    [],
  );

  const active = sections.find((section) => section.table === view);
  const activeFields = useMemo(() => {
    if (!active) return [];

    return active.fields.map((field) => field.key === "project_id"
      ? {
          ...field,
          options: (records.projects ?? []).map((project) => ({
            label: String(project.title ?? project.slug ?? "Untitled project"),
            value: String(project.id ?? ""),
          })).filter((option) => option.value),
        }
      : field.key === "page_id"
        ? {
            ...field,
            options: (records.pages ?? []).map((page) => ({
              label: String(page.title ?? page.page_key ?? "Untitled page"),
              value: String(page.id ?? ""),
            })).filter((option) => option.value),
          }
      : field.key === "certification_id"
        ? {
            ...field,
            options: [
              { label: "No related certification", value: "" },
              ...(records.certifications ?? []).map((certification) => ({
                label: String(certification.name ?? "Untitled certification"),
                value: String(certification.id ?? ""),
              })).filter((option) => option.value),
            ],
          }
      : field);
  }, [active, records.certifications, records.pages, records.projects]);
  const stats = useMemo(() => ({
    skills: records.skills?.length ?? 0,
    projects: records.projects?.length ?? 0,
    experience: records.experience?.length ?? 0,
    certifications: records.certifications?.length ?? 0,
    resumes: records.resumes?.length ?? 0,
    unread: messages.filter((message) => message.status === "new").length,
  }), [messages, records]);
  const projectChecklist = useMemo(() => {
    if (active?.table !== "projects") return null;
    const completeness = getProjectCompleteness(
      draft,
      projectSectionsFor(draft, records),
    );
    return {
      ...completeness,
      warnings: [
        ...completeness.warnings,
        ...recordIssues("projects", draft, records),
      ],
    };
  }, [active?.table, draft, records]);

  const refreshMessages = useCallback(async (reportErrors = false) => {
    const refreshId = ++messageRefreshIdRef.current;
    try {
      const response = await request("/api/admin/messages?view=all");
      const data = await readJsonObject(response);
      if (refreshId !== messageRefreshIdRef.current) return;
      if (!response.ok || data.ok !== true) {
        if (reportErrors) setMessageStatus(adminApiError(data));
        return;
      }
      setMessages(sortAndDedupeMessages(parseContactMessages(data.messages)));
    } catch {
      if (refreshId === messageRefreshIdRef.current && reportErrors) {
        setMessageStatus("Could not refresh contact messages.");
      }
    }
  }, [request]);

  useEffect(() => {
    let stopped = false;
    const refreshFromServer = () => {
      if (!stopped) void refreshMessages();
    };

    void refreshMessages(true);
    const intervalId = window.setInterval(refreshFromServer, 30_000);
    const handleFocus = () => refreshFromServer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshFromServer();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      messageRefreshIdRef.current += 1;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshMessages]);

  const logout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);

    try {
      const response = await request("/api/auth/logout?next=/admin/login", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await readJsonObject(response);
        setContentStatus(adminApiError(data));
        setLogoutPending(false);
        return;
      }

      window.location.assign(response.url || "/admin/login");
    } catch {
      setContentStatus("Logout could not be completed.");
      setLogoutPending(false);
    }
  };

  const beginEdit = (section: Section, index: number) => {
    setEditing(index);
    setDraft({ ...(records[section.table]?.[index] ?? emptyRow(section)) });
    setContentStatus("");
  };

  const beginAdd = (section: Section) => {
    setEditing(-1);
    const row = emptyRow(section);
    if (section.table === "volunteering") row.stable_key = `volunteering-${Date.now()}`;
    setDraft(row);
    setContentStatus("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
    setContentStatus("");
  };

  const selectView = (target: View) => {
    setView(target);
    cancelEdit();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active) return;
    setContentStatus("Saving...");

    const response = await request("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: active.table,
        values: draft,
        expectedUpdatedAt:
          typeof draft.updated_at === "string"
            ? draft.updated_at
            : undefined,
      }),
    });
    const data = await readJsonObject(response);
    const savedRow = isRecord(data.row) ? data.row : null;

    if (!response.ok || data.ok !== true || !savedRow) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("CMS save failed", { status: response.status, data });
      }
      setContentStatus(adminApiError(data));
      return;
    }

    setRecords((current) => {
      const next = [...(current[active.table] ?? [])];
      if (editing === -1) next.push(savedRow);
      else if (editing !== null) next[editing] = savedRow;
      return { ...current, [active.table]: next };
    });
    setContentStatus("Saved.");
    setEditing(null);
    setDraft({});
  };

  const remove = async (section: Section, index: number) => {
    const row = records[section.table]?.[index];
    if (!row) return;
    if (!row.id) {
      setRecords((current) => ({
        ...current,
        [section.table]: current[section.table].filter((_, itemIndex) => itemIndex !== index),
      }));
      return;
    }
    const archives = archivableTables.has(section.table);
    if (!window.confirm(
      archives
        ? `Archive this ${section.label.toLowerCase()} entry?`
        : `Permanently delete this ${section.label.toLowerCase()} entry?`,
    )) return;

    const response = await request("/api/admin/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: section.table,
        id: row.id,
        expectedUpdatedAt: String(row.updated_at ?? ""),
      }),
    });
    const data = await readJsonObject(response);
    if (!response.ok || data.ok !== true) {
      setContentStatus(adminApiError(data));
      return;
    }

    const returnedRow = isRecord(data.row) ? data.row : null;
    setRecords((current) => {
      const next = [...current[section.table]];
      if (returnedRow) next[index] = returnedRow;
      else next.splice(index, 1);
      return { ...current, [section.table]: next };
    });
    setContentStatus(returnedRow ? "Archived." : "Permanently deleted.");
  };

  const updateMessage = async (id: string, action: MessageAction) => {
    setPendingMessageId(id);
    setMessageStatus("Updating message...");
    try {
      const response = await request("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await readJsonObject(response);
      const updated = parseContactMessages([data.message])[0];
      if (!response.ok || data.ok !== true || !updated) {
        setMessageStatus(adminApiError(data));
        return;
      }

      setMessages((current) => sortAndDedupeMessages([
        updated,
        ...current.filter((message) => message.id !== updated.id),
      ]));
      setMessageStatus(actionSuccessMessage[action]);
    } catch {
      setMessageStatus("The message could not be updated.");
    } finally {
      setPendingMessageId(null);
    }
  };

  const deleteMessage = async (message: ContactMessage) => {
    const sender = message.name || message.email || "this sender";
    if (!window.confirm(`Permanently delete the message from ${sender}? This cannot be undone.`)) return;

    setPendingMessageId(message.id);
    setMessageStatus("Deleting message...");
    try {
      const response = await request("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: message.id }),
      });
      const data = await readJsonObject(response);
      if (!response.ok || data.ok !== true || data.deletedId !== message.id) {
        setMessageStatus(adminApiError(data));
        return;
      }

      setMessages((current) => current.filter((item) => item.id !== message.id));
      setMessageStatus("Message permanently deleted.");
    } catch {
      setMessageStatus("The message could not be deleted.");
    } finally {
      setPendingMessageId(null);
    }
  };

  const navButton = (target: View, label: string, badge = 0) => (
    <button
      type="button"
      onClick={() => selectView(target)}
      className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${
        view === target ? "bg-cyan-300/15 text-cyan-100" : "text-gray-300 hover:bg-white/10"
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="min-w-6 rounded-full bg-cyan-300 px-1.5 py-0.5 text-center text-[0.65rem] font-bold text-[#100b24]" aria-label={`${badge} unread`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <section className="relative z-[20] mx-auto w-full max-w-7xl px-6 py-28 text-gray-200">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="Welcome-text text-sm uppercase">CMS Admin</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="mt-3 text-sm text-gray-400">Signed in as {email ?? "admin"}. Edit content through simple forms.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/security" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10">Security</Link>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={logoutPending}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 disabled:opacity-60"
          >
            {logoutPending ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="CMS sections" className="flex h-fit flex-col gap-1 rounded-lg border border-white/10 bg-[#100b24]/80 p-3">
          {navButton("overview", "Overview")}
          {navigationGroups.map((group) => (
            <div key={group.label} className="mt-3 flex flex-col gap-1 first:mt-1">
              <p className="px-4 pb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500">{group.label}</p>
              {sections
                .filter((section) => primarySectionTables.includes(section.table) && group.tables.includes(section.table))
                .map((section) => <span key={section.table} className="contents">{navButton(section.table, section.label)}</span>)}
            </div>
          ))}
          <p className="mt-3 px-4 pb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500">Tools</p>
          {navButton("contact_messages", "Contact Messages", stats.unread)}
          {navButton("uploads", "Media Library")}
          {navButton("settings", "Settings")}
        </nav>

        <div className="min-w-0 rounded-lg border border-white/10 bg-[#100b24]/90 p-5 shadow-xl shadow-[#2A0E61]/20">
          {view === "overview" && (
            <div>
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <p className="mt-2 text-sm text-gray-400">Current CMS content at a glance.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Profile", records.profile?.length ? "Ready" : "Needs content"],
                  ["Hero", records.hero?.length ? "Ready" : "Needs content"],
                  ["Skills", stats.skills],
                  ["Projects", stats.projects],
                  ["Experience", stats.experience],
                  ["Certifications", stats.certifications],
                  ["CV files", stats.resumes],
                  ["Unread messages", stats.unread],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{active.label}</h2>
                  <p className="mt-2 text-sm text-gray-400">{active.description}</p>
                </div>
                {editing === null && (!active.singleton || !(records[active.table]?.length)) && (
                  <button type="button" onClick={() => beginAdd(active)} className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white">
                    <FiPlus aria-hidden="true" />Add
                  </button>
                )}
              </div>

              {editing !== null ? (
                <form onSubmit={save} className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeFields.map((field) => (
                      <CmsFieldInput
                        key={field.key}
                        field={field}
                        value={draft[field.key]}
                        request={request}
                        onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                      />
                    ))}
                  </div>
                  {projectChecklist && (
                    <section
                      aria-labelledby="project-publishing-checklist"
                      className={`mt-6 rounded-lg border p-4 ${
                        projectChecklist.publishable
                          ? "border-emerald-300/20 bg-emerald-500/10"
                          : "border-amber-300/20 bg-amber-500/10"
                      }`}
                    >
                      <h3
                        id="project-publishing-checklist"
                        className="font-semibold text-white"
                      >
                        Publication checklist
                      </h3>
                      <p className="mt-1 text-sm text-gray-300">
                        {projectChecklist.publishable
                          ? "Required public content is complete."
                          : "Resolve these blockers before publishing."}
                      </p>
                      {projectChecklist.blockingIssues.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100">
                          {projectChecklist.blockingIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      {projectChecklist.warnings.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                            Recommended
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-300">
                            {projectChecklist.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button type="submit" className="button-primary inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white">
                      <FiSave aria-hidden="true" />Save
                    </button>
                    <button type="button" onClick={cancelEdit} className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10">Cancel</button>
                    <p className="text-sm text-cyan-100" aria-live="polite">{contentStatus}</p>
                  </div>
                  {editing >= 0 && typeof draft.id === "string" && (
                    <RevisionHistory
                      table={active.table}
                      recordId={draft.id}
                      request={request}
                    />
                  )}
                </form>
              ) : (
                <div className="mt-6 grid gap-3">
                  {(records[active.table] ?? []).map((row, index) => {
                    const completeness = active.table === "projects"
                      ? getProjectCompleteness(
                        row,
                        projectSectionsFor(row, records),
                      )
                      : null;
                    const issues = recordIssues(active.table, row, records);
                    const archiveAction = archivableTables.has(active.table);

                    return (
                      <article key={String(row.id ?? `${active.table}-${index}`)} className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold text-white">{inputCardTitle(row, index)}</h3>
                            {completeness && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  completeness.publishable
                                    ? "bg-emerald-500/15 text-emerald-100"
                                    : "bg-amber-500/15 text-amber-100"
                                }`}
                              >
                                {completeness.publishable
                                  ? completeness.warnings.length > 0
                                    ? `${completeness.warnings.length} recommendations`
                                    : "Ready to publish"
                                  : `${completeness.blockingIssues.length} blockers`}
                              </span>
                            )}
                            {issues.map((issue) => (
                              <span
                                key={issue}
                                className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-100"
                              >
                                {issue}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-400">{String(row.headline ?? row.summary ?? row.role ?? row.issuer ?? row.degree ?? row.url ?? row.body ?? "")}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" aria-label={`Edit ${inputCardTitle(row, index)}`} onClick={() => beginEdit(active, index)} className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/10">
                            <FiEdit2 aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${archiveAction ? "Archive" : "Delete"} ${inputCardTitle(row, index)}`}
                            onClick={() => void remove(active, index)}
                            className="rounded-lg border border-red-300/20 bg-red-500/10 p-2.5 text-red-100 hover:bg-red-500/20"
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!(records[active.table]?.length) && <p className="py-8 text-center text-sm text-gray-400">No entries yet.</p>}
                  <p className="text-sm text-cyan-100" aria-live="polite">{contentStatus}</p>
                </div>
              )}
            </div>
          )}

          {view === "contact_messages" && (
            <ContactMessagesPanel
              messages={messages}
              pendingMessageId={pendingMessageId}
              status={messageStatus}
              onAction={updateMessage}
              onDelete={deleteMessage}
            />
          )}

          {view === "uploads" && <MediaLibrary initialUploads={initialUploads} request={request} />}

          {view === "settings" && (
            <SettingsPanel
              initialEmail={email}
              messages={messages}
              pendingMessageId={pendingMessageId}
              messageStatus={messageStatus}
              request={request}
              onMessageAction={updateMessage}
              onMessageDelete={deleteMessage}
            />
          )}
        </div>
      </div>
    </section>
  );
};

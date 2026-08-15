export type ProjectWorkspaceStatus =
  | "draft"
  | "preparation"
  | "published"
  | "archived";

export type ProjectWorkspaceProject = {
  id: string;
  slug: string;
  title: string;

  type: string | null;
  summary: string | null;
  description: string | null;

  cover_image_url: string | null;
  card_image_url: string | null;
  open_graph_image: string | null;

  tags: string[];
  tools: string[];

  seo_title: string | null;
  seo_description: string | null;

  project_group: string;
  organisation: string | null;

  status: ProjectWorkspaceStatus;

  home_featured_order: number | null;
  projects_page_order: number;

  featured: boolean;
  published: boolean;
  sort_order: number;

  role: string | null;

  start_date: string | null;
  end_date: string | null;

  machine_summary: string | null;

  published_at: string | null;
  archived_at: string | null;

  deletion_status:
    | "active"
    | "pending"
    | "failed";

  deletion_requested_at: string | null;
  deletion_error_code: string | null;

  created_at: string;
  updated_at: string;
};

export type ProjectWorkspaceLink = {
  id?: string;

  link_type: string;
  label: string | null;
  url: string;

  display_order: number;
  is_visible: boolean;
};

export type ProjectWorkspaceSectionType =
  | "rich_text"
  | "media_gallery";

export type ProjectWorkspaceSectionDefinition = {
  id: string;

  section_key: string;
  label: string;
  description: string | null;

  default_sort_order: number;

  default_section_type:
    ProjectWorkspaceSectionType;

  default_layout_variant: string;

  default_visible: boolean;

  is_required: boolean;
  supports_items: boolean;
  supports_media: boolean;

  is_active: boolean;
};

export type ProjectWorkspaceSectionItem = {
  id: string;

  project_section_id: string;

  label: string | null;
  value: string | null;
  description: string | null;

  display_order: number;
  is_visible: boolean;

  created_at: string;
  updated_at: string;
};

export type ProjectWorkspaceSection = {
  id: string;
  project_id: string;

  definition_id: string | null;

  title: string;
  body: string | null;

  bullets: string[];

  sort_order: number;

  section_type:
    ProjectWorkspaceSectionType;

  is_visible: boolean;
  is_archived: boolean;

  layout_variant: string;

  created_at: string;
  updated_at: string;

  definition:
    ProjectWorkspaceSectionDefinition | null;

  items:
    ProjectWorkspaceSectionItem[];
};
export type ProjectWorkspaceMediaType =
  | "image"
  | "video"
  | "document";

export type ProjectWorkspaceMedia = {
  id: string;

  project_id: string;

  project_section_id:
    | string
    | null;

  media_url: string;

  alt_text: string;

  caption:
    | string
    | null;

  media_type:
    ProjectWorkspaceMediaType;

  display_order: number;

  is_visible: boolean;

  created_at: string;
  updated_at: string;
};
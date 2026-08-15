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
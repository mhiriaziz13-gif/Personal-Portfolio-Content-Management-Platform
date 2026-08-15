import "server-only";
import type {
  ProjectWorkspaceLink,
  ProjectWorkspaceProject,
} from "@/lib/projects/project-workspace-types";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const projectWorkspaceProjectSelect = `
  id,
  slug,
  title,
  type,
  summary,
  description,
  cover_image_url,
  card_image_url,
  open_graph_image,
  tags,
  tools,
  seo_title,
  seo_description,
  project_group,
  organisation,
  status,
  home_featured_order,
  projects_page_order,
  featured,
  published,
  sort_order,
  role,
  start_date,
  end_date,
  machine_summary,
  published_at,
  archived_at,
  deletion_status,
  deletion_requested_at,
  deletion_error_code,
  created_at,
  updated_at
` as const;

const projectLinksSelect =
  "id,link_type,label,url,display_order,is_visible" as const;

export type ProjectWorkspaceProjectData = {
  project: ProjectWorkspaceProject;
  links: ProjectWorkspaceLink[];
};

export type ProjectWorkspaceData = ProjectWorkspaceProjectData & {
  sectionCount: number;
  mediaCount: number;
};

export async function getProjectWorkspaceProject(
  projectId: string,
): Promise<ProjectWorkspaceProjectData | null> {
  const supabase = createSupabaseAdminClient();

  const [projectResult, linksResult] = await Promise.all([
    supabase
      .from("projects")
      .select(projectWorkspaceProjectSelect)
      .eq("id", projectId)
      .maybeSingle()
      .overrideTypes<ProjectWorkspaceProject, { merge: false }>(),

    supabase
      .from("project_links")
      .select(projectLinksSelect)
      .eq("project_id", projectId)
      .order("display_order", { ascending: true })
      .overrideTypes<ProjectWorkspaceLink[], { merge: false }>(),
  ]);

  if (projectResult.error) {
    throw new Error("Project could not be loaded.");
  }

  if (!projectResult.data) {
    return null;
  }

  if (linksResult.error) {
    throw new Error("Project links could not be loaded.");
  }

  return {
    project: projectResult.data,
    links: linksResult.data ?? [],
  };
}

export async function getProjectWorkspaceData(
  projectId: string,
): Promise<ProjectWorkspaceData | null> {
  const supabase = createSupabaseAdminClient();

  const [projectData, sectionsResult, mediaResult] = await Promise.all([
    getProjectWorkspaceProject(projectId),

    supabase
      .from("project_sections")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_archived", false),

    supabase
      .from("project_media")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);

  if (!projectData) {
    return null;
  }

  if (sectionsResult.error) {
    throw new Error("Project section count could not be loaded.");
  }

  if (mediaResult.error) {
    throw new Error("Project media count could not be loaded.");
  }

  return {
    ...projectData,
    sectionCount: sectionsResult.count ?? 0,
    mediaCount: mediaResult.count ?? 0,
  };
}
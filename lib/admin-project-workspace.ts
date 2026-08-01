import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminProject = {
  id: string; slug: string; title: string; summary: string | null; description: string | null;
  status: "draft" | "preparation" | "published" | "archived"; published: boolean;
  type: string | null; updated_at: string;
};
export type SectionDefinition = {
  id: string; section_key: string; label: string; default_sort_order: number;
  is_required: boolean; supports_items: boolean; supports_media: boolean;
};
export type AdminProjectSection = {
  id: string; project_id: string; definition_id: string | null; title: string;
  body: string | null; bullets: string[]; sort_order: number; section_type: "rich_text" | "media_gallery";
  layout_variant: string; is_visible: boolean; is_archived: boolean; updated_at: string;
};
export type AdminSectionItem = { id: string; project_section_id: string; label: string | null; value: string | null; description: string | null; display_order: number; is_visible: boolean; updated_at: string };
export type AdminProjectMedia = { id: string; project_id: string; media_url: string; alt_text: string; caption: string | null; media_type: string; display_order: number; is_visible: boolean; updated_at: string };

const rows = <T>(value: unknown) => Array.isArray(value) ? value as T[] : [];

export const getAdminProjectWorkspace = async (projectId?: string) => {
  const supabase = createSupabaseAdminClient();
  const [projectsResult, definitionsResult, sectionsResult, itemsResult, mediaResult] = await Promise.all([
    supabase.from("projects").select("id,slug,title,summary,description,status,published,type,updated_at").order("projects_page_order"),
    supabase.from("project_section_definitions").select("id,section_key,label,default_sort_order,is_required,supports_items,supports_media").eq("is_active", true).order("default_sort_order"),
    projectId ? supabase.from("project_sections").select("id,project_id,definition_id,title,body,bullets,sort_order,section_type,layout_variant,is_visible,is_archived,updated_at").eq("project_id", projectId).order("sort_order") : Promise.resolve({ data: [], error: null }),
    projectId ? supabase.from("project_section_items").select("id,project_section_id,label,value,description,display_order,is_visible,updated_at").in("project_section_id", (await supabase.from("project_sections").select("id").eq("project_id", projectId)).data?.map((row) => row.id) ?? []).order("display_order") : Promise.resolve({ data: [], error: null }),
    projectId ? supabase.from("project_media").select("id,project_id,media_url,alt_text,caption,media_type,display_order,is_visible,updated_at").eq("project_id", projectId).order("display_order") : Promise.resolve({ data: [], error: null }),
  ]);
  if (projectsResult.error) throw new Error("Projects could not be loaded.");
  const projects = rows<AdminProject>(projectsResult.data);
  return {
    projects,
    project: projects.find((project) => project.id === projectId) ?? null,
    definitions: rows<SectionDefinition>(definitionsResult.data),
    sections: rows<AdminProjectSection>(sectionsResult.data),
    items: rows<AdminSectionItem>(itemsResult.data),
    media: rows<AdminProjectMedia>(mediaResult.data),
    structureAvailable: !definitionsResult.error,
  };
};

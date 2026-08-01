"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { adminFetch, adminApiError, readJsonObject } from "@/components/admin/admin-api";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import type { AdminProject, AdminProjectMedia, AdminProjectSection, AdminSectionItem, SectionDefinition } from "@/lib/admin-project-workspace";

type Mode = "main" | "sections" | "section" | "media" | "review";
type Props = { projects: AdminProject[]; project: AdminProject; definitions: SectionDefinition[]; sections: AdminProjectSection[]; items: AdminSectionItem[]; media: AdminProjectMedia[]; mode: Mode; selectedSectionId?: string; structureAvailable: boolean };
const meaningful = (section: AdminProjectSection) => Boolean(section.body?.trim() || section.bullets.some((bullet) => bullet.trim()));

export const ProjectWorkspace = (props: Props) => {
  const router = useRouter();
  const selected = props.sections.find((section) => section.id === props.selectedSectionId) ?? null;
  const definition = props.definitions.find((item) => item.id === selected?.definition_id);
  const [draft, setDraft] = useState(() => selected ? { ...selected, bulletsText: selected.bullets.join("\n") } : null);
  const [status, setStatus] = useState("");
  const [repairing, setRepairing] = useState(false);
  const dirty = Boolean(selected && draft && (draft.body !== selected.body || draft.bulletsText !== selected.bullets.join("\n") || draft.is_visible !== selected.is_visible));
  useUnsavedChangesGuard(dirty);
  const missing = useMemo(() => props.definitions.filter((item) => !props.sections.some((section) => section.definition_id === item.id)), [props.definitions, props.sections]);
  const base = `/admin/projects/${props.project.id}`;
  const tail = props.mode === "sections" || props.mode === "section" ? "/sections" : props.mode === "media" ? "/media" : props.mode === "review" ? "/review" : "";

  const repair = async () => {
    if (!window.confirm("Repair this project's canonical section structure? Existing content will not be overwritten.")) return;
    setRepairing(true); setStatus("Repairing section structure…");
    const response = await adminFetch(`/api/admin/projects/${props.project.id}/repair-sections`, { method: "POST" });
    const data = await readJsonObject(response);
    setRepairing(false);
    if (!response.ok) { setStatus(adminApiError(data)); return; }
    const added = Array.isArray(data.added) ? data.added.join(", ") : "none";
    setStatus(`Repair complete. Added: ${added}. Existing sections retained.`);
    router.refresh();
  };

  const saveSection = async (event: FormEvent) => {
    event.preventDefault(); if (!draft || !selected) return;
    setStatus("Saving…");
    const response = await adminFetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "project_sections", expectedUpdatedAt: selected.updated_at, values: { ...selected, body: draft.body, bullets: draft.bulletsText.split("\n").map((line) => line.trim()).filter(Boolean), is_visible: draft.is_visible } }) });
    const data = await readJsonObject(response);
    if (!response.ok) { setStatus(adminApiError(data)); return; }
    setStatus("Saved. You remain on this section."); router.refresh();
  };

  return <section className="rounded-xl border border-white/10 bg-[#100b24]/90 p-5 shadow-xl shadow-[#2A0E61]/20">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-cyan-200">Project workspace</p><h1 className="mt-2 text-3xl font-bold text-white">{props.project.title}</h1></div><label className="text-sm">Switch project<select aria-label="Switch project" value={props.project.id} onChange={(event) => router.push(`/admin/projects/${event.target.value}${tail}`)} className="mt-1 block rounded-lg border border-white/10 bg-[#151030] px-3 py-2">{props.projects.filter((project) => project.status !== "archived").map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label></div>
    <nav aria-label="Project workspace" className="mt-6 flex flex-wrap gap-2">{[["Main information", base],["Sections", `${base}/sections`],["Media", `${base}/media`],["Publication review", `${base}/review`]].map(([label, href]) => <Link key={href} href={href} className={`rounded-lg border px-4 py-2 text-sm ${((props.mode === "section" && label === "Sections") || href.endsWith(`/${props.mode}`) || (props.mode === "main" && href === base)) ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 hover:bg-white/5"}`}>{label}</Link>)}</nav>
    {props.mode === "main" && <div className="mt-6 grid gap-4"><p><span className="text-gray-400">Status:</span> {props.project.status}</p><p><span className="text-gray-400">Summary:</span> {props.project.summary || "Empty"}</p><p><span className="text-gray-400">Description:</span> {props.project.description || "Empty"}</p></div>}
    {props.mode === "sections" && <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Sections</h2><p className="text-sm text-gray-400">Order is local to this project. Optional structured items appear only inside a section.</p></div>{(!props.structureAvailable || missing.length > 0) && <button type="button" disabled={repairing || !props.structureAvailable} onClick={() => void repair()} className="button-primary rounded-lg px-4 py-2 disabled:opacity-50">Repair section structure</button>}</div><div className="mt-4 grid gap-3">{props.sections.filter((section) => !section.is_archived).map((section) => { const def=props.definitions.find((item)=>item.id===section.definition_id); const complete=meaningful(section); return <Link key={section.id} href={`${base}/sections/${section.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:border-cyan-300/30"><div><p className="font-semibold text-white">{section.title}</p><p className="mt-1 text-xs text-gray-400">Order within this project: {section.sort_order} · {def?.is_required ? "Required" : "Optional"}</p></div><div className="flex gap-2 text-xs"><span className="rounded-full bg-white/10 px-2 py-1">{section.is_visible ? "Visible" : "Hidden"}</span><span className={`rounded-full px-2 py-1 ${complete ? "bg-emerald-500/15 text-emerald-100" : section.is_visible ? "bg-amber-500/15 text-amber-100" : "bg-white/10"}`}>{complete ? "Complete" : section.is_visible ? "Needs attention" : "Empty"}</span></div></Link>; })}</div><p className="mt-4 text-sm text-cyan-100" aria-live="polite">{status}</p></div>}
    {props.mode === "section" && selected && draft && <form onSubmit={saveSection} className="mt-6"><Link href={`${base}/sections`} className="text-sm text-cyan-200 hover:underline">← Back to sections</Link><div className="mt-4 flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold text-white">{selected.title}</h2><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{definition?.is_required ? "Required" : "Optional"}</span></div><label className="mt-5 block text-sm">Body<textarea value={draft.body ?? ""} onChange={(event)=>setDraft({...draft,body:event.target.value})} className="mt-2 min-h-48 w-full rounded-lg border border-white/10 bg-[#151030] p-3" /></label><label className="mt-4 block text-sm">Bullets (one per line)<textarea value={draft.bulletsText} onChange={(event)=>setDraft({...draft,bulletsText:event.target.value})} className="mt-2 min-h-32 w-full rounded-lg border border-white/10 bg-[#151030] p-3" /></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_visible} onChange={(event)=>setDraft({...draft,is_visible:event.target.checked})} disabled={definition?.is_required} />Visible {definition?.is_required && "(required)"}</label><button type="submit" className="button-primary mt-5 rounded-lg px-5 py-3">Save</button><p className="mt-3 text-sm text-cyan-100" aria-live="polite">{status}</p>{definition?.supports_items && <section className="mt-8 border-t border-white/10 pt-5"><h3 className="font-semibold text-white">Optional section items</h3><p className="text-sm text-gray-400">Facts and metrics are added only when this section needs them.</p><div className="mt-3 grid gap-2">{props.items.filter((item)=>item.project_section_id===selected.id).map((item)=><div key={item.id} className="rounded-lg bg-white/5 p-3 text-sm">{item.label || "Untitled"}: {item.value || item.description || "Empty"}</div>)}</div></section>}</form>}
    {props.mode === "media" && <div className="mt-6"><h2 className="text-xl font-semibold text-white">Project media</h2><div className="mt-4 grid gap-3">{props.media.map((item)=><div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="font-medium">{item.alt_text}</p><p className="break-all text-sm text-gray-400">{item.media_url}</p></div>)}{props.media.length===0&&<p className="text-gray-400">No project media.</p>}</div></div>}
    {props.mode === "review" && <div className="mt-6"><h2 className="text-xl font-semibold text-white">Publication review</h2><p className="mt-2 text-sm text-gray-400">Review visible content before opening the public preview.</p><a href={`/projects/${props.project.slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2">Open public preview in a new tab</a></div>}
  </section>;
};

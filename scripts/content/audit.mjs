import fs from "node:fs";
import path from "node:path";

const parseEnv = (file) => {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter(
        (line) =>
          line &&
          !line.trimStart().startsWith("#") &&
          line.includes("="),
      )
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
};

const localEnv = parseEnv(path.resolve(".env.local"));
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  localEnv.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const failures = [];
const warnings = [];
const snapshots = new Map();

const publicQueries = [
  ["profile", "full_name,availability,published", "published=eq.true"],
  ["hero", "title,tagline,published", "published=eq.true"],
  ["about", "title,body,published", "published=eq.true"],
  ["skills", "name,category,sort_order,published", "published=eq.true"],
  [
    "projects",
    "id,slug,title,summary,description,status,published,seo_title,seo_description,cover_image_url,open_graph_image",
    "published=eq.true&status=eq.published",
  ],
  [
    "project_sections",
    "id,project_id,title,body,bullets,section_type,is_visible,is_archived",
    "is_visible=eq.true&is_archived=eq.false",
  ],
  [
    "project_section_items",
    "id,project_section_id,label,value,description,is_visible",
    "is_visible=eq.true",
  ],
  [
    "project_media",
    "id,project_id,media_url,alt_text,media_type,is_visible",
    "is_visible=eq.true",
  ],
  ["experience", "company,role,points,published", "published=eq.true"],
  ["education", "institution,degree,status,published", "published=eq.true"],
  [
    "certifications",
    "name,issuer,credential_url,published",
    "published=eq.true",
  ],
  ["resumes", "label,variant,pdf_url,docx_url,published", "published=eq.true"],
  ["social_links", "label,url,published", "published=eq.true"],
  ["pages", "id,page_key,title,is_published", "is_published=eq.true"],
  [
    "page_sections",
    "id,page_id,section_type,title,description,is_visible,is_archived",
    "is_visible=eq.true&is_archived=eq.false",
  ],
  [
    "page_section_items",
    "id,page_section_id,title,description,media_url,is_visible",
    "is_visible=eq.true",
  ],
  [
    "volunteering",
    "role,organisation,summary,published,archived",
    "published=eq.true&archived=eq.false",
  ],
];

if (!url || !key) {
  console.log(
    "Content audit: Supabase is not configured; minimal repository fallback mode is active.",
  );
  process.exit(0);
}

console.log(
  "Content audit: inspecting published CMS content through read-only anonymous access.",
);
for (const [table, select, filter] of publicQueries) {
  const response = await fetch(
    `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=500&${filter}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!response.ok) {
    failures.push(
      `${table}: public published read failed with HTTP ${response.status}`,
    );
    continue;
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    failures.push(`${table}: response was not an array`);
    continue;
  }
  snapshots.set(table, rows);
  console.log(`${table}: ${rows.length} published/public row(s).`);
}

const projects = snapshots.get("projects") ?? [];
const sections = snapshots.get("project_sections") ?? [];
const sectionItems = snapshots.get("project_section_items") ?? [];
const media = snapshots.get("project_media") ?? [];

for (const project of projects) {
  if (!String(project.summary || project.description || "").trim()) {
    failures.push(
      `project ${String(project.slug || project.id)} has no public summary`,
    );
  }
  if (!String(project.seo_title || "").trim()) {
    warnings.push(
      `project ${String(project.slug || project.id)} has no SEO title`,
    );
  }
  if (!String(project.seo_description || "").trim()) {
    warnings.push(
      `project ${String(project.slug || project.id)} has no SEO description`,
    );
  }
  if (!String(project.cover_image_url || "").trim()) {
    warnings.push(
      `project ${String(project.slug || project.id)} has no cover image`,
    );
  }
  if (!String(project.open_graph_image || "").trim()) {
    warnings.push(
      `project ${String(project.slug || project.id)} has no social image`,
    );
  }

  if (
    ["vermeg-ai-ready-e-learning-platform", "ai-ready-elearning-platform"]
      .includes(String(project.slug || ""))
  ) {
    const boundaryCopy = [
      project.title,
      project.summary,
      project.description,
    ].join(" ");
    if (
      !/prototype/i.test(boundaryCopy)
      || !/(two-person|two person|team)/i.test(boundaryCopy)
      || !/chatbot/i.test(boundaryCopy)
      || !/selected (application )?services/i.test(boundaryCopy)
      || !/not presented as a production deployment/i.test(boundaryCopy)
      || !/(not sole-authored|not presented .*sole-authored system)/i.test(boundaryCopy)
    ) {
      failures.push(
        `project ${String(project.slug)} does not state the approved VERMEG team-prototype, bounded-contribution, production-presentation and authorship limits`,
      );
    }
  }
}

for (const section of sections) {
  const bullets = Array.isArray(section.bullets)
    ? section.bullets.some((item) => String(item || "").trim())
    : false;
  const hasItems = sectionItems.some(
    (item) =>
      item.project_section_id === section.id &&
      item.is_visible !== false &&
      String(item.value || item.description || "").trim(),
  );
  const acceptsProjectMedia = ["media", "media_gallery"].includes(
    String(section.section_type || ""),
  );
  const hasMedia =
    acceptsProjectMedia &&
    media.some(
      (item) =>
        item.project_id === section.project_id &&
        String(item.media_url || "").trim() &&
        String(item.alt_text || "").trim(),
    );
  if (
    !String(section.body || "").trim() &&
    !bullets &&
    !hasItems &&
    !hasMedia
  ) {
    failures.push(
      `project section ${String(section.id)} is visible but title-only`,
    );
  }
}

const profile = (snapshots.get("profile") ?? [])[0];
if (profile && profile.full_name !== "Ahmed Aziz Mhiri") {
  warnings.push(
    `profile.full_name is "${String(profile.full_name || "empty")}"; the CMS identity is rendered verbatim and should be reviewed`,
  );
}
if (/summer 2027/i.test(String(profile?.availability || ""))) {
  failures.push("profile availability still says Summer 2027");
}
if (
  (snapshots.get("page_sections") ?? []).some((section) =>
    /summer 2027/i.test(String(section.description || "")),
  )
) {
  failures.push("a published page section still says Summer 2027");
}

for (const experience of snapshots.get("experience") ?? []) {
  if (!/^VERMEG/i.test(String(experience.company || ""))) continue;
  const boundaryCopy = [
    experience.role,
    ...(Array.isArray(experience.points) ? experience.points : []),
  ].join(" ");
  if (
    !/prototype/i.test(boundaryCopy)
    || !/(two-person|two person|team)/i.test(boundaryCopy)
    || !/chatbot/i.test(boundaryCopy)
    || !/selected (application )?services/i.test(boundaryCopy)
    || !/not presented as a production deployment/i.test(boundaryCopy)
    || !/(not sole-authored|not presented .*sole-authored system)/i.test(boundaryCopy)
  ) {
    failures.push(
      "VERMEG experience does not state the approved team-prototype, bounded-contribution, production-presentation and authorship limits",
    );
  }
}

const pageKeys = new Set(
  (snapshots.get("pages") ?? []).map((page) => page.page_key),
);
for (const pageKey of [
  "home",
  "about",
  "expertise",
  "projects",
  "experience",
  "education",
  "certifications",
  "resume",
  "contact",
]) {
  if (!pageKeys.has(pageKey)) {
    warnings.push(
      `published page registry is missing ${pageKey}; that route will be noindex and omitted from the sitemap`,
    );
  }
}

warnings.forEach((warning) => console.warn(`WARN ${warning}`));
failures.forEach((failure) => console.error(`FAIL ${failure}`));
console.log(
  `Content audit summary: ${failures.length} failure(s), ${warnings.length} warning(s).`,
);
process.exitCode = failures.length ? 1 : 0;

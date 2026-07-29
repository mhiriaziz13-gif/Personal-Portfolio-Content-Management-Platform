const base = new URL(process.argv[2] || "http://localhost:3000");
const productionOrigin = "https://ahmedaziz-portfolio.vercel.app";
const timeoutMs = 10000;
const failures = [];
const warnings = [];
const responses = new Map();

const fetchPage = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
};
const text = (html, pattern) => html.match(pattern)?.[1]?.trim() || "";
const attribute = (html, selector, name) => {
  const tag = html.match(selector)?.[0] || "";
  return (
    tag.match(new RegExp(`${name}=["']([^"']*)`, "i"))?.[1] || ""
  );
};
const sameOrigin = (href) => {
  try {
    const origin = new URL(href, base).origin;
    return origin === base.origin || origin === productionOrigin;
  } catch {
    return false;
  }
};

for (const [pathname, type] of [
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "xml"],
  ["/llms.txt", "text/plain"],
]) {
  try {
    const response = await fetchPage(new URL(pathname, base));
    if (response.status !== 200) {
      failures.push(`${pathname} returned ${response.status}`);
    }
    if (!response.headers.get("content-type")?.includes(type)) {
      failures.push(`${pathname} has unexpected content type`);
    }
    responses.set(pathname, {
      response,
      html: await response.text(),
    });
  } catch (error) {
    failures.push(`${pathname} request failed: ${error.message}`);
  }
}

const robots = responses.get("/robots.txt")?.html || "";
if (!/disallow:\s*\/admin\//i.test(robots)) {
  failures.push("robots.txt does not disallow /admin/");
}
if (!/disallow:\s*\/api\//i.test(robots)) {
  failures.push("robots.txt does not disallow /api/");
}

const llms = responses.get("/llms.txt")?.html || "";
if (/summer 2027/i.test(llms)) {
  failures.push("llms.txt contains stale Summer 2027 availability");
}
if (!/october 2027/i.test(llms)) {
  failures.push("llms.txt does not state October 2027 availability");
}
const sitemap = responses.get("/sitemap.xml")?.html || "";
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => match[1],
);
const lastModifiedValues = [
  ...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g),
].map((match) => match[1]);
if (!urls.length) failures.push("Sitemap has no URLs");
if (urls.some((url) => !sameOrigin(url))) {
  failures.push("Sitemap contains a cross-origin URL");
}
if (urls.some((url) => /\/(admin|auth|api)(\/|$)/.test(url))) {
  failures.push("Sitemap contains an operational URL");
}
if (lastModifiedValues.length !== urls.length) {
  failures.push("Every sitemap URL must have a lastModified value");
}
if (
  lastModifiedValues.some(
    (value) => !Number.isFinite(Date.parse(value)),
  )
) {
  failures.push("Sitemap contains an invalid lastModified value");
}

for (let index = 0; index < urls.length; index += 4) {
  await Promise.all(
    urls.slice(index, index + 4).map(async (canonicalUrl) => {
      const pathname = new URL(canonicalUrl).pathname;
      const localUrl = new URL(pathname, base);
      try {
        const response = await fetchPage(localUrl);
        const html = await response.text();
        if (response.status !== 200) {
          failures.push(`${pathname} returned ${response.status}`);
        }
        if (
          /\b(private|no-store)\b/i.test(
            response.headers.get("cache-control") || "",
          )
        ) {
          warnings.push(
            `${pathname} is not publicly cacheable: ${response.headers.get("cache-control")}`,
          );
        }
        responses.set(localUrl.toString(), { response, html });
      } catch (error) {
        failures.push(`${pathname} failed: ${error.message}`);
      }
    }),
  );
}

const titles = new Map();
const descriptions = new Map();
const linked = new Set();
for (const [url, { html }] of responses) {
  if (!String(url).startsWith("http")) continue;

  const pathname = new URL(url).pathname;
  const title = text(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = attribute(
    html,
    /<meta[^>]+name=["']description["'][^>]*>/i,
    "content",
  );
  const canonical = attribute(
    html,
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
    "href",
  );
  const expectedCanonical = new URL(pathname, productionOrigin).toString();
  let normalizedCanonical = "";
  try {
    normalizedCanonical = new URL(canonical).toString();
  } catch {
    // The mismatch below reports missing and malformed canonical URLs.
  }
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) failures.push(`${pathname} is missing a title`);
  if (!description) failures.push(`${pathname} is missing a description`);
  if (normalizedCanonical !== expectedCanonical) {
    failures.push(
      `${pathname} canonical is "${canonical}", expected "${expectedCanonical}"`,
    );
  }
  if (h1Count !== 1) {
    failures.push(`${pathname} has ${h1Count} H1 elements`);
  }
  if (/name=["']robots["'][^>]+noindex/i.test(html)) {
    failures.push(`${pathname} is in the sitemap but is noindex`);
  }
  if (!/property=["']og:title["']/.test(html)) {
    failures.push(`${pathname} is missing Open Graph title`);
  }
  if (!/property=["']og:description["']/.test(html)) {
    failures.push(`${pathname} is missing Open Graph description`);
  }
  if (!/property=["']og:image["']/.test(html)) {
    failures.push(`${pathname} is missing an Open Graph image`);
  }
  if (!/name=["']twitter:card["']/.test(html)) {
    failures.push(`${pathname} is missing Twitter metadata`);
  }

  for (const [map, value, label] of [
    [titles, title, "title"],
    [descriptions, description, "description"],
  ]) {
    if (value && map.has(value)) {
      failures.push(
        `${pathname} duplicates ${label} from ${map.get(value)}`,
      );
    } else if (value) {
      map.set(value, pathname);
    }
  }

  for (const match of html.matchAll(/href=["']([^"'#]+)["']/g)) {
    if (sameOrigin(match[1])) {
      linked.add(new URL(match[1], base).pathname);
    }
  }
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(match[1]);
    } catch {
      failures.push(`${pathname} contains invalid JSON-LD`);
    }
  }
  for (const match of html.matchAll(
    /<section[^>]*data-project-section[^>]*>([\s\S]*?)<\/section>/gi,
  )) {
    if (!/<(p|ul|ol|dl|figure|video|a)\b/i.test(match[1])) {
      failures.push(`${pathname} contains a title-only project section`);
    }
  }
  if (
    /hcaptcha\.com|api\.js\?render/.test(html) &&
    pathname === "/"
  ) {
    failures.push("Homepage loads hCaptcha");
  }
  if (
    /\/api\/auth\/logout/.test(html) &&
    !pathname.startsWith("/admin")
  ) {
    failures.push(`${pathname} exposes logout in public markup`);
  }
}

for (const url of urls) {
  const pathname = new URL(url).pathname;
  if (pathname !== "/" && !linked.has(pathname)) {
    warnings.push(`${pathname} may be orphaned from crawled pages`);
  }
}

for (const pathname of ["/admin/login", "/admin/forgot-password"]) {
  try {
    const response = await fetchPage(new URL(pathname, base));
    const html = await response.text();
    if (!/noindex/.test(html)) {
      failures.push(`${pathname} is not noindex`);
    }
  } catch (error) {
    failures.push(`${pathname} request failed: ${error.message}`);
  }
}

console.log(
  `SEO audit: ${failures.length} failure(s), ${warnings.length} warning(s)`,
);
warnings.forEach((warning) => console.warn(`WARN ${warning}`));
failures.forEach((failure) => console.error(`FAIL ${failure}`));
process.exitCode = failures.length ? 1 : 0;

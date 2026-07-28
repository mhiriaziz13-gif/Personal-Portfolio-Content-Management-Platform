#!/usr/bin/env node

const rawTarget = process.env.SECURITY_TARGET_URL?.trim();

if (!rawTarget) {
  console.error("SECURITY_TARGET_URL is required (for example, https://example.com).");
  process.exitCode = 2;
} else {
  await main(rawTarget);
}

async function main(rawUrl) {
  let target;

  try {
    target = new URL(rawUrl);
  } catch {
    console.error("SECURITY_TARGET_URL must be a valid absolute URL.");
    process.exitCode = 2;
    return;
  }

  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
    console.error("SECURITY_TARGET_URL must be an HTTP(S) URL without embedded credentials.");
    process.exitCode = 2;
    return;
  }

  target.pathname = "/";
  target.search = "";
  target.hash = "";

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLoopback = loopbackHosts.has(target.hostname.toLowerCase());

  if (!isLoopback && target.protocol !== "https:") {
    console.error("A non-loopback SECURITY_TARGET_URL must use HTTPS.");
    process.exitCode = 2;
    return;
  }

  const results = { passed: [], warnings: [], failures: [] };
  const pass = (message) => results.passed.push(message);
  const warn = (message) => results.warnings.push(message);
  const fail = (message) => results.failures.push(message);

  const request = async (pathOrUrl, options = {}) => {
    const url = new URL(pathOrUrl, target);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "*/*",
          "User-Agent": "portfolio-production-security-verifier/1.0",
          ...options.headers,
        },
      });
      const body = await response.text();
      return { body, response, url };
    } finally {
      clearTimeout(timeout);
    }
  };

  const safely = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      fail(`${label}: request failed (${reason}).`);
    }
  };

  let homepage;

  await safely("Homepage", async () => {
    homepage = await request("/");
    const { body, response } = homepage;
    const status = response.status;

    if (status >= 200 && status < 300) {
      pass(`Homepage returned ${status}.`);
    } else {
      fail(`Homepage returned unexpected status ${status}.`);
    }

    const poweredBy = response.headers.get("x-powered-by");
    poweredBy ? fail("X-Powered-By is exposed.") : pass("X-Powered-By is absent.");

    const hsts = response.headers.get("strict-transport-security") ?? "";
    if (target.protocol === "https:") {
      /max-age=\d+/i.test(hsts)
        ? pass("HSTS includes max-age.")
        : fail("HSTS is missing or malformed.");
      /includeSubDomains/i.test(hsts)
        ? pass("HSTS includes subdomains.")
        : fail("HSTS does not include subdomains.");
      hsts.includes(",")
        ? fail("HSTS appears more than once.")
        : pass("HSTS is emitted once.");
    }

    response.headers.get("x-content-type-options")?.toLowerCase() === "nosniff"
      ? pass("X-Content-Type-Options is nosniff.")
      : fail("X-Content-Type-Options: nosniff is missing.");

    response.headers.get("referrer-policy")
      ? pass("Referrer-Policy is present.")
      : fail("Referrer-Policy is missing.");
    response.headers.get("permissions-policy")
      ? pass("Permissions-Policy is present.")
      : fail("Permissions-Policy is missing.");

    const csp = response.headers.get("content-security-policy") ?? "";
    csp ? pass("Content-Security-Policy is present.") : fail("Content-Security-Policy is missing.");
    /(?:^|;)\s*object-src\s+[^;]*'none'/i.test(csp)
      ? pass("CSP blocks objects.")
      : fail("CSP does not contain object-src 'none'.");
    /(?:^|;)\s*frame-ancestors\s+[^;]*'none'/i.test(csp)
      ? pass("CSP blocks framing.")
      : fail("CSP does not contain frame-ancestors 'none'.");
    /(?:^|;)\s*script-src-attr\s+[^;]*'none'/i.test(csp)
      ? pass("CSP blocks inline script attributes.")
      : fail("CSP does not contain script-src-attr 'none'.");
    csp.includes("'unsafe-eval'")
      ? fail("Production CSP contains unsafe-eval.")
      : pass("Production CSP omits unsafe-eval.");

    if (response.headers.get("x-permitted-cross-domain-policies")?.toLowerCase() === "none") {
      pass("Legacy cross-domain policy files are disabled.");
    } else {
      warn("X-Permitted-Cross-Domain-Policies: none is not deployed yet.");
    }

    body.includes("/api/auth/logout")
      ? fail("The ordinary homepage markup references the logout endpoint.")
      : pass("The ordinary homepage markup does not reference the logout endpoint.");

    /(?:^|[/.])hcaptcha\.com/i.test(body)
      ? fail("The ordinary homepage markup loads the hCaptcha widget.")
      : pass("The ordinary homepage markup does not load the hCaptcha widget.");

    const setCookie = response.headers.get("set-cookie") ?? "";
    /(?:max-age=0|expires=Thu, 01 Jan 1970)/i.test(setCookie)
      ? fail("An ordinary homepage request clears a cookie.")
      : pass("An ordinary homepage request does not clear cookies.");
  });

  if (!isLoopback && target.protocol === "https:") {
    await safely("HTTP redirect", async () => {
      const httpUrl = new URL(target);
      httpUrl.protocol = "http:";
      if (httpUrl.port === "443") httpUrl.port = "";

      const { body, response } = await request(httpUrl);
      const location = response.headers.get("location");
      const redirectTarget = location ? new URL(location, httpUrl) : null;

      if (
        response.status >= 300 &&
        response.status < 400 &&
        redirectTarget?.origin === target.origin &&
        redirectTarget.pathname === target.pathname
      ) {
        pass(`HTTP redirects to HTTPS (${response.status}).`);
      } else {
        fail(`HTTP did not redirect safely to the same HTTPS origin (status ${response.status}).`);
      }

      response.headers.get("set-cookie")
        ? fail("The HTTP redirect sets a cookie.")
        : pass("The HTTP redirect does not set cookies.");
      /<html|<!doctype/i.test(body) || body.length > 512
        ? fail("The HTTP redirect returned application content.")
        : pass("The HTTP redirect returned no application content.");
    });
  } else {
    warn("HTTP-to-HTTPS redirect check skipped for a loopback target.");
  }

  await safely("security.txt", async () => {
    const { body, response } = await request("/.well-known/security.txt");
    response.status === 200
      ? pass("security.txt is published.")
      : fail(`security.txt returned ${response.status}.`);
    response.headers.get("content-type")?.toLowerCase().startsWith("text/plain")
      ? pass("security.txt uses text/plain.")
      : fail("security.txt does not use text/plain.");
    /^Contact:/im.test(body) && /^Expires:/im.test(body)
      ? pass("security.txt includes Contact and Expires fields.")
      : warn("security.txt is missing a Contact or Expires field.");
  });

  const adminApiPaths = [
    "/api/admin/content",
    "/api/admin/messages",
    "/api/admin/resumes",
    "/api/admin/settings",
    "/api/admin/upload",
    "/api/admin/whoami",
  ];

  await Promise.all(adminApiPaths.map((path) => safely(`Admin API ${path}`, async () => {
    const hostileOrigin = "https://security-verifier.invalid";
    const { response } = await request(path, { headers: { Origin: hostileOrigin } });
    const denied = response.status === 401 || response.status === 403;
    const unavailable = response.status === 404 || response.status === 405;
    const authenticationUnavailable = response.status === 503;

    if (denied || unavailable || authenticationUnavailable) {
      pass(`${path} is not public (${response.status}).`);
    } else {
      fail(`${path} returned unexpected unauthenticated status ${response.status}.`);
    }

    const allowOrigin = response.headers.get("access-control-allow-origin")?.trim();
    const allowsHostileOrigin = allowOrigin === "*" || allowOrigin === hostileOrigin;
    allowsHostileOrigin
      ? fail(`${path} permits a wildcard or untrusted test origin through CORS.`)
      : pass(`${path} does not permit a wildcard or untrusted test origin through CORS.`);

    if (denied || authenticationUnavailable) {
      const cacheControl = response.headers.get("cache-control") ?? "";
      /private/i.test(cacheControl) && /no-store/i.test(cacheControl)
        ? pass(`${path} denies caching of its authentication response.`)
        : fail(`${path} authentication response is not private, no-store.`);
    }
  })));

  await safely("Logout GET", async () => {
    const { response } = await request("/api/auth/logout");
    [401, 403, 404, 405].includes(response.status)
      ? pass(`Logout rejects GET (${response.status}).`)
      : fail(`Logout accepted or redirected GET with status ${response.status}.`);
    response.headers.get("set-cookie")
      ? fail("Logout GET changes cookies.")
      : pass("Logout GET does not change cookies.");
  });

  await safely("Admin route", async () => {
    const { response } = await request("/admin");
    const location = response.headers.get("location");
    const redirectTarget = location ? new URL(location, target) : null;
    const safeStatus = [401, 403, 404].includes(response.status) ||
      (response.status >= 300 &&
        response.status < 400 &&
        redirectTarget?.origin === target.origin);
    safeStatus
      ? pass(`Unauthenticated /admin is protected (${response.status}).`)
      : fail(`Unauthenticated /admin returned unexpected status ${response.status}.`);
  });

  await safely("Admin login route", async () => {
    const { response } = await request("/admin/login");
    const location = response.headers.get("location");
    const redirectTarget = location ? new URL(location, target) : null;
    const isSuccessful = response.status >= 200 && response.status < 300;
    const isSafeRedirect = response.status >= 300 &&
      response.status < 400 &&
      redirectTarget?.origin === target.origin;

    if (isSuccessful || isSafeRedirect) {
      pass(`/admin/login is reachable (${response.status}).`);
    } else {
      warn(`/admin/login returned ${response.status} without a same-origin redirect.`);
    }
  });

  await Promise.all(["/robots.txt", "/sitemap.xml"].map((path) => safely(path, async () => {
    const { response } = await request(path);
    response.status === 200
      ? pass(`${path} is published.`)
      : warn(`${path} returned ${response.status}.`);
  })));

  const sensitivePaths = [
    "/.env",
    "/.env.local",
    "/.git/config",
    "/package.json",
    "/package-lock.json",
    "/next.config.js",
    "/next.config.ts",
    "/vercel.json",
    "/supabase/schema.sql",
    "/backup.zip",
    "/database.sql",
    "/dump.sql",
    "/phpinfo.php",
    "/server-status",
  ];

  await Promise.all(sensitivePaths.map((path) => safely(`Sensitive path ${path}`, async () => {
    const { response } = await request(path);
    if (response.status >= 200 && response.status < 300) {
      fail(`${path} is publicly retrievable (${response.status}).`);
    } else if (response.status >= 300 && response.status < 400) {
      fail(`${path} returned an unexpected redirect (${response.status}).`);
    } else if (response.status >= 400 && response.status < 500) {
      pass(`${path} is not publicly retrievable (${response.status}).`);
    } else {
      warn(`${path} could not be conclusively checked (${response.status}).`);
    }
  })));

  if (homepage) {
    const scriptSources = Array.from(
      homepage.body.matchAll(/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi),
      (match) => match[1],
    )
      .map((source) => new URL(source, target))
      .filter((url) => url.origin === target.origin)
      .slice(0, 20);

    if (scriptSources.length > 0) {
      await safely("Static JavaScript asset", async () => {
        const { response } = await request(scriptSources[0]);
        const contentType = response.headers.get("content-type") ?? "";
        if (response.status === 200 && /javascript/i.test(contentType)) {
          pass("A same-origin production JavaScript chunk loaded successfully.");
        } else {
          fail(`The sampled JavaScript chunk returned ${response.status} (${contentType || "no content type"}).`);
        }
      });
    } else {
      warn("No same-origin JavaScript chunk was discoverable in the homepage markup.");
    }

    const imageSources = Array.from(
      homepage.body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
      (match) => match[1].replaceAll("&amp;", "&"),
    )
      .map((source) => new URL(source, target))
      .filter((url) => url.origin === target.origin);

    if (imageSources.length > 0) {
      await safely("Public image asset", async () => {
        const { response } = await request(imageSources[0]);
        const contentType = response.headers.get("content-type") ?? "";
        if (response.status === 200 && /^image\//i.test(contentType)) {
          pass("A same-origin public image loaded successfully.");
        } else {
          fail(`The sampled public image returned ${response.status} (${contentType || "no content type"}).`);
        }
      });
    } else {
      warn("No same-origin image was discoverable in the homepage markup.");
    }

    await Promise.all(scriptSources.map((scriptUrl) => safely(`Source map ${scriptUrl.pathname}`, async () => {
      const mapUrl = new URL(scriptUrl);
      mapUrl.search = "";
      mapUrl.pathname = `${mapUrl.pathname}.map`;
      const { response } = await request(mapUrl);
      if (response.status >= 200 && response.status < 300) {
        fail(`A production JavaScript source map is public for ${scriptUrl.pathname}.`);
      } else if (response.status >= 300 && response.status < 400) {
        fail(`The source-map probe redirected unexpectedly for ${scriptUrl.pathname}.`);
      } else if (response.status >= 400 && response.status < 500) {
        pass(`No source map is public for ${scriptUrl.pathname}.`);
      } else {
        warn(`The source-map probe was inconclusive for ${scriptUrl.pathname} (${response.status}).`);
      }
    })));
  }

  console.log(`Security verification target: ${target.origin}`);
  for (const message of results.failures) console.error(`FAIL: ${message}`);
  for (const message of results.warnings) console.warn(`WARN: ${message}`);
  console.log(
    `Summary: ${results.passed.length} passed, ${results.warnings.length} warning(s), ${results.failures.length} failure(s).`,
  );

  process.exitCode = results.failures.length > 0 ? 1 : 0;
}

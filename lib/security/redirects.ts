const redirectBase = new URL("https://internal.invalid");
const controlCharacters = /[\u0000-\u001f\u007f]/;

const decodeRedirect = (value: string) => {
  let decoded = value;

  // Decode nested encodings before validating. This prevents values such as
  // `/%255cevil.example` from becoming an authority-changing backslash after
  // another layer (browser, framework, or proxy) decodes the path.
  for (let pass = 0; pass < 8; pass += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;

    if (pass === 7 && decodeURIComponent(decoded) !== decoded) {
      throw new URIError("Redirect is encoded too many times.");
    }
  }

  return decoded;
};

const normalizeInternalPath = (value: string) => {
  const decoded = decodeRedirect(value.trim());

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    controlCharacters.test(decoded)
  ) {
    return null;
  }

  const resolved = new URL(decoded, redirectBase);
  if (resolved.origin !== redirectBase.origin) {
    return null;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

export const isSafeInternalPath = (value: string) => {
  try {
    return normalizeInternalPath(value) !== null;
  } catch {
    return false;
  }
};

export const safeRedirect = (
  value: string | null | undefined,
  fallback = "/admin",
) => {
  if (!value) {
    return fallback;
  }

  try {
    return normalizeInternalPath(value) ?? fallback;
  } catch {
    return fallback;
  }
};

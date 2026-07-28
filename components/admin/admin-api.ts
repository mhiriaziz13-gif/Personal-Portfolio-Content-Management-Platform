import type {
  AdminProfileSettings,
  ContactMessage,
  MessageStatus,
  UploadBucket,
  UploadRecord,
} from "@/lib/cms-types";

export type AdminRequest = (url: string, init?: RequestInit) => Promise<Response>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const readJsonObject = async (response: Response): Promise<Record<string, unknown>> => {
  const value: unknown = await response.json().catch(() => ({}));
  return isRecord(value) ? value : {};
};

const stringOrEmpty = (value: unknown) => typeof value === "string" ? value : "";
const nullableString = (value: unknown) => typeof value === "string" ? value : null;
const safePublicAssetUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  return (value.startsWith("/") && !value.startsWith("//")) || value.toLowerCase().startsWith("https://")
    ? value
    : null;
};
const messageStatuses = new Set<MessageStatus>(["new", "read", "archived"]);
const deliveryStatuses = new Set<ContactMessage["delivery_status"]>([
  "not_requested",
  "pending",
  "sending",
  "sent",
  "failed",
]);
const uploadBuckets = new Set<UploadBucket>([
  "public-assets",
  "project-images",
  "resumes",
  "uploads",
]);
const csrfHeaderName = "x-csrf-token";
const csrfEndpoint = "/api/auth/csrf";
let csrfTokenPromise: Promise<string> | null = null;

const loadCsrfToken = async () => {
  const response = await fetch(csrfEndpoint, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await readJsonObject(response);
  const token = typeof data.token === "string" ? data.token : "";

  if (!response.ok || !token) {
    throw new Error("CSRF token could not be created.");
  }

  return token;
};

const csrfToken = (refresh = false) => {
  if (refresh) csrfTokenPromise = null;
  csrfTokenPromise ??= loadCsrfToken().catch((error) => {
    csrfTokenPromise = null;
    throw error;
  });
  return csrfTokenPromise;
};

const requestNeedsCsrf = (method?: string) =>
  !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());

export const parseContactMessages = (value: unknown): ContactMessage[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = stringOrEmpty(item.id);
    const status = stringOrEmpty(item.status) as MessageStatus;
    const deliveryStatus = stringOrEmpty(
      item.delivery_status,
    ) as ContactMessage["delivery_status"];
    if (!id || !messageStatuses.has(status)) return [];

    const createdAt = stringOrEmpty(item.created_at);
    return [{
      id,
      name: stringOrEmpty(item.name),
      email: stringOrEmpty(item.email),
      message: stringOrEmpty(item.message),
      source: nullableString(item.source),
      status,
      delivery_status: deliveryStatuses.has(deliveryStatus)
        ? deliveryStatus
        : "not_requested",
      delivery_attempts:
        typeof item.delivery_attempts === "number" &&
        Number.isFinite(item.delivery_attempts)
          ? item.delivery_attempts
          : 0,
      last_delivery_attempt_at: nullableString(item.last_delivery_attempt_at),
      next_delivery_attempt_at: nullableString(item.next_delivery_attempt_at),
      delivered_at: nullableString(item.delivered_at),
      delivery_error_code: nullableString(item.delivery_error_code),
      provider_message_id: nullableString(item.provider_message_id),
      created_at: createdAt,
      updated_at: stringOrEmpty(item.updated_at) || createdAt,
      read_at: nullableString(item.read_at),
      archived_at: nullableString(item.archived_at),
    }];
  });
};

export const parseUploads = (value: unknown): UploadRecord[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = stringOrEmpty(item.id);
    const bucket = stringOrEmpty(item.bucket) as UploadBucket;
    const path = stringOrEmpty(item.path);
    if (!id || !path || !uploadBuckets.has(bucket)) return [];

    return [{
      id,
      source: item.source === "local" ? "local" : "storage",
      bucket,
      path,
      public_url: safePublicAssetUrl(item.public_url),
      mime_type: nullableString(item.mime_type),
      size_bytes: typeof item.size_bytes === "number" ? item.size_bytes : null,
      original_name: nullableString(item.original_name),
      uploaded_by: nullableString(item.uploaded_by),
      created_at: stringOrEmpty(item.created_at),
      sha256: nullableString(item.sha256),
      deletion_status:
        item.deletion_status === "pending"
        || item.deletion_status === "failed"
          ? item.deletion_status
          : "active",
      deletion_requested_at: nullableString(item.deletion_requested_at),
      deletion_error_code: nullableString(item.deletion_error_code),
    }];
  });
};

export const parseAdminProfile = (value: unknown): AdminProfileSettings => {
  const profile = isRecord(value) ? value : {};
  return {
    displayName: stringOrEmpty(profile.displayName),
    jobTitle: stringOrEmpty(profile.jobTitle),
    phone: stringOrEmpty(profile.phone),
    avatarUrl: stringOrEmpty(profile.avatarUrl),
    timezone: stringOrEmpty(profile.timezone),
    language: stringOrEmpty(profile.language),
  };
};

export const adminApiError = (value: unknown) => {
  const data = isRecord(value) ? value : {};
  const code = typeof data.code === "string" ? data.code : "";
  const error = typeof data.error === "string" ? data.error : "";

  switch (code) {
    case "not_authenticated":
      return "Your session expired. Please log in again.";
    case "not_admin":
      return "This account is not authorized to change CMS content.";
    case "mfa_required":
      return "MFA verification is required before this action.";
    case "validation_error":
      return error || "Please check the submitted fields.";
    case "origin_not_allowed":
      return "This request was blocked by the site origin check. Refresh and try again.";
    case "csrf_invalid":
      return "This security token expired. Refresh and try again.";
    case "fresh_mfa_required":
      return "Enter a current authenticator code before changing security settings.";
    case "content_conflict":
    case "edit_conflict":
      return error || "This content conflicts with another saved entry. Reload and review the order or stable key.";
    case "server_error":
      return "The server could not complete this CMS action.";
    default:
      return error || "The CMS action could not be completed.";
  }
};

export const adminFetch = async (
  url: string,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers);
  const needsCsrf = requestNeedsCsrf(init.method);

  if (needsCsrf && !headers.has(csrfHeaderName)) {
    headers.set(csrfHeaderName, await csrfToken());
  }

  const requestInit = {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  } satisfies RequestInit;
  let response = await fetch(url, requestInit);

  if (needsCsrf && response.status === 403) {
    const error = await readJsonObject(response.clone());
    if (error.code === "csrf_invalid") {
      headers.set(csrfHeaderName, await csrfToken(true));
      response = await fetch(url, { ...requestInit, headers });
    }
  }

  return response;
};

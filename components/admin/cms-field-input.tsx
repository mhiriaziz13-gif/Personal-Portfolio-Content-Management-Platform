"use client";

import type { UploadBucket } from "@/lib/cms-types";

import type { AdminRequest } from "./admin-api";
import { AssetFieldInput } from "./asset-field-input";

type SharedField = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  example?: string;
  readOnly?: boolean;
  advanced?: boolean;
  group?: string;
};

type StandardField = SharedField & {
  kind?: "text" | "external-url" | "email" | "textarea" | "list" | "number" | "checkbox" | "select";
  options?: readonly (string | { label: string; value: string })[];
};

type AssetField = SharedField & {
  kind: "asset-image" | "asset-document";
  bucket: UploadBucket;
  accept: string;
  allowedMimeTypes: readonly string[];
};

export type CmsField = StandardField | AssetField;

type CmsFieldInputProps = {
  field: CmsField;
  value: unknown;
  request: AdminRequest;
  onChange: (value: unknown) => void;
};

export const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const pdfMimeTypes = ["application/pdf"] as const;
export const docxMimeTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;

const inputClass = "w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/60";

export function CmsFieldInput({ field, value, request, onChange }: CmsFieldInputProps) {
  const hintId = `cms-field-${field.key}-hint`;
  const hint = field.helpText || field.example;
  const label = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span>{field.label}</span>
        {field.advanced && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-gray-400">
            Advanced
          </span>
        )}
      </span>
      {hint && (
        <span id={hintId} className="text-xs leading-5 text-gray-500">
          {field.helpText}
          {field.helpText && field.example ? " " : ""}
          {field.example ? `Example: ${field.example}` : ""}
        </span>
      )}
    </>
  );

  if (field.kind === "asset-image" || field.kind === "asset-document") {
    return (
      <AssetFieldInput
        label={field.label}
        value={String(value ?? "")}
        kind={field.kind === "asset-image" ? "image" : "document"}
        bucket={field.bucket}
        accept={field.accept}
        allowedMimeTypes={field.allowedMimeTypes}
        required={field.required}
        placeholder={field.placeholder}
        request={request}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "checkbox") {
    return (
      <label className="flex items-center gap-3 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 accent-cyan-400"
          disabled={field.readOnly}
          aria-describedby={hint ? hintId : undefined}
        />
        <span className="grid gap-1">{label}</span>
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="grid gap-2 text-sm text-gray-300">
        {label}
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          required={field.required}
          disabled={field.readOnly}
          aria-describedby={hint ? hintId : undefined}
        >
          <option value="">Choose an option</option>
          {field.options?.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const label = typeof option === "string" ? option : option.label;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      </label>
    );
  }

  if (field.kind === "textarea" || field.kind === "list") {
    const shown = field.kind === "list" && Array.isArray(value) ? value.join("\n") : String(value ?? "");
    return (
      <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
        <span>
          {label}
          {field.kind === "list" ? (
            <span className="text-xs text-gray-500">One item per line.</span>
          ) : null}
        </span>
        <textarea
          value={shown}
          onChange={(event) => onChange(field.kind === "list"
            ? event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)
            : event.target.value)}
          className={`${inputClass} min-h-28 resize-y`}
          required={field.required}
          readOnly={field.readOnly}
          aria-describedby={hint ? hintId : undefined}
        />
      </label>
    );
  }

  const inputType = field.kind === "number"
    ? "number"
    : field.kind === "email"
      ? "email"
      : field.kind === "external-url"
        ? "url"
        : "text";

  return (
    <label className="grid gap-2 text-sm text-gray-300">
      {label}
      <input
        type={inputType}
        value={String(value ?? "")}
        onChange={(event) => onChange(field.kind === "number" ? Number(event.target.value) : event.target.value)}
        className={inputClass}
        required={field.required}
        placeholder={field.placeholder}
        readOnly={field.readOnly}
        aria-describedby={hint ? hintId : undefined}
      />
    </label>
  );
}

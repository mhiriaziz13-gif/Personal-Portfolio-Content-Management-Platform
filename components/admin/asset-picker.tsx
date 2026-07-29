"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiFileText, FiRefreshCw, FiX } from "react-icons/fi";

import type { UploadBucket, UploadRecord } from "@/lib/cms-types";

import {
  adminApiError,
  type AdminRequest,
  parseUploads,
  readJsonObject,
} from "./admin-api";
import { AssetImagePreview } from "./asset-image-preview";

type AssetPickerProps = {
  bucket: UploadBucket;
  allowedMimeTypes: readonly string[];
  request: AdminRequest;
  onSelect: (asset: UploadRecord) => void;
  onClose: () => void;
};

const assetName = (asset: UploadRecord) => asset.original_name || asset.path.split("/").pop() || "Asset";

export function AssetPicker({
  bucket,
  allowedMimeTypes,
  request,
  onSelect,
  onClose,
}: AssetPickerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [assets, setAssets] = useState<UploadRecord[]>([]);
  const [status, setStatus] = useState("Loading assets...");

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAssets = async () => {
      try {
        const response = await request(
          `/api/admin/upload?bucket=${encodeURIComponent(bucket)}&limit=200`,
          { signal: controller.signal },
        );
        const data = await readJsonObject(response);
        if (!response.ok || data.ok !== true) {
          setStatus(adminApiError(data));
          return;
        }

        const matching = parseUploads(data.uploads).filter((asset) =>
          Boolean(asset.public_url)
          && asset.bucket === bucket
          && asset.deletion_status === "active"
          && Boolean(asset.mime_type)
          && allowedMimeTypes.includes(asset.mime_type ?? ""),
        );
        setAssets(matching);
        setStatus(matching.length ? "" : "No compatible public assets are available in this bucket.");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("Could not load the Media Library.");
        }
      }
    };

    void loadAssets();
    return () => controller.abort();
  }, [allowedMimeTypes, bucket, request]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#100b24] shadow-2xl shadow-black/60"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-white">Choose an existing asset</h2>
            <p className="mt-1 text-sm text-gray-400">Showing compatible public files from <span className="font-mono text-cyan-200">{bucket}</span>.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close asset picker"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-200 hover:bg-white/10"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[calc(85vh-5.5rem)] overflow-y-auto p-5">
          {status === "Loading assets..." && (
            <p className="flex items-center justify-center gap-2 py-14 text-sm text-gray-300">
              <FiRefreshCw aria-hidden="true" className="animate-spin" />
              {status}
            </p>
          )}

          {assets.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => {
                const name = assetName(asset);
                const isImage = asset.mime_type?.startsWith("image/") ?? false;
                return (
                  <article key={asset.id} className="min-w-0 rounded-xl border border-white/10 bg-white/5 p-3">
                    {isImage && asset.public_url ? (
                      <AssetImagePreview
                        key={asset.public_url}
                        src={asset.public_url}
                        alt={`Preview of ${name}`}
                        className="h-32 w-full"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-black/20 text-cyan-200">
                        <FiFileText aria-hidden="true" className="h-9 w-9" />
                      </div>
                    )}
                    <h3 className="mt-3 truncate text-sm font-semibold text-white" title={name}>{name}</h3>
                    <p className="mt-1 truncate text-xs text-gray-500" title={asset.mime_type ?? undefined}>{asset.mime_type ?? "Unknown type"}</p>
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="button-primary mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    >
                      Use this asset
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {status && status !== "Loading assets..." && (
            <p className="py-12 text-center text-sm text-gray-400" aria-live="polite">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
}

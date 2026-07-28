"use client";

import { useEffect, useState } from "react";

import {
  adminApiError,
  type AdminRequest,
  isRecord,
  readJsonObject,
} from "./admin-api";

type Revision = {
  id: string;
  operation: string;
  changedFields: string[];
  previousValues: Record<string, unknown> | null;
  nextValues: Record<string, unknown> | null;
  createdAt: string;
};

const parseRevisions = (value: unknown): Revision[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string") return [];

    return [{
      id: item.id,
      operation:
        typeof item.operation === "string" ? item.operation : "update",
      changedFields: Array.isArray(item.changed_fields)
        ? item.changed_fields.filter(
          (field): field is string => typeof field === "string",
        )
        : [],
      previousValues: isRecord(item.previous_values)
        ? item.previous_values
        : null,
      nextValues: isRecord(item.next_values) ? item.next_values : null,
      createdAt:
        typeof item.created_at === "string" ? item.created_at : "",
    }];
  });
};

const formatRevisionValues = (value: Record<string, unknown> | null) =>
  value ? JSON.stringify(value, null, 2) : "No values";

export const RevisionHistory = ({
  table,
  recordId,
  request,
}: {
  table: string;
  recordId: string;
  request: AdminRequest;
}) => {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [status, setStatus] = useState("Loading revision history...");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const parameters = new URLSearchParams({
          table,
          id: recordId,
          limit: "20",
        });
        const response = await request(
          `/api/admin/revisions?${parameters.toString()}`,
        );
        const data = await readJsonObject(response);
        if (cancelled) return;

        if (!response.ok || data.ok !== true) {
          setStatus(adminApiError(data));
          return;
        }

        const parsed = parseRevisions(data.revisions);
        setRevisions(parsed);
        setStatus(parsed.length === 0 ? "No revisions recorded yet." : "");
      } catch {
        if (!cancelled) {
          setStatus("Revision history could not be loaded.");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [recordId, request, table]);

  return (
    <aside
      aria-labelledby="revision-history-title"
      className="mt-8 rounded-lg border border-white/10 bg-black/15 p-4"
    >
      <h3 id="revision-history-title" className="font-semibold text-white">
        Revision history
      </h3>
      {status && (
        <p className="mt-2 text-sm text-gray-400" role="status">
          {status}
        </p>
      )}
      {revisions.length > 0 && (
        <ol className="mt-3 space-y-2">
          {revisions.map((revision) => (
            <li key={revision.id}>
              <details className="rounded-lg border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer text-sm text-gray-200">
                  <span className="font-medium capitalize">
                    {revision.operation}
                  </span>
                  {" · "}
                  {revision.createdAt
                    ? new Date(revision.createdAt).toLocaleString()
                    : "Unknown time"}
                  {revision.changedFields.length > 0
                    ? ` · ${revision.changedFields.join(", ")}`
                    : ""}
                </summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Before
                    </p>
                    <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-gray-300">
                      {formatRevisionValues(revision.previousValues)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      After
                    </p>
                    <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-gray-300">
                      {formatRevisionValues(revision.nextValues)}
                    </pre>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
};

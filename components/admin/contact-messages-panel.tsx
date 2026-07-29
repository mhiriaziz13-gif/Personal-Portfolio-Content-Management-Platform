"use client";

import { useEffect, useState } from "react";
import {
  FiArchive,
  FiEye,
  FiMail,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";

import type { ContactMessage, MessageAction } from "@/lib/cms-types";

const STALE_DELIVERY_CLAIM_MS = 5 * 60 * 1_000;

type ContactMessagesPanelProps = {
  messages: ContactMessage[];
  pendingMessageId: string | null;
  status: string;
  onAction: (id: string, action: MessageAction) => Promise<void>;
  onDelete: (message: ContactMessage) => Promise<void>;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function ContactMessagesPanel({
  messages,
  pendingMessageId,
  status,
  onAction,
  onDelete,
}: ContactMessagesPanelProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentTime(Date.now()),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  const inbox = messages
    .filter((message) => message.status === "new" || message.status === "read")
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Contact Messages</h2>
          <p className="mt-2 text-sm text-gray-400">New and read messages appear here. Archived messages are available in Settings.</p>
        </div>
        <p className="text-sm text-gray-400">{inbox.length} in inbox</p>
      </div>

      <div className="mt-6 grid gap-4">
        {inbox.map((message) => {
          const isNew = message.status === "new";
          const isPending = pendingMessageId === message.id;
          const lastAttemptTimestamp = message.last_delivery_attempt_at
            ? Date.parse(message.last_delivery_attempt_at)
            : Number.NaN;
          const hasStaleDeliveryClaim =
            message.delivery_status === "sending"
            && (
              !Number.isFinite(lastAttemptTimestamp)
              || (
                currentTime > 0
                && currentTime - lastAttemptTimestamp
                    >= STALE_DELIVERY_CLAIM_MS
              )
            );
          return (
            <article
              key={message.id}
              aria-busy={isPending}
              className={isNew
                ? "rounded-xl border border-cyan-300/35 bg-cyan-400/[0.08] p-4 shadow-lg shadow-cyan-950/20"
                : "rounded-xl border border-white/10 bg-white/5 p-4"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{message.name || "Unknown sender"}</h3>
                    {isNew && <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[#100b24]">NEW</span>}
                  </div>
                  <a href={`mailto:${message.email}`} className="break-all text-sm text-cyan-200 hover:text-cyan-100">{message.email}</a>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{message.status}</span>
                  <time dateTime={message.created_at} className="mt-1 block text-xs text-gray-500">
                    {formatDateTime(message.created_at)}
                  </time>
                  <span
                    className={
                      message.delivery_status === "sent"
                        ? "mt-1 block text-xs text-emerald-300"
                        : message.delivery_status === "failed"
                          ? "mt-1 block text-xs text-amber-300"
                          : "mt-1 block text-xs text-gray-500"
                    }
                  >
                    Notification: {message.delivery_status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">{message.message}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {isNew ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void onAction(message.id, "mark_read")}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <FiEye aria-hidden="true" />
                    Mark read
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void onAction(message.id, "mark_unread")}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <FiMail aria-hidden="true" />
                    Mark unread
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void onAction(message.id, "archive")}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-300/20 bg-purple-500/10 px-3 py-2 text-sm text-purple-100 hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-50"
                >
                  <FiArchive aria-hidden="true" />
                  Archive
                </button>
                {(message.delivery_status === "failed" || hasStaleDeliveryClaim) && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void onAction(message.id, "resend_notification")}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-50"
                  >
                    <FiRefreshCw aria-hidden="true" />
                    {hasStaleDeliveryClaim
                      ? "Reconcile notification"
                      : "Retry notification"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void onDelete(message)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                >
                  <FiTrash2 aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          );
        })}

        {!inbox.length && (
          <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
            <FiEye aria-hidden="true" className="mx-auto h-8 w-8 text-gray-600" />
            <p className="mt-3 text-sm text-gray-400">The inbox is clear.</p>
          </div>
        )}
      </div>

      <p className="mt-4 min-h-5 text-sm text-cyan-100" aria-live="polite">{status}</p>
    </div>
  );
}

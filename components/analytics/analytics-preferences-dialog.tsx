"use client";

import { useEffect, useId, useRef } from "react";

import type { AnalyticsConsentValue } from "@/lib/analytics/consent";

type AnalyticsPreferencesDialogProps = {
  consent: AnalyticsConsentValue;
  onAccept: () => void;
  onClose: () => void;
  onReject: () => void;
};

const FOCUSABLE_ELEMENTS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusPreferencesTrigger = () => {
  const triggers = document.querySelectorAll<HTMLElement>(
    "[data-analytics-preferences-trigger]",
  );
  for (const trigger of triggers) {
    if (trigger.isConnected && trigger.getClientRects().length > 0) {
      trigger.focus();
      return;
    }
  }
};

export const AnalyticsPreferencesDialog = ({
  consent,
  onAccept,
  onClose,
  onReject,
}: AnalyticsPreferencesDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        FOCUSABLE_ELEMENTS,
      );
      if (!dialog || !focusable?.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (previousFocus?.isConnected) previousFocus.focus();
      else focusPreferencesTrigger();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0920] p-6 text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">
              Analytics preferences
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-gray-300"
            >
              Essential security and authentication remain active. Choose
              whether Google Analytics, Microsoft Clarity, Vercel Web
              Analytics, and Speed Insights may measure this public visit.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close analytics preferences"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-white/15 px-3 text-gray-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-400" role="status">
          Current choice: {consent}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onAccept}
            className="min-h-[44px] rounded-lg border border-cyan-200/60 bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#030014] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={onReject}
            className="min-h-[44px] rounded-lg border border-cyan-200/60 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Reject analytics
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 sm:col-span-2"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
};

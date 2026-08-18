"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NavLink } from "@/lib/cms-types";
import {
  getPrimaryNavigationLinks,
  getResumeNavigationLink,
} from "@/lib/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
export const MobileNavigation = ({
  navLinks,
  pathname,
}: {
  navLinks: NavLink[];
  pathname: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const primaryLinks = getPrimaryNavigationLinks(navLinks);
  const resumeLink = getResumeNavigationLink(navLinks);

  const closeAndRestoreFocus = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAndRestoreFocus();
    };

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) closeAndRestoreFocus();
    };

    document.addEventListener("keydown", handleEscape);
    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      desktopQuery.removeEventListener("change", closeAtDesktop);
    };
  }, [closeAndRestoreFocus, isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 lg:hidden"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
        onClick={() => {
          if (isOpen) {
            closeAndRestoreFocus();
          } else {
            setIsOpen(true);
          }
        }}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-0 top-[65px] h-[calc(100dvh-65px)] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-sm"
            onClick={closeAndRestoreFocus}
          />
          <div
            ref={menuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;

              const focusable = Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ) ?? [],
              );
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="relative z-10 max-h-full w-full overflow-y-auto border-y border-white/10 bg-[#030014]/95 p-5 text-gray-200 shadow-lg shadow-[#2A0E61]/30 backdrop-blur-md"
          >
            <div className="flex flex-col gap-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={
                    isActivePath(pathname, link.href) ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 items-center rounded-lg px-4 py-3 transition hover:bg-white/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                    isActivePath(pathname, link.href)
                      ? "bg-white/10 text-cyan-100"
                      : ""
                  }`}
                  onClick={closeAndRestoreFocus}
                >
                  {link.title}
                </Link>
              ))}
{resumeLink ? (
  <TrackedLink
    href={resumeLink.href}
    analyticsEvent={{
      event: "resume_view_click",
      cta_location: "mobile_navigation",
    }}
    aria-current={
      isActivePath(pathname, resumeLink.href)
        ? "page"
        : undefined
    }
    className="button-primary mt-2 inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-3 font-bold text-white"
    onClick={closeAndRestoreFocus}
  >
    {resumeLink.title}
  </TrackedLink>
) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

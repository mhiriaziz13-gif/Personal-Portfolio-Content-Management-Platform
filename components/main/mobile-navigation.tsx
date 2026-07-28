"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { NavLink } from "@/lib/cms-types";

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

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [isOpen]);

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 md:hidden"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id="mobile-navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndRestoreFocus();
              return;
            }
            if (event.key !== "Tab") return;

            const links = Array.from(
              menuRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
            );
            if (links.length === 0) return;
            const first = links[0];
            const last = links[links.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="absolute left-0 top-[65px] w-full border-y border-white/10 bg-[#030014]/95 p-5 text-gray-200 shadow-lg shadow-[#2A0E61]/30 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                aria-label={link.href === "/resume" ? "View CV" : undefined}
                aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                className={`rounded-lg px-4 py-3 transition hover:bg-white/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  isActivePath(pathname, link.href)
                    ? "bg-white/10 text-cyan-100"
                    : ""
                }`}
                onClick={closeAndRestoreFocus}
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

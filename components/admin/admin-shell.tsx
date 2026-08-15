"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useMemo, useState } from "react";

import { adminFetch } from "@/components/admin/admin-api";

const links = [
  ["Overview", "/admin"],
  ["Projects", "/admin/projects"],
  ["Profile", "/admin/content/profile"],
  ["Hero", "/admin/content/hero"],
  ["About", "/admin/content/about"],
  ["Experience", "/admin/content/experience"],
  ["Skills", "/admin/content/skills"],
  ["Education", "/admin/content/education"],
  ["Certifications", "/admin/content/certifications"],
  ["Resumes", "/admin/content/resumes"],
  ["Messages", "/admin/messages"],
  ["Media", "/admin/media"],
  ["Settings", "/admin/settings"],
] as const;

export const AdminShell = ({ children, email }: PropsWithChildren<{ email?: string }>) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);

  const logout = async () => {
    const response = await adminFetch("/api/auth/logout?next=/admin/login", { method: "POST" });
    if (response.redirected) window.location.assign(response.url);
    else router.replace("/admin/login");
  };

  const sidebar = (
    <nav aria-label="CMS sections" className="flex flex-col gap-1">
      {links.map(([label, href]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-3 text-sm transition ${active ? "bg-cyan-300/15 text-cyan-100" : "text-gray-300 hover:bg-white/10"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div data-clarity-mask="true" className="relative z-20 mx-auto min-h-screen w-full max-w-[96rem] px-4 py-8 text-gray-200 sm:px-6">
      <header className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#100b24]/90 p-4">
        <div><p className="Welcome-text text-xs uppercase">CMS Admin</p><p className="text-sm text-gray-400">{email ?? "Administrator"}</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-lg border border-white/10 px-3 py-2 lg:hidden" aria-expanded={mobileOpen} aria-controls="mobile-cms-navigation">Menu</button><button type="button" onClick={() => void logout()} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Logout</button></div>
      </header>
      {mobileOpen && <div id="mobile-cms-navigation" className="mt-3 rounded-xl border border-white/10 bg-[#100b24] p-3 lg:hidden">{sidebar}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-white/10 bg-[#100b24]/90 p-3 lg:block">{sidebar}</aside>
        <main id="main-content" tabIndex={-1} className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-400">
            {crumbs.map((crumb, index) => {
              const href = `/${crumbs.slice(0, index + 1).join("/")}`;
              const last = index === crumbs.length - 1;
              return <span key={href} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{last ? <span aria-current="page" className="text-white">{decodeURIComponent(crumb)}</span> : <Link href={href} className="hover:text-cyan-100">{crumb}</Link>}</span>;
            })}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
};

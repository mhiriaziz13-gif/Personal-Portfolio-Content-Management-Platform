"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const warning = "You have unsaved changes. Leave this page and discard them?";

export const useUnsavedChangesGuard = (dirty: boolean) => {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = warning; };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin || anchor.href === window.location.href) return;
      if (!window.confirm(warning)) { event.preventDefault(); event.stopPropagation(); }
    };
    const history = () => { if (!window.confirm(warning)) router.push(pathname); };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", history);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); window.removeEventListener("popstate", history); };
  }, [dirty, pathname, router]);
};

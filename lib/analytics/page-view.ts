import type { VirtualPageViewEvent } from "@/lib/analytics/events";

export const analyticsPathname = (pathname: string) => {
  const path = pathname.split(/[?#]/u, 1)[0] || "/";
  return path.startsWith("/") ? path : `/${path}`;
};

export const createVirtualPageView = ({
  pathname,
  origin,
  title,
}: {
  pathname: string;
  origin: string;
  title: string;
}): VirtualPageViewEvent => {
  const pagePath = analyticsPathname(pathname);
  return {
    event: "virtual_page_view",
    page_path: pagePath,
    page_location: `${origin}${pagePath}`,
    page_title: title,
  };
};

export const nextVirtualPageView = (
  previousPathname: string | null,
  event: VirtualPageViewEvent,
) =>
  previousPathname === event.page_path
    ? null
    : { event, nextPathname: event.page_path };

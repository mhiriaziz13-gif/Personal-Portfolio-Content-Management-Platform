import type { NavLink } from "@/lib/cms-types";

type ConfigurableNavLink = NavLink & {
  navigationOrder?: number;
  showInNavigation?: boolean;
  showInFooter?: boolean;
  kind?: "link" | "resume";
};

export type VolunteeringFooterControl = {
  label: string;
  aboutNavigationOrder: number;
  blockDisplayOrder: number;
  isVisible: boolean;
};

export const createVolunteeringFooterLink = (
  control: VolunteeringFooterControl | null,
): NavLink | null => {
  if (!control?.isVisible) return null;

  return {
    title: control.label.trim() || "Volunteering",
    href: "/about#volunteering",
    navigationOrder:
      control.aboutNavigationOrder + control.blockDisplayOrder,
    showInNavigation: false,
    showInFooter: true,
    kind: "link",
  };
};

const fallbackOrder = new Map(
  [
    "/",
    "/projects",
    "/experience",
    "/expertise",
    "/about",
    "/contact",
    "/resume",
    "/education",
    "/certifications",
    "/about#volunteering",
  ].map((href, index) => [href, index]),
);

const getNavigationOrder = (link: ConfigurableNavLink) =>
  Number.isFinite(link.navigationOrder)
    ? Number(link.navigationOrder)
    : (fallbackOrder.get(link.href) ?? Number.MAX_SAFE_INTEGER);

const orderLinks = (links: readonly NavLink[]) =>
  [...links].sort(
    (left, right) =>
      getNavigationOrder(left) - getNavigationOrder(right) ||
      left.title.localeCompare(right.title),
  );

const isResumeLink = (link: ConfigurableNavLink) =>
  link.kind === "resume" || link.href === "/resume";

export const getPrimaryNavigationLinks = (links: readonly NavLink[]) =>
  orderLinks(links).filter(
    (link) =>
      link.showInNavigation !== false &&
      !isResumeLink(link),
  );

export const getResumeNavigationLink = (links: readonly NavLink[]) =>
  orderLinks(links).find(
    (link) =>
      link.showInNavigation !== false &&
      isResumeLink(link),
  );

export const getFooterNavigationLinks = (links: readonly NavLink[]) =>
  orderLinks(links).filter((link) => link.showInFooter !== false);

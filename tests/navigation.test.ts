import { describe, expect, it } from "vitest";

import type { NavLink } from "@/lib/cms-types";
import {
  createVolunteeringFooterLink,
  getFooterNavigationLinks,
  getPrimaryNavigationLinks,
  getResumeNavigationLink,
} from "@/lib/navigation";

const links: NavLink[] = [
  {
    title: "Resume",
    href: "/resume",
    navigationOrder: 60,
    showInNavigation: true,
    showInFooter: true,
    kind: "resume",
  },
  {
    title: "About Ahmed",
    href: "/about",
    navigationOrder: 40,
    showInNavigation: true,
    showInFooter: false,
    kind: "link",
  },
  {
    title: "Selected work",
    href: "/projects",
    navigationOrder: 10,
    showInNavigation: true,
    showInFooter: true,
    kind: "link",
  },
  {
    title: "Education",
    href: "/education",
    navigationOrder: 70,
    showInNavigation: false,
    showInFooter: true,
    kind: "link",
  },
];

describe("public navigation presentation", () => {
  it("uses CMS order and visibility without placing Resume among text links", () => {
    expect(getPrimaryNavigationLinks(links).map((link) => link.title)).toEqual([
      "Selected work",
      "About Ahmed",
    ]);
    expect(getResumeNavigationLink(links)?.title).toBe("Resume");
  });

  it("uses the independent CMS footer visibility setting", () => {
    expect(getFooterNavigationLinks(links).map((link) => link.title)).toEqual([
      "Selected work",
      "Resume",
      "Education",
    ]);
  });

  it("bounds the CMS volunteering control to the canonical About anchor", () => {
    expect(
      createVolunteeringFooterLink({
        label: "Community work",
        aboutNavigationOrder: 40,
        blockDisplayOrder: 50,
        isVisible: true,
      }),
    ).toEqual({
      title: "Community work",
      href: "/about#volunteering",
      navigationOrder: 90,
      showInNavigation: false,
      showInFooter: true,
      kind: "link",
    });
    expect(
      createVolunteeringFooterLink({
        label: "Community work",
        aboutNavigationOrder: 40,
        blockDisplayOrder: 50,
        isVisible: false,
      }),
    ).toBeNull();
  });
});

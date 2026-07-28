import { afterEach, describe, expect, it, vi } from "vitest";

import { readPublicCmsRows } from "@/lib/cms";

describe("public CMS partial failures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps successful table rows when a secondary table fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const [profile, volunteering] = await Promise.all([
      readPublicCmsRows(
        "CMS-PUBLIC-PROFILE-TEST",
        Promise.resolve({
          data: [{ full_name: "Ahmed Aziz Mhiri" }],
          error: null,
        }),
      ),
      readPublicCmsRows(
        "CMS-PUBLIC-VOLUNTEERING-TEST",
        Promise.resolve({
          data: null,
          error: { message: "sensitive database detail" },
        }),
      ),
    ]);

    expect(profile).toEqual({
      rows: [{ full_name: "Ahmed Aziz Mhiri" }],
      ok: true,
    });
    expect(volunteering).toEqual({ rows: [], ok: false });
    expect(warning).toHaveBeenCalledWith("Public CMS read failed.", {
      incidentId: "CMS-PUBLIC-VOLUNTEERING-TEST",
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain(
      "sensitive database detail",
    );
  });

  it("isolates a rejected query without rejecting the group", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      Promise.all([
        readPublicCmsRows(
          "CMS-PUBLIC-HERO-TEST",
          Promise.resolve({ data: [{ title: "CMS title" }], error: null }),
        ),
        readPublicCmsRows(
          "CMS-PUBLIC-CERTIFICATIONS-TEST",
          Promise.reject(new Error("connection failed")),
        ),
      ]),
    ).resolves.toEqual([
      { rows: [{ title: "CMS title" }], ok: true },
      { rows: [], ok: false },
    ]);
  });
});

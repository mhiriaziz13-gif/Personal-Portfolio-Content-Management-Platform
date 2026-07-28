import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const braceExpansion = require("brace-expansion") as (
  pattern: string,
  options?: { max?: number; maxLength?: number },
) => string[];

describe("brace-expansion compatibility adapter", () => {
  it("preserves the callable CommonJS API required by legacy lint dependencies", () => {
    expect(braceExpansion("file-{a,b}.tsx")).toEqual([
      "file-a.tsx",
      "file-b.tsx",
    ]);
  });

  it("preserves the patched output-length bound", () => {
    const expanded = braceExpansion("{a,b}".repeat(20), {
      maxLength: 128,
    });
    const totalLength = expanded.reduce(
      (length, value) => length + value.length,
      0,
    );

    expect(totalLength).toBeLessThanOrEqual(128);
  });
});

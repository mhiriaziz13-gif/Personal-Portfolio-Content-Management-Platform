import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowPaths = [join(root, ".github/workflows/quality.yml")];
const workflows = workflowPaths.map((path) => {
  const source = readFileSync(path, "utf8");
  return { fileName: basename(path), lines: source.split(/\r?\n/) };
});

const usesPattern =
  /^(\s*)(?:-\s+)?uses:\s*([^#\s]+)(?:\s+#\s*(\S.*?))?\s*$/;
const externalUses = workflows.flatMap((workflow) =>
  workflow.lines.flatMap((line, lineIndex) => {
    const match = line.match(usesPattern);

    if (!match || match[2].startsWith("./")) {
      return [];
    }

    return [{
      indentation: match[1].length,
      lineIndex,
      reference: match[2],
      versionComment: match[3],
      workflow,
    }];
  }),
);
const expectedPermissions = new Map([
  ["quality.yml", ["contents: read"]],
]);

describe("quality workflow security contract", () => {
  it("pins every external action to a full commit SHA", () => {
    expect(workflows.length).toBeGreaterThan(0);
    expect(externalUses.length).toBeGreaterThan(0);

    for (const action of externalUses) {
      expect(action.reference).toMatch(
        /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?@[0-9a-f]{40}$/,
      );
      expect(action.versionComment).toMatch(/^v\d+\.\d+\.\d+$/);
    }
  });

  it("disables persisted checkout credentials in read-only workflows", () => {
    const readOnlyWorkflows = new Set(
      [...expectedPermissions]
        .filter(([, permissions]) => permissions.includes("contents: read"))
        .map(([fileName]) => fileName),
    );
    const checkoutSteps = externalUses.filter((action) =>
      action.reference.startsWith("actions/checkout@") &&
      readOnlyWorkflows.has(action.workflow.fileName),
    );

    expect(checkoutSteps.length).toBeGreaterThan(0);

    for (const checkout of checkoutSteps) {
      const nextStepOffset = checkout.workflow.lines
        .slice(checkout.lineIndex + 1)
        .findIndex((line) => {
          const match = line.match(/^(\s*)-\s+/);
          return match?.[1].length === checkout.indentation;
        });
      const end = nextStepOffset === -1
        ? checkout.workflow.lines.length
        : checkout.lineIndex + 1 + nextStepOffset;
      const checkoutBlock = checkout.workflow.lines
        .slice(checkout.lineIndex, end)
        .join("\n");

      expect(checkoutBlock).toMatch(
        /^\s+persist-credentials:\s*false\s*(?:#.*)?$/m,
      );
    }
  });

  it("keeps every workflow at its minimum approved permissions", () => {
    expect(workflows.map(({ fileName }) => fileName).sort()).toEqual(
      [...expectedPermissions.keys()].sort(),
    );

    for (const workflow of workflows) {
      const permissionHeaders = workflow.lines.flatMap((line, lineIndex) => {
        const match = line.match(/^(\s*)permissions:\s*(.*?)\s*$/);
        return match
          ? [{ indentation: match[1].length, lineIndex, value: match[2] }]
          : [];
      });

      expect(permissionHeaders).toHaveLength(1);
      const [permissionHeader] = permissionHeaders;
      expect(permissionHeader).toMatchObject({ indentation: 0, value: "" });

      const followingLines = workflow.lines.slice(
        permissionHeader.lineIndex + 1,
      );
      const nextTopLevelLine = followingLines.findIndex(
        (line) => line.trim() !== "" && !/^\s/.test(line),
      );
      const permissionBody = followingLines
        .slice(0, nextTopLevelLine === -1 ? undefined : nextTopLevelLine)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#"));

      expect(permissionBody).toEqual(
        expectedPermissions.get(workflow.fileName),
      );
    }
  });
});

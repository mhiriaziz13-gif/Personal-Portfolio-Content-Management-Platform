#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const target = process.env.LIGHTHOUSE_URL?.trim();
if (!target) {
  console.error("LIGHTHOUSE_URL is required (for example, http://127.0.0.1:3000).");
  process.exitCode = 2;
} else {
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    console.error("LIGHTHOUSE_URL must be an absolute HTTP(S) URL.");
    process.exitCode = 2;
  }

  if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
    const chrome = await launch({
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
      chromePath: process.env.CHROME_PATH || undefined,
    });

    try {
      const result = await lighthouse(parsed.href, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      });
      if (!result) throw new Error("Lighthouse returned no result.");

      const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, category]) => [
          key,
          Math.round((category.score ?? 0) * 100),
        ]),
      );
      const outputDirectory = resolve(".artifacts/lighthouse");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        resolve(outputDirectory, "report.json"),
        result.report,
        "utf8",
      );
      console.log("Lighthouse scores:", scores);

      const minimum = {
        performance: 70,
        accessibility: 90,
        "best-practices": 90,
        seo: 90,
      };
      const failures = Object.entries(minimum)
        .filter(([key, threshold]) => Number(scores[key] ?? 0) < threshold)
        .map(([key, threshold]) => `${key} < ${threshold}`);
      if (failures.length) {
        console.error(`Lighthouse thresholds failed: ${failures.join(", ")}`);
        process.exitCode = 1;
      }
    } finally {
      try {
        await chrome.kill();
      } catch (error) {
        if (
          process.platform !== "win32" ||
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "EPERM"
        ) {
          throw error;
        }
        console.warn(
          "Lighthouse completed, but Windows could not remove Chrome's temporary profile (EPERM).",
        );
      }
    }
  }
}

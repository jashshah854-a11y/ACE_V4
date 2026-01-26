import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

const FILES = [
  "src/components/landing/HeroSection.tsx",
  "src/pages/Index.tsx",
  "src/pages/FoundersLetter.tsx",
  "src/components/upload/SafeModeWarning.tsx",
];

const BANNED = [
  /\\bguarantee\\b/i,
  /\\bguarantees\\b/i,
  /\\bproves\\b/i,
  /\\bcertified\\b/i,
  /\\bverified\\b/i,
  /\\bexplains fully\\b/i,
  /\\boptimal\\b/i,
  /\\bbest\\b/i,
  /\\bpredicts\\b/i,
];

describe("Go-to-market copy guardrails", () => {
  it("avoids overclaiming language in public-facing copy", () => {
    for (const file of FILES) {
      const contents = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const pattern of BANNED) {
        expect(contents).not.toMatch(pattern);
      }
    }
  });
});

#!/usr/bin/env node
// Every relative markdown link and every `task-b/…` / `task-a/…` / `task-e/…` path cited in the
// docs/mcp reports exists on disk. Exit 1 on a dead reference.
//   node docs/mcp/scripts/check-links.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
const docs = ["docs/mcp", "docs/mcp/evidence"].flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => join(d, f)));
let dead = 0;
for (const f of docs) {
  const s = readFileSync(f, "utf8");
  for (const [, href] of s.matchAll(/\]\(([^)#\s]+)\)/g)) {
    if (/^https?:/.test(href)) continue;
    if (!existsSync(join(dirname(f), href))) { console.log(`DEAD ${f}: ${href}`); dead++; }
  }
  for (const [, p] of s.matchAll(/`(task-[abe]\/[^`\s…]+)`/g)) {
    const base = p.startsWith("task-b/") ? "docs/mcp/runs" : "docs/mcp/evidence";
    if (!existsSync(join(base, p.replace(/\/$/, "")))) { console.log(`DEAD ${f}: ${p} (looked in ${base})`); dead++; }
  }
}
console.log(dead ? `RESULT: ${dead} dead` : `RESULT: all references exist (${docs.length} files)`);
process.exit(dead ? 1 : 0);

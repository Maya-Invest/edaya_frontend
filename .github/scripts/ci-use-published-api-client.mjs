#!/usr/bin/env node
/**
 * Point @maya-invest/edaya-api-client at GitHub Packages for CI.
 * Local dev keeps file: links; see docs/reference/cross-repo-workflow.md.
 */
import { readFileSync, writeFileSync } from "node:fs";

const channel = process.argv[2] ?? "staging";
const specifier = `npm:@maya-invest/edaya-api-client@${channel}`;

const files = [
  "package.json",
  "apps/webapp/package.json",
  "apps/saas-admin/package.json",
];

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  let changed = false;

  if (pkg.overrides?.["@maya-invest/edaya-api-client"]) {
    pkg.overrides["@maya-invest/edaya-api-client"] = specifier;
    changed = true;
  }

  if (pkg.dependencies?.["@maya-invest/edaya-api-client"]) {
    pkg.dependencies["@maya-invest/edaya-api-client"] = specifier;
    changed = true;
  }

  if (changed) {
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

console.log(`Using @maya-invest/edaya-api-client@${channel} from GitHub Packages`);

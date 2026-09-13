#!/usr/bin/env node
/**
 * Point @maya-invest/edaya-api-client at GitHub Packages for CI.
 * Local dev keeps file: links; see docs/reference/cross-repo-workflow.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requested = process.env.API_CLIENT_VERSION || process.argv[2] || "staging";
const version = /^0\.0\.0-[a-z0-9._-]+$/.test(requested)
  ? requested
  : JSON.parse(execFileSync("npm", ["view", `@maya-invest/edaya-api-client@${requested}`, "version", "--json"], { encoding: "utf8" }));
if (typeof version !== "string" || !/^0\.0\.0-[a-z0-9._-]+$/.test(version)) {
  throw new Error("Could not resolve an exact API client version");
}
const specifier = `npm:@maya-invest/edaya-api-client@${version}`;

const files = [
  "package.json",
  "apps/webapp/package.json",
  "apps/webadmin/package.json",
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

console.log(`Using @maya-invest/edaya-api-client@${version} from GitHub Packages`);

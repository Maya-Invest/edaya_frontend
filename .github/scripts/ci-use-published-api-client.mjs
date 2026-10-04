#!/usr/bin/env node
/**
 * Point @maya-invest/edaya-api-client at GitHub Packages for CI.
 * Local dev keeps file: links; see docs/reference/cross-repo-workflow.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertPublishedCandidate } from "./api-client-version.mjs";

const version = process.env.API_CLIENT_VERSION || process.argv[2];
const sourceCommit = process.env.API_CLIENT_SOURCE_COMMIT || /^0\.0\.0-(?:staging|production)\.([a-f0-9]{40})$/.exec(version || "")?.[1];
// Validate the requested version before invoking npm; never resolve a moving tag.
assertPublishedCandidate(version, { version, edayaSourceCommit: sourceCommit }, sourceCommit);
let metadata;
try {
  metadata = JSON.parse(execFileSync("npm", ["view", `@maya-invest/edaya-api-client@${version}`, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
} catch {
  throw new Error("Qualified API client is unavailable; publish it after backend qualification before retrying deployment");
}
const specifier = assertPublishedCandidate(version, metadata, sourceCommit);

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

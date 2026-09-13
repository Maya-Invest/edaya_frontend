#!/usr/bin/env node
/**
 * Resolve the GitHub Packages dist-tag for @maya-invest/edaya-api-client.
 *
 * main/master → production
 * staging → staging
 * other branches → sanitized ref (feature/onboarding → feature-onboarding)
 * fails if the matching branch client has not been published.
 *
 * Must stay in sync with edaya_backend/.github/workflows/_publish-api-client.yml
 */
import { execFileSync } from "node:child_process";

const ref = process.argv[2] ?? "";

function channelFromRef(value) {
	if (value === "main" || value === "master") {
		return "production";
	}
	const tag = value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return tag || "staging";
}

function publishedDistTags() {
	try {
		const raw = execFileSync(
			"npm",
			["view", "@maya-invest/edaya-api-client", "dist-tags", "--json"],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		);
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

const preferred = channelFromRef(ref);
if (preferred === "production" || preferred === "staging") {
	process.stdout.write(`${preferred}\n`);
	process.exit(0);
}

const tags = publishedDistTags();
if (!tags[preferred]) {
  throw new Error(`Publish the matching @maya-invest/edaya-api-client@${preferred} before verifying this branch`);
}
process.stdout.write(`${tags[preferred]}\n`);

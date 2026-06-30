import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

export interface GeneratedArtifact {
	generated: string
	tracked: string
}

function filesMatch(generated: string, tracked: string): boolean {
	return existsSync(generated)
		&& existsSync(tracked)
		&& readFileSync(generated).equals(readFileSync(tracked))
}

export function findDriftedArtifacts(
	artifacts: GeneratedArtifact[],
	repoRoot: string,
): string[] {
	return artifacts
		.filter(({ generated, tracked }) => !filesMatch(generated, tracked))
		.map(({ tracked }) => relative(repoRoot, tracked))
}

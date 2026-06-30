#!/usr/bin/env bun
/**
 * Regenerates API artifacts in a temporary directory and compares them with
 * committed files without changing the working tree.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { findDriftedArtifacts } from '../lib/drift.ts'
import { exportOpenApi } from './export.ts'
import { generateClientBindings } from './generate-bindings.ts'
import { generateSchema } from './generate-schema.ts'
import {
	repoRoot,
	trackedClientBindingsPath,
	trackedOpenApiPath,
	trackedSchemaPath,
} from './paths.ts'

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'edaya-web-generated-'))
const generatedOpenApi = join(temporaryDirectory, 'openapi.json')
const generatedSchema = join(temporaryDirectory, 'schema.d.ts')
const generatedClientBindings = join(temporaryDirectory, 'client-bindings.ts')

async function runGeneration(): Promise<void> {
	await exportOpenApi(generatedOpenApi)
	await generateSchema(generatedOpenApi, generatedSchema)
	generateClientBindings(generatedOpenApi, generatedClientBindings)
}

const artifacts = [
	{
		generated: generatedOpenApi,
		tracked: trackedOpenApiPath,
	},
	{
		generated: generatedSchema,
		tracked: trackedSchemaPath,
	},
	{
		generated: generatedClientBindings,
		tracked: trackedClientBindingsPath,
	},
]

try {
	await runGeneration()
	const changed = findDriftedArtifacts(artifacts, repoRoot)
	if (changed.length > 0) {
		console.error('Generated API artifacts are out of date. Run `bun run generated:update` and commit the changes.')
		console.error('Changed files:')
		for (const path of changed) {
			console.error(`  - ${path}`)
		}
		process.exitCode = 1
	}
	else {
		console.log('Generated API artifacts are up to date.')
	}
}
finally {
	rmSync(temporaryDirectory, { recursive: true, force: true })
}

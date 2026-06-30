#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import {
	assertCoreRepoAvailable,
	apiAppPath,
	apiLocalEnvLoaderPath,
	apiRuntimeRegistryPath,
	resolveArgvPath,
	trackedOpenApiPath,
} from './paths.ts'

export async function exportOpenApi(outputPath = trackedOpenApiPath): Promise<void> {
	assertCoreRepoAvailable()

	const [{ default: app }, { resetApiRuntimesForTests }, { loadLocalProcessEnv }] = await Promise.all([
		import(apiAppPath),
		import(apiRuntimeRegistryPath),
		import(apiLocalEnvLoaderPath),
	])

	const env = loadLocalProcessEnv()
	const res = await app.request('/doc', undefined, env)
	if (!res.ok) {
		const body = await res.text()
		throw new Error(`Failed to fetch OpenAPI doc: ${res.status}\nBody: ${body}`)
	}
	const schema = await res.json()

	mkdirSync(dirname(outputPath), { recursive: true })
	writeFileSync(outputPath, JSON.stringify(schema, null, 2))
	await resetApiRuntimesForTests()
}

if (import.meta.main) {
	const outputPath = resolveArgvPath('--output', trackedOpenApiPath)

	exportOpenApi(outputPath)
		.then(() => {
			console.log(`OpenAPI schema successfully exported to ${outputPath}`)
		})
		.catch((err) => {
			console.error('Failed to export OpenAPI schema:', err)
			process.exit(1)
		})
}

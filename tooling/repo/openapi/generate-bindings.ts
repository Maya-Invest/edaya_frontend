#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
	extractClientBindingsFromOpenApi,
	formatClientBindingsTypeScript,
} from '@edaya/api-client/openapi-bindings'
import { resolveArgvPath, trackedClientBindingsPath, trackedOpenApiPath } from './paths.ts'

export function generateClientBindings(
	openApiPath = trackedOpenApiPath,
	outputPath = trackedClientBindingsPath,
): void {
	const openApi = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
		info?: Record<string, unknown>
	}
	const clientBindings = extractClientBindingsFromOpenApi(openApi)
	const source = formatClientBindingsTypeScript(clientBindings)

	mkdirSync(dirname(outputPath), { recursive: true })
	writeFileSync(outputPath, source)
}

if (import.meta.main) {
	const openApiPath = resolveArgvPath('--openapi', trackedOpenApiPath)
	const outputPath = resolveArgvPath('--output', trackedClientBindingsPath)

	generateClientBindings(openApiPath, outputPath)
	console.log(`API client bindings generated at ${outputPath}`)
}

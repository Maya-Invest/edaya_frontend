#!/usr/bin/env bun
import { generateClientArtifacts, isOpenApiUrl } from '@edaya/client-codegen'
import { resolveArgvPath, trackedOpenApiPath, trackedSchemaPath } from './paths.ts'

export async function generateSchema(
	openApiInput = trackedOpenApiPath,
	outputPath = trackedSchemaPath,
): Promise<void> {
	await generateClientArtifacts({
		input: openApiInput,
		schemaOut: outputPath,
	})
}

if (import.meta.main) {
	const openApiInput = resolveArgvPath('--openapi', trackedOpenApiPath)
	const outputPath = resolveArgvPath('--output', trackedSchemaPath)

	await generateSchema(openApiInput, outputPath)
	const sourceLabel = isOpenApiUrl(openApiInput) ? openApiInput : openApiInput
	console.log(`OpenAPI TypeScript schema generated from ${sourceLabel} at ${outputPath}`)
}

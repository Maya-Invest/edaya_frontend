#!/usr/bin/env bun
import { join } from 'node:path'
import { $ } from 'bun'
import { trackedOpenApiPath, trackedSchemaPath } from './paths.ts'

const openApiTypeScriptBin = join(import.meta.dirname, '../node_modules/.bin/openapi-typescript')

export async function generateSchema(
	openApiPath = trackedOpenApiPath,
	outputPath = trackedSchemaPath,
): Promise<void> {
	await $`${openApiTypeScriptBin} ${openApiPath} -o ${outputPath}`
}

if (import.meta.main) {
	await generateSchema()
	console.log(`OpenAPI TypeScript schema generated at ${trackedSchemaPath}`)
}

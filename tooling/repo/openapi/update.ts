#!/usr/bin/env bun
import { copyFileSync } from 'node:fs'
import { exportOpenApi } from './export.ts'
import { generateClientArtifactsFromOpenApi } from './generate-bindings.ts'
import { generateSchema } from './generate-schema.ts'
import {
	saasAdminOpenApiPath,
	saasAdminSchemaPath,
	trackedOpenApiPath,
	trackedSchemaPath,
} from './paths.ts'

await exportOpenApi()
await generateSchema()
await generateClientArtifactsFromOpenApi()

copyFileSync(trackedOpenApiPath, saasAdminOpenApiPath)
copyFileSync(trackedSchemaPath, saasAdminSchemaPath)

console.log('Generated API artifacts updated.')

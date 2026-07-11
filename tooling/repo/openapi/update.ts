#!/usr/bin/env bun
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot } from './paths.ts'
import { exportOpenApi } from './export.ts'
import { generateClientArtifactsFromOpenApi } from './generate-bindings.ts'
import {
  saasAdminOpenApiPath,
  saasAdminSchemaPath,
  trackedOpenApiPath,
  trackedSchemaPath,
} from './paths.ts'

await exportOpenApi()
await generateClientArtifactsFromOpenApi(trackedOpenApiPath, {
  schemaOut: trackedSchemaPath,
})

copyFileSync(trackedOpenApiPath, saasAdminOpenApiPath)
copyFileSync(
  resolve(repoRoot, 'apps/webapp/src/lib/api/schema.ts'),
  saasAdminSchemaPath,
)

console.log('Generated API artifacts updated.')

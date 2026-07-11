#!/usr/bin/env bun
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { exportOpenApi } from './export.ts'
import {
  repoRoot,
  saasAdminOpenApiPath,
  saasAdminSchemaPath,
  trackedOpenApiPath,
} from './paths.ts'

await exportOpenApi()

copyFileSync(trackedOpenApiPath, saasAdminOpenApiPath)
copyFileSync(
  resolve(repoRoot, 'apps/webapp/src/lib/api/schema.ts'),
  saasAdminSchemaPath,
)

console.log('Generated API artifacts updated.')

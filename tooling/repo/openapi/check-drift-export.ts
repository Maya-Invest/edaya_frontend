#!/usr/bin/env bun
/**
 * Exports OpenAPI from a sibling Edaya Core checkout, then verifies that the
 * committed OpenAPI snapshot and generated client artifacts match the export.
 *
 * Use locally when both `edaya` and `edaya_web` are checked out side by side.
 * CI uses `bun repo check openapi` (committed OpenAPI only).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkTrackedClientArtifacts, reportArtifactDrift } from './check-artifacts.ts'
import { exportOpenApi } from './export.ts'

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'edaya-web-export-check-'))
const generatedOpenApi = join(temporaryDirectory, 'openapi.json')

try {
  await exportOpenApi(generatedOpenApi)
  const changed = await checkTrackedClientArtifacts(generatedOpenApi)
  reportArtifactDrift(changed)
}
finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

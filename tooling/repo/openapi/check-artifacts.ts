import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import process from 'node:process'
import { checkClientArtifacts } from '@edaya/client-codegen'
import {
  repoRoot,
  saasAdminOpenApiPath,
  saasAdminSchemaPath,
  trackedOpenApiPath,
  trackedSchemaPath,
  trackedWebappClientDirPath,
} from './paths.ts'

function filesMatch(leftPath: string, rightPath: string): boolean {
  return readFileSync(leftPath).equals(readFileSync(rightPath))
}

export async function checkTrackedClientArtifacts(
  openApiInput: string,
): Promise<string[]> {
  const changed = await checkClientArtifacts({
    input: openApiInput,
    openApiOut: trackedOpenApiPath,
    schemaOut: trackedSchemaPath,
    clientDir: trackedWebappClientDirPath,
    repoRoot,
  })

  if (!filesMatch(trackedOpenApiPath, saasAdminOpenApiPath)) {
    changed.push(relative(repoRoot, saasAdminOpenApiPath))
  }

  if (!filesMatch(trackedSchemaPath, saasAdminSchemaPath)) {
    changed.push(relative(repoRoot, saasAdminSchemaPath))
  }

  return changed
}

export function reportArtifactDrift(changed: string[]): void {
  if (changed.length > 0) {
    console.error('Generated API artifacts are out of date. Run `bun repo openapi generate` and commit the changes.')
    console.error('Changed files:')
    for (const path of changed) {
      console.error(`  - ${path}`)
    }
    process.exitCode = 1
    return
  }

  console.log('Generated API artifacts are up to date.')
}

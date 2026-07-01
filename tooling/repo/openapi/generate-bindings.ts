#!/usr/bin/env bun
import { generateClientArtifacts, isOpenApiUrl } from '@edaya/client-codegen'
import {
  resolveArgvPath,
  trackedConsumerClientDirPaths,
  trackedOpenApiPath,
  trackedSchemaPath,
  trackedWebappClientDirPath,
} from './paths.ts'

export async function generateClientArtifactsFromOpenApi(
  openApiInput = trackedOpenApiPath,
  options: {
    clientDir?: string
    schemaOut?: string
  } = {},
): Promise<void> {
  const clientDirs = options.clientDir
    ? [options.clientDir]
    : [...trackedConsumerClientDirPaths]

  for (const clientDir of clientDirs) {
    await generateClientArtifacts({
      input: openApiInput,
      clientDir,
      schemaOut: options.schemaOut ?? trackedSchemaPath,
    })
  }
}

if (import.meta.main) {
  const openApiInput = resolveArgvPath('--openapi', trackedOpenApiPath)
  const clientDirFlagIndex = process.argv.indexOf('--client-dir')
  const clientDir = clientDirFlagIndex === -1
    ? undefined
    : resolveArgvPath('--client-dir', trackedWebappClientDirPath)

  await generateClientArtifactsFromOpenApi(openApiInput, { clientDir })
  const sourceLabel = isOpenApiUrl(openApiInput) ? openApiInput : openApiInput
  console.log(`API client artifacts generated from ${sourceLabel}`)
}

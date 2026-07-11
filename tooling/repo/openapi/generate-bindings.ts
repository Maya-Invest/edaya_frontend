#!/usr/bin/env bun
import { generateClientArtifacts, isOpenApiUrl } from '@edaya/client-codegen'
import {
  resolveArgvPath,
  trackedOpenApiPath,
  trackedSchemaPath,
} from './paths.ts'

export async function generateClientArtifactsFromOpenApi(
  openApiInput = trackedOpenApiPath,
  options: {
    schemaOut?: string
  } = {},
): Promise<void> {
  await generateClientArtifacts({
    input: openApiInput,
    schemaOut: options.schemaOut ?? trackedSchemaPath,
  })
}

if (import.meta.main) {
  const openApiInput = resolveArgvPath('--openapi', trackedOpenApiPath)

  await generateClientArtifactsFromOpenApi(openApiInput)
  const sourceLabel = isOpenApiUrl(openApiInput) ? openApiInput : openApiInput
  console.log(`API client artifacts generated from ${sourceLabel}`)
}

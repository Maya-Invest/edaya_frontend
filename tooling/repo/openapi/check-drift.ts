#!/usr/bin/env bun
import { checkTrackedClientArtifacts, reportArtifactDrift } from './check-artifacts.ts'
/**
 * Validates committed OpenAPI + generated client artifacts without importing
 * the Edaya Core API (CI-friendly; no sibling `edaya` checkout required).
 */
import { trackedOpenApiPath } from './paths.ts'

const changed = await checkTrackedClientArtifacts(trackedOpenApiPath)
reportArtifactDrift(changed)

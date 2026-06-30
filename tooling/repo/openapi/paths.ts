import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

export const repoRoot = resolve(import.meta.dirname, '../../..')

export const coreRepoRoot = resolve(
  process.env.EDAYA_CORE_ROOT ?? resolve(repoRoot, '../edaya'),
)

export const trackedOpenApiPath = resolve(
  repoRoot,
  'apps/webapp/src/lib/api/openapi.json',
)
export const trackedSchemaPath = resolve(
  repoRoot,
  'apps/webapp/src/lib/api/schema.d.ts',
)
/** SaaS admin uses the same OpenAPI document as the school webapp. */
export const saasAdminOpenApiPath = resolve(
  repoRoot,
  'apps/saas-admin/src/lib/api/openapi.json',
)
export const saasAdminSchemaPath = resolve(
  repoRoot,
  'apps/saas-admin/src/lib/api/schema.d.ts',
)
export const trackedClientBindingsPath = resolve(
  repoRoot,
  'packages/api-client/src/generated/client-bindings.ts',
)
export const trackedCreateClientPath = resolve(
  repoRoot,
  'packages/api-client/src/generated/create-client.ts',
)

export const apiAppPath = resolve(coreRepoRoot, 'apps/api/src/app.ts')
export const apiClientBindingsPath = resolve(
  coreRepoRoot,
  'apps/api/src/lib/school-api/client-bindings.ts',
)
export const apiRuntimeRegistryPath = resolve(
  coreRepoRoot,
  'apps/api/src/runtime/local/registry.ts',
)
export const apiLocalEnvLoaderPath = resolve(
  coreRepoRoot,
  'apps/api/src/runtime/shared/env/local-loader.ts',
)

export function assertCoreRepoAvailable(): void {
  if (!existsSync(apiAppPath)) {
    throw new Error(
      `Edaya Core API not found at ${apiAppPath}. Set EDAYA_CORE_ROOT or clone edaya next to edaya_web.`,
    )
  }
}

export function resolveArgvPath(flag: string, defaultPath: string): string {
  const flagIndex = process.argv.indexOf(flag)
  if (flagIndex === -1) {
    return defaultPath
  }

  const requestedPath = process.argv[flagIndex + 1]
  if (!requestedPath) {
    throw new Error(`${flag} requires a file path`)
  }
  return resolve(process.cwd(), requestedPath)
}

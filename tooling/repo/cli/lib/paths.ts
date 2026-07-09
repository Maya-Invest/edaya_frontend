import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Monorepo root (`edaya_web`). */
export const repoRoot = path.resolve(packageRoot, '../..')

export const paths = {
  doctor: path.join(repoRoot, 'tooling/repo/ci/doctor.ts'),
  openapiCheck: path.join(repoRoot, 'tooling/repo/openapi/check-drift.ts'),
  openapiCheckExport: path.join(repoRoot, 'tooling/repo/openapi/check-drift-export.ts'),
  openapiExport: path.join(repoRoot, 'tooling/repo/openapi/export.ts'),
  openapiGenerate: path.join(repoRoot, 'tooling/repo/openapi/update.ts'),
  smokeStaging: path.join(repoRoot, 'tooling/repo/ci/smoke-staging.ts'),
  repoPackageRoot: path.join(repoRoot, 'tooling/repo'),
} as const

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Monorepo root (`edaya_web`). */
export const repoRoot = path.resolve(packageRoot, '../..')

export const paths = {
  frontendArchitecture: path.join(repoRoot, 'tooling/repo/ci/frontend-architecture.ts'),
  doctor: path.join(repoRoot, 'tooling/repo/ci/doctor.ts'),
  smokeStaging: path.join(repoRoot, 'tooling/repo/ci/smoke-staging.ts'),
  repoPackageRoot: path.join(repoRoot, 'tooling/repo'),
} as const

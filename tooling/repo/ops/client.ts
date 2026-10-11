import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { backendBranch, digest, environment, gitEnvironment, hashes, root, run, sha, verifyBackend, writeJson } from './runtime'

export interface ClientRecord {
  formatVersion: 1
  backendCommit: string
  schemaFingerprint: string
  artifacts: Record<string, string>
  generator: string
  cacheKey: string
}
export function clientOptions(args: string[]): {
  target: string
  backendRoot?: string
  ref?: string
} {
  const target = environment(args[0] ?? 'staging')
  const result: {
    target: string
    backendRoot?: string
    ref?: string
  } = { target }
  for (let i = 1; i < args.length; i += 2) {
    const value = args[i + 1]
    if (!value || value.startsWith('-') || /[\r\n]/.test(value))
      throw new Error('Expected explicit client option value')
    if (args[i] === '--backend-root')
      result.backendRoot = value
    else if (args[i] === '--ref')
      result.ref = value
    else
      throw new Error('Expected --ref or --backend-root')
  }
  if (result.ref && result.backendRoot)
    throw new Error('Use a reference or an existing checkout, not both')
  if (result.ref && process.env.CI === 'true')
    throw new Error('CI backend overrides belong in the manual validation workflow')
  return result
}
export async function acquireClient(target = 'staging', backendRoot?: string, override?: string): Promise<ClientRecord> {
  environment(target)
  const backend = resolve(backendRoot ?? resolve(root, '.ci/edaya_backend'))
  if (!backendRoot) {
    const ref = override ?? backendBranch(target)
    const env = gitEnvironment(process.env.IDENTITY_CHECKOUT_TOKEN)
    if (!existsSync(resolve(backend, '.git')))
      await run(['git', 'clone', '--no-checkout', 'https://github.com/Maya-Invest/edaya_backend.git', backend], { quiet: true, env })
    await run(['git', 'fetch', 'origin', ref], { cwd: backend, quiet: true, env })
    const commit = sha(await run(['git', 'rev-parse', 'FETCH_HEAD'], { cwd: backend, quiet: true }))
    await run(['git', 'checkout', '--detach', commit], { cwd: backend, quiet: true })
  }
  const commit = sha(await run(['git', 'rev-parse', 'HEAD'], { cwd: backend, quiet: true }))
  await verifyBackend(backend, process.env.CI_BACKEND_SHA ?? commit)
  const generator = digest(readFileSync(import.meta.filename))
  const cacheKey = digest(JSON.stringify([commit, generator, Bun.version, digest(readFileSync(resolve(backend, 'bun.lock'))), digest(readFileSync(resolve(root, 'bun.lock')))]))
  const cache = resolve(root, '.cache/clients', cacheKey)
  const output = resolve(root, '.generated/api-client')
  const restore = (directory: string, record: ClientRecord) => {
    rmSync(output, { recursive: true, force: true })
    cpSync(directory, output, { recursive: true })
    writeJson(resolve(root, '.generated/client.json'), record)
    return record
  }
  if (existsSync(resolve(cache, 'record.json'))) {
    const record = JSON.parse(readFileSync(resolve(cache, 'record.json'), 'utf8')) as ClientRecord
    if (record.cacheKey === cacheKey && record.backendCommit === commit && JSON.stringify(record.artifacts) === JSON.stringify(hashes(resolve(cache, 'client'))))
      return restore(resolve(cache, 'client'), record)
  }
  await run(['bun', 'install', '--frozen-lockfile', '--ignore-scripts'], { cwd: backend })
  await run(['bun', '--no-env-file', 'tooling/repo/openapi/check-drift.ts'], { cwd: backend })
  await run(['bun', '--filter', '@maya-invest/edaya-api-client', 'build'], { cwd: backend })
  rmSync(cache, { recursive: true, force: true })
  mkdirSync(resolve(cache, 'client'), { recursive: true })
  for (const name of ['src', 'dist', 'package.json'])
    cpSync(resolve(backend, 'package/api-client', name), resolve(cache, 'client', name), { recursive: true })
  const record: ClientRecord = { formatVersion: 1, backendCommit: commit, schemaFingerprint: digest(readFileSync(resolve(backend, 'tooling/repo/fixtures/openapi.json'))), artifacts: hashes(resolve(cache, 'client')), generator, cacheKey }
  writeJson(resolve(cache, 'record.json'), record)
  return restore(resolve(cache, 'client'), record)
}
export function checkClient(installed = true): ClientRecord {
  const record = JSON.parse(readFileSync(resolve(root, '.generated/client.json'), 'utf8')) as ClientRecord
  sha(record.backendCommit)
  if (record.generator !== digest(readFileSync(import.meta.filename)))
    throw new Error('Client preparation changed; run generate client')
  if (record.formatVersion !== 1 || JSON.stringify(hashes(resolve(root, '.generated/api-client'))) !== JSON.stringify(record.artifacts))
    throw new Error('Missing or modified prepared client; run generate client')
  if (process.env.CI_BACKEND_SHA && record.backendCommit !== process.env.CI_BACKEND_SHA)
    throw new Error('Prepared client and integration backend differ')
  if (installed) {
    for (const app of ['webapp', 'webadmin']) {
      const directory = resolve(root, 'apps', app, 'node_modules/@maya-invest/edaya-api-client')
      for (const [file, checksum] of Object.entries(record.artifacts)) {
        if (!existsSync(resolve(directory, file)) || digest(readFileSync(resolve(directory, file))) !== checksum)
          throw new Error('Installed client differs from prepared input; run generate dependencies')
      }
    }
    const frozen = JSON.parse(readFileSync(resolve(root, '.generated/dependencies.json'), 'utf8')) as {
      lockSha256: string
      clientChecksum: string
    }
    if (frozen.lockSha256 !== digest(readFileSync(resolve(root, 'bun.lock'))) || frozen.clientChecksum !== digest(readFileSync(resolve(root, '.generated/client.json'))))
      throw new Error('Dependency inputs changed; run generate dependencies')
  }
  return record
}
export async function installPreparedDependencies(): Promise<void> {
  checkClient(false)
  // Bun caches file dependencies; force refresh so unchanged package versions cannot reuse old source.
  await run(['bun', 'install', '--ignore-scripts', '--force'])
  await run(['bun', 'install', '--frozen-lockfile', '--ignore-scripts'])
  writeJson(resolve(root, '.generated/dependencies.json'), { lockSha256: digest(readFileSync(resolve(root, 'bun.lock'))), clientChecksum: digest(readFileSync(resolve(root, '.generated/client.json'))) })
  checkClient()
}

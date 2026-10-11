import { existsSync, readFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { assertCommittedSource, digest, environment, files, hashes, root, run, sha, writeJson } from './runtime'

export interface ReleaseRecord {
  formatVersion: 1
  sourceCommit: string
  environment: string
  runtime: string
  tools: Record<string, string>
  status: string
  artifacts: Record<string, string>
  client?: unknown
  schemaFingerprint?: string
  tests: string[]
  sourceState?: string
}
const isBackend = existsSync(resolve(root, 'apps/api'))
export async function buildRelease(target: string): Promise<void> {
  const channel = environment(target)
  if (isBackend) {
    rmSync(resolve(root, '.release/worker'), { recursive: true, force: true })
    await run(['bun', 'x', 'wrangler', 'deploy', '--env', channel === 'production' ? 'prod' : channel, '--dry-run', '--outdir', resolve(root, '.release/worker')], { cwd: resolve(root, 'apps/api') })
  }
  else {
    const env = { PUBLIC_API_URL: channel === 'production' ? 'https://api.edayaplus.com' : 'https://staging.api.edayaplus.com', PUBLIC_TEST_OTP_ACCESS: 'false', PUBLIC_APP_ENV: channel }
    for (const app of ['webapp', 'webadmin'])
      await run(['bun', 'run', 'build'], { cwd: resolve(root, 'apps', app), env })
  }
  const artifacts: Record<string, string> = { 'bun.lock': digest(readFileSync(resolve(root, 'bun.lock'))) }
  for (const directory of isBackend ? ['.release/worker'] : ['apps/webapp/build', 'apps/webadmin/build']) {
    const contents = hashes(resolve(root, directory))
    if (!Object.keys(contents).length)
      throw new Error(`Empty build output: ${directory}`)
    for (const [name, hash] of Object.entries(contents))
      artifacts[`${directory}/${name}`] = hash
  }
  for (const file of isBackend ? ['apps/api/wrangler.jsonc'] : ['apps/webapp/wrangler.jsonc', 'apps/webadmin/wrangler.jsonc'])
    artifacts[file] = digest(readFileSync(resolve(root, file)))
  const record: ReleaseRecord = { formatVersion: 1, sourceCommit: sha(await run(['git', 'rev-parse', 'HEAD'], { quiet: true })), environment: channel, runtime: `bun@${Bun.version}`, tools: { bun: Bun.version, typescript: JSON.parse(readFileSync(resolve(root, 'node_modules/typescript/package.json'), 'utf8')).version, wrangler: JSON.parse(readFileSync(resolve(root, isBackend ? 'apps/api/node_modules/wrangler/package.json' : 'apps/webapp/node_modules/wrangler/package.json'), 'utf8')).version }, status: 'built', artifacts, tests: [] }
  if (isBackend)
    record.schemaFingerprint = digest(readFileSync(resolve(root, 'tooling/repo/fixtures/openapi.json')))
  else
    record.client = JSON.parse(readFileSync(resolve(root, '.generated/client.json'), 'utf8'))
  record.sourceState = await run(['git', 'status', '--porcelain'], { quiet: true }) ? 'working-tree' : 'clean'
  record.tools.node = await run(['node', '--version'], { quiet: true })
  if (isBackend)
    record.tools.oasdiff = '1.11.7'
  writeJson(resolve(root, '.release/manifest.json'), record)
}
export async function validateRelease(target: string): Promise<ReleaseRecord> {
  const record = JSON.parse(readFileSync(resolve(root, '.release/manifest.json'), 'utf8')) as ReleaseRecord
  if (!isBackend && JSON.stringify(record.client) !== JSON.stringify(JSON.parse(readFileSync(resolve(root, '.generated/client.json'), 'utf8'))))
    throw new Error('Release client evidence differs from prepared input')
  if (record.formatVersion !== 1 || record.environment !== environment(target) || record.sourceCommit !== await run(['git', 'rev-parse', 'HEAD'], { quiet: true }))
    throw new Error('Release identity mismatch')
  for (const [file, hash] of Object.entries(record.artifacts)) {
    if (file.startsWith('/') || file.split('/').includes('..') || digest(readFileSync(resolve(root, file))) !== hash)
      throw new Error('Release artifact drift')
  }
  const directories = isBackend ? ['.release/worker'] : ['apps/webapp/build', 'apps/webadmin/build']
  for (const directory of directories) {
    for (const file of files(resolve(root, directory))) {
      if (!record.artifacts[relative(root, file)])
        throw new Error('Unrecorded release artifact')
    }
  }
  return record
}
export async function deployRelease(target: string, dryRun = false): Promise<void> {
  if (!dryRun)
    await assertCommittedSource(isBackend ? [] : ['bun.lock'])
  const record = await validateRelease(target)
  if (record.status !== 'qualified' && !dryRun)
    throw new Error('Release has not passed qualification')
  const channel = environment(target)
  const env = channel === 'production' ? 'prod' : channel
  const command = ['bun', 'x', 'wrangler', 'deploy', '--env', env, '--keep-vars', ...(dryRun ? ['--dry-run'] : [])]
  if (isBackend) {
    const entries = files(resolve(root, '.release/worker')).filter(file => file.endsWith('.js') && !file.endsWith('.map'))
    if (entries.length !== 1)
      throw new Error('Expected one bundled Worker entrypoint')
    await run([...command, entries[0]!, '--no-bundle', '--config', resolve(root, 'apps/api/wrangler.jsonc')], { cwd: resolve(root, 'apps/api') })
  }
  else {
    for (const app of ['webapp', 'webadmin'])
      await run(command, { cwd: resolve(root, 'apps', app) })
  }
  if (!dryRun) {
    record.status = 'deployed'
    writeJson(resolve(root, '.release/manifest.json'), record)
  }
}
export async function qualifyRelease(target: string): Promise<void> {
  const record = await validateRelease(target)
  const results = JSON.parse(readFileSync(resolve(root, '.ci-evidence/qualification.json'), 'utf8')) as {
    sourceCommit: string
    environment: string
    checks: Record<string, boolean>
  }
  if (results.environment !== target || results.sourceCommit !== record.sourceCommit || results.checks.verification !== true || results.checks.integration !== true || results.checks[isBackend ? 'compatibility' : 'client'] !== true)
    throw new Error('Missing successful qualification evidence')
  record.tests = Object.keys(results.checks)
  record.status = 'qualified'
  writeJson(resolve(root, '.release/manifest.json'), record)
}

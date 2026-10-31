import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { BROWSER_SUITE_DIRECTORIES, FOCUSED_BROWSER_SUITES } from './browser-suites'
import { checkClient } from './client'
import { checkIntegrationDiskSpace } from './disk'
import { beginIntegrationEvidence, integrationEvidence } from './evidence'
import { invalidateQualification } from './qualification'
import { root, run, verifyBackend, waitForUrl } from './runtime'
import { Services } from './services'

export function selectedIntegrationSuite(args: string[]): string | undefined {
  if (!args.length)
    return undefined
  if (args.length !== 2 || args[0] !== '--suite' || !Object.hasOwn(BROWSER_SUITE_DIRECTORIES, args[1]!))
    throw new Error(`Expected --suite <id>; available: ${Object.keys(BROWSER_SUITE_DIRECTORIES).join(', ')}`)
  return args[1]
}

export function beginIntegrationAttempt(runId: string, selectedSuite?: string, repository = root): void {
  invalidateQualification(repository)
  if (selectedSuite)
    rmSync(resolve(repository, '.ci-evidence/stages/integration.json'), { force: true })
  beginIntegrationEvidence(runId, repository)
}

export async function integration(selectedSuite?: string): Promise<void> {
  const runId = crypto.randomUUID()
  beginIntegrationAttempt(runId, selectedSuite)
  const client = checkClient()
  const backend = resolve(process.env.BACKEND_ROOT ?? resolve(root, '.ci/edaya_backend'))
  await verifyBackend(backend, client.backendCommit)
  let processPassed = false
  let evidencePassed = false
  try {
    await run(['bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'ci', 'fixture', root, '--', 'bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'ci', 'browser-suites', ...(selectedSuite ? ['--suite', selectedSuite] : [])], { cwd: backend, timeout: 160 * 60000, env: { ...process.env, EDAYA_INTEGRATION_RUN_ID: runId } })
    processPassed = true
  }
  finally {
    evidencePassed = await integrationEvidence(runId, processPassed && !selectedSuite)
  }
  if (!selectedSuite && !evidencePassed)
    throw new Error('Missing complete successful browser qualification evidence')
}
export async function browserSuites(selectedSuite?: string): Promise<void> {
  const cwd = resolve(root, 'apps/webapp')
  const services = new Services()
  const api = process.env.EDAYA_TEST_API_URL
  if (!api || !process.env.BACKEND_ROOT)
    throw new Error('Browser suites require the owned backend fixture')
  for (const name of Object.values(BROWSER_SUITE_DIRECTORIES))
    rmSync(resolve(cwd, name), { recursive: true, force: true })
  const env = { ...process.env, PUBLIC_API_URL: api, PUBLIC_TEST_OTP_ACCESS: 'true', PUBLIC_APP_ENV: 'staging', WEBAPP_URL: 'http://127.0.0.1:14173', WEBAPP_READINESS_PATH: '/login', INTEGRATION_FAIL_ON: 'not_ok' }
  const failures: string[] = []
  async function suite(name: string, command: string[], overrides = {}) {
    services.assertRunning()
    checkIntegrationDiskSpace(name)
    try {
      await services.run(command, { cwd, env: { ...env, ...overrides }, timeout: 60 * 60000 })
    }
    catch {
      services.assertRunning()
      failures.push(name)
    }
  }
  const start = (command: string[], overrides = {}) => services.start(command.join(' '), command, cwd, { ...env, ...overrides })
  try {
    await services.run(['bun', 'x', '--bun', 'playwright', 'install', '--with-deps', 'chromium'], { cwd })
    // The backend fixture uses NODE_ENV=test. A browser production build must
    // not inherit that value, which embeds Vite's development client in HTML.
    await services.run(['bun', 'run', 'build'], { cwd, env: { ...env, NODE_ENV: 'production' } })
    start(['bun', 'x', 'wrangler', 'dev', '--local', '--port', '14173', '--ip', '127.0.0.1'])
    await waitForUrl(`${env.WEBAPP_URL}/login`, 120, () => services.assertRunning())
    for (const name of ['availability', 'onboarding', 'provisioned', 'webadmin']) {
      if (!selectedSuite || selectedSuite === name)
        await suite(name, ['bun', 'run', `test:integration:${name}`])
    }
    const needsSeed = !selectedSuite || selectedSuite === 'demo' || FOCUSED_BROWSER_SUITES.some(suite => suite.name === selectedSuite && suite.seeded)
    if (needsSeed) {
      await services.run(['bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'ops', 'seed'], { cwd: process.env.BACKEND_ROOT, env })
      start(['bun', 'run', 'dev', '--host', '127.0.0.1', '--port', '14174', '--strictPort'], { PUBLIC_APP_ENV: 'development' })
      await waitForUrl('http://127.0.0.1:14174/login', 120, () => services.assertRunning())
    }
    const demo = { WEBAPP_URL: 'http://127.0.0.1:14174', DEMO_DRY_RUN_OUT_DIR: resolve(cwd, '.demo-dry-run') }
    if (!selectedSuite || selectedSuite === 'demo')
      await suite('demo', ['bun', 'test', 'tests/integration/demo-dry-run/demo-dry-run.test.ts'], demo)
    for (const { name, seeded } of FOCUSED_BROWSER_SUITES) {
      if (!selectedSuite || selectedSuite === name)
        await suite(name, ['bun', 'run', `test:integration:${name}`], seeded ? demo : {})
    }
    if (!selectedSuite)
      await suite('coverage', ['bun', 'run', 'test:integration:coverage'])
  }
  finally {
    await services.stop('browser-services.json')
  }
  if (failures.length)
    throw new Error(`Integration suites failed: ${failures.join(', ')}`)
}

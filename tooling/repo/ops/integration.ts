import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkClient } from './client'
import { integrationEvidence } from './evidence'
import { root, run, verifyBackend, waitForUrl } from './runtime'
import { Services } from './services'

export async function integration(): Promise<void> {
  const client = checkClient()
  const backend = resolve(process.env.BACKEND_ROOT ?? resolve(root, '.ci/edaya_backend'))
  await verifyBackend(backend, client.backendCommit)
  try {
    await run(['bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'ci', 'fixture', root, '--', 'bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'ci', 'browser-suites'], { cwd: backend, timeout: 160 * 60000 })
  }
  finally {
    await integrationEvidence()
  }
}
export async function browserSuites(): Promise<void> {
  const cwd = resolve(root, 'apps/webapp')
  const services = new Services()
  const api = process.env.EDAYA_TEST_API_URL
  if (!api || !process.env.BACKEND_ROOT)
    throw new Error('Browser suites require the owned backend fixture')
  for (const name of ['.availability-run', '.onboarding-run', '.integration-run', '.webadmin-run', '.demo-dry-run'])
    rmSync(resolve(cwd, name), { recursive: true, force: true })
  const env = { ...process.env, PUBLIC_API_URL: api, PUBLIC_TEST_OTP_ACCESS: 'true', PUBLIC_APP_ENV: 'staging', WEBAPP_URL: 'http://127.0.0.1:14173', WEBAPP_READINESS_PATH: '/login', INTEGRATION_FAIL_ON: 'not_ok' }
  const failures: string[] = []
  async function suite(name: string, command: string[], overrides = {}) {
    services.assertRunning()
    try {
      await run(command, { cwd, env: { ...env, ...overrides }, timeout: 60 * 60000 })
    }
    catch {
      services.assertRunning()
      failures.push(name)
    }
  }
  const start = (command: string[], overrides = {}) => services.start(command.join(' '), command, cwd, { ...env, ...overrides })
  try {
    await run(['bun', 'x', '--bun', 'playwright', 'install', '--with-deps', 'chromium'], { cwd })
    await run(['bun', 'run', 'build'], { cwd, env })
    start(['bun', 'x', 'wrangler', 'dev', '--local', '--port', '14173', '--ip', '127.0.0.1'])
    await waitForUrl(`${env.WEBAPP_URL}/login`, 120, () => services.assertRunning())
    for (const name of ['availability', 'onboarding', 'provisioned', 'webadmin'])
      await suite(name, ['bun', 'run', `test:integration:${name}`])
    await run(['bun', '--no-env-file', 'tooling/repo/ops/main.ts', 'maintenance', 'seed'], { cwd: process.env.BACKEND_ROOT, env })
    start(['bun', 'run', 'dev', '--host', '127.0.0.1', '--port', '14174', '--strictPort'], { PUBLIC_APP_ENV: 'development' })
    await waitForUrl('http://127.0.0.1:14174/login', 120, () => services.assertRunning())
    const demo = { WEBAPP_URL: 'http://127.0.0.1:14174', DEMO_DRY_RUN_OUT_DIR: resolve(cwd, '.demo-dry-run') }
    await suite('demo', ['bun', 'test', 'tests/integration/demo-dry-run/demo-dry-run.test.ts'], demo)
    for (const name of ['messaging-ui', 'family-feedback-ui', 'permission-profiles'])
      await suite(name, ['bun', 'run', `test:integration:${name}`], demo)
    for (const name of ['timetable-selection', 'coverage'])
      await suite(name, ['bun', 'run', `test:integration:${name}`])
  }
  finally {
    await services.stop('browser-services.json')
  }
  if (failures.length)
    throw new Error(`Integration suites failed: ${failures.join(', ')}`)
}

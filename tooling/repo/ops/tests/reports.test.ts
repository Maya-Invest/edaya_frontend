import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { collectReports } from '../reports'

test('retained reports remain valid JSON/CSV and exclude private fixtures', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-reports-'))
  try {
    const suite = resolve(directory, 'apps/webapp/.integration-run')
    mkdirSync(suite, { recursive: true })
    writeFileSync(resolve(suite, 'summary.json'), JSON.stringify({ total: 123456, ok: false, token: 'private-token', detail: 'Bearer private-value' }))
    writeFileSync(resolve(suite, 'fixture.json'), '{"password":"private-password"}')
    const onboarding = resolve(directory, 'apps/webapp/.onboarding-run')
    mkdirSync(onboarding, { recursive: true })
    writeFileSync(resolve(onboarding, 'fixture.json'), '{"password":"private-password"}')
    writeFileSync(resolve(onboarding, 'summary.json'), '{"token":"private-token"')
    writeFileSync(resolve(directory, 'qa-test-matrix.csv'), 'status,detail\nfailed,password=private-password\n')
    collectReports(directory)
    const output = resolve(directory, '.ci-evidence/reports')
    expect(JSON.parse(readFileSync(resolve(output, 'integration/summary.json'), 'utf8'))).toEqual({ total: 123456, ok: false, token: '[REDACTED]', detail: 'Bearer [REDACTED]' })
    expect(existsSync(resolve(output, 'integration/fixture.json'))).toBe(false)
    expect(existsSync(resolve(output, 'onboarding/fixture.json'))).toBe(false)
    expect(JSON.parse(readFileSync(resolve(output, 'onboarding/summary.json'), 'utf8')).invalidReport).toBe(true)
    expect(readFileSync(resolve(output, 'qa-test-matrix.csv'), 'utf8')).not.toContain('private-password')
    expect(readFileSync(resolve(output, 'index.html'), 'utf8')).toContain('qa-test-matrix.csv')
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

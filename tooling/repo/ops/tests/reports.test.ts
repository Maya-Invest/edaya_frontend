import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { beginIntegrationEvidence, readSuiteEvidence } from '../evidence'
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
    const focused = resolve(directory, 'apps/webapp/.focused-run/attendance-ui')
    mkdirSync(focused, { recursive: true })
    writeFileSync(resolve(focused, 'summary.json'), JSON.stringify({ ok: false, exitCode: 1 }))
    writeFileSync(resolve(focused, 'failure.png'), 'diagnostic-image')
    writeFileSync(resolve(focused, 'fixture.json'), '{"password":"private-password"}')
    collectReports(directory)
    const output = resolve(directory, '.ci-evidence/reports')
    expect(JSON.parse(readFileSync(resolve(output, 'integration/summary.json'), 'utf8'))).toEqual({ total: 123456, ok: false, token: '[REDACTED]', detail: 'Bearer [REDACTED]' })
    expect(existsSync(resolve(output, 'integration/fixture.json'))).toBe(false)
    expect(existsSync(resolve(output, 'onboarding/fixture.json'))).toBe(false)
    expect(JSON.parse(readFileSync(resolve(output, 'onboarding/summary.json'), 'utf8')).invalidReport).toBe(true)
    expect(readFileSync(resolve(output, 'qa-test-matrix.csv'), 'utf8')).not.toContain('private-password')
    expect(readFileSync(resolve(output, 'index.html'), 'utf8')).toContain('qa-test-matrix.csv')
    expect(JSON.parse(readFileSync(resolve(output, 'attendance-ui/summary.json'), 'utf8'))).toEqual({ ok: false, exitCode: 1 })
    expect(existsSync(resolve(output, 'attendance-ui/failure.png'))).toBe(true)
    expect(existsSync(resolve(output, 'attendance-ui/fixture.json'))).toBe(false)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('starting qualification clears historical success before preflight or child processes run', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-preflight-evidence-'))
  try {
    const path = resolve(directory, '.ci-evidence/results.json')
    mkdirSync(resolve(directory, '.ci-evidence'))
    writeFileSync(path, JSON.stringify({ passed: true, runId: 'previous', suites: { demo: { passed: true } } }))
    beginIntegrationEvidence('current', directory)
    const result = JSON.parse(readFileSync(path, 'utf8'))
    expect(result.passed).toBe(false)
    expect(result.runId).toBe('current')
    expect(Object.keys(result.suites)).toContain('grading-configuration')
    expect(Object.values(result.suites).every((suite: any) => !suite.passed && !suite.completed)).toBe(true)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('qualification requires complete, current, nonempty successful execution', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-evidence-'))
  const summary = { ok: true, exitCode: 0, outcomes: [{ id: 'web.focused.attendance-ui', status: 'passed' }] }
  const metadata = { completed: true, fingerprint: 'current', runId: 'run' }
  const evidence = (value: unknown = summary, execution: unknown = metadata) => {
    writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(value))
    writeFileSync(resolve(directory, 'execution.json'), JSON.stringify(execution))
    return readSuiteEvidence(directory, 'attendance-ui', 'current', 'run')
  }
  try {
    expect(evidence().passed).toBe(true)
    for (const execution of [{ ...metadata, completed: false }, { ...metadata, fingerprint: 'stale' }, { ...metadata, runId: 'previous' }])
      expect(evidence(summary, execution).passed).toBe(false)
    for (const value of [
      { ...summary, ok: false },
      { ...summary, exitCode: 1 },
      { ...summary, outcomes: [] },
      { ...summary, outcomes: [{ id: 'wrong', status: 'passed' }] },
      { ...summary, outcomes: [...summary.outcomes, ...summary.outcomes] },
      ...['failed', 'blocked', 'skipped'].map(status => ({ ...summary, outcomes: [{ ...summary.outcomes[0], status }] })),
    ]) expect(evidence(value).passed).toBe(false)
    writeFileSync(resolve(directory, 'summary.json'), '{')
    expect(readSuiteEvidence(directory, 'attendance-ui', 'current', 'run').passed).toBe(false)
    rmSync(resolve(directory, 'summary.json'))
    expect(readSuiteEvidence(directory, 'attendance-ui', 'current', 'run').present).toBe(false)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

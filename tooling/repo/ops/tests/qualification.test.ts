import type { QualificationEvidence, StageContext, StageEvidence } from '../qualification'
import type { ReleaseRecord } from '../release'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { BROWSER_SUITE_DIRECTORIES } from '../browser-suites'
import { invalidateQualification, requiredStages, resetQualification, validateIntegrationEvidence, validateQualificationEvidence, validateStageEvidence } from '../qualification'
import { validateReleaseArtifacts } from '../release'
import { digest, writeJson } from '../runtime'

const context: StageContext = { sourceCommit: 'a'.repeat(40), backendCommit: 'b'.repeat(40), clientChecksum: 'c'.repeat(64), lockSha256: 'd'.repeat(64), environment: 'staging', runId: '42', attempt: '2' }
const records = (): StageEvidence[] => requiredStages.map(stage => ({ ...context, stage, status: 'passed', durationMs: 12 }))
const qualification = (): QualificationEvidence => ({ ...context, checks: { verification: true, integration: true, client: true }, stages: records() })
const browser = () => ({ passed: true, runId: 'fixture-run', commit: context.sourceCommit, backendCommit: context.backendCommit, clientChecksum: context.clientChecksum, lockSha256: context.lockSha256, environment: context.environment, githubRunId: context.runId, attempt: context.attempt, suites: Object.fromEntries(Object.keys(BROWSER_SUITE_DIRECTORIES).map(name => [name, { present: true, completed: true, current: true, passed: true, counts: { passed: 2, failed: 0, total: 2 } }])) })

test('qualification joins exactly one successful stage for every mandatory task', () => {
  expect(() => validateStageEvidence(records(), context)).not.toThrow()
  for (const stage of requiredStages) {
    expect(() => validateStageEvidence(records().filter(row => row.stage !== stage), context)).toThrow()
    expect(() => validateStageEvidence([...records(), records().find(row => row.stage === stage)!], context)).toThrow()
    for (const status of ['failed', 'running', 'skipped', 'cancelled']) {
      const rows = records().map(row => row.stage === stage ? { ...row, status } : row)
      expect(() => validateStageEvidence(rows as StageEvidence[], context)).toThrow()
    }
  }
  const duplicate = records()
  duplicate[1] = duplicate[0]!
  expect(() => validateStageEvidence(duplicate, context)).toThrow()
  for (const durationMs of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    expect(() => validateStageEvidence(records().map(row => ({ ...row, durationMs })), context)).toThrow()
})

test('no input or execution identity can be mixed across stages or restored qualification', () => {
  expect(() => validateQualificationEvidence(qualification(), context)).not.toThrow()
  for (const key of Object.keys(context) as (keyof StageContext)[]) {
    const rows = records()
    rows[0] = { ...rows[0]!, [key]: 'different' }
    expect(() => validateStageEvidence(rows, context)).toThrow()
    expect(() => validateQualificationEvidence({ ...qualification(), [key]: 'different' }, context)).toThrow()
    expect(() => validateQualificationEvidence({ ...qualification(), stages: rows }, context)).toThrow()
  }
  for (const key of ['verification', 'integration', 'client'] as const)
    expect(() => validateQualificationEvidence({ ...qualification(), checks: { ...qualification().checks, [key]: false } }, context)).toThrow()
})

test('browser success must include every complete current suite and matching execution identity', () => {
  expect(() => validateIntegrationEvidence(browser(), context)).not.toThrow()
  for (const key of ['commit', 'backendCommit', 'clientChecksum', 'lockSha256', 'environment', 'githubRunId', 'attempt'])
    expect(() => validateIntegrationEvidence({ ...browser(), [key]: 'wrong' }, context)).toThrow()
  expect(() => validateIntegrationEvidence({ ...browser(), passed: false }, context)).toThrow()
  for (const name of Object.keys(BROWSER_SUITE_DIRECTORIES)) {
    const missing = browser()
    delete missing.suites[name]
    expect(() => validateIntegrationEvidence(missing, context)).toThrow()
    for (const flag of ['present', 'completed', 'current', 'passed']) {
      const result = browser()
      result.suites[name] = { ...result.suites[name]!, [flag]: false }
      expect(() => validateIntegrationEvidence(result, context)).toThrow()
    }
  }
  for (const counts of [{ total: 0, passed: 0, failed: 0 }, { total: 2, passed: 1, failed: 1 }, { total: 2, passed: 2, failed: 0, skipped: 1 }, { total: 2, passed: 2, failed: 0, blocked: 1 }]) {
    const result = browser()
    result.suites.demo = { ...result.suites.demo!, counts }
    expect(() => validateIntegrationEvidence(result, context)).toThrow()
  }
})

test('new qualification removes stale success and old stages before any preflight', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'web-qualification-'))
  try {
    writeJson(resolve(directory, '.release/manifest.json'), { status: 'qualified', tests: ['old'], artifacts: { retained: true } })
    writeJson(resolve(directory, '.ci-evidence/qualification.json'), qualification())
    writeJson(resolve(directory, '.ci-evidence/stages/quality.json'), records()[0])
    writeJson(resolve(directory, '.ci-evidence/quality/checks.json'), {})
    writeJson(resolve(directory, '.ci-evidence/results.json'), browser())
    invalidateQualification(directory)
    expect(existsSync(resolve(directory, '.ci-evidence/qualification.json'))).toBe(false)
    expect(JSON.parse(readFileSync(resolve(directory, '.release/manifest.json'), 'utf8'))).toEqual({ status: 'built', tests: [], artifacts: { retained: true } })
    expect(existsSync(resolve(directory, '.ci-evidence/stages/quality.json'))).toBe(true)
    resetQualification(directory)
    for (const name of ['stages', 'quality', 'results.json'])
      expect(existsSync(resolve(directory, '.ci-evidence', name))).toBe(false)
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
})

test('release handoff rejects changed, missing and unrecorded output files', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'web-release-'))
  try {
    writeJson(resolve(directory, 'apps/webapp/build/index.html'), 'built')
    writeJson(resolve(directory, 'apps/webadmin/build/index.html'), 'admin')
    const paths = ['apps/webapp/build/index.html', 'apps/webadmin/build/index.html']
    const record = { artifacts: Object.fromEntries(paths.map(path => [path, digest(readFileSync(resolve(directory, path)))])) } as ReleaseRecord
    expect(() => validateReleaseArtifacts(record, directory)).not.toThrow()
    writeFileSync(resolve(directory, paths[0]!), 'changed')
    expect(() => validateReleaseArtifacts(record, directory)).toThrow('drift')
    writeJson(resolve(directory, paths[0]!), 'built')
    writeJson(resolve(directory, 'apps/webapp/build/unrecorded.js'), 'extra')
    expect(() => validateReleaseArtifacts(record, directory)).toThrow('Unrecorded')
    rmSync(resolve(directory, 'apps/webapp/build/unrecorded.js'))
    rmSync(resolve(directory, paths[1]!))
    expect(() => validateReleaseArtifacts(record, directory)).toThrow()
    expect(() => validateReleaseArtifacts({ ...record, artifacts: { '../outside': 'x' } }, directory)).toThrow('drift')
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
})

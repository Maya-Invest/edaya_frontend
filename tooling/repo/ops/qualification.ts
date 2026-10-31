import { appendFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { BROWSER_SUITE_DIRECTORIES } from './browser-suites'
import { checkClient } from './client'
import { digest, environment, files, root, run, sha, writeJson } from './runtime'

export const requiredStages = ['quality', 'unit', 'build', 'integration'] as const
export interface StageContext {
  sourceCommit: string
  backendCommit: string
  clientChecksum: string
  lockSha256: string
  environment: string
  runId: string
  attempt: string
}
export interface StageEvidence extends StageContext {
  stage: string
  status: 'running' | 'passed' | 'failed'
  durationMs: number
}
export interface QualificationEvidence extends StageContext {
  checks: { verification: boolean, integration: boolean, client: boolean }
  stages: StageEvidence[]
}

export async function stageContext(target = process.env.CI_TARGET ?? 'staging'): Promise<StageContext> {
  const client = checkClient(false)
  const clientChecksum = digest(readFileSync(resolve(root, '.generated/client.json')))
  const lockSha256 = digest(readFileSync(resolve(root, 'bun.lock')))
  const dependencies = JSON.parse(readFileSync(resolve(root, '.generated/dependencies.json'), 'utf8'))
  if (dependencies.clientChecksum !== clientChecksum || dependencies.lockSha256 !== lockSha256)
    throw new Error('Prepared dependency inputs differ from qualification inputs')
  const sourceCommit = sha(await run(['git', 'rev-parse', 'HEAD'], { quiet: true }))
  if (process.env.CI_SOURCE_SHA && process.env.CI_SOURCE_SHA !== sourceCommit)
    throw new Error('Frontend checkout differs from prepared input')
  return { sourceCommit, backendCommit: client.backendCommit, clientChecksum, lockSha256, environment: environment(target), runId: process.env.GITHUB_RUN_ID ?? 'local', attempt: process.env.GITHUB_RUN_ATTEMPT ?? process.env.EDAYA_QUALIFICATION_ATTEMPT ?? 'local' }
}

export function validateStageEvidence(records: StageEvidence[], expected: StageContext, stages: readonly string[] = requiredStages): void {
  if (!Array.isArray(records) || records.length !== stages.length)
    throw new Error('Missing or duplicate qualification stages')
  for (const stage of stages) {
    const matches = records.filter(record => record?.stage === stage)
    const record = matches[0]
    if (matches.length !== 1 || !record || record.status !== 'passed' || !Number.isFinite(record.durationMs) || record.durationMs < 0
      || Object.entries(expected).some(([key, value]) => record[key as keyof StageContext] !== value)) {
      throw new Error(`Missing, failed or mismatched stage: ${stage}`)
    }
  }
}

export function validateQualificationEvidence(record: QualificationEvidence, expected: StageContext): void {
  if (!record || Object.entries(expected).some(([key, value]) => record[key as keyof StageContext] !== value)
    || record.checks?.verification !== true || record.checks?.integration !== true || record.checks?.client !== true) {
    throw new Error('Missing successful matching qualification evidence')
  }
  validateStageEvidence(record.stages, expected)
}

export function validateIntegrationEvidence(record: any, expected: StageContext): void {
  if (!record || record.passed !== true || !record.runId || record.commit !== expected.sourceCommit
    || record.backendCommit !== expected.backendCommit || record.clientChecksum !== expected.clientChecksum || record.lockSha256 !== expected.lockSha256
    || record.githubRunId !== expected.runId || record.attempt !== expected.attempt || record.environment !== expected.environment) {
    throw new Error('Missing successful matching browser evidence')
  }
  const suites = Object.keys(BROWSER_SUITE_DIRECTORIES)
  if (!record.suites || Object.keys(record.suites).length !== suites.length || suites.some((name) => {
    const suite = record.suites[name]
    return !suite || suite.present !== true || suite.completed !== true || suite.current !== true || suite.passed !== true
      || !(suite.counts?.total > 0) || suite.counts.passed !== suite.counts.total || suite.counts.failed !== 0
      || (suite.counts.skipped ?? 0) !== 0 || (suite.counts.blocked ?? 0) !== 0
  })) {
    throw new Error('Incomplete browser suite evidence')
  }
}

export async function recordStage(stage: string, action: () => Promise<unknown>, target?: string, directory: 'stages' | 'quality' = 'stages'): Promise<void> {
  const path = resolve(root, `.ci-evidence/${directory}/${stage}.json`)
  rmSync(path, { force: true })
  const record: StageEvidence = { ...await stageContext(target), stage, status: 'running', durationMs: 0 }
  writeJson(path, record)
  const started = performance.now()
  try {
    await action()
    validateStageEvidence([{ ...record, status: 'passed' }], await stageContext(target), [stage])
    record.status = 'passed'
  }
  catch (error) {
    record.status = 'failed'
    throw error
  }
  finally {
    record.durationMs = performance.now() - started
    writeJson(path, record)
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${stage}: ${record.status} (${Math.round(record.durationMs / 1000)}s)\n`)
  }
}

export function invalidateQualification(directory = root): void {
  rmSync(resolve(directory, '.ci-evidence/qualification.json'), { force: true })
  const path = resolve(directory, '.release/manifest.json')
  if (existsSync(path)) {
    const record = JSON.parse(readFileSync(path, 'utf8'))
    record.status = 'built'
    record.tests = []
    writeJson(path, record)
  }
}

export function resetQualification(directory = root): void {
  invalidateQualification(directory)
  for (const path of ['stages', 'quality', 'results.json'])
    rmSync(resolve(directory, '.ci-evidence', path), { force: true, recursive: true })
}

export async function finalizeQualification(target: string): Promise<void> {
  invalidateQualification()
  try {
    const context = await stageContext(target)
    const stages = files(resolve(root, '.ci-evidence/stages')).filter(path => path.endsWith('.json')).map(path => JSON.parse(readFileSync(path, 'utf8')) as StageEvidence)
    validateStageEvidence(stages, context)
    validateIntegrationEvidence(JSON.parse(readFileSync(resolve(root, '.ci-evidence/results.json'), 'utf8')), context)
    const { qualifyRelease, validateRelease } = await import('./release')
    await validateRelease(target)
    writeJson(resolve(root, '.ci-evidence/qualification.json'), { ...context, checks: { verification: true, integration: true, client: true }, stages } satisfies QualificationEvidence)
    await qualifyRelease(target)
  }
  catch (error) {
    invalidateQualification()
    throw error
  }
}

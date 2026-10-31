import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BROWSER_SUITE_DIRECTORIES, FOCUSED_BROWSER_SUITES } from './browser-suites'
import { checkClient } from './client'
import { sourceFingerprint } from './execution-metadata'
import { collectReports } from './reports'
import { digest, root, run, writeJson } from './runtime'

interface Summary {
  ok?: boolean
  passed?: number
  failed?: number
  total?: number
  skipped?: number
  blocked?: number
  exitCode?: number
  matrix?: Summary
  results?: unknown[]
  scenes?: {
    id?: string
    status: string
  }[]
  outcomes?: {
    id?: string
    status: string
  }[]
}
export function counts(summary: Summary, name: string): Record<string, number> {
  if (name === 'provisioned')
    return counts(summary.matrix ?? {}, '')
  const rows = summary.scenes ?? summary.outcomes
  if (Array.isArray(rows) && rows.length)
    return { total: rows.length, passed: rows.filter(row => row.status === 'passed').length, failed: rows.filter(row => row.status !== 'passed').length }
  const result: Record<string, number> = {}
  for (const key of ['passed', 'failed', 'total', 'skipped', 'blocked'] as const) {
    if (Number.isInteger(summary[key]) && summary[key]! >= 0)
      result[key] = summary[key]!
  }
  if (name === 'demo')
    result.total = summary.results?.length ?? 0
  return result
}
/** A successful summary cannot override incomplete, stale or failed execution. */
export function readSuiteEvidence(directory: string, name: string, fingerprint: string, runId?: string) {
  const path = resolve(directory, name === 'demo' ? 'results.json' : 'summary.json')
  const present = existsSync(path)
  try {
    const summary = JSON.parse(readFileSync(path, 'utf8')) as Summary
    const metadata = JSON.parse(readFileSync(resolve(directory, 'execution.json'), 'utf8')) as {
      completed?: boolean
      fingerprint?: string
      runId?: string
    }
    const completed = metadata.completed === true
    const current = metadata.fingerprint === fingerprint && (!runId || metadata.runId === runId)
    const totals = counts(summary, name)
    const focused = FOCUSED_BROWSER_SUITES.some(suite => suite.name === name)
    const expectedFocused = !focused || (summary.exitCode === 0 && summary.outcomes?.length === 1
      && summary.outcomes[0]?.id === `web.focused.${name}`)
    const passed = completed && current && summary.ok !== false && expectedFocused
      && (summary.exitCode === undefined || summary.exitCode === 0)
      && (totals.total ?? 0) > 0 && totals.passed === totals.total && totals.failed === 0
      && (totals.skipped ?? 0) === 0 && (totals.blocked ?? 0) === 0
    return { present, completed, current, passed, counts: totals }
  }
  catch {
    return { present, completed: false, current: false, passed: false, counts: {} }
  }
}

/** Invalidate old success before even client/backend preflight can fail. */
export function beginIntegrationEvidence(runId: string, repository = root): void {
  writeJson(resolve(repository, '.ci-evidence/results.json'), {
    schemaVersion: 1,
    role: 'web',
    runId,
    passed: false,
    suites: Object.fromEntries(Object.keys(BROWSER_SUITE_DIRECTORIES).map(name =>
      [name, { present: false, completed: false, current: false, passed: false, counts: {} }])),
  })
}

export async function integrationEvidence(runId: string, processPassed: boolean): Promise<boolean> {
  collectReports()
  const fingerprint = sourceFingerprint()
  const suites = Object.fromEntries(Object.entries(BROWSER_SUITE_DIRECTORIES).map(([name, directory]) =>
    [name, readSuiteEvidence(resolve(root, 'apps/webapp', directory), name, fingerprint, runId)]))
  const passed = processPassed && Object.values(suites).every(suite => suite.passed)
  writeJson(resolve(root, '.ci-evidence/results.json'), { schemaVersion: 1, role: 'web', runId, passed, githubRunId: process.env.GITHUB_RUN_ID ?? 'local', attempt: process.env.GITHUB_RUN_ATTEMPT ?? process.env.EDAYA_QUALIFICATION_ATTEMPT ?? 'local', environment: process.env.CI_TARGET ?? 'staging', commit: await run(['git', 'rev-parse', 'HEAD'], { quiet: true }), backendCommit: checkClient().backendCommit, clientChecksum: digest(readFileSync(resolve(root, '.generated/client.json'))), lockSha256: digest(readFileSync(resolve(root, 'bun.lock'))), suites })
  return passed
}

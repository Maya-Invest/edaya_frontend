import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkClient } from './client'
import { collectReports } from './reports'
import { digest, root, run, writeJson } from './runtime'

interface Summary {
  ok?: boolean
  passed?: number
  failed?: number
  total?: number
  matrix?: Summary
  results?: unknown[]
  scenes?: {
    status: string
  }[]
  outcomes?: {
    status: string
  }[]
}
export function counts(summary: Summary, name: string): Record<string, number> {
  if (name === 'provisioned')
    return counts(summary.matrix ?? {}, '')
  const rows = summary.scenes ?? summary.outcomes
  if (rows?.length)
    return { total: rows.length, passed: rows.filter(row => row.status === 'passed').length, failed: rows.filter(row => row.status !== 'passed').length }
  const result: Record<string, number> = {}
  for (const key of ['passed', 'failed', 'total'] as const) {
    if (Number.isInteger(summary[key]) && summary[key]! >= 0)
      result[key] = summary[key]!
  }
  if (name === 'demo')
    result.total = summary.results?.length ?? 0
  return result
}
export async function integrationEvidence(): Promise<void> {
  collectReports()
  const suites: Record<string, unknown> = {}
  for (const [name, directory] of Object.entries({ availability: '.availability-run', onboarding: '.onboarding-run', provisioned: '.integration-run', webadmin: '.webadmin-run', demo: '.demo-dry-run' })) {
    const path = resolve(root, 'apps/webapp', directory, name === 'demo' ? 'results.json' : 'summary.json')
    const metadata = resolve(root, 'apps/webapp', directory, 'execution.json')
    const summary = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as Summary : {}
    const completed = existsSync(metadata) && JSON.parse(readFileSync(metadata, 'utf8')).completed === true
    const totals = counts(summary, name)
    suites[name] = { present: existsSync(path), completed, passed: summary.ok ?? (completed && (totals.total ?? 0) > 0 && totals.failed === 0), counts: totals }
  }
  writeJson(resolve(root, '.ci-evidence/results.json'), { schemaVersion: 1, role: 'web', commit: await run(['git', 'rev-parse', 'HEAD'], { quiet: true }), backendCommit: checkClient().backendCommit, clientChecksum: digest(readFileSync(resolve(root, '.generated/client.json'))), lockSha256: digest(readFileSync(resolve(root, 'bun.lock'))), suites })
}

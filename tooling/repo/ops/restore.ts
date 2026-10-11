import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { gitEnvironment, root, run, sha } from './runtime'

export async function restore(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY
  const runId = process.env.GITHUB_RUN_ID
  const attempt = process.env.GITHUB_RUN_ATTEMPT
  if (!repository || !runId || !attempt || !process.env.GITHUB_TOKEN)
    throw new Error('Artifact restoration requires GitHub Actions run identity')
  const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`, { headers, signal: AbortSignal.timeout(120000) })
  if (!response.ok)
    throw new Error('Cannot list candidate artifacts')
  const data = await response.json() as {
    artifacts: {
      name: string
      expired: boolean
      archive_download_url: string
    }[]
  }
  const matches = data.artifacts.filter(artifact => artifact.name === `qualified-${runId}-${attempt}` && !artifact.expired)
  if (matches.length !== 1)
    throw new Error('Expected exactly one qualified artifact for this run attempt')
  const archive = await fetch(matches[0]!.archive_download_url, { headers, signal: AbortSignal.timeout(120000) })
  if (!archive.ok)
    throw new Error('Cannot download candidate artifacts')
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-candidate-'))
  try {
    const zip = resolve(directory, 'candidate.zip')
    await Bun.write(zip, await archive.arrayBuffer())
    const paths = (await run(['unzip', '-Z1', zip], { quiet: true })).split('\n')
    const allowed = ['.release/', '.generated/', '.ci-evidence/', 'apps/webapp/build/', 'apps/webadmin/build/', 'packages/edaya_api_client/lib/src/generated/']
    if (paths.some(path => path.startsWith('/') || path.includes('\\') || path.split('/').includes('..') || !allowed.some(prefix => path.startsWith(prefix) || (path.endsWith('/') && prefix.startsWith(path)))))
      throw new Error('Unexpected candidate artifact path')
    await run(['unzip', '-q', zip, '-d', directory], { quiet: true })
    const evidence = JSON.parse(readFileSync(resolve(directory, '.ci-evidence/qualification.json'), 'utf8')) as {
      sourceCommit: string
      checks: Record<string, boolean>
    }
    sha(evidence.sourceCommit)
    if (evidence.checks.verification !== true || evidence.checks.integration !== true)
      throw new Error('Candidate did not pass full validation')
    await run(['git', 'fetch', 'origin', evidence.sourceCommit], { quiet: true, env: gitEnvironment() })
    await run(['git', 'checkout', '--detach', evidence.sourceCommit], { quiet: true })
    for (const path of allowed) {
      if (existsSync(resolve(directory, path)))
        cpSync(resolve(directory, path), resolve(root, path), { recursive: true })
    }
    if (existsSync(resolve(directory, '.release/bun.lock')))
      cpSync(resolve(directory, '.release/bun.lock'), resolve(root, 'bun.lock'))
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
if (import.meta.main)
  await restore()

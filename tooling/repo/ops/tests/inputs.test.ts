import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { BROWSER_SUITE_DIRECTORIES } from '../browser-suites'
import { requiredStages } from '../qualification'
import { digest, hashes, root, run, writeJson } from '../runtime'

test('prepared input handoff restores the resolved lock and rejects another attempt or altered client', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'web-prepared-'))
  const execute = (args: string[], env = {}) => run(args, { cwd: directory, quiet: true, env: { ...process.env, GITHUB_RUN_ID: '77', GITHUB_RUN_ATTEMPT: '1', CI_SOURCE_SHA: '', CI_BACKEND_SHA: '', ...env } })
  const command = (name: string, env = {}) => execute([process.execPath, '--no-env-file', 'tooling/repo/ops/main.ts', 'ci', name, 'staging'], env)
  try {
    cpSync(resolve(root, 'tooling/repo/ops'), resolve(directory, 'tooling/repo/ops'), { recursive: true })
    writeJson(resolve(directory, '.generated/api-client/package.json'), { name: 'fixture-client', version: '1.0.0' })
    const client = {
      formatVersion: 1,
      backendCommit: 'b'.repeat(40),
      generator: digest(readFileSync(resolve(directory, 'tooling/repo/ops/client.ts'))),
      artifacts: hashes(resolve(directory, '.generated/api-client')),
    }
    writeJson(resolve(directory, '.generated/client.json'), client)
    writeFileSync(resolve(directory, 'bun.lock'), 'resolved-lock')
    writeJson(resolve(directory, '.generated/dependencies.json'), { lockSha256: digest('resolved-lock'), clientChecksum: digest(readFileSync(resolve(directory, '.generated/client.json'))) })
    await execute(['git', 'init'])
    await execute(['git', 'add', 'bun.lock'])
    await execute(['git', '-c', 'user.name=CI Test', '-c', 'user.email=ci@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture'])
    await command('prepare-inputs')
    const snapshot = readFileSync(resolve(directory, '.generated/ci-inputs.json'), 'utf8')
    expect(JSON.parse(snapshot).backendCommit).toBe(client.backendCommit)
    writeFileSync(resolve(directory, 'bun.lock'), 'source-lock')
    await command('restore-inputs')
    expect(readFileSync(resolve(directory, 'bun.lock'), 'utf8')).toBe('resolved-lock')
    for (const env of [{ GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_RUN_ID: '78' }, { CI_SOURCE_SHA: 'c'.repeat(40) }, { CI_BACKEND_SHA: 'c'.repeat(40) }])
      await expect(command('restore-inputs', env)).rejects.toThrow()
    writeJson(resolve(directory, '.generated/ci-inputs.json'), { ...JSON.parse(snapshot), environment: 'production' })
    await expect(command('restore-inputs')).rejects.toThrow()
    writeFileSync(resolve(directory, '.generated/ci-inputs.json'), snapshot)
    // Simulate independently downloaded build/stage artifacts in an isolated fixture.
    const context = JSON.parse(snapshot)
    for (const app of ['webapp', 'webadmin'])
      writeJson(resolve(directory, `apps/${app}/build/index.html`), app)
    const artifacts = Object.fromEntries(['bun.lock', 'apps/webapp/build/index.html', 'apps/webadmin/build/index.html'].map(path => [path, digest(readFileSync(resolve(directory, path)))]))
    writeJson(resolve(directory, '.release/manifest.json'), { formatVersion: 1, sourceCommit: context.sourceCommit, environment: 'staging', status: 'built', client, artifacts, tests: [] })
    for (const stage of requiredStages)
      writeJson(resolve(directory, `.ci-evidence/stages/stage-${stage}-77-1/${stage}.json`), { ...context, stage, status: 'passed', durationMs: 1 })
    writeJson(resolve(directory, '.ci-evidence/results.json'), {
      ...context,
      commit: context.sourceCommit,
      githubRunId: context.runId,
      runId: 'fixture',
      passed: true,
      suites: Object.fromEntries(Object.keys(BROWSER_SUITE_DIRECTORIES).map(name => [name, { present: true, completed: true, current: true, passed: true, counts: { passed: 1, total: 1, failed: 0 } }])),
    })
    await command('finalize')
    expect(JSON.parse(readFileSync(resolve(directory, '.release/manifest.json'), 'utf8')).status).toBe('qualified')
    // A failed second finalization cannot leave the earlier success deployable.
    writeFileSync(resolve(directory, 'apps/webapp/build/index.html'), 'changed')
    await expect(command('finalize')).rejects.toThrow()
    expect(JSON.parse(readFileSync(resolve(directory, '.release/manifest.json'), 'utf8')).status).toBe('built')
    expect(() => readFileSync(resolve(directory, '.ci-evidence/qualification.json'))).toThrow()
    writeFileSync(resolve(directory, '.release/bun.lock'), 'tampered-lock')
    await expect(command('restore-inputs')).rejects.toThrow()
    writeFileSync(resolve(directory, '.release/bun.lock'), 'resolved-lock')
    writeFileSync(resolve(directory, '.generated/api-client/package.json'), 'tampered-client')
    await expect(command('restore-inputs')).rejects.toThrow()
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
}, 30000)

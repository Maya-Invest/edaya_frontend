import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { requireIntegrationDiskSpace } from '../disk'
import { root } from '../runtime'

test('capacity checks reject exhausted and invalid space before running a browser suite', () => {
  for (const bytes of [0, 4 * 1024 ** 2, 2 * 1024 ** 3 - 1, Number.NaN])
    expect(() => requireIntegrationDiskSpace(bytes, '/fixture')).toThrow('Insufficient integration disk space')
  expect(() => requireIntegrationDiskSpace(2 * 1024 ** 3, '/fixture')).not.toThrow()
})

test('hosted runner preparation is bounded, requires capacity, and refuses local cleanup', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-disk-test-'))
  const calls = resolve(directory, 'calls')
  try {
    writeFileSync(resolve(directory, 'sudo'), '#!/bin/bash\nprintf "%s\\n" "$*" >> "$CALLS"\n', { mode: 0o755 })
    writeFileSync(resolve(directory, 'df'), '#!/bin/bash\nif [[ $1 == -Pk ]]; then printf "Filesystem 1024-blocks Used Available Capacity Mounted\\nfixture 99999999 1 %s 1%% /\\n" "$TEST_DISK_KB"; else echo capacity; fi\n', { mode: 0o755 })
    writeFileSync(resolve(directory, 'du'), '#!/bin/bash\necho "fixture directory totals"\n', { mode: 0o755 })
    const env = { ...process.env, PATH: `${directory}:/usr/bin:/bin`, CALLS: calls, GITHUB_ACTIONS: 'true', RUNNER_OS: 'Linux', RUNNER_KIND: 'github-hosted', GITHUB_WORKSPACE: directory, RUNNER_TEMP: directory, TEST_DISK_KB: String(12 * 1024 * 1024) }
    const run = (mode: string, overrides = {}) => Bun.spawnSync(['/bin/bash', resolve(root, 'tooling/repo/ci/integration-disk.sh'), mode], { env: { ...env, ...overrides } })
    for (const overrides of [{ GITHUB_ACTIONS: 'false' }, { RUNNER_KIND: 'self-hosted' }, { RUNNER_OS: 'macOS' }]) {
      expect(run('prepare', overrides).exitCode).toBe(1)
      expect(existsSync(calls)).toBe(false)
    }
    expect(run('prepare').exitCode).toBe(0)
    expect(readFileSync(calls, 'utf8')).toBe('rm -rf -- /usr/local/lib/android /usr/share/dotnet\n')
    const low = run('prepare', { TEST_DISK_KB: '4096' })
    expect(low.exitCode).toBe(1)
    expect(low.stderr.toString()).toContain('at least 12 GiB')
    const before = readFileSync(calls, 'utf8')
    expect(run('report').exitCode).toBe(0)
    expect(readFileSync(calls, 'utf8')).toBe(before)
    expect(readFileSync(resolve(directory, '.ci-evidence/disk-usage.txt'), 'utf8')).toContain('fixture directory totals')
  }
  finally { rmSync(directory, { recursive: true, force: true }) }
})

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { backendBranch, environment, hashes, redact, run, sha, verifyBackend } from '../runtime'

describe('operational boundaries', () => {
  test('backend selection uses the destination, never feature branch guessing', () => {
    expect(backendBranch('main')).toBe('main')
    expect(backendBranch('production')).toBe('main')
    expect(backendBranch('staging')).toBe('staging')
    expect(() => backendBranch('feature/test')).toThrow()
    expect(() => environment('prod')).toThrow()
    expect(() => sha('main')).toThrow()
  })
  test('process failures and timeouts fail closed', async () => {
    await expect(run(['bun', '-e', 'process.exit(7)'], { quiet: true })).rejects.toThrow('exited 7')
    await expect(run(['bun', '-e', 'setInterval(() => {}, 1000)'], { quiet: true, timeout: 50 })).rejects.toThrow('timed out')
  })
  test('credentials do not enter diagnostics', () => {
    const result = redact('Bearer abc password=hello https://person:pass@example.com OTP=123456 /invite/secret-link injected-private-value', { SERVICE_TOKEN: 'injected-private-value' })
    for (const secret of ['abc', 'hello', 'person:pass', '123456', 'secret-link', 'injected-private-value'])
      expect(result).not.toContain(secret)
  })
  test('artifact evidence detects changed and added files', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'edaya-hashes-'))
    try {
      writeFileSync(resolve(directory, 'client.ts'), 'export const version = 1')
      const original = hashes(directory)
      writeFileSync(resolve(directory, 'client.ts'), 'export const version = 2')
      expect(hashes(directory)).not.toEqual(original)
      writeFileSync(resolve(directory, 'extra.ts'), 'unexpected')
      expect(Object.keys(hashes(directory))).toHaveLength(2)
    }
    finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
test('timeout cleans descendant processes', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-timeout-'))
  try {
    const marker = resolve(directory, 'leaked')
    const payload = `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'leaked'), 500)`
    await expect(run(['bun', '-e', `require('child_process').spawn('bun', ['-e', ${JSON.stringify(payload)}], {stdio:'inherit'}); setInterval(() => {}, 1000)`], { quiet: true, timeout: 150 })).rejects.toThrow('timed out')
    await Bun.sleep(600)
    expect(existsSync(marker)).toBe(false)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
test('missing commands fail without exposing command arguments', async () => {
  await expect(run(['edaya-no-such-binary', 'private-credential'], { quiet: true })).rejects.toThrow('Could not start edaya-no-such-binary')
})
test('moving the source branch cannot change a detached backend input', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-frozen-backend-'))
  const git = (...args: string[]) => run(['git', ...args], { cwd: directory, quiet: true })
  try {
    await git('init', '-b', 'staging')
    await git('config', 'user.email', 'test@example.test')
    await git('config', 'user.name', 'Test')
    writeFileSync(resolve(directory, 'contract.json'), '{}')
    await git('add', '.')
    await git('commit', '-m', 'baseline')
    const pinned = await git('rev-parse', 'HEAD')
    await git('commit', '--allow-empty', '-m', 'branch advanced')
    const advanced = await git('rev-parse', 'HEAD')
    await git('checkout', '--detach', pinned)
    await verifyBackend(directory, pinned)
    expect(await git('rev-parse', 'staging')).toBe(advanced)
    await expect(verifyBackend(directory, advanced)).rejects.toThrow('differs')
    writeFileSync(resolve(directory, 'contract.json'), '{"changed":true}')
    await expect(verifyBackend(directory, pinned)).rejects.toThrow()
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
test('cancellation terminates an owned child and fails the supervisor', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-cancellation-'))
  try {
    const marker = resolve(directory, 'leaked')
    const script = resolve(directory, 'supervisor.ts')
    writeFileSync(script, `import {run} from ${JSON.stringify(resolve(import.meta.dirname, '../runtime.ts'))}; await run(['bun','-e', ${JSON.stringify(`require('fs').writeFileSync(${JSON.stringify(resolve(directory, 'ready'))}, 'ready'); setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'leaked'), 1200)`)}], {quiet:true});`)
    const supervisor = Bun.spawn(['bun', script], { stdout: 'ignore', stderr: 'ignore' })
    for (let attempt = 0; attempt < 100 && !existsSync(resolve(directory, 'ready')); attempt++)
      await Bun.sleep(20)
    expect(existsSync(resolve(directory, 'ready'))).toBe(true)
    supervisor.kill('SIGTERM')
    expect(await supervisor.exited).not.toBe(0)
    await Bun.sleep(1300)
    expect(existsSync(marker)).toBe(false)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('private input uses stdin and isolated environments do not inherit credentials', async () => {
  const output = await run(['bun', '-e', 'const input = await Bun.stdin.text(); console.log(input.length); console.log(process.env.EDAYA_PROCESS_TEST_TOKEN ?? "absent")'], { input: 'private-value', quiet: true, inheritEnv: false, env: { PATH: process.env.PATH } })
  expect(output).toBe('13\nabsent')
})

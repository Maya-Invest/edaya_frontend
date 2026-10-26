import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { clientOptions, prepareIdentityClient } from '../client'
import { root, run } from '../runtime'

test('explicit client acquisition options reject ambiguous inputs', () => {
  expect(clientOptions([])).toEqual({ target: 'staging' })
  expect(clientOptions(['production', '--backend-root', '/tmp/backend'])).toEqual({ target: 'production', backendRoot: '/tmp/backend' })
  for (const args of [['feature'], ['staging', '--ref'], ['staging', '--ref', 'main', '--backend-root', '/tmp/backend'], ['staging', '--unknown', 'main']])
    expect(() => clientOptions(args)).toThrow()
})

test('identity checkout is conditional, immutable, and preserves local source', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-client-dependency-'))
  const backend = resolve(directory, 'edaya_backend')
  const identity = resolve(directory, 'edaya_identity')
  const origin = resolve(directory, 'origin')
  const git = (cwd: string, ...args: string[]) => run(['git', ...args], { cwd, quiet: true })
  const fetches: string[] = []
  const execute: typeof run = (command, options) => {
    if (command[1] === 'clone')
      return run(['git', 'clone', '--no-checkout', origin, identity], options)
    if (command[1] === 'fetch')
      fetches.push(command.at(-1)!)
    return run(command, options)
  }
  try {
    mkdirSync(backend)
    writeFileSync(resolve(backend, 'package.json'), '{}')
    expect(await prepareIdentityClient(backend, 'staging', true, execute)).toBeUndefined()
    expect(fetches).toEqual([])
    writeFileSync(resolve(backend, 'package.json'), JSON.stringify({ overrides: { '@maya-invest/edaya-identity-client': 'file:../edaya_identity/package/identity-client' } }))
    await expect(prepareIdentityClient(backend, 'staging', false, execute)).rejects.toThrow('requires a clean sibling')
    mkdirSync(resolve(origin, 'package/identity-client'), { recursive: true })
    writeFileSync(resolve(origin, 'package/identity-client/package.json'), '{}')
    await git(origin, 'init', '-b', 'staging')
    await git(origin, 'config', 'user.email', 'test@example.test')
    await git(origin, 'config', 'user.name', 'Test')
    await git(origin, 'add', '.')
    await git(origin, 'commit', '-m', 'identity baseline')
    await git(origin, 'branch', 'main')
    const baseline = await git(origin, 'rev-parse', 'HEAD')
    expect(await prepareIdentityClient(backend, 'staging', true, execute)).toBe(baseline)
    expect(await git(identity, 'branch', '--show-current')).toBe('')
    await git(origin, 'commit', '--allow-empty', '-m', 'staging advanced')
    const advanced = await git(origin, 'rev-parse', 'HEAD')
    // A resolved local checkout stays pinned; managed preparation resolves afresh.
    expect(await prepareIdentityClient(backend, 'staging', false, execute)).toBe(baseline)
    expect(await prepareIdentityClient(backend, 'staging', true, execute)).toBe(advanced)
    expect(await prepareIdentityClient(backend, 'production', true, execute)).toBe(baseline)
    expect(fetches).toEqual(['staging', 'staging', 'main'])
    writeFileSync(resolve(identity, 'package/identity-client/package.json'), '{"local":true}')
    await expect(prepareIdentityClient(backend, 'staging', true, execute)).rejects.toThrow('modified source')
    await expect(prepareIdentityClient(backend, 'staging', false, execute)).rejects.toThrow('modified source')
    expect(await git(identity, 'rev-parse', 'HEAD')).toBe(baseline)
    expect(fetches).toHaveLength(3)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('a regenerated ignored client invalidates frontend verification and build caches', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'edaya-client-task-cache-'))
  try {
    mkdirSync(resolve(directory, '.generated'))
    mkdirSync(resolve(directory, 'apps/consumer'), { recursive: true })
    writeFileSync(resolve(directory, '.gitignore'), '.generated/\n')
    writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ name: 'test-root', packageManager: `bun@${Bun.version}`, workspaces: ['apps/*'] }))
    writeFileSync(resolve(directory, 'apps/consumer/package.json'), JSON.stringify({ name: 'consumer', scripts: { quality: 'true', build: 'true', test: 'true' } }))
    writeFileSync(resolve(directory, 'turbo.json'), readFileSync(resolve(root, 'turbo.json')))
    writeFileSync(resolve(directory, 'bun.lock'), JSON.stringify({ lockfileVersion: 1, configVersion: 1, workspaces: { '': { name: 'test-root' }, 'apps/consumer': { name: 'consumer' } }, packages: { consumer: ['consumer@workspace:apps/consumer'] } }))
    const client = resolve(directory, '.generated/client.json')
    const taskHashes = async () => {
      const result = JSON.parse(await run([resolve(root, 'node_modules/.bin/turbo'), 'run', 'quality', 'build', 'test', '--dry=json'], { cwd: directory, quiet: true })) as { tasks: { taskId: string, hash: string }[] }
      return Object.fromEntries(result.tasks.filter(task => task.taskId.startsWith('consumer#')).map(task => [task.taskId, task.hash]))
    }
    writeFileSync(client, JSON.stringify({ backendCommit: 'a'.repeat(40) }))
    const before = await taskHashes()
    expect(Object.keys(before).sort()).toEqual(['consumer#build', 'consumer#quality', 'consumer#test'])
    expect(await taskHashes()).toEqual(before)
    writeFileSync(client, JSON.stringify({ backendCommit: 'b'.repeat(40) }))
    const after = await taskHashes()
    for (const task of Object.keys(before))
      expect(after[task]).not.toBe(before[task])
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { clientOptions } from '../client'
import { root, run } from '../runtime'

test('explicit client acquisition options reject ambiguous inputs', () => {
  expect(clientOptions([])).toEqual({ target: 'staging' })
  expect(clientOptions(['production', '--backend-root', '/tmp/backend'])).toEqual({ target: 'production', backendRoot: '/tmp/backend' })
  for (const args of [['feature'], ['staging', '--ref'], ['staging', '--ref', 'main', '--backend-root', '/tmp/backend'], ['staging', '--unknown', 'main']])
    expect(() => clientOptions(args)).toThrow()
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

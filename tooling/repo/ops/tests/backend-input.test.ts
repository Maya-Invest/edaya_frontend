import type { run } from '../runtime'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { assertBackendCompatible, resolveBackend } from '../backend-input'

const hash = 'a'.repeat(40)
const other = 'b'.repeat(40)
test('matching branches are exact, including slashes; absent matches use dev', async () => {
  const execute: typeof run = async command => command[1] === 'ls-remote' ? `${hash}\trefs/heads/feature/demo\n${other}\trefs/heads/dev` : ''
  expect(await resolveBackend('feature/demo', true, execute)).toEqual({ requested: 'feature/demo', selected: 'feature/demo', commit: hash, fallback: false })
  expect(await resolveBackend('missing', true, execute)).toEqual({ requested: 'missing', selected: 'dev', commit: other, fallback: true })
  await expect(resolveBackend('missing', true, async () => '')).rejects.toThrow('fallback dev is absent')
})
test('authentication and transport failures propagate without retrying dev', async () => {
  for (const message of ['authentication failed', 'network failed']) {
    let lookups = 0
    const execute: typeof run = async (command) => {
      if (command[1] === 'ls-remote') {
        lookups++
        throw new Error(message)
      }
      return ''
    }
    await expect(resolveBackend('feature/demo', true, execute)).rejects.toThrow(message)
    expect(lookups).toBe(1)
  }
})
test('fixed refs resolve once and never use branch fallback', async () => {
  const calls: readonly string[][] = []
  const execute: typeof run = async (command) => {
    (calls as string[][]).push([...command])
    return command[1] === 'rev-parse' ? hash : ''
  }
  expect((await resolveBackend('staging', false, execute)).commit).toBe(hash)
  expect(calls.some(command => command[1] === 'ls-remote')).toBe(false)
  const fail: typeof run = async (command) => {
    if (command[1] === 'fetch')
      throw new Error('missing explicit ref')
    return ''
  }
  await expect(resolveBackend('missing', false, fail)).rejects.toThrow('missing explicit ref')
})
test('retired identity dependencies are rejected regardless of cached artifacts', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'backend-compat-'))
  try {
    writeFileSync(resolve(directory, 'package.json'), '{}')
    mkdirSync(resolve(directory, '.cache/clients'), { recursive: true })
    expect(() => assertBackendCompatible(directory)).not.toThrow()
    writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ overrides: { '@maya-invest/edaya-identity-client': 'file:../edaya_identity/package/identity-client' } }))
    expect(() => assertBackendCompatible(directory)).toThrow('in-repository identity migration')
    writeFileSync(resolve(directory, 'package.json'), '{}')
    mkdirSync(resolve(directory, 'apps/api'), { recursive: true })
    writeFileSync(resolve(directory, 'apps/api/package.json'), JSON.stringify({ dependencies: { '@maya-invest/edaya-identity-client': '*' } }))
    expect(() => assertBackendCompatible(directory)).toThrow('apps/api/package.json')
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

import { cpSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stageContext } from './qualification'
import { root, writeJson } from './runtime'

/** Preparation alone resolves dependencies; downstream jobs restore this frozen snapshot. */
export async function prepareInputs(target: string): Promise<void> {
  const context = await stageContext(target)
  writeJson(resolve(root, '.generated/ci-inputs.json'), context)
  mkdirSync(resolve(root, '.release'), { recursive: true })
  cpSync(resolve(root, 'bun.lock'), resolve(root, '.release/bun.lock'))
}

export async function restoreInputs(target: string): Promise<void> {
  cpSync(resolve(root, '.release/bun.lock'), resolve(root, 'bun.lock'))
  const expected = await stageContext(target)
  const actual = JSON.parse(readFileSync(resolve(root, '.generated/ci-inputs.json'), 'utf8'))
  if (Object.entries(expected).some(([key, value]) => actual[key] !== value))
    throw new Error('Prepared inputs do not match this checkout, backend, target or run attempt')
}

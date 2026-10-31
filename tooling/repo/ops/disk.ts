import { appendFileSync, mkdirSync, statfsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { root } from './runtime'

export function requireIntegrationDiskSpace(availableBytes: number, location: string): void {
  if (!Number.isFinite(availableBytes) || availableBytes < 2 * 1024 ** 3)
    throw new Error(`Insufficient integration disk space at ${location}: need at least 2 GiB; see disk-usage.txt and runner capacity logs`)
}

/** Check while the owned database and browser profiles still exist. */
export function checkIntegrationDiskSpace(stage: string): void {
  if (process.env.GITHUB_ACTIONS !== 'true')
    return
  mkdirSync(resolve(root, '.ci-evidence'), { recursive: true })
  for (const location of new Set([root, tmpdir()])) {
    const stats = statfsSync(location)
    const available = stats.bavail * stats.bsize
    const message = `Integration disk (${stage}): ${Math.floor(available / 1024 ** 2)} MiB available at ${location}`
    console.log(message)
    appendFileSync(resolve(root, '.ci-evidence/disk-usage.txt'), `${message}\n`)
    requireIntegrationDiskSpace(available, location)
  }
}

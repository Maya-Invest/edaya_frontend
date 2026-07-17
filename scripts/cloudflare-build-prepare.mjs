#!/usr/bin/env node
/**
 * Prepare edaya_web for Cloudflare Workers Builds.
 *
 * 1. Point @maya-invest/edaya-api-client at GitHub Packages (staging / production).
 * 2. Verify GitHub Packages auth is configured for bun install.
 *
 * Run before `bun install` when SKIP_DEPENDENCY_INSTALL=true on Cloudflare.
 * See docs/reference/ci-setup.md#cloudflare-workers-builds.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function resolveChannel() {
  if (process.env.API_CLIENT_CHANNEL === 'staging' || process.env.API_CLIENT_CHANNEL === 'production') {
    return process.env.API_CLIENT_CHANNEL
  }
  const branch = process.env.WORKERS_CI_BRANCH ?? process.env.CF_PAGES_BRANCH ?? ''
  return branch === 'main' ? 'production' : 'staging'
}

function fail(message) {
  console.error(`cloudflare-build-prepare: ${message}`)
  process.exit(1)
}

const channel = resolveChannel()
const usePublished = spawnSync(
  'node',
  ['.github/scripts/ci-use-published-api-client.mjs', channel],
  { cwd: root, stdio: 'inherit' },
)
if (usePublished.status !== 0) {
  fail('failed to switch api-client dependency to GitHub Packages')
}

const onCloudflare = process.env.WORKERS_CI === '1' || process.env.CI === 'true'
const hasToken = Boolean(process.env.GITHUB_PACKAGES_TOKEN?.trim())
const hasNpmrcOverride = Boolean(process.env.NPM_CONFIG_USERCONFIG?.trim())

if (onCloudflare && !hasToken) {
  fail(
    'GITHUB_PACKAGES_TOKEN is required on Cloudflare Builds. '
    + 'Add it under Settings → Build → Variables and secrets.',
  )
}

if (onCloudflare && !hasNpmrcOverride) {
  console.warn(
    'cloudflare-build-prepare: set NPM_CONFIG_USERCONFIG=/opt/buildhome/repo/.npmrc.cloudflare '
    + 'as a build variable so bun can read GitHub Packages auth.',
  )
}

console.log(`cloudflare-build-prepare: ready for bun install (@maya-invest/edaya-api-client@${channel})`)

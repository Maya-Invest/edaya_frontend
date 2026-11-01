#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'
import { checkFrontendImports, checkWorkspaceReferences } from '../lib/frontend-architecture'

const root = path.resolve(import.meta.dirname, '../../..')
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { workspaces: string[] }
const workspaceNames = new Set<string>()
let failures = 0
for (const workspace of manifest.workspaces) {
  const files = [...new Glob(`${workspace}/package.json`).scanSync({ cwd: root })]
  if (!files.length) {
    console.error(`Workspace pattern matches no packages: ${workspace}`)
    failures++
  }
  for (const file of files) workspaceNames.add(JSON.parse(readFileSync(path.join(root, file), 'utf8')).name)
}
for (const file of new Glob('**/*.{ts,tsx,js,mjs,cjs,svelte,json,yml,yaml}').scanSync({ cwd: root, dot: true })) {
  if (/(?:^|\/)(?:node_modules|vendor|\.git|\.svelte-kit|\.wrangler|\.cache|\.turbo|build|coverage|\.integration|\.demo-dry-run|\.onboarding)(?:\/|$)/.test(file))
    continue
  if (!/^(?:apps\/[^/]+\/(?:src|tests|scripts)\/|tooling\/|scripts\/|\.github\/)/.test(file) && file !== 'package.json')
    continue
  const source = readFileSync(path.join(root, file), 'utf8')
  const imports = /\.(?:[cm]?[jt]sx?|svelte)$/.test(file) ? checkFrontendImports(file, source) : []
  const issues = [...imports, ...(file === 'package.json' || /^\.github\/.*\.ya?ml$/.test(file) ? checkWorkspaceReferences(file, source, workspaceNames) : [])]
  for (const issue of issues) console.error(`${issue.file}: ${issue.message}`)
  failures += issues.length
}
if (failures)
  process.exitCode = 1
else console.log('Frontend imports and workspace references passed.')

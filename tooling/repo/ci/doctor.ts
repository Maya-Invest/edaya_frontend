#!/usr/bin/env bun
import { copyFileSync, existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import process from 'node:process'
import { $ } from 'bun'

const repoRoot = resolve(import.meta.dirname, '../../..')
const expectedEnvExamples = [
  'apps/webapp/.env.example',
  'apps/webadmin/.env.example',
]

function materializeEnvFromExample(examplePath: string): void {
  const envPath = examplePath.replace(/\.example$/, '')
  if (!existsSync(resolve(repoRoot, envPath)) && existsSync(resolve(repoRoot, examplePath))) {
    copyFileSync(resolve(repoRoot, examplePath), resolve(repoRoot, envPath))
    console.log(`Created ${envPath} from ${examplePath}`)
  }
}

const trackedEnvOutput = await $`git -C ${repoRoot} ls-files -- ${'*.env*'}`.text()
const trackedEnvFiles = trackedEnvOutput
  .split('\n')
  .filter(path => path && existsSync(resolve(repoRoot, path)))
const unexpectedTrackedEnvFiles = trackedEnvFiles.filter((path) => {
  const name = basename(path)
  return name !== '.env.example' && !/^\.env\..+\.example$/.test(name)
})
const missingEnvExamples = expectedEnvExamples.filter(path => !existsSync(resolve(repoRoot, path)))

if (unexpectedTrackedEnvFiles.length > 0 || missingEnvExamples.length > 0) {
  if (unexpectedTrackedEnvFiles.length > 0) {
    console.error('Tracked runtime environment files:')
    unexpectedTrackedEnvFiles.forEach(path => console.error(`  - ${path}`))
  }
  if (missingEnvExamples.length > 0) {
    console.error('Missing environment examples:')
    missingEnvExamples.forEach(path => console.error(`  - ${path}`))
  }
  process.exitCode = 1
}
else {
  console.log('Repository environment file checks passed.')
  const { CI } = process.env
  if (!CI)
    expectedEnvExamples.forEach(materializeEnvFromExample)
}

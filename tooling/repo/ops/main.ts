#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { brandCheck, brandGallery, brandTokens } from './brand'
import { acquireClient, checkClient, clientOptions, installPreparedDependencies } from './client'
import { commandDocs } from './command-docs'
import { buildRelease, deployRelease, qualifyRelease } from './release'
import { assertCommittedSource, digest, environment, githubOutput, hashes, redact, root, run, sha, writeJson } from './runtime'
import { tool } from './tools'

const commands = {
  check: 'Repository hygiene and prepared client/brand integrity.',
  test: 'unit | integration | tooling',
  build: 'staging | production (no deployment)',
  generate: 'client [staging|production] [--ref REF | --backend-root PATH] | dependencies | setup | brand | gallery | commands | reviewed-brand-baseline',
  dev: 'Start webapp and webadmin.',
  maintenance: 'emergency-deploy <staging|production> [--yes] [--dry-run]',
  ci: 'verify | qualify <staging|production> | browser-suites | workflows | deploy <environment>',
}
const verificationEnv = {
  PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? 'http://localhost:9999',
  PUBLIC_APP_ENV: process.env.PUBLIC_APP_ENV ?? 'staging',
  PUBLIC_TEST_OTP_ACCESS: 'false',
  PUBLIC_ALLOW_SCHOOL_REGISTRATION: 'true',
}
export function help(): string {
  return `Usage: bun run repo <command>\n\n${Object.entries(commands).map(([name, description]) => `${name.padEnd(14)}${description}`).join('\n')}\n`
}
export async function main(args: string[]): Promise<void> {
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log(help())
    return
  }
  const [group, name, ...rest] = args
  if (group === 'ci') {
    if (['verify', 'workflows', 'setup', 'resolve', 'archive-inputs', 'maintenance', 'browser-suites'].includes(name ?? '') && rest.length)
      throw new Error('Unexpected CI arguments')
    if (['qualify', 'migrate'].includes(name ?? '') && rest.length !== 1)
      throw new Error('Expected exactly one environment')
    if (name === 'deploy' && (rest.length < 1 || rest.length > 2 || (rest.length === 2 && rest[1] !== '--dry-run')))
      throw new Error('Expected deploy environment [--dry-run]')
  }
  if (group === 'generate') {
    if (name === 'dependencies' && !rest.length) {
      await installPreparedDependencies()
      return
    }
    if (name === 'setup' && !rest.length) {
      for (const app of ['webapp', 'webadmin'])
        await run(['bun', 'x', '--bun', 'svelte-kit', 'sync'], { cwd: resolve(root, 'apps', app), env: verificationEnv })
      return
    }
    if (name === 'client') {
      const options = clientOptions(rest)
      await acquireClient(options.target, options.backendRoot, options.ref)
      return
    }
    if (name === 'reviewed-brand-baseline' && !rest.length) {
      brandCheck(true)
      return
    }
    if (name === 'brand' && !rest.length) {
      brandTokens()
      return
    }
    if (name === 'gallery' && !rest.length) {
      await brandGallery()
      return
    }
    if (name === 'commands' && !rest.length) {
      writeFileSync(resolve(root, 'tooling/repo/ops/commands.txt'), help())
      commandDocs(help(), true)
      return
    }
  }
  if (group === 'check' && !name) {
    commandDocs(help())
    checkClient()
    brandCheck()
    for (const script of ['ci/doctor.ts', 'ci/frontend-architecture.ts'])
      await run(['bun', `tooling/repo/${script}`])
    return
  }
  if (group === 'test' && !rest.length) {
    if (name === 'unit') {
      await run(['bun', 'run', 'test'])
      return
    }
    if (name === 'tooling') {
      await run(['bun', 'test', './tooling/repo/ops/tests'])
      return
    }
    if (name === 'integration') {
      const { integration } = await import('./integration')
      await integration()
      return
    }
  }
  if (group === 'build' && !rest.length) {
    checkClient()
    await buildRelease(environment(name))
    return
  }
  if (group === 'dev' && !name) {
    checkClient()
    await run(['bun', 'run', 'dev'], { timeout: 0 })
    return
  }
  if (group === 'maintenance' && name === 'emergency-deploy') {
    const target = environment(rest[0])
    const dry = rest.includes('--dry-run')
    if (!dry && !rest.includes('--yes'))
      throw new Error('Emergency deployment requires --yes after reviewing its environment')
    if (rest.some((value, index) => index > 0 && !['--yes', '--dry-run'].includes(value)))
      throw new Error('Unexpected emergency-deploy argument')
    if (!dry)
      await assertCommittedSource(['bun.lock'])
    await main(['build', target])
    if (!dry) {
      const record = JSON.parse(readFileSync(resolve(root, '.release/manifest.json'), 'utf8'))
      record.status = 'qualified'
      record.emergency = true
      writeJson(resolve(root, '.release/manifest.json'), record)
    }
    const { recordDeployment } = await import('./github')
    if (dry)
      await deployRelease(target, true)
    else
      await recordDeployment(target, () => deployRelease(target))
    return
  }
  if (group === 'ci') {
    if (name === 'client-key') {
      if (rest.length !== 1)
        throw new Error('Expected one resolved backend checkout')
      const backend = resolve(root, rest[0]!)
      const key = digest(JSON.stringify([sha(await run(['git', 'rev-parse', 'HEAD'], { cwd: backend, quiet: true })), Bun.version, hashes(resolve(root, 'tooling/repo/ops')), digest(readFileSync(resolve(backend, 'bun.lock'))), digest(readFileSync(resolve(root, 'bun.lock')))]))
      githubOutput('client_key', key)
      return
    }
    if (name === 'workflows') {
      await run([await tool('actionlint'), '-shellcheck=', ...Array.from(new Bun.Glob('.github/workflows/*.yml').scanSync({ cwd: root }))])
      return
    }
    if (name === 'verify') {
      await main(['check'])
      await main(['ci', 'workflows'])
      await main(['test', 'tooling'])
      await run(['bun', 'run', 'quality'], { env: verificationEnv })
      await run(['bun', 'run', 'build'], { env: verificationEnv })
      await main(['test', 'unit'])
      return
    }
    if (name === 'browser-suites') {
      const { browserSuites } = await import('./integration')
      await browserSuites()
      return
    }
    if (name === 'archive-inputs') {
      const { cpSync, mkdirSync } = await import('node:fs')
      mkdirSync(resolve(root, '.release'), { recursive: true })
      cpSync(resolve(root, 'bun.lock'), resolve(root, '.release/bun.lock'))
      return
    }
    if (name === 'setup') {
      await main(['generate', 'setup'])
      const path = await run(['pg_config', '--bindir'], { quiet: true })
      if (process.env.GITHUB_PATH) {
        const { appendFileSync } = await import('node:fs')
        appendFileSync(process.env.GITHUB_PATH, `${path}\n`)
      }
      return
    }
    if (name === 'deploy') {
      checkClient()
      const { recordDeployment } = await import('./github')
      if (rest.includes('--dry-run'))
        await deployRelease(environment(rest[0]), true)
      else
        await recordDeployment(environment(rest[0]), () => deployRelease(environment(rest[0])))
      return
    }
    if (name === 'qualify') {
      const target = environment(rest[0])
      const evidence = { environment: target, sourceCommit: sha(await run(['git', 'rev-parse', 'HEAD'], { quiet: true })), checks: { verification: false, integration: false, client: false } }
      writeJson(resolve(root, '.ci-evidence/qualification.json'), evidence)
      try {
        await main(['ci', 'verify'])
        evidence.checks.verification = true
        await main(['test', 'integration'])
        evidence.checks.integration = true
        checkClient()
        evidence.checks.client = true
      }
      finally {
        writeJson(resolve(root, '.ci-evidence/qualification.json'), evidence)
      }
      await buildRelease(target)
      await qualifyRelease(target)
      return
    }
  }
  throw new Error(`Unknown command.\n${help()}`)
}
if (import.meta.main) {
  try {
    await main(process.argv.slice(2))
  }
  catch (error) {
    console.error(redact(error instanceof Error ? error.message : 'Operation failed'))
    process.exitCode = 1
  }
}

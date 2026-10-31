import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertBackendCompatible } from './backend-input'
import { brandCheck, brandGallery, brandTokens } from './brand'
import { acquireClient, checkClient, clientOptions, installPreparedDependencies } from './client'
import { commandDocs } from './command-docs'
import { main, reference } from './main'
import { finalizeQualification, recordStage, resetQualification } from './qualification'
import { finalizeQuality, qualityParts, resetQuality } from './quality'
import { buildRelease, deployRelease } from './release'
import { assertCommittedSource, digest, environment, githubOutput, hashes, root, run, sha, writeJson } from './runtime'
import { tool } from './tools'

const verificationEnv = {
  PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? 'http://localhost:9999',
  PUBLIC_APP_ENV: process.env.PUBLIC_APP_ENV ?? 'staging',
  PUBLIC_TEST_OTP_ACCESS: 'false',
  PUBLIC_ALLOW_SCHOOL_REGISTRATION: 'true',
}
export async function executeCommand(args: string[]): Promise<void> {
  const [group, name, ...rest] = args
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
      writeFileSync(resolve(root, 'tooling/repo/ops/commands.txt'), reference())
      commandDocs(reference(), true)
      return
    }
  }
  if (group === 'check') {
    if (!name || name === 'commands')
      commandDocs(reference())
    if (!name || name === 'client')
      checkClient()
    if (!name || name === 'brand')
      brandCheck()
    const scripts: Record<string, string> = { doctor: 'ci/doctor.ts', architecture: 'ci/frontend-architecture.ts' }
    for (const script of name ? (scripts[name] ? [scripts[name]!] : []) : Object.values(scripts))
      await run(['bun', '--no-env-file', `tooling/repo/${script}`])
    return
  }
  if (group === 'test' && (!rest.length || name === 'integration')) {
    if (name === 'unit') {
      await recordStage('unit', () => run(['bun', 'x', '--bun', 'turbo', 'run', 'test', '--concurrency=1', '--force']))
      return
    }
    if (name === 'tooling') {
      await run(['bun', 'run', 'test'], { cwd: resolve(root, 'tooling/repo') })
      return
    }
    if (name === 'integration') {
      const { integration, selectedIntegrationSuite } = await import('./integration')
      const selected = selectedIntegrationSuite(rest)
      if (selected)
        await integration(selected)
      else
        await recordStage('integration', () => integration())
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
    await run(['bun', 'run', 'dev'], { timeout: 0, env: { PUBLIC_TEST_OTP_ACCESS: process.env.PUBLIC_TEST_OTP_ACCESS ?? 'true' } })
    return
  }
  if (group === 'ops' && name === 'smoke') {
    await run(['bun', '--no-env-file', 'tooling/repo/ci/smoke-staging.ts'])
    return
  }
  if (group === 'ops' && name === 'emergency-deploy') {
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
      assertBackendCompatible(backend)
      const key = digest(JSON.stringify([sha(await run(['git', 'rev-parse', 'HEAD'], { cwd: backend, quiet: true })), Bun.version, hashes(resolve(root, 'tooling/repo/ops')), digest(readFileSync(resolve(backend, 'bun.lock'))), digest(readFileSync(resolve(root, 'bun.lock')))]))
      githubOutput('client_key', key)
      return
    }
    if (name === 'workflows') {
      await run([await tool('actionlint'), '-shellcheck=', ...Array.from(new Bun.Glob('.github/workflows/*.yml').scanSync({ cwd: root }))])
      return
    }
    if (name === 'quality') {
      const part = rest[0]
      if (!part) {
        resetQuality()
        for (const step of qualityParts)
          await main(['ci', 'quality', step])
        await finalizeQuality()
      }
      else if (part === 'finalize') {
        await finalizeQuality()
      }
      else {
        if (part === 'checks')
          resetQuality()
        await recordStage(part, async () => {
          if (part === 'checks') {
            await main(['check'])
            await main(['ci', 'workflows'])
          }
          else {
            await run(['bun', 'x', '--bun', 'turbo', 'run', part === 'lint' ? 'lint' : 'check', '--cache-dir=.cache/quality/turbo'], { env: verificationEnv })
          }
        }, undefined, 'quality')
      }
      return
    }
    if (name === 'build') {
      const target = environment(rest[0])
      await recordStage('build', async () => {
        checkClient()
        await buildRelease(target)
        await main(['ci', 'archive-inputs'])
      }, target)
      return
    }
    if (name === 'finalize') {
      await finalizeQualification(environment(rest[0]))
      return
    }
    if (name === 'prepare-inputs' || name === 'restore-inputs') {
      const { prepareInputs, restoreInputs } = await import('./inputs')
      await (name === 'prepare-inputs' ? prepareInputs : restoreInputs)(environment(rest[0]))
      return
    }
    if (name === 'verify') {
      await main(['ci', 'quality'])
      await run(['bun', 'run', 'build'], { env: verificationEnv })
      await main(['test', 'unit'])
      return
    }
    if (name === 'browser-suites') {
      const { browserSuites, selectedIntegrationSuite } = await import('./integration')
      await browserSuites(selectedIntegrationSuite(rest))
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
      resetQualification()
      await assertCommittedSource(['bun.lock'])
      const previousTarget = process.env.CI_TARGET
      const previousAttempt = process.env.EDAYA_QUALIFICATION_ATTEMPT
      process.env.CI_TARGET = target
      process.env.EDAYA_QUALIFICATION_ATTEMPT = crypto.randomUUID()
      try {
        await main(['ci', 'quality'])
        await main(['test', 'unit'])
        // Integration owns a test-configured build; release artifacts are built afterwards.
        await main(['test', 'integration'])
        await main(['ci', 'build', target])
        await finalizeQualification(target)
      }
      finally {
        if (previousTarget === undefined)
          delete process.env.CI_TARGET
        else process.env.CI_TARGET = previousTarget
        if (previousAttempt === undefined)
          delete process.env.EDAYA_QUALIFICATION_ATTEMPT
        else process.env.EDAYA_QUALIFICATION_ATTEMPT = previousAttempt
      }
      return
    }
  }

  throw new Error(`Unknown command.\n${reference()}`)
}

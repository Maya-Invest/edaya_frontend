import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { root, run } from '../runtime'

const workflow = (name: string) => Bun.YAML.parse(readFileSync(resolve(root, '.github/workflows', name), 'utf8')) as Record<string, any>
test('PRs into both destinations always qualify without deployment', () => {
  const pr = workflow('deploy_pr.yml')
  expect(pr.on.pull_request.branches).toEqual(['main', 'staging'])
  expect(Object.values(pr.jobs).every((job: any) => job.uses === './.github/workflows/_qualify.yml')).toBe(true)
  expect(pr.jobs.qualification.with.full).not.toBe(false)
})
test('releases serialize, require successful qualification, and support exact manual revisions', () => {
  for (const [environment, branch] of [['staging', 'staging'], ['production', 'main']]) {
    const release = workflow(`deploy-${environment}.yml`)
    expect(release.on.push.branches).toEqual([branch])
    expect(release.on.workflow_dispatch.inputs.source_ref).toBeDefined()
    expect(release.concurrency['cancel-in-progress']).toBe(false)
    expect(release.jobs.deploy.needs).toBe('qualify')
    expect(release.jobs.deploy.if).toBe('vars.ENABLE_INDEPENDENT_RELEASES == \'true\'')
    expect(release.jobs.deploy.with.target).toBe(environment)
  }
})
test('artifact handoff cannot resolve a backend branch or regenerate a client at deployment', () => {
  const deployment = workflow('_deploy.yml')
  const steps = deployment.jobs.deploy.steps as {
    run?: string
    uses?: string
  }[]
  expect(steps.some(step => step.run?.includes('restore'))).toBe(true)
  expect(steps.some(step => step.run?.includes('generate client'))).toBe(false)
  expect(JSON.stringify(deployment)).not.toContain('edaya_backend')
  expect(workflow('validate.yml').on.workflow_dispatch).toBeDefined()
  const qualification = workflow('_qualify.yml')
  expect(qualification.on.workflow_call.inputs.full.default).toBe(true)
  expect(qualification.jobs.qualification.steps.some((step: any) => step.uses === './.github/actions/finalize')).toBe(true)
})

// GitHub expression strings are literal workflow values.
/* eslint-disable no-template-curly-in-string */
test('development matches source branches while releases and manual overrides remain fixed', () => {
  expect(workflow('push.yml').jobs.verification.with.backend_ref).toBe('${{ github.ref_name }}')
  const pr = workflow('deploy_pr.yml').jobs.qualification.with
  expect(pr.backend_ref).toBe('${{ github.head_ref }}')
  expect(pr.source_ref).toBe('${{ github.sha }}')
  expect(pr.match_backend_branch).toBe(true)
  for (const name of ['deploy-staging.yml', 'deploy-production.yml', 'validate.yml'])
    expect(workflow(name).jobs.qualify.with.match_backend_branch).toBeUndefined()
  const steps = workflow('_qualify.yml').jobs.preparation.steps
  expect(steps.find((step: any) => step.name === 'Checkout backend input').with.ref).toBe('${{ steps.backend-input.outputs.commit }}')
  expect(steps.findIndex((step: any) => step.id === 'client-cache')).toBeLessThan(steps.findIndex((step: any) => step.uses?.startsWith('actions/cache@')))
})

const action = (name: string) => Bun.YAML.parse(readFileSync(resolve(root, '.github/actions', name, 'action.yml'), 'utf8')) as Record<string, any>

test('all jobs share prepared inputs and only full qualification builds and integrates', () => {
  const jobs = workflow('_qualify.yml').jobs
  expect(jobs.quality.needs).toBe('preparation')
  expect(jobs.unit.needs).toBe('preparation')
  expect(jobs.build.needs).toBe('preparation')
  expect(jobs.build.if).toBe('inputs.full')
  expect(jobs.integration.if).toBe('inputs.full')
  expect(jobs.integration.needs).toEqual(['preparation', 'quality', 'unit'])
  expect(jobs.qualification.needs).toEqual(['preparation', 'quality', 'unit', 'build', 'integration'])
  expect(jobs.qualification.if).toBe('${{ always() && inputs.full }}')
  expect(jobs.qualification.name).toBe('Full validation')
  expect(workflow('push.yml').jobs.verification.with.full).toBe(false)
  for (const job of ['quality', 'unit', 'build', 'integration']) {
    expect(jobs[job].with.source_ref).toBe('${{ needs.preparation.outputs.source_sha }}')
    expect(jobs[job].with.backend_sha).toBe('${{ needs.preparation.outputs.backend_sha }}')
  }
  for (const name of ['_quality-check.yml', '_unit-test.yml', '_build.yml', '_integration-test.yml']) {
    const stage = Object.values(workflow(name).jobs)[0] as any
    expect(stage.steps.some((step: any) => step.uses === './.github/actions/setup')).toBe(true)
    expect(stage.steps.some((step: any) => step.run?.includes('generate client'))).toBe(false)
    if (name !== '_integration-test.yml')
      expect(JSON.stringify(stage)).not.toContain('BACKEND_CHECKOUT_TOKEN')
  }
})

test('the final gate rejects failed, skipped, cancelled and incomplete jobs', async () => {
  const jobs = workflow('_qualify.yml').jobs
  const gate = jobs.qualification.steps.find((step: any) => step.name === 'Require every task to succeed')
  const results = Object.fromEntries(jobs.qualification.needs.map((name: string) => [name, { result: 'success' }]))
  await expect(run(['bash', '-c', gate.run], { quiet: true, env: { RESULTS: JSON.stringify(results) } })).resolves.toBe('true')
  for (const name of jobs.qualification.needs) {
    for (const result of ['failure', 'cancelled', 'skipped', '']) {
      await expect(run(['bash', '-c', gate.run], { quiet: true, env: { RESULTS: JSON.stringify({ ...results, [name]: { result } }) } })).rejects.toThrow()
    }
  }
})

test('artifact setup freezes dependencies while finalization only joins results', () => {
  const setup = action('setup').runs.steps
  expect(setup.find((step: any) => step.uses?.startsWith('actions/download-artifact@')).with.name).toBe('prepared-${{ github.run_id }}-${{ github.run_attempt }}')
  const setupCommands = setup.map((step: any) => step.run ?? '').join('\n')
  expect(setupCommands).toContain('ci restore-inputs')
  expect(setupCommands).toContain('bun install --frozen-lockfile --ignore-scripts --force')
  expect(setupCommands).toContain('check client')
  expect(setupCommands).not.toContain('generate dependencies')
  const finalize = action('finalize').runs.steps
  const commands = finalize.map((step: any) => step.run ?? '').join('\n')
  expect(commands).toContain('ci finalize')
  expect(commands).not.toMatch(/ci qualify|ci build|generate client|test integration/)
  const artifact = finalize.find((step: any) => step.uses?.startsWith('actions/upload-artifact@'))
  expect(artifact.with.name).toBe('qualified-${{ github.run_id }}-${{ github.run_attempt }}')
  expect(artifact.with.path).toContain('apps/webapp/build/')
  expect(artifact.with.path).toContain('apps/webadmin/build/')
  const turbo = JSON.parse(readFileSync(resolve(root, 'turbo.json'), 'utf8'))
  expect(turbo.tasks.test.dependsOn ?? []).toEqual([])
  const unit = workflow('_unit-test.yml').jobs.unit.steps.filter((step: any) => step.run)
  expect(unit).toHaveLength(1)
  expect(unit[0].run).toBe('bun run repo test unit')
})

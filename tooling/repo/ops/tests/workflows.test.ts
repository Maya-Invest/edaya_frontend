import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { root } from '../runtime'

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
  expect(qualification.jobs.qualification.steps.some((step: any) => step.run?.includes('ci qualify') && step.if === 'inputs.full')).toBe(true)
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
  const steps = workflow('_qualify.yml').jobs.qualification.steps
  expect(steps.find((step: any) => step.name === 'Checkout backend input').with.ref).toBe('${{ steps.backend-input.outputs.commit }}')
  expect(steps.findIndex((step: any) => step.id === 'client-cache')).toBeLessThan(steps.findIndex((step: any) => step.uses?.startsWith('actions/cache@')))
})

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, test } from 'bun:test'
import { root } from '../runtime'

// GitHub expressions below are literal YAML values.
/* eslint-disable no-template-curly-in-string */
const workflow = (name: string) => Bun.YAML.parse(readFileSync(resolve(root, '.github/workflows', name), 'utf8')) as Record<string, any>
const preparation = 'preparation'
const entries = ['branche_check.yml', 'pr_validation.yml', 'deploy.yml']
const mandatory = [preparation, 'quality', 'unit', 'build', 'integration']

// These routing expressions use the common GitHub/JavaScript subset: property
// access, string equality, &&, || and format. Evaluate the actual YAML values.
function render(value: string | boolean, github: Record<string, any>, inputs: Record<string, any> = {}): string {
  return String(value).replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expression: string) => String(runInNewContext(expression, {
    github,
    inputs,
    format: (pattern: string, ...values: unknown[]) => pattern.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)])),
  })))
}
function shell(script: string, env: Record<string, string>): number {
  return Bun.spawnSync(['bash', '-e', '-c', script], { env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' }).exitCode
}

test('entry workflows contain only reusable callers and every reusable workflow is reachable', () => {
  const files = readdirSync(resolve(root, '.github/workflows')).filter(name => name.endsWith('.yml'))
  expect(files.filter(name => !name.startsWith('_')).sort()).toEqual([...entries].sort())
  const reached = new Set<string>()
  function visit(name: string): void {
    if (reached.has(name))
      return
    reached.add(name)
    const definition = workflow(name)
    for (const job of Object.values(definition.jobs) as any[]) {
      if (entries.includes(name)) {
        expect(Object.keys(job).every(key => ['uses', 'needs', 'if', 'with', 'secrets'].includes(key))).toBe(true)
        expect(job.uses).toMatch(/^\.\/\.github\/workflows\/_/)
      }
      if (job.uses?.startsWith('./.github/workflows/')) {
        const called = job.uses.split('/').at(-1)
        expect(existsSync(resolve(root, '.github/workflows', called))).toBe(true)
        expect(workflow(called).on.workflow_call).toBeDefined()
        visit(called)
      }
    }
  }
  for (const entry of entries) {
    expect(workflow(entry).name).toBe(entry === 'staging_maintenance.yml' ? 'staging maintenance' : entry.replace('.yml', ''))
    visit(entry)
  }
  expect([...reached].sort()).toEqual(files.sort())
})

test('branch checks prepare immutable inputs then run only parallel quality and unit jobs', () => {
  const branch = workflow('branche_check.yml')
  expect(branch.on.push['branches-ignore']).toEqual(['main', 'staging'])
  expect(Object.keys(branch.jobs)).toEqual([preparation, 'quality', 'unit'])
  expect(branch.concurrency['cancel-in-progress']).toBe(true)
  expect(render(branch.concurrency.group, { ref: 'refs/heads/feature' })).toBe('branch-refs/heads/feature')
  expect(branch.jobs[preparation].uses).toBe('./.github/workflows/_prepare.yml')
  expect(branch.jobs[preparation].with.release_mode).toBeUndefined()
  for (const name of ['quality', 'unit']) {
    expect(branch.jobs[name].needs).toBe(preparation)
    expect(branch.jobs[name].with.target).toBe('staging')
  }
})

test('validation and release expose the complete graph and immutable identities', () => {
  for (const name of ['pr_validation.yml', 'deploy.yml']) {
    const jobs = workflow(name).jobs
    for (const stage of ['quality', 'unit', 'build']) {
      expect(jobs[stage].needs).toBe(preparation)
      expect(jobs[stage].if).toBeUndefined()
    }
    expect(jobs.integration.needs).toEqual([preparation, 'quality', 'unit'])
    expect(jobs.qualification.needs).toEqual(mandatory)
    expect(jobs.qualification.if).toBe('always()')
    expect(jobs.qualification.uses).toBe('./.github/workflows/_finalize.yml')
    expect(jobs.qualification.with.job_results).toBe('${{ toJSON(needs) }}')
    for (const stage of ['quality', 'unit', 'build', 'integration', 'qualification']) {
      const sourceKey = stage === 'qualification' ? 'source_sha' : 'source_ref'
      expect(jobs[stage].with[sourceKey]).toBe(`\${{ needs.${preparation}.outputs.source_sha }}`)
    }
  }
  const prepare = workflow('_prepare.yml')
  expect(prepare.on.workflow_call.outputs.source_sha.value).toBe(`\${{ jobs.${preparation}.outputs.source_sha }}`)
  const checkout = prepare.jobs[preparation].steps.find((step: any) => step.uses?.startsWith('actions/checkout@'))
  expect(checkout.with.ref).toBe('${{ inputs.source_ref }}')
  expect(prepare.jobs[preparation].steps.find((step: any) => step.id === 'source').run).toContain('git rev-parse HEAD')
})

test('PR and manual validation preserve source selection, defaults and independent cancellation', () => {
  const validation = workflow('pr_validation.yml')
  expect(validation.on.pull_request.branches).toEqual(['main', 'staging'])
  expect(validation.on.workflow_dispatch.inputs.target).toMatchObject({ default: 'staging', options: ['staging', 'production'] })
  expect(validation.on.workflow_dispatch.inputs.source_ref.default).toBe('')
  expect(Object.keys(validation.jobs)).toEqual([...mandatory, 'qualification'])
  expect(validation.concurrency['cancel-in-progress']).toBe(true)
  for (const [base, target] of [['main', 'production'], ['staging', 'staging']]) {
    const github = { event_name: 'pull_request', base_ref: base, sha: 'merge-sha', event: { pull_request: { number: 42, base: { sha: 'base-sha' } } } }
    for (const job of Object.values(validation.jobs) as any[])
      expect(render(job.with.target, github)).toBe(target!)
    expect(render(validation.jobs[preparation].with.source_ref, github)).toBe('merge-sha')
    expect(render(validation.jobs.integration.with.baseline_sha, github)).toBe('base-sha')
    expect(render(validation.concurrency.group, github)).toBe('pr-42')
  }
  for (const target of ['staging', 'production']) {
    for (const source_ref of ['', 'override-sha']) {
      const github = { event_name: 'workflow_dispatch', ref: 'refs/heads/feature', sha: 'workflow-sha', event: { pull_request: { base: {} } } }
      const inputs = { target, source_ref }
      for (const job of Object.values(validation.jobs) as any[])
        expect(render(job.with.target, github, inputs)).toBe(target)
      expect(render(validation.jobs[preparation].with.source_ref, github, inputs)).toBe(source_ref || 'workflow-sha')
      expect(render(validation.jobs.integration.with.baseline_sha, github, inputs)).toBe('')
      expect(render(validation.concurrency.group, github, inputs)).toBe(`validation-refs/heads/feature-${target}`)
    }
  }
})

test('deploy derives its target and serial lock from the workflow branch, independent of source overrides', () => {
  const deploy = workflow('deploy.yml')
  expect(deploy.on.push.branches).toEqual(['main', 'staging'])
  expect(Object.keys(deploy.on.workflow_dispatch.inputs)).toEqual(['source_ref'])
  expect(deploy.jobs[preparation].with.release_mode).toBe(true)
  expect(deploy.concurrency['cancel-in-progress']).toBe(false)
  for (const [branch, target] of [['main', 'production'], ['staging', 'staging']]) {
    for (const event_name of ['push', 'workflow_dispatch']) {
      for (const source_ref of ['', 'other-branch-or-sha']) {
        const github = { event_name, ref_name: branch, sha: 'workflow-sha' }
        const inputs = { source_ref }
        for (const job of Object.values(deploy.jobs) as any[])
          expect(render(job.with.target, github, inputs)).toBe(target!)
        expect(render(deploy.jobs[preparation].with.source_ref, github, inputs)).toBe(source_ref || 'workflow-sha')
        expect(render(deploy.concurrency.group, github, inputs)).toBe(`deploy-${target}`)
      }
    }
  }
})

test('release guard rejects invalid workflow branches, tags and mismatched targets before checkout', () => {
  const prepare = workflow('_prepare.yml')
  expect(prepare.on.workflow_call.inputs.release_mode.default).toBe(false)
  const gate = prepare.jobs[preparation].steps[0]
  expect(gate.name).toBe('Validate release destination')
  expect(gate.env).toEqual({ RELEASE_MODE: '${{ inputs.release_mode }}', REF_TYPE: '${{ github.ref_type }}', REF_NAME: '${{ github.ref_name }}', TARGET: '${{ inputs.target }}' })
  for (const REF_TYPE of ['branch', 'tag']) {
    for (const REF_NAME of ['main', 'staging', 'feature', 'v1']) {
      for (const TARGET of ['production', 'staging']) {
        const valid = REF_TYPE === 'branch' && ((REF_NAME === 'main' && TARGET === 'production') || (REF_NAME === 'staging' && TARGET === 'staging'))
        expect(shell(gate.run, { RELEASE_MODE: 'true', REF_TYPE, REF_NAME, TARGET })).toBe(valid ? 0 : 1)
        expect(shell(gate.run, { RELEASE_MODE: 'false', REF_TYPE, REF_NAME, TARGET })).toBe(0)
      }
    }
  }
})

test('finalization rejects missing, failed, skipped, cancelled or malformed prerequisites before checkout', () => {
  const finalize = workflow('_finalize.yml').jobs.qualification
  expect(finalize.name).toBe('Full validation')
  const gate = finalize.steps[0]
  expect(gate.name).toBe('Require every task to succeed')
  expect(gate.env.RESULTS).toBe('${{ inputs.job_results }}')
  const results = Object.fromEntries(mandatory.map(name => [name, { result: 'success' }]))
  expect(shell(gate.run, { RESULTS: JSON.stringify(results) })).toBe(0)
  for (const name of mandatory) {
    for (const result of ['failure', 'cancelled', 'skipped', '', null])
      expect(shell(gate.run, { RESULTS: JSON.stringify({ ...results, [name]: { result } }) })).not.toBe(0)
    const missing = { ...results }
    delete missing[name]
    expect(shell(gate.run, { RESULTS: JSON.stringify(missing) })).not.toBe(0)
  }
  for (const RESULTS of ['{}', '[]', 'null', '', 'not JSON'])
    expect(shell(gate.run, { RESULTS })).not.toBe(0)
  expect(finalize.steps[1].with.ref).toBe('${{ inputs.source_sha }}')
  expect(finalize.steps.at(-1).uses).toBe('./.github/actions/finalize')
})

const action = (name: string) => Bun.YAML.parse(readFileSync(resolve(root, '.github/actions', name, 'action.yml'), 'utf8')) as Record<string, any>

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
  const unit = workflow('_unit_test.yml').jobs.unit.steps.filter((step: any) => step.run)
  expect(unit).toHaveLength(1)
  expect(unit[0].run).toBe('bun run repo test unit')
})

test('development matches backend source branches, while manual validation and releases never fall back', () => {
  const branch = workflow('branche_check.yml').jobs.preparation.with
  expect(branch.backend_ref).toBe('${{ github.ref_name }}')
  expect(branch.match_backend_branch).toBe(true)
  const validation = workflow('pr_validation.yml')
  expect(validation.on.workflow_dispatch.inputs.backend_ref.default).toBe('')
  const pr = validation.jobs.preparation.with
  expect(render(pr.backend_ref, { event_name: 'pull_request', head_ref: 'feature' })).toBe('feature')
  expect(render(pr.match_backend_branch, { event_name: 'pull_request' })).toBe('true')
  for (const backend_ref of ['', 'exact-backend-sha']) {
    expect(render(pr.backend_ref, { event_name: 'workflow_dispatch' }, { backend_ref })).toBe(backend_ref)
    expect(render(pr.match_backend_branch, { event_name: 'workflow_dispatch' }, { backend_ref })).toBe('false')
  }
  expect(workflow('deploy.yml').jobs.preparation.with.backend_ref).toBeUndefined()
  expect(workflow('deploy.yml').jobs.preparation.with.match_backend_branch).toBeUndefined()
  const prepare = workflow('_prepare.yml')
  expect(prepare.on.workflow_call.inputs.match_backend_branch.default).toBe(false)
  expect(prepare.on.workflow_call.inputs.backend_ref.default).toBe('')
  expect(prepare.on.workflow_call.outputs.backend_sha.value).toBe('${{ jobs.preparation.outputs.backend_sha }}')
  const steps = prepare.jobs.preparation.steps
  expect(steps.find((step: any) => step.name === 'Checkout backend input').with.ref).toBe('${{ steps.backend-input.outputs.commit }}')
  expect(steps.findIndex((step: any) => step.id === 'client-cache')).toBeLessThan(steps.findIndex((step: any) => step.uses?.startsWith('actions/cache@')))
  expect(steps.find((step: any) => step.name === 'Upload frozen inputs').with.name).toBe('prepared-${{ github.run_id }}-${{ github.run_attempt }}')
})

test('all stages share immutable inputs and only preparation and integration receive backend credentials', () => {
  for (const entry of entries) {
    const jobs = workflow(entry).jobs
    for (const [name, job] of Object.entries(jobs) as [string, any][]) {
      if (name === 'preparation' || name === 'integration')
        expect(job.secrets).toEqual({ BACKEND_CHECKOUT_TOKEN: '${{ secrets.BACKEND_CHECKOUT_TOKEN }}' })
      else
        expect(JSON.stringify(job.secrets ?? {})).not.toMatch(/BACKEND_CHECKOUT_TOKEN|inherit/)
      if (['quality', 'unit', 'build', 'integration', 'qualification'].includes(name))
        expect(job.with.backend_sha).toBe('${{ needs.preparation.outputs.backend_sha }}')
    }
  }
  for (const name of ['_quality_check.yml', '_unit_test.yml', '_build.yml', '_integration_test.yml']) {
    const stage = Object.values(workflow(name).jobs)[0] as any
    expect(stage.steps.some((step: any) => step.uses === './.github/actions/setup')).toBe(true)
    expect(stage.steps.some((step: any) => step.run?.includes('generate client'))).toBe(false)
    if (name !== '_integration_test.yml')
      expect(JSON.stringify(stage)).not.toContain('BACKEND_CHECKOUT_TOKEN')
  }
})

test('deployment requires successful qualification without an extra switch, restores exact artifacts and preserves environment protection', () => {
  const deploy = workflow('deploy.yml').jobs.deploy
  expect(deploy.needs).toBe('qualification')
  expect(deploy.if).toBeUndefined()
  expect(deploy.secrets).toEqual({ CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}' })
  const deployment = workflow('_deploy.yml').jobs.deploy
  expect(deployment.environment).toBe('${{ inputs.target }}')
  const commands = deployment.steps.map((step: any) => step.run ?? '').join('\n')
  expect(commands).toContain('restore.ts')
  expect(commands).not.toMatch(/generate client|ci build|ci qualify|test integration/)
  expect(JSON.stringify(deployment)).not.toContain('edaya_backend')
})

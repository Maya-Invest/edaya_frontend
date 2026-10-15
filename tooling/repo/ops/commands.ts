import type { Argument, Command, Invocation, Option } from './command-tree'

const env: Argument = { name: 'environment', choices: ['staging', 'production'] }
const yes: Option = { description: 'Explicitly confirm the operation.', aliases: ['-y'] }
const dry: Option = { description: 'Preview without applying remote changes.' }
function confirmed({ options }: Invocation) {
  if (!options['--dry-run'] && !options['--yes'])
    throw new Error('This operation requires explicit --yes; use --dry-run to preview')
}
function leaf(path: string, description: string, extra: Partial<Command> = {}): Command {
  return { description, examples: [[`bun repo ${path}`, ...(extra.arguments ?? []).map(arg => arg.default ?? arg.choices?.[0] ?? `<${arg.name}>`), ...(extra.validate === confirmed ? ['--dry-run'] : []), ...(extra.passthrough ? ['-- bun test'] : [])].join(' ')], run: async (invocation) => {
    const { executeCommand } = await import('./execute')
    await executeCommand([...path.split(' '), ...invocation.argv])
  }, ...extra }
}
const group = (description: string, children: Record<string, Command>): Command => ({ description, children })
const checks = (names: Record<string, string>) => ({ ...leaf('check', 'Run all repository checks.'), children: Object.fromEntries(Object.entries(names).map(([name, description]) => [name, leaf(`check ${name}`, description)])) })
const tests = group('Run test suites.', Object.fromEntries(Object.entries({ unit: 'Run workspace unit tests.', tooling: 'Run the complete tooling package test suite.', integration: 'Run supervised integration suites.' }).map(([name, description]) => [name, leaf(`test ${name}`, description)])))
const emergency = leaf('ops emergency-deploy', 'Build and deploy through the emergency qualification bypass; does not migrate or seed.', { arguments: [env], options: { '--yes': { ...yes, aliases: [] }, '--dry-run': dry }, validate: confirmed, examples: ['bun repo ops emergency-deploy staging --dry-run', 'bun repo ops emergency-deploy staging --yes'] })
const ci: Record<string, Command> = {
  'verify': leaf('ci verify', 'Run repository checks, workflow lint, tooling tests, quality, builds and unit tests.'),
  'qualify': leaf('ci qualify', 'Verify, integrate, build and qualify a release.', { arguments: [env] }),
  'deploy': leaf('ci deploy', 'Deploy existing qualified release artifacts.', { arguments: [env], options: { '--dry-run': dry } }),
  'workflows': leaf('ci workflows', 'Validate workflow definitions.'),
  'setup': leaf('ci setup', 'Prepare CI tools and framework files where applicable.'),
  'archive-inputs': leaf('ci archive-inputs', 'Copy lockfile inputs into release evidence.'),
}

export const commands: Command = group('Frontend repository commands. Use <command> --help for details.', {
  dev: leaf('dev', 'Start webapp and webadmin using the prepared API client. Enable local OTP capture controls by default; set PUBLIC_TEST_OTP_ACCESS=false to opt out.'),
  check: checks({ doctor: 'Check configuration and repository layout.', commands: 'Check generated command documentation.', client: 'Check the prepared and installed API client.', brand: 'Check brand assets, tokens and visual literals.', architecture: 'Check frontend architecture.' }),
  test: tests,
  build: leaf('build', 'Build webapp and webadmin release artifacts without deployment.', { arguments: [env] }),
  generate: group('Prepare clients, dependencies and generated assets.', {
    'client': leaf('generate client', 'Prepare an API client from a backend revision or checkout.', {
      arguments: [{ ...env, optional: true, default: 'staging' }],
      options: { '--ref': { value: 'ref', description: 'Backend revision; mutually exclusive with --backend-root. Not allowed in CI.' }, '--backend-root': { value: 'path', description: 'Existing backend checkout; mutually exclusive with --ref.' } },
      validate: ({ options }) => {
        if (options['--ref'] && options['--backend-root'])
          throw new Error('Use --ref or --backend-root, not both')
      },
      examples: ['bun repo generate client staging', 'bun repo generate client staging --backend-root ../edaya_backend'],
    }),
    'dependencies': leaf('generate dependencies', 'Install and verify dependencies against the prepared client.'),
    'setup': leaf('generate setup', 'Generate SvelteKit setup files for both applications.'),
    'brand': leaf('generate brand', 'Generate brand CSS tokens.'),
    'gallery': leaf('generate gallery', 'Build the review gallery and manifest from existing screenshots.'),
    'reviewed-brand-baseline': leaf('generate reviewed-brand-baseline', 'Record current assets and visual literals as the reviewed brand baseline.'),
    'commands': leaf('generate commands', 'Regenerate the full command reference and saved help.'),
  }),
  ops: group('Run operational checks and emergency deployment.', {
    'smoke': leaf('ops smoke', 'Run HTTP smoke checks against staging frontend shells.', { arguments: [{ name: 'environment', choices: ['staging'] }] }),
    'emergency-deploy': emergency,
  }),
  ci: group('Run CI verification and release operations.', {
    ...ci,
    'browser-suites': leaf('ci browser-suites', 'Run browser suites against the configured services.'),
    'client-key': leaf('ci client-key', 'Emit the backend/client cache key.', { arguments: [{ name: 'backend-path' }] }),
  }),
})

export const removedCommands: Record<string, string> = {
  maintenance: 'bun repo ops <command>',
  doctor: 'bun repo check doctor',
  verify: 'bun repo ci verify (or ci qualify <environment> for full qualification)',
  deploy: 'bun repo ops emergency-deploy <environment>',
}

removedCommands['smoke-test'] = 'bun repo ops smoke staging'

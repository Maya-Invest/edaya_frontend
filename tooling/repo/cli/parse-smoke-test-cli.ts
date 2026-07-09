export type SmokeTestTarget = 'staging'

export type ParsedSmokeTestCli
  = | { kind: 'help' }
    | { kind: 'run', target: SmokeTestTarget }

const TARGETS = new Set<SmokeTestTarget>(['staging'])

export function parseSmokeTestCliArgs(args: readonly string[]): ParsedSmokeTestCli {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { kind: 'help' }
  }

  const [target] = args
  if (!target || !TARGETS.has(target as SmokeTestTarget)) {
    throw new Error(
      `Unknown smoke-test target: ${target ?? '(missing)'}. Valid: ${[...TARGETS].join(', ')}`,
    )
  }

  return { kind: 'run', target: target as SmokeTestTarget }
}

export function smokeTestCliUsage(): string {
  return [
    'Usage: bun repo smoke-test <target>',
    '',
    'Targets:',
    '  staging      HTTP smoke against staging SPA shells',
  ].join('\n')
}

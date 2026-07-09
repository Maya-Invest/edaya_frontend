export type CheckTarget = 'openapi' | 'openapi-export'

export type ParsedCheckCli
  = | { kind: 'help' }
    | { kind: 'run', target: CheckTarget }

const TARGETS = new Set<CheckTarget>(['openapi', 'openapi-export'])

export function parseCheckCliArgs(args: readonly string[]): ParsedCheckCli {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { kind: 'help' }
  }

  const [target] = args
  if (!target || !TARGETS.has(target as CheckTarget)) {
    throw new Error(
      `Unknown check target: ${target ?? '(missing)'}. Valid: ${[...TARGETS].join(', ')}`,
    )
  }

  return { kind: 'run', target: target as CheckTarget }
}

export function checkCliUsage(): string {
  return [
    'Usage: bun repo check <target>',
    '',
    'Targets:',
    '  openapi         Generated API artifacts vs committed openapi.json',
    '  openapi-export  Same, but compare against live export from sibling edaya_backend',
  ].join('\n')
}

export type OpenapiAction = 'export' | 'generate'

export type ParsedOpenapiCli
  = | { kind: 'help' }
    | { kind: 'run', action: OpenapiAction }

const ACTIONS = new Set<OpenapiAction>(['export', 'generate'])

export function parseOpenapiCliArgs(args: readonly string[]): ParsedOpenapiCli {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { kind: 'help' }
  }

  const [action] = args
  if (!action || !ACTIONS.has(action as OpenapiAction)) {
    throw new Error(
      `Unknown openapi action: ${action ?? '(missing)'}. Valid: ${[...ACTIONS].join(', ')}`,
    )
  }

  return { kind: 'run', action: action as OpenapiAction }
}

export function openapiCliUsage(): string {
  return [
    'Usage: bun repo openapi <export|generate>',
    '',
    'Actions:',
    '  export     Export OpenAPI from sibling edaya_backend (or EDAYA_CORE_ROOT)',
    '  generate   Regenerate schema.d.ts + client bindings from committed openapi.json',
  ].join('\n')
}

export type RepoBunSpawnCommand = 'doctor'

export type CompoundRepoCommand
  = | 'check'
    | 'smoke-test'
    | 'verify'
    | 'openapi'

export type RepoCliCommand = RepoBunSpawnCommand | CompoundRepoCommand

export type ParsedRepoCli
  = | { kind: 'help' }
    | { kind: 'run', command: RepoCliCommand, forwardArgs: string[] }

const COMMANDS = new Set<RepoCliCommand>([
  'doctor',
  'check',
  'smoke-test',
  'verify',
  'openapi',
])

export const COMPOUND_COMMANDS = new Set<CompoundRepoCommand>([
  'check',
  'smoke-test',
  'verify',
  'openapi',
])

export function isCompoundRepoCommand(command: RepoCliCommand): command is CompoundRepoCommand {
  return COMPOUND_COMMANDS.has(command as CompoundRepoCommand)
}

export function parseRepoCliArgs(argv: readonly string[]): ParsedRepoCli {
  const args = argv.slice(2)

  if (args.length === 0) {
    return { kind: 'help' }
  }

  const [command, ...forwardArgs] = args

  if (command === '--help' || command === '-h') {
    return { kind: 'help' }
  }

  if (!COMMANDS.has(command as RepoCliCommand)) {
    const unknown = command ?? '(missing)'
    throw new Error(
      `Unknown repo command: ${unknown}. Valid commands: ${[...COMMANDS].join(', ')}`,
    )
  }

  return {
    kind: 'run',
    command: command as RepoCliCommand,
    forwardArgs,
  }
}

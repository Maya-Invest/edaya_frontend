export interface Argument {
  name: string
  choices?: readonly string[]
  optional?: boolean
  default?: string
  pattern?: RegExp
}
export interface Option {
  description: string
  value?: string
  aliases?: string[]
  repeat?: boolean
  choices?: readonly string[]
  pattern?: RegExp
}
export interface Invocation {
  path: string[]
  positionals: string[]
  options: Record<string, string | boolean | string[]>
  forwarded: string[]
  argv: string[]
}
export interface Command {
  description: string
  arguments?: Argument[]
  options?: Record<string, Option>
  children?: Record<string, Command>
  examples?: string[]
  passthrough?: boolean
  validate?: (invocation: Invocation) => void
  run?: (invocation: Invocation) => Promise<void>
}
export interface Resolution { command: Command, invocation: Invocation, help: boolean }

export function usage(command: Command, path: string[] = []): string {
  const args = (command.arguments ?? []).map((arg) => {
    const name = arg.choices?.join('|') ?? arg.name
    return arg.optional ? `[${name}]` : `<${name}>`
  })
  return ['bun repo', ...path, ...(command.children ? [command.run ? '[command]' : '<command>'] : []), ...args, ...(Object.keys(command.options ?? {}).length ? ['[options]'] : []), ...(command.passthrough ? ['-- <command...>'] : [])].join(' ')
}
export function commandHelp(command: Command, path: string[] = []): string {
  const lines = [`Usage: ${usage(command, path)}`, '', command.description]
  if (command.children) {
    lines.push('', 'Commands:')
    for (const [name, child] of Object.entries(command.children))
      lines.push(`  ${name.padEnd(24)} ${child.description}`)
  }
  if (command.arguments?.length) {
    lines.push('', 'Arguments:')
    for (const arg of command.arguments)
      lines.push(`  ${arg.name.padEnd(24)} ${arg.choices ? `Values: ${arg.choices.join(', ')}.` : 'Required value.'}${arg.default !== undefined ? ` Default: ${arg.default}.` : arg.optional ? ' Optional.' : ''}`)
  }
  lines.push('', 'Options:', '  -h, --help               Show help for this command.')
  for (const [name, option] of Object.entries(command.options ?? {}))
    lines.push(`  ${[...(option.aliases ?? []), name].join(', ')}${option.value ? ` <${option.value}>` : ''}${option.repeat ? ' (repeatable)' : ''}\n      ${option.description}${option.choices ? ` Values: ${option.choices.join(', ')}.` : ''}`)
  const examples = command.examples ?? [`${usage(command, path).replace(/\[options\]/g, '').trim()} --help`]
  lines.push('', 'Examples:', ...examples.map(example => `  ${example}`))
  return `${lines.join('\n')}\n`
}
export function commandEntries(command: Command, path: string[] = []): { command: Command, path: string[] }[] {
  return [{ command, path }, ...Object.entries(command.children ?? {}).flatMap(([name, child]) => commandEntries(child, [...path, name]))]
}
export function commandReference(command: Command): string {
  return commandEntries(command).map(entry => commandHelp(entry.command, entry.path)).join('\n')
}

/** Resolve and validate without importing execution handlers or reading configuration. */
export function resolveCommand(root: Command, args: readonly string[], removed: Record<string, string> = {}): Resolution {
  let command = root
  const path: string[] = []
  const positionals: string[] = []
  const options: Invocation['options'] = {}
  let forwarded: string[] = []
  let help = false
  const pending: string[] = []
  const fail = (message: string): never => {
    throw new Error(`${message}\n\n${commandHelp(command, path)}`)
  }
  let index = 0
  // Resolve command words before parsing arguments and options. Help can appear at any depth.
  while (index < args.length && command.children) {
    const word = args[index]!
    if (word === '--help' || word === '-h') {
      help = true
      index++
      continue
    }
    const candidate = [...path, word].join(' ')
    if (removed[candidate])
      fail(`Removed command: ${candidate}. Use ${removed[candidate]}.`)
    const child = Object.hasOwn(command.children, word) ? command.children[word] : undefined
    if (child) {
      path.push(word)
      command = child
      index++
    }
    else if (command.run && (command.arguments?.length || word.startsWith('-'))) {
      break
    }
    else {
      fail(`Unknown command: ${candidate}`)
    }
  }
  for (; index < args.length; index++) {
    const word = args[index]!
    if (word === '--') {
      if (!command.passthrough)
        fail('This command does not accept forwarded arguments')
      forwarded = args.slice(index + 1)
      break
    }
    if (word === '--help' || word === '-h') {
      help = true
      continue
    }
    if (!word.startsWith('-')) {
      positionals.push(word)
      continue
    }
    const equals = word.startsWith('--') ? word.indexOf('=') : -1
    const optionName = equals < 0 ? word : word.slice(0, equals)
    const inlineValue = equals < 0 ? undefined : word.slice(equals + 1)
    const definition = Object.entries(command.options ?? {}).find(([name, option]) => name === optionName || option.aliases?.includes(optionName))
    if (!definition) {
      const replacement = removed[[...path, word].join(' ')]
      fail(replacement ? `Removed option: ${word}. Use ${replacement}.` : `Unknown option: ${word}`)
    }
    const [name, option] = definition!
    if (options[name] !== undefined && !option.repeat)
      fail(`Duplicate option: ${name}`)
    if (option.value) {
      const next = args[index + 1]
      const value = inlineValue ?? (next?.startsWith('-') ? undefined : next)
      if (value === undefined || value === '') {
        pending.push(`${name} requires ${option.value}`)
        continue
      }
      if (inlineValue === undefined)
        index++
      if (option.repeat) {
        const values = options[name] as string[] | undefined
        options[name] = [...(values ?? []), value]
      }
      else { options[name] = value }
    }
    else {
      if (inlineValue !== undefined)
        fail(`${name} does not accept a value`)
      options[name] = true
    }
  }
  const definitions = command.arguments ?? []
  const invocation: Invocation = { path, positionals, options, forwarded, argv: [] }
  if (help || (!command.run && !positionals.length && !Object.keys(options).length && !forwarded.length))
    return { command, invocation, help: true }
  if (!command.run)
    fail('Expected a subcommand')
  if (pending.length)
    fail(pending.join('\n'))
  if (positionals.length > definitions.length)
    fail(`Unexpected argument: ${positionals[definitions.length]}`)
  for (const [i, arg] of definitions.entries()) {
    const value = positionals[i] ?? arg.default
    if (value === undefined) {
      if (!arg.optional)
        fail(`Missing argument: ${arg.name}`)
      continue
    }
    if (arg.choices && !arg.choices.includes(value))
      fail(`Invalid ${arg.name}: ${value}. Expected ${arg.choices.join(' or ')}`)
    if (arg.pattern && !arg.pattern.test(value))
      fail(`Invalid ${arg.name}`)
    positionals[i] = value
  }
  for (const [name, option] of Object.entries(command.options ?? {})) {
    const value = options[name]
    if (value === undefined)
      continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string' && ((option.choices && !option.choices.includes(item)) || (option.pattern && !option.pattern.test(item))))
        fail(`Invalid value for ${name}`)
    }
  }
  if (command.passthrough && !forwarded.length)
    fail('Expected -- followed by a child command')
  invocation.argv = [...positionals, ...Object.entries(options).flatMap(([name, value]) => value === true ? [name] : Array.isArray(value) ? value.flatMap(item => [name, item]) : [name, String(value)]), ...(command.passthrough ? ['--', ...forwarded] : [])]
  try {
    command.validate?.(invocation)
  }
  catch (error) { fail(error instanceof Error ? error.message : 'Invalid arguments') }
  return { command, invocation, help: false }
}

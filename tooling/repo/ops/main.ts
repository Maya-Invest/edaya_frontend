#!/usr/bin/env bun
import { commandHelp, commandReference, resolveCommand } from './command-tree'
import { commands, removedCommands } from './commands'
import { redact } from './runtime'

export const help = () => commandHelp(commands)
export const reference = () => commandReference(commands)
export async function main(args: string[]): Promise<void> {
  const result = resolveCommand(commands, args, removedCommands)
  if (result.help) {
    console.log(commandHelp(result.command, result.invocation.path))
    return
  }
  await result.command.run!(result.invocation)
}
if (import.meta.main) {
  try {
    await main(process.argv.slice(2))
  }
  catch (error) {
    console.error(redact(error instanceof Error ? error.message : 'Operation failed'))
    process.exitCode = 1
  }
}

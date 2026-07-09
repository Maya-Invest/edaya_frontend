import { checkCliUsage, parseCheckCliArgs } from '../parse-check-cli'
import { runCheckCommand } from './check'

export async function dispatchCheckCommand(forwardArgs: readonly string[]): Promise<number> {
  let parsed
  try {
    parsed = parseCheckCliArgs(forwardArgs)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error('')
    console.error(checkCliUsage())
    return 1
  }

  if (parsed.kind === 'help') {
    console.log(checkCliUsage())
    return 0
  }

  return runCheckCommand(parsed)
}

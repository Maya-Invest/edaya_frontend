import { parseSmokeTestCliArgs, smokeTestCliUsage } from '../parse-smoke-test-cli'
import { runSmokeTestCommand } from './smoke-test'

export async function dispatchSmokeTestCommand(forwardArgs: readonly string[]): Promise<number> {
  let parsed
  try {
    parsed = parseSmokeTestCliArgs(forwardArgs)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error('')
    console.error(smokeTestCliUsage())
    return 1
  }

  if (parsed.kind === 'help') {
    console.log(smokeTestCliUsage())
    return 0
  }

  return runSmokeTestCommand(parsed)
}

import type { CompoundRepoCommand } from './parse-repo-cli'
import { dispatchCheckCommand } from './commands/check-dispatch'
import { dispatchOpenapiCommand } from './commands/openapi-dispatch'
import { dispatchSmokeTestCommand } from './commands/smoke-test-dispatch'
import { runVerify, verifyCliUsage } from './commands/verify'

export async function dispatchCompoundCommand(
  command: CompoundRepoCommand,
  forwardArgs: readonly string[],
): Promise<number> {
  switch (command) {
    case 'check':
      return dispatchCheckCommand(forwardArgs)
    case 'smoke-test':
      return dispatchSmokeTestCommand(forwardArgs)
    case 'openapi':
      return dispatchOpenapiCommand(forwardArgs)
    case 'verify': {
      if (forwardArgs.length > 0 && !forwardArgs.includes('--help') && !forwardArgs.includes('-h')) {
        console.error('verify accepts no arguments')
        console.error('')
        console.error(verifyCliUsage())
        return 1
      }
      if (forwardArgs.includes('--help') || forwardArgs.includes('-h')) {
        console.log(verifyCliUsage())
        return 0
      }
      return runVerify()
    }
  }
}

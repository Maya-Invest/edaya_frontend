import type { CompoundRepoCommand } from './parse-repo-cli'
import { dispatchSmokeTestCommand } from './commands/smoke-test-dispatch'
import { runVerify, verifyCliUsage } from './commands/verify'

export async function dispatchCompoundCommand(
  command: CompoundRepoCommand,
  forwardArgs: readonly string[],
): Promise<number> {
  switch (command) {
    case 'smoke-test':
      return dispatchSmokeTestCommand(forwardArgs)
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

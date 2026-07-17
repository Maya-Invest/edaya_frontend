import type { ParsedSmokeTestCli } from '../parse-smoke-test-cli'
import { paths } from '../lib/paths'
import { runBunScript } from '../lib/spawn'

export async function runSmokeTestCommand(
  parsed: Exclude<ParsedSmokeTestCli, { kind: 'help' }>,
): Promise<number> {
  switch (parsed.target) {
    case 'staging':
      return runBunScript(paths.smokeStaging)
  }
}

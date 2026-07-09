import type { ParsedCheckCli } from '../parse-check-cli'
import { paths } from '../lib/paths'
import { runBunScript } from '../lib/spawn'

export async function runCheckCommand(parsed: Exclude<ParsedCheckCli, { kind: 'help' }>): Promise<number> {
  switch (parsed.target) {
    case 'openapi':
      return runBunScript(paths.openapiCheck)
    case 'openapi-export':
      return runBunScript(paths.openapiCheckExport)
  }
}

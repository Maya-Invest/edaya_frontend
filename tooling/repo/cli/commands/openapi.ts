import type { ParsedOpenapiCli } from '../parse-openapi-cli'
import { paths } from '../lib/paths'
import { runBunScript } from '../lib/spawn'

export async function runOpenapiCommand(parsed: Exclude<ParsedOpenapiCli, { kind: 'help' }>): Promise<number> {
  switch (parsed.action) {
    case 'export':
      return runBunScript(paths.openapiExport)
    case 'generate':
      return runBunScript(paths.openapiGenerate)
  }
}

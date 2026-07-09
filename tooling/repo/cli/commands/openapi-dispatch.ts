import { openapiCliUsage, parseOpenapiCliArgs } from '../parse-openapi-cli'
import { runOpenapiCommand } from './openapi'

export async function dispatchOpenapiCommand(forwardArgs: readonly string[]): Promise<number> {
  let parsed
  try {
    parsed = parseOpenapiCliArgs(forwardArgs)
  }
  catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error('')
    console.error(openapiCliUsage())
    return 1
  }

  if (parsed.kind === 'help') {
    console.log(openapiCliUsage())
    return 0
  }

  return runOpenapiCommand(parsed)
}
